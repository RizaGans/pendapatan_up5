import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureProjectRowTables } from '../../../lib/project-rows.mjs';
import { syncSeedSnapshot } from '../../../lib/sync-seed.mjs';

const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });
const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export async function POST(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    await ensureProjectRowTables(pool);
    const body = await req.json();
    const label = clean(body.label);
    const operation = body.operation;
    if (!label || label.length > 120) return bad('Uraian wajib diisi (maksimal 120 karakter)');
    if (!['add', 'subtract'].includes(operation)) return bad('Pilih operasi tambah atau kurang');
    const [[project]] = await pool.query('SELECT id FROM projects WHERE name=?', [body.project]);
    if (!project) return bad('Project tidak ditemukan', 404);
    const [[order]] = await pool.query('SELECT COALESCE(MAX(sort_order),0)+1 AS next_order FROM project_rows WHERE project_id=?', [project.id]);
    const [result] = await pool.query('INSERT INTO project_rows (project_id,label,operation,sort_order) VALUES (?,?,?,?)', [project.id, label, operation, order.next_order]);
    await pool.query("INSERT INTO audit_log (project_id,field,new_value,source) VALUES (?,'baris uraian',?,'manual')", [project.id, label.slice(0, 40)]);
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, row: { id: result.insertId, label, operation }, snapshotSynced }, { status: 201 });
  } catch (error) {
    return bad(error.code === 'ER_DUP_ENTRY' ? 'Uraian tersebut sudah ada di project ini' : error.message, error.code === 'ER_DUP_ENTRY' ? 409 : 500);
  }
}

export async function PATCH(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    await ensureProjectRowTables(pool);
    const body = await req.json();
    const label = clean(body.label);
    const operation = body.operation;
    if (!Number.isInteger(Number(body.id)) || !label || label.length > 120 || !['add', 'subtract'].includes(operation)) return bad('Data uraian tidak valid');
    const [result] = await pool.query('UPDATE project_rows r JOIN projects p ON p.id=r.project_id SET r.label=?,r.operation=? WHERE r.id=? AND p.name=?', [label, operation, Number(body.id), body.project]);
    if (!result.affectedRows) return bad('Uraian tidak ditemukan', 404);
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, row: { id: Number(body.id), label, operation }, snapshotSynced });
  } catch (error) {
    return bad(error.code === 'ER_DUP_ENTRY' ? 'Uraian tersebut sudah ada di project ini' : error.message, error.code === 'ER_DUP_ENTRY' ? 409 : 500);
  }
}

export async function DELETE(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    await ensureProjectRowTables(pool);
    const body = await req.json();
    if (!Number.isInteger(Number(body.id))) return bad('Uraian tidak valid');
    const [result] = await pool.query('DELETE r FROM project_rows r JOIN projects p ON p.id=r.project_id WHERE r.id=? AND p.name=?', [Number(body.id), body.project]);
    if (!result.affectedRows) return bad('Uraian tidak ditemukan', 404);
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, snapshotSynced });
  } catch (error) {
    return bad(error.message, 500);
  }
}
