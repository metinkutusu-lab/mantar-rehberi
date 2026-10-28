// Tanımlama ekranı: giriş, fotoğrafla tanımlama (js/hizliTanimla.js) ve renkli sonuç.
import { bildirim, el, ikon, kucukFotograf } from './dom.js';
import { degerlendir, muhtemelTurOneCikabilirMi } from './kurallar.js';
import { ozetSatirlari, sonCevaplar } from './sorular.js';
import { adaylariBul } from './anahtar.js';
import { ozetResmiOlustur, ozetiPaylas } from './ozet.js';
import { kaydet } from './depo.js';
import { FOTOGRAF_UYARISI, ZEHIRLILIK_ADLARI, tehlikeyeGoreSirala, turleriYukle } from './turler.js';
import { zehirRozeti } from './zehir.js';
import { hizliBaslat, hizliCiz, hizliKapat, hizliSifirla } from './hizliTanimla.js';
import { BELIRGIN_BENZERLIK, benzerlikSozu } from './fotoTanima.js';

// Tür listesi cihazdaki önbellekten gelir. Yüklenemezse boş sayılır; sonuç en fazla turuncu olur.
let turler = [];
turleriYukle().then((liste) => {
  turler = liste;
});

const SONUC_IKONLARI = { kirmizi: 'uyari', turuncu: 'soru', sari: 'bilgi' };

// Fotoğraflar yalnızca bellekte tutulur, hiçbir yere gönderilmez (kural 12).
// benzerlikler: hızlı tanımlamada fotoğraf kıyası açıksa { türId: 0–1 } (yalnızca sıralama için).
const durum = { asama: 'giris', cevaplar: {}, fotograflar: {}, benzerlikler: {} };
let kap;
let ayarlar;

export function tanimlamaCiz(hedef, secenekler) {
  kap = hedef;
  ayarlar = secenekler;
  ciz();
}

function ciz() {
  // Mevsim çubuğu yalnızca giriş ekranında görünür; adımlar ve sonuç sırasında yer kaplamasın.
  document.getElementById('mevsim').hidden = durum.asama !== 'giris';
  if (durum.asama === 'hizli') {
    hizliCiz(kap, { bitir: hizliBitti, vazgec: () => git('giris') });
    return;
  }
  hizliKapat();
  if (durum.asama === 'sonuc') kap.replaceChildren(sonucCiz());
  else kap.replaceChildren(girisCiz());
}

function git(asama) {
  durum.asama = asama;
  ciz();
  window.scrollTo(0, 0);
}

function sifirla() {
  for (const url of Object.values(durum.fotograflar)) URL.revokeObjectURL(url);
  hizliSifirla();
  Object.assign(durum, { cevaplar: {}, fotograflar: {}, benzerlikler: {} });
}

// Hızlı tanımlama bitince cevaplar ve fotoğraflar bu ekranın sonucuna aktarılır (aynı değerlendirme, kural 1–14).
function hizliBitti({ cevaplar, fotograflar, benzerlikler }) {
  Object.assign(durum, { cevaplar, fotograflar, benzerlikler });
  git('sonuc');
}

// Ekrandan (sekmeden) çıkınca kamera, mikrofon ve ses kapanır.
export function tanimlamaKapat() {
  hizliKapat();
}

