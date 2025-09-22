import dotenv from 'dotenv';
import path from 'path';

// Load environment variables TRƯỚC KHI import các module khác
const envPath = path.resolve(process.cwd(), '.env');
const configEnvPath = path.resolve(process.cwd(), 'config.env');

dotenv.config({ path: envPath });
dotenv.config({ path: configEnvPath, override: false });

// Import sau khi đã load env
import express from 'express';
import cors from 'cors';
import { getServices, ROUTE_CONFIG } from './config/services.js';
import { createOptimizedProxy, requestLogger } from './middleware/proxy.js';

const app = express();
const PORT = process.env.PORT || 4000;
const SERVICES = getServices(); // Lấy services từ env vars

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true
}));

// Request logging (chỉ trong development)
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Tự động tạo proxy routes từ config
ROUTE_CONFIG.forEach(route => {
  const targetService = SERVICES[route.target];
  
  if (!targetService) {
    console.error(`❌ Service '${route.target}' not found for route '${route.path}'`);
    return;
  }
  
  app.use(
    route.path, 
    createOptimizedProxy(targetService, route.pathRewrite, route.handleMultipart)
  );
  
  console.log(`✅ Route registered: ${route.path} -> ${route.target} (${targetService})`);
});

// Health check endpoint cho API Gateway
app.get('/gateway-health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    port: PORT,
    services: SERVICES
  });
});

// Root endpoint với thông tin các routes
app.get('/', (req, res) => {
  const endpoints = ROUTE_CONFIG.reduce((acc, route) => {
    acc[route.path] = `${route.target} service`;
    return acc;
  }, {});

  res.json({
    message: 'HRMS API Gateway',
    version: '2.0.0',
    status: 'running',
    endpoints
  });
});

// Khởi động server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway v2.0 running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/gateway-health`);
  
  // Hiển thị trạng thái services
  Object.entries(SERVICES).forEach(([name, url]) => {
    console.log(`📡 ${name.toUpperCase()}: ${url || '❌ NOT CONFIGURED'}`);
  });
}); 