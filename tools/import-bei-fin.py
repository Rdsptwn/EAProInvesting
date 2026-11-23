#!/usr/bin/env python3
"""Impor 'Financial Data and Ratio' (BEI, idx.id) ke assets/data/funda-idx.json untuk emiten yang BELUM punya data.
Emiten yang sudah punya data (Yahoo) tidak ditimpa.
Pakai:  python3 tools/import-bei-fin.py <folder-xlsx>
PENTING: tiap file bulanan berisi laporan TERBARU yang tersedia saat bulan itu (mis. file 'Dec 2025' = kuartal III 2025, 9 bulan),
bukan laporan tahunan. Maka pemetaan memakai kolom 'FS Date' tiap baris, bukan nama file:
  - baris dengan FS Date = akhir tahun buku (mis. 31 Des) -> kolom tahun itu (2020-2025), file terbaru menang;
  - baris ber-FS Date tahun 2026 dari file bulan terbaru -> kolom 'kuartal terbaru' (latestMonths = bulan kumulatif).
Untuk data tahunan, unduh file bulan setelah laporan tahunan terbit (mis. Apr/Mei).
Satuan BEI miliar rupiah -> disimpan triliun. Tidak ada arus kas/dividen di sumber ini (diisi 0)."""
import sys, re, json, glob, os, datetime
import openpyxl
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'data', 'funda-idx.json')
MON = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
YEARS = [2020, 2021, 2022, 2023, 2024, 2025]

def num(v):
    if v is None or isinstance(v, str):
        try: return float(str(v).replace(',', '')) if v not in (None, '-', '') else None
        except ValueError: return None
    return float(v)

def read(path):
    ws = openpyxl.load_workbook(path, data_only=True).active; out = {}
    for r in ws.iter_rows(min_row=6, values_only=True):
        c = r[5]
        if not (isinstance(c, str) and c.isalpha() and len(c) <= 5): continue
        try: fs = datetime.datetime.strptime(str(r[8]), '%m/%d/%Y')
        except ValueError: continue
        out[c] = dict(fs=fs, fye=MON.get(str(r[9]).lower()[:3], 12), asset=num(r[12]), eq=num(r[14]), sales=num(r[15]), net=num(r[18]), roa=num(r[24]), roe=num(r[25]), npm=num(r[26]))
    return out

def main(folder):
    j = json.load(open(D, encoding='utf-8')); T = j['tickers']; have = set(T)
    files = {}
    for p in glob.glob(os.path.join(folder, '*Financial_Data*.xlsx')):
        m = re.search(r'-_([A-Za-z]{3})_(\d{4})', os.path.basename(p))
        if m: files[(MON[m.group(1).lower()], int(m.group(2)))] = p
    cols = {y: {} for y in YEARS}; latest = {}; best = (0, 0)
    for (mo, yr) in sorted(files, key=lambda k: (k[1], k[0])):  # lama -> baru, yang baru menimpa
        data = read(files[(mo, yr)])
        for c, d in data.items():
            if d['fs'].month == d['fye'] and d['fs'].year in YEARS: cols[d['fs'].year][c] = d
        if yr == 2026 and (mo, yr) >= (best[0], best[1]) if False else yr == 2026 and mo >= best[0]:
            best = (mo, yr); latest = {c: d for c, d in data.items() if d['fs'].year == 2026}
    cols['latest'] = latest; newest = data  # file terakhir (terbaru) dipakai sebagai cadangan untuk emiten telat lapor
    codes = set(latest) | set(newest)
    for y in YEARS: codes |= set(cols[y])
    added = 0; filled = 0; today = datetime.date.today().isoformat()
    def col(c, y): return cols[y].get(c)
    for c in sorted(codes):
        if c in have and T[c].get('source') != 'bei':
            # Emiten Yahoo (hanya ±4 tahun): isi HANYA kolom tahun yang kosong (mis. 2020-2021) dari BEI; angka Yahoo tidak ditimpa.
            r0 = T[c]; fl = []
            for i, y in enumerate(YEARS):
                d = col(c, y)
                if not d or d.get('asset') is None or any(r0.get(k, [0] * 7)[i] for k in ('asset', 'rev', 'net')): continue
                for k, f in (('rev', 'sales'), ('net', 'net'), ('asset', 'asset'), ('eq', 'eq')):
                    if d.get(f) is not None: r0[k][i] = round(d[f] / 1000, 3)
                for k in ('npm', 'roe', 'roa'):
                    if d.get(k) is not None and k in r0: r0[k][i] = round(d[k], 1)
                fl.append(y)
            if fl: r0['fillBei'] = sorted(set(r0.get('fillBei', []) + fl)); filled += 1
            continue
        arr = [col(c, y) for y in YEARS]; lt = cols['latest'].get(c) or (newest.get(c) if newest.get(c, {}).get('asset') else None)
        arr.append(lt)
        if lt and lt['fs'].year != 2026 and lt['fs'].month == lt['fye'] and lt['fs'].year in YEARS and not arr[lt['fs'].year - 2020]: arr[lt['fs'].year - 2020] = lt; arr[6] = lt = None
        if not any(arr): continue
        g = lambda f, k: [round(a[k] / f, 3) if a and a.get(k) is not None else 0 for a in arr]
        rec = dict(rev=g(1000, 'sales'), cogs=[0] * 7, net=g(1000, 'net'), asset=g(1000, 'asset'), eq=g(1000, 'eq'), interest=[0] * 7, tax=[0] * 7, fcf=[0] * 7, ocf=[0] * 7, divYield=[0] * 7)
        rec['npm'] = [round(a['npm'], 1) if a and a.get('npm') is not None else 0 for a in arr]
        rec['grossMargin'] = [0] * 7
        rec['roe'] = [round(a['roe'], 1) if a and a.get('roe') is not None else 0 for a in arr]
        rec['roa'] = [round(a['roa'], 1) if a and a.get('roa') is not None else 0 for a in arr]
        rec['source'] = 'bei'; rec['sourceLabel'] = 'BEI Financial Data and Ratio (idx.id), tanpa arus kas & dividen'
        if lt:
            mths = ((lt['fs'].month - lt['fye']) % 12) or 12
            rec['latestPeriod'] = lt['fs'].strftime('%Y-%m-%d'); rec['latestMonths'] = mths
            if lt['fs'].year != 2026: rec['stale'] = True
        rec['updated'] = today; T[c] = rec; added += 1
    j['meta']['bei'] = 'Emiten dengan source=bei berasal dari BEI Financial Data and Ratio; kolom terakhir = laporan terbaru 2026 dengan latestMonths = bulan kumulatif (3/6/9/12).'
    json.dump(j, open(D, 'w', encoding='utf-8'), ensure_ascii=False, indent=2); open(D, 'a').write('\n')
    print('ditambah', added, 'diisi tahun kosong (Yahoo)', filled, 'total', len(T))

if __name__ == '__main__': main(sys.argv[1])
