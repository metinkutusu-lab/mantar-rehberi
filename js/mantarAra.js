// Mantar ara ekranı (Metin'in isteği, 2026-10-26): haritada, çevrendeki mantar çıkmaya uygun yerler.
// - Harita, yükseklik ve orman bilgisi js/harita.js'ten; hesap js/uygunluk.js'te; hava js/yagmur.js'ten.
// - Canlı konum yalnızca bu ekranda ve "Konumumu göster"e dokununca açılır; ekrandan çıkınca kapanır.
//   Konum hiçbir yere gönderilmez (kural 12); hava servisine yalnızca yuvarlanmış koordinat gider.
// - Bu bir tahmindir: mantarın yerini göstermez. Bulunan her mantar Tanımla ile incelenmelidir.
import { bildirim, cubukCiz, el, ikon, kucukFotograf } from './dom.js';
import { durumuOku, durumuYaz } from './durum.js';
import {
  HARITA_ATFI,
  HARITA_STILI,
  YUKSEKLIK_PARCALARI,
  YUKSEKLIK_YAKINLIGI,
  bolgeyiIndir,
  konumaCevir,
  pikseleCevir,
  yukseklikIzgarasi,
} from './harita.js';
import { CIG_UYARISI, turleriYukle } from './turler.js';
import {
  SINIF_ADLARI,
  ayAraligi,
  aranmaSirasinaGore,
  bolgedeAranabilecekler,
  egimVeBaki,
  goreceYon,
  hucrePuani,
  mesafeVeYon,
  mesafeYaz,
  mevsimdeMi,
  puanSinifi,
  yonAdi,
  yonTercihi,
  zeminAgirliklari,
  zemindeAranabilecekler,
} from './uygunluk.js';
import { gunlukKayitlar, havaVerisiAl, konumuIzle, mantarPenceresi } from './yagmur.js';
import { pencereBilgisi } from './yagmurKarti.js';
import { HAREKET_ESIGI, pusulayiAc } from './pusula.js';
import { sesHazirMi, sesiKes, sesliMesafe, soyle } from './ses.js';

const YARICAP = 2500; // metre: çevrendeki bakılan alan
const AZAMI_BOLGE = 10;
const YENIDEN_HESAP_MESAFESI = 1500; // metre
// Sınıf renkleri (açık turuncudan koyu kahveye) ve saydamlık.
const RENKLER = [null, [255, 196, 92, 120], [240, 128, 32, 165], [150, 52, 12, 200]];

const ara = {
  kuruldu: false,
  harita: null,
  turler: [],
  turId: '',
  konum: null, // { enlem, boylam, dogruluk } | { hata }
  izlemeyiDurdur: null,
  pusulayiDurdur: null,
  bakis: null, // telefonun baktığı yön (0 = kuzey)
  bakisKaynagi: null, // 'pusula' | 'hareket'
  oncekiKonum: null,
  ilkKonum: true,
  hesaplaniyor: false,
  sonuc: null, // { merkez, tercih, pencere, sayilar, enYakin }
  hata: null,
  hedef: null, // { ad, enlem, boylam }
  indirme: null, // { tamam, toplam } | { bitti, toplam } | { hata }
  isaretAdi: '',
  bolgeAdi: '',
};

const kok = el('div', { className: 'ara-ekrani' });
const haritaKap = el('div', { className: 'ara-harita' });
const turKap = el('div', { className: 'ara-tur' });
const durumKap = el('div', { className: 'ara-durum' });
const ipucuKap = el('div', { className: 'ara-canli-ipucu' });
const hedefKap = el('div', { className: 'ara-hedef' });
const isaretKap = el('div', { className: 'ara-isaret' });
const indirKap = el('div', { className: 'ara-indir' });
const konumDugmesi = el('button', { type: 'button', className: 'konum-dugme', onclick: konumuAc });
const sesDugmesi = el('button', { type: 'button', className: 'ikincil ses-dugme', onclick: sesiDegistir });
const bakDugmesi = el('button', { type: 'button', className: 'ikincil ara-bak', textContent: 'Haritanın ortasına bak', onclick: () => bolgeyeBak(haritaMerkezi()) });
const isaretler = new Map(); // gizli yer id → harita işareti
let konumIsareti = null;

const bilgiPaneli = el('div', { className: 'bilgi-paneli', hidden: true },
  el('p', { textContent: 'Harita, çevrendeki yaklaşık 2,5 km içinde mantar çıkmaya uygun olabilecek yerleri koyu turuncudan açığa boyar. Bu bir tahmindir; mantarın yerini göstermez.' }),
  el('p', { textContent: 'Hesaba girenler: ormanlık, çayır, meyve bahçesi ya da çalılık olması; yamacın baktığı yön (serin havada ve ilkbaharda güneye bakan yamaçlar önce ısınır, sıcak ve kuru havada kuzeye bakanlar nemini korur); yamacın dikliği; aradığın mantarın sevdiği zemin; bölgenin son yağmuru ve sıcaklığı.' }),
  el('p', { textContent: 'Haritada ağaç cinsi (çam, meşe) yazmaz; bu yüzden ağacı yerinde kendin kontrol et. Tür bilgileri taslaktır, uzman onayı bekliyor.' }),
  el('p', { className: 'not', textContent: `Harita: OpenFreeMap, OpenMapTiles, © OpenStreetMap katkıcıları. ${HARITA_ATFI}. Hava: Open-Meteo.com. Konumun hiçbir yere gönderilmez; harita sunucusu yalnızca bakılan bölgenin harita parçalarını görür.` }),
);
const bilgiDugmesi = el('button', {
  type: 'button',
  className: 'bilgi-dugme',
  textContent: 'i',
  onclick: () => {
    bilgiPaneli.hidden = !bilgiPaneli.hidden;
    bilgiDugmesi.setAttribute('aria-expanded', String(!bilgiPaneli.hidden));
  },
});
bilgiDugmesi.setAttribute('aria-label', 'Nasıl hesaplanıyor?');
bilgiDugmesi.setAttribute('aria-expanded', 'false');

const lejant = el('div', { className: 'ara-lejant' },
  ...[3, 2, 1].map((s) => el('span', {}, el('i', { style: `background: rgba(${RENKLER[s].slice(0, 3).join(',')}, ${RENKLER[s][3] / 255})` }), SINIF_ADLARI[s])),
);

