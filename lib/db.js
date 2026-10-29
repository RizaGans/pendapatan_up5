import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL wajib diatur untuk koneksi PostgreSQL Neon.');
}

const globalForPool = globalThis;
export const pool =
  globalForPool._pool ||
  (globalForPool._pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }));
