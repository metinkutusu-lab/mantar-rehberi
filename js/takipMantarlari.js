// Ana sayfada "Aradığın mantarlar" (Metin, 2026-11-02: "takip ettiğimiz yerde aradığımız birkaç mantar için bugün, yarın,
// en verimli gün canlı gözüksün; sayfa canlansın"). Kullanıcı en çok 3 yenen tür seçer; takip edilen yerin yağmuruna göre
// her biri için türün yaklaşık dönemi (js/yagmur.js GECIKME_PROFILLERI, veri/turler.json yagmurSonrasi) ve mevsimi (aylar)
// gösterilir. En uygun dönemdeki türün fotoğrafı nabız gibi atar, çubuklar dolarak açılır.
// Yazılarda "lezzetli" ya da "kesin bulursun" yoktur: dönem yalnızca yaklaşık bir ipucudur (kural 1'in ruhu).
// Seçim yalnızca bu cihazda saklanır (durum.takipMantarlari).
import { el, kucukFotograf } from './dom.js';
import { durumuOku, durumuYaz } from './durum.js';
import { turleriYukle } from './turler.js';
import { aranmaSirasinaGore, ayAraligi, mevsimdeMi } from './uygunluk.js';
import { GECIKME_PROFILLERI, gunlukKayitlar, mantarPenceresi } from './yagmur.js';

export const AZAMI_TAKIP_MANTARI = 3;
export const TAKIP_NOTU = 'Yaklaşık bir ipucudur: mantarın çıkması toprağa, ağaca ve sıcaklığa da bağlıdır. Bulduğun her mantarı Tanımla ile incele.';

// Bölüm ilk çağrıda kurulur (hesap kısmı testte tarayıcı olmadan da çalışsın).
let seciciKap = null;
let secimAcik = false;
const kisaAd = (t) => t.ad.replace(/\s*\(.*\)$/, '');
const tarihYaz = (t) => t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

function secilenler() {
  return durumuOku().takipMantarlari ?? [];
}

function secimiYaz(liste) {
  durumuYaz({ ...durumuOku(), takipMantarlari: liste });
}

/**
 * Bir türün takip edilen yerdeki durumu (yalnızca hesap; ekrandan bağımsız, testli).
 * Dönüş: { durum: 'mevsimDisi' | 'verimli' | 'bekle' | 'azaliyor' | 'yok' | 'bilgiYok', yazi, yuzde (0–100) }
 */
export function turDurumu(tur, daily, bugun = new Date()) {
  const ay = bugun.getMonth() + 1;
  if (!mevsimdeMi(tur, ay)) return { durum: 'mevsimDisi', yazi: `Mevsimi değil (${ayAraligi(tur.aylar)})`, kisa: 'Mevsimi değil', yuzde: 0 };
  if (!daily) return { durum: 'bilgiYok', yazi: 'Yağmur bilgisi bekleniyor', kisa: 'Bekleniyor', yuzde: 0 };
  const profilAdi = tur.yagmurSonrasi ?? 'orta';
  const profil = GECIKME_PROFILLERI[profilAdi] ?? GECIKME_PROFILLERI.orta;
  const p = mantarPenceresi(gunlukKayitlar(daily), bugun, profilAdi);
  if (p.durum === 'verimli') {
    const s = p.simdiki;
    return { durum: 'verimli', yazi: s.verimliKalanGun <= 1 ? 'En uygun dönemin son günü' : `Şimdi en uygun dönem · ${s.verimliKalanGun} gün daha`, kisa: s.verimliKalanGun <= 1 ? 'Son gün' : 'En uygun', yuzde: Math.round((s.verimliKalanGun / s.verimliToplamGun) * 100) };
  }
  if (p.durum === 'bekle') {
    const kalan = p.siradaki.kalanGun;
    return { durum: 'bekle', yazi: kalan <= 1 ? 'En uygun dönem yarın başlıyor' : `En uygun döneme ${kalan} gün`, kisa: kalan <= 1 ? 'Yarın' : `${kalan} gün sonra`, yuzde: Math.round(Math.max(0, profil.bas - kalan) / profil.bas * 100) };
  }
  if (p.durum === 'azaliyor') {
    return { durum: 'azaliyor', yazi: `Azalıyor · ${p.simdiki.kalanGun} gün içinde kurur`, kisa: 'Azalıyor', yuzde: Math.round((p.simdiki.kalanGun / Math.max(1, p.simdiki.azalmaToplamGun)) * 100) };
  }
  if (p.tahmin) {
    const bas = new Date(p.tahmin.tarih.getTime() + profil.bas * 864e5);
    return { durum: 'yok', yazi: `Yağmur bekleniyor (${tarihYaz(p.tahmin.tarih)}); en uygun dönem ${tarihYaz(bas)} civarı`, kisa: 'Yağmur bekleniyor', yuzde: 0 };
  }
  return { durum: 'yok', yazi: 'Son haftalarda büyük yağmur yok; mantar zor çıkar', kisa: 'Yağmur yok', yuzde: 0 };
}

// Şerit yeniden çizilsin (js/anaKart.js dinler).
const seridiYenile = () => document.dispatchEvent(new Event('mevsim-seridi-yenile'));

// Takip edilen yer varken aranan türlerin kimlikleri (şeritte bunlar başa alınır, mevsim listesinde tekrar edilmez).
export function arananTurIdleri() {
  return durumuOku().takipYeri ? secilenler() : [];
}

