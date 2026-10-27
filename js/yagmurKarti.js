// "Mantar zamanı" kartındaki yağmur parçaları (kartı js/anaKart.js kurar):
// - takipSatiri: takip edilen yerin çubuğu ve Şimdi güncelle / Takibi bırak düğmeleri.
//   Uygulama her açılışta (internet varsa) veriyi yeniler; internet yoksa son veriyi gösterir.
// - takipBilgisi: takip edilen yerin ayrıntıları; kartın (i) düğmesiyle açılır.
// - aramaBolumu: yer adıyla arama ve elle yağmur tarihi (Yerlerim içinde).
// Takip edilen yer ve kaydedilen yerler yalnızca bu cihazda tutulur (kural 12).
import { bildirim, cubukCiz, el } from './dom.js';
import { durumuOku, durumuYaz } from './durum.js';
import { elleKayit, gunlukKayitlar, havaVerisiAl, mantarPenceresi, yerAra } from './yagmur.js';

const AZAMI_KAYITLI_YER = 10;
// Uygulama her açılışta (ve öne gelince) 20 dakikadan eski bilgiyi kendiliğinden yeniler (Metin'in isteği, 2026-10-27:
// "yeni yağmur yağdı mı, günler arttı mı; güncellemeyi unutursak da görebilelim"). İnternet gelince de yenilenir.
const YENILEME_ARALIGI = 20 * 60 * 1000;

// Ekranda kalan geçici durum; kalıcı olanlar durumuOku()'da.
const yagmur = {
  yukleniyor: false,
  takipHatasi: false,
  aramaYukleniyor: false,
  aramaMetni: '',
  aramaSonuclari: null, // [yer] veya { hata }
  elleTarih: '',
  elleKayitlar: null,
};

const satirKap = el('div', { className: 'takip-bolumu' });
const bilgiKap = el('div', { className: 'bilgi-bolum' });
const aramaKap = el('div', { className: 'arama-bolumu' });

const tarihYaz = (t) => t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

function kalici(degisiklik) {
  durumuYaz({ ...durumuOku(), ...degisiklik });
}

export function yerAdi(yer) {
  return yer.bolge ? `${yer.ad} (${yer.bolge})` : yer.ad;
}

// --- Mantar penceresi (takip edilen yer, kayıtlı yerler, bulunduğun yer ve elle tarih için ortak) ---

const DURUM_ADLARI = {
  verimli: 'En verimli dönem',
  azaliyor: 'Azalıyor',
  bekle: 'Mantarlar oluşuyor',
  yok: 'Büyük yağmur yok',
};

