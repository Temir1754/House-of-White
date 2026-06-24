import { Router } from 'express';
import { pool } from '../db.js';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', optionalAuth, async (req, res) => {
  const { name, phone, date, time, message } = req.body;
  if (!date || !time) return res.status(400).json({ error: 'Missing date/time' });

  const { rows } = await pool.query(
    `INSERT INTO bookings (user_id, name, phone, date, time, message)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user?.id || null, name || req.user?.name || null, phone || null, date, time, message || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  res.json(rows);
});

export default router;
