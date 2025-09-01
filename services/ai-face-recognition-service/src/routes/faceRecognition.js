import express from 'express';
import { recognizeFace, addTrainingImage, getRecognitionStatus, getUserByUsernameViaGateway } from '../controllers/faceRecognitionController.js';

const router = express.Router();

// Route nhận diện khuôn mặt
router.post('/recognize', recognizeFace);

// Route thêm ảnh training
router.post('/add-training-image', addTrainingImage);

// Route kiểm tra trạng thái nhận diện
router.get('/status', getRecognitionStatus);

// Proxy user info via Gateway by username (for debugging/utility)
router.get('/user/:username', getUserByUsernameViaGateway);

export default router;
