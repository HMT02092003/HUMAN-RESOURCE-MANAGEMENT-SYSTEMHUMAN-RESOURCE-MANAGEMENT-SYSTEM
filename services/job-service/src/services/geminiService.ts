import { GoogleGenAI } from '@google/genai';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween.js';
import SkillModel from '../Models/SkillModel.ts';

dayjs.extend(isBetween);

// Model cascade from strongest to weakest based on user image
const MODEL_CASCADE = [
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-robotics-er-1.5-preview',
  'gemma-3-27b',
  'gemma-3-12b',
  'gemma-3-4b',
  'gemma-3-2b',
  'gemma-3-1b'
];

const MODEL_NAME = MODEL_CASCADE[0]; // Default to strongest
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('[Gemini] GEMINI_API_KEY chưa được cấu hình!');
}

const client = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    apiVersion: 'v1beta',
    timeout: 60000 // Increase timeout to 60 seconds for Gemini calls
  }
}) : null;

function ensureGeminiAvailable() {
  if (!client) {
    throw new Error('Gemini API key chưa được cấu hình. Vui lòng kiểm tra biến môi trường GEMINI_API_KEY.');
  }
}

/**
 * Helper function to call Gemini with model cascading
 * Tries models from strongest to weakest when rate limit is hit
 */
async function generateContentWithCascade(prompt: string): Promise<string> {
  ensureGeminiAvailable();

  let lastError: any = null;

  for (let i = 0; i < MODEL_CASCADE.length; i++) {
    const modelName = MODEL_CASCADE[i];

    try {
      console.log(`[Gemini] Trying model: ${modelName} (${i + 1}/${MODEL_CASCADE.length})`);

      const response = await client!.models.generateContent({
        model: modelName,
        contents: prompt
      });

      const text = response && typeof response.text === 'string' ? response.text : '';

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from model');
      }

      console.log(`✅ [Gemini] Success with model: ${modelName}`);
      return text;

    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || String(error);

      // Check if it's a rate limit or overloaded error that should trigger fallback
      const errorMsgLower = errorMsg.toLowerCase();
      const isRetryableError =
        errorMsg.includes('429') ||
        errorMsg.includes('503') ||
        errorMsg.includes('500') ||
        errorMsg.includes('404') ||
        errorMsgLower.includes('rate limit') ||
        errorMsgLower.includes('quota') ||
        errorMsgLower.includes('overloaded') ||
        errorMsgLower.includes('exhausted') ||
        errorMsgLower.includes('unavailable') ||
        errorMsgLower.includes('not found') ||
        errorMsgLower.includes('not_found') ||
        errorMsg.includes('RESOURCE_EXHAUSTED');

      if (isRetryableError) {
        console.warn(`⚠️ [Gemini] Model ${modelName} failed (retryable): ${errorMsg}`);

        // If not the last model, try next one
        if (i < MODEL_CASCADE.length - 1) {
          console.log(`🔄 [Gemini] Cascading to next model...`);
          continue;
        }
      }

      // For truly fatal errors or if we've exhausted all models
      console.error(`❌ [Gemini] Final error with model ${modelName}:`, errorMsg);
      throw error;
    }
  }

  // If we get here, all models failed with rate limit
  console.error('❌ [Gemini] All models exhausted due to rate limits');
  throw new Error(`All Gemini models are rate limited. Last error: ${lastError?.message || 'Unknown'}`);
}

/**
 * Helper function to safely parse JSON from Gemini response
 * Handles markdown code blocks and extra text before/after JSON
 */
function parseGeminiJSON(raw: string): any {
  if (!raw || raw.trim().length === 0) {
    throw new Error('Gemini trả về response rỗng');
  }

  let cleaned = raw.trim();

  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/i, '');

  // Extract JSON object by finding first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error('Không tìm thấy JSON object hợp lệ trong response');
  }

  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error('[Gemini] Failed to parse JSON. Raw response:', raw.substring(0, 500));
    throw new Error(`JSON parse failed: ${error.message}`);
  }
}

