import { Model } from 'objection';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class EmailTemplateModel extends Model {
  static tableName = 'email_templates';

  // Fields
  id!: number;
  name!: string;
  key!: string;
  subject!: string;
  content!: string;
  variables!: string;
  active!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static async getByKey(key: string) {
    let result = await this.query().findOne({ key });
    if (!result) {
      throw new Error(`not found key: ${key} in MailTemplate`);
    }
    return {
      subject: result.subject,
      content: result.content,
      variables: result.variables,
    };
  }
}

export default EmailTemplateModel;
