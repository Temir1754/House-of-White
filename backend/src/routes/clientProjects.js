import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import { minioClient, BUCKET } from '../minio.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
const router = Router();

async function loadFullProject(slug) {
  const { rows: projectRows } = await pool.query(
    `SELECT cp.*, c.id AS client_id, c.name AS client_name, c.phone AS client_phone,
            c.email AS client_email, c.address AS client_address, c.property_type,
            c.area, c.client_since, c.measurements_date, c.handover_date, c.user_id AS client_user_id
     FROM client_projects cp
     JOIN clients c ON c.id = cp.client_id
     WHERE cp.slug = $1`,
    [slug]
  );
  const project = projectRows[0];
  if (!project) return null;

  const { rows: rooms } = await pool.query(
    'SELECT * FROM rooms WHERE client_project_id = $1 ORDER BY sort_order, id',
    [project.id]
  );
  const fullRooms = [];
  for (const room of rooms) {
    const { rows: variantRows } = await pool.query(
      'SELECT * FROM room_variants WHERE room_id = $1 ORDER BY sort_order, id',
      [room.id]
    );
    const variants = [];
    for (const variant of variantRows) {
      const { rows: photoRows } = await pool.query(
        'SELECT * FROM room_photos WHERE variant_id = $1 ORDER BY sort_order, id',
        [variant.id]
      );
      const photos = [];
      for (const photo of photoRows) {
        const { rows: comments } = await pool.query(
          'SELECT id, text, x, y, created_by, created_at FROM photo_comments WHERE photo_id = $1 ORDER BY id',
          [photo.id]
        );
        photos.push({
          id: photo.id,
          fileKey: photo.file_key,
          caption: photo.caption,
          approved: photo.approved,
          comments,
        });
      }
      variants.push({ id: variant.id, label: variant.label, photos });
    }
    fullRooms.push({
      id: room.id,
      name: room.name,
      status: room.status,
      activeVariant: room.active_variant,
      variants,
    });
  }

  const { rows: categoryRows } = await pool.query(
    'SELECT * FROM spec_categories WHERE client_project_id = $1 ORDER BY sort_order, id',
    [project.id]
  );
  const spec = [];
  for (const category of categoryRows) {
    const { rows: itemRows } = await pool.query(
      'SELECT id, name, room, note, price, qty, status FROM spec_items WHERE category_id = $1 ORDER BY sort_order, id',
      [category.id]
    );
    spec.push({
      id: category.id,
      cat: category.name,
      items: itemRows.map((it) => ({ ...it, price: Number(it.price) })),
    });
  }

  const { rows: visitRows } = await pool.query(
    'SELECT id, visit_date, note, file_key FROM site_visits WHERE client_project_id = $1 ORDER BY id DESC',
    [project.id]
  );
  const visits = visitRows.map((v) => ({ id: v.id, date: v.visit_date, note: v.note, fileKey: v.file_key }));

  return {
    id: project.id,
    slug: project.slug,
    label: project.label,
    stage: project.stage,
    stageStatuses: project.stage_statuses,
    status: project.status,
    budget: { total: Number(project.budget_total) },
    client: {
      id: project.client_id,
      name: project.client_name,
      phone: project.client_phone,
      email: project.client_email,
      address: project.client_address,
      propertyType: project.property_type,
      area: project.area,
      since: project.client_since,
      measurements: project.measurements_date,
      handover: project.handover_date,
      userId: project.client_user_id,
    },
    rooms: fullRooms,
    spec,
    visits,
  };
}

