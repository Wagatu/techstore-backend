const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const { User } = require('../models');
const router = express.Router();

// Google OAuth2 Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Login
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({
      where: { email }
    });

    if (!user) {
      // Create new user with Google data
      user = await User.create({
        fullName: name,
        email,
        avatar: picture,
        googleId,
        emailVerified: true,
        password: 'google-auth-' + Math.random().toString(36).substring(2) // Random password for social auth
      });
    } else {
      // Update existing user with Google ID
      if (!user.googleId) {
        await user.update({ googleId, avatar: picture });
      }
    }

    // Generate JWT token
    const authToken = user.generateToken();

    res.json({
      success: true,
      token: authToken,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid Google token'
    });
  }
});

// Facebook Login
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Facebook access token is required'
      });
    }

    // Verify Facebook token and get user data
    const response = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,email,picture'
      }
    });

    const { id: facebookId, name, email, picture } = response.data;

    // Find or create user
    let user = await User.findOne({
      where: { email }
    });

    if (!user) {
      // Create new user with Facebook data
      user = await User.create({
        fullName: name,
        email,
        avatar: picture?.data?.url,
        facebookId,
        emailVerified: true,
        password: 'facebook-auth-' + Math.random().toString(36).substring(2)
      });
    } else {
      // Update existing user with Facebook ID
      if (!user.facebookId) {
        await user.update({ facebookId, avatar: picture?.data?.url });
      }
    }

    // Generate JWT token
    const authToken = user.generateToken();

    res.json({
      success: true,
      token: authToken,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Facebook login error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid Facebook token'
    });
  }
});

// Link Google account to existing user
router.post('/link/google', async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id; // From protect middleware

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId } = payload;

    // Check if Google account is already linked to another user
    const existingUser = await User.findOne({ where: { googleId } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Google account is already linked to another user'
      });
    }

    // Update user with Google ID
    const user = await User.findByPk(userId);
    await user.update({ googleId });

    res.json({
      success: true,
      message: 'Google account linked successfully'
    });

  } catch (error) {
    console.error('Link Google error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to link Google account'
    });
  }
});

// Link Facebook account to existing user
router.post('/link/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;
    const userId = req.user.id;

    const response = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        access_token: accessToken,
        fields: 'id'
      }
    });

    const { id: facebookId } = response.data;

    // Check if Facebook account is already linked
    const existingUser = await User.findOne({ where: { facebookId } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Facebook account is already linked to another user'
      });
    }

    // Update user with Facebook ID
    const user = await User.findByPk(userId);
    await user.update({ facebookId });

    res.json({
      success: true,
      message: 'Facebook account linked successfully'
    });

  } catch (error) {
    console.error('Link Facebook error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to link Facebook account'
    });
  }
});

module.exports = router;