// Lower skill level by one rank: A->B, B->C, C->D, D->E, E->E
function lowerSkillLevel(level: string): string {
  const map: Record<string, string> = { A: 'B', B: 'C', C: 'D', D: 'E', E: 'E' };
  const k = String(level || 'C').toUpperCase().trim().charAt(0);
  return map[k] || 'C';
}

export interface GeminiSkill {
  name: string;
  level: string;
}

export interface GeminiResponse {
  skills: GeminiSkill[];
}

export interface RequiredSkill {
  name: string;
  level: string;
  importance: 'required' | 'preferred' | 'nice-to-have';
}

export interface JobAnalysisResult {
  difficulty_level: number;
  estimated_days: number;
  estimated_hours: number;
  required_skills: RequiredSkill[];
  summary: string;
  recommendations: string[];
}

export interface TaskOverlap {
  task_id: string;
  title: string;
  start_date: string;
  due_date: string;
  estimated_days: number;
  overlap_days: number;
}

export interface TimelineAssessment {
  can_schedule: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  overlapping_tasks: TaskOverlap[];
  total_overlap_days: number;
  recommendations: string[];
  ai_reasoning: string;
}

export async function analyzeCvText(cvText: string): Promise<GeminiResponse> {
  ensureGeminiAvailable();

  if (!cvText || cvText.trim().length === 0) {
    throw new Error('CV text trống. Không thể phân tích.');
  }

  const prompt = `Bạn là AI assistant trích xuất kỹ năng từ CV ứng viên.
Trả về ONLY valid JSON (không comment, không markdown):
{
  "skills": [
    { "name": string, "level": string }
  ]
}
level phải là: "A", "B", "C", "D", "E" (A là tốt nhất).

CV TEXT:
${cvText}`;

  try {
    const raw = await generateContentWithCascade(prompt);
    const parsed = parseGeminiJSON(raw);

    if (parsed && Array.isArray(parsed.skills)) {
      const allowedLevels = new Set(['A', 'B', 'C', 'D', 'E']);
      return {
        skills: parsed.skills
          .filter((item: any) => item && typeof item.name === 'string')
          .map((item: any) => {
            const level = String(item.level || '').toUpperCase();
            return {
              name: String(item.name).trim(),
              level: allowedLevels.has(level) ? level : 'C'
            };
          })
      };
    }

    throw new Error('Gemini response không có skills array');
  } catch (error: any) {
    console.error('[Gemini CV Analysis] Lỗi:', error);
    throw new Error(`❌ Gemini AI phân tích CV thất bại: ${error.message}. Vui lòng thử lại sau.`);
  }
}