kok.append(
  el('div', { className: 'ana-ust' },
    el('a', { className: 'geri-baglanti', href: '#tanimla', textContent: '‹ Ana sayfa' }),
    bilgiDugmesi,
  ),
  el('h1', { textContent: 'Mantar ara' }),
  el('p', { className: 'alt-baslik', textContent: 'Haritada çevrendeki mantar çıkmaya uygun yerler. Bu bir tahmindir; mantarın yerini göstermez.' }),
  bilgiPaneli,
  turKap,
  el('div', { className: 'ara-harita-kap' }, haritaKap, el('div', { className: 'ara-nisan' })),
  lejant,
  hedefKap,
  ipucuKap,
  el('div', { className: 'ara-dugmeler' }, konumDugmesi, sesDugmesi, bakDugmesi),
  durumKap,
  isaretKap,
  indirKap,
  bildirim('uyari', el('p', { textContent: 'Bulduğun her mantarı Tanımla ile incele. Zehirli mantarlar da aynı yerlerde çıkar. Dik yamaçlarda dikkatli ol; birine nereye gittiğini söyle.' })),
);

// --- Yardımcılar ---

function kalici(degisiklik) {
  durumuYaz({ ...durumuOku(), ...degisiklik });
}

const gizliYerler = () => durumuOku().gizliYerler ?? [];

function haritaMerkezi() {
  const m = ara.harita.getCenter();
  return { enlem: m.lat, boylam: m.lng };
}

function seciliTur() {
  return ara.turler.find((t) => t.id === ara.turId) ?? null;
}

// İlk açılışta haritanın başlayacağı yer: internet yoksa son indirilen bölge (harita oradan gelir);
// yoksa takip edilen yer, son gizli yer ya da Türkiye.
function baslangicYeri() {
  const d = durumuOku();
  const indirilen = d.haritaBolgeleri?.[0];
  if (!navigator.onLine && indirilen) return { merkez: [indirilen.boylam, indirilen.enlem], zoom: 13 };
  const yer = d.takipYeri ?? gizliYerler()[0];
  return yer ? { merkez: [yer.boylam, yer.enlem], zoom: 12 } : { merkez: [32.8, 39.2], zoom: 5 };
}

// Hesap yapılan yere yakın (10 km) bilinen bir yerin adı: takip edilen yer, kayıtlı yerler, indirilen bölgeler.
function yakinYerAdi(merkez) {
  const d = durumuOku();
  const adaylar = [d.takipYeri, ...(d.yerler ?? []), ...(d.haritaBolgeleri ?? [])].filter((y) => y?.ad && y.enlem != null);
  const en = adaylar
    .map((y) => ({ ad: y.ad, mesafe: mesafeVeYon(y, merkez).mesafe }))
    .filter((y) => y.mesafe < 10000)
    .sort((a, b) => a.mesafe - b.mesafe)[0];
  return en?.ad ?? null;
}

// MapLibre yalnızca bu ekran açılınca yüklenir (uygulamanın açılışı yavaşlamasın).
function kutuphaneyiYukle() {
  if (window.maplibregl) return Promise.resolve();
  return new Promise((coz, reddet) => {
    document.head.append(el('link', { rel: 'stylesheet', href: 'vendor/maplibre-gl.css' }));
    document.head.append(el('script', { src: 'vendor/maplibre-gl.js', onload: coz, onerror: reddet }));
  });
}

// Harita stili yüklenince çözülür.
function haritaHazir() {
  return ara.harita.isStyleLoaded() ? Promise.resolve() : new Promise((coz) => ara.harita.once('load', coz));
}

// Harita parçaları yüklenip çizim bitince (en fazla 10 saniye beklenir).
function haritaDurgun() {
  return new Promise((coz) => {
    const sure = setTimeout(coz, 10000);
    ara.harita.once('idle', () => { clearTimeout(sure); coz(); });
  });
}

function ilkSembolKatmani() {
  return ara.harita.getStyle().layers.find((k) => k.type === 'symbol')?.id;
}

// --- Tür seçimi ---

function turSec(id) {
  ara.turId = id;
  turCiz();
  canliIpucuCiz();
  if (ara.sonuc) bolgeyeBak(ara.sonuc.merkez, { canli: ara.sonuc.canli });
}

// Fotoğraflı tür seçici: toplayıcıların en çok aradığı türler önce; mevsimi olmayanlar soluk.
function turCiz() {
  const ay = new Date().getMonth() + 1;
  const secenek = (id, ad, resim, mevsimde = true) => {
    const d = el('button', {
      type: 'button',
      className: `tur-secenek${ara.turId === id ? ' secili' : ''}${mevsimde ? '' : ' mevsim-disi'}`,
      onclick: () => turSec(id),
    },
    resim,
    el('span', { className: 'tur-secenek-ad', textContent: ad }),
    mevsimde ? '' : el('span', { className: 'tur-secenek-not', textContent: 'mevsimi değil' }),
    );
    d.setAttribute('aria-pressed', String(ara.turId === id));
    return d;
  };
  const hepsiResmi = el('span', { className: 'tur-secenek-hepsi' }, ikon('konum'));
  const tur = seciliTur();
  const parcalar = [
    el('p', { className: 'ara-tur-etiket', textContent: 'Ne arıyorsun?' }),
    el('div', { className: 'tur-secici' },
      secenek('', 'Hepsi', hepsiResmi),
      ...ara.turler.map((t) => secenek(t.id, t.ad.replace(/\s*\(.*\)$/, ''), kucukFotograf(t, 'tur-secenek-resim'), mevsimdeMi(t, ay))),
    ),
    el('p', { className: 'not tur-secici-not', textContent: 'Sıra: dünya mutfağında en gözde olanlar önce (taslak). Sağa kaydır.' }),
  ];
  if (tur) {
    const ayYazisi = ayAraligi(tur.aylar);
    if (ayYazisi) {
      parcalar.push(el('p', { className: mevsimdeMi(tur, ay) ? 'not' : 'not tur-mevsim-uyari' },
        el('strong', { textContent: 'Mevsimi (taslak): ' }), ayYazisi, mevsimdeMi(tur, ay) ? '.' : '. Şu an mevsimi değil; bulma ihtimali düşük.'));
    }
    if (tur.aramaIpucu) parcalar.push(el('p', { className: 'tur-ipucu' }, el('strong', { textContent: 'Nereye bakmalı (taslak): ' }), tur.aramaIpucu));
    else if (tur.nerede) parcalar.push(el('p', { className: 'not', textContent: `Nerede çıkar (taslak): ${tur.nerede}` }));
    if (tur.cigkenZehirli) parcalar.push(bildirim('tehlike', el('p', {}, el('strong', { textContent: CIG_UYARISI }))));
    if (tur.zehirliBenzerler?.length) {
      parcalar.push(bildirim('tehlike', el('p', {},
        el('strong', { textContent: 'Karıştırılan zehirli türler: ' }),
        `${tur.zehirliBenzerler.map((b) => b.ad).join(', ')}. Aynı yerlerde çıkabilirler.`)));
    }
  }
  turKap.replaceChildren(...parcalar);
}

// --- Canlı konum ---

