// Güvenlik kuralları: CLAUDE.md'deki 1–14 numaralı kuralların tek yeri.
// Her kuralın testi test/kurallar.test.js içindedir. Testleri silme, atlama veya gevşetme.

export const BILMIYORUM = 'bilmiyorum';

// Kural 2: yalnızca üç etiket vardır. Yeşil etiket yoktur.
export const ETIKETLER = Object.freeze({
  kirmizi: Object.freeze({
    renk: 'kirmizi',
    oncelik: 3,
    baslik: 'Zehirli veya ölümcül olabilir',
    mesaj: 'Toplamayın, yemeyin.',
  }),
  turuncu: Object.freeze({
    renk: 'turuncu',
    oncelik: 2,
    baslik: 'Tanımlanamadı',
    mesaj: 'Yemeyin.',
  }),
  sari: Object.freeze({
    renk: 'sari',
    oncelik: 1,
    baslik: 'Muhtemelen yenen bir tür',
    mesaj: 'Uzman onayı olmadan yemeyin.',
  }),
});

export const OLUMCUL_MESAJ = 'Ölümcül olabilir, dokunmayın.';
export const TOPLAMAYIN_MESAJ = 'Toplamayın.';

// Kural 6: üç fotoğraf olmadan sonuç verilmez.
export const GEREKLI_FOTOGRAFLAR = Object.freeze(['ust', 'alt', 'yan']);

// Kural 5: fotoğraf modelinin güven skoru bu eşiğin altındaysa sonuç turuncudur.
export const GUVEN_ESIGI = 0.9;

// Her tanımlamada cevaplanması gereken sorular. Cevapsız soru "bilmiyorum" sayılır.
export const ZORUNLU_SORULAR = Object.freeze([
  'solungacRengi',
  'halka',
  'volva',
  'genc',
  'kucukKahverengi',
]);

// Kural 10: her tarifte bu uyarı yer alır.
export const ILK_KEZ_UYARISI =
  'İlk kez yiyorsan çok az miktar dene ve mantardan bir örneği yemeden sakla.';

// Kural 1: uzmana gönderilen veya doktora gösterilen her özette yer alır.
export const OZET_UYARISI =
  'Bu özet bir uygulamanın tahminidir. Uygulama bir mantarın yenip yenmeyeceğine karar vermez; lütfen mantarı kendiniz değerlendirin.';

// Kural 12: toplama yerleri varsayılan olarak cihazda kalır.
export const KONUM_VARSAYILAN = Object.freeze({ paylas: false });

// Kural 1: arayüz metinlerinde geçmemesi gereken ifadeler (tam kelime olarak).
export const YASAK_IFADELER = Object.freeze([
  'güvenli',
  'güvenlidir',
  'güvenle',
  'yenebilir',
  'yenilebilir',
  'sorun yok',
  'zararsız',
]);

export function yasakIfadeler(metin) {
  const kucuk = String(metin).toLocaleLowerCase('tr');
  return YASAK_IFADELER.filter((ifade) =>
    new RegExp(`(?<!\\p{L})${ifade}(?!\\p{L})`, 'u').test(kucuk),
  );
}

// Cevap bu değer olabilir mi? "Bilmiyorum" veya cevapsız, her şey olabilir demektir.
function olabilir(cevap, deger) {
  return cevap === deger || cevap === BILMIYORUM || cevap == null;
}

// Kural 3: zehirlilik alanı "yenen" değilse (boş veya bilinmiyor dahil) zehirli say.
function zehirliSayilirMi(tur) {
  return tur?.zehirlilik !== 'yenen';
}

/**
 * Bir tanımlamanın sonucunu etiketler. Sonuç her zaman tetiklenen en tehlikeli etikettir.
 *
 * girdi.fotograflar: çekilen fotoğraf türleri, ör. ['ust', 'alt', 'yan']
 * girdi.cevaplar:    { solungacRengi, halka, volva, genc, kesitteTaslak, kucukKahverengi, ... }
 *                    Değerler 'evet' / 'hayir' / renk adı / 'bilmiyorum'.
 * girdi.adaylar:     soru-cevap anahtarından kalan türler: [{ ad, zehirlilik, mikologOnayi }]
 * girdi.guvenSkoru:  fotoğraf modeli varsa 0–1 arası skor (isteğe bağlı)
 */
