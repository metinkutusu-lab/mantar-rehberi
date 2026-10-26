// Tanımlama akışı, soru tablosu, tür anahtarı ve tür verisi testleri.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  BILMIYORUM,
  GEREKLI_FOTOGRAFLAR,
  OLUMCUL_MESAJ,
  ZORUNLU_SORULAR,
  degerlendir,
  turSayfasiHatalari,
} from '../js/kurallar.js';
import { ADIMLAR, adimSecenekleri, aktifAdimlar, ozetSatirlari, sonCevaplar } from '../js/sorular.js';
import { adaylariBul } from '../js/anahtar.js';
import { CIZIMLER } from '../js/cizimler.js';
import { SOZLUK } from '../js/sozluk.js';
import { OZET_UYARISI } from '../js/kurallar.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const turVerisi = JSON.parse(readFileSync(path.join(KOK, 'veri/turler.json'), 'utf8'));

// Bütün adımlarda ilk seçeneği seçen bir kullanıcı.
function ilkSecenekler(degisiklik = {}) {
  const cevaplar = {};
  for (const adim of ADIMLAR) cevaplar[adim.soru] = adim.secenekler[0][0];
  return { ...cevaplar, ...degisiklik };
}

test('soru tablosu: her adımın sorusu, metni ve en az iki seçeneği var; sorular tekrarlanmıyor', () => {
  const sorular = ADIMLAR.map((a) => a.soru);
  assert.equal(new Set(sorular).size, sorular.length);
  for (const adim of ADIMLAR) {
    assert.ok(adim.baslik && adim.soruMetni, adim.soru);
    assert.ok(adim.secenekler.length >= 2, adim.soru);
    assert.ok(!adim.secenekler.some(([deger]) => deger === BILMIYORUM), `${adim.soru}: bilmiyorum otomatik eklenir`);
  }
});

test('Kural 5: zorunlu her soruda "Bilmiyorum" seçeneği var', () => {
  for (const adim of ADIMLAR) {
    const zorunlu = ZORUNLU_SORULAR.includes(adim.soru) || adim.soru === 'kesitteTaslak';
    if (zorunlu) assert.ok(!adim.bilmiyorumYok, adim.soru);
    if (!adim.bilmiyorumYok) {
      assert.ok(adimSecenekleri(adim).some((s) => s.deger === BILMIYORUM), adim.soru);
    }
  }
});

test('Kural 5: zorunlu sorular akışta soruluyor veya türetiliyor', () => {
  const son = sonCevaplar(ilkSecenekler());
  for (const soru of ZORUNLU_SORULAR) assert.ok(son[soru] !== undefined, soru);
});

test('Kural 6: gerekli üç fotoğraf koşulsuz adımlarda isteniyor', () => {
  for (const foto of GEREKLI_FOTOGRAFLAR) {
    const adim = ADIMLAR.find((a) => a.fotograf === foto);
    assert.ok(adim, foto);
    assert.equal(adim.kosul, undefined, `${foto} her zaman istenmeli`);
  }
});

test('Kural 13: genç mantarda kesit adımı soruluyor, değilse sorulmuyor', () => {
  assert.ok(aktifAdimlar({ genc: 'evet' }).some((a) => a.soru === 'kesitteTaslak'));
  assert.ok(!aktifAdimlar({ genc: 'hayir' }).some((a) => a.soru === 'kesitteTaslak'));
  assert.ok(!aktifAdimlar({ genc: BILMIYORUM }).some((a) => a.soru === 'kesitteTaslak'));
});

test('Kural 13: akış üzerinden genç mantar + içeride taslak ölümcül olabilir', () => {
  const cevaplar = sonCevaplar(ilkSecenekler({ genc: 'evet', kesitteTaslak: 'evet', kucukKahverengi: 'hayir' }));
  const sonuc = degerlendir({ fotograflar: [...GEREKLI_FOTOGRAFLAR], cevaplar, adaylar: [] });
  assert.equal(sonuc.renk, 'kirmizi');
  assert.equal(sonuc.mesaj, OLUMCUL_MESAJ);
});

