import { JSONSchema, Model } from 'objection';

export interface Skill {
  skill_id: number;
  skill_name: string;
}

export class SkillModel extends Model implements Skill {
  skill_id!: number;
  skill_name!: string;

  static override get tableName(): string {
    return 'skills';
  }

  static override get idColumn(): string {
    return 'skill_id';
  }

  static override get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        skill_id: { type: 'integer' },
        skill_name: { type: 'string' }
      }
    };
  }
}

export default SkillModel;
