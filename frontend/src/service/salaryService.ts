import { calculateOverrideValues } from 'next/dist/server/font-utils';
import api from './apiService';

export default {

  listAllowanceTypes(params?: { page?: number; pageSize?: number }) {
    return api.get('/api/salary/allowance-types', { params }).then(r => r.data);
  },

  // get all allowance types (no pagination)
  getAllowanceTypes() {
    return api.get('/api/salary/allowance-types/all').then(r => r.data);
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
      .then(r => ({ success: r.data?.success ?? true, data: r.data?.data ?? r.data ?? [], message: r.data?.message }))
      .catch(err => ({ success: false, data: [], message: err?.response?.data?.message || err.message }));
  },

  // Trigger bulk calculation on the server for a month
  calculateFromAttendance(month: string) {
    return api.post('/api/salary/payslips/calculate-from-attendance', { month })
      .then(r => ({ success: r.data?.success ?? true, data: r.data?.data ?? r.data ?? null, message: r.data?.message }))
      .catch(err => ({ success: false, data: null, message: err?.response?.data?.message || err.message }));
  }
};