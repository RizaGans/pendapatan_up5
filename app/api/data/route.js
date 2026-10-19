import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureCellStatusTable } from '../../../lib/cell-status.mjs';

export const dynamic = 'force-dynamic';

// Keluaran: { "2026": [ { n: 'nama project', m: [12 bulan x [t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak,status]] } ] }
export async function GET() {
  try {
    await ensureCellStatusTable(pool);
    const [ps] = await pool.query('SELECT id, name FROM projects ORDER BY sort_order, id');
    const [rows] = await pool.query('SELECT * FROM monthly');
    const [savedYears] = await pool.query('SELECT `year` FROM app_years');
    const [cellStatuses] = await pool.query('SELECT project_id,`year`,`month`,field,status FROM monthly_cell_status');
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
    const years = new Set([...Object.keys(by), ...savedYears.map((row) => String(row.year))]);
    if (!years.size) years.add(String(new Date().getFullYear()));
    for (const y of years) {
      out[y] = ps.map((p) => ({
        n: p.name,
        m: by[y]?.[p.id] ?? Array.from({ length: 12 }, () => [0, 0, 0, 0, 0, 0, 0, 0, null]),
      }));
    }
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
