import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Notifikasi from '../components/Notifikasi'
import RepeaterTeks from '../components/RepeaterTeks'
import RepeaterObjek from '../components/RepeaterObjek'
import InputUang from '../components/InputUang'

const TAB_LIST = [
  { key: 'hero', label: 'Hero (Judul Utama)' },
  { key: 'tentang', label: 'Tentang' },
  { key: 'menu', label: 'Menu' },
  { key: 'ulasan', label: 'Ulasan' },
  { key: 'lokasi', label: 'Lokasi & Kontak' },
  { key: 'sosial_media', label: 'Media Sosial' },
  { key: 'tampilan', label: 'Tampilan (Warna)' },
]

const OPSI_PLATFORM = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'lainnya', label: 'Lainnya' },
]

export default function KontenLandingPage() {
  const { profile } = useAuth()
  const [konten, setKonten] = useState(null)
  const [memuat, setMemuat] = useState(true)
  const [tab, setTab] = useState('hero')
  const [menyimpan, setMenyimpan] = useState(false)
  const [notif, setNotif] = useState(null)

  const muatData = async () => {
    setMemuat(true)
    const { data } = await supabase.from('landing_konten').select('section, data')
    const map = {}
    for (const row of data || []) map[row.section] = row.data
    setKonten(map)
    setMemuat(false)
  }

  useEffect(() => { muatData() }, [])

  const ubahBagian = (section, dataBaru) => {
    setKonten((prev) => ({ ...prev, [section]: dataBaru }))
  }

  const validasi = (section, data) => {
    const errs = []
    if (section === 'hero') {
      if (!data.judul?.trim()) errs.push('Judul utama wajib diisi.')
      if (!data.deskripsi?.trim()) errs.push('Deskripsi wajib diisi.')
    }
    if (section === 'tentang') {
      if (!data.judul?.trim()) errs.push('Judul wajib diisi.')
      if (!data.paragraf_1?.trim()) errs.push('Paragraf pertama wajib diisi.')
    }
    if (section === 'menu') {
      ;(data.item || []).forEach((it, i) => {
        if (!it.nama?.trim()) errs.push(`Menu baris ke-${i + 1}: nama wajib diisi.`)
        if (!it.kategori?.trim()) errs.push(`Menu baris ke-${i + 1}: kategori wajib diisi.`)
        if (it.harga !== '' && it.harga !== undefined && it.harga !== null && Number(it.harga) < 0) errs.push(`Menu baris ke-${i + 1}: harga tidak boleh negatif.`)
      })
    }
    if (section === 'ulasan') {
      if (data.rating === '' || Number(data.rating) < 0 || Number(data.rating) > 5) errs.push('Rating harus antara 0 - 5.')
      if (data.jumlah_ulasan === '' || Number(data.jumlah_ulasan) < 0) errs.push('Jumlah ulasan tidak valid.')
      ;(data.item || []).forEach((it, i) => {
        if (!it.nama?.trim()) errs.push(`Ulasan baris ke-${i + 1}: nama wajib diisi.`)
        if (!it.isi?.trim()) errs.push(`Ulasan baris ke-${i + 1}: isi ulasan wajib diisi.`)
      })
    }
    if (section === 'lokasi') {
      if (!data.alamat?.trim()) errs.push('Alamat wajib diisi.')
      if (!data.telepon?.trim()) errs.push('Telepon wajib diisi.')
      if (!data.jam_buka?.trim()) errs.push('Jam buka wajib diisi.')
      if (!data.google_maps_url?.trim() || !/^https?:\/\//.test(data.google_maps_url)) errs.push('Tautan Google Maps harus diawali http:// atau https://')
    }
    if (section === 'sosial_media') {
      ;(data.item || []).forEach((it, i) => {
        if (!it.platform) errs.push(`Media sosial baris ke-${i + 1}: platform wajib dipilih.`)
        if (!it.url?.trim() || !/^https?:\/\//.test(it.url)) errs.push(`Media sosial baris ke-${i + 1}: tautan harus diawali http:// atau https://`)
      })
    }
    if (section === 'tampilan') {
      const hex = /^#[0-9a-fA-F]{6}$/
      if (!hex.test(data.warna_latar || '')) errs.push('Warna latar tidak valid.')
      if (!hex.test(data.warna_aksen || '')) errs.push('Warna aksen tidak valid.')
    }
    return errs
  }

  const simpanBagian = async () => {
    const data = konten[tab]
    const errs = validasi(tab, data)
    if (errs.length > 0) {
      setNotif({ tipe: 'error', pesan: errs.join(' ') })
      return
    }
    setMenyimpan(true)
    const { error } = await supabase
      .from('landing_konten')
      .update({ data, updated_at: new Date().toISOString(), updated_oleh: profile?.id })
      .eq('section', tab)
    setMenyimpan(false)
    if (error) {
      setNotif({ tipe: 'error', pesan: 'Gagal menyimpan: ' + error.message })
      return
    }
    setNotif({ tipe: 'sukses', pesan: 'Konten disimpan. Perubahan langsung tampil di landing page.' })
  }

  if (memuat || !konten) return <div className="halaman-loading">Memuat konten...</div>

  const hero = konten.hero || {}
  const tentang = konten.tentang || {}
  const menu = konten.menu || { item: [] }
  const ulasan = konten.ulasan || { item: [] }
  const lokasi = konten.lokasi || {}
  const sosial = konten.sosial_media || { item: [] }
  const tampilan = konten.tampilan || { warna_latar: '#33090f', warna_aksen: '#c89b3c' }

  return (
    <div>
      <h2 className="judul-halaman">Update Konten</h2>
      <p className="teks-muted" style={{ marginTop: -8, marginBottom: 18 }}>
        Ubah isi landing page di sini — perubahan langsung tampil di website publik tanpa perlu sentuh kode.
      </p>

      <Notifikasi tipe={notif?.tipe} pesan={notif?.pesan} onClose={() => setNotif(null)} />

      <div className="tab-bar">
        {TAB_LIST.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab-item ${tab === t.key ? 'tab-item-aktif' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="kartu">
        {tab === 'hero' && (
          <>
            <label>Label kecil di atas judul</label>
            <input className="input" value={hero.kicker || ''} onChange={(e) => ubahBagian('hero', { ...hero, kicker: e.target.value })} />

            <label>Judul utama</label>
            <input className="input" value={hero.judul || ''} onChange={(e) => ubahBagian('hero', { ...hero, judul: e.target.value })} />

            <label>Deskripsi</label>
            <textarea className="input" rows={3} value={hero.deskripsi || ''} onChange={(e) => ubahBagian('hero', { ...hero, deskripsi: e.target.value })} />

            <label>Teks rating</label>
            <input className="input" value={hero.teks_rating || ''} onChange={(e) => ubahBagian('hero', { ...hero, teks_rating: e.target.value })} placeholder="Contoh: 4,4 dari 14 ulasan Google" />
          </>
        )}

        {tab === 'tentang' && (
          <>
            <label>Judul</label>
            <input className="input" value={tentang.judul || ''} onChange={(e) => ubahBagian('tentang', { ...tentang, judul: e.target.value })} />

            <label>Paragraf pertama</label>
            <textarea className="input" rows={3} value={tentang.paragraf_1 || ''} onChange={(e) => ubahBagian('tentang', { ...tentang, paragraf_1: e.target.value })} />

            <label>Paragraf kedua (opsional)</label>
            <textarea className="input" rows={3} value={tentang.paragraf_2 || ''} onChange={(e) => ubahBagian('tentang', { ...tentang, paragraf_2: e.target.value })} />

            <label>Judul daftar rempah</label>
            <input className="input" value={tentang.judul_rempah || ''} onChange={(e) => ubahBagian('tentang', { ...tentang, judul_rempah: e.target.value })} />

            <label>Daftar rempah</label>
            <RepeaterTeks value={tentang.daftar_rempah} onChange={(v) => ubahBagian('tentang', { ...tentang, daftar_rempah: v })} placeholder="Contoh: Jahe" />

            <label>Catatan di bawah daftar rempah</label>
            <textarea className="input" rows={2} value={tentang.catatan_rempah || ''} onChange={(e) => ubahBagian('tentang', { ...tentang, catatan_rempah: e.target.value })} />

            <label style={{ marginTop: 18 }}>Judul daftar manfaat</label>
            <input className="input" value={tentang.judul_manfaat || ''} onChange={(e) => ubahBagian('tentang', { ...tentang, judul_manfaat: e.target.value })} placeholder="Manfaat Bir Pletok" />

            <label>Daftar manfaat</label>
            <RepeaterTeks value={tentang.manfaat} onChange={(v) => ubahBagian('tentang', { ...tentang, manfaat: v })} placeholder="Contoh: Dapat menghangatkan tubuh" />
            <p className="teks-muted" style={{ fontSize: '0.85rem' }}>
              Kosongkan daftar ini kalau tidak ingin menampilkan bagian "Manfaat" di landing page.
            </p>
          </>
        )}

        {tab === 'menu' && (
          <>
            <div className="form-grid-2">
              <div>
                <label>Gambar mengambang — sisi kiri</label>
                <input className="input" value={menu.gambar_kiri || ''} onChange={(e) => ubahBagian('menu', { ...menu, gambar_kiri: e.target.value })} placeholder="images/produk-bir-pletok-segelas.jpg" />
              </div>
              <div>
                <label>Gambar mengambang — sisi kanan</label>
                <input className="input" value={menu.gambar_kanan || ''} onChange={(e) => ubahBagian('menu', { ...menu, gambar_kanan: e.target.value })} placeholder="images/produk-biji-ketapang-pouch.jpg" />
              </div>
            </div>
            <p className="teks-muted" style={{ fontSize: '0.85rem', marginTop: -6 }}>
              Isi dengan nama file di folder <code>images/</code> milik landing page (mis. <code>images/produk-lilin-aromaterapi.jpg</code>), atau tautan URL gambar lengkap. Hanya tampil di layar lebar.
            </p>

            <label style={{ marginTop: 14 }}>Daftar menu</label>
            <RepeaterObjek
              value={menu.item}
              onChange={(v) => ubahBagian('menu', { ...menu, item: v })}
              objekKosong={{ kategori: '', nama: '', deskripsi: '', harga: '', gambar: '' }}
              tambahLabel="+ Tambah Menu"
              fields={[
                { key: 'kategori', label: 'Kategori', type: 'text', placeholder: 'Contoh: Bir Pletok' },
                { key: 'nama', label: 'Nama menu', type: 'text', placeholder: 'Contoh: Bir Pletok 300ml' },
                { key: 'deskripsi', label: 'Deskripsi singkat (opsional)', type: 'text', placeholder: 'Contoh: Hangat atau dingin' },
                { key: 'harga', label: 'Harga (Rp) — kosongkan jika "harga menyusul"', type: 'uang', placeholder: '0' },
                { key: 'gambar', label: 'Gambar baris ini (opsional)', type: 'text', placeholder: 'images/produk-bir-pletok-botol-thumb.jpg' },
              ]}
            />

            <label style={{ marginTop: 18 }}>Catatan kaki menu</label>
            <textarea className="input" rows={2} value={menu.catatan_kaki || ''} onChange={(e) => ubahBagian('menu', { ...menu, catatan_kaki: e.target.value })} />
          </>
        )}

        {tab === 'ulasan' && (
          <>
            <div className="form-grid-2">
              <div>
                <label>Rating (0 - 5)</label>
                <input className="input" type="number" step="0.1" min="0" max="5" value={ulasan.rating ?? ''} onChange={(e) => ubahBagian('ulasan', { ...ulasan, rating: e.target.value })} />
              </div>
              <div>
                <label>Jumlah ulasan</label>
                <InputUang value={ulasan.jumlah_ulasan ?? ''} onChange={(v) => ubahBagian('ulasan', { ...ulasan, jumlah_ulasan: v })} placeholder="0" />
              </div>
            </div>

            <label style={{ marginTop: 14 }}>Daftar ulasan yang ditampilkan</label>
            <RepeaterObjek
              value={ulasan.item}
              onChange={(v) => ubahBagian('ulasan', { ...ulasan, item: v })}
              objekKosong={{ nama: '', peran: '', isi: '' }}
              tambahLabel="+ Tambah Ulasan"
              fields={[
                { key: 'nama', label: 'Nama', type: 'text', placeholder: 'Contoh: Budi' },
                { key: 'peran', label: 'Keterangan (opsional)', type: 'text', placeholder: 'Contoh: Local Guide, 10 ulasan' },
                { key: 'isi', label: 'Isi ulasan', type: 'textarea', placeholder: 'Tulis ulasannya di sini...' },
              ]}
            />
          </>
        )}

        {tab === 'lokasi' && (
          <>
            <label>Alamat</label>
            <textarea className="input" rows={2} value={lokasi.alamat || ''} onChange={(e) => ubahBagian('lokasi', { ...lokasi, alamat: e.target.value })} />

            <label>Jam buka</label>
            <input className="input" value={lokasi.jam_buka || ''} onChange={(e) => ubahBagian('lokasi', { ...lokasi, jam_buka: e.target.value })} />

            <div className="form-grid-2">
              <div>
                <label>Telepon / WhatsApp</label>
                <input className="input" value={lokasi.telepon || ''} onChange={(e) => ubahBagian('lokasi', { ...lokasi, telepon: e.target.value })} />
              </div>
              <div>
                <label>Layanan</label>
                <input className="input" value={lokasi.layanan || ''} onChange={(e) => ubahBagian('lokasi', { ...lokasi, layanan: e.target.value })} placeholder="Contoh: Dine-in dan takeaway" />
              </div>
            </div>

            <label>Tautan Google Maps</label>
            <input className="input" value={lokasi.google_maps_url || ''} onChange={(e) => ubahBagian('lokasi', { ...lokasi, google_maps_url: e.target.value })} />

            <label>Info tambahan (opsional)</label>
            <textarea className="input" rows={2} value={lokasi.catatan || ''} onChange={(e) => ubahBagian('lokasi', { ...lokasi, catatan: e.target.value })} placeholder="Contoh: Menerima pesanan galon untuk acara Keluarga, Pernikahan, Reuni, Arisan, Rapat Kantor, dll." />

            <div className="form-grid-2">
              <div>
                <label>Latitude</label>
                <input className="input" type="number" step="any" value={lokasi.latitude ?? ''} onChange={(e) => ubahBagian('lokasi', { ...lokasi, latitude: e.target.value })} />
              </div>
              <div>
                <label>Longitude</label>
                <input className="input" type="number" step="any" value={lokasi.longitude ?? ''} onChange={(e) => ubahBagian('lokasi', { ...lokasi, longitude: e.target.value })} />
              </div>
            </div>
            <p className="teks-muted" style={{ fontSize: '0.85rem' }}>
              Latitude/longitude dipakai untuk peta di landing page. Ambil dari Google Maps: klik kanan titik lokasi → koordinat akan tersalin.
            </p>
          </>
        )}

        {tab === 'sosial_media' && (
          <>
            <label>Akun media sosial</label>
            <RepeaterObjek
              value={sosial.item}
              onChange={(v) => ubahBagian('sosial_media', { ...sosial, item: v })}
              objekKosong={{ platform: 'instagram', url: '', label: '' }}
              tambahLabel="+ Tambah Akun"
              fields={[
                { key: 'platform', label: 'Platform', type: 'select', options: OPSI_PLATFORM },
                { key: 'url', label: 'Tautan (URL)', type: 'text', placeholder: 'https://instagram.com/namaakun' },
                { key: 'label', label: 'Teks tampilan (opsional)', type: 'text', placeholder: '@birpletokcempedak' },
              ]}
            />
            <p className="teks-muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>
              Kosongkan daftar ini kalau belum punya media sosial — bagian ini otomatis tidak tampil di landing page.
            </p>
          </>
        )}

        {tab === 'tampilan' && (
          <>
            <div className="form-grid-2">
              <div>
                <label htmlFor="warnaLatar">Warna latar utama website</label>
                <div className="color-field">
                  <input
                    id="warnaLatar"
                    type="color"
                    value={tampilan.warna_latar || '#33090f'}
                    onChange={(e) => ubahBagian('tampilan', { ...tampilan, warna_latar: e.target.value })}
                  />
                  <input
                    className="input"
                    value={tampilan.warna_latar || ''}
                    onChange={(e) => ubahBagian('tampilan', { ...tampilan, warna_latar: e.target.value })}
                    placeholder="#33090f"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="warnaAksen">Warna aksen (tombol, judul emas)</label>
                <div className="color-field">
                  <input
                    id="warnaAksen"
                    type="color"
                    value={tampilan.warna_aksen || '#c89b3c'}
                    onChange={(e) => ubahBagian('tampilan', { ...tampilan, warna_aksen: e.target.value })}
                  />
                  <input
                    className="input"
                    value={tampilan.warna_aksen || ''}
                    onChange={(e) => ubahBagian('tampilan', { ...tampilan, warna_aksen: e.target.value })}
                    placeholder="#c89b3c"
                  />
                </div>
              </div>
            </div>
            <p className="teks-muted" style={{ fontSize: '0.85rem', marginTop: 10 }}>
              Warna latar dipakai untuk latar belakang gelap di seluruh landing page (bagian yang lebih terang
              dihitung otomatis dari warna ini). Warna aksen dipakai untuk tombol, judul, dan garis dekorasi.
            </p>
          </>
        )}

        <div className="form-aksi">
          <button type="button" className="btn btn-emas" onClick={simpanBagian} disabled={menyimpan}>
            {menyimpan ? 'Menyimpan...' : 'Simpan Bagian Ini'}
          </button>
        </div>
      </div>
    </div>
  )
}
