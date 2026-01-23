"use client";

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/utils/decode-token';

export const useAuth = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = Cookies.get('token');
        if (token) {
            const decoded = getDecodedToken(token);
            if (decoded) {
                // Ensure we handle different payload structures
                const userData = decoded.user || decoded;
                const userId = decoded.sub || userData.id || userData.user_id;
                setUser({
                    ...userData,
                    id: userId,
                    role: decoded.role || userData.role
                });
            }
        }
        setLoading(false);
    }, []);

    return { user, userId: user?.id, loading };
};
