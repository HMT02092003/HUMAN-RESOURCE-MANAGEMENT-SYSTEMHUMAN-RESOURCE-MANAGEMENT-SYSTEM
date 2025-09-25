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
  totalDays: number;
  attachments?: string[];
}

export interface ShiftRegistrationApplication extends BaseApplication {
  applicationType: 'shift_registration';
  shiftId: number;
  requestedDate: string;
  preferredShift: string;
}

export interface CheckoutApplication extends BaseApplication {
  applicationType: 'checkout';
  checkoutDate: string;
  checkoutTime: string;
  earlyCheckoutReason: string;
  plannedReturnTime?: string;
}

export interface ShiftChangeApplication extends BaseApplication {
  applicationType: 'shift_change';
  currentShiftId: number;
  requestedShiftId: number;
  changeDate: string;
  exchangeWithEmployee?: number;
}

export interface IncreasedWorkingHoursApplication extends BaseApplication {
  applicationType: 'increased_hours';
  effectiveDate: string;
  currentWorkingHours: number;
  requestedWorkingHours: number;
  duration: number; // in months
}

export interface BusinessTripApplication extends BaseApplication {
  applicationType: 'business_trip';
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  estimatedCost?: number;
  transportationMode: 'flight' | 'car' | 'train' | 'other';
  accommodationNeeded: boolean;
}

export interface ResignationApplication extends BaseApplication {
  applicationType: 'resignation';
  lastWorkingDate: string;
  resignationReason: string;
  noticePeriod: number; // in days
  handoverNotes?: string;
  exitInterviewScheduled?: boolean;
}

export type ApplicationTypes = 
  | LeaveApplication 
  | ShiftRegistrationApplication 
  | CheckoutApplication 
  | ShiftChangeApplication 
  | IncreasedWorkingHoursApplication 
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
