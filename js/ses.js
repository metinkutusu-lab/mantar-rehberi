// Sesli yönlendirme (Metin'in isteği, 2026-10-26): Mantar ara'da yön ve ipuçları telefonun kendi
// Türkçe sesiyle okunur; telefona bakmadan dinlenir. İstenince açılır, istenince kapanır (cihazda saklanır).
// Yalnızca telefondaki (yerel) sesler kullanılır: okunan yazı hiçbir sunucuya gitmez ve internetsiz çalışır.

let ses = null;

function turkceSesBul() {
  const sesler = window.speechSynthesis?.getVoices() ?? [];
  return sesler.find((s) => s.lang?.toLowerCase().startsWith('tr') && s.localService) ?? null;
}

// Sesler bazı telefonlarda geç yüklenir.
if ('speechSynthesis' in window) {
  ses = turkceSesBul();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => { ses = turkceSesBul(); });
}

// Bu telefonda Türkçe yerel ses var mı?
export function sesHazirMi() {
  ses ??= turkceSesBul();
  return Boolean(ses);
}

let sonKonusma = 0;
const EN_AZ_ARA = 8000; // ms: art arda çok konuşmasın

// metin okunur. oncelikli: araya girer (önceki yarım kalır) ve bekleme süresine takılmaz.
export function soyle(metin, { oncelikli = false } = {}) {
  if (!sesHazirMi()) return false;
  const simdi = Date.now();
  if (!oncelikli && (window.speechSynthesis.speaking || simdi - sonKonusma < EN_AZ_ARA)) return false;
  if (oncelikli) window.speechSynthesis.cancel();
  const s = new SpeechSynthesisUtterance(metin);
  s.voice = ses;
  s.lang = ses.lang;
  s.rate = 0.95;
  window.speechSynthesis.speak(s);
  sonKonusma = simdi;
  return true;
}

export function sesiKes() {
  window.speechSynthesis?.cancel();
}

// Konuşma için mesafe: "350 metre", "1,2 kilometre".
export function sesliMesafe(metre) {
  return metre < 1000
    ? `${Math.round(metre / 10) * 10} metre`
    : `${(metre / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kilometre`;
}
