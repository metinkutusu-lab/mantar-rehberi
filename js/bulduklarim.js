// "Bulduğum mantarlar" (Metin'in isteği, 2026-10-28): her bulunan mantar ayrı bir kayıt: hangi mantar (kullanıcının
// kendi notu, uzman onayı değil), tam nokta, tarih ve not. Mantar ara haritasında türün fotoğrafıyla işaretlenir;
// Yerlerim'de "Bölgelerim"den (yağmur takibi için genel yerler) ayrı listelenir.
// Kayıtlar eski "gizli yerler" ile aynı yerde durur (durum.gizliYerler; eskiler "türü belirtilmemiş" sayılır).
// Tam konum yalnızca bu cihazda kalır, hiçbir yere gönderilmez (kural 12).
import { el, kucukFotograf } from './dom.js';
import { durumuOku, durumuYaz } from './durum.js';
import { aranmaSirasinaGore } from './uygunluk.js';

const AZAMI_KAYIT = 200;

export const bulduklarim = () => durumuOku().gizliYerler ?? [];

export const KENDI_NOTUN = 'Tür senin notun, uzman onayı değil. Bulduğun her mantarı yine Tanımla ile incele.';

const kisaAd = (t) => t.ad.replace(/\s*\(.*\)$/, '');

// Kaydın görünen adı: türün adı ya da (eski kayıtlarda) yazılan ad.
export function kayitAdi(kayit, turler) {
  const tur = turler.find((t) => t.id === kayit.turId);
  if (tur) return kisaAd(tur);
  return kayit.ad || 'Türü belirtilmemiş';
}

export function bulduguKaydet({ enlem, boylam, turId, not, turler }) {
  const liste = bulduklarim();
  const tur = turler.find((t) => t.id === turId);
  const kayit = {
    id: `${Date.now()}`,
    ad: tur ? kisaAd(tur) : 'Türü belirtilmemiş',
    turId: tur ? tur.id : null,
    not: (not ?? '').trim(),
    // Yeri tekrar bulabilmek için tam konum saklanır; yalnızca bu cihazda kalır.
    enlem: Math.round(enlem * 1e5) / 1e5,
    boylam: Math.round(boylam * 1e5) / 1e5,
    tarih: new Date().toISOString(),
  };
  durumuYaz({ ...durumuOku(), gizliYerler: [kayit, ...liste].slice(0, AZAMI_KAYIT) });
  document.dispatchEvent(new Event('yerler-degisti'));
  return kayit;
}

export function bulduguSil(id) {
  durumuYaz({ ...durumuOku(), gizliYerler: bulduklarim().filter((k) => k.id !== id) });
  document.dispatchEvent(new Event('yerler-degisti'));
}

// Tür seçici: "Bilmiyorum" önce, sonra toplanan türler (aranma sırasıyla), sonra zehirli türler (zehirli bir mantarın
// yerini de işaretleyip kaçınmak isteyebilir). Fotoğraflı, yana kaydırılır.
export function turSecici(turler, seciliId, sec) {
  const yenen = aranmaSirasinaGore(turler.filter((t) => t.zehirlilik === 'yenen'));
  const diger = turler.filter((t) => t.zehirlilik !== 'yenen').sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  const secenek = (id, ad, resim, tehlikeli = false) => {
    const d = el('button', { type: 'button', className: `tur-secenek${seciliId === id ? ' secili' : ''}${tehlikeli ? ' tehlikeli' : ''}`, onclick: () => sec(id) },
      resim, el('span', { className: 'tur-secenek-ad', textContent: ad }));
    d.setAttribute('aria-pressed', String(seciliId === id));
    return d;
  };
  const bilinmeyen = el('span', { className: 'tur-secenek-hepsi', textContent: '?' });
  const secici = el('div', { className: 'tur-secici kucuk' },
    secenek(null, 'Bilmiyorum', bilinmeyen),
    ...yenen.map((t) => secenek(t.id, kisaAd(t), kucukFotograf(t, 'tur-secenek-resim'))),
    ...diger.map((t) => secenek(t.id, kisaAd(t), kucukFotograf(t, 'tur-secenek-resim'), true)),
  );
  secici.setAttribute('aria-label', 'Hangi mantar?');
  return secici;
}

// Haritadaki işaret: türün yuvarlak fotoğrafı ve altında sivri uç; türü belirtilmemişse mantar simgesi.
export function isaretOgesi(kayit, turler) {
  const tur = turler.find((t) => t.id === kayit.turId);
  const resim = tur?.fotograf ? kucukFotograf(tur, 'buldugum-isaret-resim') : el('span', { className: 'buldugum-isaret-bos', textContent: '?' });
  return el('span', { className: `buldugum-isaret${tur && tur.zehirlilik !== 'yenen' ? ' tehlikeli' : ''}` }, resim);
}
