import apiService from './apiService';

class RoleService {
  // Lấy tất cả roles (không phân trang) cho dropdown
  static async getAllRoles() {
    try {
      console.log('🛡️ [RoleService] Fetching all roles');
      const response = await apiService.get('/auth/roles/all');
      console.log('✅ [RoleService] Got roles:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error:', error);
      throw error;
    }
  }
}

export default RoleService;
