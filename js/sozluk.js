// Terimler sözlüğü (Ansiklopedi sekmesi). "cizim" js/cizimler.js'teki bir çizimin adıdır;
// "foto" aşağıdaki SOZLUK_FOTOGRAFLARI'ndan, üzerinde bölümleri işaretlenmiş gerçek bir fotoğraftır;
// fotoğrafı olan terimde çizim yerine fotoğraf gösterilir (Metin'in isteği, 2026-10-26: çizimler anlaşılmıyordu).

export const SOZLUK = [
  {
    terim: 'Mantarın bölümleri',
    tanim: 'Bir mantarı tanırken bu bölümlerin her birine ayrı ayrı bakılır.',
    cizim: 'anatomi',
    foto: 'anatomi',
  },
  {
    terim: 'Şapka',
    tanim: 'Mantarın üstteki, şemsiyeye benzeyen kısmı. Rengi ve yüzeyindeki pul ya da lekeler tanımada önemlidir.',
    cizim: 'ust',
    foto: 'sapka',
  },
  {
    terim: 'Solungaç',
    tanim: 'Şapkanın altındaki ince, yaprak gibi dizilmiş katmanlar. Rengi çok önemlidir: bazı ölümcül türlerde solungaçlar beyazdır.',
    cizim: 'alt-solungac',
    foto: 'solungac',
  },
  {
    terim: 'Gözenek',
    tanim: 'Bazı mantarlarda şapkanın altında solungaç yerine sünger gibi küçük delikler bulunur.',
    cizim: 'alt-gozenek',
    foto: 'gozenek',
  },
  {
    terim: 'Diken',
    tanim: 'Bazı türlerde şapkanın altı, aşağı sarkan küçük dikenlerle kaplıdır.',
    cizim: 'alt-diken',
    foto: 'diken',
  },
  {
    terim: 'Halka',
    tanim: 'Ayağın üst kısmında etek gibi sarkan zar. Genç mantarda solungaçları örten zarın kalıntısıdır.',
    cizim: 'halka',
    foto: 'halka',
  },
  {
    terim: 'Volva',
    tanim: 'Ayağın dibindeki torba ya da kese. Çoğu zaman toprağın içinde kalır. Bu yüzden mantar koparılmaz, toprak açılarak çıkarılır.',
    cizim: 'volva',
    foto: 'volva',
  },
  {
    terim: 'Genç evre (yumurta)',
    tanim: 'Mantarın şapkası açılmadan önceki hali. Ölümcül türler bu evrede yenen mantarlara çok benzer; ikiye kesilip içine bakılmalıdır.',
    cizim: 'genc',
    foto: 'genc',
  },
  {
    terim: 'Süt (lateks)',
    tanim: 'Bazı mantarlar kesilince ya da çizilince süt gibi bir sıvı salar. Sıvının rengi ve havada rengi değişip değişmediği önemlidir.',
    cizim: 'sut',
    foto: 'sut',
  },
  {
    terim: 'Spor izi',
    tanim: 'Şapkanın birkaç saat içinde kâğıda bıraktığı toz izi. Rengi, birbirine benzeyen türleri ayırmaya yardım eder.',
    cizim: 'sporIzi',
    foto: 'spor-izi',
  },
];

