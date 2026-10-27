// Hızlı tanımlama testleri: sıradaki soru seçimi, güvenlik soruları, fotoğraf kıyası ve sesli komutlar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GEREKLI_FOTOGRAFLAR, ZORUNLU_SORULAR, degerlendir, yasakIfadeler } from '../js/kurallar.js';
import { ADIMLAR, aktifAdimlar, sonCevaplar } from '../js/sorular.js';
import { adaylariBul } from '../js/anahtar.js';
import { HIZLI_AKISTA_YOK, adimFaydasi, agirliklar, ayiranAdimlar, kontrolListesi, renkDegistirebilirMi, siradakiAdim } from '../js/siradaki.js';
import { ayiriciyiCoz, benzerlikSozu, benzerlikleriHesapla, birimYap, izCoz, izKodla, kosinus, MODEL_DOSYALARI, satirCoz } from '../js/fotoTanima.js';
import { komutuAnla, sadele } from '../js/sesliKomut.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (dosya) => readFileSync(path.join(KOK, dosya), 'utf8');
const turler = JSON.parse(oku('veri/turler.json')).turler;

// Gerçek türün özelliklerinden ilk cevabı veren kullanıcıyla hızlı akışı baştan sona yürütür.
function hizliAkis(gercek, { benzerlikler = {}, cevapSec } = {}) {
  const cevaplar = {};
  const sorulanlar = [];
  for (let i = 0; i < ADIMLAR.length + 2; i++) {
    const s = siradakiAdim(turler, cevaplar, sorulanlar, benzerlikler);
    if (!s) break;
    const adim = s.adim;
    sorulanlar.push(adim.soru);
    let cevap = cevapSec?.(adim) ?? gercek.ozellikler?.[adim.soru]?.[0] ?? (adim.secenekler.some(([d]) => d === 'hayir') ? 'hayir' : adim.secenekler[0][0]);
    if (adim.coklu && !Array.isArray(cevap)) cevap = [cevap];
    cevaplar[adim.soru] = cevap;
  }
  return { cevaplar, sorulanlar };
}

// Metin'in kararı (2026-10-27): güvenlik soruları zehirli/ölümcül bir aday kaldıkça sorulur; yalnızca yenen türler
// kaldıysa sorulmaz. Akış bittiğinde ya güvenlik soruları sorulmuştur ya da kalan adayların hepsi yenendir.
test('hızlı akış: zehirli bir aday kaldıkça güvenlik soruları sorulur; ölümcül ve zehirli türlerde hepsi sorulur (kural 4, 5, 6)', () => {
  for (const gercek of turler) {
    const { sorulanlar, cevaplar } = hizliAkis(gercek);
    const kalan = adaylariBul(turler, sonCevaplar(cevaplar));
    const hepsiYenen = kalan.length > 0 && kalan.every((t) => t.zehirlilik === 'yenen');
    if (gercek.zehirlilik !== 'yenen') assert.ok(!hepsiYenen, `${gercek.id}: zehirli tür elendi`);
    for (const soru of [...ZORUNLU_SORULAR, 'altYapi', 'halka']) {
      if (soru === 'solungacRengi' && cevaplar.altYapi !== 'solungac') continue;
      if (hepsiYenen) continue;
      assert.ok(sorulanlar.includes(soru), `${gercek.id}: ${soru} sorulmadı`);
    }
    if (hepsiYenen) continue;
    // Üç zorunlu fotoğrafın adımları sorulur (üst fotoğraf akışın başında çekilir).
    for (const foto of GEREKLI_FOTOGRAFLAR.filter((f) => f !== 'ust')) {
      assert.ok(ADIMLAR.some((a) => a.fotograf === foto && sorulanlar.includes(a.soru)), `${gercek.id}: ${foto} fotoğrafı istenmedi`);
    }
  }
});

test('hızlı akış: eski akıştan daha az soru sorar', () => {
  const toplam = turler.reduce((s, t) => s + hizliAkis(t).sorulanlar.length, 0);
  assert.ok(toplam / turler.length < ADIMLAR.length - 2, `ortalama ${toplam / turler.length}`);
});

