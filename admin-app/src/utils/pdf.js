// Pembuat laporan PDF sederhana yang dipakai bersama oleh halaman-halaman
// yang punya tombol "Export PDF". Satu tempat saja, supaya semua laporan
// tampil seragam (kop, ringkasan, tabel, nomor halaman).
//
// Library PDF-nya sengaja di-import dinamis (bukan di baris atas file),
// supaya ikut diunduh browser hanya saat tombol Export PDF ditekan --
// aplikasi tetap ringan untuk yang tidak mencetak laporan.

const NAMA_USAHA = 'Bir Pletok Cempedak Lestari'

// Warna kop & header tabel, senada dengan tampilan aplikasi.
const MAROON = [90, 26, 26]
const EMAS = [200, 155, 60]

function waktuCetak() {
  return new Date().toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Buat lalu unduh satu file PDF berisi kop + ringkasan + tabel.
 *
 * judul      judul laporan (mis. "Laporan Transaksi Keuangan")
 * subjudul   keterangan periode/filter (mis. "Periode: September 2026")
 * ringkasan  array { label, nilai } -- ditulis sebagai baris ringkasan di atas tabel
 * kolom      array { header, dataKey, lebar?, rata? }  rata: 'left' | 'right' | 'center'
 * baris      array objek, dipetakan lewat dataKey di kolom
 * namaFile   nama file tanpa ".pdf"
 * orientasi  'portrait' (default) atau 'landscape'
 */
export async function exportTabelPdf({
  judul,
  subjudul = '',
  ringkasan = [],
  kolom,
  baris,
  namaFile = 'laporan',
  orientasi = 'portrait',
}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: orientasi, unit: 'mm', format: 'a4' })
  const lebarHalaman = doc.internal.pageSize.getWidth()
  const margin = 14

  // ---- Kop ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...MAROON)
  doc.text(NAMA_USAHA, margin, 18)

  doc.setFontSize(11)
  doc.setTextColor(40, 40, 40)
  doc.text(judul, margin, 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(110, 110, 110)
  if (subjudul) doc.text(subjudul, margin, 30.5)
  doc.text(`Dicetak: ${waktuCetak()}`, lebarHalaman - margin, 18, { align: 'right' })

  doc.setDrawColor(...EMAS)
  doc.setLineWidth(0.6)
  doc.line(margin, 33.5, lebarHalaman - margin, 33.5)

  let y = 40

  // ---- Ringkasan (opsional) ----
  if (ringkasan.length > 0) {
    doc.setFontSize(9.5)
    ringkasan.forEach(({ label, nilai }) => {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(110, 110, 110)
      doc.text(`${label}`, margin, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text(String(nilai), margin + 45, y)
      y += 5.5
    })
    y += 3
  }

  // ---- Tabel ----
  const columnStyles = {}
  kolom.forEach((k, i) => {
    columnStyles[i] = {
      ...(k.lebar ? { cellWidth: k.lebar } : {}),
      ...(k.rata ? { halign: k.rata } : {}),
    }
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 18 },
    head: [kolom.map((k) => k.header)],
    body: baris.map((b) => kolom.map((k) => (b[k.dataKey] ?? '-'))),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2, textColor: [40, 40, 40], lineColor: [225, 220, 212] },
    headStyles: { fillColor: MAROON, textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 247, 242] },
    columnStyles,
  })

  // ---- Nomor halaman di semua halaman ----
  const totalHalaman = doc.internal.getNumberOfPages()
  const tinggiHalaman = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= totalHalaman; i += 1) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140, 140, 140)
    doc.text(`Halaman ${i} dari ${totalHalaman}`, lebarHalaman - margin, tinggiHalaman - 8, { align: 'right' })
    doc.text(NAMA_USAHA, margin, tinggiHalaman - 8)
  }

  doc.save(`${namaFile}.pdf`)
}
