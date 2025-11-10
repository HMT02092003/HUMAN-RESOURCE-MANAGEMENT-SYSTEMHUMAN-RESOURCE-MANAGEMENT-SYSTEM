import { Request, Response, RequestHandler } from 'express';
import dayjs from 'dayjs';
import { transaction } from 'objection';
import knex from '../lib/database.ts';
import { generateUniqueTaskId } from '../ulitis/id-generator.ts';
// Using Project-based models instead of Job models
import ProjectSuggestionModel from '../Models/ProjectSuggestionModel.ts';
import { SkillModel } from '../Models/SkillModel.ts';
import { TaskModel } from '../Models/TaskModel.ts';
import { ProjectModel } from '../Models/ProjectModel.ts';
import { analyzeJobWithAI, JobAnalysisResult } from '../services/jobAnalysisService.ts';
import { findMatchingCandidates, CandidateMatch } from '../services/candidateMatchingService.ts';
import { assessWorkload } from '../services/geminiService.ts';
import { validate, ValidationException } from '../ulitis/validation-utility.ts';
import { getDecodedToken } from '../ulitis/decode-token.ts';
import getTokensFromRequest from '../ulitis/get-token.ts';
import { findOrCreateNormalizedSkill } from '../services/skillNormalizationService.ts';
import axios from 'axios';
const AuthServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

// Bind knex to models
ProjectSuggestionModel.knex(knex);
SkillModel.knex(knex);
TaskModel.knex(knex);
ProjectModel.knex(knex);

export class JobController {
  // Removed unused CRUD methods (getAll, getById, create, update, delete)
  // Frontend only uses: analyzeJob, findCandidates, createJobWithAnalysis

