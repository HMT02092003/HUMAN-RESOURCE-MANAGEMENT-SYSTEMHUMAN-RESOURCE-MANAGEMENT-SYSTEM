import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4001';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || `http://127.0.0.1:${process.env.API_GATEWAY_PORT || 4000}`;

class AuthService {
  /**
   * Check authentication with token
   */
  static async checkAuth(token: string): Promise<any> {
    try {
      const response = await axios.get(
        `${AUTH_SERVICE_URL}/api/check-auth`,
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
  static async getUserById(userId: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.get(
        `${AUTH_SERVICE_URL}/api/users/${userId}`,
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
  static async checkUserScope(token: string, userData?: any): Promise<{ allowedUserIds: number[] }> {
    try {
      const headers: any = {
        'Authorization': token,
        'Content-Type': 'application/json'
      };
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.get(
        `${AUTH_SERVICE_URL}/api/check-scope`,
        { headers }
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
  static async getUsersByDepartment(departmentId: number | number[], authToken?: string, userData?: any): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const params: any = {};
      if (Array.isArray(departmentId)) {
        // send as departmentIds for bulk
        params.departmentIds = departmentId;
      } else {
        params.departmentId = departmentId;
      }

      const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/by-department`, {
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

  /**
   * Get all roles from auth service
   */
  static async getRoles(authToken?: string, userData?: any): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.get(
        `${AUTH_SERVICE_URL}/api/roles`,
        { headers, params: { limit: 1000 } }
      );
      return response.data?.results || response.data?.data || response.data || [];
    } catch (error: any) {
      console.error(`❌ [AuthService] Failed to get roles:`, error.message);
      return [];
    }
  }
}

export default AuthService;
