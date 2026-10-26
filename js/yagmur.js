// Yağmur ipucu: bir yerdeki yağmura göre mantarların ne zaman çıkabileceğine dair kaba bir tahmin.
// Kural 12 (Metin'in kararı, 2026-10-26; 24 Ekim'de konum hiç okunmuyordu): kullanıcı gideceği yerin adını
// yazar ya da isterse "Konumumu kullan"a dokunur. Cihaz konumu yalnızca bir düğmeye dokununca, tarayıcı izin
// sorduktan sonra okunur. Hava servisine yalnızca yazılan ad ve yerin yuvarlanmış (~10 km) koordinatı gider.
// Uygulamada dış adrese istek yapan tek dosya budur ve yalnızca Open-Meteo'ya gider; testler bunu denetler.
// Open-Meteo ücretsizdir, ticari olmayan kullanım içindir ve kaynak gösterilmesini ister (CC BY 4.0).

export const HAVA_SERVISI = 'https://api.open-meteo.com/v1/forecast';
export const YER_SERVISI = 'https://geocoding-api.open-meteo.com/v1/search';
export const KAYNAK_NOTU = 'Hava verisi: Open-Meteo.com, yer adları: GeoNames.org (CC BY 4.0).';
export const GECMIS_GUN = 21;
export const TAHMIN_GUN = 8;

// Yaklaşık değerler. Büyük yağmurdan sonra:
//   0–7. gün: mantarlar oluşuyor (bekleme)
//   7–14. gün: en verimli dönem
//   14–21. gün: yeni yağmur yağmazsa azalır, kurumaya başlar
export const BUYUK_YAGMUR_MM = 10;
export const VERIMLI_BASLANGIC_GUN = 7;
export const VERIMLI_BITIS_GUN = 14;
export const AZALMA_BITIS_GUN = 21;

export const YAGMUR_NOTU =
  'Yaklaşık bir ipucudur; sıcaklığa, toprağa ve türe göre değişir. Bulduğun her mantarı yine Tanımla ile incele.';

const GUN = 24 * 60 * 60 * 1000;

// Yaklaşık 10 km: koordinat tek ondalığa yuvarlanır.
export function konumuYuvarla(deger) {
  return Math.round(deger * 10) / 10;
}

export function havaAdresi(enlem, boylam) {
  const parametreler = new URLSearchParams({
    latitude: String(konumuYuvarla(enlem)),
    longitude: String(konumuYuvarla(boylam)),
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min',
    past_days: String(GECMIS_GUN),
    forecast_days: String(TAHMIN_GUN),
    timezone: 'auto',
  });
  return `${HAVA_SERVISI}?${parametreler}`;
}

function oglen(tarih) {
  return new Date(tarih.getFullYear(), tarih.getMonth(), tarih.getDate(), 12);
}

function isoTarih(metin) {
  const [yil, ay, gun] = metin.split('-').map(Number);
  return new Date(yil, ay - 1, gun, 12);
}

function gunEkle(tarih, gun) {
  return new Date(tarih.getTime() + gun * GUN);
}

function gunFarki(a, b) {
  return Math.round((b - a) / GUN);
}

// Open-Meteo "daily" verisinden günlük kayıtlar.
export function gunlukKayitlar(daily) {
  return (daily?.time ?? []).map((zaman, i) => ({
    tarih: isoTarih(zaman),
    yagis: daily.precipitation_sum?.[i] ?? 0,
    enYuksek: daily.temperature_2m_max?.[i],
    enDusuk: daily.temperature_2m_min?.[i],
  }));
}

// Elle seçilen tarih için tek kayıt: miktarı bilinmeyen (null) büyük yağmur.
export function elleKayit(tarih) {
  return [{ tarih: oglen(tarih), yagis: null }];
}

const buyukMu = (kayit) => kayit.yagis == null || kayit.yagis >= BUYUK_YAGMUR_MM;

