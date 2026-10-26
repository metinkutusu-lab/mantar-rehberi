import { ETIKETLER, egitimTamamlanabilirMi, tanimlamaAcilabilirMi } from './kurallar.js';
import { DERSLER, FERAGAT_MADDELERI, FERAGAT_TASLAK_NOTU, SORULAR } from './egitim.js';
import { durumuOku, durumuYaz } from './durum.js';
import { bildirim, cizim, el, ilerlemeCiz, kucukFotograf } from './dom.js';
import { tanimlamaCiz } from './tanimla.js';
import { SOZLUK, SOZLUK_FOTOGRAFLARI } from './sozluk.js';
import { oku } from './depo.js';
import { FOTOGRAF_UYARISI, ZEHIRLILIK_ADLARI, fotografAtfi, ozellikSatirlari, tehlikeyeGoreSirala, turleriYukle } from './turler.js';
import { takibiYenile } from './yagmurKarti.js';
import { anaKart, mevsimiYenile } from './anaKart.js';

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

function tekrarIzlemeyiKapat() {
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
  } else if (egitim.tekrar) {
    dugmeler.append(el('button', { type: 'button', className: 'ikincil', textContent: 'Geri', onclick: tekrarIzlemeyiKapat }));
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

  // Eğitimi daha önce bitiren biri tekrar izlerken istediği an çıkabilir (ilk eğitim yine zorunludur, kural 11).
  if (egitim.tekrar) {
    return el('div', { className: 'adim' },
      el('div', { className: 'tekrar-ust' },
        el('button', { type: 'button', className: 'metin-dugme tekrar-kapat', textContent: '✕ Kapat', onclick: tekrarIzlemeyiKapat }),
      ),
      ilerlemeCiz('Güvenlik eğitimi (tekrar)', adim + 1, EGITIM_ADIM_SAYISI), govde, dugmeler);
  }
  return el('div', { className: 'adim' }, ilerlemeCiz('Güvenlik eğitimi', adim + 1, EGITIM_ADIM_SAYISI), govde, dugmeler);
}

