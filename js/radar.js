// Ana ekrandaki "Yerlerim ve mantar radarı" kartı:
// - Mantar radarı: kayıtlı yerlerin ve gizli yerlerin yağmuruna tek istekte bakar, mantar zamanına göre sıralar.
// - Gizli yerlerim: mantar bulunan yerler tam konumuyla yalnızca bu cihazda saklanır (kural 12).
//   Hava servisine yalnızca yuvarlanmış (~10 km) koordinat gider.
import { bildirim, cubukCiz, el, ikon } from './dom.js';
import { durumuOku, durumuYaz } from './durum.js';
import { cihazKonumu, gunlukKayitlar, havaVerileriAl, konumuYuvarla, mantarPenceresi } from './yagmur.js';
import { pencereBilgisi, takibeAl } from './yagmurKarti.js';

const AZAMI_GIZLI_YER = 50;

// Ekranda kalan geçici durum.
const radar = {
  acik: false,
  yukleniyor: false,
  sonuclar: null, // [{ yer, bilgi, puan }] veya { hata }
  kaydediliyor: false,
  kayitHatasi: null,
  yeniAd: '',
  yeniNot: '',
};

const kap = el('div', { className: 'radar-bolumu' });

const tarihYaz = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

function gizliYerler() {
  return durumuOku().gizliYerler ?? [];
}

function gizliYerleriYaz(liste) {
  durumuYaz({ ...durumuOku(), gizliYerler: liste });
}

// Radar için yerler: yağmur kartında kaydedilen yerler ve gizli yerler.
// Aynı ~10 km kareye düşen yerlere tek kez bakılır.
function radarYerleri() {
  const yerler = [
    ...(durumuOku().yerler ?? []).map((y) => ({ ad: y.ad, bolge: y.bolge, enlem: y.enlem, boylam: y.boylam })),
    ...gizliYerler().map((y) => ({ ad: y.ad, bolge: 'Gizli yerim', enlem: konumuYuvarla(y.enlem), boylam: konumuYuvarla(y.boylam) })),
  ];
  const gorulen = new Set();
  return yerler.filter((y) => {
    const anahtar = `${y.ad}|${y.enlem}|${y.boylam}`;
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);
    return true;
  });
}

// En verimli dönemdeki yerler önce (bitmesine çok kalan önde), sonra yakında başlayacaklar, sonra azalanlar.
function puan(p) {
  if (p.durum === 'verimli') return 3000 + p.simdiki.verimliKalanGun;
  if (p.durum === 'bekle') return 2000 - p.siradaki.kalanGun;
  if (p.durum === 'azaliyor') return 1000 + p.simdiki.kalanGun;
  return 0;
}

async function radaraBak() {
  const yerler = radarYerleri();
  if (!yerler.length) return;
  Object.assign(radar, { yukleniyor: true, sonuclar: null });
  ciz();
  const veriler = await havaVerileriAl(yerler);
  radar.yukleniyor = false;
  if (veriler.hata) radar.sonuclar = { hata: 'baglanti' };
  else {
    radar.sonuclar = yerler
      .map((yer, i) => {
        const p = mantarPenceresi(gunlukKayitlar(veriler[i].daily));
        return { yer, bilgi: pencereBilgisi(p), durum: p.durum, puan: puan(p) };
      })
      .sort((a, b) => b.puan - a.puan);
    radar.alindi = new Date();
  }
  ciz();
}

function radarSatiri({ yer, bilgi, durum }) {
  return el('div', { className: `radar-satir pencere-${durum}` },
    el('div', { className: 'mevsim-ust' },
      el('span', {}, el('strong', { textContent: yer.ad }), el('span', { className: 'acilir-alt', textContent: `${bilgi.baslik}${yer.bolge ? ` · ${yer.bolge}` : ''}` })),
      el('span', { className: 'mevsim-gun', textContent: bilgi.sagUst }),
    ),
    cubukCiz(bilgi.yuzde, `${yer.ad}: mantar döneminin kalan kısmı`),
    el('button', { type: 'button', className: 'metin-dugme radar-takip', textContent: 'Bu yeri takip et', onclick: () => { takibeAl(yer); window.scrollTo({ top: 0, behavior: 'smooth' }); } }),
  );
}