// Tek tanımlama yolu: fotoğrafla başlayan hızlı tanımlama (Metin'in kararı, 2026-10-26: eski 15 soruluk
// adım adım akış kaldırıldı). Kurallar ve sonuç değerlendirmesi aynıdır.
// Sade giriş (Metin'in isteği, 2026-10-26): büyük "Fotoğrafla tanımla" düğmesi ve (i); açıklama (i)'nin arkasında;
// hemen altında "Yanına al" (sepet dahil).
function girisCiz() {
  const gerekenler = [
    ['kamera', 'Telefon, fotoğraf için'],
    ['bicak', 'Bıçak, kesmek ve toprağı açmak için'],
    // Fırça (Metin'in isteği): şapkadaki benekler tanımada önemlidir (ör. panter, sinek mantarı); önce fotoğraf ve tanımlama.
    ['firca', 'Fırça, mantarın üstündeki toprağı temizlemek için (şapkadaki benekleri silmemek için fotoğrafı çekip tanımladıktan sonra kullan)'],
    ['sepet', 'Sepet, mantarları toplamak için (naylon poşette mantar ezilip bozulur)'],
  ];
  const bilgi = el('div', { className: 'bilgi-paneli', hidden: true },
    el('p', { textContent: 'Üç fotoğraf ekle: üstten, alttan ve yandan (galeriden üçü birden seçilebilir). Uygulama fotoğrafa göre tahmin eder ve tek sayfada yalnızca o tahmini zehirli benzerlerinden ayıran kontrolleri gösterir; tehlikeli türleri ayıran kontrolleri hiçbir zaman atlamaz. Sonuç sen cevapladıkça aynı sayfada değişir. İstersen sesli okur.' }),
    el('p', {}, el('strong', { textContent: 'Emin olmadığın her soruda "Bilmiyorum" seç. Tahmin etme.' })),
  );
  const bilgiDugmesi = el('button', {
    type: 'button',
    className: 'bilgi-dugme',
    textContent: 'i',
    onclick: () => {
      bilgi.hidden = !bilgi.hidden;
      bilgiDugmesi.setAttribute('aria-expanded', String(!bilgi.hidden));
    },
  });
  bilgiDugmesi.setAttribute('aria-label', 'Tanımlama nasıl çalışır?');
  bilgiDugmesi.setAttribute('aria-expanded', 'false');
  return el('div', { className: 'tanimla-giris' },
    // Fotoğrafla başlar, yalnızca olası türleri ayıran soruları sorar (güvenlik soruları her zaman), sesli yönlendirir.
    el('div', { className: 'tanimla-ust' },
      el('button', {
        type: 'button',
        className: 'birincil tanimla-dugme',
        onclick: () => {
          sifirla();
          hizliBaslat();
          git('hizli');
        },
      }, ikon('kamera'), el('span', { textContent: 'Fotoğrafla tanımla' })),
      bilgiDugmesi,
    ),
    bilgi,
    // Kapalıyken tek satır: başlık ve simgeler; dokununca açıklamalı liste açılır.
    el('details', { className: 'kart acilir yanina-al' },
      el('summary', {},
        el('span', { className: 'acilir-ust' },
          el('strong', { className: 'acilir-baslik', textContent: 'Yanına al' }),
          el('span', { className: 'yanina-al-ikonlar' }, ...gerekenler.map(([ad]) => ikon(ad))),
          el('span', { className: 'acilir-ok', 'aria-hidden': 'true' }),
        ),
      ),
      el('ul', { className: 'liste-ikonlu acilir-govde' },
        ...gerekenler.map(([ad, metin]) => el('li', {}, ikon(ad), el('span', { textContent: metin }))),
      ),
    ),
    el('button', { type: 'button', className: 'metin-dugme', textContent: 'Güvenlik eğitimini tekrar izle', onclick: ayarlar.egitimiTekrarIzle }),
  );
}

// Özet resmi hazırlanır ve Acil ekranında doktora gösterilmek üzere cihaza kaydedilir.
function ozetHazirla(sonuc) {
  const hazirlanan = ozetResmiOlustur({
    sonuc,
    satirlar: ozetSatirlari(durum.cevaplar),
    fotograflar: Object.values(durum.fotograflar),
  });
  hazirlanan.then((resim) => resim && kaydet('son-ozet', { resim, tarih: new Date().toISOString(), renk: sonuc.renk }));
  return hazirlanan;
}

function paylasKartiCiz(sonuc, ozet) {
  const durumMetni = el('p', { className: 'not' });
  const dugme = el('button',
    {
      type: 'button',
      className: 'birincil genis',
      onclick: async () => {
        dugme.disabled = true;
        durumMetni.textContent = 'Özet hazırlanıyor…';
        const resim = await ozet;
        const sonucu = resim ? await ozetiPaylas(resim, sonuc) : 'hata';
        durumMetni.textContent = {
          paylasildi: 'Özet paylaşıldı.',
          vazgecildi: '',
          indirildi: 'Özet resmi indirildi. Galeriden veya İndirilenler klasöründen gönderebilirsin.',
          hata: 'Özet hazırlanamadı. Fotoğrafları ayrı ayrı gönderebilirsin.',
        }[sonucu];
        dugme.disabled = false;
      },
    },
    ikon('paylas'),
    el('span', { textContent: 'Uzmana gönder' }),
  );
  return el('div', { className: 'kart paylas-karti' },
    el('h3', { className: 'kart-baslik', textContent: 'Bir uzmana sor' }),
    el('p', { textContent: 'Fotoğrafların ve cevapların tek bir resimde toplanır. WhatsApp veya başka bir uygulamayla bir mantar uzmanına gönderebilirsin.' }),
    dugme,
    durumMetni,
  );
}

