# Harga live (Cloudflare Worker)

Proxy kecil ke Yahoo Finance supaya web bisa menampilkan harga IHSG & emiten yang
diperbarui tiap 10 menit saat jam bursa (data IDX di Yahoo tertunda ±10 menit).
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

- Domain di `ALLOWED_ORIGINS` (bagian atas file) menerima CORS khusus; domain lain tetap boleh membaca data publik (GET) lewat `*`.
  Kalau pindah domain, tambahkan di sana lalu deploy ulang.
- Batas gratis Cloudflare: 100 ribu request/hari. Tiap simbol di-cache 60 detik di edge (web memanggil tiap 10 menit).
- API Yahoo ini tidak resmi dan bisa berubah/diblok sewaktu-waktu. Kalau gagal, web otomatis
  kembali ke snapshot harian.
- Polling hanya jalan Senin–Jumat ±08:55–16:30 WIB, saat tab terbuka.

## Update data tiap jam tepat waktu (Cron Trigger)

Jadwal (`schedule`) GitHub Actions sering tertunda 3–7 jam, jadi data bisa terlihat basi. Worker yang sama bisa
memicu workflow tepat waktu lewat Cron Trigger (gratis).

1. Buat token GitHub: **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - Repository access: **Only select repositories** → `EAProInvesting`.
   - Permissions → Repository permissions → **Actions: Read and write** (tidak perlu izin lain).
   - Masa berlaku: 1 tahun (ingat memperbaruinya).
2. Cloudflare → Workers & Pages → Worker `ewoks-live` → **Settings → Variables and Secrets → Add** →
   Type **Secret**, nama `GH_TOKEN`, isi token tadi → **Deploy**. Jangan menaruh token di kode atau chat.
3. Tempel ulang isi `worker/yahoo-proxy.js` (versi `v6-cron`) → **Deploy**.
4. **Settings → Trigger Events → Add → Cron Triggers**, isi: `0 2-10 * * 1-5`
   (UTC; = tiap jam 09:00–17:00 WIB, Senin–Jumat). Simpan.
5. Cek: tab **Observability/Logs** Worker, atau tab **Actions** GitHub; run bertipe `workflow_dispatch` muncul tiap jam.

Uji manual tanpa menunggu jam: di halaman Worker → **Triggers → Cron Triggers → Test/Trigger** (atau `wrangler dev --test-scheduled`).
Jadwal GitHub bawaan dibiarkan sebagai cadangan; workflow memakai antrean yang sama sehingga tidak bertabrakan.
