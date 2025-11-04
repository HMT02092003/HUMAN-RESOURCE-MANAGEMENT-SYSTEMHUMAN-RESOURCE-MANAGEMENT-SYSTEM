import api from './apiService';

const ContractService = {
  /**
   * Tạo hợp đồng cho user (kèm thông tin lương)
   * Gọi trực tiếp tới employee-service
   * Data cần có: contractTypeId, startDate, activeDay, endDate, salary, allowance_type_ids
   */
  createContract: async (userId: number, contractData: any) => {
    try {
      const response = await api.post(`/api/employee/users/${userId}/contracts`, {
        userId,
        ...contractData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy danh sách hợp đồng của user
   */
  getContractsByUser: async (userId: number) => {
    try {
      const response = await api.get(`/api/employee/contracts/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy hợp đồng đang active của user
   */
  getActiveContract: async (userId: number) => {
    try {
      const response = await api.get(`/api/employee/contracts/user/${userId}/active`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Xóa tất cả hợp đồng của user
   */
  deleteContractsByUser: async (userId: number) => {
    try {
      const response = await api.delete(`/api/employee/contracts/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default ContractService;
