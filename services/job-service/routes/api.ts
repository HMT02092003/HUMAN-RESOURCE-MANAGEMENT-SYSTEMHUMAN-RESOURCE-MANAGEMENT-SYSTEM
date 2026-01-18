/**
 * Job Service API Routes - Gateway Authenticated
 * All routes go through API Gateway which validates JWT and injects x-user-data header
 * No authentication middleware needed at service level
 */
import { Router } from 'express';
import { CvController, upload } from '../src/controller/cv-controller.ts';
import { uploadCvAsync } from '../src/controller/cv-controller-async.ts';
import { ProjectController } from '../src/controller/project-controler.ts';
import multer from 'multer';

const router = Router();

// Configure multer for async CV upload
const memoryStorage = multer.memoryStorage();
const uploadMiddleware = multer({ storage: memoryStorage });

// ========== CV ENDPOINTS ==========
// Async CV upload với RabbitMQ (Recommended)
router.post('/cvs/upload-async', uploadMiddleware.single('file') as any, uploadCvAsync);

// Sync CV upload (Legacy)
router.post('/cvs/upload', upload.single('file') as any, CvController.uploadCv);

router.get('/cvs', CvController.listCvs);
router.get('/cvs/:id/file', CvController.serveCvFile);
router.delete('/cvs/:id', CvController.deleteCv);
router.post('/cvs/bulk-delete', CvController.bulkDeleteCvs);

// Task AI Analysis endpoints (chuyển từ /jobs sang /projects)
router.post('/projects/analyze-task', ProjectController.analyzeTask);
router.post('/projects/find-candidates', ProjectController.findCandidates);
router.post('/projects/create-task-with-analysis', ProjectController.createTaskWithAnalysis);

// User Tasks endpoints
router.get('/projects/:project_id/users/:user_id/tasks', ProjectController.getUserTasks);

// My Tasks endpoint - Lấy các task của user hiện tại (từ token)
router.get('/tasks/my-tasks', ProjectController.getMyTasks);

// Task Management endpoints
router.get('/projects/:project_id/tasks', ProjectController.getProjectTasks);
router.get('/projects/:project_id/tasks/statistics', ProjectController.getProjectTaskStatistics);
router.put('/projects/:project_id/tasks/:task_id/status', ProjectController.updateTaskStatus);
router.put('/projects/:project_id/tasks/:task_id', ProjectController.updateTask);
router.delete('/projects/:project_id/tasks/:task_id', ProjectController.deleteTask);

// Project Tab endpoints
router.get('/projects/:project_id/overview', ProjectController.getProjectOverview);
router.get('/projects/:project_id/members', ProjectController.getProjectMembers);
router.get('/projects/:project_id/timeline', ProjectController.getProjectTimeline);

// Project Expenses endpoints
router.get('/projects/:project_id/expenses', ProjectController.getProjectExpenses);
router.post('/projects/:project_id/expenses', ProjectController.createExpense);
router.put('/projects/:project_id/expenses/:expense_id', ProjectController.updateExpense);
router.delete('/projects/:project_id/expenses/:expense_id', ProjectController.deleteExpense);
router.post('/projects/:project_id/expenses/:expense_id/approve', ProjectController.approveExpense);
router.post('/projects/:project_id/expenses/:expense_id/reject', ProjectController.rejectExpense);

// Task Approval endpoints
router.post('/projects/:project_id/tasks/:task_id/approve', ProjectController.approveTask);
router.post('/projects/:project_id/tasks/:task_id/reject', ProjectController.rejectTask);

// KPI endpoints - Quản lý KPI nhân viên
// Lấy KPI tất cả users trong scope theo tháng/năm
router.get('/kpi/users', ProjectController.getAllUsersKpi);
// Lấy KPI summary của một user
router.get('/kpi/users/:user_id/summary', ProjectController.getUserKpiSummary);
// Lấy KPI chi tiết theo từng dự án của user
router.get('/kpi/users/:user_id/projects', ProjectController.getUserProjectKpiDetails);

// Notification endpoints removed (notifications table not present)

// Project CRUD endpoints
router.post('/projects', ProjectController.createProject);
router.get('/projects', ProjectController.getAllProjectsByScope);
router.get('/projects/:id', ProjectController.getProjectById);
router.put('/projects/:id', ProjectController.updateProject);
// Support bulk delete via DELETE /projects with body { ids: [...] }
router.delete('/projects', ProjectController.deleteProject);
// Keep single-delete route (by id) for compatibility
router.delete('/projects/:id', ProjectController.deleteProject);


export default router;
