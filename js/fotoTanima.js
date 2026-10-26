// Fotoğraf kıyası (Metin'in isteği, 2026-10-26): çekilen fotoğraf, uygulamadaki tür fotoğraflarıyla telefonda kıyaslanır.
// Küçük bir yapay zeka modeli (MobileNet V2, Apache 2.0) fotoğrafın "parmak izini" çıkarır (1280 sayı);
// türlerin parmak izleri önceden hesaplanıp vendor/mobilenet/parmak-izleri.json'a yazılmıştır (scripts/parmak-izi-uret.js).
// - Fotoğraf hiçbir yere gönderilmez; model ve parmak izleri uygulamanın kendi dosyalarıdır (kural 12).
// - Model ilk kullanımda bir kez indirilir (~5 MB) ve cihazda kalır (sw.js, model önbelleği); sonra internetsiz çalışır.
// - Kıyas yalnızca adayları sıralar ve hangi sorunun önce sorulacağına yardım eder. Hiçbir türü elemez,
//   sonucun rengini değiştirmez (kural 3, 5). Model yüklenemezse tanımlama sorularla aynen çalışır.

// Bu dosyalar uygulamayla birlikte indirilmez; yalnızca kullanıcı fotoğraf kıyasını açınca bir kez iner.
export const MODEL_DOSYALARI = ['./vendor/tf.min.js', './vendor/mobilenet/model.json', './vendor/mobilenet/agirliklar.bin', './vendor/mobilenet/parmak-izleri.json'];
const CIKIS = 'module_apply_default/MobilenetV2/Logits/AvgPool';
const BOYUT = 224;

let modelSozu = null;
let referansSozu = null;
let durum = 'yok'; // 'yok' | 'yukleniyor' | 'hazir' | 'hata'
const dinleyiciler = new Set();

function durumYaz(yeni) {
  durum = yeni;
  for (const d of dinleyiciler) d(durum);
}

export const modelDurumu = () => durum;
export function modelDurumunuDinle(dinleyici) {
  dinleyiciler.add(dinleyici);
  return () => dinleyiciler.delete(dinleyici);
}

function betikYukle(adres) {
  return new Promise((coz, reddet) => {
    if (window.tf) return coz();
    const betik = document.createElement('script');
    betik.src = adres;
    betik.onload = () => coz();
    betik.onerror = () => reddet(new Error('Betik yüklenemedi'));
    document.head.append(betik);
  });
}

// Modeli hazırlar (bir kez). Başarısız olursa sonraki çağrıda yeniden dener.
export function modeliHazirla() {
  modelSozu ??= (async () => {
    durumYaz('yukleniyor');
    await betikYukle(MODEL_DOSYALARI[0]);
    await window.tf.ready();
    const model = await window.tf.loadGraphModel(MODEL_DOSYALARI[1]);
    // İlk çalıştırma yavaştır; boş bir resimle ısıtılır.
    window.tf.tidy(() => model.execute(window.tf.zeros([1, BOYUT, BOYUT, 3]), CIKIS));
    durumYaz('hazir');
    return model;
  })().catch((hata) => {
    modelSozu = null;
    durumYaz('hata');
    throw hata;
  });
  return modelSozu;
}

// Base64 ile saklanan 8 bitlik parmak izini birim uzunlukta sayı dizisine çevirir.
export function izCoz(metin) {
  const ikili = typeof atob === 'function' ? atob(metin) : Buffer.from(metin, 'base64').toString('binary');
  const iz = new Float32Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) iz[i] = ikili.charCodeAt(i);
  return birimYap(iz);
}

// Parmak izini 8 bite sıkıştırır (yalnızca yön önemli; uzunluk atılır).
export function izKodla(iz) {
  let enCok = 0;
  for (const d of iz) enCok = Math.max(enCok, d);
  let ikili = '';
  for (const d of iz) ikili += String.fromCharCode(enCok > 0 ? Math.round((Math.max(0, d) / enCok) * 255) : 0);
  return typeof btoa === 'function' ? btoa(ikili) : Buffer.from(ikili, 'binary').toString('base64');
}

