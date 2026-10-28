// Çevrimdışı çalışma: uygulamanın bütün dosyaları ilk açılışta cihaza kaydedilir.
// Yeni dosya eklenince DOSYALAR listesine ekle ve SURUM'u artır.
const SURUM = 'v78';
// GitHub Pages'te aynı adreste başka uygulamalar da olabilir: önbellek adı bu uygulamaya ve adresine özeldir,
// yalnızca kendi eski sürümlerini siler.
const ONEK = `mantar-rehberi:${self.registration.scope}:`;
const ONBELLEK = ONEK + SURUM;
// Mantar ara haritasının parçaları ayrı önbellekte durur ve sürüm değişince silinmez
// (indirilmiş bölgeler internetsiz çalışsın). Yalnızca js/harita.js'teki iki adresin parçaları buraya girer.
const HARITA_ONBELLEGI = ONEK + 'harita';
const HARITA_ADRESLERI = ['https://tiles.openfreemap.org/', 'https://s3.amazonaws.com/elevation-tiles-prod/'];
const AZAMI_HARITA_PARCASI = 6000;
// Fotoğraf kıyası modeli (js/fotoTanima.js, yaklaşık 5 MB): uygulamayla indirilmez; ilk fotoğraflı tanımlamada bir kez iner,
// ayrı önbellekte kalır ve sürüm değişince silinmez (yeniden veri harcanmasın, internetsiz çalışsın).
const MODEL_ONBELLEGI = ONEK + 'model';
// Telefondaki model ve ayırıcıları: js/modelAyari.js'teki klasörle aynı olmalı (test denetler). Model değişince eski
// klasörün dosyaları model önbelleğinden silinir (eski modelle yeni ayırıcı karışmasın, yer kaplamasın).
const AKTIF_MODEL_KLASORU = 'vendor/mantar-modeli-1/';
const MODEL_YOLLARI = ['vendor/tf.min.js', 'vendor/mobilenet/', 'vendor/mantar-modeli'];
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
  './js/siradaki.js',
  './js/hizliTanimla.js',
  './js/fotoTanima.js',
  './js/kamera.js',
  './js/sesliKomut.js',
  './js/zehir.js',
  './js/isaretliFoto.js',
  './js/surum.js',
  './js/surumSatiri.js',
  './js/fotoOzellik.js',
  './js/modelAyari.js',
  './js/mevsimAgirligi.js',
  './veri/mevsim.json',
  // Harita kütüphanesi MapLibre GL JS 4.7.1 (BSD-3, vendor/LICENSE.txt)
  './vendor/maplibre-gl.js',
  './vendor/maplibre-gl.css',
  './veri/turler.json',
  './ikonlar/ikon-192.png',
  './ikonlar/ikon-512.png',
  './ikonlar/ikon-maskeli-192.png',
  './ikonlar/ikon-maskeli-512.png',
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
  './fotograflar/ballica.jpg',
  './fotograflar/beyaz-truf.jpg',
  './fotograflar/casir.jpg',
  './fotograflar/kara-truf.jpg',
  './fotograflar/sahte-truf.jpg',
  './fotograflar/keme.jpg',
  './fotograflar/mayis.jpg',
  './fotograflar/mor-kadife.jpg',
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
  './fotograflar/ak-tuylu-sut.jpg',
  './fotograflar/sararan-sut.jpg',
  './fotograflar/kusakli-sut.jpg',
  './fotograflar/sahte-horoz.jpg',
  './fotograflar/terleme.jpg',
  './fotograflar/yuksuk.jpg',
  './fotograflar/aci-corek.jpg',
  './fotograflar/yumurta.jpg',
  './fotograflar/zeytin.jpg',
];

// Fotoğraflar ayrı önbellekte durur ve her sürümde yeniden inmez (güncelleme hızlı gelsin; yalnızca yeni eklenen fotoğraf iner).
// Var olan bir fotoğrafı aynı adla değiştirirsen FOTO_SURUM'u da artır.
const FOTO_SURUM = 'f1';
const FOTO_ONBELLEGI = ONEK + 'foto-' + FOTO_SURUM;
const fotografMi = (d) => d.startsWith('./fotograflar/');

