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
}

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import enrollmentRoutes from './routes/enrollments.js';
import aiRoutes from './routes/ai.js';
import User from './models/User.js';
import Course from './models/Course.js';
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.post('/createUser', async (req, res) => {
  try {
    const { email, password, name} = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Username already exists")
      return res.status(409).json({ 
    success: false,
    message: 'Email already exists'
  });
    }

  
  const newUser = new User({
  email,
  password,
  name
  
});

    // Save to database
    const savedUser = await newUser.save();

    // Remove password from response for security
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Error creating user:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Server error while creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
app.post('/getUser', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Use bcrypt to compare passwords
    const isPasswordValid = await user.comparePassword(password);

    if (isPasswordValid) {
      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: userResponse
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
})
app.get('/getCourses', async (req, res) => {
  try {
    // Find all courses
    const courses = await Course.find();
    
    if (!courses || courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No courses found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Courses retrieved successfully',
      courses: courses
    });

  } catch (error) {
    console.error('Get courses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching courses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});