export async function analyzeJobWithAI(
  title: string,
  description: string,
  projectContext?: {
    name: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
    status: string;
  } | null,
  taskTimeline?: {
    start_date: string;
    due_date: string;
  } | null
): Promise<JobAnalysisResult> {
  ensureGeminiAvailable();

  if (!title || !description) {
    throw new Error('Title và description là bắt buộc để phân tích task.');
  }

  let fixedEstimatedDays: number | null = null;
  let timelineInfo = '';

  if (taskTimeline && taskTimeline.start_date && taskTimeline.due_date) {
    const start = new Date(taskTimeline.start_date);
    const end = new Date(taskTimeline.due_date);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      fixedEstimatedDays = diffDays;
      timelineInfo = `
TIMELINE CỐ ĐỊNH: ${fixedEstimatedDays} NGÀY (${taskTimeline.start_date} → ${taskTimeline.due_date})
Thời gian đã cố định. Đề xuất kỹ năng phù hợp với timeline này.
- Timeline ngắn → skill level CAO HƠN (A, B)
- Timeline dài → skill level THẤP HƠN (C, D, E)
`;
    }
  }

  const projectInfo = projectContext
    ? `Project: ${projectContext.name} (còn ${projectContext.days_remaining} ngày)\n`
    : '';

  const prompt = `${projectInfo}${timelineInfo}
TASK:
- Tiêu đề: ${title}
- Mô tả: ${description}

TIÊU CHÍ ĐÁNH GIÁ THỰC TẾ:
- 1 màn hình UI đơn giản (form CRUD): Junior làm ~1 ngày, Mid ~0.5 ngày, Senior ~0.25 ngày
- 1 API endpoint đơn giản (CRUD): Junior ~0.5 ngày, Mid ~0.25 ngày, Senior ~0.1 ngày
- Tích hợp AI/ML phức tạp: Junior ~5-7 ngày, Mid ~3-4 ngày, Senior ~2-3 ngày
- Setup infrastructure (Docker, CI/CD): Mid ~1-2 ngày, Senior ~0.5-1 ngày

${fixedEstimatedDays !== null ? `⚠️ TIMELINE ĐÃ CỐ ĐỊNH: ${fixedEstimatedDays} NGÀY - Đề xuất skill level phù hợp với thời gian này.` : 'Ước tính số NGÀY dựa trên độ phức tạp thực tế.'}

Phân tích và trả về JSON:
{
  "difficulty_level": number (1-5),
  "estimated_days": number (${fixedEstimatedDays !== null ? `phải là ${fixedEstimatedDays}` : 'số ngày thực tế'}),
  "required_skills": [
    {
      "name": string (tên skill cụ thể: React, Node.js, PostgreSQL...),
      "level": string (A=Expert, B=Advanced, C=Intermediate, D=Basic, E=Beginner),
      "importance": string (required | preferred | nice-to-have)
    }
  ],
  "summary": string (tiếng Việt, ngắn gọn),
  "recommendations": [string] (2-3 gợi ý thực tế)
}`;

  try {
    const raw = await generateContentWithCascade(prompt);
    const parsed = parseGeminiJSON(raw);

    if (!parsed.difficulty_level || !parsed.estimated_days || !Array.isArray(parsed.required_skills)) {
      throw new Error('Gemini response thiếu trường bắt buộc');
    }

    const allowedLevels = new Set(['A', 'B', 'C', 'D', 'E']);
    const allowedImportance = new Set(['required', 'preferred', 'nice-to-have']);

    // Normalize and LOWER the suggested skill level by one rank per user's preference
    const normalizedSkills: RequiredSkill[] = parsed.required_skills
      .filter((skill: any) => skill && skill.name)
      .map((skill: any) => {
        const rawLevel = String(skill.level || 'C').toUpperCase();
        const importance = String(skill.importance || 'preferred').toLowerCase();

        const chosenLevel = allowedLevels.has(rawLevel) ? rawLevel : 'C';
        const lowered = lowerSkillLevel(chosenLevel);

        return {
          name: String(skill.name).trim(),
          level: lowered,
          importance: allowedImportance.has(importance)
            ? (importance as 'required' | 'preferred' | 'nice-to-have')
            : 'preferred'
        };
      });

    // Recommendations from AI (if any)
    const recs: string[] = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r: any) => String(r))
      : [];

    // If timeline is fixed, add a short OT reminder/guideline to recommendations
    const finalEstimatedDays = fixedEstimatedDays !== null ? fixedEstimatedDays : Math.max(1, Math.round(parsed.estimated_days));
    if (fixedEstimatedDays !== null) {
      recs.unshift(`Nếu công việc chưa hoàn thành trong ${finalEstimatedDays} ngày, nhân sự cần chủ động OT để kịp deadline.`);
    }

    return {
      difficulty_level: Math.max(1, Math.min(5, Math.round(parsed.difficulty_level))),
      estimated_days: finalEstimatedDays,
      estimated_hours: finalEstimatedDays * 8,
      required_skills: normalizedSkills,
      summary: String(parsed.summary || 'Phân tích AI hoàn tất'),
      recommendations: recs
    };
  } catch (error: any) {
    // If Gemini fails, fallback to rule-based heuristic instead of throwing so callers still get useful data
    console.warn('[Gemini Job Analysis] Gemini unavailable or returned invalid response, using fallback heuristics:', error?.message || error);

    // fallback hours if timeline fixed or default 8h
    const fallbackHours = fixedEstimatedDays !== null ? fixedEstimatedDays * 8 : 8;
    const fallbackDays = Math.max(1, Math.ceil(fallbackHours / 8));

    function deriveFallbackSkills(titleStr: string, desc: string, hours: number) {
      const text = `${titleStr} ${desc}`.toLowerCase();
      const skills: RequiredSkill[] = [];

      if (text.includes('api') || text.includes('endpoint') || text.includes('rest')) {
        skills.push({ name: 'REST API Development', level: hours <= 8 ? 'B' : 'C', importance: 'required' });
      }
      if (text.includes('react') || text.includes('frontend') || text.includes('ui') || text.includes('ux')) {
        skills.push({ name: 'React', level: hours <= 8 ? 'B' : 'C', importance: 'required' });
      }
      if (text.includes('database') || text.includes('sql') || text.includes('postgres') || text.includes('mysql')) {
        skills.push({ name: 'SQL / Database', level: 'B', importance: 'required' });
      }
      if (text.includes('auth') || text.includes('login') || text.includes('jwt') || text.includes('oauth')) {
        skills.push({ name: 'Authentication & Authorization', level: 'B', importance: 'required' });
      }
      if (text.includes('ml') || text.includes('model') || text.includes('machine learning')) {
        skills.push({ name: 'Machine Learning / Model Integration', level: 'A', importance: 'required' });
      }

      if (skills.length === 0) {
        const defaultLevel = fallbackDays <= 1 ? 'B' : 'C';
        skills.push({ name: 'Problem Solving', level: defaultLevel, importance: 'required' });
        skills.push({ name: 'TypeScript / JavaScript', level: defaultLevel, importance: 'preferred' });
      }

      // Lower levels one rank as global policy
      return skills.map(s => ({ name: s.name, level: lowerSkillLevel(String(s.level || 'C')), importance: s.importance }));
    }

    const fallbackSkills = deriveFallbackSkills(title, description, fallbackHours);

    const fallbackRecommendations = [
      `Phân tích heuristic: công việc ước tính ${fallbackDays} ngày (${fallbackHours}h).`,
      'AI tạm unavailable — kiểm tra và điều chỉnh thời gian/kỹ năng nếu cần.'
    ];

    return {
      difficulty_level: 3,
      estimated_days: fallbackDays,
      estimated_hours: fallbackHours,
      required_skills: fallbackSkills,
      summary: `Phân tích tự động (AI tạm thời không khả dụng). Công việc "${title}" được ước tính ${fallbackDays} ngày (${fallbackHours}h).`,
      recommendations: fallbackRecommendations
    };
  }
}