async function canAccess(req, slug) {
  if (req.user?.isAdmin) return true;
  const { rows } = await pool.query(
    `SELECT 1 FROM client_projects cp JOIN clients c ON c.id = cp.client_id
     WHERE cp.slug = $1 AND c.user_id = $2`,
    [slug, req.user?.id]
  );
  return rows.length > 0;
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT cp.id, cp.slug, cp.label, cp.stage, cp.status, cp.budget_total,
            c.name AS client_name
     FROM client_projects cp JOIN clients c ON c.id = cp.client_id
     ORDER BY cp.created_at DESC`
  );
  res.json(rows);
});

router.get('/:slug', requireAuth, async (req, res) => {
  if (!(await canAccess(req, req.params.slug))) return res.status(403).json({ error: 'Forbidden' });
  const project = await loadFullProject(req.params.slug);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { slug, label, client } = req.body;
  if (!slug || !label || !client?.name) {
    return res.status(400).json({ error: 'Missing slug/label/client.name' });
  }

  const { rows: clientRows } = await pool.query(
    `INSERT INTO clients (name, phone, email, address, property_type, area, client_since, measurements_date, handover_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      client.name,
      client.phone || null,
      client.email || null,
      client.address || null,
      client.propertyType || null,
      client.area || null,
      client.since || null,
      client.measurements || null,
      client.handover || null,
    ]
  );

  const { rows: projectRows } = await pool.query(
    `INSERT INTO client_projects (client_id, slug, label) VALUES ($1, $2, $3) RETURNING *`,
    [clientRows[0].id, slug, label]
  );

  res.status(201).json(projectRows[0]);
});

