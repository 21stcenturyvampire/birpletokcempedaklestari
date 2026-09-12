import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <div className="halaman-loading">Memuat...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (requireSuperAdmin && profile?.role !== 'super_admin') {
    return (
      <div className="kartu" style={{ margin: 24 }}>
        <h2>Akses ditolak</h2>
        <p>Halaman ini hanya bisa diakses oleh Super Admin.</p>
      </div>
    )
  }

  return children
}
