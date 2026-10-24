// Ana ekrandaki yağmur bölümü:
// - Takip edilen yer: seçilen yerin yağmuru izlenir, mantar penceresi bir çubukla gösterilir.
//   Uygulama her açılışta (internet varsa) veriyi yeniler; internet yoksa son veriyi gösterir.
// - Arama: başka bir yer seçmek veya tarihi elle girmek. Cihaz konumu kullanılmaz (kural 12).
// Takip edilen yer ve kaydedilen yerler yalnızca bu cihazda tutulur.
import { acilirKart, bildirim, cubukCiz, el } from './dom.js';
import { durumuOku, durumuYaz } from './durum.js';
import {
  KAYNAK_NOTU,
  YAGMUR_NOTU,
  elleKayit,
  gunlukKayitlar,
  havaVerisiAl,
  mantarPenceresi,
  yerAra,
} from './yagmur.js';

const AZAMI_KAYITLI_YER = 5;
const YENILEME_ARALIGI = 3 * 60 * 60 * 1000;

// Ekranda kalan geçici durum; kalıcı olanlar durumuOku()'da.
const yagmur = {
  aramaAcik: false,
  yukleniyor: false,
  aramaMetni: '',
  aramaSonuclari: null,
  tekSeferlik: null, // { baslik, kayitlar, elle } veya { hata }
  takipHatasi: false,
};

const kap = el('div', { className: 'yagmur-bolumu' });

const tarihYaz = (t) => t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

function kalici(degisiklik) {
  durumuYaz({ ...durumuOku(), ...degisiklik });
}

function kayitliYerler() {
  return durumuOku().yerler ?? [];
}

function yerAdi(yer) {
  return yer.bolge ? `${yer.ad} (${yer.bolge})` : yer.ad;
}

// --- Mantar penceresi kartı (takip edilen yer, bulunduğun yer veya elle tarih için ortak) ---

const DURUM_ADLARI = {
  verimli: 'En verimli dönem',
  azaliyor: 'Azalıyor',
  bekle: 'Mantarlar oluşuyor',
  yok: 'Büyük yağmur yok',
};

