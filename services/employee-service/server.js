import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import morgan from 'morgan'; // Comment out morgan để tắt logging
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import employeeRoutes from './routes/api';
// Nếu đã build ra .js, dùng dòng sau (và comment lại dòng trên):
// import employeeRoutes from './routes/api.js';
// import { authMiddleware } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Tắt logging mặc định của Express
app.use((req, res, next) => {
  // Bỏ qua logging cho tất cả request
  next();
});

// Request logging - comment out để tắt
// app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Employee Service'
  });
});

// Mount API routes - comment out console.log để tắt logging
app.use('/api', (req, res, next) => {
  // console.log('[Router /api] called:', req.method, req.url, '| body:', req.body); // Comment out để tắt logging
  next();
}, employeeRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Employee Service Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`👥 Employee Service running on port ${PORT}`);
});

export default app;