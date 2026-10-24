// Mantar mevsimi çubuğu için hesap. Tarihler yaklaşıktır: mantar takvime değil yağmura bakar
// ve bölgeye göre değişir. Ayları ileride bölgeye göre ayarlamak için yalnızca MEVSIMLER'i değiştir.

// ay: 1–12, gün: ayın günü. Bitiş günü mevsime dahildir.
export const MEVSIMLER = [
  { ad: 'İlkbahar mantar mevsimi', baslangic: { ay: 3, gun: 1 }, bitis: { ay: 5, gun: 31 } },
  { ad: 'Sonbahar mantar mevsimi', baslangic: { ay: 9, gun: 1 }, bitis: { ay: 11, gun: 30 } },
];

export const MEVSIM_NOTU = 'Yaklaşık tarihler; bölgeye ve yağmura göre değişir. Zehirli mantarlar da aynı dönemde çıkar.';

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
 * Mevsim içindeyse: { icinde: true, ad, baslangic, bitis, kalanGun, kalanOran }
 *   kalanOran: 1 = mevsim yeni başladı, 0'a yaklaştıkça bitiyor.
 * Mevsim dışındaysa: { icinde: false, ad, baslangic, bitis, kalanGun } (sıradaki mevsim; kalanGun başlamasına kalan gün)
 */
export function mevsimDurumu(tarih = new Date()) {
  const bugun = gunBasi(tarih.getFullYear(), tarih.getMonth() + 1, tarih.getDate());
  const adaylar = [];
  for (const yil of [bugun.getFullYear(), bugun.getFullYear() + 1]) {
    for (const m of MEVSIMLER) {
      adaylar.push({
        ad: m.ad,
        baslangic: gunBasi(yil, m.baslangic.ay, m.baslangic.gun),
        bitis: gunBasi(yil, m.bitis.ay, m.bitis.gun),
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
