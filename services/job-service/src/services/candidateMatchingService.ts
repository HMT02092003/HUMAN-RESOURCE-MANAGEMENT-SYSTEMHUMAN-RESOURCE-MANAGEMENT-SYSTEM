import { UserSkillModel } from '../Models/UserSkillModel.ts';
import { SkillModel } from '../Models/SkillModel.ts';
import ProjectRequiredSkillModel from '../Models/ProjectRequiredSkillModel.ts';
import { ProjectMemberModel } from '../Models/ProjectMemberModel.ts';
import { findSimilarSkills } from './skillNormalizationService.ts';

export interface MatchedSkill {
  skill_id: number;
  skill_name: string;
  required_level: string;
  user_level: string;
  is_match: boolean;
}

export interface CandidateMatch {
  user_id: number;
  match_score: number; // 0-100
  matched_skills: MatchedSkill[];
  missing_skills: {
    skill_id: number;
    skill_name: string;
    required_level: string;
  }[];
  skill_match_count: number;
  total_required_skills: number;
  overall_assessment: string;
}

/**
 * Map skill levels to numeric values for comparison
 */
const SKILL_LEVEL_MAP: { [key: string]: number } = {
  'A': 5, // Expert
  'B': 4, // Senior
  'C': 3, // Intermediate
  'D': 2, // Junior
  'E': 1  // Beginner
};

/**
 * Tìm ứng viên phù hợp dựa trên project requirements
 * @param projectId - ID của dự án
 * @param requiredSkills - Array of {skill_id, proficiency_level, importance}
 * @param options - Options for filtering and sorting
 */
