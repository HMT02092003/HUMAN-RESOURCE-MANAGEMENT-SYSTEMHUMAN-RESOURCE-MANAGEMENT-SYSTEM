import apiService from './apiService';

class DepartmentService {
  // Get all departments
  static async getAllDepartments() {
    try {
      console.log('🏢 [DepartmentService] Fetching all departments');
      const response = await apiService.get('/employee/departments');
      console.log('✅ [DepartmentService] Got departments:', response.data?.data?.length || 0);
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ [DepartmentService] Error:', error);
      throw error;
    }
  }

  // Get department detail by ID
  static async getDepartmentDetail(id) {
    try {
      console.log('🏢 [DepartmentService] Fetching department detail:', id);
      const response = await apiService.get(`/employee/departments/${id}`);
      console.log('✅ [DepartmentService] Got department detail:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [DepartmentService] Error:', error);
      throw error;
    }
  }

  // Create new department
  static async createDepartment(values) {
    try {
      console.log('🏢 [DepartmentService] Creating department:', values);
      const response = await apiService.post('/employee/createDepartments', values);
      console.log('✅ [DepartmentService] Created department:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [DepartmentService] Error:', error);
      throw error;
    }
  }

  // Update department
  static async updateDepartment(id, values) {
    try {
      console.log('🏢 [DepartmentService] Updating department:', id, values);
      const response = await apiService.put('/employee/departments', { id, ...values });
      console.log('✅ [DepartmentService] Updated department:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [DepartmentService] Error:', error);
      throw error;
    }
  }

  // Delete single department
  static async deleteDepartment(id) {
    try {
      console.log('🏢 [DepartmentService] Deleting department:', id);
      const response = await apiService.delete('/employee/deleteDepartment', { params: { id } });
      console.log('✅ [DepartmentService] Deleted department:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [DepartmentService] Error:', error);
      throw error;
    }
  }

  // Delete multiple departments
  static async deleteMultipleDepartments(ids) {
    try {
      console.log('🏢 [DepartmentService] Deleting multiple departments:', ids);
      const response = await apiService.delete('/employee/deleteMultipleDepartments', { data: { ids } });
      console.log('✅ [DepartmentService] Deleted departments:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [DepartmentService] Error:', error);
      throw error;
    }
  }
}

export { DepartmentService };
export default DepartmentService;
