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
  // Support both 'authorization' and 'Authorization' headers
  const token = req.headers['authorization'] || req.headers['Authorization'] as string;
  
  console.log('🔐 [Job Auth] Authorization header:', token ? `Bearer ${token.substring(7, 20)}...` : 'NOT FOUND');
  
  if (!token) {
    console.log('❌ [Job Auth] No token provided');
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  try {
    const tokenValue = token.startsWith('Bearer ') ? token.substring(7) : token;
    console.log('🔐 [Job Auth] Verifying token...');
    const decoded: any = jwt.verify(tokenValue, JWT_SECRET);
    console.log('✅ [Job Auth] Token decoded:', { sub: decoded.sub, username: decoded.username });
    
    if (!decoded || typeof decoded !== 'object') {
      console.log('❌ [Job Auth] Invalid token structure');
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
    console.log('❌ [Job Auth] Error:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Access token expired, please refresh' });
      return;
    }
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};