const KONUM_HATALARI = {
  izin: 'Konum izni verilmedi. Haritayı parmağınla gideceğin yere kaydırıp "Haritanın ortasına bak" diyebilirsin.',
  yok: 'Konum bulunamadı. Açık bir alanda bekle; telefonun konum (GPS) ayarı açık olmalı.',
};

function konumuAc() {
  if (ara.izlemeyiDurdur && ara.konum?.enlem != null) {
    ara.harita.easeTo({ center: [ara.konum.boylam, ara.konum.enlem], zoom: Math.max(ara.harita.getZoom(), 13) });
    return;
  }
  ara.ilkKonum = true;
  // Pusula aynı dokunuşla açılır (iPhone izni ancak bir dokunuşun içinde sorulabilir).
  if (!ara.pusulayiDurdur) {
    pusulayiAc(bakisGeldi).then((s) => { if (typeof s === 'function') ara.pusulayiDurdur = s; });
  }
  ara.izlemeyiDurdur = konumuIzle(konumGeldi);
  konumDugmesiCiz('Konum alınıyor…');
}

// --- Yön: telefonun pusulası; yoksa yürüdüğün yön ---

function bakisGeldi(derece) {
  ara.bakis = derece;
  ara.bakisKaynagi = 'pusula';
  oklariGuncelle();
}

// Pusula yokken: GPS'in gidiş yönü ya da son iki konum arasındaki yön.
function hareketYonu(k) {
  if (ara.bakisKaynagi === 'pusula') return;
  if (Number.isFinite(k.yon) && (k.hiz ?? 1) > 0.4) {
    ara.bakis = k.yon;
    ara.bakisKaynagi = 'hareket';
  } else if (ara.oncekiKonum) {
    const { mesafe, yon } = mesafeVeYon(ara.oncekiKonum, k);
    if (mesafe < HAREKET_ESIGI) return;
    ara.bakis = yon;
    ara.bakisKaynagi = 'hareket';
  }
  ara.oncekiKonum = { enlem: k.enlem, boylam: k.boylam };
}

// Yön göstergesi: ok ve "sağ önünde" yazısı. aci: hedefin pusula açısı. Pusula döndükçe oklariGuncelle günceller.
function yonGostergesi(aci, sinif = '') {
  const g = el('span', { className: `yon-gosterge ${sinif}` },
    el('span', { className: 'yon-ok', textContent: '↑' }),
    el('span', { className: 'yon-yazi' }));
  g.dataset.aci = String(aci);
  yonuYaz(g);
  return g;
}

function yonuYaz(g) {
  const aci = Number(g.dataset.aci);
  g.querySelector('.yon-ok').style.transform = `rotate(${aci - (ara.bakis ?? 0)}deg)`;
  g.querySelector('.yon-yazi').textContent = ara.bakis != null ? goreceYon(aci, ara.bakis) : `${yonAdi(aci)} yönünde`;
}

// Pusula saniyede onlarca kez haber verir; oklar en çok saniyede ~8 kez güncellenir.
let okIstegi = 0;
function oklariGuncelle() {
  if (okIstegi) return;
  okIstegi = setTimeout(() => {
    okIstegi = 0;
    for (const g of kok.querySelectorAll('.yon-gosterge')) yonuYaz(g);
    for (const n of kok.querySelectorAll('.yon-notu')) n.textContent = yonNotu();
    const burun = konumIsareti?.getElement().querySelector('.yon-burnu');
    if (burun) {
      burun.hidden = ara.bakis == null;
      burun.style.transform = `rotate(${(ara.bakis ?? 0) - ara.harita.getBearing()}deg)`;
    }
  }, 120);
}

// --- Sesli yönlendirme (açık/kapalı cihazda saklanır) ---

const sesAcik = () => durumuOku().sesliYonlendirme === true;
let sesUyarisi = '';

function sesDugmesiCiz() {
  sesDugmesi.replaceChildren(ikon('ses'), el('span', { textContent: `Sesli yönlendirme: ${sesAcik() ? 'Açık' : 'Kapalı'}` }));
  sesDugmesi.setAttribute('aria-pressed', String(sesAcik()));
  sesDugmesi.classList.toggle('acik', sesAcik());
  sesDugmesi.title = sesUyarisi;
}

function sesiDegistir() {
  if (sesAcik()) {
    kalici({ sesliYonlendirme: false });
    sesiKes();
  } else if (!sesHazirMi()) {
    sesUyarisi = 'Bu telefonda Türkçe ses bulunamadı.';
    alert('Bu telefonda Türkçe konuşma sesi bulunamadı. Telefonun ayarlarında "Metin okuma" (yazıyı sese çevirme) dilini Türkçe yapıp tekrar dene.');
  } else {
    kalici({ sesliYonlendirme: true });
    soyle('Sesli yönlendirme açık. Bulduğun her mantarı Tanımla ile incele.', { oncelikli: true });
    ara.sesZemin = null; // bulunduğun yer bir sonraki konumda yeniden okunsun
  }
  sesDugmesiCiz();
}

// Hedefin yeri, konuşma için: "sağ önünde" (pusula ya da yürüme yönü varsa) ya da "kuzeydoğu yönünde".
function yonYazisi(aci) {
  return ara.bakis != null ? goreceYon(aci, ara.bakis) : `${yonAdi(aci)} yönünde`;
}

// Hedefe giderken: seçince, her 50 metrede (uzakta 100–200 m'de) ve varınca okunur.
function hedefiSoyle(mesafe, yon) {
  if (!sesAcik()) return;
  const s = (ara.sesHedef ??= { adim: null, vardi: false });
  if (mesafe < 15) {
    if (!s.vardi) soyle('Vardın. Çevrene iyice bak.', { oncelikli: true });
    s.vardi = true;
    return;
  }
  const boy = mesafe > 1000 ? 200 : mesafe > 300 ? 100 : 50;
  const adim = Math.ceil(mesafe / boy);
  if (adim !== s.adim && soyle(`Hedefe ${sesliMesafe(mesafe)}, ${yonYazisi(yon)}.`)) s.adim = adim;
}

// Bulunduğun yerin zemini ve uygunluğu değişince okunur; seçilen türün ipucu (ilk cümlesi) ya da burada aranabilecekler.
function yeriSoyle(h, metin) {
  if (!sesAcik()) return;
  const anahtar = `${h.zemin}|${h.sinif}|${ara.turId}`;
  if (anahtar === ara.sesZemin) return;
  if (soyle(metin)) ara.sesZemin = anahtar;
}

function yonNotu() {
  if (ara.bakisKaynagi === 'pusula') return 'Ok, telefonun baktığı yöne göre döner. Telefonu yere paralel tut; ok şaşarsa telefonu havada 8 çizerek salla.';
  if (ara.bakisKaynagi === 'hareket') return 'Telefonda pusula yok: ok, yürüdüğün yöne göre. Birkaç adım yürüyünce düzelir.';
  return 'Telefonda pusula bulunamadı: ok haritadaki gibi kuzeyi gösterir. Yürümeye başlayınca yönün bulunur.';
}

