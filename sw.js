// Çevrimdışı çalışma: uygulamanın bütün dosyaları ilk açılışta cihaza kaydedilir.
// Yeni dosya eklenince DOSYALAR listesine ekle ve SURUM'u artır.
const SURUM = 'v17';
// GitHub Pages'te aynı adreste başka uygulamalar da olabilir: önbellek adı bu uygulamaya ve adresine özeldir,
// yalnızca kendi eski sürümlerini siler.
const ONEK = `mantar-rehberi:${self.registration.scope}:`;
const ONBELLEK = ONEK + SURUM;
const DOSYALAR = [
  './',
  './index.html',
  './manifest.webmanifest',
  './stil.css',
  './anahtar.js',
  './cizimler.js',
  './depo.js',
  './dom.js',
  './durum.js',
  './egitim.js',
  './kurallar.js',
  './mevsim.js',
  './ozet.js',
  './sorular.js',
  './sozluk.js',
  './tanimla.js',
  './turler.js',
  './uygulama.js',
  './yagmur.js',
  './yagmurKarti.js',
  './turler.json',
  './ikon-192.png',
  './ikon-512.png',
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
