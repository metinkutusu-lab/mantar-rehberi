// Tanımlama adımları: uzmanın denetleyebileceği şeffaf soru tablosu (CLAUDE.md, tanımlama mimarisi).
// Her adım bir soru sorar; "soru" alanı cevabın adıdır ve veri/turler.json'daki "ozellikler" ile eşleşir.
// "kosul" olan adımlar yalnızca koşul sağlanınca sorulur.
// "cizim" ve seçeneklerin üçüncü öğesi js/cizimler.js'teki bir çizimin adıdır.
// Kural 14: hiçbir adım mantarı ağza almayı önermez.
// "sure" (saniye) olan adımlarda hızlı tanımlama sayaç kurar ve süre dolunca sesli haber verir
// (Metin'in isteği, 2026-10-26: "kes, şu kadar saniye bekle, ne renk?"). Eski akışta yalnızca yazı olarak durur.
import { BILMIYORUM } from './kurallar.js';

const EVET_HAYIR = [
  ['evet', 'Evet'],
  ['hayir', 'Hayır'],
];

export const ADIMLAR = [
  {
    soru: 'sapkaRengi',
    fotograf: 'ust',
    cizim: 'ust',
    baslik: 'Üstten fotoğraf',
    yonerge: ['Mantarı yerinden oynatmadan, tam üstünden çek.'],
    soruMetni: 'Şapkanın rengi ne?',
    secenekler: [
      ['beyaz', 'Beyaz'],
      ['krem-sari', 'Krem veya sarı'],
      ['kahverengi', 'Kahverengi'],
      ['kirmizi-turuncu', 'Kırmızı veya turuncu'],
      ['yesil-zeytin', 'Yeşilimsi veya zeytin'],
      ['gri-siyah', 'Gri veya siyah'],
      ['diger', 'Başka bir renk'],
    ],
  },
  {
    soru: 'kucukKahverengi',
    cizim: 'kucukKahverengi',
    baslik: 'Boyut ve renk',
    yonerge: [
      'Küçük kahverengi mantarların çok sayıda türü vardır ve aralarında ölümcül olanlar bulunur. Bunları birbirinden ayırmak uzmanlar için bile zordur.',
    ],
    soruMetni: 'Mantar küçük ve kahverengi ya da boz renkli mi?',
    secenekler: EVET_HAYIR,
  },
  {
    soru: 'genc',
    cizim: 'genc',
    baslik: 'Genç mi?',
    yonerge: ['Genç mantarın şapkası henüz açılmamıştır; yuvarlak bir top ya da yumurta gibi görünür.'],
    soruMetni: 'Mantar genç mi, şapkası henüz açılmamış mı?',
    secenekler: EVET_HAYIR,
  },
  {
    // Kural 13: genç mantar ikiye kesilip içine bakılır.
    soru: 'kesitteTaslak',
    kosul: (c) => c.genc === 'evet',
    fotograf: 'kesit',
    cizim: 'kesit-bicak',
    baslik: 'İkiye kes ve içine bak',
    uyari: 'Ölümcül mantarlar gençken tam böyle görünür. Bu adımı atlama.',
    yonerge: [
      'Bıçakla mantarı tepeden aşağı, tam ortasından ikiye kes.',
      'Kesitte, içeride küçük bir mantarın şekli (şapka ve ayak taslağı) görünüyor mu? Yoksa içi baştan sona düz ve tek renk mi?',
    ],
    soruMetni: 'İçeride mantar taslağı görüyor musun?',
    secenekler: [
      ['evet', 'Evet, içeride şekil var', 'kesit-evet'],
      ['hayir', 'Hayır, içi düz ve tek renk', 'kesit-hayir'],
    ],
  },
  {
    soru: 'altYapi',
    fotograf: 'alt',
    baslik: 'Alttan fotoğraf',
    yonerge: ['Mantarı ters çevir ya da telefonu altına tut ve şapkanın altını çek.'],
    soruMetni: 'Şapkanın altında ne var?',
    secenekler: [
      ['solungac', 'İnce yapraklar (solungaç)', 'alt-solungac'],
      ['gozenek', 'Sünger gibi delikler (gözenek)', 'alt-gozenek'],
      ['diken', 'Küçük dikenler', 'alt-diken'],
      ['duz', 'Düz veya kırışık yüzey', 'alt-duz'],
    ],
  },
  {
    soru: 'solungacRengi',
    kosul: (c) => c.altYapi === 'solungac',
    baslik: 'Solungaç rengi',
    yonerge: ['Solungaçlara gün ışığında bak.'],
    soruMetni: 'Solungaçlar ne renk?',
    secenekler: [
      ['beyaz', 'Beyaz'],
      ['krem-sari', 'Krem veya sarımsı'],
      ['pembe', 'Pembe'],
      ['kahverengi', 'Kahverengi'],
      ['koyu', 'Mor-kahve veya siyah'],
      ['diger', 'Başka bir renk'],
    ],
  },
  {
    soru: 'halka',
    fotograf: 'yan',
    cizim: 'halka',
    baslik: 'Yandan fotoğraf',
    yonerge: ['Mantarı yandan, ayağı görünecek şekilde çek.'],
    soruMetni: 'Ayakta etek gibi sarkan bir halka var mı?',
    secenekler: EVET_HAYIR,
  },
  {
    soru: 'volva',
    cizim: 'volva',
    baslik: 'Ayak dibine bak',
    uyari: 'Mantarı koparma. Bıçakla etrafındaki toprağı açarak ayağın en dibiyle birlikte çıkar.',
    yonerge: ['Bazı ölümcül türlerin ayak dibinde bir torba (volva) olur ve bu torba çoğu zaman toprağın içinde kalır.'],
    soruMetni: 'Ayağın dibinde torba ya da kese var mı?',
    secenekler: EVET_HAYIR,
    bilmiyorumMetni: 'Bilmiyorum / mantar koparılmıştı',
  },
  {
    soru: 'kesinceRenk',
    fotograf: 'kesit-sonra',
    sure: 300,
    sureMetni: 'Kestikten sonra 5 dakika bekle, sonra kesilen yüzeye bak.',
    cizim: 'kesinceRenk',
    baslik: 'Kesince renk değişimi',
    yonerge: [
      'Mantarı boyuna ikiye kes. Genç mantarı zaten kestiysen o kesite bak.',
      '5–10 dakika bekle ve kesilen yüzeye tekrar bak.',
    ],
    soruMetni: 'Kesilen yüzeyin rengi değişti mi?',
    secenekler: [
      ['degismedi', 'Değişmedi'],
      ['mavi', 'Maviye döndü'],
      ['kirmizi-pembe', 'Kırmızı veya pembeye döndü'],
      ['sari', 'Sarıya döndü'],
      ['diger', 'Başka bir renge döndü'],
    ],
  },
  {
    soru: 'sut',
    cizim: 'sut',
    sure: 10,
    sureMetni: 'Çizdikten sonra 10 saniye bekle ve çizdiğin yere bak.',
    baslik: 'Sıvı (süt) akıyor mu?',
    yonerge: ['Kesilen yüzeyi ya da solungaçları bıçağın ucuyla hafifçe çiz.'],
    soruMetni: 'Süt gibi bir sıvı çıkıyor mu?',
    secenekler: [
      ['yok', 'Hayır, sıvı çıkmıyor'],
      ['beyaz', 'Evet, beyaz'],
      ['turuncu-kirmizi', 'Evet, turuncu veya kırmızı'],
      ['diger', 'Evet, başka bir renk'],
    ],
  },
  {
    soru: 'ezince',
    sure: 30,
    sureMetni: 'Bastırdıktan sonra 30 saniye bekle, sonra bastırdığın yere bak.',
    baslik: 'Ezince renk değişimi',
    yonerge: ['Şapkayı veya ayağı parmağınla birkaç saniye bastır, sonra bak.'],
    soruMetni: 'Bastırdığın yerin rengi değişti mi?',
    secenekler: [
      ['degismedi', 'Değişmedi'],
      ['mavi', 'Maviye döndü'],
      ['sari', 'Sarıya döndü'],
      ['kirmizi-kahve', 'Kırmızı veya kahverengiye döndü'],
      ['diger', 'Başka bir renge döndü'],
    ],
  },
  {
    soru: 'koku',
    baslik: 'Koku',
    yonerge: ['Mantarı burnuna yaklaştırıp kokla. Kesilen yüzey kokuyu daha iyi verir.'],
    soruMetni: 'Nasıl kokuyor?',
    secenekler: [
      ['un', 'Un veya hamur'],
      ['anason', 'Anason'],
      ['turp', 'Turp veya çiğ patates'],
      ['kotu', 'Kötü, çürük'],
      ['kokusuz', 'Belirgin bir koku yok'],
      ['diger', 'Başka bir koku'],
    ],
  },
  {
    soru: 'zemin',
    baslik: 'Nerede büyüyordu?',
    yonerge: [],
    soruMetni: 'Mantar neyin üstünde büyüyordu?',
    secenekler: [
      ['toprak', 'Toprakta'],
      ['odun', 'Ağaç gövdesinde, kütükte veya dalda'],
      ['cayir', 'Çayırda, çimenlikte'],
    ],
  },
  {
    // Çoklu seçim (Metin'in isteği, 2026-10-26): bir yerde hem tarla, hem çamlık, hem meşelik olabilir.
    // Eleme temkinlidir: tür, seçilenlerden herhangi birine uyuyorsa aday kalır (kural 3).
    soru: 'agac',
    coklu: true,
    baslik: 'Çevrede neler var?',
    yonerge: ['Mantarın birkaç on metre çevresine bak. Birden fazla şey varsa hepsini işaretle.'],
    soruMetni: 'Çevrede neler var? (birden fazla seçebilirsin)',
    secenekler: [
      ['yaprakli', 'Yapraklı ağaçlar (meşe, kayın, kestane vb.)'],
      ['igne', 'İğne yapraklı ağaçlar (çam, ladin, göknar vb.)'],
      ['meyve', 'Meyve ağaçları, bahçe'],
      ['yok', 'Tarla, çayır veya açık arazi (ağaç yok)'],
    ],
    // Meyve ağaçları yapraklı ağaç sayılır.
    genislet: (secilenler) => (secilenler.includes('meyve') ? [...secilenler, 'yaprakli'] : secilenler),
  },
  {
    soru: 'sporIzi',
    cizim: 'sporIzi',
    baslik: 'Spor izi (isteğe bağlı)',
    yonerge: [
      'Şapkayı ayağından ayır. Solungaç tarafı aşağıda olacak şekilde yarısı beyaz, yarısı siyah bir kâğıdın üstüne koy ve üstünü bir bardakla kapat.',
      'Birkaç saat sonra kâğıtta kalan tozun rengine bak. Bu adımı şimdi yapamıyorsan "Yapmadım" seç.',
    ],
    soruMetni: 'Spor izinin rengi ne?',
    secenekler: [
      ['beyaz', 'Beyaz'],
      ['krem', 'Krem'],
      ['pembe', 'Pembe'],
      ['kahverengi', 'Kahverengi'],
      ['koyu', 'Mor-kahve veya siyah'],
      ['yapilmadi', 'Yapmadım'],
    ],
    bilmiyorumYok: true,
  },
];