router.patch('/:slug', requireAuth, requireAdmin, async (req, res) => {
  const { stage, stageStatuses, status, budgetTotal } = req.body;
  const { rows } = await pool.query(
    `UPDATE client_projects SET
       stage = COALESCE($1, stage),
       stage_statuses = COALESCE($2, stage_statuses),
       status = COALESCE($3, status),
       budget_total = COALESCE($4, budget_total)
     WHERE slug = $5 RETURNING *`,
    [stage ?? null, stageStatuses ? JSON.stringify(stageStatuses) : null, status || null, budgetTotal ?? null, req.params.slug]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/:slug/rooms', requireAuth, requireAdmin, async (req, res) => {
  const { rows: projectRows } = await pool.query('SELECT id FROM client_projects WHERE slug = $1', [req.params.slug]);
  if (!projectRows[0]) return res.status(404).json({ error: 'Project not found' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const { rows: roomRows } = await pool.query(
    'INSERT INTO rooms (client_project_id, name) VALUES ($1, $2) RETURNING *',
    [projectRows[0].id, name]
  );
  const { rows: variantRows } = await pool.query(
    "INSERT INTO room_variants (room_id, label) VALUES ($1, 'Вариант 1') RETURNING *",
    [roomRows[0].id]
  );

  res.status(201).json({ ...roomRows[0], variants: [{ ...variantRows[0], photos: [] }] });
});

router.patch('/rooms/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, status, activeVariant, sortOrder } = req.body;
  const { rows } = await pool.query(
    `UPDATE rooms SET name = COALESCE($1, name), status = COALESCE($2, status),
       active_variant = COALESCE($3, active_variant), sort_order = COALESCE($4, sort_order)
     WHERE id = $5 RETURNING *`,
    [name || null, status || null, activeVariant ?? null, sortOrder ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/rooms/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

router.post('/rooms/:id/variants', requireAuth, requireAdmin, async (req, res) => {
  const { label } = req.body;
  if (!label) return res.status(400).json({ error: 'Missing label' });
  const { rows } = await pool.query(
    'INSERT INTO room_variants (room_id, label) VALUES ($1, $2) RETURNING *',
    [req.params.id, label]
  );
  res.status(201).json({ ...rows[0], photos: [] });
});

router.patch('/room-variants/:id', requireAuth, requireAdmin, async (req, res) => {
  const { label } = req.body;
  if (!label) return res.status(400).json({ error: 'Missing label' });
  const { rows } = await pool.query(
    'UPDATE room_variants SET label = $1 WHERE id = $2 RETURNING *',
    [label, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/room-variants/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM room_variants WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

router.post('/room-variants/:id/photos', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const key = `rooms/${req.params.id}/${randomUUID()}-${req.file.originalname}`;
  await minioClient.putObject(BUCKET, key, req.file.buffer, req.file.size, {
    'Content-Type': req.file.mimetype,
  });

  const { rows } = await pool.query(
    'INSERT INTO room_photos (variant_id, file_key) VALUES ($1, $2) RETURNING *',
    [req.params.id, key]
  );
  res.status(201).json({ ...rows[0], comments: [] });
});

router.get('/room-photos/:id/url', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT file_key FROM room_photos WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  const url = await minioClient.presignedGetObject(BUCKET, rows[0].file_key, 24 * 60 * 60);
  res.json({ url });
});

router.patch('/room-photos/:id', requireAuth, requireAdmin, async (req, res) => {
  const { caption, approved } = req.body;
  const { rows } = await pool.query(
    `UPDATE room_photos SET caption = COALESCE($1, caption), approved = COALESCE($2, approved)
     WHERE id = $3 RETURNING *`,
    [caption ?? null, approved ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/room-photos/:id', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT file_key FROM room_photos WHERE id = $1', [req.params.id]);
  if (rows[0]) await minioClient.removeObject(BUCKET, rows[0].file_key).catch(() => {});
  await pool.query('DELETE FROM room_photos WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

router.post('/room-photos/:id/comments', requireAuth, async (req, res) => {
  const { text, x, y } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  const { rows } = await pool.query(
    `INSERT INTO photo_comments (photo_id, text, x, y, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, text, x ?? null, y ?? null, req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.post('/:slug/spec-categories', requireAuth, requireAdmin, async (req, res) => {
  const { rows: projectRows } = await pool.query('SELECT id FROM client_projects WHERE slug = $1', [req.params.slug]);
  if (!projectRows[0]) return res.status(404).json({ error: 'Project not found' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const { rows } = await pool.query(
    'INSERT INTO spec_categories (client_project_id, name) VALUES ($1, $2) RETURNING *',
    [projectRows[0].id, name]
  );
  res.status(201).json({ ...rows[0], items: [] });
});

router.post('/spec-categories/:id/items', requireAuth, requireAdmin, async (req, res) => {
  const { name, room, note, price, qty, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const { rows } = await pool.query(
    `INSERT INTO spec_items (category_id, name, room, note, price, qty, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.params.id, name, room || null, note || null, price || 0, qty || 1, status || 'wait']
  );
  res.status(201).json(rows[0]);
});

router.patch('/spec-items/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, room, note, price, qty, status } = req.body;
  const { rows } = await pool.query(
    `UPDATE spec_items SET name = COALESCE($1, name), room = COALESCE($2, room),
       note = COALESCE($3, note), price = COALESCE($4, price), qty = COALESCE($5, qty),
       status = COALESCE($6, status) WHERE id = $7 RETURNING *`,
    [name || null, room ?? null, note ?? null, price ?? null, qty ?? null, status || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/spec-items/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM spec_items WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

router.patch('/:slug/client', requireAuth, requireAdmin, async (req, res) => {
  const { name, phone, email, address, propertyType, area, since, measurements, handover } = req.body;
  const { rows: projectRows } = await pool.query('SELECT client_id FROM client_projects WHERE slug = $1', [req.params.slug]);
  if (!projectRows[0]) return res.status(404).json({ error: 'Project not found' });

  const { rows } = await pool.query(
    `UPDATE clients SET
       name = COALESCE($1, name), phone = COALESCE($2, phone), email = COALESCE($3, email),
       address = COALESCE($4, address), property_type = COALESCE($5, property_type),
       area = COALESCE($6, area), client_since = COALESCE($7, client_since),
       measurements_date = COALESCE($8, measurements_date), handover_date = COALESCE($9, handover_date)
     WHERE id = $10 RETURNING *`,
    [
      name ?? null, phone ?? null, email ?? null, address ?? null, propertyType ?? null,
      area ?? null, since ?? null, measurements ?? null, handover ?? null, projectRows[0].client_id,
    ]
  );
  res.json(rows[0]);
});

router.post('/:slug/visits', requireAuth, requireAdmin, async (req, res) => {
  const { rows: projectRows } = await pool.query('SELECT id FROM client_projects WHERE slug = $1', [req.params.slug]);
  if (!projectRows[0]) return res.status(404).json({ error: 'Project not found' });

  const { date, note, fileKey } = req.body;
  if (!date) return res.status(400).json({ error: 'Missing date' });

  const { rows } = await pool.query(
    `INSERT INTO site_visits (client_project_id, visit_date, note, file_key) VALUES ($1, $2, $3, $4) RETURNING *`,
    [projectRows[0].id, date, note || null, fileKey || null]
  );
  res.status(201).json(rows[0]);
});

export default router;
