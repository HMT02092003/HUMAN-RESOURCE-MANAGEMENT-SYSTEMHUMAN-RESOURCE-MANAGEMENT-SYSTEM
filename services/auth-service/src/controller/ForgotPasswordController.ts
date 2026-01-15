/**
 * Forgot Password Controller
 * Handles password reset flow
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { emailService } from '../services/EmailService';
import Databases from '../lib/Databases/Connection';

interface PasswordResetToken {
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

interface PasswordResetOTP {
  userId: number;
  username: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory store for reset tokens (consider using Redis in production)
const resetTokens = new Map<string, PasswordResetToken>();
const resetOTPs = new Map<string, PasswordResetOTP>(); // key: username

// Clean up expired tokens every 10 minutes
setInterval(() => {
  const now = new Date();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expiresAt < now) {
      resetTokens.delete(token);
    }
  }
  for (const [username, data] of resetOTPs.entries()) {
    if (data.expiresAt < now) {
      resetOTPs.delete(username);
    }
  }
}, 10 * 60 * 1000);

class ForgotPasswordController {
  /**
   * POST /api/forgot-password
   * Request password reset - send email with reset link
   */
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { username } = req.body;

      // Validate input
      if (!username || username.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tên đăng nhập',
        });
      }

      // Find user by username using Knex/Objection style queries
      const user = await Databases('users')
        .select('id', 'username', 'email', 'fullName', 'status')
        .where({ username: username.trim() })
        .first();

      // Security: Don't reveal if user exists or not
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'Nếu tài khoản tồn tại, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.',
        });
      }

      // Check if user is active based on `status` column
      const rawStatus = (user as any).status;
      const isActive = rawStatus === 1 || rawStatus === '1' || String(rawStatus).toLowerCase() === 'active' || String(rawStatus).toLowerCase() === 'enabled';

      if (!isActive) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
        });
      }

      // Check if user has email
      if (!user.email) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản chưa có email. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
        });
      }

      // Generate 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

      // Store OTP in memory (keyed by username)
      resetOTPs.set(username.trim().toLowerCase(), {
        userId: user.id,
        username: user.username,
        otp,
        expiresAt,
        createdAt: new Date(),
      });

      // Send OTP email
      const emailSent = await emailService.sendPasswordResetOTP({
        email: user.email,
        username: user.username,
        fullName: (user as any).fullName || user.username,
        otp,
      });

      console.log(`🔐 Password reset OTP generated for user: ${username}`);

      if (!emailSent) {
        console.warn(`⚠️  Email service unavailable. OTP: ${otp} (logged for manual delivery)`);
        return res.status(503).json({
          success: false,
          message: 'Dịch vụ gửi email tạm thời không khả dụng. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
      });
    } catch (error: any) {
      console.error('Error in requestPasswordReset:', error);

      // Handle email sending errors specifically
      if (error.message && error.message.includes('email')) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    }
  }

  /**
   * POST /api/verify-otp
   * Verify OTP code for password reset
   */
  async verifyOTP(req: Request, res: Response) {
    try {
      const { username, otp } = req.body;

      if (!username || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tên đăng nhập và mã OTP',
        });
      }

      // Check if OTP exists
      const otpData = resetOTPs.get(username.trim().toLowerCase());

      if (!otpData) {
        return res.status(400).json({
          success: false,
          message: 'Mã OTP không hợp lệ hoặc đã hết hạn',
        });
      }

      // Check if OTP expired
      if (new Date() > otpData.expiresAt) {
        resetOTPs.delete(username.trim().toLowerCase());
        return res.status(400).json({
          success: false,
          message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.',
        });
      }

      // Verify OTP
      if (otpData.otp !== otp.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mã OTP không chính xác',
        });
      }

      // OTP is valid - return success with user info
      return res.status(200).json({
        success: true,
        message: 'Xác thực OTP thành công',
        data: {
          username: otpData.username,
          userId: otpData.userId,
        },
      });
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    }
  }

  /**
   * GET /api/verify-reset-token/:token
   * Verify if reset token is valid
   */
  async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token không hợp lệ',
        });
      }

      // Check if token exists
      const tokenData = resetTokens.get(token);

      if (!tokenData) {
        return res.status(400).json({
          success: false,
          message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng',
        });
      }

      // Check if token expired
      if (new Date() > tokenData.expiresAt) {
        resetTokens.delete(token);
        return res.status(400).json({
          success: false,
          message: 'Link đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu link mới.',
        });
      }

      // Get user info using Knex/Objection
      const userInfo = await Databases('users')
        .select('username', 'fullName')
        .where({ id: tokenData.userId })
        .first();

      if (!userInfo) {
        return res.status(400).json({
          success: false,
          message: 'Người dùng không tồn tại',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Token hợp lệ',
        data: {
          username: userInfo.username,
          fullName: (userInfo as any).fullName,
        },
      });
    } catch (error) {
      console.error('Error in verifyResetToken:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    }
  }

  /**
   * POST /api/reset-password
   * Reset password with valid OTP
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { username, otp, newPassword, confirmPassword } = req.body;

      // Validate input
      if (!username || !otp || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin',
        });
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu xác nhận không khớp',
        });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải có ít nhất 6 ký tự',
        });
      }

      // Check if OTP exists and valid
      const otpData = resetOTPs.get(username.trim().toLowerCase());

      if (!otpData) {
        return res.status(400).json({
          success: false,
          message: 'Mã OTP không hợp lệ hoặc đã hết hạn',
        });
      }

      // Check if OTP expired
      if (new Date() > otpData.expiresAt) {
        resetOTPs.delete(username.trim().toLowerCase());
        return res.status(400).json({
          success: false,
          message: 'Mã OTP đã hết hạn',
        });
      }

      // Verify OTP
      if (otpData.otp !== otp.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mã OTP không chính xác',
        });
      }

      // Get user info
      const user = await Databases('users')
        .select('id', 'email', 'fullName')
        .where({ id: otpData.userId })
        .first();

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Người dùng không tồn tại',
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database using Knex
      // Note: some schemas don't have an `updated_at` column — update only the password to avoid errors
      await Databases('users')
        .where({ id: otpData.userId })
        .update({ password: hashedPassword });

      // Delete used OTP
      resetOTPs.delete(username.trim().toLowerCase());

      // Send confirmation email
      if (user.email) {
        try {
          await emailService.sendPasswordChangedEmail(
            user.email,
            (user as any).fullName || 'User'
          );
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't fail the request if email fails
        }
      }

      console.log(`✅ Password reset successful for user: ${username}`);

      return res.status(200).json({
        success: true,
        message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.',
      });
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    }
  }

  /**
   * GET /api/reset-tokens-count (Debug only - remove in production)
   */
  async getActiveTokensCount(req: Request, res: Response) {
    return res.json({
      activeTokens: resetTokens.size,
      tokens: Array.from(resetTokens.values()).map(t => ({
        userId: t.userId,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
      })),
    });
  }
}

export default new ForgotPasswordController();