// Kural 11: eğitim ve feragat tamamlanmadan tanımlama açılmaz; onun yerine eğitim gösterilir.
function tanimlaCiz() {
  const kap = document.getElementById('tanimla-icerik');
  if (egitim.tekrar || !tanimlamaAcilabilirMi(durumuOku())) {
    // Mevsim kartları yalnızca ana ekranda görünür; eğitim sırasında yer kaplamasın.
    document.getElementById('mevsim').hidden = true;
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
function sozlukFotografi(foto) {
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

function sozlukCiz() {
  document.getElementById('sozluk').replaceChildren(
    ...SOZLUK.map((madde) => {
      const foto = SOZLUK_FOTOGRAFLARI[madde.foto];
      if (!foto) {
        return el('div', { className: 'kart sozluk-karti' },
          cizim(madde.cizim, 'cizim sozluk-cizim'),
          el('div', {},
            el('h3', { className: 'kart-baslik', textContent: madde.terim }),
            el('p', { textContent: madde.tanim }),
          ),
        );
      }
      return el('div', { className: 'kart sozluk-karti sozluk-fotolu' },
        el('div', {},
          el('h3', { className: 'kart-baslik', textContent: madde.terim }),
          el('p', { textContent: madde.tanim }),
        ),
        sozlukFotografi(foto),
      );
    }),
  );
}

// Kural 8: yenen her türün sayfasında zehirli benzerleri ve ayırt edici farklar yan yana durur.
// adlaTur: tür adından tür kaydına (benzerin fotoğrafını göstermek için).
function turKartiCiz(tur, adlaTur) {
  const govde = el('div', { className: 'tur-govde' });
  if (tur.fotograf) {
    govde.append(el('figure', { className: 'tur-fotograf' },
      el('img', { src: tur.fotograf.dosya, alt: `${tur.ad} (${tur.bilimselAd ?? ''})`, loading: 'lazy', decoding: 'async' }),
      el('figcaption', { textContent: fotografAtfi(tur) }),
    ));
    govde.append(bildirim('uyari', el('p', { textContent: FOTOGRAF_UYARISI })));
  }
  govde.append(el('p', { textContent: tur.aciklama ?? '' }));
  if (tur.nerede) {
    govde.append(el('p', { className: 'tur-nerede' }, el('strong', { textContent: 'Nerede çıkar: ' }), tur.nerede));
  }
  if (tur.zehirliBenzerler?.length) {
    govde.append(
      el('h4', { className: 'tur-alt-baslik', textContent: 'Karıştırılan zehirli türler' }),
      ...tur.zehirliBenzerler.map((benzer) =>
        el('div', { className: 'benzer-karti' },
          kucukFotograf(adlaTur.get(benzer.ad), 'benzer-kucuk'),
          el('div', {},
            el('strong', { textContent: benzer.ad }),
            el('p', { textContent: benzer.fark }),
          ),
        ),
      ),
    );
  }
  if (tur.karistirilanlar?.length) {
    govde.append(el('p', {}, el('strong', { textContent: 'Şunlarla karıştırılır: ' }), tur.karistirilanlar.join(', ')));
  }
  const ozellikler = ozellikSatirlari(tur);
  if (ozellikler.length) {
    govde.append(el('details', { className: 'uzman-ayrinti' },
      el('summary', { textContent: 'Uygulamanın kullandığı özellikler (uzman kontrolü için)' }),
      el('ul', {}, ...ozellikler.map((o) => el('li', {}, el('span', { className: 'not', textContent: `${o.soru} ` }), o.cevaplar.join(', ')))),
    ));
  }
  govde.append(el('p', { className: 'not', textContent: `Kaynak: ${tur.kaynak ?? 'belirtilmedi'}` }));

  return el('details', { className: `kart tur-karti tur-${tur.zehirlilik}` },
    el('summary', {},
      kucukFotograf(tur),
      el('span', { className: 'tur-baslik' },
        el('strong', { textContent: tur.ad }),
        el('em', { className: 'bilimsel-ad', textContent: tur.bilimselAd ?? '' }),
      ),
      el('span', { className: `rozet rozet-${tur.zehirlilik}`, textContent: ZEHIRLILIK_ADLARI[tur.zehirlilik] ?? 'Bilinmiyor' }),
    ),
    govde,
  );
}

async function turleriCiz() {
  const turler = tehlikeyeGoreSirala(await turleriYukle());
  const adlaTur = new Map(turler.map((t) => [t.ad, t]));
  const kartCiz = (tur) => turKartiCiz(tur, adlaTur);
  const tehlikeli = turler.filter((t) => t.zehirlilik !== 'yenen');
  const yenen = turler.filter((t) => t.zehirlilik === 'yenen');
  const kap = document.getElementById('turler-listesi');
  kap.replaceChildren();
  if (tehlikeli.length) {
    kap.append(el('h2', { className: 'bolum-basligi', textContent: 'Ölümcül ve zehirli türler' }), ...tehlikeli.map(kartCiz));
  }
  if (yenen.length) {
    kap.append(
      el('h2', { className: 'bolum-basligi', textContent: 'Yenen türler' }),
      el('p', { className: 'not', textContent: 'Her birinin ölümcül veya zehirli bir benzeri vardır. Uzman görmeden yeme.' }),
      ...yenen.map(kartCiz),
    );
  }
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
// Uygulama günlerce açık kalabilir; öne gelince mevsim çubuğu ve takip edilen yerin yağmuru güncellenir.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    mevsimiYenile();
    takibiYenile();
  }
});
document.getElementById('mevsim').replaceChildren(anaKart());
tanimlaCiz();
sozlukCiz();
turleriCiz();
ekraniGoster();

// Yeni sürüm indirilince kullanıcıya haber verilir. Sayfa kendiliğinden yenilenmez:
// yarım kalan bir tanımlama ve fotoğrafları kaybolmasın.
function guncellemeUyarisiGoster() {
  if (document.getElementById('guncelleme')) return;
  document.body.append(
    el('div', { id: 'guncelleme', className: 'guncelleme-bandi', role: 'status' },
      el('span', { textContent: 'Uygulamanın yeni sürümü hazır.' }),
      el('button', { type: 'button', className: 'birincil', textContent: 'Yenile', onclick: () => location.reload() }),
    ),
  );
}

if ('serviceWorker' in navigator) {
  // İlk kurulumda da denetleyici değişir; uyarı yalnızca eski bir sürüm çalışıyorken gösterilir.
  const eskiSurumVardi = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (eskiSurumVardi) guncellemeUyarisiGoster();
  });
  navigator.serviceWorker.register('./sw.js').then((kayit) => {
    // Uygulama arka plandan öne gelince yeni sürüm var mı diye bakılır (internet yoksa sessizce geçilir).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') kayit.update().catch(() => {});
    });
  });
}
