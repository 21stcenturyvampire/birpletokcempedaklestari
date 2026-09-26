import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import InputUang from '../components/InputUang'
import Notifikasi from '../components/Notifikasi'
import { formatRupiah, formatTanggal, formatBulanTahun, todayISO } from '../utils/format'
import { exportTabelPdf } from '../utils/pdf'
import { wajibDiisi, harusAngkaPositif, tanggalTidakBolehFuture, jalankanValidasi, adaError, pesanErrorRamah } from '../utils/validation'

const FORM_KOSONG = { id: null, tanggal: todayISO(), kategori_id: '', jumlah: '', keterangan: '' }

export default function Keuangan() {
  const { isSuperAdmin, profile } = useAuth()
  const [daftar, setDaftar] = useState([])
  const [kategoriList, setKategoriList] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [bulan, setBulan] = useState(todayISO().slice(0, 7)) // YYYY-MM

  const [modalTerbuka, setModalTerbuka] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [errors, setErrors] = useState({})
  const [menyimpan, setMenyimpan] = useState(false)

  const [akanDihapus, setAkanDihapus] = useState(null)
  const [menghapus, setMenghapus] = useState(false)

  const [notif, setNotif] = useState(null)
  const [mengekspor, setMengekspor] = useState(false)

  const muatData = async () => {
    setMemuat(true)
    const awal = `${bulan}-01`
    const [tahun, bln] = bulan.split('-').map(Number)
    const akhir = new Date(tahun, bln, 0).toISOString().slice(0, 10)

    const [{ data: transaksi }, { data: kategori }] = await Promise.all([
      supabase
        .from('transaksi_keuangan')
        .select('id, tanggal, jumlah, keterangan, kategori_id, kategori_transaksi(nama, tipe)')
        .gte('tanggal', awal)
        .lte('tanggal', akhir)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('kategori_transaksi').select('id, nama, tipe').order('nama'),
    ])
    setDaftar(transaksi || [])
    setKategoriList(kategori || [])
    setMemuat(false)
  }

  useEffect(() => {
    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan])

  const bukaTambah = () => {
    setForm(FORM_KOSONG)
    setErrors({})
    setModalTerbuka(true)
  }

  const bukaEdit = (t) => {
    setForm({ id: t.id, tanggal: t.tanggal, kategori_id: t.kategori_id, jumlah: t.jumlah, keterangan: t.keterangan || '' })
    setErrors({})
    setModalTerbuka(true)
  }

  const simpan = async (e) => {
    e.preventDefault()
    const validasi = jalankanValidasi({
      tanggal: tanggalTidakBolehFuture(form.tanggal, 'Tanggal'),
      kategori_id: wajibDiisi(form.kategori_id, 'Jenis transaksi'),
      jumlah: harusAngkaPositif(form.jumlah, 'Jumlah'),
    })
    setErrors(validasi)
    if (adaError(validasi)) return

    setMenyimpan(true)
    let error
    if (form.id) {
      ;({ error } = await supabase
        .from('transaksi_keuangan')
        .update({
          tanggal: form.tanggal,
          kategori_id: form.kategori_id,
          jumlah: form.jumlah,
          keterangan: form.keterangan || null,
        })
        .eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('transaksi_keuangan').insert({
        tanggal: form.tanggal,
        kategori_id: form.kategori_id,
        jumlah: form.jumlah,
        keterangan: form.keterangan || null,
        dibuat_oleh: profile?.id,
      }))
    }
    setMenyimpan(false)

    if (error) {
      setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) })
      return
    }
    setModalTerbuka(false)
    setNotif({ tipe: 'sukses', pesan: form.id ? 'Transaksi diperbarui.' : 'Transaksi ditambahkan.' })
    muatData()
  }

  const hapus = async () => {
    setMenghapus(true)
    const { error } = await supabase.from('transaksi_keuangan').delete().eq('id', akanDihapus.id)
    setMenghapus(false)
    setAkanDihapus(null)
    if (error) {
      setNotif({ tipe: 'error', pesan: pesanErrorRamah(error) })
      return
    }
    setNotif({ tipe: 'sukses', pesan: 'Transaksi dihapus.' })
    muatData()
  }

  const totalMasuk = daftar.filter((t) => t.kategori_transaksi?.tipe === 'masuk').reduce((s, t) => s + Number(t.jumlah), 0)
  const totalKeluar = daftar.filter((t) => t.kategori_transaksi?.tipe === 'keluar').reduce((s, t) => s + Number(t.jumlah), 0)

  // Kategori dipisah per jenis, supaya di form bisa ditampilkan
  // berkelompok: "Kas Masuk" dulu, lalu "Kas Keluar".
  const kategoriMasuk = kategoriList.filter((k) => k.tipe === 'masuk')
  const kategoriKeluar = kategoriList.filter((k) => k.tipe === 'keluar')

  // Unduh daftar transaksi bulan yang sedang dilihat sebagai satu file PDF.
  // Yang diekspor persis apa yang tampil di tabel (mengikuti filter bulan).
  const exportPdf = async () => {
    const periode = formatBulanTahun(bulan)
    setMengekspor(true)
    try {
      await exportTabelPdf({
        judul: 'Laporan Transaksi Keuangan',
        subjudul: `Periode: ${periode}`,
        ringkasan: [
          { label: 'Kas Masuk', nilai: formatRupiah(totalMasuk) },
          { label: 'Kas Keluar', nilai: formatRupiah(totalKeluar) },
          { label: 'Saldo', nilai: formatRupiah(totalMasuk - totalKeluar) },
          { label: 'Jumlah transaksi', nilai: `${daftar.length} transaksi` },
        ],
        kolom: [
          { header: 'Tanggal', dataKey: 'tanggal', lebar: 25 },
          { header: 'Kategori', dataKey: 'kategori', lebar: 35 },
          { header: 'Jenis', dataKey: 'jenis', lebar: 22 },
          { header: 'Keterangan', dataKey: 'keterangan' },
          { header: 'Jumlah (Rp)', dataKey: 'jumlah', lebar: 32, rata: 'right' },
        ],
        baris: daftar.map((t) => ({
          tanggal: formatTanggal(t.tanggal),
          kategori: t.kategori_transaksi?.nama || '-',
          jenis: t.kategori_transaksi?.tipe === 'masuk' ? 'Kas Masuk' : 'Kas Keluar',
          keterangan: t.keterangan || '-',
          jumlah: `${t.kategori_transaksi?.tipe === 'masuk' ? '+' : '-'} ${formatRupiah(t.jumlah)}`,
        })),
        namaFile: `Transaksi-Keuangan-${bulan}`,
      })
      setNotif({ tipe: 'sukses', pesan: `Laporan PDF ${periode} berhasil diunduh.` })
    } catch (err) {
      setNotif({ tipe: 'error', pesan: 'Gagal membuat PDF: ' + (err?.message || 'coba ulangi sebentar lagi.') })
    } finally {
      setMengekspor(false)
    }
  }

  return (
    <div>
      <div className="header-halaman">
        <h2 className="judul-halaman">Transaksi Keuangan</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-garis"
            onClick={exportPdf}
            disabled={memuat || mengekspor || daftar.length === 0}
            title={daftar.length === 0 ? 'Belum ada transaksi untuk diekspor di bulan ini.' : 'Unduh laporan bulan ini sebagai PDF'}
          >
            {mengekspor ? 'Menyiapkan...' : 'Export PDF'}
          </button>
          <button type="button" className="btn btn-emas" onClick={bukaTambah}>
            + Tambah Transaksi
          </button>
        </div>
      </div>

      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="toolbar">
        <label htmlFor="bulan">Bulan</label>
        <input id="bulan" type="month" className="input" value={bulan} onChange={(e) => setBulan(e.target.value)} />
      </div>

      <div className="grid-kartu-stat">
        <div className="kartu-stat">
          <div className="stat-label">Kas Masuk ({bulan})</div>
          <div className="stat-angka stat-hijau">{formatRupiah(totalMasuk)}</div>
        </div>
        <div className="kartu-stat">
          <div className="stat-label">Kas Keluar ({bulan})</div>
          <div className="stat-angka stat-merah">{formatRupiah(totalKeluar)}</div>
        </div>
        <div className="kartu-stat">
          <div className="stat-label">Saldo ({bulan})</div>
          <div className={`stat-angka ${totalMasuk - totalKeluar >= 0 ? 'stat-hijau' : 'stat-merah'}`}>
            {formatRupiah(totalMasuk - totalKeluar)}
          </div>
        </div>
      </div>

      <div className="kartu">
        {memuat ? (
          <p className="teks-muted">Memuat...</p>
        ) : daftar.length === 0 ? (
          <p className="teks-muted">Belum ada transaksi di bulan ini.</p>
        ) : (
          <table className="tabel">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th style={{ textAlign: 'right' }}>Jumlah</th>
                {isSuperAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {daftar.map((t) => (
                <tr key={t.id}>
                  <td>{formatTanggal(t.tanggal)}</td>
                  <td>
                    <span className={`lencana ${t.kategori_transaksi?.tipe === 'masuk' ? 'lencana-hijau' : 'lencana-merah'}`}>
                      {t.kategori_transaksi?.nama}
                    </span>
                  </td>
                  <td>{t.keterangan || '-'}</td>
                  <td style={{ textAlign: 'right' }} className={t.kategori_transaksi?.tipe === 'masuk' ? 'stat-hijau' : 'stat-merah'}>
                    {t.kategori_transaksi?.tipe === 'masuk' ? '+' : '-'} {formatRupiah(t.jumlah)}
                  </td>
                  {isSuperAdmin && (
                    <td className="kolom-aksi">
                      <button type="button" className="btn-tautan" onClick={() => bukaEdit(t)}>Ubah</button>
                      <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => setAkanDihapus(t)}>Hapus</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalTerbuka && (
        <Modal title={form.id ? 'Ubah Transaksi' : 'Tambah Transaksi'} onClose={() => setModalTerbuka(false)}>
          <form onSubmit={simpan} noValidate>
            <label htmlFor="tanggal">Tanggal</label>
            <input
              id="tanggal"
              type="date"
              className={errors.tanggal ? 'input input-error' : 'input'}
              max={todayISO()}
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            />
            {errors.tanggal && <div className="pesan-error">{errors.tanggal}</div>}

            {/* Jumlah setengah lebar, di sampingnya jenis transaksi.
                Pilihan jenis dikelompokkan Kas Masuk / Kas Keluar, jadi sekali
                pilih sudah menentukan jenis sekaligus kategorinya -- tidak
                mungkin jenis & kategori jadi tidak nyambung. */}
            <div className="form-grid-2">
              <div>
                <label htmlFor="jumlah">Jumlah (Rp)</label>
                <InputUang id="jumlah" value={form.jumlah} onChange={(v) => setForm({ ...form, jumlah: v })} placeholder="0" error={errors.jumlah} />
                {errors.jumlah && <div className="pesan-error">{errors.jumlah}</div>}
              </div>
              <div>
                <label htmlFor="kategori">Jenis Transaksi</label>
                <select
                  id="kategori"
                  className={errors.kategori_id ? 'input input-error' : 'input'}
                  value={form.kategori_id}
                  onChange={(e) => setForm({ ...form, kategori_id: e.target.value })}
                >
                  <option value="">Pilih jenis...</option>
                  {kategoriMasuk.length > 0 && (
                    <optgroup label="Kas Masuk">
                      {kategoriMasuk.map((k) => (
                        <option key={k.id} value={k.id}>{k.nama}</option>
                      ))}
                    </optgroup>
                  )}
                  {kategoriKeluar.length > 0 && (
                    <optgroup label="Kas Keluar">
                      {kategoriKeluar.map((k) => (
                        <option key={k.id} value={k.id}>{k.nama}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {errors.kategori_id && <div className="pesan-error">{errors.kategori_id}</div>}
              </div>
            </div>

            <label htmlFor="keterangan">Keterangan (opsional)</label>
            <textarea
              id="keterangan"
              className="input"
              rows={2}
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            />

            <div className="form-aksi">
              <button type="button" className="btn btn-garis" onClick={() => setModalTerbuka(false)} disabled={menyimpan}>
                Batal
              </button>
              <button type="submit" className="btn btn-emas" disabled={menyimpan}>
                {menyimpan ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {akanDihapus && (
        <ConfirmDialog
          judul="Hapus transaksi?"
          pesan={`Transaksi "${akanDihapus.kategori_transaksi?.nama}" sebesar ${formatRupiah(akanDihapus.jumlah)} akan dihapus permanen.`}
          onBatal={() => setAkanDihapus(null)}
          onKonfirmasi={hapus}
          sedangProses={menghapus}
        />
      )}
    </div>
  )
}
