import { get } from 'lodash';
import api from './apiService';


// Base interface cho Application
export interface BaseApplication {
  id?: number;
  type: string;
  status: string;
  data: any; // JSONB: dữ liệu cụ thể cho từng loại đơn
  userId: number;
  approvedBy?: number;
  applicationDate?: string;
  approvedDate?: string;
  reason?: string;
  rejectionReason?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

// Shift Registration specific interfaces
export interface ShiftDay {
  date: string; // YYYY-MM-DD format
  shifts: string[]; // array of shift values: 'morning', 'afternoon', 'night', 'overtime'
  note?: string;
}

export interface ShiftRegistrationApplication extends BaseApplication {
  type: 'shift-registration';
  data: {
    requestedDates: ShiftDay[];
  };
}

// Request types
export interface CreateApplicationRequest {
  type: string;
  data: any;
  note?: string;
}

export interface ApproveApplicationRequest {
  note?: string;
}

export interface RejectApplicationRequest {
  rejectionReason: string;
}

const ApplicationService = {
  // Lấy danh sách applications (có filter, pagination)
  getAllApplications: async (params?: {
    page?: number;
    pageSize?: number;
  }) => {
    try {
      const response = await api.get("/api/applications", { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy chi tiết application theo ID
  getApplicationById: async (id: number) => {
    try {
      const response = await api.get(`/api/applications/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Tạo application mới
  createApplication: async (data: CreateApplicationRequest) => {
    try {
      const response = await api.post("/api/applications", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cập nhật application (chỉ khi status = PENDING)
  updateApplication: async (id: number, data: any) => {
    try {
      const response = await api.put(`/api/applications/${id}`, { id, ...data });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Xóa / Hủy application
  deleteApplication: async (id: number) => {
    try {
      const response = await api.delete(`/api/applications/${id}`, { data: { id } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Duyệt application
  approveApplication: async (id: number, approvalData: ApproveApplicationRequest) => {
    try {
      const response = await api.put(`/api/applications/${id}/approve`, approvalData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Từ chối application
  rejectApplication: async (id: number, rejectionData: RejectApplicationRequest) => {
    try {
      const response = await api.put(`/api/applications/${id}/reject`, rejectionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy applications của user hiện tại
  getMyApplications: async (params?: { 
    page?: number; 
    pageSize?: number; 
  }) => {
    try {
      const response = await api.get("/api/applications/my-applications", { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy applications pending (cho manager)
  getPendingApplications: async (params?: { 
    page?: number; 
    pageSize?: number; 
    type?: string; 
  }) => {
    try {
      const response = await api.get("/api/applications/pending", { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Tạo đơn đăng ký ca làm việc
  createShiftRegistration: async (data: {
    requestedDates: ShiftDay[];
    reason?: string;
    note?: string;
  }) => {
    try {
      const payload: CreateApplicationRequest = {
        type: 'shift-registration',
        data: {
          requestedDates: data.requestedDates
        },
        note: data.note || data.reason
      };
      
      const response = await api.post("/api/applications", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default ApplicationService;

// Re-export types và enums từ constants
export { APPLICATION_TYPE_LABELS, APPLICATION_STATUS_LABELS } from '@/config/constant';
