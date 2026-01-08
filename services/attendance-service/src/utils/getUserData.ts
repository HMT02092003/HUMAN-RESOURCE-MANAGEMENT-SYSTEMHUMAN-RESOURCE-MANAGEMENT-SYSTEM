/**
 * Helper to extract user data from request
 * Priority: x-user-data header (from gateway) > req.user > req.auth
 */
import { Request } from 'express';

export function getUserData(req: Request): any | null {
  // 1. Try x-user-data header from gateway (Base64 encoded)
  const xUserData = req.headers['x-user-data'];
  if (xUserData) {
    try {
      const decoded = Buffer.from(xUserData as string, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      console.error('[getUserData] Failed to decode x-user-data:', e);
    }
  }

  // 2. Fallback to req.user or req.auth (set by middleware)
  const reqWithUser = req as any;
  if (reqWithUser.user) return reqWithUser.user;
  if (reqWithUser.auth) return reqWithUser.auth;

  return null;
}

export function getUserId(req: Request): number | undefined {
  const userData = getUserData(req);
  if (!userData) return undefined;
  
  // Token structure: { sub: userId, user: {...}, ... }
  return userData.sub || userData.user?.id || userData.id;
}
