import { Model } from 'objection';

export class JobRequiredSkillModel extends Model {
  job_id!: string;
  skill_id!: number;
  proficiency_level!: string;

  static get tableName() {
    return 'job_required_skills';
  }

  static get idColumn() {
    return ['job_id', 'skill_id'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['job_id', 'skill_id', 'proficiency_level'],
      properties: {
        job_id: { type: 'string', format: 'uuid' },
        skill_id: { type: 'integer' },
        proficiency_level: { type: 'string', maxLength: 5 }
      }
    };
  }

  static get relationMappings() {
    const { JobModel } = require('./JobModel.ts');
    const { SkillModel } = require('./SkillModel.ts');

    return {
      job: {
        relation: Model.BelongsToOneRelation,
        modelClass: JobModel,
        join: {
          from: 'job_required_skills.job_id',
          to: 'jobs.job_id'
        }
      },
      skill: {
        relation: Model.BelongsToOneRelation,
        modelClass: SkillModel,
        join: {
          from: 'job_required_skills.skill_id',
          to: 'skills.skill_id'
        }
      }
    };
  }
}
