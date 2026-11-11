import { useId } from 'react'
import { PILIHAN_PER_HALAMAN } from '../hooks/useTabel'

// Kotak pencarian di atas tabel. `tabel` = hasil dari useTabel().
export function KotakCari({ tabel, placeholder = 'Cari di semua kolom...' }) {
  const idPerHalaman = useId()
  return (
    <div className="tabel-atas">
      <div className="kotak-cari">
        <span className="kotak-cari-ikon" aria-hidden="true">⌕</span>
        <input
          type="search"
          className="input"
          placeholder={placeholder}
          value={tabel.cari}
          onChange={(e) => tabel.setCari(e.target.value)}
          aria-label="Cari data tabel"
        />
        {tabel.cari && (
          <button type="button" className="kotak-cari-hapus" onClick={() => tabel.setCari('')} aria-label="Hapus pencarian">
            ×
          </button>
        )}
      </div>
      <div className="tabel-per-halaman">
        <label htmlFor={idPerHalaman}>Tampilkan</label>
        <select
          id={idPerHalaman}
          className="input"
          value={tabel.perHalaman}
          onChange={(e) => tabel.setPerHalaman(Number(e.target.value))}
        >
          {PILIHAN_PER_HALAMAN.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span>baris</span>
      </div>
    </div>
  )
}

// Daftar nomor halaman dengan elipsis: 1 … 4 5 6 … 12
function nomorHalaman(sekarang, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, sekarang - 1, sekarang, sekarang + 1])
  if (sekarang <= 3) [2, 3, 4].forEach((n) => set.add(n))
  if (sekarang >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => set.add(n))
  const urut = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const hasil = []
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) hasil.push('…' + n)
    hasil.push(n)
  })
  return hasil
}

// Info jumlah data + tombol halaman di bawah tabel.
export function Paginasi({ tabel }) {
  const { halaman, totalHalaman, setHalaman, dari, sampai, totalHasil, totalData, cari } = tabel
  if (totalData === 0) return null

  return (
    <div className="paginasi">
      <div className="paginasi-info">
        {totalHasil === 0
          ? 'Tidak ada data yang cocok'
          : `Menampilkan ${dari}–${sampai} dari ${totalHasil} data`}
        {cari && totalHasil !== totalData && <span className="teks-muted"> (disaring dari {totalData})</span>}
      </div>
      {totalHalaman > 1 && (
        <nav className="paginasi-tombol" aria-label="Navigasi halaman tabel">
          <button type="button" onClick={() => setHalaman(halaman - 1)} disabled={halaman === 1} aria-label="Halaman sebelumnya">
            ‹
          </button>
          {nomorHalaman(halaman, totalHalaman).map((n) =>
            typeof n === 'string' ? (
              <span key={n} className="paginasi-elipsis">…</span>
            ) : (
              <button
                key={n}
                type="button"
                className={n === halaman ? 'aktif' : ''}
                aria-current={n === halaman ? 'page' : undefined}
                onClick={() => setHalaman(n)}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" onClick={() => setHalaman(halaman + 1)} disabled={halaman === totalHalaman} aria-label="Halaman berikutnya">
            ›
          </button>
        </nav>
      )}
    </div>
  )
}

// Baris kosong saat pencarian tidak menemukan apa pun.
export function BarisKosong({ kolom, tabel }) {
  if (tabel.totalHasil > 0) return null
  return (
    <tr>
      <td colSpan={kolom} className="teks-muted" style={{ textAlign: 'center', padding: '22px 10px' }}>
        Tidak ada data yang cocok dengan "{tabel.cari}".
      </td>
    </tr>
  )
}
