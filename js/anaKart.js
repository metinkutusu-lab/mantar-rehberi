// Ana ekrandaki tek "Mantar zamanı" kartı (Metin'in isteği, 2026-10-26: üç ayrı kart yerine tek kart):
// - Üstte mantar mevsimi ve takip edilen yerin çubukları; altında Şimdi güncelle / Takibi bırak.
// - (i) düğmesi bütün açıklamaları tek yerde açar: mevsim tarihleri, nereye bakmalı, yerin yağmur ayrıntıları.
// - "Yerlerim": kayıtlı ve gizli yerlerin tek listesi, yer arama, konum ve elle yağmur tarihi.
import { cubukCiz, el } from './dom.js';
import { MEVSIM_NOTU, SICAKLIK_IPUCU, mevsimDurumu } from './mevsim.js';
import { KAYNAK_NOTU, YAGMUR_NOTU } from './yagmur.js';
import { aramaBolumu, takipBilgisi, takipSatiri } from './yagmurKarti.js';
import { konumBolumu, yerlerimAcildi, yerlerimListesi } from './yerlerim.js';

const tarih = (t) => t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

const mevsimSatiri = el('div', { className: 'ana-satir' });
const mevsimBilgisi = el('div', { className: 'bilgi-bolum' });

const bilgiPaneli = el('div', { className: 'bilgi-paneli', hidden: true },
  mevsimBilgisi,
  takipBilgisi(),
  el('p', { className: 'not', textContent: `${YAGMUR_NOTU} ${KAYNAK_NOTU}` }),
);

const bilgiDugmesi = el('button', {
  type: 'button',
  className: 'bilgi-dugme',
  textContent: 'i',
  onclick: () => {
    bilgiPaneli.hidden = !bilgiPaneli.hidden;
    bilgiDugmesi.setAttribute('aria-expanded', String(!bilgiPaneli.hidden));
  },
});
bilgiDugmesi.setAttribute('aria-label', 'Açıklamaları göster');
bilgiDugmesi.setAttribute('aria-expanded', 'false');

const yerlerim = el('details', { className: 'yerlerim' },
  el('summary', {},
    el('span', {},
      el('strong', { textContent: 'Yerlerim' }),
      el('span', { className: 'yagmur-ozet', textContent: 'Kayıtlı yerler, yer ara, konumum' }),
    ),
  ),
  el('div', { className: 'yerlerim-govde' }, yerlerimListesi(), konumBolumu(), aramaBolumu()),
);
yerlerim.addEventListener('toggle', () => { if (yerlerim.open) yerlerimAcildi(); });
// "Yer seç" düğmesi (takip edilen yer yokken) Yerlerim'i açar.
document.addEventListener('yerlerimi-ac', () => {
  yerlerim.open = true;
  yerlerim.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const kart = el('section', { className: 'kart ana-kart' },
  el('div', { className: 'ana-ust' },
    el('h2', { className: 'ana-baslik', textContent: 'Mantar zamanı' }),
    bilgiDugmesi,
  ),
  mevsimSatiri,
  takipSatiri(),
  bilgiPaneli,
  yerlerim,
);

// Mevsim satırı ve açıklaması; gün değişince yeniden çizilir.
export function mevsimiYenile() {
  const d = mevsimDurumu();
  mevsimSatiri.className = `ana-satir${d.icinde ? '' : ' mevsim-disi'}`;
  mevsimSatiri.replaceChildren(
    el('div', { className: 'mevsim-ust' },
      el('strong', { textContent: d.icinde ? d.ad : 'Şu an mantar mevsimi değil' }),
      el('span', { className: 'mevsim-gun', textContent: d.icinde ? `${d.kalanGun} gün kaldı` : `${d.kalanGun} gün sonra` }),
    ),
    cubukCiz(Math.round((d.icinde ? d.kalanOran : 0) * 100), 'Mantar mevsiminin kalan kısmı'),
  );
  mevsimBilgisi.replaceChildren(
    el('p', {}, el('strong', { textContent: d.icinde ? `${d.ad}: ` : `Sıradaki: ${d.ad}, ` }),
      d.icinde ? `${tarih(d.baslangic)} – ${tarih(d.bitis)}. ` : `başlangıç ${tarih(d.baslangic)}. `,
      MEVSIM_NOTU),
    el('p', { textContent: `${d.ipucu} ${SICAKLIK_IPUCU}` }),
  );
}

export function anaKart() {
  mevsimiYenile();
  return kart;
}
