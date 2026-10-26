// Mantar mevsimi çubuğunun hesap testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEVSIM_NOTU, mevsimDurumu } from '../js/mevsim.js';

const tarih = (yil, ay, gun) => new Date(yil, ay - 1, gun, 9);

test('mevsimin ilk günü: çubuk dolu', () => {
  const d = mevsimDurumu(tarih(2026, 9, 1));
  assert.equal(d.icinde, true);
  assert.equal(d.ad, 'Sonbahar mantar mevsimi');
  assert.equal(d.kalanOran, 1);
  assert.equal(d.kalanGun, 91);
});

test('mevsimin son günü: bir gün kaldı, çubuk neredeyse boş', () => {
  const d = mevsimDurumu(tarih(2026, 11, 30));
  assert.equal(d.icinde, true);
  assert.equal(d.kalanGun, 1);
  assert.ok(d.kalanOran > 0 && d.kalanOran < 0.02);
});

test('mevsim ortasında çubuk azalır', () => {
  const d = mevsimDurumu(tarih(2026, 10, 24));
  assert.equal(d.icinde, true);
  assert.equal(d.kalanGun, 38);
  assert.ok(d.kalanOran > 0.4 && d.kalanOran < 0.43);
});

test('ilkbahar mevsimi', () => {
  const d = mevsimDurumu(tarih(2026, 4, 15));
  assert.equal(d.icinde, true);
  assert.equal(d.ad, 'İlkbahar mantar mevsimi');
});

test('yaz: mevsim dışı, sıradaki sonbahar', () => {
  const d = mevsimDurumu(tarih(2026, 7, 1));
  assert.equal(d.icinde, false);
  assert.equal(d.ad, 'Sonbahar mantar mevsimi');
  assert.equal(d.kalanGun, 62);
});

test('kış: mevsim dışı, sıradaki gelecek yılın ilkbaharı', () => {
  const d = mevsimDurumu(tarih(2026, 12, 15));
  assert.equal(d.icinde, false);
  assert.equal(d.ad, 'İlkbahar mantar mevsimi');
  assert.equal(d.baslangic.getFullYear(), 2027);
  assert.equal(d.kalanGun, 76);
});

test('mevsim notu tarihlerin yaklaşık olduğunu ve zehirli mantar uyarısını içerir', () => {
  assert.match(MEVSIM_NOTU, /Yaklaşık/);
  assert.match(MEVSIM_NOTU, /Zehirli/);
});
