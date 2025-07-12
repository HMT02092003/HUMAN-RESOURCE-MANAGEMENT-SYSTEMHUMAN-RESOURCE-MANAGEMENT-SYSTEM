// 'use server'
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'toanhoangmanh55@gmail.com',
    pass: 'hqzh kcyz csbr ppcq' // thay bằng App Password của bạn
  }
});

export const otpService = {
  generateToken: (email: string) => {
    const payload = { email };
    const secret = process.env.JWT_SECRET || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1'; // Sử dụng một khóa bí mật an toàn
    const options = { expiresIn: '1h' }; // Token hết hạn sau 1 giờ
    return jwt.sign(payload, secret, options);
  },

  sendResetPasswordLink: async (email: string) => {
    if (!email) {
      console.error("No email provided");
      return false;
    }

    // Tạo token
    const token = otpService.generateToken(email);

    // Tạo form gửi mail
    const resetLink = `http://localhost:4000/forgotPassword/reChangePassword?token=${token}`;
    
    const mailOptions = {
      from: '"Website Bán Thiết Bị Điện Tử" <toanhoangmanh55@gmail.com>', // Thay bằng email của bạn
      to: email,
      subject: "Yêu cầu đổi mật khẩu",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background-color: #004085; color: #ffffff; text-align: center; padding: 20px;">
              <h1 style="margin: 0;">Yêu Cầu Đổi Mật Khẩu</h1>
            </div>
            <div style="padding: 20px; color: #333333;">
              <p style="font-size: 16px;">Xin chào,</p>
              <p style="font-size: 16px;">
                Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình trên <strong>Website Bán Thiết Bị Điện Tử</strong>. Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; font-size: 18px; color: #ffffff; background-color: #28a745; border-radius: 6px; text-decoration: none;">
                  Đổi Mật Khẩu
                </a>
              </div>
              <p style="font-size: 14px; color: #666666;">
                Liên kết này sẽ hết hạn trong 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
              </p>
            </div>
            <div style="background-color: #f4f4f4; text-align: center; padding: 10px; font-size: 12px; color: #666666;">
              <p style="margin: 0;">&copy; 2024 Website Bán Thiết Bị Điện Tử. All rights reserved.</p>
            </div>
          </div>
        </div>
      `
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Message sent: %s', info.messageId);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }
};
