export function formatRupiah(value) {
  const n = Number(value) || 0
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

export function formatAngka(value) {
  const n = Number(value) || 0
  return n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

export function formatTanggal(value) {
  if (!value) return '-'
  const d = new Date(value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function todayISO() {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d - tz).toISOString().slice(0, 10)
}

// Ubah string berformat "150.000" menjadi angka murni 150000
export function parseAngka(text) {
  if (typeof text === 'number') return text
  const cleaned = String(text || '').replace(/[^0-9,-]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? 0 : n
}

// Format angka ketika diketik di input, dipisah titik ribuan
export function formatInputAngka(text) {
  const n = parseAngka(text)
  if (!n) return ''
  return n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}
