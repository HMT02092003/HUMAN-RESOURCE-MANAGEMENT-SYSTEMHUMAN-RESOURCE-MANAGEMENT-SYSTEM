import { Model, ModelObject, JSONSchema } from 'objection';
import SkillModel from './SkillModel.ts';

export interface UserSkill {
  user_id: number;
  skill_id: number;
  proficiency_level?: string | null;
}

export class UserSkillModel extends Model implements UserSkill {
  user_id!: number;
  skill_id!: number;
  proficiency_level?: string | null;

  static get tableName(): string {
    return 'user_skills';
  }

  static get idColumn(): string[] {
    return ['user_id', 'skill_id'];
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: ['user_id', 'skill_id'],
      properties: {
        user_id: { type: 'integer' },
        skill_id: { type: 'integer' },
        proficiency_level: { type: ['string', 'null'], maxLength: 5 }
      }
    };
  }

  static get relationMappings() {
    return {
      skill: {
        relation: Model.BelongsToOneRelation,
        modelClass: SkillModel,
        join: {
          from: 'user_skills.skill_id',
          to: 'skills.skill_id'
        }
      }
    };
  }
}

export default UserSkillModel;