test('çoklu seçimli sorular (şapka rengi, çevre) da ayırabiliyorsa sorulur', () => {
  // Test türleri uydurmadır: yalnızca çevredeki ağaçlarla ayrılırlar.
  const ikiTur = [
    { id: 'a', ad: 'A', zehirlilik: 'olumcul', ozellikler: { agac: ['igne'] } },
    { id: 'b', ad: 'B', zehirlilik: 'yenen', ozellikler: { agac: ['yaprakli'] } },
  ];
  const sorulan = ADIMLAR.map((a) => a.soru).filter((s) => s !== 'agac');
  assert.equal(siradakiAdim(ikiTur, {}, sorulan)?.adim.soru, 'agac');
});

test('Kural 3: şapkada iki renk seçilince türlerden birine uyan aday kalır (ör. beyaz üstünde kahverengi)', () => {
  const ikiTur = [
    { id: 'a', ad: 'Ölümcül test', zehirlilik: 'olumcul', ozellikler: { sapkaRengi: ['beyaz'] } },
    { id: 'b', ad: 'Yenen test', zehirlilik: 'yenen', ozellikler: { sapkaRengi: ['kahverengi'] } },
  ];
  assert.equal(adaylariBul(ikiTur, { sapkaRengi: ['beyaz', 'kahverengi'] }).length, 2);
  assert.equal(adaylariBul(ikiTur, { sapkaRengi: ['kahverengi'] }).length, 1);
});

test('şapka yüzeyi: tür verisi geçerli, benekli Amanitalar "düz" cevapta da elenmez (yağmur silebilir)', () => {
  const izinli = new Set(ADIMLAR.find((a) => a.soru === 'sapkaYuzeyi').secenekler.map(([d]) => d));
  for (const tur of turler) for (const d of tur.ozellikler?.sapkaYuzeyi ?? []) assert.ok(izinli.has(d), `${tur.id}: ${d}`);
  for (const id of ['panter', 'sinek', 'koygocuren', 'ak-koygocuren']) {
    const tur = turler.find((t) => t.id === id);
    assert.equal(adaylariBul([tur], { sapkaYuzeyi: 'duz' }).length, 1, id);
  }
});

test('Kural 13: hızlı akışta "genç" denince kesit hemen sorulur', () => {
  const s = siradakiAdim(turler, { genc: 'evet' }, ['genc']);
  assert.equal(s.adim.soru, 'kesitteTaslak');
});

// Metin'in kararı (2026-10-26): "zehirli mi" cevabı değişmeyecekse durulur. Bu test eskiden her adayı
// (yenen dahil) eleyebilen soru kaldıkça devam edilmesini istiyordu; şimdi tehlikeli adayları eleyebilen
// (sonucun rengini değiştirebilecek) soru kaldıkça devam edilmesini ister. Güvenlik açısından aynı korumadır.
test('Kural 3: hızlı akış, tehlikeli bir aday elenebilecekken (sonuç değişebilecekken) soru sormayı bırakmaz', () => {
  for (const gercek of turler) {
    const { cevaplar, sorulanlar } = hizliAkis(gercek);
    const kalan = adaylariBul(turler, sonCevaplar(cevaplar));
    const agirlik = agirliklar(kalan);
    for (const adim of aktifAdimlar(cevaplar)) {
      if (sorulanlar.includes(adim.soru) || HIZLI_AKISTA_YOK.includes(adim.soru)) continue;
      const hala = renkDegistirebilirMi(adim, kalan) && adimFaydasi(adim, kalan, agirlik) > 0.001;
      assert.ok(!hala, `${gercek.id}: ${adim.soru} hâlâ tehlikeli bir adayı eleyebilirdi`);
    }
  }
});

