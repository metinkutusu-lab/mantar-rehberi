// Hızlı tanımlama (Metin'in isteği, 2026-10-26): önce üstten fotoğraf, sonra yalnızca kalan türleri ayıran
// kontroller. Eski adım adım akış (js/tanimla.js) aynen durur; bu akış onun yanına eklendi.
// - Yapay zeka gerekmez: sıradaki soru kural tablosundan seçilir (js/siradaki.js).
// - Fotoğraf kıyası isteğe bağlıdır (js/fotoTanima.js); açılınca bir kez ~2 MB iner, sonra internetsiz çalışır.
// - Her olası tür, karıştırıldığı zehirli/yenen türle yan yana ve ayıran kontrolle gösterilir (kural 8).
// - Sesli yönlendirme telefonun kendi sesiyle (js/ses.js); sesli komut yalnızca telefon içi tanımayla (js/sesliKomut.js).
// - Sonuç, eski akıştaki aynı değerlendirmeden geçer (kurallar.js); yeşil yoktur, her sonuçta "uzmana sor" yazar.
import { bildirim, el, ikon, kucukFotograf } from './dom.js';
import { adimFotografi, secenekFotografi } from './isaretliFoto.js';
import { BILMIYORUM, GEREKLI_FOTOGRAFLAR } from './kurallar.js';
import { ADIMLAR, adimSecenekleri, sonCevaplar } from './sorular.js';
import { adaylariBul } from './anahtar.js';
import { ayiranAdimlar, kisaAd, siradakiAdim } from './siradaki.js';
import { ZEHIRLILIK_ADLARI, tehlikeyeGoreSirala, turleriYukle } from './turler.js';
import { zehirRozeti } from './zehir.js';
import { durumuOku, durumuYaz } from './durum.js';
import { sesHazirMi, sesiKes, soyle } from './ses.js';
import { kameraAc, kameraKapat, kameraVarMi, kareAl, resimAdresi } from './kamera.js';
import { benzerlikSozu, benzerlikleriHesapla, modelDurumu, modelDurumunuDinle, modeliHazirla, parmakIzi, referanslariYukle } from './fotoTanima.js';
import { dinlemeyiBaslat, dinlemeyiDurdur, komutuAnla, yerelTanimaDurumu, yerelTanimayiKur } from './sesliKomut.js';

let turler = [];
turleriYukle().then((liste) => {
  turler = liste;
});

// Fotoğraf kıyasında kullanılan fotoğraflar (tür fotoğrafları çoğunlukla mantarın bütününü gösterir).
const KIYAS_FOTOGRAFLARI = ['ust', 'yan'];
const UST_ADIM = {
  soru: '__ust',
  fotograf: 'ust',
  baslik: 'Üstten fotoğraf',
  yonerge: ['Mantarı yerinden oynatmadan, tam üstünden çek. Bütün şapka görünsün.'],
};

// Fotoğraflar ve izler yalnızca bellekte tutulur (kural 12).
const h = {
  adim: null, // o anki adım (UST_ADIM ya da sorular.js'teki bir adım)
  neden: null,
  cevaplar: {},
  sorulanlar: [],
  fotograflar: {},
  izler: [],
  benzerlikler: {},
  sayacBitis: null,
  sayac: null,
  geriSayim: null,
};
let kap;
let ayarlar;
let video = null;

const ayar = () => durumuOku();
function ayarYaz(degisiklik) {
  durumuYaz({ ...durumuOku(), ...degisiklik });
}
const sesAcik = () => ayar().sesliTanimlama === true;
const kiyasAcik = () => ayar().fotoKiyasi === true;
const ellerSerbest = () => ayar().ellerSerbest === true;

export function hizliBaslat() {
  hizliSifirla();
  h.adim = UST_ADIM;
  if (kiyasAcik()) kiyasiHazirla();
}

export function hizliSifirla() {
  for (const url of Object.values(h.fotograflar)) URL.revokeObjectURL(url);
  sayaciDurdur();
  Object.assign(h, { adim: null, neden: null, cevaplar: {}, sorulanlar: [], fotograflar: {}, izler: [], benzerlikler: {} });
}

// Ekrandan çıkınca kamera, mikrofon ve ses kapanır.
export function hizliKapat() {
  kameraKapat();
  dinlemeyiDurdur();
  sayaciDurdur();
  sesiKes();
}