  /**
   * POST /jobs/analyze - Phân tích công việc bằng AI
   */
  static analyzeJob: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const allowFields = {
        title: 'string!',
        description: 'string!',
        project_id: 'number'
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

      // Lấy thông tin dự án nếu có project_id
      let projectContext = null;
      if (payload.project_id) {
        const project = await ProjectModel.query().findById(payload.project_id);
        if (project) {
          const today = dayjs();
          const endDate = dayjs(project.end_date);
          const daysRemaining = endDate.diff(today, 'day');
          
          projectContext = {
            name: project.name,
            start_date: project.start_date,
            end_date: project.end_date,
            days_remaining: daysRemaining,
            status: project.status
          };
          
          console.log(`[Job Controller] Project context: ${project.name}, ${daysRemaining} days remaining`);
        }
      }

      // Phân tích với AI (với context dự án)
      const analysis: JobAnalysisResult = await analyzeJobWithAI(
        payload.title,
        payload.description,
        projectContext
      );

      // Tìm hoặc tạo skills trong database với normalization
      const skillsWithIds: Array<{
        skill_id: number;
        skill_name: string;
        required_level: string;
        importance: string;
      }> = [];

      console.log(`[Job Controller] Normalizing ${analysis.required_skills.length} skills from Gemini...`);

      for (const reqSkill of analysis.required_skills) {
        // Use normalization service to find or create skill
        const skill = await findOrCreateNormalizedSkill(reqSkill.name);
        
        if (!skill) {
          console.log(`[Job Controller] Excluded skill: "${reqSkill.name}" (not a real technical skill)`);
          continue;
        }

        skillsWithIds.push({
          skill_id: skill.skill_id,
          skill_name: skill.skill_name,
          required_level: reqSkill.level,
          importance: reqSkill.importance
        });
      }

      console.log(`[Job Controller] Analyze returning ${skillsWithIds.length} skills (after normalization)`);

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
   * POST /jobs/find-candidates - Tìm ứng viên phù hợp VÀ kiểm tra workload
   */
  static findCandidates: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      // Normalize required_skills: convert object to array if needed (before validation)
      if (req.body.required_skills && !Array.isArray(req.body.required_skills)) {
        req.body.required_skills = Object.values(req.body.required_skills);
      }
      
      const allowFields = {
        job_id: 'string',
        job_title: 'string',
        job_estimated_hours: 'number',
        required_skills: 'array!',
        min_match_score: 'number',
        max_results: 'number',
        check_workload: 'boolean',
        project_id: 'number'
      };

      let payload: any;
      try {
        payload = validate(req.body, allowFields);
      } catch (error) {
        if (error instanceof ValidationException) {
          console.error('[JobController] Validation error:', error.message);
          res.status(error.status).json({ error: error.message });
          return;
        }
        throw error;
      }

      const {
        job_id,
        job_title = 'Công việc mới',
        job_estimated_hours = 0,
        required_skills,
        min_match_score = 0, // Changed from 50 to 0 - show all candidates
        max_results = 1000, // Increased to 1000 to show all candidates
        check_workload = true,
        project_id = null
      } = payload;

      console.log(`[Job Controller] Finding candidates for ${required_skills.length} required skills${project_id ? ` in project ${project_id}` : ''}`);

      // Tìm ứng viên phù hợp theo kỹ năng (chỉ trong project members)
      const candidates: CandidateMatch[] = await findMatchingCandidates(
        job_id || 'temp-job',
        required_skills,
        {
          minMatchScore: min_match_score,
          maxResults: max_results,
          includePartialMatches: true,
          project_id: project_id
        }
      );

      console.log(`[Job Controller] Found ${candidates.length} candidates by skills`);

      // Fetch user info for all candidates from Auth Service
      const AuthServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
      console.log('[Job Controller] Fetching user info from auth-service...');
      const userInfoMap = new Map<number, { fullName: string; email: string }>();
      
      try {
        // Batch fetch all user IDs at once using auth-service /api/users/bulk
        const userIds = candidates.map(c => c.user_id);
        const userResp = await axios.post(`${AuthServiceUrl}/api/users/bulk`, { userIds });
        const users = userResp.data?.data || userResp.data || [];
        
        users.forEach((user: any) => {
          userInfoMap.set(user.id, {
            fullName: user.fullName || user.username || `User ${user.id}`,
            email: user.email || ''
          });
        });
      } catch (error) {
        console.warn('[Job Controller] Batch fetch failed, using fallback names:', error);
        // Fallback: use User ID as name
        candidates.forEach(c => {
          userInfoMap.set(c.user_id, {
            fullName: `User ${c.user_id}`,
            email: ''
          });
        });
      }

      // Kiểm tra workload cho từng candidate nếu check_workload = true
      const candidatesWithWorkload = await Promise.all(
        candidates.map(async (candidate) => {
          const userInfo = userInfoMap.get(candidate.user_id) || { 
            fullName: `User ${candidate.user_id}`, 
            email: '' 
          };

          if (!check_workload) {
            return {
              ...candidate,
              fullName: userInfo.fullName,
              email: userInfo.email,
              current_workload_hours: null,
              can_take_more_work: true,
              workload_assessment: 'Không kiểm tra workload',
              risk_level: 'low' as const
            };
          }

          try {
            // Get current INCOMPLETE tasks for this user
            const tasks = await TaskModel.query()
              .where('assignee_id', candidate.user_id)
              .where(function() {
                this.where('status', 'todo')
                    .orWhere('status', 'in-progress')
                    .orWhere('status', 'in_progress');
              });

            const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            
            console.log(`[Job Controller] User ${candidate.user_id} (${userInfo.fullName}): ${tasks.length} active tasks, ${totalEstimatedHours}h`);

            // Simple rule-based assessment (no Gemini call for performance)
            const newTotal = totalEstimatedHours + job_estimated_hours;
            let can_take_more_work = true;
            let risk_level: 'low' | 'medium' | 'high' = 'low';
            let workload_assessment = '';

            if (newTotal >= 56) {
              can_take_more_work = false;
              risk_level = 'high';
              workload_assessment = `Quá tải: ${newTotal}h (hiện tại ${totalEstimatedHours}h + thêm ${job_estimated_hours}h). Vượt ngưỡng an toàn (56h). Không nên giao thêm việc.`;
            } else if (newTotal >= 45) {
              can_take_more_work = false;
              risk_level = 'high';
              workload_assessment = `Gần quá tải: ${newTotal}h (hiện tại ${totalEstimatedHours}h + thêm ${job_estimated_hours}h). Rủi ro cao về chất lượng và tiến độ.`;
            } else if (newTotal >= 35) {
              can_take_more_work = true;
              risk_level = 'medium';
              workload_assessment = `Tải vừa phải: ${newTotal}h (hiện tại ${totalEstimatedHours}h + thêm ${job_estimated_hours}h). Có thể nhận nhưng cần theo dõi sát.`;
            } else {
              can_take_more_work = true;
              risk_level = 'low';
              workload_assessment = `Còn dư dả: ${newTotal}h (hiện tại ${totalEstimatedHours}h + thêm ${job_estimated_hours}h). An toàn để nhận thêm công việc.`;
            }

            return {
              ...candidate,
              fullName: userInfo.fullName,
              email: userInfo.email,
              current_workload_hours: totalEstimatedHours,
              can_take_more_work,
              workload_assessment,
              risk_level
            };
          } catch (error) {
            console.error(`[Job Controller] Error checking workload for user ${candidate.user_id}:`, error);
            return {
              ...candidate,
              fullName: userInfo.fullName,
              email: userInfo.email,
              current_workload_hours: null,
              can_take_more_work: true,
              workload_assessment: 'Lỗi khi kiểm tra workload',
              risk_level: 'medium' as const
            };
          }
        })
      );

      // Filter out overloaded candidates if requested
      const availableCandidates = candidatesWithWorkload.filter(c => c.can_take_more_work);

      console.log(`[Job Controller] ${availableCandidates.length}/${candidatesWithWorkload.length} candidates available after workload check`);

      res.status(200).json({
        success: true,
        total_candidates: candidatesWithWorkload.length,
        available_candidates: availableCandidates.length,
        all_overloaded: availableCandidates.length === 0 && candidatesWithWorkload.length > 0,
        candidates: candidatesWithWorkload.map(c => ({
          user_id: c.user_id,
          fullName: c.fullName,
          email: c.email,
          match_score: c.match_score,
          overall_assessment: c.overall_assessment,
          matched_skills: c.matched_skills,
          missing_skills: c.missing_skills,
          skill_match_count: c.skill_match_count,
          total_required_skills: c.total_required_skills,
          current_workload_hours: c.current_workload_hours,
          can_take_more_work: c.can_take_more_work,
          workload_assessment: c.workload_assessment,
          risk_level: c.risk_level
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
      // Token already verified by authenticateToken middleware
      // User ID available in req.auth or req.user
      const decodedToken = (req as any).auth || (req as any).user;
      const userId = decodedToken?.user_id || decodedToken?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized - User ID not found in token' });
        return;
      }

      // Normalize required_skills: convert object to array if needed (before validation)
      if (req.body.required_skills && !Array.isArray(req.body.required_skills)) {
        req.body.required_skills = Object.values(req.body.required_skills);
      }

      const allowFields = {
        title: 'string!',
        description: 'string!',
        project_id: 'number',
        status: 'string',
        assigned_to_user_id: 'number',
        difficulty_level: 'number',
        estimated_hours: 'number',
        ai_analysis_result: 'string',
        required_skills: 'array!',
        tags: 'array',
        priority: 'string',
        due_date: 'string'
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
        const taskId = generateUniqueTaskId();

        // Parse ai_analysis_result if it's a string
        let aiAnalysis = null;
        if (payload.ai_analysis_result) {
          try {
            aiAnalysis = typeof payload.ai_analysis_result === 'string' 
              ? JSON.parse(payload.ai_analysis_result) 
              : payload.ai_analysis_result;
          } catch (e) {
            console.warn('[Job Controller] Failed to parse ai_analysis_result:', e);
          }
        }

        // Prepare tags field - must be array or null per DB schema
        let tagsArray = null;
        if (payload.tags && Array.isArray(payload.tags)) {
          tagsArray = payload.tags;
        } else if (payload.tags) {
          // If tags is not array, convert to array
          tagsArray = [payload.tags];
        }

        // Create task (not job - jobs table doesn't exist, use tasks table)
        const task = await TaskModel.query(trx).insert({
          task_id: taskId,
          title: payload.title,
          description: payload.description,
          project_id: payload.project_id || null,
          status: payload.status || 'todo',
          priority: payload.priority || 'medium',
          assignee_id: payload.assigned_to_user_id || null, // Note: tasks table uses assignee_id
          estimated_hours: payload.estimated_hours || null,
          due_date: payload.due_date || null,
          tags: tagsArray // Must be array or null
        });

        // Note: Skills are stored at project level (project_required_skills table)
        // Tasks don't have their own skill requirements table
        // If needed in future, create task_required_skills table

        await trx.commit();

        console.log(`[Job Controller] Task created successfully: ${taskId}`);

        res.status(201).json({
          success: true,
          task: {
            task_id: task.task_id,
            title: task.title,
            status: task.status,
            created_at: task.created_at
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

  /**
   * GET /jobs/users/:user_id/tasks - Lấy tất cả tasks hiện tại của user
   */
  static getUserTasks: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = req.params;

      if (!user_id) {
        res.status(400).json({ error: 'user_id is required' });
        return;
      }

      console.log(`[Job Controller] Getting tasks for user ${user_id}`);

      // Get all non-completed tasks assigned to this user
      const tasks = await TaskModel.query()
        .where('assignee_id', Number(user_id))
        .whereNot('status', 'done')
        .orderBy('created_at', 'desc');

      // Calculate total workload
      const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
      const totalActualHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);

      res.status(200).json({
        success: true,
        user_id: Number(user_id),
        total_tasks: tasks.length,
        total_estimated_hours: totalEstimatedHours,
        total_actual_hours: totalActualHours,
        tasks: tasks.map(t => ({
          task_id: t.task_id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          estimated_hours: t.estimated_hours,
          actual_hours: t.actual_hours,
          due_date: t.due_date,
          project_id: t.project_id
        }))
      });
    } catch (error: any) {
      console.error('[Job Controller] Error getting user tasks:', error);
      res.status(500).json({
        error: 'Failed to get user tasks',
        details: error.message
      });
    }
  };
}

export default JobController;
