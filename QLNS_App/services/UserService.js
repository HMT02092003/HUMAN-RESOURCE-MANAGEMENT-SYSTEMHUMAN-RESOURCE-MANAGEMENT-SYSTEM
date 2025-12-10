import apiService from './apiService'; // ✅ SỬ DỤNG apiService TẬP TRUNG

class UserService {
  // Lấy danh sách users với pagination
  static async getAllUsers(params = { page: 1, pageSize: 10 }) {
    try {
      console.log('👥 [UserService] Getting users with params:', params);
      // ✅ BỎ /api vì base URL đã có /api rồi
      const response = await apiService.get('/auth/users', {
        params: {
          page: params.page,
          pageSize: params.pageSize,
          _t: Date.now() // Cache buster
        }
      });
      console.log('✅ [UserService] Got users:', response.data.total, 'total');
      return response.data; // { results: [...], total: N }
    } catch (error) {
      console.error('❌ [UserService] Error fetching users:', error);
      throw error;
    }
  }

  // Lấy tất cả users (không phân trang) - dùng cho search/filter
  static async getAllUsersAll() {
    try {
      console.log('👥 [UserService] Getting all users (no pagination)');
      const response = await apiService.get('/auth/users/all');
      console.log('✅ [UserService] Got all users:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ [UserService] Error fetching all users:', error);
      throw error;
    }
  }

  // Tìm kiếm users theo keyword (tên, sđt, email)
  static async searchUsers(keyword = '', params = { page: 1, pageSize: 10 }) {
    try {
      console.log('🔍 [UserService] Searching users with keyword:', keyword);
      const response = await apiService.get('/auth/users/search', {
        params: {
          keyword,
          page: params.page,
          pageSize: params.pageSize,
          _t: Date.now() // Cache buster
        }
      });
      console.log('✅ [UserService] Search results:', response.data.total, 'total');
      return response.data; // { results: [...], total: N }
    } catch (error) {
      console.error('❌ [UserService] Error searching users:', error);
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
      console.error('❌ [UserService] Error fetching user:', error);
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
