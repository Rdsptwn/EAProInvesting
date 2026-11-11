<div align="center">

<img src="assets/img/banner.svg" alt="Ewoks Academy Pro" width="100%">

<br>

[![Live](https://img.shields.io/badge/LIVE-rdsptwn.github.io-2563eb?style=for-the-badge&logo=github&logoColor=white)](https://rdsptwn.github.io/EAProInvesting/)
[![Data](https://img.shields.io/badge/DATA-update%20otomatis-10b981?style=for-the-badge&logo=githubactions&logoColor=white)](#-update-data-otomatis)
[![Harga](https://img.shields.io/badge/HARGA%20LIVE-10%20menit-f59e0b?style=for-the-badge&logo=cloudflare&logoColor=white)](#-harga-live-opsional)
[![License](https://img.shields.io/badge/LICENSE-All%20Rights%20Reserved-64748b?style=for-the-badge)](LICENSE)

![HTML5](https://img.shields.io/badge/HTML5-e34f26?logo=html5&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-0ea5e9?logo=tailwindcss&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-ff6384?logo=chartdotjs&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088ff?logo=githubactions&logoColor=white)
![Node](https://img.shields.io/badge/Node-20+-339933?logo=nodedotjs&logoColor=white)

**Platform edukasi investasi dan tools analisis pasar modal Indonesia.**
Data pasar, laporan keuangan, dan peta kepemilikan konglomerat, tanpa backend dan tanpa biaya server.

[**Buka Situs →**](https://rdsptwn.github.io/EAProInvesting/)

</div>

---

## ✨ Fitur Utama

| | Modul | Isi |
|---|---|---|
| 🏠 | **Beranda** | IHSG, sentimen pasar, inflasi, yield SBN, **BI 7-Day RR Rate**, **Fed Rate**, aktivitas perdagangan (All Market / Regular / Nego), top gainer-loser, berita, kalender korporasi |
| 🧭 | **Peta Konglo** | Grup konglomerat, kepemilikan emiten, harga, laporan keuangan 2020–2026 |
| 🌏 | **Pasar Global** | 130+ ETF, reksa dana, dan SBN: klasifikasi pasar, CAGR, return per tahun |
| 🏦 | **Broker** | Database 94 broker BEI (ritel, asing, lokal) |
| 📚 | **Edukasi** | Makro dan saham, laporan keuangan, fixed income, bandarmologi, kuis profil risiko |
| 🧮 | **Tools** | Terminal watchlist dan screener, jurnal trading, trading plan, kalkulator bandar, dana pensiun, compounding, dana darurat |

Tampilan memakai tema **Aurora**: terang atau gelap, kartu kaca, gradien indigo–magenta–aqua, ilustrasi grafik animasi di beranda. Animasi otomatis mati bila perangkat memilih *reduced motion*.

## 🔄 Update Data Otomatis

Bot GitHub Actions meng-commit data ke repo, jadi situs berisi data terbaru tanpa edit manual.

| Data | Jadwal | Workflow |
|------|--------|----------|
| IHSG, harga emiten, kalender korporasi, inflasi, yield SBN, BI Rate, Fed Rate, ETF | Tiap jam, Senin–Jumat (09.00–17.00 WIB) | `daily-market-sync` |
| Aktivitas perdagangan BEI (nilai, volume, frekuensi) | Tiap jam, Senin–Jumat | `market-activity-intraday` |
| Laporan keuangan emiten | Senin–Jumat 18.30 WIB | `sync-funda-idx` |
| Cache aset (`?v=`) | Setiap data berubah | otomatis |

**Soal kesegaran data.** BEI hanya menerbitkan ringkasan perdagangan **setelah penutupan**, jadi kartu Aktivitas Perdagangan menampilkan data penutupan terakhir beserta jam pengecekan, bukan angka real-time. Harga saham dan IHSG yang lebih dekat ke real-time datang dari Worker di bawah.

**Pemicu tepat waktu.** Jadwal `cron` bawaan GitHub sering tertunda berjam-jam. Karena itu Cloudflare Worker (Cron Trigger) memicu kedua workflow tiap jam lewat `workflow_dispatch`. Pemasangannya ada di [`worker/README.md`](worker/README.md).

> **Cek:** repo → **Actions**. Run bertanda `workflow_dispatch` pada jam genap berarti Cron Trigger bekerja.

## ⚡ Harga Live (opsional)

Harga IHSG dan emiten diperbarui tiap 10 menit saat jam bursa lewat Cloudflare Worker gratis (data IDX di Yahoo tertunda ±10 menit). Tanpa Worker, situs memakai snapshot terakhir. Bila koneksi ke Worker gagal, kartu Market Sentiment mencantumkan alasannya.
Panduan pasang: [`worker/README.md`](worker/README.md).

## 🗂️ Struktur Proyek

```text
.
├── *.html                   Halaman (beranda, konglo, pasar-global, tools, edukasi)
├── assets/
│   ├── css/app.css          Komponen dasar (kartu, nav, input)
│   ├── css/theme.css        Tema Aurora (terang/gelap, hero, kontras)
│   ├── js/ewoks-core.js     Navigasi, live price, snapshot, aktivitas pasar
│   ├── js/pages/            Logika per halaman
│   ├── data/                JSON hasil bot (snapshot, lapkeu, macro, pasar-global)
│   └── img/                 Logo EA dan banner
├── tools/                   Skrip build data (Node 20+)
├── worker/                  Cloudflare Worker proxy harga live
└── .github/workflows/       Sinkron data otomatis
```

## 🛠️ Jalankan Lokal

```bash
node tools/build-market-snapshot.mjs   # IHSG + harga emiten
node tools/build-funda-idx.mjs --force # laporan keuangan
node tools/build-pasar-global.mjs      # CAGR + return tahunan ETF
node tools/build-macro.mjs             # inflasi, yield SBN, BI Rate, Fed Rate
node tools/build-market-activity.mjs   # aktivitas BEI (butuh Playwright)
node tools/bump-asset-version.mjs      # ganti versi cache
```

Situs ini statis, jadi cukup buka lewat server file apa saja (misalnya `npx serve`).
Jurnal dan watchlist tersimpan di browser (localStorage); gunakan Backup/Restore di situs.

## 🚀 Deploy

Push ke `main` → GitHub Pages. Setelah push, hard refresh (Ctrl+F5). Pages kadang butuh 1–2 menit.
Commit manual harus ikut menyertakan file data di `assets/data/` supaya situs tidak kembali ke versi lama.

## ⚖️ Lisensi

© 2026 Rakaditya Septiawan / Ewoks Academy. **All rights reserved.** Kode, konten, data, dan logo tidak boleh disalin atau didistribusikan ulang tanpa izin tertulis. Lihat [LICENSE](LICENSE).

## ⚠️ Disclaimer

Seluruh konten untuk edukasi, **bukan** saran beli atau jual. Data bisa tertunda atau berbeda dari sumber resmi. Lakukan riset sendiri (DYOR).