export async function assessWorkload(params: {
  candidateName: string;
  totalTasks: number;
  totalEstimatedHours: number;
  currentTasks: Array<{ title: string; status: string; estimated_hours: number }>;
  newTaskTitle: string;
  newTaskEstimatedHours: number;
}): Promise<{
  can_take_more_work: boolean;
  workload_assessment: string;
  risk_level: 'low' | 'medium' | 'high';
}> {
  ensureGeminiAvailable();

  const totalDays = Math.ceil(params.totalEstimatedHours / 8);
  const newTaskDays = Math.ceil(params.newTaskEstimatedHours / 8);
  const totalIfAccepted = totalDays + newTaskDays;

  const taskList = params.currentTasks
    .map((t, i) => `${i + 1}. ${t.title} (${t.status}, ${Math.ceil(t.estimated_hours / 8)} ngày)`)
    .join('\n');

  const prompt = `Đánh giá workload nhân viên ${params.candidateName}.

Task hiện tại: ${params.totalTasks} (${totalDays} ngày)
${taskList}

Task mới: ${params.newTaskTitle} (${newTaskDays} ngày)
Tổng nếu nhận: ${totalIfAccepted} ngày

Tiêu chí: 0-10d=low, 11-15d=medium, >15d=high

Trả về JSON:
{
  "can_take_more_work": boolean,
  "workload_assessment": string (tiếng Việt),
  "risk_level": "low" | "medium" | "high"
}`;

  try {
    const raw = await generateContentWithCascade(prompt);
    const parsed = parseGeminiJSON(raw);

    return {
      can_take_more_work: Boolean(parsed.can_take_more_work),
      workload_assessment: String(parsed.workload_assessment || 'Không có đánh giá'),
      risk_level: ['low', 'medium', 'high'].includes(parsed.risk_level) ? parsed.risk_level : 'medium'
    };
  } catch (error: any) {
    // Gemini overload (429/503) -> dùng fallback logic, KHÔNG throw error
    if (error.status === 429 || error.status === 503) {
      const newTotal = totalIfAccepted;
      let can_take_more_work = true;
      let risk_level: 'low' | 'medium' | 'high' = 'low';

      if (newTotal > 15) {
        can_take_more_work = false;
        risk_level = 'high';
      } else if (newTotal > 10) {
        risk_level = 'medium';
      }

      return {
        can_take_more_work,
        workload_assessment: `Tổng: ${newTotal} ngày. AI tạm unavailable - đánh giá tự động.`,
        risk_level
      };
    }

    // Lỗi khác -> throw
    console.error('[Gemini Workload] Lỗi:', error);
    throw new Error(`❌ Gemini đánh giá workload thất bại: ${error.message}. Vui lòng thử lại.`);
  }
}

