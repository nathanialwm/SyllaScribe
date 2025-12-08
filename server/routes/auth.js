import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
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
      email,
      password: hashedPassword,
      name
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
        name: user.name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Change password
router.post('/changePassword', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'New password must be at least 6 characters long' 
      });
    }

    // Trim whitespace from inputs
    const trimmedEmail = email.trim();
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedNewPassword = newPassword.trim();

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Use the user's comparePassword method (which handles bcrypt comparison)
    const isValidPassword = await user.comparePassword(trimmedCurrentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Update password (the pre-save hook will hash it automatically)
    user.password = trimmedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during password change' 
    });
  }
});

// Change email
router.post('/changeEmail', async (req, res) => {
  try {
    const { currentEmail, newEmail, password } = req.body;

    if (!currentEmail || !newEmail || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    // Trim whitespace
    const trimmedCurrentEmail = currentEmail.trim();
    const trimmedNewEmail = newEmail.trim();
    const trimmedPassword = password.trim();

    // Validate email format
    if (!trimmedNewEmail.includes('@')) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address' 
      });
    }

    // Check if new email is different
    if (trimmedCurrentEmail === trimmedNewEmail) {
      return res.status(400).json({ 
        success: false,
        message: 'New email must be different from current email' 
      });
    }

    // Find user by current email
    const user = await User.findOne({ email: trimmedCurrentEmail });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(trimmedPassword);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Password is incorrect' 
      });
    }

    // Check if new email is already taken
    const existingUser = await User.findOne({ email: trimmedNewEmail });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'This email is already registered to another account' 
      });
    }

    // Update email
    user.email = trimmedNewEmail;
    await user.save();

    res.json({
      success: true,
      message: 'Email changed successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during email change' 
    });
  }
});

// Delete account
router.post('/deleteAccount', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Password is incorrect' 
      });
    }

    await User.deleteOne({ email });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during account deletion' 
    });
  }
});

export default router;