test('"zehirli mi" cevabı değişmeyecekse durulur: yalnızca taslak yenen türler kaldıysa onları ayıran soru sorulmaz', () => {
  // Test türleri uydurmadır.
  const yenenler = [
    { id: 'a', ad: 'A', zehirlilik: 'yenen', mikologOnayi: false, ozellikler: { sapkaRengi: ['beyaz'] } },
    { id: 'b', ad: 'B', zehirlilik: 'yenen', mikologOnayi: false, ozellikler: { sapkaRengi: ['kahverengi'] } },
  ];
  const sapka = ADIMLAR.find((a) => a.soru === 'sapkaRengi');
  assert.equal(renkDegistirebilirMi(sapka, yenenler), false);
  // Biri zehirli olsaydı aynı soru sorulurdu.
  const biriZehirli = [{ ...yenenler[0], zehirlilik: 'olumcul' }, yenenler[1]];
  assert.equal(renkDegistirebilirMi(sapka, biriZehirli), true);
  // Metin'in kararı (2026-10-27): yalnızca yenen türler kaldıysa güvenlik soruları da sorulmaz (ör. turuncu süt
  // akınca torbalı ölümcül türler zaten elenmiştir; uzmanlar süt mantarında torbaya bakmaz). Zehirli biri kalsaydı sorulurdu.
  assert.equal(siradakiAdim(yenenler, {}, []), null);
  const s = siradakiAdim(biriZehirli, { sapkaRengi: ['beyaz'] }, ['sapkaRengi']);
  assert.ok(s && s.neden === 'guvenlik', 'zehirli aday kaldıkça zorunlu adımlar sorulmalı');
  // Hiçbir türle eşleşmediyse de sorulur (Amanita işaretleri sonucu kırmızıya çevirebilir).
  assert.ok(siradakiAdim([], {}, [])?.neden === 'guvenlik');
});

test('Kural 2, 3 ve 4: hızlı akışın sonucu da aynı kurallardan geçer; ölümcül türler kırmızı, hiçbir sonuç yeşil değil', () => {
  for (const gercek of turler) {
    const { cevaplar } = hizliAkis(gercek);
    const son = sonCevaplar(cevaplar);
    const sonuc = degerlendir({ fotograflar: [...GEREKLI_FOTOGRAFLAR], cevaplar: son, adaylar: adaylariBul(turler, son) });
    assert.ok(['kirmizi', 'turuncu', 'sari'].includes(sonuc.renk));
    if (gercek.zehirlilik !== 'yenen') assert.equal(sonuc.renk, 'kirmizi', gercek.id);
    // Taslak (onaysız) veriyle sarı olamaz.
    assert.notEqual(sonuc.renk, 'sari', gercek.id);
  }
});

test('Kural 3: fotoğraf benzerliği hiçbir türü elemez; ölümcül tür fotoğrafa hiç benzemese de aday kalır', () => {
  const koygocuren = turler.find((t) => t.id === 'koygocuren');
  const cayir = turler.find((t) => t.id === 'cayir');
  const benzerlikler = Object.fromEntries(turler.map((t) => [t.id, t.id === 'cayir' ? 1 : 0]));
  const { cevaplar } = hizliAkis(cayir, { benzerlikler, cevapSec: (a) => koygocuren.ozellikler?.[a.soru]?.[0] });
  const kalan = adaylariBul(turler, sonCevaplar(cevaplar));
  assert.ok(kalan.some((t) => t.id === 'koygocuren'));
});

test('kural 8: yenen tür ile zehirli benzeri arasında ayıran bir kontrol bulunur (veride varsa)', () => {
  const adla = new Map(turler.map((t) => [t.ad, t]));
  let bulunan = 0;
  for (const tur of turler.filter((t) => t.zehirlilik === 'yenen')) {
    for (const b of tur.zehirliBenzerler ?? []) {
      const benzer = adla.get(b.ad);
      if (benzer && ayiranAdimlar(tur, benzer).length) bulunan += 1;
    }
  }
  assert.ok(bulunan > 0);
});

test('süreli kontroller: süre ve okunacak metin birlikte tanımlı', () => {
  for (const adim of ADIMLAR.filter((a) => a.sure)) {
    assert.ok(adim.sure > 0 && typeof adim.sureMetni === 'string' && adim.sureMetni.length > 10, adim.soru);
    assert.deepEqual(yasakIfadeler(adim.sureMetni), []);
  }
  assert.ok(ADIMLAR.find((a) => a.soru === 'sut').sure);
});

test('fotoğraf kıyası: parmak izi 8 bite sıkıştırılıp açılınca yönü korunur', () => {
  const iz = birimYap(Float32Array.from({ length: 1280 }, (_, i) => Math.abs(Math.sin(i * 1.7))));
  const geri = izCoz(izKodla(iz));
  assert.ok(kosinus(iz, geri) > 0.999);
});

