import axios from 'axios';

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://127.0.0.1:4002';

class EmployeeService {
  /**
   * Get department by ID
   */
  static async getDepartmentById(departmentId: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

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
}

export default EmployeeService;