// Sözlükteki gerçek fotoğraflar (Wikimedia Commons, ticari kullanıma izin veren lisanslar).
// commonsDosyasi: Wikimedia Commons'taki dosyanın adı (lisans sayfası). isaretler: x, y = işaretlenen nokta; yx, yy = yazının yeri (fotoğrafın yüzdesi olarak).
// Çeken adı ve lisans fotoğrafın altında gösterilmek zorundadır (test denetler).
export const SOZLUK_FOTOGRAFLARI = {
  'anatomi': {
    dosya: 'fotograflar/sozluk-anatomi.jpg',
    genislik: 800,
    yukseklik: 960,
    ornek: 'Köygöçüren (Amanita phalloides), ölümcül',
    cekan: 'Archenzo',
    lisans: 'CC BY-SA 3.0',
    commonsDosyasi: 'Amanita_phalloides_1.JPG',
    isaretler: [
      { metin: 'Şapka', x: 40, y: 8, yx: 25, yy: 3 },
      { metin: 'Solungaçlar', x: 70, y: 24, yx: 90, yy: 7 },
      { metin: 'Halka', x: 55, y: 31, yx: 90, yy: 39 },
      { metin: 'Ayak', x: 54, y: 46, yx: 75, yy: 56 },
      { metin: 'Volva', x: 75, y: 81, yx: 90, yy: 93 },
      { metin: 'Genç mantar', x: 20, y: 56, yx: 5, yy: 39 },
    ],
  },
  'sapka': {
    dosya: 'fotograflar/sozluk-sapka.jpg',
    genislik: 800,
    yukseklik: 809,
    ornek: 'Panter mantarı (Amanita pantherina), zehirli',
    cekan: 'George Chernilevsky',
    lisans: 'Kamu malı',
    commonsDosyasi: 'Amanita_pantherina_2013_G1.jpg',
    isaretler: [
      { metin: 'Şapka', x: 63, y: 29, yx: 85, yy: 8 },
      { metin: 'Pullar (beyaz lekeler)', x: 27, y: 29, yx: 12, yy: 8 },
      { metin: 'Ayak', x: 56, y: 79, yx: 80, yy: 84 },
    ],
  },
  'solungac': {
    dosya: 'fotograflar/sozluk-solungac.jpg',
    genislik: 800,
    yukseklik: 600,
    ornek: 'Tür belirtilmemiş',
    cekan: 'Jonathan Cutrer',
    lisans: 'CC BY 2.0',
    commonsDosyasi: 'Mushroom_underside_(Gills)_(29097123352).jpg',
    isaretler: [
      { metin: 'Solungaçlar', x: 30, y: 30, yx: 14, yy: 12 },
      { metin: 'Ayak', x: 60, y: 75, yx: 82, yy: 86 },
    ],
  },
  'gozenek': {
    dosya: 'fotograflar/sozluk-gozenek.jpg',
    genislik: 800,
    yukseklik: 784,
    ornek: 'Boletus curtisii',
    cekan: 'Alan Rockefeller (Mushroom Observer)',
    lisans: 'CC BY-SA 3.0',
    commonsDosyasi: 'Boletus_curtisii_173783.jpg',
    isaretler: [
      { metin: 'Gözenekler (sünger)', x: 64, y: 40, yx: 72, yy: 8 },
      { metin: 'Ayak (kesilmiş)', x: 22, y: 45, yx: 14, yy: 74 },
      { metin: 'Şapkanın kenarı', x: 86, y: 62, yx: 80, yy: 94 },
    ],
  },
  'diken': {
    dosya: 'fotograflar/sozluk-diken.jpg',
    genislik: 800,
    yukseklik: 490,
    ornek: 'Hydnum repandum',
    cekan: 'Rosser1954',
    lisans: 'CC BY-SA 4.0',
    commonsDosyasi: 'Hydnum_repandum._The_Hedgehog_Fungus_spore_bearing_spines.jpg',
    isaretler: [
      { metin: 'Dikenler', x: 52, y: 45, yx: 78, yy: 30 },
      { metin: 'Şapkanın üstü', x: 22, y: 18, yx: 12, yy: 32 },
    ],
  },
  'halka': {
    dosya: 'fotograflar/sozluk-halka.jpg',
    genislik: 552,
    yukseklik: 608,
    ornek: 'Köygöçüren (Amanita phalloides), ölümcül',
    cekan: 'Archenzo',
    lisans: 'CC BY-SA 3.0',
    commonsDosyasi: 'Amanita_phalloides_1.JPG',
    isaretler: [
      { metin: 'Halka', x: 48, y: 63, yx: 91, yy: 84 },
      { metin: 'Solungaçlar', x: 78, y: 47, yx: 96, yy: 11 },
      { metin: 'Ayak', x: 48, y: 84, yx: 17, yy: 89 },
    ],
  },
  'volva': {
    dosya: 'fotograflar/sozluk-volva.jpg',
    genislik: 800,
    yukseklik: 1091,
    ornek: 'Amanita ovoidea',
    cekan: 'Archenzo',
    lisans: 'CC BY-SA 3.0',
    commonsDosyasi: 'Amanita_ovoidea.JPG',
    isaretler: [
      { metin: 'Volva (torba)', x: 50, y: 73, yx: 86, yy: 73 },
      { metin: 'Ayak', x: 45, y: 40, yx: 14, yy: 51 },
      { metin: 'Solungaçlar', x: 20, y: 31, yx: 9, yy: 6 },
    ],
  },
  'genc': {
    dosya: 'fotograflar/sozluk-genc.jpg',
    genislik: 800,
    yukseklik: 635,
    ornek: 'Yumurta mantarı (Amanita caesarea), yumurta evresinde. Ölümcül köygöçüren de bu evrede beyaz bir yumurtaya benzer.',
    cekan: 'Alessandroferri',
    lisans: 'CC BY-SA 4.0',
    commonsDosyasi: 'Esemplare_di_Amanita_caesarea.JPG',
    isaretler: [
      { metin: 'Yumurta (dış zar)', x: 35, y: 58, yx: 15, yy: 87 },
      { metin: 'Açılmaya başlayan şapka', x: 46, y: 45, yx: 77, yy: 16 },
    ],
  },
  'sut': {
    dosya: 'fotograflar/sozluk-sut.jpg',
    genislik: 748,
    yukseklik: 498,
    ornek: 'Lactarius volemus',
    cekan: 'Amadej Trnkoczy (Mushroom Observer)',
    lisans: 'CC BY-SA 3.0',
    commonsDosyasi: 'Lactarius_volemus_119888.jpg',
    isaretler: [
      { metin: 'Süt damlası', x: 41, y: 38, yx: 56, yy: 20 },
      { metin: 'Süt damlası', x: 67, y: 82, yx: 84, yy: 94 },
      { metin: 'Solungaçlar', x: 30, y: 62, yx: 14, yy: 92 },
    ],
  },
  'spor-izi': {
    dosya: 'fotograflar/sozluk-spor-izi.jpg',
    genislik: 800,
    yukseklik: 800,
    ornek: 'Entoloma conferendum',
    cekan: 'AJC1',
    lisans: 'CC BY-SA 2.0',
    commonsDosyasi: 'How_to_make_a_fungal_spore_print_(23541108448).jpg',
    isaretler: [
      { metin: 'Spor izi (kâğıtta)', x: 28, y: 70, yx: 20, yy: 98 },
      { metin: 'Ayağın durduğu yer', x: 50, y: 49, yx: 76, yy: 4 },
    ],
  },
};
