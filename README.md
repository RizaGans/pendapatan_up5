# Pendapatan Project Regional 5 (Next.js + MySQL XAMPP)

## Persiapan
1. Pasang Node.js 20.6 atau lebih baru.
2. Buka XAMPP Control Panel, jalankan **MySQL** (Apache tidak wajib). Cek lewat http://localhost/phpmyadmin.
3. Di folder project ini:
   ```
   npm install
   copy .env.local.example .env.local      (Mac/Linux: cp)
   npm run seed
   npm run create-admin
   npm run dev
   ```
   `.env.local.example` adalah template yang dibagikan bersama kode. `.env.local` adalah konfigurasi lokal yang dibaca Next.js dan perintah seed/snapshot; file ini diabaikan Git agar setelan tiap komputer tidak ikut dibagikan. Edit `.env.local` jika konfigurasi MySQL Anda berbeda.
4. Buka http://localhost:3000 dan masuk menggunakan akun yang dibuat pada langkah sebelumnya.

`npm run seed` membuat database `pendapatan_up5` dan tabel. Data awal dari `data/seed.json` hanya dimasukkan ketika database belum memiliki project maupun data bulanan. Setelah itu MySQL menjadi sumber utama; setiap perubahan project atau data bulanan dari website memperbarui `data/seed.json` sebagai snapshot. Menjalankan seed ulang pada database yang sudah berisi data tidak menimpa perubahan. Nama database jangan diubah. Jika MySQL Anda memakai password, isi `DB_PASSWORD` di `.env.local`.

Jika database sudah dibuat sebelum fitur daftar tahun ditambahkan, jalankan `npm run seed` sekali lagi untuk membuat tabel `app_years`. Seed akan melewati pemasukan data awal jika database sudah berisi project atau data bulanan.

## Login satu akun
Autentikasi memakai database MySQL project yang sama. Setelah `npm run seed`, jalankan `npm run create-admin` satu kali di terminal interaktif untuk membuat akun admin. Username disimpan di MySQL; sandi di-hash memakai scrypt dan tidak disimpan sebagai teks biasa. Hanya satu akun dapat dibuat. Halaman dashboard dan seluruh API data memerlukan sesi yang masih berlaku.

Sesi disimpan di MySQL selama 8 jam. Browser hanya menerima token acak pada cookie HttpOnly, Secure di production, dan SameSite Strict; database menyimpan hash tokennya. Login dibatasi setelah 8 percobaan gagal dalam 15 menit per username dan alamat IP. Saat memakai reverse proxy, konfigurasikan proxy untuk menimpa header alamat IP (`X-Real-IP` atau `X-Forwarded-For`), bukan meneruskan nilai dari pengunjung. Gunakan HTTPS saat dipasang ke server, batasi akses jaringan MySQL hanya dari server aplikasi, gunakan akun database khusus dengan hak minimum, dan buat backup database terenkripsi.

Untuk mereset sandi, hapus baris `app_users` dan `app_sessions` dari database, lalu jalankan kembali `npm run create-admin`. Operasi ini menonaktifkan semua sesi yang ada.

## Kolaborasi developer
Repo ini tidak membagikan `.env.local` atau `data/seed.json`. Clone baru memakai `data/seed.example.json` yang berisi data contoh anonim saat `npm run seed` dijalankan. Buat `.env.local` lokal dari `.env.local.example`, lalu atur koneksi MySQL masing-masing developer.

Jika database diubah langsung di luar website, jalankan `npm run snapshot` untuk menyamakan kembali `data/seed.json` dengan MySQL.

## Struktur
- `db/schema.sql`: tabel akun dan sesi login, `projects`, `app_years` (daftar tahun yang tersedia), `monthly` (satu baris per project, tahun, bulan), `audit_log`.
- `app/api/data`: membaca semua data. `app/api/entry`: menyimpan atau menghapus data bulanan (dengan validasi dan catatan audit). `app/api/projects`: membuat, mengganti nama, dan menghapus kontrak. `app/api/history`: membaca riwayat perubahan. `app/api/import`: impor xlsx atau csv.
- `lib/parse.js`: pembaca format sheet PDPTN (kolom A project, B uraian, C sampai N Januari sampai Desember).
- `lib/ui.js` dan `components/shell.js`: antarmuka yang sama dengan prototipe v2.

## Catatan
- Rumus (realisasi, % SLA, dan lainnya) dihitung di sisi tampilan (`lib/ui.js`).
- Pencarian/filter tersedia di Ringkasan, Input manual, hasil impor, dan riwayat perubahan.
- Satu akun admin; belum ada peran pengguna.
