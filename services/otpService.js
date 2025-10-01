const twilio = require('twilio');
const { Verification } = require('../models');
const crypto = require('crypto');

class OTPService {
  constructor() {
    // For development, we'll use a mock service
    // In production, use Twilio: this.client = twilio(accountSid, authToken);
  }

  // Generate OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via SMS
  async sendOTP(phoneNumber) {
    try {
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await Verification.create({
        phoneNumber,
        otp,
        expiresAt,
        verified: false
      });

      // In development, log OTP to console
      if (process.env.NODE_ENV === 'development') {
        console.log(`OTP for ${phoneNumber}: ${otp}`);
      }

      // In production, send actual SMS
      // await this.client.messages.create({
      //   body: `Your TechStore verification code is: ${otp}`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phoneNumber
      // });

      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  // Verify OTP
  async verifyOTP(phoneNumber, otp) {
    try {
      const verification = await Verification.findOne({
        where: {
          phoneNumber,
          otp,
          expiresAt: { $gt: new Date() },
          verified: false
        }
      });

      if (!verification) {
        return { success: false, message: 'Invalid or expired OTP' };
      }

      // Mark as verified
      await verification.update({ verified: true });

      return { success: true, message: 'Phone number verified successfully' };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, message: 'OTP verification failed' };
    }
  }

  // Check if phone is verified
  async isPhoneVerified(phoneNumber) {
    const verification = await Verification.findOne({
      where: {
        phoneNumber,
        verified: true
      },
      order: [['createdAt', 'DESC']]
    });

    return !!verification;
  }
}

module.exports = new OTPService();