export function hizliCiz(hedef, secenekler) {
  kap = hedef;
  ayarlar = secenekler;
  ciz();
  adimiSoyle();
  dinlemeyiAyarla();
}

function ciz() {
  kameraKapat();
  video = null;
  kap.replaceChildren(adimCiz());
}

function yenidenCiz() {
  ciz();
  window.scrollTo(0, 0);
  adimiSoyle();
}

// ---- Fotoğraf kıyası (isteğe bağlı) ----

async function kiyasiHazirla() {
  try {
    await Promise.all([modeliHazirla(), referanslariYukle()]);
    await izleriHesapla();
  } catch {
    // İnternet yok ve model daha önce indirilmemiş: tanımlama sorularla devam eder.
  }
}

async function izleriHesapla() {
  if (modelDurumu() !== 'hazir') return;
  const referanslar = await referanslariYukle();
  const izler = [];
  for (const tur of KIYAS_FOTOGRAFLARI) {
    const url = h.fotograflar[tur];
    if (!url) continue;
    const resim = new Image();
    resim.src = url;
    await resim.decode();
    izler.push(await parmakIzi(resim));
  }
  if (!izler.length) return;
  h.izler = izler;
  h.benzerlikler = benzerlikleriHesapla(izler, referanslar);
  // Yalnızca kıyas kartı yenilenir; kamera ve sayaç olduğu gibi kalır.
  const kart = kap?.isConnected ? kap.querySelector('.kiyas') : null;
  kart?.replaceWith(adaylarCiz());
}

modelDurumunuDinle(() => {
  if (kap?.isConnected && h.adim) {
    const yer = kap.querySelector('.hizli-ayarlar');
    yer?.replaceWith(ayarlarCiz());
  }
});

// ---- Ayarlar satırı: ses, eller serbest, fotoğraf kıyası ----

function ayarDugmesi(metin, acik, onclick) {
  const d = el('button', { type: 'button', className: `ayar-dugme${acik ? ' acik' : ''}`, onclick }, el('span', { textContent: metin }), el('strong', { textContent: acik ? 'Açık' : 'Kapalı' }));
  d.setAttribute('aria-pressed', String(acik));
  return d;
}

function ayarlarCiz() {
  const kiyasMetni = {
    yok: kiyasAcik() ? 'Hazırlanıyor…' : 'Kapalı',
    yukleniyor: 'İndiriliyor…',
    hazir: 'Açık',
    hata: 'İnternet gerekli',
  }[modelDurumu()];
  const kiyas = el('button', {
    type: 'button',
    className: `ayar-dugme${kiyasAcik() ? ' acik' : ''}`,
    onclick: () => {
      ayarYaz({ fotoKiyasi: !kiyasAcik() });
      if (kiyasAcik()) kiyasiHazirla();
      else h.benzerlikler = {};
      ciz();
    },
  }, el('span', { textContent: 'Fotoğraf kıyası' }), el('strong', { textContent: kiyasMetni }));
  kiyas.setAttribute('aria-pressed', String(kiyasAcik()));
  return el('div', { className: 'hizli-ayarlar' },
    ayarDugmesi('Sesli yönlendirme', sesAcik(), () => {
      ayarYaz({ sesliTanimlama: !sesAcik() });
      if (!sesAcik()) {
        sesiKes();
        dinlemeyiDurdur();
      }
      ciz();
      adimiSoyle();
      dinlemeyiAyarla();
    }),
    ayarDugmesi('Eller serbest çekim', ellerSerbest(), () => {
      ayarYaz({ ellerSerbest: !ellerSerbest() });
      ciz();
    }),
    kiyas,
  );
}

function ayarNotlari() {
  const notlar = [];
  if (sesAcik() && !sesHazirMi()) {
    notlar.push('Bu telefonda Türkçe yerel ses bulunamadı. Telefonun ayarlarından "Metin okuma" (yazıdan konuşmaya) Türkçe sesi indirilebilir.');
  }
  if (kiyasAcik() && modelDurumu() === 'hata') {
    notlar.push('Fotoğraf kıyası için bir kez internet gerekir (yaklaşık 2 MB). İnternet yokken tanımlama sorularla devam eder.');
  }
  if (!kiyasAcik()) {
    notlar.push('Fotoğraf kıyası kapalıyken de tanımlama çalışır. Açarsan bir kez yaklaşık 2 MB iner; sonra internetsiz çalışır ve fotoğrafın hiçbir yere gitmez.');
  }
  return notlar.map((n) => el('p', { className: 'not', textContent: n }));
}

