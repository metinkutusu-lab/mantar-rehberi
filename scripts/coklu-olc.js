// Üç fotoğrafla tanımayı ölçer (scripts/coklu-deneme.js'in indirdiği, eğitime hiç girmemiş gözlemler).
// Uygulamadaki model ve tür ayırıcısıyla (js/modelAyari.js) her gözlemin fotoğrafları tek tek ve birlikte
// (js/fotoTanima.js benzerlikleriHesapla: puanların ortalaması) değerlendirilir; doğru türün sırası sayılır.
// Kullanım: node scripts/coklu-olc.js   (playwright-core + bilgisayardaki Chrome/Edge)
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const kaynaklar = JSON.parse(readFileSync(path.join(KOK, 'fotograflar/coklu-deneme-kaynaklar.json'), 'utf8'));
const gozlemler = Object.entries(kaynaklar).flatMap(([id, liste]) => liste.map((k) => ({ id, dosyalar: k.dosyalar.map((d) => `fotograflar/coklu-deneme/${id}/${d}`) })));

const yol = [process.env.MANTAR_TARAYICI, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', '/usr/bin/google-chrome'].filter(Boolean).find((y) => existsSync(y));
const { chromium } = createRequire(import.meta.url)('playwright-core');
const TURLER = { '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream' };
const sunucu = createServer((istek, yanit) => {
  if (istek.url === '/__bos') return yanit.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>.</title>');
  const dosya = path.join(KOK, decodeURIComponent(new URL(istek.url, 'http://x').pathname));
  if (!dosya.startsWith(KOK) || !existsSync(dosya)) return yanit.writeHead(404).end();
  yanit.writeHead(200, { 'Content-Type': TURLER[path.extname(dosya).toLowerCase()] ?? 'application/octet-stream' }).end(readFileSync(dosya));
}).listen(0);
const tarayici = await chromium.launch({ executablePath: yol });
const sayfa = await tarayici.newPage();
await sayfa.goto(`http://localhost:${sunucu.address().port}/__bos`);
const sonuc = await sayfa.evaluate(async (gozlemler) => {
  const f = await import('/js/fotoTanima.js');
  await f.modeliHazirla();
  const ayirici = await f.ayiriciyiYukle();
  const sira = (olas, id) => Object.entries(olas).sort((a, b) => b[1] - a[1]).findIndex(([k]) => k === id);
  const birlesimler = { '1': [0], '2': [1], '3': [2], '1+2': [0, 1], '1+3': [0, 2], '1+2+3': [0, 1, 2] };
  const sayac = Object.fromEntries(Object.keys(birlesimler).map((k) => [k, { ilk1: 0, ilk3: 0, emin: 0, eminDogru: 0 }]));
  for (const g of gozlemler) {
    const izler = [];
    for (const d of g.dosyalar) {
      const r = new Image();
      r.src = `/${d}`;
      await r.decode();
      izler.push(await f.parmakIzi(r, {}));
    }
    for (const [ad, sec] of Object.entries(birlesimler)) {
      const olas = f.benzerlikleriHesapla(sec.map((i) => izler[i]), ayirici);
      const s = sira(olas, g.id);
      const c = sayac[ad];
      if (s === 0) c.ilk1++;
      if (s < 3) c.ilk3++;
      const enCok = Math.max(...Object.values(olas));
      if (enCok >= f.BELIRGIN_BENZERLIK) { c.emin++; if (s === 0) c.eminDogru++; }
    }
  }
  return sayac;
}, gozlemler);
await tarayici.close();
sunucu.close();
const y = (a, b) => `%${Math.round((a / Math.max(1, b)) * 100)}`;
console.log(`${gozlemler.length} gözlem (her biri 3 fotoğraf)`);
for (const [ad, c] of Object.entries(sonuc)) {
  console.log(`  ${ad.padEnd(6)} 1. sırada ${y(c.ilk1, gozlemler.length)}, ilk 3'te ${y(c.ilk3, gozlemler.length)}; "muhtemelen" ${c.emin} kez, ${y(c.eminDogru, c.emin)} doğru`);
}
