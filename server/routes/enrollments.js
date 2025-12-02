import express from 'express';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateWeightedGrade } from '../utils/gradeCalc.js';

const router = express.Router();

// Get all enrollments for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { archived } = req.query;
    const filter = { userId: req.user.userId };
    if (archived !== undefined) {
      filter.archived = archived === 'true';
    }

    const enrollments = await Enrollment.find(filter)
      .populate('courseId')
      .sort({ enrolledAt: -1 });
    res.json(enrollments);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Get enrollment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('courseId');

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Verify user owns this enrollment
    if (enrollment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate current grade
    const course = await Course.findById(enrollment.courseId);
    const grade = course ? calculateWeightedGrade(course.categories, enrollment.grades) : 0;

    res.json({ ...enrollment.toObject(), currentGrade: grade });
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

// Create new enrollment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { courseId, semester } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    const enrollmentId = `ENROLL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const enrollment = new Enrollment({
      enrollmentID: enrollmentId,
      userId: req.user.userId,
      courseId,
      semester: semester || '',
      archived: false
    });

    await enrollment.save();
    await enrollment.populate('courseId');

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Create enrollment error:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

// Update enrollment (archive, etc.)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await Enrollment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastActivity: new Date() },
      { new: true }
    ).populate('courseId');

    res.json(updated);
  } catch (error) {
    console.error('Update enrollment error:', error);
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

// Add or update grade
router.post('/:id/grades', authenticateToken, async (req, res) => {
  try {
    const { assignmentId, categoryName, assignmentName, score, maxScore, status, dueDate, isParticipation } = req.body;

    if (!assignmentId || !categoryName || !assignmentName) {
      return res.status(400).json({ error: 'Assignment ID, category name, and assignment name are required' });
    }

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find existing grade or create new
    const existingIndex = enrollment.grades.findIndex(g => g.assignmentId === assignmentId);
    const gradeData = {
      assignmentId,
      categoryName,
      assignmentName,
      score: score !== undefined ? score : null,
      maxScore: maxScore || 100,
      status: status || 'not_started',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      isParticipation: isParticipation || false
    };

    if (status === 'graded' && score !== undefined) {
      gradeData.gradedDate = new Date();
    }
    if (status === 'submitted' || status === 'late') {
      gradeData.submittedDate = new Date();
    }

    if (existingIndex >= 0) {
      enrollment.grades[existingIndex] = { ...enrollment.grades[existingIndex].toObject(), ...gradeData };
    } else {
      enrollment.grades.push(gradeData);
    }

    enrollment.lastActivity = new Date();
    await enrollment.save();

    res.json(enrollment);
  } catch (error) {
    console.error('Add grade error:', error);
    res.status(500).json({ error: 'Failed to add grade' });
  }
});

// Update assignment status (quick update for participation)
router.patch('/:id/grades/:assignmentId/status', authenticateToken, async (req, res) => {
  try {
    const { status, score } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const gradeIndex = enrollment.grades.findIndex(g => g.assignmentId === req.params.assignmentId);
    if (gradeIndex < 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    enrollment.grades[gradeIndex].status = status || enrollment.grades[gradeIndex].status;
    if (score !== undefined) {
      enrollment.grades[gradeIndex].score = score;
    }
    if (status === 'graded' && score !== undefined) {
      enrollment.grades[gradeIndex].gradedDate = new Date();
    }

    enrollment.lastActivity = new Date();
    await enrollment.save();

    res.json(enrollment);
  } catch (error) {
    console.error('Update grade status error:', error);
    res.status(500).json({ error: 'Failed to update grade status' });
  }
});

// Delete enrollment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await enrollment.deleteOne();
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

export default router;
