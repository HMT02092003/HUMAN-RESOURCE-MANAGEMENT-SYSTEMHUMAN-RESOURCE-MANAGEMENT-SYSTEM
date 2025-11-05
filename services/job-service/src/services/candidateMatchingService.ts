import { UserSkillModel } from '../Models/UserSkillModel.ts';
import { SkillModel } from '../Models/SkillModel.ts';
import { JobRequiredSkillModel } from '../Models/JobRequiredSkillModel.ts';

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
 * Tìm ứng viên phù hợp dựa trên job requirements
 * @param jobId - ID của công việc
 * @param requiredSkills - Array of {skill_id, proficiency_level, importance}
 * @param options - Options for filtering and sorting
 */
export async function findMatchingCandidates(
  jobId: string,
  requiredSkills: Array<{
    skill_id: number;
    proficiency_level: string;
    importance: 'required' | 'preferred' | 'nice-to-have';
  }>,
  options: {
    minMatchScore?: number;
    maxResults?: number;
    includePartialMatches?: boolean;
  } = {}
): Promise<CandidateMatch[]> {
  const {
    minMatchScore = 50,
    maxResults = 20,
    includePartialMatches = true
  } = options;

  if (!requiredSkills || requiredSkills.length === 0) {
    console.log('[Candidate Matching] No required skills provided');
    return [];
  }

  console.log(`[Candidate Matching] Finding candidates for job ${jobId} with ${requiredSkills.length} required skills`);

  // Get all skills info
  const skillIds = requiredSkills.map(s => s.skill_id);
  const skillsInfo = await SkillModel.query().whereIn('skill_id', skillIds);
  const skillMap = new Map(skillsInfo.map(s => [s.skill_id, s.skill_name]));

  // Get all users who have at least one of the required skills
  const usersWithSkills = await UserSkillModel.query()
    .whereIn('skill_id', skillIds)
    .select('user_id', 'skill_id', 'proficiency_level');

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

  console.log(`[Candidate Matching] Found ${userSkillsMap.size} unique candidates with matching skills`);

  // Calculate match score for each user
  const candidates: CandidateMatch[] = [];

  for (const [userId, userSkills] of userSkillsMap.entries()) {
    const matchedSkills: MatchedSkill[] = [];
    const missingSkills: { skill_id: number; skill_name: string; required_level: string; }[] = [];
    
    let totalScore = 0;
    let matchedCount = 0;

    for (const required of requiredSkills) {
      const skillName = skillMap.get(required.skill_id) || `Skill ${required.skill_id}`;
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

    // Generate assessment
    let assessment = '';
    if (matchScore >= 90) {
      assessment = 'Excellent match - Highly qualified candidate';
    } else if (matchScore >= 75) {
      assessment = 'Very good match - Strong candidate';
    } else if (matchScore >= 60) {
      assessment = 'Good match - Qualified with minor gaps';
    } else if (matchScore >= 40) {
      assessment = 'Moderate match - May need training';
    } else {
      assessment = 'Weak match - Significant skill gaps';
    }

    if (matchScore >= minMatchScore || (includePartialMatches && matchedCount > 0)) {
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
  }

  // Sort by match score (descending) and limit results
  candidates.sort((a, b) => b.match_score - a.match_score);
  const limitedCandidates = candidates.slice(0, maxResults);

  console.log(`[Candidate Matching] Returning ${limitedCandidates.length} candidates ` +
              `(min_score: ${minMatchScore}%)`);

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
