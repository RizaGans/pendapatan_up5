# Pendapatan Project Regional 5 (Next.js + MySQL XAMPP)

## Persiapan
1. Pasang Node.js 20.6 atau lebih baru.
2. Buka XAMPP Control Panel, jalankan **MySQL** (Apache tidak wajib). Cek lewat http://localhost/phpmyadmin.
3. Di folder project ini:
   ```
   npm install
   copy .env.local.example .env.local      (Mac/Linux: cp)
   npm run seed
   npm run dev
   ```
4. Buka http://localhost:3000

`npm run seed` membuat database `pendapatan_up5` dan tabel. Data awal dari `data/seed.json` hanya dimasukkan ketika database belum memiliki project maupun data bulanan. Setelah itu MySQL menjadi sumber utama; setiap perubahan project atau data bulanan dari website memperbarui `data/seed.json` sebagai snapshot. Menjalankan seed ulang pada database yang sudah berisi data tidak menimpa perubahan. Nama database jangan diubah. Jika MySQL Anda memakai password, isi `DB_PASSWORD` di `.env.local`.

Jika database sudah dibuat sebelum fitur daftar tahun ditambahkan, jalankan `npm run seed` sekali lagi untuk membuat tabel `app_years`. Seed akan melewati pemasukan data awal jika database sudah berisi project atau data bulanan.

## Kolaborasi developer
Repo ini tidak membagikan `.env.local` atau `data/seed.json`. Clone baru memakai `data/seed.example.json` yang berisi data contoh anonim saat `npm run seed` dijalankan. Buat `.env.local` lokal dari `.env.local.example`, lalu atur koneksi MySQL masing-masing developer.

Jika database diubah langsung di luar website, jalankan `npm run snapshot` untuk menyamakan kembali `data/seed.json` dengan MySQL.

## Struktur
- `db/schema.sql`: tabel `projects`, `app_years` (daftar tahun yang tersedia), `monthly` (satu baris per project, tahun, bulan), `audit_log`.
- `app/api/data`: membaca semua data. `app/api/entry`: menyimpan atau menghapus data bulanan (dengan validasi dan catatan audit). `app/api/projects`: membuat, mengganti nama, dan menghapus kontrak. `app/api/history`: membaca riwayat perubahan. `app/api/import`: impor xlsx atau csv.
- `lib/parse.js`: pembaca format sheet PDPTN (kolom A project, B uraian, C sampai N Januari sampai Desember).
- `lib/ui.js` dan `components/shell.js`: antarmuka yang sama dengan prototipe v2.

## Catatan
- Rumus (realisasi, % SLA, dan lainnya) dihitung di sisi tampilan (`lib/ui.js`).
- Pencarian/filter tersedia di Ringkasan, Input manual, hasil impor, dan riwayat perubahan.
- Belum ada login dan peran pengguna.