// Sonuç bir tahmindir; kime sorulacağı her sonuçta yazar (Metin'in isteği, 2026-10-26).
function kimeSorKartiCiz() {
  return el('div', { className: 'kart' },
    el('h3', { className: 'kart-baslik', textContent: 'Kime sorabilirsin?' }),
    el('ul', { className: 'gerekceler' },
      el('li', { textContent: 'Bir mantar uzmanı (mikolog) veya bölgendeki mantar derneği' }),
      el('li', { textContent: 'İl veya ilçe tarım ve orman müdürlüğü' }),
      el('li', { textContent: 'Zehirlenme şüphesinde hemen 114 (UZEM) veya 112' }),
    ),
    el('p', { className: 'not', textContent: 'Bu uygulama eğitim amaçlı bir rehberdir; mantarın yenip yenmeyeceğine karar vermez.' }),
  );
}

// Kural 8: yenen bir aday her zaman zehirli benzerleri ve farklarıyla birlikte gösterilir.
function adayCiz(tur) {
  const satir = el('li', {},
    el('div', { className: 'aday-satiri' },
      kucukFotograf(tur),
      el('div', {},
        el('div', { className: 'aday-ust' },
          el('strong', { textContent: tur.ad ?? 'Adsız tür' }),
          el('span', { className: `rozet rozet-${tur.zehirlilik}`, textContent: ZEHIRLILIK_ADLARI[tur.zehirlilik] ?? 'Bilinmiyor, zehirli sayılır' }),
          tur.mikologOnayi === true ? '' : el('span', { className: 'rozet', textContent: 'Taslak bilgi' }),
          zehirRozeti(tur),
        ),
        tur.bilimselAd ? el('em', { className: 'bilimsel-ad', textContent: tur.bilimselAd }) : '',
        durum.benzerlikler[tur.id] !== undefined ? el('span', { className: 'not kiyas-benzerlik', textContent: benzerlikSozu(durum.benzerlikler[tur.id]) }) : '',
      ),
    ),
  );
  if (tur.zehirlilik === 'yenen' && tur.zehirliBenzerler?.length) {
    const adlaTur = new Map(turler.map((t) => [t.ad, t]));
    satir.append(el('div', { className: 'benzerler' },
      el('p', { className: 'benzer-baslik', textContent: 'Karıştırılan zehirli türler:' }),
      ...tur.zehirliBenzerler.map((benzer) => el('div', { className: 'benzer-satiri' },
        kucukFotograf(adlaTur.get(benzer.ad), 'benzer-kucuk'),
        el('p', {}, el('strong', { textContent: `${benzer.ad}: ` }), benzer.fark),
      )),
    ));
  }
  return satir;
}

