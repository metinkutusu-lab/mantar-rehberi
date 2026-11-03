// Eğitim gözlemlerinin öteki fotoğrafları (Metin, 2026-11-03: "daha doğru tahmin için geliştir"). Kullanıcı mantarı üstten,
// alttan ve yandan çeker; tür ayırıcısı ise her gözlemin yalnızca ilk fotoğrafıyla (çoğu zaman üstten/yandan) öğreniyordu.
// Bu betik fotograflar/inat-kaynaklar.json'daki gözlemlerin 2. ve 3. fotoğraflarını indirir (çoğu zaman alttan, yandan ya da
// kesit). Yalnızca CC0 ve CC BY; 240 piksel; fotograflar/inat-ek/<tür-id>/<sıra>-<n>.jpg (depoya girmez).
// Kaynak, çeken ve lisans fotograflar/inat-ek-kaynaklar.json'a yazılır (depoda).
// Kullanım: node scripts/inat-ek-getir.js [tür-id ...]   (internet gerekir; uygulamanın parçası değildir)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { KATEGORILER } from './tur-adlari.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };
const INAT_VERI_KUMESI = '50c9509d-22c7-4a22-a47d-8c48425ef4a7';
const EK_FOTO = Number(process.env.MANTAR_EK_FOTO ?? 2);
const GOZLEM_BASINA = Number(process.env.MANTAR_EK_GOZLEM ?? 120);
const INAT_ADLARI = { 'mor-kadife': ['Collybia nuda'] };
const bekle = (ms) => new Promise((c) => setTimeout(c, ms));
const lisansKodu = (a) => (/publicdomain\/zero/.test(a) ? 'cc0' : /licenses\/by\//.test(a) ? 'cc-by' : null);

async function getir(adres, deneme = 0) {
  try {
    const y = await fetch(adres, ISTEK);
    if (y.status === 429 || y.status >= 500) throw new Error(String(y.status));
    return y;
  } catch (h) {
    if (deneme >= 4) throw h;
    await bekle(3000 * (deneme + 1));
    return getir(adres, deneme + 1);
  }
}

// Türün aramalarından gözlem kimliği → fotoğraf listesi (inat-getir.js ile aynı arama).
async function fotoListesi(id, istenen) {
  const sonuc = new Map();
  const adlar = INAT_ADLARI[id] ?? KATEGORILER[id].filter((a) => a.includes(' '));
  for (const ad of adlar) {
    for (const alan of ['scientificName', 'verbatimScientificName']) {
      for (let sayfa = 0; sayfa < 12 && sonuc.size < istenen.size; sayfa++) {
        const p = new URLSearchParams({ [alan]: ad, datasetKey: INAT_VERI_KUMESI, mediaType: 'StillImage', limit: '100', offset: String(sayfa * 100) });
        p.append('license', 'CC0_1_0');
        p.append('license', 'CC_BY_4_0');
        const v = await (await getir(`https://api.gbif.org/v1/occurrence/search?${p}`)).json();
        for (const g of v.results) if (istenen.has(g.occurrenceID)) sonuc.set(g.occurrenceID, g);
        if (v.endOfRecords) break;
        await bekle(400);
      }
    }
  }
  return sonuc;
}

const kaynaklar = JSON.parse(readFileSync(path.join(KOK, 'fotograflar', 'inat-kaynaklar.json'), 'utf8'));
const EK_DOSYASI = path.join(KOK, 'fotograflar', 'inat-ek-kaynaklar.json');
const ek = existsSync(EK_DOSYASI) ? JSON.parse(readFileSync(EK_DOSYASI, 'utf8')) : {};
const istenenTurler = process.argv.slice(2);
const turler = (istenenTurler.length ? istenenTurler : Object.keys(kaynaklar)).filter((id) => KATEGORILER[id]);

async function turuIndir(id) {
  // Dosyaları duruyorsa yeniden indirilmez (GitHub'da kaynak listesi depodan gelir ama fotoğraflar yoktur).
  if (ek[id]?.length && ek[id].every((k) => existsSync(path.join(KOK, 'fotograflar', 'inat-ek', id, k.dosya)))) return console.log(`${id}: zaten var (${ek[id].length})`);
  const liste = (kaynaklar[id] ?? []).slice(0, GOZLEM_BASINA);
  const gozlemler = await fotoListesi(id, new Set(liste.map((k) => k.gozlem)));
  const klasor = path.join(KOK, 'fotograflar', 'inat-ek', id);
  mkdirSync(klasor, { recursive: true });
  const yeni = [];
  for (const k of liste) {
    const g = gozlemler.get(k.gozlem);
    if (!g) continue;
    const fotolar = (g.media ?? []).filter((m) => m.type === 'StillImage' && m.identifier).slice(1, 1 + EK_FOTO);
    for (const [n, f] of fotolar.entries()) {
      const lisans = lisansKodu(f.license ?? '');
      if (!lisans) continue;
      try {
        const y = await getir(f.identifier.replace('/original.', '/small.'));
        if (!y.ok) continue;
        const dosya = `${k.dosya.replace(/\.jpe?g$/i, '')}-${n + 2}.jpg`;
        writeFileSync(path.join(klasor, dosya), Buffer.from(await y.arrayBuffer()));
        yeni.push({ dosya, gozlem: k.gozlem, cekan: `(c) ${f.rightsHolder ?? f.creator ?? g.recordedBy}`, lisans });
      } catch {}
      await bekle(100);
    }
  }
  ek[id] = yeni;
  writeFileSync(EK_DOSYASI, `${JSON.stringify(ek, null, 1)}\n`);
  console.log(`${id}: ${yeni.length} ek fotoğraf`);
}

// Aynı anda 4 tür.
const kuyruk = [...turler];
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let id; (id = kuyruk.shift());) {
    try { await turuIndir(id); } catch (h) { console.log(`${id}: HATA ${h.message}`); }
  }
}));
