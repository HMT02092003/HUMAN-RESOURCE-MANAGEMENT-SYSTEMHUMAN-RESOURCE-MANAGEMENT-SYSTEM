/**
 * Attendance Service API Routes v2.0 - Optimized with Dynamic Registration
 */
import { Router, Request, Response } from 'express';
import { 
  confirmAttendance,
  getUserAttendanceByMonth,
  getMonthlyStats
} from '../src/controller/AttendanceController';
import {
  getMonthlyAttendanceDetail
} from '../src/controller/MonthlyAttendanceController';
import {
  getSettings,
  updateSettings,
  getSettingsByKey,
}  from '@/controller/SettingsController';
import { updateForgotCheck } from '@/controller/ForgotCheckController';

const router = Router();

// ===================================
// ROUTE DEFINITIONS
// ===================================
const routeGroups = [
  // ATTENDANCE ROUTES
  {
    group: 'attendance',
    routes: [
      { method: 'post', path: '/confirm', handler: confirmAttendance, auth: false },
      { method: 'post', path: '/update-forgot-check', handler: updateForgotCheck, auth: false },
      { method: 'get', path: '/user/:userId/month', handler: getUserAttendanceByMonth, auth: false },
      { method: 'get', path: '/user/:userId/monthly-detail', handler: getMonthlyAttendanceDetail, auth: false },
      { method: 'get', path: '/user/:userId/stats/monthly', handler: getMonthlyStats, auth: false },
      { 
        method: 'get', 
        path: '/user/:userId/stats', 
        handler: (_req: Request, res: Response) => {
          // Basic stats endpoint - returns mock data for compatibility
          res.status(200).json({
            totalHours: 0,
            totalDays: 0,
            penalty: 0,
            onTimeRate: 100,
            note: 'Mock data for compatibility'
          });
        }, 
        auth: false 
      },
    ]
  },
  // SETTINGS ROUTES
  {
    group: 'settings',
    routes: [
      { method: 'get', path: '/settings', handler: getSettings, auth: false },
      { method: 'post', path: '/settings', handler: updateSettings, auth: false },
      { method: 'get', path: '/settings/:key', handler: getSettingsByKey, auth: false },
    ]
  }
];

// ===================================
// DYNAMIC ROUTE REGISTRATION
// ===================================
const registerRoutes = (groups: any[]) => {
  groups.forEach(({ group, routes }) => {
    routes.forEach((route: any) => {
      const middlewares: any[] = [];
      
      // Add handler with enhanced error handling
      middlewares.push(async (req: Request, res: Response) => {
        try {
          console.log(`[${route.method.toUpperCase()}] ${route.path} - ${group}`);
          await route.handler(req, res);
        } catch (error: any) {
          console.error(`Error in ${group}.${route.handler.name}:`, error);
          res.status(500).json({
            error: 'Internal server error',
            group,
            endpoint: `${route.method.toUpperCase()} ${route.path}`,
            message: error.message || 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Register route
      (router as any)[route.method](route.path, ...middlewares);
    });
  });
};

// Register all routes
registerRoutes(routeGroups);

// ===================================
// API INFO ENDPOINT
// ===================================
router.get('/', (_req: Request, res: Response) => {
  const totalRoutes = routeGroups.reduce((sum, group) => sum + group.routes.length, 0);
  
  const apiInfo = {
    service: 'Attendance Service API v2.0',
    status: 'active',
    totalRoutes,
    routeGroups: routeGroups.map(({ group, routes }) => ({
      group,
      endpoints: routes.length,
      routes: routes.map(route => ({
        method: route.method.toUpperCase(),
        path: route.path,
        auth: route.auth
      }))
    })),
    features: ['Time Tracking', 'Attendance Confirmation', 'Monthly Statistics', 'Settings Management'],
    timestamp: new Date().toISOString()
  };

  res.json(apiInfo);
});

export default router;
