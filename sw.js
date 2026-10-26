// Çevrimdışı çalışma: uygulamanın bütün dosyaları ilk açılışta cihaza kaydedilir.
// Yeni dosya eklenince DOSYALAR listesine ekle ve SURUM'u artır.
const SURUM = 'v31';
// GitHub Pages'te aynı adreste başka uygulamalar da olabilir: önbellek adı bu uygulamaya ve adresine özeldir,
// yalnızca kendi eski sürümlerini siler.
const ONEK = `mantar-rehberi:${self.registration.scope}:`;
const ONBELLEK = ONEK + SURUM;
// Mantar ara haritasının parçaları ayrı önbellekte durur ve sürüm değişince silinmez
// (indirilmiş bölgeler internetsiz çalışsın). Yalnızca js/harita.js'teki iki adresin parçaları buraya girer.
const HARITA_ONBELLEGI = ONEK + 'harita';
const HARITA_ADRESLERI = ['https://tiles.openfreemap.org/', 'https://s3.amazonaws.com/elevation-tiles-prod/'];
const AZAMI_HARITA_PARCASI = 6000;
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
  './js/yerlerim.js',
  './js/anaKart.js',
  './js/harita.js',
  './js/mantarAra.js',
  './js/uygunluk.js',
  './js/pusula.js',
  './js/ses.js',
  // Harita kütüphanesi MapLibre GL JS 4.7.1 (BSD-3, vendor/LICENSE.txt)
  './vendor/maplibre-gl.js',
  './vendor/maplibre-gl.css',
  './veri/turler.json',
  './ikonlar/ikon-192.png',
  './ikonlar/ikon-512.png',
  // Ansiklopedi fotoğrafları (Wikimedia Commons; lisans ve çeken veri/turler.json'da)
  './fotograflar/sozluk-anatomi.jpg',
  './fotograflar/sozluk-diken.jpg',
  './fotograflar/sozluk-genc.jpg',
  './fotograflar/sozluk-gozenek.jpg',
  './fotograflar/sozluk-halka.jpg',
  './fotograflar/sozluk-sapka.jpg',
  './fotograflar/sozluk-solungac.jpg',
  './fotograflar/sozluk-spor-izi.jpg',
  './fotograflar/sozluk-sut.jpg',
  './fotograflar/sozluk-volva.jpg',
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
        Promise.all(adlar.filter((ad) => ad.startsWith(ONEK) && ad !== ONBELLEK && ad !== HARITA_ONBELLEGI).map((ad) => caches.delete(ad))),
      )
      .then(haritaOnbelleginiSinirla)
      .then(() => self.clients.claim()),
  );
});

// Harita önbelleği çok büyümesin: en eski parçalar silinir.
async function haritaOnbelleginiSinirla() {
  const onbellek = await caches.open(HARITA_ONBELLEGI);
  const anahtarlar = await onbellek.keys();
  await Promise.all(anahtarlar.slice(0, Math.max(0, anahtarlar.length - AZAMI_HARITA_PARCASI)).map((a) => onbellek.delete(a)));
}

// Harita: parçalar (.pbf, .png) önce cihazdan; stil ve bilgi dosyaları (.json) önce ağdan (güncel kalsın).
// Ağdan gelen her yanıt cihaza da yazılır; internet yokken oradan okunur.
async function haritaYaniti(istek) {
  const onbellek = await caches.open(HARITA_ONBELLEGI);
  const json = new URL(istek.url).pathname.endsWith('.json') || istek.url.includes('/styles/') || /\/planet\/?$/.test(istek.url);
  if (!json) {
    const kayitli = await onbellek.match(istek);
    if (kayitli) return kayitli;
  }
  try {
    const yanit = await fetch(istek);
    if (yanit.ok) onbellek.put(istek, yanit.clone());
    return yanit;
  } catch (hata) {
    const kayitli = await onbellek.match(istek);
    if (kayitli) return kayitli;
    throw hata;
  }
}

// Önce cihazdaki kopya; yoksa ağdan.
self.addEventListener('fetch', (olay) => {
  if (olay.request.method !== 'GET') return;
  if (HARITA_ADRESLERI.some((a) => olay.request.url.startsWith(a))) {
    olay.respondWith(haritaYaniti(olay.request));
    return;
  }
  olay.respondWith(
    caches
      .open(ONBELLEK)
      .then((onbellek) => onbellek.match(olay.request, { ignoreSearch: true }))
      .then((kayitli) => kayitli ?? fetch(olay.request)),
  );
});
