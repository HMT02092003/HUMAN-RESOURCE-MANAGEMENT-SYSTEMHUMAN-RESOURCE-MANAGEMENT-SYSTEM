import api from './apiService';

interface ChevronData {
  id: number;
  name: string;
  description: string;
  chevronCoefficient: string;
  created_at: Date;
}

class ChevronService {
  private baseURL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000';

  // Get all chevrons
  async getAllChevrons() {
    try {
      const response = await api.get(`${this.baseURL}/api/employee/getAllChevrons`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get chevron detail by ID
  async getChevronDetail(id: string) {
    try {
      const response = await api.post(`${this.baseURL}/api/employee/getChevronDetail`, { id });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new chevron
  async createChevron(values: any) {
    try {
      const response = await api.post(`${this.baseURL}/api/employee/createChevrons`, values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update chevron
  async updateChevron(id: string, values: any) {
    try {
      const response = await api.put(`${this.baseURL}/api/employee/updateChevron`, { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single chevron
  async deleteChevron(id: string) {
    try {
      const response = await api.delete(`${this.baseURL}/api/employee/deleteChevron`, { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple chevrons
  async deleteMultipleChevrons(ids: React.Key[]) {
    try {
      const response = await api.delete(`${this.baseURL}/api/employee/deleteMultipleChevrons`, { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const chevronService = new ChevronService(); 