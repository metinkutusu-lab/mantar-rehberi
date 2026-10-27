// "Mantar zamanı" kartındaki Yerlerim bölümü (kartı js/anaKart.js kurar):
// - Tek liste: aranıp seçilen yerler ve gizli yerler. Bölüm açılınca hepsinin yağmuruna tek istekte bakılır
//   (mantar radarı) ve mantar zamanı en yakın olan en üste gelir.
// - Bulunduğun yer: konum yalnızca "Konumumu kullan"a dokununca sorulur. Oranın yağmuruna bakılır,
//   istenirse takibe alınır ya da gizli yer olarak kaydedilir (internet olmadan da kaydedilebilir).
// Gizli yerin tam konumu yalnızca bu cihazda kalır; hava servisine yalnızca yuvarlanmış (~10 km) koordinat gider (kural 12).
import { bildirim, cubukCiz, el, ikon } from './dom.js';
import { durumuOku, durumuYaz } from './durum.js';
import { cihazKonumu, gunlukKayitlar, havaVerileriAl, konumuYuvarla, mantarPenceresi } from './yagmur.js';
import { pencereBilgisi, pencereCiz, takibeAl } from './yagmurKarti.js';

const AZAMI_GIZLI_YER = 50;
// Yağmur takibiyle aynı: 20 dakikadan eski bilgi açılışta yenilenir (js/yagmurKarti.js).
const YENILEME_ARALIGI = 20 * 60 * 1000;

// Ekranda kalan geçici durum.
const durum = {
  acildi: false,
  yukleniyor: false,
  sonuclar: null, // Map: "enlem|boylam" -> { bilgi, durum, puan }
  hata: false,
  alindi: 0,
  konum: null, // { yukleniyor } | { hata } | { enlem, boylam, kayitlar | null }
  yeniAd: '',
  yeniNot: '',
};

const listeKap = el('div', { className: 'yerlerim-listesi-bolumu' });
const konumKap = el('div', { className: 'konum-bolumu' });

const tarihYaz = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const anahtar = (y) => `${konumuYuvarla(y.enlem)}|${konumuYuvarla(y.boylam)}`;

function kalici(degisiklik) {
  durumuYaz({ ...durumuOku(), ...degisiklik });
}

const kayitliYerler = () => durumuOku().yerler ?? [];
const gizliYerler = () => durumuOku().gizliYerler ?? [];

// Listedeki bütün yerler: kayıtlı yerler ve gizli yerler.
function tumYerler() {
  return [
    ...kayitliYerler().map((y) => ({ ...y, tur: 'kayitli' })),
    ...gizliYerler().map((y) => ({ ...y, tur: 'gizli' })),
  ];
}

// En verimli dönemdeki yerler önce (bitmesine çok kalan önde), sonra yakında başlayacaklar, sonra azalanlar.
function puan(p) {
  if (p.durum === 'verimli') return 3000 + p.simdiki.verimliKalanGun;
  if (p.durum === 'bekle') return 2000 - p.siradaki.kalanGun;
  if (p.durum === 'azaliyor') return 1000 + p.simdiki.kalanGun;
  return 0;
}

// Aynı ~10 km kareye düşen yerlere tek kez bakılır.
async function radaraBak() {
  const kareler = [...new Map(tumYerler().map((y) => [anahtar(y), { enlem: konumuYuvarla(y.enlem), boylam: konumuYuvarla(y.boylam) }])).entries()];
  if (!kareler.length || !navigator.onLine) return;
  Object.assign(durum, { yukleniyor: true, hata: false });
  ciz();
  const veriler = await havaVerileriAl(kareler.map(([, k]) => k));
  durum.yukleniyor = false;
  if (veriler.hata) durum.hata = true;
  else {
    durum.sonuclar = new Map(kareler.map(([a], i) => {
      const p = mantarPenceresi(gunlukKayitlar(veriler[i].daily));
      return [a, { bilgi: pencereBilgisi(p), durum: p.durum, puan: puan(p) }];
    }));
    durum.alindi = Date.now();
  }
  ciz();
}

// --- Liste ---

function takipEdilenMi(yer) {
  const t = durumuOku().takipYeri;
  return Boolean(t) && t.ad === yer.ad && anahtar(t) === anahtar(yer);
}

function yeriSil(yer) {
  if (!confirm(`"${yer.ad}" listeden silinsin mi? Bu geri alınamaz.`)) return;
  if (yer.tur === 'gizli') kalici({ gizliYerler: gizliYerler().filter((y) => y.id !== yer.id) });
  else kalici({ yerler: kayitliYerler().filter((y) => !(y.ad === yer.ad && y.bolge === yer.bolge)) });
  ciz();
}

