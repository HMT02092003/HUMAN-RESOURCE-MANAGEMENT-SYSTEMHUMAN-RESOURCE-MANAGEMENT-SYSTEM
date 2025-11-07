import { Model } from 'objection';

export class ProjectSuggestionModel extends Model {
  suggestion_id!: string;
  project_id!: string;
  user_id!: number;
  match_score?: number;
  status?: string;
  matched_skills?: any;
  missing_skills?: any;
  skill_match_count?: number;
  total_required_skills?: number;
  ai_recommendation?: string | null;
  years_experience_required?: number | null;
  generated_at?: string;

  static get tableName() {
    return 'project_suggestions';
  }

  static get idColumn() {
    return 'suggestion_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['project_id', 'user_id'],
      properties: {
  suggestion_id: { type: 'string', format: 'uuid' },
  // allow project codes like PRJ... as well as UUIDs
  project_id: { type: 'string' },
        user_id: { type: 'integer' },
        match_score: { type: ['number', 'null'] },
        status: { type: ['string', 'null'] },
        matched_skills: { type: ['array', 'null'] },
        missing_skills: { type: ['array', 'null'] },
        skill_match_count: { type: ['integer', 'null'] },
        total_required_skills: { type: ['integer', 'null'] },
        ai_recommendation: { type: ['string', 'null'] },
        years_experience_required: { type: ['integer', 'null'] }
      }
    };
  }

  static get relationMappings() {
    const { ProjectModel } = require('./ProjectModel.ts');

    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: ProjectModel,
        join: {
          from: 'project_suggestions.project_id',
          to: 'projects.project_id'
        }
      }
    };
  }
}

export default ProjectSuggestionModel;
