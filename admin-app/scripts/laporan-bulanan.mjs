// =====================================================================
// Laporan keuangan bulanan otomatis -> PDF -> Google Drive
//
// Dijalankan oleh GitHub Actions (.github/workflows/laporan-bulanan.yml)
// setiap tanggal 1, untuk bulan SEBELUMNYA (supaya semua transaksi sampai
// akhir bulan sudah tercatat). Bisa juga dijalankan manual:
//
//   cd admin-app
//   BULAN=2026-10 node scripts/laporan-bulanan.mjs
//
// Environment variable (isi lewat GitHub Secrets, JANGAN di file repo):
//   SUPABASE_URL                 https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service_role key (melewati RLS)
//   GDRIVE_CLIENT_ID             OAuth Client ID (Google Cloud)
//   GDRIVE_CLIENT_SECRET         OAuth Client Secret
//   GDRIVE_REFRESH_TOKEN         refresh token akun Google pemilik Drive
//   GDRIVE_FOLDER_NAME           (opsional) nama folder tujuan
//   BULAN                        (opsional) 'YYYY-MM'; default = bulan lalu (WIB)
//
// Script ini idempoten: kalau dijalankan ulang untuk bulan yang sama,
// file PDF di Drive DITIMPA (bukan dobel) dan arsip di database diperbarui.
// =====================================================================
import { createClient } from '@supabase/supabase-js'
import jspdfPkg from 'jspdf'
import autoTablePkg from 'jspdf-autotable'
import { buatPdfLaporan, hitungTotal, labelBulan, namaFileLaporan, rentangBulan } from '../src/utils/laporanKeuangan.js'

const { jsPDF } = jspdfPkg
const autoTable = autoTablePkg.default || autoTablePkg

const FOLDER_DEFAULT = 'Laporan Keuangan - Bir Pletok Cempedak Lestari'
const DRIVE = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

function wajibEnv(nama) {
  const v = process.env[nama]
  if (!v) {
    console.error(`✗ Environment variable ${nama} belum diisi.`)
    process.exit(1)
  }
  return v
}

function bulanLaluWIB() {
  const wib = new Date(Date.now() + 7 * 3600 * 1000)
  let tahun = wib.getUTCFullYear()
  let bln = wib.getUTCMonth() // 0-based => sudah = bulan lalu (1-based)
  if (bln === 0) { bln = 12; tahun -= 1 }
  return `${tahun}-${String(bln).padStart(2, '0')}`
}

// ---------- Supabase ----------
async function ambilTransaksi(supabase, bulan) {
  const { awal, akhir } = rentangBulan(bulan)
  const semua = []
  const UKURAN = 1000
  for (let dari = 0; ; dari += UKURAN) {
    const { data, error } = await supabase
      .from('transaksi_keuangan')
      .select('id, tanggal, jumlah, keterangan, kategori_transaksi(nama, tipe)')
      .gte('tanggal', awal)
      .lte('tanggal', akhir)
      .order('tanggal', { ascending: true })
      .order('created_at', { ascending: true })
      .range(dari, dari + UKURAN - 1)
    if (error) throw new Error('Gagal mengambil transaksi: ' + error.message)
    semua.push(...data)
    if (data.length < UKURAN) break
  }
  return semua
}

// ---------- Google Drive ----------
async function ambilAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: wajibEnv('GDRIVE_CLIENT_ID'),
      client_secret: wajibEnv('GDRIVE_CLIENT_SECRET'),
      refresh_token: wajibEnv('GDRIVE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(
      `Gagal login ke Google (${json.error}: ${json.error_description || ''}). ` +
      'Kalau "invalid_grant", refresh token kedaluwarsa/dicabut — buat ulang (lihat README).',
    )
  }
  return json.access_token
}

