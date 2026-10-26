// Türlerin fotoğraf "parmak izlerini" hesaplar ve vendor/mobilenet/parmak-izleri.json'a yazar (js/fotoTanima.js kullanır).
// Telefon, kullanıcının çektiği fotoğrafı bu izlerle kıyaslar; tür fotoğraflarının kendisi kıyas için indirilmez.
// Her türün ansiklopedi fotoğrafı (veri/turler.json → fotograf.dosya) birkaç biçimde (tam, aynalı, yakın) kullanılır.
// Ek referans fotoğrafı eklemek için: fotograflar/referans/<tür-id>/*.jpg (yalnızca izleri uygulamaya girer;
// fotoğrafların lisansı ticari kullanıma uygun olmalı ve kaynağı aynı klasörde bir notta yazmalı).
// Kullanım: node scripts/parmak-izi-uret.js   (Playwright ve Chromium gerekir; Claude çalıştırır)
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(import.meta.url)('playwright');

const TURLER = { '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream', '.html': 'text/html' };
const sunucu = createServer((istek, yanit) => {
  if (istek.url === '/__bos') {
    yanit.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>.</title>');
    return;
  }
  const dosya = path.join(KOK, decodeURIComponent(new URL(istek.url, 'http://x').pathname));
  if (!dosya.startsWith(KOK) || !existsSync(dosya)) {
    yanit.writeHead(404).end();
    return;
  }
  yanit.writeHead(200, { 'Content-Type': TURLER[path.extname(dosya)] ?? 'application/octet-stream' });
  yanit.end(readFileSync(dosya));
}).listen(0);
const adres = `http://localhost:${sunucu.address().port}`;

const turler = JSON.parse(readFileSync(path.join(KOK, 'veri/turler.json'), 'utf8')).turler;
const isler = turler.filter((t) => t.fotograf?.dosya).map((t) => {
  const ekKlasor = path.join(KOK, 'fotograflar/referans', t.id);
  const ekler = existsSync(ekKlasor) ? readdirSync(ekKlasor).filter((d) => /\.jpe?g$/i.test(d)).map((d) => `fotograflar/referans/${t.id}/${d}`) : [];
  return { id: t.id, dosyalar: [t.fotograf.dosya, ...ekler] };
});

const tarayici = await chromium.launch();
const sayfa = await tarayici.newPage();
await sayfa.goto(`${adres}/__bos`);
const sonuc = await sayfa.evaluate(async (isler) => {
  const f = await import('/js/fotoTanima.js');
  const cikti = {};
  for (const is of isler) {
    cikti[is.id] = [];
    for (const dosya of is.dosyalar) {
      const resim = new Image();
      resim.src = `/${dosya}`;
      await resim.decode();
      // Tam kare, aynalı ve ortaya yakınlaşmış: mantar fotoğrafta farklı büyüklükte olabilir.
      for (const secenek of [{}, { cevir: true }, { yakinlik: 0.7 }, { yakinlik: 0.5 }]) {
        cikti[is.id].push(f.izKodla(await f.parmakIzi(resim, secenek)));
      }
    }
  }
  return cikti;
}, isler);
await tarayici.close();
sunucu.close();

writeFileSync(path.join(KOK, 'vendor/mobilenet/parmak-izleri.json'), `${JSON.stringify({
  _aciklama: 'Tür fotoğraflarının parmak izleri (MobileNet V2, 1280 sayı, 8 bit, base64). scripts/parmak-izi-uret.js üretir; elle düzenleme. Yalnızca adayları sıralamak içindir, hiçbir türü elemez.',
  model: 'mobilenet_v2_1.0_224 AvgPool',
  turler: sonuc,
})}\n`);
console.log(`Yazıldı: ${Object.keys(sonuc).length} tür, ${Object.values(sonuc).flat().length} iz`);
