// "Uzmana gönder" özeti: fotoğraflar, cevaplar ve sonuç tek bir resimde toplanır.
// Resim cihazda çizilir; yalnızca kullanıcı paylaş derse ve seçtiği yere gider.
// Konum bilgisi eklenmez (kural 12).
import { OZET_UYARISI } from './kurallar.js';

const GENISLIK = 1080;
const BOSLUK = 56;
const YAZI_TIPI = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const BASLIK_RENKLERI = {
  kirmizi: ['#c4321f', '#ffffff'],
  turuncu: ['#d0650d', '#ffffff'],
  sari: ['#f5b81b', '#1f1b16'],
};
const AZAMI_FOTOGRAF = 6;

export function paylasimMetni(sonuc) {
  return `Merhaba, bu mantarı tanımlamama yardım eder misiniz? Uygulamanın sonucu: ${sonuc.baslik}. Fotoğraflar ve cevaplarım ekteki resimde.`;
}

function satirlaraBol(ctx, metin, genislik) {
  const satirlar = [];
  let satir = '';
  for (const kelime of String(metin).split(/\s+/)) {
    const deneme = satir ? `${satir} ${kelime}` : kelime;
    if (satir && ctx.measureText(deneme).width > genislik) {
      satirlar.push(satir);
      satir = kelime;
    } else {
      satir = deneme;
    }
  }
  if (satir) satirlar.push(satir);
  return satirlar;
}

// Metni sarar; çiz false ise yalnızca yüksekliği hesaplar. Yeni y değerini döndürür.
function yaz(ctx, ciz, metin, { y, boyut, kalinlik = 400, renk = '#1f1b16', x = BOSLUK, genislik = GENISLIK - 2 * BOSLUK }) {
  ctx.font = `${kalinlik} ${boyut}px ${YAZI_TIPI}`;
  for (const satir of satirlaraBol(ctx, metin, genislik)) {
    if (ciz) {
      ctx.fillStyle = renk;
      ctx.fillText(satir, x, y);
    }
    y += boyut * 1.35;
  }
  return y;
}

function yuvarlakKirp(ctx, x, y, g, y2, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, g, y2, r);
  else ctx.rect(x, y, g, y2);
  ctx.clip();
}

function basligiYaz(ctx, ciz, veri, y) {
  y = yaz(ctx, ciz, 'MUSHKEY · MANTAR TANIMLAMA ÖZETİ', { y, boyut: 26, kalinlik: 700, renk: veri.yaziRengi });
  y += 8;
  y = yaz(ctx, ciz, veri.sonuc.baslik, { y, boyut: 56, kalinlik: 800, renk: veri.yaziRengi });
  y = yaz(ctx, ciz, veri.sonuc.mesaj, { y, boyut: 34, kalinlik: 650, renk: veri.yaziRengi });
  y += 10;
  return yaz(ctx, ciz, veri.tarih, { y, boyut: 26, renk: veri.yaziRengi });
}