function yerSatiri(yer) {
  const sonuc = durum.sonuclar?.get(anahtar(yer));
  const alt = [sonuc?.bilgi.baslik, yer.tur === 'gizli' ? 'Gizli yer' : yer.bolge].filter(Boolean).join(' · ');
  const takipte = takipEdilenMi(yer);
  const dugmeler = [
    takipte
      ? el('span', { className: 'not yer-takipte', textContent: 'Takip ediliyor' })
      : el('button', {
        type: 'button',
        className: 'metin-dugme',
        textContent: 'Takip et',
        onclick: () => takibeAl({ ad: yer.ad, bolge: yer.tur === 'gizli' ? 'Gizli yer' : yer.bolge, enlem: konumuYuvarla(yer.enlem), boylam: konumuYuvarla(yer.boylam) }),
      }),
  ];
  if (yer.tur === 'gizli') {
    // geo: bağlantısı telefonun kendi harita uygulamasını açar; uygulama konumu bir siteye göndermez.
    dugmeler.push(el('a', { className: 'metin-dugme', href: `geo:${yer.enlem},${yer.boylam}?q=${yer.enlem},${yer.boylam}`, textContent: 'Haritada aç' }));
  }
  dugmeler.push(el('button', { type: 'button', className: 'metin-dugme soluk', textContent: 'Sil', onclick: () => yeriSil(yer) }));

  return el('div', { className: `yer-satiri${sonuc ? ` pencere-${sonuc.durum}` : ''}` },
    el('div', { className: 'mevsim-ust' },
      el('span', { className: 'acilir-baslik' },
        el('strong', { textContent: yer.ad }),
        alt ? el('span', { className: 'acilir-alt', textContent: alt }) : '',
      ),
      el('span', { className: 'mevsim-gun', textContent: sonuc?.bilgi.sagUst ?? '' }),
    ),
    sonuc ? cubukCiz(sonuc.bilgi.yuzde, `${yer.ad}: mantar döneminin kalan kısmı`) : '',
    yer.tur === 'gizli' && yer.not ? el('p', { className: 'gizli-yer-not', textContent: yer.not }) : '',
    yer.tur === 'gizli' ? el('p', { className: 'not gizli-yer-koordinat', textContent: `${yer.enlem}, ${yer.boylam} · ${tarihYaz(yer.tarih)}` }) : '',
    el('div', { className: 'yer-dugmeleri' }, ...dugmeler),
  );
}

function listeCiz() {
  const yerler = tumYerler();
  const icerik = [el('h3', { className: 'yerlerim-baslik', textContent: 'Kayıtlı yerlerim' })];
  if (!yerler.length) {
    icerik.push(el('p', { className: 'not', textContent: 'Henüz kayıtlı yerin yok. Aşağıdan bir yer ara ya da bulunduğun yeri kaydet.' }));
    return icerik;
  }
  if (durum.sonuclar) yerler.sort((a, b) => (durum.sonuclar.get(anahtar(b))?.puan ?? -1) - (durum.sonuclar.get(anahtar(a))?.puan ?? -1));
  // Durum tek satırda; yenilenirken yalnızca yazısı değişir, düğme hep yerinde (kart daralıp büyümesin).
  let aciklama = 'Mantar zamanı en yakın olan yer en üstte.';
  if (durum.yukleniyor) aciklama = 'Yerlerinin yağmuruna bakılıyor…';
  else if (durum.hata) aciklama = 'Yağmur bilgisi alınamadı. İnternet bağlantını kontrol et.';
  icerik.push(el('p', { className: 'not yerlerim-aciklama', textContent: aciklama }));
  icerik.push(el('div', { className: 'yerlerim-listesi' }, ...yerler.map(yerSatiri)));
  icerik.push(el('button', { type: 'button', className: 'metin-dugme yerlerim-yenile', textContent: 'Yeniden bak', disabled: durum.yukleniyor, onclick: radaraBak }));
  icerik.push(el('p', { className: 'not', textContent: 'Bir yerde mantar bulman, oradaki her mantarın aynı tür olduğu anlamına gelmez. Her mantarı yine Tanımla ile incele.' }));
  return icerik;
}

// --- Bulunduğun yer ---

async function konumumaBak() {
  durum.konum = { yukleniyor: true };
  ciz();
  const konum = await cihazKonumu();
  if (konum.hata) {
    durum.konum = { hata: konum.hata };
    ciz();
    return;
  }
  durum.konum = { enlem: konum.enlem, boylam: konum.boylam, kayitlar: null, havaYukleniyor: navigator.onLine };
  ciz();
  if (!navigator.onLine) return;
  const veriler = await havaVerileriAl([{ enlem: konum.enlem, boylam: konum.boylam }]);
  if (durum.konum?.enlem !== konum.enlem) return;
  durum.konum.havaYukleniyor = false;
  if (!veriler.hata) durum.konum.kayitlar = gunlukKayitlar(veriler[0].daily);
  ciz();
}

