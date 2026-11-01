# Harga live (Cloudflare Worker)

Proxy kecil ke Yahoo Finance supaya web bisa menampilkan harga IHSG & emiten yang
diperbarui tiap ~1 menit saat jam bursa (data IDX di Yahoo tertunda ±10 menit).
Tanpa ini, web tetap jalan memakai snapshot harian dari GitHub Actions.

## Pasang (±5 menit, gratis)

1. Daftar/login di <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Beri nama, misalnya `ewoks-live`, klik **Deploy**, lalu **Edit code**.
3. Hapus isi bawaan, tempel seluruh isi `worker/yahoo-proxy.js`, klik **Deploy**.
4. Salin URL Worker-nya, misalnya `https://ewoks-live.namakamu.workers.dev`.
5. Buka `assets/js/ewoks-core.js`, cari baris `const EWOKS_LIVE_API_URL = '';`
   dan isi dengan URL tadi:
   `const EWOKS_LIVE_API_URL = 'https://ewoks-live.namakamu.workers.dev';`
6. Commit + push. Hard refresh web (Ctrl+F5).

Uji cepat di browser: `https://ewoks-live.namakamu.workers.dev/quotes?s=BBCA,BBRI&ihsg=1`
harus mengembalikan JSON berisi harga.

## Catatan

- Domain web yang boleh memanggil Worker diatur di `ALLOWED_ORIGINS` (bagian atas file).
  Kalau pindah domain, tambahkan di sana lalu deploy ulang.
- Batas gratis Cloudflare: 100 ribu request/hari. Tiap simbol di-cache 60 detik di edge.
- API Yahoo ini tidak resmi dan bisa berubah/diblok sewaktu-waktu. Kalau gagal, web otomatis
  kembali ke snapshot harian.
- Polling hanya jalan Senin–Jumat ±08:55–16:30 WIB, saat tab terbuka.
