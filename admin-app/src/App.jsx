import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Keuangan from './pages/Keuangan'
import KategoriTransaksi from './pages/KategoriTransaksi'
import Persediaan from './pages/Persediaan'
import BahanProduksi from './pages/BahanProduksi'
import Inventaris from './pages/Inventaris'
import KategoriBarang from './pages/KategoriBarang'
import Pengguna from './pages/Pengguna'
import JadwalKonten from './pages/JadwalKonten'
import KontenLandingPage from './pages/KontenLandingPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />

            <Route path="/keuangan" element={<Keuangan />} />
            <Route
              path="/keuangan/kategori"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <KategoriTransaksi />
                </ProtectedRoute>
              }
            />

            <Route path="/persediaan" element={<Persediaan />} />
            <Route path="/persediaan/bahan-produksi" element={<BahanProduksi />} />
            <Route path="/persediaan/inventaris" element={<Inventaris />} />
            <Route
              path="/persediaan/kategori"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <KategoriBarang />
                </ProtectedRoute>
              }
            />

            <Route path="/konten/jadwal" element={<JadwalKonten />} />
            <Route
              path="/konten/update"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <KontenLandingPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/pengguna"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <Pengguna />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
