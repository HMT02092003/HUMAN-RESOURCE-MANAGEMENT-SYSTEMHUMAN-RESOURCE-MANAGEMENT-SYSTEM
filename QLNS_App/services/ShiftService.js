import apiService from './apiService';

/**
 * Shift Service - API calls cho quản lý ca làm việc
 * Giống với shiftService.ts trên web FE
 */

// ==================== SHIFT TEMPLATE APIs ====================

/**
 * Lấy danh sách ca (shift templates)
 */
export const getAllShiftConfigurations = async () => {
    const response = await apiService.get('/shifts');
    return response.data;
};

/**
 * Lấy chi tiết ca
 */
export const getShiftConfigurationById = async (id) => {
    const response = await apiService.get(`/shifts/${id}`);
    return response.data;
};

/**
 * Tạo ca mới
 */
export const createShiftConfiguration = async (data) => {
    const response = await apiService.post('/shifts', data);
    return response.data;
};

/**
 * Cập nhật ca
 */
export const updateShiftConfiguration = async (id, data) => {
    const response = await apiService.put(`/shifts/${id}`, data);
    return response.data;
};

/**
 * Xóa ca
 */
export const deleteShiftConfiguration = async (id) => {
    const response = await apiService.delete(`/shifts/${id}`);
    return response.data;
};

/**
 * Xóa nhiều cấu hình ca cùng lúc
 */
export const bulkDeleteShiftConfigurations = async (ids) => {
    const response = await apiService.post('/shifts/bulk-delete', { ids });
    return response.data;
};

// ==================== EMPLOYEE SCHEDULE APIs ====================

/**
 * Lấy đăng ký ca của user hiện tại
 */
export const getMyShiftRegistrations = async (filters = {}) => {
    const response = await apiService.get('/schedules/my', { params: filters });
    return response.data;
};

/**
 * Lấy danh sách đăng ký chờ duyệt (admin)
 */
export const getPendingShiftRegistrations = async (filters = {}) => {
    const response = await apiService.get('/schedules/pending', { params: filters });
    return response.data;
};

/**
 * Lấy chi tiết đăng ký ca
 */
export const getShiftRegistrationById = async (id) => {
    const response = await apiService.get(`/schedules/${id}`);
    return response.data;
};

/**
 * Đăng ký ca mới
 */
export const createShiftRegistration = async (data) => {
    const response = await apiService.post('/schedules', data);
    return response.data;
};

/**
 * Đăng ký nhiều ca cùng lúc
 */
export const bulkCreateShiftRegistrations = async (data) => {
    const response = await apiService.post('/schedules/bulk', data);
    return response.data;
};

/**
 * Cập nhật đăng ký ca
 */
export const updateShiftRegistration = async (id, data) => {
    const response = await apiService.put(`/schedules/${id}`, data);
    return response.data;
};

/**
 * Hủy đăng ký ca
 */
export const cancelShiftRegistration = async (id) => {
    const response = await apiService.delete(`/schedules/${id}`);
    return response.data;
};

/**
 * Xóa nhiều đăng ký (bulk)
 */
export const bulkDeleteShiftRegistrations = async (ids) => {
    const response = await apiService.post('/schedules/delete', { ids });
    return response.data;
};

/**
 * Duyệt đăng ký ca (admin) - DEPRECATED: Use bulkApproveSchedules([id], 'approve') instead
 * Giờ gọi bulk API với mảng 1 phần tử để đảm bảo logic nhất quán
 */
export const approveShiftRegistration = async (id, notes = '') => {
    return bulkApproveSchedules([id], 'approve');
};

/**
 * Từ chối đăng ký ca (admin) - DEPRECATED: Use bulkApproveSchedules([id], 'reject') instead
 * Giờ gọi bulk API với mảng 1 phần tử để đảm bảo logic nhất quán
 */
export const rejectShiftRegistration = async (id, notes) => {
    return bulkApproveSchedules([id], 'reject');
};

/**
 * Lấy thống kê đăng ký theo tháng
 */
export const getMonthlyShiftStats = async (year, month) => {
    const response = await apiService.get(`/schedules/stats/${year}/${month}`);
    return response.data;
};

// ==================== APPROVAL MANAGEMENT APIs ====================

/**
 * Lấy danh sách đơn đăng ký ca để duyệt (có phân trang và scope)
 */
export const getSchedulesForApproval = async (params = {}) => {
    const response = await apiService.get('/schedules/approval', { params });
    return response.data;
};

/**
 * Duyệt/từ chối nhiều đơn đăng ký cùng lúc
 */
export const bulkApproveSchedules = async (ids, action = 'approve') => {
    const response = await apiService.post('/schedules/approve', { ids, action });
    return response.data;
};

/**
 * Duyệt tất cả đơn đăng ký trong tháng
 */
export const approveMonthSchedules = async (year, month) => {
    const response = await apiService.post('/schedules/approve-month', { year, month });
    return response.data;
};

// ==================== HELPER CONSTANTS ====================

export const SHIFT_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

export const SHIFT_STATUS_LABELS = {
    'pending': 'Chờ duyệt',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối'
};

export const SHIFT_STATUS_COLORS = {
    'pending': '#fa8c16',
    'approved': '#52c41a',
    'rejected': '#ff4d4f'
};

export const getShiftStatusLabel = (status) => {
    return SHIFT_STATUS_LABELS[status] || 'Không xác định';
};

export const getShiftStatusColor = (status) => {
    return SHIFT_STATUS_COLORS[status] || '#8c8c8c';
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

    // Helpers
    SHIFT_STATUS,
    SHIFT_STATUS_LABELS,
    SHIFT_STATUS_COLORS,
    getShiftStatusLabel,
    getShiftStatusColor
};
