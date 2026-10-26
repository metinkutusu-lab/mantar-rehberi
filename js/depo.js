// Cihazdaki küçük kayıt deposu (IndexedDB). Resim gibi büyük veriler için.
// Hiçbir şey cihazdan çıkmaz (kural 12). Depo kullanılamazsa sessizce vazgeçilir.
const VERITABANI = 'mantar-rehberi';
const DEPO = 'kayitlar';

function ac() {
  return new Promise((coz, reddet) => {
    const istek = indexedDB.open(VERITABANI, 2);
    istek.onupgradeneeded = () => {
      if (!istek.result.objectStoreNames.contains(DEPO)) istek.result.createObjectStore(DEPO);
    };
    istek.onsuccess = () => coz(istek.result);
    istek.onerror = () => reddet(istek.error);
  });
}

async function islem(kip, yap) {
  const vt = await ac();
  return new Promise((coz, reddet) => {
    const tx = vt.transaction(DEPO, kip);
    const istek = yap(tx.objectStore(DEPO));
    tx.oncomplete = () => coz(istek.result);
    tx.onerror = () => reddet(tx.error);
  });
}

export async function kaydet(anahtar, deger) {
  try {
    await islem('readwrite', (depo) => depo.put(deger, anahtar));
  } catch {
    // Kayıt yapılamadı; özellik o cihazda çalışmaz ama uygulama devam eder.
  }
}

export async function oku(anahtar) {
  try {
    return await islem('readonly', (depo) => depo.get(anahtar));
  } catch {
    return undefined;
  }
}
