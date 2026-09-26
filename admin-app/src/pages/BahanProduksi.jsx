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

// Halaman ini memakai tabel yang sama dengan "Barang & Stok"
// (barang + mutasi_stok), tapi hanya menampilkan barang yang kategorinya
// berjenis "bahan_baku". Jadi aturan stok yang sudah ada tetap berlaku
// apa adanya: stok cuma berubah lewat pencatatan masuk/keluar, dan
// database menolak pemakaian melebihi stok tersedia.

const FORM_BAHAN_KOSONG = {
  id: null, kode: '', nama: '', kategori_id: '', satuan: '',
  stok_awal: 0, stok_minimum: 0, harga_beli: '', aktif: true,
}
const FORM_MUTASI_KOSONG = { nama_bahan: '', tipe: 'masuk', tanggal: todayISO(), jumlah: '', keterangan: '' }

function buatKodeOtomatis(nama) {
  const slug = (nama || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 20)
  const acak = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `BHN-${slug || 'BAHAN'}-${acak}`
}

export default function BahanProduksi() {
  const { isSuperAdmin, profile } = useAuth()
  const [semuaBarang, setSemuaBarang] = useState([])
  const [kategoriBahan, setKategoriBahan] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [notif, setNotif] = useState(null)

  const [modalBahan, setModalBahan] = useState(false)
  const [formBahan, setFormBahan] = useState(FORM_BAHAN_KOSONG)
  const [errorsBahan, setErrorsBahan] = useState({})
  const [menyimpanBahan, setMenyimpanBahan] = useState(false)

  const [modalMutasi, setModalMutasi] = useState(false)
  const [formMutasi, setFormMutasi] = useState(FORM_MUTASI_KOSONG)
  const [errorsMutasi, setErrorsMutasi] = useState({})
  const [menyimpanMutasi, setMenyimpanMutasi] = useState(false)

  const [riwayatBahan, setRiwayatBahan] = useState(null)
  const [riwayatData, setRiwayatData] = useState([])

  const [akanDihapus, setAkanDihapus] = useState(null)
  const [menghapus, setMenghapus] = useState(false)

  const muatData = async () => {
    setMemuat(true)
    const [{ data: barang }, { data: kategori }] = await Promise.all([
      supabase.from('barang').select('*, kategori_barang(nama, jenis)').order('nama'),
      supabase.from('kategori_barang').select('id, nama, jenis').eq('jenis', 'bahan_baku').order('nama'),
    ])
    setSemuaBarang(barang || [])
    setKategoriBahan(kategori || [])
    setMemuat(false)
  }

  useEffect(() => { muatData() }, [])

  const bahanList = semuaBarang.filter((b) => b.kategori_barang?.jenis === 'bahan_baku')
  const kategoriDefault = kategoriBahan[0]?.id || null

  // ---------- Modal Bahan (form lengkap, khusus Super Admin) ----------
  const bukaTambahBahan = () => {
    setFormBahan({ ...FORM_BAHAN_KOSONG, kategori_id: kategoriDefault || '' })
    setErrorsBahan({})
    setModalBahan(true)
  }
  const bukaEditBahan = (b) => {
    setFormBahan({
      id: b.id, kode: b.kode, nama: b.nama, kategori_id: b.kategori_id || '', satuan: b.satuan,
      stok_awal: 0, stok_minimum: b.stok_minimum, harga_beli: b.harga_beli ?? '', aktif: b.aktif,
    })
    setErrorsBahan({})
    setModalBahan(true)
  }

  const simpanBahan = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      kode: wajibDiisi(formBahan.kode, 'Kode bahan'),
      nama: wajibDiisi(formBahan.nama, 'Nama bahan'),
      kategori_id: wajibDiisi(formBahan.kategori_id, 'Kategori bahan'),
      satuan: wajibDiisi(formBahan.satuan, 'Satuan'),
      stok_minimum: angkaTidakNegatif(formBahan.stok_minimum, 'Stok minimum'),
      harga_beli: angkaTidakNegatif(formBahan.harga_beli, 'Harga beli'),
    })
    setErrorsBahan(validasi)
    if (adaError(validasi)) return

    setMenyimpanBahan(true)
    const payload = {
      kode: formBahan.kode.trim(),
      nama: formBahan.nama.trim(),
      kategori_id: formBahan.kategori_id,
      satuan: formBahan.satuan.trim(),
      stok_minimum: formBahan.stok_minimum || 0,
      harga_beli: formBahan.harga_beli === '' ? null : formBahan.harga_beli,
      aktif: formBahan.aktif,
    }

    if (formBahan.id) {
      const { error } = await supabase.from('barang').update(payload).eq('id', formBahan.id)
      setMenyimpanBahan(false)
      if (error) { setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }
    } else {
      const { data: baru, error } = await supabase.from('barang').insert(payload).select('id').single()
      if (error) { setMenyimpanBahan(false); setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) }); return }

      if (Number(formBahan.stok_awal) > 0) {
        const { error: errorMutasi } = await supabase.from('mutasi_stok').insert({
          barang_id: baru.id,
          tipe: 'masuk',
          tanggal: todayISO(),
          jumlah: formBahan.stok_awal,
          keterangan: 'Stok awal',
          dibuat_oleh: profile?.id,
        })
        if (errorMutasi) {
          setMenyimpanBahan(false)
          setNotif({ tipe: 'error', pesan: 'Bahan tersimpan, tapi stok awal gagal dicatat: ' + pesanErrorRamah(errorMutasi) })
          setModalBahan(false)
          muatData()
          return
        }
      }
      setMenyimpanBahan(false)
    }

    setModalBahan(false)
    setNotif({ tipe: 'sukses', pesan: 'Bahan produksi disimpan.' })
    muatData()
  }

  const hapusBahan = async () => {
    setMenghapus(true)
    const { error } = await supabase.from('barang').delete().eq('id', akanDihapus.id)
    setMenghapus(false)
    setAkanDihapus(null)
    if (error) {
      setNotif({
        tipe: 'error',
        pesan: error.message.includes('foreign key')
          ? 'Bahan ini tidak bisa dihapus karena sudah punya riwayat stok. Nonaktifkan saja lewat tombol "Ubah".'
          : pesanErrorRamah(error),
      })
      return
    }
    setNotif({ tipe: 'sukses', pesan: 'Bahan produksi dihapus.' })
    muatData()
  }

  // ---------- Modal Mutasi (Super Admin & Editor, nama bahan freetext) ----------
  const bukaMutasi = (bahan) => {
    setFormMutasi({ ...FORM_MUTASI_KOSONG, nama_bahan: bahan ? bahan.nama : '' })
    setErrorsMutasi({})
    setModalMutasi(true)
  }

  const namaDiketik = formMutasi.nama_bahan.trim().toLowerCase()
  // Dicocokkan ke SEMUA barang, bukan cuma bahan baku -- supaya nama yang
  // sudah dipakai produk jadi tidak terduplikasi jadi barang baru di sini.
  const barangTerpilih = semuaBarang.find((b) => b.nama.trim().toLowerCase() === namaDiketik)
  const bukanBahanBaku = barangTerpilih && barangTerpilih.kategori_barang?.jenis !== 'bahan_baku'
  const bahanBaruAkanDibuat = formMutasi.nama_bahan.trim() !== '' && !barangTerpilih

  const simpanMutasi = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      nama_bahan: wajibDiisi(formMutasi.nama_bahan, 'Nama bahan'),
      tanggal: tanggalTidakBolehFuture(formMutasi.tanggal, 'Tanggal'),
      jumlah: harusAngkaPositif(formMutasi.jumlah, 'Jumlah'),
    })

    if (!validasi.nama_bahan && bukanBahanBaku) {
      validasi.nama_bahan = 'Nama ini sudah tercatat sebagai barang non-bahan baku. Catat stoknya di menu "Barang & Stok", atau minta Super Admin memindahkan kategorinya ke bahan baku.'
    }
    if (!validasi.nama_bahan && bahanBaruAkanDibuat && formMutasi.tipe === 'keluar') {
      validasi.nama_bahan = 'Bahan ini belum pernah tercatat, jadi belum ada stoknya. Untuk pemakaian produksi, pilih/ketik bahan yang sudah ada.'
    }
    if (!validasi.nama_bahan && bahanBaruAkanDibuat && !kategoriDefault) {
      validasi.nama_bahan = 'Belum ada kategori berjenis "Bahan Baku". Minta Super Admin membuatnya dulu di menu Kategori Barang.'
    }
    // Cek stok cukup di sisi aplikasi dulu supaya pesan muncul cepat
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

    // Bahan belum pernah ada -- dibuat cepat dengan data minimal, langsung
    // masuk kategori bahan baku supaya tetap tampil di halaman ini.
    if (!barangId) {
      const { data: bahanBaru, error: errorBahan } = await supabase
        .from('barang')
        .insert({
          kode: buatKodeOtomatis(formMutasi.nama_bahan),
          nama: formMutasi.nama_bahan.trim(),
          kategori_id: kategoriDefault,
          satuan: 'pcs',
          stok_minimum: 0,
          aktif: true,
        })
        .select('id')
        .single()

      if (errorBahan) {
        setMenyimpanMutasi(false)
        setErrorsMutasi({ nama_bahan: pesanErrorRamah(errorBahan) })
        return
      }
      barangId = bahanBaru.id
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
    setNotif({ tipe: 'sukses', pesan: 'Pencatatan bahan produksi tersimpan.' })
    muatData()
  }

  // ---------- Riwayat mutasi per bahan ----------
  const bukaRiwayat = async (b) => {
    setRiwayatBahan(b)
    const { data } = await supabase
      .from('mutasi_stok')
      .select('id, tanggal, tipe, jumlah, stok_sebelum, stok_sesudah, keterangan')
      .eq('barang_id', b.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setRiwayatData(data || [])
  }

  const jumlahMenipis = bahanList.filter((b) => Number(b.stok_saat_ini) <= Number(b.stok_minimum)).length
  const nilaiPersediaan = bahanList.reduce((s, b) => s + Number(b.stok_saat_ini) * Number(b.harga_beli || 0), 0)

  return (
    <div>
      <div className="header-halaman">
        <h2 className="judul-halaman">Stok Bahan Produksi</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-garis" onClick={() => bukaMutasi(null)}>+ Catat Masuk/Pemakaian</button>
          {isSuperAdmin && <button type="button" className="btn btn-emas" onClick={bukaTambahBahan}>+ Tambah Bahan</button>}
        </div>
      </div>
      <p className="teks-muted" style={{ marginTop: -10, marginBottom: 18 }}>
        Bahan baku yang dipakai untuk produksi — jahe, gula, rempah, kemasan, dan lainnya.
        Isinya adalah barang yang kategorinya berjenis "Bahan Baku", jadi stoknya tetap satu
        angka dengan menu "Barang & Stok" (tidak dihitung dua kali).
      </p>

      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="grid-kartu-stat">
        <div className="kartu-stat">
          <div className="stat-label">Jenis Bahan</div>
          <div className="stat-angka">{formatAngka(bahanList.length)}</div>
        </div>
        <div className="kartu-stat">
          <div className="stat-label">Stok Menipis</div>
          <div className={`stat-angka ${jumlahMenipis > 0 ? 'stat-merah' : 'stat-hijau'}`}>{formatAngka(jumlahMenipis)}</div>
        </div>
        <div className="kartu-stat">
          <div className="stat-label">Nilai Persediaan Bahan</div>
          <div className="stat-angka">{formatRupiah(nilaiPersediaan)}</div>
        </div>
      </div>

      <div className="kartu">
        {memuat ? (
          <p className="teks-muted">Memuat...</p>
        ) : bahanList.length === 0 ? (
          <p className="teks-muted">
            Belum ada bahan produksi. Ketik nama bahan di "+ Catat Masuk/Pemakaian" untuk mulai mencatat.
          </p>
        ) : (
          <table className="tabel">
            <thead>
              <tr>
                <th>Kode</th><th>Nama Bahan</th><th>Kategori</th><th>Stok</th><th>Stok Minimum</th><th>Harga Beli</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {bahanList.map((b) => {
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
                    <td>{formatAngka(b.stok_minimum)} {b.satuan}</td>
                    <td>{b.harga_beli ? formatRupiah(b.harga_beli) : '-'}</td>
                    <td>{b.aktif ? <span className="lencana lencana-hijau">Aktif</span> : <span className="lencana">Nonaktif</span>}</td>
                    <td className="kolom-aksi">
                      <button type="button" className="btn-tautan" onClick={() => bukaMutasi(b)}>Stok +/-</button>
                      <button type="button" className="btn-tautan" onClick={() => bukaRiwayat(b)}>Riwayat</button>
                      {isSuperAdmin && <button type="button" className="btn-tautan" onClick={() => bukaEditBahan(b)}>Ubah</button>}
                      {isSuperAdmin && <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => setAkanDihapus(b)}>Hapus</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tambah/ubah bahan (form lengkap, khusus Super Admin) */}
      {modalBahan && (
        <Modal title={formBahan.id ? 'Ubah Bahan Produksi' : 'Tambah Bahan Produksi'} onClose={() => setModalBahan(false)} lebar={560}>
          <form onSubmit={simpanBahan} noValidate>
            <div className="form-grid-2">
              <div>
                <label htmlFor="kodeBahan">Kode bahan</label>
                <input id="kodeBahan" className={errorsBahan.kode ? 'input input-error' : 'input'} value={formBahan.kode}
                  onChange={(e) => setFormBahan({ ...formBahan, kode: e.target.value })} placeholder="Contoh: BHN-001" />
                {errorsBahan.kode && <div className="pesan-error">{errorsBahan.kode}</div>}
              </div>
              <div>
                <label htmlFor="satuanBahan">Satuan</label>
                <input id="satuanBahan" className={errorsBahan.satuan ? 'input input-error' : 'input'} value={formBahan.satuan}
                  onChange={(e) => setFormBahan({ ...formBahan, satuan: e.target.value })} placeholder="kg, liter, gram, pcs" />
                {errorsBahan.satuan && <div className="pesan-error">{errorsBahan.satuan}</div>}
              </div>
            </div>

            <label htmlFor="namaBahan">Nama bahan</label>
            <input id="namaBahan" className={errorsBahan.nama ? 'input input-error' : 'input'} value={formBahan.nama}
              onChange={(e) => setFormBahan({ ...formBahan, nama: e.target.value })} placeholder="Contoh: Jahe merah segar" />
            {errorsBahan.nama && <div className="pesan-error">{errorsBahan.nama}</div>}

            <label htmlFor="kategoriBahan">Kategori bahan</label>
            <select id="kategoriBahan" className={errorsBahan.kategori_id ? 'input input-error' : 'input'}
              value={formBahan.kategori_id} onChange={(e) => setFormBahan({ ...formBahan, kategori_id: e.target.value })}>
              <option value="">Pilih kategori...</option>
              {kategoriBahan.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
            {errorsBahan.kategori_id && <div className="pesan-error">{errorsBahan.kategori_id}</div>}
            {kategoriBahan.length === 0 && (
              <p className="teks-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Belum ada kategori berjenis "Bahan Baku". Buat dulu di menu Persediaan → Kategori Barang.
              </p>
            )}

            <div className="form-grid-2">
              {!formBahan.id && (
                <div>
                  <label htmlFor="stokAwalBahan">Stok awal</label>
                  <InputUang id="stokAwalBahan" value={formBahan.stok_awal} onChange={(v) => setFormBahan({ ...formBahan, stok_awal: v })} placeholder="0" />
                </div>
              )}
              <div>
                <label htmlFor="stokMinimumBahan">Stok minimum (batas aman)</label>
                <InputUang id="stokMinimumBahan" value={formBahan.stok_minimum} onChange={(v) => setFormBahan({ ...formBahan, stok_minimum: v })} placeholder="0" error={errorsBahan.stok_minimum} />
                {errorsBahan.stok_minimum && <div className="pesan-error">{errorsBahan.stok_minimum}</div>}
              </div>
            </div>

            <label htmlFor="hargaBeliBahan">Harga beli per satuan (opsional)</label>
            <InputUang id="hargaBeliBahan" value={formBahan.harga_beli} onChange={(v) => setFormBahan({ ...formBahan, harga_beli: v })} placeholder="0" error={errorsBahan.harga_beli} />
            {errorsBahan.harga_beli && <div className="pesan-error">{errorsBahan.harga_beli}</div>}

            {formBahan.id && (
              <label className="cek-label">
                <input type="checkbox" checked={formBahan.aktif} onChange={(e) => setFormBahan({ ...formBahan, aktif: e.target.checked })} />
                Bahan aktif (tampil untuk pencatatan stok)
              </label>
            )}
            {!formBahan.id && (
              <p className="teks-muted" style={{ fontSize: '0.85rem' }}>
                Stok setelah ini hanya bisa diubah lewat "Catat Masuk/Pemakaian", bukan diedit langsung, supaya riwayatnya tetap tercatat.
              </p>
            )}

            <div className="form-aksi">
              <button type="button" className="btn btn-garis" onClick={() => setModalBahan(false)} disabled={menyimpanBahan}>Batal</button>
              <button type="submit" className="btn btn-emas" disabled={menyimpanBahan}>{menyimpanBahan ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal catat masuk/pemakaian -- nama bahan freetext, Editor & Super Admin */}
      {modalMutasi && (
        <Modal title="Catat Bahan Masuk / Pemakaian Produksi" onClose={() => setModalMutasi(false)}>
          <form onSubmit={simpanMutasi} noValidate>
            <label htmlFor="namaBahanMutasi">Nama bahan</label>
            <input
              id="namaBahanMutasi"
              list="daftar-nama-bahan"
              className={errorsMutasi.nama_bahan ? 'input input-error' : 'input'}
              value={formMutasi.nama_bahan}
              onChange={(e) => setFormMutasi({ ...formMutasi, nama_bahan: e.target.value })}
              placeholder="Ketik nama bahan..."
              autoComplete="off"
            />
            <datalist id="daftar-nama-bahan">
              {bahanList.filter((b) => b.aktif).map((b) => (
                <option key={b.id} value={b.nama} />
              ))}
            </datalist>
            {errorsMutasi.nama_bahan && <div className="pesan-error">{errorsMutasi.nama_bahan}</div>}
            {bahanBaruAkanDibuat && formMutasi.tipe === 'masuk' && (
              <p className="teks-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Bahan baru — akan otomatis ditambahkan ke daftar bahan produksi saat disimpan.
              </p>
            )}

            <label>Jenis pencatatan</label>
            <div className="pilihan-radio">
              <label>
                <input type="radio" name="tipeMutasiBahan" checked={formMutasi.tipe === 'masuk'} onChange={() => setFormMutasi({ ...formMutasi, tipe: 'masuk' })} />
                Bahan Masuk (pembelian)
              </label>
              <label>
                <input type="radio" name="tipeMutasiBahan" checked={formMutasi.tipe === 'keluar'} onChange={() => setFormMutasi({ ...formMutasi, tipe: 'keluar' })} />
                Dipakai Produksi
              </label>
            </div>

            <label htmlFor="tanggalMutasiBahan">Tanggal</label>
            <input id="tanggalMutasiBahan" type="date" className={errorsMutasi.tanggal ? 'input input-error' : 'input'}
              max={todayISO()} value={formMutasi.tanggal} onChange={(e) => setFormMutasi({ ...formMutasi, tanggal: e.target.value })} />
            {errorsMutasi.tanggal && <div className="pesan-error">{errorsMutasi.tanggal}</div>}

            <label htmlFor="jumlahMutasiBahan">Jumlah {barangTerpilih ? `(${barangTerpilih.satuan})` : ''}</label>
            <InputUang id="jumlahMutasiBahan" value={formMutasi.jumlah} onChange={(v) => setFormMutasi({ ...formMutasi, jumlah: v })} placeholder="0" error={errorsMutasi.jumlah} />
            {errorsMutasi.jumlah && <div className="pesan-error">{errorsMutasi.jumlah}</div>}
            {barangTerpilih && !bukanBahanBaku && (
              <p className="teks-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Stok saat ini: {formatAngka(barangTerpilih.stok_saat_ini)} {barangTerpilih.satuan}
              </p>
            )}

            <label htmlFor="keteranganMutasiBahan">Keterangan (opsional)</label>
            <textarea id="keteranganMutasiBahan" className="input" rows={2} value={formMutasi.keterangan}
              onChange={(e) => setFormMutasi({ ...formMutasi, keterangan: e.target.value })}
              placeholder="Contoh: beli dari Pasar Rumput / produksi batch 12 Sep" />

            <div className="form-aksi">
              <button type="button" className="btn btn-garis" onClick={() => setModalMutasi(false)} disabled={menyimpanMutasi}>Batal</button>
              <button type="submit" className="btn btn-emas" disabled={menyimpanMutasi}>{menyimpanMutasi ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal riwayat */}
      {riwayatBahan && (
        <Modal title={`Riwayat Stok — ${riwayatBahan.nama}`} onClose={() => setRiwayatBahan(null)} lebar={560}>
          {riwayatData.length === 0 ? (
            <p className="teks-muted">Belum ada riwayat untuk bahan ini.</p>
          ) : (
            <table className="tabel">
              <thead><tr><th>Tanggal</th><th>Jenis</th><th>Jumlah</th><th>Stok Sesudah</th><th>Keterangan</th></tr></thead>
              <tbody>
                {riwayatData.map((r) => (
                  <tr key={r.id}>
                    <td>{formatTanggal(r.tanggal)}</td>
                    <td className={r.tipe === 'masuk' ? 'stat-hijau' : 'stat-merah'}>{r.tipe === 'masuk' ? 'Masuk' : 'Dipakai'}</td>
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
          judul="Hapus bahan produksi?"
          pesan={`Bahan "${akanDihapus.nama}" akan dihapus permanen.`}
          onBatal={() => setAkanDihapus(null)}
          onKonfirmasi={hapusBahan}
          sedangProses={menghapus}
        />
      )}
    </div>
  )
}
