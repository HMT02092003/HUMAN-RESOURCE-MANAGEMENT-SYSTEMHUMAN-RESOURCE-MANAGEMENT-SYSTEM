import api from './apiService';

interface ContractType {
  id: number;
  name: string;
  description: string;
  contractTerm: number;
  type: number;
  insurance: number;
  created_at: Date;
}

class ContractTypeService {
  // Get all contract types
  async getAllContractTypes() {
    try {
      const response = await api.get('/api/contractTypes');
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get contract type detail by ID
  async getContractTypeDetail(id: string) {
    try {
      const response = await api.get(`/api/contractTypes/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new contract type
  async createContractType(values: any) {
    try {
      const response = await api.post('/api/createContractType', values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update contract type
  async updateContractType(id: string, values: any) {
    try {
      const response = await api.put('/api/contractTypes', { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single contract type
  async deleteContractType(id: string) {
    try {
      const response = await api.delete('/api/deleteContractType', { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple contract types
  async deleteMultipleContractTypes(ids: React.Key[]) {
    try {
      const response = await api.delete('/api/deleteMultipleContractTypes', { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const contractTypeService = new ContractTypeService(); 