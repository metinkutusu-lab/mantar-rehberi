// Ansiklopedi fotoğraflarını bulur: her türün İngilizce Vikipedi maddesindeki ana fotoğrafı ve
// Wikimedia Commons'taki lisans bilgisi. Yalnızca ticari kullanıma izin veren lisanslar kabul edilir.
// Çıktı: fotograflar/ham/<id>.jpg (küçültülmemiş) ve fotograflar/bilgi.json (çeken, lisans, dosya adı).
// Kullanım: node scripts/fotograflari-getir.js   (internet gerekir; uygulamanın parçası değildir)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HAM = path.join(KOK, 'fotograflar', 'ham');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };

// Tür kimliği → Vikipedi maddesi (bilimsel ad)
const MADDELER = {
  koygocuren: 'Amanita phalloides',
  'ak-koygocuren': 'Amanita virosa',
  panter: 'Amanita pantherina',
  sinek: 'Amanita muscaria',
  yumurta: 'Amanita caesarea',
  'kucuk-semsiye': 'Lepiota brunneoincarnata',
  'buyuk-semsiye': 'Macrolepiota procera',
  galerina: 'Galerina marginata',
  cortinarius: 'Cortinarius orellanus',
  inocybe: 'Inocybe erubescens',
  kuzugobegi: 'Morchella esculenta',
  'sahte-kuzugobegi': 'Gyromitra esculenta',
  horozmantari: 'Cantharellus cibarius',
  zeytin: 'Omphalotus olearius',
  kanlica: 'Lactarius deliciosus',
  'tuylu-sut': 'Lactarius torminosus',
  'ayi-mantari': 'Boletus edulis',
  seytan: 'Rubroboletus satanas',
  cayir: 'Agaricus campestris',
  'sariya-boyanan': 'Agaricus xanthodermus',
  entoloma: 'Entoloma sinuatum',
  istiridye: 'Pleurotus ostreatus',
  'kukurt-basli': 'Hypholoma fasciculare',
  tavuk: 'Laetiporus sulphureus',
  puf: 'Lycoperdon perlatum',
  'sahte-puf': 'Scleroderma citrinum',
  // 2026-10-26: Mantar ara için eklenen gözde türler (TASLAK)
  'kara-truf': 'Tuber aestivum',
  'beyaz-truf': 'Tuber magnatum',
  keme: 'Desert truffle',
  casir: 'Pleurotus eryngii',
  mayis: 'Calocybe gambosa',
  'mor-kadife': 'Clitocybe nuda',
  ballica: 'Armillaria mellea',
  'sahte-truf': 'Choiromyces meandriformis',
  // 2026-10-27: kanlıcanın beyaz sütlü benzerleri (Metin'in isteği; TASLAK)
  'ak-tuylu-sut': 'Lactarius pubescens',
  'sararan-sut': 'Lactarius chrysorrheus',
  'kusakli-sut': 'Lactarius zonarius',
  // 2026-10-27: diğer yenen türlerin zehirli benzerleri (TASLAK)
  'sahte-horoz': 'Hygrophoropsis aurantiaca',
  terleme: 'Clitocybe rivulosa',
  yuksuk: 'Verpa bohemica',
  'aci-corek': 'Caloboletus calopus',
};

// Commons'ta makine tarafından okunamayan çeken adları, dosya sayfalarından elle okundu (26 Ekim 2026).
// Yazarı hiç belirtilmemiş dosyalarda lisansın izin verdiği gibi kaynak (Commons) gösterilir.
const CEKAN_DUZELTMELERI = {
  cortinarius: 'Michaelll (İngilizce Vikipedi)',
  entoloma: 'Archenzo',
  seytan: 'Archenzo',
  istiridye: 'Jean-Pol Grandmont',
  cayir: 'Mushroom Observer (görsel 694)',
  'sahte-kuzugobegi': 'Wikimedia Commons katkıcıları',
  horozmantari: 'Wikimedia Commons katkıcıları',
  kanlica: 'Wikimedia Commons katkıcıları',
  'ak-koygocuren': 'Ben DeRoy',
  'kucuk-semsiye': 'Strobilomyces',
  mayis: 'Strobilomyces',
  'mor-kadife': 'Jimmie Veitch (Mushroom Observer)',
};

