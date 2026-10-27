// Hızlı tanımlama (Metin'in isteği, 2026-10-26): 15 sorunun hepsi yerine, kalan adayları birbirinden
// ayıran soru sorulur. Kural tablosu aynıdır (js/sorular.js, veri/turler.json); yalnızca sıra ve hangi
// soruların gerekli olduğu değişir. Yapay zeka gerekmez; fotoğraf kıyası varsa yalnızca ağırlık verir.
//
// Güvenlik:
// - Güvenlik soruları (ZORUNLU_SORULAR ve üç fotoğraf) her zaman sorulur (kural 4, 5, 6).
// - Genç mantarın kesiti, genç denince hemen sorulur (kural 13).
// - Zehirli veya ölümcül bir aday elenebilecekken soru sormayı bırakmayız (kural 3).
// - "Zehirli mi" sonucu artık değişmeyecekse (yalnızca yenen türler ayrılabiliyorsa) durulur (Metin'in kararı).
// - Fotoğraf benzerliği hiçbir türü elemez; yalnızca hangi sorunun önce sorulacağını etkiler.
import { BILMIYORUM, ZORUNLU_SORULAR } from './kurallar.js';
import { ADIMLAR, aktifAdimlar, sonCevaplar } from './sorular.js';
import { adaylariBul } from './anahtar.js';

// Saatler süren adımlar hızlı akışta sorulmaz (sonuçta uzmana yardımcı olacağı söylenir).
export const HIZLI_AKISTA_YOK = Object.freeze(['sporIzi']);

// Mutlaka sorulan adımlar: güvenlik soruları ve fotoğraf istenen zorunlu adımlar.
function zorunluMu(adim) {
  return ZORUNLU_SORULAR.includes(adim.soru) || adim.soru === 'kesitteTaslak' || adim.soru === 'altYapi' || adim.soru === 'halka';
}

// Zehirli veya zehirliliği bilinmeyen tür (kural 3).
const tehlikeli = (tur) => tur?.zehirlilik !== 'yenen';

// Türün bu soruya verebileceği cevaplar. Alan yoksa her cevap olabilir (elenemez).
function izinliler(tur, soru) {
  const liste = tur.ozellikler?.[soru];
  return Array.isArray(liste) && liste.length ? liste : null;
}

// Türlerin ağırlığı: fotoğraf kıyası (tür ayırıcısının 0–1 puanı, toplamı 1) varsa öne çıkar;
// tehlikeli türler her zaman ağır basar (fotoğrafa hiç benzemese de).
export function agirliklar(adaylar, benzerlikler = {}) {
  const sonuc = new Map();
  for (const tur of adaylar) {
    const b = benzerlikler[tur.id];
    const foto = typeof b === 'number' ? Math.min(1, Math.max(0.02, b)) : 0.3;
    sonuc.set(tur.id, foto + (tehlikeli(tur) ? 0.5 : 0));
  }
  return sonuc;
}

/**
 * Bir adımın faydası: cevap verildiğinde beklenen elenen ağırlık (0 = hiçbir türü ayırmıyor).
 * Her türün cevapları eşit olasılıklı sayılır.
 */
export function adimFaydasi(adim, adaylar, agirlik) {
  const degerler = adim.secenekler.map(([d]) => d).filter((d) => d !== 'diger' && d !== 'yapilmadi');
  // Çoklu seçimli sorular da hesaplanır (tek seçim gibi; çoğu kişi bir şey seçer). Eskiden 0 sayılıyordu ve
  // hiç sorulmuyordu (ör. şapka rengi, çevredeki ağaçlar). Çoklu cevap eleme gücünü yalnızca azaltır (kural 3).
  let toplam = 0;
  const olasilik = new Map(degerler.map((d) => [d, 0]));
  for (const tur of adaylar) {
    const w = agirlik.get(tur.id) ?? 0;
    toplam += w;
    const izin = izinliler(tur, adim.soru);
    const uygun = izin ? degerler.filter((d) => izin.includes(d)) : degerler;
    for (const d of uygun) olasilik.set(d, olasilik.get(d) + w / uygun.length);
  }
  if (toplam === 0) return 0;
  let beklenenElenen = 0;
  for (const [deger, p] of olasilik) {
    if (p === 0) continue;
    const elenen = adaylar.reduce((s, tur) => {
      const izin = izinliler(tur, adim.soru);
      return s + (izin && !izin.includes(deger) ? agirlik.get(tur.id) ?? 0 : 0);
    }, 0);
    beklenenElenen += (p / toplam) * elenen;
  }
  return beklenenElenen / toplam;
}

