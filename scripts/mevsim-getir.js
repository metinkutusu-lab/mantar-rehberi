// Türlerin aylara göre görülme takvimi (2026-10-27, Metin'in onayı: "mantıklıysa ve işleyişi bozmayacaksa ekle").
// GBIF'teki insan gözlemlerinden, Türkiye'ye iklimce yakın ülkelerin (Türkiye, Balkanlar, Akdeniz, Kafkasya) kayıtları
// ay ay sayılır. Türkiye'den tek başına kayıt çok az olduğu için (türe göre 5–70) bölgeye göre ayrım yapılmaz.
// Çıktı veri/mevsim.json: { türId: [Oca…Ara oranları, en yoğun ay = 1] }. Fotoğraf tahmini bu oranla hafifçe ağırlıklanır
// (js/mevsimAgirligi.js); hiçbir tür elenmez (kural 3).
// Kullanım: node scripts/mevsim-getir.js   (internet gerekir; uygulamanın parçası değildir)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { KATEGORILER } from './tur-adlari.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };
const ULKELER = ['TR', 'GR', 'BG', 'CY', 'MK', 'AL', 'RS', 'ME', 'BA', 'HR', 'SI', 'RO', 'IT', 'ES', 'PT', 'FR', 'GE', 'AM', 'AZ'];
const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));
// iNaturalist yeni adları (GBIF bunları eski adla eşleştiremiyor; scripts/inat-getir.js ile aynı).
const EK_ADLAR = { 'mor-kadife': ['Collybia nuda'] };

async function aylar(ad, alan) {
  const p = new URLSearchParams({ [alan]: ad, basisOfRecord: 'HUMAN_OBSERVATION', limit: '0', facet: 'month', facetLimit: '12' });
  for (const u of ULKELER) p.append('country', u);
  await bekle(800);
  const veri = await (await fetch(`https://api.gbif.org/v1/occurrence/search?${p}`, ISTEK)).json();
  const sayilar = new Array(12).fill(0);
  for (const c of veri.facets?.[0]?.counts ?? []) sayilar[Number(c.name) - 1] += c.count;
  return sayilar;
}

const sonuc = {};
for (const [id, adlar] of Object.entries(KATEGORILER)) {
  const toplam = new Array(12).fill(0);
  for (const ad of [...adlar.filter((a) => a.includes(' ')), ...(EK_ADLAR[id] ?? [])]) {
    const a = await aylar(ad, 'scientificName');
    const b = a.some(Boolean) ? a : await aylar(ad, 'verbatimScientificName');
    b.forEach((n, i) => { toplam[i] += n; });
  }
  const adet = toplam.reduce((x, y) => x + y, 0);
  // Komşu aylarla yumuşatılır (bir ay erken/geç çıkan mantar cezalanmasın), en yoğun ay 1 olur.
  const yumusak = toplam.map((n, i) => (toplam[(i + 11) % 12] + 2 * n + toplam[(i + 1) % 12]) / 4);
  const enCok = Math.max(...yumusak);
  sonuc[id] = { kayit: adet, aylar: enCok > 0 ? yumusak.map((n) => Number((n / enCok).toFixed(3))) : null };
  console.log(`${id}: ${adet} kayıt`);
}
writeFileSync(path.join(KOK, 'veri', 'mevsim.json'), `${JSON.stringify({
  _aciklama: 'Türlerin aylara göre görülme oranı (Ocak–Aralık; en yoğun ay 1). Kaynak: GBIF insan gözlemleri, Türkiye ve iklimce yakın ülkeler. scripts/mevsim-getir.js üretir; elle düzenleme. Yalnızca fotoğraf tahminini hafifçe ağırlıklar, hiçbir türü elemez.',
  turler: sonuc,
}, null, 1)}\n`);