// ---- Olası türler ve zehirli benzerle kıyas ----

function adaylar() {
  return adaylariBul(turler, sonCevaplar(h.cevaplar));
}

// Fotoğrafa en çok benzeyenler önce; benzerlik yoksa en tehlikeliler önce.
function siraliAdaylar() {
  const liste = adaylar();
  if (Object.keys(h.benzerlikler).length) {
    return [...liste].sort((a, b) => (h.benzerlikler[b.id] ?? 0) - (h.benzerlikler[a.id] ?? 0));
  }
  return tehlikeyeGoreSirala(liste);
}

// Türün karıştırıldığı türler: yenen türün zehirli benzerleri, zehirli türü benzer sayan yenen türler.
function karistirilanlar(tur) {
  const adla = new Map(turler.map((t) => [t.ad, t]));
  if (tur.zehirlilik === 'yenen') {
    return (tur.zehirliBenzerler ?? []).map((b) => ({ tur: adla.get(b.ad), ad: b.ad, fark: b.fark }));
  }
  return turler
    .filter((t) => t.zehirlilik === 'yenen' && (t.zehirliBenzerler ?? []).some((b) => b.ad === tur.ad))
    .map((t) => ({ tur: t, ad: t.ad, fark: t.zehirliBenzerler.find((b) => b.ad === tur.ad).fark }));
}

// Zehirlilik rozeti; zehirli türde yanında zehir sembolü (dokununca belirtiler, js/zehir.js).
function rozet(tur) {
  return el('span', { className: 'rozetler' },
    el('span', { className: `rozet rozet-${tur?.zehirlilik}`, textContent: ZEHIRLILIK_ADLARI[tur?.zehirlilik] ?? 'Bilinmiyor, zehirli sayılır' }),
    zehirRozeti(tur),
  );
}

// Olası tür ve karıştırıldığı tür yan yana; fark dokununca açılır, ayıran kontrol her zaman görünür.
function kiyasKartiCiz(tur, ilk) {
  const benzerlik = h.benzerlikler[tur.id];
  const kart = el('div', { className: 'kiyas-karti' },
    el('div', { className: 'kiyas-ust' },
      kucukFotograf(tur),
      el('div', {},
        el('strong', { textContent: tur.ad }),
        el('div', { className: 'aday-ust' }, rozet(tur)),
        benzerlik !== undefined ? el('span', { className: 'not kiyas-benzerlik', textContent: benzerlikSozu(benzerlik) }) : '',
      ),
    ),
  );
  for (const b of karistirilanlar(tur).slice(0, ilk ? 2 : 1)) {
    const ayiranlar = b.tur ? ayiranAdimlar(tur, b.tur).map(kisaAd) : [];
    const fark = el('details', { className: 'kiyas-fark', open: ilk }, el('summary', { textContent: 'Farkı' }), el('p', { textContent: b.fark }));
    kart.append(el('div', { className: `kiyas-benzer ${tur.zehirlilik === 'yenen' ? 'kiyas-zehirli' : ''}` },
      kucukFotograf(b.tur, 'benzer-kucuk'),
      el('div', {},
        el('p', { className: 'kiyas-benzer-baslik' },
          el('strong', { textContent: tur.zehirlilik === 'yenen' ? `Zehirli benzeri: ${b.ad}` : `Karıştırılan: ${b.ad}` }),
          ' ', rozet(b.tur),
        ),
        ayiranlar.length ? el('p', { className: 'not', textContent: `Ayıran kontrol: ${ayiranlar.slice(0, 3).join(', ')}` }) : '',
        fark,
      ),
    ));
  }
  return kart;
}