/**
 * Bu soru sonucun rengini ("zehirli mi?") değiştirebilir mi? (Metin'in kararı, 2026-10-26: "zehirli mi"
 * cevabı artık değişmeyecekse soru sorulmaz; yalnızca yenen türleri birbirinden ayıran sorular atlanır.)
 * - Tehlikeli aday varken: en az bir tehlikeli adayı eleyebilen soru sorulur (hepsi elenirse kırmızıdan çıkılabilir).
 * - Tehlikeli aday yokken: ancak uzman onaylı türler kalabilecekse (sarı olabilir) sorulur; taslak veride bu olmaz.
 * Güvenlik soruları (zorunlu adımlar) bundan bağımsız olarak her zaman sorulur.
 */
export function renkDegistirebilirMi(adim, adaylar) {
  const degerler = adim.secenekler.map(([d]) => d).filter((d) => d !== 'diger' && d !== 'yapilmadi');
  const eleyebilir = (tur) => {
    const izin = izinliler(tur, adim.soru);
    return Boolean(izin) && degerler.some((d) => !izin.includes(d));
  };
  if (adaylar.some(tehlikeli)) return adaylar.some((tur) => tehlikeli(tur) && eleyebilir(tur));
  return adaylar.some((tur) => tur.mikologOnayi === true) && adaylar.some((tur) => tur.mikologOnayi !== true && eleyebilir(tur));
}

// Kıyas kartlarında ayıran kontrolün kısa adı (adım başlıkları fotoğraf adı olabildiği için).
const KISA_ADLAR = {
  sapkaRengi: 'şapka rengi',
  sapkaYuzeyi: 'şapkanın üstü',
  genc: 'genç mantar',
  kesitteTaslak: 'kesitte taslak',
  kucukKahverengi: 'boyut',
  altYapi: 'şapkanın altı',
  solungacRengi: 'solungaç rengi',
  halka: 'ayaktaki halka',
  volva: 'ayak dibindeki torba',
  kesinceRenk: 'kesince renk değişimi',
  sut: 'süt (sıvı) rengi',
  ezince: 'ezince renk değişimi',
  koku: 'koku',
  zemin: 'büyüdüğü yer',
  agac: 'çevredeki ağaçlar',
};
export const kisaAd = (adim) => KISA_ADLAR[adim.soru] ?? adim.baslik.toLocaleLowerCase('tr');

// Bir adım, bir yenen türü bir tehlikeli türden ayırabiliyor mu? (zehirli benzerle kıyas için)
export function ayiranAdimlar(tur, benzer) {
  return ADIMLAR.filter((adim) => {
    if (HIZLI_AKISTA_YOK.includes(adim.soru)) return false;
    const a = izinliler(tur, adim.soru);
    const b = izinliler(benzer, adim.soru);
    return Boolean(a && b && (a.some((d) => !b.includes(d)) || b.some((d) => !a.includes(d))));
  });
}

// Fotoğrafın güçlü tahmini (ayırıcı puanı ≥ 0,5) olan yenen tür; ikizleri = verideki zehirli benzerlerinden hâlâ aday olanlar.
// Seçilen kontrol: tahmin doğruysa (cevap o türünkiyse) en çok ikizi eleyen. Hiçbir türü elemez; yalnızca sırayı belirler.
export const GUCLU_TAHMIN = 0.5;
function ikizAyiranAdim(turler, adaylar, bekleyenler, benzerlikler) {
  const tahmin = adaylar
    .filter((t) => t.zehirlilik === 'yenen' && (benzerlikler[t.id] ?? 0) >= GUCLU_TAHMIN)
    .sort((a, b) => benzerlikler[b.id] - benzerlikler[a.id])[0];
  if (!tahmin) return null;
  const adlar = new Set((tahmin.zehirliBenzerler ?? []).map((b) => b.ad));
  const ikizler = adaylar.filter((t) => adlar.has(t.ad));
  if (!ikizler.length) return null;
  let enIyi = null;
  for (const adim of bekleyenler) {
    if (adim.coklu || adim.sure >= 60) continue;
    const kendi = izinliler(tahmin, adim.soru);
    if (!kendi) continue;
    const elenen = ikizler.filter((t) => {
      const izin = izinliler(t, adim.soru);
      return izin && !kendi.some((d) => izin.includes(d));
    }).length;
    if (elenen > (enIyi?.elenen ?? 0)) enIyi = { adim, elenen };
  }
  return enIyi?.adim ?? null;
}

