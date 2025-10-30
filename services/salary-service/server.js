import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
// ensure DB connection is initialized and Objection Model is bound before loading routes/controllers
import './src/lib/Databases/Connection.ts';
import routes from './router/api.js';

const app = express();
const PORT = process.env.PORT || 4005;
const serviceName = process.env.SERVICE_NAME || 'salary-service';

app.use(cors({ origin: true, credentials: true }));
// parse JSON with default strict parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Friendly JSON parse error handler: body-parser throws SyntaxError on invalid JSON
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed' && err instanceof SyntaxError) {
    // Return a 400 with a clear message rather than exposing full stack
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  return next(err);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'salary-service', port: PORT });
});

app.use('/api', routes);
// api routes include allowance-types, salary profile and payslip endpoints

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, error: err.message });
});

const salaryServer = app.listen(PORT, () => {
  console.log(`🚀 ${serviceName} running on port ${PORT}`);
});

salaryServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ ${serviceName} port ${PORT} already in use.`);
    process.exit(1);
  }
  console.error(`${serviceName} startup error:`, err);
  process.exit(1);
});
