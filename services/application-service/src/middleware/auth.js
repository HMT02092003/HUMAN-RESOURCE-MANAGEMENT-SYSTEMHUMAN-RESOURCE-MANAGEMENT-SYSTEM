import jwt from 'jsonwebtoken';

/**
 * Middleware để xác thực token và lấy thông tin user
 * Đồng bộ với auth-service
 */
export const authenticateToken = (req, res, next) => {
  console.log('🔐 authenticateToken middleware called');
  
  // Đọc secret từ env mỗi lần gọi để tránh caching
  const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'default_jwt_secret';
  console.log('🔐 JWT_SECRET:', JWT_SECRET ? 'EXISTS' : 'MISSING');
  
  const token =
    req.cookies.token ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  console.log('🔐 Token from cookies:', req.cookies.token ? 'EXISTS' : 'MISSING');
  console.log('🔐 Token from header:', req.headers.authorization ? 'EXISTS' : 'MISSING');
  console.log('🔐 Final token:', token ? 'EXISTS' : 'MISSING');

  if (!token) {
    console.log('❌ No token found, returning 401');
    return res.status(401).json({ 
      success: false,
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded || typeof decoded !== 'object') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid access token' 
      });
    }

    // Đồng bộ với auth-service: thêm vào req.auth
    req.auth = {
      id: typeof decoded.sub === 'number' ? decoded.sub : Number(decoded.sub),
      username: decoded.username,
      permissions: decoded.permissions || [],
      roleId: decoded.roleId
    };

    // Giữ lại req.user để tương thích với controller hiện tại
    req.user = {
      id: typeof decoded.sub === 'number' ? decoded.sub : Number(decoded.sub),
      username: decoded.username,
      roleId: decoded.roleId
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Access token expired, please refresh' 
      });
    }
    return res.status(403).json({ 
      success: false,
      message: 'Forbidden: Invalid token' 
    });
  }
};
