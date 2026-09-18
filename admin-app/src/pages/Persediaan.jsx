import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import InputUang from '../components/InputUang'
import Notifikasi from '../components/Notifikasi'
import { formatRupiah, formatAngka, formatTanggal, todayISO } from '../utils/format'
import {
  wajibDiisi,
  harusAngkaPositif,
  angkaTidakNegatif,
  tanggalTidakBolehFuture,
  jalankanValidasi,
  adaError,
  pesanErrorRamah,
} from '../utils/validation'

const FORM_BARANG_KOSONG = {
  id: null, kode: '', nama: '', kategori_id: '', satuan: '',
  stok_awal: 0, stok_minimum: 0, harga_beli: '', harga_jual: '', aktif: true,
}
const FORM_MUTASI_KOSONG = { nama_barang: '', tipe: 'masuk', tanggal: todayISO(), jumlah: '', keterangan: '' }

// Bikin kode unik otomatis dari nama, untuk barang yang dibuat cepat
// lewat input freetext (tanpa lewat form "Tambah Barang" lengkap).
function buatKodeOtomatis(nama) {
  const slug = (nama || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 20)
  const acak = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${slug || 'BRG'}-${acak}`
}

export default function Persediaan() {
  const { isSuperAdmin, profile } = useAuth()
  const [barangList, setBarangList] = useState([])
  const [kategoriList, setKategoriList] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [notif, setNotif] = useState(null)

  const [modalBarang, setModalBarang] = useState(false)
  const [formBarang, setFormBarang] = useState(FORM_BARANG_KOSONG)
  const [errorsBarang, setErrorsBarang] = useState({})
  const [menyimpanBarang, setMenyimpanBarang] = useState(false)

  const [modalMutasi, setModalMutasi] = useState(false)
  const [formMutasi, setFormMutasi] = useState(FORM_MUTASI_KOSONG)
  const [errorsMutasi, setErrorsMutasi] = useState({})
  const [menyimpanMutasi, setMenyimpanMutasi] = useState(false)

  const [riwayatBarang, setRiwayatBarang] = useState(null)
  const [riwayatData, setRiwayatData] = useState([])

  const [akanDihapus, setAkanDihapus] = useState(null)
  const [menghapus, setMenghapus] = useState(false)

  const muatData = async () => {
    setMemuat(true)
    const [{ data: barang }, { data: kategori }] = await Promise.all([
      supabase.from('barang').select('*, kategori_barang(nama, jenis)').order('nama'),
      supabase.from('kategori_barang').select('id, nama, jenis').order('nama'),
    ])
    setBarangList(barang || [])
    setKategoriList(kategori || [])
    setMemuat(false)
  }

  useEffect(() => { muatData() }, [])

  // ---------- Modal Barang (super admin, form lengkap) ----------
  const bukaTambahBarang = () => { setFormBarang(FORM_BARANG_KOSONG); setErrorsBarang({}); setModalBarang(true) }
  const bukaEditBarang = (b) => {
    setFormBarang({
      id: b.id, kode: b.kode, nama: b.nama, kategori_id: b.kategori_id || '', satuan: b.satuan,
      stok_awal: 0, stok_minimum: b.stok_minimum, harga_beli: b.harga_beli ?? '', harga_jual: b.harga_jual ?? '', aktif: b.aktif,
    })
    setErrorsBarang({})
    setModalBarang(true)
  }

  const simpanBarang = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      kode: wajibDiisi(formBarang.kode, 'Kode barang'),
      nama: wajibDiisi(formBarang.nama, 'Nama barang'),
      satuan: wajibDiisi(formBarang.satuan, 'Satuan'),
      stok_minimum: angkaTidakNegatif(formBarang.stok_minimum, 'Stok minimum'),
      harga_beli: angkaTidakNegatif(formBarang.harga_beli, 'Harga beli'),
      harga_jual: angkaTidakNegatif(formBarang.harga_jual, 'Harga jual'),
    })
    setErrorsBarang(validasi)
    if (adaError(validasi)) return

    setMenyimpanBarang(true)
    const payload = {
      kode: formBarang.kode.trim(),
      nama: formBarang.nama.trim(),
      kategori_id: formBarang.kategori_id || null,
      satuan: formBarang.satuan.trim(),
      stok_minimum: formBarang.stok_minimum || 0,
      harga_beli: formBarang.harga_beli === '' ? null : formBarang.harga_beli,
      harga_jual: formBarang.harga_jual === '' ? null : formBarang.harga_jual,
      aktif: formBarang.aktif,
    }

    if (formBarang.id) {
      const { error } = await supabase.from('barang').update(payload).eq('id', formBarang.id)
      setMenyimpanBarang(false)
      if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    } else {
      const { data: baru, error } = await supabase.from('barang').insert(payload).select('id').single()
      if (error) { setMenyimpanBarang(false); setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }

      if (Number(formBarang.stok_awal) > 0) {
        const { error: errorMutasi } = await supabase.from('mutasi_stok').insert({
          barang_id: baru.id,
          tipe: 'masuk',
          tanggal: todayISO(),
          jumlah: formBarang.stok_awal,
          keterangan: 'Stok awal',
          dibuat_oleh: profile?.id,
        })
        if (errorMutasi) {
          setMenyimpanBarang(false)
          setNotif({ tipe: 'error', pesan: 'Barang tersimpan, tapi stok awal gagal dicatat: ' + pesanErrorRamah(errorMutasi) })
          setModalBarang(false)
          muatData()
          return
        }
      }
      setMenyimpanBarang(false)
    }

    setModalBarang(false)
    setNotif({ tipe: 'sukses', pesan: 'Barang disimpan.' })
    muatData()
  }

  const hapusBarang = async () => {
    setMenghapus(true)
    const { error } = await supabase.from('barang').delete().eq('id', akanDihapus.id)
    setMenghapus(false)
    setAkanDihapus(null)
    if (error) {
      setNotif({
        tipe: 'error',
        pesan: error.message.includes('foreign key')
          ? 'Barang ini tidak bisa dihapus karena sudah punya riwayat stok. Nonaktifkan saja lewat tombol "Ubah".'
          : pesanErrorRamah(error),
      })
      return
    }
    setNotif({ tipe: 'sukses', pesan: 'Barang dihapus.' })
    muatData()
  }

  // ---------- Modal Mutasi Stok (super admin & editor, nama barang freetext) ----------
  const bukaMutasi = (barang) => {
    setFormMutasi({ ...FORM_MUTASI_KOSONG, nama_barang: barang ? barang.nama : '' })
    setErrorsMutasi({})
    setModalMutasi(true)
  }

  const namaDiketik = formMutasi.nama_barang.trim().toLowerCase()
  const barangTerpilih = barangList.find((b) => b.nama.trim().toLowerCase() === namaDiketik)
  const barangBaruAkanDibuat = formMutasi.nama_barang.trim() !== '' && !barangTerpilih

  const simpanMutasi = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      nama_barang: wajibDiisi(formMutasi.nama_barang, 'Nama barang'),
      tanggal: tanggalTidakBolehFuture(formMutasi.tanggal, 'Tanggal'),
      jumlah: harusAngkaPositif(formMutasi.jumlah, 'Jumlah'),
    })

    if (!validasi.nama_barang && formMutasi.tipe === 'keluar' && barangBaruAkanDibuat) {
      validasi.nama_barang = 'Barang ini belum pernah tercatat, jadi belum ada stoknya. Untuk "Stok Keluar", pilih/ketik nama barang yang sudah ada.'
    }
    // Cek stok cukup di sisi aplikasi dulu, supaya pesan muncul cepat
    // (database tetap jadi penjaga akhir lewat trigger).
    if (!validasi.jumlah && formMutasi.tipe === 'keluar' && barangTerpilih) {
      if (Number(formMutasi.jumlah) > Number(barangTerpilih.stok_saat_ini)) {
        validasi.jumlah = `Stok tidak cukup. Stok tersedia: ${formatAngka(barangTerpilih.stok_saat_ini)} ${barangTerpilih.satuan}.`
      }
    }
    setErrorsMutasi(validasi)
    if (adaError(validasi)) return

    setMenyimpanMutasi(true)

    let barangId = barangTerpilih?.id

    // Barang belum pernah ada -- buat cepat dengan data minimal.
    // Kategori & harga bisa dilengkapi Super Admin belakangan lewat "Ubah".
    if (!barangId) {
      const { data: barangBaru, error: errorBarang } = await supabase
        .from('barang')
        .insert({
          kode: buatKodeOtomatis(formMutasi.nama_barang),
          nama: formMutasi.nama_barang.trim(),
          kategori_id: null,
          satuan: 'pcs',
          stok_minimum: 0,
          aktif: true,
        })
        .select('id')
        .single()

      if (errorBarang) {
        setMenyimpanMutasi(false)
        setErrorsMutasi({ nama_barang: pesanErrorRamah(errorBarang) })
        return
      }
      barangId = barangBaru.id
    }

    const { error } = await supabase.from('mutasi_stok').insert({
      barang_id: barangId,
      tipe: formMutasi.tipe,
      tanggal: formMutasi.tanggal,
      jumlah: formMutasi.jumlah,
      keterangan: formMutasi.keterangan || null,
      dibuat_oleh: profile?.id,
    })
    setMenyimpanMutasi(false)

    if (error) {
      setErrorsMutasi({ jumlah: pesanErrorRamah(error) })
      return
    }
    setModalMutasi(false)
    setNotif({ tipe: 'sukses', pesan: 'Mutasi stok dicatat.' })
    muatData()
  }

  // ---------- Riwayat mutasi per barang ----------
  const bukaRiwayat = async (b) => {
    setRiwayatBarang(b)
    const { data } = await supabase
      .from('mutasi_stok')
      .select('id, tanggal, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan')
      .eq('barang_id', b.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setRiwayatData(data || [])
  }

  return (
    <div>
      <div className="header-halaman">
        <h2 className="judul-halaman">Barang & Stok</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-garis" onClick={() => bukaMutasi(null)}>+ Stok Masuk/Keluar</button>
          {isSuperAdmin && <button type="button" className="btn btn-emas" onClick={bukaTambahBarang}>+ Tambah Barang</button>}
        </div>
      </div>

      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="kartu">
        {memuat ? (
          <p className="teks-muted">Memuat...</p>
        ) : barangList.length === 0 ? (
          <p className="teks-muted">Belum ada barang. Ketik nama barang di "+ Stok Masuk/Keluar" untuk mulai mencatat.</p>
        ) : (
          <table className="tabel">
            <thead>
              <tr>
                <th>Kode</th><th>Nama</th><th>Kategori</th><th>Stok</th><th>Harga Jual</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {barangList.map((b) => {
                const menipis = Number(b.stok_saat_ini) <= Number(b.stok_minimum)
                return (
                  <tr key={b.id}>
                    <td>{b.kode}</td>
                    <td>{b.nama}</td>
                    <td>{b.kategori_barang?.nama || <span className="teks-muted">-</span>}</td>
                    <td className={menipis ? 'stat-merah' : ''}>
                      {formatAngka(b.stok_saat_ini)} {b.satuan}
                      {menipis && <span className="lencana lencana-kuning" style={{ marginLeft: 8 }}>Menipis</span>}
                    </td>
                    <td>{b.harga_jual ? formatRupiah(b.harga_jual) : '-'}</td>
                    <td>{b.aktif ? <span className="lencana lencana-hijau">Aktif</span> : <span className="lencana">Nonaktif</span>}</td>
                    <td className="kolom-aksi">
                      <button type="button" className="btn-tautan" onClick={() => bukaMutasi(b)}>Stok +/-</button>
                      <button type="button" className="btn-tautan" onClick={() => bukaRiwayat(b)}>Riwayat</button>
                      {isSuperAdmin && <button type="button" className="btn-tautan" onClick={() => bukaEditBarang(b)}>Ubah</button>}
                      {isSuperAdmin && <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => setAkanDihapus(b)}>Hapus</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tambah/ubah barang (form lengkap, khusus Super Admin) */}
      {modalBarang && (
        <Modal title={formBarang.id ? 'Ubah Barang' : 'Tambah Barang'} onClose={() => setModalBarang(false)} lebar={560}>
          <form onSubmit={simpanBarang} noValidate>
            <div className="form-grid-2">
              <div>
                <label htmlFor="kode">Kode barang</label>
                <input id="kode" className={errorsBarang.kode ? 'input input-error' : 'input'} value={formBarang.kode}
                  onChange={(e) => setFormBarang({ ...formBarang, kode: e.target.value })} placeholder="Contoh: BP-001" />
                {errorsBarang.kode && <div className="pesan-error">{errorsBarang.kode}</div>}
              </div>
              <div>
                <label htmlFor="satuan">Satuan</label>
                <input id="satuan" className={errorsBarang.satuan ? 'input input-error' : 'input'} value={formBarang.satuan}
                  onChange={(e) => setFormBarang({ ...formBarang, satuan: e.target.value })} placeholder="botol, kg, liter" />
                {errorsBarang.satuan && <div className="pesan-error">{errorsBarang.satuan}</div>}
              </div>
            </div>

            <label htmlFor="namaBarang">Nama barang</label>
            <input id="namaBarang" className={errorsBarang.nama ? 'input input-error' : 'input'} value={formBarang.nama}
              onChange={(e) => setFormBarang({ ...formBarang, nama: e.target.value })} placeholder="Bir Pletok Original 350ml" />
            {errorsBarang.nama && <div className="pesan-error">{errorsBarang.nama}</div>}

            <label htmlFor="kategoriBarang">Kategori (opsional)</label>
            <select id="kategoriBarang" className="input"
              value={formBarang.kategori_id} onChange={(e) => setFormBarang({ ...formBarang, kategori_id: e.target.value })}>
              <option value="">Tanpa kategori</option>
              {kategoriList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama} ({k.jenis === 'produk_jadi' ? 'Produk Jadi' : 'Bahan Baku'})</option>
              ))}
            </select>

            <div className="form-grid-2">
              {!formBarang.id && (
                <div>
                  <label htmlFor="stokAwal">Stok awal</label>
                  <InputUang id="stokAwal" value={formBarang.stok_awal} onChange={(v) => setFormBarang({ ...formBarang, stok_awal: v })} placeholder="0" />
                </div>
              )}
              <div>
                <label htmlFor="stokMinimum">Stok minimum (batas aman)</label>
                <InputUang id="stokMinimum" value={formBarang.stok_minimum} onChange={(v) => setFormBarang({ ...formBarang, stok_minimum: v })} placeholder="0" error={errorsBarang.stok_minimum} />
                {errorsBarang.stok_minimum && <div className="pesan-error">{errorsBarang.stok_minimum}</div>}
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="hargaBeli">Harga beli (opsional)</label>
                <InputUang id="hargaBeli" value={formBarang.harga_beli} onChange={(v) => setFormBarang({ ...formBarang, harga_beli: v })} placeholder="0" error={errorsBarang.harga_beli} />
                {errorsBarang.harga_beli && <div className="pesan-error">{errorsBarang.harga_beli}</div>}
              </div>
              <div>
                <label htmlFor="hargaJual">Harga jual (opsional)</label>
                <InputUang id="hargaJual" value={formBarang.harga_jual} onChange={(v) => setFormBarang({ ...formBarang, harga_jual: v })} placeholder="0" error={errorsBarang.harga_jual} />
                {errorsBarang.harga_jual && <div className="pesan-error">{errorsBarang.harga_jual}</div>}
              </div>
            </div>

            {formBarang.id && (
              <label className="cek-label">
                <input type="checkbox" checked={formBarang.aktif} onChange={(e) => setFormBarang({ ...formBarang, aktif: e.target.checked })} />
                Barang aktif (tampil untuk transaksi stok)
              </label>
            )}
            {!formBarang.id && (
              <p className="teks-muted" style={{ fontSize: '0.85rem' }}>
                Stok setelah ini hanya bisa diubah lewat menu "Stok Masuk/Keluar", bukan diedit langsung, supaya riwayatnya tetap tercatat.
              </p>
            )}

            <div className="form-aksi">
              <button type="button" className="btn btn-garis" onClick={() => setModalBarang(false)} disabled={menyimpanBarang}>Batal</button>
              <button type="submit" className="btn btn-emas" disabled={menyimpanBarang}>{menyimpanBarang ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal mutasi stok -- nama barang freetext, siapa saja (Editor & Super Admin) bisa pakai */}
      {modalMutasi && (
        <Modal title="Catat Stok Masuk/Keluar" onClose={() => setModalMutasi(false)}>
          <form onSubmit={simpanMutasi} noValidate>
            <label htmlFor="namaBarangMutasi">Nama barang</label>
            <input
              id="namaBarangMutasi"
              list="daftar-nama-barang"
              className={errorsMutasi.nama_barang ? 'input input-error' : 'input'}
              value={formMutasi.nama_barang}
              onChange={(e) => setFormMutasi({ ...formMutasi, nama_barang: e.target.value })}
              placeholder="Ketik nama barang..."
              autoComplete="off"
            />
            <datalist id="daftar-nama-barang">
              {barangList.filter((b) => b.aktif).map((b) => (
                <option key={b.id} value={b.nama} />
              ))}
            </datalist>
            {errorsMutasi.nama_barang && <div className="pesan-error">{errorsMutasi.nama_barang}</div>}
            {barangBaruAkanDibuat && formMutasi.tipe === 'masuk' && (
              <p className="teks-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Barang baru — akan otomatis ditambahkan ke daftar barang saat disimpan.
              </p>
            )}

            <label>Jenis mutasi</label>
            <div className="pilihan-radio">
              <label>
                <input type="radio" name="tipeMutasi" checked={formMutasi.tipe === 'masuk'} onChange={() => setFormMutasi({ ...formMutasi, tipe: 'masuk' })} />
                Stok Masuk
              </label>
              <label>
                <input type="radio" name="tipeMutasi" checked={formMutasi.tipe === 'keluar'} onChange={() => setFormMutasi({ ...formMutasi, tipe: 'keluar' })} />
                Stok Keluar
              </label>
            </div>

            <label htmlFor="tanggalMutasi">Tanggal</label>
            <input id="tanggalMutasi" type="date" className={errorsMutasi.tanggal ? 'input input-error' : 'input'}
              max={todayISO()} value={formMutasi.tanggal} onChange={(e) => setFormMutasi({ ...formMutasi, tanggal: e.target.value })} />
            {errorsMutasi.tanggal && <div className="pesan-error">{errorsMutasi.tanggal}</div>}

            <label htmlFor="jumlahMutasi">Jumlah {barangTerpilih ? `(${barangTerpilih.satuan})` : ''}</label>
            <InputUang id="jumlahMutasi" value={formMutasi.jumlah} onChange={(v) => setFormMutasi({ ...formMutasi, jumlah: v })} placeholder="0" error={errorsMutasi.jumlah} />
            {errorsMutasi.jumlah && <div className="pesan-error">{errorsMutasi.jumlah}</div>}
            {barangTerpilih && (
              <p className="teks-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Stok saat ini: {formatAngka(barangTerpilih.stok_saat_ini)} {barangTerpilih.satuan}
              </p>
            )}

            <label htmlFor="keteranganMutasi">Keterangan (opsional)</label>
            <textarea id="keteranganMutasi" className="input" rows={2} value={formMutasi.keterangan}
              onChange={(e) => setFormMutasi({ ...formMutasi, keterangan: e.target.value })} placeholder="Contoh: pembelian dari pemasok / penjualan harian" />

            <div className="form-aksi">
              <button type="button" className="btn btn-garis" onClick={() => setModalMutasi(false)} disabled={menyimpanMutasi}>Batal</button>
              <button type="submit" className="btn btn-emas" disabled={menyimpanMutasi}>{menyimpanMutasi ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal riwayat */}
      {riwayatBarang && (
        <Modal title={`Riwayat Stok — ${riwayatBarang.nama}`} onClose={() => setRiwayatBarang(null)} lebar={560}>
          {riwayatData.length === 0 ? (
            <p className="teks-muted">Belum ada riwayat mutasi untuk barang ini.</p>
          ) : (
            <table className="tabel">
              <thead><tr><th>Tanggal</th><th>Tipe</th><th>Jumlah</th><th>Stok Sesudah</th><th>Keterangan</th></tr></thead>
              <tbody>
                {riwayatData.map((r) => (
                  <tr key={r.id}>
                    <td>{formatTanggal(r.tanggal)}</td>
                    <td className={r.tipe === 'masuk' ? 'stat-hijau' : 'stat-merah'}>{r.tipe === 'masuk' ? 'Masuk' : 'Keluar'}</td>
                    <td>{formatAngka(r.jumlah)}</td>
                    <td>{formatAngka(r.stok_sesudah)}</td>
                    <td>{r.keterangan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {akanDihapus && (
        <ConfirmDialog
          judul="Hapus barang?"
          pesan={`Barang "${akanDihapus.nama}" akan dihapus permanen.`}
          onBatal={() => setAkanDihapus(null)}
          onKonfirmasi={hapusBarang}
          sedangProses={menghapus}
        />
      )}
    </div>
  )
}
