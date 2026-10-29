import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureProjectRowTables } from '../../../lib/project-rows.mjs';

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
    const { rows: [previous] } = await pool.query('SELECT r.project_id,r.label FROM project_base_rows r JOIN projects p ON p.id=r.project_id WHERE r.field=$1 AND p.name=$2 AND r.is_active=TRUE', [field, body.project]);
    if (!previous) return bad('Baris uraian tidak ditemukan', 404);
    const { rowCount } = await pool.query('UPDATE project_base_rows SET label=$1 WHERE project_id=$2 AND field=$3 AND is_active=TRUE', [label, previous.project_id, field]);
    if (!rowCount) return bad('Baris uraian tidak ditemukan', 404);
    await pool.query("INSERT INTO audit_log (project_id,field,old_value,new_value,source) VALUES ($1,'ubah uraian',$2,$3,'manual')", [previous.project_id, previous.label.slice(0, 40), label.slice(0, 40)]);
    return NextResponse.json({ ok: true, field, label });
  } catch (error) {
    return bad(error.message, 500);
  }
}

export async function DELETE(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  const connection = await pool.connect();
  try {
    await ensureProjectRowTables(connection);
    const body = await req.json();
    const field = Number(body.field);
    if (!Number.isInteger(field) || field < 0 || field > 7) return bad('Baris uraian tidak valid');
    const column = COLUMNS[field];
    await connection.query('BEGIN');
    const { rows } = await connection.query('SELECT r.project_id,r.label FROM project_base_rows r JOIN projects p ON p.id=r.project_id WHERE p.name=$1 AND r.field=$2 AND r.is_active=TRUE FOR UPDATE', [body.project, field]);
    if (!rows[0]) {
      await connection.query('ROLLBACK');
      return bad('Baris uraian tidak ditemukan', 404);
    }
    const projectId = rows[0].project_id;
    await connection.query('UPDATE project_base_rows SET is_active=FALSE WHERE project_id=$1 AND field=$2', [projectId, field]);
    await connection.query(`UPDATE monthly SET ${column}=0 WHERE project_id=$1`, [projectId]);
    await connection.query('DELETE FROM monthly_cell_status WHERE project_id=$1 AND field=$2', [projectId, field]);
    await connection.query('DELETE FROM monthly WHERE project_id=$1 AND t1=0 AND t2=0 AND lain=0 AND denda=0 AND reward=0 AND kerja_kurang=0 AND suplisi=0 AND kontrak=0 AND status IS NULL', [projectId]);
    await connection.query("INSERT INTO audit_log (project_id,field,old_value,new_value,source) VALUES ($1,'hapus uraian',$2,'hapus nilai project','manual')", [projectId, rows[0].label.slice(0, 40)]);
    await connection.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (error) {
    await connection.query('ROLLBACK');
    return bad(error.message, 500);
  } finally {
    connection.release();
  }
}