// Her büyük yağmur bir mantar penceresi açar; üst üste binen pencereler birleşir.
function pencereler(yagmurlar) {
  const liste = yagmurlar
    .map((y) => ({
      bas: gunEkle(y.tarih, VERIMLI_BASLANGIC_GUN),
      verimliBit: gunEkle(y.tarih, VERIMLI_BITIS_GUN),
      bitis: gunEkle(y.tarih, AZALMA_BITIS_GUN),
    }))
    .sort((a, b) => a.bas - b.bas);
  const birlesik = [];
  for (const p of liste) {
    const son = birlesik.at(-1);
    if (son && p.bas <= gunEkle(son.bitis, 1)) {
      if (p.verimliBit > son.verimliBit) son.verimliBit = p.verimliBit;
      if (p.bitis > son.bitis) son.bitis = p.bitis;
    } else {
      birlesik.push({ ...p });
    }
  }
  return birlesik;
}

function sicaklikNotu(kayitlar) {
  const olculen = kayitlar.filter((k) => k.enYuksek != null && k.enDusuk != null);
  if (!olculen.length) return null;
  const ortalama = olculen.reduce((t, k) => t + (k.enYuksek + k.enDusuk) / 2, 0) / olculen.length;
  if (ortalama < 5) return 'Hava çok soğuk; mantarların çıkması gecikebilir ya da hiç olmayabilir.';
  if (ortalama > 25) return 'Hava çok sıcak; toprak çabuk kuruyabilir, mantar az çıkabilir.';
  return null;
}

/**
 * Bir yerin günlük kayıtlarından mantar penceresini hesaplar.
 * durum: 'yok' | 'bekle' | 'verimli' | 'azaliyor'
 * simdiki: içinde bulunulan pencere (yoksa null):
 *   { bas, verimliBit, bitis, kalanGun, verimliKalanGun, verimliToplamGun, azalmaToplamGun }
 *   kalanGun: pencerenin tamamen bitmesine (azalma dahil) kalan gün
 *   verimliKalanGun: en verimli dönemin bitmesine kalan gün (azalma döneminde 0)
 *   verimliToplamGun / azalmaToplamGun: iki dönemin toplam gün sayısı (çubuğun tamamı)
 * siradaki: henüz başlamamış pencere { bas, verimliBit, bitis, kalanGun } (kalanGun: başlamasına kalan)
 * sonYagmur: son büyük yağmur { tarih, miktar } (miktar elle girilmişse null)
 * tahmin: önümüzdeki günlerde beklenen ilk büyük yağmur { tarih, miktar, mantarBas }
 */
export function mantarPenceresi(kayitlar, bugun = new Date()) {
  const gun = oglen(bugun);
  const gecmis = kayitlar.filter((k) => k.tarih <= gun);
  const gelecek = kayitlar.filter((k) => k.tarih > gun);
  const yagmurlar = gecmis.filter(buyukMu);
  const tumu = pencereler(yagmurlar);

  const icinde = tumu.find((p) => p.bas <= gun && gun <= p.bitis);
  const sonraki = tumu.find((p) => p.bas > gun);

  const simdiki = icinde && {
    ...icinde,
    kalanGun: gunFarki(gun, icinde.bitis) + 1,
    verimliKalanGun: gun <= icinde.verimliBit ? gunFarki(gun, icinde.verimliBit) + 1 : 0,
    verimliToplamGun: gunFarki(icinde.bas, icinde.verimliBit) + 1,
    azalmaToplamGun: gunFarki(icinde.verimliBit, icinde.bitis),
  };
  const siradaki = sonraki && { ...sonraki, kalanGun: gunFarki(gun, sonraki.bas) };

  let durum = 'yok';
  if (simdiki) durum = gun <= simdiki.verimliBit ? 'verimli' : 'azaliyor';
  else if (siradaki) durum = 'bekle';

  const son = yagmurlar.at(-1);
  const beklenen = gelecek.find((k) => k.yagis >= BUYUK_YAGMUR_MM);

  return {
    durum,
    simdiki: simdiki ?? null,
    siradaki: siradaki ?? null,
    sonYagmur: son ? { tarih: son.tarih, miktar: son.yagis == null ? null : Math.round(son.yagis) } : null,
    toplamYagis: Math.round(gecmis.reduce((t, k) => t + (k.yagis ?? 0), 0)),
    tahmin: beklenen
      ? { tarih: beklenen.tarih, miktar: Math.round(beklenen.yagis), mantarBas: gunEkle(beklenen.tarih, VERIMLI_BASLANGIC_GUN) }
      : null,
    sicaklikNotu: sicaklikNotu(son ? gecmis.filter((k) => k.tarih >= son.tarih) : []),
  };
}

