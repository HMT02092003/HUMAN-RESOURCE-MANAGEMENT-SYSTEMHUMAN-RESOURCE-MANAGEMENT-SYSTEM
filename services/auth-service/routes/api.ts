import { Router } from 'express';
import multer from 'multer';
import path from 'path';
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
  getUserByUsername,
  getSalaryInfo,
  updateSalaryInfo,
} from '@/src/controller/UserController';

const router = Router();

// Multer setup for identification photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(process.cwd(), 'public', 'uploads', 'identificationPhoto'));
  },
  filename: (req: any, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const imageOnlyFilter = (req: any, file: any, cb: any) => {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error('Chỉ chấp nhận tệp hình ảnh'));
};

const upload = multer({ storage, fileFilter: imageOnlyFilter, limits: { fileSize: 5 * 1024 * 1024 } });


// ===================================AUTHENTICATION===================================
router.post('/register', (req, res) => {
  console.log('Received data:', req.body);
  registerHandler(req, res);
});

router.post('/login', (req, res) => {
  console.log('Received data:', req.body);
  loginHandler(req, res);
})

router.post('/forgot-password', (req, res) => {
  console.log('Received data:', req.body);
  sendOTPController(req, res);
})

router.post('/reset-password', (req, res) => {
  console.log('Received data:', req.body);
  resetPasswordController(req, res);
});

router.post('/logout', (req, res) => {
  logoutHandler(req, res);
});

router.post('/refresh-token', (req, res) => {
  refreshToken(req, res);
})

router.post('/change-password', authenticateToken, (req, res) => {
  changePassword(req, res);
})

// API kiểm tra xác thực token
router.get('/check-auth', authenticateToken, (req, res) => {
  res.status(200).json({
    status: 'success',
    user: (req as any).auth || null
  });
});

router.post('/send-otp', (req, res) => {
  sendOTPController(req, res);
})

// ===================================END AUTHENTICATION===================================

// ===================================START ROLE===================================
router.get('/roles', authenticateToken, (req, res) => {
  getAllRoles(req, res);
});

router.post('/createRole', authenticateToken, (req, res) => {
  createRole(req, res);
});

router.get('/roles/:id', authenticateToken, (req, res) => {
  getRoleDetail(req, res);
});

router.put('/roles', authenticateToken, (req, res) => {
  updateRole(req, res);
});

router.delete('/deleteMultipleRoles', authenticateToken, (req, res) => {
  deleteMultipleRoles(req, res);
});

router.delete('/deleteRole', authenticateToken, (req, res) => {
  deleteRole(req, res);
});
// ===================================END ROLE===================================

// ===================================START ROLE PERMISSION===================================
router.put('/rolePermission', authenticateToken, (req, res) => {
  updateRolePermissions(req, res);
});
router.get('/rolePermission/:id', authenticateToken, (req, res) => {
  getPermissionsByRoleId(req, res);
});
// ===================================END ROLE PERMISSION===================================

// ===================================START USER===================================
// Route đúng chuẩn RESTful cho lấy danh sách user
router.get('/users', authenticateToken, (req, res) => {
  getAllUsers(req, res);
});

// Route cho lấy users theo department (internal service use)
router.get('/users/by-department', authenticateToken, (req, res) => {
  getUsersByDepartment(req, res);
});

// Route cho lấy users theo chevron (internal service use)
router.get('/users/by-chevron', authenticateToken, (req, res) => {
  getUsersByChevron(req, res);
});

// Route cho lấy user theo username (AI service sử dụng)
router.get('/users/username/:username', (req, res) => {
  getUserByUsername(req, res);
});

// Route cho lấy user theo username
router.get('/users/by-username/:username', authenticateToken, (req, res) => {
  getUserByUsername(req, res);
});

// Route chuẩn RESTful cho tạo user
router.post('/users', authenticateToken, upload.single('identificationPhoto'), (req: any, res) => {
  // Attach saved relative path to body for controller
  if (req.file) {
    req.body.identificationPhoto = `/uploads/identificationPhoto/${req.file.filename}`;
  }
  createUser(req, res);
});

// Route cho xóa nhiều user (phải đặt trước /users/:id)
router.delete('/users/multiple', authenticateToken, (req, res) => {
  deleteMultipleUsers(req, res);
});

// Route cho tạo hợp đồng cho user (phải đặt trước /users/:id)
router.post('/users/:id/contract', authenticateToken, (req, res) => {
  createContract(req, res);
});

// Route cho lấy chi tiết user với đầy đủ thông tin
router.get('/users/detail/:id', authenticateToken, (req, res) => {
  getUserDetail(req, res);
});

// Route chuẩn RESTful cho lấy chi tiết user
router.get('/users/:id', authenticateToken, (req, res) => {
  getUserDetail(req, res);
});

// Route chuẩn RESTful cho cập nhật user
router.put('/users/:id', authenticateToken, upload.single('identificationPhoto'), (req: any, res) => {
  if (req.file) {
    req.body.identificationPhoto = `/uploads/identificationPhoto/${req.file.filename}`;
  }
  updateUser(req, res);
});

// Route chuẩn RESTful cho xóa user
router.delete('/users/:id', authenticateToken, (req, res) => {
  deleteUser(req, res);
});

// Routes cho quản lý lương
router.get('/users/:id/salary', authenticateToken, (req, res) => {
  getSalaryInfo(req, res);
});

router.put('/users/:id/salary', authenticateToken, (req, res) => {
  updateSalaryInfo(req, res);
});

// Route lấy thông tin lương không cần token (dành cho internal service calls)
router.get('/internal/users/:id/salary', (req, res) => {
  getSalaryInfo(req, res);
});

// ===================================END USER===================================

export default router;
