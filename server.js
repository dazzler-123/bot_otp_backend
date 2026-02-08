const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const otpRoutes = require('./routes/otps');
const { cleanupExpiredOtps, cleanupOldOtps } = require('./jobs/cleanupOtps');
const logger = require('./utils/logger');
const getNetworkIP = require('./utils/getNetworkIP');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const socketCorsOrigins =   '*';
const io = socketIo(server, {
  cors: {
    origin: socketCorsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Allow Engine.IO v3 clients
});

// Store io instance for use in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin:  '*',
  credentials: true,
}));

// HTTP Request Logging
if (process.env.NODE_ENV === 'production') {
  // Production: Use combined format (more detailed)
  app.use(morgan('combined'));
} else {
  // Development: Use dev format (colored, concise)
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  const jwt = require('jsonwebtoken');
  const User = require('./models/User');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('User not found'));
    }
    socket.userId = decoded.userId;
    socket.isAdmin = user.isAdmin || false;
    socket.join(decoded.userId.toString());
    // Join admin room if user is admin
    if (socket.isAdmin) {
      socket.join('admin');
    }
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info(`Socket.io: User connected - ${socket.userId}`);
  
  socket.on('disconnect', () => {
    logger.info(`Socket.io: User disconnected - ${socket.userId}`);
  });

  socket.on('error', (error) => {
    logger.error(`Socket.io error: ${error.message}`);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/otps', otpRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    server: {
      port: process.env.PORT || 3001,
      networkIP: getNetworkIP(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Get server info endpoint
app.get('/api/server-info', (req, res) => {
  res.json({
    networkIP: getNetworkIP(),
    port: process.env.PORT || 3001,
    apiUrl: `http://${getNetworkIP()}:${process.env.PORT || 3001}/api`,
    healthUrl: `http://${getNetworkIP()}:${process.env.PORT || 3001}/health`,
    environment: process.env.NODE_ENV || 'development'
  });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.success('Connected to MongoDB');
    
    // Start server
    const PORT = process.env.PORT || 3001;
    const networkIP = getNetworkIP();
    
    server.listen(PORT, '0.0.0.0', () => {
      logger.success(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('');
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('🌐 Backend API Access URLs:');
      logger.info('═══════════════════════════════════════════════════════');
      logger.info(`📍 Local:        http://localhost:${PORT}/api`);
      logger.info(`📍 Network IP:   http://${networkIP}:${PORT}/api`);
      logger.info(`📍 Health Check: http://${networkIP}:${PORT}/health`);
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('');
      logger.info(`💡 Use this IP in mobile app config: ${networkIP}`);
      logger.info(`💡 Update botapp/src/config/api.ts with: http://${networkIP}:${PORT}/api`);
      logger.info('');
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Scheduled jobs
// Clean up expired OTPs every 5 minutes
// cron.schedule('*/5 * * * *', cleanupExpiredOtps);

// // Clean up old OTPs every hour
// cron.schedule('0 * * * *', cleanupOldOtps);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

