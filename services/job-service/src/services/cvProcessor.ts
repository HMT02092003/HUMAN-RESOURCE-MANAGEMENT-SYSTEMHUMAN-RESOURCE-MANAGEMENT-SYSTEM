import path from 'path';
import { transaction } from 'objection';
import knex from '../lib/database.ts';
import { CvModel } from '../Models/CvModel.ts';
import { SkillModel } from '../Models/SkillModel.ts';
import { UserSkillModel } from '../Models/UserSkillModel.ts';
import { getTextFromPdf } from './pdfParser.ts';
import { analyzeCvText, GeminiResponse } from './geminiService.ts';

export function triggerCvAnalysis(cvId: string): void {
  processCv(cvId).catch((err) => {
    console.error('triggerCvAnalysis error', err);
  });
}

export async function processCv(cvId: string): Promise<void> {
  await transaction(knex, async (trx) => {
    try {
      const cv = await CvModel.query(trx).findById(cvId);
      if (!cv) {
        throw new Error(`CV not found: ${cvId}`);
      }

      const absPath = path.resolve(process.cwd(), cv.file_path);
      const text = await getTextFromPdf(absPath);

  const analysis: GeminiResponse = await analyzeCvText(text);

      for (const skill of analysis.skills || []) {
        let skillRow = await SkillModel.query(trx)
          .where('skill_name', skill.name)
          .first();
        if (!skillRow) {
          const inserted = await SkillModel.query(trx)
            .insert({ skill_name: skill.name })
            .returning('*');
          skillRow = Array.isArray(inserted) ? inserted[0] : inserted;
        }
        if (!skillRow) {
          continue;
        }

        const existing = await UserSkillModel.query(trx).findById([cv.user_id, skillRow.skill_id]);
        if (existing) {
          await UserSkillModel.query(trx)
            .patch({ proficiency_level: skill.level })
            .where({ user_id: cv.user_id, skill_id: skillRow.skill_id });
        } else {
          await UserSkillModel.query(trx).insert({
            user_id: cv.user_id,
            skill_id: skillRow.skill_id,
            proficiency_level: skill.level
          });
        }
      }

      await CvModel.query(trx)
        .patch({ ai_analysis_status: 'Completed', original_text: text })
        .findById(cvId);
    } catch (error) {
      try {
        await CvModel.query(trx)
          .patch({ ai_analysis_status: 'Failed' })
          .where('cv_id', cvId);
      } catch (patchError) {
        console.error('failed to mark cv as Failed', patchError);
      }
      throw error;
    }
  });
}

export default { triggerCvAnalysis, processCv };
