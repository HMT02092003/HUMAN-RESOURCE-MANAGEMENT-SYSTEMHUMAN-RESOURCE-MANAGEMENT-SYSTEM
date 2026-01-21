import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4001';

class AuthService {
  /**
   * Get multiple users by IDs (bulk fetch)
   */
  static async getUsersByIds(userIds: number[], authToken?: string, userData?: any): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      }
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/users/bulk`,
        { userIds },
        { headers, timeout: 5000 }
      );

      if (response.data && response.data.success) {
        return response.data.data || [];
      }

      return Array.isArray(response.data?.data) ? response.data.data :
        Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('[AuthService] Error fetching users by IDs:', error.message);
      return [];
    }
  }
}

export default AuthService;
