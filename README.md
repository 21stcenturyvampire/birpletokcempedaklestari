# Bir Pletok Cempedak Lestari — Website & Aplikasi Internal

Satu paket berisi tiga bagian yang saling terhubung lewat satu database
Supabase (gratis):

```
bpcl-project/
├── supabase/            SQL untuk membuat semua tabel & aturan keamanan
│   ├── schema.sql              (transaksi keuangan, persediaan, pengguna)
│   ├── landing_konten.sql      (konten landing page yang bisa diedit)
│   ├── update_2.sql            (barang freetext, inventaris, jadwal konten, tampilan)
│   └── update_3.sql            (tanggal pembelian inventaris, kategori bahan produksi)
├── landing-page/
│   └── index.html       Website publik (statis, cukup 1 file HTML)
├── admin-app/           Aplikasi internal: keuangan, stok, & editor konten
└── .github/workflows/
    └── keepalive.yml    Menjaga Supabase gratis tidak "tidur"
```

- **landing-page/** — halaman publik yang dilihat calon pembeli. Kontennya
  (judul, deskripsi, menu, ulasan, lokasi, media sosial, warna) diambil
  otomatis dari database, jadi bisa diubah tanpa menyentuh kode.
- **admin-app/** — dipakai Super Admin & Editor untuk mencatat transaksi
  keuangan, stok barang, aset inventaris, jadwal konten sosial media,
  **dan mengedit konten + warna landing page** (menu "Content").
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
   `supabase/schema.sql`, lalu `supabase/landing_konten.sql`, lalu
   `supabase/update_2.sql` (fitur barang freetext, Inventaris, Jadwal
   Konten, dan warna tampilan — aman dijalankan meski sudah ada data),
   lalu `supabase/update_konten_baru.sql` (mengisi konten landing page
   terbaru — Bir Pletok, Biji Ketapang, lilin aromaterapi, dll — sesuai
   dokumen produk. Isi ini juga bisa diedit lagi kapan saja lewat menu
   **Content → Update Konten** di aplikasi admin), lalu
   `supabase/update_3.sql` (kolom tanggal pembelian di Inventaris &
   kategori bawaan untuk menu Stok Bahan Produksi — aman dijalankan
   meski sudah ada data).
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

Setelah jadi Super Admin, sidebar akan menampilkan menu lengkap:

- **Keuangan** → Transaksi (semua role, lengkap dengan tombol **Export
  PDF** untuk mengunduh laporan bulan yang sedang dilihat), Kategori
  Transaksi (Super Admin)
- **Persediaan** → Barang & Stok (semua role, kini dengan input nama
  barang bebas ketik), **Stok Bahan Produksi** (bahan baku untuk
  produksi, semua role bisa mencatat), Inventaris (aset di luar stok
  jual-beli, semua role bisa tambah, kini ada kolom tanggal pembelian),
  Kategori Barang (Super Admin)
- **Content** → Jadwal Konten (rencana unggahan media sosial, semua
  role), Update Konten (isi & warna landing page, Super Admin)
- **Admin** → Pengguna (Super Admin)

Editor hanya melihat menu yang boleh diaksesnya; menu khusus Super
Admin otomatis tersembunyi untuk Editor. Detail validasi ada di
komentar dalam kode.

### Export PDF laporan transaksi

Di menu **Keuangan → Transaksi**, tombol **Export PDF** mengunduh satu
file berisi laporan transaksi **bulan yang sedang dipilih di filter
"Bulan"** — persis yang tampil di tabel, tidak lebih dan tidak kurang.
Isi filenya: kop nama usaha & waktu cetak, ringkasan (kas masuk, kas
keluar, saldo, jumlah transaksi), lalu tabel Tanggal / Kategori / Jenis
/ Keterangan / Jumlah, dengan nomor halaman di setiap halaman. Nama
file mengikuti periodenya, mis. `Transaksi-Keuangan-2026-09.pdf`.

Tombolnya mati kalau bulan itu memang belum punya transaksi. Library
PDF-nya baru diunduh browser saat tombol ditekan, jadi tidak memperberat
aplikasi untuk pemakaian sehari-hari.

### Stok Bahan Produksi

Menu **Persediaan → Stok Bahan Produksi** khusus untuk bahan baku yang
dipakai membuat produk (jahe, gula, rempah, kemasan, dsb). Isinya adalah
barang yang kategorinya berjenis **Bahan Baku**, jadi stoknya tetap satu
angka yang sama dengan menu "Barang & Stok" — tidak ada stok yang
terhitung dua kali, dan semua aturan stok yang sudah ada tetap berlaku
(stok cuma berubah lewat pencatatan resmi, tidak bisa keluar melebihi
stok tersedia, riwayatnya tercatat).

- **+ Catat Masuk/Pemakaian** (semua role) — pilih "Bahan Masuk
  (pembelian)" atau "Dipakai Produksi". Nama bahan bebas diketik; kalau
  belum ada, bahan baru otomatis dibuat di kategori Bahan Baku.
- **+ Tambah Bahan** (Super Admin) — form lengkap: kode, satuan,
  kategori, stok awal, stok minimum, harga beli.
- Kartu ringkasan di atas menampilkan jumlah jenis bahan, berapa yang
  stoknya menipis, dan nilai persediaan bahan (stok × harga beli).

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

Folder `landing-page/images/` berisi foto produk (Bir Pletok, Biji
Ketapang, lilin aromaterapi) yang dipakai di section Menu — jaga folder
ini tetap ikut ter-upload bersama `index.html` saat deploy. Untuk
ganti/tambah foto produk lain, upload file baru ke folder ini lalu
tulis namanya (mis. `images/nama-file.jpg`) di kolom "Gambar" pada
menu **Content → Update Konten** di aplikasi admin.

## 4. Mengelola isi landing page, warna, & media sosial

Login ke aplikasi admin sebagai Super Admin → menu **Content → Update
Konten**. Ada 7 tab: Hero, Tentang, Menu, Ulasan, Lokasi & Kontak,
Media Sosial, dan **Tampilan (Warna)**. Setiap tab punya form biasa
(bukan kode/JSON) — isi, klik **Simpan Bagian Ini**, dan landing page
langsung menampilkan versi terbaru saat di-refresh.

Untuk **media sosial**: tambahkan baris baru, pilih platform
(Instagram/Facebook/TikTok/WhatsApp/YouTube/Lainnya), isi link
lengkapnya (harus diawali `http://` atau `https://`). Bagian "Ikuti
Kami" di landing page otomatis muncul begitu ada minimal 1 akun yang
diisi, dan otomatis tersembunyi kalau daftarnya dikosongkan lagi.

Untuk **warna**: tab "Tampilan" punya 2 color-picker — warna latar
utama dan warna aksen (tombol/judul). Landing page otomatis menghitung
variasi warna yang lebih terang untuk bagian selang-seling, jadi cukup
atur 2 warna ini saja supaya seluruh halaman tetap serasi.

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
- Barang di "Barang & Stok" bisa diketik bebas (freetext) — kalau nama
  yang diketik belum ada, sistem otomatis membuat barang baru; kalau
  sudah ada (dicocokkan tanpa peduli huruf besar/kecil), stok yang
  sama yang dipakai, bukan duplikat baru. Kategori boleh dikosongkan
  saat dibuat cepat, Super Admin bisa melengkapinya belakangan.
- "Stok Keluar" tidak bisa dipakai untuk nama barang yang belum pernah
  ada (karena stoknya memang belum ada), sistem akan menolak dan
  meminta memilih/mengetik barang yang sudah tercatat.
- Warna latar & aksen di tab "Tampilan" divalidasi harus format warna
  hex yang sah (dijamin otomatis karena memakai color-picker bawaan
  browser).
- Jadwal Konten & Inventaris bisa ditambah oleh Editor maupun Super
  Admin (risikonya rendah, bukan data uang/stok); Inventaris tetap
  membatasi hapus data hanya untuk Super Admin.
- Tanggal pembelian di Inventaris boleh dikosongkan (aset lama sering
  sudah tidak diketahui lagi tanggal belinya), tapi kalau diisi tidak
  boleh melebihi hari ini.
- Di form Transaksi, jenis transaksi dipilih dari daftar yang sudah
  dikelompokkan "Kas Masuk" / "Kas Keluar", jadi tidak mungkin memilih
  kategori yang jenisnya tidak nyambung dengan maksud transaksinya.
- Di Stok Bahan Produksi, nama yang sudah dipakai barang non-bahan baku
  ditolak (biar tidak ada nama kembar antar menu) — sistem mengarahkan
  untuk mencatatnya di "Barang & Stok" atau minta Super Admin memindahkan
  kategorinya.
