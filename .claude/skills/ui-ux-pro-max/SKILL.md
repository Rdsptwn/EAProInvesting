---
name: ui-ux-pro-max
description: Panduan desain UI/UX untuk halaman situs: hierarki, tipografi, warna, spasi, aksesibilitas, responsif. Pakai saat membuat atau merapikan tampilan (kartu rekomendasi, watchlist, halaman pasar, widget Tido).
---

# UI/UX (versi ringkas mandiri, diadaptasi dari nextlevelbuilder/ui-ux-pro-max-skill)

## Urutan kerja
1. Tentukan audiens, tugas utama halaman, dan satu aksi paling penting.
2. Pakai token warna/font yang sudah ada di situs; jangan menambah gaya baru tanpa alasan.
3. Mobile dulu (lebar 360-430px), lalu lebarkan ke desktop.
4. Cek daftar di bawah sebelum selesai, lalu uji di Playwright (lihat CLAUDE.md).

## Aksesibilitas
- Kontras teks minimal 4.5:1 (teks besar 3:1). Jangan andalkan warna saja untuk makna (naik/turun juga pakai tanda +/-).
- Fokus keyboard terlihat; semua kontrol bisa dijangkau tab. Target sentuh minimal 44x44px.
- Teks alt untuk gambar bermakna; hormati `prefers-reduced-motion`.

## Tata letak dan spasi
- Skala spasi konsisten (4/8px). Gutter 16px di ponsel, tanpa scroll horizontal.
- Satu elemen paling menonjol per layar; kelompokkan hal terkait; jangan dempet-dempetan.
- Panjang baris teks di bawah 80 karakter; line-height 1.5-1.7 untuk badan teks.

## Komponen dan teks
- Tombol memakai kata kerja spesifik ("Simpan perubahan", bukan "Submit"). Nama aksi sama di seluruh alur.
- Ada status hover, fokus, aktif, nonaktif, dan loading.
- Error menjelaskan apa yang salah dan cara memperbaikinya. Keadaan kosong mengarahkan ke aksi.
- Animasi singkat (150-300ms), hanya untuk menjelaskan perubahan.
- Data/grafik: label sumbu dan satuan jelas, tanpa 3D, angka tabel rata kanan, selalu tampilkan tanggal/waktu data.

## Performa
- Gambar berukuran sesuai dan lazy-load; tetapkan width/height agar tidak layout shift.

## Hindari
- Emoji sebagai ikon struktural, kartu identik di mana-mana, gradien dekoratif tanpa fungsi, teks di atas gambar tanpa overlay.
