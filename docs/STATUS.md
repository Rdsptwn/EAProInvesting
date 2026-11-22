# Status Proyek: Update Tertunda & Data Belum Terisi

Diperbarui: **22 Nov 2026**. Ringkasan apa yang sudah jalan, apa yang menunggu tindakan, dan data yang masih kosong.

## 1. Sudah jalan (data live di situs)

| Area | Isi | Pembaruan |
|------|-----|-----------|
| IHSG | 898 saham berharga dari 956 daftar BEI; sektor, status emiten (HSC/suspensi/UMA), konglo, lapkeu | Workflow `daily-market-sync`, `sync-funda-idx` |
| Indeks BEI | LQ45, IDX80, ISSI (579), JII, JII70, SRI-KEHATI, ESG, dll. (impor xlsx BEI) | Manual, lihat 3.1 |
| Broker | Peringkat 91 broker BEI | `sync-broker` |
| Global | 2.649 saham & ETF AS, fundamental (26 shard), anggota S&P 500 / Nasdaq 100 / Dow / Russell 2000 (perkiraan) | `sync-global`, `sync-global-funda` |
| Saham terkait indeks dunia | 18 indeks (KOSPI, CAC, DAX, Nikkei, dst.), 18–24 perusahaan terbesar tiap indeks | `sync-global` (`global-intl.json`) |
| Syariah Global | Estimasi otomatis: 1.123 lolos, 1.311 tidak lolos, 36 tanpa data | `sync-global-funda` |
| Kripto | 162 koin, Fear & Greed, tab Listing (40 pengumuman Binance + 10 trending CoinGecko) | `sync-global` |
| Forex & emas | 31 pasangan termasuk XAU/USD, XAG/USD, PAXG, XAUT | `sync-global` |
| Terminal / Watchlist | Rekomendasi bot BoW (Area BoW, TP, Strict CL) | Dihitung di browser dari screener |
| Jurnal Multi-pasar | Global, Bitcoin, Forex; ekspor/impor JSON & CSV | Tersimpan di browser (localStorage) |

## 2. Menunggu tindakan Anda (manual)

1. **Cloudflare Worker `ewoks-live` → versi v8.** Tempel `worker/yahoo-proxy.js` terbaru lalu Deploy. Cek `/health`: harus `version: v8-ask`.
2. **Aktifkan asisten tanya-jawab.** Tambah secret di Worker: `GEMINI_KEY` (Google AI Studio) dan opsional `GROQ_KEY`; atau binding Workers AI bernama `AI`. Tanpa ini widget 💬 menjawab "belum diaktifkan".
3. **Hubungkan bot WA ke otak yang sama.** Secret Worker `BOT_KEY`; di `.env` bot: `EWOKS_ASK_URL` dan `EWOKS_BOT_KEY`; ganti `index.js` bot dengan versi yang sudah dipatch.
4. **Ganti kolam bot** dengan file terbersih: `kolam_idx.json` (898), `kolam_us.json` (416), `kolam_crypto.json` (162), `kolam_forex.json` (31).
5. **Hard refresh (Ctrl+Shift+R)** bila tampilan lama masih muncul (cache browser/Pages 1–2 menit).

## 3. Update berkala yang tertunda

### 3.1 Daftar indeks BEI (impor manual)
- LQ45 / IDX80 berlaku sampai **29 Jan 2027**; ISSI sampai **30 Nov 2026** (periode baru mulai 1 Des 2026).
- Cara: unduh xlsx evaluasi dari BEI → `python3 tools/import-bei-indices.py <folder>` → bump versi aset → push.

### 3.2 Worker (harga live)
- Kuota gratis Gemini/Groq dibagi semua pengunjung; bila habis widget menampilkan pesan "lagi penuh". Cadangan: isi lebih dari satu penyedia.

### 3.3 Pending produk
- **PR bot WA ke server 24 jam** (VPS + pm2). Bot saat ini jalan di PC pribadi; mati bila PC mati. Catatan lengkap ada di proyek Claude (`PR-bot-wa-vps.md`).
- **Sinkron jurnal antar perangkat** (butuh login + penyimpanan server). Sekarang hanya per browser.
- **Perbaikan tampilan mobile** halaman Bitcoin & Forex.

