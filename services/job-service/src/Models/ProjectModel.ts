import { Model, ModelObject } from 'objection';
import ProjectMemberModel from './ProjectMemberModel.ts';
import ProjectRequiredSkillModel from './ProjectRequiredSkillModel.ts';
import ProjectSuggestionModel from './ProjectSuggestionModel.ts';
import TaskModel from './TaskModel.ts';
import ProjectTimelineModel from './ProjectTimelineModel.ts';

export class ProjectModel extends Model {
  project_id!: number;
  name!: string;
  description?: string | null;
  status!: string;
  start_date!: string;
  end_date!: string;
  budget?: number | null;
  spent?: number | null;
  customer?: string | null;
  progress?: number;
  manager_id!: number;
  created_at?: string;
  updated_at?: string;

  static get tableName() {
    return 'projects';
  }

  static get idColumn() {
    return 'project_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'start_date', 'end_date', 'manager_id'],
      properties: {
        project_id: { type: 'integer' },
        name: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        status: { 
          type: 'string', 
          enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
          default: 'planning'
        },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
        budget: { type: ['number', 'null'] },
        spent: { type: ['number', 'null'] },
        customer: { type: ['string', 'null'], maxLength: 255 },
        progress: { type: ['integer', 'null'], minimum: 0, maximum: 100 },
        manager_id: { type: 'integer' },
        created_at: { type: ['string', 'null'], format: 'date-time' },
        updated_at: { type: ['string', 'null'], format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    return {
      members: {
        relation: Model.HasManyRelation,
        modelClass: ProjectMemberModel,
        join: {
          from: 'projects.project_id',
          to: 'project_members.project_id'
        }
      },
      requiredSkills: {
        relation: Model.HasManyRelation,
        modelClass: ProjectRequiredSkillModel,
        join: {
          from: 'projects.project_id',
          to: 'project_required_skills.project_id'
        }
      },
      suggestions: {
        relation: Model.HasManyRelation,
        modelClass: ProjectSuggestionModel,
        join: {
          from: 'projects.project_id',
          to: 'project_suggestions.project_id'
        }
      },
      tasks: {
        relation: Model.HasManyRelation,
        modelClass: TaskModel,
        join: {
          from: 'projects.project_id',
          to: 'tasks.project_id'
        }
      },
      timeline: {
        relation: Model.HasManyRelation,
        modelClass: ProjectTimelineModel,
        join: {
          from: 'projects.project_id',
          to: 'project_timeline.project_id'
        }
      }
    };
  }
}

export default ProjectModel;
