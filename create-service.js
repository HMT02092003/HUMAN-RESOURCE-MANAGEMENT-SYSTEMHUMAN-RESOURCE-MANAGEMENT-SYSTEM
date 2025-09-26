#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('❌ Sử dụng: node create-service.js <service-name> <port> <database-name>');
  console.log('📝 Ví dụ: node create-service.js user-service 4005 user_service');
  process.exit(1);
}

const [serviceName, port, databaseName] = args;
const newServicePath = path.join(process.cwd(), 'services', serviceName);

console.log(`🚀 Tạo service: ${serviceName}`);

if (fs.existsSync(newServicePath)) {
  console.log(`❌ Service ${serviceName} đã tồn tại!`);
  process.exit(1);
}

try {
  // 1. Tạo thư mục
  ['', 'src', 'src/controller', 'src/lib', 'src/Models', 'routes', 'databases', 'databases/migrations', 'databases/seeds'].forEach(dir => {
    fs.mkdirSync(path.join(newServicePath, dir), { recursive: true });
  });

  // 2. package.json
  const packageJson = {
    "name": `hrms-${serviceName}`,
    "version": "1.0.0",
    "main": "server.js",
    "type": "module",
    "scripts": {
      "dev": "nodemon --watch . --ext js,ts,json --exec tsx server.js",
      "start": "tsx server.js",
      "migrate": "knex migrate:latest",
      "seed": "knex seed:run"
    },
    "dependencies": {
      "express": "^4.21.1",
      "cors": "^2.8.5", 
      "dotenv": "^16.5.0",
      "knex": "^3.1.0",
      "objection": "^3.1.5",
      "pg": "^8.13.1",
      "dayjs": "^1.11.13"
    },
    "devDependencies": {
      "nodemon": "^3.1.7",
      "tsx": "^4.19.2"
    }
  };
  fs.writeFileSync(path.join(newServicePath, 'package.json'), JSON.stringify(packageJson, null, 2));

  // 3. .env
  const envContent = `PORT=${port}
NODE_ENV=development
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=123456
DB_PORT=5432
DB_DATABASE=${databaseName}
`;
  fs.writeFileSync(path.join(newServicePath, '.env'), envContent);

  // 4. server.js
  const serverContent = `import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import routes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || ${port};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: '${serviceName}', port: PORT });
});

app.use('/api', routes);

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(\`🚀 \${serviceName} running on port \${PORT}\`);
});
`;
  fs.writeFileSync(path.join(newServicePath, 'server.js'), serverContent);

  // 5. knexfile.js
  const knexContent = `import 'dotenv/config';

export default {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT
    },
    migrations: {
      directory: './databases/migrations'
    },
    seeds: {
      directory: './databases/seeds'
    }
  }
};
`;
  fs.writeFileSync(path.join(newServicePath, 'knexfile.js'), knexContent);

  // 6. database.js
  const dbContent = `import Knex from 'knex';
import { Model } from 'objection';
import knexConfig from '../../knexfile.js';

const knex = Knex(knexConfig.development);
Model.knex(knex);
export default knex;
`;
  fs.writeFileSync(path.join(newServicePath, 'src', 'lib', 'database.js'), dbContent);

  // 7. Controller
  const controllerName = serviceName.replace(/-service$/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const controllerContent = `import dayjs from 'dayjs';

export class ${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Controller {
  static async getAll(req, res) {
    try {
      res.json({ success: true, data: [], timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      res.json({ success: true, data: { id }, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const data = req.body;
      res.status(201).json({ success: true, data, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      res.json({ success: true, data: { id, ...data }, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      res.json({ success: true, message: \`Deleted \${id}\`, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
`;
  fs.writeFileSync(path.join(newServicePath, 'src', 'controller', `${serviceName.replace(/-service$/, '')}-controller.js`), controllerContent);

  // 8. Routes
  const routesContent = `import express from 'express';
import { ${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Controller } from '../src/controller/${serviceName.replace(/-service$/, '')}-controller.js';

const router = express.Router();

router.get('/', ${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Controller.getAll);
router.get('/:id', ${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Controller.getById);
router.post('/', ${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Controller.create);
router.put('/:id', ${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Controller.update);
router.delete('/:id', ${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Controller.delete);

export default router;
`;
  fs.writeFileSync(path.join(newServicePath, 'routes', 'api.js'), routesContent);

  // 9. Model
  const modelContent = `import { Model } from 'objection';

export class ${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Model extends Model {
  static get tableName() {
    return '${serviceName.replace(/-service$/, '').replace(/-/g, '_')}s';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
      }
    };
  }

  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}
`;
  fs.writeFileSync(path.join(newServicePath, 'src', 'Models', `${controllerName.charAt(0).toUpperCase() + controllerName.slice(1)}Model.js`), modelContent);

  // 10. Migration
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const migrationContent = `export async function up(knex) {
  return knex.schema.createTable('${serviceName.replace(/-service$/, '').replace(/-/g, '_')}s', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('${serviceName.replace(/-service$/, '').replace(/-/g, '_')}s');
}
`;
  fs.writeFileSync(path.join(newServicePath, 'databases', 'migrations', `${timestamp}_create_${serviceName.replace(/-service$/, '').replace(/-/g, '_')}_table.js`), migrationContent);

  // 11. Seed
  const seedContent = `export async function seed(knex) {
  await knex('${serviceName.replace(/-service$/, '').replace(/-/g, '_')}s').del();
  await knex('${serviceName.replace(/-service$/, '').replace(/-/g, '_')}s').insert([
    { name: 'Sample 1' },
    { name: 'Sample 2' }
  ]);
}
`;
  fs.writeFileSync(path.join(newServicePath, 'databases', 'seeds', `001_${serviceName.replace(/-service$/, '').replace(/-/g, '_')}_seed.js`), seedContent);

  // 12. Install dependencies
  console.log('📥 Installing...');
  process.chdir(newServicePath);
  execSync('yarn install', { stdio: 'inherit' });

  console.log('\\n✅ Service created!');
  console.log('\\n📋 Next:');
  console.log(`1. cd services/${serviceName}`);
  console.log(`2. createdb ${databaseName}`);
  console.log(`3. yarn migrate && yarn seed`);
  console.log(`4. yarn dev`);

} catch (error) {
  console.error('❌ Error:', error.message);
  if (fs.existsSync(newServicePath)) {
    fs.rmSync(newServicePath, { recursive: true, force: true });
  }
  process.exit(1);
}
