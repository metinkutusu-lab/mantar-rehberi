// İnce ayarlı modelin telefon biçimine doğru çevrildiğini denetler (GitHub'da .github/workflows/ince-ayar.yml çalıştırır).
// 1. denemede (2026-10-27) model eğitimde %70'e çıkmış, telefon biçiminde %28'e düşmüştü; saatlerce kıyaslama boşuna sürdü.
// Python'un (scripts/ince-ayar.py) birkaç deneme fotoğrafına verdiği izler, tarayıcıdaki TensorFlow.js'in aynı fotoğraflara
// verdiği izlerle kıyaslanır (kosinüs benzerliği). Ayrıca izin 8 bite sıkıştırılıp açılınca yönünü koruduğu denetlenir
// (ayırıcılar sıkıştırılmış izlerle öğrenilir). Biri tutmazsa iş burada durur.
// Kullanım: node scripts/ince-ayar-kontrol.js vendor/mantar-modeli-1 /tmp/kontrol-izleri.json
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [klasor, referansDosyasi] = process.argv.slice(2);
const MODEL = { klasor: `./${klasor.replace(/^\.?\/*/, '').replace(/\/?$/, '/')}`, cikis: null };
const referans = JSON.parse(readFileSync(referansDosyasi, 'utf8'));
// Eşikler: çevirme hatası olmayan bir model bunların çok üstünde çıkar (yumuşatma ve kayan nokta farkları küçüktür).
const CEVIRME_ESIGI = 0.95;
const SIKISTIRMA_ESIGI = 0.99;

const yol = [process.env.MANTAR_TARAYICI, '/usr/bin/google-chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean).find((y) => existsSync(y));
const { chromium } = createRequire(import.meta.url)('playwright-core');
const TURLER = { '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const sunucu = createServer((istek, yanit) => {
  if (istek.url === '/__bos') return yanit.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>.</title>');
  const dosya = path.join(KOK, decodeURIComponent(new URL(istek.url, 'http://x').pathname));
  if (!dosya.startsWith(KOK) || !existsSync(dosya)) return yanit.writeHead(404).end();
  yanit.writeHead(200, { 'Content-Type': TURLER[path.extname(dosya).toLowerCase()] ?? 'application/octet-stream' }).end(readFileSync(dosya));
}).listen(0);
const tarayici = await chromium.launch({ executablePath: yol });
const sayfa = await tarayici.newPage();
await sayfa.goto(`http://localhost:${sunucu.address().port}/__bos`);
const sonuc = await sayfa.evaluate(async ({ model, dosyalar, izler }) => {
  window.MANTAR_MODEL = model;
  const f = await import('/js/fotoTanima.js');
  const cevirme = [];
  const sikistirma = [];
  for (let i = 0; i < dosyalar.length; i++) {
    const r = new Image();
    r.src = `/${dosyalar[i]}`;
    await r.decode();
    const iz = await f.parmakIzi(r, {});
    cevirme.push(f.kosinus(iz, f.birimYap(Float32Array.from(izler[i]))));
    sikistirma.push(f.kosinus(iz, f.izCoz(f.izKodla(iz))));
  }
  return { cevirme, sikistirma };
}, { model: MODEL, dosyalar: referans.dosyalar, izler: referans.izler });
await tarayici.close();
sunucu.close();

const ozet = (dizi) => ({ ort: dizi.reduce((a, b) => a + b, 0) / dizi.length, en_az: Math.min(...dizi) });
const c = ozet(sonuc.cevirme);
const s = ozet(sonuc.sikistirma);
console.log(`Python ↔ tarayıcı (${sonuc.cevirme.length} fotoğraf): ortalama ${c.ort.toFixed(4)}, en az ${c.en_az.toFixed(4)}`);
console.log(`İz sıkıştırma: ortalama ${s.ort.toFixed(4)}, en az ${s.en_az.toFixed(4)}`);
if (c.ort < CEVIRME_ESIGI || s.ort < SIKISTIRMA_ESIGI) {
  console.error('Kontrol tutmadı: telefon biçimindeki model eğitilenle aynı sonucu vermiyor. Kıyaslamaya geçilmedi.');
  process.exit(1);
}
console.log('Kontrol tamam.');
