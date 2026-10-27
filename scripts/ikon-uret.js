// Telefona eklenen uygulamanın simgesi (manifestte "maskable"): zemin baştan sona logonun koyu kahvesi, anahtar delikli
// mantar ortada ve olabildiğince büyük (Metin, 2026-10-27: "etrafı beyaz, logo içeride küçük kalmış").
// Android simgeyi yuvarlak (ya da başka biçimde) keser; ortadaki %80'lik daire her zaman görünür ("güvenli alan").
// Mantarın ortaya en uzak noktası (şapkanın iki ucu) bu dairenin içinde kalacak kadar büyütülür.
// Çalıştır: node scripts/ikon-uret.js  (playwright-core + bilgisayardaki Chrome/Edge)
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KAHVE = '#6b3e26';
// Başlıktaki logonun (index.html) mantarı, 200×200 düzlemde. Şapkanın uçları (24,104) ve (176,104).
const MANTAR = `<rect x="84" y="100" width="32" height="64" rx="10" fill="#f3eadc"/><path d="M24 104 Q100 8 176 104 Z" fill="#e8963f"/><circle cx="100" cy="66" r="13" fill="${KAHVE}"/><path d="M93 72 L107 72 L111 96 L89 96 Z" fill="${KAHVE}"/>`;
const MERKEZ_Y = 106; // şapka uçları ile ayak dibinin ortası: daire içine en büyük sığan konum
const EN_UZAK = Math.hypot(76, MERKEZ_Y - 104); // şapka ucu
const GUVENLI_YARICAP = 0.39 * 200; // %80'lik güvenli dairenin biraz içi
const OLCEK = GUVENLI_YARICAP / EN_UZAK;

const svg = (boyut) => `<svg xmlns="http://www.w3.org/2000/svg" width="${boyut}" height="${boyut}" viewBox="0 0 200 200">
<rect width="200" height="200" fill="${KAHVE}"/>
<g transform="translate(100 100) scale(${OLCEK.toFixed(4)}) translate(-100 -${MERKEZ_Y})">${MANTAR}</g></svg>`;

async function main() {
  const yol = [process.env.MANTAR_TARAYICI, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', '/usr/bin/google-chrome'].filter(Boolean).find((y) => existsSync(y));
  const tarayici = await chromium.launch({ executablePath: yol });
  for (const boyut of [192, 512]) {
    const sayfa = await tarayici.newPage({ viewport: { width: boyut, height: boyut } });
    await sayfa.setContent(`<html><body style="margin:0">${svg(boyut)}</body></html>`);
    const hedef = path.join(__dirname, '..', 'ikonlar', `ikon-maskeli-${boyut}.png`);
    await sayfa.locator('svg').screenshot({ path: hedef, omitBackground: false });
    console.log(hedef);
  }
  await tarayici.close();
}

main().catch((h) => { console.error(h); process.exit(1); });
