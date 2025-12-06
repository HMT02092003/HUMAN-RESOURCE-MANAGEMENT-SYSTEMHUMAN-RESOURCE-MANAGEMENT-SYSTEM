import axios from 'axios';

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:4002';
const API_GATEWAY_URL = `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;

class EmployeeService {
  /**
   * Get department by ID
   */
  static async getDepartmentById(departmentId: number, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      const response = await axios.get(
        `${API_GATEWAY_URL}/api/employee/departments/${departmentId}`,
        { headers }
      );
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error(`❌ [EmployeeService] Failed to get department ${departmentId}:`, error.message);
      return null;
    }
  }

  /**
   * Get chevron detail by ID
   */
  static async getChevronDetail(chevronId: number, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      // ✨ Employee service uses POST /getChevronDetail with body { id }
      const response = await axios.post(
        `${API_GATEWAY_URL}/api/employee/getChevronDetail`,
        { id: chevronId },
        { headers }
      );
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error(`❌ [EmployeeService] Failed to get chevron ${chevronId}:`, error.message);
      return null;
    }
  }

  /**
   * Get contract type by ID
   */
  static async getContractTypeById(contractTypeId: number, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      // ✨ Employee service uses /contractTypes/:id
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/employee/contractTypes/${contractTypeId}`,
        { headers }
      );
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error(`❌ [EmployeeService] Failed to get contract type ${contractTypeId}:`, error.message);
      return null;
    }
  }

  /**
   * Get contracts by user ID
   */
  static async getContractsByUserId(userId: number, authToken?: string): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      const response = await axios.get(
        `${API_GATEWAY_URL}/api/employee/contracts/user/${userId}`,
        { headers }
      );
      return response.data?.data || response.data || [];
    } catch (error: any) {
      console.error(`❌ [EmployeeService] Failed to get contracts for user ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Create contract for user
   */
  static async createContract(userId: number, contractData: any, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      // ✨ Employee service uses POST /users/:userId/contracts
      const response = await axios.post(
        `${API_GATEWAY_URL}/api/employee/users/${userId}/contracts`,
        contractData,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [EmployeeService] Failed to create contract for user ${userId}:`, error.message);
      throw error;
    }
  }
}

export default EmployeeService;
