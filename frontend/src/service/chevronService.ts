import api from './apiService';

interface ChevronData {
  id: number;
  name: string;
  description: string;
  chevronCoefficient: string;
  created_at: Date;
}

class ChevronService {
  private baseURL = '';

  // Get all chevrons with optional params
  async getAllChevrons(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: string }) {
    try {
      // Paginated list endpoint (server-side search/sort/pagination)
      const response = await api.get(`/api/employee/chevrons`, { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get all chevrons for select dropdown (no pagination)
  async getChevronsForSelect() {
    try {
      const response = await api.get(`/api/employee/all/chevrons`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get all chevrons as plain array for dropdowns
  async getAllChevronsForSelect() {
    try {
      const response = await api.get(`/api/employee/all/chevrons`);
      return response.data?.data || response.data || [];
    } catch (error: any) {
      throw error;
    }
  }

  // Get chevron detail by ID
  async getChevronDetail(id: string) {
    try {
      const response = await api.post(`/api/employee/getChevronDetail`, { id });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new chevron
  async createChevron(values: any) {
    try {
      const response = await api.post(`/api/employee/createChevrons`, values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update chevron
  async updateChevron(id: string, values: any) {
    try {
      const response = await api.put(`/api/employee/updateChevron`, { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single chevron
  async deleteChevron(id: string) {
    try {
      const response = await api.delete(`/api/employee/deleteChevron`, { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple chevrons
  async deleteMultipleChevrons(ids: React.Key[]) {
    try {
      const response = await api.delete(`/api/employee/deleteMultipleChevrons`, { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const chevronService = new ChevronService(); 