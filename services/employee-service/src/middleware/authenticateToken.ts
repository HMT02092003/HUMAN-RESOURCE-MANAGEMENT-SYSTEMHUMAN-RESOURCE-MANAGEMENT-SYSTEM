import axios from 'axios';
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
    const response = await axios.get('http://localhost:4001/api/check-auth', {
      headers: { Authorization: token }
    });
    req.user = response.data.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
}; 