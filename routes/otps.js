const express = require('express');
const { body, validationResult } = require('express-validator');
const OTP = require('../models/OTP');
const Device = require('../models/Device');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all OTPs for authenticated user (admin sees all, regular users see only their own)
router.get('/', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Admin can see all OTPs, regular users only see their own
    const query = req.user.isAdmin ? {} : { userId: req.userId };
    
    const otps = await OTP.find(query)
      .sort({ receivedAt: -1 })
      .limit(limit)
      .populate('deviceId', 'name model');

    // Filter out expired OTPs
    const now = new Date();
    const validOtps = otps.filter(otp => otp.expiresAt > now);

    res.json(validOtps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload OTP from mobile app
router.post(
  '/upload',
  auth,
  [
    body('deviceId').notEmpty(),
    body('code').notEmpty(),
    body('sender').notEmpty(),
    body('message').notEmpty(),
    body('receivedAt').isNumeric(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceId, code, sender, message, receivedAt } = req.body;

      // Verify device belongs to user
      const device = await Device.findOne({
        deviceId,
        userId: req.userId,
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Calculate expiration (10 minutes from receivedAt)
      const expiresAt = new Date(receivedAt + 10 * 60 * 1000);
      const otpId = `${deviceId}_${receivedAt}`;

      // Create OTP
      const otp = new OTP({
        otpId,
        deviceId,
        userId: req.userId,
        code,
        sender,
        message,
        receivedAt: new Date(receivedAt),
        expiresAt,
      });

      await otp.save();

      // Update device last active
      await device.updateLastActive();

      const io = req.app.get('io');
      
      // Emit socket event to the user who owns the device
      io.to(req.userId.toString()).emit('newOTP', otp);
      
      // Also emit to admin room so admins can see all OTPs
      io.to('admin').emit('newOTP', otp);

      res.status(201).json(otp);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate OTP
        return res.status(409).json({ error: 'OTP already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;

