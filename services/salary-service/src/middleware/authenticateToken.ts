import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  auth?: any;
  user?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1';

export const authenticateToken = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const token = req.headers['authorization'];
  
  if (!token) {
    // Debug: missing Authorization header
    console.warn('[salary-service] authenticateToken: No Authorization header present on request to', req.method, req.originalUrl);
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
      console.warn('[salary-service] authenticateToken: Token expired for request to', req.method, req.originalUrl);
      res.status(401).json({ success: false, message: 'Access token expired, please refresh' });
      return;
    }
    console.warn('[salary-service] authenticateToken: Invalid token for request to', req.method, req.originalUrl, 'error:', error?.message || error);
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};
