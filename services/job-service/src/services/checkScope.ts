import axios from 'axios';
import os from 'os';

/**
 * Service để gọi API sang Auth Service
 */

// Helper function để lấy IP address của máy local
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const addrs = interfaces[name];
        if (!addrs) continue;
        for (const iface of addrs) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// Allow explicit override via AUTH_SERVICE_URL env var (recommended in dev)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || `http://${getLocalIpAddress()}:${process.env.AUTH_SERVICE_PORT || 4001}`;

class checkScopeService {
    /**
     * Lấy thông tin nhiều users theo array IDs
     */
    static async getUsersByIds(userIds: any) {
        try {
            const response = await axios.post(`${AUTH_SERVICE_URL}/api/users/bulk`, {
                userIds: userIds
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                return response.data.data || [];
            } else {
                console.error('Error response from Auth Service getUsersByIds:', response.data);
                return [];
            }
        } catch (error: any) {
            console.error('Error fetching users by IDs from Auth Service:', error.message);
            return [];
        }
    }
    /**
     * Check scope của user thông qua Auth Service - sử dụng endpoint có sẵn
     * Gọi trực tiếp đến Auth Service để sử dụng UserModel.checkScope
     */
    static async checkUserScope(permissionKey: string, token: string, refreshToken?: string | null): Promise<{ hasAccess: boolean; userIds: string[]; scope: any }> {
        try {
            // Gọi sang Auth Service để check scope với token
            const url = `${AUTH_SERVICE_URL}/api/users/check-scope`;
            console.debug('[checkUserScope] calling auth service', { url, permissionKey, tokenPresent: !!token });

            const response = await axios.post(url, { permissionKey }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            console.debug('[checkUserScope] auth response status:', response.status);

            if (response.data && response.data.success) {
                return {
                    hasAccess: true,
                    userIds: response.data.userIds || [],
                    scope: response.data.scope
                };
            }

            console.warn('[checkUserScope] Auth service returned failure payload', { data: response.data });
            return { hasAccess: false, scope: null, userIds: [] };

        } catch (error: any) {
            // If auth returned 401 (token expired/invalid), try to refresh using refreshToken (if available)
            if (error.response) {
                console.error('[checkUserScope] auth service responded with error', {
                    status: error.response.status,
                    data: error.response.data
                });

                if (error.response.status === 401 && refreshToken) {
                    try {
                        console.debug('[checkUserScope] attempting token refresh');
                        const refreshUrl = `${AUTH_SERVICE_URL}/api/refresh-token`;
                        const refreshResp = await axios.post(refreshUrl, { refreshToken }, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });

                        if (refreshResp.data && refreshResp.data.token) {
                            const newToken = refreshResp.data.token;
                            console.debug('[checkUserScope] refresh succeeded, retrying scope check with new token');
                            const retryResp = await axios.post(`${AUTH_SERVICE_URL}/api/users/check-scope`, { permissionKey }, { headers: { 'Authorization': `Bearer ${newToken}`, 'Content-Type': 'application/json' }, timeout: 5000 });
                            if (retryResp.data && retryResp.data.success) {
                                return { hasAccess: true, userIds: retryResp.data.userIds || [], scope: retryResp.data.scope };
                            }
                        } else {
                            console.warn('[checkUserScope] refresh endpoint did not return token', { data: refreshResp.data });
                        }
                    } catch (refreshErr: any) {
                        console.error('[checkUserScope] refresh attempt failed', refreshErr?.response?.data || refreshErr.message || refreshErr);
                    }
                }
            } else if (error.request) {
                console.error('[checkUserScope] no response from auth service, request made:', error.request);
            } else {
                console.error('[checkUserScope] request setup error:', error.message);
            }

            return { hasAccess: false, scope: null, userIds: [] };
        }
    }
}

export default checkScopeService;
