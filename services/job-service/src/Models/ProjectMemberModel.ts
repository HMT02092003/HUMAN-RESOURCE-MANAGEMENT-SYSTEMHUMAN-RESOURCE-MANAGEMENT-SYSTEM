import { Model, ModelObject } from 'objection';
import ProjectModel from './ProjectModel.ts';

export class ProjectMemberModel extends Model {
  project_id!: number;
  user_id!: number;
  role?: string | null;
  joined_at?: string;

  static get tableName() {
    return 'project_members';
  }

  static get idColumn() {
    return ['project_id', 'user_id'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['project_id', 'user_id'],
      properties: {
        project_id: { type: 'integer' },
        user_id: { type: 'integer' },
        role: { type: ['string', 'null'], maxLength: 100 },
        joined_at: { type: ['string', 'null'], format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: ProjectModel,
        join: {
          from: 'project_members.project_id',
          to: 'projects.project_id'
        }
      }
    };
  }
}

export default ProjectMemberModel;
