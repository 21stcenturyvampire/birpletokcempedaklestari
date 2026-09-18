-- =====================================================================
-- MIGRASI TAMBAHAN #2
-- Jalankan di Supabase SQL Editor SETELAH schema.sql dan landing_konten.sql.
-- Aman dijalankan di database yang sudah berisi data (tidak menghapus
-- data apa pun).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BARANG: kategori jadi opsional (supaya bisa dibuat cepat lewat
--    input freetext di form Stok Masuk/Keluar, tanpa wajib pilih
--    kategori dulu). Super Admin tetap bisa mengisi kategorinya
--    belakangan lewat tombol "Ubah".
-- ---------------------------------------------------------------------
alter table public.barang alter column kategori_id drop not null;

-- Izinkan SEMUA pengguna login (bukan cuma Super Admin) untuk membuat
-- barang baru -- supaya Editor tidak terhambat kalau barang yang
-- diketik belum ada di master data. Ubah/hapus tetap khusus Super Admin.
drop policy if exists "barang: kelola super admin" on public.barang;

drop policy if exists "barang: semua boleh tambah" on public.barang;
create policy "barang: semua boleh tambah" on public.barang
  for insert to authenticated with check (true);

drop policy if exists "barang: super admin ubah" on public.barang;
create policy "barang: super admin ubah" on public.barang
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "barang: super admin hapus" on public.barang;
create policy "barang: super admin hapus" on public.barang
  for delete to authenticated using (public.is_super_admin());

-- ---------------------------------------------------------------------
-- 2. INVENTARIS ASET -- barang/aset di luar persediaan jual-beli
--    (peralatan, furnitur, dll) yang TIDAK memakai pencatatan stok
--    masuk/keluar seperti barang dagangan.
-- ---------------------------------------------------------------------
create table if not exists public.inventaris_aset (
  id bigint generated always as identity primary key,
  nama text not null,
  kategori text,
  jumlah numeric(14, 2) not null default 1 check (jumlah >= 0),
  satuan text not null default 'unit',
  kondisi text not null default 'baik' check (kondisi in ('baik', 'perlu_perbaikan', 'rusak')),
  lokasi text,
  catatan text,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.inventaris_aset enable row level security;

drop policy if exists "inventaris: lihat semua" on public.inventaris_aset;
create policy "inventaris: lihat semua" on public.inventaris_aset
  for select to authenticated using (true);

drop policy if exists "inventaris: semua boleh tambah" on public.inventaris_aset;
create policy "inventaris: semua boleh tambah" on public.inventaris_aset
  for insert to authenticated with check (true);

drop policy if exists "inventaris: super admin ubah" on public.inventaris_aset;
create policy "inventaris: super admin ubah" on public.inventaris_aset
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "inventaris: super admin hapus" on public.inventaris_aset;
create policy "inventaris: super admin hapus" on public.inventaris_aset
  for delete to authenticated using (public.is_super_admin());

-- ---------------------------------------------------------------------
-- 3. JADWAL KONTEN -- rencana unggahan konten media sosial untuk
--    promosi/marketing. Risikonya rendah (bukan data uang/stok), jadi
--    Super Admin & Editor sama-sama bisa kelola penuh.
-- ---------------------------------------------------------------------
create table if not exists public.jadwal_konten (
  id bigint generated always as identity primary key,
  tanggal date not null,
  waktu time,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'whatsapp', 'youtube', 'lainnya')),
  judul text not null,
  keterangan text,
  status text not null default 'draft' check (status in ('draft', 'terjadwal', 'selesai', 'dibatalkan')),
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_jadwal_konten_tanggal on public.jadwal_konten (tanggal);

alter table public.jadwal_konten enable row level security;

drop policy if exists "jadwal_konten: lihat semua" on public.jadwal_konten;
create policy "jadwal_konten: lihat semua" on public.jadwal_konten
  for select to authenticated using (true);

drop policy if exists "jadwal_konten: semua boleh tambah" on public.jadwal_konten;
create policy "jadwal_konten: semua boleh tambah" on public.jadwal_konten
  for insert to authenticated with check (true);

drop policy if exists "jadwal_konten: semua boleh ubah" on public.jadwal_konten;
create policy "jadwal_konten: semua boleh ubah" on public.jadwal_konten
  for update to authenticated using (true) with check (true);

drop policy if exists "jadwal_konten: semua boleh hapus" on public.jadwal_konten;
create policy "jadwal_konten: semua boleh hapus" on public.jadwal_konten
  for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- 4. TAMPILAN (warna) -- ditambahkan sebagai section baru di
--    landing_konten supaya warna latar & aksen website bisa diubah
--    lewat menu Content > Update Konten.
-- ---------------------------------------------------------------------
alter table public.landing_konten drop constraint if exists landing_konten_section_check;
alter table public.landing_konten add constraint landing_konten_section_check
  check (section in ('hero', 'tentang', 'menu', 'ulasan', 'lokasi', 'sosial_media', 'tampilan'));

insert into public.landing_konten (section, data) values
(
  'tampilan',
  '{"warna_latar": "#33090f", "warna_aksen": "#c89b3c"}'::jsonb
)
on conflict (section) do nothing;
