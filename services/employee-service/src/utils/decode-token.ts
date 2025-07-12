import jwt from 'jsonwebtoken';

interface DecodedToken {
    sub: string; // User ID
    role: string; // User role
    permissions: {
        [key: string]: number;
    };
    [key: string]: any; // Để cho phép các trường khác
}

const secret = process.env.JWT_SECRET || 'c7c5f8d1a7b84e6a6c8b0f95c4b3e9a0f57e9d4a3c8a4b3d7e1f9b2c5d6e4f1';

export const getDecodedToken = (token: string): DecodedToken | null => {
    if (!token || typeof token !== 'string') {
        console.error('Invalid token format');
        return null;
    }

    try {
        const decoded = jwt.decode(token) as DecodedToken;
        // console.log("decoded", decoded);
        
        // Kiểm tra tính hợp lệ của token mà không sử dụng verify
        if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
            console.error('Invalid token structure');
            return null;
        }

        return decoded;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};