# Ewoks Academy / EA Pro Investing

Situs edukasi investasi (Indonesia). Statis di GitHub Pages: HTML + Tailwind CDN + Chart.js, data di `assets/data/*.json`, diperbarui GitHub Actions, harga live lewat Cloudflare Worker `ewoks-live`. Repo: Rdsptwn/EAProInvesting.

## Cara bekerja
- Balas dan tulis teks situs dalam **Bahasa Indonesia** santai tapi jelas. Jujur soal apa yang belum diverifikasi; jangan klaim "sudah jalan" tanpa menjalankan/mengetes.
- Jangan pernah minta, tulis, atau commit kunci/token/`.env`. Rahasia (GH_TOKEN, BOT_KEY, API key AI) hanya di Cloudflare/GitHub Secrets.
- Konten = edukasi, bukan saran investasi. Pertahankan disclaimer di kartu rekomendasi.
- Angka pasar/makro (BI Rate, Fed Rate, kurs) harus dicek ke sumber resmi sebelum diubah; catat `asOf` dan sumber.

## Peta kode
- `assets/js/ewoks-core.js`: komponen umum + widget chat **Tido** (router command/NL, kartu rekomendasi `picksUI`, Watchlist helper `bowWatchAdd`/`simpleWatchAdd`, riwayat chat `ewoks_chat_log`).
- `assets/js/chat-cmds.js` (lazy): `/rd /istilah /topreturn /lk /akum /fibo /analisa`. `assets/js/mascot.js` (lazy): SVG Tido. `assets/js/picks-engine.js` (lazy): level BoW dari candle (swing support/resist + ATR) untuk IHSG/Global/Kripto/Forex.
- `assets/js/pages/page-*.js`: logika per halaman (`page-watchlist.js` multi-pasar: idx, kripto, forex, global, komoditas, rd; `page-bot-picks*.js` kartu rekomendasi).
- `worker/yahoo-proxy.js`: Worker (quotes, chart, fund, /ask AI, `scheduled()` pemicu workflow). Setiap perubahan **harus di-deploy manual** oleh pemilik.
- `tools/*.mjs|py`: pembangun data. `.github/workflows/*.yml`: jadwal.

## Jadwal data (WIB)
- `sync-24jam`: kripto, forex, berita RSS, tiap 30 menit, 24 jam, tiap hari.
- IHSG (`daily-market-sync`): tiap jam Senin 03:00 s/d Jumat 17:00; Sabtu-Minggu libur. `market-activity-intraday`: jam bursa. `sync-global`: Senin-Jumat.
- Cron GitHub sering telat; pemicu tepat waktu lewat Worker Cron Trigger (`0 * * * *`, UTC, filter hari/jam ada di `pickWorkflows`).

## Aturan teknis
- Setelah mengubah JS/CSS: jalankan `node tools/bump-asset-version.mjs` lalu commit (cache-bust). Push sering ditolak karena bot commit: `git pull --rebase -X theirs origin main` lalu bump ulang.
- Data `funda-idx.json`: satuan triliun rupiah; kolom tahun 2020..2025 + 2026 terbaru; `source` yahoo|bei; `fillBei` = tahun yang diisi dari BEI.
- Status emiten (suspensi/delisting) manual di `assets/data/idx-status-manual.json`, lalu `node tools/build-idx-status.mjs`.
- Tes offline: `python3 -m http.server 8123` + Playwright dengan request eksternal di-abort (Tailwind dan Chart.js tidak termuat; itu normal). Server harus dijalankan di perintah yang sama dengan tesnya.
- Shell tidak bisa menjangkau Yahoo/IDX/Worker; untuk cek eksternal pakai WebFetch/WebSearch.
- Python yang membaca file tak tepercaya: `python3 -I`.

## Belum diverifikasi / catatan
- Level candle IHSG dan rekomendasi Kripto/Forex/Global bergantung pada Worker `/chart` (Yahoo) dan OKX/Binance; pesan galat sekarang menampilkan "Detail:" alasan gagal.
- Reksa dana: database hanya punya return 1 tahun (tanggal data tertera), tidak ada NAB harian.
