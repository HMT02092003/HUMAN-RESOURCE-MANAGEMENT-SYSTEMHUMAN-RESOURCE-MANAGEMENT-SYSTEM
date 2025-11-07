import { Model } from 'objection';
import ProjectModel from './ProjectModel.ts';

export class ProjectMemberModel extends Model {
  project_id!: string;
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
        project_id: { type: 'string' }, // Can be PRJ code or UUID
        user_id: { type: 'integer' },
        role: { type: ['string', 'null'] },
        joined_at: { type: ['string', 'null'] }
      }
    };
  }

  static get relationMappings() {
  // Use top-level import to avoid require at runtime
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
