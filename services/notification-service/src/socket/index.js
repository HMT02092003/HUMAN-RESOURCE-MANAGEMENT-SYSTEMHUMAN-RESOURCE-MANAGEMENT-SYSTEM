import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

/**
 * Socket.io Manager
 * Quản lý Realtime connection cho Web Client
 */
class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // { userId: socketId }
  }

  /**
   * Khởi tạo Socket.io server
   * @param {http.Server} httpServer 
   */
  initialize(httpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: true,
        credentials: true
      },
      path: '/socket.io/'
    });

    // Middleware: Verify JWT token
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Standard JWT uses 'sub' claim for user ID, fallback to userId/id for compatibility
        socket.userId = decoded.sub || decoded.userId || decoded.id;
        
        if (!socket.userId) {
          console.error('❌ No user ID found in token:', decoded);
          return next(new Error('Invalid token - no user ID'));
        }
        
        console.log(`✅ Socket authenticated: userId=${socket.userId}`);
        next();
      } catch (error) {
        console.error('❌ Socket auth failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      
      // Store connection
      this.connectedUsers.set(userId, socket.id);
      
      // Join room theo userId
      socket.join(`user_${userId}`);
      
      console.log(`🔌 User ${userId} connected (socket: ${socket.id})`);

      // Handle disconnect
      socket.on('disconnect', () => {
        this.connectedUsers.delete(userId);
        console.log(`👋 User ${userId} disconnected`);
      });

      // Custom events (optional)
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });

    console.log('✅ Socket.io initialized');
  }

  /**
   * Emit event đến 1 user cụ thể
   * @param {number} userId 
   * @param {string} event 
   * @param {object} data 
   */
  emitToUser(userId, event, data) {
    if (!this.io) {
      console.warn('Socket.io not initialized');
      return false;
    }

    const room = `user_${userId}`;
    this.io.to(room).emit(event, data);
    
    const isOnline = this.connectedUsers.has(userId);
    console.log(`📤 Emit to user ${userId} (${event}): ${isOnline ? 'delivered' : 'offline'}`);
    
    return isOnline;
  }

  /**
   * Emit đến nhiều users
   * @param {number[]} userIds 
   * @param {string} event 
   * @param {object} data 
   */
  emitToUsers(userIds, event, data) {
    let deliveredCount = 0;
    userIds.forEach(userId => {
      if (this.emitToUser(userId, event, data)) {
        deliveredCount++;
      }
    });
    return deliveredCount;
  }

  /**
   * Broadcast đến tất cả clients
   */
  broadcast(event, data) {
    if (!this.io) return;
    this.io.emit(event, data);
    console.log(`📢 Broadcast: ${event}`);
  }

  /**
   * Kiểm tra user có đang online không
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Lấy số lượng users đang online
   */
  getOnlineCount() {
    return this.connectedUsers.size;
  }
}

// Export singleton
export default new SocketManager();
