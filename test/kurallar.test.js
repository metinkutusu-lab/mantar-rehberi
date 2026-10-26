// Güvenlik kurallarının testleri. CLAUDE.md: bu testleri asla silme, atlama veya gevşetme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  BILMIYORUM,
  ETIKETLER,
  GEREKLI_FOTOGRAFLAR,
  ILK_KEZ_UYARISI,
  KONUM_VARSAYILAN,
  OLUMCUL_MESAJ,
  TOPLAMAYIN_MESAJ,
  degerlendir,
  muhtemelTurOneCikabilirMi,
  egitimTamamlanabilirMi,
  tanimlamaAcilabilirMi,
  tarifAcikMi,
  tarifHatalari,
  tarifUyarilari,
  turSayfasiHatalari,
  yasakIfadeler,
} from '../js/kurallar.js';
import { DERSLER, FERAGAT_MADDELERI, FERAGAT_TASLAK_NOTU, SORULAR } from '../js/egitim.js';
import { cokluHavaAdresi } from '../js/yagmur.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (dosya) => readFileSync(path.join(KOK, dosya), 'utf8');
const uygulamaDosyalari = () => [
  'index.html',
  'sw.js',
  'manifest.webmanifest',
  ...readdirSync(path.join(KOK, 'js')).map((d) => `js/${d}`),
  ...readdirSync(path.join(KOK, 'css')).map((d) => `css/${d}`),
  ...readdirSync(path.join(KOK, 'veri')).filter((d) => d.endsWith('.json')).map((d) => `veri/${d}`),
];

// Test verileri uydurma türlerdir; gerçek tür bilgisi değildir.
const yenenOnayli = { ad: 'Test türü A', zehirlilik: 'yenen', mikologOnayi: true };
const zehirli = { ad: 'Test türü Z', zehirlilik: 'zehirli', mikologOnayi: true };

function temizGirdi(degisiklik = {}) {
  return {
    fotograflar: [...GEREKLI_FOTOGRAFLAR],
    cevaplar: {
      solungacRengi: 'kahverengi',
      halka: 'hayir',
      volva: 'hayir',
      genc: 'hayir',
      kucukKahverengi: 'hayir',
      ...degisiklik.cevaplar,
    },
    adaylar: degisiklik.adaylar ?? [yenenOnayli],
    ...(degisiklik.fotograflar && { fotograflar: degisiklik.fotograflar }),
    ...('guvenSkoru' in degisiklik && { guvenSkoru: degisiklik.guvenSkoru }),
  };
}

test('her şey temiz ve onaylıyken sonuç en fazla sarıdır', () => {
  assert.equal(degerlendir(temizGirdi()).renk, 'sari');
});

test('Kural 1: etiket metinlerinde "yenebilir", "güvenli" gibi ifadeler yok', () => {
  for (const etiket of Object.values(ETIKETLER)) {
    assert.deepEqual(yasakIfadeler(`${etiket.baslik} ${etiket.mesaj}`), [], etiket.renk);
  }
  assert.deepEqual(yasakIfadeler(OLUMCUL_MESAJ + TOPLAMAYIN_MESAJ + ILK_KEZ_UYARISI), []);
});

test('Kural 1: uygulama dosyalarında yasak ifade yok', () => {
  for (const dosya of uygulamaDosyalari()) {
    if (dosya === 'js/kurallar.js') continue; // yasak listesi burada tanımlı
    assert.deepEqual(yasakIfadeler(oku(dosya)), [], dosya);
  }
});

test('Kural 1: yasak ifade denetimi gerçekten yakalıyor', () => {
  assert.deepEqual(yasakIfadeler('Bu mantar YENEBİLİR'), ['yenebilir']);
  assert.deepEqual(yasakIfadeler('Güvenlik eğitimi'), []);
});

test('Kural 2: yalnızca kırmızı, turuncu ve sarı etiket var', () => {
  assert.deepEqual(Object.keys(ETIKETLER).sort(), ['kirmizi', 'sari', 'turuncu']);
  assert.match(ETIKETLER.sari.mesaj, /uzman onayı olmadan yemeyin/i);
});

test('Kural 3: adaylardan biri zehirliyse sonuç kırmızı', () => {
  assert.equal(degerlendir(temizGirdi({ adaylar: [yenenOnayli, zehirli] })).renk, 'kirmizi');
});

test('Kural 3: zehirliliği boş veya bilinmeyen tür zehirli sayılır', () => {
  for (const zehirlilik of [undefined, null, '', 'bilinmiyor', 'YENEN']) {
    const aday = { ad: 'Test türü B', zehirlilik, mikologOnayi: true };
    assert.equal(degerlendir(temizGirdi({ adaylar: [aday] })).renk, 'kirmizi', String(zehirlilik));
  }
});

