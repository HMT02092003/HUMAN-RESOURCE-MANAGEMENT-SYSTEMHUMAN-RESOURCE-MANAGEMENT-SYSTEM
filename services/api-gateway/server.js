import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables TRƯỚC KHI import các module khác
const envPath = path.resolve(process.cwd(), '.env');
const configEnvPath = path.resolve(process.cwd(), 'config.env');

dotenv.config({ path: envPath });
dotenv.config({ path: configEnvPath, override: false });

// Import sau khi đã load env 
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getServices, getServicesFallback, ROUTE_CONFIG } from './config/services.js';
import { createOptimizedProxy, requestLogger } from './middleware/proxy.js';
import { createResilientProxy } from './middleware/resilient-proxy.js';
import { gatewayAuth } from './middleware/auth.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true
  },
  path: '/socket.io/'
});

const PORT = process.env.PORT || 4000;
const SERVICES = getServices(); // Lấy services từ env vars
const SERVICES_FALLBACK = getServicesFallback(); // Lấy fallback URLs

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User authentication
  socket.on('authenticate', (userId) => {
    if (userId) {
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`✅ User ${userId} authenticated with socket ${socket.id}`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`👋 User ${socket.userId} disconnected`);
    } else {
      console.log(`👋 Socket ${socket.id} disconnected`);
    }
  });
});

// Export socket functions for use in other modules
export function emitToUser(userId, event, data) {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
}

export function emitToUsers(userIds, event, data) {
  const results = userIds.map(userId => emitToUser(userId, event, data));
  return results.filter(r => r).length;
}

export function broadcastToAll(event, data) {
  io.emit(event, data);
}

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
app.use(cookieParser());

// Gateway Authentication Middleware
app.use(gatewayAuth);

// LAN Only Middleware for Attendance check-in/out
app.use((req, res, next) => {
  const isAttendanceRoute = req.path.startsWith('/api/attendance/check-in') || req.path.startsWith('/api/attendance/check-out');

  if (isAttendanceRoute) {
    const host = req.headers.host || '';
    const forwardedHost = req.headers['x-forwarded-host'] || '';
    const origin = req.headers.origin || '';

    // Check if the request is coming via ngrok
    if (host.includes('ngrok') || forwardedHost.includes('ngrok') || origin.includes('ngrok')) {
      console.warn(`🛑 LAN-ONLY SECURITY: Blocked external/ngrok access to attendance API from host: ${host}`);
      return res.status(403).json({
        success: false,
        message: 'Truy cập bị từ chối. Tính năng chấm công chỉ khả dụng trong mạng nội bộ (LAN) của trường.',
        error: 'LAN_ONLY_ACCESS_REQUIRED'
      });
    }
  }
  next();
});

// Dashboard aggregation routes (before proxy routes)
app.use('/api/dashboard', dashboardRoutes);

// Tự động tạo proxy routes từ config với fallback support
ROUTE_CONFIG.forEach(route => {
  const targetService = SERVICES[route.target];
  const fallbackService = SERVICES_FALLBACK[route.target];

  if (!targetService) {
    console.error(`❌ Service '${route.target}' not found for route '${route.path}'`);
    return;
  }

  // Always use createOptimizedProxy (now with fallback support built-in)
  app.use(
    route.path,
    createOptimizedProxy(
      targetService,
      fallbackService,  // Pass fallback URL
      route.pathRewrite,
      route.handleMultipart,
      route.ws
    )
  );

  const wsIndicator = route.ws ? ' [WS]' : '';
  const multipartIndicator = route.handleMultipart ? ' [Multipart]' : '';
  const fallbackIndicator = fallbackService ? ` (fallback: ${fallbackService})` : '';
  console.log(`✅ Route registered: ${route.path} -> ${route.target} (${targetService})${wsIndicator}${multipartIndicator}${fallbackIndicator}`);
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

// Khởi động server (với xử lý lỗi startup)
const server = httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway v2.0 running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready at ws://localhost:${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/gateway-health`);

  // Hiển thị trạng thái services
  Object.entries(SERVICES).forEach(([name, url]) => {
    console.log(`📡 ${name.toUpperCase()}: ${url || '❌ NOT CONFIGURED'}`);
  });
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} already in use. Another process is listening on this port.`);
    console.error('Please stop the conflicting process or change the PORT environment variable.');
    process.exit(1);
  }
  console.error('API Gateway startup error:', err);
  process.exit(1);
});
