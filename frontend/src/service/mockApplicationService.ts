import api from './apiService';
import { ApplicationTypes } from './applicationService';

// Mock data for testing
const mockApplications: any[] = [
  {
    id: 1,
    employeeId: 1001,
    applicationType: 'leave',
    status: 'pending',
    reason: 'Nghỉ phép thăm gia đình tại quê nhà',
    applicationDate: '2024-01-15',
    startDate: '2024-01-20',
    endDate: '2024-01-22',
    leaveType: 'vacation',
    totalDays: 3,
    attachments: ['medical_certificate.pdf'],
    createdAt: '2024-01-15T08:30:00Z',
    updatedAt: '2024-01-15T08:30:00Z'
  } as any,
  {
    id: 2,
    employeeId: 1002,
    applicationType: 'shift_registration',
    status: 'approved',
    reason: 'Đăng ký ca sáng để có thời gian học thêm buổi chiều',
    applicationDate: '2024-01-14',
    shiftId: 1,
    requestedDate: '2024-01-18',
    preferredShift: 'Ca sáng (7:00-15:00)',
    approvedBy: 2001,
    approvedDate: '2024-01-15',
    createdAt: '2024-01-14T10:15:00Z',
    updatedAt: '2024-01-15T14:20:00Z'
  } as any,
  {
    id: 3,
    employeeId: 1003,
    applicationType: 'checkout',
    status: 'rejected',
    reason: 'Có việc cấp bách cần về sớm để đón con từ trường',
    applicationDate: '2024-01-13',
    checkoutDate: '2024-01-16',
    checkoutTime: '15:30',
    earlyCheckoutReason: 'Đón con từ trường',
    plannedReturnTime: '08:00',
    rejectedReason: 'Công việc chưa hoàn thành',
    createdAt: '2024-01-13T09:45:00Z',
    updatedAt: '2024-01-16T16:00:00Z'
  } as any,
  {
    id: 4,
    employeeId: 1001,
    applicationType: 'shift_change',
    status: 'pending',
    reason: 'Muốn đổi từ ca chiều sang ca sáng để phù hợp với lịch học',
    applicationDate: '2024-01-12',
    currentShiftId: 2,
    requestedShiftId: 1,
    changeDate: '2024-01-19',
    exchangeWithEmployee: 1004,
    createdAt: '2024-01-12T11:30:00Z',
    updatedAt: '2024-01-12T11:30:00Z'
  } as any,
  {
    id: 5,
    employeeId: 1005,
    applicationType: 'increased_hours',
    status: 'approved',
    reason: 'Muốn tăng thêm giờ làm để có thêm thu nhập',
    applicationDate: '2024-01-11',
    effectiveDate: '2024-02-01',
    currentWorkingHours: 8,
    requestedWorkingHours: 10,
    duration: 6,
    approvedBy: 2001,
    approvedDate: '2024-01-12',
    createdAt: '2024-01-11T14:20:00Z',
    updatedAt: '2024-01-12T09:15:00Z'
  } as any,
  {
    id: 6,
    employeeId: 1002,
    applicationType: 'business_trip',
    status: 'pending',
    reason: 'Tham gia hội thảo công nghệ và gặp gỡ đối tác tại TP.HCM',
    applicationDate: '2024-01-10',
    destination: 'TP. Hồ Chí Minh',
    startDate: '2024-01-25',
    endDate: '2024-01-27',
    purpose: 'Tham gia hội thảo công nghệ AI và blockchain, gặp gỡ đối tác phát triển sản phẩm mới',
    estimatedCost: 5000000,
    transportationMode: 'flight',
    accommodationNeeded: true,
    createdAt: '2024-01-10T16:45:00Z',
    updatedAt: '2024-01-10T16:45:00Z'
  } as any,
  {
    id: 7,
    employeeId: 1006,
    applicationType: 'resignation',
    status: 'pending',
    reason: 'Chuyển sang môi trường làm việc mới phù hợp hơn với định hướng phát triển',
    applicationDate: '2024-01-09',
    lastWorkingDate: '2024-02-29',
    resignationReason: 'Tìm được cơ hội phát triển tốt hơn tại công ty khác, phù hợp với chuyên môn và mong muốn cá nhân',
    noticePeriod: 45,
    handoverNotes: 'Sẽ bàn giao toàn bộ dự án đang thực hiện và tài liệu liên quan cho đồng nghiệp',
    exitInterviewScheduled: false,
    createdAt: '2024-01-09T13:30:00Z',
    updatedAt: '2024-01-09T13:30:00Z'
  } as any,
  {
    id: 8,
    employeeId: 1003,
    applicationType: 'leave',
    status: 'approved',
    reason: 'Nghỉ ốm do bị cảm cúm, cần thời gian nghỉ ngơi và điều trị',
    applicationDate: '2024-01-08',
    startDate: '2024-01-10',
    endDate: '2024-01-12',
    leaveType: 'sick',
    totalDays: 3,
    attachments: ['doctor_note.pdf', 'prescription.jpg'],
    approvedBy: 2002,
    approvedDate: '2024-01-08',
    createdAt: '2024-01-08T07:45:00Z',
    updatedAt: '2024-01-08T15:20:00Z'
  } as any,
  {
    id: 9,
    employeeId: 1007,
    applicationType: 'shift_registration',
    status: 'pending',
    reason: 'Đăng ký ca đêm để được phụ cấp cao hơn',
    applicationDate: '2024-01-07',
    shiftId: 3,
    requestedDate: '2024-01-21',
    preferredShift: 'Ca đêm (22:00-06:00)',
    createdAt: '2024-01-07T12:00:00Z',
    updatedAt: '2024-01-07T12:00:00Z'
  } as any,
  {
    id: 10,
    employeeId: 1004,
    applicationType: 'checkout',
    status: 'approved',
    reason: 'Có cuộc hẹn quan trọng với bác sĩ không thể dời được',
    applicationDate: '2024-01-06',
    checkoutDate: '2024-01-08',
    checkoutTime: '14:00',
    earlyCheckoutReason: 'Khám bệnh định kỳ',
    plannedReturnTime: '07:30',
    approvedBy: 2001,
    approvedDate: '2024-01-06',
    createdAt: '2024-01-06T10:30:00Z',
    updatedAt: '2024-01-06T17:45:00Z'
  } as any
];

