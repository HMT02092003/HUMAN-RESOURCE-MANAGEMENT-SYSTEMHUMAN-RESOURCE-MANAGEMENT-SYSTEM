import jwt from 'jsonwebtoken';

// Secret key cho JWT. Nên đặt trong biến môi trường để bảo mật.
const secret = process.env.JWT_SECRET || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1';

/**
 * Function để tạo JWT token
 * @param payload - Dữ liệu bạn muốn đưa vào token
 * @returns JWT token dưới dạng string
 */
export const createToken = (payload: object): string => {
    return jwt.sign(payload, secret, { expiresIn: '1y' }); // Token có thời hạn 1 năm
};

/**
 * Function để xác minh token và trích xuất dữ liệu
 * @param token - JWT token để xác minh
 * @returns Dữ liệu bên trong token nếu hợp lệ
 */
export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, secret);
    } catch (err) {
        throw new Error('Invalid token');
    }
};
