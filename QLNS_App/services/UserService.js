import apiService from './apiService'; // ✅ SỬ DỤNG apiService TẬP TRUNG

class UserService {
  // Lấy danh sách users với pagination
  static async getAllUsers(params = { page: 1, pageSize: 10 }) {
    try {
      console.log('👥 [UserService] Getting users with params:', params);
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
      const response = await apiService.delete('/auth/users', {
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
      const response = await api.get('/departments/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  // Lấy danh sách chevrons (positions)
  static async getChevrons() {
    try {
      const response = await api.get('/chevrons/all');
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
