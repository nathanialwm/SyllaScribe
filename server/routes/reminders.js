import express from 'express';
import Reminder from '../models/Reminder.js';
import Enrollment from '../models/Enrollment.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all reminders for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { upcoming, completed } = req.query;
    const filter = { userId: req.user.userId };
    
    if (upcoming === 'true') {
      filter.reminderDate = { $gte: new Date() };
      filter.completed = false;
    }
    if (completed === 'true') {
      filter.completed = true;
    } else if (completed === 'false') {
      filter.completed = false;
    }

    const reminders = await Reminder.find(filter)
      .populate('enrollmentId')
      .sort({ reminderDate: 1 });
    res.json(reminders);
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// Create reminder
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId, assignmentId, title, description, dueDate, reminderDate, type } = req.body;

    if (!enrollmentId || !assignmentId || !dueDate) {
      return res.status(400).json({ error: 'Enrollment ID, assignment ID, and due date are required' });
    }

    // Verify enrollment belongs to user
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment || enrollment.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reminder = new Reminder({
      userId: req.user.userId,
      enrollmentId,
      assignmentId,
      title: title || 'Assignment Reminder',
      description: description || '',
      dueDate: new Date(dueDate),
      reminderDate: reminderDate ? new Date(reminderDate) : new Date(dueDate),
      type: type || 'assignment',
      completed: false
    });

    await reminder.save();
    await reminder.populate('enrollmentId');

    res.status(201).json(reminder);
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// Update reminder
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    if (reminder.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await Reminder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('enrollmentId');

    res.json(updated);
  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// Delete reminder
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    if (reminder.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await reminder.deleteOne();
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

export default router;

