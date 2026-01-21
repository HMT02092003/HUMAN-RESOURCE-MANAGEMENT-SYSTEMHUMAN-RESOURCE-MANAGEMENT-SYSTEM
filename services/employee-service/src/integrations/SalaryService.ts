import axios from 'axios';

const SALARY_SERVICE_URL = process.env.SALARY_SERVICE_URL || 'http://127.0.0.1:4007';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || `http://127.0.0.1:${process.env.API_GATEWAY_PORT || 4000}`;

class SalaryService {
  /**
   * Create salary profile for a user
   */
  static async createSalaryProfile(contractId: number, salaryData: any, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      // The salary-service expects salary creation from a contract at
      // POST /api/contracts/:contractId/salary-profile
      const response = await axios.post(
        `${SALARY_SERVICE_URL}/api/contracts/${contractId}/salary-profile`,
        salaryData,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [SalaryService] Failed to create salary profile for contract ${contractId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get salary profile by user ID
   */
  static async getSalaryProfile(userId: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.get(
        `${SALARY_SERVICE_URL}/api/profiles/user/${userId}`,
        { headers }
      );
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error(`❌ [SalaryService] Failed to get salary profile for user ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Update salary profile
   */
  static async updateSalaryProfile(userId: number, salaryData: any, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.put(
        `${SALARY_SERVICE_URL}/api/profiles/user/${userId}`,
        salaryData,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [SalaryService] Failed to update salary profile for user ${userId}:`, error.message);
      throw error;
    }
  }
}

export default SalaryService;
