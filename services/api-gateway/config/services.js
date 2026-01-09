/**
 * Service configuration and routing
 */

// Hàm để lấy service URLs từ environment variables (runtime)
const getServices = () => ({
  auth: process.env.AUTH_SERVICE_URL,
  salary: process.env.SALARY_SERVICE_URL,
  employee: process.env.EMPLOYEE_SERVICE_URL,
  job: process.env.JOB_SERVICE_URL,
  attendance: process.env.ATTENDANCE_SERVICE_URL,
  application: process.env.APPLICATION_SERVICE_URL,
  ai: process.env.AI_FACE_RECOGNITION_SERVICE_URL,
  notification: process.env.NOTIFICATION_SERVICE_URL,
});

// Route configuration - định nghĩa các route và service tương ứng
const ROUTE_CONFIG = [
  {
    path: '/health',
    target: 'auth',
    pathRewrite: false
  },
  {
    path: '/api/refresh-token',
    target: 'auth',
    pathRewrite: { '^/api/refresh-token': '/api/refresh-token' }
  },
  // Job service - CV upload and job CRUD
  {
    path: '/jobs',
    target: 'job',
    pathRewrite: { '^/jobs': '/api' },
    handleMultipart: true
  },
  {
    path: '/api/auth',
    target: 'auth',
    pathRewrite: { '^/api/auth': '/api' }
  },
  {
    path: '/api/employee',
    target: 'employee',
    pathRewrite: { '^/api/employee': '/api' }
  },
  {
    path: '/api/attendance',
    target: 'attendance',
    pathRewrite: { '^/api/attendance': '/api' }
  },
  {
    path: '/api/shifts',
    target: 'attendance',
    pathRewrite: { '^/api/shifts': '/api/shifts' }
  },
  {
    path: '/api/schedules',
    target: 'attendance',
    pathRewrite: { '^/api/schedules': '/api/schedules' }
  },
  {
    path: '/api/salary',
    target: 'salary',
    pathRewrite: { '^/api/salary': '/api' },
  },
  {
    path: '/api/applications',
    target: 'application',
    pathRewrite: { '^/api/applications': '/api/applications' },
    handleMultipart: true  // Enable multipart handling cho file upload
  },
  {
    path: '/api/settings',
    target: 'attendance',
    pathRewrite: { '^/api/settings': '/api/settings' }
  },
  {
    path: '/api/user',
    target: 'attendance',
    pathRewrite: { '^/api/user': '/api/user' }
  },
  {
    path: '/api/ai',
    target: 'ai',
    pathRewrite: { '^/api/ai': '/api' },  // Rewrite: /api/ai/v1/... -> /api/v1/...
    handleMultipart: true
  },
  // Notification service - Realtime + Push
  {
    path: '/api/notifications',
    target: 'notification',
    pathRewrite: { '^/api/notifications': '/api' },
    ws: true  // Enable WebSocket support for Socket.io
  },
  {
    path: '/applications',
    target: 'application',
    pathRewrite: false
  },
  {
    path: '/uploads',
    target: 'auth',
    pathRewrite: false
  }
];

export { getServices, ROUTE_CONFIG };
