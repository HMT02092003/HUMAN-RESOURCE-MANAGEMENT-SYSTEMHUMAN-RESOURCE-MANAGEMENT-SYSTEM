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
  getAllChevrons,
  createChevron,
  getChevronDetail,
  updateChevron,
  deleteChevron,
  deleteMultipleChevrons
} from '@/src/controller/ChevronController';
import {
  getAllDepartments,
  createDepartment,
  deleteMultipleDepartments,
  getDepartmentDetail,
  updateDepartment,
  deleteDepartment,
} from '@/src/controller/DepartmentController';
import {
  getAllContractTypes,
  createContractType,
  getContractTypeDetail,
  updateContractType,
  deleteMultipleContractTypes,
  deleteContractType,
} from '@/src/controller/ContractTypeController';


const router = Router();


// ===================================AUTHENTICATION===================================
router.post('/register', (req, res) => {
  console.log('Received data:', req.body);
  registerHandler(req, res);
});

router.post('/login', (req, res) => {
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

// ===================================CHEVRONS===================================
router.get('/getAllChevrons', authenticateToken, (req, res) => {
  getAllChevrons(req, res);
});

router.post('/createChevrons', authenticateToken, (req, res) => {
  createChevron(req, res);
});

router.post('/getChevronDetail', authenticateToken, (req, res) => {
  getChevronDetail(req, res);
});

router.put('/updateChevron', authenticateToken, (req, res) => {
  updateChevron(req, res);
});

router.delete('/deleteChevron', authenticateToken, (req, res) => {
  deleteChevron(req, res);
});

router.delete('/deleteMultipleChevrons', authenticateToken, (req, res) => {
  console.log('Received data:', req.body);
  deleteMultipleChevrons(req, res);
});

// ===================================END CHEVRONS===================================

// ===================================DEPARTMENTS===================================
router.post('/createDepartments', authenticateToken, (req, res) => {
  createDepartment(req, res);
});

router.get('/departments', authenticateToken, (req, res) => {
  getAllDepartments(req, res);
});

router.delete('/deleteMultipleDepartments', authenticateToken, (req, res) => {
  deleteMultipleDepartments(req, res);
});

router.get('/departments/:id', authenticateToken, (req, res) => {
  getDepartmentDetail(req, res);
});

router.put('/departments', authenticateToken, (req, res) => {
  updateDepartment(req, res);
});

router.delete('/deleteDepartment', authenticateToken, (req, res) => {
  deleteDepartment(req, res);
});

// ===================================END DEPARTMENTS===================================

// ===================================CONTRACT TYPES===================================
router.get('/contractTypes', authenticateToken, (req, res) => {
  getAllContractTypes(req, res);
});

router.post('/createContractType', authenticateToken, (req, res) => {
  createContractType(req, res);
});

router.get('/contractTypes/:id', authenticateToken, (req, res) => {
  getContractTypeDetail(req, res);
});

router.put('/contractTypes', authenticateToken, (req, res) => {
  updateContractType(req, res);
});

router.delete('/deleteMultipleContractTypes', authenticateToken, (req, res) => {
  deleteMultipleContractTypes(req, res);
});

router.delete('/deleteContractType', authenticateToken, (req, res) => {
  deleteContractType(req, res);
});
// ===================================END DEPARTMENTS===================================

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

// ===================================START USER===================================
router.get('/users', authenticateToken, (req, res) => {
  getAllUsers(req, res);
});

router.post('/createUser', authenticateToken, (req, res) => {
  createUser(req, res);
});

// ===================================END USER===================================

export default router;
