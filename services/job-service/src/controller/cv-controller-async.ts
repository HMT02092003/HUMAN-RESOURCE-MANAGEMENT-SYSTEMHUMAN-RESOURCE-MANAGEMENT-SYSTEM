/**
 * CV Controller - Async Processing với RabbitMQ
 * 
 * Flow:
 * 1. Client upload CV
 * 2. Server lưu file tạm vào uploads/
 * 3. Server đẩy message vào RabbitMQ queue (cv_analysis_queue)
 * 4. Server trả về ngay response "Đang xử lý..."
 * 5. Worker xử lý phân tích CV bằng Gemini AI ở background
 * 6. Worker gửi notification qua Socket.IO khi xong
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import rabbitmqManager from '../utils/rabbitmq.js';
import { getUserId } from '../utils/getUserData.js';

// UploadRequest type for multer
interface UploadRequest extends Request {
  file?: Express.Multer.File;
}

const uploadDir = path.resolve(process.cwd(), 'uploads');

/**
 * Upload CV ASYNC với RabbitMQ
 * POST /api/cvs/upload-async
 * 
 * Body (multipart/form-data):
 * - file: CV file (PDF)
 * - user_id: User ID
 */
export const uploadCvAsync = async (req: UploadRequest, res: Response): Promise<any> => {
  try {
    const authUserId = getUserId(req);
    const targetUserId = req.body.user_id;

    if (!targetUserId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing user_id in request body' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'File is required' 
      });
    }

    const { file } = req;
    const userId = parseInt(targetUserId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user_id format' 
      });
    }

    // Kiểm tra file buffer
    if (!file || !file.buffer) {
      return res.status(400).json({ 
        success: false,
        error: 'File buffer is missing' 
      });
    }

    // Tạo unique filename và lưu file vào uploads/
    const cvId = randomUUID();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    const writePath = path.join(uploadDir, unique);
    const relPath = path.relative(process.cwd(), writePath);

    // Ensure uploads directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Write file to disk
    await fs.writeFile(writePath, file.buffer);

    console.log(`📄 [uploadCvAsync] File saved: ${relPath}`);

    // Đẩy message vào RabbitMQ queue để worker xử lý
    const queueResult = await rabbitmqManager.sendToQueue('cv_analysis_queue', {
      cvId,
      userId,
      filePath: relPath,
      originalName: file.originalname,
      requestedBy: authUserId // Người request để gửi notification
    });

    console.log(`✅ [uploadCvAsync] CV ${cvId} queued for AI analysis`);

    // Trả về ngay cho client
    return res.status(202).json({
      success: true,
      message: 'CV đang được xử lý. Bạn sẽ nhận thông báo khi hoàn tất.',
      data: {
        cvId,
        userId,
        filePath: relPath,
        status: 'PENDING',
        queueMode: queueResult.mode // 'cloud', 'local', 'sync-fallback'
      }
    });

  } catch (err: any) {
    console.error('[uploadCvAsync] Error:', err);
    return res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error' 
    });
  }
};