function radarIcerigi() {
  const yerler = radarYerleri();
  const icerik = [
    el('h3', { className: 'radar-baslik', textContent: 'Mantar radarı' }),
    el('p', { className: 'not radar-aciklama', textContent: 'Kaydettiğin bütün yerlerin son yağmuruna bakar ve mantar zamanı en yakın olanı en üste koyar.' }),
  ];
  if (!yerler.length) {
    icerik.push(el('p', { className: 'not', textContent: 'Henüz kayıtlı yerin yok. Yağmur ipucunda bir yer seç ya da aşağıdan gizli bir yer kaydet.' }));
    return icerik;
  }
  icerik.push(el('button', {
    type: 'button',
    className: 'ikincil radar-dugme',
    textContent: radar.sonuclar && !radar.sonuclar.hata ? 'Yeniden bak' : `${yerler.length} yerime bak`,
    disabled: radar.yukleniyor,
    onclick: radaraBak,
  }));
  if (radar.yukleniyor) icerik.push(el('p', { className: 'not', textContent: 'Bakılıyor…' }));
  if (radar.sonuclar?.hata) {
    icerik.push(bildirim('uyari', el('p', { textContent: 'Bilgi alınamadı. İnternet bağlantını kontrol et.' })));
  } else if (radar.sonuclar) {
    icerik.push(el('div', { className: 'radar-listesi' }, ...radar.sonuclar.map(radarSatiri)));
  }
  return icerik;
}

// --- Gizli yerlerim ---

async function yerimiKaydet(olay) {
  olay.preventDefault();
  Object.assign(radar, { kaydediliyor: true, kayitHatasi: null });
  ciz();
  const konum = await cihazKonumu();
  radar.kaydediliyor = false;
  if (konum.hata) {
    radar.kayitHatasi = konum.hata;
    ciz();
    return;
  }
  const liste = gizliYerler();
  const yer = {
    id: `${Date.now()}`,
    ad: radar.yeniAd.trim() || `Gizli yer ${liste.length + 1}`,
    not: radar.yeniNot.trim(),
    // Yeri tekrar bulabilmek için tam konum saklanır; yalnızca bu cihazda kalır.
    enlem: Math.round(konum.enlem * 1e5) / 1e5,
    boylam: Math.round(konum.boylam * 1e5) / 1e5,
    tarih: new Date().toISOString(),
  };
  gizliYerleriYaz([yer, ...liste].slice(0, AZAMI_GIZLI_YER));
  Object.assign(radar, { yeniAd: '', yeniNot: '', sonuclar: null });
  ciz();
}

function yeriSil(yer) {
  if (!confirm(`"${yer.ad}" silinsin mi? Bu geri alınamaz.`)) return;
  gizliYerleriYaz(gizliYerler().filter((y) => y.id !== yer.id));
  radar.sonuclar = null;
  ciz();
}

const KAYIT_HATALARI = {
  izin: 'Konum izni verilmedi. Yeri kaydetmek için tarayıcı ayarlarından konum iznini açabilirsin.',
  yok: 'Konum bulunamadı. Açık bir alanda tekrar dene.',
};

