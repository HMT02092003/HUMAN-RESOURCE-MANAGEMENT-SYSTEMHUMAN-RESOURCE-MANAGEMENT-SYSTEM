import { Model, ModelObject, JSONSchema } from 'objection';

export interface Skill {
  skill_id: number;
  skill_name: string;
}

export class SkillModel extends Model implements Skill {
  skill_id!: number;
  skill_name!: string;

  static get tableName(): string {
    return 'skills';
  }

  static get idColumn(): string {
    return 'skill_id';
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: ['skill_name'],
      properties: {
        skill_id: { type: 'integer' },
        skill_name: { type: 'string', maxLength: 100 }
      }
    };
  }
}

export default SkillModel;
