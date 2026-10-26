// Çevrimdışı çalışma: uygulamanın bütün dosyaları ilk açılışta cihaza kaydedilir.
// Yeni dosya eklenince DOSYALAR listesine ekle ve SURUM'u artır.
const SURUM = 'v22';
// GitHub Pages'te aynı adreste başka uygulamalar da olabilir: önbellek adı bu uygulamaya ve adresine özeldir,
// yalnızca kendi eski sürümlerini siler.
const ONEK = `mantar-rehberi:${self.registration.scope}:`;
const ONBELLEK = ONEK + SURUM;
const DOSYALAR = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/stil.css',
  './js/anahtar.js',
  './js/cizimler.js',
  './js/depo.js',
  './js/dom.js',
  './js/durum.js',
  './js/egitim.js',
  './js/kurallar.js',
  './js/mevsim.js',
  './js/ozet.js',
  './js/sorular.js',
  './js/sozluk.js',
  './js/tanimla.js',
  './js/turler.js',
  './js/uygulama.js',
  './js/yagmur.js',
  './js/yagmurKarti.js',
  './veri/turler.json',
  './ikonlar/ikon-192.png',
  './ikonlar/ikon-512.png',
  // Ansiklopedi fotoğrafları (Wikimedia Commons; lisans ve çeken veri/turler.json'da)
  './fotograflar/ak-koygocuren.jpg',
  './fotograflar/ayi-mantari.jpg',
  './fotograflar/buyuk-semsiye.jpg',
  './fotograflar/cayir.jpg',
  './fotograflar/cortinarius.jpg',
  './fotograflar/entoloma.jpg',
  './fotograflar/galerina.jpg',
  './fotograflar/horozmantari.jpg',
  './fotograflar/inocybe.jpg',
  './fotograflar/istiridye.jpg',
  './fotograflar/kanlica.jpg',
  './fotograflar/koygocuren.jpg',
  './fotograflar/kucuk-semsiye.jpg',
  './fotograflar/kukurt-basli.jpg',
  './fotograflar/kuzugobegi.jpg',
  './fotograflar/panter.jpg',
  './fotograflar/puf.jpg',
  './fotograflar/sahte-kuzugobegi.jpg',
  './fotograflar/sahte-puf.jpg',
  './fotograflar/sariya-boyanan.jpg',
  './fotograflar/seytan.jpg',
  './fotograflar/sinek.jpg',
  './fotograflar/tavuk.jpg',
  './fotograflar/tuylu-sut.jpg',
  './fotograflar/yumurta.jpg',
  './fotograflar/zeytin.jpg',
];

self.addEventListener('install', (olay) => {
  // Tarayıcının HTTP önbelleği atlanır: yeni sürüme eski bir dosya karışmasın.
  olay.waitUntil(
    caches.open(ONBELLEK).then((onbellek) => onbellek.addAll(DOSYALAR.map((d) => new Request(d, { cache: 'reload' })))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (olay) => {
  olay.waitUntil(
    caches
      .keys()
      .then((adlar) =>
        Promise.all(adlar.filter((ad) => ad.startsWith(ONEK) && ad !== ONBELLEK).map((ad) => caches.delete(ad))),
      )
      .then(() => self.clients.claim()),
  );
});

// Önce cihazdaki kopya; yoksa ağdan.
self.addEventListener('fetch', (olay) => {
  if (olay.request.method !== 'GET') return;
  olay.respondWith(
    caches
      .open(ONBELLEK)
      .then((onbellek) => onbellek.match(olay.request, { ignoreSearch: true }))
      .then((kayitli) => kayitli ?? fetch(olay.request)),
  );
});
