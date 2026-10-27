// Fotoğrafla tanımlama, tek sayfa (Metin'in isteği, 2026-10-27: "sayfa sayfa sormak sıkıcı ve verimsiz; mantarı tanıyan
// bir insan nasıl ve neresine bakıyorsa öyle hızlı olmalı"). Uzman gibi çalışır: önce bir bakışta tahmin, sonra yalnızca
// o tahmini zehirli benzerlerinden ayıran ve hayati önemdeki kontroller.
// - Üstte üç fotoğraf yuvası (üstten, alttan, yandan/ayak dibi); galeriden üçü birden seçilebilir (kural 6).
// - Fotoğraf eklenince tahmin hemen görünür (js/fotoTanima.js, telefonda; fotoğraf hiçbir yere gitmez).
// - Altında tek sayfalık kontrol listesi (js/siradaki.js → kontrolListesi): cevap geldikçe yeniden hesaplanır,
//   gereksizleşen kontrol kaybolur. Güvenlik soruları her zaman listededir; zehirli bir aday elenebilecekken liste bitmez.
// - En altta canlı sonuç (aynı değerlendirme, js/kurallar.js); "Sonucu gör" ile ayrıntılı sonuç ekranı.
// - Fotoğraf kıyası hiçbir türü elemez, sonucun rengini değiştirmez (kural 3, 5).
// - Sesli yönlendirme telefonun kendi sesiyle (js/ses.js); sesli komut yalnızca telefon içi tanımayla (js/sesliKomut.js).
import { el, ikon, kucukFotograf, bildirim } from './dom.js';
import { adimFotografi, secenekFotografi } from './isaretliFoto.js';
import { BILMIYORUM, GEREKLI_FOTOGRAFLAR, degerlendir } from './kurallar.js';
import { ADIMLAR, adimSecenekleri, sonCevaplar } from './sorular.js';
import { adaylariBul } from './anahtar.js';
import { ayiranAdimlar, kisaAd, kontrolListesi } from './siradaki.js';
import { ZEHIRLILIK_ADLARI, tehlikeyeGoreSirala, turleriYukle } from './turler.js';
import { zehirRozeti } from './zehir.js';
import { durumuOku, durumuYaz } from './durum.js';
import { sesHazirMi, sesiKes, soyle } from './ses.js';
import { kameraAc, kameraKapat, kameraVarMi, kareAl, resimAdresi } from './kamera.js';
import { benzerlikSozu, benzerlikleriHesapla, modelDurumu, modelDurumunuDinle, modeliHazirla, parmakIzi, ayiriciyiYukle } from './fotoTanima.js';
import { dinlemeyiBaslat, dinlemeyiDurdur, komutuAnla, yerelTanimaDurumu, yerelTanimayiKur } from './sesliKomut.js';

let turler = [];
turleriYukle().then((liste) => {
  turler = liste;
});

// Üç zorunlu fotoğraf (kural 6) ve kısa yönergeleri.
const YUVALAR = [
  { tur: 'ust', ad: 'Üstten', yonerge: 'Bütün şapka görünsün. Benekleri silmeden çek.' },
  { tur: 'alt', ad: 'Alttan', yonerge: 'Şapkanın altı: solungaç, gözenek ya da diken görünsün.' },
  { tur: 'yan', ad: 'Yandan', yonerge: 'Ayak ve ayağın dibi görünsün (koparmadan, toprağı bıçakla açarak).' },
];
// Fotoğraf kıyasında kullanılan fotoğraflar (tür fotoğrafları çoğunlukla mantarın bütününü gösterir).
const KIYAS_FOTOGRAFLARI = ['ust', 'yan'];
const ADIM_DIZINI = new Map(ADIMLAR.map((a) => [a.soru, a]));
const SONUC_SOZLERI = { kirmizi: 'Zehirli veya ölümcül olabilir', turuncu: 'Tanımlanamadı', sari: 'Muhtemelen yenen bir tür, uzmana göster' };

