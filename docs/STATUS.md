# Status Proyek: Update Tertunda & Data Belum Terisi

Diperbarui: **27 Nov 2026**. Ringkasan apa yang sudah jalan, apa yang menunggu tindakan, dan data yang masih kosong.

## 1. Sudah jalan (data live di situs)

| Area | Isi | Pembaruan |
|------|-----|-----------|
| IHSG | 898 saham berharga dari 956 daftar BEI; sektor, status emiten (HSC/suspensi/UMA), konglo, lapkeu | Workflow `daily-market-sync`, `sync-funda-idx` |
| Indeks BEI | LQ45, IDX80, ISSI (579), JII, JII70, SRI-KEHATI, ESG, dll. (impor xlsx BEI) | Manual, lihat 3.1 |
| Broker | Peringkat 91 broker BEI | `sync-broker` |
| Global | 2.649 saham & ETF AS, fundamental (26 shard), anggota S&P 500 / Nasdaq 100 / Dow / Russell 2000 (perkiraan) | `sync-global`, `sync-global-funda` |
| Saham terkait indeks dunia | 18 indeks (KOSPI, CAC, DAX, Nikkei, dst.), 18–24 perusahaan terbesar tiap indeks | `sync-global` (`global-intl.json`) |
| Syariah Global | Estimasi otomatis: 1.123 lolos, 1.311 tidak lolos, 36 tanpa data | `sync-global-funda` |
| Kripto | 162 koin, Fear & Greed, tab Listing (40 pengumuman Binance + 10 trending CoinGecko) | `sync-24jam` (24 jam) |
| Forex & emas | 31 pasangan termasuk XAU/USD, XAG/USD, PAXG, XAUT | `sync-24jam` (24 jam) |
| Rekomendasi Bot | 5 kategori (BoW, Breakout Resist, Trendline naik, Breakout Trendline, Rumor/Berita) untuk IHSG, Global, Kripto, Forex; tanda konglo di IHSG | Dihitung di browser dari candle (`picks-engine.js`) |
| Watchlist dan Zona Pantauan | Watchlist: IHSG, komoditas, reksa dana. Global/Kripto/Forex di Zona Pantauan halaman masing-masing; label TARGET HIT (TP), KENA CL, DI AREA BELI | Tersimpan di browser |
| Berita | RSS: CNBC Indonesia, IDX Channel, Bloomberg Technoz, Antara, Liputan6, Okezone, Detik Finance; HTML: Stockbit Snips, Bibit, Mirae (belum dites ke situs asli) | `sync-24jam` |
| Peta Konglo | 37 grup, 266 emiten dengan data Stockbit 26 Nov 2026; kekayaan pemilik USD dan IDR (kurs di `konglo-profil.json` meta.fx) | `tools/build-konglo-map.mjs` setelah edit |
| Chat Tido | Command `/pagi /siang /swing /scalp` dengan budget (≤500/1000), `/rd`, `/istilah`, `/topreturn`, router bahasa natural, maskot animasi | `assets/js/ewoks-core.js`, `chat-cmds.js`, `mascot.js` |
| Lapkeu IDX | 351 emiten Yahoo + 622 emiten BEI (Financial Data and Ratio, tanpa arus kas) | `sync-funda-idx`, impor `tools/import-bei-fin.py` |
| Jurnal Multi-pasar | Global, Bitcoin, Forex; ekspor/impor JSON & CSV | Tersimpan di browser (localStorage) |

## 2. Menunggu tindakan Anda (manual)

