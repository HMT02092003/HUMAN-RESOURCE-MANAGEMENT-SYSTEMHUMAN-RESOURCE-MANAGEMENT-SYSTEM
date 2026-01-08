import axios from 'axios';

/**
 * Service để check scope quyền thông qua Auth Service
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4001';

class CheckScopeService {
  /**
   * Check scope của user thông qua Auth Service
   * @param permissionKey - Key của quyền cần check (vd: 'KPI', 'User', etc.)
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

      console.log(`[CheckScopeService] \n[CheckScopeService] ========== CHECK USER SCOPE ==========`);
      console.log(`[CheckScopeService] Permission Key: ${permissionKey}`);
      console.log(`[CheckScopeService] Token (first 50 chars): ${token.substring(0, 50)}`);
      console.log(`[CheckScopeService] Target URL: ${url}`);

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

      console.log(`[CheckScopeService] ✅ Auth service responded with status: ${response.status}`);
      console.log(`[CheckScopeService] Response data:`, JSON.stringify(response.data, null, 2));

      if (response.data && response.data.success) {
        console.log(`[CheckScopeService] Parsed result:`, {
          hasAccess: true,
          scope: response.data.scope,
          userIdsCount: response.data.userIds?.length || 0,
          userIds: response.data.userIds
        });
        console.log(`[CheckScopeService] ====================================================\n`);
        return {
          hasAccess: true,
          userIds: response.data.userIds || [],
          scope: response.data.scope || 'personal'
        };
      }

      console.warn('[CheckScopeService] ⚠️ Scope check failed, defaulting to personal');
      console.log(`[CheckScopeService] ====================================================\n`);
      return {
        hasAccess: false,
        scope: 'personal',
        userIds: []
      };

    } catch (error: any) {
      if (error.response) {
        console.error('[CheckScopeService] Auth service error:', { 
          status: error.response.status, 
          data: error.response.data 
        });
      } else if (error.request) {
        console.error('[CheckScopeService] No response from auth service');
      } else {
        console.error('[CheckScopeService] Request setup error:', error.message);
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
      if (!userIds || userIds.length === 0) {
        console.log('[CheckScopeService] No userIds provided, returning empty array');
        return [];
      }

      console.log(`[CheckScopeService] Fetching ${userIds.length} users from auth service`);

      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/users/bulk`, 
        { userIds },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );

      if (response.data && response.data.success) {
        console.log(`[CheckScopeService] Fetched ${response.data.data?.length || 0} users successfully`);
        return response.data.data || [];
      }
      
      console.warn('[CheckScopeService] Auth service returned failure response');
      return [];
    } catch (error: any) {
      console.error('[CheckScopeService] Error fetching users:', error.message);
      return [];
    }
  }
}

export default CheckScopeService;
