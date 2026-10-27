// Fotoğraf kıyasının "tür ayırıcısını" eğitir ve vendor/mobilenet/tur-ayirici.json'a yazar (js/fotoTanima.js kullanır).
// 2026-10-26: Önceki yöntem (her türün birkaç fotoğrafıyla en yakın eşleşme) gerçek bir kanlıca fotoğrafını alakasız
// türlerle eşleştirdi. Şimdi her türün yaklaşık 100 lisanslı fotoğrafından (ansiklopedi fotoğrafı, Commons, iNaturalist)
// küçük bir doğrusal ayırıcı öğrenilir. Telefon yalnızca bu ayırıcıyı indirir (~60 KB); fotoğraflar indirilmez.
// Ayırıcı yalnızca adayları sıralar; hiçbir türü elemez, sonucun rengini değiştirmez (kural 3, 5).
// Fotoğraflar: veri/turler.json (fotograf.dosya), fotograflar/referans/<id>/ (scripts/referans-getir.js),
//              fotograflar/inat/<id>/ (scripts/inat-getir.js). Lisanslar ticari kullanıma uygun; kaynaklar depoda.
// Eğitimde yalnızca CC0, kamu malı ve CC BY lisanslı fotoğraflar kullanılır; sabit deneme seti (fotograflar/deneme/,
// scripts/deneme-seti.js) eğitime hiç girmez.
// Kullanım: node scripts/tur-ayirici-egit.js          (eğitir ve yazar)
//           node scripts/tur-ayirici-egit.js --olc    (sabit deneme setiyle doğruluğu ölçer; dosya yazmaz)
//           Haftalık otomatik güncelleme: scripts/haftalik-guncelle.js
// Playwright ya da playwright-core + bilgisayardaki Chrome/Edge gerekir; Claude çalıştırır.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { egitimeUygunLisans } from './lisans.js';

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
// Eğitim ayarı: tur sayısı ve ağırlıkların küçük tutulma katsayısı (ölçümle seçildi; deneme için ortamdan değiştirilebilir).
const EGITIM_AYARI = { devir: Number(process.env.MANTAR_DEVIR ?? 400), l2: Number(process.env.MANTAR_L2 ?? 1e-4) };

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
const jsonOku = (d) => (existsSync(path.join(KOK, d)) ? JSON.parse(readFileSync(path.join(KOK, d), 'utf8')) : {});

// Eğitimde yalnızca CC0, kamu malı ve CC BY lisanslı fotoğraflar (scripts/lisans.js).
const LISANSLAR = new Map();
for (const t of turler) LISANSLAR.set(t.fotograf.dosya, t.fotograf.lisans);
for (const [id, liste] of Object.entries(jsonOku('fotograflar/referans-kaynaklar.json'))) for (const k of liste) LISANSLAR.set(`fotograflar/referans/${id}/${k.dosya}`, k.lisans);
for (const [id, liste] of Object.entries(jsonOku('fotograflar/inat-kaynaklar.json'))) for (const k of liste) LISANSLAR.set(`fotograflar/inat/${id}/${k.dosya}`, k.lisans);
for (const [sinif, liste] of Object.entries(jsonOku('fotograflar/alt-yapi-kaynaklar.json'))) for (const k of liste) LISANSLAR.set(`fotograflar/alt-yapi/${sinif}/${k.dosya}`, k.lisans);
// MANTAR_DENEY_TUM_LISANSLAR=1 yalnızca karşılaştırma ölçümü içindir (lisans süzgecinin etkisini görmek); yayına çıkan
// dosya hiçbir zaman bununla üretilmez (scripts/haftalik-guncelle.js kullanmaz).
const egitimeUygun = (dosya) => (process.env.MANTAR_DENEY_TUM_LISANSLAR === '1' && OLC ? LISANSLAR.has(dosya) : egitimeUygunLisans(LISANSLAR.get(dosya)));
const turunFotograflari = (t) => [t.fotograf.dosya, ...klasorDosyalari(`fotograflar/referans/${t.id}`), ...klasorDosyalari(`fotograflar/inat/${t.id}`)].filter(egitimeUygun);
const isler = ALT
  ? ALT_SINIFLARI.map((id) => ({ id, tehlikeli: false, ana: null, ekler: klasorDosyalari(`fotograflar/alt-yapi/${id}`) }))
  : RENK
  ? RENKLER.map((id) => ({ id, tehlikeli: false, ana: null, ekler: turler.filter((t) => t.ozellikler?.sapkaRengi?.[0] === id).flatMap(turunFotograflari) }))
  : turler.map((t) => ({
    id: t.id,
    tehlikeli: t.zehirlilik !== 'yenen',
    ana: egitimeUygun(t.fotograf.dosya) ? t.fotograf.dosya : null,
    ekler: [...klasorDosyalari(`fotograflar/referans/${t.id}`), ...klasorDosyalari(`fotograflar/inat/${t.id}`)].filter(egitimeUygun),
    // Sabit deneme seti (scripts/deneme-seti.js): eğitime hiç girmez, yalnızca ölçümde kullanılır.
    deneme: klasorDosyalari(`fotograflar/deneme/${t.id}`),
  }));
