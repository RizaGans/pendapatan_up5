import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { ensureProjectRowTables } from '../../../lib/project-rows.mjs';

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
    const { rows: [project] } = await pool.query('SELECT id FROM projects WHERE name=$1', [body.project]);
    if (!project) return bad('Project tidak ditemukan', 404);
    const { rows: [order] } = await pool.query('SELECT COALESCE(MAX(sort_order),0)+1 AS next_order FROM project_rows WHERE project_id=$1', [project.id]);
    const { rows: [row] } = await pool.query('INSERT INTO project_rows (project_id,label,operation,sort_order) VALUES ($1,$2,$3,$4) RETURNING id', [project.id, label, operation, order.next_order]);
    await pool.query("INSERT INTO audit_log (project_id,field,new_value,source) VALUES ($1,'baris uraian',$2,'manual')", [project.id, label.slice(0, 40)]);
    return NextResponse.json({ ok: true, row: { id: row.id, label, operation } }, { status: 201 });
  } catch (error) {
    return bad(error.code === '23505' ? 'Uraian tersebut sudah ada di project ini' : error.message, error.code === '23505' ? 409 : 500);
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
    const { rowCount } = await pool.query('UPDATE project_rows AS r SET label=$1,operation=$2 FROM projects AS p WHERE p.id=r.project_id AND r.id=$3 AND p.name=$4', [label, operation, Number(body.id), body.project]);
    if (!rowCount) return bad('Uraian tidak ditemukan', 404);
    return NextResponse.json({ ok: true, row: { id: Number(body.id), label, operation } });
  } catch (error) {
    return bad(error.code === '23505' ? 'Uraian tersebut sudah ada di project ini' : error.message, error.code === '23505' ? 409 : 500);
  }
}

export async function DELETE(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    await ensureProjectRowTables(pool);
    const body = await req.json();
    if (!Number.isInteger(Number(body.id))) return bad('Uraian tidak valid');
    const { rowCount } = await pool.query('DELETE FROM project_rows AS r USING projects AS p WHERE p.id=r.project_id AND r.id=$1 AND p.name=$2', [Number(body.id), body.project]);
    if (!rowCount) return bad('Uraian tidak ditemukan', 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return bad(error.message, 500);
  }
}
