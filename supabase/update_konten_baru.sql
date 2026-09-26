-- =====================================================================
-- UPDATE ISI KONTEN LANDING PAGE (sesuai dokumen WEBSITE.docx)
-- Jalankan di Supabase SQL Editor. Ini meng-update data yang SUDAH ADA
-- di tabel landing_konten -- bukan menambah baris baru, aman dijalankan
-- kapan saja, dan bisa ditimpa lagi lewat menu Content > Update Konten
-- di aplikasi admin kalau mau diubah lagi nanti.
-- =====================================================================

update public.landing_konten set data = '{
  "kicker": "Etalase Betawi · Srengseng Sawah, Jagakarsa",
  "judul": "Sebelas rempah, satu kehangatan Betawi",
  "deskripsi": "Bir Pletok Cempedak Lestari meracik bir pletok asli, minuman tradisional Betawi tanpa alkohol, dari jahe, kayu secang, dan rempah pilihan lain. Bisa langsung diminum ataupun dibawa pulang.",
  "teks_rating": "4,4 dari 14 ulasan Google"
}'::jsonb
where section = 'hero';

update public.landing_konten set data = '{
  "judul": "Bir tanpa alkohol, warisan yang tetap hidup",
  "paragraf_1": "Pada masa kolonial, orang Belanda gemar menikmati bir dan wine dalam setiap perayaan. Masyarakat Betawi yang mayoritas Muslim tidak bisa ikut minum minuman beralkohol itu, sehingga mereka meracik versi mereka sendiri dari rempah nusantara. Banyaknya rempah-rempah sebagai bahan baku penyusunnya, menjadikan bir pletok ke dalam salah satu minuman kesehatan serta halal.",
  "paragraf_2": "Kenapa dinamakan Bir Pletok? Kata Bir sendiri diambil dari kata Bi'\''run (Bahasa Arab) yang mempunyai arti sumber mata air, bukan diambil dari kata Beer yang mempunyai arti bir yaitu minuman yang memabukkan. Sedangkan kata Pletok diambil dari racikan minuman Bir yang sudah jadi, dimasukkan ke dalam ketel ditambah es batu kemudian dikocok-kocok dan mengeluarkan bunyi pletok-pletok.",
  "judul_rempah": "Racikan rempah kami",
  "daftar_rempah": ["Jahe", "Serai", "Cengkeh", "Biji pala", "Daun jeruk", "Daun pandan", "Kayu secang", "Kayu manis", "Kayu masoyi", "Kapulaga", "Lada"],
  "catatan_rempah": "Direbus perlahan lalu disaring, tanpa fermentasi dan tanpa alkohol — aman diminum semua kalangan, dari anak-anak hingga lansia.",
  "judul_manfaat": "Manfaat Bir Pletok",
  "manfaat": ["Dapat menghangatkan tubuh", "Meredakan nyeri lambung", "Memperlancar sistem pencernaan", "Memperlancar peredaran darah"]
}'::jsonb
where section = 'tentang';

update public.landing_konten set data = '{
  "catatan_kaki": "Harga dapat berubah sewaktu-waktu. Hubungi kami untuk menu lengkap dan ketersediaan harian.",
  "gambar_kiri": "images/produk-bir-pletok-segelas.jpg",
  "gambar_kanan": "images/produk-biji-ketapang-pouch.jpg",
  "item": [
    {"kategori": "Bir Pletok", "nama": "Bir Pletok 300ml", "deskripsi": "", "harga": 15000, "gambar": "images/produk-bir-pletok-segelas-thumb.jpg"},
    {"kategori": "Bir Pletok", "nama": "Bir Pletok 500ml", "deskripsi": "", "harga": 23000, "gambar": "images/produk-bir-pletok-botol-thumb.jpg"},
    {"kategori": "Bir Pletok", "nama": "Bir Pletok 600ml", "deskripsi": "", "harga": 25000, "gambar": "images/produk-bir-pletok-botol-thumb.jpg"},
    {"kategori": "Biji Ketapang", "nama": "Biji Ketapang 200gr", "deskripsi": "", "harga": 25000, "gambar": "images/produk-biji-ketapang-pouch-thumb.jpg"},
    {"kategori": "Biji Ketapang", "nama": "Biji Ketapang 300gr", "deskripsi": "", "harga": 35000, "gambar": "images/produk-biji-ketapang-toples-thumb.jpg"},
    {"kategori": "Biji Ketapang", "nama": "Biji Ketapang 500gr", "deskripsi": "", "harga": 55000, "gambar": "images/produk-biji-ketapang-pouch-thumb.jpg"},
    {"kategori": "Biji Ketapang", "nama": "Biji Ketapang 1kg", "deskripsi": "", "harga": 110000, "gambar": "images/produk-biji-ketapang-toples-thumb.jpg"},
    {"kategori": "Oleh-oleh & Hampers", "nama": "Gantungan Kunci Ondel-Ondel", "deskripsi": "", "harga": 25000, "gambar": ""},
    {"kategori": "Oleh-oleh & Hampers", "nama": "Lilin Aromaterapi Rempah Bir Pletok", "deskripsi": "", "harga": 55000, "gambar": "images/produk-lilin-aromaterapi-thumb.jpg"},
    {"kategori": "Oleh-oleh & Hampers", "nama": "Bahan Bir Pletok", "deskripsi": "", "harga": null, "gambar": ""},
    {"kategori": "Oleh-oleh & Hampers", "nama": "Hampers", "deskripsi": "", "harga": null, "gambar": ""}
  ]
}'::jsonb
where section = 'menu';

update public.landing_konten set data = data || '{
  "jam_buka": "08.00 – 17.00 WIB",
  "catatan": "Menerima pesanan galon untuk acara: Keluarga, Pernikahan, Reuni, Arisan, Rapat Kantor, dll."
}'::jsonb
where section = 'lokasi';
