// --- KUIS GAYA TRADING: 15 pertanyaan -> tipe trader/investor + saran ---
// Tiap opsi menambah poin ke tipe: s=Scalper, d=Day Trader/BSJP, w=Swing, p=Trend/Position, v=Value & Dividen, c=Investor Rutin (DCA).
// r = tingkat risiko yang dipilih (1 rendah - 3 tinggi); f = penanda peringatan untuk hasil.
const QZ_TYPES = {
    s: { name: 'Scalper', icon: 'fa-bolt', color: 'amber', tag: 'Ambil untung kecil, berkali-kali, dalam hitungan menit.',
        ciri: ['Posisi dipegang detik sampai menit, puluhan transaksi per hari.', 'Hampir sepanjang sesi bursa kamu menatap layar.', 'Targetmu tipis (sekitar 0,5-2%) dan stop loss sangat ketat.'],
        kuat: ['Refleks cepat dan nyaman memotong rugi kecil.', 'Terbiasa membaca antrean beli-jual dan pergerakan harga.'],
        jebak: ['Overtrading: fee pulang-pergi dan selisih harga bisa memakan seluruh target tipis.', 'Balas dendam setelah rugi, lalu ukuran posisi dibesarkan.', 'Saham sepi: sulit keluar tepat waktu.'],
        cocok: 'Saham paling likuid (LQ45/IDX80) dengan nilai transaksi besar. Hindari saham murah yang sepi.',
        aturan: ['Risiko maksimal 0,5-1% modal per transaksi.', 'Tentukan batas rugi harian (misalnya 2-3% modal). Kena batas itu, berhenti sampai besok.', 'Hitung fee beli+jual sebelum menetapkan target.', 'Ingat batas harian: ARB saat ini 7% (sampai 31 Des 2026), dan IHSG turun 8% memicu trading halt 30 menit.'],
        belajar: [['Teknikal dasar', 'edukasi.html#edu-teknikal'], ['Fungsi indikator', 'edukasi.html#edu-indikator'], ['Aturan bursa (ARA/ARB, halt)', 'edukasi.html#edu-aturan'], ['Cheat sheet bandar', 'bandarmology-edu.html']],
        tools: ['Tido: /scalp idx atau /scalp kripto', 'Tido: /akum KODE untuk arah volume', 'Kalkulator Trading Plan', 'Jurnal Trading: catat tiap transaksi dan hitung win rate'] },
    d: { name: 'Day Trader (BSJP/BPJS)', icon: 'fa-sun', color: 'orange', tag: 'Masuk dan keluar dalam hari yang sama, atau beli sore jual pagi.',
        ciri: ['Posisi dipegang beberapa jam sampai 1-2 hari.', 'Mengincar momentum: pembukaan, penutupan, atau saham yang sedang ramai.', 'Cek pasar beberapa kali sehari, tidak harus terus-menerus.'],
        kuat: ['Disiplin target dan stop loss harian.', 'Bisa membaca momentum dan volume.'],
        jebak: ['FOMO: masuk saat harga sudah naik tinggi.', 'Gap turun semalam atau saham kena ARB sebelum sempat jual (ARB saat ini 7%).', 'Ikut-ikutan rumor tanpa level jelas.'],
        cocok: 'Saham likuid dengan nilai transaksi besar dan pergerakan harian cukup lebar.',
        aturan: ['Stop loss 1-2% dari harga masuk, ditentukan sebelum order.', 'Risiko maksimal 1% modal per transaksi.', 'Jangan membawa posisi menginap kalau tidak ada rencana untuk gap turun.', 'Jangan mengejar harga yang sudah naik jauh dari titik rencana.'],
        belajar: [['Teknikal dasar', 'edukasi.html#edu-teknikal'], ['Fungsi indikator', 'edukasi.html#edu-indikator'], ['Aturan bursa (ARA/ARB, halt)', 'edukasi.html#edu-aturan'], ['Profil trader dan screener', 'edukasi.html#edu-profil']],
        tools: ['Tido: /pagi idx atau /siang idx', 'Watchlist: pantau level BoW dan harga near-live', 'Kalkulator Trading Plan', 'Jurnal Trading'] },
    w: { name: 'Swing Trader', icon: 'fa-wave-square', color: 'blue', tag: 'Ikuti ayunan harga selama beberapa hari sampai beberapa minggu.',
        ciri: ['Posisi dipegang 1 minggu sampai sekitar 3 bulan.', 'Beli dekat support, jual dekat resist atau saat tren patah.', 'Cukup cek pasar sekali sehari, biasanya sore atau malam.'],
        kuat: ['Sabar menunggu level yang jelas.', 'Cocok untuk yang punya pekerjaan lain: tidak perlu menatap layar.'],
        jebak: ['Tidak memakai stop loss, lalu rugi kecil jadi nyangkut.', 'Memegang terlalu banyak saham sampai tidak sempat dipantau.', 'Menggeser stop loss terus karena belum rela rugi.'],
        cocok: 'Saham likuid dengan tren dan level support/resist yang rapi, di IHSG maupun saham global.',
        aturan: ['Risk:reward minimal 1:2 (potensi untung dua kali risiko).', 'Risiko 1-2% modal per posisi, maksimal 5-8 posisi bersamaan.', 'Stop loss di bawah support, bukan di angka yang enak dilihat.', 'Catat alasan masuk supaya bisa dievaluasi.'],
        belajar: [['Teknikal dasar', 'edukasi.html#edu-teknikal'], ['Fungsi indikator', 'edukasi.html#edu-indikator'], ['Dasar dan makro', 'edukasi.html#edu-dasar'], ['Aturan bursa', 'edukasi.html#edu-aturan']],
        tools: ['Tido: /swing idx atau /swing global', 'Watchlist: simpan rekomendasi level BoW', 'Tido: /fibo KODE untuk area koreksi', 'Kalkulator Trading Plan dan Jurnal Trading'] },
    p: { name: 'Trend / Position Trader', icon: 'fa-chart-line', color: 'indigo', tag: 'Menunggangi tren besar selama berbulan-bulan.',
        ciri: ['Posisi dipegang sekitar 3-12 bulan.', 'Memadukan tren harga dengan cerita bisnis dan siklus ekonomi.', 'Jarang transaksi, tapi tiap transaksi ukurannya berarti.'],
        kuat: ['Tahan terhadap gejolak harian.', 'Tidak terbawa berita jangka pendek.'],
        jebak: ['Menahan saham rugi tanpa batas karena "kan jangka panjang" (nyangkut).', 'Menjual terlalu cepat saat tren baru dimulai.', 'Terlalu percaya satu cerita tanpa angka.'],
        cocok: 'Saham dengan tren naik jelas dan fundamental sehat, serta komoditas atau indeks global.',
        aturan: ['Tulis alasan beli dan syarat keluar (harga atau kondisi bisnis) sebelum membeli.', 'Pakai stop loss lebar (misalnya di bawah support mingguan) dengan ukuran posisi lebih kecil.', 'Tinjau tiap bulan, bukan tiap hari.'],
        belajar: [['Dasar dan makro', 'edukasi.html#edu-dasar'], ['Analisis fundamental', 'edukasi.html#edu-fundamental'], ['Teknikal dasar', 'edukasi.html#edu-teknikal'], ['Fixed income dan SBN', 'fixed-income.html']],
        tools: ['Tido: /topreturn untuk saham dengan tren kuat', 'Tido: /lk KODE untuk ringkasan laporan keuangan', 'Peta Konglo dan Database Emiten', 'Jurnal Trading'] },
    v: { name: 'Value & Dividend Investor', icon: 'fa-seedling', color: 'emerald', tag: 'Beli bisnis bagus di harga wajar, lalu biarkan bertumbuh.',
        ciri: ['Posisi dipegang bertahun-tahun.', 'Membaca laporan keuangan dan menilai harga wajar.', 'Mengincar dividen dan pertumbuhan laba, tidak peduli naik-turun harian.'],
        kuat: ['Tahan turun asal bisnisnya sehat.', 'Tidak butuh waktu di depan layar.'],
        jebak: ['Value trap: murah karena bisnisnya memang memburuk.', 'Dividend trap: dividen besar tapi laba menyusut dan harga turun sesudahnya.', 'Terlalu terkonsentrasi di satu atau dua emiten.'],
        cocok: 'Emiten dengan laba konsisten, arus kas kuat, utang terkendali. Cek juga status HSC, suspensi, dan papan pemantauan khusus.',
        aturan: ['Beli bertahap (cicil), jangan sekali masuk.', 'Batasi satu emiten maksimal 10-20% portofolio.', 'Evaluasi tiap rilis laporan keuangan: kalau alasan beli sudah tidak berlaku, keluar.', 'Cek rasio dividen terhadap laba dan arus kas, bukan hanya yield.'],
        belajar: [['Analisis fundamental', 'edukasi.html#edu-fundamental'], ['Dasar dan makro', 'edukasi.html#edu-dasar'], ['Kamus istilah', 'edukasi.html#edu-kamus'], ['Fixed income dan SBN', 'fixed-income.html']],
        tools: ['Tido: /lk KODE dan /analisa KODE', 'Halaman Global: filter saham dan ringkasan fundamental', 'Peta Konglo dan Database Emiten', 'Kalkulator bunga majemuk'] },
    c: { name: 'Investor Rutin (DCA)', icon: 'fa-piggy-bank', color: 'teal', tag: 'Cicil rutin tiap bulan dan biarkan waktu bekerja.',
        ciri: ['Menyisihkan dana rutin tanpa menebak waktu masuk.', 'Lebih suka instrumen terdiversifikasi: reksa dana, ETF, SBN, emas.', 'Waktu yang dipakai untuk memantau sangat sedikit.'],
        kuat: ['Tidak terjebak emosi harian.', 'Konsisten adalah keunggulan terbesarmu.'],
        jebak: ['Berhenti cicil saat pasar turun, padahal itu saat cicilan paling murah.', 'Memilih produk karena return tahun lalu saja.', 'Tidak pernah menyeimbangkan ulang porsi aset.'],
        cocok: 'Reksa dana pasar uang untuk dana darurat, reksa dana saham atau indeks untuk jangka panjang, SBN ritel, dan emas sebagai pelindung.',
        aturan: ['Dana darurat dulu (3-6 bulan pengeluaran), baru instrumen berisiko.', 'Tetapkan nominal rutin dan tanggal beli, lalu otomatiskan.', 'Seimbangkan ulang porsi aset 1-2 kali setahun.', 'Cek biaya (fee pengelolaan) dan riwayat reksa dana, bukan hanya return 1 tahun.'],
        belajar: [['Macam-macam instrumen', 'edukasi.html#edu-dasar'], ['Fixed income dan SBN', 'fixed-income.html'], ['Dasar dan makro', 'edukasi.html#edu-dasar'], ['Kalkulator pensiun', 'pensiun.html']],
        tools: ['Tido: /rd untuk database reksa dana', 'Kalkulator bunga majemuk dan Pensiun', 'Fixed Income: yield SBN terbaru', 'Jurnal: catat setoran rutin'] }
};
const QZ_FLAGS = {
    kebutuhan: 'Kamu menyebut memakai uang kebutuhan sehari-hari. Hentikan dulu: uang yang akan dipakai dalam waktu dekat bukan modal investasi.',
    darurat: 'Dana daruratmu belum cukup. Prioritas pertama adalah dana darurat 3-6 bulan pengeluaran di instrumen aman (tabungan atau reksa dana pasar uang) sebelum menambah risiko.',
    fomo: 'Kamu cenderung ikut masuk saat harga sudah naik cepat (FOMO). Tentukan level masuk sebelum pasar buka, dan lewati saham yang sudah jauh dari levelnya.',
    nosl: 'Kamu cenderung tahan tanpa stop loss. Tanpa batas rugi, satu kesalahan bisa menghapus hasil banyak transaksi. Tentukan batas rugi sebelum order.',
    pemula: 'Kamu masih di tahap awal. Mulai dengan nominal kecil dan pelajari dasar dulu sebelum tipe yang cepat.',
    waktu: 'Waktu luangmu tidak sejalan dengan gaya yang cepat. Gaya yang butuh layar sepanjang sesi akan sulit dijalankan, jadi pertimbangkan tipe kedua yang lebih santai.'
};
const QZ = [
    { q: 'Berapa waktu yang realistis kamu pakai untuk memantau pasar saat bursa buka?', o: [
        { t: 'Hampir seluruh sesi, fokus di layar', w: { s: 3, d: 2 } },
        { t: 'Beberapa kali sehari, 5-10 menit tiap kali', w: { d: 3, w: 1 } },
        { t: 'Sekali sehari, biasanya sore atau malam', w: { w: 3, p: 1 }, },
        { t: 'Seminggu sekali atau lebih jarang', w: { p: 2, v: 2, c: 3 }, f: 'waktu' } ] },
    { q: 'Berapa lama kamu nyaman memegang satu posisi?', o: [
        { t: 'Menit sampai beberapa jam', w: { s: 3, d: 1 } },
        { t: '1-3 hari', w: { d: 3, w: 1 } },
        { t: '1 minggu sampai 3 bulan', w: { w: 3, p: 1 } },
        { t: '3-12 bulan', w: { p: 3, v: 1 } },
        { t: 'Bertahun-tahun', w: { v: 3, c: 2 } } ] },
    { q: 'Dari mana uang yang kamu pakai untuk ini?', o: [
        { t: 'Uang dingin: kalau hilang, hidupku tidak terganggu', w: {}, r: 3 },
        { t: 'Sebagian tabungan, tapi ada cadangan', w: {}, r: 2 },
        { t: 'Uang yang sebenarnya untuk kebutuhan dalam waktu dekat', w: {}, r: 1, f: 'kebutuhan' } ] },
    { q: 'Kamu paling tahan menghadapi kondisi mana?', o: [
        { t: 'Naik-turun tajam dalam satu hari', w: { s: 3, d: 2 }, r: 3 },
        { t: 'Portofolio turun 10-15% selama beberapa minggu', w: { w: 2, p: 2 }, r: 2 },
        { t: 'Turun 20-30% asal bisnisnya masih sehat', w: { v: 3, p: 2 }, r: 3 },
        { t: 'Hampir tidak mau melihat portofolio merah', w: { c: 2 }, r: 1 } ] },
    { q: 'Apa yang paling kamu percaya saat memilih saham?', o: [
        { t: 'Pergerakan harga dan antrean beli-jual saat itu juga', w: { s: 3, d: 2 } },
        { t: 'Grafik dan indikator teknikal', w: { d: 2, w: 3, p: 2 } },
        { t: 'Laporan keuangan dan valuasi', w: { v: 3, p: 1 } },
        { t: 'Aku tidak mau memilih saham sendiri; diversifikasi saja', w: { c: 3 } } ] },
    { q: 'Hasil seperti apa yang kamu cari?', o: [
        { t: 'Untung kecil tapi tiap hari', w: { s: 3, d: 2 } },
        { t: '5-15% dalam beberapa minggu', w: { w: 3, d: 1 } },
        { t: '30% atau lebih dalam setahun', w: { p: 3, v: 1 } },
        { t: 'Dividen atau bunga rutin sambil tumbuh pelan', w: { v: 3, c: 2 } },
        { t: 'Mengalahkan inflasi tanpa repot', w: { c: 3 } } ] },
    { q: 'Berapa kali kamu rela bertransaksi dalam sebulan?', o: [
        { t: 'Lebih dari 100 kali', w: { s: 3 } },
        { t: '20-100 kali', w: { d: 3, s: 1 } },
        { t: '4-20 kali', w: { w: 3, d: 1 } },
        { t: '1-4 kali', w: { p: 2, v: 2 } },
        { t: 'Cukup beli rutin sebulan sekali', w: { c: 3 } } ] },
    { q: 'Harga saham yang kamu incar tiba-tiba naik cepat tanpa kamu. Apa yang kamu lakukan?', o: [
        { t: 'Langsung ikut masuk supaya tidak ketinggalan', w: { s: 2, d: 2 }, f: 'fomo' },
        { t: 'Menunggu koreksi ke area support', w: { w: 3, p: 1 } },
        { t: 'Membiarkan, lalu cari yang masih murah', w: { v: 3 } },
        { t: 'Tidak peduli, tetap beli rutin', w: { c: 3 } } ] },
    { q: 'Bagaimana kamu menyikapi stop loss ketat (1-2%)?', o: [
        { t: 'Nyaman, langsung cut tanpa ragu', w: { s: 3, d: 3, w: 1 }, r: 3 },
        { t: 'Bisa, kalau levelnya jelas', w: { w: 3, p: 1 }, r: 2 },
        { t: 'Lebih suka tahan karena yakin bisnisnya bagus', w: { v: 2, p: 1, c: 1 }, r: 2, f: 'nosl' },
        { t: 'Aku belum paham stop loss', w: { c: 2 }, r: 1, f: 'pemula' } ] },
    { q: 'Seberapa paham kamu membaca pasar saat ini?', o: [
        { t: 'Paham antrean beli-jual dan tape reading', w: { s: 2, d: 2 } },
        { t: 'Paham candlestick, support dan resist', w: { d: 1, w: 2, p: 1 } },
        { t: 'Bisa membaca laporan keuangan dan rasio', w: { v: 3, p: 1 } },
        { t: 'Masih pemula', w: { c: 3 }, f: 'pemula' } ] },
    { q: 'Seperti apa keseharianmu?', o: [
        { t: 'Bisa di depan layar sepanjang jam bursa', w: { s: 3, d: 2 } },
        { t: 'Bekerja di kantor, mengecek saat istirahat', w: { d: 1, w: 2 } },
        { t: 'Sibuk, baru bisa mengecek malam hari', w: { w: 3, p: 2 } },
        { t: 'Sangat sibuk, ingin yang berjalan otomatis', w: { c: 3, v: 1 } } ] },
    { q: 'Ada berita buruk tentang emiten yang kamu pegang. Apa langkahmu?', o: [
        { t: 'Keluar cepat, harga yang bicara', w: { s: 2, d: 3, w: 1 } },
        { t: 'Cek apakah support jebol, baru putuskan', w: { w: 3, p: 1 } },
        { t: 'Baca dampaknya ke laba jangka panjang', w: { v: 3, p: 2 } },
        { t: 'Tidak mengubah rencana rutin', w: { c: 3 } } ] },
    { q: 'Pola hasil mana yang paling bisa kamu terima?', o: [
        { t: 'Sering menang tapi kecil-kecil', w: { s: 3, d: 2 } },
        { t: 'Jarang menang tapi sekali menang besar', w: { w: 2, p: 3 } },
        { t: 'Pelan dan pasti, tanpa kejutan', w: { v: 2, c: 3 } } ] },
    { q: 'Apa reaksimu setelah dua kali rugi berturut-turut?', o: [
        { t: 'Berhenti dulu, evaluasi, lanjut besok', w: { s: 1, d: 2, w: 2, p: 1 }, r: 2 },
        { t: 'Langsung cari transaksi lain untuk balas dendam', w: { s: 1, d: 1 }, r: 3 },
        { t: 'Tidak banyak berubah, karena strategiku jangka panjang', w: { p: 2, v: 2, c: 2 }, r: 2 },
        { t: 'Cemas dan ingin pindah ke yang lebih aman', w: { c: 2 }, r: 1 } ] },
    { q: 'Seberapa siap dana daruratmu?', o: [
        { t: 'Sudah ada, 6 bulan pengeluaran atau lebih', w: {}, r: 3 },
        { t: 'Ada, sekitar 3-6 bulan', w: {}, r: 2 },
        { t: 'Belum punya atau kurang dari 3 bulan', w: {}, r: 1, f: 'darurat' } ] }
];

