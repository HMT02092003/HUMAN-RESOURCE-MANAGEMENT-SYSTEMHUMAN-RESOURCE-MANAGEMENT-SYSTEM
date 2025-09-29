import axios from 'axios';
import os from 'os';

/**
 * Service để gọi API sang Auth Service
 */

// Helper function để lấy IP address của máy local
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const AUTH_SERVICE_URL = `http://${getLocalIpAddress()}:${process.env.AUTH_SERVICE_PORT || 4001}`;

class AuthService {
  /**
   * Lấy thông tin user từ Auth Service
   */
  static async getUserInfo(userId) {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user info from Auth Service:', error.message);
      throw new Error('Không thể lấy thông tin người dùng');
    }
  }

  /**
   * Lấy danh sách user theo phòng ban
   */
  static async getUsersByDepartment(departmentId) {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/department/${departmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching users by department:', error.message);
      throw new Error('Không thể lấy danh sách người dùng theo phòng ban');
    }
  }

  /**
   * Lấy danh sách user theo chức vụ (chevron)
   */
  static async getUsersByChevron(chevronId) {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/chevron/${chevronId}`);
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
  static async checkUserScope(permissionKey, token) {
    try {
      // Gọi sang Auth Service để check scope với token
      const response = await axios.post(`${AUTH_SERVICE_URL}/api/users/check-scope`, {
        permissionKey: permissionKey
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

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
  static async getUsersByIds(userIds) {
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
    } catch (error) {
      console.error('Error fetching users by IDs from Auth Service:', error.message);
      return [];
    }
  }
}

export default AuthService;
