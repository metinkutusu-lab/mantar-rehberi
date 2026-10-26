// Soru-cevap anahtarı: kullanıcının cevaplarıyla çelişen türleri eler.
// Eleme bilerek temkinlidir: bir tür yalnızca kesin bir cevap türün listesinde yoksa elenir.
// Böylece emin olunmayan durumda tehlikeli türler aday olarak kalır (kural 3).
// Çoklu seçimli sorularda (ör. çevrede neler var) tür, seçilenlerden herhangi birine uyuyorsa elenmez.
import { BILMIYORUM } from './kurallar.js';
import { cokluDegerler } from './sorular.js';

// Bu cevaplar hiçbir türü elemez.
const ELEMEYEN_CEVAPLAR = new Set([BILMIYORUM, 'diger', 'yapilmadi']);

export function adaylariBul(turler, cevaplar) {
  return turler.filter((tur) =>
    Object.entries(cevaplar).every(([soru, cevap]) => {
      const izinli = tur.ozellikler?.[soru];
      if (!Array.isArray(izinli) || cevap == null) return true;
      if (Array.isArray(cevap)) {
        if (!cevap.length) return true;
        return cokluDegerler(soru, cevap).some((d) => ELEMEYEN_CEVAPLAR.has(d) || izinli.includes(d));
      }
      if (ELEMEYEN_CEVAPLAR.has(cevap)) return true;
      return izinli.includes(cevap);
    }),
  );
}
