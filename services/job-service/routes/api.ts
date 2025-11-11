import { Router } from 'express';
import { authenticateToken } from '../src/middleware/authenticateToken.js';
import { CvController, upload } from '../src/controller/cv-controller.ts';
import { ProjectController } from '../src/controller/project-controler.ts';

const router = Router();

// CV endpoints (register before generic job endpoints to avoid route conflicts)
router.post('/cvs/upload', authenticateToken, upload.single('file') as any, CvController.uploadCv);
router.get('/cvs', authenticateToken, CvController.listCvs);
router.get('/cvs/:id/file', authenticateToken, CvController.serveCvFile);
router.delete('/cvs/:id', authenticateToken, CvController.deleteCv);
router.post('/cvs/bulk-delete', authenticateToken, CvController.bulkDeleteCvs);

// Task AI Analysis endpoints (chuyển từ /jobs sang /projects)
router.post('/projects/analyze-task', authenticateToken, ProjectController.analyzeTask);
router.post('/projects/find-candidates', authenticateToken, ProjectController.findCandidates);
router.post('/projects/create-task-with-analysis', authenticateToken, ProjectController.createTaskWithAnalysis);

// User Tasks endpoints
router.get('/projects/:project_id/users/:user_id/tasks', authenticateToken, ProjectController.getUserTasks);

// My Tasks endpoint - Lấy các task của user hiện tại (từ token)
router.get('/tasks/my-tasks', authenticateToken, ProjectController.getMyTasks);

// Task Management endpoints
router.get('/projects/:project_id/tasks', authenticateToken, ProjectController.getProjectTasks);
router.get('/projects/:project_id/tasks/statistics', authenticateToken, ProjectController.getProjectTaskStatistics);
router.put('/projects/:project_id/tasks/:task_id/status', authenticateToken, ProjectController.updateTaskStatus);

// Project Tab endpoints
router.get('/projects/:project_id/overview', authenticateToken, ProjectController.getProjectOverview);
router.get('/projects/:project_id/members', authenticateToken, ProjectController.getProjectMembers);
router.get('/projects/:project_id/timeline', authenticateToken, ProjectController.getProjectTimeline);

// Project CRUD endpoints
router.post('/projects', authenticateToken, ProjectController.createProject);
router.get('/projects', authenticateToken, ProjectController.getAllProjectsByScope);
router.get('/projects/:id', authenticateToken, ProjectController.getProjectById);
router.put('/projects/:id', authenticateToken, ProjectController.updateProject);
// Support bulk delete via DELETE /projects with body { ids: [...] }
router.delete('/projects', authenticateToken, ProjectController.deleteProject);
// Keep single-delete route (by id) for compatibility
router.delete('/projects/:id', authenticateToken, ProjectController.deleteProject);

export default router;
