import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="kartu" style={{ margin: 24, textAlign: 'center' }}>
      <h2>Halaman tidak ditemukan</h2>
      <p className="teks-muted">Halaman yang kamu cari tidak ada.</p>
      <Link to="/" className="btn btn-emas" style={{ display: 'inline-flex' }}>Kembali ke Dasbor</Link>
    </div>
  )
}