function gizliYerKaydet(olay) {
  olay.preventDefault();
  const k = durum.konum;
  const liste = gizliYerler();
  const yer = {
    id: `${Date.now()}`,
    ad: durum.yeniAd.trim() || `Gizli yer ${liste.length + 1}`,
    not: durum.yeniNot.trim(),
    // Yeri tekrar bulabilmek için tam konum saklanır; yalnızca bu cihazda kalır.
    enlem: Math.round(k.enlem * 1e5) / 1e5,
    boylam: Math.round(k.boylam * 1e5) / 1e5,
    tarih: new Date().toISOString(),
  };
  kalici({ gizliYerler: [yer, ...liste].slice(0, AZAMI_GIZLI_YER) });
  Object.assign(durum, { konum: null, yeniAd: '', yeniNot: '' });
  ciz();
  if (durum.sonuclar) radaraBak();
}

const KONUM_HATALARI = {
  izin: 'Konum izni verilmedi. Yer adını yazarak arayabilirsin; izni sonra tarayıcı ayarlarından açabilirsin.',
  yok: 'Konum bulunamadı. Açık bir alanda tekrar dene ya da yer adını yazarak ara.',
};

function konumCiz() {
  const k = durum.konum;
  const icerik = [
    el('h3', { className: 'yerlerim-baslik', textContent: 'Bulunduğun yer' }),
    el('button', { type: 'button', className: 'konum-dugme', disabled: Boolean(k?.yukleniyor), onclick: konumumaBak },
      ikon('konum'), el('span', { textContent: k?.yukleniyor ? 'Konum alınıyor…' : 'Konumumu kullan' })),
    el('p', { className: 'not konum-not', textContent: 'İsteğe bağlı. Telefon izin sorar. Hava servisine yalnızca yaklaşık konum (10 km) gider. Gizli yer olarak kaydedersen tam konum yalnızca bu cihazda kalır.' }),
  ];
  if (k?.hata) icerik.push(bildirim('uyari', el('p', { textContent: KONUM_HATALARI[k.hata] })));
  if (k?.enlem == null) return icerik;

  let hava;
  if (k.kayitlar) hava = pencereCiz(mantarPenceresi(k.kayitlar));
  else if (k.havaYukleniyor) hava = el('p', { className: 'not', textContent: 'Yağmuruna bakılıyor…' });
  else hava = el('p', { className: 'not', textContent: 'Yağmur bilgisi alınamadı (internet yok olabilir). Yeri yine de gizli yer olarak kaydedebilirsin.' });

  const adGirdisi = el('input', {
    type: 'text',
    className: 'yagmur-girdi',
    placeholder: 'Yerin adı: ör. yayla yolundaki çamlık',
    value: durum.yeniAd,
    maxLength: 60,
    oninput: (o) => { durum.yeniAd = o.target.value; },
  });
  adGirdisi.setAttribute('aria-label', 'Yerin adı');
  const notGirdisi = el('input', {
    type: 'text',
    className: 'yagmur-girdi',
    placeholder: 'Not (isteğe bağlı): ne buldun?',
    value: durum.yeniNot,
    maxLength: 140,
    oninput: (o) => { durum.yeniNot = o.target.value; },
  });
  notGirdisi.setAttribute('aria-label', 'Not');

  icerik.push(el('div', { className: 'tek-seferlik' },
    el('p', { className: 'yagmur-etiket', textContent: 'Bulunduğun yer (yaklaşık 10 km çevresi)' }),
    hava,
    k.kayitlar ? el('button', {
      type: 'button',
      className: 'metin-dugme',
      textContent: 'Bu yerin yağmurunu takip et',
      onclick: () => {
        const yer = {
          ad: 'Konumum',
          bolge: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
          enlem: konumuYuvarla(k.enlem),
          boylam: konumuYuvarla(k.boylam),
        };
        durum.konum = null;
        takibeAl(yer);
      },
    }) : '',
    el('form', { className: 'gizli-yer-formu', onsubmit: gizliYerKaydet },
      el('p', { className: 'yagmur-etiket', textContent: 'Mantar mı buldun? Bu yeri gizli yer olarak kaydet:' }),
      adGirdisi,
      notGirdisi,
      el('button', { type: 'submit', className: 'ikincil', textContent: 'Gizli yer olarak kaydet' }),
    ),
    el('p', { className: 'not', textContent: 'Gizli yerler yalnızca bu cihazda kalır, kimseyle paylaşılmaz. Telefonu değiştirirsen veya tarayıcı verilerini silersen kaybolur.' }),
  ));
  return icerik;
}

function ciz() {
  listeKap.replaceChildren(...listeCiz());
  konumKap.replaceChildren(...konumCiz());
}

// Yerlerim ilk açıldığında (ve bilgi eskiyse) bütün yerlerin yağmuruna bakılır.
export function yerlerimAcildi() {
  durum.acildi = true;
  if (!durum.yukleniyor && Date.now() - durum.alindi > YENILEME_ARALIGI) radaraBak();
}

document.addEventListener('yerler-degisti', () => {
  ciz();
  if (durum.acildi) radaraBak();
});

export function yerlerimListesi() {
  ciz();
  return listeKap;
}

export function konumBolumu() {
  return konumKap;
}