test('fotoğraf kıyası: ayırıcı fotoğrafa uyan türü öne koyar, puanların toplamı 1; yüzde olarak yazılmaz (kural 1, 5)', () => {
  const a = birimYap(Float32Array.from([1, 0, 0]));
  const ayirici = { girdiOlcegi: 10, turler: { x: { agirlik: Float32Array.from([1, 0, 0]), sapma: 0 }, y: { agirlik: Float32Array.from([0, 1, 0]), sapma: 0 } } };
  const sonuc = benzerlikleriHesapla([a], ayirici);
  assert.ok(sonuc.x > 0.99 && sonuc.y < 0.01);
  assert.ok(Math.abs(sonuc.x + sonuc.y - 1) < 1e-9);
  assert.deepEqual(benzerlikleriHesapla([], ayirici), {});
  for (const d of [0, 0.3, 0.5, 0.7, 0.9, 1]) {
    const soz = benzerlikSozu(d);
    assert.doesNotMatch(soz, /%|yüzde|kesin/i);
    assert.deepEqual(yasakIfadeler(soz), []);
  }
});

test('fotoğraf kıyası: ayırıcı dosyası 8 bitten doğru açılır', () => {
  const satir = Int8Array.from([127, -128, 0, 5]);
  const geri = satirCoz(Buffer.from(satir.buffer).toString('base64'), 0.5);
  assert.deepEqual(Array.from(geri), [63.5, -64, 0, 2.5]);
});

test('fotoğraf kıyası: her tür ayırıcıda var; model uygulamayla birlikte indirilmez (az veri)', () => {
  const ayirici = ayiriciyiCoz(JSON.parse(oku(MODEL_DOSYALARI[2])));
  for (const tur of turler.filter((t) => t.fotograf)) assert.equal(ayirici.turler[tur.id]?.agirlik.length, 1280, tur.id);
  const sw = oku('sw.js');
  for (const dosya of MODEL_DOSYALARI) assert.ok(!sw.includes(`'${dosya}'`), `${dosya} uygulamayla indirilmemeli`);
  assert.match(sw, /MODEL_ONBELLEGI/);
});

test('Kural 12: kamera, fotoğraf kıyası ve sesli komut hiçbir yere bir şey göndermez', () => {
  for (const dosya of ['js/kamera.js', 'js/sesliKomut.js', 'js/hizliTanimla.js', 'js/siradaki.js']) {
    assert.doesNotMatch(oku(dosya), /fetch\(|geolocation|https?:/, dosya);
  }
  // Fotoğraf kıyası yalnızca uygulamanın kendi model dosyalarını okur.
  const foto = oku('js/fotoTanima.js');
  assert.doesNotMatch(foto, /https?:/);
  for (const dosya of MODEL_DOSYALARI) assert.ok(dosya.startsWith('./vendor/'), dosya);
  // Sesli komut yalnızca telefon içi tanımayla çalışır.
  const ses = oku('js/sesliKomut.js');
  assert.match(ses, /processLocally = true/);
  assert.match(ses, /!== 'var'\) return false/);
});

test('sesli komut: Türkçe komutlar ve seçenekler anlaşılır', () => {
  const evetHayir = [{ deger: 'evet', metin: 'Evet' }, { deger: 'hayir', metin: 'Hayır' }, { deger: 'bilmiyorum', metin: 'Bilmiyorum / göremedim' }];
  assert.deepEqual(komutuAnla('Evet', evetHayir), { komut: 'secenek', deger: 'evet' });
  assert.deepEqual(komutuAnla('hayır', evetHayir), { komut: 'secenek', deger: 'hayir' });
  assert.deepEqual(komutuAnla('emin değilim', evetHayir), { komut: 'secenek', deger: 'bilmiyorum' });
  assert.deepEqual(komutuAnla('çek'), { komut: 'cek' });
  assert.deepEqual(komutuAnla('tekrar oku', evetHayir), { komut: 'tekrar' });
  const renkler = [{ deger: 'beyaz', metin: 'Beyaz' }, { deger: 'krem-sari', metin: 'Krem veya sarı' }, { deger: 'kahverengi', metin: 'Kahverengi' }];
  assert.deepEqual(komutuAnla('sarı', renkler), { komut: 'secenek', deger: 'krem-sari' });
  assert.equal(komutuAnla('merhaba', renkler), null);
  assert.equal(sadele('Çıkmıyor, ŞÜPHELİ'), 'cikmiyor suphel' + 'i');
});

