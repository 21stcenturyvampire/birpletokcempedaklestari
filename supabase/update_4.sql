-- =====================================================================
-- MIGRASI TAMBAHAN #4
-- Jalankan di Supabase SQL Editor setelah update_3.sql.
--
-- "Bahan Produksi" adalah catatan bahan baku pembuatan produk (rempah,
-- kemasan, dll) yang BERDIRI SENDIRI -- CRUD sederhana, TIDAK terhubung
-- ke tabel barang/mutasi_stok (jadi tidak ada histori mutasi/trigger
-- seperti di "Barang & Stok"; jumlahnya bisa diedit langsung).
-- =====================================================================

create table if not exists public.bahan_produksi (
  id bigint generated always as identity primary key,
  nama text not null,
  kategori text,
  jumlah numeric(14, 2) not null default 0 check (jumlah >= 0),
  satuan text not null default 'kg',
  harga_satuan numeric(14, 2) check (harga_satuan is null or harga_satuan >= 0),
  tanggal_pembelian date,
  catatan text,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.bahan_produksi enable row level security;

drop policy if exists "bahan_produksi: lihat semua" on public.bahan_produksi;
create policy "bahan_produksi: lihat semua" on public.bahan_produksi
  for select to authenticated using (true);

drop policy if exists "bahan_produksi: semua boleh tambah" on public.bahan_produksi;
create policy "bahan_produksi: semua boleh tambah" on public.bahan_produksi
  for insert to authenticated with check (true);

drop policy if exists "bahan_produksi: semua boleh ubah" on public.bahan_produksi;
create policy "bahan_produksi: semua boleh ubah" on public.bahan_produksi
  for update to authenticated using (true) with check (true);

drop policy if exists "bahan_produksi: super admin hapus" on public.bahan_produksi;
create policy "bahan_produksi: super admin hapus" on public.bahan_produksi
  for delete to authenticated using (public.is_super_admin());