/**
 * Sıradaki adım. Dönüş: { adim, neden } ya da tüm gerekli adımlar bittiyse null.
 * cevaplar: şimdiye kadarki cevaplar; sorulanlar: sorulmuş adımların soru adları.
 * benzerlikler: { türId: 0–1 } (fotoğraf kıyası; yoksa boş).
 */
export function siradakiAdim(turler, cevaplar, sorulanlar, benzerlikler = {}) {
  const sorulan = new Set(sorulanlar);
  const adaylar = adaylariBul(turler, sonCevaplar(cevaplar));
  const agirlik = agirliklar(adaylar, benzerlikler);
  const bekleyenler = aktifAdimlar(cevaplar).filter((a) => !sorulan.has(a.soru) && !HIZLI_AKISTA_YOK.includes(a.soru));
  if (bekleyenler.length === 0) return null;

  // Kural 13: genç denince kesit hemen sorulur.
  const kesit = bekleyenler.find((a) => a.soru === 'kesitteTaslak');
  if (kesit) return { adim: kesit, neden: 'guvenlik' };

  // Uzman gibi (Metin'in isteği, 2026-10-27): fotoğraf bir yenen türü güçlü tahmin ediyorsa önce o türü zehirli
  // ikizlerinden en çok ayıran kontrol sorulur (kanlıcada süt rengi: turuncu-kırmızı ise beyaz sütlü benzerlerin hepsi düşer).
  const ikiz = ikizAyiranAdim(turler, adaylar, bekleyenler, benzerlikler);
  if (ikiz) return { adim: ikiz, neden: 'ayirt' };

  // Güvenlik soruları yalnızca kalan adaylarda zehirli/ölümcül bir tür varken (ya da hiçbiriyle eşleşmediyken) sorulur
  // (Metin'in kararı, 2026-10-27: "hangi türe göre ne gerekiyorsa o çıksın"; js/kurallar.js degerlendir ile aynı ölçü).
  const guvenlikGerekli = adaylar.length === 0 || adaylar.some(tehlikeli);

  // Alttan bakınca solungaç rengi hemen sorulur (aynı fotoğraf).
  const solungac = bekleyenler.find((a) => a.soru === 'solungacRengi');
  if (guvenlikGerekli && solungac && sorulan.has('altYapi')) return { adim: solungac, neden: 'guvenlik' };

  // Yalnızca "zehirli mi" sonucunu değiştirebilecek sorular. Uzun beklemeli adımlar (ör. kesince 5 dakika) eşit faydada sona kalır.
  const puanli = bekleyenler
    .filter((adim) => renkDegistirebilirMi(adim, adaylar))
    .map((adim) => ({ adim, fayda: adimFaydasi(adim, adaylar, agirlik) / (adim.sure >= 60 ? 1.5 : 1) }));
  // En çok ayıran adım önce. Eşitlikte tablo sırası (doğal çalışma sırası) korunur.
  const ayiran = puanli.filter((p) => p.fayda > 0.001).sort((a, b) => b.fayda - a.fayda)[0];
  if (ayiran) return { adim: ayiran.adim, neden: 'ayirt', fayda: ayiran.fayda };

  // Kimseyi ayırmayan ama güvenlik için gereken adımlar (yalnızca tehlikeli bir aday kaldıkça).
  if (!guvenlikGerekli) return null;
  const zorunlu = bekleyenler.find(zorunluMu);
  if (zorunlu) return { adim: zorunlu, neden: 'guvenlik' };
  return null;
}

/**
 * Tek sayfalık kontrol listesi (Metin'in isteği, 2026-10-27: "sayfa sayfa sormak sıkıcı; uzman nasıl bakıyorsa öyle"):
 * şu anki cevaplara göre daha yapılması gereken bütün kontroller, yapılacakları sırayla. siradakiAdim ile aynı kurallar
 * (güvenlik soruları hep var, zehirli aday elenebilecekken liste bitmez); cevap geldikçe yeniden hesaplanır.
 * Dönüş: [{ adim, neden }]
 */
export function kontrolListesi(turler, cevaplar, sorulanlar, benzerlikler = {}) {
  const liste = [];
  const atlanan = [...sorulanlar];
  for (let i = 0; i < ADIMLAR.length; i++) {
    const sonraki = siradakiAdim(turler, cevaplar, atlanan, benzerlikler);
    if (!sonraki) break;
    liste.push(sonraki);
    atlanan.push(sonraki.adim.soru);
  }
  return liste;
}
