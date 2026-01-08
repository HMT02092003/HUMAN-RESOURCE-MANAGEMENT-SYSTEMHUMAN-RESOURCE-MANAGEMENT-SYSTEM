import { createProxyMiddleware } from 'http-proxy-middleware';

/**
 * Tạo proxy middleware với cấu hình tối ưu
 * @param {string} target - URL đích của service
 * @param {object|false} pathRewrite - Cấu hình rewrite path
 * @param {boolean} handleMultipart - Có xử lý multipart data không
 * @returns {Function} Express middleware
 */
const createOptimizedProxy = (target, pathRewrite = false, handleMultipart = false) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: pathRewrite || undefined,
    
    onProxyReq: (proxyReq, req, res) => {
      // Set auth headers FIRST before any body writes
      try {
        // Forward authorization header
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (authHeader) {
          proxyReq.setHeader('Authorization', String(authHeader));
        }
        
        // Forward x-user-data header (contains decoded JWT)
        if (req.headers['x-user-data']) {
          proxyReq.setHeader('x-user-data', String(req.headers['x-user-data']));
        }
        
        // Forward x-user-id header
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', String(req.headers['x-user-id']));
        }
        
        // Forward x-user-role-id header
        if (req.headers['x-user-role-id']) {
          proxyReq.setHeader('x-user-role-id', String(req.headers['x-user-role-id']));
        }
      } catch (e) {
        console.error('Error setting headers:', e);
      }
      
      // 🔥 LOG REQUEST QUA GATEWAY
      console.log('\n🌐🌐🌐 ===== API GATEWAY PROXY ===== 🌐🌐🌐');
      console.log('📍 Original URL:', req.originalUrl);
      console.log('📍 Target:', target);
      console.log('📍 Method:', req.method);
      console.log('📍 Path Rewrite:', pathRewrite);
      console.log('📍 Body:', JSON.stringify(req.body, null, 2));
      console.log('📍 Headers x-user-data:', req.headers['x-user-data'] ? 'Present' : 'Missing');
      console.log('📍 Headers x-user-id:', req.headers['x-user-id'] || 'N/A');
      console.log('🌐🌐🌐 ================================ 🌐🌐🌐\n');

      const contentType = req.headers['content-type'] || '';
      
      // Xử lý multipart form data (cho upload file)
      if (handleMultipart && contentType.includes('multipart/form-data')) {
        const boundary = contentType.split('boundary=')[1];
        if (boundary) {
          proxyReq.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
        }
        return;
      }
      
      // Xử lý JSON data (bao gồm cả empty object {})
      if (contentType.includes('application/json') && req.body !== undefined) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Ensure CORS headers are present on proxied responses so browser clients are not blocked
      const origin = req.headers.origin || '*';
      try {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      } catch (e) {
        // ignore header set errors
      }
    },
    
    onError: (err, req, res) => {
      console.error(`❌ Proxy error for ${req.url}:`, err && err.message ? err.message : err);
      // Ensure CORS headers so browser gets the JSON error
      const origin = req && req.headers ? req.headers.origin || '*' : '*';
      try {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      } catch (e) {}

      // If headers already sent, just end
      if (res.headersSent) return res.end();

      res.status(502).json({ 
        error: 'Bad gateway', 
        message: 'Service temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });
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
