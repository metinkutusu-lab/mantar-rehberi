// Haftalık otomatik güncelleme (Metin'in isteği, 2026-10-27: "uygulama kendini yenilesin, geliştirsin; diğer uygulamalara
// yetişsin"). GitHub'da haftada bir çalışır (.github/workflows/haftalik-egitim.yml); elle de çalıştırılabilir.
// 1. Eksik kaynak fotoğrafları (Commons referansları, sabit deneme seti) listedeki dosyalarla indirilir.
// 2. iNaturalist'e eklenen yeni, doğrulanmış CC0/CC BY fotoğraflar indirilir (tür başına 300'e kadar).
// 3. Tür ayırıcısı sabit deneme setiyle ölçülür. Eskisinden (vendor/mobilenet/olcum.json) kötüyse hiçbir şey değişmez.
// 4. İyiyse ayırıcı ve şapka rengi ayırıcısı yeniden eğitilir, ölçüm kaydedilir. Telefonlar yeni dosyayı arkada alır.
// Yeni tür eklemez: tür listesi ve zehirlilik yalnızca Metin ve mikolog onayıyla değişir (veri/turler.json).
// Kullanım: node scripts/haftalik-guncelle.js
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OLCUM = path.join(KOK, 'vendor', 'mobilenet', 'olcum.json');
const OZET = path.join(tmpdir(), `mantar-olcum-${process.pid}.json`);
// Ölçümdeki küçük oynamalar yüzünden iyi bir güncelleme durmasın: yarım puandan fazla kötüleşme yayını durdurur.
const TOLERANS = 0.005;

const calistir = (betik, argumanlar = [], env = {}) =>
  execFileSync(process.execPath, [path.join(KOK, 'scripts', betik), ...argumanlar], { stdio: 'inherit', env: { ...process.env, ...env } });

calistir('kaynaklari-indir.js');
calistir('inat-getir.js');
calistir('tur-ayirici-egit.js', ['--olc'], { MANTAR_OLCUM_OZETI: OZET });

const yeni = JSON.parse(readFileSync(OZET, 'utf8'));
const eski = existsSync(OLCUM) ? JSON.parse(readFileSync(OLCUM, 'utf8')) : null;
const yuzde = (x) => `%${(x * 100).toFixed(1)}`;
console.log(`Yeni ölçüm (${yeni.fotograf} deneme fotoğrafı): 1. sırada ${yuzde(yeni.ilk1)}, ilk 3'te ${yuzde(yeni.ilk3)}`);
if (eski) console.log(`Yayındaki: 1. sırada ${yuzde(eski.ilk1)}, ilk 3'te ${yuzde(eski.ilk3)}`);

const dahaKotu = eski && (yeni.ilk1 < eski.ilk1 - TOLERANS || yeni.ilk3 < eski.ilk3 - TOLERANS);
if (dahaKotu) {
  console.log('Yeni ayırıcı yayındakinden kötü: yayınlanmayacak.');
  process.exit(0);
}
calistir('tur-ayirici-egit.js');
calistir('tur-ayirici-egit.js', ['--renk']);
writeFileSync(OLCUM, `${JSON.stringify({
  _aciklama: 'Yayındaki tür ayırıcısının sabit deneme setindeki (fotograflar/deneme/) ölçümü. scripts/haftalik-guncelle.js yazar; yeni ayırıcı bundan kötüyse yayınlanmaz.',
  tarih: new Date().toISOString().slice(0, 10),
  ...yeni,
}, null, 1)}\n`);
console.log('Yeni ayırıcı yazıldı.');
