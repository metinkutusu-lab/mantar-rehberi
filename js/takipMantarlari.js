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
let kap = null;
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
  if (!mevsimdeMi(tur, ay)) return { durum: 'mevsimDisi', yazi: `Mevsimi değil (${ayAraligi(tur.aylar)})`, yuzde: 0 };
  if (!daily) return { durum: 'bilgiYok', yazi: 'Yağmur bilgisi bekleniyor', yuzde: 0 };
  const profilAdi = tur.yagmurSonrasi ?? 'orta';
  const profil = GECIKME_PROFILLERI[profilAdi] ?? GECIKME_PROFILLERI.orta;
  const p = mantarPenceresi(gunlukKayitlar(daily), bugun, profilAdi);
  if (p.durum === 'verimli') {
    const s = p.simdiki;
    return { durum: 'verimli', yazi: s.verimliKalanGun <= 1 ? 'En uygun dönemin son günü' : `Şimdi en uygun dönem · ${s.verimliKalanGun} gün daha`, yuzde: Math.round((s.verimliKalanGun / s.verimliToplamGun) * 100) };
  }
  if (p.durum === 'bekle') {
    const kalan = p.siradaki.kalanGun;
    return { durum: 'bekle', yazi: kalan <= 1 ? 'En uygun dönem yarın başlıyor' : `En uygun döneme ${kalan} gün`, yuzde: Math.round(Math.max(0, profil.bas - kalan) / profil.bas * 100) };
  }
  if (p.durum === 'azaliyor') {
    return { durum: 'azaliyor', yazi: `Azalıyor · ${p.simdiki.kalanGun} gün içinde kurur`, yuzde: Math.round((p.simdiki.kalanGun / Math.max(1, p.simdiki.azalmaToplamGun)) * 100) };
  }
  if (p.tahmin) {
    const bas = new Date(p.tahmin.tarih.getTime() + profil.bas * 864e5);
    return { durum: 'yok', yazi: `Yağmur bekleniyor (${tarihYaz(p.tahmin.tarih)}); en uygun dönem ${tarihYaz(bas)} civarı`, yuzde: 0 };
  }
  return { durum: 'yok', yazi: 'Son haftalarda büyük yağmur yok; mantar zor çıkar', yuzde: 0 };
}

function satirCiz(tur, daily) {
  const d = turDurumu(tur, daily);
  const dolgu = el('span', { className: 'takip-cubuk-dolgu' });
  // Çubuk boştan dolarak açılır (canlılık); hareket azaltma tercihi olan telefonda CSS hareketi kapatır.
  requestAnimationFrame(() => requestAnimationFrame(() => { dolgu.style.width = `${d.yuzde}%`; }));
  return el('button', {
    type: 'button',
    className: `takip-tur durum-${d.durum}`,
    onclick: () => document.dispatchEvent(new CustomEvent('ansiklopedide-ac', { detail: tur.id })),
    'aria-label': `${kisaAd(tur)}: ${d.yazi}`,
  },
  el('span', { className: 'takip-foto' }, kucukFotograf(tur, 'takip-foto-resim')),
  el('span', { className: 'takip-govde' },
    el('strong', { textContent: kisaAd(tur) }),
    el('span', { className: 'takip-yazi', textContent: d.yazi }),
    el('span', { className: 'takip-cubuk', 'aria-hidden': 'true' }, dolgu),
  ));
}

function seciciCiz(turler) {
  const secili = new Set(secilenler());
  const yenen = aranmaSirasinaGore(turler.filter((t) => t.zehirlilik === 'yenen' && t.fotograf?.dosya));
  const not = el('p', { className: 'not', textContent: `En çok ${AZAMI_TAKIP_MANTARI} mantar seçebilirsin.` });
  return el('div', { className: 'takip-secici' },
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
          ciz();
        },
      }, kucukFotograf(t, 'takip-secenek-resim'), el('span', { textContent: kisaAd(t) }));
      d.querySelector('img')?.setAttribute('loading', 'eager');
      return d;
    })),
    el('button', { type: 'button', className: 'birincil', textContent: 'Tamam', onclick: () => { secimAcik = false; ciz(); } }),
  );
}

async function ciz() {
  if (!kap) return;
  const { takipYeri, takipVerisi } = durumuOku();
  kap.hidden = !takipYeri;
  if (!takipYeri) return;
  const turler = await turleriYukle();
  const secili = secilenler().map((id) => turler.find((t) => t.id === id)).filter(Boolean);
  const baslik = el('div', { className: 'takip-baslik' },
    el('strong', { textContent: 'Aradığın mantarlar' }),
    el('button', { type: 'button', className: 'metin-dugme', textContent: secimAcik ? 'Kapat' : secili.length ? 'Değiştir' : 'Seç', onclick: () => { secimAcik = !secimAcik; ciz(); } }),
  );
  const govde = [];
  if (secimAcik) govde.push(seciciCiz(turler));
  if (!secili.length && !secimAcik) {
    govde.push(el('p', { className: 'not', textContent: `Aradığın mantarları seç; ${takipYeri.ad} için her birinin ne zaman en uygun dönemde olduğunu göstereyim.` }));
  }
  govde.push(...secili.map((t) => satirCiz(t, takipVerisi?.daily)));
  if (secili.length) govde.push(el('p', { className: 'not', textContent: TAKIP_NOTU }));
  kap.replaceChildren(baslik, ...govde);
}

export function takipMantarlari() {
  if (!kap) {
    kap = el('section', { className: 'takip-mantarlari', hidden: true, 'aria-label': 'Aradığın mantarlar' });
    document.addEventListener('takip-guncellendi', () => ciz());
  }
  ciz();
  return kap;
}
