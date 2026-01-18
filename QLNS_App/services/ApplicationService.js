import apiService from './apiService';

// Constants cho Application
export const APPLICATION_TYPE_LABELS = {
    'business-trip': 'Công tác',
    'leave': 'Xin nghỉ phép',
    'overtime': 'Làm thêm giờ',
    'remote-work': 'Làm việc từ xa',
    'sick-leave': 'Nghỉ ốm',
    'shift-registration': 'Đăng ký ca làm việc',
    'forgot-check': 'Quên check in/out',
    'resignation': 'Thôi việc'
};

export const APPLICATION_STATUS_LABELS = {
    0: 'Chờ duyệt',
    1: 'Đã duyệt',
    2: 'Từ chối'
};

export const APPLICATION_STATUS_COLORS = {
    0: '#fa8c16', // orange - pending
    1: '#52c41a', // green - approved
    2: '#ff4d4f'  // red - rejected
};

export const FORGOT_CHECK_TYPE_LABELS = {
    'check-in': 'Quên check in',
    'check-out': 'Quên check out',
};

const ApplicationService = {
    // Lấy danh sách tất cả applications (quản lý)
    getAllApplications: async (params = {}) => {
        try {
            const response = await apiService.get('/applications', { params });
            return response.data;
        } catch (error) {
            console.error('ApplicationService - getAllApplications error:', error);
            throw error;
        }
    },

    // Lấy applications của user hiện tại (đơn từ cá nhân)
    getMyApplications: async (params = {}) => {
        try {
            const response = await apiService.get('/applications/my-applications', { params });
            return response.data;
        } catch (error) {
            console.error('ApplicationService - getMyApplications error:', error);
            throw error;
        }
    },

    // Lấy chi tiết application theo ID
    getApplicationById: async (id) => {
        try {
            const response = await apiService.get(`/applications/${id}`);
            return response.data;
        } catch (error) {
            console.error('ApplicationService - getApplicationById error:', error);
            throw error;
        }
    },

    // Tạo application mới
    createApplication: async (data) => {
        try {
            const response = await apiService.post('/applications', data);
            return response.data;
        } catch (error) {
            console.error('ApplicationService - createApplication error:', error);
            throw error;
        }
    },

    // Cập nhật application (chỉ khi status = PENDING)
    updateApplication: async (id, data) => {
        try {
            const response = await apiService.put(`/applications/${id}`, { id, ...data });
            return response.data;
        } catch (error) {
            console.error('ApplicationService - updateApplication error:', error);
            throw error;
        }
    },

    // Xóa / Hủy application
    deleteApplication: async (id) => {
        try {
            const response = await apiService.delete(`/applications/${id}`);
            return response.data;
        } catch (error) {
            console.error('ApplicationService - deleteApplication error:', error);
            throw error;
        }
    },

    // Xóa nhiều applications
    bulkDeleteApplications: async (ids) => {
        try {
            const response = await apiService.post('/applications/bulk-delete', { ids });
            return response.data;
        } catch (error) {
            console.error('ApplicationService - bulkDeleteApplications error:', error);
            throw error;
        }
    },

    // Duyệt application - DEPRECATED: Use bulkApproveApplications([id]) instead
    // Giờ gọi bulk API với mảng 1 phần tử để đảm bảo logic nhất quán
    approveApplication: async (id, approvalData = {}) => {
        try {
            const response = await apiService.post('/applications/bulk-approve', { ids: [id] });
            return response.data;
        } catch (error) {
            console.error('ApplicationService - approveApplication error:', error);
            throw error;
        }
    },

    // Từ chối application - DEPRECATED: Use bulkRejectApplications([id]) instead
    // Giờ gọi bulk API với mảng 1 phần tử để đảm bảo logic nhất quán
    rejectApplication: async (id, rejectionData = {}) => {
        try {
            const response = await apiService.post('/applications/bulk-reject', { ids: [id] });
            return response.data;
        } catch (error) {
            console.error('ApplicationService - rejectApplication error:', error);
            throw error;
        }
    },

    // Lấy thông tin user theo ID (để hiển thị thông tin người tạo/người duyệt)
    getUserById: async (id) => {
        try {
            const response = await apiService.get(`/auth/users/detail/${id}`);
            return response.data;
        } catch (error) {
            console.error('ApplicationService - getUserById error:', error);
            throw error;
        }
    }
};

export default ApplicationService;