// Kural 5: her soruda "Bilmiyorum" seçeneği bulunur (isteğe bağlı adımlar hariç).
export function adimSecenekleri(adim) {
  const secenekler = adim.secenekler.map(([deger, metin, cizim]) => ({ deger, metin, cizim }));
  if (!adim.bilmiyorumYok) {
    secenekler.push({ deger: BILMIYORUM, metin: adim.bilmiyorumMetni ?? 'Bilmiyorum / göremedim' });
  }
  return secenekler;
}

export function aktifAdimlar(cevaplar) {
  return ADIMLAR.filter((adim) => !adim.kosul || adim.kosul(cevaplar));
}

// Değerlendirmeye gidecek cevaplar: yalnızca sorulan adımların cevapları, artı türetilenler.
export function sonCevaplar(cevaplar) {
  const son = {};
  for (const adim of aktifAdimlar(cevaplar)) {
    if (cevaplar[adim.soru] !== undefined) son[adim.soru] = cevaplar[adim.soru];
  }
  // Solungaç rengi yalnızca solungaç varsa sorulur. Alt yapı bilinmiyorsa solungaç rengi de bilinmiyor sayılır.
  if (son.altYapi !== undefined && son.altYapi !== 'solungac') {
    son.solungacRengi = son.altYapi === BILMIYORUM ? BILMIYORUM : 'yok';
  }
  return son;
}

// Çoklu cevabın anahtarda karşılaştırılacak değerleri (adımın "genislet" kuralıyla).
export function cokluDegerler(soru, secilenler) {
  const adim = ADIMLAR.find((a) => a.soru === soru);
  return adim?.genislet ? adim.genislet(secilenler) : secilenler;
}

// Uzmana gönderilecek özet için soru ve cevapların okunur hali.
export function ozetSatirlari(cevaplar) {
  return aktifAdimlar(cevaplar).map((adim) => {
    const cevap = cevaplar[adim.soru];
    const secenekler = adimSecenekleri(adim);
    const metinler = [].concat(cevap ?? []).map((d) => secenekler.find((s) => s.deger === d)?.metin).filter(Boolean);
    return { soru: adim.soruMetni, cevap: metinler.length ? metinler.join(', ') : 'Cevaplanmadı' };
  });
}
