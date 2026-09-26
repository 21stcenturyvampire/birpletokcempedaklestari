import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, keluar, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const handleKeluar = async () => {
    await keluar()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-dot" />
          <div>
            <div className="brand-title">Bir Pletok</div>
            <div className="brand-sub">Cempedak Lestari</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end>Dasbor</NavLink>
          <div className="nav-group-label">Keuangan</div>
          <NavLink to="/keuangan">Transaksi</NavLink>
          {isSuperAdmin && <NavLink to="/keuangan/kategori">Kategori Transaksi</NavLink>}
          <div className="nav-group-label">Persediaan</div>
          <NavLink to="/persediaan">Barang & Stok</NavLink>
          <NavLink to="/persediaan/bahan-produksi">Stok Bahan Produksi</NavLink>
          <NavLink to="/persediaan/inventaris">Inventaris</NavLink>
          {isSuperAdmin && <NavLink to="/persediaan/kategori">Kategori Barang</NavLink>}
          <div className="nav-group-label">Content</div>
          <NavLink to="/konten/jadwal">Jadwal Konten</NavLink>
          {isSuperAdmin && <NavLink to="/konten/update">Update Konten</NavLink>}
          {isSuperAdmin && (
            <>
              <div className="nav-group-label">Admin</div>
              <NavLink to="/pengguna">Pengguna</NavLink>
            </>
          )}
        </nav>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div />
          <div className="topbar-user">
            <div className="user-info">
              <div className="user-nama">{profile?.nama_lengkap}</div>
              <div className="user-role">{isSuperAdmin ? 'Super Admin' : 'Editor'}</div>
            </div>
            <button type="button" className="btn btn-garis" onClick={handleKeluar}>
              Keluar
            </button>
          </div>
        </header>
        <main className="konten">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
