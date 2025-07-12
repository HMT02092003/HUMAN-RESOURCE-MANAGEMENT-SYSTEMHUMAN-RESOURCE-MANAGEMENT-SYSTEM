import api from './apiService';

interface ChevronData {
  id: number;
  name: string;
  description: string;
  chevronCoefficient: string;
  created_at: Date;
}

class ChevronService {
  // Get all chevrons
  async getAllChevrons() {
    try {
      const response = await api.get('/api/getAllChevrons');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get chevron detail by ID
  async getChevronDetail(id: string) {
    try {
      const response = await api.post('/api/getChevronDetail', { id });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new chevron
  async createChevron(values: any) {
    try {
      const response = await api.post('/api/createChevrons', values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update chevron
  async updateChevron(id: string, values: any) {
    try {
      const response = await api.put('/api/updateChevron', { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single chevron
  async deleteChevron(id: string) {
    try {
      const response = await api.delete('/api/deleteChevron', { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple chevrons
  async deleteMultipleChevrons(ids: React.Key[]) {
    try {
      const response = await api.delete('/api/deleteMultipleChevrons', { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const chevronService = new ChevronService(); 