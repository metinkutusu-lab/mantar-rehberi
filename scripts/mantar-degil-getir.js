// "Fotoğrafta mantar var mı?" ayırıcısı için mantar OLMAYAN fotoğraflar (Metin, 2026-11-02: "yorganı, bacağı çekince de
// şu mantar olabilir diyor; saçma"). Tür ayırıcısı her fotoğrafı 41 türden birine benzetir; bu fotoğraflarla
// "mantar değil" öğretilir (scripts/tur-ayirici-egit.js --mantar-mi).
// Kaynaklar: Wikimedia Commons kategorileri (ev eşyası, beden, giysi, yiyecek, zemin, bitki…) ve iNaturalist araştırma
// düzeyi gözlemleri (GBIF üzerinden; mantar olmayan canlılar: böcek, salyangoz, kuş, memeli, bitki, yosun…).
// Yalnızca eğitime uygun lisanslar: CC0, kamu malı, CC BY (scripts/lisans.js). Mantara çok benzeyen nesneler
// (yumurta, patates, taş, ekmek) bilerek alınmaz: trüf, keme ve puf mantarı "mantar değil" sanılmasın.
// Fotoğraflar fotograflar/mantar-degil/<grup>/ altına 240–320 piksel iner; depoya ve uygulamaya girmez (.gitignore).
// Kaynak, çeken ve lisans fotograflar/mantar-degil-kaynaklar.json'a yazılır (depoda).
// Kullanım: node scripts/mantar-degil-getir.js [grup ...]   (internet gerekir; uygulamanın parçası değildir)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { egitimeUygunLisans } from './lisans.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };
const API = 'https://commons.wikimedia.org/w/api.php';
const GRUP_BASINA = Number(process.env.MANTAR_GRUP_BASINA ?? 40);
const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));

// Commons kategorileri (grup adı → kategoriler).
const COMMONS = {
  yorgan: ['Quilts', 'Blankets', 'Bed sheets', 'Pillows', 'Beds'],
  bacak: ['Human legs', 'Knees', 'Human feet', 'Barefoot people'],
  el: ['Human hands', 'Fingers', 'Arms (anatomy)'],
  giysi: ['Jeans', 'Trousers', 'Shoes', 'Boots', 'Socks', 'Jackets', 'Hats'],
  ev: ['Carpets', 'Sofas', 'Chairs', 'Tables (furniture)', 'Kitchens', 'Floors', 'Curtains', 'Doors'],
  esya: ['Bags', 'Bottles', 'Cups', 'Mobile phones', 'Keys', 'Books', 'Knives', 'Baskets'],
  yiyecek: ['Salads', 'Pasta dishes', 'Fruit', 'Vegetables', 'Meat dishes', 'Cakes'],
  zemin: ['Soil', 'Leaf litter', 'Forest floors', 'Mud', 'Sand', 'Gravel'],
  bitki: ['Grass', 'Tree trunks', 'Bark', 'Moss', 'Ferns', 'Leaves', 'Pine cones', 'Flowers'],
  yer: ['Streets', 'Walls', 'Gardens', 'Forests', 'Meadows', 'Rooms', 'Cars', 'Buildings'],
  hayvan: ['Cats', 'Dogs', 'Chickens', 'Sheep', 'Cattle'],
  ekran: ['Screenshots', 'Computer monitors', 'Television sets', 'Paintings'],
};
// Gözle bakıldı (2026-11-02): içinde mantar olan ya da puf mantarına çok benzeyen (taş) fotoğraflar alınmaz.
const CIKARILAN = new Set(['Duke Forest chanterelles on woods floor.jpg', 'Bélmegyer, Hungary - panoramio (11).jpg', 'Bark Cabin Natural Area (11) (14444247613).jpg', '20160928Hockenheim1.jpg', '-365 Fountain leaves (28046984213).jpg']);
// iNaturalist (GBIF taksonu) grupları: mantar olmayan canlılar.
const INAT = {
  bocek: 1, // Animalia içinden böcekler aşağıda süzülür
  salyangoz: 225,
  kus: 212,
  memeli: 359,
  surungen: 358,
  bitki: 220,
  igne: 194,
  egrelti: 7228684,
  yosun: 35,
};
const INAT_SINIF = { bocek: 216 }; // Insecta (classKey)
const INAT_VERI_KUMESI = '50c9509d-22c7-4a22-a47d-8c48425ef4a7';

async function getir(adres) {
  for (let deneme = 0; ; deneme++) {
    try {
      return await fetch(adres, ISTEK);
    } catch (hata) {
      if (deneme >= 3) throw hata;
      await bekle(5000 * (deneme + 1));
    }
  }
}

