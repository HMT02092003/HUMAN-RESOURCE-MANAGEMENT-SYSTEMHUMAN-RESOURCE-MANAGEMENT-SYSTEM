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
  private baseURL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000';

  // Get all contract types
  async getAllContractTypes() {
    try {
      const response = await api.get(`${this.baseURL}/api/employee/contractTypes`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get contract type detail by ID
  async getContractTypeDetail(id: string) {
    try {
      const response = await api.get(`${this.baseURL}/api/employee/contractTypes/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new contract type
  async createContractType(values: any) {
    try {
      const response = await api.post(`${this.baseURL}/api/employee/createContractType`, values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update contract type
  async updateContractType(id: string, values: any) {
    try {
      const response = await api.put(`${this.baseURL}/api/employee/contractTypes`, { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single contract type
  async deleteContractType(id: string) {
    try {
      const response = await api.delete(`${this.baseURL}/api/employee/deleteContractType`, { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple contract types
  async deleteMultipleContractTypes(ids: React.Key[]) {
    try {
      const response = await api.delete(`${this.baseURL}/api/employee/deleteMultipleContractTypes`, { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const contractTypeService = new ContractTypeService(); 