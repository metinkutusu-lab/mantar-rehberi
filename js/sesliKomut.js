// Sesli komutlar (hızlı tanımlama): "çek", "evet", "hayır", "bilmiyorum", "tekrar", "geri" ve seçenek adları.
// Yalnızca telefonun kendi içinde çalışan (internetsiz) Türkçe ses tanıma kullanılır: konuşma hiçbir
// sunucuya gitmez (kural 12). Telefon bunu desteklemiyorsa sesli komut kapalı kalır; düğmeler her zaman çalışır.

const Tanima = typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined;
const DIL = 'tr-TR';

let tanima = null;
let dinleyici = null;
let acik = false;

// Telefonda internetsiz Türkçe ses tanıma var mı? 'var' | 'indirilebilir' | 'yok'
export async function yerelTanimaDurumu() {
  if (!Tanima) return 'yok';
  try {
    if (typeof Tanima.available === 'function') {
      const d = await Tanima.available({ langs: [DIL], processLocally: true });
      if (d === 'available') return 'var';
      if (d === 'downloadable' || d === 'downloading') return 'indirilebilir';
      return 'yok';
    }
    if (typeof Tanima.availableOnDevice === 'function') {
      const d = await Tanima.availableOnDevice(DIL);
      if (d === 'available') return 'var';
      if (d === 'downloadable' || d === 'downloading') return 'indirilebilir';
    }
  } catch {
    // Desteklenmiyor.
  }
  return 'yok';
}

// Türkçe dil paketini telefona indirir (bir kez; internet gerekir, sonra internetsiz çalışır).
export async function yerelTanimayiKur() {
  try {
    if (typeof Tanima?.install === 'function') return await Tanima.install({ langs: [DIL], processLocally: true });
    if (typeof Tanima?.installOnDevice === 'function') return await Tanima.installOnDevice(DIL);
  } catch {
    // Kurulamadı.
  }
  return false;
}

// Türkçe karakterleri sadeleştirir: "Hayır" → "hayir".
export function sadele(metin) {
  return String(metin)
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const KOMUT_KELIMELERI = {
  tekrar: ['tekrar', 'yeniden oku', 'anlamadim'],
  geri: ['geri'],
  bilmiyorum: ['bilmiyorum', 'emin degilim', 'goremedim', 'gormedim'],
  cek: ['cek', 'cektim', 'fotograf'],
  devam: ['devam', 'ileri', 'tamam', 'baktim', 'simdi bak'],
};
const ANLAMSIZ = new Set(['veya', 'gibi', 'bir', 'evet', 'hayir']);

const iceriyor = (s, kelimeler) => kelimeler.some((k) => s.includes(` ${k} `));

/**
 * Söyleneni bir komuta çevirir. secenekler: [{ deger, metin }] (o anki sorunun seçenekleri).
 * Dönüş: { komut: 'cek' | 'tekrar' | 'geri' | 'devam' | 'secenek', deger? } ya da null.
 */
export function komutuAnla(soylenen, secenekler = []) {
  const s = ` ${sadele(soylenen)} `;
  if (iceriyor(s, KOMUT_KELIMELERI.tekrar)) return { komut: 'tekrar' };
  if (iceriyor(s, KOMUT_KELIMELERI.geri)) return { komut: 'geri' };
  if (secenekler.length) {
    if (iceriyor(s, KOMUT_KELIMELERI.bilmiyorum)) {
      const bilmiyorum = secenekler.find((x) => x.deger === 'bilmiyorum');
      if (bilmiyorum) return { komut: 'secenek', deger: bilmiyorum.deger };
    }
    // "Evet" / "hayır" ile başlayan seçenek önce; sonra seçenek metnindeki kelimeler ("beyaz", "kahverengi").
    const ilkKelime = s.trim().split(' ')[0];
    const evetHayir = secenekler.find((x) => ['evet', 'hayir'].includes(ilkKelime) && sadele(x.metin).startsWith(ilkKelime));
    if (evetHayir) return { komut: 'secenek', deger: evetHayir.deger };
    let enIyi = null;
    let enIyiPuan = 0;
    for (const secenek of secenekler) {
      const kelimeler = sadele(secenek.metin).split(' ').filter((k) => k.length >= 3 && !ANLAMSIZ.has(k));
      const puan = kelimeler.filter((k) => s.includes(` ${k}`)).length;
      if (puan > enIyiPuan) {
        enIyi = secenek;
        enIyiPuan = puan;
      }
    }
    if (enIyi) return { komut: 'secenek', deger: enIyi.deger };
  }
  if (iceriyor(s, KOMUT_KELIMELERI.cek)) return { komut: 'cek' };
  if (iceriyor(s, KOMUT_KELIMELERI.devam)) return { komut: 'devam' };
  return null;
}

// Dinlemeye başlar; her söylenen cümle geriCagir(metin) ile gelir. Yalnızca yerel tanıma varsa çalışır.
export async function dinlemeyiBaslat(geriCagir) {
  dinleyici = geriCagir;
  if (acik) return true;
  if ((await yerelTanimaDurumu()) !== 'var') return false;
  tanima = new Tanima();
  tanima.lang = DIL;
  tanima.continuous = true;
  tanima.interimResults = false;
  tanima.processLocally = true; // Konuşma telefondan çıkmaz.
  if ('mode' in tanima) tanima.mode = 'ondevice-only';
  tanima.onresult = (olay) => {
    const sonuc = olay.results[olay.results.length - 1];
    if (sonuc?.isFinal) dinleyici?.(sonuc[0].transcript);
  };
  // Tarayıcı bir süre sonra dinlemeyi bırakır; açık kaldıkça yeniden başlatılır.
  tanima.onend = () => {
    if (acik) setTimeout(() => acik && tanima?.start(), 300);
  };
  try {
    acik = true;
    tanima.start();
    return true;
  } catch {
    acik = false;
    return false;
  }
}

export function dinlemeyiDurdur() {
  acik = false;
  dinleyici = null;
  try {
    tanima?.stop();
  } catch {
    // Zaten durmuş.
  }
  tanima = null;
}

export const dinliyorMu = () => acik;