export function degerlendir(girdi = {}) {
  const fotograflar = girdi.fotograflar ?? [];
  const cevaplar = girdi.cevaplar ?? {};
  const adaylar = girdi.adaylar ?? [];
  const bulgular = [];
  const ekle = (renk, gerekce, mesaj) => bulgular.push({ renk, gerekce, mesaj });

  // Kural 4 (Amanita): beyaz solungaç + halka veya volva. En az bir işaret görülmüşse
  // ve diğerleri de olabilirse (bilinmiyorsa), kural 3 gereği en kötüsü varsayılır.
  const beyazSolungac = cevaplar.solungacRengi === 'beyaz';
  const halkaVeyaVolva = cevaplar.halka === 'evet' || cevaplar.volva === 'evet';
  if (
    (beyazSolungac && (olabilir(cevaplar.halka, 'evet') || olabilir(cevaplar.volva, 'evet'))) ||
    (halkaVeyaVolva && olabilir(cevaplar.solungacRengi, 'beyaz'))
  ) {
    ekle('kirmizi', 'Beyaz solungaçla birlikte halka veya volva (torba) olabilir.', OLUMCUL_MESAJ);
  }

  // Kural 4: küçük kahverengi mantarlar toplanmaz.
  if (cevaplar.kucukKahverengi === 'evet') {
    ekle('kirmizi', 'Küçük kahverengi mantarlar birbirine çok benzer.', TOPLAMAYIN_MESAJ);
  }

  // Kural 13 (genç mantar): kesitte içeride taslak varsa ölümcül olabilir.
  if (cevaplar.genc === 'evet') {
    if (cevaplar.kesitteTaslak === 'evet') {
      ekle('kirmizi', 'Genç mantarın kesitinde içeride mantar taslağı görüldü.', OLUMCUL_MESAJ);
    } else if (cevaplar.kesitteTaslak !== 'hayir') {
      ekle('turuncu', 'Genç mantar ikiye kesilip içi kontrol edilmedi.');
    }
  }

  // Kural 6: üç fotoğraf.
  const eksikFotograflar = GEREKLI_FOTOGRAFLAR.filter((f) => !fotograflar.includes(f));
  if (eksikFotograflar.length > 0) {
    ekle('turuncu', 'En az üç fotoğraf gerekir: üstten, alttan ve yandan/ayak dibinden.');
  }

  // Kural 5: "bilmiyorum" veya cevapsız soru.
  const bilinmeyenler = Object.keys(cevaplar).filter((s) => cevaplar[s] === BILMIYORUM);
  const cevapsizlar = ZORUNLU_SORULAR.filter((s) => cevaplar[s] == null);
  if (bilinmeyenler.length > 0 || cevapsizlar.length > 0) {
    ekle('turuncu', 'Bazı sorular "bilmiyorum" diye cevaplandı veya cevapsız kaldı.');
  }

  // Kural 5: düşük güven skoru. Sayı olmayan bir skor da düşük sayılır.
  if (girdi.guvenSkoru !== undefined && !(girdi.guvenSkoru >= GUVEN_ESIGI)) {
    ekle('turuncu', 'Fotoğraf tanıma sonucu yeterince güvenilir değil.');
  }

  // Kural 3: kalan adaylardan biri zehirliyse (veya zehirliliği bilinmiyorsa) kırmızı.
  if (adaylar.length === 0) {
    ekle('turuncu', 'Uygulamadaki türlerden hiçbiriyle eşleşmedi.');
  }
  for (const tur of adaylar) {
    if (zehirliSayilirMi(tur)) {
      ekle('kirmizi', `Olası türlerden biri zehirli veya bilinmiyor: ${tur?.ad ?? 'adsız tür'}.`);
    } else if (tur.mikologOnayi !== true) {
      ekle('turuncu', `Tür bilgisi henüz uzman onaylı değil: ${tur.ad}.`);
    }
  }

  if (bulgular.length === 0) {
    ekle('sari', 'Kalan olasılıkların hepsi uzman onaylı, yenen türler.');
  }

  bulgular.sort((a, b) => ETIKETLER[b.renk].oncelik - ETIKETLER[a.renk].oncelik);
  const enKotu = bulgular[0];
  const etiket = ETIKETLER[enKotu.renk];
  return {
    renk: etiket.renk,
    baslik: etiket.baslik,
    mesaj: enKotu.mesaj ?? etiket.mesaj,
    gerekceler: bulgular.map((b) => b.gerekce),
  };
}

// Kural 7: tarifler yalnızca onaylı, yenen bir türde ve kullanıcı "uzman onayladı"yı işaretlediyse açılır.
export function tarifAcikMi(tur, uzmanOnayladi) {
  return !zehirliSayilirMi(tur) && tur.mikologOnayi === true && uzmanOnayladi === true;
}

// Kural 8: yenen her türün sayfasında zehirli benzerler ve ayırt edici farklar bulunur.
export function turSayfasiHatalari(tur) {
  if (zehirliSayilirMi(tur)) return [];
  const benzerler = tur.zehirliBenzerler ?? [];
  if (benzerler.length === 0) return ['Yenen türün zehirli benzeri listelenmemiş.'];
  return benzerler
    .filter((b) => !b.ad || !b.fark)
    .map((b) => `Zehirli benzerin adı veya ayırt edici farkı eksik: ${b.ad ?? 'adsız'}.`);
}

// Kural 10: pişirme kuralı zorunlu alandır.
export function tarifHatalari(tarif) {
  const kural = typeof tarif?.pisirmeKurali === 'string' ? tarif.pisirmeKurali.trim() : '';
  return kural ? [] : ['Tarifte pişirme kuralı yok.'];
}

// Kural 10: her tarifte gösterilecek uyarılar.
export function tarifUyarilari(tarif) {
  return [tarif.pisirmeKurali, ILK_KEZ_UYARISI];
}

// Kural 11: eğitim bitip feragat onaylanmadan tanımlama ekranı açılmaz.
export function tanimlamaAcilabilirMi(durum) {
  return durum?.egitimTamam === true && durum?.feragatOnay === true;
}

// Kural 11: eğitim, bütün sorular doğru cevaplanıp feragatin her maddesi işaretlenince biter.
export function egitimTamamlanabilirMi(sorular, cevaplar, feragatMaddeleri, isaretler) {
  const sorularDogru = sorular.every((s, i) => s.secenekler[cevaplar?.[i]]?.dogru === true);
  const feragatTamam = feragatMaddeleri.every((_, i) => isaretler?.[i] === true);
  return sorular.length > 0 && feragatMaddeleri.length > 0 && sorularDogru && feragatTamam;
}
