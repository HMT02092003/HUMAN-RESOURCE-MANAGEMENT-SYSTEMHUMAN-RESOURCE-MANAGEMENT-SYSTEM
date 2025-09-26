import api from './apiService';

// Base application interface
export interface BaseApplication {
  id?: number;
  employeeId?: number;
  applicationType: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  applicationDate: string;
  approvedBy?: number;
  approvedDate?: string;
  rejectedReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Specific application types
export interface LeaveApplication extends BaseApplication {
  applicationType: 'leave';
  startDate: string;
  endDate: string;
  leaveType: 'sick' | 'personal' | 'vacation' | 'maternity' | 'emergency';
  reason: string; // Lý do nghỉ
}

export interface ShiftRegistrationApplication extends BaseApplication {
  applicationType: 'shift_registration';
  requestedDates: string[]; // Nhiều ngày đăng ký ca
  shiftType: 'morning' | 'afternoon' | 'night';
  reason: string; // Lý do đăng ký ca
}

export interface ForgotCheckInApplication extends BaseApplication {
  applicationType: 'forgot_checkin';
  forgotDate: string; // Hôm nào quên check
  forgotTime: string; // Quên check lúc mấy giờ
  reason: string; // Lý do quên check
}

export interface OvertimeApplication extends BaseApplication {
  applicationType: 'overtime';
  overtimeDate: string; // Hôm nào tăng ca
  overtimeHours: 2 | 4 | 6; // Chọn 2/4/6 giờ
  reason: string; // Lý do tăng ca
  startTime: string; // Giờ bắt đầu tăng ca
}

export interface BusinessTripApplication extends BaseApplication {
  applicationType: 'business_trip';
  startDate: string; // Từ hôm nào
  endDate: string; // Tới hôm nào
  destination: string; // Đi đâu
  purpose: string; // Lý do công tác
  evidenceImages?: string[]; // Ảnh chứng minh (nếu có)
}

export interface ResignationApplication extends BaseApplication {
  applicationType: 'resignation';
  lastWorkingDate: string; // Nghỉ từ hôm nào
  resignationReason: string; // Lý do thôi việc
  handoverTo: string; // Bàn giao công việc với ai
  handoverNotes?: string; // Ghi chú bàn giao
  handoverCompleted: boolean; // Đã bàn giao xong chưa
}

export type ApplicationTypes = 
  | LeaveApplication 
  | ShiftRegistrationApplication 
  | ForgotCheckInApplication
  | OvertimeApplication 
  | BusinessTripApplication 
  | ResignationApplication;

// API Service
class ApplicationService {
  private endpoint = '/applications';

  // Get all applications with filters
  async getApplications(params?: {
    page?: number;
    limit?: number;
    applicationType?: string;
    status?: string;
    employeeId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const response = await api.get(this.endpoint, { params });
    return response.data;
  }

  // Get application by ID
  async getApplicationById(id: number) {
    const response = await api.get(`${this.endpoint}/${id}`);
    return response.data;
  }

  // Create new application
  async createApplication(applicationData: Partial<ApplicationTypes>) {
    const response = await api.post(this.endpoint, applicationData);
    return response.data;
  }

  // Update application
  async updateApplication(id: number, applicationData: Partial<ApplicationTypes>) {
    const response = await api.put(`${this.endpoint}/${id}`, applicationData);
    return response.data;
  }

  // Delete application
  async deleteApplication(id: number) {
    const response = await api.delete(`${this.endpoint}/${id}`);
    return response.data;
  }

  // Approve application
  async approveApplication(id: number, approvalData: {
    approvedBy: number;
    approvalNotes?: string;
  }) {
    const response = await api.post(`${this.endpoint}/${id}/approve`, approvalData);
    return response.data;
  }

  // Reject application
  async rejectApplication(id: number, rejectionData: {
    rejectedBy: number;
    rejectionReason: string;
  }) {
    const response = await api.post(`${this.endpoint}/${id}/reject`, rejectionData);
    return response.data;
  }

  // Get application statistics
  async getApplicationStatistics(params?: {
    employeeId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.get(`${this.endpoint}/statistics`, { params });
    return response.data;
  }

  // Upload attachments for application
  async uploadAttachment(applicationId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('applicationId', applicationId.toString());
    
    const response = await api.post(`${this.endpoint}/${applicationId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Get my applications (for current user)
  async getMyApplications(params?: {
    page?: number;
    limit?: number;
    applicationType?: string;
    status?: string;
  }) {
    const response = await api.get(`${this.endpoint}/my-applications`, { params });
    return response.data;
  }
}

export const applicationService = new ApplicationService();
export default applicationService;
