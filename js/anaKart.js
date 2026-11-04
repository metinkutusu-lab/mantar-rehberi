// Ana ekrandaki tek "Mantar zamanı" kartı (Metin'in isteği, 2026-10-26: üç ayrı kart yerine tek kart):
// - Üstte mantar mevsimi ve takip edilen yerin çubukları; altında Şimdi güncelle / Takibi bırak.
// - (i) düğmesi bütün açıklamaları tek yerde açar: mevsim tarihleri, nereye bakmalı, yerin yağmur ayrıntıları.
// - "Yerlerim": kayıtlı ve gizli yerlerin tek listesi, yer arama, konum ve elle yağmur tarihi.
import { cubukCiz, el, kucukFotograf } from './dom.js';
import { MEVSIM_NOTU, SICAKLIK_IPUCU, mevsimDurumu } from './mevsim.js';
import { turleriYukle } from './turler.js';
import { aranmaSirasinaGore, mevsimdeMi } from './uygunluk.js';
import { KAYNAK_NOTU, YAGMUR_NOTU } from './yagmur.js';
import { aramaBolumu, takipBilgisi, takipSatiri } from './yagmurKarti.js';
import { arananTurIdleri, takipBilgiMetni, takipKutulari, takipSecici } from './takipMantarlari.js';
import { konumBolumu, yerlerimAcildi, yerlerimListesi } from './yerlerim.js';

const tarih = (t) => t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

const mevsimSatiri = el('div', { className: 'ana-satir' });
const mevsimBilgisi = el('div', { className: 'bilgi-bolum' });

// Kartın en üstünde bu mevsimin bütün mantarları: kaydırılabilir şerit, fotoğraf ve ad (Metin, 2026-10-28: "Mantar zamanı"
// başlığı kalktı, altındaki "Sonbahar mantar mevsimi" satırı aynı şeyi söylüyordu). Yalnızca şu ay mevsimi olan (TASLAK
// `aylar`) toplanan türler, aranma sırasıyla; dokununca ansiklopedideki sayfası açılır. Toprak altında yetişen yumrular
// (trüf, keme) renk katmadığı için sona. Fotoğrafları çekenler ve lisansları (i) panelinde yazar.
const YUMRULAR = new Set(['kara-truf', 'keme']);
const mevsimFotolari = el('div', { className: 'mevsim-fotolari', role: 'list', 'aria-label': 'Bu mevsimin mantarları' });
const fotoKaynaklari = el('p', { className: 'not' });
const takipNotu = el('p', { className: 'not' });

const bilgiPaneli = el('div', { className: 'bilgi-paneli', hidden: true },
  mevsimBilgisi,
  takipBilgisi(),
  takipNotu,
  el('p', { className: 'not', textContent: `${YAGMUR_NOTU} ${KAYNAK_NOTU}` }),
  fotoKaynaklari,
);

// Aranan mantarlar (js/takipMantarlari.js) şeridin başında; mevsim listesinde tekrar edilmezler (Metin, 2026-11-04).
let cizimSirasi = 0;
async function mevsimFotolariniCiz() {
  const bu = ++cizimSirasi;
  const ay = new Date().getMonth() + 1;
  const turler = await turleriYukle();
  const aranan = new Set(arananTurIdleri());
  const secilen = aranmaSirasinaGore(turler
    .filter((t) => t.zehirlilik === 'yenen' && t.aylar?.length && mevsimdeMi(t, ay) && t.fotograf?.dosya && !aranan.has(t.id)))
    .sort((x, y) => YUMRULAR.has(x.id) - YUMRULAR.has(y.id));
  const notMetni = await takipBilgiMetni();
  if (bu !== cizimSirasi) return; // Arada yeni bir çizim başladıysa eskisi yazılmasın.
  mevsimFotolari.replaceChildren(...takipKutulari(turler), ...secilen.map((t) => {
    const d = el('button', { type: 'button', className: 'mevsim-foto', onclick: () => document.dispatchEvent(new CustomEvent('ansiklopedide-ac', { detail: t.id })) },
      kucukFotograf(t, 'mevsim-foto-resim'), el('span', { className: 'mevsim-foto-ad', textContent: t.ad.replace(/\s*\(.*\)$/, '') }));
    d.setAttribute('role', 'listitem');
    d.setAttribute('aria-label', `${t.ad.replace(/\s*\(.*\)$/, '')}: ansiklopedide aç`);
    return d;
  }));
  takipNotu.textContent = notMetni;
  const fotolu = [...turler.filter((t) => aranan.has(t.id) && t.fotograf), ...secilen];
  fotoKaynaklari.textContent = fotolu.length
    ? `Üstteki fotoğraflar: ${fotolu.map((t) => `${t.ad.replace(/\s*\(.*\)$/, '')}: ${t.fotograf.cekan ?? t.fotograf.ceken ?? ''}, ${t.fotograf.lisans}`).join('; ')}.`
    : '';
}
document.addEventListener('mevsim-seridi-yenile', () => mevsimFotolariniCiz());

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
    el('span', { className: 'acilir-ok', 'aria-hidden': 'true' }),
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
    mevsimFotolari,
    bilgiDugmesi,
  ),
  // Aradığın mantarların seçicisi şeridin hemen altında açılır.
  takipSecici(),
  mevsimSatiri,
  takipSatiri(),
  // "Mantar ara" düğmesi 2026-11-04'te sayfanın en üstüne, Fotoğrafla tanımla'nın yanına taşındı (js/tanimla.js).
  bilgiPaneli,
  yerlerim,
);

// Mevsim satırı ve açıklaması; gün değişince yeniden çizilir.
export function mevsimiYenile() {
  mevsimFotolariniCiz();
  const d = mevsimDurumu();
  mevsimSatiri.className = `ana-satir${d.icinde ? '' : ' mevsim-disi'}`;
  mevsimSatiri.replaceChildren(
    el('div', { className: 'mevsim-ust' },
      // Mevsim dışında sıradaki mevsimin adı ve başlamasına kalan gün yazar (Metin, 2026-10-27: "bitince sıradaki sezona
      // kadar şu kadar gün kaldı mı yazacak?").
      el('strong', { textContent: d.icinde ? d.ad : `Sıradaki: ${d.ad}` }),
      el('span', { className: 'mevsim-gun', textContent: d.icinde ? `${d.kalanGun} gün kaldı` : `${d.kalanGun} gün sonra başlıyor` }),
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
