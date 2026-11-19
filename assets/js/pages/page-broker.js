// --- DATA BROKER ---
// Sumber: daftar anggota bursa aktif BEI (Mediasaham, Okt 2025; dicek silang dengan IDX Channel). Cek idx.co.id bila ada perubahan.
const BROKERS = [
    {k:"AD", n:"OSO Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"AF", n:"Harita Kencana Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"AG", n:"Kiwoom Sekuritas Indonesia", t:"Asing", c:"Korea Selatan"},
    {k:"AH", n:"Shinhan Sekuritas Indonesia", t:"Asing", c:"Korea Selatan"},
    {k:"AI", n:"UOB Kay Hian Sekuritas", t:"Asing", c:"Singapura"},
    {k:"AK", n:"UBS Sekuritas Indonesia", t:"Asing", c:"Swiss"},
    {k:"AN", n:"Wanteg Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"AO", n:"Erdikha Elit Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"AP", n:"Pacific Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"AR", n:"Binaartha Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"AT", n:"Phintraco Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"AZ", n:"Sucor Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"BB", n:"Verdhana Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"BF", n:"Inti Fikasa Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"BK", n:"J.P. Morgan Sekuritas Indonesia", t:"Asing", c:"Amerika Serikat"},
    {k:"BQ", n:"Korea Investment AND Sekuritas Indonesia", t:"Asing", c:"Korea Selatan"},
    {k:"BR", n:"Trust Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"BS", n:"Equity Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"CC", n:"Mandiri Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"CD", n:"Mega Capital Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"CP", n:"KB Valbury Sekuritas", t:"Asing", c:"Korea Selatan"},
    {k:"DD", n:"Makindo Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"DH", n:"Sinarmas Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"DP", n:"DBS Vickers Sekuritas Indonesia", t:"Asing", c:"Singapura"},
    {k:"DR", n:"RHB Sekuritas Indonesia", t:"Asing", c:"Malaysia"},
    {k:"DU", n:"KAF Sekuritas Indonesia", t:"Asing", c:"Malaysia"},
    {k:"DX", n:"Bahana Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"EL", n:"Evergreen Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"EP", n:"MNC Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"ES", n:"Ekokapital Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"FO", n:"Forte Global Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"FS", n:"Yuanta Sekuritas Indonesia", t:"Asing", c:"Taiwan"},
    {k:"FZ", n:"Waterfront Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"GA", n:"BNC Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"GI", n:"Webull Sekuritas Indonesia", t:"Asing", c:"Amerika Serikat"},
    {k:"GR", n:"Panin Sekuritas Tbk.", t:"Lokal", c:"Indonesia"},
    {k:"GW", n:"HSBC Sekuritas Indonesia", t:"Asing", c:"Inggris"},
    {k:"HD", n:"KGI Sekuritas Indonesia", t:"Asing", c:"Taiwan"},
    {k:"HP", n:"Henan Putihrai Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"IC", n:"Integrity Capital Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"ID", n:"Anugerah Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"IF", n:"Samuel Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"IH", n:"Indo Harvest Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"II", n:"Danatama Makmur Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"IN", n:"Investindo Nusantara Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"IP", n:"Yugen Bertumbuh Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"IT", n:"Inti Teladan Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"IU", n:"Indo Capital Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"KI", n:"Ciptadana Sekuritas Asia", t:"Asing", c:"—"},
    {k:"KK", n:"Phillip Sekuritas Indonesia", t:"Asing", c:"Singapura"},
    {k:"KZ", n:"CLSA Sekuritas Indonesia", t:"Asing", c:"Hong Kong"},
    {k:"LG", n:"Trimegah Sekuritas Indonesia Tbk.", t:"Lokal", c:"Indonesia"},
    {k:"LS", n:"Reliance Sekuritas Indonesia Tbk.", t:"Lokal", c:"Indonesia"},
    {k:"MG", n:"Semesta Indovest Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"MI", n:"Victoria Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"MU", n:"Minna Padi Investama Sekuritas Tbk.", t:"Lokal", c:"Indonesia"},
    {k:"NI", n:"BNI Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"OD", n:"BRI Danareksa Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"OK", n:"Net Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"PC", n:"FAC Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"PD", n:"Indo Premier Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"PF", n:"Danasakti Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"PG", n:"Panca Global Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"PI", n:"Magenta Kapital Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"PO", n:"Pilarmas Investindo Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"PP", n:"Aldiracita Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"QA", n:"Tuntun Sekuritas Indonesia", t:"Asing", c:"—"},
    {k:"RB", n:"Ina Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"RF", n:"Buana Capital Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"RG", n:"Profindo Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"RO", n:"Pluang Maju Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"RS", n:"Yulie Sekuritas Indonesia Tbk.", t:"Lokal", c:"Indonesia"},
    {k:"RX", n:"Macquarie Sekuritas Indonesia", t:"Asing", c:"Australia"},
    {k:"SA", n:"Elit Sukses Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"SF", n:"Surya Fajar Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"SH", n:"Artha Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"SQ", n:"BCA Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"SS", n:"Supra Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"TF", n:"Universal Broker Indonesia Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"TP", n:"OCBC Sekuritas Indonesia", t:"Asing", c:"Singapura"},
    {k:"TS", n:"Dwidana Sakti Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"XA", n:"NH Korindo Sekuritas Indonesia", t:"Asing", c:"Korea Selatan"},
    {k:"XC", n:"Ajaib Sekuritas Asia", t:"Lokal", c:"Indonesia"},
    {k:"XL", n:"Stockbit Sekuritas Digital", t:"Lokal", c:"Indonesia"},
    {k:"YB", n:"Yakin Bertumbuh Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"YJ", n:"Lotus Andalan Sekuritas", t:"Lokal", c:"Indonesia"},
    {k:"YO", n:"Amantara Sekuritas Indonesia", t:"Lokal", c:"Indonesia"},
    {k:"YP", n:"Mirae Asset Sekuritas Indonesia", t:"Asing", c:"Korea Selatan"},
    {k:"YU", n:"CGS International Sekuritas Indonesia", t:"Asing", c:"Singapura"},
    {k:"ZP", n:"Maybank Sekuritas Indonesia", t:"Asing", c:"Malaysia"},
    {k:"ZR", n:"Bumiputera Sekuritas", t:"Lokal", c:"Indonesia"}
];

function renderBrokers(data = BROKERS) {
    document.getElementById('brokerTable').innerHTML = data.map(b => `
        <tr class="hover:bg-slate-50 border-b border-slate-100 bg-white transition-colors">
            <td class="px-6 py-4 font-black text-blue-600 uppercase text-xs">${b.k}</td>
            <td class="px-6 py-4 text-slate-700 font-extrabold text-xs">${b.n}</td>
            <td class="px-6 py-4"><span class="stat-badge ${b.t === 'Asing' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}">${b.t}</span></td>
            <td class="px-6 py-4">${getBrokerBadge(b.k)}</td>
            <td class="px-6 py-4 text-slate-400 font-bold text-[10px] uppercase">${b.c}</td>
        </tr>
    `).join('');
}

function searchBroker() {
    const q = document.getElementById('brokerSearch').value.toLowerCase();
    const filterVal = document.getElementById('brokerFilter').value;

    let filtered = BROKERS.filter(b => b.k.toLowerCase().includes(q) || b.n.toLowerCase().includes(q));

    if (filterVal !== 'ALL') {
        filtered = filtered.filter(b => {
            const badgeText = getBrokerBadge(b.k);
            return badgeText.includes(filterVal);
        });
    }
    renderBrokers(filtered);
}
