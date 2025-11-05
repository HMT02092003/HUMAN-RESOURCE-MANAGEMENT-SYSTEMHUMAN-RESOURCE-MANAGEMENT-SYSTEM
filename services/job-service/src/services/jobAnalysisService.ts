import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = 'gemini-2.5-flash';
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('[Job Analysis] GEMINI_API_KEY is not defined. AI analysis will not run.');
}

const client = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: { apiVersion: 'v1alpha' }
}) : null;

export interface RequiredSkill {
  name: string;
  level: string; // A, B, C, D, E
  importance: 'required' | 'preferred' | 'nice-to-have';
}

export interface JobAnalysisResult {
  difficulty_level: number; // 1-5
  estimated_hours: number;
  required_skills: RequiredSkill[];
  summary: string;
  recommendations: string[];
}

/**
 * Phân tích công việc bằng Gemini AI
 * @param title - Tiêu đề công việc
 * @param description - Mô tả chi tiết công việc
 * @returns JobAnalysisResult
 */
export async function analyzeJobWithAI(
  title: string,
  description: string
): Promise<JobAnalysisResult> {
  if (!client) {
    throw new Error('Gemini API key not configured. Cannot analyze job.');
  }

  if (!title || !description) {
    throw new Error('Title and description are required for job analysis.');
  }

  const prompt = `You are an expert technical project manager and HR specialist. Analyze this job/task and provide detailed insights.

JOB TITLE: ${title}

JOB DESCRIPTION:
${description}

Analyze and return ONLY valid JSON (no markdown, no comments) with this exact structure:
{
  "difficulty_level": <number 1-5, where 1=very easy, 5=very hard>,
  "estimated_hours": <number, estimated hours needed to complete>,
  "required_skills": [
    {
      "name": "<skill name>",
      "level": "<A|B|C|D|E, where A=expert, E=beginner>",
      "importance": "<required|preferred|nice-to-have>"
    }
  ],
  "summary": "<brief analysis of the job complexity and requirements>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "..."]
}

Guidelines:
- difficulty_level: Consider technical complexity, business impact, time pressure
- estimated_hours: Be realistic based on task scope
- required_skills: List 3-10 most relevant skills (technical + soft skills)
- level: A (expert 5+ years), B (senior 3-5 years), C (intermediate 1-3 years), D (junior <1 year), E (beginner)
- importance: "required" for must-have, "preferred" for strongly desired, "nice-to-have" for bonus
- summary: 2-3 sentences explaining the analysis
- recommendations: 3-5 actionable tips for successful completion

Return ONLY the JSON object, no additional text.`;

  try {
    console.log('[Job Analysis] Sending request to Gemini...');
    
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });

    const raw = response && typeof response.text === 'string' ? response.text : '';

    if (!raw || raw.trim().length === 0) {
      throw new Error('Gemini returned empty response');
    }

    // Clean markdown code blocks
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[Job Analysis] Failed to parse JSON:', cleaned);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // Validate response structure
    if (!parsed.difficulty_level || !parsed.estimated_hours || !Array.isArray(parsed.required_skills)) {
      throw new Error('Invalid response structure from Gemini');
    }

    // Normalize and validate
    const allowedLevels = new Set(['A', 'B', 'C', 'D', 'E']);
    const allowedImportance = new Set(['required', 'preferred', 'nice-to-have']);

    const result: JobAnalysisResult = {
      difficulty_level: Math.max(1, Math.min(5, Math.round(parsed.difficulty_level))),
      estimated_hours: Math.max(1, Math.round(parsed.estimated_hours)),
      required_skills: parsed.required_skills
        .filter((skill: any) => skill && skill.name)
        .map((skill: any) => {
          const level = String(skill.level || 'C').toUpperCase();
          const importance = String(skill.importance || 'preferred').toLowerCase();
          
          return {
            name: String(skill.name).trim(),
            level: allowedLevels.has(level) ? level : 'C',
            importance: allowedImportance.has(importance) 
              ? (importance as 'required' | 'preferred' | 'nice-to-have')
              : 'preferred'
          };
        }),
      summary: String(parsed.summary || 'AI analysis completed'),
      recommendations: Array.isArray(parsed.recommendations) 
        ? parsed.recommendations.map((r: any) => String(r)) 
        : []
    };

    console.log(`[Job Analysis] Success: difficulty=${result.difficulty_level}, ` +
                `estimated_hours=${result.estimated_hours}, ` +
                `skills=${result.required_skills.length}`);

    return result;
  } catch (error) {
    console.error('[Job Analysis] Failed:', error);
    throw error;
  }
}

/**
 * Tạo prompt suggestions cho người dùng dựa trên context
 */
export function generateJobPromptSuggestions(context?: string): string[] {
  const suggestions = [
    'Xây dựng API RESTful cho module quản lý người dùng với authentication JWT',
    'Thiết kế UI/UX cho trang dashboard quản trị viên với biểu đồ thống kê',
    'Tối ưu hóa hiệu năng database queries và thêm caching layer',
    'Viết unit tests và integration tests cho module thanh toán',
    'Tích hợp AI chatbot hỗ trợ khách hàng vào website',
    'Migrate legacy code từ PHP sang Node.js với TypeScript',
    'Xây dựng CI/CD pipeline với Docker và GitHub Actions',
    'Phân tích và fix các security vulnerabilities trong hệ thống'
  ];

  return suggestions;
}
