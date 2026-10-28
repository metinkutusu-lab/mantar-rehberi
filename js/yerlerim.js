// "Mantar zamanı" kartındaki Yerlerim bölümü (kartı js/anaKart.js kurar):
// - İki liste (Metin, 2026-10-28: "ikisi karışıyor"): "Bölgelerim" (aranıp seçilen genel yerler, yağmur takibi için) ve
//   "Bulduğum mantarlar" (her bulunan mantarın türü ve tam noktası; js/bulduklarim.js, Mantar ara haritasında da
//   türün fotoğrafıyla görünür). Bölüm açılınca hepsinin yağmuruna tek istekte bakılır (mantar radarı) ve her
//   listede mantar zamanı en yakın olan en üste gelir.
// - Bulunduğun yer: konum yalnızca "Konumumu kullan"a dokununca sorulur. Oranın yağmuruna bakılır,
//   istenirse takibe alınır ya da gizli yer olarak kaydedilir (internet olmadan da kaydedilebilir).
// Gizli yerin tam konumu yalnızca bu cihazda kalır; hava servisine yalnızca yuvarlanmış (~10 km) koordinat gider (kural 12).
import { bildirim, cubukCiz, el, ikon, kucukFotograf } from './dom.js';
import { KENDI_NOTUN, bulduguKaydet, bulduguSil, bulduklarim, kayitAdi, turSecici } from './bulduklarim.js';
import { turleriYukle } from './turler.js';
import { durumuOku, durumuYaz } from './durum.js';
import { cihazKonumu, gunlukKayitlar, havaVerileriAl, konumuYuvarla, mantarPenceresi } from './yagmur.js';
import { pencereBilgisi, pencereCiz, takibeAl } from './yagmurKarti.js';

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
  yeniTurId: null,
  yeniNot: '',
};
let turler = [];
turleriYukle().then((liste) => { turler = liste; ciz(); });

const listeKap = el('div', { className: 'yerlerim-listesi-bolumu' });
const konumKap = el('div', { className: 'konum-bolumu' });

const tarihYaz = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const anahtar = (y) => `${konumuYuvarla(y.enlem)}|${konumuYuvarla(y.boylam)}`;

function kalici(degisiklik) {
  durumuYaz({ ...durumuOku(), ...degisiklik });
}