// Şeritteki tek aranan tür: fotoğraf, ad, kısa durum ve altında dolan küçük çubuk. Dokununca ansiklopedideki sayfası açılır.
function kutuCiz(tur, daily) {
  const d = turDurumu(tur, daily);
  const dolgu = el('span', { className: 'takip-cubuk-dolgu' });
  // Çubuk boştan dolarak açılır (canlılık); hareket azaltma tercihi olan telefonda CSS hareketi kapatır.
  requestAnimationFrame(() => requestAnimationFrame(() => { dolgu.style.width = `${d.yuzde}%`; }));
  const k = el('button', {
    type: 'button',
    className: `mevsim-foto aranan durum-${d.durum}`,
    onclick: () => document.dispatchEvent(new CustomEvent('ansiklopedide-ac', { detail: tur.id })),
  },
  el('span', { className: 'takip-foto' }, kucukFotograf(tur, 'mevsim-foto-resim')),
  el('span', { className: 'mevsim-foto-ad', textContent: kisaAd(tur) }),
  el('span', { className: 'aranan-durum', textContent: d.kisa }),
  el('span', { className: 'takip-cubuk', 'aria-hidden': 'true' }, dolgu));
  k.setAttribute('role', 'listitem');
  k.setAttribute('aria-label', `Aradığın mantar, ${kisaAd(tur)}: ${d.yazi}. Ansiklopedide aç`);
  return k;
}

/**
 * Mevsim şeridinin başına girecek kutular: aranan türler ve "Seç / Değiştir" kutusu.
 * Takip edilen yer yoksa boş liste (bölüm daha önce de yalnızca takip edilen yer varken görünüyordu).
 */
export function takipKutulari(turler) {
  const { takipYeri, takipVerisi } = durumuOku();
  if (!takipYeri) return [];
  const secili = secilenler().map((id) => turler.find((t) => t.id === id)).filter(Boolean);
  const sec = el('button', {
    type: 'button',
    className: `mevsim-foto aranan-sec${secimAcik ? ' acik' : ''}`,
    'aria-expanded': String(secimAcik),
    onclick: () => { secimAcik = !secimAcik; seciciCiz(); seridiYenile(); },
  },
  el('span', { className: 'aranan-sec-daire', 'aria-hidden': 'true', textContent: secimAcik ? '✕' : secili.length ? '✎' : '+' }),
  el('span', { className: 'mevsim-foto-ad', textContent: secimAcik ? 'Kapat' : secili.length ? 'Değiştir' : 'Aradığını seç' }));
  sec.setAttribute('role', 'listitem');
  sec.setAttribute('aria-label', secimAcik ? 'Seçimi kapat' : `Aradığın mantarları ${secili.length ? 'değiştir' : 'seç'}: ${takipYeri.ad} için ne zaman en uygun dönemde olduklarını gösterir`);
  const kutular = secili.map((t) => kutuCiz(t, takipVerisi?.daily));
  return [...kutular, sec, el('span', { className: 'aranan-ayrac', 'aria-hidden': 'true' })];
}

// (i) panelindeki açıklama: aranan türlerin uzun durum yazıları ve not.
export async function takipBilgiMetni() {
  const { takipYeri, takipVerisi } = durumuOku();
  if (!takipYeri) return '';
  const turler = await turleriYukle();
  const secili = secilenler().map((id) => turler.find((t) => t.id === id)).filter(Boolean);
  if (!secili.length) return '';
  return `Aradığın mantarlar (${takipYeri.ad}): ${secili.map((t) => `${kisaAd(t)}: ${turDurumu(t, takipVerisi?.daily).yazi}`).join('; ')}. ${TAKIP_NOTU}`;
}

async function seciciCiz() {
  if (!seciciKap) return;
  seciciKap.hidden = !secimAcik || !durumuOku().takipYeri;
  if (seciciKap.hidden) { seciciKap.replaceChildren(); return; }
  const turler = await turleriYukle();
  const secili = new Set(secilenler());
  const yenen = aranmaSirasinaGore(turler.filter((t) => t.zehirlilik === 'yenen' && t.fotograf?.dosya));
  const not = el('p', { className: 'not', textContent: `Aradığın mantarları seç (en çok ${AZAMI_TAKIP_MANTARI}); ${durumuOku().takipYeri.ad} için her birinin ne zaman en uygun dönemde olduğunu göstereyim.` });
  seciciKap.replaceChildren(
    not,
    el('div', { className: 'takip-secenekler' }, ...yenen.map((t) => {
      const d = el('button', {
        type: 'button',
        className: `takip-secenek${secili.has(t.id) ? ' secili' : ''}`,
        'aria-pressed': String(secili.has(t.id)),
        onclick: () => {
          if (secili.has(t.id)) secili.delete(t.id);
          else if (secili.size < AZAMI_TAKIP_MANTARI) secili.add(t.id);
          else { not.textContent = `En çok ${AZAMI_TAKIP_MANTARI} mantar seçebilirsin; önce birini çıkar.`; return; }
          secimiYaz([...secili]);
          seciciCiz();
          seridiYenile();
        },
      }, kucukFotograf(t, 'takip-secenek-resim'), el('span', { textContent: kisaAd(t) }));
      d.querySelector('img')?.setAttribute('loading', 'eager');
      return d;
    })),
    el('button', { type: 'button', className: 'birincil', textContent: 'Tamam', onclick: () => { secimAcik = false; seciciCiz(); seridiYenile(); } }),
  );
}

// Şeridin altında açılan seçici (kartı js/anaKart.js kurar).
export function takipSecici() {
  if (!seciciKap) {
    seciciKap = el('section', { className: 'takip-secici', hidden: true, 'aria-label': 'Aradığın mantarları seç' });
    // Takip edilen yer bırakılınca ya da değişince seçici ve şerit yenilenir.
    document.addEventListener('takip-guncellendi', () => { seciciCiz(); seridiYenile(); });
  }
  seciciCiz();
  return seciciKap;
}