export function birimYap(iz) {
  let uzunluk = 0;
  for (const d of iz) uzunluk += d * d;
  uzunluk = Math.sqrt(uzunluk) || 1;
  return iz.map((d) => d / uzunluk);
}

export function kosinus(a, b) {
  let t = 0;
  for (let i = 0; i < a.length; i++) t += a[i] * b[i];
  return t;
}

/**
 * Kullanıcının fotoğraflarının izlerini tür izleriyle kıyaslar.
 * Dönüş: { türId: 0–1 } — her tür için en benzer referansla en benzer fotoğrafın benzerliği (kosinüs).
 * Değerler "olasılık" değildir; yalnızca sıralama içindir. Ölçüm (2026-10-26, tür başına 3–20 referans fotoğraf,
 * uygulamanın görmediği 99 fotoğraf): doğru tür 1. sırada %43, ilk 3'te %73 (tek fotoğrafla %30 ve %46'ydı).
 */
export function benzerlikleriHesapla(kullaniciIzleri, referanslar) {
  const sonuc = {};
  for (const [id, izler] of Object.entries(referanslar)) {
    let enIyi = 0;
    for (const k of kullaniciIzleri) for (const r of izler) enIyi = Math.max(enIyi, kosinus(k, r));
    sonuc[id] = Math.min(1, enIyi);
  }
  return sonuc;
}

// Eşikler ölçümle seçildi (2026-10-26; 34 tür, 520 referans, saklanan 99 deneme fotoğrafı): en üstteki tahmin
// 0,68'i geçince yalnızca %43, 0,75'i geçince %64, 0,80'i geçince ölçülen hepsi doğruydu. Bu yüzden "muhtemelen"
// yalnızca 0,80 ve üstünde denir; altında yalnızca sıralanır. (Eski eşik 0,68 tek fotoğraflı referanslara göreydi.)
export const BELIRGIN_BENZERLIK = 0.8;
const BENZER = 0.75;

// Benzerliği okunur söze çevirir (yüzde gösterilmez: güven gibi okunmasın).
export function benzerlikSozu(deger) {
  if (deger >= BELIRGIN_BENZERLIK) return 'Fotoğrafa çok benziyor';
  if (deger >= BENZER) return 'Fotoğrafa benziyor';
  return 'Fotoğrafa az benziyor';
}

export function referanslariYukle() {
  referansSozu ??= fetch(MODEL_DOSYALARI[3])
    .then((y) => y.json())
    .then((veri) => Object.fromEntries(Object.entries(veri.turler ?? {}).map(([id, liste]) => [id, liste.map(izCoz)])))
    .catch(() => {
      referansSozu = null;
      return {};
    });
  return referansSozu;
}

// Resmin ortasından kare kesip 224x224'e küçültür. yakinlik < 1 ise ortaya yaklaşır; cevir: aynalar.
export function kareCiz(kaynak, { yakinlik = 1, cevir = false } = {}) {
  const genislik = kaynak.videoWidth || kaynak.naturalWidth || kaynak.width;
  const yukseklik = kaynak.videoHeight || kaynak.naturalHeight || kaynak.height;
  const kenar = Math.min(genislik, yukseklik) * yakinlik;
  const tuval = document.createElement('canvas');
  tuval.width = BOYUT;
  tuval.height = BOYUT;
  const c = tuval.getContext('2d');
  if (cevir) {
    c.translate(BOYUT, 0);
    c.scale(-1, 1);
  }
  c.drawImage(kaynak, (genislik - kenar) / 2, (yukseklik - kenar) / 2, kenar, kenar, 0, 0, BOYUT, BOYUT);
  return tuval;
}

// Bir resmin parmak izi (birim uzunlukta 1280 sayı).
export async function parmakIzi(kaynak, secenekler) {
  const model = await modeliHazirla();
  const tf = window.tf;
  const tuval = kareCiz(kaynak, secenekler);
  const cikti = tf.tidy(() => {
    const girdi = tf.browser.fromPixels(tuval).toFloat().div(255).expandDims(0);
    return model.execute(girdi, CIKIS).reshape([-1]);
  });
  const iz = await cikti.data();
  cikti.dispose();
  return birimYap(Float32Array.from(iz));
}
