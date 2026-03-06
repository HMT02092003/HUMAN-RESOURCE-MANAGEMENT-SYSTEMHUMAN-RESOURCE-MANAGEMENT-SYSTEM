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
import AuthService from '../integrations/AuthService.ts';
import { getUserData } from '../utils/getUserData.ts';
import { fileURLToPath } from 'url';

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
      // Accept multiple naming conventions from frontend: page/pageSize OR page/limit, sortField OR sort, sortOrder OR order
      let { page = '1', pageSize = '10', sortField = 'uploaded_at', sortOrder = 'desc' } = req.query as any;
      // Fallbacks
      if (!pageSize && req.query.limit) pageSize = String(req.query.limit);
      if (!sortField && req.query.sort) sortField = String(req.query.sort);
      if (!sortOrder && req.query.order) sortOrder = String(req.query.order);

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(String(pageSize), 10)));
      const offset = (pageNum - 1) * pageSizeNum;

      const validSortFields = ['cv_id', 'user_id', 'file_path', 'uploaded_at'];
      const safeSortField = validSortFields.includes(sortField as string) ? (sortField as string) : 'uploaded_at';
      const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      // Prefer token from Authorization header, fall back to cookie token
      const headerAuth = (req.headers.authorization as string) || null;
      const cookieToken = (req as any).cookies?.token;
      const tokenToSend = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : null);

      const userData = getUserData(req);
      if (!tokenToSend && !userData) {
        console.warn('[listCvs] No token or user data provided');
        res.status(401).json({ success: false, message: 'Access token or user data required' });
        return;
      }

      // Check scope - auth-service trả về userIds đã filter theo scope
      const scopeResult = await AuthService.checkUserScope('CV', tokenToSend, userData as any);
      console.log('DEBUG - User scope result:', scopeResult);

      // Normalize userIds
      const allowedUserIds: number[] = (scopeResult?.userIds || [])
        .map((id: any) => Number(id))
        .filter((n: number) => !Number.isNaN(n));

      if (allowedUserIds.length === 0) {
        // Không có quyền truy cập bất kỳ CV nào
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            total: 0,
            totalPages: 0
          },
          total: 0
        });
      }

      console.log(`User has ${scopeResult.scope} scope access to ${allowedUserIds.length} users:`, allowedUserIds);


      // Build query with optional filters from query params
      const filePathFilter = (req.query.file_path as string) || (req.query.filePath as string) || undefined;
      const uploadedFrom = (req.query.uploaded_atFrom as string) || (req.query.uploadedAtFrom as string) || undefined;
      const uploadedTo = (req.query.uploaded_atTo as string) || (req.query.uploadedAtTo as string) || undefined;
      const fullNameFilter = (req.query.fullName as string) || (req.query.full_name as string) || undefined;

      // Start building base query
      let baseQuery = knex('cvs').select('cv_id', 'user_id', 'file_path', 'original_text', 'uploaded_at').whereIn('user_id', allowedUserIds);

      // Apply file_path text search (ILIKE)
      if (filePathFilter) {
        baseQuery = baseQuery.whereILike('file_path', `%${filePathFilter}%`);
      }

      // Apply uploaded_at range filters
      if (uploadedFrom && uploadedTo) {
        baseQuery = baseQuery.whereBetween('uploaded_at', [uploadedFrom, uploadedTo]);
      } else if (uploadedFrom) {
        baseQuery = baseQuery.where('uploaded_at', '>=', uploadedFrom);
      } else if (uploadedTo) {
        baseQuery = baseQuery.where('uploaded_at', '<=', uploadedTo);
      }

      // If searching by user full name, filter allowedUserIds down by querying AuthService for those users and matching names
      if (fullNameFilter) {
        try {
          const usersInfo = await AuthService.getUsersByIds(allowedUserIds, tokenToSend, (req as any).user);
          const matching = (usersInfo || []).filter((u: any) => {
            const name = (u.fullName || '').toString().toLowerCase();
            return name.includes(fullNameFilter.toLowerCase());
          }).map((u: any) => u.id);

          if (matching.length === 0) {
            return res.json({ success: true, data: [], pagination: { page: pageNum, pageSize: pageSizeNum, total: 0, totalPages: 0 }, total: 0 });
          }

          baseQuery = baseQuery.whereIn('user_id', matching);
        } catch (err) {
          console.error('Failed to filter users by name:', err);
        }
      }

      // Count total with same filters
      const countQuery = baseQuery.clone().clearSelect().count('* as count').first();

      // Apply ordering / limit / offset to baseQuery for rows
      const rows = await baseQuery.orderBy(safeSortField, safeSortOrder).limit(pageSizeNum).offset(offset);

      const countResult = await countQuery;
      const total = parseInt(String(countResult?.count || 0), 10);

      // Lấy thông tin user
      const userIds = [...new Set(rows.map((r: any) => r.user_id))];
      let rowsWithUsers = rows;

      if (userIds.length > 0) {
        try {
          const usersInfo = await AuthService.getUsersByIds(userIds, tokenToSend, (req as any).user);

          const usersById = new Map(usersInfo.map((u: any) => [
            u.id,
            {
              id: u.id,
              username: u.username,
              fullName: u.fullName || '',
              email: u.email,
              identificationPhoto: u.identificationPhoto
            }
          ]));

          // Fetch user skills from database
          const userSkills = await UserSkillModel.query()
            .select('user_skills.user_id', 'skills.skill_name', 'user_skills.proficiency_level')
            .join('skills', 'skills.skill_id', 'user_skills.skill_id')
            .whereIn('user_skills.user_id', userIds);

          const skillsByUser = userSkills.reduce((acc: any, item: any) => {
            if (!acc[item.user_id]) acc[item.user_id] = [];
            acc[item.user_id].push({
              skill_name: item.skill_name,
              proficiency_level: item.proficiency_level
            });
            return acc;
          }, {});

          rowsWithUsers = rows.map((r: any) => ({
            ...r,
            userInfo: usersById.get(r.user_id) || null,
            userSkills: skillsByUser[r.user_id] || []
          }));
        } catch (err) {
          console.error('Failed to fetch users or skills:', err);
          rowsWithUsers = rows.map((r: any) => ({ ...r, userInfo: null, userSkills: [] }));
        }
      }

      return res.json({
        success: true,
        data: rowsWithUsers,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum)
        },
        total
      });

    } catch (err: any) {
      console.error('[listCvs] Error:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Có lỗi xảy ra khi lấy danh sách CV'
      });
    }
  }) as RequestHandler,

  // Serve CV file by cv_id (looks up DB and streams file from uploads folder)
  serveCvFile: (async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const cv = await CvModel.query().findById(id);
      if (!cv || !cv.file_path) {
        return res.status(404).json({ success: false, message: 'CV not found' });
      }

      // Normalize and extract filename
      const normalized = cv.file_path.replace(/\\/g, '/').replace(/^\/+/, '');
      const parts = normalized.split('/');
      const filename = parts.pop();
      if (!filename) return res.status(404).json({ success: false, message: 'File not found' });

      // Resolve uploads folder relative to this file (safe regardless of cwd)
      const __filename = fileURLToPath(import.meta.url);
      const controllerDir = path.dirname(__filename); // src/controller
      const uploadsDir = path.resolve(controllerDir, '..', '..', 'uploads');
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found on disk' });
      }

      return res.sendFile(filePath);
    } catch (err: any) {
      console.error('serveCvFile error', err);
      return res.status(500).json({ success: false, message: err?.message || 'Internal error' });
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
