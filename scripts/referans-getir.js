// Fotoğraf kıyası için tür başına ek referans fotoğrafları (Metin'in isteği, 2026-10-26: "her türe 10–20 lisanslı fotoğraf").
// Wikimedia Commons'ta türün kategorisindeki fotoğraflardan yalnızca ticari kullanıma izin veren lisanslılar
// (CC0, kamu malı, CC BY, CC BY-SA; NC/ND asla) alınır, 480 piksel genişlikte fotograflar/referans/<tür-id>/ altına iner.
// Fotoğraflar uygulamaya ve depoya girmez (.gitignore); yalnızca parmak izleri girer (scripts/parmak-izi-uret.js).
// Her fotoğrafın kaynağı, çekeni ve lisansı fotograflar/referans-kaynaklar.json'a yazılır (depoda durur).
// Kullanım: node scripts/referans-getir.js [tür-id ...]   (internet gerekir; uygulamanın parçası değildir)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };
const API = 'https://commons.wikimedia.org/w/api.php';
const EN_COK = 20;

// Tür kimliği → Commons kategorileri (bilimsel ad). Grup türlerde birkaç kategori.
const KATEGORILER = {
  koygocuren: ['Amanita phalloides'],
  'ak-koygocuren': ['Amanita virosa', 'Amanita verna'],
  panter: ['Amanita pantherina'],
  sinek: ['Amanita muscaria'],
  yumurta: ['Amanita caesarea'],
  'kucuk-semsiye': ['Lepiota brunneoincarnata', 'Lepiota helveola', 'Lepiota subincarnata', 'Lepiota cristata'],
  'buyuk-semsiye': ['Macrolepiota procera'],
  galerina: ['Galerina marginata'],
  cortinarius: ['Cortinarius orellanus', 'Cortinarius rubellus'],
  inocybe: ['Inocybe erubescens', 'Inocybe geophylla'],
  kuzugobegi: ['Morchella esculenta', 'Morchella elata', 'Morchella importuna'],
  'sahte-kuzugobegi': ['Gyromitra esculenta'],
  horozmantari: ['Cantharellus cibarius'],
  zeytin: ['Omphalotus olearius'],
  kanlica: ['Lactarius deliciosus', 'Lactarius sanguifluus', 'Lactarius deterrimus'],
  'tuylu-sut': ['Lactarius torminosus'],
  'ayi-mantari': ['Boletus edulis', 'Boletus aereus', 'Boletus reticulatus'],
  seytan: ['Rubroboletus satanas'],
  cayir: ['Agaricus campestris'],
  'sariya-boyanan': ['Agaricus xanthodermus'],
  entoloma: ['Entoloma sinuatum'],
  istiridye: ['Pleurotus ostreatus'],
  'kukurt-basli': ['Hypholoma fasciculare'],
  tavuk: ['Laetiporus sulphureus'],
  puf: ['Lycoperdon perlatum', 'Calvatia gigantea'],
  'sahte-puf': ['Scleroderma citrinum'],
  'beyaz-truf': ['Tuber magnatum'],
  'kara-truf': ['Tuber aestivum', 'Tuber melanosporum'],
  keme: ['Terfezia', 'Terfezia boudieri', 'Terfezia claveryi'],
  casir: ['Pleurotus eryngii'],
  mayis: ['Calocybe gambosa'],
  'mor-kadife': ['Lepista nuda', 'Clitocybe nuda'],
  ballica: ['Armillaria mellea'],
  'sahte-truf': ['Choiromyces meandriformis', 'Choiromyces venosus'],
};

// Mantarın kendisi olmayan görseller (mikroskop, spor, çizim, pul, harita…) adından elenir.
const ISTENMEYEN = /micro|mikro|spore|spora|sporen|cystid|basid|ascus|asci\b|hyph|\bsem\b|illustr|drawing|zeichnung|plate|tafel|planche|tav\.|stamp|briefmarke|timbre|map|karte|herbar|exsic|cartoon|logo|diagram|icon|dried|getrocknet|séché|soup|dish|cooked|recipe|market|markt|mercado/i;

function lisansUygunMu(lisans) {
  const l = lisans.toLowerCase();
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv/.test(l)) return false;
  return /^cc0|public domain|^pd|^cc by(-sa)? \d/.test(l);
}

const yaziya = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));

async function json(parametreler) {
  for (let deneme = 0; deneme < 5; deneme++) {
    await bekle(1200 + deneme * 10000);
    const yanit = await fetch(`${API}?${new URLSearchParams({ format: 'json', ...parametreler })}`, ISTEK);
    const metin = await yanit.text();
    if (metin.startsWith('{')) return JSON.parse(metin);
  }
  throw new Error('Commons yanıt vermedi');
}

