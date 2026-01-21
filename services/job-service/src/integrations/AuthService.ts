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
   * Get multiple users by IDs (bulk fetch)
   */
  static async getUsersByIds(userIds: number[], authToken?: string, userData?: any): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) {
        // Normalize token format
        headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      }
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/users/bulk`,
        { userIds },
        {
          headers,
          timeout: 5000
        }
      );

      // Handle different response structures
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

  /**
   * Check user scope/permissions for a specific resource
   * @param permissionKey - Resource key (e.g., 'CV', 'projects')
   * @param token - Authorization token
   */
  static async checkUserScope(
    permissionKey: string,
    token: string,
    userData?: any
  ): Promise<{ hasAccess: boolean; userIds: number[]; scope: string }> {
    try {
      // Normalize token format
      let authHeader = token || '';
      if (authHeader && !authHeader.startsWith('Bearer ')) {
        authHeader = `Bearer ${authHeader}`;
      }

      console.debug('[AuthService] Checking user scope', { permissionKey, tokenPresent: !!authHeader });

      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
      }

      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/users/check-scope`,
        { permissionKey },
        {
          headers,
          timeout: 5000
        }
      );

      if (response.data && response.data.success) {
        return {
          hasAccess: true,
          userIds: response.data.userIds || [],
          scope: response.data.scope || 'personal'
        };
      }

      console.warn('[AuthService] Auth service returned failure', { data: response.data });
      return {
        hasAccess: false,
        scope: 'personal',
        userIds: []
      };

    } catch (error: any) {
      if (error.response) {
        console.error('[AuthService] Auth service error response', {
          status: error.response.status,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('[AuthService] No response from auth service');
      } else {
        console.error('[AuthService] Request setup error:', error.message);
      }

      return {
        hasAccess: false,
        scope: 'personal',
        userIds: []
      };
    }
  }

  /**
   * Get users in scope for KPI management
   * Returns list of users that the current user can view KPI for
   */
  static async getUsersInScope(token: string, currentUserId: number, userData?: any): Promise<any[]> {
    try {
      // Normalize token format
      let authHeader = token || '';
      if (authHeader && !authHeader.startsWith('Bearer ')) {
        authHeader = `Bearer ${authHeader}`;
      }

      console.debug('[AuthService] Getting users in scope for user', currentUserId);

      const response = await axios.get(
        `${AUTH_SERVICE_URL}/api/users/in-scope`,
        {
          headers: {
            Authorization: authHeader,
            ...(userData ? { 'x-user-data': Buffer.from(JSON.stringify(userData)).toString('base64') } : {}),
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (response.data && response.data.success) {
        return response.data.data || response.data.users || [];
      }

      console.warn('[AuthService] Get users in scope returned failure', { data: response.data });
      return [];

    } catch (error: any) {
      console.error('[AuthService] Error getting users in scope:', error.message);
      // Fallback: return just the current user
      return [{
        id: currentUserId,
        fullName: `User ${currentUserId}`,
        name: `User ${currentUserId}`
      }];
    }
  }
}

export default AuthService;
