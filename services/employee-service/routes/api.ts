import { Router } from 'express';
import { authenticateToken } from '../src/middleware/authenticateToken';
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

export default router;
