import { Model, ModelObject, JSONSchema } from 'objection';

export interface Cv {
  cv_id: string;
  user_id: number;
  file_path?: string | null;
  original_text?: string | null;
  uploaded_at?: string | null;
}

export class CvModel extends Model implements Cv {
  cv_id!: string;
  user_id!: number;
  file_path?: string | null;
  original_text?: string | null;
  uploaded_at?: string | null;

  static get tableName(): string {
    return 'cvs';
  }

  static get idColumn(): string {
    return 'cv_id';
  }

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: ['cv_id', 'user_id'],
      properties: {
        cv_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'integer' },
        file_path: { type: ['string', 'null'], maxLength: 500 },
        original_text: { type: ['string', 'null'] },
        uploaded_at: { type: ['string', 'null'], format: 'date-time' }
      }
    };
  }
}

export default CvModel;