const kayitliYerler = () => durumuOku().yerler ?? [];
// Bütün yerler: bölgeler (kayıtlı yerler) ve bulduğum mantarlar.
function tumYerler() {
  return [
    ...kayitliYerler().map((y) => ({ ...y, tur: 'kayitli' })),
    ...bulduklarim().map((y) => ({ ...y, tur: 'gizli' })),
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
  const ad = yer.tur === 'gizli' ? kayitAdi(yer, turler) : yer.ad;
  if (!confirm(`"${ad}" listeden silinsin mi? Bu geri alınamaz.`)) return;
  if (yer.tur === 'gizli') bulduguSil(yer.id);
  else kalici({ yerler: kayitliYerler().filter((y) => !(y.ad === yer.ad && y.bolge === yer.bolge)) });
  ciz();
}

function yerSatiri(yer) {
  const sonuc = durum.sonuclar?.get(anahtar(yer));
  const bulduk = yer.tur === 'gizli';
  const ad = bulduk ? kayitAdi(yer, turler) : yer.ad;
  const alt = [sonuc?.bilgi.baslik, bulduk ? tarihYaz(yer.tarih) : yer.bolge].filter(Boolean).join(' · ');
  const takipte = takipEdilenMi(yer);
  const dugmeler = [
    takipte
      ? el('span', { className: 'not yer-takipte', textContent: 'Takip ediliyor' })
      : el('button', {
        type: 'button',
        className: 'metin-dugme',
        textContent: 'Takip et',
        onclick: () => takibeAl({ ad, bolge: bulduk ? 'Bulduğum mantar' : yer.bolge, enlem: konumuYuvarla(yer.enlem), boylam: konumuYuvarla(yer.boylam) }),
      }),
  ];
  if (bulduk) {
    // Mantar ara haritasında o noktaya gider (türün fotoğrafıyla işaretli).
    dugmeler.unshift(el('button', { type: 'button', className: 'metin-dugme', textContent: 'Haritada göster', onclick: () => document.dispatchEvent(new CustomEvent('haritada-goster', { detail: yer.id })) }));
    // geo: bağlantısı telefonun kendi harita uygulamasını açar (yol tarifi); uygulama konumu bir siteye göndermez.
    dugmeler.push(el('a', { className: 'metin-dugme', href: `geo:${yer.enlem},${yer.boylam}?q=${yer.enlem},${yer.boylam}`, textContent: 'Yol tarifi' }));
  }
  dugmeler.push(el('button', { type: 'button', className: 'metin-dugme soluk', textContent: 'Sil', onclick: () => yeriSil(yer) }));

  const tur = bulduk && turler.find((t) => t.id === yer.turId);
  return el('div', { className: `yer-satiri${sonuc ? ` pencere-${sonuc.durum}` : ''}${bulduk ? ' buldugum-satiri' : ''}` },
    el('div', { className: 'mevsim-ust' },
      bulduk ? (tur?.fotograf ? kucukFotograf(tur, 'buldugum-resim') : el('span', { className: 'buldugum-resim buldugum-resim-bos' }, ikon('mantar'))) : '',
      el('span', { className: 'acilir-baslik' },
        el('strong', { textContent: ad }),
        alt ? el('span', { className: 'acilir-alt', textContent: alt }) : '',
      ),
      el('span', { className: 'mevsim-gun', textContent: sonuc?.bilgi.sagUst ?? '' }),
    ),
    sonuc ? cubukCiz(sonuc.bilgi.yuzde, `${yer.ad}: mantar döneminin kalan kısmı`) : '',
    bulduk && yer.not ? el('p', { className: 'gizli-yer-not', textContent: yer.not }) : '',
    bulduk ? el('p', { className: 'not gizli-yer-koordinat', textContent: `${yer.enlem}, ${yer.boylam}` }) : '',
    el('div', { className: 'yer-dugmeleri' }, ...dugmeler),
  );
}

function listeCiz() {
  const yerler = tumYerler();
  if (!yerler.length) {
    return [el('h3', { className: 'yerlerim-baslik', textContent: 'Kayıtlı yerlerim' }),
      el('p', { className: 'not', textContent: 'Henüz kayıtlı yerin yok. Aşağıdan bir bölge ara ya da bulduğun mantarı kaydet.' })];
  }
  if (durum.sonuclar) yerler.sort((a, b) => (durum.sonuclar.get(anahtar(b))?.puan ?? -1) - (durum.sonuclar.get(anahtar(a))?.puan ?? -1));
  // Durum tek satırda; yenilenirken yalnızca yazısı değişir, düğme hep yerinde (kart daralıp büyümesin).
  let aciklama = 'Her listede mantar zamanı en yakın olan en üstte.';
  if (durum.yukleniyor) aciklama = 'Yerlerinin yağmuruna bakılıyor…';
  else if (durum.hata) aciklama = 'Yağmur bilgisi alınamadı. İnternet bağlantını kontrol et.';
  const bolgeler = yerler.filter((y) => y.tur !== 'gizli');
  const bulunanlar = yerler.filter((y) => y.tur === 'gizli');
  return [
    el('p', { className: 'not yerlerim-aciklama', textContent: aciklama }),
    el('h3', { className: 'yerlerim-baslik', textContent: 'Bölgelerim' }),
    el('p', { className: 'not', textContent: 'Gideceğin genel yerler: yağmuru ve mantar zamanı için.' }),
    bolgeler.length
      ? el('div', { className: 'yerlerim-listesi' }, ...bolgeler.map(yerSatiri))
      : el('p', { className: 'not', textContent: 'Henüz bölge yok. Aşağıdan yer adıyla ara.' }),
    el('h3', { className: 'yerlerim-baslik kayit-baslik' }, ikon('mantar'), el('span', { textContent: 'Bulduğum mantarlar' })),
    el('p', { className: 'not', textContent: 'Her mantarın tam noktası; Mantar ara haritasında türün fotoğrafıyla görünür.' }),
    bulunanlar.length
      ? el('div', { className: 'yerlerim-listesi' }, ...bulunanlar.map(yerSatiri))
      : el('p', { className: 'not', textContent: 'Henüz kayıt yok. Mantar bulunca aşağıdaki "Konumumu kullan"dan ya da Mantar ara haritasından kaydet.' }),
    el('button', { type: 'button', className: 'metin-dugme yerlerim-yenile', textContent: 'Yeniden bak', disabled: durum.yukleniyor, onclick: radaraBak }),
    el('p', { className: 'not', textContent: `Bir yerde mantar bulman, oradaki her mantarın aynı tür olduğu anlamına gelmez. ${KENDI_NOTUN}` }),
  ];
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

function bulduguBurayaKaydet(olay) {
  olay.preventDefault();
  const k = durum.konum;
  bulduguKaydet({ enlem: k.enlem, boylam: k.boylam, turId: durum.yeniTurId, not: durum.yeniNot, turler });
  Object.assign(durum, { konum: null, yeniTurId: null, yeniNot: '' });
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
    el('p', { className: 'not konum-not', textContent: 'İsteğe bağlı. Telefon izin sorar. Hava servisine yalnızca yaklaşık konum (10 km) gider. Bulduğun mantarı kaydedersen tam konum yalnızca bu cihazda kalır.' }),
  ];
  if (k?.hata) icerik.push(bildirim('uyari', el('p', { textContent: KONUM_HATALARI[k.hata] })));
  if (k?.enlem == null) return icerik;

  let hava;
  if (k.kayitlar) hava = pencereCiz(mantarPenceresi(k.kayitlar));
  else if (k.havaYukleniyor) hava = el('p', { className: 'not', textContent: 'Yağmuruna bakılıyor…' });
  else hava = el('p', { className: 'not', textContent: 'Yağmur bilgisi alınamadı (internet yok olabilir). Bulduğun mantarı yine de kaydedebilirsin.' });

  const notGirdisi = el('input', {
    type: 'text',
    className: 'yagmur-girdi',
    placeholder: 'Not (isteğe bağlı): ör. çam dibinde 6 tane',
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
    el('form', { className: 'gizli-yer-formu', onsubmit: bulduguBurayaKaydet },
      el('p', { className: 'yagmur-etiket', textContent: 'Mantar mı buldun? Hangi mantar?' }),
      turSecici(turler, durum.yeniTurId, (id) => { durum.yeniTurId = id; ciz(); }),
      notGirdisi,
      el('button', { type: 'submit', className: 'birincil kayit-dugme' }, ikon('mantar'), el('span', { textContent: 'Bulduğum mantarı buraya kaydet' })),
    ),
    el('p', { className: 'not', textContent: `Kayıtlar yalnızca bu cihazda kalır, kimseyle paylaşılmaz. Telefonu değiştirirsen veya tarayıcı verilerini silersen kaybolur. ${KENDI_NOTUN}` }),
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
