/**
 * Common TypeScript type definitions
 */

// API Response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  timestamp: string;
}

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roleId: string;
  departmentId?: string;
  chevronId?: string;
  identificationPhoto?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Role types
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

// Department types
export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

// Chevron types
export interface Chevron {
  id: string;
  name: string;
  coefficient: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Attendance types
export interface Attendance {
  id: string;
  userId: string;
  checkIn?: string;
  checkOut?: string;
  workDate: string;
  status: 'present' | 'absent' | 'late' | 'early_leave';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// Form types
export interface LoginForm {
  username: string;
  password: string;
  remember?: boolean;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

// Table types
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: boolean;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface PaginationProps {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => string;
}
