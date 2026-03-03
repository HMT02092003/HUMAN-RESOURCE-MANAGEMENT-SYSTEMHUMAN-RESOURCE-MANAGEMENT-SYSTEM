import axios from 'axios';
import AuthTokenManager from './AuthTokenManager';
import { Alert } from 'react-native';
import { getApiBaseUrl } from './apiConfig';

// Job service dùng route /jobs trực tiếp (không qua /api prefix)
const getJobBaseUrl = () => {
  const apiUrl = getApiBaseUrl(); // http://192.168.1.6:4000/api
  return apiUrl.replace('/api', ''); // http://192.168.1.6:4000
};

// Tạo axios instance riêng cho Job Service với refresh token logic
const jobApi = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - thêm token
jobApi.interceptors.request.use(
  async (config) => {
    // Set base URL dynamically
    const baseUrl = getJobBaseUrl();
    config.baseURL = baseUrl;

    console.log('📤 [JobService]', config.method?.toUpperCase(), config.url);

    const token = await AuthTokenManager.getAccessToken();
    if (token) {
      console.log('🔑 [JobService] Token found');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ [JobService] No token found');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - xử lý 401 và refresh token
jobApi.interceptors.response.use(
  (response) => {
    console.log('✅ [JobService] Response:', response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error('❌ [JobService] Error:', error.response?.status, error.response?.data?.message || error.message);

    // Nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('🔄 [JobService] Token expired, attempting refresh...');
      originalRequest._retry = true;

      try {
        const newToken = await AuthTokenManager.refreshAccessToken();

        if (newToken) {
          console.log('✅ [JobService] Token refreshed, retrying...');
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return jobApi(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ [JobService] Refresh failed:', refreshError.message);
        await AuthTokenManager.clearTokens();
        Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại');
      }
    }

    return Promise.reject(error);
  }
);

// ========== PROJECT MANAGEMENT ==========

/**
 * Lấy danh sách dự án theo scope (theo quyền user)
 * Bản chất đã lấy danh sách dự án mà user tham gia
 */
export const getAllProjectByScope = async (params = {}) => {
  const response = await jobApi.get('/jobs/projects', { params });
  return response.data;
};

/**
 * Lấy chi tiết dự án theo ID
 */
export const getProjectById = async (projectId) => {
  const response = await jobApi.get(`/jobs/projects/${projectId}`);
  return response.data;
};

/**
 * Lấy overview của dự án
 */
export const getProjectOverview = async (projectId) => {
  const response = await jobApi.get(`/jobs/projects/${projectId}/overview`);
  return response.data;
};

/**
 * Tạo dự án mới
 */
export const createProject = async (payload) => {
  const response = await jobApi.post('/jobs/projects', payload);
  return response.data;
};

/**
 * Cập nhật dự án
 */
export const updateProject = async (projectId, payload) => {
  const response = await jobApi.put(`/jobs/projects/${projectId}`, payload);
  return response.data;
};

/**
 * Xóa dự án (single hoặc bulk)
 */
export const deleteProject = async (projectIds) => {
  const ids = Array.isArray(projectIds) ? projectIds : [projectIds];
  const response = await jobApi.delete('/jobs/projects', { data: { ids } });
  return response.data;
};

// ========== PROJECT MEMBERS ==========

/**
 * Lấy danh sách thành viên dự án
 */
export const getProjectMembers = async (projectId) => {
  const response = await jobApi.get(`/jobs/projects/${projectId}/members`);
  return response.data;
};

/**
 * Lấy timeline của dự án
 */
export const getProjectTimeline = async (projectId, params = {}) => {
  const response = await jobApi.get(`/jobs/projects/${projectId}/timeline`, { params });
  return response.data;
};

// ========== TASK MANAGEMENT ==========

/**
 * Lấy danh sách task của dự án
 */
export const getProjectTasks = async (projectId, params = {}) => {
  const response = await jobApi.get(`/jobs/projects/${projectId}/tasks`, { params });
  return response.data;
};

/**
 * Lấy thống kê task của dự án
 */
export const getProjectTaskStatistics = async (projectId) => {
  const response = await jobApi.get(`/jobs/projects/${projectId}/tasks/statistics`);
  return response.data;
};

/**
 * Lấy task của user trong dự án
 */
export const getUserTasks = async (projectId, userId) => {
  const response = await jobApi.get(`/jobs/projects/${projectId}/users/${userId}/tasks`);
  return response.data;
};

/**
 * Lấy task của user hiện tại (my tasks) - qua tất cả các dự án
 */
export const getMyTasks = async (params = {}) => {
  const response = await jobApi.get('/jobs/tasks/my-tasks', { params });
  return response.data;
};

/**
 * Cập nhật trạng thái task
 */
export const updateTaskStatus = async (projectId, taskId, status) => {
  const response = await jobApi.put(`/jobs/projects/${projectId}/tasks/${taskId}/status`, { status });
  return response.data;
};

/**
 * Cập nhật task
 */
export const updateTask = async (projectId, taskId, payload) => {
  const response = await jobApi.put(`/jobs/projects/${projectId}/tasks/${taskId}`, payload);
  return response.data;
};

/**
 * Xóa task
 */
export const deleteTask = async (projectId, taskId) => {
  const response = await jobApi.delete(`/jobs/projects/${projectId}/tasks/${taskId}`);
  return response.data;
};

// ========== CV MANAGEMENT ==========

/**
 * Lấy danh sách CV
 */
export const fetchCvs = async (params = {}) => {
  const response = await jobApi.get('/jobs/cvs', { params });
  return response.data;
};

/**
 * Upload CV
 */
export const uploadCv = async (formData) => {
  const response = await jobApi.post('/jobs/cvs/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30000,
  });
  return response.data;
};

/**
 * Xóa CV
 */
export const deleteCv = async (cvId) => {
  const response = await jobApi.delete(`/jobs/cvs/${cvId}`);
  return response.data;
};

/**
 * Xóa nhiều CV
 */
export const bulkDeleteCvs = async (ids) => {
  const response = await jobApi.post('/jobs/cvs/bulk-delete', { ids });
  return response.data;
};

// ========== AI ANALYSIS ==========

/**
 * Phân tích task với AI
 */
export const analyzeJob = async (payload) => {
  const response = await jobApi.post('/jobs/projects/analyze-task', payload);
  return response.data;
};

/**
 * Tìm ứng viên phù hợp
 */
export const findCandidates = async (payload) => {
  const response = await jobApi.post('/jobs/projects/find-candidates', payload);
  return response.data;
};

/**
 * Tạo task với AI analysis
 */
export const createJobWithAnalysis = async (payload) => {
  const response = await jobApi.post('/jobs/projects/create-task-with-analysis', payload);
  return response.data;
};

// ========== HELPERS ==========

const statusColors = {
  planning: '#1890ff',
  active: '#52c41a',
  on_hold: '#faad14',
  completed: '#722ed1',
  cancelled: '#ff4d4f'
};

const statusLabels = {
  planning: 'Đang lên kế hoạch',
  active: 'Đang thực hiện',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const taskStatusColors = {
  todo: '#faad14',
  in_progress: '#1890ff',
  pending_approval: '#722ed1',
  done: '#52c41a'
};

const taskStatusLabels = {
  todo: 'Chờ làm',
  in_progress: 'Đang làm',
  pending_approval: 'Chờ phê duyệt',
  done: 'Hoàn thành'
};

const priorityColors = {
  low: '#8c8c8c',
  medium: '#1890ff',
  high: '#faad14',
  urgent: '#ff4d4f'
};

const priorityLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp'
};

export const getStatusColor = (status) => statusColors[status] || '#1890ff';
export const getStatusLabel = (status) => statusLabels[status] || status;
export const getTaskStatusColor = (status) => taskStatusColors[status] || '#1890ff';
export const getTaskStatusLabel = (status) => taskStatusLabels[status] || status;
export const getPriorityColor = (priority) => priorityColors[priority] || '#1890ff';
export const getPriorityLabel = (priority) => priorityLabels[priority] || priority;

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Expense APIs
export const getProjectExpenses = async (projectId) => {
  const response = await jobApi.get(`/jobs/projects/${projectId}/expenses`);
  return response.data;
};

export const createProjectExpense = async (projectId, payload) => {
  const response = await jobApi.post(`/jobs/projects/${projectId}/expenses`, payload);
  return response.data;
};

export const approveProjectExpense = async (expenseId) => {
  const response = await jobApi.put(`/jobs/expenses/${expenseId}/status`, { status: 'approved' });
  return response.data;
};

export const rejectProjectExpense = async (expenseId) => {
  const response = await jobApi.put(`/jobs/expenses/${expenseId}/status`, { status: 'rejected' });
  return response.data;
};

export default {
  // Projects
  getAllProjectByScope,
  getProjectById,
  getProjectOverview,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  getProjectTimeline,
  // Tasks
  getProjectTasks,
  getProjectTaskStatistics,
  getUserTasks,
  getMyTasks,
  updateTaskStatus,
  updateTask,
  deleteTask,
  // CVs
  fetchCvs,
  uploadCv,
  deleteCv,
  bulkDeleteCvs,
  // AI
  analyzeJob,
  findCandidates,
  createJobWithAnalysis,
  // Expenses
  getProjectExpenses,
  createProjectExpense,
  approveProjectExpense,
  rejectProjectExpense,
  // Helpers
  getStatusColor,
  getStatusLabel,
  getTaskStatusColor,
  getTaskStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  formatCurrency,
  formatDate,
  getInitials,
  // KPI APIs
  getAllUsersKpi: (params = {}) => {
    return jobApi.get('/jobs/kpi/users', { params });
  },
  getUserProjectKpiDetails: (userId, params = {}) => {
    return jobApi.get(`/jobs/kpi/users/${userId}/projects`, { params });
  },
};
