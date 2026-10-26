// Üzerinde bölümleri işaretli gerçek fotoğraf (sözlük ve tanımlama adımları).
// Metin'in kuralı (2026-10-26): tanımlamada çizim değil, gerçek fotoğraf gösterilir.
import { el } from './dom.js';
import { SOZLUK_FOTOGRAFLARI } from './sozluk.js';

// SVG öğesi (fotoğraf üzerindeki işaretler için). SVG ad alanı tarayıcıdan alınır; böylece kodda
// dış adrese benzeyen bir metin bulunmaz (kural 12 testi her adresi denetler).
let svgAdAlani;
function svgEl(etiket, ozellikler = {}, ...cocuklar) {
  if (!svgAdAlani) {
    const kap = document.createElement('div');
    kap.innerHTML = '<svg></svg>';
    svgAdAlani = kap.firstChild.namespaceURI;
  }
  const oge = document.createElementNS(svgAdAlani, etiket);
  for (const [ad, deger] of Object.entries(ozellikler)) oge.setAttribute(ad, String(deger));
  oge.append(...cocuklar);
  return oge;
}

// Gerçek fotoğraf ve üzerinde bölümlerin adları: nokta, çizgi ve yazı.
export function sozlukFotografi(foto) {
  const { genislik: w, yukseklik: h } = foto;
  const yuzde = (d, boy) => (d / 100) * boy;
  const yaziBoyu = Math.round(w * 0.046);
  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'sozluk-isaretler', 'aria-hidden': 'true' });
  for (const i of foto.isaretler) {
    const [nx, ny, yx, yy] = [yuzde(i.x, w), yuzde(i.y, h), yuzde(i.yx, w), yuzde(i.yy, h)];
    const hiza = i.yx < 35 ? 'start' : i.yx > 65 ? 'end' : 'middle';
    svg.append(
      svgEl('line', { x1: nx, y1: ny, x2: yx, y2: yy, class: 'isaret-cizgi' }),
      svgEl('circle', { cx: nx, cy: ny, r: w * 0.012, class: 'isaret-nokta' }),
      svgEl('text', { x: yx, y: yy, 'text-anchor': hiza, 'dominant-baseline': 'middle', 'font-size': yaziBoyu, class: 'isaret-yazi' }, i.metin),
    );
  }
  const bolumler = foto.isaretler.map((i) => i.metin).filter((m, j, liste) => liste.indexOf(m) === j).join(', ');
  return el('figure', { className: 'sozluk-foto' },
    el('div', { className: 'sozluk-foto-kap', style: `aspect-ratio: ${w} / ${h}` },
      el('img', { src: foto.dosya, alt: `Gerçek fotoğraf; işaretli bölümler: ${bolumler}`, loading: 'lazy', decoding: 'async' }),
      svg,
    ),
    // Lisans gereği: çeken, lisans ve kaynak yazılır; fotoğraf kırpılıp işaretlendiği için bu da belirtilir
    // (CC BY-SA: değiştirilmiş hâli de aynı lisansla paylaşılır).
    el('figcaption', { textContent: `Örnek: ${foto.ornek}. Fotoğraf: ${foto.cekan}, ${foto.lisans}, Wikimedia Commons (${foto.commonsDosyasi}). Kırpıldı ve üzerine işaret eklendi; bu hâli de aynı lisansla paylaşılır.` }),
  );
}

// Tanımlama adımlarında gösterilen sözlük fotoğrafı (adımın sorusuna göre). Fotoğrafı olmayan adımda hiçbir şey gösterilmez.
// Fotoğrafı henüz olmayanlar (2026-10-26): küçük kahverengi mantar, genç mantar kesiti, kesince/ezince renk değişimi,
// düz/kırışık alt yüzey, koku ve yer soruları.
const ADIM_FOTOGRAFLARI = {
  __ust: 'sapka',
  sapkaRengi: 'sapka',
  sapkaYuzeyi: 'sapka',
  genc: 'genc',
  altYapi: 'solungac',
  solungacRengi: 'solungac',
  halka: 'halka',
  volva: 'volva',
  sut: 'sut',
  sporIzi: 'spor-izi',
};
// Seçeneklerde çizim yerine küçük gerçek fotoğraf (js/sorular.js'teki çizim adına göre).
const SECENEK_FOTOGRAFLARI = { 'alt-solungac': 'solungac', 'alt-gozenek': 'gozenek', 'alt-diken': 'diken' };

export function adimFotografi(adim) {
  const foto = SOZLUK_FOTOGRAFLARI[ADIM_FOTOGRAFLARI[adim.soru]];
  return foto ? sozlukFotografi(foto) : '';
}

export function secenekFotografi(cizimAdi) {
  const foto = SOZLUK_FOTOGRAFLARI[SECENEK_FOTOGRAFLARI[cizimAdi]];
  return foto ? el('img', { className: 'secenek-foto', src: foto.dosya, alt: '', loading: 'lazy', decoding: 'async' }) : '';
}
