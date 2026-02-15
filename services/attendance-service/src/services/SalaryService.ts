import axios from 'axios';
import knex from 'knex';

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || `http://127.0.0.1:${process.env['API_GATEWAY_PORT'] || 4000}`;
const SALARY_SERVICE_URL = process.env['SALARY_SERVICE_URL'] || `http://127.0.0.1:${process.env['SALARY_SERVICE_PORT'] || 4006}`;

export interface SalaryInfo {
  baseSalary: number;
  allowance?: number;
}

export class SalaryService {
  /**
   * Fetch salary information from salary-service
   * This service now stores employee_salary_profiles with historical tracking
   */
  static async fetchSalary(userId: number, token?: string, userData?: any): Promise<SalaryInfo | null> {
    const apiGatewayUrl = API_GATEWAY_URL;
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userData) {
      headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
      headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
    }

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
      const directHeaders: any = {};
      if (userData) {
        directHeaders['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        directHeaders['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }
      const resp = await axios.get(
        `${SALARY_SERVICE_URL}/api/users/${userId}/salary`,
        {
          headers: directHeaders,
          timeout: 4000
        }
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

    // Fallback: Direct database connection (same as seed data)
    let salaryDbConnection: any = null;
    try {
      console.log(`🔍 [SalaryService] Trying direct DB connection for user ${userId}`);
      salaryDbConnection = knex({
        client: 'pg',
        connection: {
          host: process.env['DB_HOST'] || 'localhost',
          port: Number(process.env['DB_PORT']) || 5432,
          database: 'salary_service',
          user: process.env['DB_USER'] || 'postgres',
          password: process.env['DB_PASSWORD'] || '123456'
        }
      });

      const profile = await salaryDbConnection('employee_salary_profiles')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .first();

      if (profile && profile.base_salary) {
        const salary = parseFloat(profile.base_salary.toString());
        const allowance = profile.allowance ? parseFloat(profile.allowance.toString()) : 0;

        console.log(`✅ [SalaryService] Salary retrieved from direct DB connection:`, { salary, allowance });
        return {
          baseSalary: salary,
          allowance: allowance
        };
      }
    } catch (e: any) {
      console.log(`⚠️ [SalaryService] Failed to fetch from direct DB connection:`, e.message);
    } finally {
      if (salaryDbConnection) {
        await salaryDbConnection.destroy();
      }
    }

    console.log(`❌ [SalaryService] Could not fetch salary for user ${userId} from any source`);
    return null;
  }


  /**
   * Fetch penalty rate settings from salary-service
   * These rates are now stored in salary-service settings table
   */
  static async fetchPenaltyRates(): Promise<{ late: number; earlyLeave: number } | null> {
    const apiGatewayUrl = API_GATEWAY_URL;

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
        `${SALARY_SERVICE_URL}/api/settings`,
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

    // Fallback: Direct database connection
    let salaryDbConnection: any = null;
    try {
      console.log(`🔍 [SalaryService] Trying direct DB connection for penalty rates`);
      salaryDbConnection = knex({
        client: 'pg',
        connection: {
          host: process.env['DB_HOST'] || 'localhost',
          port: Number(process.env['DB_PORT']) || 5432,
          database: 'salary_service',
          user: process.env['DB_USER'] || 'postgres',
          password: process.env['DB_PASSWORD'] || '123456'
        }
      });

      const setting = await salaryDbConnection('settings')
        .where('key', 'PenaltyRate')
        .first();

      if (setting && setting.value) {
        const parsedValue = typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value;
        const penaltyRate = parseFloat(parsedValue.rate || '0');

        console.log(`✅ [SalaryService] Penalty rate retrieved from direct DB:`, penaltyRate);
        return {
          late: penaltyRate,
          earlyLeave: penaltyRate
        };
      }
    } catch (e: any) {
      console.log(`⚠️ [SalaryService] Failed to fetch penalty rates from direct DB:`, e.message);
    } finally {
      if (salaryDbConnection) {
        await salaryDbConnection.destroy();
      }
    }

    console.log(`❌ [SalaryService] Could not fetch penalty rates, using default 0`);
    return { late: 0, earlyLeave: 0 };
  }
}

export default SalaryService;