// Birden çok yerin hava adresi (mantar radarı): her koordinat ayrı ayrı yuvarlanır.
export function cokluHavaAdresi(yerler) {
  const adres = new URL(havaAdresi(0, 0));
  adres.searchParams.set('latitude', yerler.map((y) => konumuYuvarla(y.enlem)).join(','));
  adres.searchParams.set('longitude', yerler.map((y) => konumuYuvarla(y.boylam)).join(','));
  return adres.toString();
}

// Birden çok yerin hava verisini tek istekte getirir (mantar radarı).
// Sonuç yerlerle aynı sırada { daily } listesidir. Hata durumunda { hata: 'baglanti' } döner.
export async function havaVerileriAl(yerler) {
  try {
    const yanit = await fetch(cokluHavaAdresi(yerler));
    if (!yanit.ok) throw new Error(String(yanit.status));
    const veri = await yanit.json();
    // Tek yer sorulunca Open-Meteo liste yerine tek nesne döner.
    const liste = Array.isArray(veri) ? veri : [veri];
    if (liste.length !== yerler.length || liste.some((v) => !v.daily?.time)) throw new Error('veri yok');
    return liste.map((v) => ({ daily: v.daily }));
  } catch {
    return { hata: 'baglanti' };
  }
}

// Cihazın konumunu bir kez sorar; tarayıcı izin ister. Yalnızca kullanıcı bir düğmeye dokununca çağrılır.
// Konum burada ne kaydedilir ne gönderilir; çağıran yuvarlayarak kullanır (radar.js gizli yeri cihazda saklar).
// Sonuç { enlem, boylam } ya da { hata: 'izin' | 'yok' }.
export function cihazKonumu() {
  return new Promise((coz) => {
    if (!navigator.geolocation) {
      coz({ hata: 'yok' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (k) => coz({ enlem: k.coords.latitude, boylam: k.coords.longitude }),
      (h) => coz({ hata: h.code === 1 ? 'izin' : 'yok' }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  });
}

// Mantar ara haritasında canlı konum (Metin'in onayı, 2026-10-26). Yalnızca harita ekranı açıkken ve
// kullanıcı "Konumumu göster"e dokununca başlar; konum yalnızca ekranda gösterilir, hiçbir yere gönderilmez.
// geri({ enlem, boylam, dogruluk }) ya da geri({ hata: 'izin' | 'yok' }). Sonuç: izlemeyi durduran işlev.
export function konumuIzle(geri) {
  if (!navigator.geolocation) {
    geri({ hata: 'yok' });
    return () => {};
  }
  const kimlik = navigator.geolocation.watchPosition(
    (k) => geri({ enlem: k.coords.latitude, boylam: k.coords.longitude, dogruluk: k.coords.accuracy }),
    (h) => geri({ hata: h.code === 1 ? 'izin' : 'yok' }),
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
  );
  return () => navigator.geolocation.clearWatch(kimlik);
}

// Seçilen yerin hava verisini getirir. Hata durumunda { hata: 'baglanti' } döner.
export async function havaVerisiAl(enlem, boylam) {
  try {
    const yanit = await fetch(havaAdresi(enlem, boylam));
    if (!yanit.ok) throw new Error(String(yanit.status));
    const veri = await yanit.json();
    if (!veri.daily?.time) throw new Error('veri yok');
    return { daily: veri.daily };
  } catch {
    return { hata: 'baglanti' };
  }
}

// Gideceğin yeri adıyla arar (yalnızca Türkiye). Yalnızca yazılan ad gönderilir.
// Hata durumunda { hata: 'baglanti' } döner.
export async function yerAra(ad) {
  const parametreler = new URLSearchParams({ name: ad.trim(), count: '8', language: 'tr', countryCode: 'TR', format: 'json' });
  try {
    const yanit = await fetch(`${YER_SERVISI}?${parametreler}`);
    if (!yanit.ok) throw new Error(String(yanit.status));
    const veri = await yanit.json();
    return (veri.results ?? []).map((y) => ({
      ad: y.name,
      bolge: [...new Set([y.admin2, y.admin1])].filter((b) => b && b !== y.name).join(', '),
      enlem: konumuYuvarla(y.latitude),
      boylam: konumuYuvarla(y.longitude),
    }));
  } catch {
    return { hata: 'baglanti' };
  }
}
