import api from './apiService';

interface DepartmentData {
  id: number;
  name: string;
  description: string;
  created_at: Date;
}

class DepartmentService {
  private baseURL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000';

  // Get all departments
  async getAllDepartments() {
    try {
      const response = await api.get(`${this.baseURL}/api/employee/departments`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get department detail by ID
  async getDepartmentDetail(id: string) {
    try {
      const response = await api.get(`${this.baseURL}/api/employee/departments/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new department
  async createDepartment(values: any) {
    try {
      const response = await api.post(`${this.baseURL}/api/employee/createDepartments`, values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update department
  async updateDepartment(id: string, values: any) {
    try {
      const response = await api.put(`${this.baseURL}/api/employee/departments`, { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single department
  async deleteDepartment(id: string) {
    try {
      const response = await api.delete(`${this.baseURL}/api/employee/deleteDepartment`, { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple departments
  async deleteMultipleDepartments(ids: React.Key[]) {
    try {
      const response = await api.delete(`${this.baseURL}/api/employee/deleteMultipleDepartments`, { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const departmentService = new DepartmentService(); 