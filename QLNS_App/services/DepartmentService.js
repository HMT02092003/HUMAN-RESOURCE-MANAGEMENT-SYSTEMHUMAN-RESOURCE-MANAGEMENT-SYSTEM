import apiService from './apiService';

class DepartmentService {
  // Lấy tất cả departments (không phân trang) cho dropdown
  static async getAllDepartments() {
    try {
      console.log('🏢 [DepartmentService] Fetching all departments');
      const response = await apiService.get('/employee/departments/all');
      console.log('✅ [DepartmentService] Got departments:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ [DepartmentService] Error:', error);
      throw error;
    }
  }
}

export default DepartmentService;
