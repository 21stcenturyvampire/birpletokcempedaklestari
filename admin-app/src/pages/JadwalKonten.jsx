import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Notifikasi from '../components/Notifikasi'
import { formatTanggal, todayISO } from '../utils/format'
import { wajibDiisi, jalankanValidasi, adaError, pesanErrorRamah } from '../utils/validation'

const FORM_KOSONG = { id: null, tanggal: todayISO(), waktu: '', platform: 'instagram', judul: '', keterangan: '', status: 'draft' }

const LABEL_PLATFORM = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', whatsapp: 'WhatsApp', youtube: 'YouTube', lainnya: 'Lainnya' }
const LABEL_STATUS = { draft: 'Draft', terjadwal: 'Terjadwal', selesai: 'Selesai', dibatalkan: 'Dibatalkan' }
const KELAS_STATUS = { draft: '', terjadwal: 'lencana-kuning', selesai: 'lencana-hijau', dibatalkan: 'lencana-merah' }

export default function JadwalKonten() {
  const { profile } = useAuth()
  const [daftar, setDaftar] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [notif, setNotif] = useState(null)
  const [filterStatus, setFilterStatus] = useState('semua')

  const [modalTerbuka, setModalTerbuka] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [errors, setErrors] = useState({})
  const [menyimpan, setMenyimpan] = useState(false)

  const [akanDihapus, setAkanDihapus] = useState(null)
  const [menghapus, setMenghapus] = useState(false)

  const muatData = async () => {
    setMemuat(true)
    const { data } = await supabase.from('jadwal_konten').select('*').order('tanggal', { ascending: true })
    setDaftar(data || [])
    setMemuat(false)
  }

  useEffect(() => { muatData() }, [])

  const bukaTambah = () => { setForm(FORM_KOSONG); setErrors({}); setModalTerbuka(true) }
  const bukaEdit = (j) => {
    setForm({
      id: j.id, tanggal: j.tanggal, waktu: j.waktu || '', platform: j.platform,
      judul: j.judul, keterangan: j.keterangan || '', status: j.status,
    })
    setErrors({})
    setModalTerbuka(true)
  }

  const simpan = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      tanggal: wajibDiisi(form.tanggal, 'Tanggal'),
      judul: wajibDiisi(form.judul, 'Judul/ide konten'),
    })
    setErrors(validasi)
    if (adaError(validasi)) return

    setMenyimpan(true)
    const payload = {
      tanggal: form.tanggal,
      waktu: form.waktu || null,
      platform: form.platform,
      judul: form.judul.trim(),
      keterangan: form.keterangan.trim() || null,
      status: form.status,
    }

    const { error } = form.id
      ? await supabase.from('jadwal_konten').update(payload).eq('id', form.id)
      : await supabase.from('jadwal_konten').insert({ ...payload, dibuat_oleh: profile?.id })
    setMenyimpan(false)

    if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    setModalTerbuka(false)
    setNotif({ tipe: 'sukses', pesan: 'Jadwal konten disimpan.' })
    muatData()
  }

  const hapus = async () => {
    setMenghapus(true)
    const { error } = await supabase.from('jadwal_konten').delete().eq('id', akanDihapus.id)
    setMenghapus(false)
    setAkanDihapus(null)
    if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    setNotif({ tipe: 'sukses', pesan: 'Jadwal konten dihapus.' })
    muatData()
  }

  const daftarTampil = filterStatus === 'semua' ? daftar : daftar.filter((j) => j.status === filterStatus)

  return (
    <div>
      <div className="header-halaman">
        <h2 className="judul-halaman">Jadwal Konten</h2>
        <button type="button" className="btn btn-emas" onClick={bukaTambah}>+ Tambah Jadwal</button>
      </div>
      <p className="teks-muted" style={{ marginTop: -10, marginBottom: 18 }}>
        Rencana unggahan konten media sosial untuk promosi & marketing.
      </p>

      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="toolbar">
        <label htmlFor="filterStatus">Status</label>
        <select id="filterStatus" className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="semua">Semua</option>
          <option value="draft">Draft</option>
          <option value="terjadwal">Terjadwal</option>
          <option value="selesai">Selesai</option>
          <option value="dibatalkan">Dibatalkan</option>
        </select>
      </div>

      <div className="kartu">
        {memuat ? (
          <p className="teks-muted">Memuat...</p>
        ) : daftarTampil.length === 0 ? (
          <p className="teks-muted">Belum ada jadwal konten.</p>
        ) : (
          <table className="tabel">
            <thead>
              <tr><th>Tanggal</th><th>Platform</th><th>Judul/Ide Konten</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {daftarTampil.map((j) => (
                <tr key={j.id}>
                  <td>{formatTanggal(j.tanggal)}{j.waktu ? ` · ${j.waktu.slice(0, 5)}` : ''}</td>
                  <td>{LABEL_PLATFORM[j.platform]}</td>
                  <td>{j.judul}{j.keterangan && <div className="teks-muted" style={{ fontSize: '0.8rem' }}>{j.keterangan}</div>}</td>
                  <td><span className={`lencana ${KELAS_STATUS[j.status]}`}>{LABEL_STATUS[j.status]}</span></td>
                  <td className="kolom-aksi">
                    <button type="button" className="btn-tautan" onClick={() => bukaEdit(j)}>Ubah</button>
                    <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => setAkanDihapus(j)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalTerbuka && (
        <Modal title={form.id ? 'Ubah Jadwal Konten' : 'Tambah Jadwal Konten'} onClose={() => setModalTerbuka(false)}>
          <form onSubmit={simpan} noValidate>
            <div className="form-grid-2">
              <div>
                <label htmlFor="tanggalJadwal">Tanggal</label>
                <input id="tanggalJadwal" type="date" className={errors.tanggal ? 'input input-error' : 'input'}
                  value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
                {errors.tanggal && <div className="pesan-error">{errors.tanggal}</div>}
              </div>
              <div>
                <label htmlFor="waktuJadwal">Jam (opsional)</label>
                <input id="waktuJadwal" type="time" className="input" value={form.waktu} onChange={(e) => setForm({ ...form, waktu: e.target.value })} />
              </div>
            </div>

            <label htmlFor="platformJadwal">Platform</label>
            <select id="platformJadwal" className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              {Object.entries(LABEL_PLATFORM).map(([nilai, label]) => (
                <option key={nilai} value={nilai}>{label}</option>
              ))}
            </select>

            <label htmlFor="judulJadwal">Judul / ide konten</label>
            <input id="judulJadwal" className={errors.judul ? 'input input-error' : 'input'} value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })} placeholder="Contoh: Promo bir pletok susu jahe untuk musim hujan" />
            {errors.judul && <div className="pesan-error">{errors.judul}</div>}

            <label htmlFor="statusJadwal">Status</label>
            <select id="statusJadwal" className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(LABEL_STATUS).map(([nilai, label]) => (
                <option key={nilai} value={nilai}>{label}</option>
              ))}
            </select>

            <label htmlFor="keteranganJadwal">Keterangan (opsional)</label>
            <textarea id="keteranganJadwal" className="input" rows={2} value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="Naskah singkat, referensi foto/video, dsb." />

            <div className="form-aksi">
              <button type="button" className="btn btn-garis" onClick={() => setModalTerbuka(false)} disabled={menyimpan}>Batal</button>
              <button type="submit" className="btn btn-emas" disabled={menyimpan}>{menyimpan ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {akanDihapus && (
        <ConfirmDialog
          judul="Hapus jadwal ini?"
          pesan={`Jadwal konten "${akanDihapus.judul}" akan dihapus.`}
          onBatal={() => setAkanDihapus(null)}
          onKonfirmasi={hapus}
          sedangProses={menghapus}
        />
      )}
    </div>
  )
}
