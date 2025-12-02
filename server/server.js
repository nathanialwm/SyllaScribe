import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (one level up from server directory)
const envPath = join(__dirname, '..', '.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded successfully');
  console.log('AI_KEY exists:', !!process.env.AI_KEY);
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
  
  // Warn about missing critical variables
  if (!process.env.JWT_SECRET) {
    console.error('⚠️  WARNING: JWT_SECRET is not set!');
    console.error('   Authentication will fail. Add JWT_SECRET to your .env file.');
  }
  if (!process.env.MONGO_URI) {
    console.error('⚠️  WARNING: MONGO_URI is not set!');
    console.error('   Database operations will fail. Add MONGO_URI to your .env file.');
  }
}

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import enrollmentRoutes from './routes/enrollments.js';
import aiRoutes from './routes/ai.js';
import reminderRoutes from './routes/reminders.js';
import pastGradeRoutes from './routes/pastGrades.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import calendarRoutes from './routes/calendar.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Basic logging middleware for observability
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
    if (duration > 2000) {
      console.warn('SLOW REQUEST:', logData);
    } else {
      console.log('REQUEST:', logData);
    }
  });
  next();
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Database connection
if (!process.env.MONGO_URI) {
  console.error('⚠️  ERROR: MONGO_URI environment variable is not set!');
  console.error('   Please add MONGO_URI to your .env file.');
  console.error('   The server will start but database operations will fail.');
} else {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      console.log('   Database:', mongoose.connection.name);
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      console.error('   Please check:');
      console.error('   1. MONGO_URI is correct in .env file');
      console.error('   2. Your IP is whitelisted in MongoDB Atlas');
      console.error('   3. MongoDB cluster is running');
    });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/past-grades', pastGradeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('ERROR:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
