import api from './apiService';

class AttendanceApprovalService {

  async approveAttendance(approvalData: any): Promise<any> {
    try {
      const response = await api.post('/api/attendance/approve', approvalData);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể duyệt chấm công');
      }
    } catch (error: any) {
      console.error('Error approving attendance:', error);
      throw new Error(error.response?.data?.message || 'Lỗi khi duyệt chấm công');
    }
  }
}

export default new AttendanceApprovalService();
