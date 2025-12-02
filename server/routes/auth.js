import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('❌ ERROR: JWT_SECRET is not set in environment variables');
      console.error('   Please add JWT_SECRET to your .env file');
      console.error('   You can generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      return res.status(500).json({ 
        error: 'Server configuration error: JWT_SECRET is missing',
        details: 'Please add JWT_SECRET to your .env file. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim()
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        admin: user.admin || false,
        settings: user.settings || { darkMode: false, notifications: true }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation error: ' + error.message });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    if (error.message && error.message.includes('Mongo')) {
      return res.status(500).json({ 
        error: 'Database connection error. Please check your MongoDB connection.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: 'Server error during registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email, deleted: false });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last activity
    user.lastActivity = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        admin: user.admin,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Delete own account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mark as deleted (compliance: keep data for 2 semesters)
    user.deleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const {
      darkMode,
      notifications,
      emailNotifications,
      calendarSync,
      timezone,
      dateFormat,
      timeFormat,
      defaultReminderMinutes
    } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update settings fields if provided
    if (darkMode !== undefined) user.settings.darkMode = darkMode;
    if (notifications !== undefined) user.settings.notifications = notifications;
    if (emailNotifications !== undefined) user.settings.emailNotifications = emailNotifications;
    if (calendarSync !== undefined) user.settings.calendarSync = calendarSync;
    if (timezone !== undefined) user.settings.timezone = timezone;
    if (dateFormat !== undefined) user.settings.dateFormat = dateFormat;
    if (timeFormat !== undefined) user.settings.timeFormat = timeFormat;
    if (defaultReminderMinutes !== undefined) user.settings.defaultReminderMinutes = defaultReminderMinutes;

    await user.save();

    res.json({ settings: user.settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
