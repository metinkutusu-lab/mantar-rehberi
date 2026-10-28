// İnce ayarlı aday modeli yayındaki modelle adil biçimde kıyaslar ve yalnızca daha iyiyse uygulamaya geçirir
// (Metin'in onayı, 2026-10-27: "daha iyi çıkarsa yükle"). GitHub'da .github/workflows/ince-ayar.yml çalıştırır.
// Adil kıyas: iki model de aynı eğitim fotoğraflarıyla (CC0/CC BY) tür ayırıcısını öğrenir ve aynı sabit deneme setiyle
// (fotograflar/deneme/, eğitime hiç girmemiş 457 fotoğraf) ölçülür.
// Geçiş: js/modelAyari.js ve sw.js aday klasörü gösterir, sürüm artar; tür, şapka rengi ve şapka altı ayırıcıları aday
// modelin izleriyle yeniden öğrenilir. Aday daha iyi değilse hiçbir şey değişmez ve aday klasörü silinir.
// Kullanım: node scripts/ince-ayar-dene.js vendor/mantar-modeli-1
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADAY = process.argv[2]?.replace(/^\.?\/*/, '').replace(/\/?$/, '/');
if (!ADAY?.startsWith('vendor/mantar-modeli')) throw new Error('Aday model klasörü vendor/mantar-modeli… olmalı');
const ADAY_ORTAMI = { MANTAR_MODEL_KLASORU: ADAY, MANTAR_MODEL_CIKIS: '' };

const egit = (argumanlar, ortam = {}) =>
  execFileSync(process.execPath, [path.join(KOK, 'scripts', 'tur-ayirici-egit.js'), ...argumanlar], { stdio: 'inherit', env: { ...process.env, ...ortam } });
function olc(ortam) {
  const dosya = path.join(tmpdir(), `mantar-olcum-${Math.random().toString(36).slice(2)}.json`);
  // Kıyas hızlı olsun diye ek fotoğraflar tek biçimde (aynalanmadan); iki model aynı koşulda ölçülür.
  egit(['--olc'], { ...ortam, MANTAR_OLCUM_OZETI: dosya, MANTAR_TEK_BICIM: '1' });
  return JSON.parse(readFileSync(dosya, 'utf8'));
}
const yuzde = (x) => `%${(x * 100).toFixed(1)}`;

const eski = olc({});
const yeni = olc(ADAY_ORTAMI);
console.log(`Yayındaki model : 1. sırada ${yuzde(eski.ilk1)}, ilk 3'te ${yuzde(eski.ilk3)} (${eski.fotograf} deneme fotoğrafı)`);
console.log(`İnce ayarlı aday: 1. sırada ${yuzde(yeni.ilk1)}, ilk 3'te ${yuzde(yeni.ilk3)}`);

// Daha iyi sayılması için birinci sırada en az 1 puan artmalı, ilk 3 düşmemeli (ölçüm oynamasına karşı).
const dahaIyi = yeni.ilk1 >= eski.ilk1 + 0.01 && yeni.ilk3 >= eski.ilk3 - 0.002;
if (!dahaIyi) {
  console.log('Aday daha iyi değil: uygulama değişmedi.');
  rmSync(path.join(KOK, ADAY), { recursive: true, force: true });
  writeFileSync(path.join(KOK, 'ince-ayar-sonucu.txt'), `degismedi\n${JSON.stringify({ eski, yeni })}\n`);
  process.exit(0);
}

egit([], ADAY_ORTAMI);
egit(['--renk'], ADAY_ORTAMI);
egit(['--alt-yapi'], ADAY_ORTAMI);

const degistir = (dosya, eskiMetin, yeniMetin) => {
  const tam = path.join(KOK, dosya);
  const icerik = readFileSync(tam, 'utf8');
  if (!eskiMetin.test(icerik)) throw new Error(`${dosya}: değiştirilecek yer bulunamadı`);
  writeFileSync(tam, icerik.replace(eskiMetin, yeniMetin));
};
degistir('js/modelAyari.js', /klasor: '[^']*',\n {2}cikis: [^\n]*,/, `klasor: './${ADAY}',\n  cikis: null,`);
degistir('sw.js', /const AKTIF_MODEL_KLASORU = '[^']*';/, `const AKTIF_MODEL_KLASORU = '${ADAY}';`);
const surum = Number(/const SURUM = 'v(\d+)';/.exec(readFileSync(path.join(KOK, 'sw.js'), 'utf8'))[1]) + 1;
degistir('sw.js', /const SURUM = 'v\d+';/, `const SURUM = 'v${surum}';`);
degistir('js/surum.js', /SURUM = 'v\d+'/, `SURUM = 'v${surum}'`);
degistir('js/surum.js', /TARIH = '[^']*'/, `TARIH = '${new Date().toISOString().slice(0, 10)}'`);
writeFileSync(path.join(KOK, ADAY, 'olcum.json'), `${JSON.stringify({
  _aciklama: 'İnce ayarlı modelin sabit deneme setindeki ölçümü ve yayındaki modelinki (scripts/ince-ayar-dene.js).',
  tarih: new Date().toISOString().slice(0, 10),
  yeni,
  eski,
}, null, 1)}\n`);
writeFileSync(path.join(KOK, 'ince-ayar-sonucu.txt'), `gecildi v${surum}\n${JSON.stringify({ eski, yeni })}\n`);
console.log(`Aday model uygulamaya geçirildi (v${surum}).`);
