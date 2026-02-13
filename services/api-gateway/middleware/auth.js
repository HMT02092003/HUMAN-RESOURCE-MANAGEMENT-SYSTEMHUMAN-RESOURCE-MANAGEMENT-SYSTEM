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

  // Attempt to verify token if it exists
  if (token) {
    try {
      const decoded = jwt.verify(token, secret);

      // Inject user data into headers
      if (decoded.sub) req.headers['x-user-id'] = String(decoded.sub);
      if (decoded.roleId) req.headers['x-user-role-id'] = String(decoded.roleId);

      const userDataJson = JSON.stringify(decoded);
      req.headers['x-user-data'] = Buffer.from(userDataJson).toString('base64');

      console.log(`🔐 Gateway Auth: User ${decoded.sub} authenticated.`);
    } catch (err) {
      console.error('⚠️ Gateway Token Verification Failed:', err.message);
    }
  }

  // PUBLIC AI ENDPOINTS: Face recognition should NOT be blocked/checked for token requirement here
  const publicAiPaths = [
    '/api/ai/recognize',
    '/api/ai/enhanced-recognize',
    '/api/ai/multi-angle-recognize',
    '/api/ai/detect'
  ];

  const isPublicAiPath = publicAiPaths.some(p => req.path.startsWith(p));

  if (isPublicAiPath) {
    console.log(`⏩ Public AI Path: ${req.path} - Skipping strict auth requirement`);
    return next();
  }

  // For non-public paths (like /api/ai/logs), if no token exists, we'll let it pass
  // but WITHOUT x-user-data. The downstream service (AI Service) will then see 
  // no user and can decide to return 401.

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