test('zehir sembolleri: her zehirli türün zehir türü tanımlı ya da "bilinmiyor"; ölümcüller kurukafa', async () => {
  const { ZEHIR_TIPLERI, ERKEN_BASLAMA_UYARISI, zehirTipi } = await import('../js/zehir.js');
  for (const tur of turler) {
    const tip = zehirTipi(tur);
    if (tur.zehirlilik === 'yenen') {
      assert.equal(tip, null, tur.id);
      continue;
    }
    if (tur.zehirTipi) assert.ok(ZEHIR_TIPLERI[tur.zehirTipi], `${tur.id}: bilinmeyen zehirTipi`);
    if (tur.zehirlilik === 'olumcul') assert.equal(tip.sembol, 'kurukafa', tur.id);
  }
  // Alanı olmayan veya boş zehirlilikli tür en kötüsü sayılır (kural 3).
  assert.equal(zehirTipi({ zehirlilik: '' }).renk, 'kirmizi');
  for (const tip of Object.values(ZEHIR_TIPLERI)) {
    assert.ok(tip.baslama && tip.belirtiler.length && tip.uyari);
    for (const metin of [tip.baslik, tip.uyari, ...tip.belirtiler]) assert.deepEqual(yasakIfadeler(metin), []);
  }
  assert.match(ZEHIR_TIPLERI.karaciger.uyari, /iyileşmiş gibi/);
  assert.match(ERKEN_BASLAMA_UYARISI, /hafif olduğu anlamına gelmez/);
  assert.match(oku('js/zehir.js'), /tel:114/);
  assert.match(oku('js/zehir.js'), /tel:112/);
});

test('tek sayfa kontrol listesi: güvenlik soruları baştan listede; listeyi cevaplamak hızlı akışla aynı yere varır (kural 3, 4, 5)', () => {
  const bos = kontrolListesi(turler, {}, []).map((k) => k.adim.soru);
  for (const soru of ZORUNLU_SORULAR.filter((s) => s !== 'solungacRengi')) assert.ok(bos.includes(soru), `${soru} listede yok`);
  for (const gercek of turler) {
    const cevaplar = {};
    const sorulanlar = [];
    for (let i = 0; i < ADIMLAR.length + 2; i++) {
      const liste = kontrolListesi(turler, cevaplar, sorulanlar);
      if (!liste.length) break;
      // Listenin ilk maddesi, adım adım akışın sıradaki sorusudur.
      assert.equal(liste[0].adim.soru, siradakiAdim(turler, cevaplar, sorulanlar).adim.soru, gercek.id);
      const adim = liste[0].adim;
      sorulanlar.push(adim.soru);
      let cevap = gercek.ozellikler?.[adim.soru]?.[0] ?? (adim.secenekler.some(([d]) => d === 'hayir') ? 'hayir' : adim.secenekler[0][0]);
      if (adim.coklu && !Array.isArray(cevap)) cevap = [cevap];
      cevaplar[adim.soru] = cevap;
    }
    assert.deepEqual(kontrolListesi(turler, cevaplar, sorulanlar), [], gercek.id);
    assert.deepEqual(sorulanlar, hizliAkis(gercek).sorulanlar, gercek.id);
  }
});

test('tek sayfa kontrol listesi: fotoğraf tahmini zehirli adayın kontrolünü listeden çıkarmaz (kural 3)', () => {
  // Fotoğraf yalnızca kanlıcaya benzese de, hiçbir şey cevaplanmamışken ölümcül türleri ayıran güvenlik soruları listededir.
  const benzerlikler = Object.fromEntries(turler.map((t) => [t.id, t.id === 'kanlica' ? 1 : 0]));
  const liste = kontrolListesi(turler, {}, [], benzerlikler).map((k) => k.adim.soru);
  for (const soru of ['volva', 'halka', 'genc']) assert.ok(liste.includes(soru), soru);
});

