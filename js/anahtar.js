// Soru-cevap anahtarı: kullanıcının cevaplarıyla çelişen türleri eler.
// Eleme bilerek temkinlidir: bir tür yalnızca kesin bir cevap türün listesinde yoksa elenir.
// Böylece emin olunmayan durumda tehlikeli türler aday olarak kalır (kural 3).
import { BILMIYORUM } from './kurallar.js';

// Bu cevaplar hiçbir türü elemez.
const ELEMEYEN_CEVAPLAR = new Set([BILMIYORUM, 'diger', 'yapilmadi']);

export function adaylariBul(turler, cevaplar) {
  return turler.filter((tur) =>
    Object.entries(cevaplar).every(([soru, cevap]) => {
      const izinli = tur.ozellikler?.[soru];
      if (!Array.isArray(izinli) || cevap == null || ELEMEYEN_CEVAPLAR.has(cevap)) return true;
      return izinli.includes(cevap);
    }),
  );
}
