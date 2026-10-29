import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });
const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export async function POST(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  let c;
  try {
    const { name } = await req.json();
    const n = clean(name);
    if (!n || n.length > 100) return bad('Nama project wajib diisi (maksimal 100 karakter)');
    c = await pool.connect();
    await c.query('BEGIN');
    const { rows: [project] } = await c.query('INSERT INTO projects (name, sort_order) VALUES ($1, 99) RETURNING id', [n]);
    await c.query("INSERT INTO audit_log (project_id,field,new_value,source) VALUES ($1, 'project', $2, 'manual')", [project.id, n]);
    await c.query('COMMIT');
    return NextResponse.json({ ok: true, name: n }, { status: 201 });
  } catch (e) {
    if (c) await c.query('ROLLBACK');
    return bad(e.code === '23505' ? 'Nama project sudah digunakan' : e.message, e.code === '23505' ? 409 : 500);
  } finally {
    c?.release();
  }
}

export async function PATCH(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  let c;
  try {
    const { oldName, name } = await req.json();
    const old = clean(oldName), n = clean(name);
    if (!old || !n || n.length > 100) return bad('Nama project tidak valid');
    c = await pool.connect();
    await c.query('BEGIN');
    const { rowCount } = await c.query('UPDATE projects SET name=$1 WHERE name=$2', [n, old]);
    if (!rowCount) {
      await c.query('ROLLBACK');
      return bad('Project tidak ditemukan', 404);
    }
    const { rows: [project] } = await c.query('SELECT id FROM projects WHERE name=$1', [n]);
    await c.query("INSERT INTO audit_log (project_id,field,old_value,new_value,source) VALUES ($1, 'nama project', $2, $3, 'manual')", [project.id, old, n]);
    await c.query('COMMIT');
    return NextResponse.json({ ok: true, name: n });
  } catch (e) {
    if (c) await c.query('ROLLBACK');
    return bad(e.code === '23505' ? 'Nama project sudah digunakan' : e.message, e.code === '23505' ? 409 : 500);
  } finally {
    c?.release();
  }
}

export async function DELETE(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  let c;
  try {
    const { name } = await req.json();
    const n = clean(name);
    c = await pool.connect();
    await c.query('BEGIN');
    const { rows } = await c.query('SELECT id FROM projects WHERE name=$1 FOR UPDATE', [n]);
    if (!rows[0]) {
      await c.query('ROLLBACK');
      return bad('Project tidak ditemukan', 404);
    }
    await c.query("INSERT INTO audit_log (project_id,field,old_value,source) VALUES ($1, 'hapus project', $2, 'manual')", [rows[0].id, n]);
    await c.query('DELETE FROM projects WHERE id=$1', [rows[0].id]);
    await c.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (c) await c.query('ROLLBACK');
    return bad(e.message, 500);
  } finally {
    c?.release();
  }
}
