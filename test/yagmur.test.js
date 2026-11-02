// Yağmur ipucu ve mantar penceresi testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUYUK_YAGMUR_MM,
  GECIKME_PROFILLERI,
  YAGMUR_NOTU,
  elleKayit,
  gunlukKayitlar,
  havaAdresi,
  konumuYuvarla,
  mantarPenceresi,
} from '../js/yagmur.js';

const tarih = (yil, ay, gun) => new Date(yil, ay - 1, gun, 9);
const BUGUN = tarih(2026, 10, 24);

// 2026-10-03'ten başlayan günlük veri (21 gün geçmiş + bugün + 7 gün tahmin = 29 gün).
function gunluk(yagislar, sicaklik = 15) {
  return {
    time: yagislar.map((_, i) => {
      const t = new Date(2026, 9, 3 + i);
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }),
    precipitation_sum: yagislar,
    temperature_2m_max: yagislar.map(() => sicaklik + 5),
    temperature_2m_min: yagislar.map(() => sicaklik - 5),
  };
}
// i. gün = 3 Ekim + i; bugün (24 Ekim) = 21.
const gunNo = (gunAyi) => gunAyi - 3;
function ham(gunler, sicaklik) {
  const yagislar = Array(29).fill(0);
  for (const [ekimGunu, mm] of gunler) yagislar[gunNo(ekimGunu)] = mm;
  return gunluk(yagislar, sicaklik);
}

function yagisli(gunler, sicaklik) {
  const yagislar = Array(29).fill(0);
  for (const [ekimGunu, mm] of gunler) yagislar[gunNo(ekimGunu)] = mm;
  return gunlukKayitlar(gunluk(yagislar, sicaklik));
}

test('Kural 12: konum yaklaşık 10 km\'ye yuvarlanır', () => {
  assert.equal(konumuYuvarla(41.00512), 41);
  assert.equal(konumuYuvarla(39.7349), 39.7);
  assert.equal(konumuYuvarla(-3.268), -3.3);
});

test('Kural 12: hava servisine yalnızca yuvarlanmış konum gider', () => {
  const adres = havaAdresi(41.012345, 39.734567);
  assert.match(adres, /latitude=41(&|$)/);
  assert.match(adres, /longitude=39\.7(&|$)/);
  assert.doesNotMatch(adres, /41\.01|39\.73/);
  assert.ok(adres.startsWith('https://api.open-meteo.com/'));
});

test('yağmurdan 3 gün sonra: bekleme, en verimli dönem 4 gün sonra', () => {
  const p = mantarPenceresi(yagisli([[21, 20]]), BUGUN);
  assert.equal(p.durum, 'bekle');
  assert.equal(p.siradaki.kalanGun, 4);
  assert.equal(p.siradaki.bas.getDate(), 28);
  assert.equal(p.simdiki, null);
});

test('yağmurdan 9 gün sonra: en verimli dönem, çubuk dolu sayılır', () => {
  const p = mantarPenceresi(yagisli([[15, 18]]), BUGUN);
  assert.equal(p.durum, 'verimli');
  assert.equal(p.sonYagmur.miktar, 18);
  assert.equal(p.simdiki.bas.getDate(), 22);
  assert.equal(p.simdiki.bitis.getDate(), 5);
  // En verimli dönem 22–29 Ekim: 8 gün, 6'sı kaldı.
  assert.equal(p.simdiki.verimliToplamGun, 8);
  assert.equal(p.simdiki.verimliKalanGun, 6);
});

test('en verimli dönemin kalan günü, azalma dahil kalan günden ayrı sayılır', () => {
  // 17 Ekim yağmuru: en verimli 24–31 Ekim, azalma 7 Kasım'a kadar. Bugün 24 Ekim.
  const p = mantarPenceresi(yagisli([[17, 19]]), BUGUN);
  assert.equal(p.durum, 'verimli');
  assert.equal(p.simdiki.verimliKalanGun, 8);
  assert.equal(p.simdiki.kalanGun, 15);
});

test('azalma döneminde en verimli dönemden kalan gün sıfırdır', () => {
  const p = mantarPenceresi(yagisli([[7, 25]]), BUGUN);
  assert.equal(p.simdiki.verimliKalanGun, 0);
});

test('yağmurdan 17 gün sonra: azalıyor, çubuk azalmış', () => {
  const p = mantarPenceresi(yagisli([[7, 25]]), BUGUN);
  assert.equal(p.durum, 'azaliyor');
  // Azalma dönemi 22–28 Ekim: 7 gün, 5'i kaldı.
  assert.equal(p.simdiki.azalmaToplamGun, 7);
  assert.equal(p.simdiki.kalanGun, 5);
});

test('yeni yağmur pencereyi uzatır', () => {
  const tek = mantarPenceresi(yagisli([[7, 25]]), BUGUN);
  const iki = mantarPenceresi(yagisli([[7, 25], [12, 15]]), BUGUN);
  assert.equal(iki.durum, 'verimli');
  assert.ok(iki.simdiki.bitis > tek.simdiki.bitis);
});

