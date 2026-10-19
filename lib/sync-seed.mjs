import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './db.js';
import { ensureCellStatusTable } from './cell-status.mjs';

let queue = Promise.resolve();

async function writeSnapshot() {
  await ensureCellStatusTable(pool);
  const [projects] = await pool.query('SELECT id,name FROM projects ORDER BY sort_order,id');
  const [rows] = await pool.query('SELECT project_id,`year`,`month`,t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak,status FROM monthly ORDER BY `year`,`month`');
  const [cellStatuses] = await pool.query('SELECT project_id,`year`,`month`,field,status FROM monthly_cell_status');
  const statusesByMonth = new Map();
  for (const row of cellStatuses) {
    const key = `${row.project_id}:${row.year}:${row.month}`;
    const fields = statusesByMonth.get(key) || {};
    fields[Number(row.field)] = row.status;
    statusesByMonth.set(key, fields);
  }
  const years = [...new Set(rows.map(row => Number(row.year)))].sort((a,b) => a-b);
  if (!years.length) years.push(new Date().getFullYear());

  const byProject = new Map();
  for (const row of rows) {
    const key = `${row.year}:${row.project_id}`;
    const months = byProject.get(key) || Array.from({ length: 12 }, () => [0,0,0,0,0,0,0,0,null]);
    months[Number(row.month) - 1] = [row.t1,row.t2,row.lain,row.denda,row.reward,row.kerja_kurang,row.suplisi,row.kontrak].map(Number).concat([row.status, statusesByMonth.get(`${row.project_id}:${row.year}:${row.month}`) || {}]);
    byProject.set(key, months);
  }

  const snapshot = {};
  for (const year of years) {
    snapshot[year] = projects.map(project => ({
      n: project.name,
      m: byProject.get(`${year}:${project.id}`) || Array.from({ length: 12 }, () => [0,0,0,0,0,0,0,0,null]),
    }));
  }

  const target = path.join(process.cwd(), 'data', 'seed.json');
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(snapshot)}\n`, 'utf8');
  await fs.rename(temp, target);
}

export function syncSeedSnapshot() {
  const task = queue.then(writeSnapshot);
  queue = task.catch(error => console.error('Gagal memperbarui snapshot data/seed.json:', error));
  return task.then(() => true, () => false);
}
