import axios from 'axios';

const SALARY_SERVICE_URL = process.env.SALARY_SERVICE_URL || 'http://localhost:4007';
const API_GATEWAY_URL = `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;

class SalaryService {
  /**
   * Create salary profile for a user
   */
  static async createSalaryProfile(userId: number, salaryData: any, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      const response = await axios.post(
        `${API_GATEWAY_URL}/api/salary/profiles`,
        { userId, ...salaryData },
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [SalaryService] Failed to create salary profile for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get salary profile by user ID
   */
  static async getSalaryProfile(userId: number, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      const response = await axios.get(
        `${API_GATEWAY_URL}/api/salary/profiles/user/${userId}`,
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
  static async updateSalaryProfile(userId: number, salaryData: any, authToken?: string): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;

      const response = await axios.put(
        `${API_GATEWAY_URL}/api/salary/profiles/user/${userId}`,
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
