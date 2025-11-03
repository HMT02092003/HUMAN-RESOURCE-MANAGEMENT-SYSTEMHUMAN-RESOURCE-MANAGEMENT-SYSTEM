import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// Serve uploaded files statically at /uploads
import path from 'path';
import fs from 'fs';
import routes from './routes/api.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4008;
const serviceName = 'Job Service';

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'job-service', port: PORT });
});

app.use('/api', routes);

const uploadsDir = path.resolve(process.cwd(), 'uploads');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {}
app.use('/uploads', express.static(uploadsDir));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 ${serviceName} running on port ${PORT}`);
});
