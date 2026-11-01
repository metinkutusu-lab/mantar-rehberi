// GEÇİCİ DENEME (Metin'in isteği, 2026-11-01: "kamerada daire belli; şapka daireyi doldurunca boyut hesaplanabilmeli").
// Daire tek başına boyutu vermez (uzaklık bilinmez); bazı Android telefonlarda Chrome kameranın odak uzaklığını söyler.
// Uzaklık + dairenin kapladığı açı → yaklaşık şapka genişliği. Bu dosya yalnızca ölçümü kamerada gösterir; tanımlamaya,
// sıralamaya ve sonuca hiçbir etkisi yoktur. Telefonda doğruluğu denenince kalıcı yapılır ya da silinir.
// Varsayım: ana kamera ~26 mm eşdeğer (uzun kenar görüş açısı ~69°, 4:3 kısa kenar ~55°).
const UZUN_KENAR_ACISI = (69 * Math.PI) / 180;
const KISA_KENAR_ACISI = 2 * Math.atan(Math.tan(UZUN_KENAR_ACISI / 2) * 0.75);
const DAIRE_ORANI = 0.8; // rehber dairesinin çapı / kamera kutusunun kısa kenarı (js/hizliTanimla.js rehberCiz)

function olc(video, kutu) {
  const iz = video.srcObject?.getVideoTracks?.()[0];
  if (!iz || !video.videoWidth) return { durum: 'bekleniyor' };
  const ayar = iz.getSettings?.() ?? {};
  const yetenek = iz.getCapabilities?.() ?? {};
  const d = ayar.focusDistance; // metre
  const bilgi = { odakModu: ayar.focusMode ?? '—', destek: 'focusDistance' in yetenek };
  if (typeof d !== 'number' || !(d > 0)) return { durum: 'yok', ...bilgi };
  // Kutudaki daire, görüntünün ne kadarını kaplıyor (object-fit: cover).
  const cw = kutu.clientWidth;
  const ch = kutu.clientHeight;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const olcek = Math.max(cw / vw, ch / vh);
  const daireVideo = (DAIRE_ORANI * Math.min(cw, ch)) / olcek; // video pikseli
  const genislikAcisi = vw >= vh ? UZUN_KENAR_ACISI : KISA_KENAR_ACISI;
  const aci = (daireVideo / vw) * genislikAcisi;
  const cm = 2 * d * Math.tan(aci / 2) * 100;
  return { durum: 'var', uzaklikCm: d * 100, cm, ...bilgi };
}

// Kameranın üstünde küçük ölçüm yazısı; yarım saniyede bir yenilenir. Kamera kapanınca durur.
export function boyutDenemesiBaslat(video, kutu) {
  const yazi = document.createElement('span');
  yazi.className = 'boyut-denemesi';
  kutu.append(yazi);
  const iz = video.srcObject?.getVideoTracks?.()[0];
  // Sürekli odak istenir (bazı telefonlar ancak böyle uzaklık bildirir); desteklenmezse sessizce geçer.
  iz?.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  const sayac = setInterval(() => {
    if (!video.isConnected) { clearInterval(sayac); return; }
    const o = olc(video, kutu);
    if (o.durum === 'var') yazi.textContent = `Deneme ölçüm: daire ≈ ${Math.round(o.cm)} cm · uzaklık ${Math.round(o.uzaklikCm)} cm`;
    else if (o.durum === 'yok') yazi.textContent = `Deneme ölçüm: bu telefon odak uzaklığını vermiyor (odak: ${o.odakModu}, destek: ${o.destek ? 'var' : 'yok'})`;
    else yazi.textContent = 'Deneme ölçüm: kamera bekleniyor…';
  }, 500);
}
