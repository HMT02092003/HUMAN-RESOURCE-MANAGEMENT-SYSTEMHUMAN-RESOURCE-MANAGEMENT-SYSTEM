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
  private baseURL = '';

  // Get all contract types with optional params
  async getAllContractTypes(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: string }) {
    try {
      const response = await api.get(`/api/employee/contractTypes`, { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get all contract types for select dropdown (no pagination)
  async getContractTypesForSelect() {
    try {
      const response = await api.get(`/api/employee/all/contractTypes`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get all contract types as plain array for dropdowns
  async getAllContractTypesForSelect() {
    try {
      const response = await api.get(`/api/employee/all/contractTypes`);
      return response.data?.data || response.data || [];
    } catch (error: any) {
      throw error;
    }
  }

  // Get contract type detail by ID
  async getContractTypeDetail(id: string) {
    try {
      const response = await api.get(`/api/employee/contractTypes/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new contract type
  async createContractType(values: any) {
    try {
      const response = await api.post(`/api/employee/createContractType`, values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update contract type
  async updateContractType(id: string, values: any) {
    try {
      const response = await api.put(`/api/employee/contractTypes`, { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single contract type
  async deleteContractType(id: string) {
    try {
      const response = await api.delete(`/api/employee/deleteContractType`, { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple contract types
  async deleteMultipleContractTypes(ids: React.Key[]) {
    try {
      const response = await api.delete(`/api/employee/deleteMultipleContractTypes`, { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const contractTypeService = new ContractTypeService(); 