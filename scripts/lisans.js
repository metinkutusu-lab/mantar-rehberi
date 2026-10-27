// Fotoğraf kıyasının eğitiminde kullanılabilecek lisanslar (2026-10-27): yalnızca CC0, kamu malı ve CC BY.
// "Aynı lisansla paylaş" (CC BY-SA) şartının eğitilen dosyaya geçip geçmeyeceği hukuken belirsiz; ticari kullanımda soru
// çıkmasın diye eğitime alınmaz. NC (ticari olmayan) ve ND (değiştirilemez) hiç alınmaz. Lisansı bilinmeyen alınmaz.
// (Ansiklopedide gösterilen CC BY-SA fotoğraflar çekenin adıyla gösterildiği için lisansa uygundur; bu kural yalnızca eğitim için.)
export function egitimeUygunLisans(lisans) {
  const l = String(lisans ?? '').toLowerCase().trim();
  if (!l || /(^|[\s-])(sa|nc|nd)(\b|-)|share|non-?commercial|no-?deriv/.test(l)) return false;
  return /^cc0|public domain|^pd\b|^cc[ -]by(\b|-|\s)/.test(l);
}
