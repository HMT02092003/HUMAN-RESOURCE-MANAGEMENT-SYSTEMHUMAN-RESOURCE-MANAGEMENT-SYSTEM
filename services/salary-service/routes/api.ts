
/**
 * Salary Service API Routes - Gateway Authenticated
 * All routes go through API Gateway which validates JWT and injects x-user-data header
 * No authentication middleware needed at service level (except internal routes)
 */
import express from 'express';
import * as allowanceCtrl from '../src/controller/allowanceTypeController';
import * as employeeSalaryCtrl from '../src/controller/employeeSalaryProfileController';
import * as payslipCtrl from '../src/controller/payslipController';
import * as settingsCtrl from '../src/controller/SettingsController';

const router = express.Router();

// Small wrapper to adapt async controller functions to Express RequestHandler
const asyncHandler = (fn: any) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
	Promise.resolve(fn(req, res, next)).catch(next)
};

// allowance types CRUD
router.get('/allowance-types', allowanceCtrl.list as express.RequestHandler);
// Full list for selects (canonical): '/all/allowance-types'
router.get('/all/allowance-types', allowanceCtrl.getAllAllowanceTypesList as express.RequestHandler);
router.get('/allowance-types/:id', allowanceCtrl.getOne as express.RequestHandler);
router.post('/allowance-types', allowanceCtrl.createOne as express.RequestHandler);
router.put('/allowance-types/:id', allowanceCtrl.updateOne as express.RequestHandler);
router.delete('/allowance-types/:id', allowanceCtrl.removeOne as express.RequestHandler);

// Employee salary profile endpoints used by frontend: GET/PUT salary by user id
// keep legacy /auth route for internal compatibility
router.get('/auth/users/:userId/salary', employeeSalaryCtrl.getByUserId as express.RequestHandler);
router.put('/auth/users/:userId/salary', employeeSalaryCtrl.upsertByUserId as express.RequestHandler);

// list all salary profiles for a user and create new salary profile
router.get('/auth/users/:userId/salary-profiles', employeeSalaryCtrl.listByUserId as express.RequestHandler);
router.post('/auth/users/:userId/salary-profiles', employeeSalaryCtrl.createForUser as express.RequestHandler);

// Also expose the same endpoints without the 'auth' segment so API Gateway
// path rewrite from /api/salary -> /api will work with frontend calls to
// /api/salary/users/:userId/salary (consistent with other services).
router.get('/users/:userId/salary', employeeSalaryCtrl.getByUserId as express.RequestHandler);
router.put('/users/:userId/salary', employeeSalaryCtrl.upsertByUserId as express.RequestHandler);

router.get('/users/:userId/salary-profiles', employeeSalaryCtrl.listByUserId as express.RequestHandler);
router.post('/users/:userId/salary-profiles', employeeSalaryCtrl.createForUser as express.RequestHandler);

// Create salary profile from contract (called by employee-service) - No auth for internal calls
router.post('/contracts/:contractId/salary-profile', employeeSalaryCtrl.createFromContract as express.RequestHandler);
router.get('/contracts/:contractId/salary-profile', employeeSalaryCtrl.getByContractId as express.RequestHandler);

// Generate monthly payslip from employee profile and its allowances
router.post('/payslips/generate-from-profile/:userId', payslipCtrl.generateFromProfile as express.RequestHandler);
// Generate payslip from attendance summary (monthly-full)
router.post('/payslips/generate-from-attendance/:userId', payslipCtrl.generateFromAttendance as express.RequestHandler);
// Bulk calculate payslips for a month from approved attendances
router.post('/payslips/calculate-from-attendance', payslipCtrl.calculateFromAttendanceBulk as express.RequestHandler);

// Get payslips for a single user (optional month filter)
router.get('/auth/users/:userId/payslips', payslipCtrl.getPayslipsByUser as express.RequestHandler);
router.get('/users/:userId/payslips', payslipCtrl.getPayslipsByUser as express.RequestHandler);

// Authenticated user's own payslips
router.get('/payslips/me', payslipCtrl.getMyPayslips as express.RequestHandler);
router.get('/auth/payslips/me', payslipCtrl.getMyPayslips as express.RequestHandler);

// Paginated list with full server-side search/filter/sort (replaces old listPayslipsByMonth)
// GET /payslips?page=1&pageSize=25&allMonths=true&sort=created_at&order=desc&fullName=John
router.get('/payslips', payslipCtrl.listPaginatedPayslips as express.RequestHandler);

// Get single payslip by id (enriched with user and department)
router.get('/payslips/:id', payslipCtrl.getPayslipById as express.RequestHandler);

// Settings endpoints (for salary-related configs)
router.get('/settings', asyncHandler(settingsCtrl.getSettings));
router.post('/settings', asyncHandler(settingsCtrl.updateSettings));
router.post('/settings/key', asyncHandler(settingsCtrl.updateSettingByKey));
router.get('/settings/:key', asyncHandler(settingsCtrl.getSettingByKey));

// Convenience routes
router.post('/settings/working-hours', asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/overtime-rate', asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/penalty-rate', asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/bhxh', asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/bhyt', asyncHandler(settingsCtrl.updateSettingByKey));
router.post('/settings/tncn', asyncHandler(settingsCtrl.updateSettingByKey));

export default router;
