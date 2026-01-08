import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '@/src/Models/UserModel';
import RoleModel from '@/src/Models/RoleModel';
import RolePermissionModel from '@/src/Models/RolePermissionModel';
import PermissionModel from '@/src/Models/PermissionModel';
// import { otpService } from '@/src/service/otpService';

// Extend Request interface to include auth property
declare module 'express' {
  interface Request {
    auth?: {
      id: number;
      username: string;
      permissions?: any[];
      roleId: number;
    };
  }
}

const { SECRET_KEY_ADMIN, JWT_EXPIRE_ADMIN, JWT_REFRESH_TIME } = process.env;
const JWT_SECRET = process.env.JWT_SECRET || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1';

// Hàm để chuyển đổi tên quyền từ tiếng Việt có dấu sang dạng không dấu
const removeVietnameseTones = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, '');
};

export const registerHandler = async (req: Request, res: Response) => {
  console.log('Received data from FE:', req.body);
  try {
    const { username, firstName, lastName, password, roleId = 2, email } = req.body; // roleId mặc định là 2 cho người dùng thông thường
    const hashedPassword = await bcrypt.hash(password, 12);

    // Kiểm tra username đã tồn tại chưa
    const existingUser = await UserModel.query().findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        error: 'Tên đăng nhập này đã tồn tại'
      });
    }

    // Tạo người dùng mới
    const userData = {
      username,
      firstName,
      lastName,
      password: hashedPassword,
      roleId,
      email,
      status: "2",
    };

    // Use type assertion for insert
    const user = await UserModel.query().insert(userData as any);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          roleId: user.roleId
        }
      },
    });
  } catch (err) {
    console.error('Error during user registration:', err);
    if ((err as any).code === '23505') {
      return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
    }
    res.status(500).json({ error: 'Internal server error', details: (err as any).message || err });
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    console.log('loginHandler called, body:', req.body);
    const { username, email, password } = req.body;

    // Kiểm tra thông tin đăng nhập - support both username and email
    const user = await UserModel.query().findOne({ 
      ...(username && { username }), 
      ...(email && { email }) 
    });
    if (!user) {
      return res.status(400).json({ error: 'Tài khoản không tồn tại trong hệ thống' });
    }

    // Kiểm tra mật khẩu
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Mật khẩu không chính xác' });
    }

    // Debug: log user status
    console.log('User status:', user.status, 'Type:', typeof user.status);

    const checkStatusAccount = await UserModel.query().findOne({ id: user.id, status: 1 });
    console.log('checkStatusAccount:', checkStatusAccount);
    
    if (!checkStatusAccount) {
      console.log('Status check failed - user status is:', user.status);
      return res.status(400).json({ error: 'Hiện tại không thể đăng nhập vào tài khoản này' });
    }

    // Lấy thông tin quyền hạn
    const permissions = await PermissionModel.query()
      .join('role_permissions', 'permissions.id', 'role_permissions.permissionId')
      .where('role_permissions.roleId', user.roleId)
      .select('permissions.name', 'permissions.key', 'role_permissions.value', 'role_permissions.scope');

    // Normalize permission names to no-tone keys
    const formattedPermissions = permissions.reduce((acc: Record<string, boolean>, p: any) => {
      // reuse removeVietnameseTones if available in scope
      const key = p.key || removeVietnameseTones(p.name);
      acc[key] = p.value;
      return acc;
    }, {});

    const formattedScope = permissions.reduce((acc: Record<string, boolean>, p: any) => {
      // reuse removeVietnameseTones if available in scope
      const key = p.key || removeVietnameseTones(p.name);
      acc[key] = p.scope;
      return acc;
    }, {});

    // Loại bỏ mật khẩu khỏi đối tượng user
    const { password: _, ...userWithoutPassword } = user;

    // Tạo payload cho token với đầy đủ thông tin người dùng
    const accessTokenPayload = {
      sub: user.id,
      user: {
        ...userWithoutPassword,
        permissions: formattedPermissions,
        scope: formattedScope
      }
    };

    // Payload đơn giản hơn cho refresh token
    const refreshTokenPayload = {
      sub: user.id,
      username: user.username
    };

    // Tạo access token - thời hạn ngắn (30 phút cho mobile app)
    const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, {
      expiresIn: '30m' // 30 phút
    });

    // Tạo refresh token - thời hạn dài (7 ngày)
    const refreshToken = jwt.sign(refreshTokenPayload, JWT_SECRET, {
      expiresIn: '7d'
    });

    // Thiết lập cookie
    res.cookie('token', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 30 * 60 * 1000, // 30 phút
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: false, // Bảo mật hơn
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return res.json({
      status: 'success',
      token: accessToken,
      refreshToken: refreshToken, // gửi cả refresh token về client
      user: { ...userWithoutPassword, permissions: formattedPermissions }
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logoutHandler = async (req: Request, res: Response) => {
  try {
    // Xóa cả hai loại token
    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });

    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password are required' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY_ADMIN || JWT_SECRET);
    if (!decoded || typeof decoded !== 'object') {
      return res.status(401).json({ message: 'The token has expired or is invalid' });
    }

    // Fix: Type conversion for userId
    const userId = typeof decoded.id === 'number'
      ? decoded.id
      : typeof decoded.sub === 'number'
        ? decoded.sub
        : Number(decoded.sub);

    // Hash mật khẩu mới
    const saltRounds = 10;
    const hash = await bcrypt.hash(newPassword, saltRounds);

    // Cập nhật mật khẩu
    await UserModel.query()
      .findById(userId)
      .patch({
        password: hash,
      } as any);

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return res.status(401).json({ message: 'The token has expired or is invalid' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { password } = req.body;
  const { auth } = req; // Từ middleware

  if (!auth?.id) return res.status(401).json({ message: 'Unauthorized' });
  if (!password) return res.status(400).json({ message: 'New password is required' });

  try {
    const user = await UserModel.query().findById(auth.id);
    if (!user) return res.status(404).json({ message: "User doesn't exist" });

    // Hash mật khẩu mới
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    // Cập nhật mật khẩu
    const updatedUser = await UserModel.query()
      .findById(auth.id)
      .patch({
        password: hash,
      } as any)
      .returning('*')
      .first();

    // Trả về thông tin người dùng đã cập nhật, không kèm mật khẩu
    if (updatedUser) {
      const { password: _, ...userWithoutPassword } = updatedUser;
      return res.json(userWithoutPassword);
    }

    return res.status(500).json({ message: 'Failed to update user' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  console.log("aaaaaaaaaaaaaaaaaaaâ")
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token không được cung cấp' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (!decoded || typeof decoded !== 'object') {
      res.status(401).json({ message: 'Refresh token không hợp lệ' });
      return;
    }

    const userId = typeof decoded.sub === 'number' ? decoded.sub : Number(decoded.sub);

    const user = await UserModel.query().findById(userId);
    if (!user) {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
      return;
    }

    // --- Start: Replicating loginHandler's user data and token generation ---
    const permissions = await PermissionModel.query()
      .join('role_permissions', 'permissions.id', 'role_permissions.permissionId')
      .where('role_permissions.roleId', user.roleId)
      .select('permissions.name', 'permissions.key', 'role_permissions.value', 'role_permissions.scope'); // Include scope here

    const formattedPermissions = permissions.reduce((acc: Record<string, boolean>, p: any) => {
      const key = p.key || removeVietnameseTones(p.name);
      acc[key] = p.value;
      return acc;
    }, {});

    const formattedScope = permissions.reduce((acc: Record<string, boolean>, p: any) => {
      const key = p.key || removeVietnameseTones(p.name);
      acc[key] = p.scope;
      return acc;
    }, {});

    const { password: _, ...userWithoutPassword } = user;

    const accessTokenPayload = {
      sub: user.id,
      user: {
        ...userWithoutPassword,
        permissions: formattedPermissions,
        scope: formattedScope
      }
    };

    // We don't need to re-create a *new* refresh token for the response
    // if the existing one is still valid and we're just refreshing the access token.
    // However, if you *want* to issue a sliding refresh token (where its expiry is extended
    // with each refresh), you would create a new one here as well.
    // For now, we'll just return the original valid refreshToken if it was passed in the request.

    const newAccessToken = jwt.sign(accessTokenPayload, JWT_SECRET, {
      expiresIn: '30m' // 30 phút (giống login)
    });

    res.cookie('token', newAccessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 30 * 60 * 1000, // 30 phút
    });

    // --- End: Replicating loginHandler's user data and token generation ---

    res.json({
      status: 'success',
      token: newAccessToken,
      refreshToken: refreshToken, // Return the existing refresh token
      user: { ...userWithoutPassword, permissions: formattedPermissions, scope: formattedScope } // Return the user object with permissions and scope
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Refresh token đã hết hạn, vui lòng đăng nhập lại' });
      return;
    }
    res.status(500).json({ message: error.message });
    return;
  }
};

export const sendOTPController = async (req: Request, res: Response) => {
  console.log("Dữ liệu nhận vào controller:", req.body);

  try {
    const { username } = req.body;

    // Kiểm tra sự tồn tại của username trong database
    const user = await UserModel.query().findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản trong CSDL' });
    }

    // Nếu có email trong bảng user, sử dụng để gửi link reset password
    if (user.email) {
      try {
        const sent = '';
        // const sent = await otpService.sendResetPasswordLink(user.email);
        if (!sent) {
          return res.status(500).json({ error: 'Gửi link đổi mật khẩu thất bại' });
        }
      } catch (error) {
        return res.status(500).json({ error: 'Lỗi trong quá trình gửi link đổi mật khẩu', details: (error as any).message });
      }
    } else {
      return res.status(400).json({ error: 'Tài khoản không có email để gửi link đổi mật khẩu' });
    }

    return res.status(200).json({ message: 'Reset password link sent successfully' });
  } catch (error) {
    console.error('Error sending reset password link:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi trong quá trình xử lý', details: (error as any).message });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  console.log("Dữ liệu nhận vào controller resetPasswordController:", req.body);

  try {
    const { token, newPassword } = req.body;
    const { newPassword: password, confirmNewPassword } = newPassword;

    // Kiểm tra mật khẩu khớp nhau
    if (password !== confirmNewPassword) {
      return res.status(400).json({ error: 'Mật khẩu không khớp' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded);

    if (typeof decoded === 'object' && 'username' in decoded) {
      const username = decoded.username;
      console.log("Username giải mã:", username);

      // Hash mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log("Mật khẩu đã hash:", hashedPassword);

      // Cập nhật mật khẩu trong cơ sở dữ liệu
      await UserModel.query()
        .where('username', username)
        .patch({
          password: hashedPassword,
        } as any);

      return res.status(200).json({ message: 'Đặt lại mật khẩu thành công' });
    } else {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }
  } catch (error) {
    console.error('Lỗi trong resetPasswordController:', error);
    return res.status(500).json({ error: 'Đặt lại mật khẩu thất bại' });
  }
};

export const authenticateToken = (req: Request, res: Response, next: Function): void => {
  // Optimized: Trust Gateway-injected header (Base64-encoded JSON)
  const gatewayUserData = req.headers['x-user-data'];
  if (gatewayUserData) {
    try {
      const decoded = Buffer.from(gatewayUserData as string, 'base64').toString('utf8');
      const user = JSON.parse(decoded);
      req.auth = user;
      return next();
    } catch (e) {
      console.error('Failed to parse x-user-data', e);
    }
  }

  res.status(401).json({ message: 'Unauthorized: Missing Gateway Authentication' });
};
