/**
 * Email Service - Send emails using Nodemailer
 * For password reset and other notifications
 */

import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface SendPasswordResetEmailParams {
  email: string;
  username: string;
  fullName: string;
  resetToken: string;
}

interface SendPasswordResetOTPParams {
  email: string;
  username: string;
  fullName: string;
  otp: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter with SMTP configuration
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = port === 465; // use TLS on port 465

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Don't verify connection on startup - only check when actually sending email
    // This allows the service to start even if email credentials are invalid
    console.log('📧 Email service initialized (connection will be verified on first use)');
  }

  /**
   * Generate password reset token (valid for 1 hour)
   */
  generateResetToken(): { token: string; expiresAt: Date } {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    return { token, expiresAt };
  }

  /**
   * Build reset password URL
   */
  private buildResetUrl(token: string): string {
    // If FRONTEND_URL is provided and not localhost, prefer it
    const configured = process.env.FRONTEND_URL;
    if (configured && !/localhost|127\.0\.0\.1/.test(configured)) {
      return `${configured.replace(/\/$/, '')}/forgotPassword/reChangePassword?token=${token}`;
    }

    // Fallback: attempt to detect LAN IPv4 address so the link can be opened from another device on the same network
    try {
      // Lazy-require to avoid importing os in environments that don't have it
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const os = require('os');
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] as any) {
          // Skip over internal (i.e. 127.0.0.1) and non-ipv4
          if (net.family === 'IPv4' && !net.internal) {
            const portMatch = (process.env.FRONTEND_URL || 'http://localhost:3000').match(/:(\d+)/);
            const port = process.env.FRONTEND_PORT || (portMatch ? portMatch[1] : '3000');
            const protocol = (process.env.FRONTEND_URL || '').startsWith('https') ? 'https' : 'http';
            return `${protocol}://${net.address}:${port}/forgotPassword/reChangePassword?token=${token}`;
          }
        }
      }
    } catch (err) {
      // ignore and fall through to localhost
    }

    // Final fallback to localhost
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/forgotPassword/reChangePassword?token=${token}`;
  }

  /**
   * Create beautiful HTML email template for password reset
   */
  private createPasswordResetEmailHTML(
    fullName: string,
    username: string,
    resetUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .email-header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .email-body {
      padding: 40px 30px;
      color: #333;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #2d3748;
    }
    .message {
      font-size: 15px;
      margin-bottom: 25px;
      color: #4a5568;
    }
    .info-box {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #2d3748;
    }
    .reset-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .reset-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .warning {
      background: #fff5f5;
      border-left: 4px solid #f56565;
      padding: 15px;
      margin: 25px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #742a2a;
    }
    .email-footer {
      background: #f7fafc;
      padding: 30px;
      text-align: center;
      color: #718096;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
    }
    .email-footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 25px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>🔐 Đặt lại mật khẩu</h1>
      <p>Hệ thống quản lý nhân sự HRMS</p>
    </div>
    
    <div class="email-body">
      <div class="greeting">
        Xin chào ${fullName},
      </div>
      
      <div class="message">
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. 
        Để tiếp tục, vui lòng nhấp vào nút bên dưới để tạo mật khẩu mới.
      </div>
      
      <div class="info-box">
        <strong>Tài khoản:</strong> ${username}
      </div>
      
      <div class="button-container">
        <a href="${resetUrl}" class="reset-button">
          Đặt lại mật khẩu
        </a>
      </div>
      
      <div class="message" style="font-size: 13px; color: #718096;">
        Hoặc copy và paste link sau vào trình duyệt:
        <br>
        <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
      </div>
      
      <div class="divider"></div>
      
      <div class="warning">
        <strong>⚠️ Lưu ý quan trọng:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Link này chỉ có hiệu lực trong <strong>1 giờ</strong></li>
          <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
          <li>Không chia sẻ link này với bất kỳ ai</li>
        </ul>
      </div>
      
      <div class="message" style="margin-top: 25px; font-size: 14px;">
        Nếu bạn gặp vấn đề với nút trên, vui lòng liên hệ bộ phận hỗ trợ kỹ thuật.
      </div>
    </div>
    
    <div class="email-footer">
      <p style="margin: 0 0 10px 0;">
        <strong>Hệ thống quản lý nhân sự HRMS</strong>
      </p>
      <p style="margin: 0;">
        Email: ${process.env.EMAIL_FROM || 'support@hrms.com'} | 
        Hotline: 1900-xxxx
      </p>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #a0aec0;">
        Email này được gửi tự động. Vui lòng không trả lời email này.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<boolean> {
    const { email, username, fullName, resetToken } = params;
    const resetUrl = this.buildResetUrl(resetToken);

    try {
      const info = await this.transporter.sendMail({
        from: `"HRMS System" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '🔐 Đặt lại mật khẩu - Hệ thống HRMS',
        html: this.createPasswordResetEmailHTML(fullName, username, resetUrl),
        text: `
Xin chào ${fullName},

Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu cho tài khoản HRMS.

Tài khoản: ${username}

Vui lòng truy cập link sau để đặt lại mật khẩu (có hiệu lực trong 1 giờ):
${resetUrl}

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Hệ thống HRMS
        `,
      });

      console.log(`✅ Password reset email sent to ${email}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      console.warn('⚠️  Failed to send password reset email (email service unavailable):', error);
      return false;
    }
  }

  /**
   * Send password reset OTP code
   */
  async sendPasswordResetOTP(params: SendPasswordResetOTPParams): Promise<boolean> {
    const { email, username, fullName, otp } = params;

    try {
      const info = await this.transporter.sendMail({
        from: `"HRMS System" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '🔐 Mã xác thực đặt lại mật khẩu - Hệ thống HRMS',
        html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực đặt lại mật khẩu</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .email-body {
      padding: 40px 30px;
      color: #333;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #2d3748;
    }
    .otp-box {
      background: #f7fafc;
      border: 2px dashed #667eea;
      padding: 30px;
      margin: 30px 0;
      border-radius: 8px;
      text-align: center;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 8px;
      margin: 10px 0;
    }
    .warning {
      background: #fff5f5;
      border-left: 4px solid #f56565;
      padding: 15px;
      margin: 25px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #742a2a;
    }
    .email-footer {
      background: #f7fafc;
      padding: 30px;
      text-align: center;
      color: #718096;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>🔐 Mã xác thực</h1>
      <p>Hệ thống quản lý nhân sự HRMS</p>
    </div>
    
    <div class="email-body">
      <div class="greeting">
        Xin chào ${fullName},
      </div>
      
      <p>
        Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>${username}</strong>. 
        Vui lòng sử dụng mã xác thực bên dưới để tiếp tục:
      </p>
      
      <div class="otp-box">
        <p style="margin: 0; font-size: 14px; color: #718096;">Mã xác thực của bạn:</p>
        <div class="otp-code">${otp}</div>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #718096;">Nhập mã này vào trang đặt lại mật khẩu</p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Lưu ý quan trọng:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Mã này chỉ có hiệu lực trong <strong>10 phút</strong></li>
          <li>Không chia sẻ mã này với bất kỳ ai</li>
          <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
        </ul>
      </div>
      
      <p style="margin-top: 25px; font-size: 14px; color: #4a5568;">
        Nếu bạn gặp vấn đề, vui lòng liên hệ bộ phận hỗ trợ kỹ thuật.
      </p>
    </div>
    
    <div class="email-footer">
      <p style="margin: 0 0 10px 0;">
        <strong>Hệ thống quản lý nhân sự HRMS</strong>
      </p>
      <p style="margin: 0;">
        Email: ${process.env.EMAIL_FROM || 'support@hrms.com'} | 
        Hotline: 1900-xxxx
      </p>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #a0aec0;">
        Email này được gửi tự động. Vui lòng không trả lời email này.
      </p>
    </div>
  </div>
</body>
</html>
        `,
        text: `
Xin chào ${fullName},

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản ${username}.

Mã xác thực của bạn: ${otp}

Mã này có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Hệ thống HRMS
        `,
      });

      console.log(`✅ Password reset OTP sent to ${email}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      console.warn('⚠️  Failed to send password reset OTP (email service unavailable):', error);
      return false;
    }
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedEmail(email: string, fullName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"HRMS System" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '✅ Mật khẩu đã được thay đổi - Hệ thống HRMS',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f7fa; }
    .container { max-width: 600px; margin: 40px auto; background: white; padding: 40px; border-radius: 12px; }
    .header { text-align: center; color: #10b981; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .message { color: #4a5568; line-height: 1.6; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 13px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">✅ Mật khẩu đã được thay đổi</div>
    <div class="message">
      <p>Xin chào <strong>${fullName}</strong>,</p>
      <p>Mật khẩu của bạn đã được thay đổi thành công vào lúc ${new Date().toLocaleString('vi-VN')}.</p>
      <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ ngay với bộ phận IT để được hỗ trợ.</p>
      <p style="margin-top: 25px;">Trân trọng,<br>Hệ thống HRMS</p>
    </div>
    <div class="footer">
      Email này được gửi tự động. Vui lòng không trả lời.
    </div>
  </div>
</body>
</html>
        `,
      });

      console.log(`✅ Password changed confirmation sent to ${email}`);
    } catch (error) {
      console.warn('⚠️  Failed to send confirmation email (email service unavailable):', error);
      // Don't throw error, just log it
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
