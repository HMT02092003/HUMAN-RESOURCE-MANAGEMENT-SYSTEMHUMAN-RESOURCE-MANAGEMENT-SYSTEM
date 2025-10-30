import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1';

function parseTokenFromCookieHeader(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map(s => s.trim());
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === 'token') return decodeURIComponent(v || '');
  }
  return null;
}

export default async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined | null = undefined;

    // Authorization header preferred
    const authHeader = req.headers.authorization || (req.headers as any).Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback to cookie header (if cookie-parser not used)
    if (!token) {
      const cookieHeader = req.headers.cookie as string | undefined;
      token = parseTokenFromCookieHeader(cookieHeader);
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized: no token provided' });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    // auth-service sets payload { sub: userId, user: { ... } }
    if (decoded && (decoded.user || decoded.sub)) {
      // Attach user object for downstream handlers
      (req as any).user = decoded.user ? decoded.user : { id: decoded.sub };
      return next();
    }

    return res.status(401).json({ success: false, message: 'Unauthorized: invalid token' });
  } catch (err: any) {
    console.warn('[salary-service] auth failure', err && err.message ? err.message : err);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}
