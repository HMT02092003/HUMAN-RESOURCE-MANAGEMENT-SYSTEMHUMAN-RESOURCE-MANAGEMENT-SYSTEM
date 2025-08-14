import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/api';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  // Bỏ qua logging cho tất cả request
  next();
});

// Serve static files (e.g., uploaded identification photos)
const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', 'identificationPhoto');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch {}
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Auth Service',
    port: PORT,
    dbHost: process.env.DB_HOST
  });
});

// API Routes
app.use('/api', (req, res, next) => {
  console.log('[Router /api] called:', req.method, req.url);
  next();
}, authRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Auth Service Error:', err);
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
  console.log(`🔐 Auth Service running on port ${PORT}`);
});

export default app;