function konumGeldi(k) {
  ara.konum = k;
  if (k.hata) {
    ara.izlemeyiDurdur?.();
    ara.izlemeyiDurdur = null;
    konumDugmesiCiz();
    durumCiz();
    return;
  }
  hareketYonu(k);
  const yer = [k.boylam, k.enlem];
  if (!konumIsareti) {
    const nokta = el('div', { className: 'konum-isareti' }, el('div', { className: 'yon-burnu', hidden: true }), el('div', { className: 'konum-noktasi' }));
    konumIsareti = new window.maplibregl.Marker({ element: nokta }).setLngLat(yer).addTo(ara.harita);
    ara.harita.on('rotate', oklariGuncelle);
  } else konumIsareti.setLngLat(yer);
  if (ara.ilkKonum) {
    ara.ilkKonum = false;
    bolgeyeBak({ enlem: k.enlem, boylam: k.boylam }, { canli: true });
  } else if (ara.sonuc?.canli && !ara.hesaplaniyor && mesafeVeYon(ara.sonuc.merkez, k).mesafe > YENIDEN_HESAP_MESAFESI) {
    // Yürüdükçe: bulunduğun yerden 1,5 km uzaklaşınca harita ve mantar zamanı yeniden hesaplanır.
    bolgeyeBak({ enlem: k.enlem, boylam: k.boylam }, { canli: true });
  }
  konumDugmesiCiz();
  hedefCiz();
  canliIpucuCiz();
  oklariGuncelle();
}

// --- Yürürken canlı ipucu: bulunduğun yerin zemini, uygunluğu ve orada ne aranır ---

const ZEMIN_ADLARI = { orman: 'ormanlık', cayir: 'çayır', bahce: 'meyve bahçesi', calilik: 'çalılık', diger: 'açık alan, tarla ya da yerleşim' };

// Bulunduğun hücre ve en yakın çok uygun hücre (son hesaplanan ızgaradan; ağ isteği yok).
function bulundugunHucre() {
  const iz = ara.izgara;
  if (!iz || ara.konum?.enlem == null) return null;
  const p = pikseleCevir(ara.konum.enlem, ara.konum.boylam, YUKSEKLIK_YAKINLIGI);
  const x = Math.floor(p.x - iz.sol);
  const y = Math.floor(p.y - iz.ust);
  if (x < 0 || y < 0 || x >= iz.genislik || y >= iz.yukseklik) return null;
  let enYakin = null;
  for (let i = 0; i < iz.siniflar.length; i++) {
    if (iz.siniflar[i] !== 3) continue;
    const d = Math.hypot((i % iz.genislik) - x, Math.floor(i / iz.genislik) - y);
    if (!enYakin || d < enYakin.d) enYakin = { d, i };
  }
  const yakin = enYakin && konumaCevir(iz.sol + (enYakin.i % iz.genislik) + 0.5, iz.ust + Math.floor(enYakin.i / iz.genislik) + 0.5, YUKSEKLIK_YAKINLIGI);
  return { zemin: iz.zemin[y * iz.genislik + x], sinif: iz.siniflar[y * iz.genislik + x], enYakin: yakin };
}

function canliIpucuCiz() {
  const h = bulundugunHucre();
  if (!h) { ipucuKap.replaceChildren(); return; }
  const ay = new Date().getMonth() + 1;
  const kisaAd = (t) => t.ad.replace(/\s*\(.*\)$/, '');
  const ilkCumle = (metin) => metin.split(/(?<=[.;])\s/)[0];
  const yerYazisi = `${ZEMIN_ADLARI[h.zemin]}${h.sinif ? `, ${SINIF_ADLARI[h.sinif].toLocaleLowerCase('tr')}` : ''}`;
  const konusma = [`Buradasın: ${yerYazisi}.`];
  const parcalar = [el('p', { className: 'canli-ipucu-baslik' }, el('strong', { textContent: 'Buradasın: ' }), `${yerYazisi}.`)];
  if (h.sinif < 3 && h.enYakin) {
    const { mesafe, yon } = mesafeVeYon(ara.konum, h.enYakin);
    if (mesafe > 25) {
      parcalar.push(el('p', { className: 'canli-ipucu-yon' }, `Çok uygun yere ${mesafeYaz(mesafe)} kaldı: `, yonGostergesi(yon)));
      konusma.push(`Çok uygun yere ${sesliMesafe(mesafe)}, ${yonYazisi(yon)}.`);
    }
  }
  const tur = seciliTur();
  if (tur) {
    const uyar = (zeminAgirliklari(tur)[h.zemin] ?? 0) >= 0.6;
    if (!mevsimdeMi(tur, ay)) {
      parcalar.push(el('p', { className: 'not', textContent: `${tur.ad} için mevsim değil (${ayAraligi(tur.aylar)}).` }));
    } else if (uyar && tur.aramaIpucu) {
      parcalar.push(el('p', {}, el('strong', { textContent: `${kisaAd(tur)}: ` }), tur.aramaIpucu));
      konusma.push(`${kisaAd(tur)}: ${ilkCumle(tur.aramaIpucu)}`);
    } else if (!uyar) {
      parcalar.push(el('p', { className: 'not', textContent: `${tur.ad} bu zeminde pek çıkmaz; renkli alanlara doğru ilerle.` }));
    }
  } else {
    const liste = zemindeAranabilecekler(ara.turler, h.zemin, ay).slice(0, 4);
    if (liste.length) {
      parcalar.push(el('p', { className: 'not', textContent: 'Burada bu mevsimde şunlara bakabilirsin (taslak):' }));
      for (const t of liste) parcalar.push(el('p', { className: 'canli-ipucu-tur' }, el('strong', { textContent: `${kisaAd(t)}: ` }), t.aramaIpucu ?? t.nerede ?? ''));
      konusma.push(`Burada ${liste.map(kisaAd).join(', ')} aranabilir. ${liste[0].aramaIpucu ? `${kisaAd(liste[0])}: ${ilkCumle(liste[0].aramaIpucu)}` : ''}`);
    } else {
      parcalar.push(el('p', { className: 'not', textContent: 'Burası bu mevsimde aranan türlere pek uygun değil; renkli alanlara doğru ilerle.' }));
    }
  }
  parcalar.push(el('p', { className: 'not', textContent: 'Bulduğun her mantarı Tanımla ile incele.' }));
  ipucuKap.replaceChildren(el('div', { className: 'canli-ipucu' }, ...parcalar));
  yeriSoyle(h, konusma.join(' '));
}

