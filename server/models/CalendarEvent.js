import mongoose from "mongoose";

const { Schema, model } = mongoose;

const calendarEventSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' }, // Optional - for course-related events
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date }, // Optional - for events with duration
  eventType: { 
    type: String, 
    enum: ['exam', 'assignment', 'homework', 'project', 'quiz', 'lecture', 'deadline', 'other'],
    default: 'other'
  },
  location: { type: String }, // Optional location
  isAllDay: { type: Boolean, default: false },
  reminderEnabled: { type: Boolean, default: true },
  reminderMinutes: { type: Number, default: 60 }, // Minutes before event
  source: { 
    type: String, 
    enum: ['syllabus', 'manual', 'imported'],
    default: 'manual'
  }, // Track where the event came from
  status: {
    type: String,
    enum: ['upcoming', 'in-progress', 'completed', 'missed', 'cancelled'],
    default: 'upcoming'
  },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
calendarEventSchema.index({ userId: 1, startDate: 1 });
calendarEventSchema.index({ courseId: 1 });

// Update updatedAt before saving
calendarEventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default model('CalendarEvent', calendarEventSchema);

