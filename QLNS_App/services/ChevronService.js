import apiService from './apiService';

class ChevronService {
  // Lấy tất cả chevrons/positions (không phân trang) cho dropdown
  static async getAllChevrons() {
    try {
      console.log('👔 [ChevronService] Fetching all chevrons');
      const response = await apiService.get('/employee/chevrons/all');
      console.log('✅ [ChevronService] Got chevrons:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ [ChevronService] Error:', error);
      throw error;
    }
  }
}

export default ChevronService;
