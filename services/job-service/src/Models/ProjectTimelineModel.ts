import { Model, ModelObject } from 'objection';
import ProjectModel from './ProjectModel.ts';

export class ProjectTimelineModel extends Model {
  event_id!: string;
  project_id!: number;
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
        project_id: { type: 'integer' },
        event_type: { 
          type: 'string',
          enum: [
            'created', 
            'updated', 
            'status_changed', 
            'member_added', 
            'member_removed', 
            'task_created',
            'task_assigned',
            'task_completed',
            'milestone_reached',
            'budget_updated',
            'comment_added'
          ]
        },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        user_id: { type: ['integer', 'null'] },
        metadata: { type: ['object', 'null'] },
        event_time: { type: ['string', 'null'], format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
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
