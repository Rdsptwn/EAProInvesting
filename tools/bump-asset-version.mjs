/**
 * Naikkan EWOKS_ASSET_V (cache bust) setelah sync data.
 * Usage: node tools/bump-asset-version.mjs [YYYYMMDDx]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = new Date();
const ver =
    process.argv[2] ||
    `${now.toISOString().slice(0, 10).replace(/-/g, '')}t${String(now.getUTCHours()).padStart(2, '0')}`;

const corePath = path.join(root, 'assets/js/ewoks-core.js');
let core = fs.readFileSync(corePath, 'utf8');
const m = core.match(/window\.EWOKS_ASSET_V = '([^']+)';/);
if (!m) throw new Error('EWOKS_ASSET_V tidak ditemukan di ewoks-core.js');
const old = m[1];
core = core.replace(`window.EWOKS_ASSET_V = '${old}';`, `window.EWOKS_ASSET_V = '${ver}';`);
fs.writeFileSync(corePath, core);

function bumpHtml(file) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) return;
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace(/\?v=[^"'&\s]+/g, `?v=${ver}`);
    fs.writeFileSync(p, html);
}

for (const name of fs.readdirSync(root)) {
    if (name.endsWith('.html') && !name.includes('backup')) bumpHtml(name);
}

console.log(`EWOKS_ASSET_V: ${old} -> ${ver}`);
