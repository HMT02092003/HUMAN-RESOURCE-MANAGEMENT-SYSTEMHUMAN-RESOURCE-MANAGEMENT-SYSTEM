/**
 * API Configuration and Base URL
 */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  TIMEOUT: 10000,
  
  ENDPOINTS: {
    AUTH: '/api/auth',
    USERS: '/api/users',
    ROLES: '/api/roles',
    DEPARTMENTS: '/api/departments',
    CHEVRONS: '/api/chevrons',
    CONTRACTS: '/api/contracts',
    ATTENDANCE: '/api/attendance',
    SETTINGS: '/api/settings',
  }
} as const;

/**
 * Application Constants
 */
export const APP_CONFIG = {
  NAME: 'HRMS - Human Resource Management System',
  VERSION: '2.0.0',
  DESCRIPTION: 'Modern HR Management System with microservices architecture',
} as const;

/**
 * UI Constants
 */
export const UI_CONFIG = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  
  BREAKPOINTS: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200,
  },
  
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  }
} as const;
