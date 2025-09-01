import express from 'express';
import { recognizeFace, confirmAttendance, getAttendanceStatus, getAttendanceHistory } from '../src/controller/AttendanceController';
const router = express.Router();
router.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'attendance-service',
        timestamp: new Date().toISOString()
    });
});
router.post('/recognize', recognizeFace);
router.post('/confirm', (req, res) => {
    confirmAttendance(req, res).catch((err) => {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    });
});
router.get('/status/:userId', (req, res) => {
    getAttendanceStatus(req, res).catch((err) => {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    });
});
router.get('/history/:userId', (req, res) => {
    getAttendanceHistory(req, res).catch((err) => {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    });
});
export default router;
//# sourceMappingURL=api.js.map