// Application constants - moved from ApplicationModel.js
export const ApplicationType = {
  BUSINESS_TRIP: 'business-trip',
  LEAVE: 'leave',
  OVERTIME: 'overtime',
  FORGOT_CHECK: 'forgot-check',
  SICK_LEAVE: 'sick-leave',
  SHIFT_REGISTRATION: 'shift-registration',
  RESIGNATION: 'resignation'
};

export const ApplicationStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2
};

export const APPLICATION_TYPE_LABELS = {
  [ApplicationType.BUSINESS_TRIP]: 'Đơn công tác',
  [ApplicationType.LEAVE]: 'Đơn nghỉ phép',
  [ApplicationType.OVERTIME]: 'Đơn làm thêm',
  [ApplicationType.REMOTE_WORK]: 'Đơn làm việc từ xa',
  [ApplicationType.SICK_LEAVE]: 'Đơn nghỉ ốm',
  [ApplicationType.SHIFT_REGISTRATION]: 'Đăng ký ca làm việc'
};

export const APPLICATION_STATUS_LABELS = {
  [ApplicationStatus.PENDING]: 'Chờ duyệt',
  [ApplicationStatus.APPROVED]: 'Đã duyệt',
  [ApplicationStatus.REJECTED]: 'Từ chối'
};

export const VALIDATION_RULES = {
  REASON_MAX_LENGTH: 500,
  NOTE_MAX_LENGTH: 200,
  REJECTION_REASON_MAX_LENGTH: 300,
  MIN_DAYS_ADVANCE: 1,
};

export const SHIFT_OPTIONS = [
  { value: 'morning', label: '🌅 Ca sáng (6:00 - 14:00)' },
  { value: 'afternoon', label: '🌇 Ca chiều (14:00 - 22:00)' },
  { value: 'night', label: '🌙 Ca đêm (22:00 - 6:00)' },
  { value: 'overtime', label: '⏰ Ca tăng ca' },
];
