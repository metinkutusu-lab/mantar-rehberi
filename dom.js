// Ekran çizmek için küçük yardımcılar.
import { CIZIMLER } from './cizimler.js';

export function el(etiket, ozellikler = {}, ...cocuklar) {
  const oge = document.createElement(etiket);
  Object.assign(oge, ozellikler);
  oge.append(...cocuklar);
  return oge;
}

// Çizgi ikonlar (24x24). Sabit metinlerdir; kullanıcı girdisi içermez.
const IKONLAR = {
  kamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  bicak: '<path d="M4 20l6-6"/><path d="M10 14l8.5-8.5a2.1 2.1 0 0 1 3 3L13 17z"/>',
  kagit: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
  uyari: '<path d="M12 3 2 21h20z"/><path d="M12 10v5"/><path d="M12 18h.01"/>',
  soru: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><path d="M12 17.5h.01"/>',
  bilgi: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>',
  tik: '<path d="M5 12l5 5L20 7"/>',
  paylas: '<path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"/><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/>',
};

// cizimler.js'teki şematik bir çizim.
export function cizim(ad, sinif = 'cizim') {
  const kap = document.createElement('span');
  kap.className = sinif;
  kap.innerHTML = CIZIMLER[ad] ?? '';
  return kap;
}

export function ikon(ad) {
  const kap = document.createElement('span');
  kap.className = 'ikon';
  kap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKONLAR[ad]}</svg>`;
  return kap;
}

const BILDIRIM_IKONLARI = { tehlike: 'uyari', uyari: 'uyari', bilgi: 'bilgi', tamam: 'tik' };

// tur: 'tehlike' | 'uyari' | 'bilgi' | 'tamam'
export function bildirim(tur, ...icerik) {
  return el('div', { className: `bildirim bildirim-${tur}` }, ikon(BILDIRIM_IKONLARI[tur]), el('div', {}, ...icerik));
}

// Mevsim ve mantar dönemi çubuğu: yuzde kadar dolu (0–100).
export function cubukCiz(yuzde, etiket) {
  const cubuk = el('div', { className: 'mevsim-cubugu' }, el('span', { style: `width: ${yuzde}%` }));
  cubuk.setAttribute('role', 'progressbar');
  cubuk.setAttribute('aria-valuenow', String(yuzde));
  cubuk.setAttribute('aria-valuemin', '0');
  cubuk.setAttribute('aria-valuemax', '100');
  cubuk.setAttribute('aria-label', etiket);
  return cubuk;
}

export function ilerlemeCiz(etiket, sira, toplam) {
  return el('div', { className: 'ilerleme' },
    el('div', { className: 'ilerleme-ust' },
      el('span', { textContent: etiket }),
      el('span', { textContent: `${sira} / ${toplam}` }),
    ),
    el('div', { className: 'ilerleme-cubugu' }, el('span', { style: `width: ${(sira / toplam) * 100}%` })),
  );
}
