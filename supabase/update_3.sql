-- =====================================================================
-- MIGRASI TAMBAHAN #3
-- Jalankan di Supabase SQL Editor SETELAH schema.sql, landing_konten.sql,
-- update_2.sql, dan update_konten_baru.sql.
-- Aman dijalankan di database yang sudah berisi data (tidak menghapus
-- data apa pun, tidak mengubah data yang sudah ada).
--
-- Isi migrasi ini:
--   1. Kolom "tanggal pembelian" di Inventaris.
--   2. Kategori bawaan untuk menu baru "Stok Bahan Produksi".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. INVENTARIS: tanggal pembelian aset (opsional)
--    Dibuat nullable karena aset lama mungkin sudah tidak diketahui
--    lagi kapan dibelinya. Larangan tanggal di masa depan dicek di form
--    aplikasi (sama seperti tanggal transaksi & mutasi stok).
-- ---------------------------------------------------------------------
alter table public.inventaris_aset
  add column if not exists tanggal_pembelian date;

-- ---------------------------------------------------------------------
-- 2. STOK BAHAN PRODUKSI
--    Menu "Stok Bahan Produksi" di aplikasi menampilkan barang yang
--    kategorinya berjenis 'bahan_baku'. Tidak ada tabel baru: stok bahan
--    tetap memakai tabel barang + mutasi_stok yang sudah ada, supaya
--    aturan stok yang sudah aman (trigger tolak stok minus, riwayat
--    kartu stok) otomatis berlaku juga untuk bahan produksi.
--
--    Baris di bawah hanya memastikan minimal ada satu kategori bahan
--    baku, karena Editor tidak punya izin membuat kategori sendiri.
-- ---------------------------------------------------------------------
insert into public.kategori_barang (nama, jenis) values
  ('Bahan Baku', 'bahan_baku')
on conflict (nama) do nothing;
