// Hızlı tanımlama testleri: sıradaki soru seçimi, güvenlik soruları, fotoğraf kıyası ve sesli komutlar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GEREKLI_FOTOGRAFLAR, ZORUNLU_SORULAR, degerlendir, yasakIfadeler } from '../js/kurallar.js';
import { ADIMLAR, aktifAdimlar, sonCevaplar } from '../js/sorular.js';
import { adaylariBul } from '../js/anahtar.js';
import { HIZLI_AKISTA_YOK, adimFaydasi, agirliklar, ayiranAdimlar, siradakiAdim } from '../js/siradaki.js';
import { benzerlikSozu, benzerlikleriHesapla, birimYap, izCoz, izKodla, kosinus, MODEL_DOSYALARI } from '../js/fotoTanima.js';
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

test('hızlı akış: güvenlik soruları her türde sorulur (kural 4, 5, 6)', () => {
  for (const gercek of turler) {
    const { sorulanlar, cevaplar } = hizliAkis(gercek);
    for (const soru of [...ZORUNLU_SORULAR, 'altYapi', 'halka']) {
      if (soru === 'solungacRengi' && cevaplar.altYapi !== 'solungac') continue;
      assert.ok(sorulanlar.includes(soru), `${gercek.id}: ${soru} sorulmadı`);
    }
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

test('Kural 13: hızlı akışta "genç" denince kesit hemen sorulur', () => {
  const s = siradakiAdim(turler, { genc: 'evet' }, ['genc']);
  assert.equal(s.adim.soru, 'kesitteTaslak');
});

test('Kural 3: hızlı akış, elenebilecek bir aday kaldıkça soru sormayı bırakmaz', () => {
  for (const gercek of turler) {
    const { cevaplar, sorulanlar } = hizliAkis(gercek);
    const kalan = adaylariBul(turler, sonCevaplar(cevaplar));
    const agirlik = agirliklar(kalan);
    for (const adim of aktifAdimlar(cevaplar)) {
      if (sorulanlar.includes(adim.soru) || HIZLI_AKISTA_YOK.includes(adim.soru)) continue;
      assert.ok(adimFaydasi(adim, kalan, agirlik) <= 0.001, `${gercek.id}: ${adim.soru} hâlâ ayırabilirdi`);
    }
  }
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

test('fotoğraf kıyası: en benzer tür 1, en az benzer 0; benzerlik yüzde olarak yazılmaz (kural 1, 5)', () => {
  const a = birimYap(Float32Array.from([1, 0, 0]));
  const b = birimYap(Float32Array.from([0, 1, 0]));
  const sonuc = benzerlikleriHesapla([a], { x: [a], y: [b] });
  assert.equal(sonuc.x, 1);
  assert.equal(sonuc.y, 0);
  for (const d of [0, 0.5, 0.7, 0.9, 1]) {
    const soz = benzerlikSozu(d);
    assert.doesNotMatch(soz, /%|yüzde|kesin/i);
    assert.deepEqual(yasakIfadeler(soz), []);
  }
});

test('fotoğraf kıyası: her türün parmak izi var; model uygulamayla birlikte indirilmez (az veri)', () => {
  const izler = JSON.parse(oku('vendor/mobilenet/parmak-izleri.json')).turler;
  for (const tur of turler.filter((t) => t.fotograf)) assert.ok(izler[tur.id]?.length, tur.id);
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
