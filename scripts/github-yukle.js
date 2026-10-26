// Proje klasörünü GitHub'daki metinkutusu-lab/mantar-rehberi deposuna gönderir.
// Depo uygulamanın asıl kaynak kodudur; GitHub Pages doğrudan buradan yayınlar.
// Kullanım: npm run yukle -- "Değişikliğin kısa açıklaması"
// (npm run yukle önce testleri çalıştırır; testler geçmezse hiçbir şey gönderilmez.)
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GIT = existsSync('C:\\Program Files\\Git\\cmd\\git.exe') ? 'C:\\Program Files\\Git\\cmd\\git.exe' : 'git';
// Windows'ta npm, boşluklu açıklamadaki karakterlerin önüne ^ koyabiliyor; onları temizle.
const aciklama = process.argv.slice(2).join(' ').replace(/\^(.)/g, '$1').replace(/\^$/, '').trim() || 'Uygulama güncellemesi';

function git(...argumanlar) {
  return execFileSync(GIT, ['-C', KOK, ...argumanlar], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

git('add', '-A');
if (git('status', '--porcelain')) {
  git('commit', '-m', aciklama, '-m', 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>');
}

// Başka bir yerden (ör. claude.ai'deki proje) main'e gönderilen değişiklikler varsa önce onları al.
// Çakışma olursa durur; çakışmayı Claude elle çözer, kimsenin işi ezilmez.
try {
  git('pull', '--rebase', 'origin', 'main');
} catch {
  console.error('GitHub\'daki değişikliklerle çakışma var. "git status" ile bakıp çözmek gerekiyor; hiçbir şey gönderilmedi.');
  process.exit(1);
}

const gonderilecek = git('log', 'origin/main..HEAD', '--format=%h %s');
if (!gonderilecek) {
  console.log('GitHub zaten güncel; gönderilecek değişiklik yok.');
  process.exit(0);
}
// İlk gönderimde Git, tarayıcıda GitHub girişi ister; sonrakilerde hatırlar.
execFileSync(GIT, ['-C', KOK, 'push', 'origin', 'main'], { stdio: 'inherit' });
console.log(`GitHub'a gönderildi:\n${gonderilecek}`);