test('akış: genç değilse eski kesit cevabı değerlendirmeye gitmez', () => {
  const son = sonCevaplar(ilkSecenekler({ genc: 'hayir', kesitteTaslak: 'evet' }));
  assert.equal(son.kesitteTaslak, undefined);
});

test('akış: solungaç yoksa solungaç rengi "yok", alt yapı bilinmiyorsa "bilmiyorum" olur', () => {
  assert.equal(sonCevaplar(ilkSecenekler({ altYapi: 'gozenek', solungacRengi: 'beyaz' })).solungacRengi, 'yok');
  assert.equal(sonCevaplar(ilkSecenekler({ altYapi: BILMIYORUM })).solungacRengi, BILMIYORUM);
  assert.equal(sonCevaplar(ilkSecenekler({ altYapi: 'solungac', solungacRengi: 'pembe' })).solungacRengi, 'pembe');
});

test('Kural 4: akış üzerinden alt yapı bilinmiyor + halka ölümcül olabilir', () => {
  const cevaplar = sonCevaplar(ilkSecenekler({ altYapi: BILMIYORUM, halka: 'evet', kucukKahverengi: 'hayir', genc: 'hayir' }));
  const sonuc = degerlendir({ fotograflar: [...GEREKLI_FOTOGRAFLAR], cevaplar, adaylar: [] });
  assert.equal(sonuc.mesaj, OLUMCUL_MESAJ);
});

// Test türleri uydurmadır; gerçek tür bilgisi değildir.
const olumculTur = {
  ad: 'Test ölümcül',
  zehirlilik: 'olumcul',
  ozellikler: { solungacRengi: ['beyaz'], halka: ['evet'], volva: ['evet'] },
};
const yenenTur = {
  ad: 'Test yenen',
  zehirlilik: 'yenen',
  mikologOnayi: true,
  ozellikler: { solungacRengi: ['pembe', 'kahverengi'], halka: ['evet', 'hayir'] },
};

test('anahtar: kesin ve çelişen cevap türü eler', () => {
  const adaylar = adaylariBul([olumculTur, yenenTur], { solungacRengi: 'pembe' });
  assert.deepEqual(adaylar.map((t) => t.ad), ['Test yenen']);
});

test('Kural 3: anahtar "bilmiyorum", "diğer" ve eksik alanla tür elemez', () => {
  for (const cevap of [BILMIYORUM, 'diger', 'yapilmadi', undefined]) {
    const adaylar = adaylariBul([olumculTur, yenenTur], { solungacRengi: cevap });
    assert.equal(adaylar.length, 2, String(cevap));
  }
  // Türde koku alanı yok: koku cevabı onu elemez.
  assert.equal(adaylariBul([olumculTur], { koku: 'anason' }).length, 1);
});

test('Kural 3: ölümcül tür adaylarda kaldıkça sonuç kırmızı', () => {
  const cevaplar = { solungacRengi: BILMIYORUM, halka: 'evet' };
  const adaylar = adaylariBul([olumculTur, yenenTur], cevaplar);
  assert.equal(degerlendir({ fotograflar: [...GEREKLI_FOTOGRAFLAR], cevaplar, adaylar }).renk, 'kirmizi');
});

test('çizimler: adımlarda, seçeneklerde ve sözlükte kullanılan her çizim var', () => {
  const kullanilan = [
    ...ADIMLAR.map((a) => a.cizim),
    ...ADIMLAR.flatMap((a) => a.secenekler.map(([, , c]) => c)),
    ...SOZLUK.map((m) => m.cizim),
  ].filter(Boolean);
  assert.ok(kullanilan.length > 10);
  for (const ad of kullanilan) assert.match(CIZIMLER[ad] ?? '', /^<svg /, ad);
});

