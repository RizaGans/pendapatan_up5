import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureProjectRowTables } from '../../../lib/project-rows.mjs';
import { syncSeedSnapshot } from '../../../lib/sync-seed.mjs';

const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });
const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const COLUMNS = ['t1', 't2', 'lain', 'denda', 'reward', 'kerja_kurang', 'suplisi', 'kontrak'];

export async function PATCH(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    await ensureProjectRowTables(pool);
    const body = await req.json();
    const field = Number(body.field), label = clean(body.label);
    if (!Number.isInteger(field) || field < 0 || field > 7 || !label || label.length > 120) return bad('Data uraian tidak valid');
    const [[previous]] = await pool.query('SELECT r.project_id,r.label FROM project_base_rows r JOIN projects p ON p.id=r.project_id WHERE r.field=? AND p.name=? AND r.is_active=1', [field, body.project]);
    if (!previous) return bad('Baris uraian tidak ditemukan', 404);
    const [result] = await pool.query('UPDATE project_base_rows SET label=? WHERE project_id=? AND field=? AND is_active=1', [label, previous.project_id, field]);
    if (!result.affectedRows) return bad('Baris uraian tidak ditemukan', 404);
    await pool.query("INSERT INTO audit_log (project_id,field,old_value,new_value,source) VALUES (?,'ubah uraian',?,?, 'manual')", [previous.project_id, previous.label.slice(0, 40), label.slice(0, 40)]);
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, field, label, snapshotSynced });
  } catch (error) {
    return bad(error.message, 500);
  }
}

export async function DELETE(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  const connection = await pool.getConnection();
  try {
    await ensureProjectRowTables(connection);
    const body = await req.json();
    const field = Number(body.field);
    if (!Number.isInteger(field) || field < 0 || field > 7) return bad('Baris uraian tidak valid');
    const column = COLUMNS[field];
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT r.project_id,r.label FROM project_base_rows r JOIN projects p ON p.id=r.project_id WHERE p.name=? AND r.field=? AND r.is_active=1 FOR UPDATE', [body.project, field]);
    if (!rows[0]) {
      await connection.rollback();
      return bad('Baris uraian tidak ditemukan', 404);
    }
    const projectId = rows[0].project_id;
    await connection.query('UPDATE project_base_rows SET is_active=0 WHERE project_id=? AND field=?', [projectId, field]);
    await connection.query(`UPDATE monthly SET ${column}=0 WHERE project_id=?`, [projectId]);
    await connection.query('DELETE FROM monthly_cell_status WHERE project_id=? AND field=?', [projectId, field]);
    await connection.query('DELETE FROM monthly WHERE project_id=? AND t1=0 AND t2=0 AND lain=0 AND denda=0 AND reward=0 AND kerja_kurang=0 AND suplisi=0 AND kontrak=0 AND status IS NULL', [projectId]);
    await connection.query("INSERT INTO audit_log (project_id,field,old_value,new_value,source) VALUES (?,'hapus uraian',?,'hapus nilai project','manual')", [projectId, rows[0].label.slice(0, 40)]);
    await connection.commit();
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, snapshotSynced });
  } catch (error) {
    await connection.rollback();
    return bad(error.message, 500);
  } finally {
    connection.release();
  }
}
