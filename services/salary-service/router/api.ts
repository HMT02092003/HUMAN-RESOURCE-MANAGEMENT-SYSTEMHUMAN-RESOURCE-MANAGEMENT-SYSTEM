import express from 'express';
import * as allowanceCtrl from '../src/controller/allowanceTypeController';
import * as employeeSalaryCtrl from '../src/controller/employeeSalaryProfileController';
import * as payslipCtrl from '../src/controller/payslipController';

const router = express.Router();

// allowance types CRUD
router.get('/allowance-types', allowanceCtrl.list as express.RequestHandler);
router.get('/allowance-types/all', allowanceCtrl.listAll as express.RequestHandler);
router.get('/allowance-types/:id', allowanceCtrl.getOne as express.RequestHandler);
router.post('/allowance-types', allowanceCtrl.createOne as express.RequestHandler);
router.put('/allowance-types/:id', allowanceCtrl.updateOne as express.RequestHandler);
router.delete('/allowance-types/:id', allowanceCtrl.removeOne as express.RequestHandler);

// Employee salary profile endpoints used by frontend: GET/PUT salary by user id
// keep legacy /auth route for internal compatibility
router.get('/auth/users/:userId/salary', employeeSalaryCtrl.getByUserId as express.RequestHandler);
router.put('/auth/users/:userId/salary', employeeSalaryCtrl.upsertByUserId as express.RequestHandler);

// Also expose the same endpoints without the 'auth' segment so API Gateway
// path rewrite from /api/salary -> /api will work with frontend calls to
// /api/salary/users/:userId/salary (consistent with other services).
router.get('/users/:userId/salary', employeeSalaryCtrl.getByUserId as express.RequestHandler);
router.put('/users/:userId/salary', employeeSalaryCtrl.upsertByUserId as express.RequestHandler);

// Generate monthly payslip from employee profile and its allowances
router.post('/payslips/generate-from-profile/:userId', payslipCtrl.generateFromProfile as express.RequestHandler);

export default router;
