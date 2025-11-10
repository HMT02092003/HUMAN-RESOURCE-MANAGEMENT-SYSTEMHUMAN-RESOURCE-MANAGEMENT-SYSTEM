// 1. Import từ thư viện MỚI '@google/genai'
import { GoogleGenAI } from '@google/genai';

// 2. Model MỚI (bạn đã test thành công)
const MODEL_NAME = 'gemini-2.5-flash';

export interface GeminiSkill {
  name: string;
  level: string;
}

export interface GeminiResponse {
  skills: GeminiSkill[];
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('[Gemini] GEMINI_API_KEY is not defined. AI analysis will not run.');
}

// 3. Khởi tạo client với apiKey và httpOptions
const client = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: { apiVersion: 'v1alpha' }
}) : null;

export async function analyzeCvText(cvText: string): Promise<GeminiResponse> {
  if (!client) {
    throw new Error('Gemini API key not configured. Cannot analyze CV.');
  }

  if (!cvText || cvText.trim().length === 0) {
    throw new Error('CV text is empty. Cannot analyze.');
  }

  const prompt = `You are an AI assistant that extracts technical and soft skills from a candidate CV.
Return ONLY valid JSON (no comments, no markdown) following this schema:
{
  "skills": [
    { "name": string, "level": string }
  ]
}
level must be one of: "A", "B", "C", "D", "E" (A best).
If you are unsure about a skill, omit it.

CV TEXT START
${cvText}
CV TEXT END`;

  try {
    // 4. Gọi theo đúng API: client.models.generateContent()
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });

    // 5. Lấy text từ response
    const raw = response && typeof response.text === 'string' ? response.text : '';

    if (!raw || raw.trim().length === 0) {
      throw new Error('Gemini returned empty or non-string text response');
    }

    // Clean JSON response
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // Validate và format response
    if (parsed && Array.isArray(parsed.skills)) {
      const allowedLevels = new Set(['A', 'B', 'C', 'D', 'E']);
      const finalResult = {
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

      console.log(`[Gemini] Successfully analyzed CV, extracted ${finalResult.skills.length} skills`);
      return finalResult;
    }

    throw new Error('Gemini returned invalid response format (missing skills array)');
  } catch (error) {
    console.error('[Gemini] Analysis failed:', error);
    throw new Error(`Gemini AI analysis failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Assess if a candidate can take on more work based on their current workload
 */
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
  if (!client) {
    // Fallback if Gemini not configured
    const canTake = params.totalEstimatedHours < 40;
    return {
      can_take_more_work: canTake,
      workload_assessment: canTake 
        ? 'Có thể nhận thêm công việc (Gemini không khả dụng)'
        : 'Đã quá tải (Gemini không khả dụng)',
      risk_level: params.totalEstimatedHours > 50 ? 'high' : params.totalEstimatedHours > 40 ? 'medium' : 'low'
    };
  }

  const taskList = params.currentTasks
    .map((t, i) => `${i + 1}. ${t.title} (${t.status}, ${t.estimated_hours}h)`)
    .join('\n');

  const prompt = `You are an AI workload management assistant in 2025. Assess employee capacity with modern work practices.

MODERN WORK CONTEXT (2025):
- Hybrid/Remote work: Flexible schedules, async communication
- AI-assisted development: 30-40% productivity boost from AI tools
- Focus time: Deep work blocks more valuable than total hours
- Burnout prevention: Mental health is priority, sustainable pace over crunch
- Agile sprints: 2-week cycles, capacity planning critical
- Work-life balance: Standard 40h/week, overtime exceptional not normal

CANDIDATE PROFILE:
Name: ${params.candidateName}
Current Workload:
- Active Tasks: ${params.totalTasks}
- Total Estimated Hours: ${params.totalEstimatedHours}h

CURRENT TASKS:
${taskList || '(No current tasks)'}

NEW TASK CONSIDERATION:
Title: ${params.newTaskTitle}
Estimated Hours: ${params.newTaskEstimatedHours}h

TOTAL IF ACCEPTED: ${params.totalEstimatedHours + params.newTaskEstimatedHours}h

ASSESSMENT CRITERIA (2025 Standards):
1. Capacity Thresholds:
   - 0-32h: Low load, can take more work (green zone)
   - 33-45h: Moderate load, selective acceptance (yellow zone)  
   - 46-55h: High load, risky to add more (orange zone)
   - 56h+: Overloaded, reject new work (red zone) 

2. Quality Factors:
   - Are existing tasks complex/high-priority?
   - Does new task require deep focus or can be done incrementally?
   - Is the team member already context-switching too much?

3. Sustainability:
   - Can this pace be maintained for 2+ weeks?
   - Is there buffer for unexpected issues/bugs?
   - Will this impact work-life balance?

4. Modern Considerations:
   - With AI tools, effective capacity is ~120% of traditional estimates
   - Async work allows better time management
   - But: Meetings, code reviews, pair programming add 10-15h overhead

Return ONLY valid JSON (no comments, no markdown):
{
  "can_take_more_work": boolean,
  "workload_assessment": string (detailed reasoning in Vietnamese, 2-3 sentences),
  "risk_level": "low" | "medium" | "high"
}

DECISION LOGIC:
- Low risk: Total < 40h, reasonable task distribution
- Medium risk: Total 40-50h, need to monitor closely
- High risk: Total > 50h, quality/health concerns

Respond in Vietnamese with empathy and practical advice.`;

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });

    const raw = response && typeof response.text === 'string' ? response.text : '';

    if (!raw || raw.trim().length === 0) {
      throw new Error('Gemini returned empty response');
    }

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      can_take_more_work: Boolean(parsed.can_take_more_work),
      workload_assessment: String(parsed.workload_assessment || 'Không có đánh giá'),
      risk_level: ['low', 'medium', 'high'].includes(parsed.risk_level) ? parsed.risk_level : 'medium'
    };
  } catch (error) {
    console.error('[Gemini] Workload assessment failed:', error);
    // Fallback simple logic
    const canTake = params.totalEstimatedHours + params.newTaskEstimatedHours < 45;
    return {
      can_take_more_work: canTake,
      workload_assessment: canTake 
        ? `Có thể nhận thêm (tổng ${params.totalEstimatedHours + params.newTaskEstimatedHours}h)`
        : `Có thể quá tải (tổng ${params.totalEstimatedHours + params.newTaskEstimatedHours}h)`,
      risk_level: params.totalEstimatedHours + params.newTaskEstimatedHours > 50 ? 'high' : 'medium'
    };
  }
}

export default analyzeCvText;