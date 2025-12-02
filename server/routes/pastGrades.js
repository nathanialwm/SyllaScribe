import express from 'express';
import PastGrade from '../models/PastGrade.js';
import Enrollment from '../models/Enrollment.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateGPA } from '../utils/gradeCalc.js';

const router = express.Router();

// Get all past grades for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pastGrades = await PastGrade.find({ userId: req.user.userId })
      .sort({ semester: -1, createdAt: -1 });
    res.json(pastGrades);
  } catch (error) {
    console.error('Get past grades error:', error);
    res.status(500).json({ error: 'Failed to fetch past grades' });
  }
});

// Get GPA calculation
router.get('/gpa', authenticateToken, async (req, res) => {
  try {
    const pastGrades = await PastGrade.find({ userId: req.user.userId });
    const enrollments = await Enrollment.find({ userId: req.user.userId, archived: true })
      .populate('courseId');

    // Calculate GPA
    const gpa = calculateGPA(pastGrades, enrollments);

    // Group by semester
    const bySemester = {};
    pastGrades.forEach(grade => {
      if (!bySemester[grade.semester]) {
        bySemester[grade.semester] = [];
      }
      bySemester[grade.semester].push(grade);
    });

    res.json({ gpa, bySemester, totalCourses: pastGrades.length + enrollments.length });
  } catch (error) {
    console.error('Get GPA error:', error);
    res.status(500).json({ error: 'Failed to calculate GPA' });
  }
});

// Create past grade
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { courseName, semester, letterGrade, numericGrade, credits, gpaScale } = req.body;

    if (!courseName || !semester) {
      return res.status(400).json({ error: 'Course name and semester are required' });
    }

    if (!letterGrade && numericGrade === undefined) {
      return res.status(400).json({ error: 'Either letter grade or numeric grade is required' });
    }

    const pastGrade = new PastGrade({
      userId: req.user.userId,
      courseName,
      semester,
      letterGrade,
      numericGrade,
      credits: credits || 3,
      gpaScale: gpaScale || 4.0
    });

    await pastGrade.save();
    res.status(201).json(pastGrade);
  } catch (error) {
    console.error('Create past grade error:', error);
    res.status(500).json({ error: 'Failed to create past grade' });
  }
});

// Update past grade
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pastGrade = await PastGrade.findById(req.params.id);

    if (!pastGrade) {
      return res.status(404).json({ error: 'Past grade not found' });
    }

    if (pastGrade.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await PastGrade.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error('Update past grade error:', error);
    res.status(500).json({ error: 'Failed to update past grade' });
  }
});

// Delete past grade
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pastGrade = await PastGrade.findById(req.params.id);

    if (!pastGrade) {
      return res.status(404).json({ error: 'Past grade not found' });
    }

    if (pastGrade.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pastGrade.deleteOne();
    res.json({ message: 'Past grade deleted successfully' });
  } catch (error) {
    console.error('Delete past grade error:', error);
    res.status(500).json({ error: 'Failed to delete past grade' });
  }
});

export default router;