test('eski pencere biterken yeni yağmur sıradaki pencereyi açar', () => {
  const p = mantarPenceresi(yagisli([[4, 30], [22, 20]]), BUGUN);
  assert.equal(p.durum, 'azaliyor');
  assert.ok(p.siradaki);
  assert.equal(p.siradaki.bas.getDate(), 29);
});

test('küçük yağmurlar pencere açmaz', () => {
  const p = mantarPenceresi(yagisli([[15, BUYUK_YAGMUR_MM - 1], [18, 3]]), BUGUN);
  assert.equal(p.durum, 'yok');
  assert.equal(p.sonYagmur, null);
  assert.equal(p.toplamYagis, 12);
});

test('tahmindeki büyük yağmur bildirilir, geçmiş hesabına katılmaz', () => {
  const p = mantarPenceresi(yagisli([[27, 15]]), BUGUN);
  assert.equal(p.durum, 'yok');
  assert.equal(p.tahmin.tarih.getDate(), 27);
  assert.equal(p.tahmin.mantarBas.getMonth(), 10);
  assert.equal(p.tahmin.mantarBas.getDate(), 3);
});

test('elle seçilen tarih miktarsız büyük yağmur sayılır', () => {
  const p = mantarPenceresi(elleKayit(tarih(2026, 10, 15)), BUGUN);
  assert.equal(p.durum, 'verimli');
  assert.equal(p.sonYagmur.miktar, null);
});

test('çok soğuk ve çok sıcak havada not düşülür', () => {
  assert.match(mantarPenceresi(yagisli([[15, 20]], 2), BUGUN).sicaklikNotu, /soğuk/);
  assert.match(mantarPenceresi(yagisli([[15, 20]], 30), BUGUN).sicaklikNotu, /sıcak/);
  assert.equal(mantarPenceresi(yagisli([[15, 20]], 15), BUGUN).sicaklikNotu, null);
});

test('ipucu notu yaklaşık olduğunu ve mantarın yine incelenmesi gerektiğini söyler', () => {
  assert.match(YAGMUR_NOTU, /Yaklaşık/);
  assert.match(YAGMUR_NOTU, /Tanımla/);
});

test('türe göre dönem: hızlı türlerde erken, yavaş türlerde geç başlar; her yenen türün grubu geçerli', async () => {
  // 24 Ekim; büyük yağmur 20 Ekim (4 gün önce).
  const kayitlar = yagisli([[20, 25]]);
  assert.equal(mantarPenceresi(kayitlar, BUGUN, 'hizli').durum, 'verimli');
  assert.equal(mantarPenceresi(kayitlar, BUGUN, 'orta').durum, 'bekle');
  assert.equal(mantarPenceresi(kayitlar, BUGUN, 'yavas').siradaki.kalanGun, 6);
  assert.equal(mantarPenceresi(kayitlar, BUGUN, 'bilinmeyen').durum, mantarPenceresi(kayitlar, BUGUN).durum);
  for (const p of Object.values(GECIKME_PROFILLERI)) assert.ok(p.bas < p.verimliBit && p.verimliBit < p.bitis);
  const { readFileSync } = await import('node:fs');
  const turler = JSON.parse(readFileSync(new URL('../veri/turler.json', import.meta.url), 'utf8')).turler;
  for (const t of turler.filter((x) => x.zehirlilik === 'yenen')) assert.ok(t.yagmurSonrasi in GECIKME_PROFILLERI, t.ad);
});

test('aradığın mantarlar: mevsim dışı, en uygun dönem, bekleme ve yağmursuz durumlar; yazılarda yasak ifade yok', async () => {
  const { turDurumu, TAKIP_NOTU } = await import('../js/takipMantarlari.js');
  const { yasakIfadeler } = await import('../js/kurallar.js');
  const kanlica = { ad: 'Kanlıca', aylar: [9, 10, 11], yagmurSonrasi: 'yavas' };
  const kircil = { ad: 'Kırçıl', aylar: [10], yagmurSonrasi: 'hizli' };
  const daily = ham([[8, 25]]); // 8 Ekim büyük yağmur; bugün 24 Ekim (16 gün sonra)
  assert.equal(turDurumu({ ...kanlica, aylar: [4, 5] }, daily, BUGUN).durum, 'mevsimDisi');
  assert.equal(turDurumu(kanlica, daily, BUGUN).durum, 'verimli');
  assert.equal(turDurumu(kircil, daily, BUGUN).durum, 'yok');
  const yeni = ham([[19, 25]]); // 5 gün önce
  assert.equal(turDurumu(kanlica, yeni, BUGUN).durum, 'bekle');
  assert.match(turDurumu(kanlica, yeni, BUGUN).yazi, /5 gün/);
  assert.equal(turDurumu(kanlica, null, BUGUN).durum, 'bilgiYok');
  for (const tur of [kanlica, kircil]) for (const d of [daily, yeni]) assert.deepEqual(yasakIfadeler(turDurumu(tur, d, BUGUN).yazi), []);
  assert.deepEqual(yasakIfadeler(TAKIP_NOTU), []);
  assert.match(TAKIP_NOTU, /Yaklaşık/);
});