test('fotoğraftan öneri: tür güçlü tahmin edilince türün rengi ve şapka altı önerilir (kanlıca turuncu, solungaçlı)', async () => {
  const { turdenOner, onerileriBirlestir, TUR_ESIGI } = await import('../js/fotoOzellik.js');
  const kanlica = turler.find((t) => t.id === 'kanlica');
  assert.equal(kanlica.ozellikler.sapkaRengi[0], 'kirmizi-turuncu');
  const tur = turdenOner({ kanlica: 0.9, 'tuylu-sut': 0.1 }, turler);
  assert.deepEqual(tur, { sapkaRengi: ['kirmizi-turuncu'], altYapi: 'solungac' });
  // Renk ayırıcısı kahverengi dese de güçlü tür tahmininde türün rengi önce gelir; türde olmayan renk eklenmez.
  assert.deepEqual(onerileriBirlestir({ renkler: ['kahverengi'], tur, turRenkleri: kanlica.ozellikler.sapkaRengi }).sapkaRengi, ['kirmizi-turuncu']);
  assert.deepEqual(onerileriBirlestir({ renkler: ['krem-sari'], tur, turRenkleri: kanlica.ozellikler.sapkaRengi }).sapkaRengi, ['kirmizi-turuncu', 'krem-sari']);
  // Zayıf tahminde türün rengi önerilmez; ama olası türlerin hepsi solungaçlıysa şapka altı yine önerilir.
  assert.deepEqual(turdenOner({ kanlica: TUR_ESIGI - 0.01, 'tuylu-sut': 0.4 }, turler), { altYapi: 'solungac' });
  assert.deepEqual(turdenOner({ kanlica: 0.45, 'ayi-mantari': 0.45 }, turler), {});
  // Şapka altı ayırıcısının cevabı türünkinden önce gelir.
  assert.equal(onerileriBirlestir({ alt: 'gozenek', tur }).altYapi, 'gozenek');
});

test('mevsim ağırlığı: hiçbir türü elemez, toplam 1 kalır; mevsimi olmayan tür geri itilir ama sıfırlanmaz (kural 3)', async () => {
  const { mevsimeGoreAgirlikla, MEVSIM_TABANI } = await import('../js/mevsimAgirligi.js');
  const mevsim = JSON.parse(oku('veri/mevsim.json')).turler;
  for (const t of turler) assert.ok(t.id in mevsim, `${t.id} mevsim takviminde yok`);
  const b = Object.fromEntries(turler.map((t) => [t.id, 1 / turler.length]));
  const nisan = mevsimeGoreAgirlikla(b, mevsim, 3);
  assert.equal(Object.keys(nisan).length, turler.length);
  assert.ok(Math.abs(Object.values(nisan).reduce((x, y) => x + y, 0) - 1) < 1e-9);
  for (const p of Object.values(nisan)) assert.ok(p > 0);
  // Nisan'da kuzugöbeği kanlıcadan önde; Ekim'de tersi.
  assert.ok(nisan.kuzugobegi > nisan.kanlica);
  const ekim = mevsimeGoreAgirlikla(b, mevsim, 9);
  assert.ok(ekim.kanlica > ekim.kuzugobegi);
  assert.ok(nisan.kanlica / nisan.kuzugobegi >= MEVSIM_TABANI - 1e-9);
});

test('fotoğraf kıyası eğitimi: yalnızca CC0, kamu malı ve CC BY; CC BY-SA, NC, ND ve bilinmeyen lisans alınmaz', async () => {
  const { egitimeUygunLisans } = await import('../scripts/lisans.js');
  for (const l of ['cc0', 'CC0', 'cc-by', 'CC BY 2.0', 'CC BY 3.0', 'CC BY 4.0', 'Public domain']) assert.equal(egitimeUygunLisans(l), true, l);
  for (const l of ['cc-by-sa', 'CC BY-SA 3.0', 'CC BY-SA 3.0 es', 'CC BY-NC 4.0', 'cc-by-nc', 'CC BY-ND 4.0', '', undefined, 'GFDL']) assert.equal(egitimeUygunLisans(l), false, String(l));
});

test('fotoğraf modeli: uygulamanın modeli ile sw.js içindeki model klasörü aynı; ayırıcılar modelin klasöründe', async () => {
  const { MODEL } = await import('../js/modelAyari.js');
  const sw = oku('sw.js');
  assert.equal(`./${/const AKTIF_MODEL_KLASORU = '([^']+)'/.exec(sw)[1]}`, MODEL.klasor);
  for (const dosya of ['model.json', 'tur-ayirici.json', 'sapka-rengi.json', 'alt-yapi.json']) assert.ok(existsSync(path.join(KOK, MODEL.klasor, dosya)), dosya);
});
