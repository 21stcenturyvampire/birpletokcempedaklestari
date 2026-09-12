import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatRupiah, formatAngka, formatTanggal } from '../utils/format'

export default function Dashboard() {
  const [memuat, setMemuat] = useState(true)
  const [ringkasan, setRingkasan] = useState({ masuk: 0, keluar: 0 })
  const [barangMenipis, setBarangMenipis] = useState([])
  const [transaksiTerbaru, setTransaksiTerbaru] = useState([])

  useEffect(() => {
    const muat = async () => {
      setMemuat(true)

      const awalBulan = new Date()
      awalBulan.setDate(1)
      const awalBulanISO = awalBulan.toISOString().slice(0, 10)

      const [{ data: transaksiBulanIni }, { data: menipis }, { data: terbaru }] = await Promise.all([
        supabase
          .from('transaksi_keuangan')
          .select('jumlah, kategori_transaksi(tipe)')
          .gte('tanggal', awalBulanISO),
        supabase
          .from('barang')
          .select('id, kode, nama, satuan, stok_saat_ini, stok_minimum')
          .eq('aktif', true)
          .order('stok_saat_ini', { ascending: true }),
        supabase
          .from('transaksi_keuangan')
          .select('id, tanggal, jumlah, keterangan, kategori_transaksi(nama, tipe)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      let masuk = 0
      let keluar = 0
      for (const t of transaksiBulanIni || []) {
        if (t.kategori_transaksi?.tipe === 'masuk') masuk += Number(t.jumlah)
        else keluar += Number(t.jumlah)
      }
      setRingkasan({ masuk, keluar })

      setBarangMenipis((menipis || []).filter((b) => Number(b.stok_saat_ini) <= Number(b.stok_minimum)))
      setTransaksiTerbaru(terbaru || [])
      setMemuat(false)
    }
    muat()
  }, [])

  if (memuat) return <div className="halaman-loading">Memuat data...</div>

  const saldoBulanIni = ringkasan.masuk - ringkasan.keluar

  return (
    <div>
      <h2 className="judul-halaman">Dasbor</h2>

      <div className="grid-kartu-stat">
        <div className="kartu-stat">
          <div className="stat-label">Kas Masuk (bulan ini)</div>
          <div className="stat-angka stat-hijau">{formatRupiah(ringkasan.masuk)}</div>
        </div>
        <div className="kartu-stat">
          <div className="stat-label">Kas Keluar (bulan ini)</div>
          <div className="stat-angka stat-merah">{formatRupiah(ringkasan.keluar)}</div>
        </div>
        <div className="kartu-stat">
          <div className="stat-label">Saldo Bersih (bulan ini)</div>
          <div className={`stat-angka ${saldoBulanIni >= 0 ? 'stat-hijau' : 'stat-merah'}`}>
            {formatRupiah(saldoBulanIni)}
          </div>
        </div>
        <div className="kartu-stat">
          <div className="stat-label">Barang Stok Menipis</div>
          <div className="stat-angka stat-kuning">{barangMenipis.length}</div>
        </div>
      </div>

      <div className="grid-dua-kolom">
        <div className="kartu">
          <h3>Barang perlu diisi ulang</h3>
          {barangMenipis.length === 0 ? (
            <p className="teks-muted">Semua stok masih aman.</p>
          ) : (
            <table className="tabel">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th>Stok</th>
                  <th>Minimum</th>
                </tr>
              </thead>
              <tbody>
                {barangMenipis.map((b) => (
                  <tr key={b.id}>
                    <td>{b.nama}</td>
                    <td className="stat-merah">{formatAngka(b.stok_saat_ini)} {b.satuan}</td>
                    <td>{formatAngka(b.stok_minimum)} {b.satuan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="kartu">
          <h3>Transaksi terbaru</h3>
          {transaksiTerbaru.length === 0 ? (
            <p className="teks-muted">Belum ada transaksi.</p>
          ) : (
            <table className="tabel">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {transaksiTerbaru.map((t) => (
                  <tr key={t.id}>
                    <td>{formatTanggal(t.tanggal)}</td>
                    <td>{t.kategori_transaksi?.nama}</td>
                    <td className={t.kategori_transaksi?.tipe === 'masuk' ? 'stat-hijau' : 'stat-merah'}>
                      {t.kategori_transaksi?.tipe === 'masuk' ? '+' : '-'} {formatRupiah(t.jumlah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
