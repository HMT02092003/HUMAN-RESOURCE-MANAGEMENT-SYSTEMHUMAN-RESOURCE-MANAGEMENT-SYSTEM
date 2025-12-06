import apiService from './apiService';

/**
 * Shift Service - API calls cho quản lý ca làm việc
 * Updated to match new backend API structure
 */

// ==================== SHIFT TEMPLATE APIs ====================

/**
 * Lấy danh sách ca (shift templates)
 */
export const getAllShiftConfigurations = async () => {
  return apiService.get('/api/shifts');
};

/**
 * Lấy chi tiết ca
 */
export const getShiftConfigurationById = async (id: number) => {
  return apiService.get(`/api/shifts/${id}`);
};

/**
 * Tạo ca mới
 */
export const createShiftConfiguration = async (data: any) => {
  return apiService.post('/api/shifts', data);
};

/**
 * Cập nhật ca
 */
export const updateShiftConfiguration = async (id: number, data: any) => {
  return apiService.put(`/api/shifts/${id}`, data);
};

/**
 * Xóa ca
 */
export const deleteShiftConfiguration = async (id: number) => {
  return apiService.delete(`/api/shifts/${id}`);
};

/**
 * Xóa nhiều cấu hình ca cùng lúc
 */
export const bulkDeleteShiftConfigurations = async (ids: number[]) => {
  return apiService.post('/api/shifts/bulk-delete', { ids });
};

// ==================== EMPLOYEE SCHEDULE APIs ====================

/**
 * Lấy đăng ký ca của user hiện tại
 */
export const getMyShiftRegistrations = async (filters?: {
  status?: string;
  fromDate?: string;
  toDate?: string;
  shift_id?: number;
}) => {
  return apiService.get('/api/schedules/my', { params: filters });
};

/**
 * Lấy danh sách đăng ký chờ duyệt (admin)
 */
export const getPendingShiftRegistrations = async (filters?: {
  fromDate?: string;
  toDate?: string;
  shift_id?: number;
}) => {
  return apiService.get('/api/schedules/pending', { params: filters });
};

/**
 * Lấy chi tiết đăng ký ca
 */
export const getShiftRegistrationById = async (id: number) => {
  return apiService.get(`/api/schedules/${id}`);
};

/**
 * Đăng ký ca mới
 */
export const createShiftRegistration = async (data: {
  shift_id: number;
  date: string;
  notes?: string;
}) => {
  return apiService.post('/api/schedules', data);
};

/**
 * Đăng ký nhiều ca cùng lúc
 */
export const bulkCreateShiftRegistrations = async (data: {
  shift_id: number;
  dates: string[];
  notes?: string;
}) => {
  return apiService.post('/api/schedules/bulk', data);
};

/**
 * Cập nhật đăng ký ca
 */
export const updateShiftRegistration = async (id: number, data: any) => {
  return apiService.put(`/api/schedules/${id}`, data);
};

/**
 * Hủy đăng ký ca
 */
export const cancelShiftRegistration = async (id: number) => {
  return apiService.delete(`/api/schedules/${id}`);
};

/**
 * Xóa nhiều đăng ký (bulk) - dùng cho FE khi xóa nhiều hoặc xóa 1 bằng payload mảng
 */
export const bulkDeleteShiftRegistrations = async (ids: number[]) => {
  return apiService.post('/api/schedules/delete', { ids });
};

/**
 * Duyệt đăng ký ca (admin)
 */
export const approveShiftRegistration = async (id: number, notes?: string) => {
  return apiService.post(`/api/schedules/${id}/approve`, { notes });
};

/**
 * Từ chối đăng ký ca (admin)
 */
export const rejectShiftRegistration = async (id: number, notes: string) => {
  return apiService.post(`/api/schedules/${id}/reject`, { notes });
};

/**
 * Lấy thống kê đăng ký theo tháng
 */
export const getMonthlyShiftStats = async (year: number, month: number) => {
  return apiService.get(`/api/schedules/stats/${year}/${month}`);
};

// ==================== APPROVAL MANAGEMENT APIs ====================

/**
 * Lấy danh sách đơn đăng ký ca để duyệt (có phân trang và scope)
 */
export const getSchedulesForApproval = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  user_id?: number;
  sortField?: string;
  sortOrder?: string;
}) => {
  return apiService.get('/api/schedules/approval', { params });
};

/**
 * Duyệt/từ chối nhiều đơn đăng ký cùng lúc
 */
export const bulkApproveSchedules = async (ids: number[], action: 'approve' | 'reject' = 'approve') => {
  return apiService.post('/api/schedules/approve', { ids, action });
};

/**
 * Duyệt tất cả đơn đăng ký trong tháng
 */
export const approveMonthSchedules = async (year: number, month: number) => {
  return apiService.post('/api/schedules/approve-month', { year, month });
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Shift Status Enum (updated to use strings)
 */
export const SHIFT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

/**
 * Shift Status Labels
 */
export const SHIFT_STATUS_LABELS: Record<string, string> = {
  'pending': 'Chờ duyệt',
  'approved': 'Đã duyệt',
  'rejected': 'Từ chối'
};

/**
 * Lấy label trạng thái
 */
export const getShiftStatusLabel = (status: string): string => {
  return SHIFT_STATUS_LABELS[status] || 'Không xác định';
};

/**
 * Lấy màu trạng thái cho Badge
 */
export const getShiftStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'pending': 'processing',  // Chờ duyệt - xanh
    'approved': 'success',    // Đã duyệt - xanh lá
    'rejected': 'error'       // Từ chối - đỏ
  };
  return colors[status] || 'default';
};

// ==================== HOLIDAYS APIs ====================

/**
 * Lấy danh sách ngày lễ
 */
export const getHolidays = async (year?: number, month?: number) => {
  let url = '/api/holidays';
  if (year && month) {
    url += `?year=${year}&month=${month}`;
  }
  return apiService.get(url);
};

export default {
  // Configuration
  getAllShiftConfigurations,
  getShiftConfigurationById,
  createShiftConfiguration,
  updateShiftConfiguration,
  deleteShiftConfiguration,
  bulkDeleteShiftConfigurations,
  
  // Registration
  getMyShiftRegistrations,
  getPendingShiftRegistrations,
  getShiftRegistrationById,
  createShiftRegistration,
  bulkCreateShiftRegistrations,
  updateShiftRegistration,
  cancelShiftRegistration,
  bulkDeleteShiftRegistrations,
  approveShiftRegistration,
  rejectShiftRegistration,
  getMonthlyShiftStats,
  
  // Approval Management
  getSchedulesForApproval,
  bulkApproveSchedules,
  approveMonthSchedules,
  
  // Holidays
  getHolidays,
  
  // Helpers
  SHIFT_STATUS,
  SHIFT_STATUS_LABELS,
  getShiftStatusLabel,
  getShiftStatusColor
};
