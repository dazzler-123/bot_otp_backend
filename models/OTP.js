const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  otpId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  deviceId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  receivedAt: {
    type: Date,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
});

// Index for efficient queries
otpSchema.index({ expiresAt: 1 });
otpSchema.index({ receivedAt: -1 });
otpSchema.index({ userId: 1, receivedAt: -1 });

module.exports = mongoose.model('OTP', otpSchema);

