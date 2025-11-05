import { Request } from 'express';

/**
 * Utility to extract both access and refresh tokens from the request.
 * Priority for access token: cookie `token` -> Authorization header `Bearer ...`
 * Refresh token is read from cookie `refreshToken`.
 * If cookie access token exists but Authorization header missing, the header
 * will be set to `Bearer <token>` for downstream code compatibility.
 */
export const getTokensFromRequest = (req: Request): { accessToken: string | null; refreshToken: string | null } => {
  const anyReq = req as any;

  const cookieAccess = anyReq.cookies?.token || null;
  const cookieRefresh = anyReq.cookies?.refreshToken || null;

  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const headerAccess = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const accessToken = cookieAccess || headerAccess || null;

  if (cookieAccess && !authHeader) {
    anyReq.headers = anyReq.headers || {};
    anyReq.headers.authorization = `Bearer ${cookieAccess}`;
  }

  return { accessToken, refreshToken: cookieRefresh };
};

export default getTokensFromRequest;
