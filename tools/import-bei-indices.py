#!/usr/bin/env python3
"""Impor lampiran 'Evaluasi Indeks' BEI (xlsx, per indeks) -> assets/data/syariah.json
Pemakaian: python3 tools/import-bei-indices.py <folder berisi xlsx hasil unzip lampiran BEI>
Dijalankan tiap evaluasi indeks (Mei, Agustus, November, Februari)."""
import sys, glob, os, re, json, openpyxl
src = sys.argv[1]
NAMES = {'ISSI':'ISSI','JII70':'JII70','JII':'JII','IDXSHAGROW':'SHAGROW','IDXMESBUMN':'MESBUMN17','IDXVESTA28':'VESTA28','ECONOMIC30':'ECONOMIC30','SRI-KEHATI':'SRIKEHATI','ESGQKEHATI':'ESGQ','ESGSKEHATI':'ESGS','Investor33':'INVESTOR33','ABX':'ABX','DBX':'DBX','MBX':'MBX'}
lists, period, ann = {}, '', ''
for f in sorted(glob.glob(os.path.join(src, '*.xlsx'))):
    ws = openpyxl.load_workbook(f, data_only=True).worksheets[0]
    name = ''
    codes = []
    for r in ws.iter_rows(values_only=True):
        cells = [c for c in r if c is not None]
        if len(cells) >= 2 and str(cells[0]).strip() == 'Nama Indeks': name = str(cells[1]).strip(': ').strip()
        if len(cells) >= 2 and str(cells[0]).startswith('Periode Efektif Konstituen'): period = str(cells[1]).strip(': ').strip()
        if len(cells) >= 1 and 'Pengumuman BEI' in str(cells[0]): ann = re.sub(r'^Lampiran \d+ ', '', str(cells[0]))
        for c in cells[:3]:
            if isinstance(c, str) and re.fullmatch(r'[A-Z]{4}', c.strip()): codes.append(c.strip()); break
    key = NAMES.get(name)
    if key and codes: lists[key] = sorted(set(codes))
out = {'asOf': '', 'period': period, 'source': ann or 'Pengumuman BEI', 'count': len(lists.get('ISSI', [])), 't': lists.get('ISSI', []), 'lists': lists}
m = re.search(r'tanggal (\d+ \w+ \d{4})', ann)
out['asOf'] = m.group(1) if m else ''
json.dump(out, open(os.path.join(os.path.dirname(__file__), '..', 'assets/data/syariah.json'), 'w'), ensure_ascii=False)
print({k: len(v) for k, v in lists.items()}, period)
