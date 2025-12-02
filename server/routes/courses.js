import express from 'express';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateWeightedGrade } from '../utils/gradeCalc.js';

const router = express.Router();

// Get all courses (user's courses via enrollments)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.userId, archived: false })
      .populate('courseId');
    res.json(enrollments.map(e => e.courseId));
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create new course from parsed syllabus
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, instructor, semester, categories, latePolicy } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    // Generate unique courseId
    const courseId = `COURSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const course = new Course({
      courseId,
      title,
      instructor: instructor || '',
      semester: semester || '',
      categories: categories || [],
      latePolicy: latePolicy || {},
      owner: req.user.userId
    });

    await course.save();

    // Create enrollment automatically
    const enrollmentId = `ENROLL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const enrollment = new Enrollment({
      enrollmentID: enrollmentId,
      userId: req.user.userId,
      courseId: course._id,
      semester: semester || '',
      archived: false
    });
    await enrollment.save();

    res.status(201).json({ course, enrollment });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course', details: error.message });
  }
});

// Update course
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check ownership
    if (course.owner && course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModified: new Date() },
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete course
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check ownership
    if (course.owner && course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete associated enrollments
    await Enrollment.deleteMany({ courseId: course._id });

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Calculate grade for a course
router.get('/:id/grade', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user.userId,
      courseId: course._id
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const grade = calculateWeightedGrade(course.categories, enrollment.grades);
    res.json({ grade, basedOnCompleted: enrollment.grades.length > 0 });
  } catch (error) {
    console.error('Calculate grade error:', error);
    res.status(500).json({ error: 'Grade calculation failed' });
  }
});

export default router;
