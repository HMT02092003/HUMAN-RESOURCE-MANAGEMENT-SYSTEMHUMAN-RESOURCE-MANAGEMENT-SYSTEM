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
    // Also support cookie-based auth
    token = req.cookies['token'];
  }
  
  if (!token) {
    // No token, pass through. Downstream services will handle 401 if auth is required.
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret);
    
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
    console.warn(`⚠️ Gateway Auth Failed: ${err.message}`);
    // We do NOT block the request here. We let it pass.
    // Downstream services will see missing x-user-headers and treat it as unauthenticated.
    // Unless we want to enforce auth at gateway for specific routes?
    // For now, "soft" auth is safer to avoid breaking public routes.
  }

  next();
};
