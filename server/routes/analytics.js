import express from 'express';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Detect finals scheduling conflicts
router.get('/finals-conflicts', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.userId, archived: false })
      .populate('courseId');

    const finals = [];
    const conflicts = [];

    // Extract all finals dates
    for (const enrollment of enrollments) {
      const course = await Course.findById(enrollment.courseId._id || enrollment.courseId);
      if (!course || !course.categories) continue;

      course.categories.forEach(category => {
        if (!category.assignments) return;
        category.assignments.forEach(assignment => {
          if (assignment.name.toLowerCase().includes('final') && assignment.dueDate) {
            finals.push({
              course: course.title,
              assignment: assignment.name,
              date: new Date(assignment.dueDate),
              weight: category.weight,
              enrollmentId: enrollment._id
            });
          }
        });
      });
    }

    // Check for conflicts (same day)
    for (let i = 0; i < finals.length; i++) {
      for (let j = i + 1; j < finals.length; j++) {
        const date1 = finals[i].date;
        const date2 = finals[j].date;
        if (date1.toDateString() === date2.toDateString()) {
          conflicts.push({
            date: date1,
            finals: [finals[i], finals[j]]
          });
        }
      }
    }

    res.json({ conflicts, allFinals: finals });
  } catch (error) {
    console.error('Finals conflict detection error:', error);
    res.status(500).json({ error: 'Failed to detect conflicts' });
  }
});

// Get test importance across classes
router.get('/test-importance', authenticateToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.userId, archived: false })
      .populate('courseId');

    const upcomingTests = [];

    for (const enrollment of enrollments) {
      const course = await Course.findById(enrollment.courseId._id || enrollment.courseId);
      if (!course || !course.categories) continue;

      course.categories.forEach(category => {
        if (!category.assignments) return;
        category.assignments.forEach(assignment => {
          if (assignment.dueDate) {
            const dueDate = new Date(assignment.dueDate);
            const now = new Date();
            if (dueDate > now) {
              // Calculate importance: weight * (days until due)
              const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
              const importance = category.weight * (1 / Math.max(daysUntil, 1));

              upcomingTests.push({
                course: course.title,
                assignment: assignment.name,
                category: category.name,
                weight: category.weight,
                dueDate: dueDate,
                daysUntil: daysUntil,
                importance: importance,
                enrollmentId: enrollment._id
              });
            }
          }
        });
      });
    }

    // Sort by importance (higher is more important)
    upcomingTests.sort((a, b) => b.importance - a.importance);

    res.json({ tests: upcomingTests });
  } catch (error) {
    console.error('Test importance calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate test importance' });
  }
});

export default router;