export async function analyzeTaskTimeline(params: {
  newTask: {
    title: string;
    start_date: string;
    due_date: string;
    estimated_hours: number;
  };
  userTasks: Array<{
    task_id: string;
    title: string;
    start_date?: string | null;
    due_date?: string | null;
    estimated_hours: number;
    status: string;
    priority: string;
  }>;
  userName: string;
  projectContext?: {
    name: string;
    deadline: string;
    status: string;
  };
}): Promise<TimelineAssessment> {
  ensureGeminiAvailable();

  const { newTask, userTasks, userName, projectContext } = params;

  const newStart = dayjs(newTask.start_date);
  const newEnd = dayjs(newTask.due_date);

  if (!newStart.isValid() || !newEnd.isValid()) {
    throw new Error('Ngày không hợp lệ. Dùng YYYY-MM-DD');
  }

  if (newEnd.isBefore(newStart)) {
    throw new Error('due_date phải sau start_date');
  }

  const overlappingTasks: TaskOverlap[] = [];
  let totalOverlapHours = 0;

  const incompleteTasks = userTasks.filter(
    t => t.status !== 'done' && t.status !== 'cancelled'
  );

  for (const task of incompleteTasks) {
    if (!task.due_date) continue;

    const taskStart = task.start_date ? dayjs(task.start_date) : dayjs();
    const taskEnd = dayjs(task.due_date);
    if (!taskEnd.isValid()) continue;

    const hasOverlap =
      newStart.isBetween(taskStart, taskEnd, 'day', '[]') ||
      newEnd.isBetween(taskStart, taskEnd, 'day', '[]') ||
      taskStart.isBetween(newStart, newEnd, 'day', '[]') ||
      taskEnd.isBetween(newStart, newEnd, 'day', '[]');

    if (hasOverlap) {
      const overlapStart = newStart.isAfter(taskStart) ? newStart : taskStart;
      const overlapEnd = newEnd.isBefore(taskEnd) ? newEnd : taskEnd;
      const overlapDays = overlapEnd.diff(overlapStart, 'day') + 1;

      overlappingTasks.push({
        task_id: task.task_id,
        title: task.title,
        start_date: taskStart.format('YYYY-MM-DD'),
        due_date: taskEnd.format('YYYY-MM-DD'),
        estimated_days: Math.ceil(task.estimated_hours / 8),
        overlap_days: overlapDays
      });

      totalOverlapHours += task.estimated_hours || 0;
    }
  }

  const totalOverlapDays = Math.ceil(totalOverlapHours / 8);
  const newTaskDays = Math.ceil(newTask.estimated_hours / 8);

  const taskListStr = overlappingTasks
    .map((t, i) => `${i + 1}. ${t.title} (${t.start_date}→${t.due_date}, ${t.estimated_days}d)`)
    .join('\n');

  const projectInfo = projectContext ? `Project: ${projectContext.name}` : '';

  const prompt = `Timeline conflict - ${userName}
${projectInfo}

Task mới: ${newTask.title} (${newTask.start_date}→${newTask.due_date}, ${newTaskDays}d)
Tasks trùng (${overlappingTasks.length}): ${totalOverlapDays}d
${taskListStr}

Tổng: ${totalOverlapDays + newTaskDays}d

Trả về JSON:
{
  "can_schedule": boolean,
  "risk_level": "low" | "medium" | "high" | "critical",
  "recommendations": [string],
  "ai_reasoning": string
}`;

  try {
    const raw = await generateContentWithCascade(prompt);
    const parsed = parseGeminiJSON(raw);

    return {
      can_schedule: Boolean(parsed.can_schedule),
      risk_level: ['low', 'medium', 'high', 'critical'].includes(parsed.risk_level)
        ? parsed.risk_level
        : 'medium',
      overlapping_tasks: overlappingTasks,
      total_overlap_days: totalOverlapDays,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map((r: any) => String(r))
        : [],
      ai_reasoning: String(parsed.ai_reasoning || 'Phân tích hoàn tất')
    };
  } catch (error: any) {
    // Gemini overload -> dùng simple fallback
    if (error.status === 429 || error.status === 503) {
      const daysInPeriod = newEnd.diff(newStart, 'day') + 1;
      const totalDays = totalOverlapDays + newTaskDays;
      const daysPerDay = totalDays / daysInPeriod;

      return {
        can_schedule: daysPerDay <= 1.5,
        risk_level: (daysPerDay > 2 ? 'critical' : daysPerDay > 1.5 ? 'high' : daysPerDay > 1 ? 'medium' : 'low') as any,
        overlapping_tasks: overlappingTasks,
        total_overlap_days: totalOverlapDays,
        recommendations: [`Trung bình ${daysPerDay.toFixed(1)} task/ngày. AI unavailable - đánh giá tự động.`],
        ai_reasoning: 'AI tạm thời unavailable, dùng logic đơn giản.'
      };
    }

    console.error('[Gemini Timeline] Lỗi:', error);
    throw new Error(`❌ Gemini phân tích timeline thất bại: ${error.message}. Vui lòng thử lại.`);
  }
}

