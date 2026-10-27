// Fotoğraftan özellik önerileri (Metin'in isteği, 2026-10-27: "renkler, şapkanın altı fotoğrafta görünüyor; bana sorma,
// kendin bul; yanlışsa ben düzeltirim"). Uygulama şapka rengini ve şapkanın altını (solungaç, gözenek…) fotoğraftan bulur
// ve önerir; kullanıcı tek dokunuşla onaylar ya da düzeltir.
// Güvenlik (js/kurallar.js → makineOnerisiKabulMu): öneri, kullanıcı "Doğru" demeden cevap sayılmaz ve ölümcül bir türü
// eleyecekse hiç yapılmaz. Solungaç rengi önerilmez: piksel renginden denendi, köygöçürenin beyaz solungaçlarını
// "kahverengi" sandı (29 fotoğrafta 10 doğru). Fotoğraf hiçbir yere gitmez; hesap telefonda yapılır (kural 12).
import { benzerlikleriHesapla } from './fotoTanima.js';

// Şapka renkleri: şapka rengi ayırıcısıyla (vendor/mobilenet/sapka-rengi.json; ~5.800 tür fotoğrafından öğrenildi).
// Ölçüm (2026-10-27, görmediği 415 fotoğraf): baskın renk %69 doğru; en üstteki ≥ 0,8 iken %84. Bu yüzden en üstteki renk
// ancak 0,5'i geçerse önerilir; ikinci renk 0,25'i geçerse eklenir. (Piksel renkleri gölge ve toprak yüzünden %61 tutuyordu.)
export function sapkaRenkleriniOner(iz, ayirici) {
  const sirali = Object.entries(benzerlikleriHesapla([iz], ayirici)).sort((a, b) => b[1] - a[1]);
  if (!sirali.length || sirali[0][1] < 0.5) return [];
  return sirali.filter(([, p], i) => i === 0 || p >= 0.25).slice(0, 2).map(([renk]) => renk);
}

// Şapkanın altı: ayırıcı (vendor/mobilenet/alt-yapi.json; gözle seçilmiş 77 fotoğraf) emin olduğunda (≥ 0,8).
// Ölçüm (görmediği 20 fotoğraf): genelde %65 doğru, 0,8'i geçenlerin (11) hepsi doğru. Örnek az; eşik bu yüzden yüksek.
export const ALT_YAPI_ESIGI = 0.8;
export function altYapiyiOner(iz, ayirici) {
  const [enIyi] = Object.entries(benzerlikleriHesapla([iz], ayirici)).sort((a, b) => b[1] - a[1]);
  return enIyi && enIyi[1] >= ALT_YAPI_ESIGI ? enIyi[0] : null;
}
