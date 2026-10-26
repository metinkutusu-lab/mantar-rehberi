// Tür listesini (veri/turler.json) bir kez yükler. Yüklenemezse boş liste döner;
// o zaman tanımlama sonucu en fazla turuncu olur.
import { ADIMLAR } from './sorular.js';

let yukleniyor;

export function turleriYukle() {
  yukleniyor ??= fetch('./veri/turler.json')
    .then((yanit) => yanit.json())
    .then((veri) => (Array.isArray(veri.turler) ? veri.turler : []))
    .catch(() => []);
  return yukleniyor;
}

export const ZEHIRLILIK_ADLARI = {
  olumcul: 'Ölümcül',
  zehirli: 'Zehirli',
  yenen: 'Yenen tür',
};

const ONCELIK = { olumcul: 0, zehirli: 1, yenen: 2 };

// Fotoğrafın lisansının istediği atıf: çeken, lisans ve kaynak.
export function fotografAtfi(tur) {
  const f = tur.fotograf;
  return f ? `Fotoğraf: ${f.cekan} · ${f.lisans} · ${f.kaynak}` : '';
}

export const FOTOGRAF_UYARISI = 'Fotoğrafa benzetip karar verme: aynı tür yaşına, ışığa ve yere göre çok farklı görünebilir.';

// En tehlikeli türler önce; zehirliliği bilinmeyen tür en tehlikeli sayılır (kural 3).
export function tehlikeyeGoreSirala(turler) {
  return [...turler].sort((a, b) => (ONCELIK[a.zehirlilik] ?? -1) - (ONCELIK[b.zehirlilik] ?? -1));
}

// Uzman denetimi için: türün özelliklerini soru metinleri ve seçenek adlarıyla okunur hale getirir.
export function ozellikSatirlari(tur) {
  return ADIMLAR.filter((adim) => tur.ozellikler?.[adim.soru]).map((adim) => ({
    soru: adim.soruMetni,
    cevaplar: tur.ozellikler[adim.soru].map((deger) => adim.secenekler.find(([d]) => d === deger)?.[1] ?? deger),
  }));
}
