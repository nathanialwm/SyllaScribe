import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reminderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  assignmentId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  dueDate: { type: Date, required: true },
  reminderDate: { type: Date, required: true }, // When to send reminder
  type: { 
    type: String, 
    enum: ['exam', 'assignment', 'homework', 'project', 'other'],
    default: 'assignment'
  },
  completed: { type: Boolean, default: false },
  notified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default model('Reminder', reminderSchema);

