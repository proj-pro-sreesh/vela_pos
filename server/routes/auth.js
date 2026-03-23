const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/database');

const router = express.Router();

// In-memory reset token storage (for demo purposes)
// In production, use Redis or store in DB with expiration
const passwordResetTokens = new Map();

// Generate reset token
const generateResetToken = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 character code
};

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send reset email
const sendResetEmail = async (email, username, resetCode) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@velapos.com',
    to: email,
    subject: 'Vela POS - Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Password Reset Request</h2>
        <p>Hello ${username},</p>
        <p>We received a request to reset your password. Use the following code:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${resetCode}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Vela POS - Restaurant Management System</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = db.findUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.findUserById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    // Return specific message for token validation errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Change password
router.post('/change-password', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    const user = db.findUserById(decoded.userId);
    
    if (!user) return res.status(401).json({ message: 'User not found' });
    
    const isMatch = bcrypt.compareSync(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.updateUser(user.id, { password: hashedPassword });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    // Return specific message for token validation errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Forgot password - generate reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await db.findUserByEmail(email.toLowerCase());
    
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.json({ message: 'If the email exists, a reset code has been sent' });
    }

    // Generate reset code
    const resetCode = generateResetToken();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    // Store the reset token with user ID
    passwordResetTokens.set(user.id, {
      code: resetCode,
      expiresAt,
      attempts: 0,
      userId: user.id
    });

    // Try to send email
    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await sendResetEmail(user.email, user.username, resetCode);
        res.json({ 
          message: 'Reset code sent to your email'
        });
      } else {
        // Fallback: return code in response if email not configured
        res.json({ 
          message: 'Reset code generated (email not configured)',
          resetCode: resetCode
        });
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Still allow reset if email fails - return code
      res.json({ 
        message: 'Reset code generated (email failed)',
        resetCode: resetCode
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ message: 'Email, reset code, and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    // Find user by email first
    const user = await db.findUserByEmail(email.toLowerCase());
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check reset token using user ID
    const tokenData = passwordResetTokens.get(user.id);
    
    if (!tokenData) {
      return res.status(400).json({ message: 'Invalid or expired reset code. Please request a new one.' });
    }

    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      passwordResetTokens.delete(user.id);
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }

    // Check if code matches
    if (tokenData.code !== resetCode.toUpperCase()) {
      tokenData.attempts++;
      if (tokenData.attempts >= 3) {
        passwordResetTokens.delete(user.id);
        return res.status(400).json({ message: 'Too many failed attempts. Please request a new reset code.' });
      }
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Update user password
    await db.updateUser(user.id, { password: hashedPassword });
    
    // Remove the used token
    passwordResetTokens.delete(user.id);

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
