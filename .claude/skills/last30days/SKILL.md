---
name: last30days
description: Riset topik dari 30 hari terakhir lewat WebSearch/WebFetch lalu rangkum temuan bersumber. Pakai untuk cek berita emiten, suspensi/delisting, kebijakan BI/Fed, atau sentimen pasar terkini.
---

# Last 30 days (adaptasi ringan berbasis WebSearch)

Versi asli (mvanhorn/last30days-skill) memakai skrip Python dan API key; versi ini hanya memakai WebSearch/WebFetch.

## Langkah
1. Ambil tanggal hari ini dari sistem; jendela = 30 hari ke belakang.
2. Jalankan beberapa pencarian paralel dengan angle berbeda: berita utama, sumber resmi (BEI, OJK, BI), diskusi komunitas. Pakai bulan dan tahun saat ini di query.
3. Buka (WebFetch) 3-6 hasil paling relevan dan baca isinya, jangan hanya snippet. Shell tidak bisa menjangkau situs luar; pakai WebFetch.
4. Buang hasil di luar jendela 30 hari kecuali untuk latar. Catat tanggal tiap temuan.
5. Silang-cek klaim penting dengan minimal dua sumber; tandai yang satu sumber atau rumor.

## Keluaran
- 3-5 poin: apa yang baru, siapa yang bicara, apa yang diperdebatkan.
- Hal yang belum jelas atau belum terverifikasi.
- Daftar "Sumber:" format [Judul](URL) beserta tanggal.

Untuk data repo (suspensi, BI Rate, Fed Rate): catat `asOf` dan sumber di JSON-nya. Jangan memakai angka atau kutipan dari ingatan.