async function kategoriDosyalari(kategori, derinlik = 1) {
  const veri = await json({ action: 'query', list: 'categorymembers', cmtitle: `Category:${kategori}`, cmtype: 'file|subcat', cmlimit: '200' });
  const uyeler = veri.query?.categorymembers ?? [];
  const dosyalar = uyeler.filter((u) => u.ns === 6).map((u) => u.title.replace(/^File:/, ''));
  if (derinlik > 0) {
    for (const alt of uyeler.filter((u) => u.ns === 14).slice(0, 8)) {
      dosyalar.push(...(await kategoriDosyalari(alt.title.replace(/^Category:/, ''), derinlik - 1)));
    }
  }
  return dosyalar;
}

async function bilgiler(dosyalar) {
  const sonuc = [];
  for (let i = 0; i < dosyalar.length; i += 40) {
    const veri = await json({
      action: 'query', titles: dosyalar.slice(i, i + 40).map((d) => `File:${d}`).join('|'),
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '480',
    });
    for (const s of Object.values(veri.query?.pages ?? {})) {
      const b = s.imageinfo?.[0];
      if (!b) continue;
      const m = b.extmetadata ?? {};
      const cekan = [m.Attribution?.value, m.Artist?.value].map(yaziya).find((x) => x && !/^no machine-readable/i.test(x)) ?? '';
      sonuc.push({
        dosya: s.title.replace(/^File:/, ''), adres: b.thumburl ?? b.url, mime: b.mime, genislik: b.width, yukseklik: b.height,
        lisans: yaziya(m.LicenseShortName?.value), cekan: cekan.slice(0, 120), sayfa: b.descriptionurl,
      });
    }
  }
  return sonuc;
}

// Aynı gözlemin art arda fotoğraflarından yalnızca biri alınsın diye dosya adındaki sayı kümelenir (Mushroom Observer).
const gozlemAnahtari = (ad) => ad.replace(/\d{2,}(?=\D*$)/, (n) => String(Math.floor(Number(n) / 4)));

const istenen = process.argv.slice(2);
const KAYNAK_DOSYASI = path.join(KOK, 'fotograflar', 'referans-kaynaklar.json');
const kaynaklar = existsSync(KAYNAK_DOSYASI) ? JSON.parse(readFileSync(KAYNAK_DOSYASI, 'utf8')) : {};
const turKimlikleri = istenen.length ? istenen : Object.keys(KATEGORILER);

for (const id of turKimlikleri) {
  try {
    const adlar = [...new Set((await Promise.all(KATEGORILER[id].map((k) => kategoriDosyalari(k)))).flat())]
      .filter((d) => /\.jpe?g$/i.test(d) && !ISTENMEYEN.test(d));
    const uygun = (await bilgiler(adlar))
      .filter((b) => b.mime === 'image/jpeg' && b.genislik >= 400 && b.yukseklik >= 300 && lisansUygunMu(b.lisans) && b.cekan);
    // Aynı gözlemden en fazla bir fotoğraf; sonra en fazla EN_COK.
    const gorulen = new Set();
    const secilen = uygun.filter((b) => {
      const a = gozlemAnahtari(b.dosya);
      if (gorulen.has(a)) return false;
      gorulen.add(a);
      return true;
    }).slice(0, EN_COK);

    const klasor = path.join(KOK, 'fotograflar', 'referans', id);
    rmSync(klasor, { recursive: true, force: true });
    mkdirSync(klasor, { recursive: true });
    kaynaklar[id] = [];
    let n = 0;
    for (const b of secilen) {
      await bekle(700);
      const yanit = await fetch(b.adres, ISTEK);
      if (!yanit.ok) continue;
      n++;
      const ad = `${String(n).padStart(2, '0')}.jpg`;
      writeFileSync(path.join(klasor, ad), Buffer.from(await yanit.arrayBuffer()));
      kaynaklar[id].push({ dosya: ad, commons: b.dosya, cekan: b.cekan, lisans: b.lisans });
    }
    console.log(`${id}: ${adlar.length} aday, ${uygun.length} uygun lisanslı, ${n} indirildi`);
  } catch (hata) {
    console.log(`${id}: HATA ${hata.message}`);
  }
  writeFileSync(KAYNAK_DOSYASI, `${JSON.stringify(kaynaklar, null, 1)}\n`);
}
