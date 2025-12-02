import api from './api';

/**
 * SalaryService - Service gọi API quản lý lương
 * Thiết kế giống web FE (frontend/src/service/salaryService.ts)
 */
class SalaryService {
  // ==================== ALLOWANCE TYPES ====================
  
  /**
   * Lấy danh sách loại phụ cấp (có phân trang)
   */
  static async listAllowanceTypes(params = { page: 1, pageSize: 10 }) {
    try {
      const response = await api.get('/salary/allowance-types', { params });
      return response.data;
    } catch (error) {
      console.error('Error listing allowance types:', error);
      throw error;
    }
  }

  /**
   * Lấy tất cả loại phụ cấp (không phân trang)
   */
  static async getAllAllowanceTypes() {
    try {
      const response = await api.get('/salary/allowance-types/all');
      return response.data;
    } catch (error) {
      console.error('Error getting all allowance types:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết 1 loại phụ cấp
   */
  static async getAllowanceType(id) {
    try {
      const response = await api.get(`/salary/allowance-types/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting allowance type:', error);
      throw error;
    }
  }

  /**
   * Tạo loại phụ cấp mới
   */
  static async createAllowanceType(payload) {
    try {
      const response = await api.post('/salary/allowance-types', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating allowance type:', error);
      throw error;
    }
  }

  /**
   * Cập nhật loại phụ cấp
   */
  static async updateAllowanceType(id, payload) {
    try {
      const response = await api.put(`/salary/allowance-types/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error('Error updating allowance type:', error);
      throw error;
    }
  }

  /**
   * Xóa loại phụ cấp
   */
  static async removeAllowanceType(id) {
    try {
      const response = await api.delete(`/salary/allowance-types/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error removing allowance type:', error);
      throw error;
    }
  }

  // ==================== PAYSLIPS ====================

  /**
   * Lấy danh sách bảng lương theo tháng
   */
  static async listPayslips(month) {
    try {
      const response = await api.get('/salary/payslips', { params: { month } });
      return {
        success: response.data?.success ?? true,
        data: response.data?.data ?? response.data ?? [],
        message: response.data?.message
      };
    } catch (error) {
      console.error('Error listing payslips:', error);
      return { success: false, data: [], message: error?.response?.data?.message || error.message };
    }
  }

  /**
   * Lấy bảng lương của user hiện tại (me)
   */
  static async getMyPayslips(params = {}) {
    try {
      const qs = {};
      if (params.month) qs.month = params.month;
      if (params.year) qs.year = params.year;
      
      const response = await api.get('/salary/payslips/me', { params: qs });
      return {
        success: response.data?.success ?? true,
        data: response.data?.data ?? [],
        message: response.data?.message
      };
    } catch (error) {
      console.error('Error getting my payslips:', error);
      return { success: false, data: [], message: error?.response?.data?.message || error.message };
    }
  }

  /**
   * Lấy bảng lương theo user ID
   */
  static async getPayslipsByUser(userId, params = {}) {
    try {
      const qs = {};
      if (params.month) qs.month = params.month;
      if (params.year) qs.year = params.year;
      
      const response = await api.get(`/salary/users/${userId}/payslips`, { params: qs });
      return {
        success: response.data?.success ?? true,
        data: response.data?.data ?? [],
        message: response.data?.message
      };
    } catch (error) {
      console.error('Error getting payslips by user:', error);
      return { success: false, data: [], message: error?.response?.data?.message || error.message };
    }
  }

  /**
   * Lấy chi tiết 1 bảng lương
   */
  static async getPayslipById(id) {
    try {
      const response = await api.get(`/salary/payslips/${id}`);
      return {
        success: response.data?.success ?? true,
        data: response.data?.data ?? null,
        message: response.data?.message
      };
    } catch (error) {
      console.error('Error getting payslip by id:', error);
      return { success: false, data: null, message: error?.response?.data?.message || error.message };
    }
  }

  /**
   * Tính bảng lương từ dữ liệu chấm công
   */
  static async calculateFromAttendance(month) {
    try {
      const response = await api.post('/salary/payslips/calculate-from-attendance', { month });
      return {
        success: response.data?.success ?? true,
        data: response.data?.data ?? response.data ?? null,
        message: response.data?.message,
        usersWithoutContracts: response.data?.usersWithoutContracts || [],
        usersWithoutApprovedAttendance: response.data?.usersWithoutApprovedAttendance || [],
        usersWithoutSalaryProfile: response.data?.usersWithoutSalaryProfile || []
      };
    } catch (error) {
      console.error('Error calculating payslips:', error);
      return {
        success: false,
        data: null,
        message: error?.response?.data?.message || error.message,
        usersWithoutContracts: error?.response?.data?.usersWithoutContracts || [],
        usersWithoutApprovedAttendance: error?.response?.data?.usersWithoutApprovedAttendance || [],
        usersWithoutSalaryProfile: error?.response?.data?.usersWithoutSalaryProfile || []
      };
    }
  }

  // ==================== SALARY PROFILE ====================

  /**
   * Lấy salary profile của user
   */
  static async getEmployeeSalaryProfile(userId) {
    try {
      const response = await api.get(`/salary/users/${userId}/salary`);
      return response.data;
    } catch (error) {
      console.error('Error getting salary profile:', error);
      throw error;
    }
  }

  /**
   * Cập nhật salary profile của user
   */
  static async upsertEmployeeSalaryProfile(userId, payload) {
    try {
      const response = await api.put(`/salary/users/${userId}/salary`, payload);
      return response.data;
    } catch (error) {
      console.error('Error upserting salary profile:', error);
      throw error;
    }
  }

  // ==================== HELPERS ====================

  /**
   * Format số tiền VND
   */
  static formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0';
    const number = parseFloat(amount.toString());
    if (isNaN(number)) return '0';
    return new Intl.NumberFormat('vi-VN').format(Math.round(number));
  }

  /**
   * Format ngày tháng
   */
  static formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default SalaryService;
