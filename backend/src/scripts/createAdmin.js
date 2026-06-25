import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const [, , email, password, name] = process.argv;

if (!email || !password) {
  console.error('Usage: node src/scripts/createAdmin.js <email> <password> [name]');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);

await pool.query(
  `INSERT INTO admin_users (email, password_hash, name)
   VALUES ($1, $2, $3)
   ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3`,
  [email, passwordHash, name || null]
);

console.log(`Admin user ready: ${email}`);
process.exit(0);
