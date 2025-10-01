import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình multer để upload file (tạm thời lưu vào memory)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/png', 
    'image/jpg',
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG), PDF, DOC, DOCX, XLS, XLSX!'), false);
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

// Middleware convert ảnh sang PNG và lưu file
export const processAndSaveFiles = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const frontendPublicDir = path.join(__dirname, '../../../../frontend/public/applications');
    
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(frontendPublicDir)) {
      fs.mkdirSync(frontendPublicDir, { recursive: true });
    }

    // Lấy thông tin từ request body
    let parsedData = {};
    try {
      parsedData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    } catch (error) {
      parsedData = req.body;
    }
    
    const type = parsedData.type || 'unknown';
    const userId = parsedData.userId || 'user';

    // Process từng file
    const processedFiles = [];
    
    for (const file of req.files) {
      const timestamp = Date.now() + Math.random(); // Đảm bảo unique
      const isImage = file.mimetype.startsWith('image/');
      
      let filename;
      let outputPath;

      if (isImage) {
        // Convert ảnh sang PNG
        filename = `${type}_${userId}_${Math.floor(timestamp)}.png`;
        outputPath = path.join(frontendPublicDir, filename);
        
        await sharp(file.buffer)
          .png({ quality: 90 }) // Convert sang PNG với quality 90%
          .toFile(outputPath);
        
        processedFiles.push({
          fieldname: file.fieldname,
          originalname: file.originalname,
          filename: filename,
          path: `/applications/${filename}`,
          mimetype: 'image/png',
          size: fs.statSync(outputPath).size
        });
      } else {
        // Giữ nguyên file PDF, DOC, DOCX, XLS, XLSX
        const ext = path.extname(file.originalname);
        filename = `${type}_${userId}_${Math.floor(timestamp)}${ext}`;
        outputPath = path.join(frontendPublicDir, filename);
        
        fs.writeFileSync(outputPath, file.buffer);
        
        processedFiles.push({
          fieldname: file.fieldname,
          originalname: file.originalname,
          filename: filename,
          path: `/applications/${filename}`,
          mimetype: file.mimetype,
          size: file.size
        });
      }
    }

    // Replace req.files với processed files
    req.files = processedFiles;
    next();
  } catch (error) {
    console.error('Error processing files:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý file: ' + error.message
    });
  }
};
