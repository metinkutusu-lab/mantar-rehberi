// Fotoğraf kıyası (Metin'in isteği, 2026-10-26): çekilen fotoğraf, uygulamadaki tür fotoğraflarıyla telefonda kıyaslanır.
// Küçük bir yapay zeka modeli (MobileNet V2, Apache 2.0) fotoğrafın "parmak izini" çıkarır (1280 sayı);
// izi türlere ayıran küçük ayırıcı, tür başına ~100 lisanslı fotoğraftan önceden öğrenilip
// modelin klasöründeki tur-ayirici.json'a yazılmıştır (js/modelAyari.js, scripts/tur-ayirici-egit.js).
// - Fotoğraf hiçbir yere gönderilmez; model ve parmak izleri uygulamanın kendi dosyalarıdır (kural 12).
// - Model ilk kullanımda bir kez indirilir (~6 MB) ve cihazda kalır (sw.js, model önbelleği); sonra internetsiz çalışır.
// - Kıyas yalnızca adayları sıralar ve hangi sorunun önce sorulacağına yardım eder. Hiçbir türü elemez,
//   sonucun rengini değiştirmez (kural 3, 5). Model yüklenemezse tanımlama sorularla aynen çalışır.

import { MODEL } from './modelAyari.js';

// Bu dosyalar uygulamayla birlikte indirilmez; yalnızca kullanıcı fotoğraf kıyasını açınca bir kez iner.
// Model ve ona bağlı ayırıcılar aynı klasörde (js/modelAyari.js).
export const MODEL_DOSYALARI = ['./vendor/tf.min.js', `${MODEL.klasor}model.json`, `${MODEL.klasor}tur-ayirici.json`];
// Modelden izin okunduğu katman (null: modelin kendi çıkışı).
const calistir = (model, girdi) => (MODEL.cikis ? model.execute(girdi, MODEL.cikis) : model.execute(girdi));
const BOYUT = 224;

let modelSozu = null;
let ayiriciSozu = null;
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
    window.tf.tidy(() => calistir(model, window.tf.zeros([1, BOYUT, BOYUT, 3])));
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
  for (let i = 0; i < ikili.length; i++) iz[i] = (ikili.charCodeAt(i) / 255) ** 2;
  return birimYap(iz);
}

