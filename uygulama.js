import { ETIKETLER, egitimTamamlanabilirMi, tanimlamaAcilabilirMi } from './kurallar.js';
import { DERSLER, FERAGAT_MADDELERI, FERAGAT_TASLAK_NOTU, SORULAR } from './egitim.js';
import { durumuOku, durumuYaz } from './durum.js';
import { bildirim, cizim, el, ilerlemeCiz } from './dom.js';
import { tanimlamaCiz } from './tanimla.js';
import { SOZLUK } from './sozluk.js';
import { oku } from './depo.js';

const EKRANLAR = ['tanimla', 'ansiklopedi', 'tarifler', 'acil'];
const EGITIM_ADIM_SAYISI = DERSLER.length + SORULAR.length + 1;

// Eğitimin o anki durumu; yalnızca eğitim bitince cihaza kaydedilir.
const egitim = { adim: 0, cevaplar: [], isaretler: [], tekrar: false };

function egitimiSifirla(tekrar) {
  Object.assign(egitim, { adim: 0, cevaplar: [], isaretler: [], tekrar });
}

function adimaGit(adim) {
  egitim.adim = adim;
  tanimlaCiz();
  window.scrollTo(0, 0);
}

function dersCiz(ders) {
  const govde = el('div', { className: 'ders' }, el('h2', { className: 'adim-baslik', textContent: ders.baslik }));
  if (ders.renkler) {
    for (const etiket of Object.values(ETIKETLER)) {
      govde.append(
        el('div', { className: `renk-kutu renk-${etiket.renk}` },
          el('strong', { textContent: etiket.baslik }),
          el('span', { textContent: etiket.mesaj }),
        ),
      );
    }
  }
  for (const paragraf of ders.paragraflar) govde.append(el('p', { className: 'yonerge', textContent: paragraf }));
  return govde;
}

function soruCiz(i) {
  const soru = SORULAR[i];
  const secilen = egitim.cevaplar[i];
  const liste = el('div', { className: 'secenekler' });
  soru.secenekler.forEach((secenek, j) => {
    liste.append(
      el('button', {
        type: 'button',
        className: `secenek${secilen === j ? ' secili' : ''}`,
        textContent: secenek.metin,
        onclick: () => {
          egitim.cevaplar[i] = j;
          tanimlaCiz();
        },
      }),
    );
  });
  const govde = el('div', { className: 'ders' },
    el('p', { className: 'ust-etiket', textContent: 'Kendini dene' }),
    el('h2', { className: 'adim-baslik', textContent: soru.soru }),
    liste,
  );
  if (secilen !== undefined) {
    const dogru = soru.secenekler[secilen].dogru;
    govde.append(
      bildirim(dogru ? 'tamam' : 'uyari',
        el('p', {}, el('strong', { textContent: dogru ? 'Doğru.' : 'Bu cevap tehlikeli. Tekrar dene.' })),
        el('p', { textContent: soru.aciklama }),
      ),
    );
  }
  return govde;
}

function feragatCiz() {
  const govde = el('div', { className: 'ders' },
    el('h2', { className: 'adim-baslik', textContent: 'Son adım: onay' }),
    el('p', { className: 'yonerge', textContent: 'Devam etmek için üç maddeyi de okuyup işaretle.' }),
  );
  FERAGAT_MADDELERI.forEach((madde, i) => {
    const kutu = el('input', {
      type: 'checkbox',
      checked: egitim.isaretler[i] === true,
      onchange: (olay) => {
        egitim.isaretler[i] = olay.target.checked;
        tanimlaCiz();
      },
    });
    govde.append(el('label', { className: `onay-satiri${egitim.isaretler[i] ? ' secili' : ''}` }, kutu, el('span', { textContent: madde })));
  });
  govde.append(el('p', { className: 'not', textContent: FERAGAT_TASLAK_NOTU }));
  return govde;
}

function egitimiBitir() {
  durumuYaz({
    ...durumuOku(),
    egitimTamam: true,
    feragatOnay: true,
    egitimTarihi: new Date().toISOString(),
  });
  egitimiSifirla(false);
  adimaGit(0);
}

