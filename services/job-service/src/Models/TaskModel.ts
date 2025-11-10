import { Model, ModelObject } from 'objection';
import ProjectModel from './ProjectModel.ts';

export class TaskModel extends Model {
  task_id!: string;
  project_id!: number;
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
        task_id: { type: 'string', maxLength: 64 },
        project_id: { type: 'integer' },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        status: { 
          type: ['string', 'null'],
          enum: ['todo', 'in_progress', 'review', 'done', null]
        },
        priority: { 
          type: ['string', 'null'],
          enum: ['low', 'medium', 'high', 'urgent', null]
        },
        assignee_id: { type: ['integer', 'null'] },
        due_date: { type: ['string', 'null'], format: 'date' },
        estimated_hours: { type: ['integer', 'null'] },
        actual_hours: { type: ['integer', 'null'] },
        tags: { type: ['array', 'null'] },
        created_at: { type: ['string', 'null'], format: 'date-time' },
        updated_at: { type: ['string', 'null'], format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
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
