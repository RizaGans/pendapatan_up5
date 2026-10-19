import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { pool } from '../../../lib/db';
import { parse } from '../../../lib/parse';
import { syncSeedSnapshot } from '../../../lib/sync-seed.mjs';

export const runtime = 'nodejs';

export async function POST(req) {
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

    const c = await pool.getConnection();
    const out = [];
    try {
      await c.beginTransaction();
      for (const p of P) {
        const [r] = await c.query('SELECT id FROM projects WHERE name = ?', [p.n]);
        let id = r[0]?.id, state = 'Diperbarui';
        if (!id) {
          const [ins] = await c.query('INSERT INTO projects (name, sort_order) VALUES (?, 99)', [p.n]);
          id = ins.insertId; state = 'Ditambahkan';
        }
        for (let i = 0; i < 12; i++) {
          const values = p.m[i].slice(0, 8), month = i + 1;
          const [existing] = await c.query('SELECT status FROM monthly WHERE project_id=? AND `year`=? AND `month`=? FOR UPDATE', [id, y, month]);
          if (values.every(value => Number(value) === 0)) {
            if (existing[0]?.status == null) {
              await c.query('DELETE FROM monthly WHERE project_id=? AND `year`=? AND `month`=?', [id, y, month]);
            } else if (existing[0]) {
              await c.query('UPDATE monthly SET t1=0,t2=0,lain=0,denda=0,reward=0,kerja_kurang=0,suplisi=0,kontrak=0 WHERE project_id=? AND `year`=? AND `month`=?', [id, y, month]);
            }
          } else {
            await c.query(
              `INSERT INTO monthly (project_id,\`year\`,\`month\`,t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE t1=VALUES(t1),t2=VALUES(t2),lain=VALUES(lain),denda=VALUES(denda),
                 reward=VALUES(reward),kerja_kurang=VALUES(kerja_kurang),suplisi=VALUES(suplisi),kontrak=VALUES(kontrak)`,
              [id, y, month, ...values]
            );
          }
        }
        await c.query('INSERT INTO audit_log (project_id,`year`,field,new_value,source) VALUES (?,?,?,?,?)', [id, y, 'impor', f.name.slice(0, 40), 'impor']);
        out.push({ n: p.n, state });
      }
      await c.commit();
    } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
    const snapshotSynced = await syncSeedSnapshot();
    return NextResponse.json({ sheet: sn, projects: out, snapshotSynced });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
