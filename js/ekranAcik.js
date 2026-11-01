// Ekranı açık tut (Metin'in isteği, 2026-11-01: "dağda kullanırken ekran kararıyor, kilitleniyor").
// Tarayıcının "Screen Wake Lock" özelliği: yalnızca Mantar ara haritası açıkken ve fotoğrafla tanımlama sürerken ekran
// kararmaz. Başka ekranlarda, uygulamadan çıkınca ya da telefon yan tuşla kilitlenince normal davranır (pil boşa gitmesin).
// Telefon desteklemiyorsa hiçbir şey olmaz; uygulama yine çalışır.
const nedenler = new Set(); // 'harita', 'tanimlama'
let kilit = null;
let istekte = false; // aynı anda iki istek gidip biri bırakılmadan kalmasın

async function iste() {
  if (kilit || istekte || !nedenler.size || document.visibilityState !== 'visible' || !navigator.wakeLock) return;
  istekte = true;
  try {
    kilit = await navigator.wakeLock.request('screen');
    kilit.addEventListener('release', () => { kilit = null; });
    // İstek sürerken neden kalktıysa hemen bırakılır.
    if (!nedenler.size) birak();
  } catch {
    kilit = null; // pil tasarrufu modu vb.: tarayıcı izin vermedi
  } finally {
    istekte = false;
  }
}

function birak() {
  kilit?.release().catch(() => {});
  kilit = null;
}

export function ekraniAcikTut(neden, acik) {
  if (acik) nedenler.add(neden);
  else nedenler.delete(neden);
  if (nedenler.size) iste();
  else birak();
}

// Uygulama arka plana gidince tarayıcı kilidi kendisi bırakır; öne gelince yeniden istenir.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') iste();
});

export const ekranAcikMi = () => Boolean(kilit);
