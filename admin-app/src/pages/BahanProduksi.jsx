import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import InputUang from '../components/InputUang'
import Notifikasi from '../components/Notifikasi'
import { formatAngka, formatRupiah, formatTanggal, todayISO } from '../utils/format'
import { wajibDiisi, angkaTidakNegatif, jalankanValidasi, adaError, pesanErrorRamah } from '../utils/validation'

const FORM_KOSONG = {
  id: null, nama: '', kategori: '', jumlah: 0, satuan: 'kg',
  harga_satuan: '', tanggal_pembelian: '', catatan: '',
}

export default function BahanProduksi() {
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
    const { data } = await supabase.from('bahan_produksi').select('*').order('nama')
    setDaftar(data || [])
    setMemuat(false)
  }

  useEffect(() => { muatData() }, [])

  const bukaTambah = () => { setForm(FORM_KOSONG); setErrors({}); setModalTerbuka(true) }
  const bukaEdit = (b) => {
    setForm({
      id: b.id, nama: b.nama, kategori: b.kategori || '', jumlah: b.jumlah,
      satuan: b.satuan, harga_satuan: b.harga_satuan ?? '', tanggal_pembelian: b.tanggal_pembelian || '',
      catatan: b.catatan || '',
    })
    setErrors({})
    setModalTerbuka(true)
  }

  const simpan = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      nama: wajibDiisi(form.nama, 'Nama bahan'),
      satuan: wajibDiisi(form.satuan, 'Satuan'),
      jumlah: form.jumlah === '' || form.jumlah === null || form.jumlah === undefined
        ? 'Jumlah wajib diisi.'
        : angkaTidakNegatif(form.jumlah, 'Jumlah'),
      harga_satuan: angkaTidakNegatif(form.harga_satuan, 'Harga per satuan'),
    })
    setErrors(validasi)
    if (adaError(validasi)) return

    setMenyimpan(true)
    const payload = {
      nama: form.nama.trim(),
      kategori: form.kategori.trim() || null,
      jumlah: form.jumlah || 0,
      satuan: form.satuan.trim(),
      harga_satuan: form.harga_satuan === '' ? null : form.harga_satuan,
      tanggal_pembelian: form.tanggal_pembelian || null,
      catatan: form.catatan.trim() || null,
    }

    const { error } = form.id
      ? await supabase.from('bahan_produksi').update(payload).eq('id', form.id)
      : await supabase.from('bahan_produksi').insert({ ...payload, dibuat_oleh: profile?.id })
    setMenyimpan(false)

    if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    setModalTerbuka(false)
    setNotif({ tipe: 'sukses', pesan: 'Data bahan produksi disimpan.' })
    muatData()
  }

  const hapus = async () => {
    setMenghapus(true)
    const { error } = await supabase.from('bahan_produksi').delete().eq('id', akanDihapus.id)
    setMenghapus(false)
    setAkanDihapus(null)
    if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    setNotif({ tipe: 'sukses', pesan: 'Data bahan produksi dihapus.' })
    muatData()
  }

  return (
    <div>
      <div className="header-halaman">
        <h2 className="judul-halaman">Bahan Produksi</h2>
        <button type="button" className="btn btn-emas" onClick={bukaTambah}>+ Tambah Bahan</button>
      </div>
      <p className="teks-muted" style={{ marginTop: -10, marginBottom: 18 }}>
        Catatan bahan baku untuk pembuatan produk (rempah, kemasan, dll). Jumlahnya bisa diedit
        langsung di sini — tidak terhubung dengan pencatatan "Barang & Stok".
      </p>

      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="kartu">
        {memuat ? (
          <p className="teks-muted">Memuat...</p>
        ) : daftar.length === 0 ? (
          <p className="teks-muted">Belum ada data bahan produksi.</p>
        ) : (
          <table className="tabel">
            <thead>
              <tr><th>Nama</th><th>Kategori</th><th>Jumlah</th><th>Harga/Satuan</th><th>Tgl. Pembelian</th><th></th></tr>
            </thead>
            <tbody>
              {daftar.map((b) => (
                <tr key={b.id}>
                  <td>{b.nama}{b.catatan && <div className="teks-muted" style={{ fontSize: '0.8rem' }}>{b.catatan}</div>}</td>
                  <td>{b.kategori || '-'}</td>
                  <td>{formatAngka(b.jumlah)} {b.satuan}</td>
                  <td>{b.harga_satuan ? formatRupiah(b.harga_satuan) : '-'}</td>
                  <td>{b.tanggal_pembelian ? formatTanggal(b.tanggal_pembelian) : '-'}</td>
                  <td className="kolom-aksi">
                    <button type="button" className="btn-tautan" onClick={() => bukaEdit(b)}>Ubah</button>
                    {isSuperAdmin && <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => setAkanDihapus(b)}>Hapus</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalTerbuka && (
        <Modal title={form.id ? 'Ubah Bahan Produksi' : 'Tambah Bahan Produksi'} onClose={() => setModalTerbuka(false)}>
          <form onSubmit={simpan} noValidate>
            <label htmlFor="namaBahan">Nama bahan</label>
            <input id="namaBahan" className={errors.nama ? 'input input-error' : 'input'} value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Kayu secang" />
            {errors.nama && <div className="pesan-error">{errors.nama}</div>}

            <label htmlFor="kategoriBahan">Kategori (opsional)</label>
            <input id="kategoriBahan" className="input" value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="Contoh: Rempah, Kemasan, Pemanis" />

            <div className="form-grid-2">
              <div>
                <label htmlFor="jumlahBahan">Jumlah</label>
                <InputUang id="jumlahBahan" value={form.jumlah} onChange={(v) => setForm({ ...form, jumlah: v })} placeholder="0" error={errors.jumlah} />
                {errors.jumlah && <div className="pesan-error">{errors.jumlah}</div>}
              </div>
              <div>
                <label htmlFor="satuanBahan">Satuan</label>
                <input id="satuanBahan" className={errors.satuan ? 'input input-error' : 'input'} value={form.satuan}
                  onChange={(e) => setForm({ ...form, satuan: e.target.value })} placeholder="kg, liter, gram, pcs" />
                {errors.satuan && <div className="pesan-error">{errors.satuan}</div>}
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="hargaSatuanBahan">Harga per satuan (opsional)</label>
                <InputUang id="hargaSatuanBahan" value={form.harga_satuan} onChange={(v) => setForm({ ...form, harga_satuan: v })} placeholder="0" error={errors.harga_satuan} />
                {errors.harga_satuan && <div className="pesan-error">{errors.harga_satuan}</div>}
              </div>
              <div>
                <label htmlFor="tanggalPembelianBahan">Tanggal pembelian (opsional)</label>
                <input id="tanggalPembelianBahan" type="date" className="input" max={todayISO()}
                  value={form.tanggal_pembelian} onChange={(e) => setForm({ ...form, tanggal_pembelian: e.target.value })} />
              </div>
            </div>

            <label htmlFor="catatanBahan">Catatan (opsional)</label>
            <textarea id="catatanBahan" className="input" rows={2} value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Contoh: dipakai untuk resep Bir Pletok Secang Pekat" />

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
          pesan={`"${akanDihapus.nama}" akan dihapus dari catatan bahan produksi.`}
          onBatal={() => setAkanDihapus(null)}
          onKonfirmasi={hapus}
          sedangProses={menghapus}
        />
      )}
    </div>
  )
}