export function generateJobPromptSuggestions(_context?: string): string[] {
  return [
    'Xây dựng API RESTful với JWT authentication',
    'Thiết kế UI/UX dashboard với biểu đồ thống kê',
    'Tối ưu database queries và caching',
    'Viết unit tests cho module thanh toán',
    'Tích hợp AI chatbot vào website'
  ];
}

/**
 * Validate task dependencies - kiểm tra các task phụ thuộc đã hoàn thành chưa
 * This is a small pure utility moved here so controllers don't need to import a separate file.
 */
export async function validateTaskDependencies(params: {
  depends_on: string[]; // Array of task_ids
  allProjectTasks: Array<{
    task_id: string;
    title: string;
    status: string;
    due_date?: string | null;
  }>;
}): Promise<{
  valid: boolean;
  blocking_tasks: Array<{
    task_id: string;
    title: string;
    status: string;
    issue: string;
  }>;
  recommendations: string[];
}> {
  const { depends_on, allProjectTasks } = params;

  if (!depends_on || depends_on.length === 0) {
    return {
      valid: true,
      blocking_tasks: [],
      recommendations: []
    };
  }

  const blockingTasks: Array<{ task_id: string; title: string; status: string; issue: string }> = [];

  for (const depTaskId of depends_on) {
    const depTask = allProjectTasks.find(t => t.task_id === depTaskId);

    if (!depTask) {
      blockingTasks.push({
        task_id: depTaskId,
        title: 'Unknown Task',
        status: 'not_found',
        issue: 'Task phụ thuộc không tồn tại trong dự án'
      });
      continue;
    }

    if (depTask.status !== 'done') {
      blockingTasks.push({
        task_id: depTask.task_id,
        title: depTask.title,
        status: depTask.status,
        issue: `Task phụ thuộc chưa hoàn thành (${depTask.status})`
      });
    }
  }

  const valid = blockingTasks.length === 0;

  return {
    valid,
    blocking_tasks: blockingTasks,
    recommendations: valid
      ? []
      : [
        'Không thể bắt đầu task này khi các task phụ thuộc chưa hoàn thành',
        'Đề xuất: Đợi các task phụ thuộc xong hoặc loại bỏ dependency nếu không cần thiết'
      ]
  };
}

