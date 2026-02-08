# Backend API - OTP Sync System

Node.js/Express backend API with MongoDB for the OTP Sync System.

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create `.env` file**:
   ```bash
   cp env.example .env
   ```

3. **Edit `.env`** with your MongoDB connection string and JWT secret

4. **Start MongoDB** (if using local):
   ```bash
   mongod
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

When the server starts, it will display:
- Local URL: `http://localhost:3001/api`
- Network IP: `http://YOUR_IP:3001/api` (use this in mobile app)

You can also check server info:
- Health: `http://localhost:3001/health`
- Server Info: `http://localhost:3001/api/server-info`

## Environment Variables

Copy `env.example` to `.env` and configure:

- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `JWT_EXPIRES_IN` - Token expiration (default: 7d)
- `CORS_ORIGINS` - Allowed CORS origins (comma-separated)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Devices
- `GET /api/devices` - Get all devices (auth required)
- `POST /api/devices/register` - Register device (auth required)
- `POST /api/devices/:deviceId/active` - Update last active (auth required)

### OTPs
- `GET /api/otps` - Get all OTPs (auth required)
- `POST /api/otps/upload` - Upload OTP (auth required)

### Health Check
- `GET /health` - Server health check

## Socket.io

Real-time updates via Socket.io:
- `newOTP` - Emitted when new OTP is uploaded
- `deviceUpdated` - Emitted when device is updated

## Scheduled Jobs

- **Expired OTPs**: Deleted every 5 minutes
- **Old OTPs**: Deleted every hour (older than 1 hour)

## Development

```bash
# Development mode with auto-reload (nodemon)
npm run dev

# Production mode
npm start
```

## Logging

The backend includes comprehensive logging:

- **HTTP Request Logging**: Using Morgan middleware
  - Development: Colored, concise format (`dev`)
  - Production: Detailed format (`combined`)

- **Custom Logger**: Located in `utils/logger.js`
  - `logger.info()` - Information logs
  - `logger.error()` - Error logs
  - `logger.warn()` - Warning logs
  - `logger.success()` - Success logs
  - `logger.debug()` - Debug logs (development only)

- **Nodemon Configuration**: `nodemon.json`
  - Auto-restarts on file changes
  - Watches routes, models, middleware, jobs, and server.js
  - Ignores node_modules and test files

## Project Structure

```
backend/
├── models/          # Mongoose models (User, Device, OTP)
├── routes/          # API routes (auth, devices, otps)
├── middleware/      # Middleware (auth, logger)
├── jobs/            # Scheduled jobs (cleanup)
├── utils/           # Utilities (logger)
├── server.js        # Express server
├── nodemon.json     # Nodemon configuration
└── package.json
```

