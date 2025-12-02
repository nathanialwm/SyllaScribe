import mongoose from "mongoose";

const { Schema, model } = mongoose;

const assignmentGradeSchema = new Schema({
  assignmentId: { type: String, required: true },
  categoryName: { type: String, required: true },
  assignmentName: { type: String, required: true },
  score: { type: Number },
  maxScore: { type: Number, default: 100 },
  status: { 
    type: String, 
    enum: ['not_started', 'in_progress', 'submitted', 'late', 'graded', 'missed'],
    default: 'not_started'
  },
  dueDate: { type: Date },
  submittedDate: { type: Date },
  gradedDate: { type: Date },
  isParticipation: { type: Boolean, default: false }
}, { _id: true });

const enrollmentSchema = new Schema({
  enrollmentID: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  archived: { type: Boolean, default: false },
  semester: { type: String, default: '' },
  grades: [assignmentGradeSchema],
  lastActivity: { type: Date, default: Date.now }
});

export default model('Enrollment', enrollmentSchema);
