-- =====================================================================
-- MIGRASI TAMBAHAN #3
-- Jalankan di Supabase SQL Editor setelah update_2.sql.
-- =====================================================================

-- Kolom tanggal pembelian untuk data Inventaris.
alter table public.inventaris_aset add column if not exists tanggal_pembelian date;