// Mock employee data
const mockEmployees = [
  { id: 1001, name: 'Nguyễn Văn An', department: 'IT', position: 'Developer' },
  { id: 1002, name: 'Trần Thị Bình', department: 'Marketing', position: 'Marketing Executive' },
  { id: 1003, name: 'Lê Văn Cường', department: 'HR', position: 'HR Specialist' },
  { id: 1004, name: 'Phạm Thị Dung', department: 'Finance', position: 'Accountant' },
  { id: 1005, name: 'Hoàng Văn Em', department: 'IT', position: 'Senior Developer' },
  { id: 1006, name: 'Võ Thị Phương', department: 'Sales', position: 'Sales Manager' },
  { id: 1007, name: 'Đặng Văn Giang', department: 'Operations', position: 'Operations Coordinator' }
];

// Mock service class
class MockApplicationService {
  // Simulate API delay
  private delay(ms: number = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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
    await this.delay();
    
    let filteredApplications = [...mockApplications];
    
    // Apply filters
    if (params?.applicationType) {
      filteredApplications = filteredApplications.filter(app => app.applicationType === params.applicationType);
    }
    
    if (params?.status) {
      filteredApplications = filteredApplications.filter(app => app.status === params.status);
    }
    
    if (params?.employeeId) {
      filteredApplications = filteredApplications.filter(app => app.employeeId === params.employeeId);
    }
    
    if (params?.search) {
      const search = params.search.toLowerCase();
      filteredApplications = filteredApplications.filter(app => 
        app.reason.toLowerCase().includes(search) ||
        app.applicationType.toLowerCase().includes(search)
      );
    }

    // Pagination
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedData = filteredApplications.slice(startIndex, endIndex);
    
    // Add employee names to the data
    const enrichedData = paginatedData.map(app => {
      const employee = mockEmployees.find(emp => emp.id === app.employeeId);
      return {
        ...app,
        employeeName: employee?.name || `NV${app.employeeId}`,
        employeeDepartment: employee?.department || 'Unknown',
        employeePosition: employee?.position || 'Unknown'
      };
    });

    return {
      data: enrichedData,
      total: filteredApplications.length,
      page,
      limit,
      totalPages: Math.ceil(filteredApplications.length / limit)
    };
  }