// Pencerenin başlığı, sağ üst yazısı, çubuk yüzdesi ve açıklama satırları.
// Çubuk, mevsim çubuğu gibi tek renktir ve yalnızca başlıktaki dönemi gösterir:
// tamamı o dönemin toplam günü, koyu kısım sağ üstte yazan kalan gün kadardır.
export function pencereBilgisi(p, { elle = false } = {}) {
  const s = p.simdiki;
  let yuzde = 0;
  let sagUst = '';
  if (p.durum === 'verimli') {
    yuzde = Math.round((s.verimliKalanGun / s.verimliToplamGun) * 100);
    sagUst = `${s.verimliKalanGun} gün kaldı`;
  } else if (p.durum === 'azaliyor') {
    yuzde = Math.round((s.kalanGun / s.azalmaToplamGun) * 100);
    sagUst = `${s.kalanGun} gün kaldı`;
  } else if (p.siradaki) {
    sagUst = `${p.siradaki.kalanGun} gün sonra`;
  }

  const satirlar = [];
  if (p.durum === 'verimli') {
    satirlar.push(`En verimli dönem: ${tarihYaz(s.bas)} – ${tarihYaz(s.verimliBit)} (${s.verimliToplamGun} gün). Bitmesine ${s.verimliKalanGun} gün var.`);
    satirlar.push(`Sonra yeni yağmur yağmazsa mantarlar yaklaşık ${s.azalmaToplamGun} gün azalarak sürer ve ${tarihYaz(s.bitis)} civarı kurur.`);
  } else if (p.durum === 'azaliyor') {
    satirlar.push(`Mantarlar azalıyor. Yeni yağmur yağmazsa ${tarihYaz(s.bitis)} civarı biter.`);
  } else if (p.durum === 'bekle') {
    satirlar.push(`Yağmurdan sonra mantarlar oluşuyor. En verimli dönem: ${tarihYaz(p.siradaki.bas)} – ${tarihYaz(p.siradaki.verimliBit)}.`);
  } else {
    satirlar.push('Son 3 haftada büyük bir yağmur (günde 10 mm üzeri) yağmadı. Toprak kuru olabilir, mantar az çıkar.');
  }
  if (p.simdiki && p.siradaki) {
    satirlar.push(`Son yağmurla yeni bir dönem başlıyor: ${tarihYaz(p.siradaki.bas)} – ${tarihYaz(p.siradaki.verimliBit)}.`);
  }
  if (p.sonYagmur) {
    const miktar = p.sonYagmur.miktar != null ? ` (${p.sonYagmur.miktar} mm)` : '';
    satirlar.push(elle
      ? `Seçtiğin yağmur günü: ${tarihYaz(p.sonYagmur.tarih)}.`
      : `Son büyük yağmur: ${tarihYaz(p.sonYagmur.tarih)}${miktar}. Son 3 haftada toplam ${p.toplamYagis} mm.`);
  }
  if (p.tahmin) {
    satirlar.push(`Hava tahmini: ${tarihYaz(p.tahmin.tarih)} günü yaklaşık ${p.tahmin.miktar} mm yağmur bekleniyor. Yağarsa yeni mantarlar ${tarihYaz(p.tahmin.mantarBas)} civarı çıkabilir.`);
  }
  if (p.sicaklikNotu) satirlar.push(p.sicaklikNotu);

  return { baslik: DURUM_ADLARI[p.durum], sagUst, yuzde, satirlar };
}

// Tek seferlik bakışlar (bulunduğun yer, elle tarih) için açık pencere: başlık, çubuk ve ayrıntılar.
export function pencereCiz(p, secenekler) {
  const b = pencereBilgisi(p, secenekler);
  return el('div', { className: `pencere pencere-${p.durum}` },
    el('div', { className: 'mevsim-ust' },
      el('strong', { textContent: b.baslik }),
      el('span', { className: 'mevsim-gun', textContent: b.sagUst }),
    ),
    cubukCiz(b.yuzde, 'Mantar döneminin kalan kısmı'),
    ...b.satirlar.map((s) => el('p', { className: 'pencere-satir', textContent: s })),
  );
}

// --- Takip edilen yer ---

export async function takibiYenile({ zorla = false } = {}) {
  const { takipYeri, takipVerisi } = durumuOku();
  if (!takipYeri) return;
  const eski = !takipVerisi || Date.now() - new Date(takipVerisi.alindi).getTime() > YENILEME_ARALIGI;
  if (!zorla && !eski) return;
  if (!navigator.onLine) return;
  yagmur.yukleniyor = true;
  ciz();
  const sonuc = await havaVerisiAl(takipYeri.enlem, takipYeri.boylam);
  yagmur.yukleniyor = false;
  if (sonuc.hata) yagmur.takipHatasi = true;
  else {
    yagmur.takipHatasi = false;
    kalici({ takipVerisi: { daily: sonuc.daily, alindi: new Date().toISOString() } });
  }
  ciz();
}

function takipPenceresi() {
  const { takipVerisi } = durumuOku();
  return takipVerisi ? pencereBilgisi(mantarPenceresi(gunlukKayitlar(takipVerisi.daily))) : null;
}

