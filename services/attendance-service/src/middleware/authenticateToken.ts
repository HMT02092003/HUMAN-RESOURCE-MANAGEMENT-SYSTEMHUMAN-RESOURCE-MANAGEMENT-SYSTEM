import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  auth?: any;
  user?: any;
}

const JWT_SECRET = process.env['JWT_SECRET'] || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1';

export const authenticateToken = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  // Accept Authorization header or token stored in cookies (cookie name: token)
  let token = (req.headers['authorization'] as string) || '';
  // If not provided in header, try to read cookie header and extract common cookie keys
  if (!token || String(token).trim() === '') {
    const cookieHeader = req.headers['cookie'] as string | undefined;
    if (cookieHeader) {
      // Parse cookies like 'key1=val1; key2=val2'
      const pairs = cookieHeader.split(';').map(s => s.trim());
      for (const p of pairs) {
        const [k, v] = p.split('=');
        if (!k) continue;
        const key = k.trim();
        const val = (v || '').trim();
        if (key === 'token' || key === 'accessToken' || key === 'auth_token') {
          token = val;
          break;
        }
      }
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  try {
    const tokenValue = token.startsWith('Bearer ') ? token.substring(7) : token;
    const decoded: any = jwt.verify(tokenValue, JWT_SECRET);
    
    if (!decoded || typeof decoded !== 'object') {
      res.status(401).json({ success: false, message: 'Invalid access token' });
      return;
    }

    const authData = {
      id: typeof decoded.sub === 'number' ? decoded.sub : Number(decoded.sub),
      username: decoded.username as string,
      permissions: decoded.permissions as any[],
      roleId: decoded.roleId as number
    };

    req.auth = authData;
    req.user = authData;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Access token expired, please refresh' });
      return;
    }
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};
