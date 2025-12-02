import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import CalendarEvent from '../models/CalendarEvent.js';
import Course from '../models/Course.js';

const router = express.Router();

// Get all calendar events for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, courseId, eventType } = req.query;
    const query = { userId: req.user.userId };

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (courseId) {
      query.courseId = courseId;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    const events = await CalendarEvent.find(query)
      .populate('courseId', 'title courseId')
      .sort({ startDate: 1 });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Get a single calendar event
router.get('/:eventId', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({
      _id: req.params.eventId,
      userId: req.user.userId
    }).populate('courseId', 'title courseId');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true, event });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    res.status(500).json({ error: 'Failed to fetch calendar event' });
  }
});

// Create a new calendar event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      courseId,
      title,
      description,
      startDate,
      endDate,
      eventType,
      location,
      isAllDay,
      reminderEnabled,
      reminderMinutes
    } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ error: 'Title and startDate are required' });
    }

    // Validate courseId if provided
    if (courseId) {
      const course = await Course.findOne({
        _id: courseId,
        owner: req.user.userId
      });
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
    }

    const event = new CalendarEvent({
      userId: req.user.userId,
      courseId: courseId || null,
      title,
      description: description || '',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      eventType: eventType || 'other',
      location: location || '',
      isAllDay: isAllDay !== undefined ? isAllDay : false,
      reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
      reminderMinutes: reminderMinutes || 60,
      source: 'manual'
    });

    await event.save();
    await event.populate('courseId', 'title courseId');

    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Update a calendar event
router.put('/:eventId', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({
      _id: req.params.eventId,
      userId: req.user.userId
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const {
      title,
      description,
      startDate,
      endDate,
      eventType,
      location,
      isAllDay,
      reminderEnabled,
      reminderMinutes,
      status
    } = req.body;

    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (startDate) event.startDate = new Date(startDate);
    if (endDate !== undefined) event.endDate = endDate ? new Date(endDate) : null;
    if (eventType) event.eventType = eventType;
    if (location !== undefined) event.location = location;
    if (isAllDay !== undefined) event.isAllDay = isAllDay;
    if (reminderEnabled !== undefined) event.reminderEnabled = reminderEnabled;
    if (reminderMinutes !== undefined) event.reminderMinutes = reminderMinutes;
    if (status) event.status = status;
    if (status === 'completed') {
      event.completedAt = new Date();
    }

    await event.save();
    await event.populate('courseId', 'title courseId');

    res.json({ success: true, event });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// Delete a calendar event
router.delete('/:eventId', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({
      _id: req.params.eventId,
      userId: req.user.userId
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

// Bulk create events from syllabus parsing
router.post('/bulk-create', authenticateToken, async (req, res) => {
  try {
    const { events, courseId } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Events array is required' });
    }

    // Validate courseId if provided
    if (courseId) {
      const course = await Course.findOne({
        _id: courseId,
        owner: req.user.userId
      });
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
    }

    const createdEvents = [];
    for (const eventData of events) {
      const event = new CalendarEvent({
        userId: req.user.userId,
        courseId: courseId || null,
        title: eventData.title,
        description: eventData.description || '',
        startDate: new Date(eventData.startDate),
        endDate: eventData.endDate ? new Date(eventData.endDate) : null,
        eventType: eventData.eventType || 'other',
        location: eventData.location || '',
        isAllDay: eventData.isAllDay !== undefined ? eventData.isAllDay : true,
        reminderEnabled: true,
        reminderMinutes: 60,
        source: 'syllabus'
      });
      await event.save();
      createdEvents.push(event);
    }

    res.status(201).json({ success: true, events: createdEvents, count: createdEvents.length });
  } catch (error) {
    console.error('Error bulk creating calendar events:', error);
    res.status(500).json({ error: 'Failed to create calendar events' });
  }
});

// Get upcoming events (next 7 days)
router.get('/upcoming/list', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const events = await CalendarEvent.find({
      userId: req.user.userId,
      startDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['upcoming', 'in-progress'] }
    })
      .populate('courseId', 'title courseId')
      .sort({ startDate: 1 })
      .limit(20);

    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

export default router;

