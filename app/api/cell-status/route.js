import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureCellStatusTable } from '../../../lib/cell-status.mjs';
import { syncSeedSnapshot } from '../../../lib/sync-seed.mjs';

const allowed = new Set(['b', 'f', 'u', 'p', 'l', 'h']);

export async function PUT(req) {
  try {
    const body = await req.json();
    const field = Number(body.field);
    if (!(body.year > 2000) || !(body.month >= 0 && body.month < 12) || !Number.isInteger(field) || field < 0 || field > 7) {
      return NextResponse.json({ error: 'Data status sel tidak valid' }, { status: 400 });
    }
    const status = body.status == null || body.status === '' ? null : String(body.status);
    if (status !== null && !allowed.has(status)) return NextResponse.json({ error: 'Status warna tidak dikenal' }, { status: 400 });
    await ensureCellStatusTable(pool);
    const [projects] = await pool.query('SELECT id FROM projects WHERE name=?', [body.project]);
    if (!projects[0]) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 });

    const projectId = projects[0].id, month = Number(body.month) + 1;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('INSERT INTO monthly (project_id,`year`,`month`) VALUES (?,?,?) ON DUPLICATE KEY UPDATE project_id=VALUES(project_id)', [projectId, body.year, month]);
      const [old] = await connection.query('SELECT status FROM monthly_cell_status WHERE project_id=? AND `year`=? AND `month`=? AND field=? FOR UPDATE', [projectId, body.year, month, field]);
      if (status === null) {
        await connection.query('DELETE FROM monthly_cell_status WHERE project_id=? AND `year`=? AND `month`=? AND field=?', [projectId, body.year, month, field]);
      } else {
        await connection.query('INSERT INTO monthly_cell_status (project_id,`year`,`month`,field,status) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)', [projectId, body.year, month, field, status]);
      }
      await connection.query('INSERT INTO audit_log (project_id,`year`,`month`,field,old_value,new_value) VALUES (?,?,?,?,?,?)', [projectId, body.year, month, `warna kolom ${field}`, old[0]?.status ?? null, status]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, status, snapshotSynced });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
