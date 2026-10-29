import pg from 'pg';
import fs from 'node:fs';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL wajib diatur sebelum membuat skema PostgreSQL.');
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();
  await client.query(fs.readFileSync('db/schema.sql', 'utf8'));
  console.log('Skema PostgreSQL 11 tabel berhasil disiapkan.');
} finally {
  await client.end();
}
