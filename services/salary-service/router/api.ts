import express from 'express';
import * as allowanceCtrl from '../src/controller/allowanceTypeController';
import * as employeeSalaryCtrl from '../src/controller/employeeSalaryProfileController';
import * as payslipCtrl from '../src/controller/payslipController';
import { authenticateToken } from '../src/middleware/authenticateToken';
import * as settingsCtrl from '../src/controller/SettingsController';

const router = express.Router();

// Small wrapper to adapt async controller functions to Express RequestHandler
const asyncHandler = (fn: any) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
	Promise.resolve(fn(req, res, next)).catch(next);
};

// allowance types CRUD
router.get('/allowance-types', authenticateToken, allowanceCtrl.list as express.RequestHandler);
router.get('/allowance-types/all', authenticateToken, allowanceCtrl.listAll as express.RequestHandler);
router.get('/allowance-types/:id', authenticateToken, allowanceCtrl.getOne as express.RequestHandler);
router.post('/allowance-types', authenticateToken, allowanceCtrl.createOne as express.RequestHandler);
router.put('/allowance-types/:id', authenticateToken, allowanceCtrl.updateOne as express.RequestHandler);
router.delete('/allowance-types/:id', authenticateToken, allowanceCtrl.removeOne as express.RequestHandler);

// Employee salary profile endpoints used by frontend: GET/PUT salary by user id
// keep legacy /auth route for internal compatibility
router.get('/auth/users/:userId/salary', authenticateToken, employeeSalaryCtrl.getByUserId as express.RequestHandler);
router.put('/auth/users/:userId/salary', authenticateToken, employeeSalaryCtrl.upsertByUserId as express.RequestHandler);

// list all salary profiles for a user and create new salary profile
router.get('/auth/users/:userId/salary-profiles', authenticateToken, employeeSalaryCtrl.listByUserId as express.RequestHandler);
router.post('/auth/users/:userId/salary-profiles', authenticateToken, employeeSalaryCtrl.createForUser as express.RequestHandler);

// Also expose the same endpoints without the 'auth' segment so API Gateway
// path rewrite from /api/salary -> /api will work with frontend calls to
// /api/salary/users/:userId/salary (consistent with other services).
router.get('/users/:userId/salary', authenticateToken, employeeSalaryCtrl.getByUserId as express.RequestHandler);
router.put('/users/:userId/salary', authenticateToken, employeeSalaryCtrl.upsertByUserId as express.RequestHandler);

router.get('/users/:userId/salary-profiles', authenticateToken, employeeSalaryCtrl.listByUserId as express.RequestHandler);
router.post('/users/:userId/salary-profiles', authenticateToken, employeeSalaryCtrl.createForUser as express.RequestHandler);

// Create salary profile from contract (called by employee-service) - No auth for internal calls
router.post('/contracts/:contractId/salary-profile', employeeSalaryCtrl.createFromContract as express.RequestHandler);
router.get('/contracts/:contractId/salary-profile', employeeSalaryCtrl.getByContractId as express.RequestHandler);

// Generate monthly payslip from employee profile and its allowances
router.post('/payslips/generate-from-profile/:userId', authenticateToken, payslipCtrl.generateFromProfile as express.RequestHandler);
// Generate payslip from attendance summary (monthly-full)
router.post('/payslips/generate-from-attendance/:userId', authenticateToken, payslipCtrl.generateFromAttendance as express.RequestHandler);
// Bulk calculate payslips for a month from approved attendances
router.post('/payslips/calculate-from-attendance', authenticateToken, payslipCtrl.calculateFromAttendanceBulk as express.RequestHandler);

// Get payslips for a single user (optional month filter)
router.get('/auth/users/:userId/payslips', authenticateToken, payslipCtrl.getPayslipsByUser as express.RequestHandler);
router.get('/users/:userId/payslips', authenticateToken, payslipCtrl.getPayslipsByUser as express.RequestHandler);

// Authenticated user's own payslips
router.get('/payslips/me', authenticateToken, payslipCtrl.getMyPayslips as express.RequestHandler);
router.get('/auth/payslips/me', authenticateToken, payslipCtrl.getMyPayslips as express.RequestHandler);

// Public/admin: list payslips paginated with optional month filter
// GET /payslips?month=YYYY-MM&page=0&pageSize=25
router.get('/payslips', authenticateToken, payslipCtrl.listPaginatedPayslips as express.RequestHandler);

// Admin: list payslips for a given year+month (for debugging/inspection)
router.get('/payslips/admin/list-by-month', authenticateToken, payslipCtrl.listPayslipsByMonth as express.RequestHandler);
// Get single payslip by id (enriched with user and department)
router.get('/payslips/:id', authenticateToken, payslipCtrl.getPayslipById as express.RequestHandler);

// Settings endpoints (for salary-related configs)
router.get('/settings', authenticateToken, asyncHandler(settingsCtrl.getSettings));
router.post('/settings', authenticateToken, asyncHandler(settingsCtrl.updateSettings));
router.post('/settings/key', authenticateToken, asyncHandler(settingsCtrl.updateSettingByKey));
router.get('/settings/:key', authenticateToken, asyncHandler(settingsCtrl.getSettingByKey));

// Convenience routes
router.post('/settings/working-hours', authenticateToken, asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/overtime-rate', authenticateToken, asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/penalty-rate', authenticateToken, asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/bhxh', authenticateToken, asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/bhyt', authenticateToken, asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/tncn', authenticateToken, asyncHandler(settingsCtrl.updateSettingByKey));

export default router;