1. **Deploy ulang Worker `worker/yahoo-proxy.js`.** Versi yang jalan (`v14-global`) belum punya pemicu `sync-live.yml`. Setelahnya Cron Trigger boleh dirapatkan ke tiap 5 menit (sekarang `0 * * * *`).
2. **Google Search Console:** daftarkan situs dan kirim `sitemap.xml`.
3. **GitHub → Actions:** jalankan `Sync funda cash flow` dan `Sync return 5 tahun` tiap awal bulan atau mingguan; cek rantai `workflow_run` dan loop live jam bursa.
4. **Cek berita HTML:** setelah `sync-24jam`, lihat `meta.status` di `assets/data/global-news.json`. Jika Stockbit, Bibit, atau Mirae 0 item, pola URL/tanggal di `tools/build-global.mjs` perlu disesuaikan.
5. **Lihat di browser asli:** kartu bot Global/Kripto/Forex, Zona Pantauan, bintang Pantau, dan profil kekayaan konglo (baru dites offline).
6. **ISSI:** periode berikutnya belum terbit per 27 Nov; impor setelah rilis (`tools/import-bei-indices.py`).
7. **Aturan 2027:** ARB 35% direncanakan mulai 1 Jan 2027 (ARB 7% sampai 31 Des 2026); cek pengumuman BEI akhir Desember lalu perbarui tab Aturan Bursa di `edukasi.html`.
8. Hard refresh (Ctrl+Shift+R) bila tampilan lama masih muncul.

## 3. Update berkala yang tertunda

### 3.1 Daftar indeks BEI (impor manual)
- LQ45 / IDX80 berlaku sampai **29 Jan 2027**; ISSI sampai **30 Nov 2026** (periode baru mulai 1 Des 2026).
- Cara: unduh xlsx evaluasi dari BEI → `python3 tools/import-bei-indices.py <folder>` → bump versi aset → push.

### 3.2 Worker (harga live)
- Kuota gratis Gemini/Groq dibagi semua pengunjung; bila habis widget menampilkan pesan "lagi penuh". Cadangan: isi lebih dari satu penyedia.

### 3.3 Pending produk
- **Bot WA** (BOT_KEY, pindah ke VPS) ditunda; fokus ke web. Catatan ada di proyek Claude (`PR-bot-wa-vps.md`).
- **Sinkron jurnal antar perangkat** (butuh login + penyimpanan server). Sekarang hanya per browser.
- **Perbaikan tampilan mobile** halaman Bitcoin & Forex.
- Bintang di screener Global memakai penyimpanan terpisah (`ewoks_gwatch`), belum menyatu dengan Zona Pantauan Global.

## 4. Data yang belum terisi

| Data | Kondisi | Penyebab / jalan keluar |
|------|---------|-------------------------|
| 58 saham IDX tanpa harga | Ada di daftar BEI, tidak ada harga | Sebagian besar suspensi panjang; 23 Nov 2026: 62 emiten suspensi (Bisnis, 5 Nov) + WIKA, TMPO, ARKO, TFCO, MKNT, CSMI ditandai SUSPEN di `idx-status-manual.json`; 33 emiten ditandai DELIST (18 efektif 10 Nov 2026, 13 pada 2025, CNTX 30 Jul 2026). IIKP, META, OCAP, SCPI ditandai SUSPEN (dicek pengguna 23 Nov); NGLS tidak ditemukan di Stockbit (belum ditandai) |
| Buy / Sell / Net per broker | Kosong | BEI tidak menerbitkan; menunggu data "bandar" dari Anda |
| Upbit di Berita Listing Kripto | Gagal (HTTP 403) | Upbit memblokir server GitHub. Listing Binance dan trending CoinGecko tetap jalan |
| Koin MEW dan POPCAT | Tidak ketemu di Yahoo | Kode koin belum terdaftar; akan ikut otomatis bila muncul |
| Russell 2000 | **Perkiraan** (kapitalisasi peringkat 1.001–3.000), bukan daftar resmi | iShares memblokir unduhan CSV; ada label di UI |
| Syariah Global | **Estimasi**, bukan fatwa | Rasio resmi memerlukan kapitalisasi pasar & pendapatan bunga yang tidak tersedia |
| 32 ticker kolam US lama | Tidak ada di Yahoo | Sudah diakuisisi/ganti nama (SQ→XYZ, MRO, HES, PXD, dst.) |
| 124 ticker kolam IDX lama | Tidak ada di daftar BEI | Ticker lama atau salah ketik (MAND, TOTAL, ZENC, dst.) |
| Saham terkait: 5 indeks | Hanya perusahaan terbesar, bukan seluruh anggota | Daftar anggota lengkap non-AS belum tersedia gratis |
| Berkas `kolam_global.json` bot | Belum pernah diterima | Bot WA ditunda |
| Funda 8 emiten: FORZ, KPAL, KPAS, KRAH, MAMI, MYRX, NGLS, NIPS | Kosong | Tidak ada di Yahoo; pencarian web (27 Nov) tidak menemukan data multi-tahun yang bisa dipakai, jadi dibiarkan kosong |
| Kekayaan konglo tanpa angka | Bakrie, Panin, Tommy Soeharto, PAM, Provident, Danatama | Tidak ada angka terbuka yang layak (tidak masuk Forbes); Tomy Winata (Globe Asia 2016) dan Lo Kheng Hong (4 saham, 2023) hanya angka lama |
| Fraksi harga setelah harga minimum Rp1 (28 Sep 2026), siklus T+2, biaya broker 2026 | Belum terverifikasi | Teks resmi BEI belum ditemukan; ditandai di `edukasi.html` |


