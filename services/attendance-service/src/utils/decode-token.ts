import jwt from 'jsonwebtoken';

interface DecodedToken {
    sub: string; // User ID
    role: string; // User role
    permissions: {
        [key: string]: number;
    };
    [key: string]: any; // Để cho phép các trường khác
}

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