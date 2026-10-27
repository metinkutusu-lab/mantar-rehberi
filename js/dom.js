// Ekran çizmek için küçük yardımcılar.
import { CIZIMLER } from './cizimler.js';

export function el(etiket, ozellikler = {}, ...cocuklar) {
  const oge = document.createElement(etiket);
  // Tireli adlar (aria-label, data-soru…) öznitelik olarak yazılır; diğerleri özellik olarak.
  for (const [ad, deger] of Object.entries(ozellikler)) {
    if (ad.includes('-')) oge.setAttribute(ad, deger);
    else oge[ad] = deger;
  }
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
  konum: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  galeri: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  firca:'<path d="M20 4l-7.5 7.5"/><path d="M11 10l3 3-2.5 2.5-3-3z"/><path d="M8.5 12.5 3.5 17.5 6.5 20.5l5-5"/><path d="M5 19l2.5-2.5"/>',
  sepet:'<path d="M3 10h18l-1.6 8.4a2 2 0 0 1-2 1.6H6.6a2 2 0 0 1-2-1.6z"/><path d="M7.5 10 11 4"/><path d="M16.5 10 13 4"/><path d="M9 13.5v3"/><path d="M12 13.5v3"/><path d="M15 13.5v3"/>',
  ses:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
  yenile:'<path d="M20 12a8 8 0 0 1-14.3 4.9"/><path d="M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.5H14"/><path d="M5.5 21v-4.5H10"/>',
  paylas:'<path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"/><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/>',
};

// js/cizimler.js'teki şematik bir çizim.
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

// Türün küçük fotoğrafı (liste ve benzerler için). Fotoğrafı yoksa boş döner.
export function kucukFotograf(tur, sinif = 'tur-kucuk') {
  if (!tur?.fotograf) return '';
  return el('img', { className: sinif, src: tur.fotograf.dosya, alt: tur.ad, loading: 'lazy', decoding: 'async' });
}

// Mevsim ve mantar dönemi çubuğu: kalan süre (yuzde, 0–100) sağa yaslı koyu renkle gösterilir.
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