// Her fotoğraf birkaç biçimde öğretilir (mantar fotoğrafta farklı büyüklükte ve yönde olabilir).
const ANA_BICIMLER = { t: {}, a: { cevir: true }, y: { yakinlik: 0.7 }, z: { yakinlik: 0.5 } };
const EK_BICIMLER = { t: {}, a: { cevir: true } };
// Bir işin fotoğrafları ve biçimleri (şapka altı fotoğrafları az olduğu için onlar da dört biçimde öğretilir).
const dosyalari = (is) => [...(is.ana ? [[is.ana, ANA_BICIMLER]] : []), ...is.ekler.map((d) => [d, ALT ? ANA_BICIMLER : EK_BICIMLER])];
// Hangi modelin izleriyle eğitilecek: uygulamanınki (js/modelAyari.js) ya da denenen aday model (MANTAR_MODEL_KLASORU,
// MANTAR_MODEL_CIKIS; scripts/ince-ayar-dene.js). Ayırıcılar modelin klasörüne yazılır.
const { MODEL: UYGULAMA_MODELI } = await import('../js/modelAyari.js');
const MODEL = process.env.MANTAR_MODEL_KLASORU
  ? { klasor: `./${process.env.MANTAR_MODEL_KLASORU.replace(/^\.?\/*/, '').replace(/\/?$/, '/')}`, cikis: process.env.MANTAR_MODEL_CIKIS || null }
  : UYGULAMA_MODELI;
const CIKTI = `${MODEL.klasor.replace(/^\.\//, '')}${ALT ? 'alt-yapi.json' : RENK ? 'sapka-rengi.json' : 'tur-ayirici.json'}`;

