-- =====================================================================
-- Skema Database: Aplikasi Keuangan & Persediaan
-- UMKM Bir Pletok Cempedak Lestari
--
-- Cara pakai: buka Supabase Dashboard -> SQL Editor -> New Query,
-- tempel seluruh isi file ini, lalu klik Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFIL PENGGUNA (super_admin / editor)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nama_lengkap text not null default 'Pengguna Baru',
  role text not null default 'editor' check (role in ('super_admin', 'editor')),
  created_at timestamptz not null default now()
);

-- Saat ada akun auth baru (dibuat lewat Supabase Dashboard), otomatis
-- buat baris profil dengan peran default "editor".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nama_lengkap, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nama_lengkap', split_part(new.email, '@', 1)),
    'editor'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. KATEGORI TRANSAKSI KEUANGAN
-- ---------------------------------------------------------------------
create table if not exists public.kategori_transaksi (
  id bigint generated always as identity primary key,
  nama text not null unique,
  tipe text not null check (tipe in ('masuk', 'keluar')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. TRANSAKSI KEUANGAN
--    tipe (masuk/keluar) sengaja tidak disimpan terpisah, tapi diambil
--    dari kategorinya -- supaya tidak mungkin tipe & kategori tidak nyambung.
-- ---------------------------------------------------------------------
create table if not exists public.transaksi_keuangan (
  id bigint generated always as identity primary key,
  tanggal date not null default current_date,
  kategori_id bigint not null references public.kategori_transaksi (id) on delete restrict,
  jumlah numeric(14, 2) not null check (jumlah > 0),
  keterangan text,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_transaksi_tanggal on public.transaksi_keuangan (tanggal desc);

-- ---------------------------------------------------------------------
-- 4. KATEGORI BARANG (produk jadi / bahan baku)
-- ---------------------------------------------------------------------
create table if not exists public.kategori_barang (
  id bigint generated always as identity primary key,
  nama text not null unique,
  jenis text not null check (jenis in ('produk_jadi', 'bahan_baku')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. BARANG (master data produk jadi & bahan baku)
--    stok_saat_ini HANYA boleh berubah lewat tabel mutasi_stok (lihat
--    trigger di bagian 6) supaya tidak ada yang bisa "mengarang" stok.
-- ---------------------------------------------------------------------
create table if not exists public.barang (
  id bigint generated always as identity primary key,
  kode text not null unique,
  nama text not null,
  kategori_id bigint not null references public.kategori_barang (id) on delete restrict,
  satuan text not null,
  stok_saat_ini numeric(14, 2) not null default 0 check (stok_saat_ini >= 0),
  stok_minimum numeric(14, 2) not null default 0 check (stok_minimum >= 0),
  harga_beli numeric(14, 2) check (harga_beli is null or harga_beli >= 0),
  harga_jual numeric(14, 2) check (harga_jual is null or harga_jual >= 0),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. MUTASI STOK (kartu stok masuk/keluar) -- satu-satunya jalan resmi
--    untuk mengubah stok barang. stok_sebelum/stok_sesudah dihitung
--    otomatis oleh trigger, bukan diisi manual dari aplikasi.
-- ---------------------------------------------------------------------
create table if not exists public.mutasi_stok (
  id bigint generated always as identity primary key,
  barang_id bigint not null references public.barang (id) on delete restrict,
  tanggal date not null default current_date,
  tipe text not null check (tipe in ('masuk', 'keluar')),
  jumlah numeric(14, 2) not null check (jumlah > 0),
  stok_sebelum numeric(14, 2) not null default 0,
  stok_sesudah numeric(14, 2) not null default 0,
  keterangan text,
  dibuat_oleh uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_mutasi_barang on public.mutasi_stok (barang_id, created_at desc);

-- Terapkan mutasi ke stok barang secara otomatis & aman terhadap
-- akses bersamaan (row lock), serta TOLAK stok keluar melebihi stok
-- yang tersedia -- ini pencegah human-error paling penting di aplikasi.
create or replace function public.terapkan_mutasi_stok()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  stok_now numeric(14,2);
begin
  select stok_saat_ini into stok_now
  from public.barang
  where id = new.barang_id
  for update; -- kunci baris supaya tidak race condition antar 2 user

  if stok_now is null then
    raise exception 'Barang tidak ditemukan.';
  end if;

  if new.tipe = 'keluar' and new.jumlah > stok_now then
    raise exception 'Stok tidak mencukupi. Stok tersedia saat ini: %', stok_now;
  end if;

  new.stok_sebelum := stok_now;
  if new.tipe = 'masuk' then
    new.stok_sesudah := stok_now + new.jumlah;
  else
    new.stok_sesudah := stok_now - new.jumlah;
  end if;

  update public.barang set stok_saat_ini = new.stok_sesudah where id = new.barang_id;

  return new;
end;
$$;

drop trigger if exists trg_terapkan_mutasi_stok on public.mutasi_stok;
create trigger trg_terapkan_mutasi_stok
  before insert on public.mutasi_stok
  for each row execute procedure public.terapkan_mutasi_stok();

-- Jika sebuah mutasi dihapus (mis. salah input), kembalikan stok
-- seperti semula -- hanya super_admin yang boleh menghapus (lihat RLS).
create or replace function public.batalkan_mutasi_stok()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.tipe = 'masuk' then
    update public.barang set stok_saat_ini = stok_saat_ini - old.jumlah where id = old.barang_id;
  else
    update public.barang set stok_saat_ini = stok_saat_ini + old.jumlah where id = old.barang_id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_batalkan_mutasi_stok on public.mutasi_stok;
create trigger trg_batalkan_mutasi_stok
  after delete on public.mutasi_stok
  for each row execute procedure public.batalkan_mutasi_stok();

-- Cegah siapa pun mengubah stok_saat_ini langsung lewat UPDATE barang
-- (harus lewat mutasi_stok). Kolom lain tetap boleh diubah.
revoke update (stok_saat_ini) on table public.barang from authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.kategori_transaksi enable row level security;
alter table public.transaksi_keuangan enable row level security;
alter table public.kategori_barang enable row level security;
alter table public.barang enable row level security;
alter table public.mutasi_stok enable row level security;

-- Helper: cek apakah user yang login adalah super_admin
create or replace function public.is_super_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- ---- profiles ----
drop policy if exists "profil: lihat semua" on public.profiles;
create policy "profil: lihat semua" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profil: super admin update" on public.profiles;
create policy "profil: super admin update" on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---- kategori_transaksi ----
drop policy if exists "kategori_transaksi: lihat semua" on public.kategori_transaksi;
create policy "kategori_transaksi: lihat semua" on public.kategori_transaksi
  for select to authenticated using (true);

drop policy if exists "kategori_transaksi: kelola super admin" on public.kategori_transaksi;
create policy "kategori_transaksi: kelola super admin" on public.kategori_transaksi
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---- transaksi_keuangan ----
drop policy if exists "transaksi: lihat semua" on public.transaksi_keuangan;
create policy "transaksi: lihat semua" on public.transaksi_keuangan
  for select to authenticated using (true);

drop policy if exists "transaksi: semua boleh input" on public.transaksi_keuangan;
create policy "transaksi: semua boleh input" on public.transaksi_keuangan
  for insert to authenticated with check (true);

drop policy if exists "transaksi: super admin ubah/hapus" on public.transaksi_keuangan;
create policy "transaksi: super admin update" on public.transaksi_keuangan
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "transaksi: super admin hapus" on public.transaksi_keuangan
  for delete to authenticated using (public.is_super_admin());

-- ---- kategori_barang ----
drop policy if exists "kategori_barang: lihat semua" on public.kategori_barang;
create policy "kategori_barang: lihat semua" on public.kategori_barang
  for select to authenticated using (true);

drop policy if exists "kategori_barang: kelola super admin" on public.kategori_barang;
create policy "kategori_barang: kelola super admin" on public.kategori_barang
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---- barang ----
drop policy if exists "barang: lihat semua" on public.barang;
create policy "barang: lihat semua" on public.barang
  for select to authenticated using (true);

drop policy if exists "barang: kelola super admin" on public.barang;
create policy "barang: kelola super admin" on public.barang
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---- mutasi_stok ----
drop policy if exists "mutasi: lihat semua" on public.mutasi_stok;
create policy "mutasi: lihat semua" on public.mutasi_stok
  for select to authenticated using (true);

drop policy if exists "mutasi: semua boleh input" on public.mutasi_stok;
create policy "mutasi: semua boleh input" on public.mutasi_stok
  for insert to authenticated with check (true);

drop policy if exists "mutasi: super admin hapus" on public.mutasi_stok;
create policy "mutasi: super admin hapus" on public.mutasi_stok
  for delete to authenticated using (public.is_super_admin());

-- =====================================================================
-- DATA AWAL (opsional, boleh diedit lewat aplikasi setelah ini)
-- =====================================================================
insert into public.kategori_transaksi (nama, tipe) values
  ('Penjualan', 'masuk'),
  ('Beli Bahan Baku', 'keluar'),
  ('Operasional', 'keluar'),
  ('Gaji', 'keluar')
on conflict (nama) do nothing;

insert into public.kategori_barang (nama, jenis) values
  ('Produk Jadi', 'produk_jadi'),
  ('Bahan Baku', 'bahan_baku')
on conflict (nama) do nothing;

-- =====================================================================
-- LANGKAH TERAKHIR (WAJIB, DILAKUKAN MANUAL SEKALI SAJA):
-- Setelah kamu login pertama kali di aplikasi (lihat README),
-- jalankan query berikut di SQL Editor untuk menjadikan akunmu
-- Super Admin (ganti email sesuai akunmu):
--
--   update public.profiles set role = 'super_admin'
--   where email = 'email_kamu@contoh.com';
-- =====================================================================
