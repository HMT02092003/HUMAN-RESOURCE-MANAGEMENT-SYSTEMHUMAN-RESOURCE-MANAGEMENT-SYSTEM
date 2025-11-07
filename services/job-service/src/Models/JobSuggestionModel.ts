import { Model } from 'objection';
import { JobModel } from './JobModel.ts';

export class JobSuggestionModel extends Model {
  suggestion_id!: string;
  job_id!: string;
  user_id!: number;
  match_score!: number;
  status!: string;
  matched_skills?: string;
  missing_skills?: string;
  skill_match_count!: number;
  total_required_skills!: number;
  generated_at!: Date;

  static get tableName() {
    return 'job_suggestions';
  }

  static get idColumn() {
    return 'suggestion_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['job_id', 'user_id'],
      properties: {
        suggestion_id: { type: 'string', format: 'uuid' },
        job_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'integer' },
        match_score: { type: 'number' },
        status: { type: 'string', maxLength: 30 },
        matched_skills: { type: ['string', 'null'] },
        missing_skills: { type: ['string', 'null'] },
        skill_match_count: { type: 'integer' },
        total_required_skills: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
  // Use top-level imports to avoid runtime 'require is not defined'
    return {
      job: {
        relation: Model.BelongsToOneRelation,
        modelClass: JobModel,
        join: {
          from: 'job_suggestions.job_id',
          to: 'jobs.job_id'
        }
      }
    };
  }
}
