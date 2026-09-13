# Bir Pletok Cempedak Lestari — Website & Aplikasi Internal

Satu paket berisi tiga bagian yang saling terhubung lewat satu database
Supabase (gratis):

```
bpcl-project/
├── supabase/            SQL untuk membuat semua tabel & aturan keamanan
│   ├── schema.sql              (transaksi keuangan, persediaan, pengguna)
│   └── landing_konten.sql      (konten landing page yang bisa diedit)
├── landing-page/
│   └── index.html       Website publik (statis, cukup 1 file HTML)
├── admin-app/           Aplikasi internal: keuangan, stok, & editor konten
└── .github/workflows/
    └── keepalive.yml    Menjaga Supabase gratis tidak "tidur"
```

- **landing-page/** — halaman publik yang dilihat calon pembeli. Kontennya
  (judul, deskripsi, menu, ulasan, lokasi, media sosial) diambil otomatis
  dari database, jadi bisa diubah tanpa menyentuh kode.
- **admin-app/** — dipakai Super Admin & Editor untuk mencatat transaksi
  keuangan, stok barang, **dan mengedit konten landing page** (menu
  "Konten Website").
- Keduanya membaca/menulis ke Supabase project yang sama.

---

## 1. Database (Supabase) — sudah dikonfigurasi

Project Supabase kamu: `phtzknecozrothysbkwg`. Konfigurasi berikut
**sudah otomatis terisi** di dalam paket ini, jadi kamu bisa lewati
langkah isi manual:

- `admin-app/.env` — sudah berisi `VITE_SUPABASE_URL` dan
  `VITE_SUPABASE_ANON_KEY` yang benar.
- `landing-page/index.html` — konstanta `SUPABASE_URL` dan
  `SUPABASE_ANON_KEY` di bagian `<script>` sudah diisi.

Yang **masih perlu kamu jalankan manual** (satu kali saja):

1. Buka **SQL Editor** di Supabase Dashboard, jalankan isi
   `supabase/schema.sql`, lalu jalankan `supabase/landing_konten.sql`.
2. Isi `ADMIN_URL` di `landing-page/index.html` setelah `admin-app`
   selesai di-deploy (lihat langkah 5).

> **Catatan keamanan:** kamu juga membagikan `service_role` key dan
> `secret key` (`sb_secret_...`). Keduanya **sengaja tidak saya taruh
> di file manapun** dalam paket ini — kalau ter-commit ke repo GitHub
> (apalagi yang publik), siapa pun bisa memakainya untuk membaca/mengubah
> seluruh data tanpa melalui aturan keamanan (RLS). Satu-satunya tempat
> yang aman untuk menaruhnya adalah kotak **Secrets** di GitHub Actions
> (langkah 6 di bawah) atau Supabase Dashboard itu sendiri — bukan di
> dalam file kode. `.env` sudah masuk `.gitignore` supaya tidak ikut
> ter-push ke GitHub, tapi tetap jangan menaruh service_role/secret key
> di file itu juga.

## 2. Jalankan aplikasi admin

```bash
cd admin-app
npm install
npm run dev
```

`.env` sudah berisi konfigurasi Supabase kamu, jadi langsung bisa
`npm run dev` tanpa isi apa-apa lagi.

Buat akun pertama lewat **Supabase Dashboard → Authentication → Add
user**, login di aplikasi, lalu jadikan Super Admin lewat SQL Editor:

```sql
update public.profiles set role = 'super_admin'
where email = 'email_kamu@contoh.com';
```

Setelah jadi Super Admin, menu **Konten Website** dan **Pengguna** akan
muncul di sidebar. Detail fitur & validasi ada di komentar dalam kode;
ringkasannya sama seperti sebelumnya (stok tidak bisa minus, kategori
tidak bisa dihapus kalau masih dipakai, dll).

## 3. Hubungkan landing page ke database

Buka `landing-page/index.html`, cari bagian `<script>` paling bawah,
isi 3 baris ini:

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'isi-dengan-anon-public-key-dari-supabase'
const ADMIN_URL = 'https://alamat-aplikasi-admin-kamu.vercel.app'
```

`ADMIN_URL` diisi setelah `admin-app` di-deploy (langkah 5) — dipakai
untuk tautan kecil "Kelola konten" di footer.

Buka file ini langsung di browser untuk mencoba (tidak perlu server
atau build apa pun, murni HTML+JS biasa).

> Kalau Supabase sedang tidak bisa diakses (jaringan bermasalah, dsb),
> landing page tidak akan tampil kosong — ia sudah punya konten bawaan
> di dalam HTML-nya sendiri sebagai cadangan, lalu diganti otomatis
> begitu database berhasil diakses.

## 4. Mengelola isi landing page & media sosial

Login ke aplikasi admin sebagai Super Admin → menu **Konten Website**.
Ada 6 tab: Hero, Tentang, Menu, Ulasan, Lokasi & Kontak, Media Sosial.
Setiap tab punya form biasa (bukan kode/JSON) — isi, klik **Simpan
Bagian Ini**, dan landing page langsung menampilkan versi terbaru saat
di-refresh.

Untuk **media sosial**: tambahkan baris baru, pilih platform
(Instagram/Facebook/TikTok/WhatsApp/YouTube/Lainnya), isi link
lengkapnya (harus diawali `http://` atau `https://`). Bagian "Ikuti
Kami" di landing page otomatis muncul begitu ada minimal 1 akun yang
diisi, dan otomatis tersembunyi kalau daftarnya dikosongkan lagi.

## 5. Deploy gratis supaya online

**Landing page** — paling gampang lewat [Vercel](https://vercel.com),
[Netlify](https://netlify.app), atau GitHub Pages: unggah folder
`landing-page/` sebagai static site. Tidak perlu build command apa pun.

**Aplikasi admin** — lewat Vercel:
1. Push seluruh folder `bpcl-project` ini ke sebuah repo GitHub.
2. Di Vercel, **Add New → Project**, pilih repo tadi.
3. Set **Root Directory** ke `admin-app` (karena repo berisi beberapa
   folder, bukan cuma aplikasi ini).
4. Build command default Vite (`npm run build`, output `dist`) sudah
   otomatis terdeteksi — biarkan saja.
5. Tambahkan Environment Variables: `VITE_SUPABASE_URL` dan
   `VITE_SUPABASE_ANON_KEY`.
6. Deploy. Salin alamat yang dihasilkan (mis. `nama-app.vercel.app`)
   ke `ADMIN_URL` di `landing-page/index.html` (langkah 3), lalu deploy
   ulang landing page-nya.

## 6. Supaya Supabase gratis tidak "tidur" (penting!)

Project gratis Supabase otomatis di-pause kalau **tidak ada aktivitas
database sama sekali selama 7 hari** — dan begitu di-pause, tidak akan
hidup sendiri; harus ada yang login ke Supabase Dashboard dan klik
"Restore" manual. Supaya kamu tidak perlu standby memantau ini:

1. Push repo ini ke GitHub (kalau belum, lihat langkah 5).
2. Di repo GitHub: **Settings → Secrets and variables → Actions → New
   repository secret**. Tambahkan:
   - `SUPABASE_URL` → `https://phtzknecozrothysbkwg.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` → nilai `secret_role` (JWT yang berisi
     `"role":"service_role"`) yang sudah kamu catat sendiri — **jangan**
     ditaruh di file mana pun di repo ini, isi langsung lewat form
     Secrets di GitHub.
3. Selesai. Workflow `.github/workflows/keepalive.yml` akan otomatis
   "menyapa" database setiap 3 hari sekali (jauh sebelum batas 7 hari),
   tanpa kamu perlu buka apa-apa. Cek tab **Actions** di GitHub sesekali
   untuk memastikan jadwalnya jalan hijau (sukses).

Kalau suatu saat project tetap ter-pause (misalnya belum sempat setup
GitHub Actions-nya), datanya tetap aman sampai 1 tahun dan tinggal klik
"Restore" di Supabase Dashboard — tidak ada data yang hilang.

---

## Ringkasan validasi & pencegahan human error

- Semua kolom wajib, angka harus > 0, tanggal tidak boleh di masa depan.
- Stok keluar tidak bisa melebihi stok tersedia — dicek di form dan
  sekali lagi di database (aman meski 2 orang input bersamaan).
- Stok hanya berubah lewat pencatatan resmi "Stok Masuk/Keluar", bukan
  diedit manual, supaya riwayatnya selalu tercatat.
- Kategori/barang yang sudah dipakai di transaksi tidak bisa dihapus
  sembarangan.
- Editor hanya bisa menambah data (transaksi, stok); Super Admin yang
  mengubah/menghapus, mengatur pengguna, dan mengedit konten website.
- Super Admin tidak bisa menurunkan perannya sendiri kalau dia
  satu-satunya Super Admin yang tersisa.
- Semua tautan media sosial & Google Maps divalidasi harus berupa URL
  (`http://` atau `https://`) sebelum bisa disimpan.