  // Get application by ID
  async getApplicationById(id: number) {
    await this.delay();
    
    const application = mockApplications.find(app => app.id === id);
    if (!application) {
      throw new Error('Không tìm thấy đơn từ');
    }
    
    const employee = mockEmployees.find(emp => emp.id === application.employeeId);
    
    return {
      ...application,
      employeeName: employee?.name || `NV${application.employeeId}`,
      employeeDepartment: employee?.department || 'Unknown',
      employeePosition: employee?.position || 'Unknown'
    };
  }

  // Create new application
  async createApplication(applicationData: Partial<ApplicationTypes>) {
    await this.delay();
    
    const newApplication = {
      ...applicationData,
      id: Math.max(...mockApplications.map(app => app.id!)) + 1,
      employeeId: applicationData.employeeId || 1001, // Default employee
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockApplications.unshift(newApplication as ApplicationTypes);
    
    return newApplication;
  }

  // Update application
  async updateApplication(id: number, applicationData: Partial<ApplicationTypes>) {
    await this.delay();
    
    const index = mockApplications.findIndex(app => app.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy đơn từ');
    }
    
    mockApplications[index] = {
      ...mockApplications[index],
      ...applicationData,
      updatedAt: new Date().toISOString()
    };
    
    return mockApplications[index];
  }

  // Delete application
  async deleteApplication(id: number) {
    await this.delay();
    
    const index = mockApplications.findIndex(app => app.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy đơn từ');
    }
    
    mockApplications.splice(index, 1);
    
    return { message: 'Xóa đơn từ thành công' };
  }

  // Approve application
  async approveApplication(id: number, approvalData: {
    approvedBy: number;
    approvalNotes?: string;
  }) {
    await this.delay();
    
    const index = mockApplications.findIndex(app => app.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy đơn từ');
    }
    
    mockApplications[index] = {
      ...mockApplications[index],
      status: 'approved',
      approvedBy: approvalData.approvedBy,
      approvedDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };
    
    return mockApplications[index];
  }

  // Reject application
  async rejectApplication(id: number, rejectionData: {
    rejectedBy: number;
    rejectionReason: string;
  }) {
    await this.delay();
    
    const index = mockApplications.findIndex(app => app.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy đơn từ');
    }
    
    mockApplications[index] = {
      ...mockApplications[index],
      status: 'rejected',
      rejectedReason: rejectionData.rejectionReason,
      updatedAt: new Date().toISOString()
    };
    
    return mockApplications[index];
  }

  // Get application statistics
  async getApplicationStatistics(params?: {
    employeeId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    await this.delay();
    
    let filteredApplications = [...mockApplications];
    
    if (params?.employeeId) {
      filteredApplications = filteredApplications.filter(app => app.employeeId === params.employeeId);
    }
    
    const stats = {
      total: filteredApplications.length,
      pending: filteredApplications.filter(app => app.status === 'pending').length,
      approved: filteredApplications.filter(app => app.status === 'approved').length,
      rejected: filteredApplications.filter(app => app.status === 'rejected').length,
      byType: {
        leave: filteredApplications.filter(app => app.applicationType === 'leave').length,
        shift_registration: filteredApplications.filter(app => app.applicationType === 'shift_registration').length,
        checkout: filteredApplications.filter(app => app.applicationType === 'checkout').length,
        shift_change: filteredApplications.filter(app => app.applicationType === 'shift_change').length,
        increased_hours: filteredApplications.filter(app => app.applicationType === 'increased_hours').length,
        business_trip: filteredApplications.filter(app => app.applicationType === 'business_trip').length,
        resignation: filteredApplications.filter(app => app.applicationType === 'resignation').length,
      }
    };
    
    return stats;
  }

  // Upload attachments for application
  async uploadAttachment(applicationId: number, file: File) {
    await this.delay();
    
    // Mock file upload
    const fileName = `${Date.now()}_${file.name}`;
    
    return {
      fileName,
      url: `/uploads/${fileName}`,
      size: file.size,
      type: file.type
    };
  }

  // Get my applications (for current user)
  async getMyApplications(params?: {
    page?: number;
    limit?: number;
    applicationType?: string;
    status?: string;
  }) {
    // For demo purposes, assume current user is employee 1001
    const currentUserId = 1001;
    
    return this.getApplications({
      ...params,
      employeeId: currentUserId
    });
  }
}

export const mockApplicationService = new MockApplicationService();
export default mockApplicationService;
