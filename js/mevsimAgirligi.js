// Fotoğraf tahminine mevsim bilgisi (Metin'in onayı, 2026-10-27: "mantıklıysa ve işleyişi bozmayacaksa ekle").
// Her türün aylara göre görülme oranı veri/mevsim.json'dadır (GBIF insan gözlemleri; Türkiye ve iklimce yakın ülkeler;
// scripts/mevsim-getir.js). O ay az görülen tür, fotoğraf tahmininde en fazla beşte birine kadar geri itilir.
// Hiçbir tür elenmez ve sonucun rengi değişmez (kural 3): yalnızca tahminin sırası etkilenir.
// Ölçüm (2026-10-27, ayı bilinen 359 saklanan fotoğraf): 1. sırada %65 → %67, ilk 3'te %83 → %84.
export const MEVSIM_TABANI = 0.2;
// Kaydı az olan türlerde (ör. trüfler, keme) takvim güvenilmez; ağırlık uygulanmaz.
export const EN_AZ_KAYIT = 50;

export function mevsimAgirligi(turMevsimi, ay) {
  if (!turMevsimi?.aylar || turMevsimi.kayit < EN_AZ_KAYIT) return 1;
  return MEVSIM_TABANI + (1 - MEVSIM_TABANI) * turMevsimi.aylar[ay];
}

// benzerlikler: { türId: 0–1, toplamı 1 }; mevsim: veri/mevsim.json → turler; ay: 0 (Ocak) – 11 (Aralık).
export function mevsimeGoreAgirlikla(benzerlikler, mevsim, ay) {
  const agirlikli = Object.entries(benzerlikler).map(([id, p]) => [id, p * mevsimAgirligi(mevsim?.[id], ay)]);
  const toplam = agirlikli.reduce((t, [, p]) => t + p, 0);
  if (!toplam) return benzerlikler;
  return Object.fromEntries(agirlikli.map(([id, p]) => [id, p / toplam]));
}

let mevsimSozu = null;
export function mevsimiYukle() {
  mevsimSozu ??= fetch('./veri/mevsim.json')
    .then((y) => y.json())
    .then((v) => v.turler ?? {})
    .catch(() => {
      mevsimSozu = null;
      return {};
    });
  return mevsimSozu;
}
