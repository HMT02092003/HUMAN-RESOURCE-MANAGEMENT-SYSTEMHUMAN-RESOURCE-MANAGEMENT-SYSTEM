import { Tag } from 'antd';
import { ApplicationTypes } from '@/service/applicationService';

// Application Status Configuration
export const getStatusTag = (status: string) => {
  const statusConfig = {
    pending: { color: 'orange', text: 'Chờ duyệt', icon: '⏳' },
    approved: { color: 'green', text: 'Đã duyệt', icon: '✅' },
    rejected: { color: 'red', text: 'Bị từ chối', icon: '❌' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  return (
    <Tag color={config.color} className="px-3 py-1 rounded-full">
      {config.icon} {config.text}
    </Tag>
  );
};

// Application Type Configuration
export const getTypeTag = (type: string) => {
  const types = {
    leave: { color: 'blue', text: 'Đơn nghỉ', icon: '📝' },
    shift_registration: { color: 'green', text: 'Đăng ký ca', icon: '🕒' },
    forgot_checkin: { color: 'orange', text: 'Quên check', icon: '⏰' },
    overtime: { color: 'purple', text: 'Tăng ca', icon: '⏰' },
    business_trip: { color: 'cyan', text: 'Công tác', icon: '✈️' },
    resignation: { color: 'red', text: 'Thôi việc', icon: '📄' }
  };
  
  const typeInfo = types[type as keyof typeof types] || { color: 'default', text: type, icon: '📋' };
  return (
    <Tag color={typeInfo.color} className="px-3 py-1 rounded-full">
      {typeInfo.icon} {typeInfo.text}
    </Tag>
  );
};

// Application Types for Form Selection
export const applicationTypes = [
  {
    type: 'leave',
    name: 'Đơn Nghỉ Phép',
    description: 'Nghỉ phép có lương, không lương',
    icon: '📝',
    color: 'blue'
  },
  {
    type: 'shift_registration',
    name: 'Đăng Ký Ca',
    description: 'Đăng ký ca làm việc',
    icon: '🕒',
    color: 'green'
  },
  {
    type: 'forgot_checkin',
    name: 'Quên Check In/Out',
    description: 'Báo cáo quên chấm công',
    icon: '⏰',
    color: 'orange'
  },
  {
    type: 'overtime',
    name: 'Đơn Tăng Ca',
    description: 'Đăng ký làm thêm giờ',
    icon: '⏰',
    color: 'purple'
  },
  {
    type: 'business_trip',
    name: 'Đơn Công Tác',
    description: 'Công tác xa với bằng chứng',
    icon: '✈️',
    color: 'indigo'
  },
  {
    type: 'resignation',
    name: 'Đơn Thôi Việc',
    description: 'Thôi việc và bàn giao công việc',
    icon: '📄',
    color: 'red'
  }
];

// Format Application Details
export const formatApplicationDetails = (app: ApplicationTypes) => {
  switch (app.applicationType) {
    case 'leave':
      return `${app.startDate} → ${app.endDate} (${app.leaveType === 'personal' ? 'Cá nhân' : app.leaveType})`;
    case 'overtime':
      return `${app.overtimeDate} - ${app.overtimeHours}h từ ${app.startTime}`;
    case 'business_trip':
      return `${app.destination} (${app.startDate} → ${app.endDate})`;
    case 'forgot_checkin':
      return `${app.forgotDate} lúc ${app.forgotTime}`;
    case 'shift_registration':
      return `${app.requestedDates?.join(', ')} (${app.shiftType})`;
    case 'resignation':
      return `Nghỉ từ ${app.lastWorkingDate}`;
    default:
      return '';
  }
};

// Mock Data for Development
export const getMockApplications = (): ApplicationTypes[] => [
  {
    id: 1,
    applicationType: 'leave',
    status: 'pending',
    reason: 'Nghỉ phép cá nhân để về quê',
    applicationDate: '2024-12-20',
    startDate: '2024-12-25',
    endDate: '2024-12-27',
    leaveType: 'personal'
  },
  {
    id: 2,
    applicationType: 'overtime',
    status: 'approved',
    reason: 'Hoàn thành dự án deadline',
    applicationDate: '2024-12-18',
    overtimeDate: '2024-12-20',
    overtimeHours: 4,
    startTime: '18:00'
  },
  {
    id: 3,
    applicationType: 'business_trip',
    status: 'rejected',
    reason: 'Công tác gặp khách hàng VIP',
    rejectedReason: 'Chưa đủ điều kiện đi công tác',
    applicationDate: '2024-12-15',
    startDate: '2024-12-22',
    endDate: '2024-12-24',
    destination: 'Hà Nội',
    purpose: 'Gặp khách hàng VIP'
  },
  {
    id: 4,
    applicationType: 'forgot_checkin',
    status: 'approved',
    reason: 'Quên check do họp khẩn cấp với ban giám đốc',
    applicationDate: '2024-12-19',
    forgotDate: '2024-12-19',
    forgotTime: '08:30'
  }
];
