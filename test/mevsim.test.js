// Mantar mevsimi çubuğunun hesap testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MEVSIMLER, MEVSIM_NOTU, mevsimDurumu } from '../js/mevsim.js';

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

test('yaz mevsimi (Metin, 2026-11-08: yazın da mantar çıkıyor)', () => {
  const d = mevsimDurumu(tarih(2026, 7, 1));
  assert.equal(d.icinde, true);
  assert.equal(d.tur, 'yaz');
  assert.equal(d.ad, 'Yaz mantar mevsimi');
  assert.equal(d.kalanGun, 62);
});

test('kış mevsimi yılbaşını aşar: Aralık ve Ocak aynı kış', () => {
  const aralik = mevsimDurumu(tarih(2026, 12, 15));
  assert.equal(aralik.icinde, true);
  assert.equal(aralik.tur, 'kis');
  assert.equal(aralik.bitis.getFullYear(), 2027);
  assert.equal(aralik.kalanGun, 76);
  const ocak = mevsimDurumu(tarih(2027, 1, 15));
  assert.equal(ocak.icinde, true);
  assert.equal(ocak.tur, 'kis');
  assert.equal(ocak.baslangic.getFullYear(), 2026);
  assert.equal(ocak.kalanGun, 45);
});

test('artık yılda kış 29 Şubat\'ta biter, 1 Mart ilkbahar', () => {
  const d = mevsimDurumu(tarih(2028, 2, 29));
  assert.equal(d.tur, 'kis');
  assert.equal(d.kalanGun, 1);
  assert.equal(mevsimDurumu(tarih(2028, 3, 1)).tur, 'ilkbahar');
  assert.equal(mevsimDurumu(tarih(2027, 2, 28)).kalanGun, 1);
});

test('yılın her günü bir mevsimde ve mevsimler çakışmıyor', () => {
  for (let g = new Date(2027, 0, 1, 9); g.getFullYear() === 2027; g = new Date(g.getFullYear(), g.getMonth(), g.getDate() + 1, 9)) {
    const d = mevsimDurumu(g);
    assert.equal(d.icinde, true, g.toDateString());
    assert.ok(d.kalanOran > 0 && d.kalanOran <= 1);
  }
});

test('mevsimler türlerin çıktığı aylara göre: her mevsimde tür var, türü olan her ay bir mevsimde', () => {
  const turler = JSON.parse(readFileSync(new URL('../veri/turler.json', import.meta.url), 'utf8'));
  const liste = Array.isArray(turler) ? turler : turler.turler;
  const ayinMevsimi = (ay) => MEVSIMLER.find((m) => (m.baslangic.ay <= m.bitis.ay
    ? m.baslangic.ay <= ay && ay <= m.bitis.ay
    : ay >= m.baslangic.ay || ay <= m.bitis.ay));
  const turAylari = new Set(liste.flatMap((t) => t.aylar || []));
  for (const ay of turAylari) assert.ok(ayinMevsimi(ay), `${ay}. ayda tür var ama mevsim yok`);
  for (const m of MEVSIMLER) {
    const var_ = [...turAylari].some((ay) => ayinMevsimi(ay) === m);
    assert.ok(var_, `${m.ad}: bu mevsimde çıkan tür yok`);
    assert.ok(['ilkbahar', 'yaz', 'sonbahar', 'kis'].includes(m.tur));
    assert.doesNotMatch(m.ipucu, /yenebilir|güvenli|sorun yok|tad/i);
  }
});

test('mevsim notu tarihlerin yaklaşık olduğunu ve zehirli mantar uyarısını içerir', () => {
  assert.match(MEVSIM_NOTU, /Yaklaşık/);
  assert.match(MEVSIM_NOTU, /Zehirli/);
});