test('çizimler: genç mantar kesiti ve volva adımlarında çizim var', () => {
  for (const soru of ['kesitteTaslak', 'volva', 'halka', 'altYapi']) {
    const adim = ADIMLAR.find((a) => a.soru === soru);
    assert.ok(adim.cizim || adim.secenekler.every(([, , c]) => c), soru);
  }
});

test('sözlük: temel terimleri içerir', () => {
  const terimler = SOZLUK.map((m) => m.terim).join(' ');
  for (const t of ['Şapka', 'Solungaç', 'Halka', 'Volva', 'Genç', 'Spor izi']) assert.match(terimler, new RegExp(t), t);
});

test('özet: sorular okunur metne çevrilir, cevapsız ve bilinmeyen belirtilir', () => {
  const satirlar = ozetSatirlari({ sapkaRengi: 'beyaz', genc: 'hayir', halka: BILMIYORUM });
  assert.equal(satirlar[0].soru, 'Şapkanın rengi ne?');
  assert.equal(satirlar[0].cevap, 'Beyaz');
  assert.equal(satirlar.find((s) => s.soru.startsWith('Ayakta')).cevap, 'Bilmiyorum / göremedim');
  assert.equal(satirlar.find((s) => s.soru.startsWith('Mantar küçük')).cevap, 'Cevaplanmadı');
  assert.ok(!satirlar.some((s) => s.soru.startsWith('İçeride')), 'genç değilse kesit sorusu özette yok');
});

test('Kural 1: özet resmi "tahmin" uyarısını taşır', () => {
  assert.match(OZET_UYARISI, /tahmin/);
  assert.match(OZET_UYARISI, /karar vermez/);
  assert.match(readFileSync(path.join(KOK, 'js/ozet.js'), 'utf8'), /OZET_UYARISI/);
});

// Bir türün kendi özelliklerinin ilk değerleriyle cevap veren kullanıcı.
function turunCevaplari(tur) {
  const cevaplar = { kucukKahverengi: 'hayir', genc: 'hayir', halka: 'hayir', volva: 'hayir', solungacRengi: 'beyaz' };
  for (const [soru, degerler] of Object.entries(tur.ozellikler ?? {})) cevaplar[soru] = degerler[0];
  if (cevaplar.kesitteTaslak) cevaplar.genc = 'evet';
  return sonCevaplar(cevaplar);
}

test('tür verisi: kimlikler tekil, her kaydın açıklaması ve kaynağı var', () => {
  const kimlikler = turVerisi.turler.map((t) => t.id);
  assert.equal(new Set(kimlikler).size, kimlikler.length);
  for (const tur of turVerisi.turler) {
    assert.ok(tur.id && tur.aciklama, tur.ad);
    assert.ok(tur.kaynak?.trim(), `${tur.ad}: kaynak zorunlu`);
    if (!tur.mikologOnayi) assert.match(tur.kaynak, /TASLAK/, `${tur.ad}: onaysız kayıt taslak diye işaretli olmalı`);
  }
});

test('tür verisi: zehirli benzer olarak anılan her tür listede var', () => {
  const adlar = new Set(turVerisi.turler.map((t) => t.ad));
  for (const tur of turVerisi.turler) {
    for (const benzer of tur.zehirliBenzerler ?? []) {
      assert.ok(adlar.has(benzer.ad), `${tur.ad} → ${benzer.ad}`);
      const kayit = turVerisi.turler.find((t) => t.ad === benzer.ad);
      assert.notEqual(kayit.zehirlilik, 'yenen', `${benzer.ad} zehirli olmalı`);
    }
  }
});

test('Kural 3: zehirli türler kendi özellikleriyle aday kalır ve sonucu kırmızı yapar', () => {
  for (const tur of turVerisi.turler.filter((t) => t.zehirlilik !== 'yenen')) {
    const cevaplar = turunCevaplari(tur);
    const adaylar = adaylariBul(turVerisi.turler, cevaplar);
    assert.ok(adaylar.some((t) => t.id === tur.id), `${tur.ad} kendi özellikleriyle elendi`);
    const sonuc = degerlendir({ fotograflar: [...GEREKLI_FOTOGRAFLAR], cevaplar, adaylar });
    assert.equal(sonuc.renk, 'kirmizi', tur.ad);
  }
});

