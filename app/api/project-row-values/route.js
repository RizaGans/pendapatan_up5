import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureProjectRowTables } from '../../../lib/project-rows.mjs';

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
    const { rows: [row] } = await pool.query('SELECT r.id,p.id AS project_id FROM project_rows r JOIN projects p ON p.id=r.project_id WHERE r.id=$1 AND p.name=$2', [rowId, body.project]);
    if (!row) return NextResponse.json({ error: 'Uraian tidak ditemukan pada project ini' }, { status: 404 });
    await pool.query('INSERT INTO project_row_values (row_id,year,month,amount) VALUES ($1,$2,$3,$4) ON CONFLICT (row_id,year,month) DO UPDATE SET amount=EXCLUDED.amount,updated_at=CURRENT_TIMESTAMP', [rowId, year, month + 1, amount]);
    await pool.query("INSERT INTO audit_log (project_id,year,month,field,new_value,source) VALUES ($1,$2,$3,'uraian',$4,'manual')", [row.project_id, year, month + 1, String(amount).slice(0, 40)]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