function konumDugmesiCiz(yazi) {
  const acik = ara.izlemeyiDurdur && ara.konum?.enlem != null;
  konumDugmesi.replaceChildren(ikon('konum'), el('span', { textContent: yazi ?? (acik ? 'Konumuma dön' : 'Konumumu göster') }));
}

export function mantarAraKapat() {
  ara.izlemeyiDurdur?.();
  ara.izlemeyiDurdur = null;
  ara.pusulayiDurdur?.();
  ara.pusulayiDurdur = null;
  Object.assign(ara, { bakis: null, bakisKaynagi: null, oncekiKonum: null });
  sesiKes();
  ara.konum = null;
  ipucuKap.replaceChildren();
  konumIsareti?.remove();
  konumIsareti = null;
  if (ara.kuruldu) konumDugmesiCiz();
}

// --- Uygunluk hesabı ---

// Haritadaki zemin (orman, çayır, bahçe, çalılık) poligonlarını hesap ızgarasına boyar.
const ZEMIN_KODLARI = { orman: 40, cayir: 80, bahce: 120, calilik: 160 };
function zeminSinifi(o) {
  if (o.class === 'wood') return 'orman';
  if (o.class === 'grass') return o.subclass === 'scrub' ? 'calilik' : 'cayir';
  if (o.class === 'farmland' && o.subclass === 'orchard') return 'bahce';
  return null;
}

function zeminIzgarasi(izgara) {
  const { genislik, yukseklik, sol, ust } = izgara;
  const tuval = new OffscreenCanvas(genislik, yukseklik);
  const c = tuval.getContext('2d', { willReadFrequently: true });
  const ozellikler = ara.harita.querySourceFeatures('openmaptiles', { sourceLayer: 'landcover' });
  const sira = ['calilik', 'cayir', 'bahce', 'orman']; // orman en son: çakışmada orman kazanır
  for (const zemin of sira) {
    c.fillStyle = `rgb(${ZEMIN_KODLARI[zemin]}, 0, 0)`;
    for (const o of ozellikler) {
      if (zeminSinifi(o.properties) !== zemin) continue;
      const poligonlar = o.geometry.type === 'Polygon' ? [o.geometry.coordinates] : o.geometry.type === 'MultiPolygon' ? o.geometry.coordinates : [];
      for (const halkalar of poligonlar) {
        c.beginPath();
        for (const halka of halkalar) {
          halka.forEach(([boylam, enlem], i) => {
            const p = pikseleCevir(enlem, boylam, YUKSEKLIK_YAKINLIGI);
            if (i === 0) c.moveTo(p.x - sol, p.y - ust);
            else c.lineTo(p.x - sol, p.y - ust);
          });
          c.closePath();
        }
        c.fill('evenodd');
      }
    }
  }
  const d = c.getImageData(0, 0, genislik, yukseklik).data;
  const kodlar = Object.entries(ZEMIN_KODLARI);
  const sonuc = new Array(genislik * yukseklik);
  for (let i = 0; i < sonuc.length; i++) {
    if (d[i * 4 + 3] < 128) { sonuc[i] = 'diger'; continue; }
    const r = d[i * 4];
    sonuc[i] = kodlar.reduce((en, [ad, kod]) => (Math.abs(kod - r) < Math.abs(ZEMIN_KODLARI[en] - r) ? ad : en), 'orman');
  }
  return sonuc;
}

// Bölgenin son yağmuru ve sıcaklığı: internet varsa Open-Meteo'dan (canlı), yoksa indirilmiş bölgeden
// (indirme günündeki bilgi; dönem günleri yine bugüne göre sayılır). Sonuç { daily, kayitliTarih } ya da null.
async function bolgeHavasi(merkez) {
  if (navigator.onLine) {
    const sonuc = await havaVerisiAl(merkez.enlem, merkez.boylam);
    if (!sonuc.hata) return { daily: sonuc.daily, kayitliTarih: null };
  }
  const yakin = (durumuOku().haritaBolgeleri ?? []).find((b) => b.hava && mesafeVeYon(b, merkez).mesafe < 10000);
  return yakin ? { daily: yakin.hava, kayitliTarih: yakin.tarih } : null;
}

function sonGunlerSicakligi(kayitlar) {
  const bugun = new Date();
  const son = kayitlar.filter((k) => k.tarih <= bugun && k.enYuksek != null).slice(-7);
  if (!son.length) return null;
  return son.reduce((t, k) => t + (k.enYuksek + k.enDusuk) / 2, 0) / son.length;
}

function haritayaYerlestir(tuval, izgara) {
  const { genislik, yukseklik, sol, ust } = izgara;
  const z = YUKSEKLIK_YAKINLIGI;
  const kose = (x, y) => { const k = konumaCevir(x, y, z); return [k.boylam, k.enlem]; };
  const koordinatlar = [kose(sol, ust), kose(sol + genislik, ust), kose(sol + genislik, ust + yukseklik), kose(sol, ust + yukseklik)];
  return tuval.convertToBlob({ type: 'image/png' }).then((blob) => {
    const adres = URL.createObjectURL(blob);
    const kaynak = ara.harita.getSource('uygunluk');
    if (kaynak) kaynak.updateImage({ url: adres, coordinates: koordinatlar });
    else {
      ara.harita.addSource('uygunluk', { type: 'image', url: adres, coordinates: koordinatlar });
      ara.harita.addLayer({ id: 'uygunluk', type: 'raster', source: 'uygunluk', paint: { 'raster-opacity': 0.85, 'raster-resampling': 'linear' } }, ilkSembolKatmani());
    }
  });
}

