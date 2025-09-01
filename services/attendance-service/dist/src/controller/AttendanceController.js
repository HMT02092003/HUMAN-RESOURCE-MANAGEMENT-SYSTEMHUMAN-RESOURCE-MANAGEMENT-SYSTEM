import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { recognize_face_from_image } from '../face_recognition/recognize.js';
import connection from '@/lib/Databases/Connection';
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Chỉ chấp nhận file ảnh'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});
const uploadImage = upload.single('image');
export const recognizeFace = async (req, res) => {
    uploadImage(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có ảnh được gửi'
                });
            }
            const imagePath = req.file.path;
            console.log('Processing image:', imagePath);
            const recognitionResult = await recognize_face_from_image(imagePath, connection);
            try {
                fs.unlinkSync(imagePath);
            }
            catch (error) {
                console.warn('Không thể xóa file tạm:', error);
            }
            if (recognitionResult.success && recognitionResult.recognized) {
                return res.status(200).json({
                    success: true,
                    recognized: true,
                    userId: recognitionResult.userId,
                    userInfo: recognitionResult.userInfo,
                    confidence: recognitionResult.confidence,
                    message: 'Nhận diện thành công'
                });
            }
            else {
                return res.status(200).json({
                    success: true,
                    recognized: false,
                    message: 'Không nhận diện được khuôn mặt hoặc người dùng không tồn tại'
                });
            }
        }
        catch (error) {
            console.error('Error in face recognition:', error);
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                }
                catch (cleanupError) {
                    console.warn('Không thể xóa file tạm sau lỗi:', cleanupError);
                }
            }
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi xử lý nhận diện khuôn mặt',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
};
export const confirmAttendance = async (req, res) => {
    try {
        const { userId, attendanceType, location, device } = req.body;
        if (!userId || !attendanceType) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin userId hoặc attendanceType'
            });
        }
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const existingAttendance = await connection('time_attendances')
            .where('userId', userId)
            .where('date', today)
            .first();
        if (existingAttendance) {
            if (attendanceType === 'checkin' && existingAttendance.checkInTime) {
                return res.status(409).json({
                    success: false,
                    message: 'Đã chấm công vào ngày hôm nay'
                });
            }
            if (attendanceType === 'checkout' && existingAttendance.checkOutTime) {
                return res.status(409).json({
                    success: false,
                    message: 'Đã chấm công ra ngày hôm nay'
                });
            }
        }
        let attendanceRecord;
        if (existingAttendance) {
            const updateData = {};
            if (attendanceType === 'checkin') {
                updateData.checkInTime = now;
            }
            else if (attendanceType === 'checkout') {
                updateData.checkOutTime = now;
            }
            updateData.updated_at = now;
            await connection('time_attendances')
                .where('id', existingAttendance.id)
                .update(updateData);
            attendanceRecord = await connection('time_attendances')
                .where('id', existingAttendance.id)
                .first();
        }
        else {
            const newAttendance = {
                userId,
                date: today,
                checkInTime: attendanceType === 'checkin' ? now : null,
                checkOutTime: attendanceType === 'checkout' ? now : null,
                created_at: now,
                updated_at: now,
                location: location || 'Văn phòng chính',
                device: device || 'Mobile App'
            };
            const [newId] = await connection('time_attendances').insert(newAttendance);
            attendanceRecord = await connection('time_attendances').where('id', newId).first();
        }
        if (attendanceRecord.checkInTime && attendanceRecord.checkOutTime) {
            const checkInTime = new Date(attendanceRecord.checkInTime);
            const checkOutTime = new Date(attendanceRecord.checkOutTime);
            const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            await connection('time_attendances')
                .where('id', attendanceRecord.id)
                .update({
                dailyTotalWorkHours: workHours,
                updated_at: now
            });
        }
        return res.status(200).json({
            success: true,
            message: `Chấm công ${attendanceType === 'checkin' ? 'vào' : 'ra'} thành công`,
            data: {
                id: attendanceRecord.id,
                userId: attendanceRecord.userId,
                date: attendanceRecord.date,
                checkInTime: attendanceRecord.checkInTime,
                checkOutTime: attendanceRecord.checkOutTime,
                location: attendanceRecord.location,
                device: attendanceRecord.device
            }
        });
    }
    catch (error) {
        console.error('Error confirming attendance:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xác nhận chấm công',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
export const getAttendanceStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { date } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu userId'
            });
        }
        const targetDate = date || new Date().toISOString().split('T')[0];
        const attendance = await connection('time_attendances')
            .where('userId', userId)
            .where('date', targetDate)
            .first();
        if (!attendance) {
            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    date: targetDate,
                    hasCheckedIn: false,
                    hasCheckedOut: false,
                    status: 'not_attended'
                }
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                userId,
                date: targetDate,
                hasCheckedIn: !!attendance.checkInTime,
                hasCheckedOut: !!attendance.checkOutTime,
                checkInTime: attendance.checkInTime,
                checkOutTime: attendance.checkOutTime,
                workHours: attendance.dailyTotalWorkHours,
                status: attendance.checkInTime && attendance.checkOutTime ? 'completed' : 'partial'
            }
        });
    }
    catch (error) {
        console.error('Error checking attendance status:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra trạng thái chấm công',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
export const getAttendanceHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, limit = 30 } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu userId'
            });
        }
        let query = connection('time_attendances')
            .where('userId', userId)
            .orderBy('date', 'desc')
            .limit(parseInt(limit));
        if (startDate) {
            query = query.where('date', '>=', startDate);
        }
        if (endDate) {
            query = query.where('date', '<=', endDate);
        }
        const history = await query;
        return res.status(200).json({
            success: true,
            data: history,
            total: history.length
        });
    }
    catch (error) {
        console.error('Error getting attendance history:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử chấm công',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
//# sourceMappingURL=AttendanceController.js.map