import apiService from './apiService';

class DepartmentService {
  // Lấy tất cả departments (không phân trang) cho dropdown
  static async getAllDepartments() {
    try {
      console.log('🏢 [DepartmentService] Fetching all departments');
      // ✅ BỎ /api vì base URL đã có /api rồi
      const response = await apiService.get('/employee/departments');
      console.log('✅ [DepartmentService] Got departments:', response.data?.data?.length || 0);
      // Frontend trả về response.data.data
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ [DepartmentService] Error:', error);
      throw error;
    }
  }
}

export default DepartmentService;
