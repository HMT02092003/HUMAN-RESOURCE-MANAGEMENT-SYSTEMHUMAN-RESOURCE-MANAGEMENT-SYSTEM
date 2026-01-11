import apiService from './apiService'; // ✅ SỬ DỤNG apiService TẬP TRUNG
import AuthTokenManager from './AuthTokenManager';

class UserService {
  // Lấy danh sách users với pagination và filters (giống web FE)
  static async getAllUsers(params = { page: 1, pageSize: 10 }) {
    try {
      console.log('👥 [UserService] Getting users with params:', params);
      
      const config = {
        params: {
          ...params,
          _t: Date.now() // Cache buster
        }
      };

      // ✅ GỌI /auth/users/all GIỐNG NHƯ WEB FE
      const response = await apiService.get('/auth/users/all', config);
      console.log('✅ [UserService] Got users:', response.data?.total || response.data?.length, 'total');
      return response.data; // { results: [...], total: N }
    } catch (error) {
      console.error('❌ [UserService] Error fetching users:', error.response?.data || error.message || error);
      throw error;
    }
  }

  // Lấy tất cả users (không phân trang) - dùng cho select/dropdown
  static async getAllUsersAll(params = {}) {
    try {
      console.log('👥 [UserService] Getting all users for select');
      
      const config = {
        params: {
          ...params,
          pageSize: 10000, // Large page size for "all"
          _t: Date.now()
        }
      };

      const response = await apiService.get('/auth/users/all', config);
      const results = response.data?.results || response.data || [];
      console.log('✅ [UserService] Got all users:', results.length);
      return results;
    } catch (error) {
      console.error('❌ [UserService] Error fetching all users:', error.response?.data || error.message || error);
      throw error;
    }
  }

  // Tìm kiếm users - sử dụng search param trong /auth/users/all giống web FE
  static async searchUsers(keyword = '', params = { page: 1, pageSize: 10 }) {
    try {
      console.log('🔍 [UserService] Searching users with keyword:', keyword);
      
      const config = {
        params: {
          ...params,
          search: keyword, // ✅ Dùng "search" param giống web FE
          _t: Date.now()
        }
      };

      const response = await apiService.get('/auth/users/all', config);
      console.log('✅ [UserService] Search results:', response.data?.total || response.data?.length, 'total');
      return response.data; // { results: [...], total: N }
    } catch (error) {
      console.error('❌ [UserService] Error searching users:', error.response?.data || error.message || error);
      throw error;
    }
  }

  // Lấy thông tin user theo ID
  static async getUserById(id) {
    try {
      console.log('👤 [UserService] Getting user by ID:', id);
      
      const response = await apiService.get(`/auth/users/${id}`);
      console.log('✅ [UserService] Got user:', response.data.username);
      return response.data;
    } catch (error) {
      console.error('❌ [UserService] Error fetching user:', error.response?.data || error.message || error);
      throw error;
    }
  }

  // Lấy chi tiết user với đầy đủ thông tin (role, department, chevron, contract)
  static async getUserDetail(id) {
    try {
      console.log('👤 [UserService] Getting user detail:', id);
      const response = await apiService.get(`/auth/users/detail/${id}`);
      console.log('✅ [UserService] Got user detail:', response.data.username);
      return response.data;
    } catch (error) {
      console.error('❌ [UserService] Error fetching user detail:', error);
      throw error;
    }
  }

  // Tạo user mới
  static async createUser(data) {
    try {
      console.log('➕ [UserService] Creating user:', data.username);
      const response = await apiService.post('/auth/users', data);
      console.log('✅ [UserService] User created:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ [UserService] Error creating user:', error);
      throw error;
    }
  }

  // Cập nhật user
  static async updateUser(id, data) {
    try {
      console.log('✏️ [UserService] Updating user:', id);
      const response = await apiService.put(`/auth/users/${id}`, { id, ...data });
      console.log('✅ [UserService] User updated');
      return response.data;
    } catch (error) {
      console.error('❌ [UserService] Error updating user:', error);
      throw error;
    }
  }

  // Xóa user
  static async deleteUser(id) {
    try {
      console.log('🗑️ [UserService] Deleting user:', id);
      const response = await apiService.delete(`/auth/users/${id}`, {
        data: { id }
      });
      console.log('✅ [UserService] User deleted');
      return response.data;
    } catch (error) {
      console.error('❌ [UserService] Error deleting user:', error);
      throw error;
    }
  }

  // Xóa nhiều users
  static async deleteMultipleUsers(ids) {
    try {
      console.log('🗑️ [UserService] Deleting multiple users:', ids.length);
      // Backend exposes a dedicated endpoint for batch delete
      // Route: DELETE /auth/users/multiple
      const response = await apiService.delete('/auth/users/multiple', {
        data: { ids }
      });
      console.log('✅ [UserService] Users deleted');
      return response.data;
    } catch (error) {
      console.error('❌ [UserService] Error deleting multiple users:', error);
      throw error;
    }
  }

  // Thay đổi trạng thái user
  static async changeUserStatus(id, status) {
    try {
      console.log('🔄 [UserService] Changing user status:', id, '->', status);
      const response = await apiService.patch(`/auth/users/${id}/status`, { status });
      console.log('✅ [UserService] Status changed');
      return response.data;
    } catch (error) {
      console.error('❌ [UserService] Error changing user status:', error);
      throw error;
    }
  }

  // Lấy danh sách roles (để hiển thị dropdown)
  static async getRoles() {
    try {
      const response = await api.get('/roles/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  // Lấy danh sách departments
  static async getDepartments() {
    try {
      // Use canonical endpoint '/all/departments'
      const response = await api.get('/all/departments');
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  // Lấy danh sách chevrons (positions)
  static async getChevrons() {
    try {
      // Use new canonical endpoint '/all/chevrons'
      const response = await api.get('/all/chevrons');
      return response.data;
    } catch (error) {
      console.error('Error fetching chevrons:', error);
      throw error;
    }
  }

  // Reset mật khẩu
  static async resetPassword(id, newPassword) {
    try {
      const response = await api.post(`/auth/users/${id}/reset-password`, { newPassword });
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }
}

export default UserService;
