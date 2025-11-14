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
        console.error('❌ [DECODE-TOKEN] Invalid token format');
        return null;
    }

    try {
        const decoded = jwt.decode(token) as DecodedToken;
        
        console.log('🔐 [DECODE-TOKEN] ===== TOKEN DECODED =====');
        console.log('🔑 JWT_SECRET being used:', secret);
        console.log('📦 Decoded token payload:', JSON.stringify(decoded, null, 2));
        console.log('👤 User ID (sub):', decoded?.sub);
        console.log('🎭 User role:', decoded?.role);
        console.log('🔒 User permissions:', decoded?.user?.permissions);
        console.log('📊 Permissions count:', decoded?.user?.permissions ? Object.keys(decoded.user.permissions).length : 0);
        console.log('==========================================');
        
        // Kiểm tra tính hợp lệ của token mà không sử dụng verify
        if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
            console.error('❌ [DECODE-TOKEN] Invalid token structure - missing sub field');
            return null;
        }

        return decoded;
    } catch (error) {
        console.error('❌ [DECODE-TOKEN] Error decoding token:', error);
        return null;
    }
};