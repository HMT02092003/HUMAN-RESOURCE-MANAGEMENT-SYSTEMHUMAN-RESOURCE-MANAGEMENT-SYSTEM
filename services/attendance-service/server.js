/**
 * Attendance Service v2.0 - Optimized
 */
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import attendanceRoutes from './routes/api';

const app = express();
const PORT = process.env.PORT || 4003;

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Smart request logging (development only)
app.use((req, res, next) => {
  next();
});

// Health check with enhanced info
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Attendance Service v2.0',
    port: PORT,
    database: {
      host: process.env.DB_HOST,
      type: process.env.DB_TYPE || 'pg'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HRMS Attendance Service v2.0',
    status: 'running',
    description: 'Optimized time tracking and attendance management service',
    endpoints: {
      health: '/health',
      api: '/api/*'
    },
    features: ['Time Tracking', 'Attendance Confirmation', 'Monthly Statistics', 'Settings Management']
  });
});

// API Routes
app.use('/api', attendanceRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handling
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  
  // Log error with context
  console.error(`[${timestamp}] Attendance Service Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message,
      timestamp
    });
  }

  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Attendance Service shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Attendance Service shutting down gracefully...');
  process.exit(0);
});

// Start server with enhanced startup info
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n⏰ Attendance Service v2.0 started successfully!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 LAN Access: http://0.0.0.0:${PORT}`);
  console.log(`🔍 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🔗 API: http://0.0.0.0:${PORT}/api`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});

export default app;