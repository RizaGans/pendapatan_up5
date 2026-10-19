import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.at, a.year, a.month, a.field, a.old_value, a.new_value, a.source,
              COALESCE(p.name, a.old_value, 'Kontrak dihapus') AS project
       FROM audit_log a LEFT JOIN projects p ON p.id=a.project_id
       ORDER BY a.id DESC LIMIT 500`
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { source } = await req.json();
    if (!['manual', 'impor'].includes(source)) {
      return NextResponse.json({ error: 'Sumber riwayat tidak valid' }, { status: 400 });
    }
    const [result] = await pool.query('DELETE FROM audit_log WHERE source = ?', [source]);
    return NextResponse.json({ ok: true, deleted: result.affectedRows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