function duzen(ctx, ciz, veri, resimler) {
  ctx.textBaseline = 'top';
  let y = BOSLUK;

  // Renkli başlık bloğu
  const baslikSonu = basligiYaz(ctx, false, veri, y) + BOSLUK - 10;
  if (ciz) {
    ctx.fillStyle = veri.zeminRengi;
    ctx.fillRect(0, 0, GENISLIK, baslikSonu);
    basligiYaz(ctx, true, veri, y);
  }
  y = baslikSonu + 40;

  // Fotoğraflar
  if (resimler.length > 0) {
    const ara = 16;
    const kare = (GENISLIK - 2 * BOSLUK - 2 * ara) / 3;
    resimler.forEach((resim, i) => {
      const x = BOSLUK + (i % 3) * (kare + ara);
      const ry = y + Math.floor(i / 3) * (kare + ara);
      if (!ciz) return;
      const olcek = Math.max(kare / resim.naturalWidth, kare / resim.naturalHeight);
      const g = kare / olcek;
      ctx.save();
      yuvarlakKirp(ctx, x, ry, kare, kare, 18);
      ctx.drawImage(resim, (resim.naturalWidth - g) / 2, (resim.naturalHeight - g) / 2, g, g, x, ry, kare, kare);
      ctx.restore();
    });
    y += Math.ceil(resimler.length / 3) * (kare + ara) + 24;
  }

  // Cevaplar
  y = yaz(ctx, ciz, 'Cevaplar', { y, boyut: 36, kalinlik: 800 });
  y += 8;
  for (const satir of veri.satirlar) {
    y = yaz(ctx, ciz, satir.soru, { y, boyut: 24, renk: '#6b635b' });
    y = yaz(ctx, ciz, satir.cevap, { y, boyut: 30, kalinlik: 700 });
    y += 14;
    if (ciz) {
      ctx.fillStyle = '#e8e1d7';
      ctx.fillRect(BOSLUK, y - 8, GENISLIK - 2 * BOSLUK, 2);
    }
    y += 6;
  }

  // Gerekçeler
  y += 20;
  y = yaz(ctx, ciz, 'Neden bu sonuç?', { y, boyut: 36, kalinlik: 800 });
  y += 8;
  for (const gerekce of veri.sonuc.gerekceler) {
    y = yaz(ctx, ciz, `• ${gerekce}`, { y, boyut: 28 });
    y += 6;
  }

  // Uyarı kutusu
  y += 30;
  const kutuBasi = y;
  const ic = 28;
  const kutuSonu = yaz(ctx, false, OZET_UYARISI, { y: y + ic, boyut: 26, kalinlik: 600, x: BOSLUK + ic, genislik: GENISLIK - 2 * BOSLUK - 2 * ic }) + ic;
  if (ciz) {
    ctx.save();
    ctx.fillStyle = '#f4ebe3';
    yuvarlakKirp(ctx, BOSLUK, kutuBasi, GENISLIK - 2 * BOSLUK, kutuSonu - kutuBasi, 20);
    ctx.fillRect(BOSLUK, kutuBasi, GENISLIK - 2 * BOSLUK, kutuSonu - kutuBasi);
    ctx.restore();
    yaz(ctx, true, OZET_UYARISI, { y: y + ic, boyut: 26, kalinlik: 600, renk: '#6b3e26', x: BOSLUK + ic, genislik: GENISLIK - 2 * BOSLUK - 2 * ic });
  }
  return kutuSonu + BOSLUK;
}

// img.decode() bazı tarayıcılarda hiç bitmeyebiliyor; onload ve süre sınırı kullanılır.
function resimYukle(src) {
  return new Promise((coz) => {
    const resim = new Image();
    const bitir = () => coz(resim.complete && resim.naturalWidth > 0 ? resim : null);
    resim.onload = bitir;
    resim.onerror = () => coz(null);
    setTimeout(bitir, 5000);
    resim.src = src;
  });
}

async function resimleriYukle(kaynaklar) {
  const resimler = await Promise.all(kaynaklar.slice(0, AZAMI_FOTOGRAF).map(resimYukle));
  return resimler.filter(Boolean);
}

// sonuc: degerlendir() çıktısı; satirlar: ozetSatirlari() çıktısı; fotograflar: resim adresleri.
export async function ozetResmiOlustur({ sonuc, satirlar, fotograflar }) {
  const [zeminRengi, yaziRengi] = BASLIK_RENKLERI[sonuc.renk];
  const tarih = new Date().toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
  const veri = { sonuc, satirlar, tarih, zeminRengi, yaziRengi };
  const resimler = await resimleriYukle(fotograflar);

  const yukseklik = Math.ceil(duzen(document.createElement('canvas').getContext('2d'), false, veri, resimler));
  const tuval = document.createElement('canvas');
  tuval.width = GENISLIK;
  tuval.height = yukseklik;
  const ctx = tuval.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, GENISLIK, yukseklik);
  duzen(ctx, true, veri, resimler);
  return new Promise((coz) => tuval.toBlob(coz, 'image/jpeg', 0.88));
}

// Telefonun paylaşma menüsünü açar (WhatsApp vb.). Desteklenmiyorsa resmi indirir.
export async function ozetiPaylas(resim, sonuc) {
  const dosya = new File([resim], `mantar-ozeti-${Date.now()}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [dosya] })) {
    try {
      await navigator.share({ files: [dosya], text: paylasimMetni(sonuc) });
      return 'paylasildi';
    } catch (hata) {
      if (hata.name === 'AbortError') return 'vazgecildi';
    }
  }
  const baglanti = document.createElement('a');
  baglanti.href = URL.createObjectURL(resim);
  baglanti.download = dosya.name;
  baglanti.click();
  setTimeout(() => URL.revokeObjectURL(baglanti.href), 1000);
  return 'indirildi';
}
