// Kullanıcı durumu yalnızca bu cihazda saklanır (kural 12: hiçbir yere gönderilmez).
// Tarayıcı kayda izin vermezse durum en azından açık kaldığı sürece bellekte tutulur.
const ANAHTAR = 'durum';
let bellekteki = {};

export function durumuOku() {
  try {
    const kayit = localStorage.getItem(ANAHTAR);
    return kayit ? JSON.parse(kayit) : bellekteki;
  } catch {
    return bellekteki;
  }
}

export function durumuYaz(durum) {
  bellekteki = durum;
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(durum));
  } catch {
    // Kayıt yapılamadı; bellekteki kopya kullanılır.
  }
}
