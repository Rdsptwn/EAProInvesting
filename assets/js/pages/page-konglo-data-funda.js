let fundaCharts = {};

// --- DATA KONGLOMERAT ---
const dataGroups = [
    {
        id: "aguan",
        name: "Aguan Group (Agung Sedayu)",
        desc: "Grup properti raksasa yang dikomandoi oleh Sugianto Kusuma (Aguan). Ekspansi agresif ke pasar modal dalam beberapa tahun terakhir, sering bermitra dengan Salim Group.",
        stocks: [
            { ticker: "CBDK", company: "PT Bangun Kosambi Sukses Tbk", sector: "Properti & Real Estat", ownership: "Bagian dari pengembangan kawasan SCBD, terafiliasi dengan jaringan bisnis strategis Aguan.", kepemilikan_persen: "82.3%", sejarah: "Pengembang kawasan niaga terpadu SCBD Jakarta, bermitra dengan Artha Graha.", tahun_masuk: "1992", broker_afiliasi: "KI, DX", free_float: "17.7%" },
            { ticker: "ERAA", company: "PT Erajaya Swasembada Tbk", sector: "Ritel (Elektronik)", ownership: "Kepemilikan strategis/kemitraan bisnis dalam ekspansi ritel di kawasan properti grup.", kepemilikan_persen: "Kemitraan/Minoritas", sejarah: "Distributor gadget terbesar RI. Sinergi dengan Agung Sedayu untuk penetrasi mal.", tahun_masuk: "2018", broker_afiliasi: "YP, PD", free_float: "45.1%" },
            { ticker: "ERAL", company: "PT Sinar Eka Selaras Tbk", sector: "Ritel (Gaya Hidup)", ownership: "Anak usaha ERAA, masuk dalam ekosistem kemitraan grup.", kepemilikan_persen: "Afiliasi", sejarah: "Anak usaha Erajaya yang berfokus pada gaya hidup dan olahraga.", tahun_masuk: "2023", broker_afiliasi: "YP, PD", free_float: "20.0%" },
            { ticker: "INPC", company: "PT Bank Artha Graha Internasional Tbk", sector: "Perbankan", ownership: "Kemitraan historis dan strategis dengan Tomy Winata (Artha Graha) yang erat dengan Aguan.", kepemilikan_persen: "Afiliasi Strategis", sejarah: "Bank hasil merger yang lekat dengan ekosistem bisnis SCBD dan Artha Graha.", tahun_masuk: "1990-an", broker_afiliasi: "KI, IN", free_float: "15.4%" },
            { ticker: "JIHD", company: "PT Jakarta International Hotels & Development Tbk", sector: "Properti & Perhotelan", ownership: "Terafiliasi melalui kongsi kawasan SCBD bersama jaringan Artha Graha.", kepemilikan_persen: "Kemitraan Konsorsium", sejarah: "Pengembang properti SCBD dan hotel Borobudur.", tahun_masuk: "1992", broker_afiliasi: "KI, IN", free_float: "12.0%" },
            { ticker: "PANI", company: "PT Pantai Indah Kapuk Dua Tbk", sector: "Properti & Real Estat", ownership: "Dikendalikan melalui PT Multi Artha Pratama (MAP) dengan kepemilikan dominan (sekitar 89%). Kendaraan utama mega-proyek PIK 2.", kepemilikan_persen: "89.2%", sejarah: "Awalnya produsen kemasan kaleng, diakuisisi via backdoor listing oleh konsorsium Agung Sedayu & Salim.", tahun_masuk: "2021", broker_afiliasi: "KI, BK, YP", free_float: "10.8%" },
            { ticker: "PDPP", company: "PT Primadaya Plastisindo Tbk", sector: "Manufaktur Kemasan", ownership: "Aguan secara pribadi memiliki porsi saham strategis (sekitar 5%).", kepemilikan_persen: "5.0%", sejarah: "Pabrik plastik dan kemasan, Aguan masuk sebagai investor strategis.", tahun_masuk: "2022", broker_afiliasi: "YP, CC", free_float: "20.0%" }
        ]
    },
    {
        id: "agus-projo",
        name: "Agus Projosasmito Group",
        desc: "Tokoh kunci di balik beberapa transaksi mega-akuisisi di sektor pertambangan, sering bertindak sebagai mitra strategis.",
        stocks: [
            { ticker: "AMMN", company: "PT Amman Mineral Internasional Tbk", sector: "Pertambangan (Emas & Tembaga)", ownership: "Agus Projosasmito menjabat sebagai Presiden Komisaris dan memiliki porsi saham strategis via AP Investment.", kepemilikan_persen: "15.5%", sejarah: "Mengakuisisi aset Newmont Nusa Tenggara pada 2016. Menjadi salah satu tambang terbesar.", tahun_masuk: "2016", broker_afiliasi: "KZ, RX, BB", free_float: "17.2%" },
            { ticker: "BRMS", company: "PT Bumi Resources Minerals Tbk", sector: "Pertambangan (Emas)", ownership: "Terafiliasi dalam ekosistem akuisisi bersama grup Bakrie dan Salim.", kepemilikan_persen: "Konsorsium (>30%)", sejarah: "Anak usaha BUMI yang difokuskan pada tambang emas di Palu.", tahun_masuk: "2022", broker_afiliasi: "MG, KI", free_float: "48.0%" },
            { ticker: "BUMI", company: "PT Bumi Resources Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Masuk bersama Grup Salim dalam skema private placement raksasa untuk merestrukturisasi utang BUMI.", kepemilikan_persen: "Afiliasi Pengendali", sejarah: "Raksasa batu bara eks-Bakrie yang diselamatkan oleh konsorsium Salim & AP Investment.", tahun_masuk: "2022", broker_afiliasi: "KI, MG", free_float: "42.0%" },
            { ticker: "MEDC", company: "PT Medco Energi Internasional Tbk", sector: "Energi (Minyak & Gas)", ownership: "Memiliki rekam jejak kepemilikan/kemitraan strategis historis dengan grup Medco.", kepemilikan_persen: "Afiliasi Historis", sejarah: "Agus Projo memiliki rekam jejak panjang bersama grup Medco sebagai deal-maker.", tahun_masuk: "2000-an", broker_afiliasi: "RX, YP", free_float: "48.5%" }
        ]
    },
    {
        id: "astra",
        name: "Astra Group",
        desc: "Salah satu konglomerasi paling terdiversifikasi dan tertua di Indonesia, dikendalikan oleh Jardine Matheson Group.",
        stocks: [
            { ticker: "AALI", company: "PT Astra Agro Lestari Tbk", sector: "Agrikultur (Kelapa Sawit)", ownership: "Dikuasai oleh ASII dengan porsi hampir 80%.", kepemilikan_persen: "79.68%", sejarah: "Divisi perkebunan Astra, salah satu produsen CPO terbesar.", tahun_masuk: "1988", broker_afiliasi: "RX, KZ", free_float: "20.32%" },
            { ticker: "ACST", company: "PT Acset Indonusa Tbk", sector: "Konstruksi", ownership: "Diakuisisi dan dikendalikan oleh Astra melalui PT United Tractors Tbk (UNTR).", kepemilikan_persen: "82.17% (via UNTR)", sejarah: "Diakuisisi UNTR untuk memperkuat divisi konstruksi.", tahun_masuk: "2015", broker_afiliasi: "CC, YP", free_float: "17.83%" },
            { ticker: "ASGR", company: "PT Astra Graphia Tbk", sector: "Teknologi & Solusi Dokumen", ownership: "Anak usaha ASII di bidang solusi dokumen dan TI.", kepemilikan_persen: "76.87%", sejarah: "Agen tunggal Fuji Xerox yang berkembang menjadi raksasa IT & solusi dokumen.", tahun_masuk: "1975", broker_afiliasi: "CC, PD", free_float: "23.13%" },
            { ticker: "ASII", company: "PT Astra International Tbk", sector: "Holding Multisektor", ownership: "Pemegang saham pengendali adalah Jardine Cycle & Carriage Ltd (>50%).", kepemilikan_persen: "50.11%", sejarah: "Diakuisisi oleh Jardine saat krisis finansial.", tahun_masuk: "1999", broker_afiliasi: "CS, KZ", free_float: "49.89%" },
            { ticker: "AUTO", company: "PT Astra Otoparts Tbk", sector: "Manufaktur Komponen Otomotif", ownership: "ASII memegang kendali penuh dengan kepemilikan di atas 80%.", kepemilikan_persen: "80.0%", sejarah: "Jaringan manufaktur dan distribusi suku cadang terbesar afiliasi Astra.", tahun_masuk: "1998", broker_afiliasi: "CS, YP", free_float: "20.0%" },
            { ticker: "UNTR", company: "PT United Tractors Tbk", sector: "Alat Berat & Pertambangan", ownership: "ASII memegang kepemilikan mayoritas sekitar 59.5%.", kepemilikan_persen: "59.5%", sejarah: "Distributor alat berat Komatsu, berevolusi menjadi raksasa kontraktor tambang.", tahun_masuk: "1972", broker_afiliasi: "CS, BK", free_float: "40.5%" },
            { ticker: "ARKO", company: "", sector: "Energi Terbarukan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "GOTO", company: "PT GoTo Gojek Tokopedia Tbk", sector: "Teknologi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "CC, PD, YP", free_float: "65.1%" },
            { ticker: "HEAL", company: "PT Medikaloka Hermina Tbk", sector: "Kesehatan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "35.2%" },
            { ticker: "MMLP", company: "", sector: "Properti & Logistik", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "bakrie",
        name: "Bakrie Group",
        desc: "Grup bisnis historis yang didirikan oleh Achmad Bakrie. Memiliki dominasi historis di sektor energi dan sumber daya.",
        stocks: [
            { ticker: "ALII", company: "PT Ancara Logistics Indonesia Tbk", sector: "Investasi / Holding", ownership: "Terkait dengan portofolio investasi keluarga Bakrie.", kepemilikan_persen: "Afiliasi Group", sejarah: "Entitas kendaraan investasi keluarga.", tahun_masuk: "2024", broker_afiliasi: "CP, YP", free_float: "20.0%" },
            { ticker: "BNBR", company: "PT Bakrie & Brothers Tbk", sector: "Holding Infrastruktur", ownership: "Perusahaan induk historis Grup Bakrie. Sering mengalami restrukturisasi utang.", kepemilikan_persen: "Minoritas (Keluarga)", sejarah: "Induk historis yang sering direstrukturisasi via konversi utang.", tahun_masuk: "1989", broker_afiliasi: "CP, YP", free_float: "80.0%" },
            { ticker: "BRMS", company: "PT Bumi Resources Minerals Tbk", sector: "Pertambangan (Emas)", ownership: "Anak usaha dari BUMI. Free float cukup besar di atas 40%.", kepemilikan_persen: "Afiliasi", sejarah: "Anak usaha pertambangan emas BUMI.", tahun_masuk: "2010", broker_afiliasi: "MG, YP", free_float: "48.0%" },
            { ticker: "BUMI", company: "PT Bumi Resources Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Grup Bakrie berbagi kendali dengan Grup Salim melalui Mach Energy.", kepemilikan_persen: "Konsorsium", sejarah: "Pernah menjadi saham sejuta umat. Direstrukturisasi Salim & Bakrie.", tahun_masuk: "1990", broker_afiliasi: "MG, KI", free_float: "42.0%" },
            { ticker: "DEWA", company: "PT Darma Henwa Tbk", sector: "Kontraktor Pertambangan", ownership: "Terafiliasi dengan grup Bakrie & Salim. Kepemilikan publik mendominasi.", kepemilikan_persen: "Afiliasi", sejarah: "Kontraktor andalan tambang Kaltim Prima Coal.", tahun_masuk: "2007", broker_afiliasi: "YP, PD", free_float: "55.0%" },
            { ticker: "ELTY", company: "PT Bakrieland Development Tbk", sector: "Properti & Real Estat", ownership: "Lini bisnis properti grup Bakrie (Rasuna Epicentrum).", kepemilikan_persen: "Afiliasi", sejarah: "Pengembang properti Epicentrum Kuningan.", tahun_masuk: "1996", broker_afiliasi: "YP, CP", free_float: "70.0%" },
            { ticker: "ENRG", company: "PT Energi Mega Persada Tbk", sector: "Energi (Minyak & Gas)", ownership: "Dikendalikan oleh keluarga Bakrie.", kepemilikan_persen: "Afiliasi Pengendali", sejarah: "Perusahaan migas independen Grup Bakrie.", tahun_masuk: "2004", broker_afiliasi: "YP, PD", free_float: "40.0%" },
            { ticker: "JGLE", company: "PT Graha Andrasentra Propertindo Tbk", sector: "Pariwisata & Properti", ownership: "Pengelola The Jungle Waterpark, bagian dari ekosistem Bakrie.", kepemilikan_persen: "Afiliasi", sejarah: "Proyek rekreasi dari Bakrieland.", tahun_masuk: "2016", broker_afiliasi: "YP", free_float: "60.0%" },
            { ticker: "MDIA", company: "PT Intermedia Capital Tbk", sector: "Media & Penyiaran", ownership: "Anak usaha dari VIVA (pengelola ANTV).", kepemilikan_persen: "89.9% (via VIVA)", sejarah: "Induk usaha dari stasiun TV ANTV.", tahun_masuk: "2014", broker_afiliasi: "YP", free_float: "10.0%" },
            { ticker: "UNSP", company: "PT Bakrie Sumatera Plantations Tbk", sector: "Agrikultur (Kelapa Sawit)", ownership: "Lini bisnis perkebunan kelapa sawit milik grup Bakrie.", kepemilikan_persen: "Afiliasi", sejarah: "Sayap perkebunan tertua milik grup Bakrie.", tahun_masuk: "1990", broker_afiliasi: "YP", free_float: "60.0%" },
            { ticker: "VIVA", company: "PT Visi Media Asia Tbk", sector: "Media & Penyiaran", ownership: "Induk perusahaan ANTV dan tvOne.", kepemilikan_persen: "Afiliasi Pengendali", sejarah: "Holding media grup Bakrie.", tahun_masuk: "2011", broker_afiliasi: "YP", free_float: "30.0%" },
            { ticker: "VKTR", company: "PT VKTR Teknologi Mobilitas Tbk", sector: "Kendaraan Listrik", ownership: "Spin-off dari BNBR (bus & kendaraan komersial listrik).", kepemilikan_persen: "Afiliasi", sejarah: "Transformasi bisnis Bakrie ke kendaraan listrik.", tahun_masuk: "2023", broker_afiliasi: "YP, CP", free_float: "20.0%" },
            { ticker: "BIPI", company: "", sector: "Pertambangan (Batu Bara)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BTEL", company: "", sector: "Telekomunikasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MTFN", company: "", sector: "Investasi / Holding", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "OASA", company: "", sector: "Energi Terbarukan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "ciputra",
        name: "Ciputra Group",
        desc: "Grup pengembang properti raksasa warisan mendiang Ir. Ciputra.",
        stocks: [
            { ticker: "CTRA", company: "PT Ciputra Development Tbk", sector: "Properti & Real Estat", ownership: "Dikendalikan oleh keluarga Ciputra melalui PT Sang Pelopor (sekitar 47%).", kepemilikan_persen: "47.0%", sejarah: "Perusahaan properti andalan keluarga Ciputra.", tahun_masuk: "1994", broker_afiliasi: "RX, AK", free_float: "53.0%" },
            { ticker: "MDKI", company: "", sector: "Manufaktur Kimia", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MKPI", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MTDL", company: "", sector: "Teknologi Informasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MTLA", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "ctcorp",
        name: "CT Corp",
        desc: "Konglomerasi milik Chairul Tanjung yang berfokus pada layanan finansial, media, hiburan, dan gaya hidup.",
        stocks: [
            { ticker: "BBHI", company: "PT Allo Bank Indonesia Tbk", sector: "Perbankan & Keuangan Digital", ownership: "CT Corp via PT Mega Corpora menguasai saham mayoritas ekosistem bank digital ini (sekitar 60%).", kepemilikan_persen: "60.8%", sejarah: "Akuisisi Bank Harda menjadi bank digital Allo Bank.", tahun_masuk: "2021", broker_afiliasi: "YP, PD", free_float: "15.0%" },
            { ticker: "GIAA", company: "PT Garuda Indonesia (Persero) Tbk", sector: "Transportasi Udara", ownership: "CT Corp melalui PT Trans Airways memiliki porsi saham minoritas namun strategis.", kepemilikan_persen: "7.9%", sejarah: "CT Corp masuk sebagai investor strategis Garuda Indonesia.", tahun_masuk: "2012", broker_afiliasi: "YP, RX", free_float: "15.0%" },
            { ticker: "MEGA", company: "PT Bank Mega Tbk", sector: "Perbankan", ownership: "Dikendalikan secara dominan oleh PT Mega Corpora milik CT Corp (>58%).", kepemilikan_persen: "58.0%", sejarah: "Bank pilar utama dalam ekosistem CT Corp.", tahun_masuk: "1996", broker_afiliasi: "PD, YP", free_float: "42.0%" }
        ]
    },
    {
        id: "danantara",
        name: "Danantara Group (BP Danantara / BUMN)",
        desc: "Sovereign Wealth Fund RI. Mengonsolidasikan aset BUMN terbesar tanah air.",
        stocks: [
            { ticker: "ADHI", company: "PT Adhi Karya (Persero) Tbk", sector: "Konstruksi BUMN", ownership: "Negara RI memegang kendali mayoritas.", kepemilikan_persen: "51.0%", sejarah: "BUMN Karya spesialisasi konstruksi jalan & rel.", tahun_masuk: "2004", broker_afiliasi: "YP, CC", free_float: "49.0%" },
            { ticker: "ANTM", company: "PT Aneka Tambang Tbk", sector: "Pertambangan (Logam Mulia & Nikel)", ownership: "Anggota holding MIND ID. Negara RI via Inalum.", kepemilikan_persen: "65.0%", sejarah: "BUMN pertambangan nikel dan emas.", tahun_masuk: "1997", broker_afiliasi: "RX, YP", free_float: "35.0%" },
            { ticker: "BBCA", company: "PT Bank Central Asia Tbk", sector: "Perbankan", ownership: "Porsi minoritas/investasi SWF/BUMN di bank swasta terbesar.", kepemilikan_persen: "Investasi SWF", sejarah: "Investasi strategis institusi negara.", tahun_masuk: "2000-an", broker_afiliasi: "RX, AK", free_float: "45.1%" },
            { ticker: "BBNI", company: "PT Bank Negara Indonesia (Persero) Tbk", sector: "Perbankan", ownership: "Negara RI memegang 60%.", kepemilikan_persen: "60.0%", sejarah: "Bank BUMN tertua paska kemerdekaan RI.", tahun_masuk: "1996", broker_afiliasi: "RX, AK", free_float: "40.0%" },
            { ticker: "BBRI", company: "PT Bank Rakyat Indonesia (Persero) Tbk", sector: "Perbankan", ownership: "Negara RI memegang 53%. Salah satu market cap terbesar.", kepemilikan_persen: "53.19%", sejarah: "Bank dengan spesialisasi mikro terbesar.", tahun_masuk: "2003", broker_afiliasi: "BK, AK", free_float: "46.81%" },
            { ticker: "BBTN", company: "PT Bank Tabungan Negara (Persero) Tbk", sector: "Perbankan", ownership: "Negara RI memegang 60%. Fokus pembiayaan perumahan.", kepemilikan_persen: "60.0%", sejarah: "Bank BUMN penyalur KPR utama.", tahun_masuk: "2009", broker_afiliasi: "RX, YP", free_float: "40.0%" },
            { ticker: "BKSL", company: "PT Sentul City Tbk", sector: "Properti", ownership: "Porsi investasi/restrukturisasi yang melibatkan institusi negara/BUMN.", kepemilikan_persen: "Afiliasi Restrukturisasi", sejarah: "Terkait restrukturisasi aset properti via BUMN.", tahun_masuk: "2010-an", broker_afiliasi: "YP", free_float: "60.0%" },
            { ticker: "BMRI", company: "PT Bank Mandiri (Persero) Tbk", sector: "Perbankan", ownership: "Negara RI memegang 52% saham pengendali utama.", kepemilikan_persen: "52.0%", sejarah: "Bank BUMN terbesar dari sisi aset, hasil peleburan (merger) 4 bank pemerintah pada krisis 1998.", tahun_masuk: "1998", broker_afiliasi: "RX, AK, KZ", free_float: "48.0%" },
            { ticker: "BMTR", company: "PT Global Mediacom Tbk", sector: "Holding Media", ownership: "Negara RI memegang 52%.", kepemilikan_persen: "52.0%", sejarah: "MNC Media & Entertainment adalah perusahaan media massa dan telekomunikasi asal Indonesia yang didirikan sejak 1981. Perusahaan ini masih berada dalam naungan MNC Asia Holding dan merupakan induk dari Media Nusantara Citra..", tahun_masuk: "2003", broker_afiliasi: "EP, MN", free_float: "42.1%" },
            { ticker: "BRIS", company: "PT Bank Syariah Indonesia Tbk", sector: "Perbankan Syariah", ownership: "Hasil merger bank syariah BUMN (Mandiri, BRI, BNI).", kepemilikan_persen: "Mayoritas (BMRI, BBRI, BBNI)", sejarah: "Merger tiga raksasa bank syariah BUMN.", tahun_masuk: "2021", broker_afiliasi: "RX, YP", free_float: "20.0%" },
            { ticker: "GIAA", company: "PT Garuda Indonesia (Persero) Tbk", sector: "Transportasi Udara", ownership: "Maskapai *flag carrier* milik Negara RI.", kepemilikan_persen: "60.5%", sejarah: "Maskapai nasional RI.", tahun_masuk: "2011", broker_afiliasi: "YP, CC", free_float: "15.0%" },
            { ticker: "GOTO", company: "PT GoTo Gojek Tokopedia Tbk", sector: "Teknologi", ownership: "Keterlibatan investasi institusi negara (BUMN/SWF) secara historis melalui investasi Telkomsel.", kepemilikan_persen: "Investasi Strategis BUMN", sejarah: "Raksasa teknologi decacorn hasil merger Gojek dan Tokopedia, mendapat pendanaan strategis dari ekosistem BUMN.", tahun_masuk: "2020", broker_afiliasi: "CC, PD, YP", free_float: "65.1%" },
            { ticker: "INCO", company: "PT Vale Indonesia Tbk", sector: "Pertambangan (Nikel)", ownership: "MIND ID (BUMN) baru saja menambah porsi menjadi pemegang saham mayoritas.", kepemilikan_persen: "34.0% (MIND ID)", sejarah: "Eks-Kanada yang diakuisisi untuk ketahanan nikel RI.", tahun_masuk: "2020", broker_afiliasi: "BK, RX", free_float: "20.6%" },
            { ticker: "JSMR", company: "PT Jasa Marga (Persero) Tbk", sector: "Infrastruktur", ownership: "Pengelola jalan tol pelat merah.", kepemilikan_persen: "70.0%", sejarah: "Raksasa pengelola jalan tol di Indonesia.", tahun_masuk: "2007", broker_afiliasi: "RX, YP", free_float: "30.0%" },
            { ticker: "KAEF", company: "PT Kimia Farma Tbk", sector: "Farmasi BUMN", ownership: "Bagian dari holding BUMN farmasi (Bio Farma).", kepemilikan_persen: "90.0% (Bio Farma)", sejarah: "Pabrik farmasi dan apotek negara.", tahun_masuk: "2001", broker_afiliasi: "YP", free_float: "10.0%" },
            { ticker: "KRAS", company: "PT Krakatau Steel (Persero) Tbk", sector: "Manufaktur Baja", ownership: "BUMN produsen baja nasional.", kepemilikan_persen: "80.0%", sejarah: "Pabrik baja raksasa di Cilegon.", tahun_masuk: "2010", broker_afiliasi: "YP", free_float: "20.0%" },
            { ticker: "MBMA", company: "PT Merdeka Battery Materials Tbk", sector: "Material Baterai & Nikel", ownership: "Keterlibatan investasi strategis institusi negara dalam rantai pasok EV.", kepemilikan_persen: "Afiliasi SWF", sejarah: "Ekosistem nikel grup Merdeka dengan dukungan investasi negara.", tahun_masuk: "2023", broker_afiliasi: "RX, KZ", free_float: "15.0%" },
            { ticker: "PGAS", company: "PT Perusahaan Gas Negara Tbk", sector: "Energi (Minyak & Gas)", ownership: "Aset BUMN gas (Sub-holding Pertamina).", kepemilikan_persen: "56.9% (Pertamina)", sejarah: "Sub-holding gas bagian dari grup Pertamina.", tahun_masuk: "2003", broker_afiliasi: "RX, AK", free_float: "43.1%" },
            { ticker: "PTBA", company: "PT Bukit Asam Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Anggota holding MIND ID.", kepemilikan_persen: "65.9% (MIND ID)", sejarah: "Perusahaan batu bara pelat merah di Sumatera.", tahun_masuk: "2002", broker_afiliasi: "YP, RX", free_float: "34.1%" },
            { ticker: "PTPP", company: "PT PP (Persero) Tbk", sector: "Konstruksi BUMN", ownership: "Negara RI bertindak sebagai pemegang saham pengendali mayoritas.", kepemilikan_persen: "51.0%", sejarah: "BUMN Karya dengan portofolio kuat di pembangunan gedung, pelabuhan, dan infrastruktur utama.", tahun_masuk: "2010", broker_afiliasi: "YP, PD", free_float: "49.0%" },
            { ticker: "SMGR", company: "PT Semen Indonesia (Persero) Tbk", sector: "Infrastruktur & Material", ownership: "Holding BUMN Semen.", kepemilikan_persen: "51.2%", sejarah: "Holding dari pabrik semen milik negara.", tahun_masuk: "1991", broker_afiliasi: "RX, BK", free_float: "48.8%" },
            { ticker: "TINS", company: "PT Timah Tbk", sector: "Pertambangan (Timah)", ownership: "Anggota holding MIND ID.", kepemilikan_persen: "65.0% (MIND ID)", sejarah: "Produsen timah milik BUMN.", tahun_masuk: "1995", broker_afiliasi: "YP, RX", free_float: "35.0%" },
            { ticker: "TLKM", company: "PT Telkom Indonesia (Persero) Tbk", sector: "Teknologi & Telekomunikasi", ownership: "Negara RI memegang 52%.", kepemilikan_persen: "52.09%", sejarah: "Monopoli telekomunikasi historis RI.", tahun_masuk: "1995", broker_afiliasi: "CS, KZ", free_float: "47.91%" },
            { ticker: "TOBA", company: "PT TBS Energi Utama Tbk", sector: "Energi", ownership: "Kerjasama transisi energi dan investasi ekosistem EV dengan BUMN.", kepemilikan_persen: "Afiliasi / Kemitraan", sejarah: "Bermitra dengan BUMN untuk pengembangan ekosistem motor listrik (Electrum).", tahun_masuk: "2021", broker_afiliasi: "YP, PD", free_float: "20.0%" },
            { ticker: "TPIA", company: "PT Chandra Asri Pacific Tbk", sector: "Manufaktur Petrokimia", ownership: "Investasi institusi negara/Sovereign Wealth Fund di sektor hilirisasi.", kepemilikan_persen: "Afiliasi SWF", sejarah: "Mendapat pendanaan INA (SWF) untuk ketahanan petrokimia.", tahun_masuk: "2022", broker_afiliasi: "DX, BB", free_float: "7.2%" },
            { ticker: "WIKA", company: "PT Wijaya Karya (Persero) Tbk", sector: "Konstruksi BUMN", ownership: "Negara RI memegang kepemilikan mayoritas.", kepemilikan_persen: "65.0%", sejarah: "BUMN Karya terkemuka yang berfokus pada infrastruktur strategis nasional, termasuk konsorsium kereta cepat.", tahun_masuk: "2007", broker_afiliasi: "YP, CC", free_float: "35.0%" },
            { ticker: "ADCP", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "AGRO", company: "", sector: "Perbankan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "ELSA", company: "", sector: "Energi (Jasa Migas)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "GMFI", company: "", sector: "Aviasi & Jasa Perawatan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "INAF", company: "", sector: "Farmasi BUMN", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "IPCC", company: "", sector: "Infrastruktur & Logistik", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "IPCM", company: "", sector: "Infrastruktur & Logistik", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "ITMG", company: "", sector: "Pertambangan (Batu Bara)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MTEL", company: "", sector: "Infrastruktur Telekomunikasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "NIKL", company: "", sector: "Manufaktur Logam", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PEHA", company: "", sector: "Farmasi BUMN", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PGEO", company: "", sector: "Energi Terbarukan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PPRE", company: "", sector: "Konstruksi BUMN", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PPRO", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "SMBR", company: "", sector: "Infrastruktur & Material", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "SMCB", company: "", sector: "Infrastruktur & Material", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "TUGU", company: "", sector: "Asuransi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "WEGE", company: "", sector: "Konstruksi BUMN", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "WSBP", company: "", sector: "Konstruksi BUMN", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "WSKT", company: "", sector: "Konstruksi BUMN", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "WTON", company: "", sector: "Konstruksi BUMN", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "djarum",
        name: "Djarum Group",
        desc: "Grup bisnis milik Budi Hartono dan Michael Hartono. Menguasai sektor perbankan, infrastruktur digital, dan properti.",
        stocks: [
            { ticker: "BBCA", company: "PT Bank Central Asia Tbk", sector: "Perbankan", ownership: "Mayoritas saham (54.9%) dikuasai melalui PT Dwimuria Investama Andalan.", kepemilikan_persen: "54.9%", sejarah: "Diakuisisi Djarum pasca krisis 1998, kini menjadi bank dengan valuasi terbesar di RI.", tahun_masuk: "2002", broker_afiliasi: "RX, AK", free_float: "45.1%" },
            { ticker: "BELI", company: "PT Global Digital Niaga Tbk", sector: "E-Commerce", ownership: "E-commerce (Blibli) dan tiket.com.", kepemilikan_persen: "83.0%", sejarah: "Grup Djarum mengkonsolidasikan bisnis digital mereka via Blibli.", tahun_masuk: "2022", broker_afiliasi: "BCA, YP", free_float: "17.0%" },
            { ticker: "DATA", company: "PT Remala Abadi Tbk / Keanggotaan Ekosistem", sector: "Pusat Data", ownership: "Investasi afiliasi Djarum dalam infrastruktur internet & cloud.", kepemilikan_persen: "Afiliasi (Kemitraan)", sejarah: "Kolaborasi infrastruktur jaringan bersama Otto Sugiri dan Salim.", tahun_masuk: "2020-an", broker_afiliasi: "RX, PD", free_float: "15.0%" },
            { ticker: "HEAL", company: "PT Medikaloka Hermina Tbk", sector: "Kesehatan", ownership: "Investasi strategis portofolio grup di sektor rumah sakit.", kepemilikan_persen: "Minoritas Strategis", sejarah: "Investasi ekosistem untuk diversifikasi portfolio Djarum ke healthcare.", tahun_masuk: "2021", broker_afiliasi: "RX, AK", free_float: "35.2%" },
            { ticker: "IBST", company: "PT Inti Bangun Sejahtera Tbk", sector: "Infrastruktur Telekomunikasi", ownership: "Diakuisisi untuk memperkuat bisnis menara telekomunikasi grup.", kepemilikan_persen: "Mayoritas via TOWR", sejarah: "Konsolidasi bisnis tower Djarum.", tahun_masuk: "2024", broker_afiliasi: "BCA", free_float: "10.0%" },
            { ticker: "RANC", company: "PT Supra Boga Lestari Tbk", sector: "Ritel Konsumsi", ownership: "Ritel supermarket (Ranch Market) bagian ekosistem Blibli.", kepemilikan_persen: "70.5% (via Blibli)", sejarah: "Diakuisisi Blibli untuk memperkuat bisnis O2O (Online to Offline).", tahun_masuk: "2021", broker_afiliasi: "BCA, YP", free_float: "29.5%" },
            { ticker: "SSIA", company: "PT Surya Semesta Internusa Tbk", sector: "Properti & Kawasan Industri", ownership: "Investasi afiliasi Djarum di pengembangan kawasan industri (Subang Smartpolitan).", kepemilikan_persen: "Kemitraan Konsorsium", sejarah: "Kemitraan properti kawasan logistik strategis.", tahun_masuk: "2020-an", broker_afiliasi: "RX, PD", free_float: "40.0%" },
            { ticker: "SUPR", company: "PT Solusi Tunas Pratama Tbk", sector: "Infrastruktur Telekomunikasi", ownership: "Diakuisisi oleh TOWR, memperkuat monopoli menara telekomunikasi Djarum.", kepemilikan_persen: "99.9% (via TOWR)", sejarah: "Diakuisisi TOWR secara masif.", tahun_masuk: "2021", broker_afiliasi: "BCA", free_float: "0.1%" },
            { ticker: "TOWR", company: "PT Sarana Menara Nusantara Tbk", sector: "Infrastruktur Telekomunikasi", ownership: "Dikendalikan melalui PT Sapta Adhikari Investama (>50%).", kepemilikan_persen: "54.4%", sejarah: "Kendaraan infrastruktur telekomunikasi Djarum yang paling dominan.", tahun_masuk: "2010", broker_afiliasi: "BCA, RX", free_float: "45.6%" },
            { ticker: "BACH", company: "", sector: "Teknologi & Media", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BTEL", company: "", sector: "Telekomunikasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "NRCA", company: "", sector: "Konstruksi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "WOOD", company: "", sector: "Manufaktur", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "emtk",
        name: "EMTK Group",
        desc: "Keluarga Eddy Kusnadi Sariaatmadja. Konglomerasi raksasa ekosistem teknologi, kesehatan, dan digital.",
        stocks: [
            { ticker: "BBHI", company: "PT Allo Bank Indonesia Tbk", sector: "Perbankan & Keuangan Digital", ownership: "Grup EMTK dan Bukalapak memiliki porsi investasi strategis di bank ini.", kepemilikan_persen: "Konsorsium Minoritas", sejarah: "EMTK beraliansi dengan CT Corp dan Salim di Allo Bank.", tahun_masuk: "2021", broker_afiliasi: "YP, PD", free_float: "15.0%" },
            { ticker: "BUKA", company: "PT Bukalapak.com Tbk", sector: "E-Commerce", ownership: "EMTK adalah pemegang saham institusi terbesar di BUKA.", kepemilikan_persen: "23.9%", sejarah: "Investasi andalan EMTK di sektor tech sejak sebelum IPO.", tahun_masuk: "2015", broker_afiliasi: "YP, CC", free_float: "55.0%" },
            { ticker: "CASS", company: "PT Cahaya Aero Services Tbk", sector: "Aviasi & Logistik", ownership: "Grup EMTK mengakuisisi porsi mayoritas (sekitar 51%) untuk ekspansi bisnis logistik.", kepemilikan_persen: "51.0%", sejarah: "Diversifikasi bisnis EMTK ke layanan aviasi dan logistik (sejalan dengan MRA).", tahun_masuk: "2024", broker_afiliasi: "YP", free_float: "49.0%" },
            { ticker: "EMTK", company: "PT Elang Mahkota Teknologi Tbk", sector: "Teknologi & Holding", ownership: "Keluarga Sariaatmadja bertindak sebagai pengendali.", kepemilikan_persen: "78.0%", sejarah: "Perusahaan media dan tech pilar keluarga Sariaatmadja.", tahun_masuk: "1983", broker_afiliasi: "KZ, RX", free_float: "22.0%" },
            { ticker: "SAME", company: "PT Sarana Meditama Metropolitan Tbk", sector: "Kesehatan (Rumah Sakit)", ownership: "Dikendalikan oleh EMTK (>70%), pengelola RS Omni.", kepemilikan_persen: "76.4%", sejarah: "Diakuisisi EMTK untuk membangun gurita bisnis healthcare (Omni & EMC).", tahun_masuk: "2020", broker_afiliasi: "YP, PD", free_float: "23.6%" },
            { ticker: "SCMA", company: "PT Surya Citra Media Tbk", sector: "Media & Penyiaran", ownership: "Anak usaha langsung EMTK (SCTV, Indosiar, Vidio).", kepemilikan_persen: "73.2%", sejarah: "Perusahaan media TV tradisional (SCTV) dan digital (Vidio) milik EMTK.", tahun_masuk: "1999", broker_afiliasi: "RX, YP", free_float: "26.8%" },
            { ticker: "JECX", company: "", sector: "Lainnya", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "RSGK", company: "", sector: "Lainnya", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "happy-hapsoro",
        name: "Happy Hapsoro Group",
        desc: "Portofolio investasi yang terafiliasi dengan pengusaha Hapsoro Sukmonohadi.",
        stocks: [
            { ticker: "BUVA", company: "PT Bukit Uluwatu Villa Tbk", sector: "Properti & Pariwisata", ownership: "Keterlibatan investasi strategis grup di sektor perhotelan mewah.", kepemilikan_persen: "Afiliasi Strategis", sejarah: "Investasi di properti hospitality (hotel mewah di Bali).", tahun_masuk: "2021", broker_afiliasi: "PD, YP", free_float: "40.0%" },
            { ticker: "CBRE", company: "PT Cakra Buana Resources Tbk", sector: "Pelayaran & Logistik", ownership: "Pemegang saham utama tidak langsung via PT Basis Inovasi Agro.", kepemilikan_persen: "Afiliasi Kendali", sejarah: "Investasi maritim logistik angkutan curah.", tahun_masuk: "2023", broker_afiliasi: "YP", free_float: "30.0%" },
            { ticker: "MINA", company: "PT Sanurhasta Mitra Tbk", sector: "Properti & Pariwisata", ownership: "Terafiliasi melalui PT Basis Utama Prima.", kepemilikan_persen: "Afiliasi", sejarah: "Keterlibatan via entitas kendaraan investasi Basis Utama Prima.", tahun_masuk: "2019", broker_afiliasi: "YP", free_float: "50.0%" },
            { ticker: "PADI", company: "PT Minna Padi Investama Sekuritas Tbk", sector: "Keuangan & Sekuritas", ownership: "Memiliki rekam jejak kepemilikan/afiliasi investasi.", kepemilikan_persen: "Afiliasi Historis", sejarah: "Terkait dalam sejarah transaksi investasi pasar modal grup.", tahun_masuk: "2010-an", broker_afiliasi: "YP", free_float: "60.0%" },
            { ticker: "PSKT", company: "PT Red Planet Indonesia Tbk", sector: "Perhotelan", ownership: "Tercatat dalam portofolio investasi Basis Utama Prima.", kepemilikan_persen: "Afiliasi", sejarah: "Investasi di jaringan hotel budget.", tahun_masuk: "2020", broker_afiliasi: "YP", free_float: "40.0%" },
            { ticker: "PTRO", company: "PT Petrosea Tbk", sector: "Kontraktor Pertambangan", ownership: "Happy Hapsoro via Sentra Makmur Lines memegang porsi saham bersama Prajogo.", kepemilikan_persen: "18.0%", sejarah: "Bergabung dengan Prajogo mengakuisisi Petrosea pasca dilepas Lo Kheng Hong.", tahun_masuk: "2024", broker_afiliasi: "BB, YP", free_float: "21.5%" },
            { ticker: "RAJA", company: "PT Rukun Raharja Tbk", sector: "Energi (Infrastruktur Gas)", ownership: "Pemegang saham pengendali (baik langsung maupun via PT Sentra Sukses, total >30%).", kepemilikan_persen: "32.0%", sejarah: "Aset bisnis utama grup Happy Hapsoro di bidang pipanisasi dan infrastruktur gas.", tahun_masuk: "2010", broker_afiliasi: "YP, PD", free_float: "68.0%" },
            { ticker: "RATU", company: "PT Raharja Energi Cepu Tbk", sector: "Energi & Properti", ownership: "Masuk dalam radar investasi portofolio terkait grup.", kepemilikan_persen: "Afiliasi", sejarah: "Manuver investasi energi.", tahun_masuk: "2022", broker_afiliasi: "YP", free_float: "70.0%" },
            { ticker: "SINI", company: "PT Singaraja Putra Tbk", sector: "Energi & Infrastruktur", ownership: "Diakuisisi dan dikendalikan oleh entitas afiliasi grup.", kepemilikan_persen: "Afiliasi Pengendali", sejarah: "Diakuisisi untuk pivot ke bisnis energi dan perhotelan.", tahun_masuk: "2022", broker_afiliasi: "YP, CC", free_float: "30.0%" },
            { ticker: "UANG", company: "PT Pakuan Tbk", sector: "Properti & Real Estat", ownership: "Afiliasi investasi grup di pengembangan properti (Sawangan).", kepemilikan_persen: "Afiliasi", sejarah: "Proyek pengembangan kota mandiri bersama pengembang asing.", tahun_masuk: "2022", broker_afiliasi: "YP", free_float: "20.0%" },
            { ticker: "ARKO", company: "", sector: "Energi Terbarukan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "harita",
        name: "Harita Group",
        desc: "Keluarga Lim Hariyanto Wijaya Sarwono. Konglomerasi yang kuat di pertambangan nikel, bauksit, dan kayu.",
        stocks: [
            { ticker: "CITA", company: "PT Cita Mineral Investindo Tbk", sector: "Pertambangan (Bauksit)", ownership: "Dikendalikan penuh oleh Harita Group.", kepemilikan_persen: "71.0%", sejarah: "Tambang bauksit dan produsen alumina andalan Harita.", tahun_masuk: "2007", broker_afiliasi: "YP, RX", free_float: "29.0%" },
            { ticker: "NCKL", company: "PT Trimegah Bangun Persada Tbk", sector: "Pertambangan (Nikel)", ownership: "Keluarga Lim mengendalikan >80% (PT Harita Jayaraya).", kepemilikan_persen: "86.0%", sejarah: "Tambang nikel terintegrasi raksasa di Pulau Obi.", tahun_masuk: "2023", broker_afiliasi: "CC, YP", free_float: "14.0%" },
            { ticker: "TIRT", company: "PT Tirta Mahakam Resources Tbk", sector: "Kehutanan & Kayu", ownership: "Perusahaan pengolahan kayu yang terafiliasi dengan keluarga Lim / Harita.", kepemilikan_persen: "Afiliasi Historis", sejarah: "Aset kehutanan lawas milik keluarga Harita.", tahun_masuk: "1999", broker_afiliasi: "YP", free_float: "30.0%" }
        ]
    },
    {
        id: "lippo",
        name: "Lippo Group",
        desc: "Didirikan oleh Mochtar Riady. Menguasai sektor real estat terintegrasi, ritel, kesehatan, dan multimedia.",
        stocks: [
            { ticker: "GMTD", company: "PT Gowa Makassar Tourism Development Tbk", sector: "Properti & Pariwisata", ownership: "Grup Lippo mengendalikan pengembangan kawasan properti Tanjung Bunga Makassar.", kepemilikan_persen: "62.7% (via LPKR)", sejarah: "Pengembang kawasan perumahan Tanjung Bunga di Makassar.", tahun_masuk: "1990-an", broker_afiliasi: "LP", free_float: "20.0%" },
            { ticker: "LPCK", company: "PT Lippo Cikarang Tbk", sector: "Properti & Kawasan Industri", ownership: "Anak usaha langsung dari LPKR (sekitar 84% kepemilikan).", kepemilikan_persen: "84.0% (via LPKR)", sejarah: "Pengembang kota mandiri Meikarta dan Lippo Cikarang.", tahun_masuk: "1997", broker_afiliasi: "LP", free_float: "16.0%" },
            { ticker: "LPGI", company: "PT Lippo General Insurance Tbk", sector: "Asuransi", ownership: "Sayap bisnis asuransi umum milik Lippo.", kepemilikan_persen: "Afiliasi Mayoritas", sejarah: "Layanan asuransi terafiliasi ekosistem kesehatan dan properti Lippo.", tahun_masuk: "1982", broker_afiliasi: "LP", free_float: "20.0%" },
            { ticker: "LPIN", company: "PT Multi Prima Sejahtera Tbk", sector: "Manufaktur & Suku Cadang", ownership: "Perusahaan manufaktur komponen yang dikendalikan oleh PT Lippo Karawaci.", kepemilikan_persen: "Afiliasi LPKR", sejarah: "Aset lama Lippo di bidang manufaktur suku cadang.", tahun_masuk: "1990", broker_afiliasi: "LP", free_float: "25.0%" },
            { ticker: "LPKR", company: "PT Lippo Karawaci Tbk", sector: "Properti & Real Estat", ownership: "Dikendalikan oleh keluarga Riady melalui PT Inti Anugerah Pratama (holding properti utama).", kepemilikan_persen: "59.0%", sejarah: "Perusahaan induk properti Lippo terbesar (Kawasan Karawaci).", tahun_masuk: "1996", broker_afiliasi: "LP, RX", free_float: "41.0%" },
            { ticker: "LPLI", company: "PT Star Pacific Tbk", sector: "Investasi & Media", ownership: "Kendaraan investasi grup, terafiliasi historis dengan bisnis media/IT Lippo.", kepemilikan_persen: "Afiliasi Lippo", sejarah: "Perusahaan cangkang investasi Lippo.", tahun_masuk: "1989", broker_afiliasi: "LP", free_float: "35.0%" },
            { ticker: "LPPF", company: "PT Matahari Department Store Tbk", sector: "Ritel Konsumsi", ownership: "Grup Lippo mempertahankan status strategis melalui Auric Digital Retail.", kepemilikan_persen: "Auric (Terafiliasi)", sejarah: "Dikelola Lippo bersama investor institusi (Auric). Jaringan ritel terbesar di RI.", tahun_masuk: "1989", broker_afiliasi: "LP, RX", free_float: "55.0%" },
            { ticker: "LPPS", company: "PT Lippo Securities Tbk", sector: "Keuangan & Investasi", ownership: "Perusahaan sekuritas bentukan awal grup Lippo.", kepemilikan_persen: "Afiliasi Lippo", sejarah: "Sayap broker saham Lippo.", tahun_masuk: "1994", broker_afiliasi: "LP", free_float: "25.0%" },
            { ticker: "MLPL", company: "PT Multipolar Tbk", sector: "Perusahaan Investasi / Holding", ownership: "Holding investasi teknologi dan ritel (induk dari MPPA).", kepemilikan_persen: "Afiliasi Pengendali", sejarah: "Induk bisnis ritel dan teknologi (Hypermart & IT).", tahun_masuk: "1989", broker_afiliasi: "LP", free_float: "40.0%" },
            { ticker: "MLPT", company: "PT Multipolar Technology Tbk", sector: "Teknologi Informasi", ownership: "Anak usaha MLPL berfokus pada integrasi sistem TI.", kepemilikan_persen: "86.0% (via MLPL)", sejarah: "Penyedia jasa dan integrasi teknologi.", tahun_masuk: "2013", broker_afiliasi: "LP", free_float: "14.0%" },
            { ticker: "MPPA", company: "PT Matahari Putra Prima Tbk", sector: "Ritel Konsumsi", ownership: "Pengelola Hypermart, dikendalikan via Multipolar (MLPL).", kepemilikan_persen: "50.2% (via MLPL)", sejarah: "Jaringan supermarket Hypermart yang beraliansi dengan GoTo.", tahun_masuk: "1992", broker_afiliasi: "LP", free_float: "49.8%" },
            { ticker: "NOBU", company: "PT Bank Nationalnobu Tbk", sector: "Perbankan", ownership: "Bank swasta milik keluarga Riady.", kepemilikan_persen: "Afiliasi Keluarga Riady", sejarah: "Bank komersial Lippo pasca menjual Bank Lippo ke CIMB.", tahun_masuk: "2013", broker_afiliasi: "LP", free_float: "20.0%" },
            { ticker: "SILO", company: "PT Siloam International Hospitals Tbk", sector: "Kesehatan (Rumah Sakit)", ownership: "Bersama CVC Capital Partners sebagai pemegang saham utama. Jaringan RS terbesar Lippo.", kepemilikan_persen: "Kemitraan CVC", sejarah: "Jaringan RS swasta terbesar di Indonesia yang dibangun oleh Lippo.", tahun_masuk: "2013", broker_afiliasi: "LP, RX", free_float: "15.0%" },
            { ticker: "ARKO", company: "", sector: "Energi Terbarukan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "KBLV", company: "", sector: "Media & Telekomunikasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "lkh",
        name: "Lo Kheng Hong Group",
        desc: "Value Investor perorangan paling sukses di Indonesia yang membeli porsi besar (>5%) di emiten salah harga.",
        stocks: [
            { ticker: "ABMM", company: "PT ABM Investama Tbk", sector: "Energi & Tambang", ownership: "Kepemilikan besar di atas 5%. Berfokus pada dividen yield.", kepemilikan_persen: "5.1%", sejarah: "LKH mulai mengakumulasi ABMM karena valuasi murah & dividen besar.", tahun_masuk: "2021", broker_afiliasi: "PD, YP", free_float: "25.0%" },
            { ticker: "ANJT", company: "PT Austindo Nusantara Jaya Tbk", sector: "Agrikultur (Kelapa Sawit)", ownership: "LKH mengoleksi saham perkebunan ini karena fundamental valuasi murah (PBV).", kepemilikan_persen: "5.0%", sejarah: "Dibeli karena memiliki aset perkebunan bagus dengan valuasi diskon.", tahun_masuk: "2023", broker_afiliasi: "PD, CC", free_float: "20.0%" },
            { ticker: "BBRI", company: "PT Bank Rakyat Indonesia (Persero) Tbk", sector: "Perbankan", ownership: "Salah satu pilar investasi blue-chip yang dipegang LKH untuk dividen dan growth panjang.", kepemilikan_persen: "Individu (<1%)", sejarah: "Koleksi big bank yang sering disebut LKH sebagai instrumen growth.", tahun_masuk: "2010-an", broker_afiliasi: "PD, AK", free_float: "46.81%" },
            { ticker: "BDMN", company: "PT Bank Danamon Indonesia Tbk", sector: "Perbankan", ownership: "Saham perbankan yang masuk portofolio LKH.", kepemilikan_persen: "Individu (<5%)", sejarah: "Diakumulasi saat PBV bank Danamon berada di titik terendah.", tahun_masuk: "2023", broker_afiliasi: "PD", free_float: "7.5%" },
            { ticker: "BMTR", company: "PT Global Mediacom Tbk", sector: "Holding Media", ownership: "LKH memegang porsi saham signifikan di atas 6% secara individu.", kepemilikan_persen: "6.6%", sejarah: "Dinilai LKH salah harga karena valuasi induk lebih murah dari anak.", tahun_masuk: "2020", broker_afiliasi: "PD, YP", free_float: "42.1%" },
            { ticker: "CFIN", company: "PT Clipan Finance Indonesia Tbk", sector: "Perbankan & Pembiayaan", ownership: "Pernah menjadi pemegang saham terbesar secara individu.", kepemilikan_persen: "Individu (Historis 5%)", sejarah: "Pernah memberi cuan besar saat saham leasing ini breakout.", tahun_masuk: "2021", broker_afiliasi: "PD", free_float: "48.5%" },
            { ticker: "DILD", company: "PT Intiland Development Tbk", sector: "Properti & Real Estat", ownership: "Masuk dalam portofolio investasi >5% untuk aset properti murah.", kepemilikan_persen: "6.5%", sejarah: "Dibeli LKH karena aset landbank yang besar (salah harga).", tahun_masuk: "2022", broker_afiliasi: "PD, CC", free_float: "35.2%" },
            { ticker: "GJTL", company: "PT Gajah Tunggal Tbk", sector: "Manufaktur (Otomotif)", ownership: "Salah satu portofolio andalan LKH (porsi di atas 5%).", kepemilikan_persen: "5.2%", sejarah: "Dibeli saat utang membengkak, dan dijual saat turnaround.", tahun_masuk: "2021", broker_afiliasi: "PD, CC", free_float: "34.8%" },
            { ticker: "NISP", company: "PT Bank OCBC NISP Tbk", sector: "Perbankan", ownership: "Secara historis merupakan salah satu koleksi perbankan milik LKH.", kepemilikan_persen: "Individu", sejarah: "Salah satu pundi perbankan LKH di masa lalu.", tahun_masuk: "2020", broker_afiliasi: "PD", free_float: "15.0%" },
            { ticker: "PGAS", company: "PT Perusahaan Gas Negara Tbk", sector: "Energi (Minyak & Gas)", ownership: "Tercatat sebagai koleksi investasi value investing LKH.", kepemilikan_persen: "Individu", sejarah: "Diakumulasi karena dinilai dividen yield dan PBV nya atraktif.", tahun_masuk: "2023", broker_afiliasi: "PD", free_float: "43.1%" },
            { ticker: "ADMG", company: "PT Polychem Indonesia Tbk", sector: "Manufaktur", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "CC", free_float: "30.0%" },
            { ticker: "BEST", company: "", sector: "Properti (Kawasan Industri)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BNGA", company: "", sector: "Perbankan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "LSIP", company: "PT PP London Sumatra Indonesia Tbk", sector: "Agrikultur", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "KI, RX", free_float: "40.6%" },
            { ticker: "MAIN", company: "", sector: "Barang Konsumsi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PNIN", company: "PT Paninvest Tbk", sector: "Perusahaan Investasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "GR", free_float: "20.0%" },
            { ticker: "RALS", company: "", sector: "Ritel Konsumsi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "SIMP", company: "PT Salim Ivomas Pratama Tbk", sector: "Agrikultur", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "KI, RX", free_float: "21.5%" },
            { ticker: "SRIL", company: "", sector: "Manufaktur Tekstil", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "ltk",
        name: "Low Tuck Kwong Group",
        desc: "Pengusaha batu bara visioner. Mengendalikan salah satu tambang batu bara termurah dan efisien.",
        stocks: [
            { ticker: "BYAN", company: "PT Bayan Resources Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Low Tuck Kwong adalah pemegang saham pengendali absolut (>60%).", kepemilikan_persen: "61.0%", sejarah: "Tambang batu bara dengan kalori menengah yang biaya produksinya sangat efisien.", tahun_masuk: "2008", broker_afiliasi: "YP, CC", free_float: "10.5%" },
            { ticker: "MYOH", company: "PT Samindo Resources Tbk", sector: "Kontraktor Pertambangan", ownership: "Low Tuck Kwong memiliki saham signifikan (di atas 10%) sebagai investasi strategis batu bara.", kepemilikan_persen: "14.2%", sejarah: "Kontraktor tambang yang memiliki kemitraan historis dengan ekosistem LTK.", tahun_masuk: "2010-an", broker_afiliasi: "YP, PD", free_float: "25.0%" },
            { ticker: "TRJA", company: "PT Transkon Jaya Tbk", sector: "Penyewaan Kendaraan Tambang", ownership: "Afiliasi/investasi yang mendukung ekosistem tambang Low Tuck Kwong.", kepemilikan_persen: "Afiliasi", sejarah: "Vendor kendaraan spesialis tambang yang disuntik modal oleh ekosistem LTK.", tahun_masuk: "2023", broker_afiliasi: "YP", free_float: "20.0%" },
            { ticker: "VOKS", company: "PT Voksel Electric Tbk", sector: "Manufaktur Kabel & Optik", ownership: "Low Tuck Kwong tercatat memiliki porsi kepemilikan minoritas namun besar.", kepemilikan_persen: "Minoritas Signifikan", sejarah: "Pabrik kabel yang pernah dimiliki sahamnya secara pribadi oleh LTK.", tahun_masuk: "1990-an", broker_afiliasi: "YP", free_float: "30.0%" }
        ]
    },
    {
        id: "medco",
        name: "Medco Group",
        desc: "Kelompok bisnis milik keluarga Arifin Panigoro yang berfokus di sektor energi.",
        stocks: [
            { ticker: "AMMN", company: "PT Amman Mineral Internasional Tbk", sector: "Pertambangan (Emas & Tembaga)", ownership: "Medco memegang saham signifikan (sekitar 20%) di AMMN.", kepemilikan_persen: "21.1%", sejarah: "Konsorsium Medco, Salim & Agus Projo mengambil alih saham Newmont Nusa Tenggara.", tahun_masuk: "2016", broker_afiliasi: "RX, KZ", free_float: "17.2%" },
            { ticker: "MEDC", company: "PT Medco Energi Internasional Tbk", sector: "Energi (Minyak & Gas)", ownership: "Dikendalikan oleh PT Medco Daya Abadi Lestari milik keluarga Panigoro.", kepemilikan_persen: "51.5%", sejarah: "Perusahaan migas swasta independen terbesar RI bentukan Arifin Panigoro.", tahun_masuk: "1994", broker_afiliasi: "YP, RX", free_float: "48.5%" }
        ]
    },
    {
        id: "mnc",
        name: "MNC Group",
        desc: "Konglomerasi media, finansial, properti, dan hiburan yang dikendalikan oleh Hary Tanoesoedibjo.",
        stocks: [
            { ticker: "BABP", company: "PT Bank MNC Internasional Tbk", sector: "Perbankan", ownership: "Bank komersial dalam payung MNC Kapital.", kepemilikan_persen: "Mayoritas via BCAP", sejarah: "Bank Bumiputera yang diakuisisi MNC dan direbranding.", tahun_masuk: "2014", broker_afiliasi: "EP, YP", free_float: "35.0%" },
            { ticker: "BCAP", company: "PT MNC Kapital Indonesia Tbk", sector: "Perbankan & Keuangan", ownership: "Holding jasa keuangan grup MNC.", kepemilikan_persen: "Afiliasi MNC", sejarah: "Kendaraan holding finansial (Bank, Sekuritas, Asuransi).", tahun_masuk: "2001", broker_afiliasi: "EP, YP", free_float: "30.0%" },
            { ticker: "BHIT", company: "PT MNC Asia Holding Tbk", sector: "Holding Multisektor", ownership: "Induk seluruh lini bisnis MNC Group.", kepemilikan_persen: "Pengendali Utama", sejarah: "Induk utama kerajaan bisnis HT.", tahun_masuk: "1997", broker_afiliasi: "EP", free_float: "45.0%" },
            { ticker: "BMTR", company: "PT Global Mediacom Tbk", sector: "Holding Media", ownership: "Induk usaha bisnis media dan penyiaran MNC.", kepemilikan_persen: "Afiliasi MNC", sejarah: "Eks-Bimantara Citra yang diambil alih HT.", tahun_masuk: "2001", broker_afiliasi: "EP, PD", free_float: "42.1%" },
            { ticker: "KPIG", company: "PT MNC Tourism Indonesia Tbk", sector: "Properti & Real Estat", ownership: "Lini bisnis properti, resor (Kawasan KEK Lido), dan perhotelan MNC.", kepemilikan_persen: "Afiliasi MNC", sejarah: "Pengembang KEK Lido dan resort mewah lainnya.", tahun_masuk: "2007", broker_afiliasi: "EP", free_float: "20.0%" },
            { ticker: "MNCN", company: "PT Media Nusantara Citra Tbk", sector: "Media & Penyiaran", ownership: "Pengelola stasiun TV FTA (RCTI, MNCTV, GTV, iNews).", kepemilikan_persen: "Mayoritas via BMTR", sejarah: "Raja stasiun TV Free-To-Air di Indonesia.", tahun_masuk: "2007", broker_afiliasi: "EP, RX", free_float: "40.0%" },
            { ticker: "MSIN", company: "PT MNC Digital Entertainment Tbk", sector: "Media & Teknologi Digital", ownership: "Sayap konten digital dan produksi milik grup.", kepemilikan_persen: "Afiliasi MNC", sejarah: "Merger aset digital dan production house (MNC Pictures).", tahun_masuk: "2018", broker_afiliasi: "EP", free_float: "15.0%" },
            { ticker: "IPTV", company: "", sector: "Media & Penyiaran", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MSKY", company: "", sector: "Media & Penyiaran", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "RAAM", company: "", sector: "Media & Hiburan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "ZBRA", company: "", sector: "Jasa", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "otto",
        name: "Otto Toto Sugiri Group",
        desc: "Pelopor industri Data Center di Indonesia.",
        stocks: [
            { ticker: "DCII", company: "PT DCI Indonesia Tbk", sector: "Teknologi (Infrastruktur Data)", ownership: "Otto Toto Sugiri memegang saham pengendali (sekitar 29%). Grup Salim juga pemegang saham utama.", kepemilikan_persen: "29.9%", sejarah: "Provider data center tier IV terbesar di RI, meroket pasca IPO bersama Salim.", tahun_masuk: "2021", broker_afiliasi: "KI, PD", free_float: "11.0%" },
            { ticker: "EDGE", company: "PT Indointernet Tbk", sector: "Teknologi & Layanan Internet", ownership: "EDGE diakuisisi mayoritas oleh Digital Edge, namun Otto Sugiri menanamkan pondasi ekosistemnya.", kepemilikan_persen: "Minoritas Founder", sejarah: "ISP swasta pertama RI, pivot ke penyedia data center di tengah kota.", tahun_masuk: "2021", broker_afiliasi: "YP, PD", free_float: "10.0%" }
        ]
    },
    {
        id: "pakuwon",
        name: "Pakuwon Group",
        desc: "Raja mal dan pengembang properti terkemuka di bawah komando Alexander Tedja.",
        stocks: [
            { ticker: "PWON", company: "PT Pakuwon Jati Tbk", sector: "Properti & Real Estat", ownership: "Dikendalikan oleh keluarga Tedja melalui PT Pakuwon Arthaniaga.", kepemilikan_persen: "68.7%", sejarah: "Pengembang superblok mal tersukses (Gandaria City, Kota Kasablanka, Pakuwon Mall).", tahun_masuk: "1989", broker_afiliasi: "RX, AK", free_float: "31.3%" }
        ]
    },
    {
        id: "panin",
        name: "Panin Group",
        desc: "Grup finansial historis kuat yang dibesarkan oleh Mukmin Ali Gunawan.",
        stocks: [
            { ticker: "CFIN", company: "PT Clipan Finance Indonesia Tbk", sector: "Perbankan & Pembiayaan", ownership: "Anak usaha PNBN di bidang leasing (sekitar 51%).", kepemilikan_persen: "51.5% (via PNBN)", sejarah: "Anak usaha leasing dari Bank Panin.", tahun_masuk: "1990", broker_afiliasi: "GR, PD", free_float: "48.5%" },
            { ticker: "PNBN", company: "PT Bank Pan Indonesia Tbk", sector: "Perbankan", ownership: "Dikendalikan bersama (ANZ) dengan kepemilikan PT Panin Financial Tbk.", kepemilikan_persen: "46.0% (PNLF)", sejarah: "Bank swasta yang kuat di kredit komersial, bermitra dengan ANZ.", tahun_masuk: "1982", broker_afiliasi: "GR", free_float: "15.0%" },
            { ticker: "PNIN", company: "PT Paninvest Tbk", sector: "Perusahaan Investasi", ownership: "Holding investasi di ekosistem Panin.", kepemilikan_persen: "Afiliasi Keluarga Mukmin", sejarah: "Kendaraan holding investasi grup Panin.", tahun_masuk: "1983", broker_afiliasi: "GR", free_float: "20.0%" },
            { ticker: "PNLF", company: "PT Panin Financial Tbk", sector: "Keuangan & Asuransi", ownership: "Kendaraan jasa keuangan non-bank grup.", kepemilikan_persen: "68.0% (via PNIN)", sejarah: "Induk asuransi jiwa dan kendaraan investasi Panin.", tahun_masuk: "1983", broker_afiliasi: "GR, PD", free_float: "32.0%" },
            { ticker: "AMAG", company: "", sector: "Asuransi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BMSR", company: "", sector: "Manufaktur", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "GWSA", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "KIJA", company: "", sector: "Properti (Kawasan Industri)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PANS", company: "", sector: "Keuangan & Sekuritas", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PNBS", company: "", sector: "Perbankan Syariah", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "VRNA", company: "", sector: "Pembiayaan / Multifinance", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "prajogo",
        name: "Prajogo Pangestu Group (Barito)",
        desc: "Konglomerasi energi dan petrokimia. Menguasai emiten dengan kapitalisasi pasar raksasa yang sangat mempengaruhi pergerakan IHSG.",
        stocks: [
            { ticker: "BRPT", company: "PT Barito Pacific Tbk", sector: "Holding Petrokimia & Energi", ownership: "Prajogo Pangestu pengendali dominan.", kepemilikan_persen: "71.2%", sejarah: "Awalnya perusahaan perkayuan (Barito Pacific Timber), pivot menjadi raksasa petrokimia (mengakuisisi Chandra Asri).", tahun_masuk: "1979", broker_afiliasi: "DX, BB, YU", free_float: "27.5%" },
            { ticker: "BREN", company: "PT Barito Renewables Energy Tbk", sector: "Energi Terbarukan", ownership: "Dikendalikan penuh oleh BRPT dan afiliasi Prajogo.", kepemilikan_persen: "64.6%", sejarah: "Perusahaan holding panas bumi (Star Energy). Memecahkan rekor IPO dan valuasi pasar di BEI.", tahun_masuk: "2023", broker_afiliasi: "DX, BB", free_float: "11.7%" },
            { ticker: "TPIA", company: "PT Chandra Asri Pacific Tbk", sector: "Manufaktur Petrokimia", ownership: "Prajogo secara langsung & via BRPT memegang porsi mayoritas.", kepemilikan_persen: "34.6% (BRPT) + Pribadi", sejarah: "Pabrik olefin terintegrasi satu-satunya di RI. Prajogo masuk menyelamatkan dari krisis 2008.", tahun_masuk: "2007", broker_afiliasi: "DX, RX, BB", free_float: "7.2%" },
            { ticker: "CUAN", company: "PT Petrindo Semesta Kreasi Tbk", sector: "Pertambangan (Batu Bara & Emas)", ownership: "Prajogo Pangestu memiliki saham secara langsung porsi jumbo.", kepemilikan_persen: "85.0%", sejarah: "Kendaraan investasi tambang baru Prajogo. Harga sahamnya meroket tajam ribuan persen sejak IPO.", tahun_masuk: "2023", broker_afiliasi: "DX, BB, YU", free_float: "14.9%" },
            { ticker: "PTRO", company: "PT Petrosea Tbk", sector: "Kontraktor Pertambangan", ownership: "Diakuisisi oleh grup melalui CUAN.", kepemilikan_persen: "34.0%", sejarah: "Eks-kontraktor Lo Kheng Hong & Happy Hapsoro, dicaplok Prajogo untuk melengkapi ekosistem tambangnya.", tahun_masuk: "2024", broker_afiliasi: "BB, DX, AK", free_float: "21.5%" },
            { ticker: "CDIA", company: "PT Chandra Daya Investama Tbk / Terkait Grup", sector: "Investasi", ownership: "Keterlibatan investasi strategis di bawah radar konglomerasi grup.", kepemilikan_persen: "Afiliasi", sejarah: "Manuver investasi diversifikasi.", tahun_masuk: "2020-an", broker_afiliasi: "DX", free_float: "20.0%" },
            { ticker: "RATU", company: "PT Raharja Energi Cepu Tbk", sector: "Energi & Properti", ownership: "Tercatat terafiliasi investasi dengan Barito grup.", kepemilikan_persen: "Afiliasi", sejarah: "Keterlibatan investasi energi minoritas.", tahun_masuk: "2020", broker_afiliasi: "YP", free_float: "70.0%" },
            { ticker: "SSIA", company: "PT Surya Semesta Internusa Tbk", sector: "Properti & Kawasan Industri", ownership: "Prajogo Pangestu bersama Djarum memegang porsi strategis pengembangan kawasan industri Subang.", kepemilikan_persen: "Kemitraan Konsorsium", sejarah: "Join investasi proyek logistik Pelabuhan Patimban.", tahun_masuk: "2020-an", broker_afiliasi: "RX", free_float: "40.0%" },
            { ticker: "SINI", company: "PT Singaraja Putra Tbk", sector: "Energi & Infrastruktur", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "YP, CC", free_float: "30.0%" }
        ]
    },
    {
        id: "salim",
        name: "Salim Group",
        desc: "Konglomerasi Anthoni Salim. FMCG, ritel, teknologi, jalan tol, dan tambang.",
        stocks: [
            { ticker: "INDF", company: "PT Indofood Sukses Makmur Tbk", sector: "Barang Konsumsi", ownership: "Anthoni Salim (via First Pacific Co Ltd) menguasai sekitar 50.07%.", kepemilikan_persen: "50.07%", sejarah: "Didirikan oleh Sudono Salim (1990). Produsen mi instan raksasa penyelamat grup saat krisis 1998.", tahun_masuk: "1990", broker_afiliasi: "RX, KZ, KI", free_float: "49.93%" },
            { ticker: "ICBP", company: "PT Indofood CBP Sukses Makmur Tbk", sector: "Barang Konsumsi", ownership: "Anak usaha INDF yang mengelola Indomie.", kepemilikan_persen: "80.53%", sejarah: "Spin-off divisi Consumer Branded Products dari INDF. Mesin pencetak uang utama grup.", tahun_masuk: "2010", broker_afiliasi: "RX, AK, KZ", free_float: "19.47%" },
            { ticker: "DNET", company: "PT Indoritel Makmur Internasional Tbk", sector: "Ritel Konsumsi", ownership: "Anthoni Salim & mitra menguasai DNET (Indomaret, ROTI, FAST).", kepemilikan_persen: "39.4%", sejarah: "Backdoor listing jaringan ritel Indomaret, FAST (KFC), dan ROTI.", tahun_masuk: "2013", broker_afiliasi: "KI, YP", free_float: "12.8%" },
            { ticker: "AMMN", company: "PT Amman Mineral Internasional Tbk", sector: "Pertambangan (Emas & Tembaga)", ownership: "Grup Salim terafiliasi sebagai pemegang saham strategis (via Pesona Lintas Suri/Keluarga).", kepemilikan_persen: "Afiliasi (~15%)", sejarah: "Salim menyuntikkan dana besar bersama Agus Projosasmito untuk mengambil alih Newmont.", tahun_masuk: "2016", broker_afiliasi: "KI, KZ, BB", free_float: "17.2%" },
            { ticker: "ROTI", company: "PT Nippon Indosari Corpindo Tbk", sector: "Barang Konsumsi", ownership: "Sari Roti. Grup Salim memegang porsi via Indoritel (DNET).", kepemilikan_persen: "25.7%", sejarah: "Produsen Sari Roti. DNET masuk sebagai investor strategis untuk memperkuat sinergi distribusi Indomaret.", tahun_masuk: "2017", broker_afiliasi: "KI, RX", free_float: "32.1%" },
            { ticker: "AHAP", company: "PT Asuransi Harta Aman Pratama Tbk", sector: "Asuransi", ownership: "Diakuisisi oleh ekosistem Salim melalui PT Asuransi Central Asia (ACA).", kepemilikan_persen: "Afiliasi ACA", sejarah: "Bagian dari ekosistem finansial ACA milik Salim.", tahun_masuk: "1990", broker_afiliasi: "KI", free_float: "30.0%" },
            { ticker: "BINA", company: "PT Bank Ina Perdana Tbk", sector: "Perbankan", ownership: "Grup Salim via PT Indolife Pensiontama menguasai saham mayoritas.", kepemilikan_persen: "Mayoritas (Indolife)", sejarah: "Bank komersial yang diperkuat Salim untuk penetrasi digital dan supply chain Indomaret.", tahun_masuk: "2020", broker_afiliasi: "KI, YP", free_float: "25.0%" },
            { ticker: "BRMS", company: "PT Bumi Resources Minerals Tbk", sector: "Pertambangan (Emas)", ownership: "Bersama Bakrie, Salim memegang porsi via Emirates Tarian Global.", kepemilikan_persen: "Konsorsium", sejarah: "Tambang emas anak usaha BUMI yang disokong pendanaannya oleh Salim.", tahun_masuk: "2022", broker_afiliasi: "KI, MG", free_float: "48.0%" },
            { ticker: "BUMI", company: "PT Bumi Resources Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Menguasai kepemilikan mayoritas bersama Grup Bakrie via Mach Energy.", kepemilikan_persen: "Konsorsium", sejarah: "Salim menyelamatkan BUMI dari lilitan utang via private placement.", tahun_masuk: "2022", broker_afiliasi: "KI, MG", free_float: "42.0%" },
            { ticker: "CBDK", company: "PT Bangun Kosambi Sukses Tbk", sector: "Properti & Real Estat", ownership: "Kemitraan strategis Salim dengan Aguan di beberapa kawasan eksklusif.", kepemilikan_persen: "Kemitraan", sejarah: "Kemitraan bisnis properti terpadu.", tahun_masuk: "2010-an", broker_afiliasi: "KI", free_float: "17.7%" },
            { ticker: "DCII", company: "PT DCI Indonesia Tbk", sector: "Teknologi (Infrastruktur Data)", ownership: "Anthoni Salim secara individu menguasai saham yang sangat besar (>10%).", kepemilikan_persen: "11.1%", sejarah: "Anthoni Salim memborong saham DCII untuk menguasai pasar data center RI.", tahun_masuk: "2021", broker_afiliasi: "KI", free_float: "11.0%" },
            { ticker: "DEWA", company: "PT Darma Henwa Tbk", sector: "Kontraktor Pertambangan", ownership: "Masuk bersama grup Bakrie dalam restrukturisasi.", kepemilikan_persen: "Konsorsium", sejarah: "Sejalan dengan masuknya Salim ke BUMI.", tahun_masuk: "2022", broker_afiliasi: "KI, PD", free_float: "55.0%" },
            { ticker: "EMTK", company: "PT Elang Mahkota Teknologi Tbk", sector: "Teknologi & Holding", ownership: "Salim menyuntikkan modal dan memiliki porsi investasi strategis (sekitar 9%).", kepemilikan_persen: "9.0%", sejarah: "Salim masuk ke EMTK untuk memperkuat digitalisasi ekosistemnya.", tahun_masuk: "2021", broker_afiliasi: "KI, KZ", free_float: "22.0%" },
            { ticker: "FAST", company: "PT Fast Food Indonesia Tbk", sector: "Ritel Konsumsi (Restoran)", ownership: "Pengelola KFC. Indoritel (DNET) memiliki saham minoritas signifikan (sekitar 35%).", kepemilikan_persen: "35.8%", sejarah: "Kemitraan Salim dan Keluarga Gelael di KFC.", tahun_masuk: "1990", broker_afiliasi: "KI", free_float: "20.0%" },
            { ticker: "IMAS", company: "PT Indomobil Sukses Internasional Tbk", sector: "Otomotif", ownership: "Sayap otomotif grup Salim, dikendalikan via Gallant Venture Ltd.", kepemilikan_persen: "71.4%", sejarah: "Pesaing utama Astra di masa orde baru (Nissan, Suzuki, Audi).", tahun_masuk: "1990-an", broker_afiliasi: "KI", free_float: "28.6%" },
            { ticker: "IMJS", company: "PT Indomobil Multi Jasa Tbk", sector: "Keuangan Otomotif", ownership: "Anak usaha IMAS yang bergerak di multifinance.", kepemilikan_persen: "91.9% (via IMAS)", sejarah: "Unit pembiayaan otomotif Grup Indomobil.", tahun_masuk: "2013", broker_afiliasi: "KI", free_float: "8.1%" },
            { ticker: "LSIP", company: "PT PP London Sumatra Indonesia Tbk", sector: "Agrikultur", ownership: "Perkebunan kelapa sawit anak usaha SIMP.", kepemilikan_persen: "59.4% (via SIMP)", sejarah: "Perusahaan perkebunan tua peninggalan Inggris yang diakuisisi Salim.", tahun_masuk: "2007", broker_afiliasi: "KI, RX", free_float: "40.6%" },
            { ticker: "MEDC", company: "PT Medco Energi Internasional Tbk", sector: "Energi (Minyak & Gas)", ownership: "Keterlibatan historis kemitraan Salim (Diamond Highway) di Medco.", kepemilikan_persen: "Afiliasi Historis", sejarah: "Kemitraan strategis Salim dengan Arifin Panigoro.", tahun_masuk: "2016", broker_afiliasi: "KI", free_float: "48.5%" },
            { ticker: "MEGA", company: "PT Bank Mega Tbk", sector: "Perbankan", ownership: "Salim Group memiliki portofolio investasi porsi strategis via Indolife di Bank Mega.", kepemilikan_persen: "Investasi Indolife", sejarah: "Kolaborasi finansial Salim dengan CT Corp.", tahun_masuk: "2020", broker_afiliasi: "KI, YP", free_float: "42.0%" },
            { ticker: "META", company: "PT Nusantara Infrastructure Tbk", sector: "Infrastruktur", ownership: "Infrastruktur jalan tol (baru-baru ini delisting/privatisasi parsial).", kepemilikan_persen: "Mayoritas (Metro Pacific)", sejarah: "Jalan tol milik Salim yang sebagian diprivatisasi.", tahun_masuk: "2017", broker_afiliasi: "KI", free_float: "N/A" },
            { ticker: "PANI", company: "PT Pantai Indah Kapuk Dua Tbk", sector: "Properti & Real Estat", ownership: "Salim bermitra erat dengan Aguan dalam pengembangan PIK 2.", kepemilikan_persen: "Kemitraan Konsorsium", sejarah: "Kemitraan 50:50 dengan Agung Sedayu Group membangun PIK 2.", tahun_masuk: "2021", broker_afiliasi: "KI, BK", free_float: "10.8%" },
            { ticker: "SIMP", company: "PT Salim Ivomas Pratama Tbk", sector: "Agrikultur", ownership: "Holding perkebunan kelapa sawit Salim.", kepemilikan_persen: "78.5% (via INDF)", sejarah: "Anak usaha Indofood penghasil minyak goreng Bimoli.", tahun_masuk: "2011", broker_afiliasi: "KI, RX", free_float: "21.5%" },
            { ticker: "BBCA", company: "PT Bank Central Asia Tbk", sector: "Perbankan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "45.1%" },
            { ticker: "BOLA", company: "", sector: "Media & Hiburan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "UNIC", company: "", sector: "Manufaktur Kimia", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "saratoga",
        name: "Saratoga Group",
        desc: "Perusahaan investasi aktif bentukan Edwin Soeryadjaya dan Sandiaga Uno.",
        stocks: [
            { ticker: "ADRO", company: "PT Adaro Energy Indonesia Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Saratoga memiliki saham strategis bersama konsorsium Boy Thohir dkk.", kepemilikan_persen: "15.2%", sejarah: "Saratoga menjadi salah satu motor utama kebangkitan Adaro paska diakuisisi 2005.", tahun_masuk: "2005", broker_afiliasi: "AK, CS, RX", free_float: "42.5%" },
            { ticker: "MDKA", company: "PT Merdeka Copper Gold Tbk", sector: "Pertambangan (Emas & Tembaga)", ownership: "Saratoga memiliki porsi kepemilikan besar di tambang ini (sekitar 18%).", kepemilikan_persen: "18.3%", sejarah: "Saratoga menyokong MDKA sejak sebelum tambang berproduksi, hingga menjadi raksasa emas.", tahun_masuk: "2015", broker_afiliasi: "RX, AK", free_float: "45.2%" },
            { ticker: "MPMX", company: "PT Mitra Pinasthika Mustika Tbk", sector: "Otomotif & Konsumsi", ownership: "Saratoga memegang kendali mayoritas di perusahaan otomotif ini (>50%).", kepemilikan_persen: "56.6%", sejarah: "Distributor motor Honda Jatim yang diakuisisi penuh oleh Saratoga.", tahun_masuk: "2010", broker_afiliasi: "AK, RX", free_float: "43.4%" },
            { ticker: "SRTG", company: "PT Saratoga Investama Sedaya Tbk", sector: "Perusahaan Investasi", ownership: "Induk perusahaan investasi grup Saratoga.", kepemilikan_persen: "Keluarga Soeryadjaya & Uno", sejarah: "Kendaraan private equity pertama di RI yang listing di bursa.", tahun_masuk: "2013", broker_afiliasi: "AK, RX", free_float: "25.0%" },
            { ticker: "TBIG", company: "PT Tower Bersama Infrastructure Tbk", sector: "Infrastruktur Telekomunikasi", ownership: "Saratoga merupakan pemegang saham pengendali strategis bersama Provident.", kepemilikan_persen: "Afiliasi Mayoritas", sejarah: "Pemain besar tower telekomunikasi yang dibesarkan Saratoga dan Provident.", tahun_masuk: "2004", broker_afiliasi: "AK, YP", free_float: "30.0%" },
            { ticker: "AADI", company: "PT Adaro Andalan Indonesia Tbk", sector: "Pertambangan (Batu Bara Termal)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "30.0%" },
            { ticker: "ADMR", company: "PT Adaro Minerals Indonesia Tbk", sector: "Pertambangan (Batu Bara Metalurgi)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "31.5%" },
            { ticker: "AGII", company: "", sector: "Manufaktur Kimia", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BBYB", company: "", sector: "Perbankan Digital", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "EMAS", company: "PT Merdeka Gold Resources Tbk", sector: "Pertambangan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX", free_float: "45.0%" },
            { ticker: "GHON", company: "", sector: "Infrastruktur Telekomunikasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "GOLD", company: "", sector: "Infrastruktur Telekomunikasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MBMA", company: "PT Merdeka Battery Materials Tbk", sector: "Material Baterai & Nikel", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, KZ", free_float: "15.0%" },
            { ticker: "NRCA", company: "", sector: "Konstruksi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "sinarmas",
        name: "Sinarmas Group",
        desc: "Keluarga Eka Tjipta Widjaja. Pulp & paper, agribisnis, properti, telekomunikasi.",
        stocks: [
            { ticker: "ADMG", company: "PT Polychem Indonesia Tbk", sector: "Manufaktur", ownership: "Tekstil dan kimia.", kepemilikan_persen: "Afiliasi", sejarah: "Afiliasi bahan kimia tekstil Sinar Mas.", tahun_masuk: "1990-an", broker_afiliasi: "CC", free_float: "30.0%" },
            { ticker: "BSDE", company: "PT Bumi Serpong Damai Tbk", sector: "Properti & Real Estat", ownership: "Pemegang saham mayoritas adalah PT Paraga Artamida (Keluarga Widjaja).", kepemilikan_persen: "60.0%", sejarah: "Pengembang kota mandiri BSD City, crown jewel properti Sinar Mas.", tahun_masuk: "2008", broker_afiliasi: "CS, RX", free_float: "40.0%" },
            { ticker: "BSIM", company: "PT Bank Sinarmas Tbk", sector: "Perbankan", ownership: "Lini bisnis perbankan utama milik grup Sinar Mas.", kepemilikan_persen: "59.0%", sejarah: "Awalnya Bank Shinta, diakuisisi Sinar Mas untuk layanan finansial grup.", tahun_masuk: "2005", broker_afiliasi: "DH", free_float: "41.0%" },
            { ticker: "DMAS", company: "PT Puradelta Lestari Tbk", sector: "Properti (Kawasan Industri)", ownership: "Kolaborasi Sinar Mas Land dan Sojitz Corp.", kepemilikan_persen: "60.0%", sejarah: "Pengembang kawasan industri Kota Deltamas di Cikarang.", tahun_masuk: "2015", broker_afiliasi: "DH, RX", free_float: "15.0%" },
            { ticker: "DSSA", company: "PT Dian Swastatika Sentosa Tbk", sector: "Energi & Infrastruktur", ownership: "Kendaraan investasi tambang batu bara, listrik, internet.", kepemilikan_persen: "59.9%", sejarah: "Holding energi dan infrastruktur milik Sinar Mas (induk GEMS dan MyRepublic).", tahun_masuk: "2009", broker_afiliasi: "DH", free_float: "15.0%" },
            { ticker: "DUTI", company: "PT Duta Pertiwi Tbk", sector: "Properti & Real Estat", ownership: "Anak usaha langsung dari BSDE.", kepemilikan_persen: "88.5% (via BSDE)", sejarah: "Pengembang properti komersial (ITC Group).", tahun_masuk: "1994", broker_afiliasi: "DH", free_float: "11.5%" },
            { ticker: "EXCL", company: "PT XL Axiata Tbk", sector: "Telekomunikasi", ownership: "Terdapat proses rencana merger/konsolidasi antara EXCL dengan FREN milik Sinar Mas.", kepemilikan_persen: "Merger Plan", sejarah: "Rencana merger raksasa dengan Smartfren.", tahun_masuk: "2024", broker_afiliasi: "CS, RX", free_float: "33.0%" },
            { ticker: "GEMS", company: "PT Golden Energy Mines Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Anak usaha DSSA, tambang batu bara andalan grup Sinar Mas.", kepemilikan_persen: "62.5% (via DSSA)", sejarah: "Raksasa tambang batu bara Sinar Mas di Kalsel dan Jambi.", tahun_masuk: "2011", broker_afiliasi: "DH", free_float: "37.5%" },
            { ticker: "INKP", company: "PT Indah Kiat Pulp & Paper Tbk", sector: "Manufaktur Pulp & Kertas", ownership: "Dikendalikan oleh keluarga Widjaja.", kepemilikan_persen: "52.7%", sejarah: "Pabrik pulp & paper andalan Asia Pulp & Paper (APP).", tahun_masuk: "1990", broker_afiliasi: "CS, DH", free_float: "47.3%" },
            { ticker: "LIFE", company: "PT Asuransi Jiwa Sinarmas MSIG Tbk", sector: "Asuransi", ownership: "Perusahaan asuransi joint-venture Sinar Mas dengan Mitsui Sumitomo (MSIG).", kepemilikan_persen: "Minoritas (Kemitraan MSIG)", sejarah: "Asuransi jiwa andalan Sinar Mas yang join venture dengan Jepang.", tahun_masuk: "2019", broker_afiliasi: "DH", free_float: "20.0%" },
            { ticker: "SMAR", company: "PT Sinar Mas Agro Resources and Technology Tbk", sector: "Agrikultur", ownership: "Sinar Mas menguasai >97% via GAR Singapura.", kepemilikan_persen: "97.2%", sejarah: "Produsen minyak goreng Filma, sawit tertua Sinar Mas.", tahun_masuk: "1992", broker_afiliasi: "DH", free_float: "2.8%" },
            { ticker: "SMDM", company: "PT Suryamas Dutamakmur Tbk", sector: "Properti", ownership: "Pengembang kawasan Rancamaya, terafiliasi dengan sayap bisnis Sinar Mas.", kepemilikan_persen: "Afiliasi Properti", sejarah: "Pengembang perumahan elit di Bogor.", tahun_masuk: "1995", broker_afiliasi: "DH", free_float: "30.0%" },
            { ticker: "SMMA", company: "PT Sinar Mas Multiartha Tbk", sector: "Keuangan & Investasi", ownership: "Holding jasa keuangan grup Sinar Mas (induk BSIM, sekuritas, asuransi).", kepemilikan_persen: "Afiliasi Sinar Mas", sejarah: "Induk utama semua bisnis finansial grup.", tahun_masuk: "1995", broker_afiliasi: "DH", free_float: "45.0%" },
            { ticker: "TKIM", company: "PT Pabrik Kertas Tjiwi Kimia Tbk", sector: "Manufaktur Produk Kertas", ownership: "Dikendalikan oleh APP Sinar Mas.", kepemilikan_persen: "59.6%", sejarah: "Pabrik kertas tertua Sinar Mas di Mojokerto.", tahun_masuk: "1990", broker_afiliasi: "CS, DH", free_float: "40.4%" },
            { ticker: "ARII", company: "", sector: "Pertambangan (Batu Bara)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BALI", company: "", sector: "Infrastruktur Telekomunikasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "DWGL", company: "", sector: "Pertambangan (Batu Bara)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "IIKP", company: "", sector: "Agrikultur", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "KETR", company: "", sector: "Teknologi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MCOR", company: "", sector: "Perbankan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MORA", company: "", sector: "Telekomunikasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PLIN", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "RIMO", company: "", sector: "Properti & Pariwisata", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "TDPM", company: "", sector: "Manufaktur Kimia", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "UCID", company: "", sector: "Barang Konsumsi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "thohir",
        name: "Thohir Group",
        desc: "Dinahkodai Garibaldi (Boy) Thohir dan Erick Thohir. Poros kekuatan di sektor batu bara (Adaro), otomotif, keuangan, dan media.",
        stocks: [
            { ticker: "ADRO", company: "PT Adaro Energy Indonesia Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Boy Thohir tergabung dalam konsorsium pengendali.", kepemilikan_persen: "6.18% (Pribadi)", sejarah: "Konsorsium Boy, TP Rachmat, & Edwin S mengambil alih aset Adaro dan membesarkannya paska krisis.", tahun_masuk: "2005", broker_afiliasi: "RX, AK, CS", free_float: "42.5%" },
            { ticker: "BFIN", company: "PT BFI Finance Indonesia Tbk", sector: "Pembiayaan / Multifinance", ownership: "Konsorsium Trinugraha Capital (Boy Thohir & Jerry Ng) mengendalikan.", kepemilikan_persen: "48.1%", sejarah: "Diakuisisi Boy Thohir dan partner untuk membangun ekosistem kredit otomotif yang solid.", tahun_masuk: "2021", broker_afiliasi: "AK, RX", free_float: "40.3%" },
            { ticker: "MDKA", company: "PT Merdeka Copper Gold Tbk", sector: "Pertambangan (Emas & Tembaga)", ownership: "Boy Thohir beraliansi dengan grup Saratoga.", kepemilikan_persen: "7.3%", sejarah: "Tambang emas di Banyuwangi (Tujuh Bukit) yang dikembangkan dari nol hingga produksi sukses.", tahun_masuk: "2015", broker_afiliasi: "RX, KZ, AK", free_float: "45.2%" },
            { ticker: "GOTO", company: "PT GoTo Gojek Tokopedia Tbk", sector: "Teknologi", ownership: "Boy Thohir bertindak sebagai komisaris dan pemegang saham awal.", kepemilikan_persen: "Minoritas / Founder", sejarah: "Boy Thohir menjadi salah satu penyokong awal Gojek jauh sebelum merger dengan Tokopedia.", tahun_masuk: "2015", broker_afiliasi: "CC, PD, YP", free_float: "65.1%" },
            { ticker: "TRIM", company: "PT Trimegah Sekuritas Indonesia Tbk", sector: "Keuangan & Sekuritas", ownership: "Boy Thohir mengakuisisi dan mengendalikan langsung.", kepemilikan_persen: "34.6%", sejarah: "Dibeli untuk memperkuat instrumen investasi dan aksi korporasi pasar modal grup Thohir.", tahun_masuk: "2022", broker_afiliasi: "LG, YP", free_float: "42.1%" },
            { ticker: "AADI", company: "PT Adaro Andalan Indonesia Tbk", sector: "Pertambangan (Batu Bara Termal)", ownership: "Spin-off dari ADRO, Boy Thohir memegang kendali operasional dan porsi besar.", kepemilikan_persen: "Konsorsium Adaro", sejarah: "Spin-off batu bara termal dari ADRO untuk memenuhi standar ESG global.", tahun_masuk: "2024", broker_afiliasi: "RX, AK", free_float: "30.0%" },
            { ticker: "ABBA", company: "PT Mahaka Media Tbk", sector: "Media & Hiburan", ownership: "Didirikan oleh Erick Thohir (Mahaka Group).", kepemilikan_persen: "Mayoritas (Mahaka)", sejarah: "Grup media cetak, radio, dan agensi bentukan Erick Thohir.", tahun_masuk: "2002", broker_afiliasi: "YP", free_float: "40.0%" },
            { ticker: "ADMR", company: "PT Adaro Minerals Indonesia Tbk", sector: "Pertambangan (Batu Bara Metalurgi)", ownership: "Anak usaha grup Adaro di mana Boy Thohir menjabat manajemen kunci.", kepemilikan_persen: "68.5% (via ADRO)", sejarah: "Tambang batu bara kokas (metallurgical coal) yang di IPO-kan Adaro.", tahun_masuk: "2022", broker_afiliasi: "RX, AK", free_float: "31.5%" },
            { ticker: "EMAS", company: "PT Merdeka Gold Resources Tbk", sector: "Pertambangan", ownership: "Boy Thohir terafiliasi secara pribadi di bisnis tambang emas ekosistem Merdeka.", kepemilikan_persen: "Afiliasi", sejarah: "Manuver investasi personal Boy Thohir di sektor resource.", tahun_masuk: "2020", broker_afiliasi: "RX", free_float: "45.0%" },
            { ticker: "ESSA", company: "PT Surya Esa Perkasa Tbk", sector: "Manufaktur Kimia Dasar", ownership: "Boy Thohir memegang porsi saham strategis bersama T.P. Rachmat.", kepemilikan_persen: "Minoritas Strategis", sejarah: "Pabrik Amonia andalan yang didirikan bersama TP Rachmat.", tahun_masuk: "2012", broker_afiliasi: "RX, AK", free_float: "40.0%" },
            { ticker: "MARI", company: "PT Mahaka Radio Integra Tbk", sector: "Media & Hiburan", ownership: "Bagian dari ekosistem Mahaka (Radio Jak FM, Gen FM).", kepemilikan_persen: "Mayoritas (Mahaka)", sejarah: "Pusat jaringan radio anak muda terbesar grup Mahaka.", tahun_masuk: "2016", broker_afiliasi: "YP", free_float: "30.0%" },
            { ticker: "MAYA", company: "PT Bank Mayapada Internasional Tbk", sector: "Perbankan", ownership: "Tercatat Dato' Sri Tahir, namun terdapat afiliasi strategis finansial (NAYA/MAYA cross investment).", kepemilikan_persen: "Kemitraan", sejarah: "Kemitraan bisnis antara grup Thohir dan Tahir.", tahun_masuk: "2020-an", broker_afiliasi: "PD", free_float: "15.0%" },
            { ticker: "MBMA", company: "PT Merdeka Battery Materials Tbk", sector: "Material Baterai & Nikel", ownership: "Boy Thohir merupakan salah satu pilar pengendali ekosistem MDKA/MBMA.", kepemilikan_persen: "Afiliasi Merdeka", sejarah: "Bisnis hilirisasi nikel dari MDKA.", tahun_masuk: "2023", broker_afiliasi: "RX, AK", free_float: "15.0%" },
            { ticker: "MPRO", company: "PT Maha Properti Indonesia Tbk", sector: "Properti", ownership: "Dikendalikan oleh keluarga Dato' Sri Tahir (Mayapada), terkait afiliasi proyek.", kepemilikan_persen: "Kemitraan Properti", sejarah: "Manuver gabungan properti grup Mayapada dan mitra Thohir.", tahun_masuk: "2018", broker_afiliasi: "YP", free_float: "20.0%" },
            { ticker: "PALM", company: "PT Provident Investasi Bersama Tbk", sector: "Perusahaan Investasi", ownership: "Kendaraan investasi Winato Kartono yang sangat erat bermitra dengan Boy Thohir.", kepemilikan_persen: "Kemitraan Provident", sejarah: "Holding investasi yang sering sejalan dengan aksi korporasi Boy Thohir.", tahun_masuk: "2012", broker_afiliasi: "AK", free_float: "40.0%" },
            { ticker: "SONA", company: "PT Sona Topas Tourism Industry Tbk", sector: "Pariwisata & Ritel", ownership: "Terkait dengan portofolio investasi dan ritel bebas bea afiliasi grup.", kepemilikan_persen: "Afiliasi", sejarah: "Ritel duty-free airport milik mitra strategis grup.", tahun_masuk: "1990", broker_afiliasi: "YP", free_float: "20.0%" },
            { ticker: "WOMF", company: "PT Wahana Ottomitra Multiartha Tbk", sector: "Pembiayaan Otomotif", ownership: "Grup Thohir (Boy Thohir) mengakuisisi porsi saham sebagai bagian ekspansi otomotif (Wahana).", kepemilikan_persen: "Afiliasi Wahana", sejarah: "Leasing motor Honda yang dibesarkan jaringan dealer Wahana (Grup Thohir).", tahun_masuk: "1990-an", broker_afiliasi: "YP", free_float: "30.0%" },
            { ticker: "CARS", company: "", sector: "Otomotif", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "CITA", company: "PT Cita Mineral Investindo Tbk", sector: "Pertambangan (Bauksit)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "YP, RX", free_float: "29.0%" },
            { ticker: "MGLV", company: "", sector: "Lainnya", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PORT", company: "", sector: "Infrastruktur & Logistik", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "SRTG", company: "PT Saratoga Investama Sedaya Tbk", sector: "Perusahaan Investasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "AK, RX", free_float: "25.0%" },
            { ticker: "VISI", company: "", sector: "Pariwisata", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "triputra",
        name: "Triputra Group",
        desc: "Theodore Permadi (TP) Rachmat. Agribisnis, manufaktur, logistik.",
        stocks: [
            { ticker: "ASLC", company: "PT Autopedia Sukses Lestari Tbk", sector: "Perdagangan Otomotif", ownership: "Anak usaha Grup Triputra (Caroline.id & JBA).", kepemilikan_persen: "70.5% (via ASSA)", sejarah: "Balai lelang dan marketplace mobil bekas digital milik ASSA.", tahun_masuk: "2022", broker_afiliasi: "AK, RX", free_float: "29.5%" },
            { ticker: "ASSA", company: "PT Adi Sarana Armada Tbk", sector: "Transportasi & Logistik", ownership: "Dikendalikan oleh TP Rachmat (Rental & Anteraja).", kepemilikan_persen: "Mayoritas (Triputra)", sejarah: "Bisnis rental mobil corporate terbesar yang berekspansi ke logistik (AnterAja).", tahun_masuk: "2012", broker_afiliasi: "AK, RX", free_float: "45.0%" },
            { ticker: "DRMA", company: "PT Dharma Polimetal Tbk", sector: "Manufaktur Otomotif", ownership: "Kendaraan lini manufaktur suku cadang Triputra.", kepemilikan_persen: "Mayoritas (Triputra)", sejarah: "Pabrik komponen otomotif andalan Triputra.", tahun_masuk: "2021", broker_afiliasi: "AK", free_float: "20.0%" },
            { ticker: "DSNG", company: "PT Dharma Satya Nusantara Tbk", sector: "Agrikultur", ownership: "Grup Triputra dan Ometraco memegang saham strategis.", kepemilikan_persen: "Afiliasi TP Rachmat", sejarah: "Pabrik perkayuan dan sawit andalan kolaborasi TP Rachmat & Subianto.", tahun_masuk: "2013", broker_afiliasi: "AK, PD", free_float: "35.0%" },
            { ticker: "ESSA", company: "PT Surya Esa Perkasa Tbk", sector: "Manufaktur Kimia Dasar", ownership: "TP Rachmat adalah salah satu pendiri dan pemilik saham terbesar.", kepemilikan_persen: "Konsorsium TP Rachmat", sejarah: "Pabrik Amonia di Sulawesi yang dibangun TP Rachmat bersama Boy Thohir.", tahun_masuk: "2012", broker_afiliasi: "AK, RX", free_float: "40.0%" },
            { ticker: "KMTR", company: "PT Kirana Megatara Tbk", sector: "Agrikultur (Karet)", ownership: "Dikendalikan oleh grup Triputra, produsen karet remah terbesar.", kepemilikan_persen: "Mayoritas (Triputra)", sejarah: "Produsen karet spesialis ban terkemuka dunia.", tahun_masuk: "2017", broker_afiliasi: "AK", free_float: "20.0%" },
            { ticker: "TAPG", company: "PT Triputra Agro Persada Tbk", sector: "Agrikultur", ownership: "TP Rachmat dan keluarga Subianto memegang kendali utama.", kepemilikan_persen: "Mayoritas (Triputra)", sejarah: "Kendaraan utama bisnis sawit milik grup Triputra.", tahun_masuk: "2021", broker_afiliasi: "AK, CS", free_float: "15.0%" },
            { ticker: "AADI", company: "PT Adaro Andalan Indonesia Tbk", sector: "Pertambangan (Batu Bara Termal)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "30.0%" },
            { ticker: "ADMR", company: "PT Adaro Minerals Indonesia Tbk", sector: "Pertambangan (Batu Bara Metalurgi)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "31.5%" },
            { ticker: "ADRO", company: "PT Adaro Energy Indonesia Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "AK, CS, RX", free_float: "42.5%" }
        ]
    },
    {
        id: "danatama",
        name: "Danatama Group",
        desc: "Grup keuangan & investasi sektor pelayaran, pertambangan, & energi.",
        stocks: [
            { ticker: "BIPI", company: "", sector: "Pertambangan (Batu Bara)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BRMS", company: "PT Bumi Resources Minerals Tbk", sector: "Pertambangan (Emas)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "MG, KI", free_float: "48.0%" },
            { ticker: "BULL", company: "", sector: "Pelayaran & Logistik", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "CITY", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "CMPP", company: "", sector: "Aviasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "EURO", company: "", sector: "Lainnya", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "ITMA", company: "", sector: "Pertambangan (Batu Bara)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "haji-isam",
        name: "Haji Isam Group",
        desc: "Konglomerat asal Kalimantan Selatan: Tambang batu bara, kelapa sawit, & infrastruktur.",
        stocks: [
            { ticker: "BYAN", company: "PT Bayan Resources Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "YP, CC", free_float: "10.5%" },
            { ticker: "FAST", company: "PT Fast Food Indonesia Tbk", sector: "Ritel Konsumsi (Restoran)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "KI", free_float: "20.0%" },
            { ticker: "JARR", company: "", sector: "Agrikultur", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PACK", company: "", sector: "Manufaktur Kemasan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PGUN", company: "", sector: "Agrikultur", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "RANS", company: "", sector: "Media & Hiburan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "TEBE", company: "", sector: "Pertambangan (Jasa)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "hashim",
        name: "Hashim Group",
        desc: "Grup usaha sektor telekomunikasi, energi terbarukan, & properti.",
        stocks: [
            { ticker: "COIN", company: "", sector: "Teknologi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "TRIN", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "TRUE", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "WIFI", company: "", sector: "Telekomunikasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "md-entertainment",
        name: "MD Entertainment Group",
        desc: "Raksasa industri perfilman, rumah produksi drama, & penyiaran TV.",
        stocks: [
            { ticker: "FILM", company: "", sector: "Media & Hiburan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "NETV", company: "", sector: "Media & Penyiaran", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "RAAM", company: "", sector: "Media & Hiburan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "pam",
        name: "PAM Group",
        desc: "Grup pertambangan nikel & pengembang properti komersial.",
        stocks: [
            { ticker: "BSBK", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "KBAG", company: "", sector: "Manufaktur", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "NICL", company: "", sector: "Pertambangan (Nikel)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PAMG", company: "", sector: "Properti & Real Estat", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "STRK", company: "", sector: "Barang Konsumsi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "provident",
        name: "Provident Group",
        desc: "Perusahaan investasi tambang emas/tembaga, nikel, menara seluler, & perkebunan.",
        stocks: [
            { ticker: "BBYB", company: "", sector: "Perbankan Digital", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "EMAS", company: "PT Merdeka Gold Resources Tbk", sector: "Pertambangan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX", free_float: "45.0%" },
            { ticker: "GHON", company: "", sector: "Infrastruktur Telekomunikasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "GOLD", company: "", sector: "Infrastruktur Telekomunikasi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "GOTO", company: "PT GoTo Gojek Tokopedia Tbk", sector: "Teknologi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "CC, PD, YP", free_float: "65.1%" },
            { ticker: "MBMA", company: "PT Merdeka Battery Materials Tbk", sector: "Material Baterai & Nikel", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, KZ", free_float: "15.0%" },
            { ticker: "MDKA", company: "PT Merdeka Copper Gold Tbk", sector: "Pertambangan (Emas & Tembaga)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "45.2%" },
            { ticker: "PALM", company: "PT Provident Investasi Bersama Tbk", sector: "Perusahaan Investasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "AK", free_float: "40.0%" },
            { ticker: "TBIG", company: "PT Tower Bersama Infrastructure Tbk", sector: "Infrastruktur Telekomunikasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "AK, YP", free_float: "30.0%" }
        ]
    },
    {
        id: "rajawali",
        name: "Rajawali Group",
        desc: "Grup investasi pertambangan emas Archi Indonesia & perkebunan kelapa sawit.",
        stocks: [
            { ticker: "ARCI", company: "", sector: "Pertambangan (Emas)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BWPT", company: "", sector: "Agrikultur (Kelapa Sawit)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "sandiaga-uno",
        name: "Sandiaga Uno Group",
        desc: "Pendiri Saratoga Investama: Energi, pertambangan, & otomotif.",
        stocks: [
            { ticker: "AADI", company: "PT Adaro Andalan Indonesia Tbk", sector: "Pertambangan (Batu Bara Termal)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "30.0%" },
            { ticker: "ADMR", company: "PT Adaro Minerals Indonesia Tbk", sector: "Pertambangan (Batu Bara Metalurgi)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "31.5%" },
            { ticker: "ADRO", company: "PT Adaro Energy Indonesia Tbk", sector: "Pertambangan (Batu Bara)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "AK, CS, RX", free_float: "42.5%" },
            { ticker: "AGII", company: "", sector: "Manufaktur Kimia", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BBYB", company: "", sector: "Perbankan Digital", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "EMAS", company: "PT Merdeka Gold Resources Tbk", sector: "Pertambangan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX", free_float: "45.0%" },
            { ticker: "GHON", company: "", sector: "Infrastruktur Telekomunikasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "GOLD", company: "", sector: "Infrastruktur Telekomunikasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MBMA", company: "PT Merdeka Battery Materials Tbk", sector: "Material Baterai & Nikel", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, KZ", free_float: "15.0%" },
            { ticker: "MDKA", company: "PT Merdeka Copper Gold Tbk", sector: "Pertambangan (Emas & Tembaga)", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "45.2%" },
            { ticker: "MITI", company: "", sector: "Pertambangan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MPMX", company: "PT Mitra Pinasthika Mustika Tbk", sector: "Otomotif & Konsumsi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "AK, RX", free_float: "43.4%" },
            { ticker: "MUTU", company: "", sector: "Jasa", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "NRCA", company: "", sector: "Konstruksi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "SRTG", company: "PT Saratoga Investama Sedaya Tbk", sector: "Perusahaan Investasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "AK, RX", free_float: "25.0%" },
            { ticker: "TBIG", company: "PT Tower Bersama Infrastructure Tbk", sector: "Infrastruktur Telekomunikasi", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "AK, YP", free_float: "30.0%" }
        ]
    },
    {
        id: "tancorp",
        name: "Tancorp Group",
        desc: "Raja cat Avian, air minum Cleo, bahan bangunan, & properti Tanrise.",
        stocks: [
            { ticker: "AVIA", company: "", sector: "Manufaktur Material Bangunan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "BLES", company: "", sector: "Lainnya", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "CAKK", company: "", sector: "Manufaktur Material Bangunan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "CLEO", company: "", sector: "Barang Konsumsi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "DEPO", company: "", sector: "Ritel", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "MERI", company: "", sector: "Jasa Pendidikan", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "PEVE", company: "", sector: "Lainnya", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "RISE", company: "", sector: "Lainnya", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "ZONE", company: "", sector: "Ritel Konsumsi", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "tommy-soeharto",
        name: "Tommy Soeharto Group",
        desc: "Grup perkapalan LNG, logistik maritim, & sarana olahraga golf.",
        stocks: [
            { ticker: "GOLF", company: "", sector: "Pariwisata & Properti", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "GTSI", company: "", sector: "Pelayaran & Logistik", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "HITS", company: "", sector: "Pelayaran & Logistik", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "HUMI", company: "", sector: "Pelayaran & Logistik", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" }
        ]
    },
    {
        id: "yusuf-hamka",
        name: "Yusuf Hamka Group",
        desc: "Raja jalan tol Citra Marga Nusaphala Persada (CMNP) & investor otomotif/bank.",
        stocks: [
            { ticker: "BBCA", company: "PT Bank Central Asia Tbk", sector: "Perbankan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK", free_float: "45.1%" },
            { ticker: "BMRI", company: "PT Bank Mandiri (Persero) Tbk", sector: "Perbankan", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, AK, KZ", free_float: "48.0%" },
            { ticker: "CMNP", company: "", sector: "Infrastruktur (Jalan Tol)", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "EMTK", company: "PT Elang Mahkota Teknologi Tbk", sector: "Teknologi & Holding", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "KZ, RX", free_float: "22.0%" },
            { ticker: "IMAS", company: "PT Indomobil Sukses Internasional Tbk", sector: "Otomotif", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "KI", free_float: "28.6%" },
            { ticker: "MIRA", company: "", sector: "Energi & Jasa", ownership: "Data kepemilikan sedang diverifikasi.", kepemilikan_persen: "—", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "—", free_float: "—" },
            { ticker: "SCMA", company: "PT Surya Citra Media Tbk", sector: "Media & Penyiaran", ownership: "Afiliasi grup — rincian kepemilikan sedang diverifikasi.", kepemilikan_persen: "Afiliasi", sejarah: "—", tahun_masuk: "—", broker_afiliasi: "RX, YP", free_float: "26.8%" }
        ]
    }
];

// --- FUNDAMENTAL DATA ---
const fundaRealDB = {
    "BBCA": { 
        rev: [79.0, 87.9, 99.3, 112.4, 125.0, 138.5, 59.2], cogs: [0, 0, 0, 0, 0, 0, 0], 
        net: [27.1, 31.4, 40.7, 48.6, 54.5, 61.2, 26.5], asset: [1075.6, 1228.3, 1314.7, 1408.3, 1512.4, 1630.0, 1650.2], 
        eq: [184.7, 202.8, 221.5, 242.0, 265.1, 288.5, 305.1],
        interest: [10.5, 9.8, 11.2, 12.5, 14.1, 15.5, 6.8], tax: [6.1, 7.2, 9.5, 11.4, 12.8, 14.5, 6.2],
        fcf: [25.4, 30.1, 38.5, 45.2, 51.0, 58.4, 25.1], divYield: [2.5, 2.8, 3.1, 3.8, 4.5, 4.8, 5.0],
        mos: 15.2, zscore: 4.5
    },
    "BBRI": { 
        rev: [116.9, 143.5, 163.7, 185.3, 201.5, 220.1, 95.4], cogs: [0, 0, 0, 0, 0, 0, 0], 
        net: [18.6, 32.2, 51.4, 60.4, 65.2, 70.5, 30.1], asset: [1511.8, 1678.1, 1865.6, 1965.0, 2085.1, 2210.3, 2245.5], 
        eq: [199.9, 288.7, 299.3, 316.5, 335.2, 355.8, 362.4],
        interest: [35.2, 32.1, 36.5, 40.2, 45.5, 52.1, 23.5], tax: [4.2, 7.5, 12.1, 14.5, 15.8, 17.1, 7.5],
        fcf: [12.5, 28.4, 45.5, 55.1, 60.2, 65.8, 28.5], divYield: [3.0, 3.5, 4.2, 5.5, 6.5, 7.0, 7.2],
        mos: 22.1, zscore: 3.8
    },
    "BMRI": { 
        rev: [106.8, 119.5, 135.2, 153.1, 168.5, 185.2, 79.5], cogs: [0, 0, 0, 0, 0, 0, 0], 
        net: [17.1, 28.0, 41.2, 55.1, 60.5, 66.8, 28.5], asset: [1429.3, 1632.8, 1992.5, 2174.2, 2350.5, 2515.2, 2550.8], 
        eq: [193.8, 205.4, 228.0, 254.5, 275.2, 301.5, 310.2],
        interest: [25.1, 22.5, 25.8, 30.1, 35.5, 40.2, 18.5], tax: [4.0, 6.5, 9.8, 13.1, 14.5, 16.0, 6.8],
        fcf: [15.2, 25.1, 38.5, 50.2, 55.4, 61.5, 26.5], divYield: [3.5, 4.0, 4.8, 5.5, 6.2, 6.5, 6.8],
        mos: 20.1, zscore: 3.6
    },
    "TLKM": { 
        rev: [136.5, 143.2, 147.3, 149.2, 155.1, 162.5, 68.2], cogs: [(95.5), (96.2), (102.1), (103.5), (107.2), (112.5), (48.1)], 
        net: [20.8, 24.8, 20.7, 24.5, 25.8, 27.2, 11.5], asset: [246.9, 277.2, 275.2, 287.5, 305.2, 315.8, 320.1], 
        eq: [120.9, 141.5, 149.2, 156.4, 165.2, 172.5, 175.4],
        interest: [4.5, 4.2, 4.8, 5.1, 5.5, 5.8, 2.5], tax: [6.5, 7.8, 6.5, 7.5, 7.8, 8.2, 3.5],
        fcf: [18.5, 22.1, 18.5, 21.5, 23.2, 24.5, 10.2], divYield: [4.5, 4.8, 4.5, 4.8, 5.2, 5.5, 5.6],mos: 25.5, zscore: 4.2
    },
    "ASII": { 
        rev: [175.0, 233.5, 301.4, 316.6, 320.1, 328.5, 110.2], cogs: [(138.0), (181.6), (232.0), (245.2), (250.4), (256.1), (85.4)], 
        net: [16.1, 20.2, 28.9, 33.8, 30.5, 32.1, 12.5], asset: [338.2, 367.3, 413.3, 445.6, 460.2, 485.1, 492.0], 
        eq: [195.4, 215.6, 242.0, 250.4, 265.1, 280.2, 285.5],
        interest: [3.5, 3.8, 4.2, 4.5, 5.1, 5.5, 2.4], tax: [4.5, 5.8, 8.5, 10.1, 9.5, 10.2, 4.1],
        fcf: [12.5, 15.4, 22.5, 26.5, 24.1, 25.8, 10.5], divYield: [4.0, 4.5, 5.5, 6.5, 6.8, 7.1, 7.5],
        mos: 30.2, zscore: 3.9
    },
    "INDF": { 
        rev: [81.7, 99.3, 110.8, 112.5, 118.5, 125.4, 52.1], cogs: [(54.9), (66.5), (76.8), (77.5), (80.2), (84.5), (35.2)], 
        net: [6.4, 7.6, 8.0, 8.1, 8.5, 9.2, 4.0], asset: [163.1, 179.3, 180.4, 186.5, 195.2, 205.1, 210.5], 
        eq: [79.1, 86.6, 90.2, 95.4, 102.5, 110.2, 115.4],
        interest: [2.5, 2.8, 3.1, 3.4, 3.8, 4.2, 1.8], tax: [2.1, 2.5, 2.8, 2.9, 3.1, 3.5, 1.5],
        fcf: [5.2, 6.1, 6.5, 6.8, 7.2, 8.0, 3.5], divYield: [3.5, 3.8, 4.2, 4.5, 4.8, 5.1, 5.5],
        mos: 18.5, zscore: 4.5
    },
   "ADRO": { 
        rev: [38.5, 59.5, 122.5, 105.4, 98.5, 102.4, 42.5], cogs: [(28.5), (35.2), (52.1), (60.5), (58.2), (61.5), (25.1)], 
        net: [2.1, 14.5, 45.2, 28.5, 25.1, 26.5, 11.2], asset: [95.2, 110.5, 160.2, 155.4, 162.5, 170.1, 175.2], 
        eq: [55.2, 65.1, 105.2, 110.5, 115.2, 122.5, 128.4],
        interest: [1.2, 1.5, 2.1, 2.5, 2.8, 3.1, 1.4], tax: [0.8, 4.5, 14.5, 9.2, 8.1, 8.5, 3.8],
        fcf: [1.5, 12.1, 40.5, 25.2, 22.1, 23.5, 10.1], divYield: [5.5, 8.5, 12.5, 15.2, 18.5, 20.1, 22.5],
        mos: 45.2, zscore: 5.1
    },
    "BREN": { 
        rev: [6.5, 7.2, 8.1, 9.5, 10.8, 12.5, 5.5], cogs: [(2.1), (2.3), (2.5), (2.8), (3.1), (3.5), (1.5)], 
        net: [1.2, 1.5, 1.8, 2.2, 2.6, 3.1, 1.4], asset: [35.2, 38.5, 45.1, 52.4, 60.5, 68.2, 72.1], 
        eq: [15.2, 18.5, 22.1, 28.5, 35.2, 42.1, 45.5],
        interest: [0.8, 0.9, 1.1, 1.3, 1.5, 1.8, 0.8], tax: [0.4, 0.5, 0.6, 0.8, 0.9, 1.1, 0.5],
        fcf: [1.0, 1.2, 1.5, 1.8, 2.1, 2.5, 1.2], divYield: [0.5, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0],
        mos: 5.5, zscore: 2.8
    },
    "AMMN": { 
        rev: [8.5, 12.4, 15.2, 28.5, 35.2, 42.1, 18.5], cogs: [(4.2), (5.5), (6.8), (12.5), (15.2), (18.5), (8.1)], 
        net: [1.5, 2.8, 3.5, 7.2, 9.5, 12.1, 5.2], asset: [45.2, 55.1, 75.2, 95.4, 115.2, 135.5, 145.2], 
        eq: [25.2, 32.1, 45.5, 65.2, 85.1, 105.2, 115.5],
        interest: [0.5, 0.8, 1.2, 2.1, 2.8, 3.5, 1.5], tax: [0.5, 0.9, 1.1, 2.2, 3.1, 3.8, 1.6],
        fcf: [1.1, 2.2, 2.8, 6.5, 8.2, 10.5, 4.5], divYield: [0.0, 0.0, 0.5, 1.5, 2.5, 3.5, 4.2],
        mos: 12.1, zscore: 4.0
    }
};

/**
 * Data lapkeu per emiten. Hanya data kurasi (fundaRealDB) yang dikembalikan di sini.
 * Kalau emiten belum punya laporan keuangan, kembalikan data KOSONG (tampil "(-)")
 * — dulu fungsi ini mengarang angka dari kode ticker, dan itu menyesatkan.
 */
function generateFunda(ticker, sector) {
    if (fundaRealDB[ticker]) return fundaRealDB[ticker];
    const zeros = () => [0, 0, 0, 0, 0, 0, 0];
    return {
        rev: zeros(), cogs: zeros(), net: zeros(), asset: zeros(), eq: zeros(),
        interest: zeros(), tax: zeros(), fcf: zeros(), divYield: zeros(),
        mos: null, zscore: null, noData: true
    };
}