function adaylarCiz() {
  const liste = siraliAdaylar();
  const benzerlikVar = Object.keys(h.benzerlikler).length > 0;
  const sayi = el('p', { className: 'not', textContent: liste.length ? `Cevaplarınla çelişmeyen ${liste.length} tür var.` : 'Cevapların uygulamadaki türlerin hiçbiriyle uyuşmadı.' });
  // Benzerlik yokken uzun liste gösterilmez; 5 ve altına inince gösterilir.
  if (!benzerlikVar && liste.length > 5) return el('div', { className: 'kart kiyas' }, el('h3', { className: 'kart-baslik', textContent: 'Olası türler' }), sayi);
  return el('div', { className: 'kart kiyas' },
    el('h3', { className: 'kart-baslik', textContent: benzerlikVar ? 'Fotoğrafa en çok benzeyenler' : 'Olası türler' }),
    sayi,
    ...liste.slice(0, 3).map((tur, i) => kiyasKartiCiz(tur, i === 0)),
    el('p', { className: 'not', textContent: 'Bu bir tahmindir. Zehirli bir tür elenmeden sonuç kırmızı kalır.' }),
  );
}

// ---- Kamera ----

function fotografCek(tur) {
  if (!video) return;
  // Kamera daha açılıyorsa görüntü gelince çekilir.
  if (!video.videoWidth) {
    video.addEventListener('loadeddata', () => fotografCek(tur), { once: true });
    return;
  }
  const tuval = kareAl(video);
  resimAdresi(tuval).then((url) => {
    if (!url) return;
    if (h.fotograflar[tur]) URL.revokeObjectURL(h.fotograflar[tur]);
    h.fotograflar[tur] = url;
    if (sesAcik()) soyle('Çekildi.', { oncelikli: true });
    if (kiyasAcik() && KIYAS_FOTOGRAFLARI.includes(tur)) izleriHesapla();
    // Üstten fotoğraf çekilince ilk soruya geçilir.
    if (h.adim === UST_ADIM) ilerle();
    else ciz();
  });
}

function geriSayimBaslat(tur, saniye = 5) {
  clearInterval(h.geriSayim);
  let kalan = saniye;
  const yazi = kap.querySelector('.geri-sayim');
  const goster = () => {
    if (yazi) yazi.textContent = String(kalan);
  };
  goster();
  if (sesAcik()) soyle(`${saniye} saniye sonra çekiyorum. Telefonu sabit tut.`, { oncelikli: true });
  h.geriSayim = setInterval(() => {
    kalan -= 1;
    goster();
    if (kalan <= 0) {
      clearInterval(h.geriSayim);
      h.geriSayim = null;
      fotografCek(tur);
    }
  }, 1000);
}

function dosyaGirdisi(tur) {
  const girdi = el('input', {
    type: 'file',
    accept: 'image/*',
    className: 'gizli',
    onchange: (olay) => {
      const dosya = olay.target.files?.[0];
      if (!dosya) return;
      if (h.fotograflar[tur]) URL.revokeObjectURL(h.fotograflar[tur]);
      h.fotograflar[tur] = URL.createObjectURL(dosya);
      if (kiyasAcik() && KIYAS_FOTOGRAFLARI.includes(tur)) izleriHesapla();
      if (h.adim === UST_ADIM) ilerle();
      else ciz();
    },
  });
  girdi.setAttribute('capture', 'environment');
  return girdi;
}

function kameraCiz(tur) {
  const url = h.fotograflar[tur];
  if (url) {
    return el('label', { className: 'foto-alan dolu' },
      el('img', { src: url, alt: 'Çekilen fotoğraf' }),
      el('span', { className: 'foto-yeniden' }, ikon('kamera'), el('span', { textContent: 'Yeniden çek' })),
      dosyaGirdisi(tur),
    );
  }
  const zorunlu = GEREKLI_FOTOGRAFLAR.includes(tur);
  const yedek = el('label', { className: 'foto-alan' },
    el('span', { className: 'foto-ikon' }, ikon('kamera')),
    el('strong', { textContent: 'Fotoğraf çek' }),
    el('span', { className: 'foto-not', textContent: zorunlu ? 'Bu fotoğraf olmadan sonuç verilemez.' : 'İsteğe bağlı; uzmana göstermek için faydalı.' }),
    dosyaGirdisi(tur),
  );
  if (!kameraVarMi()) return yedek;

  video = el('video', { className: 'kamera-goruntu', autoplay: true, muted: true });
  const alan = el('div', { className: 'kamera' },
    video,
    el('span', { className: 'geri-sayim', 'aria-live': 'polite' }),
  );
  const dugmeler = el('div', { className: 'kamera-dugmeler' },
    el('button', { type: 'button', className: 'birincil', onclick: () => fotografCek(tur) }, ikon('kamera'), el('span', { textContent: 'Çek' })),
    el('button', { type: 'button', className: 'ikincil', textContent: '5 sn sonra çek', onclick: () => geriSayimBaslat(tur) }),
  );
  const kutu = el('div', {}, alan, dugmeler);
  kameraAc(video).then((acildi) => {
    if (!acildi) kutu.replaceWith(yedek);
    else if (ellerSerbest()) setTimeout(() => video?.isConnected && !h.fotograflar[tur] && geriSayimBaslat(tur), sesAcik() ? 4000 : 800);
  });
  return kutu;
}

