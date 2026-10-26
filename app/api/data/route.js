import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureCellStatusTable } from '../../../lib/cell-status.mjs';
import { ensureProjectRowTables } from '../../../lib/project-rows.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    await ensureCellStatusTable(pool);
    await ensureProjectRowTables(pool);
    const [ps] = await pool.query('SELECT id, name FROM projects ORDER BY sort_order, id');
    const [rows] = await pool.query('SELECT * FROM monthly');
    const [savedYears] = await pool.query('SELECT `year` FROM app_years');
    const [cellStatuses] = await pool.query('SELECT project_id,`year`,`month`,field,status FROM monthly_cell_status');
    const [projectRows] = await pool.query('SELECT id,project_id,label,operation,sort_order FROM project_rows ORDER BY project_id,sort_order,id');
    const [baseRows] = await pool.query('SELECT project_id,field,label,is_active,sort_order FROM project_base_rows ORDER BY project_id,sort_order,field');
    const [projectRowValues] = await pool.query('SELECT row_id,`year`,`month`,amount FROM project_row_values');
    const rowValues = new Map(projectRowValues.map((row) => [`${row.row_id}:${row.year}:${row.month}`, Number(row.amount)]));
    const rowsByProject = new Map();
    for (const row of projectRows) {
      const rows = rowsByProject.get(row.project_id) || [];
      rows.push({ id: row.id, label: row.label, operation: row.operation });
      rowsByProject.set(row.project_id, rows);
    }
    const baseRowsByProject = new Map();
    for (const row of baseRows) {
      const rows = baseRowsByProject.get(row.project_id) || [];
      rows.push({ field: Number(row.field), label: row.label, active: Boolean(row.is_active) });
      baseRowsByProject.set(row.project_id, rows);
    }
    const statusesByMonth = new Map();
    for (const row of cellStatuses) {
      const key = `${row.project_id}:${row.year}:${row.month}`;
      const fields = statusesByMonth.get(key) || {};
      fields[Number(row.field)] = row.status;
      statusesByMonth.set(key, fields);
    }
    const by = {};
    for (const r of rows) {
      const yr = (by[r.year] ??= {});
      const pj = (yr[r.project_id] ??= Array.from({ length: 12 }, () => [0, 0, 0, 0, 0, 0, 0, 0, null]));
      pj[r.month - 1] = [r.t1, r.t2, r.lain, r.denda, r.reward, r.kerja_kurang, r.suplisi, r.kontrak].map(Number).concat([r.status, statusesByMonth.get(`${r.project_id}:${r.year}:${r.month}`) || {}]);
    }
    const out = {};
    const years = new Set([...Object.keys(by), ...savedYears.map((row) => String(row.year)), ...projectRowValues.map((row) => String(row.year))]);
    if (!years.size) years.add(String(new Date().getFullYear()));
    for (const y of years) {
      out[y] = ps.map((p) => ({
        n: p.name,
        m: by[y]?.[p.id] ?? Array.from({ length: 12 }, () => [0, 0, 0, 0, 0, 0, 0, 0, null]),
        customRows: (rowsByProject.get(p.id) || []).map((row) => ({
          ...row,
          values: Array.from({ length: 12 }, (_, month) => rowValues.get(`${row.id}:${y}:${month + 1}`) || 0),
        })),
        baseRows: baseRowsByProject.get(p.id) || [],
      }));
    }
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
