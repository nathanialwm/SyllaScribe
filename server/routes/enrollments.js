import express from 'express';
import Enrollment from '../models/Enrollment.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all enrollments for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.userId })
      .populate('courseId');
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

    res.json(enrollment);
  } catch (error) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

// Create new enrollment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { enrollmentID, courseId } = req.body;

    if (!enrollmentID || !courseId) {
      return res.status(400).json({ error: 'Enrollment ID and course ID are required' });
    }

    const enrollment = new Enrollment({
      enrollmentID,
      userId: req.user.userId,
      courseId
    });

    await enrollment.save();
    await enrollment.populate('courseId');

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Create enrollment error:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

// Add grade to enrollment
router.post('/:id/grades', authenticateToken, async (req, res) => {
  try {
    const { assignmentId, name, grade, weight } = req.body;

    if (!assignmentId || !name || grade === undefined || weight === undefined) {
      return res.status(400).json({ error: 'All grade fields are required' });
    }

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Verify user owns this enrollment
    if (enrollment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    enrollment.grades.push({ assignmentId, name, grade, weight });
    await enrollment.save();

    res.json(enrollment);
  } catch (error) {
    console.error('Add grade error:', error);
    res.status(500).json({ error: 'Failed to add grade' });
  }
});

// Delete enrollment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Verify user owns this enrollment
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
