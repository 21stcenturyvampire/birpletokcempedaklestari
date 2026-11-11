// Pembuat PDF laporan transaksi keuangan bulanan.
// Dipakai di DUA tempat supaya hasilnya selalu sama persis:
//  1. Tombol "Export PDF" di halaman Transaksi (browser).
//  2. Script otomatis akhir bulan (scripts/laporan-bulanan.mjs, Node) yang
//     mengunggah PDF ke Google Drive.
// Karena itu file ini tidak boleh memakai API khusus browser.
import { formatRupiah, formatTanggal } from './format.js'

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// "2026-10" -> "Oktober 2026"
export function labelBulan(bulan) {
  const [tahun, bln] = bulan.split('-').map(Number)
  return `${NAMA_BULAN[bln - 1]} ${tahun}`
}

export function namaFileLaporan(bulan) {
  return `transaksi-keuangan-${bulan}.pdf`
}

// "2026-10" -> { awal: '2026-10-01', akhir: '2026-10-31' }
export function rentangBulan(bulan) {
  const [tahun, bln] = bulan.split('-').map(Number)
  const hariTerakhir = new Date(Date.UTC(tahun, bln, 0)).getUTCDate()
  return { awal: `${bulan}-01`, akhir: `${bulan}-${String(hariTerakhir).padStart(2, '0')}` }
}

export function hitungTotal(daftar) {
  let masuk = 0
  let keluar = 0
  for (const t of daftar) {
    if (t.kategori_transaksi?.tipe === 'masuk') masuk += Number(t.jumlah)
    else if (t.kategori_transaksi?.tipe === 'keluar') keluar += Number(t.jumlah)
  }
  return { masuk, keluar, saldo: masuk - keluar }
}

// jsPDF & autoTable dioper dari luar karena cara import-nya beda antara
// browser (lazy import) dan Node.
export function buatPdfLaporan({ jsPDF, autoTable, bulan, daftar, keterangan = '' }) {
  const doc = new jsPDF()
  const total = hitungTotal(daftar)

  doc.setFontSize(14)
  doc.text('Bir Pletok Cempedak Lestari', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Laporan Transaksi Keuangan — ${labelBulan(bulan)}`, 14, 25)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB${keterangan ? ` · ${keterangan}` : ''}`, 14, 30)

  const baris = daftar.map((t) => [
    formatTanggal(t.tanggal),
    t.kategori_transaksi?.nama || '-',
    t.kategori_transaksi?.tipe === 'masuk' ? 'Masuk' : 'Keluar',
    t.keterangan || '-',
    (t.kategori_transaksi?.tipe === 'masuk' ? '+ ' : '- ') + formatRupiah(t.jumlah),
  ])

  autoTable(doc, {
    startY: 36,
    head: [['Tanggal', 'Kategori', 'Jenis', 'Keterangan', 'Jumlah']],
    body: baris.length ? baris : [[{ content: 'Tidak ada transaksi di bulan ini.', colSpan: 5, styles: { halign: 'center' } }]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [200, 155, 60], textColor: [44, 21, 12] },
    columnStyles: { 4: { halign: 'right' } },
  })

  const akhirY = doc.lastAutoTable.finalY + 10
  doc.setTextColor(20)
  doc.setFontSize(10)
  doc.text(`Total Kas Masuk : ${formatRupiah(total.masuk)}`, 14, akhirY)
  doc.text(`Total Kas Keluar: ${formatRupiah(total.keluar)}`, 14, akhirY + 6)
  doc.setFont(undefined, 'bold')
  doc.text(`Saldo           : ${formatRupiah(total.saldo)}`, 14, akhirY + 12)

  return doc
}
