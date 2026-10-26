import { requireAuthenticatedUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req) {
  const authError = await requireAuthenticatedUser(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 1990 || year > 9999) {
      return bad('Tahun harus berupa bilangan bulat antara 1990 dan 9999');
    }

    await pool.query('INSERT IGNORE INTO app_years (`year`) VALUES (?)', [year]);
    return NextResponse.json({ ok: true, year });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
