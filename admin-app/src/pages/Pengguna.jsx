import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Notifikasi from '../components/Notifikasi'
import { pesanErrorRamah } from '../utils/validation'

export default function Pengguna() {
  const { profile, refreshProfil } = useAuth()
  const [daftar, setDaftar] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [notif, setNotif] = useState(null)
  const [sedangUbah, setSedangUbah] = useState(null)

  const muatData = async () => {
    setMemuat(true)
    const { data } = await supabase.from('profiles').select('id, email, nama_lengkap, role').order('created_at')
    setDaftar(data || [])
    setMemuat(false)
  }

  useEffect(() => { muatData() }, [])

  const jumlahSuperAdmin = daftar.filter((p) => p.role === 'super_admin').length

  const ubahPeran = async (target, peranBaru) => {
    if (target.id === profile.id && peranBaru !== 'super_admin' && jumlahSuperAdmin <= 1) {
      setNotif({ tipe: 'error', pesan: 'Tidak bisa mengubah peran ini karena kamu satu-satunya Super Admin. Jadikan pengguna lain Super Admin terlebih dahulu.' })
      return
    }
    setSedangUbah(target.id)
    const { error } = await supabase.from('profiles').update({ role: peranBaru }).eq('id', target.id)
    setSedangUbah(null)
    if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    setNotif({ tipe: 'sukses', pesan: `Peran ${target.nama_lengkap} diperbarui.` })
    muatData()
    if (target.id === profile.id) refreshProfil()
  }

  return (
    <div>
      <h2 className="judul-halaman">Pengguna</h2>
      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="kartu" style={{ marginBottom: 18 }}>
        <p className="teks-muted" style={{ margin: 0 }}>
          Untuk menambah pengguna baru: buat akunnya lebih dulu lewat Supabase Dashboard
          (Authentication → Add User), lalu atur perannya di tabel bawah ini. Akun baru
          otomatis berperan "Editor" sampai kamu ubah.
        </p>
      </div>

      <div className="kartu">
        {memuat ? (
          <p className="teks-muted">Memuat...</p>
        ) : (
          <table className="tabel">
            <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th></th></tr></thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id}>
                  <td>{p.nama_lengkap} {p.id === profile.id && <span className="teks-muted">(kamu)</span>}</td>
                  <td>{p.email}</td>
                  <td>
                    <span className={`lencana ${p.role === 'super_admin' ? 'lencana-hijau' : ''}`}>
                      {p.role === 'super_admin' ? 'Super Admin' : 'Editor'}
                    </span>
                  </td>
                  <td className="kolom-aksi">
                    {p.role === 'super_admin' ? (
                      <button type="button" className="btn-tautan" disabled={sedangUbah === p.id} onClick={() => ubahPeran(p, 'editor')}>
                        Jadikan Editor
                      </button>
                    ) : (
                      <button type="button" className="btn-tautan" disabled={sedangUbah === p.id} onClick={() => ubahPeran(p, 'super_admin')}>
                        Jadikan Super Admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
