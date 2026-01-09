import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import publicRoutes from './routes/api.js';
import internalRoutes from './routes/internal.js';
import SocketManager from './src/socket/index.js';
import jwt from 'jsonwebtoken';
import knex from './src/lib/database.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4009;

// CORS
app.use(cors({ origin: true, credentials: true }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Populate req.user from gateway headers (x-user-data or x-user-id)
app.use((req, res, next) => {
  try {
    const xUserData = req.headers['x-user-data'];
    const xUserId = req.headers['x-user-id'];

    if (xUserData && typeof xUserData === 'string') {
      try {
        const decoded = Buffer.from(xUserData, 'base64').toString('utf8');
        req.user = JSON.parse(decoded);
      } catch (e) {
        console.warn('Failed to parse x-user-data header in notification-service:', e.message);
      }
    } else if (xUserId) {
      // Minimal user object when only id is provided
      req.user = { sub: Number(xUserId), userId: Number(xUserId) };
    }
    
    // Fallback: if gateway didn't attach user but Authorization header present, verify JWT locally
    if (!req.user && req.headers['authorization']) {
      try {
        const authHeader = String(req.headers['authorization']);
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        const secret = process.env.JWT_SECRET;
        if (secret) {
          const decoded = jwt.verify(token, secret);
          req.user = decoded;
          console.log('Notification-service: decoded Authorization token locally, userId=', req.user.sub || req.user.id);
        }
      } catch (e) {
        console.warn('Failed to verify Authorization header in notification-service:', e.message);
      }
    }
  } catch (e) {
    console.error('Error in gateway header middleware:', e);
  }
  return next();
});

// Initialize Socket.io
SocketManager.initialize(httpServer);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'notification-service',
    port: PORT,
    socket_online: SocketManager.getOnlineCount()
  });
});

// Routes
app.use('/api', publicRoutes);        // Client routes (qua Gateway)
app.use('/internal', internalRoutes); // Internal routes (service to service)

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Notification Service running on port ${PORT}`);
  console.log(`🔌 Socket.io ready at ws://localhost:${PORT}`);
  
  // Test DB connection
  try {
    await knex.raw('SELECT 1');
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
});