export async function findMatchingCandidates(
  projectId: string,
  requiredSkills: Array<{
    skill_id: number;
    proficiency_level: string;
    importance: 'required' | 'preferred' | 'nice-to-have';
  }>,
  options: {
    minMatchScore?: number;
    maxResults?: number;
    includePartialMatches?: boolean;
    project_id?: string | null;
  } = {}
): Promise<CandidateMatch[]> {
  const {
    minMatchScore = 0, // Changed from 50 to 0 - show all candidates
    maxResults = 10, // Limit to 10 candidates as requested
    includePartialMatches = true,
    project_id = null
  } = options;

  if (!requiredSkills || requiredSkills.length === 0) {
    console.log('[Candidate Matching] No required skills provided');
    return [];
  }

  console.log(`[Candidate Matching] Finding candidates for project ${projectId} with ${requiredSkills.length} required skills`);

  // Lấy danh sách user_id từ project_members nếu có project_id
  let allowedUserIds: number[] | null = null;
  if (project_id) {
    const projectMembers = await ProjectMemberModel.query()
      .where('project_id', project_id)
      .select('user_id');
    
    allowedUserIds = projectMembers.map(pm => pm.user_id);
    console.log(`[Candidate Matching] Project ${project_id} has ${allowedUserIds.length} members`);
    
    if (allowedUserIds.length === 0) {
      console.log('[Candidate Matching] No members in project');
      return [];
    }
  }

  // Get all skills info - DISABLE fuzzy matching for performance
  const skillIds = requiredSkills.map(s => s.skill_id);
  const skillsInfo = await SkillModel.query().whereIn('skill_id', skillIds);
  const skillMap = new Map(skillsInfo.map(s => [s.skill_id, s.skill_name]));

  // OPTIMIZATION: Disable fuzzy/similar skill matching to improve performance
  // Fuzzy matching calls Gemini API multiple times causing 10-20s delay
  // For now, only match exact skills
  console.log('[Candidate Matching] Using exact skill matching (fuzzy disabled for performance)');

  // Get users with required skills (filtered by project members)
  let query = UserSkillModel.query().whereIn('skill_id', skillIds);
  
  if (allowedUserIds) {
    query = query.whereIn('user_id', allowedUserIds);
  }
  
  const usersWithSkills = await query.select('user_id', 'skill_id', 'proficiency_level');

  // Group by user_id
  const userSkillsMap = new Map<number, Map<number, string>>();
  
  for (const us of usersWithSkills) {
    if (!userSkillsMap.has(us.user_id)) {
      userSkillsMap.set(us.user_id, new Map());
    }
    if (us.proficiency_level) {
      userSkillsMap.get(us.user_id)!.set(us.skill_id, us.proficiency_level);
    }
  }

  // IMPORTANT: ALWAYS show ALL project members (even those with no matching skills)
  // This ensures we see all team members, sorted by match score
  if (allowedUserIds && allowedUserIds.length > 0) {
    console.log(`[Candidate Matching] Ensuring all ${allowedUserIds.length} project members are included`);
    for (const userId of allowedUserIds) {
      if (!userSkillsMap.has(userId)) {
        userSkillsMap.set(userId, new Map()); // Add with empty skills (0% match)
      }
    }
  }

  console.log(`[Candidate Matching] Found ${userSkillsMap.size} candidates (exact match only)`);

  // Calculate match score for each user
  const candidates: CandidateMatch[] = [];

  for (const [userId, userSkills] of userSkillsMap.entries()) {
    const matchedSkills: MatchedSkill[] = [];
    const missingSkills: { skill_id: number; skill_name: string; required_level: string; }[] = [];
    
    let totalScore = 0;
    let matchedCount = 0;

    for (const required of requiredSkills) {
      const skillName = skillMap.get(required.skill_id) || `Skill ${required.skill_id}`;
      
      // EXACT MATCH ONLY (fuzzy matching disabled for performance)
      const userLevel = userSkills.get(required.skill_id);
      
      if (userLevel) {
        const requiredLevelValue = SKILL_LEVEL_MAP[required.proficiency_level] || 3;
        const userLevelValue = SKILL_LEVEL_MAP[userLevel] || 1;
        const isMatch = userLevelValue >= requiredLevelValue;
        
        matchedSkills.push({
          skill_id: required.skill_id,
          skill_name: skillName,
          required_level: required.proficiency_level,
          user_level: userLevel,
          is_match: isMatch
        });

        if (isMatch) {
          matchedCount++;
          // Weight by importance
          const weight = required.importance === 'required' ? 1.0 
                       : required.importance === 'preferred' ? 0.7 
                       : 0.3;
          totalScore += weight;
        } else {
          // Partial credit if user has the skill but lower level
          const partialCredit = (userLevelValue / requiredLevelValue) * 0.5;
          const weight = required.importance === 'required' ? 1.0 
                       : required.importance === 'preferred' ? 0.7 
                       : 0.3;
          totalScore += partialCredit * weight;
        }
      } else {
        missingSkills.push({
          skill_id: required.skill_id,
          skill_name: skillName,
          required_level: required.proficiency_level
        });
      }
    }

    // Calculate total possible score
    const totalPossibleScore = requiredSkills.reduce((sum, s) => {
      const weight = s.importance === 'required' ? 1.0 
                   : s.importance === 'preferred' ? 0.7 
                   : 0.3;
      return sum + weight;
    }, 0);

    const matchScore = totalPossibleScore > 0 
      ? Math.round((totalScore / totalPossibleScore) * 100)
      : 0;

    // Generate assessment (Vietnamese)
    let assessment = '';
    if (matchScore >= 90) {
      assessment = 'Rất phù hợp - Ứng viên xuất sắc';
    } else if (matchScore >= 75) {
      assessment = 'Phù hợp cao - Ứng viên mạnh';
    } else if (matchScore >= 60) {
      assessment = 'Phù hợp tốt - Đủ năng lực với khoảng trống nhỏ';
    } else if (matchScore >= 40) {
      assessment = 'Phù hợp trung bình - Có thể cần đào tạo thêm';
    } else {
      assessment = 'Phù hợp yếu - Thiếu nhiều kỹ năng quan trọng';
    }

    // Add all candidates to the list (no score filtering)
    candidates.push({
      user_id: userId,
      match_score: matchScore,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      skill_match_count: matchedCount,
      total_required_skills: requiredSkills.length,
      overall_assessment: assessment
    });
  }

  // Sort by match score (descending) and limit results
  candidates.sort((a, b) => b.match_score - a.match_score);
  const limitedCandidates = candidates.slice(0, maxResults);

  console.log(`[Candidate Matching] Returning ${limitedCandidates.length} candidates (no min score filter)`);

  return limitedCandidates;
}

/**
 * Get detailed user info for matched candidates (call employee-service)
 * This is a placeholder - implement actual service call
 */
export async function enrichCandidatesWithUserInfo(
  candidates: CandidateMatch[],
  authToken: string
): Promise<any[]> {
  // TODO: Call employee-service API to get user details
  // For now, return candidates as-is
  console.log('[Candidate Matching] Would call employee-service for user info');
  return candidates.map(c => ({
    ...c,
    user_name: `User ${c.user_id}`,
    user_email: `user${c.user_id}@company.com`
  }));
}
