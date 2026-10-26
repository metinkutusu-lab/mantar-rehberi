// Zehir türü sembolleri (Metin'in isteği, 2026-10-26): zehirli adaylarda zehrin ne yaptığı bir sembolle gösterilir
// (ölümcül = kırmızı kurukafa); dokununca belirtiler, ne kadar sürede başladığı ve 114 / 112 açılır.
// TASLAK: genel zehirlenme bilgisidir; UZEM yayınları ve bir hekimle doğrulanmalı (Acil ekranındaki not gibi).
// Hangi türün hangi zehir türünde olduğu veri/turler.json'daki "zehirTipi" alanındadır (türün açıklamasından alındı).
// Alan yoksa ya da bilinmiyorsa en kötüsü varsayılır: "bilinmiyor" (kural 3).
import { el } from './dom.js';

export const ZEHIR_TIPLERI = Object.freeze({
  karaciger: {
    sembol: 'kurukafa',
    renk: 'kirmizi',
    kisa: 'Ölümcül: karaciğer',
    baslik: 'Ölümcül: karaciğeri yok eder',
    belirtiler: ['Şiddetli kusma ve sulu ishal', 'Karın ağrısı', 'Sonra gözlerde ve ciltte sararma'],
    baslama: 'Yemekten 6–24 saat sonra',
    uyari: 'Geç başlaması tehlike işaretidir. 1–2 gün iyileşmiş gibi görünür ama karaciğer bozulmaya devam eder. Belirti geçse de hastaneye git.',
  },
  bobrek: {
    sembol: 'kurukafa',
    renk: 'kirmizi',
    kisa: 'Ölümcül: böbrek',
    baslik: 'Ölümcül: böbrekleri bozar',
    belirtiler: ['Aşırı susama, bulantı', 'Bel ve yan ağrısı', 'İdrarın azalması veya kesilmesi'],
    baslama: 'Yemekten 2–20 gün sonra',
    uyari: 'Belirtiler o kadar geç başlar ki çoğu zaman mantarla ilişkilendirilmez. Bu mantarı yediysen belirti olmasa da hastaneye git.',
  },
  olumcul: {
    sembol: 'kurukafa',
    renk: 'kirmizi',
    kisa: 'Ölümcül',
    baslik: 'Ölümcül olabilir',
    belirtiler: ['Kusma, ishal, karın ağrısı', 'Baş dönmesi, sersemlik', 'Havale, bilinç bulanıklığı'],
    baslama: 'Yemekten 2–12 saat sonra',
    uyari: 'Pişirmek zehri yok etmez; pişerken çıkan buhar da zararlı olabilir.',
  },
  sinir: {
    sembol: 'sinir',
    renk: 'turuncu',
    kisa: 'Sinir sistemi',
    baslik: 'Sinir sistemini etkiler',
    belirtiler: ['Baş dönmesi, sarhoşluk hali', 'Bilinç bulanıklığı, sanrı (olmayan şeyleri görme)', 'Kas seğirmesi, havale'],
    baslama: 'Yemekten 30 dakika – 2 saat sonra',
    uyari: 'Çocuklarda ve yaşlılarda ağır seyredebilir.',
  },
  ter: {
    sembol: 'ter',
    renk: 'turuncu',
    kisa: 'Terleme, salya',
    baslik: 'Aşırı terleme ve salya yapar',
    belirtiler: ['Aşırı terleme, ağızda sulanma, gözyaşı', 'Göz bebeklerinde küçülme, bulanık görme', 'Kalp atışında yavaşlama, nefes darlığı'],
    baslama: 'Yemekten 15 dakika – 2 saat sonra',
    uyari: 'Kalbi ve solunumu etkileyebilir; hemen 112.',
  },
  mide: {
    sembol: 'mide',
    renk: 'turuncu',
    kisa: 'Kusma, ishal',
    baslik: 'Mide-bağırsak zehirlenmesi',
    belirtiler: ['Bulantı, kusma', 'İshal, karın krampı', 'Ağır olursa su kaybı: halsizlik, baş dönmesi'],
    baslama: 'Yemekten 30 dakika – 3 saat sonra',
    uyari: 'Çocuklarda, yaşlılarda ve hastalarda su kaybı tehlikelidir.',
  },
  bilinmiyor: {
    sembol: 'uyari',
    renk: 'kirmizi',
    kisa: 'Zehirli',
    baslik: 'Zehirli: etkisi uygulamada yazılı değil',
    belirtiler: ['Herhangi bir zehirlenme belirtisi olabilir'],
    baslama: 'Bilinmiyor; geç başlayabilir',
    uyari: 'Etkisi bilinmeyen zehir en tehlikelisi gibi düşünülür.',
  },
});

