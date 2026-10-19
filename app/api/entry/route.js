import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { syncSeedSnapshot } from '../../../lib/sync-seed.mjs';

// Urutan kolom sama dengan indeks array di /api/data
const COLS = ['t1', 't2', 'lain', 'denda', 'reward', 'kerja_kurang', 'suplisi', 'kontrak', 'status'];
const bad = (m, status = 400) => NextResponse.json({ error: m }, { status });

export async function PUT(req) {
  try {
    const b = await req.json();
    const k = b.k;
    const col = COLS[k];
    if (!col || !(b.year > 1980 ) || !(b.month > 0 && b.month < 12)) return bad('Data tidak valid');
    let v = b.value;
    if (col === 'status') {
      if (v != null && !/^[bfuplh]$/.test(v)) return bad('Status tidak dikenal');
    } else {
      v = Math.round(Number(v));
      if (!Number.isFinite(v) || v < 0) return bad('Nominal harus angka 0 atau lebih');
    }
    const [pr] = await pool.query('SELECT id FROM projects WHERE name = ?', [b.project]);
    if (!pr[0]) return bad('Project tidak ditemukan');
    const id = pr[0].id, mo = b.month + 1, c = await pool.getConnection();
    try {
      await c.beginTransaction();
      const [old] = await c.query(`SELECT ${col} AS v FROM monthly WHERE project_id=? AND \`year\`=? AND \`month\`=? FOR UPDATE`, [id, b.year, mo]);
      await c.query(
        `INSERT INTO monthly (project_id, \`year\`, \`month\`, ${col}) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE ${col}=VALUES(${col})`,
        [id, b.year, mo, v]
      );
      await c.query('INSERT INTO audit_log (project_id,`year`,`month`,field,old_value,new_value) VALUES (?,?,?,?,?,?)', [id, b.year, mo, col, old[0]?.v ?? null, v]);
      const [current] = await c.query('SELECT t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak,status FROM monthly WHERE project_id=? AND `year`=? AND `month`=?', [id, b.year, mo]);
      const row = current[0];
      const empty = row && [row.t1,row.t2,row.lain,row.denda,row.reward,row.kerja_kurang,row.suplisi,row.kontrak].every(x => Number(x) === 0) && row.status == null;
      if (empty) await c.query('DELETE FROM monthly WHERE project_id=? AND `year`=? AND `month`=?', [id, b.year, mo]);
      const [[count]] = await c.query('SELECT COUNT(*) AS n FROM monthly WHERE `year`=?', [b.year]);
      await c.commit();
      const snapshotSynced = await syncSeedSnapshot();
      return NextResponse.json({ ok: true, yearEmpty: Number(count.n) === 0, snapshotSynced });
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const b = await req.json();
    if (!(b.year > 1989) || (!b.all && !b.allProjects && !(b.month >= 0 && b.month < 12))) return bad('Data tidak valid');
    if (b.allProjects) {
      const c = await pool.getConnection();
      try {
        await c.beginTransaction();
        const [oldRows] = await c.query('SELECT * FROM monthly WHERE `year`=? ORDER BY project_id,`month` FOR UPDATE', [b.year]);
        for (const row of oldRows) {
          await c.query("INSERT INTO audit_log (project_id,`year`,`month`,field,old_value,new_value,source) VALUES (?,?,?,'hapus bulan',?,'0','manual')", [row.project_id, b.year, row.month, JSON.stringify(row).slice(0, 40)]);
        }
        const [result] = await c.query('DELETE FROM monthly WHERE `year`=?', [b.year]);
        await c.query('DELETE FROM app_years WHERE `year`=?', [b.year]);
        await c.commit();
        const snapshotSynced = await syncSeedSnapshot();
        return NextResponse.json({ ok: true, deleted: result.affectedRows, yearEmpty: true, snapshotSynced });
      } catch (e) {
        await c.rollback();
        throw e;
      } finally {
        c.release();
      }
    }
    const [pr] = await pool.query('SELECT id FROM projects WHERE name = ?', [b.project]);
    if (!pr[0]) return bad('Project tidak ditemukan', 404);
    if (b.all) {
      const c = await pool.getConnection();
      try {
        await c.beginTransaction();
        const [oldRows] = await c.query('SELECT * FROM monthly WHERE project_id=? AND `year`=? ORDER BY `month`', [pr[0].id, b.year]);
        for (const row of oldRows) {
          await c.query("INSERT INTO audit_log (project_id,`year`,`month`,field,old_value,new_value,source) VALUES (?,?,?,'hapus bulan',?,'0','manual')", [pr[0].id, b.year, row.month, JSON.stringify(row).slice(0, 40)]);
        }
        const [result] = await c.query('DELETE FROM monthly WHERE project_id=? AND `year`=?', [pr[0].id, b.year]);
        await c.commit();
        const snapshotSynced = await syncSeedSnapshot();
        return NextResponse.json({ ok: true, deleted: result.affectedRows, snapshotSynced });
      } catch (e) {
        await c.rollback();
        throw e;
      } finally {
        c.release();
      }
    }
    const month = b.month + 1;
    const c = await pool.getConnection();
    try {
      await c.beginTransaction();
      const [old] = await c.query('SELECT * FROM monthly WHERE project_id=? AND `year`=? AND `month`=? FOR UPDATE', [pr[0].id, b.year, month]);
      if (!old[0]) {
        await c.commit();
        return NextResponse.json({ ok: true, deleted: false });
      }
      await c.query("INSERT INTO audit_log (project_id,`year`,`month`,field,old_value,new_value,source) VALUES (?,?,?,'hapus bulan',?,'0','manual')", [pr[0].id, b.year, month, JSON.stringify(old[0]).slice(0, 40)]);
      await c.query('DELETE FROM monthly WHERE project_id=? AND `year`=? AND `month`=?', [pr[0].id, b.year, month]);
      const [[count]] = await c.query('SELECT COUNT(*) AS n FROM monthly WHERE `year`=?', [b.year]);
      await c.commit();
      const snapshotSynced = await syncSeedSnapshot();
      return NextResponse.json({ ok: true, deleted: true, yearEmpty: Number(count.n) === 0, snapshotSynced });
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
