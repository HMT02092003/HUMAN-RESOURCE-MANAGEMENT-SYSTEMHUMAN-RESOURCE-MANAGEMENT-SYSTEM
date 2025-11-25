import apiService from './apiService';

class RoleService {
  // Lấy tất cả roles (không phân trang) cho dropdown
  static async getAllRoles() {
    try {
      console.log('🛡️ [RoleService] Fetching all roles');
      // ✅ BỎ /api vì base URL đã có /api rồi
      const response = await apiService.get('/auth/roles');
      console.log('✅ [RoleService] Got roles:', response.data?.data?.length || 0);
      // Frontend trả về response.data.data
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error:', error);
      throw error;
    }
  }
}

export default RoleService;