// Pencerenin başlığı, sağ üst yazısı, çubuk yüzdesi ve açıklama satırları.
function pencereBilgisi(p, { elle = false } = {}) {
  const yuzde = Math.round((p.simdiki ? p.simdiki.kalanOran : 0) * 100);
  let sagUst = '';
  if (p.simdiki) sagUst = `${p.simdiki.kalanGun} gün kaldı`;
  else if (p.siradaki) sagUst = `${p.siradaki.kalanGun} gün sonra`;

  const satirlar = [];
  if (p.durum === 'verimli') {
    satirlar.push(`En verimli dönem: ${tarihYaz(p.simdiki.bas)} – ${tarihYaz(p.simdiki.verimliBit)}. Yeni yağmur yağmazsa ${tarihYaz(p.simdiki.bitis)} civarı mantarlar kurumaya başlar.`);
  } else if (p.durum === 'azaliyor') {
    satirlar.push(`Mantarlar azalıyor. Yeni yağmur yağmazsa ${tarihYaz(p.simdiki.bitis)} civarı biter.`);
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

const satirlariCiz = (satirlar) => satirlar.map((s) => el('p', { className: 'pencere-satir', textContent: s }));

// Elle tarih gibi tek seferlik bakışlar için açık (katlanmayan) pencere.
function pencereCiz(p, secenekler) {
  const b = pencereBilgisi(p, secenekler);
  return el('div', { className: `pencere pencere-${p.durum}` },
    el('div', { className: 'mevsim-ust' },
      el('strong', { textContent: b.baslik }),
      el('span', { className: 'mevsim-gun', textContent: b.sagUst }),
    ),
    cubukCiz(b.yuzde, 'Mantar döneminin kalan kısmı'),
    ...satirlariCiz(b.satirlar),
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

// Kapalıyken: yer adı, durum ve çubuk. Açılınca: ayrıntılar, düğmeler ve başka bir yere bakma.
const takipKarti = { acik: false };
function takipKartiCiz() {
  const { takipYeri, takipVerisi } = durumuOku();
  const b = takipVerisi ? pencereBilgisi(mantarPenceresi(gunlukKayitlar(takipVerisi.daily))) : null;
  let durumYazisi = 'Bilgi bekleniyor';
  if (b) durumYazisi = b.baslik;
  else if (yagmur.yukleniyor) durumYazisi = 'Güncelleniyor…';

  const icerik = [el('p', { className: 'takip-yer', textContent: `Takip edilen yer: ${yerAdi(takipYeri)}` })];
  if (takipVerisi) {
    icerik.push(...satirlariCiz(b.satirlar));
    const alindi = new Date(takipVerisi.alindi).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    icerik.push(el('p', { className: 'not', textContent: `Güncellendi: ${alindi}${navigator.onLine ? '' : ' (şu an internet yok, son bilgi gösteriliyor)'}` }));
  } else if (!yagmur.yukleniyor) {
    icerik.push(el('p', { className: 'not', textContent: 'Henüz bilgi alınamadı. İnternete bağlanınca kendiliğinden güncellenir.' }));
  }
  if (yagmur.yukleniyor) icerik.push(el('p', { className: 'not', textContent: 'Güncelleniyor…' }));
  if (yagmur.takipHatasi) icerik.push(el('p', { className: 'not', textContent: 'Son güncelleme başarısız oldu. İnternet bağlantını kontrol et.' }));
  icerik.push(el('div', { className: 'takip-dugmeleri' },
    el('button', { type: 'button', className: 'metin-dugme', textContent: 'Şimdi güncelle', disabled: yagmur.yukleniyor, onclick: () => takibiYenile({ zorla: true }) }),
    el('button', {
      type: 'button',
      className: 'metin-dugme soluk',
      textContent: 'Takibi bırak',
      onclick: () => {
        kalici({ takipYeri: null, takipVerisi: null });
        ciz();
      },
    }),
  ));
  icerik.push(el('h3', { className: 'takip-ara-baslik', textContent: 'Başka bir yere bak' }), ...aramaIcerigi());

  return acilirKart(
    {
      sinif: 'takip-karti',
      baslik: takipYeri.ad,
      altBaslik: durumYazisi,
      sag: b?.sagUst ?? '',
      yuzde: b?.yuzde ?? 0,
      cubukEtiketi: 'Mantar döneminin kalan kısmı',
      durum: takipKarti,
    },
    ...icerik,
  );
}

function takibeAl(yer) {
  const yerler = [yer, ...kayitliYerler().filter((y) => !(y.ad === yer.ad && y.bolge === yer.bolge))].slice(0, AZAMI_KAYITLI_YER);
  kalici({ yerler, takipYeri: yer, takipVerisi: null });
  Object.assign(yagmur, { aramaAcik: false, aramaSonuclari: null, tekSeferlik: null, aramaMetni: '' });
  takipKarti.acik = false;
  takibiYenile({ zorla: true });
}

// --- Arama: başka yer, elle tarih ---

async function ara(olay) {
  olay.preventDefault();
  const metin = yagmur.aramaMetni.trim();
  if (metin.length < 2) return;
  Object.assign(yagmur, { yukleniyor: true, tekSeferlik: null, aramaSonuclari: null });
  ciz();
  const sonuclar = await yerAra(metin);
  yagmur.yukleniyor = false;
  if (sonuclar.hata) yagmur.tekSeferlik = { hata: 'baglanti' };
  else yagmur.aramaSonuclari = sonuclar;
  ciz();
}

function tekSeferlikCiz(t) {
  if (t.hata) {
    return bildirim('uyari', el('p', { textContent: 'Bilgi alınamadı. İnternet bağlantını kontrol et ya da yağmur tarihini elle seç.' }));
  }
  return el('div', { className: 'tek-seferlik' },
    el('p', { className: 'yagmur-etiket', textContent: t.baslik }),
    pencereCiz(mantarPenceresi(t.kayitlar), { elle: t.elle }),
  );
}

// Yer arama, kayıtlı yerler ve elle tarih: takip varsa takip kartının içinde, yoksa kendi kartında.
function aramaIcerigi() {
  const icerik = [];
  if (yagmur.tekSeferlik) icerik.push(tekSeferlikCiz(yagmur.tekSeferlik));

  const girdi = el('input', {
    type: 'search',
    className: 'yagmur-girdi',
    placeholder: 'Yer adı: ilçe, köy, yayla…',
    value: yagmur.aramaMetni,
    oninput: (o) => { yagmur.aramaMetni = o.target.value; },
  });
  girdi.setAttribute('aria-label', 'Gideceğin yerin adı');
  girdi.setAttribute('enterkeyhint', 'search');
  icerik.push(
    el('p', { className: 'yagmur-etiket', textContent: 'Gideceğin yer' }),
    el('form', { className: 'yagmur-arama', onsubmit: ara },
      girdi,
      el('button', { type: 'submit', className: 'birincil', textContent: 'Ara', disabled: yagmur.yukleniyor }),
    ),
  );
  if (yagmur.yukleniyor) icerik.push(el('p', { className: 'not', textContent: 'Bakılıyor…' }));
  if (yagmur.aramaSonuclari) {
    icerik.push(yagmur.aramaSonuclari.length
      ? el('div', { className: 'yer-listesi' },
        ...yagmur.aramaSonuclari.map((yer) => el('button', { type: 'button', className: 'secenek', onclick: () => takibeAl(yer) },
          el('span', {}, el('strong', { textContent: yer.ad }), yer.bolge ? ` — ${yer.bolge}` : ''),
        )),
      )
      : el('p', { className: 'not', textContent: 'Bu adla bir yer bulunamadı. İlçe veya köy adını deneyebilirsin.' }));
  }

  const yerler = kayitliYerler();
  if (yerler.length) {
    icerik.push(el('div', { className: 'yer-cipleri' },
      ...yerler.map((yer) => el('button', { type: 'button', className: 'cip', textContent: yer.ad, title: yer.bolge, onclick: () => takibeAl(yer) })),
    ));
  }

  const bugun = new Date();
  const tarihGirdisi = el('input', {
    type: 'date',
    className: 'yagmur-girdi',
    max: `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}-${String(bugun.getDate()).padStart(2, '0')}`,
    onchange: (o) => {
      if (!o.target.value) return;
      const [yil, ay, gun] = o.target.value.split('-').map(Number);
      yagmur.tekSeferlik = { baslik: 'Seçtiğin tarihe göre', kayitlar: elleKayit(new Date(yil, ay - 1, gun, 12)), elle: true };
      yagmur.aramaSonuclari = null;
      ciz();
    },
  });
  tarihGirdisi.setAttribute('aria-label', 'Son büyük yağmurun tarihi');
  icerik.push(el('label', { className: 'yagmur-elle' }, el('span', { textContent: 'Ya da son büyük yağmurun tarihini seç (internetsiz):' }), tarihGirdisi));
  icerik.push(el('p', { className: 'not', textContent: `${YAGMUR_NOTU} ${KAYNAK_NOTU}` }));
  return icerik;
}

function aramaKartiCiz() {
  const kart = el('details', { className: 'kart yagmur-karti' },
    el('summary', {},
      el('span', {},
        el('strong', { textContent: 'Yağmur ipucu' }),
        el('span', { className: 'yagmur-ozet', textContent: 'Gideceğin yeri seç; yağmuru takip edelim' }),
      ),
    ),
    el('div', { className: 'yagmur-govde' }, ...aramaIcerigi()),
  );
  kart.open = yagmur.aramaAcik;
  kart.addEventListener('toggle', () => { yagmur.aramaAcik = kart.open; });
  return kart;
}

function ciz() {
  kap.replaceChildren(durumuOku().takipYeri ? takipKartiCiz() : aramaKartiCiz());
}

export function yagmurKarti() {
  ciz();
  return kap;
}

takibiYenile();
