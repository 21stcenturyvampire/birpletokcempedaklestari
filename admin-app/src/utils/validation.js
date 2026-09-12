import { parseAngka, todayISO } from './format'

export function wajibDiisi(value, label = 'Kolom ini') {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${label} wajib diisi.`
  }
  return ''
}

export function harusAngkaPositif(value, label = 'Jumlah') {
  const n = parseAngka(value)
  if (!value && value !== 0) return `${label} wajib diisi.`
  if (Number.isNaN(n)) return `${label} harus berupa angka.`
  if (n <= 0) return `${label} harus lebih besar dari 0.`
  return ''
}

export function angkaTidakNegatif(value, label = 'Nilai') {
  if (value === '' || value === null || value === undefined) return ''
  const n = parseAngka(value)
  if (Number.isNaN(n)) return `${label} harus berupa angka.`
  if (n < 0) return `${label} tidak boleh negatif.`
  return ''
}

export function tanggalTidakBolehFuture(value, label = 'Tanggal') {
  if (!value) return `${label} wajib diisi.`
  if (value > todayISO()) return `${label} tidak boleh lebih dari hari ini.`
  return ''
}

// Menjalankan sekumpulan { key: fungsiValidasi } dan mengembalikan
// object error { key: pesan } -- hanya key yang gagal yang muncul.
export function jalankanValidasi(rules) {
  const errors = {}
  for (const key of Object.keys(rules)) {
    const pesan = rules[key]
    if (pesan) errors[key] = pesan
  }
  return errors
}

export function adaError(errors) {
  return Object.keys(errors).length > 0
}

// Terjemahkan error umum dari Supabase/Postgres ke bahasa yang lebih
// ramah, supaya pesan mentah database tidak membingungkan pengguna.
export function pesanErrorRamah(error) {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui.'
  const msg = error.message || String(error)

  if (msg.includes('duplicate key value')) {
    return 'Data dengan nama/kode yang sama sudah ada. Gunakan nama atau kode lain.'
  }
  if (msg.includes('violates foreign key constraint') && msg.includes('delete')) {
    return 'Data ini tidak bisa dihapus karena masih dipakai di data lain.'
  }
  if (msg.includes('violates row-level security policy')) {
    return 'Kamu tidak memiliki izin untuk melakukan aksi ini. Hubungi Super Admin.'
  }
  if (msg.toLowerCase().includes('stok tidak mencukupi')) {
    return msg
  }
  return msg
}
