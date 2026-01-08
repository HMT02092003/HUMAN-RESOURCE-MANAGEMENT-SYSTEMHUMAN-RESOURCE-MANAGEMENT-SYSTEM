import axios from 'axios';

/**
 * Service để check scope quyền thông qua Auth Service
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4001';

class CheckScopeService {
  /**
   * Check scope của user thông qua Auth Service
   * @param permissionKey - Key của quyền cần check (vd: 'Salary', 'Payslip', etc.)
   * @param token - Bearer token từ req.headers.authorization
   * @returns Object chứa hasAccess, userIds, scope
   */
  static async checkUserScope(
    permissionKey: string, 
    token: string,
    userData?: any
  ): Promise<{ hasAccess: boolean; userIds: number[]; scope: string }> {
    try {
      const url = `${AUTH_SERVICE_URL}/api/users/check-scope`;

      // Normalize token
      let authHeader = token || '';
      if (authHeader && !authHeader.startsWith('Bearer ')) {
        authHeader = `Bearer ${authHeader}`;
      }

      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (authHeader) headers['Authorization'] = authHeader;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.post(
        url,
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

      return {
        hasAccess: false,
        scope: 'personal',
        userIds: []
      };

    } catch (error: any) {
      if (error.response) {
        console.error('[CheckScopeService] auth service error', { status: error.response.status, data: error.response.data });
      } else if (error.request) {
        console.error('[CheckScopeService] no response from auth service, request made');
      } else {
        console.error('[CheckScopeService] request setup error:', error.message);
      }

      return {
        hasAccess: false,
        scope: 'personal',
        userIds: []
      };
    }
  }

  /**
   * Lấy thông tin nhiều users theo array IDs từ Auth Service
   * @param userIds - Array các user ID cần lấy thông tin
   * @returns Array các user object
   */
  static async getUsersByIds(userIds: number[]): Promise<any[]> {
    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/users/bulk`, 
        { userIds },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );

      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      
      return [];
    } catch (error: any) {
      console.error('[CheckScopeService] Error fetching users:', error.message);
      return [];
    }
  }
}

export default CheckScopeService;
