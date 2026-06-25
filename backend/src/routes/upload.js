import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { minioClient, minioPublicClient, BUCKET } from '../minio.js';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
const router = Router();

router.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  const { projectId, category } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file' });
  if (!projectId) return res.status(400).json({ error: 'Missing projectId' });

  const key = `${projectId}/${randomUUID()}-${req.file.originalname}`;
  await minioClient.putObject(BUCKET, key, req.file.buffer, req.file.size, {
    'Content-Type': req.file.mimetype,
  });

  const { rows } = await pool.query(
    `INSERT INTO project_files (project_id, user_id, file_key, file_name, category)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, file_name, category, created_at`,
    [projectId, req.user.id, key, req.file.originalname, category || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/:fileId/url', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT file_key FROM project_files WHERE id = $1', [req.params.fileId]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });

  const url = await minioPublicClient.presignedGetObject(BUCKET, rows[0].file_key, 24 * 60 * 60);
  res.json({ url });
});

export default router;
