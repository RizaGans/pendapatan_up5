import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';
import {
  createSession,
  hashPassword,
  isSameOrigin,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

const invalidCredentials = () =>
  NextResponse.json({ error: 'Nama pengguna atau sandi salah.' }, { status: 401 });

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 1 || Buffer.byteLength(password, 'utf8') > 256) {
    return invalidCredentials();
  }

  try {
    await pool.query('DELETE FROM app_login_limits WHERE window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) LIMIT 100');
    await pool.query('DELETE FROM app_sessions WHERE expires_at <= UTC_TIMESTAMP() LIMIT 100');
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
    const attemptKey = createHash('sha256').update(`${username}\0${ip}`).digest('hex');
    const [limits] = await pool.query(
      `SELECT attempts, window_started,
              window_started > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE) AS in_window
       FROM app_login_limits WHERE key_hash=?`,
      [attemptKey],
    );
    if (limits[0]?.in_window && Number(limits[0].attempts) >= 8) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429 });
    }

    const [users] = await pool.query('SELECT id,username,password_hash FROM app_users WHERE id=1 LIMIT 1');
    const user = users[0];
    const passwordValid = user
      ? await verifyPassword(password, user.password_hash)
      : (await hashPassword(password), false);
    const usernameValid = user && String(user.username).trim().toLowerCase() === username;
    const valid = Boolean(usernameValid && passwordValid);

    if (!valid) {
      await pool.query(
        `INSERT INTO app_login_limits (key_hash,window_started,attempts)
         VALUES (?,UTC_TIMESTAMP(),1)
         ON DUPLICATE KEY UPDATE
           attempts=IF(window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE),1,attempts+1),
           window_started=IF(window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE),UTC_TIMESTAMP(),window_started)`,
        [attemptKey],
      );
      return invalidCredentials();
    }

    await pool.query('DELETE FROM app_login_limits WHERE key_hash=?', [attemptKey]);
    const token = await createSession(user.id);
    const response = NextResponse.json({ ok: true, username: user.username });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
      priority: 'high',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Layanan autentikasi tidak tersedia.' }, { status: 503 });
  }
}
