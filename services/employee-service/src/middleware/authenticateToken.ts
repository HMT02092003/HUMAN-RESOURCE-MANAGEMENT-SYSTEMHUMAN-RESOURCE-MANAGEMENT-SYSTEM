import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  auth?: any;
  user?: any;
}

/**
 * Simplified authentication middleware for services behind API Gateway.
 * This middleware trusts the x-user-data header injected by the gateway.
 * For internal service-to-service calls, it allows the request to pass through.
 */
export const authenticateToken = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  // Trust Gateway-injected header (for external requests through gateway)
  // Gateway sends Base64-encoded JSON to avoid HTTP header character issues
  const gatewayUserData = req.headers['x-user-data'];
  if (gatewayUserData) {
    try {
      const decoded = Buffer.from(gatewayUserData as string, 'base64').toString('utf8');
      const user = JSON.parse(decoded);
      req.auth = user;
      req.user = user;
      return next();
    } catch (e) {
      console.error('[Auth Middleware] Failed to parse x-user-data', e);
    }
  }

  // For internal service-to-service calls, check if it's from trusted internal network
  // Allow requests from localhost or internal IPs to pass through
  const clientIp = req.ip || req.connection.remoteAddress;
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp?.startsWith('::ffff:127.0.0.1')) {
    console.log('[Auth Middleware] Internal service call detected, allowing request');
    return next();
  }

  console.warn('[Auth Middleware] Missing Gateway Authentication from:', clientIp);
  res.status(401).json({ success: false, message: 'Unauthorized: Missing Gateway Authentication' });
};

/**
 * Optional: Middleware that allows unauthenticated requests (for public endpoints)
 */
export const optionalAuth = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const gatewayUserData = req.headers['x-user-data'];
  if (gatewayUserData) {
    try {
      const decoded = Buffer.from(gatewayUserData as string, 'base64').toString('utf8');
      const user = JSON.parse(decoded);
      req.auth = user;
      req.user = user;
    } catch (e) {
      console.error('[Optional Auth] Failed to parse x-user-data', e);
    }
  }
  next();
};