test('Kural 3: en tehlikeli bulgu kazanır, gerekçelerin hepsi listelenir', () => {
  const sonuc = degerlendir(temizGirdi({ adaylar: [zehirli], fotograflar: ['ust'] }));
  assert.equal(sonuc.renk, 'kirmizi');
  assert.ok(sonuc.gerekceler.length >= 2);
});

test('Kural 4: beyaz solungaç + halka ölümcül olabilir', () => {
  const sonuc = degerlendir(temizGirdi({ cevaplar: { solungacRengi: 'beyaz', halka: 'evet' } }));
  assert.equal(sonuc.renk, 'kirmizi');
  assert.equal(sonuc.mesaj, OLUMCUL_MESAJ);
});

test('Kural 4: beyaz solungaç + volva ölümcül olabilir', () => {
  const sonuc = degerlendir(temizGirdi({ cevaplar: { solungacRengi: 'beyaz', volva: 'evet' } }));
  assert.equal(sonuc.renk, 'kirmizi');
  assert.equal(sonuc.mesaj, OLUMCUL_MESAJ);
});

test('Kural 4: işaretlerden biri görülüp diğeri bilinmiyorsa yine ölümcül olabilir', () => {
  const a = degerlendir(temizGirdi({ cevaplar: { solungacRengi: 'beyaz', halka: BILMIYORUM } }));
  const b = degerlendir(temizGirdi({ cevaplar: { solungacRengi: BILMIYORUM, volva: 'evet' } }));
  assert.equal(a.mesaj, OLUMCUL_MESAJ);
  assert.equal(b.mesaj, OLUMCUL_MESAJ);
});

test('Kural 4: Amanita kuralı onaylı yenen aday listesini de geçersiz kılar', () => {
  const sonuc = degerlendir(temizGirdi({ cevaplar: { solungacRengi: 'beyaz', halka: 'evet' } }));
  assert.equal(sonuc.renk, 'kirmizi');
});

test('Kural 4: küçük kahverengi mantar toplanmaz', () => {
  const sonuc = degerlendir(temizGirdi({ cevaplar: { kucukKahverengi: 'evet' } }));
  assert.equal(sonuc.renk, 'kirmizi');
  assert.equal(sonuc.mesaj, TOPLAMAYIN_MESAJ);
});

test('Kural 5: herhangi bir soruya "bilmiyorum" denirse sonuç en az turuncu', () => {
  for (const soru of ['solungacRengi', 'halka', 'volva', 'genc', 'kucukKahverengi', 'koku']) {
    const sonuc = degerlendir(temizGirdi({ cevaplar: { [soru]: BILMIYORUM } }));
    assert.notEqual(sonuc.renk, 'sari', soru);
  }
});

test('Kural 5: cevapsız zorunlu soru "bilmiyorum" sayılır', () => {
  const girdi = temizGirdi();
  delete girdi.cevaplar.volva;
  assert.notEqual(degerlendir(girdi).renk, 'sari');
});

test('Kural 5: düşük veya geçersiz güven skoru turuncu', () => {
  for (const guvenSkoru of [0.5, 0.89, null, NaN, 'yüksek']) {
    assert.equal(degerlendir(temizGirdi({ guvenSkoru })).renk, 'turuncu', String(guvenSkoru));
  }
  assert.equal(degerlendir(temizGirdi({ guvenSkoru: 0.95 })).renk, 'sari');
});

test('Kural 5: hiçbir türle eşleşmeyen mantar turuncu', () => {
  assert.equal(degerlendir(temizGirdi({ adaylar: [] })).renk, 'turuncu');
  assert.equal(degerlendir({}).renk, 'turuncu');
});

test('Kural 5: uzman onaysız tür sarı olamaz', () => {
  const onaysiz = { ad: 'Test türü C', zehirlilik: 'yenen', mikologOnayi: false };
  assert.equal(degerlendir(temizGirdi({ adaylar: [onaysiz] })).renk, 'turuncu');
});

test('Kural 6: üç fotoğraf olmadan sonuç turuncu', () => {
  for (const fotograflar of [[], ['ust'], ['ust', 'alt'], ['ust', 'ust', 'ust']]) {
    assert.equal(degerlendir(temizGirdi({ fotograflar })).renk, 'turuncu', fotograflar.join(','));
  }
});

