import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  settings: {
    darkMode: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    calendarSync: { type: Boolean, default: false },
    timezone: { type: String, default: 'America/New_York' },
    dateFormat: { type: String, enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], default: 'MM/DD/YYYY' },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
    defaultReminderMinutes: { type: Number, default: 60 }
  },
  admin: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
});

export default model('User', userSchema);
