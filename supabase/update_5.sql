-- =====================================================================
-- MIGRASI TAMBAHAN #5
-- Jalankan di Supabase SQL Editor setelah update_4.sql.
--
-- Arsip laporan PDF transaksi keuangan bulanan yang diunggah otomatis ke
-- Google Drive oleh GitHub Actions (.github/workflows/laporan-bulanan.yml).
-- Hanya script otomatis (memakai service_role, yang melewati RLS) yang
-- menulis ke tabel ini; pengguna aplikasi cukup bisa membaca.
-- =====================================================================

create table if not exists public.arsip_laporan_keuangan (
  bulan text primary key check (bulan ~ '^\d{4}-(0[1-9]|1[0-2])$'),  -- 'YYYY-MM'
  drive_file_id text not null,
  drive_file_url text not null,
  drive_folder_url text,
  jumlah_transaksi integer not null default 0,
  total_masuk numeric(16, 2) not null default 0,
  total_keluar numeric(16, 2) not null default 0,
  diunggah_pada timestamptz not null default now()
);

alter table public.arsip_laporan_keuangan enable row level security;

drop policy if exists "arsip_laporan: lihat semua" on public.arsip_laporan_keuangan;
create policy "arsip_laporan: lihat semua" on public.arsip_laporan_keuangan
  for select to authenticated using (true);

-- Sengaja TIDAK ada policy insert/update/delete untuk authenticated:
-- arsip hanya diisi oleh script otomatis.