function takipSatiriCiz() {
  const { takipYeri } = durumuOku();
  if (!takipYeri) {
    return [
      el('p', { className: 'not takip-yok', textContent: 'Yağmuru takip ettiğin bir yer yok.' }),
      el('button', {
        type: 'button',
        className: 'metin-dugme takip-sec',
        textContent: 'Yer seç',
        onclick: () => document.dispatchEvent(new Event('yerlerimi-ac')),
      }),
    ];
  }
  const b = takipPenceresi();
  let durumYazisi = 'Bilgi bekleniyor';
  if (b) durumYazisi = b.baslik;
  else if (yagmur.yukleniyor) durumYazisi = 'Güncelleniyor…';

  const parcalar = [
    el('div', { className: 'mevsim-ust' },
      el('span', { className: 'acilir-baslik' },
        el('strong', { textContent: takipYeri.ad }),
        el('span', { className: 'acilir-alt', textContent: durumYazisi }),
      ),
      el('span', { className: 'mevsim-gun', textContent: b?.sagUst ?? '' }),
    ),
    cubukCiz(b?.yuzde ?? 0, `${takipYeri.ad}: mantar döneminin kalan kısmı`),
  ];
  const { takipVerisi } = durumuOku();
  if (takipVerisi?.alindi && !yagmur.yukleniyor) parcalar.push(el('p', { className: 'not takip-durum', textContent: `Son güncelleme: ${zamanYazisi(takipVerisi.alindi)}` }));
  if (yagmur.takipHatasi) parcalar.push(el('p', { className: 'not takip-durum', textContent: 'Güncellenemedi. İnternet bağlantını kontrol et.' }));
  else if (!b && !yagmur.yukleniyor) parcalar.push(el('p', { className: 'not takip-durum', textContent: 'İnternete bağlanınca kendiliğinden güncellenir.' }));
  parcalar.push(el('div', { className: 'takip-dugmeleri' },
    el('button', {
      type: 'button',
      className: 'metin-dugme',
      textContent: yagmur.yukleniyor ? 'Güncelleniyor…' : 'Şimdi güncelle',
      disabled: yagmur.yukleniyor,
      onclick: () => takibiYenile({ zorla: true }),
    }),
    el('button', {
      type: 'button',
      className: 'metin-dugme soluk',
      textContent: 'Takibi bırak',
      onclick: () => {
        kalici({ takipYeri: null, takipVerisi: null });
        yagmur.takipHatasi = false;
        ciz();
        document.dispatchEvent(new Event('yerler-degisti'));
      },
    }),
  ));
  return parcalar;
}

// (i) ile açılan ayrıntılar: dönem tarihleri, son yağmur, hava tahmini.
function takipBilgisiCiz() {
  const { takipYeri, takipVerisi } = durumuOku();
  if (!takipYeri || !takipVerisi) return [];
  const alindi = new Date(takipVerisi.alindi).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return [
    el('p', {}, el('strong', { textContent: `${yerAdi(takipYeri)}: ` }), takipPenceresi().satirlar.join(' ')),
    el('p', { className: 'not', textContent: `Güncellendi: ${alindi}${navigator.onLine ? '' : ' (şu an internet yok, son bilgi gösteriliyor)'}` }),
  ];
}

// Bir yeri takibe alır ve kayıtlı yerlere ekler (en yeni başta).
export function takibeAl(yer) {
  const yerler = [yer, ...(durumuOku().yerler ?? []).filter((y) => !(y.ad === yer.ad && y.bolge === yer.bolge))].slice(0, AZAMI_KAYITLI_YER);
  kalici({ yerler, takipYeri: yer, takipVerisi: null });
  Object.assign(yagmur, { aramaSonuclari: null, aramaMetni: '', elleTarih: '', elleKayitlar: null, takipHatasi: false });
  // Yerlerim listesi kayıtlı yerleri gösterir; yeni yer eklenince kendini yeniden çizsin.
  document.dispatchEvent(new Event('yerler-degisti'));
  satirKap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  takibiYenile({ zorla: true });
}

// --- Yer arama ve elle tarih ---

async function ara(olay) {
  olay.preventDefault();
  const metin = yagmur.aramaMetni.trim();
  if (metin.length < 2) return;
  Object.assign(yagmur, { aramaYukleniyor: true, aramaSonuclari: null });
  ciz();
  yagmur.aramaSonuclari = await yerAra(metin);
  yagmur.aramaYukleniyor = false;
  ciz();
}