### 4.1 Hasil audit 22 Nov 2026 (belum bisa diisi dari sini)
- Server kerja Claude tidak boleh mengakses Yahoo/Binance/situs lain (hanya paket npm/pip), jadi data baru dan gambar tidak bisa diunduh dari sana. Pengisian otomatis hanya lewat GitHub Actions.
- Logo emiten IDX: 263 dari 898 punya berkas lokal (`assets/img/logos`); sisanya otomatis memakai favicon domain (`logos.json`) lalu inisial. Tidak ada yang rusak, hanya tampil inisial.
- Laporan keuangan IDX (`funda-idx.json`): 351 emiten dari Yahoo + 614 dari BEI "Financial Data and Ratio" (`tools/import-bei-fin.py`, 23 Nov). Emiten BEI: kolom terbaru terisi (3/6/9 bulan kumulatif, ditandai `latestMonths`; 61 emiten laporan lama ditandai `stale`), tahunan terisi (dari file Apr 2021-2026) untuk 2020: 139, 2021: 317, 2022: 366, 2023: 358, 2024: 306, 2025: 511 dari 622 emiten BEI (file April + Maret 2020-2025; file bulanan hanya memuat tahunan bagi emiten yang belum lapor kuartal I), tanpa arus kas dan dividen. File bulanan BEI berisi laporan terbaru bulan itu (Dec = kuartal III; May = kuartal I), bukan tahunan; untuk tahunan pakai file bulan April tiap tahun (teruji). 15 emiten tanpa nama/sektor: 14 diisi dari BEI, tersisa NGLS.
- Koin `WLFI-USD` belum punya harga di `crypto.json`; MEW dan POPCAT belum ketemu.
- Return 5 tahun: workflow `Sync return 5 tahun` (`tools/build-ret5y.mjs`) menghasilkan `idx-ret.json`; sebelum dijalankan, `/topreturn` memakai fallback 52 minggu. Tido sudah dites dengan data tiruan saja.
- Chat: command `/pagi /siang /swing /scalp` kini menerima budget (`/swing idx 500`, `/scalp global 10`) dan bahasa natural ("tido, swing di bawah 500").

- Arus kas/dividen emiten BEI: workflow baru **Sync funda cash flow** (`tools/build-funda-cf.mjs`, manual atau Sabtu 10:00 WIB) mencoba mengisinya dari Yahoo; belum pernah dijalankan. Emiten yang tidak ada di Yahoo tetap 0.

## 5. Catatan teknis singkat
- Semua data disajikan sebagai snapshot dari GitHub Actions; harga live memakai Binance (kripto) dan Worker (`/gquotes`, `/quotes`).
- Data yang gagal diambil tidak menimpa data lama (`writeSafe`).
- Konten bersifat edukasi, bukan rekomendasi beli/jual.
