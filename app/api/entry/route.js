import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

const COLS = ['t1', 't2', 'lain', 'denda', 'reward', 'kerja_kurang', 'suplisi', 'kontrak', 'status'];
const bad = (m, status = 400) => NextResponse.json({ error: m }, { status });

export async function PUT(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    const b = await req.json();
    const col = COLS[b.k];
    if (!col || !Number.isInteger(b.year) || b.year <= 1980 || !Number.isInteger(b.month) || b.month < 0 || b.month > 11) return bad('Data tidak valid');
    let value = b.value;
    if (col === 'status') {
      if (value != null && !/^[bfuplh]$/.test(value)) return bad('Status tidak dikenal');
    } else {
      value = Math.round(Number(value));
      if (!Number.isFinite(value) || value < 0) return bad('Nominal harus angka 0 atau lebih');
    }

    const { rows: [project] } = await pool.query('SELECT id FROM projects WHERE name = $1', [b.project]);
    if (!project) return bad('Project tidak ditemukan');
    const projectId = project.id;
    const month = b.month + 1;
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const { rows: [old] } = await connection.query(
        `SELECT ${col} AS v FROM monthly WHERE project_id=$1 AND year=$2 AND month=$3 FOR UPDATE`,
        [projectId, b.year, month],
      );
      await connection.query(
        `INSERT INTO monthly (project_id,year,month,${col}) VALUES ($1,$2,$3,$4)
         ON CONFLICT (project_id,year,month) DO UPDATE SET ${col}=EXCLUDED.${col},updated_at=CURRENT_TIMESTAMP`,
        [projectId, b.year, month, value],
      );
      await connection.query(
        'INSERT INTO audit_log (project_id,year,month,field,old_value,new_value) VALUES ($1,$2,$3,$4,$5,$6)',
        [projectId, b.year, month, col, old?.v ?? null, value],
      );
      const { rows: [row] } = await connection.query(
        'SELECT t1,t2,lain,denda,reward,kerja_kurang,suplisi,kontrak,status FROM monthly WHERE project_id=$1 AND year=$2 AND month=$3',
        [projectId, b.year, month],
      );
      const empty = row && [row.t1,row.t2,row.lain,row.denda,row.reward,row.kerja_kurang,row.suplisi,row.kontrak].every(x => Number(x) === 0) && row.status == null;
      if (empty) await connection.query('DELETE FROM monthly WHERE project_id=$1 AND year=$2 AND month=$3', [projectId, b.year, month]);
      const { rows: [count] } = await connection.query('SELECT COUNT(*) AS n FROM monthly WHERE year=$1', [b.year]);
      await connection.query('COMMIT');
      return NextResponse.json({ ok: true, yearEmpty: Number(count.n) === 0 });
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    const b = await req.json();
    if (!(b.year > 1989) || (!b.all && !b.allProjects && !(b.month >= 0 && b.month < 12))) return bad('Data tidak valid');

    let projectId = null;
    if (!b.allProjects) {
      const { rows: [project] } = await pool.query('SELECT id FROM projects WHERE name=$1', [b.project]);
      if (!project) return bad('Project tidak ditemukan', 404);
      projectId = project.id;
    }

    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      if (b.allProjects || b.all) {
        const values = b.allProjects ? [b.year] : [projectId, b.year];
        const where = b.allProjects ? 'year=$1' : 'project_id=$1 AND year=$2';
        const { rows: oldRows } = await connection.query(
          `SELECT * FROM monthly WHERE ${where} ORDER BY project_id,month${b.allProjects ? ' FOR UPDATE' : ''}`,
          values,
        );
        for (const row of oldRows) {
          await connection.query(
            "INSERT INTO audit_log (project_id,year,month,field,old_value,new_value,source) VALUES ($1,$2,$3,'hapus bulan',$4,'0','manual')",
            [row.project_id, b.year, row.month, JSON.stringify(row).slice(0, 40)],
          );
        }
        const result = await connection.query(`DELETE FROM monthly WHERE ${where}`, values);
        if (b.allProjects) await connection.query('DELETE FROM app_years WHERE year=$1', [b.year]);
        await connection.query('COMMIT');
        return NextResponse.json({
          ok: true,
          deleted: result.rowCount,
          ...(b.allProjects ? { yearEmpty: true } : {}),
        });
      }

      const month = b.month + 1;
      const { rows: [old] } = await connection.query(
        'SELECT * FROM monthly WHERE project_id=$1 AND year=$2 AND month=$3 FOR UPDATE',
        [projectId, b.year, month],
      );
      if (!old) {
        await connection.query('COMMIT');
        return NextResponse.json({ ok: true, deleted: false });
      }
      await connection.query(
        "INSERT INTO audit_log (project_id,year,month,field,old_value,new_value,source) VALUES ($1,$2,$3,'hapus bulan',$4,'0','manual')",
        [projectId, b.year, month, JSON.stringify(old).slice(0, 40)],
      );
      await connection.query('DELETE FROM monthly WHERE project_id=$1 AND year=$2 AND month=$3', [projectId, b.year, month]);
      const { rows: [count] } = await connection.query('SELECT COUNT(*) AS n FROM monthly WHERE year=$1', [b.year]);
      await connection.query('COMMIT');
      return NextResponse.json({ ok: true, deleted: true, yearEmpty: Number(count.n) === 0 });
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
