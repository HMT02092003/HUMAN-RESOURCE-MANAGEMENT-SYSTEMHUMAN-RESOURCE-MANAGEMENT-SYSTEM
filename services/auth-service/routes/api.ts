import { Router } from 'express';
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

const router = Router();


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
  console.log('Received data:', req.params);
  getPermissionsByRoleId(req, res);
});
// ===================================END ROLE PERMISSION===================================

export default router;
