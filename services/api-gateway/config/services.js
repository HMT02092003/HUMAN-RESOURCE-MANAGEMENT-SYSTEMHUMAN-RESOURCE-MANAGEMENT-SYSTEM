/**
 * Service configuration and routing
 */

// Hàm để lấy service URLs từ environment variables (runtime)
const getServices = () => ({
  auth: process.env.AUTH_SERVICE_URL,
  employee: process.env.EMPLOYEE_SERVICE_URL,
  attendance: process.env.ATTENDANCE_SERVICE_URL,
  application: process.env.APPLICATION_SERVICE_URL,
  ai: process.env.AI_FACE_RECOGNITION_SERVICE_URL,
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
    path: '/api/applications',
    target: 'application',
    pathRewrite: { '^/api/applications': '/api/applications' }
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
    pathRewrite: { '^/api/ai': '/api/face-recognition' },
    handleMultipart: true
  },
  {
    path: '/uploads',
    target: 'auth',
    pathRewrite: false
  }
];

export { getServices, ROUTE_CONFIG };
