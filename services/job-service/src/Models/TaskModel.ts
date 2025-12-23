import { Model, ModelObject } from 'objection';
import ProjectModel from './ProjectModel.ts';

export class TaskModel extends Model {
  task_id!: string; // Changed from number to string
  project_id!: number;
  title!: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assignee_id?: number | null;
  start_date?: string | null; // NEW: task start date
  due_date?: string | null;
  estimated_hours?: number;
  estimated_days?: number;
  actual_hours?: number;
  tags?: any;
  depends_on?: string[] | null; // NEW: array of task_ids that must complete first
  ai_metadata?: any; // NEW: AI analysis result
  completed_at?: string | null; // Thời gian user bấm hoàn thành
  approved_by?: number | null; // User ID của người duyệt
  approved_at?: string | null; // Thời gian được duyệt
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
        task_id: { type: 'string' }, // Changed from integer to string
        project_id: { type: 'integer' },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        status: { 
          type: ['string', 'null'],
          enum: ['todo', 'in_progress', 'pending_approval', 'done', null]
        },
        priority: { 
          type: ['string', 'null'],
          enum: ['low', 'medium', 'high', 'urgent', null]
        },
        assignee_id: { type: ['integer', 'null'] },
        start_date: { type: ['string', 'null'], format: 'date' }, // NEW
        due_date: { type: ['string', 'null'], format: 'date' },
  estimated_hours: { type: ['integer', 'null'] },
  estimated_days: { type: ['integer', 'null'] },
        actual_hours: { type: ['integer', 'null'] },
    tags: { type: ['array', 'null'] },
  depends_on: { type: ['array', 'null'] }, // NEW: array of task_ids
  ai_metadata: { type: ['object', 'null'] }, // NEW: JSON object
  completed_at: { type: ['string', 'null'], format: 'date-time' },
  approved_by: { type: ['integer', 'null'] },
  approved_at: { type: ['string', 'null'], format: 'date-time' },
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
