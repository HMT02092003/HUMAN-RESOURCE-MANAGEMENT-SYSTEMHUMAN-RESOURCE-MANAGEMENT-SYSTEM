import axios from 'axios';

/**
 * Create a resilient proxy that attempts primary URL then falls back to secondary URL
 * @param {string} primaryUrl - Primary service URL (e.g., Docker service name)
 * @param {string} fallbackUrl - Fallback service URL (e.g., localhost)
 * @param {string} serviceName - Name of the service for logging
 * @param {object|false} pathRewrite - Path rewrite rules (e.g., {'^/api/auth': '/api'})
 * @returns {Function} Express middleware
 */
export const createResilientProxy = (primaryUrl, fallbackUrl, serviceName, pathRewrite = false) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Build the full target URL with path rewrite support
    const buildUrl = (baseUrl) => {
      let targetPath = req.originalUrl;
      
      // Apply path rewrite if configured
      if (pathRewrite && typeof pathRewrite === 'object') {
        for (const [pattern, replacement] of Object.entries(pathRewrite)) {
          const regex = new RegExp(pattern);
          if (regex.test(targetPath)) {
            targetPath = targetPath.replace(regex, replacement);
            break;
          }
        }
      }
      
      return `${baseUrl}${targetPath}`;
    };

    const primaryTarget = buildUrl(primaryUrl);
    const fallbackTarget = fallbackUrl ? buildUrl(fallbackUrl) : null;

    console.log(`\n🔄 [${serviceName}] Proxying request: ${req.method} ${req.originalUrl}`);
    console.log(`   Primary: ${primaryTarget}`);
    if (fallbackTarget) {
      console.log(`   Fallback: ${fallbackTarget}`);
    }

    // Prepare request config
    const requestConfig = {
      method: req.method,
      url: primaryTarget,
      headers: {
        ...req.headers,
        host: new URL(primaryUrl).host, // Override host header
      },
      timeout: 10000, // 10s timeout
      validateStatus: () => true, // Accept all status codes
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    };

    // Handle different content types
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      // For multipart, pass the raw body as-is
      requestConfig.data = req;
      requestConfig.headers['content-type'] = contentType;
    } else if (req.body !== undefined) {
      // For JSON and other types
      requestConfig.data = req.body;
    }

    // Remove problematic headers
    delete requestConfig.headers['content-length'];
    delete requestConfig.headers['connection'];

    let response;
    let usedUrl = primaryTarget;
    let attemptedFallback = false;

    try {
      // Attempt primary URL
      response = await axios(requestConfig);
      const duration = Date.now() - startTime;
      console.log(`✅ [${serviceName}] Primary success: ${response.status} (${duration}ms)`);
    } catch (primaryError) {
      console.warn(`⚠️  [${serviceName}] Primary failed: ${primaryError.message}`);

      // Try fallback URL if available
      if (fallbackTarget) {
        attemptedFallback = true;
        console.log(`🔄 [${serviceName}] Trying fallback...`);
        
        try {
          requestConfig.url = fallbackTarget;
          requestConfig.headers.host = new URL(fallbackUrl).host;
          
          response = await axios(requestConfig);
          usedUrl = fallbackTarget;
          const duration = Date.now() - startTime;
          console.log(`✅ [${serviceName}] Fallback success: ${response.status} (${duration}ms)`);
        } catch (fallbackError) {
          console.error(`❌ [${serviceName}] Fallback also failed: ${fallbackError.message}`);
          
          // Both attempts failed
          const duration = Date.now() - startTime;
          return res.status(503).json({
            error: 'Service unavailable',
            message: `${serviceName} is currently unavailable. Both primary and fallback endpoints failed.`,
            service: serviceName,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // No fallback available
        const duration = Date.now() - startTime;
        return res.status(503).json({
          error: 'Service unavailable',
          message: `${serviceName} is currently unavailable.`,
          service: serviceName,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Forward the response
    try {
      // Set CORS headers
      const origin = req.headers.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

      // Copy headers from service response
      Object.keys(response.headers).forEach(key => {
        // Skip some headers that shouldn't be forwarded
        if (!['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
          try {
            res.setHeader(key, response.headers[key]);
          } catch (e) {
            // Ignore header setting errors
          }
        }
      });

      // Add custom header to indicate which URL was used
      res.setHeader('X-Gateway-Used-Url', attemptedFallback ? 'fallback' : 'primary');

      // Send response
      res.status(response.status).send(response.data);
    } catch (error) {
      console.error(`❌ [${serviceName}] Error forwarding response:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Gateway error',
          message: 'Failed to forward service response',
          timestamp: new Date().toISOString()
        });
      }
    }
  };
};

/**
 * Get service URLs with fallback from environment variables
 * @param {string} envVarName - Name of the primary env var (e.g., 'AUTH_SERVICE_URL')
 * @returns {object} { primary, fallback }
 */
export const getServiceUrls = (envVarName) => {
  const primary = process.env[envVarName];
  const fallback = process.env[`${envVarName}_FALLBACK`];
  
  return { primary, fallback };
};
