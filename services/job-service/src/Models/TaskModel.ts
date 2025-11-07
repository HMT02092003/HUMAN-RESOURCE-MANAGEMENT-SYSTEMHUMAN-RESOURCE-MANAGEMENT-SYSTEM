import { Model } from 'objection';
import ProjectModel from './ProjectModel.ts';

export class TaskModel extends Model {
  task_id!: string;
  project_id!: string;
  title!: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assignee_id?: number | null;
  due_date?: string | null;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: any;
  created_at?: string;
  updated_at?: string;

  static get tableName() {
    return 'tasks';
  }

  static get idColumn() {
    return 'task_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title', 'project_id'],
      properties: {
  task_id: { type: 'string', format: 'uuid' },
  // project_id may be a service code (PRJ...) or a UUID; accept any string
  project_id: { type: 'string' },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        status: { type: ['string', 'null'] },
        priority: { type: ['string', 'null'] },
        assignee_id: { type: ['integer', 'null'] },
        due_date: { type: ['string', 'null'], format: 'date' },
        estimated_hours: { type: ['integer', 'null'] },
        actual_hours: { type: ['integer', 'null'] },
        tags: { type: ['array', 'null'] }
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
          from: 'tasks.project_id',
          to: 'projects.project_id'
        }
      }
    };
  }
}

export default TaskModel;
