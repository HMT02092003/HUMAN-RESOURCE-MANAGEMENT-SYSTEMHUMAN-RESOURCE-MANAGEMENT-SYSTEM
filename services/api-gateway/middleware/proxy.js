import { createProxyMiddleware } from 'http-proxy-middleware';

/**
 * Tạo proxy middleware với cấu hình tối ưu và fallback support
 * @param {string} target - URL đích của service
 * @param {string} fallbackTarget - URL fallback nếu primary fail
 * @param {object|false} pathRewrite - Cấu hình rewrite path
 * @param {boolean} handleMultipart - Có xử lý multipart data không
 * @param {boolean} ws - Enable WebSocket support (cho Socket.io)
 * @returns {Function} Express middleware
 */
const createOptimizedProxy = (target, fallbackTarget = null, pathRewrite = false, handleMultipart = false, ws = false) => {
  const proxyMiddleware = createProxyMiddleware({
    target: target,
    changeOrigin: true,
    pathRewrite: pathRewrite || undefined,
    ws: ws || false,

    // ⏱️ TIMEOUT CONFIGURATION
    // AI service video processing: 20 frames × ~1.3s ≈ 26s, set 120s for safety
    timeout: 120000,
    proxyTimeout: 120000,

    router: (req) => {
      // If the request was already marked as failing by the error handler, use fallback
      return req.useFallback ? fallbackTarget : target;
    },

    onProxyReq: (proxyReq, req, res) => {
      const actualTarget = req.useFallback ? fallbackTarget : target;

      // auth headers ...
      try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (authHeader) {
          proxyReq.setHeader('Authorization', String(authHeader));
        }

        if (req.headers['x-user-data']) {
          proxyReq.setHeader('x-user-data', String(req.headers['x-user-data']));
        }

        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', String(req.headers['x-user-id']));
        }
      } catch (e) {
        console.error('❌ Error setting headers:', e);
      }

      console.log('\n🌐🌐🌐 ===== API GATEWAY PROXY ===== 🌐🌐🌐');
      console.log('📍 Original URL:', req.originalUrl);
      console.log('📍 Proxy to:', actualTarget + proxyReq.path);
      console.log('📍 Method:', req.method);
      console.log('🌐🌐🌐 ================================\n');

      const contentType = req.headers['content-type'] || '';
      if (handleMultipart && contentType.includes('multipart/form-data')) {
        const boundary = contentType.split('boundary=')[1];
        if (boundary) {
          proxyReq.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
        }
        return;
      }

      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        if (!proxyReq.writableEnded) {
          proxyReq.write(bodyData);
        }
      }
    },

    onError: (err, req, res) => {
      const errorCode = err && err.code ? err.code : 'UNKNOWN';
      const errorMsg = err && err.message ? err.message : String(err);
      const currentTargetUsed = req.useFallback ? fallbackTarget : target;

      console.error(`❌ Proxy error for ${req.url}:`, errorMsg);
      console.error(`📍 Error code: ${errorCode}`);
      console.error(`📍 Target used: ${currentTargetUsed}`);

      // Try fallback if primary failed and we haven't tried fallback yet
      if (fallbackTarget && !req.useFallback && (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT')) {
        console.warn(`⚠️  Primary target ${target} failed. Retrying with fallback: ${fallbackTarget}`);
        req.useFallback = true;

        // Re-run the middleware with the same req/res
        return proxyMiddleware(req, res);
      }

      // Ensure CORS headers so browser gets the JSON error
      const origin = req && req.headers ? req.headers.origin || '*' : '*';
      try {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      } catch (e) { }

      // If headers already sent, just end
      if (res.headersSent) return res.end();

      // Return appropriate error based on error type
      const statusCode = errorCode === 'ETIMEDOUT' || errorCode === 'ESOCKETTIMEDOUT' ? 504 : 502;
      const message = errorCode === 'ETIMEDOUT' || errorCode === 'ESOCKETTIMEDOUT'
        ? 'Service đang xử lý quá lâu hoặc bị treo. Vui lòng thử lại sau.'
        : 'Service tạm thời không khả dụng';

      res.status(statusCode).json({
        success: false,
        error: errorCode,
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return proxyMiddleware;
};

/**
 * Middleware để log requests (chỉ khi cần thiết)
 */
const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
};

export { createOptimizedProxy, requestLogger };
