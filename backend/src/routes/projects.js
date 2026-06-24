import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/:slug', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM projects WHERE slug = $1', [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });

  const { rows: files } = await pool.query(
    'SELECT id, file_name, category, created_at FROM project_files WHERE project_id = $1',
    [rows[0].id]
  );
  res.json({ ...rows[0], files });
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, slug, description } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'Missing title/slug' });

  const { rows } = await pool.query(
    'INSERT INTO projects (title, slug, description) VALUES ($1, $2, $3) RETURNING *',
    [title, slug, description || null]
  );
  res.status(201).json(rows[0]);
});

export default router;
