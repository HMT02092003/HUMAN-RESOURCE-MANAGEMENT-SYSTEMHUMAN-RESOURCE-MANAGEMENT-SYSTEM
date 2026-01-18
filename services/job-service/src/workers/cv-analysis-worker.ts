/**
 * ====================================================================
 * CV Analysis Worker - Xử lý phân tích CV bằng Gemini AI
 * ====================================================================
 * 
 * Worker này:
 * 1. Lấy message từ RabbitMQ queue: cv_analysis_queue
 * 2. Đọc file PDF và extract text
 * 3. Gọi Gemini AI để phân tích skills
 * 4. Lưu CV và skills vào database
 * 5. Gửi notification qua Socket.IO khi xong
 */

import dotenv from 'dotenv';
dotenv.config();

import rabbitmqManager from '../utils/rabbitmq.js';
import knex from '../lib/database.js';
import axios from 'axios';
import fs from 'fs/promises';
import { getTextFromPdf } from '../services/pdfParser.js';
import { analyzeCvText } from '../services/geminiService.js';
import { randomUUID } from 'crypto';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4009';

class CVAnalysisWorker {
  private isRunning: boolean = false;

  /**
   * Bắt đầu worker
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  CV Analysis Worker đang chạy rồi');
      return;
    }

    this.isRunning = true;
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  📄 CV Analysis Worker đang khởi động...              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Kết nối RabbitMQ trước khi lắng nghe queue
    console.log('🔌 Đang kết nối RabbitMQ...');
    const connected = await rabbitmqManager.connect();
    
    if (!connected) {
      console.log('⚠️  Không kết nối được RabbitMQ, bỏ qua worker mode');
      return;
    }

    // Lắng nghe queue
    console.log('🚀 Bắt đầu lắng nghe queue: cv_analysis_queue');
    await rabbitmqManager.consumeQueue('cv_analysis_queue', this.handleCVAnalysis.bind(this));
    console.log('✅ Worker đã sẵn sàng xử lý CV analysis!');
  }

  /**
   * Xử lý message phân tích CV từ queue
   */
  async handleCVAnalysis(data: any) {
    const { cvId, userId, filePath, originalName, requestedBy } = data;

    console.log('\n🔴🔴🔴 [WORKER] NHẬN ĐƯỢC MESSAGE TỪ QUEUE! 🔴🔴🔴');
    console.log(`\n📄 Bắt đầu phân tích CV cho User ID: ${userId}`);
    console.log(`📁 File: ${originalName}`);
    console.log(`🎯 CV ID: ${cvId}, Requested by: ${requestedBy}`);

    try {
      // 1. Đọc file và extract text
      console.log('📖 Đang đọc file PDF...');
      const fileBuffer = await fs.readFile(filePath);
      const text = await getTextFromPdf(fileBuffer);

      if (!text || text.trim().length === 0) {
        throw new Error('Không thể extract text từ PDF');
      }

      // Remove NUL bytes
      const sanitizedText = text.replace(/\u0000/g, '');

      // 2. Gọi Gemini AI để phân tích
      console.log('🤖 Đang phân tích CV bằng Gemini AI...');
      const analysis = await analyzeCvText(text);

      if (!analysis || !analysis.skills || analysis.skills.length === 0) {
        throw new Error('AI không detect được skills nào');
      }

      console.log(`✅ AI detected ${analysis.skills.length} skills:`,
        analysis.skills.map((s: any) => `${s.name} (${s.level})`).join(', '));

      // 3. Lưu CV và skills vào database
      await knex.transaction(async (trx: any) => {
        // Check existing CV
        const existing = await trx('cvs').where('user_id', userId).first();

        let savedCvId = cvId;
        if (existing) {
          // Update existing CV
          await trx('cvs')
            .where('cv_id', existing.cv_id)
            .update({
              file_path: filePath,
              original_text: sanitizedText,
              uploaded_at: new Date()
            });
          savedCvId = existing.cv_id;
        } else {
          // Insert new CV
          await trx('cvs').insert({
            cv_id: cvId,
            user_id: userId,
            file_path: filePath,
            original_text: sanitizedText,
            uploaded_at: new Date()
          });
        }

        // Upsert skills and user_skills
        for (const skill of analysis.skills) {
          let skillRow = await trx('skills').where('skill_name', skill.name).first();
          
          if (!skillRow) {
            const [inserted] = await trx('skills')
              .insert({ skill_name: skill.name })
              .returning('*');
            skillRow = inserted;
          }

          if (!skillRow) continue;

          const existingUserSkill = await trx('user_skills')
            .where({ user_id: userId, skill_id: skillRow.skill_id })
            .first();

          if (existingUserSkill) {
            await trx('user_skills')
              .where({ user_id: userId, skill_id: skillRow.skill_id })
              .update({ proficiency_level: skill.level });
          } else {
            await trx('user_skills').insert({
              user_id: userId,
              skill_id: skillRow.skill_id,
              proficiency_level: skill.level
            });
          }
        }

        console.log(`✅ Đã lưu CV ${savedCvId} và ${analysis.skills.length} skills`);
      });

      // 4. 🔔 Gửi thông báo thành công qua Socket.IO
      if (requestedBy) {
        try {
          await axios.post(`${NOTIFICATION_SERVICE_URL}/internal/send`, {
            userIds: [requestedBy],
            title: '📄 CV đã được phân tích thành công',
            content: `CV của bạn đã được phân tích xong. AI đã phát hiện ${analysis.skills.length} kỹ năng. Vui lòng truy cập màn quản lý CV để xem chi tiết.`,
            type: 'CV_ANALYZED',
            data: {
              cvId,
              userId,
              skillsCount: analysis.skills.length,
              skills: analysis.skills.map((s: any) => `${s.name} (${s.level})`).join(', ')
            }
          });
          console.log(`📢 Đã gửi thông báo tới user ${requestedBy}`);
        } catch (notifError: any) {
          console.error('⚠️  Lỗi gửi thông báo:', notifError.message);
        }
      }

    } catch (error: any) {
      console.error(`❌ Lỗi phân tích CV:`, error.message);

      // 🔔 Gửi thông báo lỗi qua Socket.IO
      if (requestedBy) {
        try {
          await axios.post(`${NOTIFICATION_SERVICE_URL}/internal/send`, {
            userIds: [requestedBy],
            title: '❌ Lỗi phân tích CV',
            content: `Có lỗi xảy ra khi phân tích CV: ${error.message}. Vui lòng thử lại.`,
            type: 'CV_FAILED',
            data: {
              cvId,
              userId,
              error: error.message
            }
          });
        } catch (notifError: any) {
          console.error('⚠️  Lỗi gửi thông báo:', notifError.message);
        }
      }

      throw error; // Re-throw để trigger retry logic
    }
  }
}

export default new CVAnalysisWorker();