let qzIdx = 0, qzAns = [], qzName = '', qzResult = null;
const qzEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function startComplexQuiz() {
    qzName = (document.getElementById('qz-name').value || '').trim();
    qzAns = []; qzIdx = 0; qzResult = null;
    document.getElementById('quiz-intro').classList.add('hidden');
    document.getElementById('quiz-intro').classList.remove('active');
    document.getElementById('quiz-result').classList.add('hidden');
    renderQuizQuestion();
}

function renderQuizQuestion() {
    const qd = QZ[qzIdx], pct = (qzIdx / QZ.length) * 100;
    document.getElementById('quiz-dynamic-container').innerHTML =
        '<div class="animate-[fadeIn_0.3s_ease-out]">' +
        '<div class="flex justify-between items-end mb-2"><p class="text-xs font-bold text-slate-500">Pertanyaan ' + (qzIdx + 1) + ' dari ' + QZ.length + '</p>' +
        (qzIdx > 0 ? '<button type="button" onclick="qzBack()" class="text-xs font-bold text-blue-600 hover:underline py-2 px-1">Kembali</button>' : '') + '</div>' +
        '<div class="w-full bg-slate-100 rounded-full h-1.5 mb-6"><div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style="width:' + pct + '%"></div></div>' +
        '<h3 class="text-lg md:text-2xl font-bold text-slate-800 mb-6 leading-snug">' + qzEsc(qd.q) + '</h3>' +
        '<div class="space-y-3">' + qd.o.map((op, i) =>
            '<button type="button" onclick="qzPick(' + i + ')" class="w-full text-left p-4 rounded-xl border-2 ' + (qzAns[qzIdx] === i ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100') + ' hover:border-emerald-500 hover:bg-emerald-50/50 font-semibold text-slate-700 transition-all shadow-sm flex items-start gap-3 min-h-[48px] dark-mode-card">' +
            '<span class="w-6 h-6 shrink-0 rounded bg-slate-200 text-slate-600 flex items-center justify-center text-xs">' + String.fromCharCode(65 + i) + '</span><span class="leading-relaxed">' + qzEsc(op.t) + '</span></button>').join('') + '</div></div>';
}

function qzPick(i) {
    qzAns[qzIdx] = i; qzIdx++;
    if (qzIdx < QZ.length) { renderQuizQuestion(); return; }
    try { showQuizResult(); } catch (err) {
        console.error('Gagal menampilkan hasil kuis', err);
        document.getElementById('quiz-dynamic-container').innerHTML = '<div class="text-center py-10"><p class="font-bold text-slate-800 mb-2">Hasil belum bisa ditampilkan.</p><p class="text-sm text-slate-500 mb-4">Jawabanmu masih tersimpan di halaman ini. Coba lagi.</p><button type="button" onclick="qzRetryResult()" class="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-sm">Tampilkan hasil</button></div>';
    }
}
function qzRetryResult() { try { showQuizResult(); } catch (e) { resetQuiz(); } }
function qzBack() { if (qzIdx > 0) { qzIdx--; renderQuizQuestion(); } }

function qzCompute() {
    const keys = Object.keys(QZ_TYPES), score = {}, max = {}, flags = [];
    keys.forEach((k) => { score[k] = 0; max[k] = 0; });
    let rSum = 0, rN = 0;
    QZ.forEach((qd, qi) => {
        keys.forEach((k) => { max[k] += Math.max.apply(null, qd.o.map((o) => (o.w && o.w[k]) || 0)); });
        const op = qd.o[qzAns[qi]]; if (!op) return;
        keys.forEach((k) => { score[k] += (op.w && op.w[k]) || 0; });
        if (op.r) { rSum += op.r; rN++; }
        if (op.f && flags.indexOf(op.f) < 0) flags.push(op.f);
    });
    const pct = {}; keys.forEach((k) => { pct[k] = max[k] ? Math.round((score[k] / max[k]) * 100) : 0; });
    const rank = keys.slice().sort((a, b) => pct[b] - pct[a] || score[b] - score[a]);
    const risk = rN ? rSum / rN : 2;
    return { pct, rank, flags, risk };
}

function showQuizResult() {
    const R = qzCompute(), top = R.rank[0], sec = R.rank[1], T = QZ_TYPES[top];
    const flags = R.flags.filter((f) => f !== 'waktu' || top === 's' || top === 'd');
    const riskLbl = R.risk < 1.7 ? ['Konservatif', 'Kamu mengutamakan keamanan modal. Ukuran posisi kecil dan instrumen stabil lebih cocok.'] : R.risk < 2.4 ? ['Moderat', 'Kamu bisa menerima naik-turun wajar. Atur ukuran posisi supaya satu kesalahan tidak merusak portofolio.'] : ['Agresif', 'Kamu nyaman dengan risiko tinggi. Justru karena itu, batas rugi dan ukuran posisi harus tertulis jelas.'];
    const col = T.color;
    const li = (arr) => arr.map((x) => '<li>' + qzEsc(x) + '</li>').join('');
    const warn = flags.map((f) => '<div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>' + qzEsc(QZ_FLAGS[f]) + '</div>').join('');
    const bars = R.rank.map((k, i) => '<div class="mb-2"><div class="flex justify-between text-xs font-bold ' + (i === 0 ? 'text-slate-900' : 'text-slate-500') + '"><span>' + qzEsc(QZ_TYPES[k].name) + '</span><span>' + R.pct[k] + '%</span></div><div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-2 rounded-full ' + (i === 0 ? 'bg-emerald-500' : 'bg-slate-300') + '" style="width:' + R.pct[k] + '%"></div></div></div>').join('');
    const sect = (icon, title, body) => '<div class="bg-white border border-slate-200 rounded-2xl p-5 text-left dark-mode-card"><h4 class="font-black text-slate-900 mb-2 text-sm"><i class="fas ' + icon + ' text-blue-500 mr-2"></i>' + title + '</h4>' + body + '</div>';
    const ul = (arr) => '<ul class="text-sm text-slate-700 space-y-1.5 list-disc pl-5">' + li(arr) + '</ul>';
    const links = T.belajar.map((x) => '<a href="' + x[1] + '" class="inline-block px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200">' + qzEsc(x[0]) + '</a>').join(' ');
    const name = qzName ? qzEsc(qzName) + ', ' : '';
    qzResult = { type: T.name, pct: R.pct, rank: R.rank, risk: riskLbl[0] };
    window.finalProfileResult = T.name;

    document.getElementById('quiz-dynamic-container').innerHTML = '';
    const box = document.getElementById('quiz-result');
    box.innerHTML =
        warn +
        '<div class="text-center py-6"><div class="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-4 bg-' + col + '-100 text-' + col + '-600"><i class="fas ' + T.icon + '"></i></div>' +
        '<p class="text-xs font-bold text-slate-500 mb-1">' + name + 'gaya yang paling cocok denganmu:</p>' +
        '<h2 class="text-3xl font-black text-slate-900 mb-2">' + qzEsc(T.name) + '</h2><p class="text-slate-600 max-w-md mx-auto font-medium">' + qzEsc(T.tag) + '</p>' +
        '<p class="mt-3 text-sm text-slate-500">Tipe kedua: <b>' + qzEsc(QZ_TYPES[sec].name) + '</b> (' + R.pct[sec] + '%). Kamu boleh mencampur keduanya, misalnya sebagian dana untuk investasi rutin dan sebagian kecil untuk trading.</p></div>' +
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">' +
        sect('fa-chart-bar', 'Kecocokan dengan tiap tipe', bars) +
        sect('fa-shield-alt', 'Toleransi risiko: ' + riskLbl[0], '<p class="text-sm text-slate-700">' + riskLbl[1] + '</p>') +
        sect('fa-id-card', 'Ciri kamu', ul(T.ciri)) +
        sect('fa-thumbs-up', 'Kekuatan', ul(T.kuat)) +
        sect('fa-skull-crossbones', 'Jebakan yang perlu dihindari', ul(T.jebak)) +
        sect('fa-bullseye', 'Cocok dimainkan di', '<p class="text-sm text-slate-700">' + qzEsc(T.cocok) + '</p>') +
        sect('fa-ruler', 'Aturan main yang disarankan', ul(T.aturan)) +
        sect('fa-toolbox', 'Pakai di situs ini', ul(T.tools)) + '</div>' +
        '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left mb-6"><h4 class="font-black text-slate-900 mb-3 text-sm"><i class="fas fa-book-open text-blue-500 mr-2"></i>Mulai belajar dari sini</h4><div class="flex flex-wrap gap-2">' + links + '</div></div>' +
        '<div class="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4"><button type="button" onclick="generateCertificate()" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 flex items-center gap-2"><i class="fas fa-download"></i> Unduh kartu profil</button><button type="button" onclick="resetQuiz()" class="text-slate-600 font-bold hover:text-blue-600 underline py-2">Ulangi kuis</button></div>' +
        '<p class="text-[11px] text-slate-400 italic text-center">Hasil ini gambaran kecenderungan dari 15 jawabanmu untuk edukasi, bukan sertifikasi atau saran investasi pribadi. Tidak ada jaminan hasil. Data tidak disimpan di server.</p>';
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetQuiz() {
    qzIdx = 0; qzAns = []; qzResult = null;
    document.getElementById('quiz-result').classList.add('hidden');
    document.getElementById('quiz-result').innerHTML = '';
    document.getElementById('quiz-dynamic-container').innerHTML = '';
    document.getElementById('quiz-intro').classList.remove('hidden');
    document.getElementById('quiz-intro').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Kartu profil (gambar PNG) dari hasil kuis; bukan sertifikat resmi.
function generateCertificate() {
    if (!qzResult) return;
    const canvas = document.getElementById('certCanvas'), ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const font = (px, w) => (w || '') + ' ' + px + 'px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(24, 24, W - 48, H - 48);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8'; ctx.font = font(18, 'bold'); ctx.fillText('KARTU PROFIL TRADER', W / 2, 78);
    ctx.fillStyle = '#f8fafc'; ctx.font = font(26, 'bold'); ctx.fillText(qzName || 'Peserta kuis', W / 2, 130, W - 120);
    ctx.fillStyle = '#94a3b8'; ctx.font = font(16); ctx.fillText('gaya yang paling cocok:', W / 2, 175);
    ctx.fillStyle = '#10b981'; ctx.font = font(40, 'bold'); ctx.fillText(qzResult.type, W / 2, 230, W - 120);
    ctx.fillStyle = '#cbd5e1'; ctx.font = font(15); ctx.fillText('Toleransi risiko: ' + qzResult.risk, W / 2, 268);
    qzResult.rank.slice(0, 3).forEach((k, i) => {
        const y = 320 + i * 52, w = 440;
        ctx.textAlign = 'left'; ctx.fillStyle = '#e2e8f0'; ctx.font = font(15, 'bold'); ctx.fillText(QZ_TYPES[k].name, 180, y);
        ctx.textAlign = 'right'; ctx.fillText(qzResult.pct[k] + '%', 620, y);
        ctx.fillStyle = '#334155'; ctx.fillRect(180, y + 10, w, 8);
        ctx.fillStyle = i === 0 ? '#10b981' : '#64748b'; ctx.fillRect(180, y + 10, (w * qzResult.pct[k]) / 100, 8);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8'; ctx.font = font(13);
    ctx.fillText(new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) + ' · Ewoks Academy', W / 2, 520);
    ctx.fillStyle = '#64748b'; ctx.font = font(11); ctx.fillText('Hasil kuis edukasi, bukan sertifikasi atau saran investasi.', W / 2, 545);
    const a = document.createElement('a');
    a.download = 'Profil_Trader_' + (qzName || 'Ewoks').replace(/[^A-Za-z0-9]+/g, '_') + '.png';
    a.href = canvas.toDataURL('image/png'); a.click();
    if (typeof showToast === 'function') showToast('Kartu profil berhasil diunduh.', 'success');
}