// ---- Süreli kontroller ----

function sayaciDurdur() {
  clearInterval(h.sayac);
  clearInterval(h.geriSayim);
  Object.assign(h, { sayac: null, sayacBitis: null, geriSayim: null });
}

const sureYazisi = (sn) => (sn >= 60 ? `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, '0')}` : `${sn} sn`);

function sayacCiz(adim) {
  const yazi = el('strong', { className: 'sayac-sure' });
  const dugme = el('button', { type: 'button', className: 'ikincil' });
  const kutu = el('div', { className: 'sayac' }, el('p', { textContent: adim.sureMetni }), yazi, dugme);
  const guncelle = () => {
    if (!h.sayacBitis) {
      yazi.textContent = sureYazisi(adim.sure);
      dugme.textContent = 'Sayacı başlat';
      return;
    }
    const kalan = Math.max(0, Math.round((h.sayacBitis - Date.now()) / 1000));
    yazi.textContent = kalan > 0 ? sureYazisi(kalan) : 'Şimdi bak';
    dugme.textContent = kalan > 0 ? 'Beklemeden bak' : 'Sayacı yeniden başlat';
    if (kalan === 0) {
      clearInterval(h.sayac);
      h.sayac = null;
      kutu.classList.add('bitti');
    }
  };
  dugme.onclick = () => {
    if (h.sayacBitis && h.sayacBitis > Date.now()) {
      h.sayacBitis = Date.now();
    } else {
      sayacBaslat(adim, guncelle);
    }
    guncelle();
  };
  guncelle();
  if (h.sayac) {
    clearInterval(h.sayac);
    h.sayac = setInterval(() => {
      guncelle();
      if (h.sayacBitis <= Date.now()) sureDoldu(adim);
    }, 1000);
  }
  return kutu;
}

function sayacBaslat(adim, guncelle) {
  clearInterval(h.sayac);
  h.sayacBitis = Date.now() + adim.sure * 1000;
  let soylendi = false;
  h.sayac = setInterval(() => {
    guncelle();
    if (!soylendi && h.sayacBitis <= Date.now()) {
      soylendi = true;
      sureDoldu(adim);
    }
  }, 1000);
}

