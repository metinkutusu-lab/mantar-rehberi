// Mantar ara: uygunluk hesabının testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  egimVeBaki,
  hucrePuani,
  mesafeVeYon,
  mesafeYaz,
  puanSinifi,
  yonAdi,
  yonTercihi,
  zeminAgirliklari,
} from '../js/uygunluk.js';

// 5x5 ızgara; satırlar kuzeyden güneye.
function izgara(fonksiyon) {
  const d = new Float32Array(25);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) d[y * 5 + x] = fonksiyon(x, y);
  return d;
}
const orta = 2 * 5 + 2;

test('güneye doğru alçalan yamaç güneye bakar', () => {
  const { egim, baki } = egimVeBaki(izgara((x, y) => 100 - y * 10), 5, 5, 30);
  assert.ok(Math.abs(baki[orta] - 180) < 0.01);
  assert.ok(Math.abs(egim[orta] - (Math.atan(10 / 30) * 180) / Math.PI) < 0.01);
});

test('doğuya doğru alçalan yamaç doğuya, kuzeye doğru alçalan kuzeye bakar', () => {
  assert.ok(Math.abs(egimVeBaki(izgara((x) => 100 - x * 5), 5, 5, 30).baki[orta] - 90) < 0.01);
  const kuzey = egimVeBaki(izgara((x, y) => 100 + y * 5), 5, 5, 30).baki[orta];
  assert.ok(kuzey < 0.01 || kuzey > 359.99);
});

test('düz yerde yön yoktur, kenar hücrelerde hesap yapılmaz', () => {
  const { egim, baki } = egimVeBaki(izgara(() => 50), 5, 5, 30);
  assert.equal(egim[orta], 0);
  assert.ok(Number.isNaN(baki[orta]));
  assert.ok(Number.isNaN(egim[0]));
});

test('serin havada ve ilkbaharda güney, sıcak veya kuru havada kuzey tercih edilir', () => {
  assert.equal(yonTercihi({ ay: 10, sicaklik: 6 }).yon, 180);
  assert.equal(yonTercihi({ ay: 4, sicaklik: 14 }).yon, 180);
  assert.equal(yonTercihi({ ay: 4, sicaklik: 25 }).yon, 0);
  assert.equal(yonTercihi({ ay: 10, sicaklik: 14, kuru: true }).yon, 0);
  assert.equal(yonTercihi({ ay: 7 }).yon, 0);
  for (const ay of [1, 4, 7, 10]) assert.ok(yonTercihi({ ay }).aciklama.length > 10);
});

test('tercih edilen yöne bakan ormanlık yamaç en yüksek puanı alır', () => {
  const tercih = { yon: 0, guc: 0.6 };
  const agirliklar = zeminAgirliklari(null);
  const kuzey = hucrePuani({ egim: 15, baki: 0, zemin: 'orman', tercih, agirliklar });
  const guney = hucrePuani({ egim: 15, baki: 180, zemin: 'orman', tercih, agirliklar });
  const duz = hucrePuani({ egim: 1, baki: NaN, zemin: 'orman', tercih, agirliklar });
  assert.equal(puanSinifi(kuzey), 3);
  assert.ok(kuzey > duz && duz > guney);
});

test('orman veya çayır dışı yerler (tarla, yerleşim, su) gösterilmez', () => {
  const tercih = { yon: 0, guc: 0.6 };
  const puan = hucrePuani({ egim: 10, baki: 0, zemin: 'diger', tercih, agirliklar: zeminAgirliklari(null) });
  assert.equal(puanSinifi(puan), 0);
});

test('çok dik yamaç uygunluğu düşürür', () => {
  const tercih = { yon: 0, guc: 0.6 };
  const agirliklar = zeminAgirliklari(null);
  const dik = hucrePuani({ egim: 50, baki: 0, zemin: 'orman', tercih, agirliklar });
  assert.ok(puanSinifi(dik) <= 1);
});

test('tür seçilince türün zemini öne çıkar: çayır türü ormanda, orman türü çayırda düşük', () => {
  const cayirTuru = { ozellikler: { zemin: ['cayir'] } };
  const ormanTuru = { ozellikler: { zemin: ['toprak'] } };
  assert.equal(zeminAgirliklari(cayirTuru).cayir, 1);
  assert.ok(zeminAgirliklari(cayirTuru).orman < 0.5);
  assert.equal(zeminAgirliklari(ormanTuru).orman, 1);
  assert.ok(zeminAgirliklari(ormanTuru).cayir < 0.5);
  // Zemini bilinmeyen tür: hepsi gibi davranır (en geniş arama).
  assert.deepEqual(zeminAgirliklari({ ozellikler: {} }), zeminAgirliklari(null));
});

test('mesafe, yön ve yazılışları', () => {
  const { mesafe, yon } = mesafeVeYon({ enlem: 40, boylam: 29 }, { enlem: 40.01, boylam: 29 });
  assert.ok(Math.abs(mesafe - 1112) < 5);
  assert.ok(yon < 0.5 || yon > 359.5);
  assert.equal(yonAdi(44), 'kuzeydoğu');
  assert.equal(yonAdi(350), 'kuzey');
  assert.equal(yonAdi(180), 'güney');
  assert.equal(mesafeYaz(347), '350 m');
  assert.equal(mesafeYaz(1240), '1,2 km');
});
