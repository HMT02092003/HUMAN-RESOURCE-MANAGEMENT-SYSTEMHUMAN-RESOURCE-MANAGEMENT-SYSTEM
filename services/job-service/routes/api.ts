import { Router } from 'express';
import { JobController } from '../src/controller/job-controller.ts';
import { CvController, upload } from '../src/controller/cv-controller.ts';

const router = Router();

// CV endpoints (register before generic job endpoints to avoid route conflicts)
router.post('/cvs/upload', upload.single('file') as any, CvController.uploadCv);
router.get('/cvs', CvController.listCvs);
router.delete('/cvs/:id', CvController.deleteCv);
router.post('/cvs/bulk-delete', CvController.bulkDeleteCvs);

// Job endpoints
router.get('/', JobController.getAll);
router.get('/:id', JobController.getById);
router.post('/', JobController.create);
router.put('/:id', JobController.update);
router.delete('/:id', JobController.delete);

export default router;