function gizliYerSatiri(yer) {
  const koordinat = `${yer.enlem}, ${yer.boylam}`;
  return el('div', { className: 'gizli-yer' },
    el('div', { className: 'gizli-yer-ust' },
      el('strong', { textContent: yer.ad }),
      el('span', { className: 'not', textContent: tarihYaz(yer.tarih) }),
    ),
    yer.not ? el('p', { className: 'gizli-yer-not', textContent: yer.not }) : '',
    el('p', { className: 'not gizli-yer-koordinat', textContent: koordinat }),
    el('div', { className: 'gizli-yer-dugmeleri' },
      // geo: bağlantısı telefonun kendi harita uygulamasını açar; uygulama konumu bir siteye göndermez.
      el('a', { className: 'metin-dugme', href: `geo:${yer.enlem},${yer.boylam}?q=${yer.enlem},${yer.boylam}`, textContent: 'Haritada aç' }),
      el('button', {
        type: 'button',
        className: 'metin-dugme',
        textContent: 'Yağmurunu takip et',
        onclick: () => {
          takibeAl({ ad: yer.ad, bolge: 'Gizli yerim', enlem: konumuYuvarla(yer.enlem), boylam: konumuYuvarla(yer.boylam) });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      }),
      el('button', { type: 'button', className: 'metin-dugme soluk', textContent: 'Sil', onclick: () => yeriSil(yer) }),
    ),
  );
}

function gizliYerlerIcerigi() {
  const adGirdisi = el('input', {
    type: 'text',
    className: 'yagmur-girdi',
    placeholder: 'Yerin adı: ör. yayla yolundaki çamlık',
    value: radar.yeniAd,
    maxLength: 60,
    oninput: (o) => { radar.yeniAd = o.target.value; },
  });
  adGirdisi.setAttribute('aria-label', 'Yerin adı');
  const notGirdisi = el('input', {
    type: 'text',
    className: 'yagmur-girdi',
    placeholder: 'Not (isteğe bağlı): ne buldun?',
    value: radar.yeniNot,
    maxLength: 140,
    oninput: (o) => { radar.yeniNot = o.target.value; },
  });
  notGirdisi.setAttribute('aria-label', 'Not');

  const icerik = [
    el('h3', { className: 'radar-baslik takip-ara-baslik', textContent: 'Gizli yerlerim' }),
    el('p', { className: 'not radar-aciklama', textContent: 'Mantar bulduğun yeri kaydet. Yalnızca bu cihazda kalır, kimseyle paylaşılmaz. Telefonu değiştirirsen veya tarayıcı verilerini silersen kaybolur.' }),
    el('form', { className: 'gizli-yer-formu', onsubmit: yerimiKaydet },
      adGirdisi,
      notGirdisi,
      el('button', { type: 'submit', className: 'konum-dugme', disabled: radar.kaydediliyor },
        ikon('konum'), el('span', { textContent: radar.kaydediliyor ? 'Konum alınıyor…' : 'Şu an bulunduğum yeri kaydet' }),
      ),
    ),
  ];
  if (radar.kayitHatasi) icerik.push(bildirim('uyari', el('p', { textContent: KAYIT_HATALARI[radar.kayitHatasi] })));
  const liste = gizliYerler();
  if (liste.length) icerik.push(el('div', { className: 'gizli-yer-listesi' }, ...liste.map(gizliYerSatiri)));
  icerik.push(el('p', { className: 'not', textContent: 'Bir yerde mantar bulman, oradaki her mantarın aynı tür olduğu anlamına gelmez. Her mantarı yine Tanımla ile incele.' }));
  return icerik;
}

function ciz() {
  const sayi = gizliYerler().length;
  const kart = el('details', { className: 'kart yagmur-karti radar-karti' },
    el('summary', {},
      el('span', {},
        el('strong', { textContent: 'Yerlerim ve mantar radarı' }),
        el('span', { className: 'yagmur-ozet', textContent: sayi ? `${sayi} gizli yer · yalnızca bu cihazda` : 'Yerlerini karşılaştır, bulduğun yeri kaydet' }),
      ),
    ),
    el('div', { className: 'yagmur-govde' }, ...radarIcerigi(), ...gizliYerlerIcerigi()),
  );
  kart.open = radar.acik;
  kart.addEventListener('toggle', () => { radar.acik = kart.open; });
  kap.replaceChildren(kart);
}

document.addEventListener('yerler-degisti', () => {
  radar.sonuclar = null;
  ciz();
});

export function radarKarti() {
  ciz();
  return kap;
}
