// İnce ayar için eğitim fotoğraflarının listesi (scripts/ince-ayar.py okur): her türün ansiklopedi fotoğrafı, Commons
// referansları ve iNaturalist fotoğrafları; yalnızca CC0/kamu malı/CC BY (scripts/lisans.js); sabit deneme seti hariç.
// Çıktı: fotograflar/egitim-listesi.json { siniflar: [türId…], ornekler: [{ dosya, sinif }] } (depoya girmez).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { egitimeUygunLisans } from './lisans.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (d) => (existsSync(path.join(KOK, d)) ? JSON.parse(readFileSync(path.join(KOK, d), 'utf8')) : {});
const turler = oku('veri/turler.json').turler.filter((t) => t.fotograf?.dosya);
const lisans = new Map();
for (const t of turler) lisans.set(t.fotograf.dosya, t.fotograf.lisans);
for (const [id, l] of Object.entries(oku('fotograflar/referans-kaynaklar.json'))) for (const k of l) lisans.set(`fotograflar/referans/${id}/${k.dosya}`, k.lisans);
for (const [id, l] of Object.entries(oku('fotograflar/inat-kaynaklar.json'))) for (const k of l) lisans.set(`fotograflar/inat/${id}/${k.dosya}`, k.lisans);
const dosyalar = (klasor) => {
  const tam = path.join(KOK, klasor);
  return existsSync(tam) ? readdirSync(tam).filter((d) => /^\d+\.jpe?g$/i.test(d)).sort().map((d) => `${klasor}/${d}`) : [];
};

const siniflar = turler.map((t) => t.id);
const ornekler = [];
turler.forEach((t, sinif) => {
  for (const dosya of [t.fotograf.dosya, ...dosyalar(`fotograflar/referans/${t.id}`), ...dosyalar(`fotograflar/inat/${t.id}`)]) {
    if (egitimeUygunLisans(lisans.get(dosya)) && existsSync(path.join(KOK, dosya))) ornekler.push({ dosya, sinif });
  }
});
writeFileSync(path.join(KOK, 'fotograflar', 'egitim-listesi.json'), JSON.stringify({ siniflar, ornekler }));
console.log(`Eğitim listesi: ${ornekler.length} fotoğraf, ${siniflar.length} tür`);