// Parmak izini 8 bite sıkıştırır (yalnızca yön önemli; uzunluk atılır). Karekökle sıkıştırılır: ince ayarlı modelde
// birkaç büyük değer öne çıkar, küçük değerler düz 8 bitte sıfıra yuvarlanırdı (2026-10-28).
export function izKodla(iz) {
  let enCok = 0;
  for (const d of iz) enCok = Math.max(enCok, d);
  let ikili = '';
  for (const d of iz) ikili += String.fromCharCode(enCok > 0 ? Math.round(Math.sqrt(Math.max(0, d) / enCok) * 255) : 0);
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
 * Kullanıcının fotoğraflarının izlerini tür ayırıcısından geçirir (modelin klasöründeki tur-ayirici.json).
 * Dönüş: { türId: 0–1 } — toplamı 1; fotoğraf birden fazlaysa (üst ve yan) puanları birlikte değerlendirilir.
 * Değer yalnızca sıralama ve "muhtemelen" eşiği içindir; kullanıcıya yüzde olarak gösterilmez (kural 1, 5).
 * Ayırıcı tür başına yaklaşık 100 lisanslı fotoğraftan öğrenilmiştir (scripts/tur-ayirici-egit.js).
 */
export function benzerlikleriHesapla(kullaniciIzleri, ayirici) {
  const ids = Object.keys(ayirici.turler ?? {});
  if (!ids.length || !kullaniciIzleri.length) return {};
  const puanlar = ids.map((id) => {
    const { agirlik, sapma } = ayirici.turler[id];
    let toplam = 0;
    for (const iz of kullaniciIzleri) toplam += kosinus(iz, agirlik) * ayirici.girdiOlcegi + sapma;
    return toplam / kullaniciIzleri.length;
  });
  const enCok = Math.max(...puanlar);
  const us = puanlar.map((p) => Math.exp(p - enCok));
  const toplam = us.reduce((a, b) => a + b, 0);
  return Object.fromEntries(ids.map((id, i) => [id, us[i] / toplam]));
}

// Eşikler ölçümle seçildi (2026-10-27; 34 tür, ~5.000 lisanslı fotoğraf, ayırıcının görmediği 384 fotoğraf:
// doğru tür 1. sırada %68, ilk 3'te %87). En üstteki tür 0,9'u geçince %94, 0,6'yı geçince %83, 0,3'ü geçince %72
// doğruydu. Bu yüzden "muhtemelen" yalnızca 0,9 ve üstünde denir; altında yalnızca sıralanır.
export const BELIRGIN_BENZERLIK = 0.9;
const BENZER = 0.6;

// Benzerliği okunur söze çevirir (yüzde gösterilmez: güven gibi okunmasın).
export function benzerlikSozu(deger) {
  if (deger >= BELIRGIN_BENZERLIK) return 'Fotoğrafa çok benziyor';
  if (deger >= BENZER) return 'Fotoğrafa benziyor';
  return 'Fotoğrafa az benziyor';
}

// Tür ayırıcısının 8 bitlik satırını sayılara çevirir (scripts/tur-ayirici-egit.js'in kodlamasının tersi).
export function satirCoz(metin, olcek) {
  const ikili = typeof atob === 'function' ? atob(metin) : Buffer.from(metin, 'base64').toString('binary');
  const satir = new Float32Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) {
    const bayt = ikili.charCodeAt(i);
    satir[i] = (bayt > 127 ? bayt - 256 : bayt) * olcek;
  }
  return satir;
}

export function ayiriciyiCoz(veri) {
  const turler = {};
  for (const [id, t] of Object.entries(veri.turler ?? {})) turler[id] = { agirlik: satirCoz(t.agirlik, t.olcek), sapma: t.sapma };
  return { girdiOlcegi: veri.girdiOlcegi ?? 1, turler };
}

// Şapka altı ayırıcısı (js/fotoOzellik.js): aynı biçimde, yalnızca öneri için.
export const ALT_YAPI_DOSYASI = `${MODEL.klasor}alt-yapi.json`;
let altYapiSozu = null;
export function altYapiAyiricisiniYukle() {
  altYapiSozu ??= fetch(ALT_YAPI_DOSYASI)
    .then((y) => y.json())
    .then(ayiriciyiCoz)
    .catch(() => {
      altYapiSozu = null;
      return { turler: {} };
    });
  return altYapiSozu;
}

// Şapka rengi ayırıcısı (js/fotoOzellik.js): aynı biçimde, yalnızca öneri için.
export const SAPKA_RENGI_DOSYASI = `${MODEL.klasor}sapka-rengi.json`;
let sapkaRengiSozu = null;
export function sapkaRengiAyiricisiniYukle() {
  sapkaRengiSozu ??= fetch(SAPKA_RENGI_DOSYASI)
    .then((y) => y.json())
    .then(ayiriciyiCoz)
    .catch(() => {
      sapkaRengiSozu = null;
      return { turler: {} };
    });
  return sapkaRengiSozu;
}

export function ayiriciyiYukle() {
  ayiriciSozu ??= fetch(MODEL_DOSYALARI[2])
    .then((y) => y.json())
    .then(ayiriciyiCoz)
    .catch(() => {
      ayiriciSozu = null;
      return { turler: {} };
    });
  return ayiriciSozu;
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
    return calistir(model, girdi).reshape([-1]);
  });
  const iz = await cikti.data();
  cikti.dispose();
  return birimYap(Float32Array.from(iz));
}
