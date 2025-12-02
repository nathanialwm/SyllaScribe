import mongoose from "mongoose";

const { Schema, model } = mongoose;

const pastGradeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseName: { type: String, required: true },
  semester: { type: String, required: true },
  letterGrade: { type: String }, // A, B+, C, etc.
  numericGrade: { type: Number }, // 0-100 or 0-4.0 for GPA scale
  credits: { type: Number, default: 3 },
  gpaScale: { type: Number, default: 4.0 }, // 4.0 or 5.0 scale
  createdAt: { type: Date, default: Date.now }
});

export default model('PastGrade', pastGradeSchema);

