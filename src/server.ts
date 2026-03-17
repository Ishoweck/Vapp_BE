import express, { Application } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error';
import { logger } from './utils/logger';
import { initializeSocket } from './config/socket';
import { setSocketInstance } from './services/notification.service';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Create HTTP server (needed for Socket.io)
const server = http.createServer(app);

// Connect to database
connectDB();

// Initialize Socket.io
const io = initializeSocket(server);

// Make io accessible to controllers via req.app
app.set('io', io);

// Make io accessible to notification service for real-time events
setSocketInstance(io);

// ============================================================
// INCREASED TIMEOUT FOR LARGE UPLOADS
// ============================================================
app.use((req, res, next) => {
  // Set timeout to 3 minutes for all requests
  req.setTimeout(180000); // 3 minutes
  res.setTimeout(180000); // 3 minutes
  next();
});

// ============================================================
// BODY PARSER - ONLY ONCE with 50MB limit
// ============================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
}));

// ============================================================
// RELAXED RATE LIMITING FOR UPLOADS
// ============================================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200'),
  message: 'Too many requests from this IP, please try again later.',
  skipSuccessfulRequests: true,
});
app.use('/api', limiter);

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}`, routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to VendorSpot API',
    version: API_VERSION,
    documentation: '/api/docs',
  });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/${API_VERSION}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});

// SET SERVER TIMEOUT
server.timeout = 180000; // 3 minutes

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

export { io };
export default app;
