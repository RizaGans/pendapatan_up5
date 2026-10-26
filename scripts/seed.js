import mysql from 'mysql2/promise';
import fs from 'fs';

const c = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
});
await c.query(fs.readFileSync('db/schema.sql', 'utf8'));
await c.query('USE pendapatan_up5');

const [[state]] = await c.query('SELECT (SELECT COUNT(*) FROM projects) AS projects, (SELECT COUNT(*) FROM monthly) AS monthly');
if (Number(state.projects) || Number(state.monthly)) {
  console.log('Seed dilewati: database sudah berisi data. Data website tidak ditimpa.');
} else {
  const seedPath = fs.existsSync('data/seed.json') ? 'data/seed.json' : 'data/seed.example.json';
  const D = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const ids = {};
  const customRowIds = {};
  let order = 0, count = 0;
  for (const y of Object.keys(D)) {
    for (const p of D[y]) {
      if (!ids[p.n]) {
        const [r] = await c.query('INSERT INTO projects (name, sort_order) VALUES (?,?)', [p.n, order++]);
        ids[p.n] = r.insertId;
      }
      for (const row of p.baseRows || []) {
        await c.query('INSERT INTO project_base_rows (project_id,field,label,is_active,sort_order) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE label=VALUES(label),is_active=VALUES(is_active),sort_order=VALUES(sort_order)', [ids[p.n], row.field, row.label, row.active ? 1 : 0, row.sortOrder || 0]);
      }
      for (const row of p.customRows || []) {
        const key = `${p.n}:${row.label}`;
        if (!customRowIds[key]) {
          const [r] = await c.query('INSERT INTO project_rows (project_id,label,operation,sort_order) VALUES (?,?,?,?)', [ids[p.n], row.label, row.operation === 'subtract' ? 'subtract' : 'add', Object.keys(customRowIds).length]);
          customRowIds[key] = r.insertId;
        }
        for (let i = 0; i < 12; i++) {
          const amount = Number(row.values?.[i]) || 0;
          if (amount) await c.query('INSERT INTO project_row_values (row_id,`year`,`month`,amount) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount)', [customRowIds[key], +y, i + 1, amount]);
        }
      }
      for (let i = 0; i < 12; i++) {
        const m = p.m[i];
        if (m.slice(0, 8).every(value => Number(value) === 0) && m[8] == null) continue;
        await c.query(
          'INSERT INTO monthly (project_id,`year`,`month`,t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [ids[p.n], +y, i + 1, ...m.slice(0, 8), m[8]],
        );
        count++;
      }
    }
  }
  console.log(`Seed awal selesai dari ${seedPath}: ${Object.keys(ids).length} project, ${count} baris bulanan.`);
}
await c.end();