// Her popup'ta yazan genel uyarı: erken başlaması "hafif" demek değildir.
export const ERKEN_BASLAMA_UYARISI =
  'Belirtilerin erken başlaması zehirlenmenin hafif olduğu anlamına gelmez: birden fazla mantar yendiyse aralarında ölümcül olan da olabilir.';

export function zehirTipi(tur) {
  if (tur?.zehirlilik === 'yenen') return null;
  return ZEHIR_TIPLERI[tur?.zehirTipi] ?? ZEHIR_TIPLERI.bilinmiyor;
}

// Semboller (24x24 çizgi). Sabit metinlerdir.
const SEMBOLLER = {
  kurukafa: '<path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4 2.5 5v3h9v-3c1.3-1 2.5-2.6 2.5-5a7 7 0 0 0-7-7z"/><circle cx="9.3" cy="10.5" r="1.6" fill="currentColor"/><circle cx="14.7" cy="10.5" r="1.6" fill="currentColor"/><path d="M12 13l-.8 1.6h1.6z" fill="currentColor"/><path d="M10 18v3M14 18v3M12 18v3"/>',
  sinir: '<path d="M12 12a1.5 1.5 0 1 1 1.5 1.5A3 3 0 1 1 15 10.5 4.5 4.5 0 1 1 10.5 15 6 6 0 1 1 18 12"/>',
  ter: '<path d="M8 3s-3 4-3 6a3 3 0 0 0 6 0c0-2-3-6-3-6z"/><path d="M16 10s-3 4-3 6a3 3 0 0 0 6 0c0-2-3-6-3-6z"/>',
  mide: '<circle cx="12" cy="12" r="9"/><path d="M8.5 9.5h.01M15.5 9.5h.01"/><path d="M8 16c1.3-1.3 2.7-1.3 4 0s2.7 1.3 4 0"/>',
  uyari: '<path d="M12 3 2 21h20z"/><path d="M12 10v5"/><path d="M12 18h.01"/>',
};

function sembol(ad) {
  const kap = document.createElement('span');
  kap.className = 'ikon zehir-sembol';
  kap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SEMBOLLER[ad]}</svg>`;
  return kap;
}

// Sembol + kısa ad; dokununca belirtiler açılır. Yenen türde boş döner.
export function zehirRozeti(tur) {
  const tip = zehirTipi(tur);
  if (!tip) return '';
  return el('details', { className: `zehir-rozet zehir-${tip.renk}` },
    el('summary', {}, sembol(tip.sembol), el('span', { textContent: tip.kisa })),
    el('div', { className: 'zehir-panel' },
      el('strong', { textContent: tip.baslik }),
      el('p', { className: 'zehir-baslama' }, el('span', { textContent: 'Belirtiler: ' }), el('strong', { textContent: tip.baslama })),
      el('ul', {}, ...tip.belirtiler.map((b) => el('li', { textContent: b }))),
      el('p', { textContent: tip.uyari }),
      el('p', { className: 'not', textContent: ERKEN_BASLAMA_UYARISI }),
      el('div', { className: 'zehir-ara' },
        el('a', { className: 'zehir-ara-114', href: 'tel:114', textContent: '114 Zehir Danışma' }),
        el('a', { className: 'zehir-ara-112', href: 'tel:112', textContent: '112 Acil' }),
      ),
      el('p', { className: 'not', textContent: 'Taslak bilgi; bir hekim ve UZEM yayınlarıyla doğrulanacak.' }),
    ),
  );
}
