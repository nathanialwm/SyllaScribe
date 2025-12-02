import mongoose from "mongoose";

const { Schema, model } = mongoose;

const categorySchema = new Schema({
  name: { type: String, required: true },
  weight: { type: Number, required: true },
  dropLowest: { type: Number, default: 0 }, // Number of lowest grades to drop
  assignments: [{
    name: { type: String, required: true },
    weight: { type: Number, default: 0 }, // Weight within category
    dueDate: { type: Date },
    maxScore: { type: Number, default: 100 },
    isParticipation: { type: Boolean, default: false }
  }]
}, { _id: true });

const latePolicySchema = new Schema({
  type: { type: String, enum: ['none', 'percentage', 'fixed'], default: 'none' },
  value: { type: Number, default: 0 }, // Percentage or fixed points
  maxDeduction: { type: Number, default: 100 }
});

const courseSchema = new Schema({
  courseId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  instructor: { type: String, default: '' },
  semester: { type: String, default: '' }, // e.g., "Fall 2024"
  categories: [categorySchema],
  latePolicy: { type: latePolicySchema, default: () => ({}) },
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  lastModified: { type: Date, default: Date.now }
});

export default model('Course', courseSchema);
