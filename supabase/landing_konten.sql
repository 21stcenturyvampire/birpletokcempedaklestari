-- =====================================================================
-- TAMBAHAN: Konten Landing Page (bisa diedit lewat aplikasi admin,
-- tanpa perlu mengubah kode/HTML sama sekali)
--
-- Jalankan file ini di Supabase SQL Editor SETELAH schema.sql.
-- Aman dijalankan ulang (tidak akan menduplikasi data).
-- =====================================================================

create table if not exists public.landing_konten (
  section text primary key check (
    section in ('hero', 'tentang', 'menu', 'ulasan', 'lokasi', 'sosial_media')
  ),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_oleh uuid references public.profiles (id)
);

alter table public.landing_konten enable row level security;

-- Siapa pun (termasuk pengunjung website yang belum login) boleh MEMBACA
-- konten ini -- supaya landing page publik bisa menampilkannya.
drop policy if exists "landing_konten: baca publik" on public.landing_konten;
create policy "landing_konten: baca publik" on public.landing_konten
  for select to anon, authenticated using (true);

-- Hanya Super Admin yang boleh mengubah konten.
drop policy if exists "landing_konten: ubah super admin" on public.landing_konten;
create policy "landing_konten: ubah super admin" on public.landing_konten
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- =====================================================================
-- DATA AWAL -- sudah diisi mengikuti isi landing page yang sekarang,
-- supaya tidak ada tampilan yang berubah/hilang saat pertama kali
-- beralih ke konten dinamis. Semua ini bisa diedit lewat menu
-- "Konten Website" di aplikasi admin.
-- =====================================================================
insert into public.landing_konten (section, data) values
(
  'hero',
  '{
    "kicker": "Kedai rempah Betawi · Srengseng Sawah, Jagakarsa",
    "judul": "Sebelas rempah, satu kehangatan Betawi",
    "deskripsi": "Bir Pletok Cempedak Lestari meracik bir pletok asli, minuman tradisional Betawi tanpa alkohol, dari jahe, kayu secang, dan rempah pilihan lain — diseduh hangat untuk disantap di kedai atau dibawa pulang.",
    "teks_rating": "4,4 dari 14 ulasan Google"
  }'::jsonb
),
(
  'tentang',
  '{
    "judul": "Bir tanpa alkohol, warisan yang tetap hidup",
    "paragraf_1": "Pada masa kolonial, orang Belanda gemar menikmati bir dan wine dalam setiap perayaan. Masyarakat Betawi yang mayoritas Muslim tidak bisa ikut minum minuman beralkohol itu, sehingga mereka meracik versi mereka sendiri dari rempah nusantara — hangat di badan, berbusa saat dikocok, namun sepenuhnya halal.",
    "paragraf_2": "Begitulah bir pletok lahir: warna merahnya berasal dari kayu secang, bukan anggur, dan bunyi \"pletok\" datang dari kocokan bahan-bahannya di dalam bambu berisi es. Di Cempedak Lestari, resep itu masih kami jaga — diseduh setiap hari, disajikan hangat atau dingin, untuk siapa saja yang mampir di Srengseng Sawah.",
    "judul_rempah": "Racikan rempah kami",
    "daftar_rempah": ["Jahe", "Kayu secang", "Serai", "Kayu manis", "Cengkeh", "Kapulaga", "Biji pala", "Daun pandan", "Daun jeruk", "Lada", "Gula aren"],
    "catatan_rempah": "Direbus perlahan lalu disaring, tanpa fermentasi dan tanpa alkohol — aman diminum semua kalangan, dari anak-anak hingga lansia."
  }'::jsonb
),
(
  'menu',
  '{
    "catatan_kaki": "Harga dapat berubah sewaktu-waktu. Hubungi kedai untuk menu lengkap dan ketersediaan harian.",
    "item": [
      {"kategori": "Bir pletok", "nama": "Bir Pletok Original", "deskripsi": "Hangat atau dingin, rasa rempah klasik", "harga": 15000},
      {"kategori": "Bir pletok", "nama": "Bir Pletok Susu Jahe", "deskripsi": "Perpaduan susu dan jahe yang lebih lembut", "harga": 18000},
      {"kategori": "Bir pletok", "nama": "Bir Pletok Secang Pekat", "deskripsi": "Kayu secang lebih banyak, warna lebih merah", "harga": 18000},
      {"kategori": "Teman minum", "nama": "Kerak Telor", "deskripsi": "Telor bebek atau ayam, disangrai di tempat", "harga": 25000},
      {"kategori": "Teman minum", "nama": "Gado-Gado Betawi", "deskripsi": "Sayur rebus, lontong, bumbu kacang", "harga": 20000},
      {"kategori": "Teman minum", "nama": "Pisang Goreng Rempah", "deskripsi": "Cocok disantap selagi bir pletok masih hangat", "harga": 12000}
    ]
  }'::jsonb
),
(
  'ulasan',
  '{
    "rating": 4.4,
    "jumlah_ulasan": 14,
    "item": [
      {"nama": "Pradanaputra", "peran": "Local Guide, 54 ulasan", "isi": "Racikan bir pletoknya pas di lidah — cenderung manis, dengan rasa hangat yang tidak berlebihan."},
      {"nama": "Achmad Nurdiansyah", "peran": "Local Guide, 14 ulasan", "isi": "Rasanya enak dan patut dicoba kalau sedang lewat daerah Srengseng Sawah."},
      {"nama": "Indriyani", "peran": "Local Guide, 31 ulasan", "isi": "Bir pletoknya benar-benar enak, jadi alasan untuk mampir lagi."}
    ]
  }'::jsonb
),
(
  'lokasi',
  '{
    "alamat": "JRV7+PG5, Jl. Srengseng Sawah (Jl. Sarjana, belakang kampus ISTN), RT.001/RW.9, Srengseng Sawah, Jagakarsa, Jakarta Selatan 12640",
    "jam_buka": "Buka setiap hari mulai pukul 10.00 — jam tutup dapat berbeda tiap hari, cek Google Maps untuk status terkini.",
    "telepon": "0813-8191-6098",
    "layanan": "Dine-in dan takeaway",
    "google_maps_url": "https://www.google.com/maps/place/Bir+Pletok+Cempedak+Lestari/@-6.3557345,106.813856,17z/data=!4m16!1m9!3m8!1s0x2e69ef0a50cdffe3:0x2ae03c743c029919!2sBir+Pletok+Cempedak+Lestari!8m2!3d-6.3557345!4d106.813856!9m1!1b1!16s%2Fg%2F11gfhg6zy0!3m5!1s0x2e69ef0a50cdffe3:0x2ae03c743c029919!8m2!3d-6.3557345!4d106.813856!16s%2Fg%2F11gfhg6zy0!18m1!1e1?entry=ttu",
    "latitude": -6.3557345,
    "longitude": 106.813856
  }'::jsonb
),
(
  'sosial_media',
  '{
    "item": []
  }'::jsonb
)
on conflict (section) do nothing;
