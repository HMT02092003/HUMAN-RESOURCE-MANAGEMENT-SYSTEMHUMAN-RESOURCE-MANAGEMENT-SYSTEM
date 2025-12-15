import api from './apiService';
import Cookies from 'js-cookie';

export default {

  listAllowanceTypes(params?: any) {
    return api.get('/api/salary/allowance-types', { params }).then(r => r.data);
  },

  // get all allowance types (no pagination)
  getAllowanceTypes() {
    return api.get('/api/salary/all/allowance-types').then(r => r.data);
  },


  getAllowanceType(id: any) {
    return api.get(`/api/salary/allowance-types/${id}`).then(r => r.data);
  },


  createAllowanceType(payload: any) {
    return api.post('/api/salary/allowance-types', payload).then(r => r.data);
  },

  updateAllowanceType(id: any, payload: any) {
    return api.put(`/api/salary/allowance-types/${id}`, payload).then(r => r.data);
  },

  removeAllowanceType(id: any) {
    return api.delete(`/api/salary/allowance-types/${id}`).then(r => r.data);
  },

  getEmployeeSalaryProfile(userId: number | string) {
  // call via API Gateway: /api/salary/users/:userId/salary -> gateway rewrites to salary service /api/users/:userId/salary
  return api.get(`/api/salary/users/${userId}/salary`).then(r => r.data);
  },

  upsertEmployeeSalaryProfile(userId: number | string, payload: any) {
  return api.put(`/api/salary/users/${userId}/salary`, payload).then(r => r.data);
  }
,

  // list all salary profiles for a user
  listEmployeeSalaryProfiles(userId: number | string) {
    return api.get(`/api/salary/users/${userId}/salary-profiles`).then(r => r.data);
  },

  // create a new salary profile for a user
  createEmployeeSalaryProfile(userId: number | string, payload: any) {
    return api.post(`/api/salary/users/${userId}/salary-profiles`, payload).then(r => r.data);
  }
,

  // List payslips for a given month (normalize response)
  listPayslips(month: string) {
    return api.get('/api/salary/payslips', { params: { month } })
      .then(r => ({ 
        success: r.data?.success ?? true, 
        data: r.data?.data ?? r.data ?? [], 
        total: r.data?.total ?? 0,
        message: r.data?.message 
      }))
      .catch(err => ({ 
        success: false, 
        data: [], 
        total: 0,
        message: err?.response?.data?.message || err.message 
      }));
  },

  // List payslips paginated
  listPayslipsPaginated(params: { month?: string; page?: number; pageSize?: number; allMonths?: boolean; limit?: number; sort?: string; order?: string; [key: string]: any }) {
    const query: any = {
      page: params.page,
      pageSize: params.pageSize || params.limit,
      ...params
    };
    // If caller requested month='all', remove month param so backend returns all months (backend defaults to all months)
    if (params.month === 'all') {
      delete query.month;
    }
    return api.get('/api/salary/payslips', { params: query })
      .then(r => ({ success: r.data?.success ?? true, data: r.data?.data ?? r.data ?? [], total: r.data?.total ?? 0, message: r.data?.message }))
      .catch(err => ({ success: false, data: [], total: 0, message: err?.response?.data?.message || err.message }));
  },

  // Get payslips for a single user (optional month filter)
  getPayslipsByUser(userId: number | string, params?: { month?: string; year?: number; monthNum?: number }) {
    const qs: any = {};
    if (params?.month) qs.month = params.month;
    if (params?.year) qs.year = params.year;
    if (params?.monthNum) qs.month = params.monthNum;
    return api.get(`/api/salary/users/${userId}/payslips`, { params: qs })
      .then(r => ({ success: r.data?.success ?? true, data: r.data?.data ?? [], message: r.data?.message }))
      .catch(err => ({ success: false, data: [], message: err?.response?.data?.message || err.message }));
  },

  // Get payslips for the authenticated user (me). Optional month filter.
  getMyPayslips(params?: { month?: string; year?: number; monthNum?: number }) {
    const qs: any = {};
    if (params?.month) qs.month = params.month;
    if (params?.year) qs.year = params.year;
    if (params?.monthNum) qs.month = params.monthNum;
    return api.get('/api/salary/payslips/me', { params: qs })
      .then(r => ({ success: r.data?.success ?? true, data: r.data?.data ?? [], message: r.data?.message }))
      .catch(err => ({ success: false, data: [], message: err?.response?.data?.message || err.message }));
  },

  // Paginated list for authenticated user's own payslips (server-side)
  listMyPayslipsPaginated(params: { page?: number; pageSize?: number; limit?: number; sort?: string; order?: string; [key: string]: any }) {
    const query: any = {
      page: params.page,
      pageSize: params.pageSize || params.limit,
      ...params
    };
    return api.get('/api/salary/payslips/me', { params: query })
      .then(r => ({ success: r.data?.success ?? true, data: r.data?.data ?? r.data ?? [], total: r.data?.total ?? 0, page: r.data?.page ?? query.page, pageSize: r.data?.pageSize ?? query.pageSize, message: r.data?.message }))
      .catch(err => ({ success: false, data: [], total: 0, page: params.page || 1, pageSize: params.pageSize || params.limit || 10, message: err?.response?.data?.message || err.message }));
  },

  // Trigger bulk calculation on the server for a month
  calculateFromAttendance(month: string) {
    // Attach Authorization header explicitly as a safeguard in case proxy or env
    // strips original headers. The axios instance usually adds the token, but
    // for this admin bulk endpoint we force it here too.
    const token = Cookies.get('token') || (typeof window !== 'undefined' ? window.localStorage?.getItem('token') || undefined : undefined);
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return api.post('/api/salary/payslips/calculate-from-attendance', { month }, { headers })
      .then(r => ({ 
        success: r.data?.success ?? true, 
        data: r.data?.data ?? r.data ?? null, 
        message: r.data?.message,
        usersWithoutContracts: r.data?.usersWithoutContracts || [],
        usersWithoutApprovedAttendance: r.data?.usersWithoutApprovedAttendance || [],
        usersWithoutSalaryProfile: r.data?.usersWithoutSalaryProfile || []
      }))
      .catch(err => ({ 
        success: false, 
        data: null, 
        message: err?.response?.data?.message || err.message,
        usersWithoutContracts: err?.response?.data?.usersWithoutContracts || [],
        usersWithoutApprovedAttendance: err?.response?.data?.usersWithoutApprovedAttendance || [],
        usersWithoutSalaryProfile: err?.response?.data?.usersWithoutSalaryProfile || []
      }));
  },

  // Get a single payslip by id (enriched)
  getPayslipById(id: number | string) {
    return api.get(`/api/salary/payslips/${id}`).then(r => ({ success: r.data?.success ?? true, data: r.data?.data ?? null, message: r.data?.message }))
      .catch(err => ({ success: false, data: null, message: err?.response?.data?.message || err.message }));
  },

  // Get salary profile by contract ID
  getSalaryByContractId(contractId: number | string) {
    return api.get(`/api/salary/contracts/${contractId}/salary-profile`)
      .then(r => r.data)
      .catch(err => {
        console.warn(`No salary profile found for contract ${contractId}:`, err?.response?.data?.error);
        return null;
      });
  },

  // Update bank and tax info for a user
  updateBankTaxInfo(userId: number | string, payload: any) {
    return api.put(`/api/salary/users/${userId}/bank-tax-info`, payload).then(r => r.data);
  }
};