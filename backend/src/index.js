import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { ensureBucket } from './minio.js';
import authRoutes from './routes/auth.js';
import bookingsRoutes from './routes/bookings.js';
import projectsRoutes from './routes/projects.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/upload', uploadRoutes);

const port = process.env.PORT || 4000;

ensureBucket()
  .catch((err) => console.error('Failed to ensure MinIO bucket:', err.message))
  .finally(() => {
    app.listen(port, () => console.log(`Backend listening on port ${port}`));
  });
