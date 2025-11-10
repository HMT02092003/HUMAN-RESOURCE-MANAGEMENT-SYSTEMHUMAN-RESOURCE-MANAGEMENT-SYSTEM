import { Model, ModelObject } from 'objection';
import ProjectModel from './ProjectModel.ts';
import SkillModel from './SkillModel.ts';

export class ProjectRequiredSkillModel extends Model {
  project_id!: number;
  skill_id!: number;
  proficiency_level?: string | null;

  static get tableName() {
    return 'project_required_skills';
  }

  static get idColumn() {
    return ['project_id', 'skill_id'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['project_id', 'skill_id'],
      properties: {
        project_id: { type: 'integer' },
        skill_id: { type: 'integer' },
        proficiency_level: { type: ['string', 'null'], maxLength: 50 }
      }
    };
  }

  static get relationMappings() {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: ProjectModel,
        join: {
          from: 'project_required_skills.project_id',
          to: 'projects.project_id'
        }
      },
      skill: {
        relation: Model.BelongsToOneRelation,
        modelClass: SkillModel,
        join: {
          from: 'project_required_skills.skill_id',
          to: 'skills.skill_id'
        }
      }
    };
  }
}

export default ProjectRequiredSkillModel;
