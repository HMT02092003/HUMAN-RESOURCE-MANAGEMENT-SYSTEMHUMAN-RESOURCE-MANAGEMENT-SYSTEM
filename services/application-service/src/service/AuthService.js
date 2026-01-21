import axios from 'axios';

/**
 * Service để gọi API sang Auth Service
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4001';

class AuthService {
  /**
   * Lấy thông tin user từ Auth Service
   */
  static async getUserInfo(userId, userData) {
    try {
      const headers = {};
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/${userId}`, { headers, timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Error fetching user info from Auth Service:', error.message);
      throw new Error('Không thể lấy thông tin người dùng');
    }
  }

  /**
   * Lấy danh sách user theo phòng ban
   */
  static async getUsersByDepartment(departmentId, userData) {
    try {
      const headers = {};
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/department/${departmentId}`, { headers, timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Error fetching users by department:', error.message);
      throw new Error('Không thể lấy danh sách người dùng theo phòng ban');
    }
  }

  /**
   * Lấy danh sách user theo chức vụ (chevron)
   */
  static async getUsersByChevron(chevronId, userData) {
    try {
      const headers = {};
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/chevron/${chevronId}`, { headers, timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Error fetching users by chevron:', error.message);
      throw new Error('Không thể lấy danh sách người dùng theo chức vụ');
    }
  }

  /**
   * Check scope của user thông qua Auth Service - sử dụng endpoint có sẵn
   * Gọi trực tiếp đến Auth Service để sử dụng UserModel.checkScope
   */
  static async checkUserScope(permissionKey, token, userData) {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      // Gọi sang Auth Service để check scope với token
      const response = await axios.post(`${AUTH_SERVICE_URL}/api/users/check-scope`, {
        permissionKey: permissionKey
      }, { headers, timeout: 5000 });

      if (response.data.success) {
        return {
          hasAccess: true,
          userIds: response.data.userIds || [],
          scope: response.data.scope
        };
      } else {
        return { hasAccess: false, scope: null, userIds: [] };
      }

    } catch (error) {
      console.error('Error checking user scope from Auth Service:', error.message);
      return { hasAccess: false, scope: null, userIds: [] };
    }
  }

  /**
   * Lấy thông tin nhiều users theo array IDs
   */
  static async getUsersByIds(userIds, userData) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.post(`${AUTH_SERVICE_URL}/api/users/bulk`, {
        userIds: userIds
      }, { headers, timeout: 5000 });

      if (response.data.success) {
        return response.data.data || [];
      } else {
        console.error('Error response from Auth Service getUsersByIds:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching users by IDs from Auth Service:', error.message);
      return [];
    }
  }
}

export default AuthService;
