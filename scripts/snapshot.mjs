import { syncSeedSnapshot } from '../lib/sync-seed.mjs';

const ok = await syncSeedSnapshot();
if (!ok) {
  console.error('Snapshot gagal diperbarui. Periksa koneksi MySQL dan izin tulis data/seed.json.');
  process.exitCode = 1;
} else {
  console.log('data/seed.json sudah diselaraskan dengan MySQL.');
}