// Ticari kullanıma izin veren lisanslar (NC ve ND içerenler reddedilir).
function lisansUygunMu(lisans) {
  const l = lisans.toLowerCase();
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv/.test(l)) return false;
  return /^cc0|public domain|^pd|^cc by(-sa)? \d/.test(l);
}

const yaziya = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function json(url) {
  const yanit = await fetch(url, ISTEK);
  if (!yanit.ok) throw new Error(`${yanit.status} ${url}`);
  return yanit.json();
}

async function anaFotograf(madde) {
  const p = new URLSearchParams({ action: 'query', titles: madde, prop: 'pageimages', piprop: 'name', redirects: '1', format: 'json' });
  const veri = await json(`https://en.wikipedia.org/w/api.php?${p}`);
  const sayfa = Object.values(veri.query.pages)[0];
  return sayfa.pageimage ?? null;
}

async function dosyaBilgisi(dosya) {
  const p = new URLSearchParams({
    action: 'query', titles: `File:${dosya}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '900', format: 'json',
  });
  const veri = await json(`https://commons.wikimedia.org/w/api.php?${p}`);
  const sayfa = Object.values(veri.query.pages)[0];
  const bilgi = sayfa.imageinfo?.[0];
  if (!bilgi) return null;
  const m = bilgi.extmetadata ?? {};
  // Çeken adı: önce "Attribution" (yazarın istediği atıf), sonra "Artist", sonra "Credit".
  const cekan = [m.Attribution?.value, m.Artist?.value, m.Credit?.value].map(yaziya).find((s) => s && !/^no machine-readable|see below|ci-dessous/i.test(s));
  return {
    kucukAdres: bilgi.thumburl ?? bilgi.url,
    lisans: yaziya(m.LicenseShortName?.value),
    cekan: cekan ?? '',
  };
}

// İsteğe bağlı: yalnızca verilen türleri yeniden getir (ör. node scripts/fotograflari-getir.js seytan puf).
const BILGI_DOSYASI = path.join(KOK, 'fotograflar', 'bilgi.json');
const istenen = process.argv.slice(2);
mkdirSync(HAM, { recursive: true });
const sonuc = istenen.length && existsSync(BILGI_DOSYASI) ? JSON.parse(readFileSync(BILGI_DOSYASI, 'utf8')) : {};
const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));
for (const [id, madde] of Object.entries(MADDELER).filter(([id]) => !istenen.length || istenen.includes(id))) {
  await bekle(1500); // Wikimedia sunucularını yormamak için
  try {
    const dosya = await anaFotograf(madde);
    if (!dosya) { console.log(`${id}: ana fotoğraf yok`); continue; }
    const bilgi = await dosyaBilgisi(dosya);
    if (!bilgi) { console.log(`${id}: dosya bilgisi yok (${dosya})`); continue; }
    const uygun = lisansUygunMu(bilgi.lisans);
    console.log(`${id}: ${dosya} | ${bilgi.lisans} | ${bilgi.cekan.slice(0, 60) || '(çeken adı yok)'} | ${uygun ? 'UYGUN' : 'RED'}`);
    if (!uygun) continue;
    const resim = await fetch(bilgi.kucukAdres, ISTEK);
    if (!resim.ok) { console.log(`${id}: indirilemedi ${resim.status}`); continue; }
    writeFileSync(path.join(HAM, `${id}.jpg`), Buffer.from(await resim.arrayBuffer()));
    sonuc[id] = { madde, dosya, lisans: bilgi.lisans, cekan: bilgi.cekan };
  } catch (hata) {
    console.log(`${id}: HATA ${hata.message}`);
  }
}
for (const [id, cekan] of Object.entries(CEKAN_DUZELTMELERI)) {
  if (sonuc[id]) sonuc[id].cekan = cekan;
}
writeFileSync(BILGI_DOSYASI, JSON.stringify(sonuc, null, 2));
console.log(`\n${Object.keys(sonuc).length} / ${Object.keys(MADDELER).length} fotoğraf alındı.`);
