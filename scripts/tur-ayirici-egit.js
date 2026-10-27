// Fotoğraf kıyasının "tür ayırıcısını" eğitir ve vendor/mobilenet/tur-ayirici.json'a yazar (js/fotoTanima.js kullanır).
// 2026-10-26: Önceki yöntem (her türün birkaç fotoğrafıyla en yakın eşleşme) gerçek bir kanlıca fotoğrafını alakasız
// türlerle eşleştirdi. Şimdi her türün yaklaşık 100 lisanslı fotoğrafından (ansiklopedi fotoğrafı, Commons, iNaturalist)
// küçük bir doğrusal ayırıcı öğrenilir. Telefon yalnızca bu ayırıcıyı indirir (~60 KB); fotoğraflar indirilmez.
// Ayırıcı yalnızca adayları sıralar; hiçbir türü elemez, sonucun rengini değiştirmez (kural 3, 5).
// Fotoğraflar: veri/turler.json (fotograf.dosya), fotograflar/referans/<id>/ (scripts/referans-getir.js),
//              fotograflar/inat/<id>/ (scripts/inat-getir.js). Lisanslar ticari kullanıma uygun; kaynaklar depoda.
// Kullanım: node scripts/tur-ayirici-egit.js          (eğitir ve yazar)
//           node scripts/tur-ayirici-egit.js --olc    (her türün fotoğraflarının %15'ini saklayıp doğruluğu ölçer; dosya yazmaz)
// Playwright ya da playwright-core + bilgisayardaki Chrome/Edge gerekir; Claude çalıştırır.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const gerektir = createRequire(import.meta.url);
const OLC = process.argv.includes('--olc');
// --alt-yapi: tür yerine şapkanın altını (solungaç, gözenek, düz/kırışık, diken) ayıran ayırıcı (2026-10-27, Metin: "fotoğrafta
// görünüyor, kendin bul"). Fotoğraflar fotograflar/alt-yapi/<sınıf>/ (gözle seçilmiş iNaturalist fotoğrafları;
// kaynaklar fotograflar/alt-yapi-kaynaklar.json). Çıktı vendor/mobilenet/alt-yapi.json.
const ALT = process.argv.includes('--alt-yapi');
const ALT_SINIFLARI = ['solungac', 'gozenek', 'duz', 'diken'];
// --renk: şapka rengi ayırıcısı. Her fotoğraf, türünün verideki ilk (baskın) şapka rengiyle öğretilir. Çıktı vendor/mobilenet/sapka-rengi.json.
const RENK = process.argv.includes('--renk');
const RENKLER = ['beyaz', 'krem-sari', 'kahverengi', 'kirmizi-turuncu', 'yesil-zeytin', 'gri-siyah'];
// Hesaplanan izler burada saklanır (yeniden eğitim hızlı olsun; depoya girmez).
const ONBELLEK = path.join(KOK, 'fotograflar', '.iz-onbellek.json');
// İz birim uzunluktadır; ayırıcıya bu katsayıyla büyütülüp verilir (öğrenme hızlı olsun). Telefon da aynısını yapar.
const GIRDI_OLCEGI = 10;

function tarayiciAc() {
  try {
    return gerektir('playwright').chromium.launch();
  } catch {
    const { chromium } = gerektir('playwright-core');
    const adaylar = [
      process.env.MANTAR_TARAYICI,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/google-chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ].filter(Boolean);
    const yol = adaylar.find((y) => existsSync(y));
    if (!yol) throw new Error('Chrome veya Edge bulunamadı (MANTAR_TARAYICI ile yol verilebilir).');
    return chromium.launch({ executablePath: yol });
  }
}

const klasorDosyalari = (klasor) => {
  const tam = path.join(KOK, klasor);
  return existsSync(tam) ? readdirSync(tam).filter((d) => /^\d+\.jpe?g$/i.test(d)).sort().map((d) => `${klasor}/${d}`) : [];
};
const turler = JSON.parse(readFileSync(path.join(KOK, 'veri/turler.json'), 'utf8')).turler.filter((t) => t.fotograf?.dosya);
const turunFotograflari = (t) => [t.fotograf.dosya, ...klasorDosyalari(`fotograflar/referans/${t.id}`), ...klasorDosyalari(`fotograflar/inat/${t.id}`)];
const isler = ALT
  ? ALT_SINIFLARI.map((id) => ({ id, tehlikeli: false, ana: null, ekler: klasorDosyalari(`fotograflar/alt-yapi/${id}`) }))
  : RENK
  ? RENKLER.map((id) => ({ id, tehlikeli: false, ana: null, ekler: turler.filter((t) => t.ozellikler?.sapkaRengi?.[0] === id).flatMap(turunFotograflari) }))
  : turler.map((t) => ({
    id: t.id,
    tehlikeli: t.zehirlilik !== 'yenen',
    ana: t.fotograf.dosya,
    ekler: [...klasorDosyalari(`fotograflar/referans/${t.id}`), ...klasorDosyalari(`fotograflar/inat/${t.id}`)],
  }));
