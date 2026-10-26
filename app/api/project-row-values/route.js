import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureProjectRowTables } from '../../../lib/project-rows.mjs';
import { syncSeedSnapshot } from '../../../lib/sync-seed.mjs';

export async function PUT(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    await ensureProjectRowTables(pool);
    const body = await req.json();
    const year = Number(body.year), month = Number(body.month), rowId = Number(body.rowId);
    const amount = Math.round(Number(body.value));
    if (!Number.isInteger(year) || year < 1990 || year > 9999 || !Number.isInteger(month) || month < 0 || month > 11 || !Number.isInteger(rowId) || rowId < 1 || !Number.isSafeInteger(amount) || amount < 0) {
      return NextResponse.json({ error: 'Data nominal tidak valid' }, { status: 400 });
    }
    const [rows] = await pool.query('SELECT r.id,p.id AS project_id FROM project_rows r JOIN projects p ON p.id=r.project_id WHERE r.id=? AND p.name=?', [rowId, body.project]);
    if (!rows[0]) return NextResponse.json({ error: 'Uraian tidak ditemukan pada project ini' }, { status: 404 });
    await pool.query('INSERT INTO project_row_values (row_id,`year`,`month`,amount) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount)', [rowId, year, month + 1, amount]);
    await pool.query("INSERT INTO audit_log (project_id,`year`,`month`,field,new_value,source) VALUES (?,?,?,'uraian',?,'manual')", [rows[0].project_id, year, month + 1, String(amount).slice(0, 40)]);
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, snapshotSynced });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
