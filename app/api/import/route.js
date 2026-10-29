import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { pool } from '../../../lib/db';
import { parse } from '../../../lib/parse';

export const runtime = 'nodejs';

export async function POST(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    const fd = await req.formData();
    const f = fd.get('file'), y = +fd.get('year');
    if (!f || !(y > 2000)) return NextResponse.json({ error: 'File atau tahun kosong' }, { status: 400 });
    const wb = XLSX.read(Buffer.from(await f.arrayBuffer()), { type: 'buffer' });
    const sn =
      wb.SheetNames.find((n) => /pdptn/i.test(n) && n.includes(String(y))) ||
      wb.SheetNames.find((n) => /pdptn/i.test(n)) ||
      wb.SheetNames[0];
    const P = parse(XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null }));
    if (!P.length) return NextResponse.json({ error: 'Tidak ada blok project yang dikenali' }, { status: 422 });

    const c = await pool.connect();
    const out = [];
    try {
      await c.query('BEGIN');
      for (const p of P) {
        const { rows: [existingProject] } = await c.query('SELECT id FROM projects WHERE name = $1', [p.n]);
        let id = existingProject?.id, state = 'Diperbarui';
        if (!id) {
          const { rows: [insertedProject] } = await c.query('INSERT INTO projects (name, sort_order) VALUES ($1, 99) RETURNING id', [p.n]);
          id = insertedProject.id; state = 'Ditambahkan';
        }
        for (let i = 0; i < 12; i++) {
          const values = p.m[i].slice(0, 8), month = i + 1;
          const { rows: [existing] } = await c.query('SELECT status FROM monthly WHERE project_id=$1 AND year=$2 AND month=$3 FOR UPDATE', [id, y, month]);
          if (values.every(value => Number(value) === 0)) {
            if (existing?.status == null) {
              await c.query('DELETE FROM monthly WHERE project_id=$1 AND year=$2 AND month=$3', [id, y, month]);
            } else if (existing) {
              await c.query('UPDATE monthly SET t1=0,t2=0,lain=0,denda=0,reward=0,kerja_kurang=0,suplisi=0,kontrak=0 WHERE project_id=$1 AND year=$2 AND month=$3', [id, y, month]);
            }
          } else {
            await c.query(
              `INSERT INTO monthly (project_id,year,month,t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               ON CONFLICT (project_id,year,month) DO UPDATE SET
                 t1=EXCLUDED.t1,t2=EXCLUDED.t2,lain=EXCLUDED.lain,denda=EXCLUDED.denda,
                 reward=EXCLUDED.reward,kerja_kurang=EXCLUDED.kerja_kurang,suplisi=EXCLUDED.suplisi,kontrak=EXCLUDED.kontrak,
                 updated_at=CURRENT_TIMESTAMP`,
              [id, y, month, ...values]
            );
          }
        }
        await c.query('INSERT INTO audit_log (project_id,year,field,new_value,source) VALUES ($1,$2,$3,$4,$5)', [id, y, 'impor', f.name.slice(0, 40), 'impor']);
        out.push({ n: p.n, state });
      }
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
    return NextResponse.json({ sheet: sn, projects: out });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
