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
 * @param projectContext - Thông tin dự án (nếu có)
 * @returns JobAnalysisResult
 */
export async function analyzeJobWithAI(
  title: string,
  description: string,
  projectContext?: {
    name: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
    status: string;
  } | null
): Promise<JobAnalysisResult> {
  if (!client) {
    throw new Error('Gemini API key not configured. Cannot analyze job.');
  }

  if (!title || !description) {
    throw new Error('Title and description are required for job analysis.');
  }

  // Build project context string
  let projectInfo = '';
  if (projectContext) {
    projectInfo = `
PROJECT CONTEXT:
- Project Name: ${projectContext.name}
- Project Status: ${projectContext.status}
- Project End Date: ${projectContext.end_date}
- Days Remaining: ${projectContext.days_remaining} days
- Today: ${new Date().toISOString().split('T')[0]}

IMPORTANT: Consider the project deadline when estimating hours. If the deadline is tight (< 30 days), prioritize faster completion. If there's more time, you can estimate more thoroughly.`;
  }

  const prompt = `You are an expert technical project manager and HR specialist in 2025. Analyze this job/task with modern software development standards and practices.

CURRENT YEAR: 2025
CONTEXT: Remote-first, AI-assisted development, modern DevOps, cloud-native architecture
${projectInfo}

JOB TITLE: ${title}

JOB DESCRIPTION:
${description}

🚨 CRITICAL WARNING: DO NOT OVERESTIMATE! 🚨
- Most UI tasks: 4-8 hours for juniors
- Standard CRUD screens: 5-7 hours for juniors  
- Simple features: 2-4 hours
- Complex integrations: 12-20 hours
- Think REALISTIC, not worst-case scenario!

🎯 SKILL LEVEL RULES FOR UI/FRONTEND TASKS:
- Simple UI screens (list, form, CRUD): Level D or E (Junior can do!)
- Standard features with existing components: Level D (Junior)
- Moderate complexity (charts, filters): Level C (Mid)
- Complex features (real-time, optimization): Level B (Senior)
- Architecture/critical systems: Level A (Expert)

❌ WRONG: "Màn quản lý user" → React Level B (Senior)
✅ RIGHT: "Màn quản lý user" → React Level D (Junior), TypeScript Level D

Analyze and return ONLY valid JSON (no markdown, no comments) with this exact structure:
{
  "difficulty_level": <number 1-5, where 1=very easy, 5=very hard>,
  "estimated_hours": <number, REALISTIC hours for a junior/mid developer with modern tools - DO NOT OVERESTIMATE!>,
  "required_skills": [
    {
      "name": "<skill name>",
      "level": "<A|B|C|D|E, where A=expert, E=beginner> - DEFAULT to D for most tasks!",
      "importance": "<required|preferred|nice-to-have>"
    }
  ],
  "summary": "<brief analysis in Vietnamese>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "..."]
}

═══════════════════════════════════════════════════════════════
🚨 CRITICAL: SKILL NAMING RULES - MUST FOLLOW STRICTLY 🚨
═══════════════════════════════════════════════════════════════

✅ INCLUDE ONLY **REAL TECHNICAL SKILLS**:
- Programming Languages: JavaScript, TypeScript, Python, Java, C#, Go, etc.
- Frameworks/Libraries: React, Next.js, Express.js, Django, Spring Boot, etc.
- Databases: PostgreSQL, MySQL, MongoDB, Redis, etc.
- Cloud/DevOps: AWS, Docker, Kubernetes, CI/CD, etc.
- Specific Technologies: GraphQL, REST API, WebSocket, OAuth, JWT, etc.

❌ **NEVER** INCLUDE:
- Generic Roles: "Frontend Developer", "Backend Developer", "Full Stack Developer"
- Tools/IDEs: "VS Code", "Visual Studio", "Android Studio", "IntelliJ"
- Generic Terms: "Programming", "Coding", "Software Development"
- Office Tools: "Excel", "Word", "PowerPoint"
- OS: "Windows", "macOS", "Linux" (unless specific DevOps task)

📋 EXAMPLES OF CORRECT SKILLS:
- ✅ "React" - specific framework
- ✅ "Node.js" - specific runtime
- ✅ "PostgreSQL" - specific database
- ✅ "Docker" - specific containerization tool
- ✅ "REST API Design" - specific technical skill
- ✅ "Git" - version control skill
- ✅ "Unit Testing" - specific practice

❌ EXAMPLES OF WRONG SKILLS:
- ❌ "Frontend Developer" → Use "React", "HTML", "CSS" instead
- ❌ "Backend Engineer" → Use "Node.js", "Express.js", "PostgreSQL" instead  
- ❌ "Full Stack" → Split into specific frontend + backend skills
- ❌ "VS Code" → This is just a text editor, not a skill
- ❌ "Programming" → Too generic, use specific language
- ❌ "Software Development" → Too generic, use specific skills

🎯 WHEN ANALYZING A TASK:
1. Identify CONCRETE technologies needed (e.g., React for UI, Express.js for API)
2. List SPECIFIC skills (not roles or tools)
3. Keep it MINIMAL - only 3-7 key skills, not 15+
4. Match skill difficulty to task difficulty (see rules below)

═══════════════════════════════════════════════════════════════
CRITICAL RULES FOR ACCURATE SKILL LEVEL ASSESSMENT
═══════════════════════════════════════════════════════════════

🎯 MATCH DIFFICULTY WITH SKILL LEVEL:

difficulty_level 1 (Very Easy):
  → MUST use level D or E
  → Examples: Simple UI tweaks, basic data entry, documentation updates
  → Senior skills NOT needed for trivial tasks

difficulty_level 2 (Easy):  
  → MUST use level C or D
  → Examples: Standard CRUD operations, simple forms, basic styling
  → Mid-level is sufficient, senior is overkill

difficulty_level 3 (Medium):
  → Can use level B or C
  → Examples: Feature with business logic, API integration, complex forms
  → Senior appropriate only if critical/complex

difficulty_level 4 (Hard):
  → Should use level B (some A if critical)
  → Examples: System architecture, performance optimization, security
  → Senior skills justified here

difficulty_level 5 (Very Hard):
  → Use level A
  → Examples: Distributed systems, ML integration, critical infrastructure
  → Expert/architect level truly needed

═══════════════════════════════════════════════════════════════
SKILL LEVEL STANDARDS (2025)
═══════════════════════════════════════════════════════════════

Level A (Expert/Architect 5+ years):
  ✓ System architecture design
  ✓ Performance tuning at scale
  ✓ Security architecture
  ✓ Team mentoring & leadership
  ✗ DO NOT use for simple/routine tasks

Level B (Senior 3-5 years):
  ✓ Complex features independently
  ✓ Code reviews & best practices
  ✓ Technical decisions
  ✓ Debugging production issues
  ✗ DO NOT use for basic CRUD

Level C (Mid-level 1-3 years):
  ✓ Standard features with guidance
  ✓ Good coding fundamentals
  ✓ Testing & documentation
  ✓ Most day-to-day tasks
  → IDEAL for majority of work

Level D (Junior <1 year):
  ✓ Simple features with mentoring
  ✓ Bug fixes
  ✓ Basic testing
  ✓ Learning on the job
  → PERFECT for simple tasks

Level E (Entry/Intern):
  ✓ Pair programming only
  ✓ Documentation help
  ✓ Very basic tasks
  ✓ Heavy supervision needed

═══════════════════════════════════════════════════════════════
REALISTIC EXAMPLES
═══════════════════════════════════════════════════════════════

❌ WRONG: "Fix button color" → Level B (Senior)
✅ RIGHT: "Fix button color" → Level D (Junior)

❌ WRONG: "Add new field to form" → Level A (Expert)  
✅ RIGHT: "Add new field to form" → Level C (Mid)

❌ WRONG: "Create basic API endpoint" → Level B (Senior)
✅ RIGHT: "Create basic API endpoint" → Level C (Mid)

✅ CORRECT: "Design microservices architecture" → Level A (Expert)
✅ CORRECT: "Optimize database queries (100M+ records)" → Level A (Expert)
✅ CORRECT: "Integrate payment gateway with security" → Level B (Senior)

═══════════════════════════════════════════════════════════════
2025 MODERN DEVELOPMENT CONTEXT
═══════════════════════════════════════════════════════════════

- AI tools (Copilot, ChatGPT, Claude) reduce coding time by 30-40%
- Modern frameworks (Next.js 15, React 19, Node.js 22) with better DX
- Cloud services (AWS, Azure, Vercel) simplify deployment
- CI/CD automation reduces manual testing time
- Low-code/no-code tools for rapid prototyping
- Containerization (Docker, Kubernetes) standardizes environments

ESTIMATION GUIDELINES:
- Simple UI changes (button, color, text): 0.5-2h (Level D)
- Basic CRUD screen (list, create, edit, delete): 4-8h (Level D or C)
- Standard form with validation: 2-4h (Level D)
- Simple API endpoint (CRUD): 1-3h (Level C or D)
- Complex feature with business logic: 12-20h (Level B or C)
- Full auth system: 8-12h with Auth0/Clerk (Level C)
- UI component library: 12-20h with Tailwind (Level C)
- Database schema design: 3-6h with ORM (Level C)
- API integration (third-party): 2-4h per service (Level C or D)
- Unit testing: 30% of dev time
- Documentation: 10% of dev time

🎯 SPECIFIC EXAMPLES FOR CONTEXT:
Task: "Xây dựng màn quản lý người dùng" (User Management Screen)
→ Includes: User list table, search/filter, create/edit form, delete
→ Using: React + existing component library (Ant Design) + API ready
→ Junior developer: 5-7 hours total
  - List view with table: 2h
  - Create/Edit form: 2h  
  - Delete functionality: 0.5h
  - Search/filter: 1h
  - Testing & polish: 1.5h
→ Mid-level: 4-5 hours
→ Difficulty: 2 (Easy) - just UI implementation, no complex logic
→ Skills needed: React (Level D), TypeScript (Level D), Ant Design (Level D)

Task: "Xây dựng màn dashboard với charts"
→ Junior: 8-10 hours (needs chart library learning)
→ Mid: 6-8 hours
→ Difficulty: 3 (Medium)

Task: "Sửa màu nút đăng nhập"
→ Simple CSS change
→ Any level: 0.5 hours
→ Difficulty: 1 (Very Easy)

Task: "Thêm field số điện thoại vào form"
→ Add input + validation + API field
→ Junior: 1-2 hours
→ Difficulty: 1 (Very Easy)

Task: "Tích hợp thanh toán VNPay"
→ API integration + webhook + error handling + security
→ Mid/Senior: 12-16 hours
→ Difficulty: 4 (Hard)

═══════════════════════════════════════════════════════════════
IMPORTANCE LEVELS
═══════════════════════════════════════════════════════════════

"required": MUST-HAVE skills, project cannot proceed without
"preferred": NICE-TO-HAVE, makes work easier/faster
"nice-to-have": BONUS, can learn on the job

BE REALISTIC:
- Don't mark everything as "required"
- Simple tasks should have mostly "preferred" or "nice-to-have"
- Only complex/critical tasks need multiple "required" skills

═══════════════════════════════════════════════════════════════

Return response in VIETNAMESE with professional terminology.

CRITICAL REMINDERS: 
🔴 DEFAULT SKILL LEVEL = D (Junior) for most UI/frontend tasks!
🔴 Only use Level C if task requires moderate complexity
🔴 Only use Level B if task requires senior expertise
🔴 Level A only for architecture/critical systems

REMEMBER: 
- Simple UI task = Level D (Junior can do!)
- Standard CRUD = Level D or C (Junior to Mid)
- Complex feature = Level B or C (Mid to Senior)
- Critical/Architecture = Level A (Expert)

DON'T over-estimate skill requirements! Think: "Can a junior with 6 months experience do this?"`;

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
