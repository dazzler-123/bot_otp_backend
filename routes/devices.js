const express = require('express');
const { body, validationResult } = require('express-validator');
const Device = require('../models/Device');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all devices for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.userId })
      .sort({ lastActive: -1 });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register a new device
router.post(
  '/register',
  auth,
  [
    body('deviceId').notEmpty(),
    body('name').notEmpty(),
    body('model').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceId, name, model } = req.body;

      // Check if device already exists
      let device = await Device.findOne({ deviceId });

      if (device) {
        // Update existing device
        device.name = name;
        device.model = model;
        device.userId = req.userId;
        device.lastActive = new Date();
        await device.save();
      } else {
        // Create new device
        device = new Device({
          deviceId,
          name,
          model,
          userId: req.userId,
        });
        await device.save();
      }

      res.status(201).json(device);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update device last active
router.post('/:deviceId/active', auth, async (req, res) => {
  try {
    const device = await Device.findOne({
      deviceId: req.params.deviceId,
      userId: req.userId,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await device.updateLastActive();
    res.json({ message: 'Last active updated', device });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