test('Kural 7: tarif uzman onayı işaretlenmeden açılmaz', () => {
  assert.equal(tarifAcikMi(yenenOnayli, false), false);
  assert.equal(tarifAcikMi(yenenOnayli, undefined), false);
  assert.equal(tarifAcikMi(yenenOnayli, 'evet'), false);
  assert.equal(tarifAcikMi(yenenOnayli, true), true);
});

test('Kural 7: zehirli veya onaysız türün tarifi hiç açılmaz', () => {
  assert.equal(tarifAcikMi(zehirli, true), false);
  assert.equal(tarifAcikMi({ ad: 'Test', zehirlilik: 'yenen', mikologOnayi: false }, true), false);
  assert.equal(tarifAcikMi({ ad: 'Test' }, true), false);
});

test('Kural 8: yenen türün zehirli benzeri ve farkı olmalı', () => {
  assert.notDeepEqual(turSayfasiHatalari({ ...yenenOnayli }), []);
  assert.notDeepEqual(turSayfasiHatalari({ ...yenenOnayli, zehirliBenzerler: [{ ad: 'Z' }] }), []);
  assert.deepEqual(
    turSayfasiHatalari({ ...yenenOnayli, zehirliBenzerler: [{ ad: 'Z', fark: 'Ayak dibinde torba var.' }] }),
    [],
  );
});

test('Kural 9: Acil butonu ana içeriğin dışında, her ekranda', () => {
  const html = oku('index.html').replace(/<!--[\s\S]*?-->/g, '');
  const mainBaslangic = html.indexOf('<main');
  const acilButon = html.indexOf('id="acil-buton"');
  assert.ok(acilButon > 0 && acilButon < mainBaslangic, 'acil-buton <main> öncesinde olmalı');
});

test('Kural 9: Acil ekranı 114, 112, belirtiler ve "parçasını sakla" uyarısını içerir', () => {
  const html = oku('index.html');
  assert.match(html, /href="tel:114"/);
  assert.match(html, /href="tel:112"/);
  assert.match(html, /id="belirtiler"/);
  assert.match(html, /parçasını sakla/i);
});

test('Kural 9: Acil bilgisi çevrimdışı önbellekte', () => {
  const sw = oku('sw.js');
  for (const dosya of uygulamaDosyalari().filter((d) => d !== 'sw.js')) {
    assert.ok(sw.includes(`'./${dosya}'`), `${dosya} sw.js DOSYALAR listesinde olmalı`);
  }
});

test('Kural 10: pişirme kuralı olmayan tarif geçersiz', () => {
  assert.notDeepEqual(tarifHatalari({}), []);
  assert.notDeepEqual(tarifHatalari({ pisirmeKurali: '   ' }), []);
  assert.deepEqual(tarifHatalari({ pisirmeKurali: 'En az 15 dakika pişir.' }), []);
});

test('Kural 10: her tarifte ilk kez uyarısı gösterilir', () => {
  const uyarilar = tarifUyarilari({ pisirmeKurali: 'En az 15 dakika pişir.' });
  assert.ok(uyarilar.includes(ILK_KEZ_UYARISI));
  assert.match(ILK_KEZ_UYARISI, /az miktar/);
  assert.match(ILK_KEZ_UYARISI, /örneği.*sakla/);
});

test('Kural 11: eğitim ve feragat olmadan tanımlama açılmaz', () => {
  assert.equal(tanimlamaAcilabilirMi(undefined), false);
  assert.equal(tanimlamaAcilabilirMi({ egitimTamam: true }), false);
  assert.equal(tanimlamaAcilabilirMi({ feragatOnay: true }), false);
  assert.equal(tanimlamaAcilabilirMi({ egitimTamam: 'true', feragatOnay: true }), false);
  assert.equal(tanimlamaAcilabilirMi({ egitimTamam: true, feragatOnay: true }), true);
});

const dogruCevaplar = () => SORULAR.map((s) => s.secenekler.findIndex((c) => c.dogru));
const hepsiIsaretli = () => FERAGAT_MADDELERI.map(() => true);

test('Kural 11: eğitim, bütün sorular doğru ve feragat tam işaretliyse biter', () => {
  assert.equal(egitimTamamlanabilirMi(SORULAR, dogruCevaplar(), FERAGAT_MADDELERI, hepsiIsaretli()), true);
});

test('Kural 11: tek bir yanlış veya cevapsız soru eğitimi bitirmez', () => {
  for (let i = 0; i < SORULAR.length; i++) {
    const yanlis = dogruCevaplar();
    yanlis[i] = SORULAR[i].secenekler.findIndex((c) => !c.dogru);
    assert.equal(egitimTamamlanabilirMi(SORULAR, yanlis, FERAGAT_MADDELERI, hepsiIsaretli()), false, `soru ${i}`);
    const cevapsiz = dogruCevaplar();
    cevapsiz[i] = undefined;
    assert.equal(egitimTamamlanabilirMi(SORULAR, cevapsiz, FERAGAT_MADDELERI, hepsiIsaretli()), false, `soru ${i}`);
  }
});

