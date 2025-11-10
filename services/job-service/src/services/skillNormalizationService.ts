import { GoogleGenAI } from '@google/genai';
import { SkillModel } from '../Models/SkillModel.ts';

const MODEL_NAME = 'gemini-2.5-flash';
const apiKey = process.env.GEMINI_API_KEY;

const client = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: { apiVersion: 'v1alpha' }
}) : null;

// Cache để giảm số lần gọi Gemini
const normalizationCache = new Map<string, string>();

/**
 * DANH SÁCH KỸ NĂNG CHUẨN - Chỉ bao gồm technical skills thực sự
 * Không bao gồm: tools (VS Code, Android Studio), roles (FE Developer, BE Developer)
 */
const CANONICAL_SKILLS = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  
  // Frontend Technologies
  'React', 'Vue.js', 'Angular', 'Next.js', 'Svelte', 'HTML', 'CSS', 'Tailwind CSS', 'SASS', 'Bootstrap',
  'Redux', 'MobX', 'Zustand', 'React Query', 'GraphQL Client',
  
  // Backend Technologies  
  'Node.js', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', '.NET Core', 'Laravel',
  'Ruby on Rails', 'ASP.NET', 'GraphQL', 'REST API', 'gRPC', 'WebSocket',
  
  // Databases
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQL Server', 'Oracle', 'SQLite', 
  'DynamoDB', 'Cassandra', 'Neo4j',
  
  // Cloud & DevOps
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'GitLab CI', 'GitHub Actions',
  'Terraform', 'Ansible', 'CloudFormation', 'Nginx', 'Apache',
  
  // Mobile Development
  'React Native', 'Flutter', 'iOS Development', 'Android Development', 'SwiftUI', 'Jetpack Compose',
  
  // Testing
  'Jest', 'Mocha', 'Pytest', 'JUnit', 'Testing Library', 'Cypress', 'Selenium', 'Playwright',
  'Unit Testing', 'Integration Testing', 'E2E Testing',
  
  // Data & AI
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy',
  'Data Analysis', 'ETL', 'Apache Spark', 'Airflow',
  
  // Version Control & Collaboration
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Agile', 'Scrum', 'Jira',
  
  // Architecture & Design
  'Microservices', 'System Design', 'Design Patterns', 'Domain-Driven Design', 'Event-Driven Architecture',
  'Clean Architecture', 'SOLID Principles', 'Scalability', 'Performance Optimization',
  
  // Security
  'OAuth', 'JWT', 'API Security', 'Encryption', 'Penetration Testing', 'Security Best Practices',
  
  // Soft Skills (Minimal - chỉ quan trọng nhất)
  'Problem Solving', 'Communication', 'Team Collaboration', 'Code Review', 'Mentoring',
  
  // Others
  'Postman', 'Swagger', 'WebRTC', 'Socket.io', 'RabbitMQ', 'Kafka', 'Websockets'
];

/**
 * DANH SÁCH TỪ LOẠI TRỪ - Không phải kỹ năng thực sự
 */
const EXCLUDED_TERMS = [
  // Tools/IDEs (không phải skill)
  'VS Code', 'Visual Studio Code', 'IntelliJ IDEA', 'PyCharm', 'WebStorm', 'Eclipse', 'NetBeans',
  'Android Studio', 'Xcode', 'Sublime Text', 'Atom', 'Notepad++',
  
  // Generic Roles (không phải skill)
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Software Engineer',
  'DevOps Engineer', 'Data Scientist', 'Mobile Developer', 'QA Engineer', 'Tester',
  'Developer', 'Programmer', 'Engineer', 'Architect', 'Lead', 'Senior', 'Junior',
  
  // Too Generic
  'Programming', 'Coding', 'Development', 'Software Development', 'Web Development',
  'Mobile Development', 'Desktop Development',
  
  // Office Tools
  'Microsoft Word', 'Excel', 'PowerPoint', 'Google Docs', 'Sheets', 'Slides',
  
  // Operating Systems (unless specific skill needed)
  'Windows', 'macOS', 'Linux', 'Ubuntu', 'CentOS'
];

/**
 * Kiểm tra xem skill có nên bị loại trừ không
 */
