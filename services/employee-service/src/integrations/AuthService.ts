import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const API_GATEWAY_URL = `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;

class AuthService {
  /**
   * Check authentication with token
   */
  static async checkAuth(token: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/auth/check-auth`,
        {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [AuthService] Failed to check auth:`, error.message);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: number, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      const response = await axios.get(
        `${API_GATEWAY_URL}/api/auth/users/${userId}`,
        { headers }
      );
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error(`❌ [AuthService] Failed to get user ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Check user scope/permissions
   */
  static async checkUserScope(token: string): Promise<{ allowedUserIds: number[] }> {
    try {
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/auth/check-scope`,
        {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [AuthService] Failed to check scope:`, error.message);
      return { allowedUserIds: [] };
    }
  }

  /**
   * Get users by department id or list of department ids
   * Accepts either a single departmentId (number) or an array of ids
   */
  static async getUsersByDepartment(departmentId: number | number[], authToken?: string): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      const params: any = {};
      if (Array.isArray(departmentId)) {
        // send as departmentIds for bulk
        params.departmentIds = departmentId;
      } else {
        params.departmentId = departmentId;
      }

      const response = await axios.get(`${API_GATEWAY_URL}/api/auth/users/by-department`, {
        headers,
        params
      });

      // auth-service returns data in response.data or response.data.data
      return response.data?.data || response.data || [];
    } catch (error: any) {
      console.error(`❌ [AuthService] Failed to get users by department:`, error.message);
      return [];
    }
  }
}

export default AuthService;
