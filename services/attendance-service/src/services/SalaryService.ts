import axios from 'axios';

const API_GATEWAY_PORT = process.env['API_GATEWAY_PORT'] || 4000;
const AUTH_SERVICE_PORT = process.env['AUTH_SERVICE_PORT'] || 4001;

export interface SalaryInfo {
  baseSalary: number;
  allowance?: number;
}

export class SalaryService {
  static async fetchSalary(userId: number, token?: string): Promise<SalaryInfo | null> {
    const apiGatewayUrl = `http://localhost:${API_GATEWAY_PORT}`;
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Try internal auth endpoint
    try {
      const resp = await axios.get(`http://localhost:${AUTH_SERVICE_PORT}/api/internal/users/${userId}/salary`, { timeout: 4000 });
      if (resp.data && resp.data.success && resp.data.data) {
        return { baseSalary: parseFloat(resp.data.data.baseSalary || resp.data.data.salary || '0'), allowance: parseFloat(resp.data.data.allowance || '0') };
      }
    } catch (e) { /* ignore */ }

    // Try employee endpoint via gateway
    try {
      const resp = await axios.get(`${apiGatewayUrl}/api/employee/users/${userId}/salary`, { timeout: 4000 });
      if (resp.data && resp.data.success && resp.data.data) {
        return { baseSalary: parseFloat(resp.data.data.baseSalary || resp.data.data.salary || '0'), allowance: parseFloat(resp.data.data.allowance || '0') };
      }
    } catch (e) { /* ignore */ }

    // Final fallback: user detail via auth service
    try {
      const resp = await axios.get(`${apiGatewayUrl}/api/auth/users/detail/${userId}`, { headers, timeout: 5000 });
      const userData = resp.data && (resp.data.data ? resp.data.data : resp.data);
      if (userData && (userData.salary !== undefined || userData.baseSalary !== undefined)) {
        return { baseSalary: parseFloat(userData.salary || userData.baseSalary || '0'), allowance: parseFloat(userData.allowance || '0') };
      }
    } catch (e) { /* ignore */ }

    return null;
  }
}

export default SalaryService;
