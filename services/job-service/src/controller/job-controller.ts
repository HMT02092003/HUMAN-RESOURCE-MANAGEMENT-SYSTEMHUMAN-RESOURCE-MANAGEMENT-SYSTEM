import { Request, Response, RequestHandler } from 'express';
import dayjs from 'dayjs';
import { randomUUID } from 'node:crypto';
import { transaction } from 'objection';
import knex from '../lib/database.ts';
import { JobModel } from '../Models/JobModel.ts';
import { JobRequiredSkillModel } from '../Models/JobRequiredSkillModel.ts';
import { JobSuggestionModel } from '../Models/JobSuggestionModel.ts';
import { SkillModel } from '../Models/SkillModel.ts';
import { analyzeJobWithAI, JobAnalysisResult } from '../services/jobAnalysisService.ts';
import { findMatchingCandidates, CandidateMatch } from '../services/candidateMatchingService.ts';
import { validate, ValidationException } from '../ulitis/validation-utility.ts';
import { getDecodedToken } from '../ulitis/decode-token.ts';
import getTokensFromRequest from '../ulitis/get-token.ts';

JobModel.knex(knex);
JobRequiredSkillModel.knex(knex);
JobSuggestionModel.knex(knex);
SkillModel.knex(knex);

export class JobController {
  static getAll: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({ success: true, data: [], timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  static getById: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      res.json({ success: true, data: { id }, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  static create: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body;
      res.status(201).json({ success: true, data, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  static update: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body;
      res.json({ success: true, data: { id, ...data }, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  static delete: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      res.json({ success: true, message: `Deleted ${id}`, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  /**
   * POST /jobs/analyze - Phân tích công việc bằng AI
   */
  static analyzeJob: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const allowFields = {
        title: 'string!',
        description: 'string!',
        project_id: 'string'
      };

      let payload: any;
      try {
        payload = validate(req.body, allowFields);
      } catch (error) {
        if (error instanceof ValidationException) {
          res.status(error.status).json({ error: error.message });
          return;
        }
        throw error;
      }

      console.log('[Job Controller] Analyzing job:', payload.title);

      // Phân tích với AI
      const analysis: JobAnalysisResult = await analyzeJobWithAI(
        payload.title,
        payload.description
      );

      // Tìm hoặc tạo skills trong database
      const skillsWithIds: Array<{
        skill_id: number;
        skill_name: string;
        required_level: string;
        importance: string;
      }> = [];

      for (const reqSkill of analysis.required_skills) {
        let skill = await SkillModel.query()
          .where('skill_name', reqSkill.name)
          .first();

        if (!skill) {
          // Auto-create skill nếu chưa có
          skill = await SkillModel.query().insert({
            skill_name: reqSkill.name
          });
          console.log(`[Job Controller] Created new skill: ${reqSkill.name}`);
        }

        skillsWithIds.push({
          skill_id: skill.skill_id,
          skill_name: skill.skill_name,
          required_level: reqSkill.level,
          importance: reqSkill.importance
        });
      }

      // Return analysis result with skill IDs
      res.status(200).json({
        success: true,
        analysis: {
          difficulty_level: analysis.difficulty_level,
          estimated_hours: analysis.estimated_hours,
          summary: analysis.summary,
          recommendations: analysis.recommendations,
          required_skills: skillsWithIds
        }
      });
    } catch (error: any) {
      console.error('[Job Controller] Error analyzing job:', error);
      res.status(500).json({
        error: 'Failed to analyze job',
        details: error.message
      });
    }
  };

  /**
   * POST /jobs/find-candidates - Tìm ứng viên phù hợp
   */
  static findCandidates: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const allowFields = {
        job_id: 'string',
        required_skills: 'array!',
        min_match_score: 'number',
        max_results: 'number'
      };

      let payload: any;
      try {
        payload = validate(req.body, allowFields);
      } catch (error) {
        if (error instanceof ValidationException) {
          res.status(error.status).json({ error: error.message });
          return;
        }
        throw error;
      }

      const {
        job_id,
        required_skills,
        min_match_score = 50,
        max_results = 20
      } = payload;

      console.log(`[Job Controller] Finding candidates for ${required_skills.length} required skills`);

      // Tìm ứng viên phù hợp
      const candidates: CandidateMatch[] = await findMatchingCandidates(
        job_id || 'temp-job',
        required_skills,
        {
          minMatchScore: min_match_score,
          maxResults: max_results,
          includePartialMatches: true
        }
      );

      res.status(200).json({
        success: true,
        total_candidates: candidates.length,
        candidates: candidates.map(c => ({
          user_id: c.user_id,
          match_score: c.match_score,
          overall_assessment: c.overall_assessment,
          matched_skills: c.matched_skills,
          missing_skills: c.missing_skills,
          skill_match_count: c.skill_match_count,
          total_required_skills: c.total_required_skills
        }))
      });
    } catch (error: any) {
      console.error('[Job Controller] Error finding candidates:', error);
      res.status(500).json({
        error: 'Failed to find candidates',
        details: error.message
      });
    }
  };

  /**
   * POST /jobs/create-with-analysis - Tạo job sau khi AI analysis
   */
  static createJobWithAnalysis: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accessToken } = getTokensFromRequest(req);
      
      if (!accessToken) {
        res.status(401).json({ error: 'Unauthorized - No access token' });
        return;
      }

      const decodedToken = getDecodedToken(accessToken);
      const userId = decodedToken?.user_id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const allowFields = {
        title: 'string!',
        description: 'string!',
        project_id: 'string',
        status: 'string',
        assigned_to_user_id: 'number',
        difficulty_level: 'number',
        estimated_hours: 'number',
        ai_analysis_result: 'string',
        required_skills: 'array!'
      };

      let payload: any;
      try {
        payload = validate(req.body, allowFields);
      } catch (error) {
        if (error instanceof ValidationException) {
          res.status(error.status).json({ error: error.message });
          return;
        }
        throw error;
      }

      const trx = await transaction.start(knex);

      try {
        const jobId = randomUUID();

        // Create job
        const job = await JobModel.query(trx).insert({
          job_id: jobId,
          title: payload.title,
          description: payload.description,
          project_id: payload.project_id || null,
          status: payload.status || 'todo',
          created_by_user_id: userId,
          assigned_to_user_id: payload.assigned_to_user_id || null,
          ai_analysis_status: 'completed',
          difficulty_level: payload.difficulty_level || null,
          estimated_hours: payload.estimated_hours || null,
          ai_analysis_result: payload.ai_analysis_result || null
        });

        // Insert required skills
        if (payload.required_skills && payload.required_skills.length > 0) {
          const skillInserts = payload.required_skills.map((skill: any) => ({
            job_id: jobId,
            skill_id: skill.skill_id,
            proficiency_level: skill.proficiency_level || 'C'
          }));

          await JobRequiredSkillModel.query(trx).insert(skillInserts);
          console.log(`[Job Controller] Inserted ${skillInserts.length} required skills`);
        }

        await trx.commit();

        console.log(`[Job Controller] Job created successfully: ${jobId}`);

        res.status(201).json({
          success: true,
          job: {
            job_id: job.job_id,
            title: job.title,
            status: job.status,
            created_at: job.created_at
          }
        });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error: any) {
      console.error('[Job Controller] Error creating job:', error);
      res.status(500).json({
        error: 'Failed to create job',
        details: error.message
      });
    }
  };
}

export default JobController;
