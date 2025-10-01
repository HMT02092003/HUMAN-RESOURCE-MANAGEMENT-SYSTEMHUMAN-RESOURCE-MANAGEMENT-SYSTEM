import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Lưu vào frontend/public/applications/
    const frontendPublicDir = path.join(__dirname, '../../../../frontend/public/applications');
    
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(frontendPublicDir)) {
      fs.mkdirSync(frontendPublicDir, { recursive: true });
    }
    cb(null, frontendPublicDir);
  },
  filename: (req, file, cb) => {
    // Lấy thông tin từ request body
    let parsedData = {};
    try {
      parsedData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    } catch (error) {
      parsedData = req.body;
    }
    
    const type = parsedData.type || 'unknown';
    const userId = parsedData.userId || 'user';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    
    // Format: {type}_{userId}_{timestamp}{ext}
    const filename = `${type}_${userId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG) hoặc PDF!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter
});

// Middleware xử lý upload - chấp nhận bất kỳ field nào
export const uploadEvidence = upload.any(); // Chấp nhận mọi field name

// Middleware xử lý lỗi upload
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn! Kích thước tối đa là 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Số lượng file vượt quá giới hạn! Tối đa 5 files'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

// Helper function để xóa file
export const deleteFile = (filename) => {
  try {
    const filePath = path.join(__dirname, '../../../../frontend/public/applications', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function để xóa nhiều files
export const deleteFiles = (files) => {
  if (!files || !Array.isArray(files)) return;
  
  files.forEach(file => {
    const filename = file.filename || file;
    if (filename) {
      deleteFile(filename);
    }
  });
};
