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
  // Track which target to use
  let currentTarget = target;
  let hasSwitchedToFallback = false;

  const proxyMiddleware = createProxyMiddleware({
    target: currentTarget,
    changeOrigin: true,
    pathRewrite: pathRewrite || undefined,
    ws: ws || false, // Enable WebSocket proxying
    
    // ⏱️ TIMEOUT CONFIGURATION - Prevent deadlock (increased to 15s)
    timeout: 15000,      // Connection timeout: 15 seconds
    proxyTimeout: 15000, // Response timeout: 15 seconds
    
    // Dynamically resolve target on each request
    router: (req) => {
      return currentTarget;
    },
    
    onProxyReq: (proxyReq, req, res) => {
      // 🔥 LOG REQUEST HEADERS TRƯỚC KHI SET
      console.log('\n🌐🌐🌐 ===== API GATEWAY PROXY (BEFORE SET) ===== 🌐🌐🌐');
      console.log('📍 Original URL:', req.originalUrl);
      console.log('📍 req.headers["x-user-data"]:', req.headers['x-user-data'] ? 'EXISTS (length: ' + req.headers['x-user-data'].length + ')' : 'MISSING');
      console.log('📍 req.headers["authorization"]:', req.headers['authorization'] ? 'EXISTS' : 'MISSING');
      
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
          console.log('✅ x-user-data header forwarded to backend');
        } else {
          console.log('⚠️ x-user-data header NOT found in req.headers - NOT forwarded');
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
        console.error('❌ Error setting headers:', e);
      }
      
      // 🔥 LOG REQUEST QUA GATEWAY
      console.log('\n🌐🌐🌐 ===== API GATEWAY PROXY ===== 🌐🌐🌐');
      console.log('📍 Original URL:', req.originalUrl);
      console.log('📍 Target:', target);
      console.log('📍 Method:', req.method);
      console.log('📍 Path Rewrite:', pathRewrite);
      console.log('📍 Body:', JSON.stringify(req.body, null, 2));
      console.log('📍 Headers Authorization:', req.headers['authorization'] ? 'Present (Bearer token)' : 'Missing');
      console.log('📍 Headers x-user-data:', req.headers['x-user-data'] ? 'Present (length: ' + req.headers['x-user-data'].length + ')' : 'Missing');
      console.log('📍 Headers x-user-id:', req.headers['x-user-id'] || 'N/A');
      console.log('📍 Cookie token:', req.cookies?.token ? 'Present' : 'Missing');
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
      
      // ⚠️ CHỈ XỬ LÝ BODY NẾU EXPRESS CHƯA PARSE (bodyParser)
      // Nếu req.body đã tồn tại nghĩa là Express đã parse rồi, cần gửi lại dưới dạng JSON
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        
        // ⚠️ CHỈ WRITE 1 LẦN, KHÔNG WRITE NẾU ĐÃ SENT
        if (!proxyReq.writableEnded) {
          proxyReq.write(bodyData);
        }
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
      const errorCode = err && err.code ? err.code : 'UNKNOWN';
      const errorMsg = err && err.message ? err.message : String(err);
      
      console.error(`❌ Proxy error for ${req.url}:`, errorMsg);
      console.error(`📍 Error code: ${errorCode}`);
      console.error(`📍 Target: ${currentTarget}`);
      
      // Handle timeout specifically
      if (errorCode === 'ETIMEDOUT' || errorCode === 'ESOCKETTIMEDOUT') {
        console.error('⏱️ REQUEST TIMEOUT - Service took too long to respond');
      }
      
      // Try fallback if available and not already tried
      if (fallbackTarget && !hasSwitchedToFallback && (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT')) {
        console.warn(`⚠️  Primary target ${currentTarget} failed. Switching to fallback: ${fallbackTarget}`);
        currentTarget = fallbackTarget;
        hasSwitchedToFallback = true;
        
        // Retry the request with fallback target
        return proxyMiddleware(req, res);
      }
      
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
