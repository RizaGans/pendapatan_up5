import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { pool } from '../lib/db.js';
import { ensureAuthTables, hashPassword } from '../lib/auth.js';

function hiddenPrompt(label) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Jalankan perintah ini langsung di terminal interaktif agar sandi tidak terlihat.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();

    const finish = (error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') return finish(new Error('Dibatalkan.'));
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u007f' || char === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }
        if (char >= ' ' && char !== '\u007f') value += char;
      }
    };

    stdin.on('data', onData);
  });
}

const prompt = readline.createInterface({ input: stdin, output: stdout });
try {
  const username = (await prompt.question('Username admin (3-64 karakter: huruf, angka, titik, garis, garis bawah): '))
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw new Error('Format username tidak valid.');
  prompt.close();

  const password = await hiddenPrompt('Sandi baru (minimal 8 karakter): ');
  const confirmation = await hiddenPrompt('Ulangi sandi: ');
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 256) {
    throw new Error('Sandi harus 8-256 karakter.');
  }
  if (password !== confirmation) throw new Error('Konfirmasi sandi tidak cocok.');

  await ensureAuthTables();
  const passwordHash = await hashPassword(password);
  await pool.query(
    'INSERT INTO app_users (id,username,password_hash) VALUES (1,$1,$2)',
    [username, passwordHash],
  );
  stdout.write(`Akun admin "${username}" berhasil dibuat.\n`);
} catch (error) {
  prompt.close();
  stdout.write(`Gagal membuat akun admin: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}