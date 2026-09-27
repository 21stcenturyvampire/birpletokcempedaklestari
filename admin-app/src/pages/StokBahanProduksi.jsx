import PersediaanTampilan from '../components/PersediaanTampilan'

export default function StokBahanProduksi() {
  return (
    <PersediaanTampilan
      judul="Stok Bahan Produksi"
      deskripsi="Bahan baku untuk produksi (rempah, gula, kemasan, dll) — bagian dari data yang sama dengan Barang & Stok, hanya disaring khusus bahan baku."
      jenisFilter="bahan_baku"
    />
  )
}
