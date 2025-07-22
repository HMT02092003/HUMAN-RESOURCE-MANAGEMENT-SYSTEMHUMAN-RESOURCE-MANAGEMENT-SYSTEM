import axios from 'axios';
import api from './apiService';

const UserService = {
  getAllUsers: async (params: { page: number; pageSize: number }) => {
    try {
      const response = await api.get('/api/auth/users', { 
        params: {
          page: params.page,
          pageSize: params.pageSize
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createUser: async (data: any) => {
    try {
      const response = await api.post('/api/auth/users', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (id: number, data: any) => {
    try {
      const response = await api.put(`/api/auth/users/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteUser: async (id: number) => {
    try {
      const response = await api.delete(`/api/auth/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteMultipleUsers: async (ids: number[]) => {
    try {
      const response = await api.delete('/api/auth/users/multiple', { data: { ids } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getUserById: async (id: number) => {
    try {
      const response = await api.get(`/api/auth/users/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default UserService; 