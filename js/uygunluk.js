// Mantar ara: haritadaki "mantar çıkmaya uygun yer" hesabı. Ağ isteği yapmaz; yalnızca hesap.
// Bu bir tahmindir: mantarın yerini göstermez, koşulların uygun olduğu yerleri gösterir.
// Kural tablosu bilerek basit ve açık tutuldu (uzman denetleyebilsin):
// - Zemin: orman (ağaçlık), çayır, meyve bahçesi, çalılık; seçilen türün zeminine göre.
// - Yamacın baktığı yön: serin havada ve ilkbaharda güneye bakan yamaçlar önce ısınır;
//   sıcak ve kuru havada kuzeye bakan yamaçlar nemini korur (toplayıcı tecrübesi, taslak).
// - Eğim: çok dik yamaçta toprak incedir ve yürümek tehlikelidir.

export const SINIF_ADLARI = ['', 'Uygun olabilir', 'Uygun', 'Çok uygun'];

// Yükseklik ızgarasından eğim (derece) ve yamacın baktığı yön (0 = kuzey, 90 = doğu, 180 = güney).
// yukseklikler: satır satır (kuzeyden güneye, batıdan doğuya) metre; hucre: bir hücrenin metre boyu.
// Kenar hücrelerde ve düz yerde yön NaN'dır.
export function egimVeBaki(yukseklikler, genislik, yukseklik, hucre) {
  const egim = new Float32Array(genislik * yukseklik).fill(NaN);
  const baki = new Float32Array(genislik * yukseklik).fill(NaN);
  const z = (x, y) => yukseklikler[y * genislik + x];
  for (let y = 1; y < yukseklik - 1; y++) {
    for (let x = 1; x < genislik - 1; x++) {
      // Horn yöntemi: komşu dokuz hücreden eğim.
      const dogu = ((z(x + 1, y - 1) + 2 * z(x + 1, y) + z(x + 1, y + 1)) - (z(x - 1, y - 1) + 2 * z(x - 1, y) + z(x - 1, y + 1))) / (8 * hucre);
      const guney = ((z(x - 1, y + 1) + 2 * z(x, y + 1) + z(x + 1, y + 1)) - (z(x - 1, y - 1) + 2 * z(x, y - 1) + z(x + 1, y - 1))) / (8 * hucre);
      const kuzey = -guney;
      const i = y * genislik + x;
      egim[i] = (Math.atan(Math.hypot(dogu, kuzey)) * 180) / Math.PI;
      if (dogu !== 0 || kuzey !== 0) {
        // Yamaç, yokuş aşağı yöne bakar.
        baki[i] = ((Math.atan2(-dogu, -kuzey) * 180) / Math.PI + 360) % 360;
      }
    }
  }
  return { egim, baki };
}

// Mevsime ve havaya göre hangi yöne bakan yamaçlar daha uygun?
// ay: 1–12; sicaklik: son günlerin ortalaması (°C, bilinmiyorsa null); kuru: son 3 haftada büyük yağmur yoksa true.
// Sonuç: { yon: 0 (kuzey) | 180 (güney), guc: 0–1 (tercihin ağırlığı), aciklama }
export function yonTercihi({ ay, sicaklik = null, kuru = false }) {
  if (kuru || (sicaklik != null && sicaklik > 20)) {
    return { yon: 0, guc: 0.6, aciklama: 'Hava sıcak veya kuru: kuzeye bakan, gölgeli yamaçlar nemini daha iyi korur.' };
  }
  if (sicaklik != null && sicaklik < 10) {
    return { yon: 180, guc: 0.6, aciklama: 'Hava serin: güneye bakan yamaçlarda toprak önce ısınır.' };
  }
  if (ay >= 3 && ay <= 5) return { yon: 180, guc: 0.4, aciklama: 'İlkbahar: güneye ve doğuya bakan yamaçlarda toprak önce ısınır.' };
  if (ay >= 6 && ay <= 8) return { yon: 0, guc: 0.6, aciklama: 'Yaz: kuzeye bakan, gölgeli yamaçlar nemini daha iyi korur.' };
  if (ay >= 9 && ay <= 11) return { yon: 0, guc: 0.25, aciklama: 'Sonbahar, yağmurlu ve ılık: her yamaçta çıkabilir; kuzeye bakanlar biraz daha nemli kalır.' };
  return { yon: 180, guc: 0.5, aciklama: 'Kış: mantar azdır; güneş alan yamaçlara bak.' };
}

// Zemin kodları (harita katmanından): orman, cayir, bahce (meyve bahçesi), calilik, diger.
// Seçilen türün tür listesindeki "zemin" özelliğine göre her zeminin ağırlığı.
// tur null ise (Hepsi): orman ve çayır tam, bahçe ve çalılık yarım.
export function zeminAgirliklari(tur) {
  const zemin = tur?.ozellikler?.zemin;
  if (!tur || !zemin?.length) return { orman: 1, cayir: 1, bahce: 0.6, calilik: 0.5, diger: 0.1 };
  const orman = zemin.includes('toprak') || zemin.includes('odun');
  const cayir = zemin.includes('cayir');
  return {
    orman: orman ? 1 : 0.2,
    cayir: cayir ? 1 : 0.2,
    bahce: orman ? 0.6 : 0.2,
    calilik: 0.5,
    diger: 0.1,
  };
}

