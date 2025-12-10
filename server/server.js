import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Enrollment from './models/Enrollment.js';
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

    // Trim whitespace from inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      console.log("Username already exists")
      return res.status(409).json({ 
    success: false,
    message: 'Email already exists'
  });
    }

  
  const newUser = new User({
  email: trimmedEmail,
  password: trimmedPassword,
  name: trimmedName
  
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

    // Trim whitespace from email and password
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Find user by email
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Use bcrypt to compare passwords
    const isPasswordValid = await user.comparePassword(trimmedPassword);

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

// Request password reset - generates verification code
app.post('/requestPasswordReset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const trimmedEmail = email.trim();
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      // Don't reveal if email exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset code has been sent.'
      });
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code and expiration (15 minutes)
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // In production, send email here. For now, log it (remove in production!)
    console.log(`\n=== PASSWORD RESET CODE ===`);
    console.log(`Email: ${trimmedEmail}`);
    console.log(`Code: ${resetCode}`);
    console.log(`Expires in: 15 minutes`);
    console.log(`===========================\n`);
    
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset code has been sent. Check your email. (For development: code is in server console)'
    });

  } catch (error) {
    console.error('Request password reset error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
});

// Reset password with verification code
app.post('/resetPassword', async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    // Validate required fields
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset code, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Trim whitespace
    const trimmedEmail = email.trim();
    const trimmedCode = resetCode.trim();
    const trimmedPassword = newPassword.trim();

    // Find user by email with valid reset code
    const user = await User.findOne({
      email: trimmedEmail,
      resetPasswordToken: trimmedCode,
      resetPasswordExpires: { $gt: new Date() } // Code not expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code. Please request a new one.'
      });
    }

    // Update password and clear reset token
    user.password = trimmedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
})

app.get('/getCourses', async (req, res) => {
  try {
    // Find all courses
    const courses = await Course.find();
    
    // Return 200 with empty array if no courses found (not an error)
    return res.status(200).json({
      success: true,
      message: courses.length === 0 ? 'No courses found' : 'Courses retrieved successfully',
      courses: courses || []
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
app.get('/getEnrolledCourses', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const enrollments = await Enrollment.find({ userId: userId })
      .populate('courseId')
      .sort({ enrolledAt: -1 });
    
    // Transform to include enrollment data
    // Filter out any enrollments with null/missing courseId (schema mismatch protection)
    const enrolledCourses = enrollments
      .filter(enrollment => enrollment.courseId != null) // Safety check for schema issues
      .map(enrollment => ({
        ...enrollment.courseId.toObject(),
        enrollmentId: enrollment._id,
        enrolledAt: enrollment.enrolledAt,
        enrollmentGrades: enrollment.grades || []
      }));
    
    res.status(200).json({
      success: true,
      courses: enrolledCourses
    });
    
  } catch (error) {
    console.error('Get enrolled courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrolled courses'
    });
  }
});
app.post('/createCourse', async (req, res) => {
  try {
    const { title } = req.body;
    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'ClassName is required'
      });
    }
    // Create new course
    const newCourse = new Course({
      title,
      courseId:  `COURSE-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    });
    // Save to database
    const savedCourse = await newCourse.save();
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      courseId: savedCourse._id
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


app.post('/enrollCourse', async (req, res) => {
  try {
    const { userId, courseId, grades } = req.body;  
    
    // Validate required fields
    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'userId and courseId are required'
      });
    }
    
    // Find user and course
    const user = await User.findById(userId);
    const course = await Course.findById(courseId); 
    
    if (!user || !course) {
      return res.status(404).json({
        success: false,
        message: 'User or Course not found'
      });
    }
    
    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({
      userId: userId,
      courseId: courseId
    });
    
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'User is already enrolled in this course'
      });
    }
    
   
    const transformedGrades = [];
    
    if (grades && Array.isArray(grades)) {
      grades.forEach((area, areaIndex) => {
        if (area.items && Array.isArray(area.items)) {
          area.items.forEach((item, itemIndex) => {
            transformedGrades.push({
              assignmentId: `${areaIndex}-${itemIndex}-${Date.now()}`,
              name: item.name || `Assignment ${itemIndex + 1}`,
              grade: parseFloat(item.grade) || 0,
              weight: parseFloat(area.weight) || 0
            });
          });
        }
      });
    }
    
    // Create new enrollment
    const enrollment = new Enrollment({
      enrollmentID: `ENROLL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: userId,
      courseId: courseId,
      grades: transformedGrades
    });
    
    await enrollment.save();
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'User enrolled in course successfully',
      enrollmentId: enrollment._id
    });
  } catch (error) {
    console.error('Error enrolling user in course:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while enrolling user in course', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
app.delete('/deleteEnrollment/:enrollmentId', async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    
    if (!enrollmentId) {
      return res.status(400).json({
        success: false,
        message: 'enrollmentId is required'
      });
    }
    
    const deletedEnrollment = await Enrollment.findByIdAndDelete(enrollmentId);
    
    if (!deletedEnrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Enrollment deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting enrollment'
    });
  }
});
app.delete('/deleteCourseByCustomId/:customCourseId', async (req, res) => {
  try {
    const { customCourseId } = req.params;
    
    console.log(`Attempting to delete course with custom ID: ${customCourseId}`);
    
    // Find the course by custom courseId field
    const course = await Course.findOne({ 
      courseId: customCourseId  // Match the custom ID field
    });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course with ID ${customCourseId} not found`
      });
    }
    
    // Delete the course using its MongoDB _id
    await Course.findByIdAndDelete(course._id);
    
    // Optional: Also delete related enrollments
    await Enrollment.deleteMany({ courseId: course._id });
    
    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
      deletedCourse: {
        _id: course._id,
        courseId: course.courseId,
        title: course.title
      }
    });
    
  } catch (error) {
    console.error('Error deleting course by custom ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
