import { Model } from 'objection';

export class JobModel extends Model {
  job_id!: string;
  title!: string;
  description!: string;
  status!: string;
  project_id?: string;
  created_by_user_id!: number;
  assigned_to_user_id?: number;
  ai_analysis_status?: string;
  difficulty_level?: number;
  estimated_hours?: number;
  ai_analysis_result?: string;
  created_at!: Date;
  updated_at!: Date;

  static get tableName() {
    return 'jobs';
  }

  static get idColumn() {
    return 'job_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title', 'description', 'created_by_user_id'],
      properties: {
        job_id: { type: 'string', format: 'uuid' },
        title: { type: 'string', maxLength: 255 },
        description: { type: 'string' },
        status: { type: 'string', maxLength: 50 },
        project_id: { type: ['string', 'null'], maxLength: 50 },
        created_by_user_id: { type: 'integer' },
        assigned_to_user_id: { type: ['integer', 'null'] },
        ai_analysis_status: { type: 'string', maxLength: 20 },
        difficulty_level: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
        estimated_hours: { type: ['integer', 'null'] },
        ai_analysis_result: { type: ['string', 'null'] }
      }
    };
  }

  static get relationMappings() {
    const { JobRequiredSkillModel } = require('./JobRequiredSkillModel.ts');
    const { JobSuggestionModel } = require('./JobSuggestionModel.ts');

    return {
      requiredSkills: {
        relation: Model.HasManyRelation,
        modelClass: JobRequiredSkillModel,
        join: {
          from: 'jobs.job_id',
          to: 'job_required_skills.job_id'
        }
      },
      suggestions: {
        relation: Model.HasManyRelation,
        modelClass: JobSuggestionModel,
        join: {
          from: 'jobs.job_id',
          to: 'job_suggestions.job_id'
        }
      }
    };
  }
}
