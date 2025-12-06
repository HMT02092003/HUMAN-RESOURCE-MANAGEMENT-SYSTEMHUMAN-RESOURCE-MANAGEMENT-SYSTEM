import AuthService from '../integrations/AuthService';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers['authorization'];
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    // Gọi đúng endpoint xác thực token của auth-service
    const data = await AuthService.checkAuth(token);
    req.user = data.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};