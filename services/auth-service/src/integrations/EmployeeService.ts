import axios from 'axios';

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://127.0.0.1:4002';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;

class EmployeeService {
  /**
   * Get all departments (Full list for mapping)
   */
  static async getAllDepartments(authToken?: string, userData?: any): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      // ✨ Use /all/departments for faster, non-paginated access without complex role mapping
      const response = await axios.get(
        `${EMPLOYEE_SERVICE_URL}/api/all/departments`,
        { headers }
      );
      return response.data?.data || response.data || [];
    } catch (error: any) {
      console.error(`❌ [EmployeeService] Failed to get all departments:`, error.message);
      return [];
    }
  }

  /**
   * Get all chevrons (Full list for mapping)
   */
  static async getAllChevrons(authToken?: string, userData?: any): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      // ✨ Use /all/chevrons for faster, non-paginated access
      const response = await axios.get(
        `${EMPLOYEE_SERVICE_URL}/api/all/chevrons`,
        { headers }
      );
      return response.data?.data || response.data || [];
    } catch (error: any) {
      console.error(`❌ [EmployeeService] Failed to get all chevrons:`, error.message);
      return [];
    }
  }

  /**
   * Get department by ID
   */
  static async getDepartmentById(departmentId: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      const response = await axios.get(
        `${EMPLOYEE_SERVICE_URL}/api/departments/${departmentId}`,
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
  static async getChevronDetail(chevronId: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      // ✨ Employee service uses POST /getChevronDetail with body { id }
      const response = await axios.post(
        `${EMPLOYEE_SERVICE_URL}/api/getChevronDetail`,
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
  static async getContractTypeById(contractTypeId: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      // ✨ Employee service uses /contractTypes/:id
      const response = await axios.get(
        `${EMPLOYEE_SERVICE_URL}/api/contractTypes/${contractTypeId}`,
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
  static async getContractsByUserId(userId: number, authToken?: string, userData?: any): Promise<any[]> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      const response = await axios.get(
        `${EMPLOYEE_SERVICE_URL}/api/contracts/user/${userId}`,
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
  static async createContract(userId: number, contractData: any, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');

      // Prefer direct employee service URL to avoid gateway routing issues in internal service-to-service calls
      const target = EMPLOYEE_SERVICE_URL || API_GATEWAY_URL;

      // Employee service expects POST /api/users/:userId/contracts (router mounted at /api)
      const response = await axios.post(
        `${target}/api/users/${userId}/contracts`,
        contractData,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [EmployeeService] Failed to create contract for user ${userId}:`, error.response?.status, error.message);
      throw error;
    }
  }
}

export default EmployeeService;
