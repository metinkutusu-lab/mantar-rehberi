// GEÇİCİ DENEME (Metin'in isteği, 2026-11-01: "kamerada daire belli; şapka daireyi doldurunca boyut hesaplanabilmeli").
// Daire tek başına boyutu vermez (uzaklık bilinmez); bazı Android telefonlarda Chrome kameranın odak uzaklığını söyler.
// Uzaklık + dairenin kapladığı açı → yaklaşık şapka genişliği. Bu dosya yalnızca ölçümü kamerada gösterir; tanımlamaya,
// sıralamaya ve sonuca hiçbir etkisi yoktur. Telefonda doğruluğu denenince kalıcı yapılır ya da silinir.
// Varsayım: ana kamera ~26 mm eşdeğer (uzun kenar görüş açısı ~69°, 4:3 kısa kenar ~55°).
const UZUN_KENAR_ACISI = (69 * Math.PI) / 180;
const KISA_KENAR_ACISI = 2 * Math.atan(Math.tan(UZUN_KENAR_ACISI / 2) * 0.75);
const DAIRE_ORANI = 0.8; // rehber dairesinin çapı / kamera kutusunun kısa kenarı (js/hizliTanimla.js rehberCiz)

// Uzaklık (metre) ve dairenin kapladığı açıdan şapka genişliği (cm).
function genislik(video, kutu, d) {
  const cw = kutu.clientWidth;
  const ch = kutu.clientHeight;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const olcek = Math.max(cw / vw, ch / vh);
  const daireVideo = (DAIRE_ORANI * Math.min(cw, ch)) / olcek; // video pikseli
  const genislikAcisi = vw >= vh ? UZUN_KENAR_ACISI : KISA_KENAR_ACISI;
  const aci = (daireVideo / vw) * genislikAcisi;
  return 2 * d * Math.tan(aci / 2) * 100;
}

function olc(video, kutu) {
  const iz = video.srcObject?.getVideoTracks?.()[0];
  if (!iz || !video.videoWidth) return { durum: 'bekleniyor' };
  const ayar = iz.getSettings?.() ?? {};
  const yetenek = iz.getCapabilities?.() ?? {};
  const d = ayar.focusDistance; // metre
  const bilgi = { odakModu: ayar.focusMode ?? '—', destek: 'focusDistance' in yetenek, aralik: yetenek.focusDistance };
  if (ayar.focusMode === 'manual' || typeof d !== 'number' || !(d > 0)) return { durum: 'yok', ...bilgi };
  return { durum: 'var', uzaklikCm: d * 100, cm: genislik(video, kutu, d), ...bilgi };
}

// Görüntünün ortasındaki dairenin netliği (komşu pikseller arasındaki farkların karesi; net görüntüde büyük).
function netlik(video, tuval) {
  const k = 160;
  const kenar = Math.min(video.videoWidth, video.videoHeight) * 0.6;
  const c = tuval.getContext('2d', { willReadFrequently: true });
  c.drawImage(video, (video.videoWidth - kenar) / 2, (video.videoHeight - kenar) / 2, kenar, kenar, 0, 0, k, k);
  const p = c.getImageData(0, 0, k, k).data;
  let toplam = 0;
  for (let y = 1; y < k - 1; y++) {
    for (let x = 1; x < k - 1; x++) {
      const i = (y * k + x) * 4;
      const g = p[i + 1];
      const lap = 4 * g - p[i - 3] - p[i + 5] - p[i - k * 4 + 1] - p[i + k * 4 + 1];
      toplam += lap * lap;
    }
  }
  return toplam;
}

const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));

// Odak taraması: kamera uzaklığı söylemiyorsa odak yakından uzağa çevrilir, en net uzaklık bulunur (~2 sn).
// Mantar genelde 10–100 cm uzakta çekilir; yalnızca bu aralık taranır.
async function odakTara(video) {
  const iz = video.srcObject?.getVideoTracks?.()[0];
  const aralik = iz?.getCapabilities?.().focusDistance;
  if (!aralik) return null;
  const enAz = Math.max(aralik.min || 0.05, 0.05);
  const enCok = Math.min(aralik.max || 1, 1.2);
  const adimlar = 14;
  const tuval = document.createElement('canvas');
  tuval.width = tuval.height = 160;
  let enIyi = null;
  try {
    for (let i = 0; i < adimlar; i++) {
      // Yakında sık, uzakta seyrek (netlik yakında daha hızlı değişir).
      const d = enAz * (enCok / enAz) ** (i / (adimlar - 1));
      await iz.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: d }] });
      await bekle(180);
      const n = netlik(video, tuval);
      if (!enIyi || n > enIyi.n) enIyi = { d, n };
    }
  } catch {
    enIyi = null;
  } finally {
    iz.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  }
  return enIyi?.d ?? null;
}

// Kameranın üstünde küçük ölçüm yazısı; yarım saniyede bir yenilenir. Kamera kapanınca durur.
export function boyutDenemesiBaslat(video, kutu) {
  const yazi = document.createElement('span');
  yazi.className = 'boyut-denemesi';
  kutu.append(yazi);
  // Telefon uzaklığı söylemiyorsa "Ölç" düğmesi odak taramasıyla bulur.
  const olcDugmesi = document.createElement('button');
  olcDugmesi.type = 'button';
  olcDugmesi.className = 'boyut-denemesi-olc';
  olcDugmesi.textContent = 'Ölç (odağı tara)';
  olcDugmesi.hidden = true;
  let taranan = null;
  let taraniyor = false;
  olcDugmesi.onclick = async () => {
    taraniyor = true;
    olcDugmesi.disabled = true;
    yazi.textContent = 'Deneme ölçüm: odak taranıyor, telefonu kıpırdatma…';
    const d = await odakTara(video);
    taraniyor = false;
    olcDugmesi.disabled = false;
    taranan = d ? { d, cm: genislik(video, kutu, d) } : null;
    yazi.textContent = taranan
      ? `Deneme ölçüm (tarama): daire ≈ ${Math.round(taranan.cm)} cm · uzaklık ${Math.round(d * 100)} cm`
      : 'Deneme ölçüm: odak taranamadı.';
  };
  kutu.append(olcDugmesi);
  const iz = video.srcObject?.getVideoTracks?.()[0];
  // Sürekli odak istenir (bazı telefonlar ancak böyle uzaklık bildirir); desteklenmezse sessizce geçer.
  iz?.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  const sayac = setInterval(() => {
    if (!video.isConnected) { clearInterval(sayac); return; }
    if (taraniyor || taranan) return; // tarama sonucu ekranda kalsın (yeniden ölçmek için düğmeye bas)
    const o = olc(video, kutu);
    olcDugmesi.hidden = !(o.durum === 'yok' && o.destek);
    if (o.durum === 'var') yazi.textContent = `Deneme ölçüm: daire ≈ ${Math.round(o.cm)} cm · uzaklık ${Math.round(o.uzaklikCm)} cm`;
    else if (o.durum === 'yok' && o.destek) yazi.textContent = `Deneme ölçüm: telefon uzaklığı kendisi söylemiyor. Bir şeyi daireye sığdırıp "Ölç"e bas. (odak aralığı ${Math.round((o.aralik?.min ?? 0) * 100)}–${Math.round((o.aralik?.max ?? 0) * 100)} cm)`;
    else if (o.durum === 'yok') yazi.textContent = `Deneme ölçüm: bu telefon odak uzaklığını vermiyor (odak: ${o.odakModu}, destek: yok)`;
    else yazi.textContent = 'Deneme ölçüm: kamera bekleniyor…';
  }, 500);
}