function shouldExcludeSkill(skillName: string): boolean {
  const normalized = skillName.toLowerCase().trim();
  
  // Check exact matches
  for (const excluded of EXCLUDED_TERMS) {
    if (normalized === excluded.toLowerCase()) {
      return true;
    }
  }
  
  // Check if it contains role keywords
  const roleKeywords = ['developer', 'engineer', 'programmer', 'architect', 'lead', 'senior', 'junior', 'intern'];
  for (const keyword of roleKeywords) {
    if (normalized.includes(keyword) && !normalized.includes('development')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Normalize skill name bằng Gemini AI
 * Input: "Reactjs", "React.js", "React JS"
 * Output: "React"
 */
export async function normalizeSkillName(rawSkillName: string): Promise<string | null> {
  const trimmed = rawSkillName.trim();
  
  // Check cache first
  if (normalizationCache.has(trimmed.toLowerCase())) {
    return normalizationCache.get(trimmed.toLowerCase()) || null;
  }
  
  // Check if should be excluded
  if (shouldExcludeSkill(trimmed)) {
    console.log(`[Skill Normalization] Excluding "${trimmed}" - not a real technical skill`);
    normalizationCache.set(trimmed.toLowerCase(), '');
    return null;
  }
  
  // If already matches canonical skill exactly
  const exactMatch = CANONICAL_SKILLS.find(
    canonical => canonical.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactMatch) {
    normalizationCache.set(trimmed.toLowerCase(), exactMatch);
    return exactMatch;
  }
  
  // Use Gemini to normalize
  if (!client) {
    console.warn('[Skill Normalization] Gemini not available, returning raw skill');
    return trimmed;
  }
  
  const prompt = `You are a technical skill normalization expert. Your job is to map skill name variations to their canonical form.

CANONICAL SKILLS LIST:
${CANONICAL_SKILLS.join(', ')}

INPUT SKILL: "${rawSkillName}"

RULES:
1. If the input is a REAL TECHNICAL SKILL, map it to the closest canonical skill name
2. If it's a TOOL/IDE (VS Code, Android Studio, etc.), return "EXCLUDE"
3. If it's a GENERIC ROLE (Frontend Developer, Backend Developer, etc.), return "EXCLUDE"  
4. If it's too GENERIC (Programming, Development, etc.), return "EXCLUDE"
5. Handle variations: "Reactjs" → "React", "Node" → "Node.js", "Postgresql" → "PostgreSQL"
6. If no good match found in canonical list but it IS a real skill, return the skill name in standard form
7. Be strict - only real technical skills that demonstrate specific competence

Return ONLY valid JSON (no markdown):
{
  "normalized_name": "<canonical skill name or EXCLUDE>",
  "confidence": <0-100>,
  "reasoning": "<brief explanation in Vietnamese>"
}

Examples:
- "Reactjs" → {"normalized_name": "React", "confidence": 100, "reasoning": "Variation of React"}
- "VS Code" → {"normalized_name": "EXCLUDE", "confidence": 100, "reasoning": "IDE tool, not a skill"}
- "Frontend Developer" → {"normalized_name": "EXCLUDE", "confidence": 100, "reasoning": "Generic role, not skill"}
- "ExpressJS" → {"normalized_name": "Express.js", "confidence": 95, "reasoning": "Backend framework"}`;

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    
    const raw = response && typeof response.text === 'string' ? response.text : '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    
    const parsed = JSON.parse(cleaned);
    
    if (parsed.normalized_name === 'EXCLUDE') {
      console.log(`[Skill Normalization] Gemini excluded "${trimmed}": ${parsed.reasoning}`);
      normalizationCache.set(trimmed.toLowerCase(), '');
      return null;
    }
    
    const normalizedName = parsed.normalized_name;
    console.log(`[Skill Normalization] "${trimmed}" → "${normalizedName}" (confidence: ${parsed.confidence}%)`);
    
    normalizationCache.set(trimmed.toLowerCase(), normalizedName);
    return normalizedName;
    
  } catch (error) {
    console.error(`[Skill Normalization] Failed for "${trimmed}":`, error);
    // Fallback: return original if not in exclude list
    return shouldExcludeSkill(trimmed) ? null : trimmed;
  }
}

/**
 * Normalize multiple skills at once
 */
export async function normalizeSkillBatch(rawSkills: string[]): Promise<string[]> {
  const results = await Promise.all(
    rawSkills.map(skill => normalizeSkillName(skill))
  );
  
  return results.filter((s): s is string => s !== null);
}

/**
 * Find or create skill in database after normalization
 */
export async function findOrCreateNormalizedSkill(
  rawSkillName: string,
  trx?: any
): Promise<SkillModel | null> {
  const normalized = await normalizeSkillName(rawSkillName);
  
  if (!normalized) {
    // Skill was excluded
    return null;
  }
  
  // Check if skill already exists in DB
  const query = trx ? SkillModel.query(trx) : SkillModel.query();
  let skill = await query.where('skill_name', normalized).first();
  
  if (!skill) {
    // Check for case-insensitive match
    const allSkills = await (trx ? SkillModel.query(trx) : SkillModel.query());
    const foundSkill = allSkills.find(s => s.skill_name.toLowerCase() === normalized.toLowerCase());
    
    if (foundSkill) {
      skill = foundSkill;
    } else {
      // Create new skill with normalized name
      console.log(`[Skill Normalization] Creating new skill: "${normalized}"`);
      skill = await (trx ? SkillModel.query(trx) : SkillModel.query())
        .insert({ skill_name: normalized })
        .returning('*')
        .then(result => Array.isArray(result) ? result[0] : result);
    }
  }
  
  return skill || null;
}

/**
 * Fuzzy match skills - tìm các skill tương tự trong DB
 * Used for candidate matching when exact match not found
 */
export async function findSimilarSkills(
  targetSkillName: string,
  threshold: number = 70
): Promise<Array<{ skill_id: number; skill_name: string; similarity: number }>> {
  if (!client) {
    // Fallback: simple string matching
    const allSkills = await SkillModel.query();
    const target = targetSkillName.toLowerCase();
    
    return allSkills
      .filter(skill => {
        const name = skill.skill_name.toLowerCase();
        return name.includes(target) || target.includes(name);
      })
      .map(skill => ({
        skill_id: skill.skill_id,
        skill_name: skill.skill_name,
        similarity: 80
      }));
  }
  
  // Get all skills from DB
  const allSkills = await SkillModel.query();
  
  const prompt = `You are a technical skill similarity analyzer. Find skills similar to the target skill.

TARGET SKILL: "${targetSkillName}"

AVAILABLE SKILLS IN DATABASE:
${allSkills.map(s => s.skill_name).join(', ')}

TASK: Find skills that are SIMILAR or RELATED to the target skill. Consider:
- Technology variations (React vs React Native)
- Related technologies (JavaScript vs TypeScript)
- Ecosystem skills (Node.js vs Express.js)
- Skill hierarchy (Programming vs specific language)

Return ONLY valid JSON (no markdown):
{
  "similar_skills": [
    {
      "skill_name": "<skill name from database>",
      "similarity_score": <0-100, how similar>,
      "reason": "<why they're similar in Vietnamese>"
    }
  ]
}

Only include skills with similarity >= ${threshold}. Maximum 10 results.`;

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    
    const raw = response && typeof response.text === 'string' ? response.text : '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    
    const parsed = JSON.parse(cleaned);
    
    const results: Array<{ skill_id: number; skill_name: string; similarity: number }> = [];
    
    for (const item of parsed.similar_skills || []) {
      const skill = allSkills.find(s => 
        s.skill_name.toLowerCase() === item.skill_name.toLowerCase()
      );
      
      if (skill && item.similarity_score >= threshold) {
        results.push({
          skill_id: skill.skill_id,
          skill_name: skill.skill_name,
          similarity: item.similarity_score
        });
        
        console.log(`[Skill Similarity] "${targetSkillName}" ~${item.similarity_score}%~ "${skill.skill_name}": ${item.reason}`);
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity);
    
  } catch (error) {
    console.error(`[Skill Similarity] Failed for "${targetSkillName}":`, error);
    return [];
  }
}

export default {
  normalizeSkillName,
  normalizeSkillBatch,
  findOrCreateNormalizedSkill,
  findSimilarSkills,
  CANONICAL_SKILLS,
  shouldExcludeSkill
};