test('Kural 11: feragatin işaretlenmemiş tek maddesi eğitimi bitirmez', () => {
  for (let i = 0; i < FERAGAT_MADDELERI.length; i++) {
    const isaretler = hepsiIsaretli();
    isaretler[i] = false;
    assert.equal(egitimTamamlanabilirMi(SORULAR, dogruCevaplar(), FERAGAT_MADDELERI, isaretler), false, `madde ${i}`);
  }
  assert.equal(egitimTamamlanabilirMi(SORULAR, dogruCevaplar(), FERAGAT_MADDELERI, undefined), false);
  assert.equal(egitimTamamlanabilirMi([], [], [], []), false);
});

test('Kural 11: her eğitim sorusunun tek doğru cevabı var', () => {
  for (const soru of SORULAR) {
    assert.equal(soru.secenekler.filter((c) => c.dogru).length, 1, soru.soru);
    assert.ok(soru.secenekler.length >= 2, soru.soru);
  }
});

test('Kural 11: eğitim temel güvenlik derslerini içerir', () => {
  const metin = DERSLER.flatMap((d) => [d.baslik, ...d.paragraflar]).join(' ');
  assert.match(metin, /uzman/);
  assert.match(metin, /Bilmiyorum/);
  assert.match(metin, /ikiye kes/);
  assert.match(metin, /toprağı açarak/);
  assert.match(metin, /114/);
  assert.match(metin, /112/);
  assert.match(metin, /parçasını sakla/);
  assert.ok(DERSLER.some((d) => d.renkler), 'üç renk dersi olmalı');
});

test('Kural 11: feragat taslak olarak işaretli (avukat yazacak)', () => {
  assert.match(FERAGAT_TASLAK_NOTU, /Taslak/);
  assert.match(FERAGAT_TASLAK_NOTU, /avukat/);
  assert.ok(FERAGAT_MADDELERI.some((m) => /uzman/.test(m)));
});

// Kural 12: dış adrese yalnızca şu dosyalar ve yalnızca şu adresler (Metin'in kararları, 2026-10-24 ve 2026-10-26):
// - js/yagmur.js: Open-Meteo (yazılan yer adı ve yuvarlanmış koordinat).
// - js/harita.js: Mantar ara haritası (OpenFreeMap) ve yükseklik parçaları; konum gönderilmez.
// - sw.js: yalnızca bu harita adreslerini cihazdaki önbelleğe yönlendirir, kendisi istek başlatmaz.
const DIS_ISTEK_DOSYASI = 'js/yagmur.js';
const IZINLI_ADRESLER = ['https://api.open-meteo.com/', 'https://geocoding-api.open-meteo.com/'];
const HARITA_ADRESLERI = ['https://tiles.openfreemap.org/', 'https://s3.amazonaws.com/elevation-tiles-prod/'];
const DIS_ADRES_IZINLERI = {
  [DIS_ISTEK_DOSYASI]: IZINLI_ADRESLER,
  'js/harita.js': HARITA_ADRESLERI,
  'sw.js': HARITA_ADRESLERI,
};

