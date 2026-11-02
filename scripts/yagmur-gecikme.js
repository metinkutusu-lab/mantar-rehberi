// Yağmurdan kaç gün sonra hangi mantar bulunuyor? (Metin, 2026-11-02: "kanlıca yağmurdan 1–2 günde mi, 3 günde mi, 5 günde mi
// oluşuyor; tam toplama zamanı türe göre belli olsun"). Bilimsel kaynaklarda türe göre kesin gün sayısı yok; kendi ölçümümüz:
// GBIF'teki insan gözlemleri (Türkiye ve iklimce yakın ülkeler, 2015 sonrası, koordinatlı) için o noktanın geçmiş hava verisine
// (NASA POWER, ~50 km) bakılır: son büyük yağmurdan (günde ≥ 10 mm) bu yana geçen gün ve son 7 günün ortalama sıcaklığı.
// Karşılaştırma için aynı noktada, aynı yılın ±20 gün içinden rastgele bir gün de ölçülür (yağmur zaten sık yağıyorsa
// "yağmurdan 5 gün sonra" bir şey söylemez; fark ancak rastgele günle kıyaslanınca görünür).
// Uyarı: gözlem tarihi mantarın çıktığı gün değil, birinin bulduğu gündür; sonuç yaklaşıktır.
// Çıktı notlar/yagmur-gecikme.json. Kullanım: node scripts/yagmur-gecikme.js [tür-id ...]  (internet gerekir; uygulamanın parçası değildir)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { KATEGORILER } from './tur-adlari.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };
const ULKELER = ['TR', 'GR', 'BG', 'CY', 'MK', 'AL', 'RS', 'ME', 'BA', 'HR', 'SI', 'RO', 'IT', 'ES', 'PT', 'GE'];
const GOZLEM = Number(process.env.MANTAR_GOZLEM ?? 120);
const BUYUK_YAGMUR_MM = 10;
const GERI_GUN = 45;
const bekle = (ms) => new Promise((c) => setTimeout(c, ms));
const EK_ADLAR = { 'mor-kadife': ['Collybia nuda'] };
const VARSAYILAN = ['ayi-mantari', 'kanlica', 'horozmantari', 'kuzugobegi', 'mayis', 'mor-kadife', 'cayir', 'kircil-murekkep', 'istiridye', 'buyuk-semsiye', 'sumuklu-corek', 'ballica'];

async function json(adres, deneme = 0) {
  try {
    const y = await fetch(adres, ISTEK);
    const v = await y.json();
    if (!y.ok || v.error) throw new Error(v.reason ?? y.status);
    return v;
  } catch (h) {
    if (deneme >= 5) throw h;
    await bekle(4000 * (deneme + 1));
    return json(adres, deneme + 1);
  }
}

// Bir türün koordinatlı gözlemleri (aynı gün aynı yerden bir tane).
async function gozlemler(id) {
  const sonuc = [];
  const gorulen = new Set();
  for (const ad of [...KATEGORILER[id].filter((a) => a.includes(' ')), ...(EK_ADLAR[id] ?? [])]) {
    for (let sayfa = 0; sayfa < 6 && sonuc.length < GOZLEM * 3; sayfa++) {
      const p = new URLSearchParams({ scientificName: ad, basisOfRecord: 'HUMAN_OBSERVATION', hasCoordinate: 'true', year: '2015,2025', limit: '300', offset: String(sayfa * 300) });
      for (const u of ULKELER) p.append('country', u);
      const v = await json(`https://api.gbif.org/v1/occurrence/search?${p}`);
      for (const g of v.results) {
        if (!g.eventDate || !g.decimalLatitude || (g.coordinateUncertaintyInMeters ?? 0) > 5000) continue;
        const gun = g.eventDate.slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(gun)) continue;
        const anahtar = `${gun}|${g.decimalLatitude.toFixed(2)}|${g.decimalLongitude.toFixed(2)}`;
        if (gorulen.has(anahtar)) continue;
        gorulen.add(anahtar);
        sonuc.push({ gun, enlem: g.decimalLatitude, boylam: g.decimalLongitude });
      }
      if (v.endOfRecords) break;
      await bekle(500);
    }
  }
  // Yıllara ve yerlere yayılsın diye karıştırılır (sabit sıra).
  return sonuc.sort((a, b) => ((a.enlem * 1e6 + a.boylam * 1e3) % 997) - ((b.enlem * 1e6 + b.boylam * 1e3) % 997)).slice(0, GOZLEM);
}

const gunEkle = (gun, n) => new Date(Date.parse(gun) + n * 864e5).toISOString().slice(0, 10);

