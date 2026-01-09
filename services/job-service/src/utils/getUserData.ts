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
 * Returns a valid number or undefined (never NaN)
 */
export function getUserId(req: Request): number | undefined {
  const userData = getUserData(req);
  if (!userData) return undefined;
  
  // Try different possible locations of user ID
  const rawId = userData.sub || userData.userId || userData.user_id || userData.user?.id || userData.id;
  
  // Convert to number and validate
  if (rawId === null || rawId === undefined) return undefined;
  const numId = Number(rawId);
  
  // Return undefined if conversion results in NaN or invalid number
  return (!isNaN(numId) && isFinite(numId)) ? numId : undefined;
}
