import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Notifikasi from '../components/Notifikasi'
import { wajibDiisi, jalankanValidasi, adaError, pesanErrorRamah } from '../utils/validation'

const FORM_KOSONG = { id: null, nama: '', jenis: 'produk_jadi' }

export default function KategoriBarang() {
  const [daftar, setDaftar] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [modalTerbuka, setModalTerbuka] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [errors, setErrors] = useState({})
  const [menyimpan, setMenyimpan] = useState(false)
  const [akanDihapus, setAkanDihapus] = useState(null)
  const [menghapus, setMenghapus] = useState(false)
  const [notif, setNotif] = useState(null)

  const muatData = async () => {
    setMemuat(true)
    const { data } = await supabase.from('kategori_barang').select('id, nama, jenis').order('nama')
    setDaftar(data || [])
    setMemuat(false)
  }

  useEffect(() => { muatData() }, [])

  const bukaTambah = () => { setForm(FORM_KOSONG); setErrors({}); setModalTerbuka(true) }
  const bukaEdit = (k) => { setForm(k); setErrors({}); setModalTerbuka(true) }

  const simpan = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({ nama: wajibDiisi(form.nama, 'Nama kategori') })
    setErrors(validasi)
    if (adaError(validasi)) return

    setMenyimpan(true)
    const payload = { nama: form.nama.trim(), jenis: form.jenis }
    const { error } = form.id
      ? await supabase.from('kategori_barang').update(payload).eq('id', form.id)
      : await supabase.from('kategori_barang').insert(payload)
    setMenyimpan(false)

    if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    setModalTerbuka(false)
    setNotif({ tipe: 'sukses', pesan: 'Kategori disimpan.' })
    muatData()
  }

  const hapus = async () => {
    setMenghapus(true)
    const { error } = await supabase.from('kategori_barang').delete().eq('id', akanDihapus.id)
    setMenghapus(false)
    setAkanDihapus(null)
    if (error) {
      setNotif({
        tipe: 'error',
        pesan: error.message.includes('foreign key')
          ? 'Kategori ini tidak bisa dihapus karena masih dipakai oleh barang. Pindahkan barang tersebut ke kategori lain dulu.'
          : pesanErrorRamah(error),
      })
      return
    }
    setNotif({ tipe: 'sukses', pesan: 'Kategori dihapus.' })
    muatData()
  }

  return (
    <div>
      <div className="header-halaman">
        <h2 className="judul-halaman">Kategori Barang</h2>
        <button type="button" className="btn btn-emas" onClick={bukaTambah}>+ Tambah Kategori</button>
      </div>

      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="kartu">
        {memuat ? (
          <p className="teks-muted">Memuat...</p>
        ) : (
          <table className="tabel">
            <thead><tr><th>Nama</th><th>Jenis</th><th></th></tr></thead>
            <tbody>
              {daftar.map((k) => (
                <tr key={k.id}>
                  <td>{k.nama}</td>
                  <td>{k.jenis === 'produk_jadi' ? 'Produk Jadi' : 'Bahan Baku'}</td>
                  <td className="kolom-aksi">
                    <button type="button" className="btn-tautan" onClick={() => bukaEdit(k)}>Ubah</button>
                    <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => setAkanDihapus(k)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalTerbuka && (
        <Modal title={form.id ? 'Ubah Kategori' : 'Tambah Kategori'} onClose={() => setModalTerbuka(false)}>
          <form onSubmit={simpan} noValidate>
            <label htmlFor="nama">Nama kategori</label>
            <input
              id="nama"
              className={errors.nama ? 'input input-error' : 'input'}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Rempah Kering"
            />
            {errors.nama && <div className="pesan-error">{errors.nama}</div>}

            <label htmlFor="jenis">Jenis</label>
            <select id="jenis" className="input" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
              <option value="produk_jadi">Produk Jadi</option>
              <option value="bahan_baku">Bahan Baku</option>
            </select>

            <div className="form-aksi">
              <button type="button" className="btn btn-garis" onClick={() => setModalTerbuka(false)} disabled={menyimpan}>Batal</button>
              <button type="submit" className="btn btn-emas" disabled={menyimpan}>{menyimpan ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {akanDihapus && (
        <ConfirmDialog
          judul="Hapus kategori?"
          pesan={`Kategori "${akanDihapus.nama}" akan dihapus.`}
          onBatal={() => setAkanDihapus(null)}
          onKonfirmasi={hapus}
          sedangProses={menghapus}
        />
      )}
    </div>
  )
}
