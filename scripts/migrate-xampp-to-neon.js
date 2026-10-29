import mysql from 'mysql2/promise';
import pg from 'pg';

const tables = [
  ['projects', ['id', 'name', 'sort_order']],
  ['app_users', ['id', 'username', 'password_hash', 'created_at', 'updated_at']],
  ['app_sessions', ['token_hash', 'user_id', 'expires_at', 'created_at']],
  ['app_login_limits', ['key_hash', 'window_started', 'attempts']],
  ['app_years', ['year', 'created_at']],
  ['monthly', ['project_id', 'year', 'month', 't1', 't2', 'lain', 'denda', 'reward', 'kerja_kurang', 'suplisi', 'kontrak', 'status', 'updated_at']],
  ['monthly_cell_status', ['project_id', 'year', 'month', 'field', 'status']],
  ['audit_log', ['id', 'at', 'project_id', 'year', 'month', 'field', 'old_value', 'new_value', 'source']],
  ['project_rows', ['id', 'project_id', 'label', 'operation', 'sort_order', 'created_at']],
  ['project_row_values', ['row_id', 'year', 'month', 'amount', 'updated_at']],
  ['project_base_rows', ['project_id', 'field', 'label', 'is_active', 'sort_order']],
];

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL wajib diatur untuk database tujuan Neon.');

const source = await mysql.createConnection({
  host: process.env.SOURCE_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.SOURCE_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.SOURCE_DB_USER || process.env.DB_USER || 'root',
  password: process.env.SOURCE_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '',
  database: process.env.SOURCE_DB_NAME || process.env.DB_NAME || 'pendapatan_up5',
  timezone: 'Z',
});
const destination = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await destination.connect();
  await source.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  const sourceRows = new Map();
  for (const [table, columns] of tables) {
    const [rows] = await source.query(`SELECT ${columns.map(column => `\`${column}\``).join(',')} FROM \`${table}\``);
    sourceRows.set(table, rows);
  }
  await source.query('COMMIT');

  console.log(`Sumber XAMPP berhasil dibaca. Jumlah baris: ${[...sourceRows].map(([table, rows]) => `${table}=${rows.length}`).join(', ')}`);

  await destination.query('BEGIN');
  try {
    for (const [table] of tables) {
      await destination.query(`LOCK TABLE "${table}" IN ACCESS EXCLUSIVE MODE`);
    }
    const counts = [];
    for (const [table] of tables) {
      const { rows: [result] } = await destination.query(`SELECT COUNT(*) AS count FROM "${table}"`);
      counts.push(`${table}=${result.count}`);
      if (Number(result.count) !== 0) {
        throw new Error(`Migrasi dibatalkan: tabel tujuan "${table}" sudah berisi data. Tujuan harus kosong.`);
      }
    }
    console.log(`Tujuan Neon kosong (${counts.join(', ')}). Memulai penyalinan dalam transaksi.`);

    for (const [table, columns] of tables) {
      const rows = sourceRows.get(table);
      if (!rows.length) continue;
      const columnList = columns.map(column => `"${column}"`).join(',');
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(',');
      const insert = `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`;
      for (const row of rows) {
        await destination.query(insert, columns.map(column => row[column]));
      }
    }
    for (const [table, column] of [['projects', 'id'], ['audit_log', 'id'], ['project_rows', 'id']]) {
      await destination.query(
        `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE(MAX("${column}"), 1), MAX("${column}") IS NOT NULL) FROM "${table}"`,
      );
    }
    await destination.query('COMMIT');
  } catch (error) {
    await destination.query('ROLLBACK');
    throw error;
  }

  for (const [table] of tables) {
    const { rows: [result] } = await destination.query(`SELECT COUNT(*) AS count FROM "${table}"`);
    const expected = sourceRows.get(table).length;
    if (Number(result.count) !== expected) {
      throw new Error(`Verifikasi gagal pada "${table}": sumber ${expected}, tujuan ${result.count}.`);
    }
  }
  console.log('Migrasi selesai dan jumlah baris 11 tabel sudah cocok. XAMPP tidak diubah.');
} finally {
  await source.end();
  await destination.end();
}
