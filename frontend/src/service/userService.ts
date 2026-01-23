import api from './apiService';

const UserService = {
  // Lấy danh sách users với pagination
  getAllUsers: async (params: { page: number; pageSize: number }) => {
    try {
      const response = await api.get('/api/auth/users', {
        params: {
          page: params.page,
          pageSize: params.pageSize,
          _t: Date.now() // Cache buster
        },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      return response.data; // { results: [...], total: N }
    } catch (error) {
      throw error;
    }
  },

  // Tạo user mới
  createUser: async (data: any) => {
    try {
      const response = await api.post('/api/auth/users', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cập nhật user
  updateUser: async (id: number, data: any) => {
    try {
      const response = await api.put(`/api/auth/users/${id}`, { id, ...data });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Xóa user
  deleteUser: async (id: number) => {
    try {
      const response = await api.delete(`/api/auth/users/${id}`, { data: { id } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Xóa nhiều users
  deleteMultipleUsers: async (ids: number[]) => {
    try {
      const response = await api.delete('/api/auth/users/multiple', { data: { ids } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy thông tin user theo ID (cơ bản)
  getUserById: async (id: number) => {
    try {
      const response = await api.get(`/api/auth/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy chi tiết user với đầy đủ thông tin (role, department, chevron, contract)
  getUserDetail: async (id: number) => {
    try {
      const response = await api.get(`/api/auth/users/detail/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Tạo hợp đồng cho user
  createContract: async (userId: number, contractData: any) => {
    try {
      const response = await api.post(`/api/auth/users/${userId}/contract`, contractData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy thông tin lương của user
  getSalaryInfo: async (userId: number) => {
    try {
      const response = await api.get(`/api/auth/users/${userId}/salary`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cập nhật thông tin lương của user
  updateSalaryInfo: async (userId: number, salaryData: { salary?: number; allowance?: number }) => {
    try {
      const response = await api.put(`/api/auth/users/${userId}/salary`, salaryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getNumberOfDaysOff: async (userId: number) => {
    try {
      const response = await api.get(`/api/auth/users/${userId}/number-of-days-off`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy danh sách users theo department
  getUsersByDepartment: async (departmentId: number) => {
    try {
      const response = await api.get('/api/auth/users/by-department', {
        params: { departmentId }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy danh sách users với server-side pagination, sorting và filtering
  // Dùng cho bảng quản lý users
  getAllUsersAll: async (params?: {
    scope?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: 'ascend' | 'descend';
    search?: string;
    // Column filters
    username?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    gender?: string;
    status?: string;
    roleId?: number;
    departmentId?: number;
    chevronId?: number;
    startDateFrom?: string;
    startDateTo?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
  }) => {
    try {
      const response = await api.get('/api/auth/users/all', {
        params: {
          ...(params || {}),
          _t: Date.now()
        },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      return response.data; // { results: [...], total: N, page: N, pageSize: N }
    } catch (error) {
      throw error;
    }
  },

  // Lấy tất cả users không phân trang cho select options
  getAllUsersAllForSelect: async (params?: { scope?: string }) => {
    try {
      const response = await api.get('/api/auth/users/allForSelect', { params: { ...(params || {}), _t: Date.now() } });
      return response.data; // array of users
    } catch (error) {
      throw error;
    }
  },

  // Bulk import users
  importUsers: async (users: any[]) => {
    try {
      const response = await api.post('/api/auth/users/import', users);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
export default UserService;