import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';

const scryptAsync = promisify(scrypt);
export const SESSION_COOKIE = 'up5_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
let authTablesReady;

export function ensureAuthTables() {
  if (!authTablesReady) {
    authTablesReady = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS app_users (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`);
      await pool.query(`CREATE TABLE IF NOT EXISTS app_sessions (
        token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
        user_id TINYINT UNSIGNED NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_app_sessions_expiry (expires_at),
        CONSTRAINT fk_app_sessions_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
      await pool.query(`CREATE TABLE IF NOT EXISTS app_login_limits (
        key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
        window_started DATETIME NOT NULL,
        attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        INDEX idx_app_login_limits_window (window_started)
      ) ENGINE=InnoDB`);
    })();
  }
  return authTablesReady;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$32768$8$1$${salt.toString('base64url')}$${Buffer.from(derivedKey).toString('base64url')}`;
}

export async function verifyPassword(password, encodedHash) {
  const [algorithm, n, r, p, saltText, keyText] = String(encodedHash || '').split('$');
  if (algorithm !== 'scrypt' || n !== '32768' || r !== '8' || p !== '1' || !saltText || !keyText) return false;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(keyText, 'base64url');
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = Buffer.from(await scryptAsync(password, salt, expected.length, SCRYPT_OPTIONS));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex');

export function sessionTokenFromRequest(request) {
  const cookieName = `${SESSION_COOKIE}=`;
  const entry = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName));
  return entry ? entry.slice(cookieName.length) : null;
}

export async function getSessionUser(token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null;
  const [rows] = await pool.query(
    `SELECT u.id, u.username
     FROM app_sessions s JOIN app_users u ON u.id=s.user_id
     WHERE s.token_hash=? AND s.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [hashSessionToken(token)],
  );
  return rows[0] || null;
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    'INSERT INTO app_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))',
    [hashSessionToken(token), userId],
  );
  return token;
}

export async function revokeSession(token) {
  if (!token || typeof token !== 'string' || token.length > 100) return;
  await pool.query('DELETE FROM app_sessions WHERE token_hash=?', [hashSessionToken(token)]);
}

export function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function requireAuthenticatedUser(request) {
  if (!request) return Response.json({ error: 'Autentikasi diperlukan.' }, { status: 401 });
  if (request.method !== 'GET' && request.method !== 'HEAD' && !isSameOrigin(request)) {
    return Response.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 });
  }

  try {
    const token = sessionTokenFromRequest(request);
    const user = await getSessionUser(token);
    if (!user) return Response.json({ error: 'Sesi berakhir. Silakan masuk kembali.' }, { status: 401 });
    return null;
  } catch {
    return Response.json({ error: 'Layanan autentikasi tidak tersedia.' }, { status: 503 });
  }
}
