import jwt from 'jsonwebtoken';

// Lazy load JWT_SECRET to avoid module import order issues
let JWT_SECRET = null;
let secretChecked = false;

const ensureJwtSecret = () => {
  if (!secretChecked) {
    JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('❌ CRITICAL: JWT_SECRET is not defined in environment variables!');
      console.error('Environment keys:', Object.keys(process.env).filter(k => k.includes('JWT')));
      process.exit(1);
    }
    console.log('✅ Gateway JWT_SECRET loaded successfully');
    secretChecked = true;
  }
  return JWT_SECRET;
};

/**
 * Middleware to verify JWT at the gateway level and inject user data into headers.
 * This allows downstream services to trust the headers and skip token verification.
 */
export const gatewayAuth = (req, res, next) => {
  const secret = ensureJwtSecret(); // Check on first request

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies['token']) {
    token = req.cookies['token'];
  }

  // If token exists, always attempt to verify and inject user data
  if (token) {
    try {
      const decoded = jwt.verify(token, secret);

      // Inject user data into headers (compatible with previous services)
      if (decoded.sub) {
        req.headers['x-user-id'] = String(decoded.sub);
      }
      if (decoded.roleId) {
        req.headers['x-user-role-id'] = String(decoded.roleId);
      }

      // Core: Pass full decoded token via Base64 header
      const userDataJson = JSON.stringify(decoded);
      req.headers['x-user-data'] = Buffer.from(userDataJson).toString('base64');

      console.log(`🔐 Gateway Auth: User ${decoded.sub} (Role: ${decoded.user?.roleId || decoded.roleId}) authenticated.`);
    } catch (err) {
      console.error('⚠️ Gateway Token Verification Failed:', err.message);
    }
  }

  // Paths that are truly open/public (e.g. face recognition entry points)
  // Others like /api/ai/logs will now have x-user-data if user is logged in
  const publicAiPaths = ['/api/ai/enhanced-recognize', '/api/ai/multi-angle-recognize', '/api/ai/recognize'];

  // Optional: If we want to skip EVERYTHING for certain paths, we could return here
  // But injecting x-user-data is harmless even for public paths.

  if (!token) {
    // No token, pass through. Downstream services will handle 401 if auth is required.
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret);

    console.log('✅ Gateway JWT verified. User:', decoded.sub || decoded.id);

    // Inject user data into headers
    // Use Base64 encoding to avoid invalid characters in HTTP headers
    // Services will need to decode: Buffer.from(header, 'base64').toString('utf8')

    if (decoded.sub) {
      req.headers['x-user-id'] = String(decoded.sub);
    }

    if (decoded.roleId) {
      req.headers['x-user-role-id'] = String(decoded.roleId);
    }

    // Pass the full decoded token data as Base64-encoded JSON string
    // This avoids HTTP header character restrictions (newlines, special chars, etc)
    const userDataJson = JSON.stringify(decoded);
    req.headers['x-user-data'] = Buffer.from(userDataJson).toString('base64');

    // Also keep the original Authorization header for backward compatibility

    console.log(`🔐 Gateway Auth: User ${decoded.sub} (Role: ${decoded.roleId}) authenticated.`);

  } catch (err) {
    console.error('⚠️ ========================================');
    console.error('⚠️ GATEWAY AUTH FAILED');
    console.error(`⚠️ Error: ${err.message}`);
    console.error(`⚠️ Error Name: ${err.name}`);
    console.error(`⚠️ Token (first 20 chars): ${token ? token.substring(0, 20) + '...' : 'N/A'}`);
    console.error(`⚠️ JWT_SECRET configured: ${secret ? 'YES (length: ' + secret.length + ')' : 'NO'}`);
    console.error('⚠️ ========================================');
    // We do NOT block the request here. We let it pass.
    // Downstream services will see missing x-user-headers and treat it as unauthenticated.
    // Unless we want to enforce auth at gateway for specific routes?
    // For now, "soft" auth is safer to avoid breaking public routes.
  }

  next();
};
