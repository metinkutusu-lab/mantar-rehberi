// Uygulama içi kamera (hızlı tanımlama): görüntü ekranda canlı durur, "çek" deyince ya da geri sayımla çekilir.
// Görüntü yalnızca telefonda işlenir, hiçbir yere gönderilmez (kural 12). Kamera açılamazsa
// telefonun kendi kamera ekranı (dosya seçici) kullanılır.

let akis = null;

export const kameraVarMi = () => Boolean(navigator.mediaDevices?.getUserMedia);

// video öğesine arka kamerayı bağlar. Açılamazsa false döner.
export async function kameraAc(video) {
  try {
    akis ??= await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    video.srcObject = akis;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play();
    return true;
  } catch {
    kameraKapat();
    return false;
  }
}

export function kameraKapat() {
  for (const iz of akis?.getTracks() ?? []) iz.stop();
  akis = null;
}

// Görüntüden bir kare alır; en uzun kenar 1280 piksele indirilir (bellek ve özet resmi için yeterli).
export function kareAl(video) {
  const genislik = video.videoWidth;
  const yukseklik = video.videoHeight;
  const oran = Math.min(1, 1280 / Math.max(genislik, yukseklik));
  const tuval = document.createElement('canvas');
  tuval.width = Math.round(genislik * oran);
  tuval.height = Math.round(yukseklik * oran);
  tuval.getContext('2d').drawImage(video, 0, 0, tuval.width, tuval.height);
  return tuval;
}

// Tuvali ekranda gösterilecek bir resim adresine çevirir (yalnızca bellekte).
export function resimAdresi(tuval) {
  return new Promise((coz) => tuval.toBlob((blob) => coz(blob ? URL.createObjectURL(blob) : null), 'image/jpeg', 0.85));
}
