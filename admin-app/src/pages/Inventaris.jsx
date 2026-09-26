import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import InputUang from '../components/InputUang'
import Notifikasi from '../components/Notifikasi'
import { formatAngka, formatTanggal, todayISO } from '../utils/format'
import { wajibDiisi, angkaTidakNegatif, tanggalTidakBolehFuture, jalankanValidasi, adaError, pesanErrorRamah } from '../utils/validation'

const FORM_KOSONG = {
  id: null, nama: '', kategori: '', jumlah: 1, satuan: 'unit', kondisi: 'baik',
  tanggal_pembelian: '', lokasi: '', catatan: '',
}

const LABEL_KONDISI = { baik: 'Baik', perlu_perbaikan: 'Perlu Perbaikan', rusak: 'Rusak' }
const KELAS_KONDISI = { baik: 'lencana-hijau', perlu_perbaikan: 'lencana-kuning', rusak: 'lencana-merah' }

export default function Inventaris() {
  const { isSuperAdmin, profile } = useAuth()
  const [daftar, setDaftar] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [notif, setNotif] = useState(null)

  const [modalTerbuka, setModalTerbuka] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [errors, setErrors] = useState({})
  const [menyimpan, setMenyimpan] = useState(false)

  const [akanDihapus, setAkanDihapus] = useState(null)
  const [menghapus, setMenghapus] = useState(false)

  const muatData = async () => {
    setMemuat(true)
    const { data } = await supabase.from('inventaris_aset').select('*').order('nama')
    setDaftar(data || [])
    setMemuat(false)
  }

  useEffect(() => { muatData() }, [])

  const bukaTambah = () => { setForm(FORM_KOSONG); setErrors({}); setModalTerbuka(true) }
  const bukaEdit = (a) => {
    setForm({
      id: a.id, nama: a.nama, kategori: a.kategori || '', jumlah: a.jumlah,
      satuan: a.satuan, kondisi: a.kondisi, tanggal_pembelian: a.tanggal_pembelian || '',
      lokasi: a.lokasi || '', catatan: a.catatan || '',
    })
    setErrors({})
    setModalTerbuka(true)
  }

  const simpan = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      nama: wajibDiisi(form.nama, 'Nama barang/aset'),
      satuan: wajibDiisi(form.satuan, 'Satuan'),
      jumlah: form.jumlah === '' || form.jumlah === null || form.jumlah === undefined
        ? 'Jumlah wajib diisi.'
        : angkaTidakNegatif(form.jumlah, 'Jumlah'),
      // Opsional -- hanya diperiksa kalau memang diisi.
      tanggal_pembelian: form.tanggal_pembelian
        ? tanggalTidakBolehFuture(form.tanggal_pembelian, 'Tanggal pembelian')
        : '',
    })
    setErrors(validasi)
    if (adaError(validasi)) return

    setMenyimpan(true)
    const payload = {
      nama: form.nama.trim(),
      kategori: form.kategori.trim() || null,
      jumlah: form.jumlah || 0,
      satuan: form.satuan.trim(),
      kondisi: form.kondisi,
      tanggal_pembelian: form.tanggal_pembelian || null,
      lokasi: form.lokasi.trim() || null,
      catatan: form.catatan.trim() || null,
    }

    const { error } = form.id
      ? await supabase.from('inventaris_aset').update(payload).eq('id', form.id)
      : await supabase.from('inventaris_aset').insert({ ...payload, dibuat_oleh: profile?.id })
    setMenyimpan(false)

    if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    setModalTerbuka(false)
    setNotif({ tipe: 'sukses', pesan: 'Data inventaris disimpan.' })
    muatData()
  }

  const hapus = async () => {
    setMenghapus(true)
    const { error } = await supabase.from('inventaris_aset').delete().eq('id', akanDihapus.id)
    setMenghapus(false)
    setAkanDihapus(null)
    if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    setNotif({ tipe: 'sukses', pesan: 'Data inventaris dihapus.' })
    muatData()
  }

  return (
    <div>
      <div className="header-halaman">
        <h2 className="judul-halaman">Inventaris</h2>
        <button type="button" className="btn btn-emas" onClick={bukaTambah}>+ Tambah Aset</button>
      </div>
      <p className="teks-muted" style={{ marginTop: -10, marginBottom: 18 }}>
        Untuk barang/aset di luar persediaan jual-beli — peralatan, furnitur, dan lainnya.
        Berbeda dari "Barang & Stok", di sini tidak ada pencatatan stok masuk/keluar.
      </p>

      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="kartu">
        {memuat ? (
          <p className="teks-muted">Memuat...</p>
        ) : daftar.length === 0 ? (
          <p className="teks-muted">Belum ada data inventaris.</p>
        ) : (
          <table className="tabel">
            <thead>
              <tr><th>Nama</th><th>Kategori</th><th>Jumlah</th><th>Kondisi</th><th>Tgl Pembelian</th><th>Lokasi</th><th></th></tr>
            </thead>
            <tbody>
              {daftar.map((a) => (
                <tr key={a.id}>
                  <td>{a.nama}{a.catatan && <div className="teks-muted" style={{ fontSize: '0.8rem' }}>{a.catatan}</div>}</td>
                  <td>{a.kategori || '-'}</td>
                  <td>{formatAngka(a.jumlah)} {a.satuan}</td>
                  <td><span className={`lencana ${KELAS_KONDISI[a.kondisi]}`}>{LABEL_KONDISI[a.kondisi]}</span></td>
                  <td>{a.tanggal_pembelian ? formatTanggal(a.tanggal_pembelian) : '-'}</td>
                  <td>{a.lokasi || '-'}</td>
                  <td className="kolom-aksi">
                    <button type="button" className="btn-tautan" onClick={() => bukaEdit(a)}>Ubah</button>
                    {isSuperAdmin && <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => setAkanDihapus(a)}>Hapus</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalTerbuka && (
        <Modal title={form.id ? 'Ubah Aset' : 'Tambah Aset'} onClose={() => setModalTerbuka(false)}>
          <form onSubmit={simpan} noValidate>
            <label htmlFor="namaAset">Nama barang/aset</label>
            <input id="namaAset" className={errors.nama ? 'input input-error' : 'input'} value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Kompor gas 2 tungku" />
            {errors.nama && <div className="pesan-error">{errors.nama}</div>}

            <label htmlFor="kategoriAset">Kategori (opsional)</label>
            <input id="kategoriAset" className="input" value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="Contoh: Peralatan Dapur, Furnitur" />

            <div className="form-grid-2">
              <div>
                <label htmlFor="jumlahAset">Jumlah</label>
                <InputUang id="jumlahAset" value={form.jumlah} onChange={(v) => setForm({ ...form, jumlah: v })} placeholder="1" error={errors.jumlah} />
                {errors.jumlah && <div className="pesan-error">{errors.jumlah}</div>}
              </div>
              <div>
                <label htmlFor="satuanAset">Satuan</label>
                <input id="satuanAset" className={errors.satuan ? 'input input-error' : 'input'} value={form.satuan}
                  onChange={(e) => setForm({ ...form, satuan: e.target.value })} placeholder="unit, buah, set" />
                {errors.satuan && <div className="pesan-error">{errors.satuan}</div>}
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="kondisiAset">Kondisi</label>
                <select id="kondisiAset" className="input" value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value })}>
                  <option value="baik">Baik</option>
                  <option value="perlu_perbaikan">Perlu Perbaikan</option>
                  <option value="rusak">Rusak</option>
                </select>
              </div>
              <div>
                <label htmlFor="tanggalPembelian">Tanggal pembelian (opsional)</label>
                <input id="tanggalPembelian" type="date"
                  className={errors.tanggal_pembelian ? 'input input-error' : 'input'}
                  max={todayISO()} value={form.tanggal_pembelian}
                  onChange={(e) => setForm({ ...form, tanggal_pembelian: e.target.value })} />
                {errors.tanggal_pembelian && <div className="pesan-error">{errors.tanggal_pembelian}</div>}
              </div>
            </div>

            <label htmlFor="lokasiAset">Lokasi (opsional)</label>
            <input id="lokasiAset" className="input" value={form.lokasi}
              onChange={(e) => setForm({ ...form, lokasi: e.target.value })} placeholder="Contoh: Dapur, Gudang" />

            <label htmlFor="catatanAset">Catatan (opsional)</label>
            <textarea id="catatanAset" className="input" rows={2} value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })} />

            <div className="form-aksi">
              <button type="button" className="btn btn-garis" onClick={() => setModalTerbuka(false)} disabled={menyimpan}>Batal</button>
              <button type="submit" className="btn btn-emas" disabled={menyimpan}>{menyimpan ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {akanDihapus && (
        <ConfirmDialog
          judul="Hapus data ini?"
          pesan={`"${akanDihapus.nama}" akan dihapus dari inventaris.`}
          onBatal={() => setAkanDihapus(null)}
          onKonfirmasi={hapus}
          sedangProses={menghapus}
        />
      )}
    </div>
  )
}
