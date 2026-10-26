// Fotoğraf tanıma modelini hazırlar (bir kez çalıştırılır; çıktısı vendor/mobilenet/ altına yazılır).
// Kaynak: Google'ın MobileNet V2 (1.0, 224) TensorFlow.js modeli, Apache 2.0 lisanslı:
//   storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/ (model.json ve group1-shard1of4..4of4)
// Yapılanlar: 1000 sınıflı son katman atılır (uygulama yalnızca fotoğrafın "parmak izini" kullanır),
// ağırlıklar 8 bite sıkıştırılır. 14 MB → yaklaşık 2,3 MB; telefonun indirmesi gereken veri azalır.
// Kullanım: node scripts/model-hazirla.js <indirilen-model-klasoru>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const kaynak = process.argv[2];
if (!kaynak) {
  console.error('Kullanım: node scripts/model-hazirla.js <indirilen-model-klasoru>');
  process.exit(1);
}

const model = JSON.parse(readFileSync(path.join(kaynak, 'model.json'), 'utf8'));
const grup = model.weightsManifest[0];
const ham = Buffer.concat(grup.paths.map((p) => readFileSync(path.join(kaynak, p))));

// Parmak izi, son katmanın ortalaması (AvgPool, 1280 sayı). Ondan sonraki sınıflandırma katmanı atılır.
export const CIKIS = 'module_apply_default/MobilenetV2/Logits/AvgPool';
const atilacakMi = (ad) => ad.includes('/Logits/') && !ad.endsWith('/Logits/AvgPool');
model.modelTopology.node = model.modelTopology.node.filter((n) => !atilacakMi(n.name));

const agirliklar = [];
const parcalar = [];
let konum = 0;
for (const agirlik of grup.weights) {
  if (agirlik.dtype !== 'float32') throw new Error(`Beklenmeyen tür: ${agirlik.name} ${agirlik.dtype}`);
  const adet = agirlik.shape.reduce((a, b) => a * b, 1);
  const degerler = new Float32Array(ham.buffer.slice(ham.byteOffset + konum, ham.byteOffset + konum + adet * 4));
  konum += adet * 4;
  if (atilacakMi(agirlik.name)) continue;
  let enAz = Infinity;
  let enCok = -Infinity;
  for (const d of degerler) {
    if (d < enAz) enAz = d;
    if (d > enCok) enCok = d;
  }
  const olcek = enCok > enAz ? (enCok - enAz) / 255 : 1;
  const sikisik = new Uint8Array(adet);
  for (let i = 0; i < adet; i++) sikisik[i] = Math.round((degerler[i] - enAz) / olcek);
  parcalar.push(Buffer.from(sikisik.buffer));
  agirliklar.push({ ...agirlik, quantization: { dtype: 'uint8', min: enAz, scale: olcek } });
}
if (konum !== ham.length) throw new Error('Ağırlık dosyası beklenen boyutta değil.');

const hedef = path.join(KOK, 'vendor', 'mobilenet');
mkdirSync(hedef, { recursive: true });
writeFileSync(path.join(hedef, 'agirliklar.bin'), Buffer.concat(parcalar));
model.weightsManifest = [{ paths: ['agirliklar.bin'], weights: agirliklar }];
writeFileSync(path.join(hedef, 'model.json'), JSON.stringify(model));
console.log(`Hazır: ${agirliklar.length} ağırlık, ${(Buffer.concat(parcalar).length / 1e6).toFixed(2)} MB`);
