import { Router } from 'express';
import { pool } from '../db.js';
import { minioPublicClient, BUCKET } from '../minio.js';

const router = Router();

router.get('/room-variants/:token', async (req, res) => {
  const { rows: variantRows } = await pool.query(
    `SELECT rv.id, rv.label, r.name AS room_name
     FROM room_variants rv JOIN rooms r ON r.id = rv.room_id
     WHERE rv.public_token = $1`,
    [req.params.token]
  );
  if (!variantRows[0]) return res.status(404).json({ error: 'Not found' });

  const { rows: photoRows } = await pool.query(
    'SELECT id, file_key, caption FROM room_photos WHERE variant_id = $1 ORDER BY sort_order, id',
    [variantRows[0].id]
  );

  const photos = [];
  for (const photo of photoRows) {
    try {
      const url = await minioPublicClient.presignedGetObject(BUCKET, photo.file_key, 24 * 60 * 60);
      photos.push({ id: photo.id, url, caption: photo.caption });
    } catch (err) {
      console.error('Failed to presign public photo URL:', err);
    }
  }

  res.json({ roomName: variantRows[0].room_name, label: variantRows[0].label, photos });
});

export default router;
