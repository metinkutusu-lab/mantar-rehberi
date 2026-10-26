// Mantar ara haritasının dış istekleri (Metin'in kararı, 2026-10-26: harita ve canlı konum onaylandı).
// Bu dosya yalnızca iki adrese istek yapar; testler bunu denetler (kural 12):
// - Harita: OpenFreeMap (OpenStreetMap verisi). Ücretsiz, anahtarsız, ticari kullanıma izinli; atıf zorunlu.
//   İnternetsiz kullanım için bir seferde en fazla 3.000 parça indirilebilir.
// - Yükseklik: Terrain Tiles (AWS açık veri; SRTM, EU-DEM, ETOPO1). Yamaç yönü ve eğim telefonda hesaplanır.
// Sunuculara konum gönderilmez; yalnızca bakılan bölgenin harita parçaları istenir (yaklaşık bölge belli olur).
// İndirilen parçalar sw.js'teki harita önbelleğine yazılır; internet yokken oradan okunur.

export const HARITA_STILI = 'https://tiles.openfreemap.org/styles/liberty';
export const YUKSEKLIK_PARCALARI = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const HARITA_ATFI = 'Yükseklik: Terrain Tiles (SRTM: USGS; EU-DEM: Copernicus; ETOPO1: NOAA)';
export const YUKSEKLIK_YAKINLIGI = 12; // ~30 m çözünürlük
const AZAMI_INDIRME = 3000; // OpenFreeMap kuralı
const PARCA = 256;

// --- Web Mercator dönüşümleri (piksel: yakınlık z'deki dünya pikseli) ---

export function pikseleCevir(enlem, boylam, z) {
  const olcek = PARCA * 2 ** z;
  const sin = Math.sin((enlem * Math.PI) / 180);
  return {
    x: ((boylam + 180) / 360) * olcek,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * olcek,
  };
}

export function konumaCevir(x, y, z) {
  const olcek = PARCA * 2 ** z;
  const n = Math.PI - (2 * Math.PI * y) / olcek;
  return { enlem: (180 / Math.PI) * Math.atan(Math.sinh(n)), boylam: (x / olcek) * 360 - 180 };
}

// Bir pikselin metre boyu.
export function pikselMetre(enlem, z) {
  return (156543.03392 * Math.cos((enlem * Math.PI) / 180)) / 2 ** z;
}

// Bir merkezin çevresindeki (yaricap metre) bölgeyi kaplayan parçalar.
export function bolgeParcalari(enlem, boylam, yaricap, z) {
  const m = pikseleCevir(enlem, boylam, z);
  const r = yaricap / pikselMetre(enlem, z);
  const parcalar = [];
  const son = 2 ** z - 1;
  for (let x = Math.max(0, Math.floor((m.x - r) / PARCA)); x <= Math.min(son, Math.floor((m.x + r) / PARCA)); x++) {
    for (let y = Math.max(0, Math.floor((m.y - r) / PARCA)); y <= Math.min(son, Math.floor((m.y + r) / PARCA)); y++) {
      parcalar.push({ z, x, y });
    }
  }
  return parcalar;
}

const parcaAdresi = (sablon, { z, x, y }) => sablon.replace('{z}', z).replace('{x}', x).replace('{y}', y);

// --- Yükseklik ---

