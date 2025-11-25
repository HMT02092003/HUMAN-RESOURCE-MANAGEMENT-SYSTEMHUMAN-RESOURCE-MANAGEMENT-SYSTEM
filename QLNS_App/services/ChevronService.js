import apiService from './apiService';

class ChevronService {
  // Lấy tất cả chevrons/positions (không phân trang) cho dropdown
  static async getAllChevrons() {
    try {
      console.log('👔 [ChevronService] Fetching all chevrons');
      // ✅ BỎ /api vì base URL đã có /api rồi
      const response = await apiService.get('/employee/getAllChevrons');
      console.log('✅ [ChevronService] Got chevrons:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ [ChevronService] Error:', error);
      throw error;
    }
  }
}

export default ChevronService;
