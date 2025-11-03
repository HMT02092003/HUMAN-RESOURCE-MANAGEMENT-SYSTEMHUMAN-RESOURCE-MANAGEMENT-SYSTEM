/**
 * API routes for Auth Service v2.0 - Optimized and TypeScript compliant
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  loginHandler,
  logoutHandler,
  registerHandler,
  refreshToken,
  changePassword,
  sendOTPController,
  resetPasswordController,
  authenticateToken,
} from '@/src/controller/auth-controller';
import {
  getAllRoles,
  createRole,
  getRoleDetail,
  updateRole,
  deleteMultipleRoles,
  deleteRole,
} from '@/src/controller/RoleController';
import {
  updateRolePermissions,
  getPermissionsByRoleId,
} from '@/src/controller/RolePermissionController';
import {
  getAllUsers,
  createUser,
  getUserDetail,
  updateUser,
  deleteUser,
  deleteMultipleUsers,
  createContract,
  getUsersByDepartment,
  getUsersByChevron,
  getAllUsersAll,
  getUserByUsername,
  getNumberOfDaysOff,
  checkUserScope,
  getUsersByIds,
  updateUserStatusForResignation,
} from '@/src/controller/UserController';

const router = Router();

// Enhanced multer setup with better error handling
const createUploadMiddleware = () => {
  // Ensure upload directory exists
  const uploadPath = path.resolve(process.cwd(), 'public', 'uploads', 'identificationPhoto');
  try {
    fs.mkdirSync(uploadPath, { recursive: true });
  } catch (error: any) {
    console.warn('Warning: Could not create upload directory:', error?.message || 'Unknown error');
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req: Request, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const imageOnlyFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  };

  return multer({ 
    storage, 
    fileFilter: imageOnlyFilter, 
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
  });
};

const upload = createUploadMiddleware();


// ===================================
// AUTHENTICATION ROUTES
// ===================================
const authRoutes = [
  { method: 'post', path: '/register', handler: registerHandler, auth: false },
  { method: 'post', path: '/login', handler: loginHandler, auth: false },
  { method: 'post', path: '/logout', handler: logoutHandler, auth: false },
  { method: 'post', path: '/refresh-token', handler: refreshToken, auth: false },
  { method: 'post', path: '/forgot-password', handler: sendOTPController, auth: false },
  { method: 'post', path: '/reset-password', handler: resetPasswordController, auth: false },
  { method: 'post', path: '/send-otp', handler: sendOTPController, auth: false },
  { method: 'post', path: '/change-password', handler: changePassword, auth: true },
  { method: 'get', path: '/check-auth', handler: (req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      user: (req as any).auth || null
    });
  }, auth: true },
];

// ===================================
// ROLE MANAGEMENT ROUTES
// ===================================
const roleRoutes = [
  { method: 'get', path: '/roles', handler: getAllRoles, auth: true },
  { method: 'post', path: '/createRole', handler: createRole, auth: true },
  { method: 'get', path: '/roles/:id', handler: getRoleDetail, auth: true },
  { method: 'put', path: '/roles', handler: updateRole, auth: true },
  { method: 'delete', path: '/deleteMultipleRoles', handler: deleteMultipleRoles, auth: true },
  { method: 'delete', path: '/deleteRole', handler: deleteRole, auth: true },
  { method: 'put', path: '/rolePermission', handler: updateRolePermissions, auth: true },
  { method: 'get', path: '/rolePermission/:id', handler: getPermissionsByRoleId, auth: true },
];

// ===================================
// USER MANAGEMENT ROUTES
// ===================================
const userRoutes = [
  { method: 'get', path: '/users', handler: getAllUsers, auth: true },
  { method: 'get', path: '/users/all', handler: getAllUsersAll, auth: true },
  { method: 'get', path: '/users/by-department', handler: getUsersByDepartment, auth: true },
  { method: 'get', path: '/users/by-chevron', handler: getUsersByChevron, auth: true },
  { method: 'post', path: '/users/bulk', handler: getUsersByIds, auth: false }, // Internal bulk fetch
  { method: 'get', path: '/users/username/:username', handler: getUserByUsername, auth: false }, // AI service
  { method: 'get', path: '/users/by-username/:username', handler: getUserByUsername, auth: true },
  { method: 'delete', path: '/users/multiple', handler: deleteMultipleUsers, auth: true },
  { method: 'post', path: '/users/:id/contract', handler: createContract, auth: true },
  { method: 'get', path: '/users/detail/:id', handler: getUserDetail, auth: true },
  { method: 'get', path: '/users/:id', handler: getUserDetail, auth: true },
  { method: 'delete', path: '/users/:id', handler: deleteUser, auth: true },
  // Salary endpoints removed (salary/allowance/vacationDay were dropped from DB)
  { method: 'get', path: '/users/:id/number-of-days-off', handler: getNumberOfDaysOff, auth: false }, // Internal
  { method: 'post', path: '/users/check-scope', handler: checkUserScope, auth: true }, // Internal scope check
  // { method: 'post', path: '/users/update-status-resignation', handler: updateUserStatusForResignation, auth: false }, // Internal resignation status update
];

// Routes with file upload
const uploadRoutes = [
  { 
    method: 'post', 
    path: '/users', 
    handler: (req: Request, res: Response) => {
      if ((req as any).file) {
        req.body.identificationPhoto = `/uploads/identificationPhoto/${(req as any).file.filename}`;
      }
      createUser(req, res);
    }, 
    auth: true,
    upload: true 
  },
  { 
    method: 'put', 
    path: '/users/:id', 
    handler: (req: Request, res: Response) => {
      if ((req as any).file) {
        req.body.identificationPhoto = `/uploads/identificationPhoto/${(req as any).file.filename}`;
      }
      updateUser(req, res);
    }, 
    auth: true,
    upload: true 
  },
];

// ===================================
// REGISTER ROUTES DYNAMICALLY
// ===================================
const registerRoutes = (routes: any[]) => {
  routes.forEach(route => {
    const middlewares: any[] = [];
    
    // Add authentication middleware if required
    if (route.auth) {
      middlewares.push(authenticateToken);
    }
    
    // Add upload middleware if required
    if (route.upload) {
      middlewares.push(upload.single('identificationPhoto'));
    }
    
    // Add handler
    middlewares.push((req: Request, res: Response) => {
      console.log(`[${route.method.toUpperCase()}] ${route.path}`);
      route.handler(req, res);
    });
    
    // Register route
    (router as any)[route.method](route.path, ...middlewares);
  });
};

// Register all routes
registerRoutes(authRoutes);
registerRoutes(roleRoutes);
registerRoutes(userRoutes);
registerRoutes(uploadRoutes);

export default router;
