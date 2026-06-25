import { Client } from 'minio';

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
});

// Used only to generate presigned URLs the browser will actually fetch —
// must use the public hostname (proxied by nginx), not the internal Docker one.
export const minioPublicClient = new Client({
  endPoint: process.env.MINIO_PUBLIC_HOST || process.env.MINIO_ENDPOINT,
  port: Number(process.env.MINIO_PUBLIC_PORT || 443),
  useSSL: (process.env.MINIO_PUBLIC_SSL ?? 'true') === 'true',
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
});

export const BUCKET = process.env.MINIO_BUCKET || 'house-of-white';

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
  if (!exists) await minioClient.makeBucket(BUCKET);
}
