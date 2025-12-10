import api from './apiService';

interface DepartmentData {
  id: number;
  name: string;
  description: string;
  created_at: Date;
}

class DepartmentService {
  private baseURL = '';

  // Get all departments with optional server-side params (search, sort, pagination)
  async getAllDepartments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }) {
    try {
      const response = await api.get(`/api/employee/departments`, { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get all departments for select dropdown (no pagination)
  async getDepartmentsForSelect() {
    try {
      const response = await api.get(`/api/employee/all/departments`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get all departments as plain array for dropdowns
  async getAllDepartmentsForSelect() {
    try {
      const response = await api.get(`/api/employee/all/departments`);
      return response.data?.data || response.data || [];
    } catch (error: any) {
      throw error;
    }
  }

  // Get department detail by ID
  async getDepartmentDetail(id: string) {
    try {
      const response = await api.get(`/api/employee/departments/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new department
  async createDepartment(values: any) {
    try {
      const response = await api.post(`/api/employee/createDepartments`, values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update department
  async updateDepartment(id: string, values: any) {
    try {
      const response = await api.put(`/api/employee/departments`, { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single department
  async deleteDepartment(id: string) {
    try {
      const response = await api.delete(`/api/employee/deleteDepartment`, { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple departments
  async deleteMultipleDepartments(ids: React.Key[]) {
    try {
      const response = await api.delete(`/api/employee/deleteMultipleDepartments`, { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const departmentService = new DepartmentService(); 