function aramaCiz() {
  const girdi = el('input', {
    type: 'search',
    className: 'yagmur-girdi',
    placeholder: 'Yer adı: ilçe, köy, yayla…',
    value: yagmur.aramaMetni,
    oninput: (o) => { yagmur.aramaMetni = o.target.value; },
  });
  girdi.setAttribute('aria-label', 'Gideceğin yerin adı');
  girdi.setAttribute('enterkeyhint', 'search');
  const icerik = [
    el('h3', { className: 'yerlerim-baslik', textContent: 'Yer ara' }),
    el('form', { className: 'yagmur-arama', onsubmit: ara },
      girdi,
      el('button', { type: 'submit', className: 'birincil', textContent: 'Ara', disabled: yagmur.aramaYukleniyor }),
    ),
  ];
  if (yagmur.aramaYukleniyor) icerik.push(el('p', { className: 'not', textContent: 'Aranıyor…' }));
  const sonuc = yagmur.aramaSonuclari;
  if (sonuc?.hata) {
    icerik.push(bildirim('uyari', el('p', { textContent: 'Arama yapılamadı. İnternet bağlantını kontrol et ya da aşağıdan yağmur tarihini elle seç.' })));
  } else if (sonuc) {
    icerik.push(sonuc.length
      ? el('div', { className: 'yer-listesi' },
        ...sonuc.map((yer) => el('button', { type: 'button', className: 'secenek', onclick: () => takibeAl(yer) },
          el('span', {}, el('strong', { textContent: yer.ad }), yer.bolge ? ` — ${yer.bolge}` : ''),
        )),
      )
      : el('p', { className: 'not', textContent: 'Bu adla bir yer bulunamadı. İlçe veya köy adını deneyebilirsin.' }));
  }

  const bugun = new Date();
  const tarihGirdisi = el('input', {
    type: 'date',
    className: 'yagmur-girdi',
    max: `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}-${String(bugun.getDate()).padStart(2, '0')}`,
    value: yagmur.elleTarih,
    onchange: (o) => {
      yagmur.elleTarih = o.target.value;
      if (!o.target.value) {
        yagmur.elleKayitlar = null;
      } else {
        const [yil, ay, gun] = o.target.value.split('-').map(Number);
        yagmur.elleKayitlar = elleKayit(new Date(yil, ay - 1, gun, 12));
      }
      ciz();
    },
  });
  tarihGirdisi.setAttribute('aria-label', 'Son büyük yağmurun tarihi');
  icerik.push(
    el('h3', { className: 'yerlerim-baslik', textContent: 'İnternet yoksa' }),
    el('label', { className: 'yagmur-elle' }, el('span', { textContent: 'Son büyük yağmurun tarihini seç:' }), tarihGirdisi),
  );
  if (yagmur.elleKayitlar) {
    icerik.push(el('div', { className: 'tek-seferlik' }, pencereCiz(mantarPenceresi(yagmur.elleKayitlar), { elle: true })));
  }
  return icerik;
}

function ciz() {
  satirKap.replaceChildren(...takipSatiriCiz());
  bilgiKap.replaceChildren(...takipBilgisiCiz());
  aramaKap.replaceChildren(...aramaCiz());
}

export function takipSatiri() {
  ciz();
  return satirKap;
}

export function takipBilgisi() {
  return bilgiKap;
}

export function aramaBolumu() {
  return aramaKap;
}

// "bugün 14:05", "dün 18:20" ya da "25 Ekim 09:10".
export function zamanYazisi(iso) {
  const t = new Date(iso);
  const saat = t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const gun = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fark = Math.round((gun(new Date()) - gun(t)) / 86400000);
  if (fark === 0) return `bugün ${saat}`;
  if (fark === 1) return `dün ${saat}`;
  return `${t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${saat}`;
}

takibiYenile();
window.addEventListener('online', () => takibiYenile());
