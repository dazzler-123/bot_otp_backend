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
    const groupByDevice = req.query.groupByDevice === 'true';
    
    // Admin can see all OTPs, regular users only see their own
    const query = req.user.isAdmin ? {} : { userId: req.userId };
    
    const otps = await OTP.find(query)
      .sort({ receivedAt: -1 })
      .limit(limit);

    // Filter out expired OTPs
    const now = new Date();
    const validOtps = otps.filter(otp => otp.expiresAt > now);

    // Get unique device IDs
    const deviceIds = [...new Set(validOtps.map(otp => otp.deviceId))];
    
    // Fetch device information for all device IDs
    const devices = await Device.find({ deviceId: { $in: deviceIds } });
    const deviceMap = {};
    devices.forEach(device => {
      deviceMap[device.deviceId] = {
        deviceId: device.deviceId,
        name: device.name,
        model: device.model,
      };
    });

    // Attach device information to each OTP
    const otpsWithDevice = validOtps.map(otp => {
      const device = deviceMap[otp.deviceId] || {
        deviceId: otp.deviceId,
        name: 'Unknown Device',
        model: 'Unknown',
      };
      const otpObj = otp.toObject();
      return {
        ...otpObj,
        receivedAt: otpObj.receivedAt instanceof Date ? otpObj.receivedAt.getTime() : otpObj.receivedAt,
        expiresAt: otpObj.expiresAt instanceof Date ? otpObj.expiresAt.getTime() : otpObj.expiresAt,
        device: device,
      };
    });

    // If groupByDevice is true, return grouped structure
    if (groupByDevice) {
      const grouped = {};
      otpsWithDevice.forEach(otp => {
        const deviceId = otp.deviceId;
        if (!grouped[deviceId]) {
          grouped[deviceId] = {
            device: otp.device,
            otps: [],
          };
        }
        grouped[deviceId].otps.push(otp);
      });
      res.json(grouped);
    } else {
      res.json(otpsWithDevice);
    }
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

      // Attach device information to OTP for socket emission
      const otpObj = otp.toObject();
      const otpWithDevice = {
        ...otpObj,
        receivedAt: otpObj.receivedAt instanceof Date ? otpObj.receivedAt.getTime() : otpObj.receivedAt,
        expiresAt: otpObj.expiresAt instanceof Date ? otpObj.expiresAt.getTime() : otpObj.expiresAt,
        device: {
          deviceId: device.deviceId,
          name: device.name,
          model: device.model,
        },
      };

      const io = req.app.get('io');
      
      // Emit socket event to the user who owns the device
      io.to(req.userId.toString()).emit('newOTP', otpWithDevice);
      
      // Also emit to admin room so admins can see all OTPs
      io.to('admin').emit('newOTP', otpWithDevice);

      res.status(201).json(otpWithDevice);
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

