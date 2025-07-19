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
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:4002';

// CORS: Cho phép mọi origin và credentials
app.use(cors({
  origin: true,
  credentials: true
}));

// Proxy refresh-token trực tiếp sang auth-service
app.use('/api/refresh-token', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/refresh-token': '/api/refresh-token' }
}));

// Proxy tới employee-service
app.use('/api/employee', createProxyMiddleware({
  target: EMPLOYEE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/employee': '/api' }
}));

// Proxy tất cả các route /api/auth/* sang auth-service
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api' }
}));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
}); 