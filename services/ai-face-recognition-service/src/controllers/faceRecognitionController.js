import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PythonShell } from 'python-shell';
import { getDatabaseConnection } from '../lib/database.js';
import axios from 'axios';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình multer để xử lý upload ảnh
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
    cb(null, 'recognition-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (_req, file, cb) => {
    // Chỉ chấp nhận ảnh
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh'));
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// Middleware để xử lý upload ảnh
const uploadImage = upload.single('image');

// API nhận diện khuôn mặt
export const recognizeFace = async (req, res) => {
  // Wrap multer middleware
  uploadImage(req, res, async (err) => {
    try {
      console.log('[AI] /recognize called');
      if (err) {
        console.error('[AI] Multer error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        console.warn('[AI] No file uploaded');
        return res.status(400).json({
          success: false,
          message: 'Không có ảnh được gửi'
        });
      }

      const imagePath = req.file.path;
      console.log('[AI] Step 1: Received image, saved temp at:', imagePath);

      // Thực hiện nhận diện khuôn mặt bằng Python
      console.log('[AI] Step 2: Launch Python recognize.py');
      const recognitionResult = await runFaceRecognition(imagePath);
      console.log('[AI] Step 3: Python result:', recognitionResult);
      
      // Xóa file tạm sau khi xử lý
      try {
        fs.unlinkSync(imagePath);
        console.log('[AI] Step 4: Temp file deleted');
      } catch (error) {
        console.warn('[AI] Warning: cannot delete temp file:', error);
      }

      if (recognitionResult.success && recognitionResult.recognized) {
        // Tìm thấy người dùng - lấy thông tin từ Auth service
        console.log('[AI] Step 5: Recognized username =', recognitionResult.username);
        const userInfo = await getUserInfoFromAuthService(recognitionResult.username);
        
        if (userInfo) {
          console.log('[AI] Step 6: Retrieved userInfo from Gateway');
          return res.status(200).json({
            success: true,
            recognized: true,
            userId: userInfo.id,
            username: userInfo.username,
            userInfo: {
              fullName: userInfo.fullName,
              email: userInfo.email,
              employeeId: userInfo.employeeId,
              department: userInfo.department,
              position: userInfo.position
            },
            confidence: recognitionResult.confidence,
            message: 'Nhận diện thành công'
          });
        } else {
          console.log('[AI] Step 6: No userInfo found for username');
          return res.status(200).json({
            success: true,
            recognized: false,
            message: 'Nhận diện được khuôn mặt nhưng không tìm thấy thông tin người dùng'
          });
        }
      } else {
        // Không nhận diện được
        console.log('[AI] Step 5: Not recognized');
        return res.status(200).json({
          success: true,
          recognized: false,
          message: 'Không nhận diện được khuôn mặt hoặc người dùng không tồn tại'
        });
      }

    } catch (error) {
      console.error('[AI] Error in face recognition flow:', error);
      
      // Xóa file tạm nếu có lỗi
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('[AI] Warning: cannot delete temp file after error:', cleanupError);
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

// API thêm ảnh training
export const addTrainingImage = async (req, res) => {
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

      const { userId, username } = req.body;
      if (!userId || !username) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu userId hoặc username'
        });
      }

      const imagePath = req.file.path;
      console.log('Adding training image for user:', username);

      // Thực hiện thêm ảnh training
      const result = await addTrainingImageToSystem(imagePath, userId, username);
      
      // Xóa file tạm sau khi xử lý
      try {
        fs.unlinkSync(imagePath);
      } catch (error) {
        console.warn('Không thể xóa file tạm:', error);
      }

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Thêm ảnh training thành công',
          data: result.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Error adding training image:', error);
      
      // Xóa file tạm nếu có lỗi
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.warn('Không thể xóa file tạm sau lỗi:', cleanupError);
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi thêm ảnh training',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

// API kiểm tra trạng thái nhận diện
export const getRecognitionStatus = async (req, res) => {
  try {
    const db = getDatabaseConnection();
    const totalUsers = await db('users').where('status', 1).count('* as count').first();
    const totalTrainingImages = await db('users').where('status', 1).whereNotNull('identificationPhoto').count('* as count').first();

    return res.status(200).json({
      success: true,
      data: {
        totalUsers: totalUsers.count,
        totalTrainingImages: totalTrainingImages.count,
        modelStatus: 'loaded',
        confidenceThreshold: process.env.CONFIDENCE_THRESHOLD || 0.3
      }
    });

  } catch (error) {
    console.error('Error getting recognition status:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra trạng thái nhận diện',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Hàm gọi Auth service để lấy thông tin user theo username
async function getUserInfoFromAuthService(username) {
  try {
    // Always go via API Gateway
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://127.0.0.1:4000';
    const url = `${gatewayUrl}/api/auth/users/username/${encodeURIComponent(username)}`;
    console.log('[AI] Gateway lookup URL:', url);
    const response = await axios.get(url, {
      timeout: 10000
    });

    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('[AI] Error getting user info via Gateway:', error?.response?.data || error.message || error);
    return null;
  }
}

// Hàm chạy Python script để nhận diện khuôn mặt
async function runFaceRecognition(imagePath) {
  return new Promise((resolve, reject) => {
    const options = {
      mode: 'json',
      pythonPath: process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3'), // cấu hình qua env, fallback theo OS
      pythonOptions: ['-u'], // unbuffered output
      scriptPath: path.join(__dirname, '../face_recognition'),
      args: [imagePath]
    };

    console.log('[AI] PythonShell options:', { ...options, pythonPath: options.pythonPath, scriptPath: options.scriptPath });
    PythonShell.run('recognize.py', options, (err, results) => {
      if (err) {
        console.error('[AI] Python script error:', err);
        reject(err);
        return;
      }

      if (results && results.length > 0) {
        try {
          const result = results[0];
          resolve(result);
        } catch (parseError) {
          console.error('[AI] Error parsing Python result:', parseError);
          reject(parseError);
        }
      } else {
        console.error('[AI] No results from Python script');
        reject(new Error('No results from Python script'));
      }
    });
  });
}

// Hàm thêm ảnh training vào hệ thống
async function addTrainingImageToSystem(imagePath, userId, username) {
  return new Promise((resolve, reject) => {
    const options = {
      mode: 'json',
      pythonPath: process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3'),
      pythonOptions: ['-u'],
      scriptPath: path.join(__dirname, '../face_recognition'),
      args: [imagePath, userId, username]
    };

    console.log('[AI] PythonShell add_training_image options:', { ...options, pythonPath: options.pythonPath, scriptPath: options.scriptPath });
    PythonShell.run('add_training_image.py', options, (err, results) => {
      if (err) {
        console.error('[AI] Python script error (add_training_image):', err);
        reject(err);
        return;
      }

      if (results && results.length > 0) {
        try {
          const result = results[0];
          resolve(result);
        } catch (parseError) {
          console.error('[AI] Error parsing Python result (add_training_image):', parseError);
          reject(parseError);
        }
      } else {
        console.error('[AI] No results from Python script (add_training_image)');
        reject(new Error('No results from Python script'));
      }
    });
  });
}

// Public API: fetch user by username via API Gateway
export const getUserByUsernameViaGateway = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://127.0.0.1:4000';
    const url = `${gatewayUrl}/api/auth/users/username/${encodeURIComponent(username)}`;
    console.log('[AI] Fetch user via Gateway:', url);
    const response = await axios.get(url, { timeout: 10000 });
    if (response.data && response.data.success) {
      return res.status(200).json({ success: true, data: response.data.data });
    }
    return res.status(404).json({ success: false, message: 'User not found' });
  } catch (error) {
    console.error('[AI] Error getUserByUsernameViaGateway:', error?.response?.data || error.message || error);
    return res.status(500).json({ success: false, message: 'Internal error', error: error.message });
  }
};
