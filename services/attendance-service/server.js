import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import attendanceRoutes from './routes/api';

// Load environment variables
dotenv.config();  

const app = express();
const PORT = process.env.PORT || 4003;

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Attendance Service',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Attendance Service API',
    version: '1.0.0',
    description: 'Service chuyên biệt cho việc chấm công và quản lý thời gian làm việc',
    endpoints: {
      health: '/health',
      attendance: '/api/*'
    }
  });
});

// API Routes
app.use('/api', attendanceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Attendance Service Error:', err);
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`⏰ Attendance Service running on port ${PORT}`);
  console.log(`🌐 Accessible from LAN: http://0.0.0.0:${PORT}`);
  console.log(`🔍 Health check: http://0.0.0.0:${PORT}/health`);
});

export default app;