// Her fotoğraf birkaç biçimde öğretilir (mantar fotoğrafta farklı büyüklükte ve yönde olabilir).
const ANA_BICIMLER = { t: {}, a: { cevir: true }, y: { yakinlik: 0.7 }, z: { yakinlik: 0.5 } };
const EK_BICIMLER = { t: {}, a: { cevir: true } };
// Bir işin fotoğrafları ve biçimleri (şapka altı fotoğrafları az olduğu için onlar da dört biçimde öğretilir).
const dosyalari = (is) => [...(is.ana ? [[is.ana, ANA_BICIMLER]] : []), ...is.ekler.map((d) => [d, ALT ? ANA_BICIMLER : EK_BICIMLER])];
const CIKTI = ALT ? 'vendor/mobilenet/alt-yapi.json' : RENK ? 'vendor/mobilenet/sapka-rengi.json' : 'vendor/mobilenet/tur-ayirici.json';

// ---- 1. İzler (önbellekte olmayanlar tarayıcıda hesaplanır) ----
const onbellek = existsSync(ONBELLEK) ? JSON.parse(readFileSync(ONBELLEK, 'utf8')) : {};
const gereken = [];
for (const is of isler) {
  for (const [dosya, bicimler] of dosyalari(is)) {
    for (const [ad, secenek] of Object.entries(bicimler)) if (!onbellek[`${dosya}#${ad}`]) gereken.push({ anahtar: `${dosya}#${ad}`, dosya, secenek });
  }
}

const TURLER = { '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.bin': 'application/octet-stream' };
const sunucu = createServer((istek, yanit) => {
  if (istek.url === '/__bos') return yanit.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>.</title>');
  const dosya = path.join(KOK, decodeURIComponent(new URL(istek.url, 'http://x').pathname));
  if (!dosya.startsWith(KOK) || !existsSync(dosya)) return yanit.writeHead(404).end();
  yanit.writeHead(200, { 'Content-Type': TURLER[path.extname(dosya).toLowerCase()] ?? 'application/octet-stream' }).end(readFileSync(dosya));
}).listen(0);
const tarayici = await tarayiciAc();
const sayfa = await tarayici.newPage();
await sayfa.goto(`http://localhost:${sunucu.address().port}/__bos`);
await sayfa.evaluate(async () => { window.f = await import('/js/fotoTanima.js'); await window.f.modeliHazirla(); });

for (let i = 0; i < gereken.length; i += 200) {
  const parca = gereken.slice(i, i + 200);
  const sonuc = await sayfa.evaluate(async (parca) => {
    const cikti = {};
    const resimler = {};
    for (const { anahtar, dosya, secenek } of parca) {
      try {
        if (!resimler[dosya]) { const r = new Image(); r.src = `/${dosya}`; await r.decode(); resimler[dosya] = r; }
        cikti[anahtar] = window.f.izKodla(await window.f.parmakIzi(resimler[dosya], secenek));
      } catch { cikti[anahtar] = null; }
    }
    return cikti;
  }, parca);
  Object.assign(onbellek, sonuc);
  writeFileSync(ONBELLEK, JSON.stringify(onbellek));
  console.log(`İzler: ${Math.min(i + 200, gereken.length)}/${gereken.length}`);
}

// ---- 2. Eğitim (tarayıcıdaki TensorFlow.js ile) ----
const ids = isler.map((i) => i.id);
// Ölçümde her türün ek fotoğraflarının %15'i (en az 2) saklanır; saklanan hiçbir biçimiyle eğitime girmez.
const saklanan = new Set();
if (OLC) {
  for (const is of isler) {
    // Sabit seçim: her 7 fotoğraftan biri (en az 2).
    const secilen = is.ekler.filter((_, i) => i % (ALT ? 4 : 7) === (ALT ? 1 : 3));
    for (const d of secilen.length >= 2 ? secilen : is.ekler.slice(-2)) saklanan.add(d);
  }
}
const ornekler = [];
const denemeler = [];
isler.forEach((is, y) => {
  for (const [dosya, bicimler] of dosyalari(is)) {
    if (saklanan.has(dosya)) { if (onbellek[`${dosya}#t`]) denemeler.push({ y, iz: onbellek[`${dosya}#t`], tehlikeli: is.tehlikeli }); continue; }
    for (const ad of Object.keys(bicimler)) if (onbellek[`${dosya}#${ad}`]) ornekler.push({ y, iz: onbellek[`${dosya}#${ad}`] });
  }
});

