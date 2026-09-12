import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { wajibDiisi, jalankanValidasi, adaError } from '../utils/validation'

export default function Login() {
  const { session, masuk, loading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [errorServer, setErrorServer] = useState('')
  const [prosesLogin, setProsesLogin] = useState(false)

  if (!loading && session) {
    const tujuan = location.state?.from?.pathname || '/'
    return <Navigate to={tujuan} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      email: wajibDiisi(email, 'Email'),
      password: wajibDiisi(password, 'Password'),
    })
    setErrors(validasi)
    setErrorServer('')
    if (adaError(validasi)) return

    setProsesLogin(true)
    const error = await masuk(email.trim(), password)
    setProsesLogin(false)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorServer('Email atau password salah.')
      } else {
        setErrorServer(error.message)
      }
    }
  }

  return (
    <div className="halaman-login">
      <form className="login-box" onSubmit={handleSubmit} noValidate>
        <div className="brand-dot" style={{ margin: '0 auto 14px' }} />
        <h1>Bir Pletok Cempedak Lestari</h1>
        <p className="login-sub">Aplikasi Keuangan &amp; Persediaan</p>

        {errorServer && <div className="notif notif-error">{errorServer}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className={errors.email ? 'input input-error' : 'input'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        {errors.email && <div className="pesan-error">{errors.email}</div>}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className={errors.password ? 'input input-error' : 'input'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {errors.password && <div className="pesan-error">{errors.password}</div>}

        <button type="submit" className="btn btn-emas" disabled={prosesLogin} style={{ marginTop: 18, width: '100%' }}>
          {prosesLogin ? 'Memproses...' : 'Masuk'}
        </button>

        <p className="login-catatan">
          Belum punya akun? Hubungi Super Admin untuk dibuatkan akses.
        </p>
      </form>
    </div>
  )
}