test('Kural 3: köygöçüren, halka ve volva "hayır" dense bile beyaz solungaçla aday kalır', () => {
  const cevaplar = sonCevaplar(ilkSecenekler({
    sapkaRengi: 'beyaz', kucukKahverengi: 'hayir', genc: 'hayir', altYapi: 'solungac', solungacRengi: 'beyaz',
    halka: 'hayir', volva: 'hayir', sut: 'yok', zemin: 'cayir', sporIzi: 'beyaz',
  }));
  const adaylar = adaylariBul(turVerisi.turler, cevaplar);
  assert.ok(adaylar.some((t) => t.id === 'koygocuren'));
  assert.equal(degerlendir({ fotograflar: [...GEREKLI_FOTOGRAFLAR], cevaplar, adaylar }).renk, 'kirmizi');
});

test('Kural 2 ve 5: onaysız taslak türler hiçbir cevapta sarı sonuç vermez', () => {
  for (const tur of turVerisi.turler.filter((t) => t.zehirlilik === 'yenen' && !t.mikologOnayi)) {
    const cevaplar = turunCevaplari(tur);
    const adaylar = adaylariBul(turVerisi.turler, cevaplar);
    const sonuc = degerlendir({ fotograflar: [...GEREKLI_FOTOGRAFLAR], cevaplar, adaylar });
    assert.notEqual(sonuc.renk, 'sari', tur.ad);
  }
});

test('fotoğraflar: her türün fotoğrafı var, lisansı ticari kullanıma uygun ve atfı yazılı', () => {
  const sw = readFileSync(path.join(KOK, 'sw.js'), 'utf8');
  for (const tur of turVerisi.turler) {
    const f = tur.fotograf;
    assert.ok(f, `${tur.ad}: fotoğraf yok`);
    assert.ok(existsSync(path.join(KOK, f.dosya)), `${tur.ad}: ${f.dosya} bulunamadı`);
    assert.ok(sw.includes(`'./${f.dosya}'`), `${f.dosya} sw.js'de çevrimdışı listede olmalı`);
    assert.ok(f.cekan?.trim(), `${tur.ad}: çeken adı zorunlu (lisans gereği)`);
    assert.match(f.kaynak, /Wikimedia Commons/, tur.ad);
    assert.match(f.lisans, /^(CC0|Public domain|CC BY(-SA)? \d)/i, `${tur.ad}: lisans ${f.lisans}`);
    assert.doesNotMatch(f.lisans, /NC|ND/, `${tur.ad}: ticari olmayan veya türetilemez lisans kullanılamaz`);
  }
});

test('tür verisi: her kayıt geçerli ve kural 8\'e uygun', () => {
  assert.ok(Array.isArray(turVerisi.turler));
  const gecerliDegerler = Object.fromEntries(ADIMLAR.map((a) => [a.soru, new Set(a.secenekler.map(([d]) => d))]));
  for (const tur of turVerisi.turler) {
    assert.ok(tur.ad, 'ad zorunlu');
    assert.ok(['olumcul', 'zehirli', 'yenen'].includes(tur.zehirlilik), `${tur.ad}: zehirlilik`);
    assert.equal(typeof tur.mikologOnayi, 'boolean', `${tur.ad}: mikologOnayi`);
    if (tur.mikologOnayi) assert.ok(tur.onaylayan && tur.onayTarihi, `${tur.ad}: onaylayan ve tarih`);
    for (const [soru, degerler] of Object.entries(tur.ozellikler ?? {})) {
      assert.ok(gecerliDegerler[soru], `${tur.ad}: bilinmeyen soru ${soru}`);
      for (const deger of degerler) assert.ok(gecerliDegerler[soru].has(deger), `${tur.ad}: ${soru}=${deger}`);
    }
    assert.deepEqual(turSayfasiHatalari(tur), [], tur.ad);
  }
});
