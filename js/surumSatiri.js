// Sayfanın altındaki sürüm satırı: hangi sürüm, ne zaman yayınlandı, son sürüm mü; yanında "güncelle" düğmesi
// (dönen oklar). Dokununca yeni sürüm aranır; varsa iner ve uygulama kendini yeniler (js/uygulama.js).
import { el, ikon } from './dom.js';
import { SURUM, TARIH } from './surum.js';

const satir = el('div', { className: 'surum-satiri' });
let kayit = null;
let durum = 'bilinmiyor'; // 'bilinmiyor' | 'bakiliyor' | 'son' | 'iniyor' | 'internetsiz'
let sonBakis = null;

const DURUM_YAZILARI = {
  bilinmiyor: 'Güncelleme denetlenmedi',
  bakiliyor: 'Yeni sürüm aranıyor…',
  son: 'Son sürüm yüklü',
  iniyor: 'Yeni sürüm iniyor; uygulama kendini yenileyecek…',
  internetsiz: 'İnternet yok; denetlenemedi',
};

const tarihYazisi = () => new Date(`${TARIH}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

function ciz() {
  const saat = durum === 'son' && sonBakis ? ` (denetlendi: ${sonBakis.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })})` : '';
  const dugme = el('button', {
    type: 'button',
    className: `surum-dugme${durum === 'bakiliyor' || durum === 'iniyor' ? ' donuyor' : ''}`,
    'aria-label': 'Güncellemeyi denetle',
    title: 'Güncellemeyi denetle',
    onclick: () => guncellemeyiDenetle(),
    disabled: durum === 'bakiliyor' || durum === 'iniyor',
  }, ikon('yenile'));
  satir.replaceChildren(
    el('div', { className: 'surum-yazi' },
      el('strong', { textContent: `MushKey ${SURUM}` }),
      el('span', { textContent: ` · ${tarihYazisi()} sürümü` }),
      el('span', { className: `surum-durum surum-${durum}`, textContent: `${DURUM_YAZILARI[durum]}${saat}` }),
    ),
    dugme,
  );
}

export function surumSatiri() {
  ciz();
  return satir;
}

export function kayitAta(yeni) {
  kayit = yeni;
}

// Yeni sürüm arar. Varsa iner; inince controllerchange ile uygulama kendini yeniler.
export async function guncellemeyiDenetle() {
  if (!kayit) return;
  if (!navigator.onLine) {
    durum = 'internetsiz';
    ciz();
    return;
  }
  durum = 'bakiliyor';
  ciz();
  try {
    await kayit.update();
    durum = kayit.installing || kayit.waiting ? 'iniyor' : 'son';
  } catch {
    durum = 'internetsiz';
  }
  sonBakis = new Date();
  ciz();
}
