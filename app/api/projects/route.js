import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { syncSeedSnapshot } from '../../../lib/sync-seed.mjs';

const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });
const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export async function POST(req) {
  let c;
  try {
    const { name } = await req.json();
    const n = clean(name);
    if (!n || n.length > 100) return bad('Nama project wajib diisi (maksimal 100 karakter)');
    c = await pool.getConnection();
    await c.beginTransaction();
    const [result] = await c.query('INSERT INTO projects (name, sort_order) VALUES (?, 99)', [n]);
    await c.query("INSERT INTO audit_log (project_id,field,new_value,source) VALUES (?, 'project', ?, 'manual')", [result.insertId, n]);
    await c.commit();
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, name: n, snapshotSynced }, { status: 201 });
  } catch (e) {
    if (c) await c.rollback();
    return bad(e.code === 'ER_DUP_ENTRY' ? 'Nama project sudah digunakan' : e.message, e.code === 'ER_DUP_ENTRY' ? 409 : 500);
  } finally {
    c?.release();
  }
}

export async function PATCH(req) {
  let c;
  try {
    const { oldName, name } = await req.json();
    const old = clean(oldName), n = clean(name);
    if (!old || !n || n.length > 100) return bad('Nama project tidak valid');
    c = await pool.getConnection();
    await c.beginTransaction();
    const [result] = await c.query('UPDATE projects SET name=? WHERE name=?', [n, old]);
    if (!result.affectedRows) {
      await c.rollback();
      return bad('Project tidak ditemukan', 404);
    }
    const [rows] = await c.query('SELECT id FROM projects WHERE name=?', [n]);
    await c.query("INSERT INTO audit_log (project_id,field,old_value,new_value,source) VALUES (?, 'nama project', ?, ?, 'manual')", [rows[0].id, old, n]);
    await c.commit();
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, name: n, snapshotSynced });
  } catch (e) {
    if (c) await c.rollback();
    return bad(e.code === 'ER_DUP_ENTRY' ? 'Nama project sudah digunakan' : e.message, e.code === 'ER_DUP_ENTRY' ? 409 : 500);
  } finally {
    c?.release();
  }
}

export async function DELETE(req) {
  let c;
  try {
    const { name } = await req.json();
    const n = clean(name);
    c = await pool.getConnection();
    await c.beginTransaction();
    const [rows] = await c.query('SELECT id FROM projects WHERE name=? FOR UPDATE', [n]);
    if (!rows[0]) {
      await c.rollback();
      return bad('Project tidak ditemukan', 404);
    }
    await c.query("INSERT INTO audit_log (project_id,field,old_value,source) VALUES (?, 'hapus project', ?, 'manual')", [rows[0].id, n]);
    await c.query('DELETE FROM projects WHERE id=?', [rows[0].id]);
    await c.commit();
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ ok: true, snapshotSynced });
  } catch (e) {
    if (c) await c.rollback();
    return bad(e.message, 500);
  } finally {
    c?.release();
  }
}
