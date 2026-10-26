// Güvenlik eğitimi içeriği (kural 11). Metinler kural 1 ve 14'e uymalıdır; testler bunu denetler.

export const DERSLER = [
  {
    baslik: 'Bu uygulama sana "ye" demez',
    paragraflar: [
      'Bu uygulama, bulduğun mantarın hangi tür olabileceğini düşünmene yardım eder ve tehlikeli olanlar için seni uyarır.',
      'Ama hiçbir zaman "bunu yiyebilirsin" demez. Bazı ölümcül mantarlar, yenen mantarlara çok benzer. Fotoğraf ya da birkaç soru bu farkı her zaman yakalayamaz.',
      'Bir mantarı yemeden önce son kararı her zaman bir mantar uzmanı verir.',
    ],
  },
  {
    baslik: 'Sonuç üç renkten biridir',
    paragraflar: [
      'Yeşil renk yoktur, çünkü uygulama bir mantarın yenmeye uygun olduğuna tek başına karar veremez.',
      'Birden fazla olasılık varsa sonuç her zaman en tehlikelisine göre verilir.',
    ],
    renkler: true,
  },
  {
    baslik: 'Genç mantarlar en tehlikelisi',
    paragraflar: [
      'Ölümcül mantarlar gençken beyaz, yuvarlak bir yumurtaya benzer. Bu haliyle yenen yumurta mantarlarına ve genç tarla mantarlarına çok benzerler.',
      'Küçük, yuvarlak bir mantarı her zaman tepeden aşağı ikiye kes. İçeride şapka ve ayak şeklinde bir taslak görürsen o mantara dokunma.',
    ],
  },
  {
    baslik: 'Ayak dibine bak',
    paragraflar: [
      'Mantarı koparma. Bıçakla etrafındaki toprağı açarak, ayağın en dibiyle birlikte çıkar.',
      'Bazı ölümcül türlerin ayak dibinde bir torba (volva) olur ve bu torba çoğu zaman toprağın içinde kalır. Koparırsan en önemli işareti kaybedersin.',
    ],
  },
  {
    baslik: 'Emin değilsen "Bilmiyorum" de',
    paragraflar: [
      'Sorulara tahminle cevap verme. Emin değilsen "Bilmiyorum" seç. Uygulama o zaman "yemeyin" der ve bu doğru sonuçtur.',
      'Halk arasında bilinen yöntemler zehirli mantarı ayırt etmez: gümüş kaşığın kararması, soğanla pişirme, hayvanların ya da böceklerin yemiş olması, şapkanın kolay soyulması. Hiçbirine güvenme.',
      'Pişirmek, kurutmak, dondurmak veya haşlayıp suyunu dökmek ölümcül mantarların zehrini yok etmez.',
    ],
  },
  {
    baslik: 'Zehirlenme şüphesinde',
    paragraflar: [
      '114 Zehir Danışma Hattı\'nı ya da 112\'yi ara. Sağ üstteki kırmızı ACİL butonu her ekrandan bu numaralara ulaştırır, internetsiz de çalışır.',
      'Mantarın bir parçasını sakla ve hastaneye götür.',
      'Belirtiler saatler sonra başlayabilir ve geçmiş gibi görünebilir. Yine de hastaneye git.',
    ],
  },
];

export const SORULAR = [
  {
    soru: 'Uygulama sarı sonuç verdi. Ne yaparsın?',
    secenekler: [
      { metin: 'Hemen pişirip yerim.', dogru: false },
      { metin: 'Bir mantar uzmanına gösteririm, o onaylamadan yemem.', dogru: true },
    ],
    aciklama: 'Sarı "muhtemelen" demektir. Son kararı her zaman bir uzman verir.',
  },
  {
    soru: 'Bir soruda cevabından emin değilsin. Ne seçersin?',
    secenekler: [
      { metin: 'En yakın tahmini seçerim.', dogru: false },
      { metin: '"Bilmiyorum" seçerim.', dogru: true },
    ],
    aciklama: 'Tahmin, ölümcül bir mantarı yenen bir türe benzetebilir. "Bilmiyorum" doğru cevaptır.',
  },
  {
    soru: 'Küçük, yuvarlak, beyaz bir mantar buldun. İlk ne yaparsın?',
    secenekler: [
      { metin: 'Küçük olduğu için zehri azdır diye toplarım.', dogru: false },
      { metin: 'Tepeden aşağı ikiye kesip içine bakarım.', dogru: true },
    ],
    aciklama: 'Ölümcül mantarlar gençken tam böyle görünür. Kesince içeride taslak varsa dokunma.',
  },
  {
    soru: 'Mantarı pişirirken içine attığın gümüş kaşık kararmadı. Bu ne anlama gelir?',
    secenekler: [
      { metin: 'Hiçbir şey. Bu yöntem zehirli mantarı ayırt etmez.', dogru: true },
      { metin: 'Mantarda zehir yoktur.', dogru: false },
    ],
    aciklama: 'Gümüş kaşık, soğan ve benzeri yöntemler zehirli mantarı ayırt etmez.',
  },
];

export const FERAGAT_MADDELERI = [
  'Bu uygulamanın eğitim amaçlı bir rehber olduğunu ve bir mantarı yemeye tek başına bununla karar verilemeyeceğini anlıyorum.',
  'Bir mantarı yemeden önce mutlaka bir mantar uzmanına göstereceğim.',
  'Uygulamanın yanılabileceğini ve yediğim mantarın sorumluluğunun bende olduğunu kabul ediyorum.',
];

export const FERAGAT_TASLAK_NOTU = 'Taslak metin: son hali bir avukat tarafından yazılacak.';
