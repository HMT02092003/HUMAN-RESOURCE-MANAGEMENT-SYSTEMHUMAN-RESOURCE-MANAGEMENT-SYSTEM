import { Request } from 'express';

/**
 * Extract user data from x-user-data header (Base64 encoded)
 * Falls back to req.user or req.auth if header not present
 */
export function getUserData(req: Request): any | null {
  // 1. Try to get from x-user-data header (from gateway)
  const xUserData = req.headers['x-user-data'];
  if (xUserData) {
    try {
      const decoded = Buffer.from(xUserData as string, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      console.error('❌ Failed to decode x-user-data:', error);
    }
  }

  // 2. Fallback to req.user or req.auth (set by middleware if present)
  const reqWithUser = req as any;
  return reqWithUser.user || reqWithUser.auth || null;
}

/**
 * Get user ID from request (tries multiple sources)
 */
export function getUserId(req: Request): number | undefined {
  const userData = getUserData(req);
  if (!userData) return undefined;
  
  // Try different possible locations of user ID
  return userData.sub || userData.user?.id || userData.id;
}