// -------------------------
// DB-first skill normalization (moved from skillNormalizationService.ts)
// -------------------------

const normalizationCache = new Map<string, string | null>();

const EXCLUDED_TERMS = [
  'vs code', 'visual studio code', 'intellij', 'pycharm', 'android studio', 'xcode',
  'frontend developer', 'backend developer', 'full stack', 'software engineer', 'developer',
  'programming', 'coding', 'development', 'management'
];

function shouldExcludeSkill(name: string): boolean {
  if (!name) return true;
  const n = name.toLowerCase().trim();
  return EXCLUDED_TERMS.includes(n);
}

export async function findOrCreateNormalizedSkill(
  rawSkillName: string,
  trx?: any
): Promise<{ skill_id: number; skill_name: string } | null> {
  if (!rawSkillName || typeof rawSkillName !== 'string') return null;

  const clean = rawSkillName.trim();
  const cacheKey = clean.toLowerCase();

  if (normalizationCache.has(cacheKey)) {
    const cached = normalizationCache.get(cacheKey);
    return cached ? { skill_id: -1, skill_name: cached } : null;
  }

  if (shouldExcludeSkill(clean)) {
    normalizationCache.set(cacheKey, null);
    return null;
  }

  const query = trx ? SkillModel.query(trx) : SkillModel.query();

  // exact case-insensitive match
  const exact = await query.whereRaw('LOWER(skill_name) = ?', [clean.toLowerCase()]).first();
  if (exact) {
    normalizationCache.set(cacheKey, exact.skill_name);
    return { skill_id: exact.skill_id, skill_name: exact.skill_name };
  }

  // fuzzy match
  const fuzzy = await query.whereRaw('LOWER(skill_name) LIKE ?', [`%${clean.toLowerCase()}%`]).limit(3);
  if (fuzzy && fuzzy.length > 0) {
    normalizationCache.set(cacheKey, fuzzy[0].skill_name);
    return { skill_id: fuzzy[0].skill_id, skill_name: fuzzy[0].skill_name };
  }

  // create
  const inserted = await (trx ? SkillModel.query(trx) : SkillModel.query()).insert({ skill_name: clean }).returning('*');
  const created = Array.isArray(inserted) ? inserted[0] : inserted;
  normalizationCache.set(cacheKey, created.skill_name);
  return { skill_id: created.skill_id, skill_name: created.skill_name };
}

export async function normalizeSkillBatch(rawSkills: string[]): Promise<Array<{ skill_id: number; skill_name: string }>> {
  const results = await Promise.all(rawSkills.map(s => findOrCreateNormalizedSkill(s)));
  return results.filter((r): r is { skill_id: number; skill_name: string } => r !== null);
}

export async function findSimilarSkills(targetSkillName: string, threshold: number = 70) {
  if (!targetSkillName) return [];
  const allSkills = await SkillModel.query();
  const t = targetSkillName.toLowerCase();

  const candidates = allSkills
    .map(s => ({ skill_id: s.skill_id, skill_name: s.skill_name, similarity: similarityScore(t, s.skill_name.toLowerCase()) }))
    .filter(x => x.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);

  return candidates;
}

function similarityScore(a: string, b: string): number {
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 85;
  const as = new Set(a.split(/[^a-z0-9]+/));
  const bs = new Set(b.split(/[^a-z0-9]+/));
  let common = 0;
  as.forEach(tok => { if (bs.has(tok) && tok) common++; });
  const score = Math.min(100, Math.round((common / Math.max(as.size, 1)) * 100));
  return score;
}

export default {
  analyzeCvText,
  analyzeJobWithAI,
  assessWorkload,
  analyzeTaskTimeline,
  generateJobPromptSuggestions,
  // Export DB-first normalization helpers as part of the consolidated service
  findOrCreateNormalizedSkill,
  normalizeSkillBatch,
  findSimilarSkills
};