// Tür seçicideki sıra: dünya mutfağında en gözde olanlar önce, geriye doğru azalarak
// (Metin'in isteği, 2026-10-26: "dünya gastronomisinde en lezzetliden geriye"; TASLAK sıra, genel bilgiye göre).
// Ekranda "lezzetli" yazılmaz (kural 1'in ruhu: yemeye özendirme yok); listede olmayan türler sona, ada göre.
export const ARANMA_SIRASI = [
  'beyaz-truf', 'kara-truf', 'ayi-mantari', 'kuzugobegi', 'yumurta', 'horozmantari', 'mayis', 'kanlica',
  'keme', 'casir', 'mor-kadife', 'buyuk-semsiye', 'istiridye', 'tavuk', 'cayir', 'puf',
];

export function aranmaSirasinaGore(turler) {
  const sira = (t) => { const i = ARANMA_SIRASI.indexOf(t.id); return i < 0 ? ARANMA_SIRASI.length : i; };
  return [...turler].sort((a, b) => sira(a) - sira(b) || a.ad.localeCompare(b.ad, 'tr'));
}

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Türün mevsimi mi? Ay bilgisi olmayan türde bilinmiyor sayılır ve dışarıda bırakılmaz.
export function mevsimdeMi(tur, ay) {
  return !tur.aylar?.length || tur.aylar.includes(ay);
}

// "Eylül–Kasım" (aylar sırayla yazılır; yıl dönümünü geçebilir: Ekim–Nisan).
export function ayAraligi(aylar) {
  if (!aylar?.length) return '';
  return aylar.length === 1 ? AY_ADLARI[aylar[0] - 1] : `${AY_ADLARI[aylar[0] - 1]}–${AY_ADLARI[aylar.at(-1) - 1]}`;
}

// Bu zeminde (orman, çayır, bahçe, çalılık) bu ay aranabilecek türler, aranma sırasıyla.
export function zemindeAranabilecekler(turler, zemin, ay) {
  return aranmaSirasinaGore(turler.filter((t) => mevsimdeMi(t, ay) && (zeminAgirliklari(t)[zemin] ?? 0) >= 0.6));
}

// Bakılan alanda bu ay aranabilecek türler: türün zemini alanın en az %2'sini kaplıyorsa.
// zeminPayi: { orman: 0–1, cayir, bahce, calilik }
export function bolgedeAranabilecekler(turler, zeminPayi, ay) {
  return aranmaSirasinaGore(turler.filter((t) => {
    if (!mevsimdeMi(t, ay)) return false;
    const a = zeminAgirliklari(t);
    return Object.entries(zeminPayi).some(([zemin, pay]) => pay >= 0.02 && (a[zemin] ?? 0) >= 0.6);
  }));
}

// Bir hücrenin puanı (0–1).
export function hucrePuani({ egim, baki, zemin, tercih, agirliklar }) {
  const z = agirliklar[zemin] ?? agirliklar.diger;
  let e = 1;
  if (egim > 45) e = 0.35;
  else if (egim > 25) e = 1 - ((egim - 25) / 20) * 0.65;
  let b;
  if (Number.isNaN(baki) || Number.isNaN(egim) || egim < 3) b = 1 - tercih.guc * 0.5;
  else {
    const fark = ((baki - tercih.yon) * Math.PI) / 180;
    b = 1 - tercih.guc * (1 - (1 + Math.cos(fark)) / 2);
  }
  return z * e * b;
}

// Puan → sınıf: 0 (gösterilmez), 1 uygun olabilir, 2 uygun, 3 çok uygun.
export function puanSinifi(puan) {
  if (puan >= 0.8) return 3;
  if (puan >= 0.6) return 2;
  if (puan >= 0.42) return 1;
  return 0;
}

const YONLER = ['kuzey', 'kuzeydoğu', 'doğu', 'güneydoğu', 'güney', 'güneybatı', 'batı', 'kuzeybatı'];

// Pusula açısının adı (0 = kuzey).
export function yonAdi(aci) {
  return YONLER[Math.round((((aci % 360) + 360) % 360) / 45) % 8];
}

// Telefonun baktığı yöne göre hedefin yeri: "tam önünde", "sağ önünde", "sağında", "sağ arkanda",
// "arkanda", "sol arkanda", "solunda", "sol önünde". aci: hedefin pusula açısı, bakis: telefonun baktığı yön.
const GORECE_YONLER = ['tam önünde', 'sağ önünde', 'sağında', 'sağ arkanda', 'arkanda', 'sol arkanda', 'solunda', 'sol önünde'];
export function goreceYon(aci, bakis) {
  const fark = (((aci - bakis) % 360) + 360) % 360;
  return GORECE_YONLER[Math.round(fark / 45) % 8];
}

// İki nokta arası mesafe (metre) ve yön (0 = kuzey, saat yönünde).
export function mesafeVeYon(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const f1 = a.enlem * rad;
  const f2 = b.enlem * rad;
  const df = (b.enlem - a.enlem) * rad;
  const dl = (b.boylam - a.boylam) * rad;
  const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  const mesafe = 2 * R * Math.asin(Math.sqrt(h));
  const yon = ((Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) / rad) + 360) % 360;
  return { mesafe, yon };
}

// "350 m" / "1,2 km"
export function mesafeYaz(metre) {
  return metre < 1000 ? `${Math.round(metre / 10) * 10} m` : `${(metre / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`;
}
