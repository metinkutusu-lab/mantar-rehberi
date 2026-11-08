// Mantar mevsimi çubuğu için hesap. Tarihler yaklaşıktır: mantar takvime değil yağmura bakar
// ve bölgeye göre değişir. Ayları ileride bölgeye göre ayarlamak için yalnızca MEVSIMLER'i değiştir.

// ay: 1–12, gün: ayın günü. Bitiş günü mevsime dahildir. Bitiş ayı başlangıçtan küçükse mevsim yılbaşını aşar (kış).
// Dört mevsim (Metin, 2026-11-08: "yaz günü de çıkıyorsa, kış günü de varsa onlara göre yapalım"): her mevsimde
// veri/turler.json'da `aylar`ı o mevsime düşen en az bir tür vardır, türü olan her ay bir mevsimdedir (test denetler).
// `tur` ana sayfadaki renkli yaprak simgesini seçer (ilkbahar taze yeşil, yaz koyu yeşil, sonbahar turuncu-kahve, kış buz mavisi).
export const MEVSIMLER = [
  {
    tur: 'ilkbahar', ad: 'İlkbahar mantar mevsimi', baslangic: { ay: 3, gun: 1 }, bitis: { ay: 5, gun: 31 },
    ipucu: 'Nereye bakmalı: ilkbaharda toprak önce güneye ve doğuya bakan yamaçlarda ısınır; oralara bak.',
  },
  {
    tur: 'yaz', ad: 'Yaz mantar mevsimi', baslangic: { ay: 6, gun: 1 }, bitis: { ay: 8, gun: 31 },
    ipucu: 'Nereye bakmalı: yazın toprak çabuk kurur; yağmurdan sonra kuzeye bakan, gölgeli, nemini koruyan yamaçlara bak.',
  },
  {
    tur: 'sonbahar', ad: 'Sonbahar mantar mevsimi', baslangic: { ay: 9, gun: 1 }, bitis: { ay: 11, gun: 30 },
    ipucu: 'Nereye bakmalı: sonbaharda kuzeye ve batıya bakan, nemini koruyan yamaçlara bak.',
  },
  {
    tur: 'kis', ad: 'Kış mantar mevsimi', baslangic: { ay: 12, gun: 1 }, bitis: { ay: 2, gun: 28 },
    ipucu: 'Nereye bakmalı: kışın mantar azdır; ılık ve yağışlı günlerden sonra güneş alan yamaçlara, kütük ve devrik ağaç gövdelerine bak.',
  },
];

export const MEVSIM_NOTU = 'Yaklaşık tarihler; bölgeye ve yağmura göre değişir. Zehirli mantarlar da aynı dönemde çıkar.';
export const SICAKLIK_IPUCU = 'Mantarlar en çok yağmurdan sonra, gündüzleri 15–22°C civarı ılık havalarda çıkar.';

const GUN = 24 * 60 * 60 * 1000;

// Saat farkı ve yaz saati sorun olmasın diye günler öğlen saatiyle karşılaştırılır.
function gunBasi(yil, ay, gun) {
  return new Date(yil, ay - 1, gun, 12);
}

function gunFarki(a, b) {
  return Math.round((b - a) / GUN);
}

/**
 * Verilen tarihte hangi mevsimdeyiz?
 * Mevsim içindeyse: { icinde: true, tur, ad, baslangic, bitis, kalanGun, kalanOran }
 *   kalanOran: 1 = mevsim yeni başladı, 0'a yaklaştıkça bitiyor.
 * Mevsim dışındaysa: { icinde: false, ad, baslangic, bitis, kalanGun } (sıradaki mevsim; kalanGun başlamasına kalan gün)
 */
export function mevsimDurumu(tarih = new Date()) {
  const bugun = gunBasi(tarih.getFullYear(), tarih.getMonth() + 1, tarih.getDate());
  const adaylar = [];
  for (const yil of [bugun.getFullYear() - 1, bugun.getFullYear(), bugun.getFullYear() + 1]) {
    for (const m of MEVSIMLER) {
      const yilAsar = m.bitis.ay < m.baslangic.ay;
      // Şubat'ın son günü artık yılda 29 olur.
      const bitisYili = yilAsar ? yil + 1 : yil;
      const bitisGunu = m.bitis.ay === 2 && m.bitis.gun === 28 ? new Date(bitisYili, 2, 0).getDate() : m.bitis.gun;
      adaylar.push({
        tur: m.tur,
        ad: m.ad,
        ipucu: m.ipucu,
        baslangic: gunBasi(yil, m.baslangic.ay, m.baslangic.gun),
        bitis: gunBasi(bitisYili, m.bitis.ay, bitisGunu),
      });
    }
  }

  const simdiki = adaylar.find((m) => m.baslangic <= bugun && bugun <= m.bitis);
  if (simdiki) {
    const toplamGun = gunFarki(simdiki.baslangic, simdiki.bitis) + 1;
    const kalanGun = gunFarki(bugun, simdiki.bitis) + 1;
    return { icinde: true, ...simdiki, kalanGun, kalanOran: kalanGun / toplamGun };
  }

  const siradaki = adaylar.filter((m) => m.baslangic > bugun).sort((a, b) => a.baslangic - b.baslangic)[0];
  return { icinde: false, ...siradaki, kalanGun: gunFarki(bugun, siradaki.baslangic) };
}
