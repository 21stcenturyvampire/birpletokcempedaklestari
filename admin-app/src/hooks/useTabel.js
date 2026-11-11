import { useEffect, useMemo, useState } from 'react'

export const PILIHAN_PER_HALAMAN = [10, 25, 50, 100]

function normalisasi(teks) {
  return String(teks ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Hook bersama untuk tabel: pencarian di semua kolom + pagination.
//
// data   : array baris (hasil query Supabase).
// keCari : fungsi (baris) => array teks yang TAMPIL di tiap kolom
//          (mis. tanggal yang sudah diformat, "Rp 150.000", label status),
//          supaya yang dicari pengguna sama persis dengan yang dilihatnya.
//
// Pencarian beberapa kata = semua kata harus ditemukan (di kolom mana pun).
export default function useTabel(data, keCari, { perHalamanAwal = 10 } = {}) {
  const [cari, setCariMentah] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [perHalaman, setPerHalamanMentah] = useState(perHalamanAwal)

  const indeks = useMemo(
    () => (data || []).map((baris) => ({ baris, teks: normalisasi([].concat(keCari(baris)).join(' ')) })),
    // keCari biasanya fungsi inline; cukup hitung ulang saat data berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  )

  const hasil = useMemo(() => {
    const kata = normalisasi(cari).split(/\s+/).filter(Boolean)
    if (kata.length === 0) return indeks.map((x) => x.baris)
    return indeks.filter((x) => kata.every((k) => x.teks.includes(k))).map((x) => x.baris)
  }, [indeks, cari])

  const totalHalaman = Math.max(1, Math.ceil(hasil.length / perHalaman))

  // Kalau data berkurang (mis. habis hapus/filter), jangan sampai
  // terjebak di halaman yang sudah tidak ada.
  useEffect(() => {
    if (halaman > totalHalaman) setHalaman(totalHalaman)
  }, [halaman, totalHalaman])

  const halamanAman = Math.min(halaman, totalHalaman)
  const mulai = (halamanAman - 1) * perHalaman
  const barisHalaman = hasil.slice(mulai, mulai + perHalaman)

  return {
    cari,
    setCari: (v) => { setCariMentah(v); setHalaman(1) },
    halaman: halamanAman,
    setHalaman,
    perHalaman,
    setPerHalaman: (n) => { setPerHalamanMentah(n); setHalaman(1) },
    totalHalaman,
    totalData: (data || []).length,
    totalHasil: hasil.length,
    dari: hasil.length === 0 ? 0 : mulai + 1,
    sampai: mulai + barisHalaman.length,
    hasil,
    barisHalaman,
  }
}
