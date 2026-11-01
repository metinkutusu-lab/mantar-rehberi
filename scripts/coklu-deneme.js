// Üç fotoğrafla tanımayı ölçmek için deneme seti (Metin'in isteği, 2026-11-01: "üç fotoğrafı çekince değerlendirsin").
// Her türden, eğitimde ve tek fotoğraflı deneme setinde olmayan, en az 3 fotoğraflı iNaturalist (araştırma düzeyi, GBIF
// üzerinden) gözlemleri; her gözlemin ilk 3 fotoğrafı (çoğunlukla üstten, alttan, yandan). Yalnızca CC0 ve CC BY.
// Fotoğraflar fotograflar/coklu-deneme/<tür-id>/<gözlem>-<sıra>.jpg (depoya girmez), kaynaklar
// fotograflar/coklu-deneme-kaynaklar.json. Eğitime hiç girmez.
// Kullanım: node scripts/coklu-deneme.js   (internet gerekir)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KATEGORILER } from './tur-adlari.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };
const GOZLEM_SAYISI = Number(process.env.MANTAR_GOZLEM ?? 6);
const INAT_VERI_KUMESI = '50c9509d-22c7-4a22-a47d-8c48425ef4a7';
const INAT_ADLARI = { 'mor-kadife': ['Collybia nuda'] };
const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));
const lisansKodu = (adres) => (/publicdomain\/zero/.test(adres) ? 'cc0' : /licenses\/by-sa\//.test(adres) ? 'cc-by-sa' : /licenses\/by\//.test(adres) ? 'cc-by' : null);
const oku = (d) => (existsSync(path.join(KOK, d)) ? JSON.parse(readFileSync(path.join(KOK, d), 'utf8')) : {});

const atla = new Set();
for (const liste of Object.values(oku('fotograflar/inat-kaynaklar.json'))) for (const k of liste) atla.add(k.gozlem);
for (const liste of Object.values(oku('fotograflar/deneme-kaynaklar.json'))) for (const k of liste) if (k.gozlem) atla.add(k.gozlem);

const KAYNAK = 'fotograflar/coklu-deneme-kaynaklar.json';
const kaynaklar = oku(KAYNAK);
const turler = JSON.parse(readFileSync(path.join(KOK, 'veri/turler.json'), 'utf8')).turler;

for (const tur of turler) {
  const adlar = INAT_ADLARI[tur.id] ?? (KATEGORILER[tur.id] ?? []).filter((a) => a.includes(' '));
  const liste = kaynaklar[tur.id] ?? [];
  for (const ad of adlar) {
    for (let sayfa = 0; liste.length < GOZLEM_SAYISI && sayfa < 5; sayfa++) {
      await bekle(1100);
      const p = new URLSearchParams({ scientificName: ad, datasetKey: INAT_VERI_KUMESI, mediaType: 'StillImage', limit: '100', offset: String(sayfa * 100) });
      p.append('license', 'CC0_1_0');
      p.append('license', 'CC_BY_4_0');
      const yanit = await fetch(`https://api.gbif.org/v1/occurrence/search?${p}`, ISTEK).catch(() => null);
      if (!yanit?.ok) break;
      const veri = await yanit.json();
      for (const g of veri.results) {
        if (liste.length >= GOZLEM_SAYISI) break;
        if (atla.has(g.occurrenceID) || liste.some((k) => k.gozlem === g.occurrenceID)) continue;
        const fotolar = (g.media ?? []).filter((m) => m.type === 'StillImage' && m.identifier && ['cc0', 'cc-by'].includes(lisansKodu(m.license ?? ''))).slice(0, 3);
        if (fotolar.length < 3) continue;
        const no = g.occurrenceID.split('/').pop();
        mkdirSync(path.join(KOK, 'fotograflar', 'coklu-deneme', tur.id), { recursive: true });
        const dosyalar = [];
        for (const [i, f] of fotolar.entries()) {
          const dosya = `${no}-${i + 1}.jpg`;
          const r = await fetch(f.identifier.replace('/original.', '/small.'), ISTEK).catch(() => null);
          if (!r?.ok) break;
          writeFileSync(path.join(KOK, 'fotograflar', 'coklu-deneme', tur.id, dosya), Buffer.from(await r.arrayBuffer()));
          dosyalar.push(dosya);
        }
        if (dosyalar.length < 3) continue;
        liste.push({ gozlem: g.occurrenceID, dosyalar, cekan: `(c) ${fotolar[0].rightsHolder ?? fotolar[0].creator ?? g.recordedBy}`, lisans: lisansKodu(fotolar[0].license) });
      }
      if (veri.endOfRecords) break;
    }
  }
  kaynaklar[tur.id] = liste;
  writeFileSync(path.join(KOK, KAYNAK), `${JSON.stringify(kaynaklar, null, 1)}\n`);
  console.log(`${tur.id}: ${liste.length} gözlem`);
}
