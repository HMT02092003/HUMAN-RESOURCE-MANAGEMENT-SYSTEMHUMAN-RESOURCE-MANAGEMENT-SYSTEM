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
    
    onError: (err, req, res) => {
      console.error(`Proxy error for ${req.url}:`, err.message);
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
