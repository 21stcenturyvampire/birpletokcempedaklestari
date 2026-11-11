import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import useTabel from '../hooks/useTabel'
import { KotakCari, Paginasi, BarisKosong } from './TabelKontrol'
import { formatRupiah } from '../utils/format'
import { labelBulan } from '../utils/laporanKeuangan'

// Daftar laporan PDF bulanan yang sudah diunggah otomatis ke Google Drive
// oleh GitHub Actions (.github/workflows/laporan-bulanan.yml).
// Data diambil dari tabel arsip_laporan_keuangan (lihat supabase/update_5.sql).
export default function ArsipDrive({ bulanAktif }) {
  const [daftar, setDaftar] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [belumSiap, setBelumSiap] = useState(false)

  useEffect(() => {
    let batal = false
    ;(async () => {
      const { data, error } = await supabase
        .from('arsip_laporan_keuangan')
        .select('bulan, drive_file_url, drive_folder_url, jumlah_transaksi, total_masuk, total_keluar, diunggah_pada')
        .order('bulan', { ascending: false })
      if (batal) return
      if (error) setBelumSiap(true)
      setDaftar(data || [])
      setMemuat(false)
    })()
    return () => { batal = true }
  }, [])

  const tabel = useTabel(daftar, (a) => [
    labelBulan(a.bulan), a.bulan, String(a.jumlah_transaksi),
    formatRupiah(a.total_masuk), formatRupiah(a.total_keluar), formatRupiah(a.total_masuk - a.total_keluar),
  ])

  const urlFolder = daftar[0]?.drive_folder_url
  const arsipBulanIni = daftar.find((a) => a.bulan === bulanAktif)

  return (
    <div className="kartu" style={{ marginTop: 20 }}>
      <div className="header-halaman" style={{ marginBottom: 8 }}>
        <div>
          <h3 style={{ fontSize: '1.05rem' }}>Arsip Laporan di Google Drive</h3>
          <p className="teks-muted" style={{ margin: 0 }}>
            Setiap tanggal 1 pukul 08.00 WIB, laporan PDF bulan sebelumnya dibuat & diunggah otomatis ke Google Drive.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {arsipBulanIni && (
            <a className="btn btn-garis" href={arsipBulanIni.drive_file_url} target="_blank" rel="noreferrer">
              Buka PDF {labelBulan(bulanAktif)}
            </a>
          )}
          {urlFolder && (
            <a className="btn btn-garis" href={urlFolder} target="_blank" rel="noreferrer">
              Buka Folder Drive ↗
            </a>
          )}
        </div>
      </div>

      {memuat ? (
        <p className="teks-muted">Memuat...</p>
      ) : belumSiap ? (
        <p className="teks-muted">
          Arsip belum aktif. Jalankan <code>supabase/update_5.sql</code> dan atur integrasi Google Drive (lihat README).
        </p>
      ) : daftar.length === 0 ? (
        <p className="teks-muted">Belum ada laporan yang diunggah ke Google Drive.</p>
      ) : (
        <>
          <KotakCari tabel={tabel} placeholder="Cari bulan atau nominal..." />
          <div className="tabel-scroll">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th style={{ textAlign: 'right' }}>Transaksi</th>
                  <th style={{ textAlign: 'right' }}>Kas Masuk</th>
                  <th style={{ textAlign: 'right' }}>Kas Keluar</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th>Diunggah</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <BarisKosong kolom={7} tabel={tabel} />
                {tabel.barisHalaman.map((a) => {
                  const saldo = Number(a.total_masuk) - Number(a.total_keluar)
                  return (
                    <tr key={a.bulan}>
                      <td>{labelBulan(a.bulan)}</td>
                      <td style={{ textAlign: 'right' }}>{a.jumlah_transaksi}</td>
                      <td style={{ textAlign: 'right' }} className="stat-hijau">{formatRupiah(a.total_masuk)}</td>
                      <td style={{ textAlign: 'right' }} className="stat-merah">{formatRupiah(a.total_keluar)}</td>
                      <td style={{ textAlign: 'right' }} className={saldo >= 0 ? 'stat-hijau' : 'stat-merah'}>{formatRupiah(saldo)}</td>
                      <td>{new Date(a.diunggah_pada).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td className="kolom-aksi">
                        <a className="btn-tautan" href={a.drive_file_url} target="_blank" rel="noreferrer">Buka PDF ↗</a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Paginasi tabel={tabel} />
        </>
      )}
    </div>
  )
}
