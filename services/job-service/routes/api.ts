import { Router } from 'express';
import { authenticateToken } from '../src/middleware/authenticateToken.js';
import { JobController } from '../src/controller/job-controller.ts';
import { CvController, upload } from '../src/controller/cv-controller.ts';
import { ProjectController } from '../src/controller/project-controler.ts';

const router = Router();

// CV endpoints (register before generic job endpoints to avoid route conflicts)
router.post('/cvs/upload', authenticateToken, upload.single('file') as any, CvController.uploadCv);
router.get('/cvs', authenticateToken, CvController.listCvs);
router.get('/cvs/:id/file', authenticateToken, CvController.serveCvFile);
router.delete('/cvs/:id', authenticateToken, CvController.deleteCv);
router.post('/cvs/bulk-delete', authenticateToken, CvController.bulkDeleteCvs);

// Job AI Analysis endpoints
router.post('/jobs/analyze', authenticateToken, JobController.analyzeJob);
router.post('/jobs/find-candidates', authenticateToken, JobController.findCandidates);
router.post('/jobs/create-with-analysis', authenticateToken, JobController.createJobWithAnalysis);
router.get('/jobs/users/:user_id/tasks', authenticateToken, JobController.getUserTasks);

// Project endpoints (register before generic job endpoints to avoid route conflicts)
router.post('/projects', authenticateToken, ProjectController.createProject);
router.get('/projects', authenticateToken, ProjectController.getAllProjectsByScope);
router.get('/projects/:id', authenticateToken, ProjectController.getProjectById);
router.put('/projects/:id', authenticateToken, ProjectController.updateProject);
// Support bulk delete via DELETE /projects with body { ids: [...] }
router.delete('/projects', authenticateToken, ProjectController.deleteProject);
// Keep single-delete route (by id) for compatibility
router.delete('/projects/:id', authenticateToken, ProjectController.deleteProject);

// Job endpoints - Only keep AI-related endpoints that frontend uses
// Removed: getAll, getById, create, update, delete (not used by frontend)

export default router;