// O noktada verilen günden önceki son büyük yağmur kaç gün önceydi, son 7 günün ortalama sıcaklığı ne?
function olc(gunler, yagis, sicaklik, gun) {
  const i = gunler.indexOf(gun);
  if (i < GERI_GUN) return null;
  let son = null;
  for (let k = i; k >= i - GERI_GUN; k--) if ((yagis[k] ?? 0) >= BUYUK_YAGMUR_MM) { son = i - k; break; }
  const s = sicaklik.slice(i - 6, i + 1).filter((x) => x != null);
  return { gecenGun: son, sicaklik: s.length ? s.reduce((a, b) => a + b, 0) / s.length : null };
}

const yuzdelik = (dizi, q) => { const d = [...dizi].sort((a, b) => a - b); return d.length ? d[Math.min(d.length - 1, Math.floor(q * d.length))] : null; };
function ozet(olcumler) {
  const yagmurlu = olcumler.filter((o) => o.gecenGun != null).map((o) => o.gecenGun);
  const sic = olcumler.filter((o) => o.sicaklik != null).map((o) => o.sicaklik);
  return {
    n: olcumler.length,
    yagmursuz45: olcumler.filter((o) => o.gecenGun == null).length,
    gun: { p25: yuzdelik(yagmurlu, 0.25), medyan: yuzdelik(yagmurlu, 0.5), p75: yuzdelik(yagmurlu, 0.75) },
    // Dağılım: 0–3, 4–7, 8–14, 15–21, 22–45 gün
    dilim: [[0, 3], [4, 7], [8, 14], [15, 21], [22, 45]].map(([a, b]) => yagmurlu.filter((g) => g >= a && g <= b).length),
    sicaklik: { p25: Number(yuzdelik(sic, 0.25)?.toFixed(1)), medyan: Number(yuzdelik(sic, 0.5)?.toFixed(1)), p75: Number(yuzdelik(sic, 0.75)?.toFixed(1)) },
  };
}

const CIKTI = path.join(KOK, 'notlar', 'yagmur-gecikme.json');
const sonuc = existsSync(CIKTI) ? JSON.parse(readFileSync(CIKTI, 'utf8')).turler ?? {} : {};
const istenen = process.argv.slice(2);
for (const id of istenen.length ? istenen : VARSAYILAN) {
  const liste = await gozlemler(id);
  const bulunan = [];
  const rastgele = [];
  for (const [n, g] of liste.entries()) {
    const kaydir = ((n * 37) % 41) - 20 || 7; // ±20 gün, sabit
    const ilk = gunEkle(g.gun < gunEkle(g.gun, kaydir) ? g.gun : gunEkle(g.gun, kaydir), -GERI_GUN - 1);
    const son = gunEkle(g.gun > gunEkle(g.gun, kaydir) ? g.gun : gunEkle(g.gun, kaydir), 0);
    // NASA POWER (MERRA-2, ~50 km, kamu malı). 2026-11-02'de Open-Meteo arşivi aşırı yük yüzünden yanıt vermiyordu.
    const p = new URLSearchParams({ parameters: 'PRECTOTCORR,T2M', community: 'AG', latitude: g.enlem.toFixed(3), longitude: g.boylam.toFixed(3), start: ilk.replaceAll('-', ''), end: son.replaceAll('-', ''), format: 'JSON' });
    try {
      const v = (await json(`https://power.larc.nasa.gov/api/temporal/daily/point?${p}`)).properties.parameter;
      const gunler = Object.keys(v.PRECTOTCORR).map((k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6)}`);
      const deger = (x) => (x === -999 ? null : x);
      const yagis = Object.values(v.PRECTOTCORR).map(deger);
      const sicaklik = Object.values(v.T2M).map(deger);
      const a = olc(gunler, yagis, sicaklik, g.gun);
      const b = olc(gunler, yagis, sicaklik, gunEkle(g.gun, kaydir));
      if (a && b) { bulunan.push(a); rastgele.push(b); }
    } catch {}
    await bekle(250);
  }
  sonuc[id] = { bulunan: ozet(bulunan), rastgeleGun: ozet(rastgele) };
  console.log(id, JSON.stringify(sonuc[id]));
  writeFileSync(CIKTI, `${JSON.stringify({
    _aciklama: 'Yağmurdan kaç gün sonra bulunuyor (ölçüm, yaklaşık). Kaynak: GBIF insan gözlemleri (Türkiye ve iklimce yakın ülkeler, 2015–2025) ve NASA POWER geçmiş hava verisi (MERRA-2, ~50 km, kamu malı). "bulunan": gözlem günü; "rastgeleGun": aynı yerde ±20 gün içinde rastgele bir gün (karşılaştırma). gun: son büyük yağmurdan (≥10 mm/gün) bu yana geçen gün; dilim: 0–3, 4–7, 8–14, 15–21, 22–45 gün; sicaklik: son 7 günün ortalaması. scripts/yagmur-gecikme.js üretir; elle düzenleme. TASLAK.',
    turler: sonuc,
  }, null, 1)}\n`);
}
