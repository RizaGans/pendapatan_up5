import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureCellStatusTable } from '../../../lib/cell-status.mjs';

const allowed = new Set(['b', 'f', 'u', 'p', 'l', 'h']);

export async function PUT(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const field = Number(body.field);
    if (!(body.year > 2000) || !(body.month >= 0 && body.month < 12) || !Number.isInteger(field) || field < 0 || field > 7) {
      return NextResponse.json({ error: 'Data status sel tidak valid' }, { status: 400 });
    }
    const status = body.status == null || body.status === '' ? null : String(body.status);
    if (status !== null && !allowed.has(status)) return NextResponse.json({ error: 'Status warna tidak dikenal' }, { status: 400 });
    await ensureCellStatusTable(pool);
    const { rows: [project] } = await pool.query('SELECT id FROM projects WHERE name=$1', [body.project]);
    if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 });

    const projectId = project.id, month = Number(body.month) + 1;
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      await connection.query(
        'INSERT INTO monthly (project_id,year,month) VALUES ($1,$2,$3) ON CONFLICT (project_id,year,month) DO NOTHING',
        [projectId, body.year, month],
      );
      const { rows: [old] } = await connection.query('SELECT status FROM monthly_cell_status WHERE project_id=$1 AND year=$2 AND month=$3 AND field=$4 FOR UPDATE', [projectId, body.year, month, field]);
      if (status === null) {
        await connection.query('DELETE FROM monthly_cell_status WHERE project_id=$1 AND year=$2 AND month=$3 AND field=$4', [projectId, body.year, month, field]);
      } else {
        await connection.query(
          'INSERT INTO monthly_cell_status (project_id,year,month,field,status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (project_id,year,month,field) DO UPDATE SET status=EXCLUDED.status',
          [projectId, body.year, month, field, status],
        );
      }
      await connection.query('INSERT INTO audit_log (project_id,year,month,field,old_value,new_value) VALUES ($1,$2,$3,$4,$5,$6)', [projectId, body.year, month, `warna kolom ${field}`, old?.status ?? null, status]);
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
