import api from './apiService';

const UserService = {
  // Lấy danh sách users với pagination
  getAllUsers: async (params: { page: number; pageSize: number }) => {
    try {
      const response = await api.get('/api/auth/users', { 
        params: {
          page: params.page,
          pageSize: params.pageSize
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
  }
};

export default UserService; 