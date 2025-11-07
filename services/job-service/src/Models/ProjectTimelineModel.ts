import { Model } from 'objection';
import ProjectModel from './ProjectModel.ts';

export class ProjectTimelineModel extends Model {
  event_id!: string;
  project_id!: string;
  event_type!: string;
  title!: string;
  description?: string | null;
  user_id?: number | null;
  metadata?: any;
  event_time?: string;

  static get tableName() {
    return 'project_timeline';
  }

  static get idColumn() {
    return 'event_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['project_id', 'event_type', 'title'],
      properties: {
  event_id: { type: 'string', format: 'uuid' },
  // project_id may use service-generated codes (e.g. PRJYYYYMMDDHHmmss) or UUIDs,
  // so accept any string here rather than enforcing UUID format.
  project_id: { type: 'string' },
        event_type: { type: 'string' },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        user_id: { type: ['integer', 'null'] },
        metadata: { type: ['object', 'null'] },
        event_time: { type: ['string', 'null'], format: 'date-time' }
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
          from: 'project_timeline.project_id',
          to: 'projects.project_id'
        }
      }
    };
  }
}

export default ProjectTimelineModel;
