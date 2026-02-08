const OTP = require('../models/OTP');
const logger = require('../utils/logger');

// Clean up expired OTPs
const cleanupExpiredOtps = async () => {
  try {
    const now = new Date();
    const result = await OTP.deleteMany({ expiresAt: { $lte: now } });
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired OTPs`);
    }
  } catch (error) {
    logger.error('Error cleaning up expired OTPs:', error);
  }
};

// Clean up old OTPs (older than 1 hour)
const cleanupOldOtps = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await OTP.deleteMany({ receivedAt: { $lt: oneHourAgo } });
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old OTPs`);
    }
  } catch (error) {
    logger.error('Error cleaning up old OTPs:', error);
  }
};

module.exports = { cleanupExpiredOtps, cleanupOldOtps };

