import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import path from 'path';

// Load env file (ưu tiên .env, fallback sang config.env)
const envPath = path.resolve(process.cwd(), '.env');
const configEnvPath = path.resolve(process.cwd(), 'config.env');

dotenv.config({ path: envPath });
dotenv.config({ path: configEnvPath, override: false });

const app = express();
const PORT = process.env.PORT || 4000;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL;
const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL;
const AI_FACE_RECOGNITION_SERVICE_URL = process.env.AI_FACE_RECOGNITION_SERVICE_URL;

// CORS: Cho phép mọi origin và credentials
app.use(cors({
  origin: true,
  credentials: true
}));

app.use((req, res, next) => {
  // Bỏ qua logging cho tất cả request
  next();
});

// Parse JSON/urlencoded để có thể log req.body và re-stream body sang dịch vụ đích
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check proxy
app.use('/health', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
}));

// Proxy refresh-token trực tiếp sang auth-service
app.use('/api/refresh-token', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/refresh-token': '/api/refresh-token' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway', details: err.message }));
  }
}));

// Proxy tới employee-service
app.use('/api/employee', createProxyMiddleware({
  target: EMPLOYEE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/employee': '/api' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway', details: err.message }));
  }
}));

// Proxy tới attendance-service
app.use('/api/attendance', createProxyMiddleware({
  target: ATTENDANCE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/attendance': '/api' },
  onProxyReq: (proxyReq, req, res) => {
    const contentType = req.headers['content-type'] || '';
    const isJson = typeof contentType === 'string' && contentType.includes('application/json');
    if (isJson && req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway', details: err.message }));
  }
}));

// Proxy tới AI Face Recognition service
app.use('/api/ai', createProxyMiddleware({
  target: AI_FACE_RECOGNITION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/ai': '/api/face-recognition' },
  onProxyReq: (proxyReq, req, res) => {
    const contentType = req.headers['content-type'] || '';
    const isJson = typeof contentType === 'string' && contentType.includes('application/json');
    if (isJson && req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway', details: err.message }));
  }
}));

// Proxy tất cả các route /api/auth/* sang auth-service
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway', details: err.message }));
  }
}));

// Serve uploaded files via gateway
app.use('/uploads', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
}));

// Health check endpoint riêng cho API Gateway
app.get('/gateway-health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    port: PORT,
    services: {
      auth: AUTH_SERVICE_URL,
      employee: EMPLOYEE_SERVICE_URL,
      attendance: ATTENDANCE_SERVICE_URL,
      ai: AI_FACE_RECOGNITION_SERVICE_URL
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway Service',
    version: '1.0.0',
    endpoints: {
      health: '/gateway-health',
      auth: '/api/auth/*',
      employee: '/api/employee/*',
      attendance: '/api/attendance/*',
      ai: '/api/ai/*',
      uploads: '/uploads/*'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🌐 Accessible from LAN: http://0.0.0.0:${PORT}`);
  console.log(`📡 Auth Service URL: ${AUTH_SERVICE_URL}`);
  console.log(`📡 Employee Service URL: ${EMPLOYEE_SERVICE_URL}`);
  console.log(`📡 Attendance Service URL: ${ATTENDANCE_SERVICE_URL}`);
  console.log(`🤖 AI Face Recognition Service URL: ${AI_FACE_RECOGNITION_SERVICE_URL}`);
}); 