// canli: merkez bulunduğun yer (yürüdükçe yeniden hesaplanır).
async function bolgeyeBak(merkez, { canli = false } = {}) {
  if (!ara.harita || ara.hesaplaniyor) return;
  Object.assign(ara, { hesaplaniyor: true, hata: null });
  durumCiz();
  try {
    // Bölgeyi ekrana sığdır ve harita parçalarının (orman bilgisi) yüklenmesini bekle.
    await haritaHazir();
    const d = YARICAP / 111320;
    const db = d / Math.cos((merkez.enlem * Math.PI) / 180);
    const durgun = haritaDurgun();
    ara.harita.fitBounds([[merkez.boylam - db, merkez.enlem - d], [merkez.boylam + db, merkez.enlem + d]], { padding: 10, animate: false });
    await durgun;

    const [izgara, hava] = await Promise.all([yukseklikIzgarasi(merkez.enlem, merkez.boylam, YARICAP), bolgeHavasi(merkez)]);
    if (izgara.hata) {
      Object.assign(ara, { hesaplaniyor: false, hata: 'yukseklik' });
      durumCiz();
      return;
    }
    const kayitlar = hava ? gunlukKayitlar(hava.daily) : [];
    const pencere = kayitlar.length ? mantarPenceresi(kayitlar) : null;
    const tercih = yonTercihi({ ay: new Date().getMonth() + 1, sicaklik: sonGunlerSicakligi(kayitlar), kuru: pencere?.durum === 'yok' });
    const agirliklar = zeminAgirliklari(seciliTur());

    const { genislik, yukseklik, sol, ust, hucre } = izgara;
    const { egim, baki } = egimVeBaki(izgara.yukseklikler, genislik, yukseklik, hucre);
    const zemin = zeminIzgarasi(izgara);
    const tuval = new OffscreenCanvas(genislik, yukseklik);
    const c = tuval.getContext('2d');
    const resim = c.createImageData(genislik, yukseklik);
    const m = pikseleCevir(merkez.enlem, merkez.boylam, YUKSEKLIK_YAKINLIGI);
    const r = YARICAP / hucre;
    const sayilar = [0, 0, 0, 0];
    const zeminSayilari = { orman: 0, cayir: 0, bahce: 0, calilik: 0, diger: 0 };
    const siniflar = new Uint8Array(genislik * yukseklik);
    let enYakin = null;
    const referans = ara.konum?.enlem != null ? pikseleCevir(ara.konum.enlem, ara.konum.boylam, YUKSEKLIK_YAKINLIGI) : m;
    for (let y = 1; y < yukseklik - 1; y++) {
      for (let x = 1; x < genislik - 1; x++) {
        if (Math.hypot(sol + x - m.x, ust + y - m.y) > r) continue;
        const i = y * genislik + x;
        const sinif = puanSinifi(hucrePuani({ egim: egim[i], baki: baki[i], zemin: zemin[i], tercih, agirliklar }));
        sayilar[sinif]++;
        zeminSayilari[zemin[i]]++;
        siniflar[i] = sinif;
        if (!sinif) continue;
        resim.data.set(RENKLER[sinif], i * 4);
        if (sinif === 3) {
          const uzaklik = Math.hypot(sol + x - referans.x, ust + y - referans.y);
          if (!enYakin || uzaklik < enYakin.uzaklik) enYakin = { uzaklik, x: sol + x + 0.5, y: ust + y + 0.5 };
        }
      }
    }
    c.putImageData(resim, 0, 0);
    await haritayaYerlestir(tuval, izgara);
    if (enYakin) {
      const k = konumaCevir(enYakin.x, enYakin.y, YUKSEKLIK_YAKINLIGI);
      enYakin = { enlem: k.enlem, boylam: k.boylam };
    }
    const toplamHucre = Object.values(zeminSayilari).reduce((a, b) => a + b, 0) || 1;
    const zeminPayi = Object.fromEntries(Object.entries(zeminSayilari).map(([z, n]) => [z, n / toplamHucre]));
    ara.izgara = { zemin, siniflar, sol, ust, genislik, yukseklik };
    ara.sonuc = { merkez, canli, tercih, pencere, sayilar, enYakin, zeminPayi, kayitliTarih: hava?.kayitliTarih ?? null, yerAdi: yakinYerAdi(merkez) };
  } catch {
    ara.hata = 'genel';
  }
  ara.hesaplaniyor = false;
  durumCiz();
  canliIpucuCiz();
}

// --- Durum, hedef, işaretler, indirme ---

function durumCiz() {
  const parcalar = [];
  if (ara.hesaplaniyor) parcalar.push(el('p', { className: 'not', textContent: 'Yamaçlar ve ormanlar hesaplanıyor…' }));
  if (ara.konum?.hata) parcalar.push(bildirim('uyari', el('p', { textContent: KONUM_HATALARI[ara.konum.hata] })));
  if (ara.hata) {
    parcalar.push(bildirim('uyari', el('p', {
      textContent: ara.hata === 'yukseklik'
        ? 'Arazi bilgisi alınamadı. İnternet yoksa bu bölgeyi önceden indirmiş olman gerekir.'
        : 'Hesap yapılamadı. Haritayı biraz kaydırıp tekrar dene.',
    })));
  }
  const s = ara.sonuc;
  if (s && !ara.hesaplaniyor) {
    if (s.pencere) {
      // Ana sayfadaki gibi çubuk: hesap yapılan yerin (bulunduğun yer ya da haritanın ortası) mantar zamanı.
      const b = pencereBilgisi(s.pencere);
      const yer = s.canli ? 'Bulunduğun yer' : 'Haritanın ortası';
      const notlar = [];
      if (s.canli) notlar.push('Yürüdükçe 1,5 km\'de bir yenilenir.');
      if (s.kayitliTarih) notlar.push(`İnternet yok: indirdiğin günün (${new Date(s.kayitliTarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}) yağmur bilgisine göre.`);
      parcalar.push(el('div', { className: `ara-zaman-kutu pencere-${s.pencere.durum}` },
        el('div', { className: 'mevsim-ust' },
          el('span', { className: 'acilir-baslik' },
            el('strong', { textContent: s.yerAdi ? `${yer} (${s.yerAdi} civarı)` : yer }),
            el('span', { className: 'acilir-alt', textContent: b.baslik }),
          ),
          el('span', { className: 'mevsim-gun', textContent: b.sagUst }),
        ),
        cubukCiz(b.yuzde, 'Bu bölgede mantar döneminin kalan kısmı'),
        notlar.length ? el('p', { className: 'not', textContent: notlar.join(' ') }) : '',
      ));
      if (s.pencere.durum === 'yok') parcalar.push(el('p', { className: 'not', textContent: 'Son 3 haftada büyük yağmur yok; uygun yerlerde bile mantar az olabilir.' }));
    } else {
      parcalar.push(el('p', { className: 'not', textContent: 'Bölgenin yağmur bilgisi alınamadı; harita yalnızca araziye ve mevsime göre çizildi.' }));
    }
    parcalar.push(el('p', { textContent: s.tercih.aciklama }));
    // Bu alanda bu mevsimde aranabilecekler (alandaki zemine ve aya göre; gözlem kaydı değildir).
    const aranabilir = bolgedeAranabilecekler(ara.turler, s.zeminPayi, new Date().getMonth() + 1);
    if (aranabilir.length) {
      parcalar.push(
        el('p', { className: 'ara-bolge-baslik' }, el('strong', { textContent: 'Bu alanda bu mevsimde aranabilecekler' }), ' (taslak; dokununca seçilir):'),
        el('div', { className: 'tur-secici kucuk' }, ...aranabilir.map((t) => {
          const d = el('button', { type: 'button', className: `tur-secenek${ara.turId === t.id ? ' secili' : ''}`, onclick: () => turSec(t.id) },
            kucukFotograf(t, 'tur-secenek-resim'),
            el('span', { className: 'tur-secenek-ad', textContent: t.ad.replace(/\s*\(.*\)$/, '') }));
          d.setAttribute('aria-pressed', String(ara.turId === t.id));
          return d;
        })),
      );
    }
    const toplam = s.sayilar.reduce((a, b) => a + b, 0) || 1;
    const uygun = Math.round(((s.sayilar[2] + s.sayilar[3]) / toplam) * 100);
    parcalar.push(el('p', { className: 'not', textContent: `Bakılan alanın yaklaşık %${uygun}'i uygun ya da çok uygun görünüyor.` }));
    if (s.enYakin) {
      const kaynak = ara.konum?.enlem != null ? ara.konum : s.merkez;
      const { mesafe, yon } = mesafeVeYon(kaynak, s.enYakin);
      parcalar.push(el('div', { className: 'ara-en-yakin' },
        ara.konum?.enlem != null
          ? el('span', {}, `En yakın çok uygun yer: ${mesafeYaz(mesafe)}, `, yonGostergesi(yon))
          : el('span', { textContent: `En yakın çok uygun yer: ${mesafeYaz(mesafe)}, ${yonAdi(yon)} yönünde (haritanın ortasına göre).` }),
        el('button', { type: 'button', className: 'metin-dugme', textContent: 'Oraya git', onclick: () => hedefSec({ ad: 'Çok uygun yer', ...s.enYakin }) }),
      ));
    } else {
      parcalar.push(el('p', { className: 'not', textContent: 'Bu alanda çok uygun yer görünmüyor. Haritayı kaydırıp başka bir yere bak.' }));
    }
  }
  durumKap.replaceChildren(...parcalar);
}

