import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS: Cho phép mọi origin và credentials
app.use(cors({
  origin: true,
  credentials: true
}));

// Proxy tới employee-service (ĐẶT TRƯỚC)
app.use('/api/employee', createProxyMiddleware({
  target: 'http://localhost:4002',
  changeOrigin: true,
  pathRewrite: { '^/api/employee': '/api' },
  onProxyReq: (proxyReq, req, res) => {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      if (bodyData) {
        console.log(`[API Gateway] Forwarding to /api/employee -> /api | Body:`, bodyData);
      } else {
        console.log(`[API Gateway] Forwarding to /api/employee -> /api | No body`);
      }
    });
  }
}));

// Proxy tới auth-service (SAU)
app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:4001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api' },
  onProxyReq: (proxyReq, req, res) => {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', () => {
      if (bodyData) {
        console.log(`[API Gateway] Forwarding to /api/auth -> /api | Body:`, bodyData);
      } else {
        console.log(`[API Gateway] Forwarding to /api/auth -> /api | No body`);
      }
    });
  }
}));

// ... các proxy khác tương tự

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
}); 