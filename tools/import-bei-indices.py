#!/usr/bin/env python3
"""Impor lampiran 'Evaluasi Indeks' BEI (xlsx, per indeks) -> assets/data/syariah.json
Pemakaian: python3 tools/import-bei-indices.py <folder berisi xlsx hasil unzip lampiran BEI>
Dijalankan tiap evaluasi indeks (Mei, Agustus, November, Februari)."""
import sys, glob, os, re, json, openpyxl
src = sys.argv[1]
NAMES = {'LQ45':'LQ45','IDX80':'IDX80','IDX30':'IDX30','KOMPAS100':'KOMPAS100','BISNIS-27':'BISNIS27','MNC36':'MNC36','ISSI':'ISSI','JII70':'JII70','JII':'JII','IDXSHAGROW':'SHAGROW','IDXMESBUMN':'MESBUMN17','IDXVESTA28':'VESTA28','ECONOMIC30':'ECONOMIC30','SRI-KEHATI':'SRIKEHATI','ESGQKEHATI':'ESGQ','ESGSKEHATI':'ESGS','Investor33':'INVESTOR33','ABX':'ABX','DBX':'DBX','MBX':'MBX'}
outp = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets/data/syariah.json')
try: prev = json.load(open(outp))
except Exception: prev = {}
lists, period, ann = dict(prev.get('lists', {})), prev.get('period', ''), ''
meta = dict(prev.get('meta', {}))
for f in sorted(glob.glob(os.path.join(src, '*.xlsx'))):
    ws = openpyxl.load_workbook(f, data_only=True).worksheets[0]
    name = ''; fper = ''; fann = ''
    codes = []
    for r in ws.iter_rows(values_only=True):
        cells = [c for c in r if c is not None]
        if cells and isinstance(cells[0], str) and cells[0].startswith('Konstituen yang keluar'): break
        if len(cells) >= 2 and str(cells[1]).startswith('Konstituen yang keluar'): break
        if len(cells) >= 2 and str(cells[0]).strip() == 'Nama Indeks': name = str(cells[1]).strip(': ').strip()
        if len(cells) >= 2 and str(cells[0]).startswith('Periode Efektif Kons'): fper = str(cells[1]).strip(': ').strip()
        if len(cells) >= 1 and 'Pengumuman BEI' in str(cells[0]): fann = re.sub(r'^Lampiran( \d+)? ', '', str(cells[0]))
        for c in cells[:3]:
            if isinstance(c, str) and re.fullmatch(r'[A-Z]{4}', c.strip()): codes.append(c.strip()); break
    key = NAMES.get(name.replace(' ', '')) or NAMES.get(name)
    if key and codes:
        lists[key] = sorted(set(codes)); meta[key] = {'period': fper, 'source': fann}
if 'ISSI' in meta and not period: period = meta['ISSI']['period']
out = {'asOf': prev.get('asOf', ''), 'period': period, 'source': prev.get('source', 'Pengumuman BEI'), 'count': len(lists.get('ISSI', [])), 't': lists.get('ISSI', []), 'lists': lists, 'meta': meta}
json.dump(out, open(outp, 'w'), ensure_ascii=False)
print({k: len(v) for k, v in lists.items()}, period)