// Fotoğraflar ve izler yalnızca bellekte tutulur (kural 12).
const h = {
  basladi: false,
  cevaplar: {},
  sorulanlar: [],
  fotograflar: {},
  izler: [],
  benzerlikler: {},
  kamera: null, // uygulama içi kamera açıksa hangi fotoğraf için ('ust' | 'alt' | 'yan')
  acik: null, // çoklu seçimli, düzenlenmekte olan kontrol
  sayaclar: {}, // { soru: bitiş zamanı }
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
// Fotoğraf kıyası kendiliğinden açıktır (Metin'in isteği, 2026-10-26: "fotoğrafı çekince kendisi kıyaslayıp tahmin etsin");
// kullanıcı kapatabilir. İlk kullanımda bir kez ~5 MB iner. Kıyas hiçbir türü elemez, sonucun rengini değiştirmez.
const kiyasAcik = () => ayar().fotoKiyasi !== false;
const ellerSerbest = () => ayar().ellerSerbest === true;

export function hizliBaslat() {
  hizliSifirla();
  h.basladi = true;
  if (kiyasAcik()) kiyasiHazirla();
}

// Yarım kalmış bir tanımlama var mı (yeni sürüm gelince sayfa bu sırada kendiliğinden yenilenmez).
export const hizliSuruyor = () => h.basladi;

export function hizliSifirla() {
  for (const url of Object.values(h.fotograflar)) URL.revokeObjectURL(url);
  sayaclariDurdur();
  Object.assign(h, { basladi: false, cevaplar: {}, sorulanlar: [], fotograflar: {}, izler: [], benzerlikler: {}, kamera: null, acik: null, sayaclar: {} });
}

// Ekrandan çıkınca kamera, mikrofon ve ses kapanır.
export function hizliKapat() {
  kameraKapat();
  dinlemeyiDurdur();
  sayaclariDurdur();
  sesiKes();
}

export function hizliCiz(hedef, secenekler) {
  kap = hedef;
  ayarlar = secenekler;
  ciz();
  siradakiniSoyle();
  dinlemeyiAyarla();
}

function ciz() {
  const kaydirma = window.scrollY;
  if (!h.kamera) {
    kameraKapat();
    video = null;
  }
  kap.replaceChildren(sayfaCiz());
  window.scrollTo(0, kaydirma);
}

// ---- Fotoğraf kıyası (isteğe bağlı) ----

async function kiyasiHazirla() {
  try {
    await Promise.all([modeliHazirla(), ayiriciyiYukle()]);
    await izleriHesapla();
  } catch {
    // İnternet yok ve model daha önce indirilmemiş: tanımlama kontrollerle devam eder.
  }
}

async function izleriHesapla() {
  if (modelDurumu() !== 'hazir') return;
  const ayirici = await ayiriciyiYukle();
  const izler = [];
  for (const tur of KIYAS_FOTOGRAFLARI) {
    const url = h.fotograflar[tur];
    if (!url) continue;
    const resim = new Image();
    resim.src = url;
    await resim.decode();
    izler.push(await parmakIzi(resim));
  }
  h.izler = izler;
  // Fotoğraflar silindiyse eski tahmin de silinir.
  h.benzerlikler = izler.length ? benzerlikleriHesapla(izler, ayirici) : {};
  // Tahmin kontrollerin sırasını etkiler; kamera açıksa yalnızca tahmin kartı yenilenir.
  if (!kap?.isConnected) return;
  if (h.kamera) kap.querySelector('.kiyas')?.replaceWith(adaylarCiz());
  else ciz();
}

modelDurumunuDinle(() => {
  if (kap?.isConnected && h.basladi) kap.querySelector('.hizli-ayarlar')?.replaceWith(ayarlarCiz());
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
      siradakiniSoyle();
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
    notlar.push('Fotoğraf kıyası için bir kez internet gerekir (yaklaşık 5 MB). İnternet yokken tanımlama kontrollerle devam eder.');
  }
  if (!kiyasAcik()) {
    notlar.push('Fotoğraf kıyası kapalıyken de tanımlama çalışır. Açarsan bir kez yaklaşık 5 MB iner; sonra internetsiz çalışır ve fotoğrafın hiçbir yere gitmez.');
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
    const fark = el('details', { className: 'kiyas-fark' }, el('summary', { textContent: 'Farkı' }), el('p', { textContent: b.fark }));
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
  // Tahmin yokken uzun liste gösterilmez; 5 ve altına inince gösterilir.
  if (!benzerlikVar && liste.length > 5) {
    const bekliyor = kiyasAcik() && KIYAS_FOTOGRAFLARI.some((t) => h.fotograflar[t]) && ['yok', 'yukleniyor'].includes(modelDurumu());
    return el('div', { className: 'kart kiyas' },
      el('h3', { className: 'kart-baslik', textContent: 'Olası türler' }),
      sayi,
      bekliyor ? el('p', { className: 'not', textContent: 'Fotoğraf kıyaslanıyor…' }) : '',
    );
  }
  return el('div', { className: 'kart kiyas' },
    el('h3', { className: 'kart-baslik', textContent: benzerlikVar ? 'Fotoğrafa göre en çok benzeyenler' : 'Olası türler' }),
    sayi,
    ...liste.slice(0, 3).map((tur, i) => kiyasKartiCiz(tur, i === 0)),
    el('p', { className: 'not', textContent: 'Bu bir tahmindir. Aşağıdaki kontroller zehirli benzerleri ayırır; zehirli bir tür elenmeden sonuç kırmızı kalır.' }),
  );
}

// ---- Fotoğraflar ----

function fotografKoy(tur, url) {
  if (h.fotograflar[tur]) URL.revokeObjectURL(h.fotograflar[tur]);
  h.fotograflar[tur] = url;
  if (kiyasAcik() && KIYAS_FOTOGRAFLARI.includes(tur)) izleriHesapla();
}

function fotografiSil(tur) {
  if (h.fotograflar[tur]) URL.revokeObjectURL(h.fotograflar[tur]);
  delete h.fotograflar[tur];
  if (kiyasAcik() && KIYAS_FOTOGRAFLARI.includes(tur)) izleriHesapla();
  ciz();
}

// Telefonun kamerası (galeri: false) ya da galeri (galeri: true). Galeriden birden çok fotoğraf seçilirse
// boş yuvalara sırayla (üstten, alttan, yandan) yerleşir (Metin'in isteği, 2026-10-27: üç fotoğraf zaten telefonda).
function dosyaGirdisi(tur, { galeri = false, coklu = false } = {}) {
  const girdi = el('input', {
    type: 'file',
    accept: 'image/*',
    className: 'gizli',
    multiple: coklu,
    onchange: (olay) => {
      const dosyalar = [...(olay.target.files ?? [])];
      if (!dosyalar.length) return;
      if (coklu) {
        const bos = YUVALAR.map((y) => y.tur).filter((t) => !h.fotograflar[t]);
        const hedefler = bos.length >= dosyalar.length ? bos : YUVALAR.map((y) => y.tur);
        dosyalar.slice(0, 3).forEach((dosya, i) => fotografKoy(hedefler[i], URL.createObjectURL(dosya)));
      } else {
        fotografKoy(tur, URL.createObjectURL(dosyalar[0]));
      }
      h.kamera = null;
      ciz();
    },
  });
  if (!galeri) girdi.setAttribute('capture', 'environment');
  return girdi;
}

function yuvaCiz({ tur, ad, yonerge }) {
  const url = h.fotograflar[tur];
  // Dolu yuvada yalnızca simgeler (yer kaplamasın); boş yuvada simge ve yazı.
  const yazi = (metin) => (url ? '' : el('span', { textContent: metin }));
  const cek = kameraVarMi()
    ? el('button', { type: 'button', className: 'ikincil yuva-dugme', 'aria-label': `${ad} fotoğraf çek`, onclick: () => kameraAcYuva(tur) }, ikon('kamera'), yazi('Çek'))
    : el('label', { className: 'ikincil yuva-dugme', 'aria-label': `${ad} fotoğraf çek` }, ikon('kamera'), yazi('Çek'), dosyaGirdisi(tur));
  const galeri = el('label', { className: 'ikincil yuva-dugme', 'aria-label': `${ad} fotoğrafı galeriden seç` }, ikon('galeri'), yazi('Galeri'), dosyaGirdisi(tur, { galeri: true }));
  return el('div', { className: `yuva${url ? ' dolu' : ''}` },
    url
      ? el('img', { src: url, alt: `${ad} fotoğraf` })
      : el('div', { className: 'yuva-bos' }, el('strong', { textContent: ad }), el('span', { textContent: yonerge })),
    el('div', { className: 'yuva-alt' },
      url ? el('strong', { className: 'yuva-ad', textContent: ad }) : '',
      el('div', { className: 'yuva-dugmeler' },
        cek, galeri,
        url ? el('button', { type: 'button', className: 'ikincil yuva-dugme', textContent: '✕', 'aria-label': `${ad} fotoğrafı sil`, onclick: () => fotografiSil(tur) }) : '',
      ),
    ),
  );
}

function fotograflarCiz() {
  const eksik = GEREKLI_FOTOGRAFLAR.filter((t) => !h.fotograflar[t]).length;
  return el('section', { className: 'fotograflar-bolumu' },
    el('h2', { className: 'bolum-baslik', textContent: 'Fotoğraflar' }),
    h.kamera ? kameraCiz(h.kamera) : '',
    el('div', { className: 'yuvalar' }, ...YUVALAR.map(yuvaCiz)),
    eksik === 3
      ? el('label', { className: 'birincil galeri-hepsi' }, ikon('galeri'), el('span', { textContent: 'Galeriden üçünü birden seç' }), dosyaGirdisi('ust', { galeri: true, coklu: true }))
      : '',
    eksik ? el('p', { className: 'not', textContent: 'Üç fotoğraf olmadan sonuç verilmez. Galeriden seçerken sırası: üstten, alttan, yandan.' }) : '',
  );
}

// ---- Uygulama içi kamera ----

function kameraAcYuva(tur) {
  h.kamera = tur;
  ciz();
  kap.querySelector('.kamera')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  if (sesAcik()) soyle(`${YUVALAR.find((y) => y.tur === tur).ad} fotoğraf. ${YUVALAR.find((y) => y.tur === tur).yonerge} ${ellerSerbest() ? 'Kendim çekeceğim.' : 'Hazır olunca çek de.'}`, { oncelikli: true });
}

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
    fotografKoy(tur, url);
    // Sıradaki boş yuva varsa kamera onun için açık kalır; yoksa kapanır.
    const sonraki = YUVALAR.find((y) => !h.fotograflar[y.tur]);
    h.kamera = sonraki ? sonraki.tur : null;
    if (sesAcik()) soyle(sonraki ? `Çekildi. Şimdi ${sonraki.ad.toLocaleLowerCase('tr')}. ${sonraki.yonerge}` : 'Çekildi. Fotoğraflar tamam.', { oncelikli: true });
    ciz();
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

// Çekim rehberi (Metin'in isteği, 2026-10-27: "yazı okumak odağı kaçırıyor; kamera ekranında yönlendirsin"):
// ortada bir daire, dışı puslu ve koyu, içinde neyin çekileceğini gösteren basit çizim ve tek satır yazı.
// Mantar dairenin içine girince fotoğraf kıyasında da işe yarar: kıyas fotoğrafın ortasına bakar (js/fotoTanima.js).
// Çizimler sabit metinlerdir; kullanıcı girdisi içermez. (Çizimler 100x75 alanda; daire kısa kenarın %80'i, pus maskesiyle aynı.)
const REHBERLER = {
  ust: {
    yazi: 'Şapka daireyi doldursun · tam üstten',
    cizim: '<circle cx="42" cy="30" r="2.2"/><circle cx="56" cy="27" r="1.8"/><circle cx="50" cy="40" r="2.4"/><circle cx="62" cy="38" r="1.6"/><circle cx="40" cy="44" r="1.7"/>',
  },
  alt: {
    yazi: 'Şapkayı çevir · solungaçlar daireyi doldursun',
    cizim: `<circle cx="50" cy="37.5" r="5" class="dolu-yok"/>${Array.from({ length: 24 }, (_, i) => {
      const a = (i * Math.PI) / 12;
      return `<line x1="${(50 + 6.5 * Math.cos(a)).toFixed(1)}" y1="${(37.5 + 6.5 * Math.sin(a)).toFixed(1)}" x2="${(50 + 27 * Math.cos(a)).toFixed(1)}" y2="${(37.5 + 27 * Math.sin(a)).toFixed(1)}"/>`;
    }).join('')}`,
  },
  yan: {
    yazi: 'Mantarın tamamı ve ayağın dibi dairede olsun',
    cizim: '<path d="M30 30 Q50 6 70 30 Z" class="dolu-yok"/><path d="M46 30 L45 56 M54 30 L55 56" /><path d="M43.5 38 Q50 42 56.5 38" stroke-dasharray="1.5 1.5"/><path d="M42 56 Q50 63 58 56" stroke-dasharray="1.5 1.5"/><line x1="26" y1="58" x2="74" y2="58"/>',
  },
};

function rehberCiz(tur) {
  const rehber = REHBERLER[tur];
  const cizim = el('span', { className: 'kamera-rehber' });
  cizim.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><circle cx="50" cy="50" r="40" class="rehber-daire"/><g class="rehber-cizim" transform="translate(50 50) scale(1.3333) translate(-50 -37.5)">${rehber.cizim}</g></svg>`;
  return [el('span', { className: 'kamera-pus' }), cizim, el('span', { className: 'kamera-rehber-yazi', textContent: rehber.yazi })];
}

function kameraCiz(tur) {
  const yuva = YUVALAR.find((y) => y.tur === tur);
  video = el('video', { className: 'kamera-goruntu', autoplay: true, muted: true });
  const kutu = el('div', { className: 'kamera-kutusu' },
    el('div', { className: 'kamera' }, video, ...rehberCiz(tur), el('span', { className: 'geri-sayim', 'aria-live': 'polite' })),
    el('div', { className: 'kamera-dugmeler' },
      el('button', { type: 'button', className: 'birincil', onclick: () => fotografCek(tur) }, ikon('kamera'), el('span', { textContent: 'Çek' })),
      el('button', { type: 'button', className: 'ikincil', textContent: '5 sn sonra', onclick: () => geriSayimBaslat(tur) }),
      el('button', { type: 'button', className: 'ikincil', textContent: 'Kapat', onclick: () => { h.kamera = null; ciz(); } }),
    ),
  );
  kameraAc(video).then((acildi) => {
    if (!acildi) {
      // Uygulama içi kamera açılamadı: telefonun kamerası kullanılır.
      kutu.replaceWith(el('label', { className: 'foto-alan' },
        el('span', { className: 'foto-ikon' }, ikon('kamera')),
        el('strong', { textContent: `${yuva.ad} fotoğraf çek` }),
        dosyaGirdisi(tur),
      ));
    } else if (ellerSerbest()) {
      setTimeout(() => video?.isConnected && h.kamera === tur && geriSayimBaslat(tur), sesAcik() ? 4000 : 800);
    }
  });
  return kutu;
}

// ---- Süreli kontroller (süt 10 sn, ezince 30 sn, kesince 5 dk); her kontrolün kendi sayacı ----

function sayaclariDurdur() {
  clearInterval(h.sayac);
  clearInterval(h.geriSayim);
  Object.assign(h, { sayac: null, geriSayim: null });
}

const sureYazisi = (sn) => (sn >= 60 ? `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, '0')}` : `${sn} sn`);

function sayaclariIslet() {
  if (h.sayac) return;
  const soylenen = new Set();
  h.sayac = setInterval(() => {
    let calisan = false;
    for (const [soru, bitis] of Object.entries(h.sayaclar)) {
      const kalan = Math.max(0, Math.round((bitis - Date.now()) / 1000));
      if (kalan > 0) calisan = true;
      else if (!soylenen.has(soru)) {
        soylenen.add(soru);
        sureDoldu(soru);
      }
      const kutu = kap?.querySelector(`.sayac[data-soru="${soru}"]`);
      if (kutu) sayacGuncelle(kutu, soru);
    }
    if (!calisan) {
      clearInterval(h.sayac);
      h.sayac = null;
    }
  }, 1000);
}

function sayacGuncelle(kutu, soru) {
  const adim = kontrolBul(soru);
  const bitis = h.sayaclar[soru];
  const kalan = bitis ? Math.max(0, Math.round((bitis - Date.now()) / 1000)) : null;
  kutu.querySelector('.sayac-sure').textContent = kalan === null ? sureYazisi(adim.sure) : kalan > 0 ? sureYazisi(kalan) : 'Şimdi bak';
  kutu.querySelector('button').textContent = kalan === null ? 'Sayacı başlat' : kalan > 0 ? 'Beklemeden bak' : 'Yeniden başlat';
  kutu.classList.toggle('bitti', kalan === 0);
}

function sayacCiz(adim) {
  const kutu = el('div', { className: 'sayac', 'data-soru': adim.soru },
    el('p', { textContent: adim.sureMetni }),
    el('strong', { className: 'sayac-sure' }),
    el('button', {
      type: 'button',
      className: 'ikincil',
      onclick: () => {
        const bitis = h.sayaclar[adim.soru];
        h.sayaclar[adim.soru] = bitis && bitis > Date.now() ? Date.now() : Date.now() + adim.sure * 1000;
        sayacGuncelle(kutu, adim.soru);
        sayaclariIslet();
      },
    }),
  );
  sayacGuncelle(kutu, adim.soru);
  return kutu;
}

function sureDoldu(soru) {
  const adim = kontrolBul(soru);
  if (sesAcik() && adim) soyle(`Süre doldu. ${adim.soruMetni} ${seceneklerSozu(adim)}`, { oncelikli: true });
  else if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ---- Kontrol listesi ----

function bekleyenler() {
  return kontrolListesi(turler, h.cevaplar, h.sorulanlar, h.benzerlikler);
}

function kontrolBul(soru) {
  return ADIM_DIZINI.get(soru);
}

// Cevaplanmış kontroller, cevaplandıkları sırayla.
function cevaplananlar() {
  return h.sorulanlar.map((s) => ADIM_DIZINI.get(s)).filter(Boolean);
}

// Bu kontrol hangi olası türleri birbirinden ayırır? (en çok iki çift; uzmanın "neden bakıyorum" cevabı)
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

// Kontrolle ilgili kullanıcı fotoğrafı (ör. solungaç sorusunun yanında alttan fotoğraf): uzman fotoğrafa bakarak cevaplar.
const ILGILI_FOTOGRAF = { sapkaRengi: 'ust', sapkaYuzeyi: 'ust', kucukKahverengi: 'ust', genc: 'yan', altYapi: 'alt', solungacRengi: 'alt', halka: 'yan', volva: 'yan' };

function kontrolCiz({ adim, neden }, sira) {
  const secili = h.cevaplar[adim.soru];
  const cevapli = secili !== undefined;
  // Cevaplanan kontrol tek satıra küçülür; dokununca açılır (çoklu seçimli olan düzenlenirken açık kalır).
  if (cevapli && h.acik !== adim.soru) {
    const metinler = adimSecenekleri(adim).filter((s) => (Array.isArray(secili) ? secili.includes(s.deger) : secili === s.deger)).map((s) => s.metin);
    return el('button', {
      type: 'button',
      className: `kontrol-ozet${secili === BILMIYORUM ? ' bilinmiyor' : ''}`,
      onclick: () => {
        h.acik = adim.soru;
        ciz();
      },
    }, el('span', { className: 'kontrol-tik', textContent: secili === BILMIYORUM ? '?' : '✓' }),
    el('span', {}, el('strong', { textContent: `${kisaAd(adim).replace(/^./, (c) => c.toLocaleUpperCase('tr'))}: ` }), metinler.join(', ')),
    el('span', { className: 'kontrol-degistir', textContent: 'Değiştir' }));
  }

  const kutu = el('div', { className: `kontrol${sira === 0 ? ' siradaki' : ''}`, 'data-soru': adim.soru });
  kutu.append(el('h3', { className: 'kontrol-soru', textContent: adim.soruMetni ?? adim.baslik }));
  const ciftler = neden === 'ayirt' ? ayirdigiCiftler(adim) : [];
  if (ciftler.length) kutu.append(el('p', { className: 'neden', textContent: `Bu kontrol ayırır: ${ciftler.map(([x, y]) => `${x} ↔ ${y}`).join('; ')}` }));
  else if (neden === 'guvenlik') kutu.append(el('p', { className: 'neden', textContent: 'Ölümcül türler yüzünden her mantarda bakılır.' }));
  if (adim.uyari) kutu.append(bildirim('tehlike', el('p', {}, el('strong', { textContent: adim.uyari }))));

  // Kendi fotoğrafın ve nasıl bakılacağı (örnek gerçek fotoğraf) yan yana; yönerge dokununca açılır.
  const kendi = h.fotograflar[ILGILI_FOTOGRAF[adim.soru] ?? adim.fotograf];
  const ornek = adimFotografi(adim);
  const yonerge = adim.yonerge ?? [];
  if (kendi || ornek || yonerge.length) {
    kutu.append(el('div', { className: 'kontrol-yardim' },
      kendi ? el('img', { className: 'kontrol-kendi', src: kendi, alt: 'Senin fotoğrafın' }) : '',
      ornek || yonerge.length
        ? el('details', { className: 'kontrol-nasil' }, el('summary', { textContent: 'Nasıl bakılır?' }), ...yonerge.map((p) => el('p', { textContent: p })), ornek)
        : '',
    ));
  }
  if (adim.sure) kutu.append(sayacCiz(adim));

  const liste = el('div', { className: `secenekler kontrol-secenekler${adim.coklu ? ' coklu' : ''}` });
  for (const secenek of adimSecenekleri(adim)) {
    const seciliMi = Array.isArray(secili) ? secili.includes(secenek.deger) : secili === secenek.deger;
    const siniflar = ['secenek'];
    if (seciliMi) siniflar.push('secili');
    if (secenek.deger === BILMIYORUM) siniflar.push('bilmiyorum');
    const foto = secenekFotografi(secenek.cizim);
    if (foto) siniflar.push('resimli');
    const dugme = el('button',
      { type: 'button', className: siniflar.join(' '), onclick: () => (adim.coklu ? cokluSec(adim, secenek.deger) : cevapla(adim, secenek.deger)) },
      foto,
      ...(adim.coklu ? [el('span', { className: 'onay-kutusu', textContent: seciliMi ? '✓' : '' })] : []),
      el('span', { textContent: secenek.metin }),
    );
    dugme.setAttribute('aria-pressed', String(seciliMi));
    liste.append(dugme);
  }
  kutu.append(liste);
  if (adim.coklu && cevapli) kutu.append(el('button', { type: 'button', className: 'birincil kontrol-tamam', textContent: 'Tamam', onclick: () => { h.acik = null; ciz(); siradakineKaydir(); } }));
  return kutu;
}

function kontrollerCiz() {
  const liste = bekleyenler();
  const yapilan = cevaplananlar().map((adim) => kontrolCiz({ adim, neden: null }, -1));
  // Sıradaki en çok 3 kontrol gösterilir; cevap geldikçe gereksizleşenler listeden düşer (baştaki uzun liste gözü korkutmasın).
  return el('section', { className: 'kontroller-bolumu' },
    el('h2', { className: 'bolum-baslik', textContent: 'Kontroller' }),
    el('p', { className: 'not', textContent: liste.length
      ? 'Fotoğrafına bakarak cevapla. Emin olmadığında "Bilmiyorum" seç; tahmin etme.'
      : 'Gereken bütün kontroller yapıldı.' }),
    ...yapilan,
    ...liste.slice(0, 3).map((k, i) => kontrolCiz(k, i)),
  );
}

// ---- Canlı sonuç ----

function canliSonuc() {
  const cevaplar = sonCevaplar(h.cevaplar);
  return degerlendir({ fotograflar: Object.keys(h.fotograflar), cevaplar, adaylar: adaylariBul(turler, cevaplar) });
}

function canliSonucCiz() {
  const sonuc = canliSonuc();
  const bitti = bekleyenler().length === 0;
  const eksikFoto = GEREKLI_FOTOGRAFLAR.filter((t) => !h.fotograflar[t]).length;
  const yapilan = h.sorulanlar.length;
  const durum = [
    bitti && !eksikFoto ? 'Bütün kontroller yapıldı.' : 'Şimdilik;',
    eksikFoto ? `${eksikFoto} fotoğraf eksik.` : '',
    !bitti ? (yapilan ? `${yapilan} kontrol yapıldı.` : 'Kontrolleri cevapla.') : '',
  ].filter(Boolean).join(' ');
  return el('div', { className: `canli-sonuc canli-${sonuc.renk}` },
    el('div', { className: 'canli-yazi' },
      el('strong', { textContent: SONUC_SOZLERI[sonuc.renk] }),
      el('span', { textContent: durum }),
    ),
    el('button', { type: 'button', className: 'birincil', textContent: 'Sonucu gör', onclick: bitir }),
  );
}

// ---- Sayfa ----

function sayfaCiz() {
  const govde = el('div', { className: 'adim hizli tek-sayfa' },
    el('div', { className: 'tek-sayfa-ust' },
      el('p', { className: 'ust-etiket', textContent: 'Fotoğrafla tanımla' }),
      el('button', { type: 'button', className: 'ikincil kucuk-dugme', textContent: 'Vazgeç', onclick: vazgec }),
    ),
    ayarlarCiz(),
    ...ayarNotlari(),
    fotograflarCiz(),
  );
  // Fotoğraf gelince tahmin ve kontroller görünür (fotoğrafa bakarak cevaplanır).
  if (Object.keys(h.fotograflar).length) {
    govde.append(adaylarCiz(), kontrollerCiz(), canliSonucCiz());
  }
  return govde;
}

function vazgec() {
  hizliKapat();
  hizliSifirla();
  ayarlar.vazgec();
}

function siradakineKaydir() {
  setTimeout(() => {
    const hedef = kap?.querySelector('.kontrol.siradaki');
    if (hedef) hedef.scrollIntoView({ block: 'start', behavior: 'smooth' });
    siradakiniSoyle();
  }, 60);
}

function cevapla(adim, deger) {
  // Seçili cevaba yeniden dokununca cevap kalkar.
  if (h.cevaplar[adim.soru] === deger) {
    delete h.cevaplar[adim.soru];
    h.sorulanlar = h.sorulanlar.filter((s) => s !== adim.soru);
  } else {
    h.cevaplar[adim.soru] = deger;
    if (!h.sorulanlar.includes(adim.soru)) h.sorulanlar.push(adim.soru);
  }
  // Koşulu kalkan adımların cevabı silinir (ör. "genç değil" denince kesit sorusu).
  temizle();
  h.acik = null;
  ciz();
  siradakineKaydir();
}

// Çoklu seçim (ör. çevrede neler var); "Bilmiyorum" tek başına seçilir.
function cokluSec(adim, deger) {
  const once = h.cevaplar[adim.soru];
  if (deger === BILMIYORUM) {
    h.cevaplar[adim.soru] = once === BILMIYORUM ? undefined : BILMIYORUM;
  } else {
    const liste = Array.isArray(once) ? once : [];
    const yeni = liste.includes(deger) ? liste.filter((d) => d !== deger) : [...liste, deger];
    h.cevaplar[adim.soru] = yeni.length ? yeni : undefined;
  }
  if (h.cevaplar[adim.soru] === undefined) {
    delete h.cevaplar[adim.soru];
    h.sorulanlar = h.sorulanlar.filter((s) => s !== adim.soru);
  } else if (!h.sorulanlar.includes(adim.soru)) {
    h.sorulanlar.push(adim.soru);
  }
  h.acik = adim.soru;
  ciz();
}

function temizle() {
  for (const soru of [...h.sorulanlar]) {
    const adim = ADIM_DIZINI.get(soru);
    if (adim?.kosul && !adim.kosul(h.cevaplar)) {
      delete h.cevaplar[soru];
      h.sorulanlar = h.sorulanlar.filter((s) => s !== soru);
    }
  }
}

function bitir() {
  hizliKapat();
  h.basladi = false;
  ayarlar.bitir({
    cevaplar: { ...h.cevaplar },
    fotograflar: { ...h.fotograflar },
    benzerlikler: { ...h.benzerlikler },
  });
}

function seceneklerSozu(adim) {
  if (!adim.secenekler) return '';
  return `${adimSecenekleri(adim).map((s) => s.metin.split('/')[0].trim()).join(', ')}?`;
}

// Sesli: eksik fotoğraf varsa onu, yoksa sıradaki kontrolü okur.
function siradakiniSoyle() {
  if (!sesAcik() || !h.basladi) return;
  const eksik = YUVALAR.find((y) => !h.fotograflar[y.tur]);
  if (eksik && !Object.keys(h.fotograflar).length) {
    soyle(`Önce üç fotoğraf: üstten, alttan ve yandan. ${eksik.ad} fotoğraf için çek düğmesine bas.`, { oncelikli: true });
    return;
  }
  const siradaki = bekleyenler()[0];
  if (!siradaki) {
    soyle(eksik ? `${eksik.ad} fotoğraf eksik.` : 'Kontroller bitti. Sonucu gör düğmesine bas.', { oncelikli: true });
    return;
  }
  const a = siradaki.adim;
  soyle([a.uyari, a.soruMetni, seceneklerSozu(a)].filter(Boolean).join(' '), { oncelikli: true });
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
  if (window.speechSynthesis?.speaking || !kap?.isConnected || !h.basladi) return;
  const a = bekleyenler()[0]?.adim;
  const komut = komutuAnla(metin, a?.soruMetni ? adimSecenekleri(a) : []);
  if (!komut) return;
  if (komut.komut === 'tekrar') siradakiniSoyle();
  else if (komut.komut === 'geri') vazgec();
  else if (komut.komut === 'cek' && h.kamera) fotografCek(h.kamera);
  else if (komut.komut === 'devam' && a?.sure && h.sayaclar[a.soru]) h.sayaclar[a.soru] = Date.now();
  else if (komut.komut === 'secenek' && a && !a.coklu) cevapla(a, komut.deger);
}