function sonucCiz() {
  const cevaplar = sonCevaplar(durum.cevaplar);
  const adaylar = adaylariBul(turler, cevaplar);
  const sonuc = degerlendir({ fotograflar: Object.keys(durum.fotograflar), cevaplar, adaylar });
  const ozet = ozetHazirla(sonuc);

  const kok = el('div', { className: 'sonuc' },
    el('div', { className: `sonuc-kart sonuc-${sonuc.renk}` },
      ikon(SONUC_IKONLARI[sonuc.renk]),
      el('p', { className: 'sonuc-etiket', textContent: 'Sonuç' }),
      el('h2', { textContent: sonuc.baslik }),
      el('p', { className: 'sonuc-mesaj', textContent: sonuc.mesaj }),
    ),
  );

  kok.append(
    sonuc.renk === 'kirmizi'
      ? bildirim('tehlike', el('p', { textContent: 'Bu mantarı yeme ve kimseye verme. Dokunduysan ellerini yıka.' }))
      : bildirim('uyari', el('p', {},
        el('strong', { textContent: 'Bu sonuç bir tahmindir. ' }),
        'Mantarı yemeden önce mutlaka bir mantar uzmanına göster.',
      )),
  );

  // "Muhtemelen" yalnızca cevaplara uyan tek tür kaldıysa ya da fotoğraf kıyası belirgin bir benzerlik bulduysa
  // söylenir; yüzde verilmez (kural 1, 5). Sonucun rengi değişmez.
  const benzerlik = (tur) => durum.benzerlikler[tur.id] ?? 0;
  const enBenzer = [...adaylar].sort((a, b) => benzerlik(b) - benzerlik(a))[0];
  const tekAday = adaylar.length === 1;
  if (enBenzer && (tekAday || benzerlik(enBenzer) >= BELIRGIN_BENZERLIK) && muhtemelTurOneCikabilirMi(sonuc.renk, enBenzer)) {
    kok.append(el('div', { className: 'kart' },
      el('h3', { className: 'kart-baslik', textContent: tekAday ? 'Cevaplarına uyan tek tür' : 'Fotoğrafına ve cevaplarına en çok uyan' }),
      el('div', { className: 'aday-satiri' },
        kucukFotograf(enBenzer),
        el('div', {},
          el('strong', { textContent: `Muhtemelen ${enBenzer.ad} olabilir` }),
          el('div', { className: 'aday-ust' }, el('span', { className: `rozet rozet-${enBenzer.zehirlilik}`, textContent: ZEHIRLILIK_ADLARI[enBenzer.zehirlilik] ?? 'Bilinmiyor, zehirli sayılır' })),
        ),
      ),
      el('p', { className: 'not', textContent: tekAday
        ? 'Bu kesin değildir: mantar uygulamadaki türlerin dışında da olabilir. Bir uzmana göstermeden yeme.'
        : 'Bu kesin değildir. Sonucun rengi, kalan bütün olasılıkların en tehlikelisine göredir.' }),
    ));
  }

  kok.append(paylasKartiCiz(sonuc, ozet));
  kok.append(kimeSorKartiCiz());

  kok.append(el('div', { className: 'kart' },
    el('h3', { className: 'kart-baslik', textContent: 'Neden bu sonuç?' }),
    el('ul', { className: 'gerekceler' }, ...sonuc.gerekceler.map((g) => el('li', { textContent: g }))),
  ));

  if (adaylar.length > 0) {
    kok.append(el('div', { className: 'kart' },
      el('h3', { className: 'kart-baslik', textContent: 'Muhtemelen şu türlerden biri olabilir' }),
      el('p', { className: 'not', textContent: 'En tehlikeli olasılıklar önce. Cevaplarınla çelişmeyen bütün türler listelenir.' }),
      el('ul', { className: 'adaylar' }, ...tehlikeyeGoreSirala(adaylar).map(adayCiz)),
      el('p', { className: 'not', textContent: FOTOGRAF_UYARISI }),
    ));
  } else if (turler.length > 0) {
    kok.append(bildirim('bilgi', el('p', {
      textContent: 'Cevapların uygulamadaki türlerin hiçbiriyle uyuşmadı. Bu, mantarın listede olmayan bir tür olduğu anlamına gelebilir.',
    })));
  }
  if (!turler.some((tur) => tur.mikologOnayi === true)) {
    kok.append(bildirim('bilgi', el('p', {
      textContent: 'Tür bilgileri taslaktır ve henüz bir mantar uzmanı tarafından onaylanmadı. Bu yüzden sonuç en fazla turuncu olabilir.',
    })));
  }

  const fotolar = Object.values(durum.fotograflar);
  if (fotolar.length > 0) {
    kok.append(el('div', { className: 'kart' },
      el('h3', { className: 'kart-baslik', textContent: 'Fotoğrafların' }),
      el('div', { className: 'foto-izgara' }, ...fotolar.map((src) => el('img', { src, alt: 'Mantar fotoğrafı' }))),
      el('p', { className: 'not', textContent: 'Fotoğraflar uygulama kapanınca silinir. Son tanımlamanın özeti, doktora gösterebilmen için Acil ekranında saklanır.' }),
    ));
  }

  kok.append(el('div', { className: 'dugmeler' },
    el('button', {
      type: 'button',
      className: 'birincil',
      textContent: 'Yeni tanımlama',
      onclick: () => {
        sifirla();
        git('giris');
      },
    }),
  ));
  return kok;
}
