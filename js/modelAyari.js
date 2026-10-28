// Telefonda çalışan fotoğraf modeli ve ona bağlı ayırıcılar (tür, şapka rengi, şapka altı) aynı klasörde durur.
// Model değişince klasör adı da değişir: telefondaki eski model önbellekte kalsa bile yeni ayırıcıyla karışmaz
// (eski klasörün önbelleği sw.js'te silinir; sw.js'teki AKTIF_MODEL_KLASORU bununla aynı olmalı, test denetler).
// cikis: modelden okunacak katmanın adı (null: modelin kendi çıkışı).
// Eğitim ve ölçüm betikleri, denedikleri aday modeli globalThis.MANTAR_MODEL ile verir; uygulama bunu hiç kullanmaz.
export const MODEL = globalThis.MANTAR_MODEL ?? {
  klasor: './vendor/mantar-modeli-1/',
  cikis: null,
};
