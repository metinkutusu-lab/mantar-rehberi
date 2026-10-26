// Telefonun pusulası (Metin'in isteği, 2026-10-26): Mantar ara'da oklar telefonun baktığı yöne göre döner,
// "güneybatı" yerine "sağ önünde" denir. Pusula bilgisi yalnızca ekranda kullanılır; kaydedilmez, gönderilmez.
// iPhone'da izin, kullanıcı bir düğmeye dokununca istenir (pusulayiAc o dokunuşun içinde çağrılmalı).

// Telefonun baktığı yön: 0 = kuzey, saat yönünde. geri(derece). Sonuç: durduran işlev ya da { hata }.
export async function pusulayiAc(geri) {
  const Olay = window.DeviceOrientationEvent;
  if (!Olay) return { hata: 'yok' };
  if (typeof Olay.requestPermission === 'function') {
    try {
      if ((await Olay.requestPermission()) !== 'granted') return { hata: 'izin' };
    } catch {
      return { hata: 'izin' };
    }
  }
  let son = null;
  const ekranAcisi = () => window.screen?.orientation?.angle ?? window.orientation ?? 0;
  const isle = (o) => {
    let yon = null;
    if (typeof o.webkitCompassHeading === 'number') yon = o.webkitCompassHeading; // iPhone
    else if (o.absolute && typeof o.alpha === 'number') yon = 360 - o.alpha; // Android
    if (yon == null) return;
    yon = (yon + ekranAcisi() + 360) % 360;
    // Titremesin diye yumuşatılır (açılar 359 → 0 geçişinde doğru ortalanır).
    if (son == null) son = yon;
    else {
      const fark = ((yon - son + 540) % 360) - 180;
      son = (son + fark * 0.25 + 360) % 360;
    }
    geri(son);
  };
  const olayAdi = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(olayAdi, isle);
  return () => window.removeEventListener(olayAdi, isle);
}

// Yürürken iki konum arasındaki yön (pusula yoksa yedek). En az 8 m yürüyünce hesaplanır.
export const HAREKET_ESIGI = 8;
