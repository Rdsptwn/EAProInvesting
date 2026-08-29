# Ewoks Academy Pro

Situs edukasi investasi & tools analisis IDX. Live: [ewoksacademy.github.io/EAProInvesting](https://ewoksacademy.github.io/EAProInvesting/index.html)

## Halaman

- Beranda — IHSG, berita, kalender korporasi
- Edukasi, fixed income, bandarmologi, kuis profil risiko
- Watchlist, jurnal, pensiun, trading plan, kalkulator bandar
- Database: peta konglomerat, broker, **Obligasi / RD / ETF**

## Update otomatis (tanpa edit manual)

Setelah workflow ini ada di GitHub (`main`), bot meng-commit data **setiap hari ~17:00 WIB**:

| Data | Frekuensi |
|------|-----------|
| IHSG + harga emiten (peta konglo) | Setiap hari |
| ETF / pasar alternatif | Setiap hari |
| Laporan keuangan (Fundamental PRO) | Minggu + tanggal 5 |
| Cache `?v=` di HTML | Setiap sync (agar Pages tidak nyangkut) |

Cek: repo → **Actions** → *Daily market sync*. Kalau kosong, buka **Settings → Actions → General** → izinkan Actions. Sekali pertama, **Run workflow** untuk uji.

Ini **bukan** harga detik-detikan. Setelah bursa tutup, angka di situs mengikuti file JSON yang di-push bot. Jurnal/watchlist tetap di browser kamu (localStorage), tidak ikut sync.

Jalankan lokal (Node 20+):

```bash
node tools/build-market-snapshot.mjs
node tools/build-funda-idx.mjs --force
node tools/build-pasar-alternatif.mjs
node tools/bump-asset-version.mjs
```

Token Finnhub opsional: set `window.EWOKS_FINNHUB_TOKEN` di HTML atau `localStorage.ewoks_finnhub_token`.

Jurnal & watchlist tersimpan di browser (localStorage). Gunakan Backup/Restore di situs.

## Disclaimer

Konten untuk edukasi, bukan saran beli/jual. DYOR.