async function drive(token, url, opsi = {}) {
  const res = await fetch(url, { ...opsi, headers: { Authorization: `Bearer ${token}`, ...(opsi.headers || {}) } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Google Drive API error ${res.status}: ${json.error?.message || JSON.stringify(json)}`)
  return json
}

const kutip = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

async function cariAtauBuatFolder(token, nama) {
  const q = `name = ${kutip(nama)} and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const { files } = await drive(token, `${DRIVE}/files?${new URLSearchParams({ q, fields: 'files(id, webViewLink)', pageSize: '1' })}`)
  if (files.length) return files[0]
  console.log(`• Folder "${nama}" belum ada, membuat folder baru...`)
  return drive(token, `${DRIVE}/files?fields=id,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nama, mimeType: 'application/vnd.google-apps.folder' }),
  })
}

async function unggahPdf(token, folderId, namaFile, isiPdf) {
  const q = `name = ${kutip(namaFile)} and ${kutip(folderId)} in parents and trashed = false`
  const { files } = await drive(token, `${DRIVE}/files?${new URLSearchParams({ q, fields: 'files(id)', pageSize: '1' })}`)

  if (files.length) {
    console.log('• File bulan ini sudah ada di Drive, menimpa dengan versi terbaru...')
    return drive(token, `${DRIVE_UPLOAD}/files/${files[0].id}?uploadType=media&fields=id,webViewLink`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/pdf' },
      body: isiPdf,
    })
  }

  const batas = 'bpcl' + Math.random().toString(36).slice(2)
  const metadata = JSON.stringify({ name: namaFile, parents: [folderId], mimeType: 'application/pdf' })
  const body = Buffer.concat([
    Buffer.from(`--${batas}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${batas}\r\nContent-Type: application/pdf\r\n\r\n`),
    isiPdf,
    Buffer.from(`\r\n--${batas}--`),
  ])
  return drive(token, `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${batas}` },
    body,
  })
}

// ---------- Main ----------
async function main() {
  const bulan = process.env.BULAN?.trim() || bulanLaluWIB()
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan)) throw new Error(`BULAN harus berformat YYYY-MM, bukan "${bulan}"`)
  console.log(`▶ Membuat laporan ${labelBulan(bulan)} (${bulan})`)

  const supabase = createClient(wajibEnv('SUPABASE_URL'), wajibEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const daftar = await ambilTransaksi(supabase, bulan)
  const total = hitungTotal(daftar)
  console.log(`• ${daftar.length} transaksi, masuk ${total.masuk}, keluar ${total.keluar}`)

  const doc = buatPdfLaporan({ jsPDF, autoTable, bulan, daftar, keterangan: 'dibuat otomatis' })
  const isiPdf = Buffer.from(doc.output('arraybuffer'))

  const token = await ambilAccessToken()
  const folder = await cariAtauBuatFolder(token, process.env.GDRIVE_FOLDER_NAME?.trim() || FOLDER_DEFAULT)
  const file = await unggahPdf(token, folder.id, namaFileLaporan(bulan), isiPdf)
  console.log(`✓ Terunggah: ${file.webViewLink}`)

  const { error } = await supabase.from('arsip_laporan_keuangan').upsert({
    bulan,
    drive_file_id: file.id,
    drive_file_url: file.webViewLink,
    drive_folder_url: folder.webViewLink,
    jumlah_transaksi: daftar.length,
    total_masuk: total.masuk,
    total_keluar: total.keluar,
    diunggah_pada: new Date().toISOString(),
  })
  if (error) {
    // PDF sudah aman di Drive; hanya daftar arsip di aplikasi yang gagal.
    console.warn('⚠ PDF sudah di Drive, tapi gagal mencatat arsip ke database: ' + error.message)
    console.warn('  Pastikan supabase/update_5.sql sudah dijalankan.')
    process.exitCode = 1
    return
  }
  console.log('✓ Arsip tercatat di database.')
}

main().catch((err) => {
  console.error('✗ ' + (err?.message || err))
  process.exit(1)
})