function sureDoldu(adim) {
  if (sesAcik()) soyle(`Süre doldu. Şimdi bak. ${adim.soruMetni} ${seceneklerSozu(adim)}`, { oncelikli: true });
  else if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ---- Adımlar ----

function ilerle() {
  sayaciDurdur();
  const sonraki = siradakiAdim(turler, h.cevaplar, h.sorulanlar, h.benzerlikler);
  if (!sonraki) {
    bitir();
    return;
  }
  h.adim = sonraki.adim;
  h.neden = sonraki.neden;
  yenidenCiz();
}

function geri() {
  sayaciDurdur();
  if (h.adim === UST_ADIM) {
    hizliKapat();
    ayarlar.vazgec();
    return;
  }
  const son = h.sorulanlar.pop();
  if (son) delete h.cevaplar[son];
  h.adim = (son && ADIMLAR.find((x) => x.soru === son)) || UST_ADIM;
  h.neden = null;
  yenidenCiz();
}

function cevapla(adim, deger) {
  h.cevaplar[adim.soru] = deger;
  if (!h.sorulanlar.includes(adim.soru)) h.sorulanlar.push(adim.soru);
  // Fotoğraf istenen adımda fotoğraf yoksa önce o istenir (kural 6).
  ciz();
  setTimeout(() => {
    if (h.adim === adim) ilerle();
  }, 250);
}

function bitir() {
  hizliKapat();
  ayarlar.bitir({
    cevaplar: { ...h.cevaplar },
    fotograflar: { ...h.fotograflar },
    benzerlikler: { ...h.benzerlikler },
  });
}

// Bu adım hangi olası türleri birbirinden ayırır? (en çok iki çift)
function ayirdigiCiftler(adim) {
  const liste = siraliAdaylar().slice(0, 6);
  const ciftler = [];
  for (const tur of liste) {
    for (const b of karistirilanlar(tur)) {
      if (!b.tur || !liste.some((t) => t.id === b.tur.id)) continue;
      if (ciftler.some(([x, y]) => (x === b.tur.ad && y === tur.ad) || (x === tur.ad && y === b.tur.ad))) continue;
      if (ayiranAdimlar(tur, b.tur).some((a) => a.soru === adim.soru)) ciftler.push([tur.ad, b.tur.ad]);
    }
  }
  return ciftler.slice(0, 2);
}

function seceneklerSozu(adim) {
  if (!adim.secenekler) return '';
  return `${adimSecenekleri(adim).map((s) => s.metin.split('/')[0].trim()).join(', ')}?`;
}

function adimiSoyle() {
  if (!sesAcik() || !h.adim) return;
  const a = h.adim;
  const parcalar = [a.baslik, a.uyari, ...(a.yonerge ?? [])];
  if (a.fotograf && !h.fotograflar[a.fotograf]) parcalar.push(ellerSerbest() ? 'Kamerayı mantara tut, kendim çekeceğim.' : 'Hazır olunca "çek" de ya da düğmeye bas.');
  if (a.sure) parcalar.push(`${a.sureMetni} Sayacı başlatmak için düğmeye bas.`);
  if (a.soruMetni) parcalar.push(a.soruMetni, seceneklerSozu(a));
  soyle(parcalar.filter(Boolean).join(' '), { oncelikli: true });
}

function adimCiz() {
  const a = h.adim ?? UST_ADIM;
  const sira = h.sorulanlar.length + 1;
  const govde = el('div', { className: 'adim hizli' },
    el('p', { className: 'ust-etiket', textContent: `Hızlı tanımlama · ${sira}. adım` }),
    ayarlarCiz(),
    ...ayarNotlari(),
  );
  // Üstten fotoğraf çekildiyse şapka rengi adımı "Üstten fotoğraf" diye değil, kısa adıyla gösterilir.
  const baslik = a.fotograf === 'ust' && a !== UST_ADIM && h.fotograflar.ust ? 'Şapka rengi' : a.baslik;
  govde.append(el('h2', { className: 'adim-baslik', textContent: baslik }));
  if (h.neden === 'ayirt' && a !== UST_ADIM) {
    const ciftler = ayirdigiCiftler(a);
    if (ciftler.length) govde.append(el('p', { className: 'neden', textContent: `Bu kontrol şunları ayırır: ${ciftler.map(([x, y]) => `${x} ↔ ${y}`).join('; ')}` }));
  }
  if (a.uyari) govde.append(bildirim('tehlike', el('p', {}, el('strong', { textContent: a.uyari }))));
  // Gerçek örnek fotoğraf (çizim yok). Kamera olan adımda yer kaplamasın diye dokununca açılır.
  const ornek = adimFotografi(a);
  if (ornek && a.fotograf) govde.append(el('details', { className: 'ornek-foto' }, el('summary', { textContent: 'Örnek fotoğrafa bak' }), ornek));
  else if (ornek) govde.append(ornek);
  const ustCekildi = a.fotograf === 'ust' && a !== UST_ADIM && h.fotograflar.ust;
  if (!ustCekildi) for (const paragraf of a.yonerge ?? []) govde.append(el('p', { className: 'yonerge', textContent: paragraf }));
  // Üstten fotoğraf akışın başında çekildi; şapka rengi adımında küçük gösterilir.
  if (ustCekildi) govde.append(el('img', { className: 'ust-kucuk', src: h.fotograflar.ust, alt: 'Üstten çektiğin fotoğraf' }));
  else if (a.fotograf) govde.append(kameraCiz(a.fotograf));
  if (a.sure) govde.append(sayacCiz(a));

  if (a.soruMetni) {
    govde.append(el('h3', { className: 'soru-metni', textContent: a.soruMetni }));
    const secili = h.cevaplar[a.soru];
    const liste = el('div', { className: `secenekler${a.coklu ? ' coklu' : ''}` });
    for (const secenek of adimSecenekleri(a)) {
      const seciliMi = Array.isArray(secili) ? secili.includes(secenek.deger) : secili === secenek.deger;
      const siniflar = ['secenek'];
      if (seciliMi) siniflar.push('secili');
      if (secenek.deger === BILMIYORUM) siniflar.push('bilmiyorum');
      const foto = secenekFotografi(secenek.cizim);
      if (foto) siniflar.push('resimli');
      const dugme = el('button',
        { type: 'button', className: siniflar.join(' '), onclick: () => (a.coklu ? cokluSec(a, secenek.deger) : cevapla(a, secenek.deger)) },
        foto,
        ...(a.coklu ? [el('span', { className: 'onay-kutusu', textContent: seciliMi ? '✓' : '' })] : []),
        el('span', { textContent: secenek.metin }),
      );
      dugme.setAttribute('aria-pressed', String(seciliMi));
      liste.append(dugme);
    }
    govde.append(liste);
  }

  const dugmeler = el('div', { className: 'dugmeler' },
    el('button', { type: 'button', className: 'ikincil', textContent: 'Geri', onclick: geri }),
  );
  if (sesAcik()) dugmeler.append(el('button', { type: 'button', className: 'ikincil', textContent: 'Tekrar oku', onclick: adimiSoyle }));
  if (a.coklu) {
    dugmeler.append(el('button', { type: 'button', className: 'birincil', textContent: 'İleri', disabled: h.cevaplar[a.soru] === undefined, onclick: ilerle }));
  }
  govde.append(dugmeler);
  // Olası türler ve zehirli benzerleri adımın altında: önce yapılacak iş, sonra kıyas.
  if (a !== UST_ADIM) govde.append(adaylarCiz());
  return govde;
}

// Çoklu seçim (ör. çevrede neler var): eski akıştaki gibi; "Bilmiyorum" tek başına seçilir.
function cokluSec(adim, deger) {
  const once = h.cevaplar[adim.soru];
  if (deger === BILMIYORUM) {
    h.cevaplar[adim.soru] = once === BILMIYORUM ? undefined : BILMIYORUM;
  } else {
    const liste = Array.isArray(once) ? once : [];
    const yeni = liste.includes(deger) ? liste.filter((d) => d !== deger) : [...liste, deger];
    h.cevaplar[adim.soru] = yeni.length ? yeni : undefined;
  }
  if (h.cevaplar[adim.soru] !== undefined && !h.sorulanlar.includes(adim.soru)) h.sorulanlar.push(adim.soru);
  if (h.cevaplar[adim.soru] === undefined) h.sorulanlar = h.sorulanlar.filter((s) => s !== adim.soru);
  ciz();
}

// ---- Sesli komutlar ----

async function dinlemeyiAyarla() {
  if (!sesAcik()) return;
  const durum = await yerelTanimaDurumu();
  if (durum === 'indirilebilir') yerelTanimayiKur();
  if (durum !== 'var') return;
  dinlemeyiBaslat(sesliKomut);
}

function sesliKomut(metin) {
  // Telefon kendi konuşmasını duymasın.
  if (window.speechSynthesis?.speaking || !kap?.isConnected || !h.adim) return;
  const a = h.adim;
  const secenekler = a.soruMetni ? adimSecenekleri(a) : [];
  const komut = komutuAnla(metin, secenekler);
  if (!komut) return;
  if (komut.komut === 'tekrar') adimiSoyle();
  else if (komut.komut === 'geri') geri();
  else if (komut.komut === 'cek' && a.fotograf) fotografCek(a.fotograf);
  else if (komut.komut === 'devam' && a.sure && h.sayacBitis) h.sayacBitis = Date.now();
  else if (komut.komut === 'secenek' && !a.coklu) cevapla(a, komut.deger);
}
