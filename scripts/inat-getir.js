// Fotoğraf kıyası için iNaturalist'ten eğitim fotoğrafları (2026-10-26: Commons'taki 3–20 fotoğraf yetmedi; fotoğraf sayısı
// arttıkça kıyas ölçülerek iyileşiyor. 2026-10-27: tür başına 300'e çıkarıldı, haftalık otomatik güncellemede de kullanılır).
// Yalnızca "araştırma düzeyinde" (topluluk tarafından doğrulanmış) gözlemler; her gözlemden yalnızca ilk fotoğraf;
// yalnızca CC0 ve CC BY lisanslı fotoğraflar (CC BY-SA, NC, ND asla; ticari kullanımda soru çıkmasın).
// Her çalıştırmada var olanlar korunur, yalnızca eksik kalan kadar yeni gözlem eklenir; sabit deneme setindeki
// gözlemler (fotograflar/deneme-kaynaklar.json) hiç indirilmez.
// Fotoğraflar küçük boyutta (240 piksel) fotograflar/inat/<tür-id>/ altına iner (model zaten 224 piksele bakar);
// uygulamaya ve depoya girmez (.gitignore). Kaynak, çeken ve lisans fotograflar/inat-kaynaklar.json'a yazılır (depoda).
// Kullanım: node scripts/inat-getir.js [tür-id ...]   (internet gerekir; uygulamanın parçası değildir)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { KATEGORILER } from './tur-adlari.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISTEK = { headers: { 'User-Agent': 'MushKey-mantar-rehberi/1.0 (egitim amacli; metinkutusu-lab)' } };
const TUR_BASINA = Number(process.env.MANTAR_TUR_BASINA ?? 300);
const LISANSLAR = ['cc0', 'cc-by'];
const bekle = (ms) => new Promise((coz) => setTimeout(coz, ms));
// Bağlantı kısa süre koparsa birkaç kez yeniden dener.
async function getir(adres) {
  for (let deneme = 0; ; deneme++) {
    try {
      return await fetch(adres, ISTEK);
    } catch (hata) {
      if (deneme >= 3) throw hata;
      await bekle(5000 * (deneme + 1));
    }
  }
}

// Grup türlerde fotoğraflar bilimsel adlar arasında paylaştırılır. Cins adı olan (tek kelime) kategoriler
// ve eş anlamlı adlar atlanır.
// iNaturalist bazı türleri yeni adıyla kaydeder (ör. mor kadife: Collybia nuda); bu adlarla da aranır.
const INAT_ADLARI = { 'mor-kadife': ['Collybia nuda'] };
const adlar = (id) => INAT_ADLARI[id] ?? KATEGORILER[id].filter((a) => a.includes(' '));