test('Kural 12: konum varsayılan olarak paylaşılmaz ve dışarı veri gönderilmez', () => {
  assert.equal(KONUM_VARSAYILAN.paylas, false);
  for (const dosya of uygulamaDosyalari()) {
    const icerik = oku(dosya);
    assert.doesNotMatch(icerik, /sendBeacon|XMLHttpRequest|WebSocket/, dosya);
    const adresler = icerik.match(/https?:\/\/[^\s'"`]+/g) ?? [];
    const izinli = DIS_ADRES_IZINLERI[dosya] ?? [];
    for (const adres of adresler) {
      assert.ok(izinli.some((i) => adres.startsWith(i)), `${dosya}: izinsiz dış adres ${adres}`);
    }
  }
});

test('Kural 12: sesli yönlendirme yalnızca telefondaki yerel sesi kullanır, pusula hiçbir yere bir şey göndermez', () => {
  assert.match(oku('js/ses.js'), /localService/);
  for (const dosya of ['js/ses.js', 'js/pusula.js']) assert.doesNotMatch(oku(dosya), /fetch\(|geolocation/, dosya);
});

test('Kural 12: harita dosyası konum okumaz ve yalnızca harita parçalarını ister', () => {
  const icerik = oku('js/harita.js');
  assert.doesNotMatch(icerik, /geolocation|getCurrentPosition|watchPosition|open-meteo/);
});

test('kaynak gösterme ve telif notu her ekranda görünür', () => {
  const html = oku('index.html').replace(/<!--[\s\S]*?-->/g, '');
  assert.match(html, /Open-Meteo/);
  assert.match(html, /GeoNames/);
  assert.match(html, /CC BY 4\.0/);
  assert.match(html, /© \d{4} .+ Tüm hakları saklıdır/);
});

// Kural 12 (Metin'in kararları, 2026-10-26): cihaz konumu yalnızca js/yagmur.js'te okunur.
// Tek seferlik okuma (cihazKonumu) bir düğmeyle; canlı izleme (konumuIzle) yalnızca Mantar ara ekranında,
// "Konumumu göster"e dokununca başlar ve ekrandan çıkınca durur.
test('Kural 12: cihaz konumu yalnızca js/yagmur.js içinde okunur', () => {
  for (const dosya of uygulamaDosyalari()) {
    if (dosya === DIS_ISTEK_DOSYASI) continue;
    assert.doesNotMatch(oku(dosya), /geolocation|getCurrentPosition|watchPosition/, dosya);
  }
  const yagmur = oku(DIS_ISTEK_DOSYASI);
  assert.equal(yagmur.match(/watchPosition/g)?.length, 1, 'canlı izleme tek yerde');
  assert.match(yagmur, /clearWatch/, 'canlı izleme durdurulabilmeli');
});

test('Kural 12: canlı konum yalnızca Mantar ara ekranında açılır ve ekrandan çıkınca kapanır', () => {
  const uygulama = oku('js/uygulama.js');
  assert.match(uygulama, /if \(secili === 'mantar-ara'\) mantarAraAc\(\);\s*else mantarAraKapat\(\);/);
  const ara = oku('js/mantarAra.js');
  assert.equal(ara.match(/konumuIzle\(/g)?.length, 1, 'izleme tek bir düğmeden başlar');
  assert.match(ara, /export function mantarAraKapat\(\) \{\s*ara\.izlemeyiDurdur\?\.\(\);/);
});

test('Kural 12: radar hava servisine yalnızca yuvarlanmış koordinat gönderir', () => {
  const adres = new URL(cokluHavaAdresi([{ enlem: 40.98765, boylam: 29.12345 }, { enlem: 41.0049, boylam: 39.7178 }]));
  assert.equal(adres.searchParams.get('latitude'), '41,41');
  assert.equal(adres.searchParams.get('longitude'), '29.1,39.7');
  assert.ok(IZINLI_ADRESLER.some((izinli) => adres.href.startsWith(izinli)));
});

test('Kural 3: kırmızı sonuçta yenen tür "muhtemelen" diye öne çıkarılmaz', () => {
  assert.equal(muhtemelTurOneCikabilirMi('kirmizi', { zehirlilik: 'yenen' }), false);
  assert.equal(muhtemelTurOneCikabilirMi('kirmizi', { zehirlilik: 'olumcul' }), true);
  assert.equal(muhtemelTurOneCikabilirMi('turuncu', { zehirlilik: 'yenen' }), true);
  assert.match(oku('js/tanimla.js'), /muhtemelTurOneCikabilirMi\(sonuc\.renk, enBenzer\)/);
});

test('Kural 13: genç mantarın kesitinde taslak varsa ölümcül olabilir', () => {
  const sonuc = degerlendir(temizGirdi({ cevaplar: { genc: 'evet', kesitteTaslak: 'evet' } }));
  assert.equal(sonuc.renk, 'kirmizi');
  assert.equal(sonuc.mesaj, OLUMCUL_MESAJ);
});

test('Kural 13: genç mantar kesilmediyse veya emin değilse turuncu', () => {
  for (const kesitteTaslak of [undefined, BILMIYORUM]) {
    const sonuc = degerlendir(temizGirdi({ cevaplar: { genc: 'evet', kesitteTaslak } }));
    assert.equal(sonuc.renk, 'turuncu', String(kesitteTaslak));
  }
  const kesildi = degerlendir(temizGirdi({ cevaplar: { genc: 'evet', kesitteTaslak: 'hayir' } }));
  assert.equal(kesildi.renk, 'sari');
});

test('Kural 14: uygulama hiçbir yerde tadına bakmayı önermez', () => {
  for (const dosya of uygulamaDosyalari()) {
    assert.doesNotMatch(oku(dosya), /tad[ıi]na bak|tat(ma|arak|ın)\b|tükür|çiğne/i, dosya);
  }
});