// Dosya her sürümde yeni adresle istenir (?s=v44): ne tarayıcının ne de GitHub'ın ara önbelleği eski bir dosya verebilir.
// Cihaza adres eki olmadan yazılır.
async function indirVeYaz(onbellek, dosya) {
  const yanit = await fetch(new Request(`${dosya}?s=${SURUM}`, { cache: 'reload' }));
  if (!yanit.ok) throw new Error(`${dosya} indirilemedi`);
  await onbellek.put(dosya, yanit);
}

self.addEventListener('install', (olay) => {
  olay.waitUntil(
    (async () => {
      const onbellek = await caches.open(ONBELLEK);
      const fotoOnbellegi = await caches.open(FOTO_ONBELLEGI);
      await Promise.all(
        DOSYALAR.map(async (d) => {
          if (!fotografMi(d)) return indirVeYaz(onbellek, d);
          if (!(await fotoOnbellegi.match(d))) await indirVeYaz(fotoOnbellegi, d);
        }),
      );
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (olay) => {
  olay.waitUntil(
    caches
      .keys()
      .then((adlar) =>
        Promise.all(adlar.filter((ad) => ad.startsWith(ONEK) && ![ONBELLEK, FOTO_ONBELLEGI, HARITA_ONBELLEGI, MODEL_ONBELLEGI].includes(ad)).map((ad) => caches.delete(ad))),
      )
      .then(haritaOnbelleginiSinirla)
      // Eski kıyas dosyası (v44'te yerini tur-ayirici.json aldı) cihazda yer kaplamasın.
      .then(async () => {
        const model = await caches.open(MODEL_ONBELLEGI);
        for (const a of await model.keys()) {
          const yol = new URL(a.url).pathname;
          const eskiModel = yol.includes('/vendor/') && !yol.includes('/vendor/tf.min.js') && !yol.includes(`/${AKTIF_MODEL_KLASORU}`);
          if (a.url.includes('parmak-izleri.json') || eskiModel) await model.delete(a);
        }
      })
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

// Tür ayırıcısı güncellenebilir (yeni fotoğraflarla yeniden eğitilince): cihazdaki kopya hemen kullanılır,
// internet varsa arkada yenisi indirilip saklanır (bir sonraki tanımlamada kullanılır). Büyük model dosyaları yeniden inmez.
async function izYaniti(olay) {
  const onbellek = await caches.open(MODEL_ONBELLEGI);
  const kayitli = await onbellek.match(olay.request, { ignoreSearch: true });
  const tazele = fetch(olay.request, { cache: 'no-cache' }).then((yanit) => {
    if (yanit.ok) onbellek.put(olay.request, yanit.clone());
    return yanit;
  });
  if (kayitli) {
    olay.waitUntil(tazele.catch(() => {}));
    return kayitli;
  }
  return tazele;
}

// Model dosyaları: önce cihazdan; yoksa ağdan indirilip cihaza yazılır.
async function modelYaniti(istek) {
  const onbellek = await caches.open(MODEL_ONBELLEGI);
  const kayitli = await onbellek.match(istek, { ignoreSearch: true });
  if (kayitli) return kayitli;
  const yanit = await fetch(istek);
  if (yanit.ok) onbellek.put(istek, yanit.clone());
  return yanit;
}

// Önce cihazdaki kopya; yoksa ağdan.
self.addEventListener('fetch', (olay) => {
  if (olay.request.method !== 'GET') return;
  if (HARITA_ADRESLERI.some((a) => olay.request.url.startsWith(a))) {
    olay.respondWith(haritaYaniti(olay.request));
    return;
  }
  const yol = new URL(olay.request.url).pathname;
  if (new URL(olay.request.url).origin === self.location.origin && /\/vendor\/(mobilenet|mantar-modeli[^/]*)\/(tur-ayirici|alt-yapi|sapka-rengi)\.json$/.test(yol)) {
    olay.respondWith(izYaniti(olay));
    return;
  }
  if (new URL(olay.request.url).origin === self.location.origin && MODEL_YOLLARI.some((m) => yol.includes(`/${m}`))) {
    olay.respondWith(modelYaniti(olay.request));
    return;
  }
  olay.respondWith(
    (async () => {
      const kayitli =
        (await (await caches.open(ONBELLEK)).match(olay.request, { ignoreSearch: true })) ??
        (await (await caches.open(FOTO_ONBELLEGI)).match(olay.request, { ignoreSearch: true }));
      return kayitli ?? fetch(olay.request);
    })(),
  );
});