// iNaturalist'in kendi arayüzü çok istekte bağlantıyı kesiyor; aynı araştırma düzeyindeki gözlemler GBIF'ten okunur
// (iNaturalist research-grade veri kümesi). GBIF süzgeci CC0 ve CC BY'dir; fotoğrafın kendi lisansı da denetlenir.
const INAT_VERI_KUMESI = '50c9509d-22c7-4a22-a47d-8c48425ef4a7';
const lisansKodu = (adres) => (/publicdomain\/zero/.test(adres) ? 'cc0' : /licenses\/by-sa\//.test(adres) ? 'cc-by-sa' : /licenses\/by\//.test(adres) ? 'cc-by' : null);

// Önce GBIF'in eşleştirdiği adla, yetmezse gözlemde yazan özgün adla aranır (GBIF bazı yeni adları eşleştiremiyor).
// atla: zaten indirilmiş ya da deneme setinde olan gözlemler.
async function gozlemler(ad, adet, atla) {
  const sonuc = [];
  for (const alan of ['scientificName', 'verbatimScientificName']) {
    for (const g of await aramaSonuclari(alan, ad, adet - sonuc.length, atla)) if (!sonuc.some((s) => s.gozlem === g.gozlem)) sonuc.push(g);
    if (sonuc.length >= adet) break;
  }
  return sonuc.slice(0, adet);
}

async function aramaSonuclari(alan, ad, adet, atla) {
  const sonuc = [];
  for (let sayfa = 0; sonuc.length < adet && sayfa < 12; sayfa++) {
    await bekle(1100);
    const p = new URLSearchParams({ [alan]: ad, datasetKey: INAT_VERI_KUMESI, mediaType: 'StillImage', limit: '100', offset: String(sayfa * 100) });
    p.append('license', 'CC0_1_0');
    p.append('license', 'CC_BY_4_0');
    const yanit = await getir(`https://api.gbif.org/v1/occurrence/search?${p}`);
    if (!yanit.ok) throw new Error(`GBIF ${yanit.status}`);
    const veri = await yanit.json();
    for (const g of veri.results) {
      if (atla.has(g.occurrenceID)) continue;
      const f = g.media?.find((m) => m.type === 'StillImage' && m.identifier);
      const lisans = f && lisansKodu(f.license ?? '');
      if (!lisans || !LISANSLAR.includes(lisans)) continue;
      sonuc.push({ gozlem: g.occurrenceID, adres: f.identifier.replace('/original.', '/small.'), cekan: `(c) ${f.rightsHolder ?? f.creator ?? g.recordedBy}`, lisans });
    }
    if (veri.endOfRecords) break;
  }
  return sonuc.slice(0, adet);
}

const istenen = process.argv.slice(2);
const KAYNAK_DOSYASI = path.join(KOK, 'fotograflar', 'inat-kaynaklar.json');
const DENEME_DOSYASI = path.join(KOK, 'fotograflar', 'deneme-kaynaklar.json');
const kaynaklar = existsSync(KAYNAK_DOSYASI) ? JSON.parse(readFileSync(KAYNAK_DOSYASI, 'utf8')) : {};
const denemeGozlemleri = new Set(
  Object.values(existsSync(DENEME_DOSYASI) ? JSON.parse(readFileSync(DENEME_DOSYASI, 'utf8')) : {}).flat().map((k) => k.gozlem).filter(Boolean),
);
let toplamYeni = 0;

for (const id of istenen.length ? istenen : Object.keys(KATEGORILER)) {
  try {
    const klasor = path.join(KOK, 'fotograflar', 'inat', id);
    mkdirSync(klasor, { recursive: true });
    // Var olanlardan yalnızca dosyası duran, lisansı uygun ve deneme setinde olmayanlar kalır.
    const eski = (kaynaklar[id] ?? []).filter((k) => {
      const uygun = existsSync(path.join(klasor, k.dosya)) && LISANSLAR.includes(k.lisans) && !denemeGozlemleri.has(k.gozlem);
      if (!uygun) rmSync(path.join(klasor, k.dosya), { force: true });
      return uygun;
    });
    const atla = new Set([...denemeGozlemleri, ...eski.map((k) => k.gozlem)]);
    const eksik = TUR_BASINA - eski.length;
    const secilen = [];
    if (eksik > 0) {
      const liste = adlar(id);
      const pay = Math.ceil(eksik / liste.length);
      for (const ad of liste) secilen.push(...(await gozlemler(ad, pay, atla)));
    }
    let sira = Math.max(0, ...eski.map((k) => Number.parseInt(k.dosya, 10) || 0));
    const yeni = [];
    for (const b of secilen.slice(0, Math.max(0, eksik))) {
      await bekle(250);
      const yanit = await getir(b.adres);
      if (!yanit.ok) continue;
      sira++;
      const dosya = `${String(sira).padStart(3, '0')}.jpg`;
      writeFileSync(path.join(klasor, dosya), Buffer.from(await yanit.arrayBuffer()));
      yeni.push({ dosya, gozlem: b.gozlem, cekan: b.cekan, lisans: b.lisans });
    }
    kaynaklar[id] = [...eski, ...yeni];
    toplamYeni += yeni.length;
    console.log(`${id}: ${eski.length} vardı, ${yeni.length} yeni (toplam ${kaynaklar[id].length})`);
  } catch (hata) {
    console.log(`${id}: HATA ${hata.message}`);
  }
  writeFileSync(KAYNAK_DOSYASI, `${JSON.stringify(kaynaklar, null, 1)}\n`);
}
console.log(`Toplam yeni fotoğraf: ${toplamYeni}`);
