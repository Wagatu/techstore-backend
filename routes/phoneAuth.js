const express = require('express');
const { User } = require('../models');
const OTPService = require('../services/otpService');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Send OTP for phone verification
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const result = await OTPService.sendOTP(phoneNumber);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    const result = await OTPService.verifyOTP(phoneNumber, otp);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP'
    });
  }
});

// Register with phone
router.post('/register', async (req, res) => {
  try {
    const { phoneNumber, fullName, email, password } = req.body;

    if (!phoneNumber || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, full name, and password are required'
      });
    }

    // Check if phone is verified
    const isVerified = await OTPService.isPhoneVerified(phoneNumber);
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone number not verified'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { phoneNumber }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this phone number'
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email: email || null,
      phoneNumber,
      password,
      emailVerified: !email // If no email, consider it verified
    });

    // Generate token
    const token = user.generateToken();

    res.status(201).json({
      success: true,
      token,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Phone registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user account'
    });
  }
});

// Login with phone
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and password are required'
      });
    }

    // Find user by phone number
    const user = await User.findOne({
      where: { phoneNumber }
    });

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = user.generateToken();

    res.json({
      success: true,
      token,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

module.exports = router;