// ---- 1. İzler (önbellekte olmayanlar tarayıcıda hesaplanır) ----
// Önbellek anahtarı dosyanın değiştirilme zamanını da içerir: aynı adla yeni fotoğraf inerse eski iz kullanılmaz.
const onbellek = existsSync(ONBELLEK) ? JSON.parse(readFileSync(ONBELLEK, 'utf8')) : {};
const anahtar = (dosya, ad) => `${MODEL.klasor}|${dosya}@${Math.round(statSync(path.join(KOK, dosya)).mtimeMs)}#${ad}`;
const gereken = [];
const istenen = new Set();
for (const is of isler) {
  for (const [dosya, bicimler] of [...dosyalari(is), ...(is.deneme ?? []).map((d) => [d, { t: {} }])]) {
    for (const [ad, secenek] of Object.entries(bicimler)) {
      const a = anahtar(dosya, ad);
      if (onbellek[a] || istenen.has(a)) continue;
      istenen.add(a);
      gereken.push({ anahtar: a, dosya, secenek });
    }
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
await sayfa.evaluate(async (model) => { window.MANTAR_MODEL = model; window.f = await import('/js/fotoTanima.js'); await window.f.modeliHazirla(); }, MODEL);

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
// Ölçüm: tür ayırıcısında sabit deneme seti (fotograflar/deneme/; eğitime hiç girmez). Şapka altı ve renk ayırıcılarında
// her sınıfın ek fotoğraflarının bir kısmı saklanır; saklanan hiçbir biçimiyle eğitime girmez.
const saklanan = new Set();
if (OLC && (ALT || RENK)) {
  for (const is of isler) {
    const secilen = is.ekler.filter((_, i) => i % (ALT ? 4 : 7) === (ALT ? 1 : 3));
    for (const d of secilen.length >= 2 ? secilen : is.ekler.slice(-2)) saklanan.add(d);
  }
}
const ornekler = [];
const denemeler = [];
isler.forEach((is, y) => {
  for (const [dosya, bicimler] of dosyalari(is)) {
    if (saklanan.has(dosya)) { const iz = onbellek[anahtar(dosya, 't')]; if (iz) denemeler.push({ y, iz, tehlikeli: is.tehlikeli, dosya }); continue; }
    for (const ad of Object.keys(bicimler)) { const iz = onbellek[anahtar(dosya, ad)]; if (iz) ornekler.push({ y, iz }); }
  }
  if (OLC) for (const dosya of is.deneme ?? []) { const iz = onbellek[anahtar(dosya, 't')]; if (iz) denemeler.push({ y, iz, tehlikeli: is.tehlikeli, dosya }); }
});

const sonuc = await sayfa.evaluate(async ({ ornekler, denemeler, K, OLCEK, AYAR }) => {
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
  for (let devir = 0; devir < AYAR.devir; devir++) {
    eniyilestirici.minimize(() => tf.losses.softmaxCrossEntropy(Y, X.matMul(W).add(b), A).add(W.square().sum().mul(AYAR.l2)));
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
    olcum.puanlar = denemeler.map((d, i) => ({ dosya: d.dosya, y: d.y, olas: olas[i].map((p) => Number(p.toFixed(5))) }));
  }
  return { agirlik, sapma, olcum };
}, { ornekler, denemeler, K: ids.length, OLCEK: GIRDI_OLCEGI, AYAR: EGITIM_AYARI });
await tarayici.close();
sunucu.close();

if (OLC) {
  const o = sonuc.olcum;
  const yuzde = (a, b) => `%${Math.round((a / Math.max(1, b)) * 100)}`;
  console.log(`Eğitim: ${ornekler.length} örnek. Saklanan ${o.n} fotoğraf: doğru tür 1. sırada ${yuzde(o.ilk1, o.n)}, ilk 3'te ${yuzde(o.ilk3, o.n)}; zehirli/şüpheli türlerde ilk 3'te ${yuzde(o.tehlikeliIlk3, o.tehlikeliN)}`);
  for (const [e, s] of Object.entries(o.esikler)) console.log(`  en üstteki ≥ ${e}: ${s.gecen} fotoğraf, ${yuzde(s.dogru, s.gecen)} doğru`);
  // İstenirse saklanan fotoğrafların puanları yazılır (ör. mevsim ağırlığının etkisini ölçmek için).
  const puanDosyasi = process.env.MANTAR_OLCUM_DOSYASI;
  if (puanDosyasi) writeFileSync(puanDosyasi, JSON.stringify({ turler: ids, puanlar: o.puanlar }));
  // Haftalık güncelleme için kısa özet (scripts/haftalik-guncelle.js).
  const ozetDosyasi = process.env.MANTAR_OLCUM_OZETI;
  if (ozetDosyasi) writeFileSync(ozetDosyasi, JSON.stringify({ fotograf: o.n, ilk1: o.ilk1 / o.n, ilk3: o.ilk3 / o.n, ornek: ornekler.length }));
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
