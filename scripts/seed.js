import pg from 'pg';
import fs from 'node:fs';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL wajib diatur sebelum menjalankan seed.');
await client.connect();
try {
  await client.query(fs.readFileSync('db/schema.sql', 'utf8'));
  const { rows: [state] } = await client.query(
    'SELECT (SELECT COUNT(*) FROM projects) AS projects, (SELECT COUNT(*) FROM monthly) AS monthly',
  );
  if (Number(state.projects) || Number(state.monthly)) {
    console.log('Seed dilewati: database sudah berisi data. Data website tidak ditimpa.');
  } else {
    const seedPath = 'data/seed.example.json';
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const ids = {};
    const customRowIds = {};
    let order = 0, count = 0;
    await client.query('BEGIN');
    try {
      for (const year of Object.keys(data)) {
        for (const project of data[year]) {
          if (!ids[project.n]) {
            const { rows: [row] } = await client.query(
              'INSERT INTO projects (name,sort_order) VALUES ($1,$2) RETURNING id',
              [project.n, order++],
            );
            ids[project.n] = row.id;
          }
          for (const row of project.baseRows || []) {
            await client.query(
              `INSERT INTO project_base_rows (project_id,field,label,is_active,sort_order)
               VALUES ($1,$2,$3,$4,$5)
               ON CONFLICT (project_id,field) DO UPDATE SET
                 label=EXCLUDED.label,is_active=EXCLUDED.is_active,sort_order=EXCLUDED.sort_order`,
              [ids[project.n], row.field, row.label, Boolean(row.active), row.sortOrder || 0],
            );
          }
          for (const row of project.customRows || []) {
            const key = `${project.n}:${row.label}`;
            if (!customRowIds[key]) {
              const { rows: [inserted] } = await client.query(
                'INSERT INTO project_rows (project_id,label,operation,sort_order) VALUES ($1,$2,$3,$4) RETURNING id',
                [ids[project.n], row.label, row.operation === 'subtract' ? 'subtract' : 'add', Object.keys(customRowIds).length],
              );
              customRowIds[key] = inserted.id;
            }
            for (let month = 0; month < 12; month += 1) {
              const amount = Number(row.values?.[month]) || 0;
              if (amount) {
                await client.query(
                  `INSERT INTO project_row_values (row_id,year,month,amount) VALUES ($1,$2,$3,$4)
                   ON CONFLICT (row_id,year,month) DO UPDATE SET amount=EXCLUDED.amount`,
                  [customRowIds[key], Number(year), month + 1, amount],
                );
              }
            }
          }
          for (let month = 0; month < 12; month += 1) {
            const values = project.m[month];
            if (values.slice(0, 8).every(value => Number(value) === 0) && values[8] == null) continue;
            await client.query(
              `INSERT INTO monthly (project_id,year,month,t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak,status)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
              [ids[project.n], Number(year), month + 1, ...values.slice(0, 8), values[8]],
            );
            count += 1;
          }
        }
      }
      await client.query('COMMIT');
      console.log(`Seed awal selesai dari ${seedPath}: ${Object.keys(ids).length} project, ${count} baris bulanan.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.end();
}