function hedefSec(hedef) {
  ara.hedef = hedef;
  ara.sesHedef = null;
  if (sesAcik() && ara.konum?.enlem != null) {
    const { mesafe, yon } = mesafeVeYon(ara.konum, hedef);
    if (soyle(`Hedef seçildi: ${hedef.ad}. ${sesliMesafe(mesafe)}, ${yonYazisi(yon)}.`, { oncelikli: true })) ara.sesHedef = { adim: Math.ceil(mesafe / (mesafe > 1000 ? 200 : mesafe > 300 ? 100 : 50)), vardi: false };
  }
  hedefCiz();
  hedefKap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hedefCiz() {
  const h = ara.hedef;
  if (!h) { hedefKap.replaceChildren(); return; }
  const parcalar = [el('strong', { textContent: `Hedef: ${h.ad}` })];
  if (ara.konum?.enlem != null) {
    const { mesafe, yon } = mesafeVeYon(ara.konum, h);
    hedefiSoyle(mesafe, yon);
    if (mesafe < 15) {
      parcalar.push(el('p', { className: 'hedef-mesafe', textContent: 'Vardın. Çevrene iyice bak.' }));
    } else {
      // Büyük ok: telefonun baktığı yöne göre döner ("sağ önünde", "arkanda").
      parcalar.push(
        yonGostergesi(yon, 'buyuk'),
        el('p', { className: 'hedef-mesafe', textContent: mesafeYaz(mesafe) }),
        el('p', { className: 'not yon-notu', textContent: yonNotu() }),
      );
    }
  } else {
    parcalar.push(el('p', { className: 'not', textContent: 'Mesafeyi görmek için "Konumumu göster"e dokun.' }));
  }
  parcalar.push(el('button', { type: 'button', className: 'metin-dugme soluk', textContent: 'Hedefi bırak', onclick: () => { ara.hedef = null; hedefCiz(); } }));
  hedefKap.replaceChildren(el('div', { className: 'tek-seferlik ara-hedef-kutu' }, ...parcalar));
}

function isaretleriCiz() {
  const liste = gizliYerler();
  for (const [id, isaret] of isaretler) {
    if (!liste.some((y) => y.id === id)) { isaret.remove(); isaretler.delete(id); }
  }
  for (const yer of liste) {
    if (isaretler.has(yer.id)) continue;
    const ogesi = el('button', { type: 'button', className: 'isaret-pin', title: yer.ad, onclick: () => hedefSec({ ad: yer.ad, enlem: yer.enlem, boylam: yer.boylam }) });
    ogesi.setAttribute('aria-label', `${yer.ad}: hedef olarak seç`);
    isaretler.set(yer.id, new window.maplibregl.Marker({ element: ogesi, anchor: 'bottom' }).setLngLat([yer.boylam, yer.enlem]).addTo(ara.harita));
  }
}

function isaretKaydet(olay) {
  olay.preventDefault();
  const m = haritaMerkezi();
  const liste = gizliYerler();
  const yer = {
    id: `${Date.now()}`,
    ad: ara.isaretAdi.trim() || `Gizli yer ${liste.length + 1}`,
    not: '',
    // Yeri tekrar bulabilmek için tam konum saklanır; yalnızca bu cihazda kalır.
    enlem: Math.round(m.enlem * 1e5) / 1e5,
    boylam: Math.round(m.boylam * 1e5) / 1e5,
    tarih: new Date().toISOString(),
  };
  kalici({ gizliYerler: [yer, ...liste].slice(0, 50) });
  ara.isaretAdi = '';
  isaretleriCiz();
  isaretCiz('Kaydedildi. Yerlerim listesinde ve haritada görünür.');
  document.dispatchEvent(new Event('yerler-degisti'));
}

function isaretCiz(mesaj = '') {
  const girdi = el('input', {
    type: 'text',
    className: 'yagmur-girdi',
    placeholder: 'Yerin adı: ör. dere kenarı çamlık',
    value: ara.isaretAdi,
    maxLength: 60,
    oninput: (o) => { ara.isaretAdi = o.target.value; },
  });
  girdi.setAttribute('aria-label', 'İşaretlenecek yerin adı');
  isaretKap.replaceChildren(
    el('h3', { className: 'yerlerim-baslik', textContent: 'Yer işaretle' }),
    el('p', { className: 'not', textContent: 'Haritayı kaydırıp artı işaretini gideceğin yere getir. İşaret yalnızca bu cihazda kalır. Haritadaki bir işarete dokununca oraya yön gösterilir.' }),
    el('form', { className: 'gizli-yer-formu', onsubmit: isaretKaydet },
      girdi,
      el('button', { type: 'submit', className: 'ikincil', textContent: 'Ortadaki noktayı kaydet' }),
    ),
    mesaj ? el('p', { className: 'not', textContent: mesaj }) : '',
  );
}

async function indir(olay) {
  olay.preventDefault();
  const m = haritaMerkezi();
  const ad = ara.bolgeAdi.trim() || yakinYerAdi(m) || `Bölge ${(durumuOku().haritaBolgeleri ?? []).length + 1}`;
  ara.indirme = { tamam: 0, toplam: 0 };
  indirCiz();
  const [sonuc, hava] = await Promise.all([
    bolgeyiIndir(m.enlem, m.boylam, YARICAP, (tamam, toplam) => { ara.indirme = { tamam, toplam }; indirCiz(); }),
    havaVerisiAl(m.enlem, m.boylam),
  ]);
  if (sonuc.hata) {
    ara.indirme = { hata: sonuc.hata };
  } else {
    const bolge = { id: `${Date.now()}`, ad, enlem: Math.round(m.enlem * 1e3) / 1e3, boylam: Math.round(m.boylam * 1e3) / 1e3, tarih: new Date().toISOString(), hava: hava.hata ? null : hava.daily };
    kalici({ haritaBolgeleri: [bolge, ...(durumuOku().haritaBolgeleri ?? []).filter((b) => mesafeVeYon(b, bolge).mesafe > 1000)].slice(0, AZAMI_BOLGE) });
    ara.indirme = { bitti: true, toplam: sonuc.toplam };
    ara.bolgeAdi = '';
  }
  indirCiz();
}

// İndirilmiş bölgeyi haritada açar ve oraya bakar (internet olmasa da: harita cihazdan gelir).
function bolgeyiAc(b) {
  ara.harita.jumpTo({ center: [b.boylam, b.enlem], zoom: 13 });
  bolgeyeBak({ enlem: b.enlem, boylam: b.boylam });
  haritaKap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bolgeyiSil(b) {
  if (!confirm(`"${b.ad ?? 'Bölge'}" listeden silinsin mi?`)) return;
  kalici({ haritaBolgeleri: (durumuOku().haritaBolgeleri ?? []).filter((x) => x !== b && !(x.enlem === b.enlem && x.boylam === b.boylam)) });
  indirCiz();
}

function indirCiz() {
  const d = ara.indirme;
  const adGirdisi = el('input', {
    type: 'text',
    className: 'yagmur-girdi',
    placeholder: 'Bölgenin adı: ör. Keles Pınarcık',
    value: ara.bolgeAdi,
    maxLength: 60,
    oninput: (o) => { ara.bolgeAdi = o.target.value; },
  });
  adGirdisi.setAttribute('aria-label', 'İndirilecek bölgenin adı');
  const parcalar = [
    el('h3', { className: 'yerlerim-baslik', textContent: 'İnternetsiz kullan' }),
    el('p', { className: 'not', textContent: 'Gitmeden önce, internet varken haritayı gideceğin yere getir, bir ad yaz ve indir. Dağda internet yokken aşağıdaki listeden "Haritada aç"a dokun; harita, arazi ve son yağmur bilgisi telefondan gelir. Konum (GPS) internetsiz de çalışır.' }),
    el('form', { className: 'gizli-yer-formu', onsubmit: indir },
      adGirdisi,
      el('button', { type: 'submit', className: 'ikincil', textContent: 'Bu bölgeyi indir', disabled: Boolean(d && !d.bitti && !d.hata) }),
    ),
  ];
  if (d?.hata) parcalar.push(bildirim('uyari', el('p', { textContent: d.hata === 'desteklenmiyor' ? 'Bu tarayıcı indirmeyi desteklemiyor. Uygulamayı ana ekrana ekleyip oradan aç.' : 'İndirilemedi. İnternet bağlantını kontrol et.' })));
  else if (d?.bitti) parcalar.push(el('p', { className: 'not', textContent: `İndirildi (${d.toplam} parça). Bu bölge artık internetsiz açılır.` }));
  else if (d) parcalar.push(el('p', { className: 'not', textContent: `İndiriliyor… ${d.tamam} / ${d.toplam || '?'}` }));

  const bolgeler = durumuOku().haritaBolgeleri ?? [];
  if (bolgeler.length) {
    parcalar.push(
      el('h3', { className: 'yerlerim-baslik', textContent: 'İndirdiğim bölgeler' }),
      el('div', { className: 'yerlerim-listesi' }, ...bolgeler.map((b, i) => el('div', { className: 'yer-satiri' },
        el('div', { className: 'mevsim-ust' },
          el('strong', { textContent: b.ad ?? `Bölge ${bolgeler.length - i}` }),
          el('span', { className: 'not', textContent: new Date(b.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) }),
        ),
        el('div', { className: 'yer-dugmeleri' },
          el('button', { type: 'button', className: 'metin-dugme', textContent: 'Haritada aç', onclick: () => bolgeyiAc(b) }),
          el('button', { type: 'button', className: 'metin-dugme soluk', textContent: 'Sil', onclick: () => bolgeyiSil(b) }),
        ),
      ))),
    );
  }
  indirKap.replaceChildren(...parcalar);
}

// --- Kurulum ---

async function kur() {
  ara.kuruldu = true;
  konumDugmesiCiz();
  sesDugmesiCiz();
  isaretCiz();
  indirCiz();
  turCiz();
  turleriYukle().then((turler) => {
    // Aranacak türler: toplanan (yenen) türler. Zehirli benzerleri her seçimde gösterilir (kural 8).
    ara.turler = aranmaSirasinaGore(turler.filter((t) => t.zehirlilik === 'yenen'));
    turCiz();
  });
  try {
    await kutuphaneyiYukle();
  } catch {
    haritaKap.replaceChildren(bildirim('uyari', el('p', { textContent: 'Harita yüklenemedi. İnternet bağlantını kontrol et.' })));
    return;
  }
  const { merkez, zoom } = baslangicYeri();
  ara.harita = new window.maplibregl.Map({
    container: haritaKap,
    style: HARITA_STILI,
    center: merkez,
    zoom,
    attributionControl: { compact: true, customAttribution: HARITA_ATFI },
  });
  ara.harita.addControl(new window.maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
  ara.harita.on('load', () => {
    // Atıf kutusu küçük başlasın (i'ye dokununca açılır); telefonda haritayı kapatmasın.
    haritaKap.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    // Dağları gölgeyle göster: yamaçlar ve vadiler görünsün.
    ara.harita.addSource('yukseklik', { type: 'raster-dem', tiles: [YUKSEKLIK_PARCALARI], tileSize: 256, encoding: 'terrarium', maxzoom: YUKSEKLIK_YAKINLIGI });
    ara.harita.addLayer({ id: 'golge', type: 'hillshade', source: 'yukseklik', paint: { 'hillshade-exaggeration': 0.45 } }, ilkSembolKatmani());
    isaretleriCiz();
  });
}

document.addEventListener('yerler-degisti', () => { if (ara.harita?.loaded()) isaretleriCiz(); });

// Ekran her açıldığında çağrılır.
export function mantarAraAc() {
  const kap = document.getElementById('mantar-ara-icerik');
  if (!kap.contains(kok)) kap.replaceChildren(kok);
  if (!ara.kuruldu) kur();
  else ara.harita?.resize();
}
