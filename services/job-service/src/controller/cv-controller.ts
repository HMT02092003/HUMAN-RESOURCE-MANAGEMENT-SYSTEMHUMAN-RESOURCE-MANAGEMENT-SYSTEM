import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { Request, Response, RequestHandler } from 'express';
import { CvModel } from '../Models/CvModel.ts';
import { transaction } from 'objection';
import knex from '../lib/database.ts';
import { SkillModel } from '../Models/SkillModel.ts';
import { UserSkillModel } from '../Models/UserSkillModel.ts';
import { getTextFromPdf } from '../services/pdfParser.ts';
import { analyzeCvText } from '../services/geminiService.ts';
import { validate, ValidationException } from '../ulitis/validation-utility.ts';
import jwt from 'jsonwebtoken';

const uploadDir = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Use memory storage so we only persist the file to disk after AI analysis succeeds
const storage = multer.memoryStorage();
export const upload = multer({ storage });

interface UploadBody {
  user_id?: string;
}

interface UploadRequest extends Request {
  file?: Express.Multer.File;
  body: UploadBody;
}

export const CvController = {
  uploadCv: (async (req: UploadRequest, res: Response): Promise<any> => {
    try {
      const allowFields = {
        user_id: 'string!'
      };

      let payload: UploadBody;
      try {
        payload = validate(req.body, allowFields) as UploadBody;
      } catch (error) {
        if (error instanceof ValidationException) {
          res.status(error.status).json({ error: error.message });
          return;
        }
        throw error;
      }

      if (!req.file) {
        res.status(400).json({ error: 'File is required' });
        return;
      }

      const { file } = req;
      const userId = parseInt(payload.user_id as string, 10);

      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user_id format' });
        return;
      }

      // We use memory storage: file.buffer is available. Don't write to uploads/ yet.
      if (!file || !file.buffer) {
        res.status(400).json({ error: 'File buffer is missing' });
        return;
      }

      const fileBuffer: Buffer = file.buffer as Buffer;

      // Extract text from PDF and analyze before saving to DB
      const text = await getTextFromPdf(fileBuffer);
      
      if (!text || text.trim().length === 0) {
        res.status(400).json({ error: 'Unable to extract text from PDF' });
        return;
      }

      // Remove any NUL bytes or other invalid binary sequences that Postgres
      // will reject for UTF8 text columns (error: invalid byte sequence 0x00).
      const sanitizedText = (typeof text === 'string') ? text.replace(/\u0000/g, '') : String(text || '');

      console.log('[uploadCv] Analyzing CV with Gemini AI...');
      const analysis = await analyzeCvText(text);

      // Validate that AI returned skills before saving to DB
      if (!analysis || !analysis.skills || analysis.skills.length === 0) {
        console.error('[uploadCv] Gemini did not return any skills');
        res.status(500).json({ 
          error: 'AI analysis failed: no skills detected',
          details: 'The AI service could not extract skills from the CV'
        });
        return;
      }

      console.log(`[uploadCv] AI detected ${analysis.skills.length} skills:`, 
        analysis.skills.map(s => `${s.name} (${s.level})`).join(', '));

      // Persist CV and user skills in a transaction (only after successful AI analysis)
  // Persist CV and user skills in a transaction (only after successful AI analysis)
      const cv = await transaction(knex, async (trx) => {
        // find existing cv for this user
        const existing = await CvModel.query(trx).where('user_id', userId).first();

        let saved;
        if (existing) {
          saved = await CvModel.query(trx).patchAndFetchById(existing.cv_id, {
            // file will be written to disk after transaction succeeds
            // use a placeholder now and update below, or better: write file to disk here inside trx but writing files isn't transactional
            file_path: '',
            original_text: sanitizedText,
            uploaded_at: new Date().toISOString()
          });
        } else {
          saved = await CvModel.query(trx).insert({
            cv_id: randomUUID(),
            user_id: userId,
            file_path: '',
            original_text: sanitizedText,
            uploaded_at: new Date().toISOString()
          });
        }

        // Upsert skills and user_skills
        for (const skill of (analysis.skills || [])) {
          let skillRow = await SkillModel.query(trx).where('skill_name', skill.name).first();
          if (!skillRow) {
            const inserted = await SkillModel.query(trx).insert({ skill_name: skill.name }).returning('*');
            skillRow = Array.isArray(inserted) ? inserted[0] : inserted;
          }
          if (!skillRow) continue;

          const existingUserSkill = await UserSkillModel.query(trx).findById([userId, skillRow.skill_id]);
          if (existingUserSkill) {
            await UserSkillModel.query(trx)
              .patch({ proficiency_level: skill.level })
              .where({ user_id: userId, skill_id: skillRow.skill_id });
          } else {
            await UserSkillModel.query(trx).insert({
              user_id: userId,
              skill_id: skillRow.skill_id,
              proficiency_level: skill.level
            });
          }
        }

        return saved;
      });

      console.log(`[uploadCv] Successfully saved CV and ${analysis.skills.length} skills for user ${userId}`);


      // At this point transaction committed. Write file to disk and update file_path.
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
      const writePath = path.join(uploadDir, unique);
      // ensure uploadDir exists (already done earlier)
      const relPath = path.relative(process.cwd(), writePath);
      // write file
      await fs.promises.writeFile(writePath, fileBuffer);

      // update CV record with actual file_path
      await CvModel.query().patch({ file_path: relPath }).findById(cv.cv_id);

      res.status(201).json({
        cv_id: cv.cv_id,
        message: 'CV analyzed and saved successfully',
        skills_detected: analysis.skills.length,
        skills: analysis.skills
      });
    } catch (err) {
      console.error('[uploadCv] Error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Internal error';
      
      // Return specific error messages based on error type
      if (errorMessage.includes('Gemini') || errorMessage.includes('AI')) {
        res.status(500).json({ 
          error: 'AI analysis failed', 
          details: errorMessage 
        });
      } else if (errorMessage.includes('PDF') || errorMessage.includes('extract')) {
        res.status(400).json({ 
          error: 'Failed to process PDF file', 
          details: errorMessage 
        });
      } else {
        res.status(500).json({ 
          error: 'Internal server error', 
          details: errorMessage 
        });
      }
    }
  }) as RequestHandler,

  listCvs: (async (req: Request, res: Response): Promise<any> => {
    try {
      console.log('[listCvs] Starting...');
      const { page = '1', pageSize = '10', sortField = 'uploaded_at', sortOrder = 'desc', search = '' } = req.query;
      
      const pageNum = Math.max(1, parseInt(page as string, 10));
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
      const offset = (pageNum - 1) * pageSizeNum;

      const validSortFields = ['cv_id', 'user_id', 'file_path', 'uploaded_at'];
      const safeSortField = validSortFields.includes(sortField as string) ? (sortField as string) : 'uploaded_at';
      const safeSortOrder = (sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

      console.log('[listCvs] Query params:', { pageNum, pageSizeNum, safeSortField, safeSortOrder });

      // Step 1: Get current user ID from token (decode locally to avoid 401 on expired token)
      let currentUserId: number | null = null;
      
      // Get token from request
      const token = (req as any).cookies?.token ||
        (req.headers.authorization && req.headers.authorization.split(' ')[1]);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      // Decode token to get user ID (no verification needed, trust gateway)
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && (decoded.user?.id || decoded.sub)) {
          currentUserId = decoded.user?.id || decoded.sub;
          console.log('[listCvs] Current user ID:', currentUserId);
        } else {
          console.warn('[listCvs] Token decode failed or missing user ID');
          return res.status(401).json({
            success: false,
            message: 'Invalid token format'
          });
        }
      } catch (decodeErr) {
        console.error('[listCvs] Error decoding token:', decodeErr);
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      // At this point currentUserId is guaranteed to be a number (not null)
      const userId: number = currentUserId!;

      // Step 2: Check scope via auth service using same method as application-service
      let allowedUserIds: number[] = [];
      
      try {
        console.log('[listCvs] Checking scope for permission: cvs');
        const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}`;
        
        // Call auth service check-scope endpoint with token (same as application-service does)
        const scopeResp = await fetch(`${AUTH_SERVICE_URL}/api/users/check-scope`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cookie': `token=${token}` // Send token in cookie as auth-service reads from cookie first
          },
          body: JSON.stringify({ permissionKey: 'cvs' })
        });

        if (scopeResp.ok) {
          const scopeResult = await scopeResp.json();
          console.log('[listCvs] Scope check result:', scopeResult);
          
          if (scopeResult.success && scopeResult.userIds) {
            allowedUserIds = scopeResult.userIds;
            console.log(`[listCvs] User has ${scopeResult.scope} scope access to ${allowedUserIds.length} users`);
          } else {
            // No access or scope check failed, show only personal CVs
            allowedUserIds = [userId];
            console.log('[listCvs] No scope access, showing only personal CVs for user:', userId);
          }
        } else {
          const errorText = await scopeResp.text();
          console.warn('[listCvs] Scope check failed, status:', scopeResp.status, 'response:', errorText);
          
          // Fallback to personal scope
          allowedUserIds = [userId];
          console.log('[listCvs] Falling back to personal scope for user:', userId);
        }
      } catch (scopeErr) {
        console.error('[listCvs] Error checking scope:', scopeErr);
        // Fallback to personal scope on error
        allowedUserIds = [userId];
      }

      // Step 2: Build query with scope filter if we have allowed user IDs
      let query = knex('cvs')
        .select('cv_id', 'user_id', 'file_path', 'original_text', 'uploaded_at');

      // Apply filter only for personal/department scope
      if (allowedUserIds.length > 0) {
        query = query.whereIn('user_id', allowedUserIds);
      }
      // For global scope (allowedUserIds.length === 0), no filter is applied

      // Apply ordering, pagination
      const rows = await query
        .orderBy(safeSortField, safeSortOrder)
        .limit(pageSizeNum)
        .offset(offset);

      console.log('[listCvs] Fetched', rows.length, 'rows (after scope filter)');

      // Get total count with same filter
      let countQuery = knex('cvs').count('* as count');
      if (allowedUserIds.length > 0) {
        countQuery = countQuery.whereIn('user_id', allowedUserIds);
      }
      const countResult = await countQuery.first();
      const total = countResult ? parseInt(String(countResult.count), 10) : 0;

      console.log('[listCvs] Total (filtered):', total);

      // Enrich rows with user info by calling Auth Service bulk endpoint
      try {
        const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}`;
        const userIds = Array.from(new Set(rows.map((r: any) => r.user_id))).filter(Boolean);

        let rowsWithUsers = rows;

        if (userIds.length > 0) {
          const resp = await fetch(`${AUTH_SERVICE_URL}/api/users/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds })
          });

          if (resp.ok) {
            const json = await resp.json();
            const users = json?.data || [];
            const usersById = new Map(users.map((u: any) => [u.id, u]));

            rowsWithUsers = rows.map((r: any) => ({
              ...r,
              user: usersById.get(r.user_id) || null
            }));
          } else {
            console.warn('[listCvs] Auth service returned non-OK status', resp.status);
            // attach null users
            rowsWithUsers = rows.map((r: any) => ({ ...r, user: null }));
          }
        }

        return res.json({
          success: true,
          data: rowsWithUsers,
          pagination: {
            current: pageNum,
            pageSize: pageSizeNum,
            total
          }
        });
      } catch (authErr) {
        console.error('[listCvs] Failed to fetch user info from auth service:', authErr);
        // Return rows without user enrichment if auth service call fails
        return res.json({ 
          success: true, 
          data: rows,
          pagination: {
            current: pageNum,
            pageSize: pageSizeNum,
            total
          }
        });
      }
    } catch (err: any) {
      console.error('[listCvs] Error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Internal error' });
    }
  }) as RequestHandler,

  deleteCv: (async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const deleted = await CvModel.query().deleteById(id);
      if (!deleted) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error('deleteCv error', err);
      res.status(500).json({ error: 'Internal error' });
    }
  }) as RequestHandler,

  bulkDeleteCvs: (async (req: Request, res: Response): Promise<any> => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: 'ids array is required' });
        return;
      }

      const deleted = await CvModel.query().delete().whereIn('cv_id', ids);
      
      res.json({ 
        success: true, 
        deleted,
        message: `Deleted ${deleted} CV record(s)`
      });
    } catch (err) {
      console.error('bulkDeleteCvs error', err);
      res.status(500).json({ error: 'Internal error' });
    }
  }) as RequestHandler
};

export default CvController;
