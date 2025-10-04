import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/api.ts';
import knex from './src/lib/database.js';
import { Model } from 'objection';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kết nối Objection với Knex
Model.knex(knex);

const app = express();
const PORT = process.env.PORT || 4004;
const serviceName = 'Application Service';

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files cho applications từ frontend/public
app.use('/applications', express.static(path.join(__dirname, '../../frontend/public/applications')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.url}`);
  console.log(`🌐 Body:`, req.body);
  console.log(`🌐 Params:`, req.params);
  console.log(`🌐 Query:`, req.query);
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'application-service', 
    port: PORT,
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error('❌❌❌ SERVER ERROR:', err);
  console.error('❌ Stack:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌❌❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌❌❌ Uncaught Exception:', error);
});

app.listen(PORT, () => {
  console.log(`🚀 ${serviceName} running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API docs: http://localhost:${PORT}/api`);
});
