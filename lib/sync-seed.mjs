import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './db.js';
import { ensureCellStatusTable } from './cell-status.mjs';
import { ensureProjectRowTables } from './project-rows.mjs';

let queue = Promise.resolve();

async function writeSnapshot() {
  await ensureCellStatusTable(pool);
  await ensureProjectRowTables(pool);
  const { rows: projects } = await pool.query('SELECT id,name FROM projects ORDER BY sort_order,id');
  const { rows } = await pool.query('SELECT project_id,year,month,t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak,status FROM monthly ORDER BY year,month');
  const { rows: cellStatuses } = await pool.query('SELECT project_id,year,month,field,status FROM monthly_cell_status');
  const { rows: projectRows } = await pool.query('SELECT id,project_id,label,operation,sort_order FROM project_rows ORDER BY project_id,sort_order,id');
  const { rows: baseRows } = await pool.query('SELECT project_id,field,label,is_active,sort_order FROM project_base_rows ORDER BY project_id,sort_order,field');
  const { rows: projectRowValues } = await pool.query('SELECT row_id,year,month,amount FROM project_row_values');
  const customByProject = new Map();
  for (const row of projectRows) {
    const customRows = customByProject.get(row.project_id) || [];
    customRows.push({ id: Number(row.id), label: row.label, operation: row.operation });
    customByProject.set(row.project_id, customRows);
  }
  const customValues = new Map(projectRowValues.map(row => [`${row.row_id}:${row.year}:${row.month}`, Number(row.amount)]));
  const baseRowsByProject = new Map();
  for (const row of baseRows) {
    const rows = baseRowsByProject.get(row.project_id) || [];
    rows.push({ field: Number(row.field), label: row.label, active: Boolean(row.is_active), sortOrder: Number(row.sort_order) });
    baseRowsByProject.set(row.project_id, rows);
  }
  const statusesByMonth = new Map();
  for (const row of cellStatuses) {
    const key = `${row.project_id}:${row.year}:${row.month}`;
    const fields = statusesByMonth.get(key) || {};
    fields[Number(row.field)] = row.status;
    statusesByMonth.set(key, fields);
  }
  const years = [...new Set([...rows.map(row => Number(row.year)), ...projectRowValues.map(row => Number(row.year))])].sort((a,b) => a-b);
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
      customRows: (customByProject.get(project.id) || []).map(row => ({
        label: row.label,
        operation: row.operation,
        values: Array.from({ length: 12 }, (_, month) => customValues.get(`${row.id}:${year}:${month + 1}`) || 0),
      })),
      baseRows: baseRowsByProject.get(project.id) || [],
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