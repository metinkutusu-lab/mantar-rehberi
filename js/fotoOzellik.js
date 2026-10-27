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

// Uzman gibi: fotoğraf bir türü güçlü tahmin ediyorsa (≥ 0,6; ölçümde bu eşiğin üstünde %84 doğru) o türün bilinen
// özellikleri önerilir (Metin, 2026-10-27: "kanlıcanın şapkası turuncu; kahverengi demişsin", "şapkanın altı resimde belli").
// Şapka rengi: türün baskın rengi (verideki ilk renk); şapkanın altı: türde tek bir yapı yazıyorsa o.
export const TUR_ESIGI = 0.6;
// Şapkanın altı için tür kesin olmasa da yeter: olası türlerin toplam puanının %80'i aynı yapıdaysa (ör. hepsi solungaçlı) önerilir.
export const ALT_YAPI_TOPLAM_ESIGI = 0.8;
export function turdenOner(benzerlikler, turler) {
  const oneri = {};
  const toplam = {};
  for (const [id, p] of Object.entries(benzerlikler)) {
    const yapi = turler.find((t) => t.id === id)?.ozellikler?.altYapi;
    if (yapi?.length === 1) toplam[yapi[0]] = (toplam[yapi[0]] ?? 0) + p;
  }
  const [yapi] = Object.entries(toplam).sort((a, b) => b[1] - a[1]);
  if (yapi && yapi[1] >= ALT_YAPI_TOPLAM_ESIGI) oneri.altYapi = yapi[0];
  const [enIyi] = Object.entries(benzerlikler).sort((a, b) => b[1] - a[1]);
  const renkler = enIyi && enIyi[1] >= TUR_ESIGI ? turler.find((t) => t.id === enIyi[0])?.ozellikler?.sapkaRengi : null;
  if (renkler?.length) oneri.sapkaRengi = [renkler[0]];
  return oneri;
}

// Önerileri birleştirir: tür tahmini güçlüyse şapka rengi türün rengidir (renk ayırıcısının o türde de olan rengi eklenir);
// şapkanın altında önce şapka altı ayırıcısı, yoksa türün bilgisi.
export function onerileriBirlestir({ renkler = [], alt = null, tur = {}, turRenkleri = [] }) {
  const oneri = {};
  if (tur.sapkaRengi) oneri.sapkaRengi = [...tur.sapkaRengi, ...renkler.filter((r) => turRenkleri.includes(r) && !tur.sapkaRengi.includes(r))].slice(0, 2);
  else if (renkler.length) oneri.sapkaRengi = renkler;
  if (alt ?? tur.altYapi) oneri.altYapi = alt ?? tur.altYapi;
  return oneri;
}

// Şapkanın altı: ayırıcı (vendor/mobilenet/alt-yapi.json; gözle seçilmiş 77 fotoğraf) emin olduğunda (≥ 0,8).
// Ölçüm (görmediği 20 fotoğraf): genelde %65 doğru, 0,8'i geçenlerin (11) hepsi doğru. Örnek az; eşik bu yüzden yüksek.
export const ALT_YAPI_ESIGI = 0.8;
export function altYapiyiOner(iz, ayirici) {
  const [enIyi] = Object.entries(benzerlikleriHesapla([iz], ayirici)).sort((a, b) => b[1] - a[1]);
  return enIyi && enIyi[1] >= ALT_YAPI_ESIGI ? enIyi[0] : null;
}
