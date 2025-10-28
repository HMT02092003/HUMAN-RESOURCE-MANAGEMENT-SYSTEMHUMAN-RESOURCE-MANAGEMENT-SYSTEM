import axios from 'axios';

const API_GATEWAY_PORT = process.env['API_GATEWAY_PORT'] || 4000;
const SALARY_SERVICE_PORT = process.env['SALARY_SERVICE_PORT'] || 4006;

export interface SalaryInfo {
  baseSalary: number;
  allowance?: number;
}

export class SalaryService {
  /**
   * Fetch salary information from salary-service
   * This service now stores employee_salary_profiles with historical tracking
   */
  static async fetchSalary(userId: number, token?: string): Promise<SalaryInfo | null> {
    const apiGatewayUrl = `http://localhost:${API_GATEWAY_PORT}`;
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Try salary service via API Gateway first (primary source)
    try {
      console.log(`🔍 [SalaryService] Fetching salary from salary-service for user ${userId}`);
      const resp = await axios.get(
        `${apiGatewayUrl}/api/salary/users/${userId}/salary`,
        { headers, timeout: 5000 }
      );
      
      if (resp.data) {
        const salary = parseFloat(resp.data.salary || '0');
        const allowance = parseFloat(resp.data.allowance || '0');
        
        console.log(`✅ [SalaryService] Salary retrieved from salary-service:`, { salary, allowance });
        return { 
          baseSalary: salary, 
          allowance: allowance 
        };
      }
    } catch (e: any) {
      console.log(`⚠️ [SalaryService] Failed to fetch from salary-service via gateway:`, e.message);
    }

    // Try direct salary service call (internal)
    try {
      console.log(`🔍 [SalaryService] Trying direct salary-service call for user ${userId}`);
      const resp = await axios.get(
        `http://localhost:${SALARY_SERVICE_PORT}/api/users/${userId}/salary`,
        { timeout: 4000 }
      );
      
      if (resp.data) {
        const salary = parseFloat(resp.data.salary || '0');
        const allowance = parseFloat(resp.data.allowance || '0');
        
        console.log(`✅ [SalaryService] Salary retrieved from direct salary-service call:`, { salary, allowance });
        return { 
          baseSalary: salary, 
          allowance: allowance 
        };
      }
    } catch (e: any) {
      console.log(`⚠️ [SalaryService] Failed to fetch from direct salary-service:`, e.message);
    }

    console.log(`❌ [SalaryService] Could not fetch salary for user ${userId} from salary-service`);
    return null;
  }

  /**
   * Fetch penalty rate settings from salary-service
   * These rates are now stored in salary-service settings table
   */
  static async fetchPenaltyRates(): Promise<{ late: number; earlyLeave: number } | null> {
    const apiGatewayUrl = `http://localhost:${API_GATEWAY_PORT}`;
    
    try {
      console.log(`🔍 [SalaryService] Fetching penalty rates from salary-service`);
      const resp = await axios.get(
        `${apiGatewayUrl}/api/salary/settings`,
        { timeout: 5000 }
      );
      
      if (resp.data && Array.isArray(resp.data)) {
        // Settings returned as array of {key, name, value}
        const penaltyRateSetting = resp.data.find((s: any) => s.key === 'PenaltyRate');
        if (penaltyRateSetting && penaltyRateSetting.value) {
          const parsedValue = typeof penaltyRateSetting.value === 'string' 
            ? JSON.parse(penaltyRateSetting.value) 
            : penaltyRateSetting.value;
          const penaltyRate = parseFloat(parsedValue.rate || '0');
          
          console.log(`✅ [SalaryService] Penalty rate retrieved:`, penaltyRate);
          return {
            late: penaltyRate,
            earlyLeave: penaltyRate
          };
        }
      }
    } catch (e: any) {
      console.log(`⚠️ [SalaryService] Failed to fetch penalty rates from salary-service:`, e.message);
    }

    // Try direct call
    try {
      console.log(`🔍 [SalaryService] Trying direct salary-service call for penalty rates`);
      const resp = await axios.get(
        `http://localhost:${SALARY_SERVICE_PORT}/api/settings`,
        { timeout: 4000 }
      );
      
      if (resp.data && Array.isArray(resp.data)) {
        const penaltyRateSetting = resp.data.find((s: any) => s.key === 'PenaltyRate');
        if (penaltyRateSetting && penaltyRateSetting.value) {
          const parsedValue = typeof penaltyRateSetting.value === 'string' 
            ? JSON.parse(penaltyRateSetting.value) 
            : penaltyRateSetting.value;
          const penaltyRate = parseFloat(parsedValue.rate || '0');
          
          console.log(`✅ [SalaryService] Penalty rate retrieved from direct call:`, penaltyRate);
          return {
            late: penaltyRate,
            earlyLeave: penaltyRate
          };
        }
      }
    } catch (e: any) {
      console.log(`⚠️ [SalaryService] Failed to fetch penalty rates from direct salary-service:`, e.message);
    }

    console.log(`❌ [SalaryService] Could not fetch penalty rates, using default 0`);
    return { late: 0, earlyLeave: 0 };
  }
}

export default SalaryService;
