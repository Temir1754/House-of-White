import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });

  const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  res.json({ user: { id: admin.id, email: admin.email, name: admin.name, isAdmin: true } });
});

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET name = $3, picture = $4
       RETURNING id, email, name, picture, is_admin`,
      [googleId, email, name, picture]
    );
    const user = rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Google verification failed' });
  }
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    res.json({ user: jwt.verify(token, process.env.JWT_SECRET) });
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

export default router;