const sonuc = await sayfa.evaluate(async ({ ornekler, denemeler, K, OLCEK }) => {
  const tf = window.tf;
  const coz = (m) => Array.from(window.f.izCoz(m), (d) => d * OLCEK);
  const X = tf.tensor2d(ornekler.map((o) => coz(o.iz)));
  const Y = tf.oneHot(tf.tensor1d(ornekler.map((o) => o.y), 'int32'), K).toFloat();
  // Fotoğrafı az olan türler geri kalmasın: her türün toplam ağırlığı eşit.
  const sayi = new Array(K).fill(0);
  for (const o of ornekler) sayi[o.y]++;
  const A = tf.tensor1d(ornekler.map((o) => ornekler.length / (K * sayi[o.y])));
  const W = tf.variable(tf.zeros([1280, K]));
  const b = tf.variable(tf.zeros([K]));
  const eniyilestirici = tf.train.adam(0.01);
  for (let devir = 0; devir < 400; devir++) {
    eniyilestirici.minimize(() => tf.losses.softmaxCrossEntropy(Y, X.matMul(W).add(b), A).add(W.square().sum().mul(1e-4)));
  }
  const agirlik = await W.transpose().array();
  const sapma = Array.from(await b.data());
  // Ölçüm: saklanan fotoğrafların doğru türü kaçıncı sırada, en üstteki olasılık eşiği geçince ne kadar doğru.
  const olcum = { n: denemeler.length, ilk1: 0, ilk3: 0, tehlikeliN: 0, tehlikeliIlk3: 0, esikler: {} };
  if (denemeler.length) {
    const olas = await tf.softmax(tf.tensor2d(denemeler.map((d) => coz(d.iz))).matMul(W).add(b)).array();
    const esikler = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    for (const e of esikler) olcum.esikler[e] = { gecen: 0, dogru: 0 };
    denemeler.forEach((d, i) => {
      const sira = olas[i].map((p, k) => [k, p]).sort((x, z) => z[1] - x[1]);
      const yer = sira.findIndex(([k]) => k === d.y);
      if (yer === 0) olcum.ilk1++;
      if (yer < 3) olcum.ilk3++;
      if (d.tehlikeli) { olcum.tehlikeliN++; if (yer < 3) olcum.tehlikeliIlk3++; }
      for (const e of esikler) if (sira[0][1] >= e) { olcum.esikler[e].gecen++; if (yer === 0) olcum.esikler[e].dogru++; }
    });
  }
  return { agirlik, sapma, olcum };
}, { ornekler, denemeler, K: ids.length, OLCEK: GIRDI_OLCEGI });
await tarayici.close();
sunucu.close();

if (OLC) {
  const o = sonuc.olcum;
  const yuzde = (a, b) => `%${Math.round((a / Math.max(1, b)) * 100)}`;
  console.log(`Eğitim: ${ornekler.length} örnek. Saklanan ${o.n} fotoğraf: doğru tür 1. sırada ${yuzde(o.ilk1, o.n)}, ilk 3'te ${yuzde(o.ilk3, o.n)}; zehirli/şüpheli türlerde ilk 3'te ${yuzde(o.tehlikeliIlk3, o.tehlikeliN)}`);
  for (const [e, s] of Object.entries(o.esikler)) console.log(`  en üstteki ≥ ${e}: ${s.gecen} fotoğraf, ${yuzde(s.dogru, s.gecen)} doğru`);
} else {
  // Ağırlıklar tür başına 8 bite sıkıştırılır (dosya küçük kalsın).
  const satirlar = sonuc.agirlik.map((satir) => {
    const olcek = Math.max(...satir.map(Math.abs)) / 127 || 1;
    const bayt = Buffer.from(Int8Array.from(satir, (w) => Math.round(w / olcek)).buffer);
    return { olcek: Number(olcek.toPrecision(6)), agirlik: bayt.toString('base64') };
  });
  writeFileSync(path.join(KOK, CIKTI), `${JSON.stringify({
    _aciklama: RENK
      ? 'Şapka rengi ayırıcısı (MobileNet V2 izi → baskın şapka rengi). scripts/tur-ayirici-egit.js --renk üretir; elle düzenleme. Yalnızca öneri içindir; kullanıcı onaylamadan cevap sayılmaz.'
      : ALT
      ? 'Şapka altı ayırıcısı (MobileNet V2 izi → solungaç/gözenek/düz/diken). scripts/tur-ayirici-egit.js --alt-yapi üretir; elle düzenleme. Yalnızca öneri içindir; kullanıcı onaylamadan cevap sayılmaz.'
      : 'Fotoğraf kıyasının tür ayırıcısı (MobileNet V2 izi → tür). scripts/tur-ayirici-egit.js üretir; elle düzenleme. Yalnızca adayları sıralamak içindir, hiçbir türü elemez.',
    model: 'mobilenet_v2_1.0_224 AvgPool',
    girdiOlcegi: GIRDI_OLCEGI,
    turler: Object.fromEntries(ids.map((id, k) => [id, { ...satirlar[k], sapma: Number(sonuc.sapma[k].toPrecision(6)) }])),
  })}\n`);
  console.log(`Yazıldı: ${ids.length} tür, ${ornekler.length} örnekten`);
}
