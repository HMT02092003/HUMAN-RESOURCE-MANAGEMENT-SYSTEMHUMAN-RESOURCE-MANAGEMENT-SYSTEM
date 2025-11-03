import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/api';

const app = express();
const PORT = process.env.PORT || 4001;

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
app.use(cookieParser());

// Smart request logging (development only)
app.use((req, res, next) => {
  next();
});

// Serve static files (e.g., uploaded identification photos)
const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'identificationPhoto');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch {}
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Health check with enhanced info
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Auth Service v2.0',
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
    message: 'HRMS Authentication Service v2.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*',
      uploads: '/uploads/*'
    }
  });
});

// API Routes
app.use('/api', authRoutes);

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
  console.error(`[${timestamp}] Auth Service Error:`, {
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
      timestamp,
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message,
      timestamp,
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'File size exceeds 5MB limit',
      timestamp,
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp,
  });
});

// Start server with enhanced startup info
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔐 Auth Service v2.0 running on port ${PORT}`);
  console.log(`🌐 Accessible from: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📧 Email configured: ${process.env.SMTP_USER ? '✅' : '❌'}`);
  console.log(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

export default app;