// Bir yükseklik parçasını (terrarium PNG) metre dizisine çevirir. Hata durumunda null.
async function yukseklikParcasi(p) {
  try {
    const yanit = await fetch(parcaAdresi(YUKSEKLIK_PARCALARI, p));
    if (!yanit.ok) return null;
    const resim = await createImageBitmap(await yanit.blob());
    const tuval = new OffscreenCanvas(PARCA, PARCA);
    const c = tuval.getContext('2d', { willReadFrequently: true });
    c.drawImage(resim, 0, 0);
    const d = c.getImageData(0, 0, PARCA, PARCA).data;
    const metre = new Float32Array(PARCA * PARCA);
    for (let i = 0; i < metre.length; i++) metre[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    return metre;
  } catch {
    return null;
  }
}

// Merkezin çevresindeki yükseklik ızgarası (YUKSEKLIK_YAKINLIGI'nda, bir piksel = bir hücre).
// Sonuç: { yukseklikler, genislik, yukseklik, sol, ust, hucre } ya da { hata: 'baglanti' }.
export async function yukseklikIzgarasi(enlem, boylam, yaricap) {
  const z = YUKSEKLIK_YAKINLIGI;
  const m = pikseleCevir(enlem, boylam, z);
  const r = Math.ceil(yaricap / pikselMetre(enlem, z)) + 1;
  const sol = Math.floor(m.x) - r;
  const ust = Math.floor(m.y) - r;
  const genislik = 2 * r + 1;
  const yukseklik = 2 * r + 1;
  const parcalar = bolgeParcalari(enlem, boylam, yaricap + 2 * pikselMetre(enlem, z), z);
  const veriler = await Promise.all(parcalar.map(yukseklikParcasi));
  if (veriler.some((v) => !v)) return { hata: 'baglanti' };
  const yukseklikler = new Float32Array(genislik * yukseklik);
  parcalar.forEach((p, k) => {
    for (let py = 0; py < PARCA; py++) {
      const gy = p.y * PARCA + py - ust;
      if (gy < 0 || gy >= yukseklik) continue;
      for (let px = 0; px < PARCA; px++) {
        const gx = p.x * PARCA + px - sol;
        if (gx < 0 || gx >= genislik) continue;
        yukseklikler[gy * genislik + gx] = veriler[k][py * PARCA + px];
      }
    }
  });
  return { yukseklikler, genislik, yukseklik, sol, ust, hucre: pikselMetre(enlem, z) };
}

// --- İnternetsiz kullanım için bölge indirme ---

// sw.js ile aynı ad: mantar-rehberi:<adres>:harita
export async function haritaOnbellegi() {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return null;
  const kayit = await navigator.serviceWorker.getRegistration();
  return kayit ? caches.open(`mantar-rehberi:${kayit.scope}:harita`) : null;
}

// Harita stilinin kullandığı yazı tipleri, simge dosyaları ve parçalar dahil bölgeyi indirir.
// ilerleme(tamam, toplam) çağrılır. Sonuç { tamam, toplam } ya da { hata }.
export async function bolgeyiIndir(enlem, boylam, yaricap, ilerleme = () => {}) {
  const onbellek = await haritaOnbellegi();
  if (!onbellek) return { hata: 'desteklenmiyor' };
  try {
    const stil = await (await fetch(HARITA_STILI)).json();
    const adresler = new Set([HARITA_STILI]);
    // Simgeler (1x ve 2x).
    for (const s of [].concat(stil.sprite ?? []).map((s) => (typeof s === 'string' ? s : s.url))) {
      for (const ek of ['.json', '.png', '@2x.json', '@2x.png']) adresler.add(s + ek);
    }
    // Yazı tipleri: Türkçe harfler 0–511 aralığında.
    const yazilar = new Set();
    for (const katman of stil.layers) {
      const tip = katman.layout?.['text-font'];
      if (Array.isArray(tip) && tip.every((t) => typeof t === 'string')) yazilar.add(tip.join(','));
    }
    for (const y of yazilar) for (const aralik of ['0-255', '256-511']) adresler.add(stil.glyphs.replace('{fontstack}', encodeURIComponent(y)).replace('{range}', aralik));
    // Vektör harita parçaları.
    for (const kaynak of Object.values(stil.sources)) {
      if (kaynak.type !== 'vector' || !kaynak.url) continue;
      adresler.add(kaynak.url);
      const tj = await (await fetch(kaynak.url)).json();
      for (let z = 10; z <= Math.min(14, tj.maxzoom ?? 14); z++) {
        for (const p of bolgeParcalari(enlem, boylam, yaricap * 1.3, z)) adresler.add(parcaAdresi(tj.tiles[0], p));
      }
    }
    // Yükseklik parçaları (gölgelendirme ve hesap için).
    for (let z = 10; z <= YUKSEKLIK_YAKINLIGI; z++) {
      for (const p of bolgeParcalari(enlem, boylam, yaricap * 1.3, z)) adresler.add(parcaAdresi(YUKSEKLIK_PARCALARI, p));
    }
    const liste = [...adresler].slice(0, AZAMI_INDIRME);
    let tamam = 0;
    // OpenFreeMap kuralı: en fazla 4 istek aynı anda.
    const sira = [...liste];
    const isci = async () => {
      while (sira.length) {
        const adres = sira.shift();
        const yanit = await fetch(adres);
        if (yanit.ok) await onbellek.put(adres, yanit);
        tamam++;
        ilerleme(tamam, liste.length);
      }
    };
    await Promise.all([isci(), isci(), isci(), isci()]);
    return { tamam, toplam: liste.length };
  } catch {
    return { hata: 'baglanti' };
  }
}