## 4. Data yang belum terisi

| Data | Kondisi | Penyebab / jalan keluar |
|------|---------|-------------------------|
| 58 saham IDX tanpa harga | Ada di daftar BEI, tidak ada harga | Sebagian besar suspensi panjang; 23 Nov 2026: 62 emiten suspensi (Bisnis, 5 Nov) + WIKA, TMPO, ARKO, TFCO, MKNT, CSMI ditandai SUSPEN di `idx-status-manual.json` |
| Buy / Sell / Net per broker | Kosong | BEI tidak menerbitkan; menunggu data "bandar" dari Anda |
| Upbit di Berita Listing Kripto | Gagal (HTTP 403) | Upbit memblokir server GitHub. Listing Binance dan trending CoinGecko tetap jalan |
| Koin MEW dan POPCAT | Tidak ketemu di Yahoo | Kode koin belum terdaftar; akan ikut otomatis bila muncul |
| Russell 2000 | **Perkiraan** (kapitalisasi peringkat 1.001–3.000), bukan daftar resmi | iShares memblokir unduhan CSV; ada label di UI |
| Syariah Global | **Estimasi**, bukan fatwa | Rasio resmi memerlukan kapitalisasi pasar & pendapatan bunga yang tidak tersedia |
| 32 ticker kolam US lama | Tidak ada di Yahoo | Sudah diakuisisi/ganti nama (SQ→XYZ, MRO, HES, PXD, dst.) |
| 124 ticker kolam IDX lama | Tidak ada di daftar BEI | Ticker lama atau salah ketik (MAND, TOTAL, ZENC, dst.) |
| Saham terkait: 5 indeks | Hanya perusahaan terbesar, bukan seluruh anggota | Daftar anggota lengkap non-AS belum tersedia gratis |
| Berkas `kolam_global.json` bot | Belum pernah diterima | Disebut di manual bot; kirim bila bot membutuhkannya |


### 4.1 Hasil audit 22 Nov 2026 (belum bisa diisi dari sini)
- Server kerja Claude tidak boleh mengakses Yahoo/Binance/situs lain (hanya paket npm/pip), jadi data baru dan gambar tidak bisa diunduh dari sana. Pengisian otomatis hanya lewat GitHub Actions.
- Logo emiten IDX: 263 dari 898 punya berkas lokal (`assets/img/logos`); sisanya otomatis memakai favicon domain (`logos.json`) lalu inisial. Tidak ada yang rusak, hanya tampil inisial.
- Laporan keuangan IDX (`funda-idx.json`): 351 emiten dari Yahoo + 614 dari BEI "Financial Data and Ratio" (`tools/import-bei-fin.py`, 23 Nov). Emiten BEI: kolom terbaru terisi (3/6/9 bulan kumulatif, ditandai `latestMonths`; 61 emiten laporan lama ditandai `stale`), tahunan terisi (dari file Apr 2021-2026) untuk 2020: 139, 2021: 317, 2022: 366, 2023: 358, 2024: 306, 2025: 511 dari 622 emiten BEI (file April + Maret 2020-2025; file bulanan hanya memuat tahunan bagi emiten yang belum lapor kuartal I), tanpa arus kas dan dividen. File bulanan BEI berisi laporan terbaru bulan itu (Dec = kuartal III; May = kuartal I), bukan tahunan; untuk tahunan pakai file bulan April tiap tahun (teruji). 15 emiten tanpa nama/sektor: 14 diisi dari BEI, tersisa NGLS.
- Koin `WLFI-USD` belum punya harga di `crypto.json`; MEW dan POPCAT belum ketemu.
- Chat: command `/pagi /siang /swing /scalp` kini menerima budget (`/swing idx 500`, `/scalp global 10`) dan bahasa natural ("tido, swing di bawah 500").

## 5. Catatan teknis singkat
- Semua data disajikan sebagai snapshot dari GitHub Actions; harga live memakai Binance (kripto) dan Worker (`/gquotes`, `/quotes`).
- Data yang gagal diambil tidak menimpa data lama (`writeSafe`).
- Konten bersifat edukasi, bukan rekomendasi beli/jual.
