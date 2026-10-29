# Pendapatan Project Regional 5 (Next.js + Neon PostgreSQL)

## Konfigurasi
1. Pasang Node.js 20.6 atau lebih baru.
2. Buat project Neon PostgreSQL dan salin connection string pooled (`DATABASE_URL`) dari Neon. Jangan masukkan kredensial database ke Git atau chat.
3. Buat `.env.local` dari `.env.local.example`, lalu isi `DATABASE_URL`. Untuk migrasi, isi juga `SOURCE_DB_*` dengan akses XAMPP lokal.
4. Pasang dependency dan siapkan skema lokal:
   ```
   npm install
   npm run db:init
   npm run migrate:xampp
   npm run dev
   ```
   `npm run db:init` membuat skema PostgreSQL 11 tabel tanpa memasukkan seed data. `npm run migrate:xampp` menyalin data lama ke Neon dan memeriksa jumlah baris setelah penyalinan.
5. Setelah migrasi terverifikasi, jalankan `npm run create-admin` jika akun admin belum ikut dimigrasikan. Buka http://localhost:3000 dan uji login serta baca/tulis data.

## Migrasi XAMPP ke Neon
XAMPP merupakan sumber migrasi yang hanya dibaca. Script tidak menghapus atau mengubah datanya. Sebelum migrasi:
- Pastikan backup XAMPP tersedia dan MySQL XAMPP aktif.
- Hentikan sementara perubahan data melalui website selama migrasi agar salinan konsisten; XAMPP tetap dipertahankan sebagai cadangan setelah migrasi.
- Atur `DATABASE_URL` ke Neon dan `SOURCE_DB_HOST`, `SOURCE_DB_PORT`, `SOURCE_DB_USER`, `SOURCE_DB_PASSWORD`, `SOURCE_DB_NAME` ke XAMPP di `.env.local`.
- Jalankan `npm run db:init`, lalu `npm run migrate:xampp`.

Script menyalin kesebelas tabel dalam transaksi, menghentikan proses apabila salah satu tabel tujuan sudah berisi data, dan mencocokkan jumlah baris sumber/tujuan. Jika proses gagal di tengah transaksi, perubahan Neon dibatalkan. Jangan arahkan `DATABASE_URL` ke database Neon yang sudah berisi data. Jangan hapus XAMPP sebelum login, pembacaan, dan penyimpanan di website lokal serta deployment Vercel berhasil diuji.

Untuk Neon dan Vercel, gunakan `DATABASE_URL` yang sama (connection string pooled Neon), simpan sebagai environment variable Vercel untuk environment yang digunakan, lalu deploy ulang. Jangan memasukkan kredensial ke repository.

## Database dan akun admin
Website menggunakan PostgreSQL sebagai sumber data bersama; perubahan tersimpan di Neon sehingga instance lokal dan Vercel membaca database yang sama. `db/schema.sql` mendefinisikan tabel `projects`, `app_users`, `app_sessions`, `app_login_limits`, `app_years`, `monthly`, `monthly_cell_status`, `audit_log`, `project_rows`, `project_row_values`, dan `project_base_rows`.

Untuk project database baru tanpa migrasi, jalankan `npm run db:init` lalu `npm run seed` untuk memasukkan data contoh dari `data/seed.example.json`. Jangan jalankan seed contoh pada database tujuan migrasi. Untuk membuat akun admin satu kali, jalankan `npm run create-admin` di terminal interaktif; sandi di-hash memakai scrypt. Sesi berlaku 8 jam dan login dibatasi setelah 8 percobaan gagal dalam 15 menit per username dan alamat IP.

`data/seed.json` adalah snapshot lokal, bukan sumber data produksi atau mekanisme sinkronisasi antarmesin. PostgreSQL adalah sumber kebenaran. `npm run snapshot` hanya mengekspor database ke file lokal saat diperlukan.

## Pengembangan
- `npm run dev`: menjalankan website lokal.
- `npm run build`: memeriksa build produksi.
- `npm run lint`: menjalankan ESLint Next.js.
- `npm run db:init`: membuat tabel dan index PostgreSQL jika belum tersedia.
- `npm run seed`: memasukkan data contoh hanya jika tabel proyek dan bulanan masih kosong.
- `npm run migrate:xampp`: memindahkan data XAMPP ke database Neon yang kosong.
