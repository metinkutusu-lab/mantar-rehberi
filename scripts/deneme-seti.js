// Fotoğraf kıyası için sabit deneme seti (2026-10-27): eğitimden tamamen ayrı tutulan fotoğraflar. Yeni eğitilen ayırıcı
// hep bu setle ölçülür; haftalık otomatik güncelleme de yalnızca bu sette eskisinden kötü değilse yayınlanır.
// Bir kerelik çalıştırılır: o güne kadarki ölçümde saklanan fotoğraflar (her türün eğitim fotoğraflarının her 7'sinden
// biri, en az 2) fotograflar/deneme/<id>/ altına taşınır; kaynakları fotograflar/deneme-kaynaklar.json'a yazılır.
// iNaturalist'ten yeniden indirmede bu gözlemler atlanır (scripts/inat-getir.js).
// Kullanım: node scripts/deneme-seti.js   (fotograflar/deneme/ zaten varsa hiçbir şey yapmaz)
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DENEME = path.join(KOK, 'fotograflar', 'deneme');
if (existsSync(DENEME)) {
  console.log('Deneme seti zaten var; dokunulmadı.');
  process.exit(0);
}
const oku = (d) => JSON.parse(readFileSync(path.join(KOK, d), 'utf8'));
const turler = oku('veri/turler.json').turler;
const referans = oku('fotograflar/referans-kaynaklar.json');
const inat = oku('fotograflar/inat-kaynaklar.json');
const dosyalar = (klasor) => {
  const tam = path.join(KOK, klasor);
  return existsSync(tam) ? readdirSync(tam).filter((d) => /^\d+\.jpe?g$/i.test(d)).sort().map((d) => `${klasor}/${d}`) : [];
};

const kaynaklar = {};
for (const t of turler) {
  const ekler = [...dosyalar(`fotograflar/referans/${t.id}`), ...dosyalar(`fotograflar/inat/${t.id}`)];
  const secilen = ekler.filter((_, i) => i % 7 === 3);
  const liste = secilen.length >= 2 ? secilen : ekler.slice(-2);
  if (!liste.length) continue;
  mkdirSync(path.join(DENEME, t.id), { recursive: true });
  kaynaklar[t.id] = liste.map((eski, i) => {
    const ad = path.basename(eski);
    const yeni = `${String(i + 1).padStart(2, '0')}.jpg`;
    copyFileSync(path.join(KOK, eski), path.join(DENEME, t.id, yeni));
    const commons = eski.includes('/referans/');
    const k = (commons ? referans : inat)[t.id]?.find((x) => x.dosya === ad) ?? {};
    // Commons fotoğrafı eğitim klasöründen çıkarılır (yeniden indirilmez); iNaturalist klasörü yeniden indirilirken atlanır.
    if (commons) {
      rmSync(path.join(KOK, eski));
      referans[t.id] = referans[t.id].filter((x) => x.dosya !== ad);
    }
    return { dosya: yeni, kaynak: commons ? 'commons' : 'inaturalist', commons: k.commons, gozlem: k.gozlem, cekan: k.cekan, lisans: k.lisans };
  });
}
writeFileSync(path.join(KOK, 'fotograflar', 'deneme-kaynaklar.json'), `${JSON.stringify(kaynaklar, null, 1)}\n`);
writeFileSync(path.join(KOK, 'fotograflar', 'referans-kaynaklar.json'), `${JSON.stringify(referans, null, 1)}\n`);
console.log(`Deneme seti: ${Object.values(kaynaklar).flat().length} fotoğraf, ${Object.keys(kaynaklar).length} tür`);
