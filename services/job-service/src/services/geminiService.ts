// 1. Import từ thư viện MỚI '@google/genai'
import { GoogleGenAI } from '@google/genai';

// 2. Model MỚI (bạn đã test thành công)
const MODEL_NAME = 'gemini-2.5-pro';

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

export default analyzeCvText;