const yaziya = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
async function commonsJson(parametreler) {
  for (let deneme = 0; deneme < 5; deneme++) {
    await bekle(1200 + deneme * 10000);
    const yanit = await getir(`${API}?${new URLSearchParams({ format: 'json', ...parametreler })}`);
    const metin = await yanit.text();
    if (metin.startsWith('{')) return JSON.parse(metin);
  }
  throw new Error('Commons yanıt vermedi');
}
async function kategoriDosyalari(kategori, derinlik = 1) {
  const veri = await commonsJson({ action: 'query', list: 'categorymembers', cmtitle: `Category:${kategori}`, cmtype: 'file|subcat', cmlimit: '100' });
  const uyeler = veri.query?.categorymembers ?? [];
  const dosyalar = uyeler.filter((u) => u.ns === 6).map((u) => u.title.replace(/^File:/, ''));
  if (derinlik > 0) for (const alt of uyeler.filter((u) => u.ns === 14).slice(0, 4)) dosyalar.push(...(await kategoriDosyalari(alt.title.replace(/^Category:/, ''), derinlik - 1)));
  return dosyalar;
}
async function commonsAdaylari(kategoriler, adet) {
  const adlar = [...new Set((await Promise.all(kategoriler.map((k) => kategoriDosyalari(k).catch(() => [])))).flat())]
    .filter((d) => /\.jpe?g$/i.test(d) && !/mushroom|fung|pilz|champignon|mantar/i.test(d));
  // Her kategoriden dengeli örnek: karıştırıp ilk adayları al (sabit tohum, yeniden çalıştırınca aynı sıra).
  adlar.sort((a, b) => sayiOz(a) - sayiOz(b));
  const sonuc = [];
  for (let i = 0; i < adlar.length && sonuc.length < adet; i += 40) {
    const veri = await commonsJson({ action: 'query', titles: adlar.slice(i, i + 40).map((d) => `File:${d}`).join('|'), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '320' });
    for (const s of Object.values(veri.query?.pages ?? {})) {
      const b = s.imageinfo?.[0];
      const m = b?.extmetadata ?? {};
      const lisans = yaziya(m.LicenseShortName?.value);
      const cekan = [m.Attribution?.value, m.Artist?.value].map(yaziya).find((x) => x && !/^no machine-readable/i.test(x)) ?? '';
      if (!b || b.mime !== 'image/jpeg' || b.width < 300 || !egitimeUygunLisans(lisans) || !cekan || CIKARILAN.has(s.title.replace(/^File:/, ''))) continue;
      sonuc.push({ kaynak: s.title.replace(/^File:/, ''), adres: b.thumburl ?? b.url, cekan: cekan.slice(0, 120), lisans });
    }
  }
  return sonuc.slice(0, adet);
}
// Basit sabit karıştırma (dosya adının özeti).
const sayiOz = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

const lisansKodu = (adres) => (/publicdomain\/zero/.test(adres) ? 'cc0' : /licenses\/by\//.test(adres) ? 'cc-by' : null);
async function inatAdaylari(grup, adet) {
  const sonuc = [];
  for (let sayfa = 0; sonuc.length < adet && sayfa < 6; sayfa++) {
    await bekle(1100);
    const p = new URLSearchParams({ datasetKey: INAT_VERI_KUMESI, mediaType: 'StillImage', limit: '100', offset: String(sayfa * 1000 + 300) });
    if (INAT_SINIF[grup]) p.set('classKey', String(INAT_SINIF[grup])); else p.set('taxonKey', String(INAT[grup]));
    p.append('license', 'CC0_1_0');
    p.append('license', 'CC_BY_4_0');
    const yanit = await getir(`https://api.gbif.org/v1/occurrence/search?${p}`);
    if (!yanit.ok) throw new Error(`GBIF ${yanit.status}`);
    const veri = await yanit.json();
    for (const g of veri.results) {
      if (g.kingdomKey === 5) continue; // mantar asla
      const f = g.media?.find((m) => m.type === 'StillImage' && m.identifier);
      const lisans = f && lisansKodu(f.license ?? '');
      if (!lisans || sonuc.some((s) => s.kaynak === g.occurrenceID)) continue;
      sonuc.push({ kaynak: g.occurrenceID, adres: f.identifier.replace('/original.', '/small.'), cekan: `(c) ${f.rightsHolder ?? f.creator ?? g.recordedBy}`, lisans });
      if (sonuc.length % 20 === 0) break; // aynı sayfadan fazla almasın (çeşitlilik)
    }
  }
  return sonuc.slice(0, adet);
}

const KAYNAK_DOSYASI = path.join(KOK, 'fotograflar', 'mantar-degil-kaynaklar.json');
const kaynaklar = existsSync(KAYNAK_DOSYASI) ? JSON.parse(readFileSync(KAYNAK_DOSYASI, 'utf8')) : {};
const istenen = process.argv.slice(2);
const gruplar = [...Object.keys(COMMONS).map((g) => [g, 'commons']), ...Object.keys(INAT).map((g) => [`inat-${g}`, 'inat'])]
  .filter(([g]) => !istenen.length || istenen.includes(g));

for (const [grup, kaynak] of gruplar) {
  try {
    const adaylar = kaynak === 'commons' ? await commonsAdaylari(COMMONS[grup], GRUP_BASINA) : await inatAdaylari(grup.slice(5), GRUP_BASINA);
    const klasor = path.join(KOK, 'fotograflar', 'mantar-degil', grup);
    rmSync(klasor, { recursive: true, force: true });
    mkdirSync(klasor, { recursive: true });
    kaynaklar[grup] = [];
    for (const a of adaylar) {
      await bekle(300);
      const yanit = await getir(a.adres);
      if (!yanit.ok) continue;
      const dosya = `${String(kaynaklar[grup].length + 1).padStart(3, '0')}.jpg`;
      writeFileSync(path.join(klasor, dosya), Buffer.from(await yanit.arrayBuffer()));
      kaynaklar[grup].push({ dosya, kaynak: a.kaynak, cekan: a.cekan, lisans: a.lisans });
    }
    console.log(`${grup}: ${kaynaklar[grup].length} fotoğraf`);
  } catch (hata) {
    console.log(`${grup}: HATA ${hata.message}`);
  }
  writeFileSync(KAYNAK_DOSYASI, `${JSON.stringify(kaynaklar, null, 1)}\n`);
}
