import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// Serve uploaded files statically at /uploads
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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

// Resolve uploads directory relative to this file so static serving works
// regardless of the working directory used to start the process.
let uploadsDir: string;
try {
  // Use fileURLToPath to convert import.meta.url to a proper filesystem path
  const __filename = fileURLToPath(import.meta.url);
  const srcDir = path.dirname(__filename);
  uploadsDir = path.resolve(srcDir, 'uploads');
} catch (err) {
  // Fallback to process.cwd()
  uploadsDir = path.resolve(process.cwd(), 'uploads');
}

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {}

console.log('[job-service] Serving uploads from:', uploadsDir);
app.use('/uploads', express.static(uploadsDir));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
});

app.listen(PORT, () => {
  console.log(`🚀 ${serviceName} running on port ${PORT}`);
});