function egitimAdimiCiz() {
  const { adim } = egitim;
  const soruBaslangici = DERSLER.length;
  const feragatAdimi = soruBaslangici + SORULAR.length;
  let govde;
  let ileriAcik = true;

  if (adim < soruBaslangici) {
    govde = dersCiz(DERSLER[adim]);
  } else if (adim < feragatAdimi) {
    const i = adim - soruBaslangici;
    govde = soruCiz(i);
    ileriAcik = SORULAR[i].secenekler[egitim.cevaplar[i]]?.dogru === true;
  } else {
    govde = feragatCiz();
    ileriAcik = egitimTamamlanabilirMi(SORULAR, egitim.cevaplar, FERAGAT_MADDELERI, egitim.isaretler);
  }

  const sonAdim = adim === feragatAdimi;
  const dugmeler = el('div', { className: 'dugmeler' });
  if (adim > 0) {
    dugmeler.append(el('button', { type: 'button', className: 'ikincil', textContent: 'Geri', onclick: () => adimaGit(adim - 1) }));
  }
  dugmeler.append(
    el('button', {
      type: 'button',
      className: 'birincil',
      textContent: sonAdim ? 'Eğitimi bitir' : 'İleri',
      disabled: !ileriAcik,
      onclick: () => (sonAdim ? egitimiBitir() : adimaGit(adim + 1)),
    }),
  );

  return el('div', { className: 'adim' }, ilerlemeCiz('Güvenlik eğitimi', adim + 1, EGITIM_ADIM_SAYISI), govde, dugmeler);
}

// Kural 11: eğitim ve feragat tamamlanmadan tanımlama açılmaz; onun yerine eğitim gösterilir.
function tanimlaCiz() {
  const kap = document.getElementById('tanimla-icerik');
  if (egitim.tekrar || !tanimlamaAcilabilirMi(durumuOku())) {
    kap.replaceChildren(egitimAdimiCiz());
    return;
  }
  tanimlamaCiz(kap, {
    egitimiTekrarIzle: () => {
      egitimiSifirla(true);
      adimaGit(0);
    },
  });
}

function sozlukCiz() {
  document.getElementById('sozluk').replaceChildren(
    ...SOZLUK.map((madde) =>
      el('div', { className: 'kart sozluk-karti' },
        cizim(madde.cizim, 'cizim sozluk-cizim'),
        el('div', {},
          el('h3', { className: 'kart-baslik', textContent: madde.terim }),
          el('p', { textContent: madde.tanim }),
        ),
      ),
    ),
  );
}

// Acil ekranı: son tanımlamanın özeti doktora gösterilmek üzere cihazdan okunur.
let sonOzetAdresi;
async function sonOzetiGoster() {
  const kayit = await oku('son-ozet');
  if (!kayit?.resim) return;
  if (sonOzetAdresi) URL.revokeObjectURL(sonOzetAdresi);
  sonOzetAdresi = URL.createObjectURL(kayit.resim);
  const tarih = new Date(kayit.tarih).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
  document.getElementById('son-ozet').replaceChildren(
    el('div', { className: 'kart' },
      el('h2', { className: 'kart-baslik', textContent: 'Son tanımlaman' }),
      el('p', { textContent: `${tarih}. Mantar yediysen bu resmi doktora göster: fotoğraflar ve cevapların içinde.` }),
      el('img', { className: 'son-ozet-resmi', src: sonOzetAdresi, alt: 'Son tanımlamanın özeti' }),
    ),
  );
}

function ekraniGoster() {
  const istenen = location.hash.slice(1);
  const secili = EKRANLAR.includes(istenen) ? istenen : 'tanimla';
  for (const ad of EKRANLAR) {
    document.getElementById(ad).hidden = ad !== secili;
  }
  for (const link of document.querySelectorAll('.alt-menu a')) {
    link.classList.toggle('secili', link.getAttribute('href') === `#${secili}`);
  }
  if (secili === 'acil') sonOzetiGoster();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', ekraniGoster);
tanimlaCiz();
sozlukCiz();
ekraniGoster();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
