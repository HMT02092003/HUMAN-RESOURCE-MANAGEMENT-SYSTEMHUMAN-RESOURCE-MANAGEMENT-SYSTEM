import { JSONSchema, Model } from 'objection';

export interface UserSkill {
  user_id: number;
  skill_id: number;
  proficiency_level?: string | null;
}

export class UserSkillModel extends Model implements UserSkill {
  user_id!: number;
  skill_id!: number;
  proficiency_level?: string | null;

  static override get tableName(): string {
    return 'user_skills';
  }

  static override get idColumn(): Array<keyof UserSkill> {
    return ['user_id', 'skill_id'];
  }

  static override get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        user_id: { type: 'integer' },
        skill_id: { type: 'integer' },
        proficiency_level: { type: ['string', 'null'] }
      }
    };
  }
}

export default UserSkillModel;
