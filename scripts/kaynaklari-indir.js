// Depoda kaynak listesi duran ama fotoğrafları depoya girmeyen (.gitignore) Commons referanslarını ve sabit deneme setini
// listedeki dosyalarla birebir yeniden indirir. Haftalık otomatik güncellemede (GitHub) bilgisayar boş başladığı için gerekir;
// gözle ayıklanmış listeler korunur (yeniden arama yapılmaz). Var olan dosyaya dokunmaz.
// Kullanım: node scripts/kaynaklari-indir.js   (internet gerekir; uygulamanın parçası değildir)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };
const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));
const oku = (d) => (existsSync(path.join(KOK, d)) ? JSON.parse(readFileSync(path.join(KOK, d), 'utf8')) : {});

async function commonsAdresi(dosya) {
  await bekle(700);
  const p = new URLSearchParams({ action: 'query', titles: `File:${dosya}`, prop: 'imageinfo', iiprop: 'url', iiurlwidth: '480', format: 'json' });
  const veri = await (await fetch(`https://commons.wikimedia.org/w/api.php?${p}`, ISTEK)).json();
  const b = Object.values(veri.query?.pages ?? {})[0]?.imageinfo?.[0];
  return b?.thumburl ?? b?.url ?? null;
}

async function inatAdresi(gozlem) {
  await bekle(400);
  const veri = await (await fetch(`https://api.gbif.org/v1/occurrence/search?${new URLSearchParams({ occurrenceID: gozlem, limit: '1' })}`, ISTEK)).json();
  const f = veri.results?.[0]?.media?.find((m) => m.type === 'StillImage' && m.identifier);
  return f ? f.identifier.replace('/original.', '/medium.') : null;
}

async function indir(hedef, adres) {
  if (!adres) return false;
  const y = await fetch(adres, ISTEK);
  if (!y.ok) return false;
  mkdirSync(path.dirname(hedef), { recursive: true });
  writeFileSync(hedef, Buffer.from(await y.arrayBuffer()));
  return true;
}

let indirilen = 0;
let olmayan = 0;
for (const [klasor, liste] of [['referans', oku('fotograflar/referans-kaynaklar.json')], ['deneme', oku('fotograflar/deneme-kaynaklar.json')]]) {
  for (const [id, kayitlar] of Object.entries(liste)) {
    for (const k of kayitlar) {
      const hedef = path.join(KOK, 'fotograflar', klasor, id, k.dosya);
      if (existsSync(hedef)) continue;
      try {
        const adres = k.commons ? await commonsAdresi(k.commons) : k.gozlem ? await inatAdresi(k.gozlem) : null;
        if (await indir(hedef, adres)) indirilen++;
        else olmayan++;
      } catch {
        olmayan++;
      }
    }
  }
}
console.log(`Kaynaklardan indirilen: ${indirilen}, bulunamayan: ${olmayan}`);
