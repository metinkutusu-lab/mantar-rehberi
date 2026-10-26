# CLAUDE.md — Mantar Uygulaması

Bu dosya, bu projede çalışan Claude'a (ve diğer geliştiricilere) projenin amacını, değişmez güvenlik kurallarını ve çalışma biçimini anlatır. Repo henüz yok; repo açıldığında bu dosya kök dizine taşınmalı.

Ürün planı: [Mantar Uygulaması: Ürün Planı](https://claude.ai/code/artifact/ee1de608-179a-4b58-9ef7-f72be57a012a). Plan ile bu dosya çelişirse plan esastır; bu dosyayı güncelle.

## Marka ve alan adı

- **Dünya geneli için seçilen ad: MushKey** (Metin'in kararı, 2026-10-24). Ad seçimi ve kontroller: `notlar/ad-adaylari.md`.
- **mushkey.com** Cloudflare Registrar'dan alındı (Metin'in Cloudflare hesabı, Google ile giriş). Bitiş 2027-10-24, otomatik yenileme açık.
- Henüz uygulamaya bağlanmadı; uygulama hâlâ GitHub Pages adresinde. Marka tescili henüz yapılmadı.
- **Logo** (Metin'in seçimi, 2026-10-24): Simge = anahtar delikli mantar (koyu kahve zemin, turuncu şapka, şapkada anahtar deliği); `ikonlar/ikon-*.png` ve başlıktaki SVG. Yazı logosu = "Mush" kahverengi + "Key" turuncu; "M" üstünde mantar şapkası, "Key" üstünde anahtar (tanıtım için). Seçenekler: `notlar/logo-secenekleri.html`.

## Proje özeti

Doğada mantar toplayanlar için mobil rehber. Kullanıcının bulduğu mantarı tanımasına yardım eder, zehirli türleri ve benzerlerini gösterir, güvenle tanımlanmış türler için tarif verir.

- **Hedef kullanıcı:** Türkiye'de doğa yürüyüşü yapanlar, mevsimlik mantar toplayan köylüler, yeni başlayan meraklılar.
- **Dil:** Arayüz ve içerik Türkçe. Proje sahibi (Metin) ile **her zaman, istisnasız Türkçe** konuş: cevaplar, ara bilgi mesajları, özetler ve sorular dahil. Metin İngilizce bilmiyor; tek bir İngilizce mesaj bile işini zorlaştırıyor.
- **Bağlam:** Dağda internet yok; tanımlama, ansiklopedi ve acil durum bilgisi çevrimdışı çalışmalı.

## Güvenlik kuralları (değiştirilemez)

Güvenlik bu uygulamanın bir özelliği değil, temelidir. Aşağıdaki kurallar hiçbir özellik, tasarım veya "kullanıcı deneyimi" gerekçesiyle gevşetilmez. Bir değişiklik bu kurallardan birine dokunuyorsa önce Metin'e sor.

1. **Uygulama hiçbir zaman tek başına "yenebilir" demez.** Uygulama, bir yabani mantarın yenebilir olduğuna karar vermek için tek dayanak olamaz. Metinler "muhtemelen X olabilir" der, "yenebilir" demez.
2. **Yeşil ("güvenle yenebilir") etiket yoktur.** Sonuç etiketleri yalnızca üç tanedir:
   - Kırmızı: Zehirli veya ölümcül olabilir, toplamayın.
   - Turuncu: Tanımlanamadı, yemeyin.
   - Sarı: Muhtemelen yenen bir tür, ama uzman onayı olmadan yemeyin.
3. **Risk kuralı:** Kalan adaylardan herhangi biri zehirliyse sonuç kırmızıdır. Sonuç her zaman en tehlikeli olasılığa göre etiketlenir.
4. **Amanita kuralı:** Beyaz solungaç + halka veya volva (ayak dibinde torba) görülürse sonuç her zaman "ölümcül olabilir, dokunmayın" olur. Küçük kahverengi mantarlar için de sonuç "toplamayın"dır.
5. **Bilinmeyen = zehirli.** Güven skoru düşükse veya kullanıcı bir soruya "bilmiyorum" derse sonuç turuncudur.
6. **Tek fotoğrafla sonuç verilmez.** En az üç fotoğraf (üst, alt/solungaçlar, yan/ayak tabanı) gerekir.
7. **Tarifler kilitlidir.** Bir türün tarifleri yalnızca kullanıcı "uzman onayladı" adımını işaretledikten sonra açılır.
8. **Zehirli benzer her zaman gösterilir.** Her yenen türün sayfasında ona benzeyen zehirli türler ve ayırt edici farklar yan yana durur.
9. **Acil durum her ekranda.** UZEM **114** ve **112** butonu, belirti listesi ve "mantarın bir parçasını sakla" uyarısı her ekrandan tek dokunuşla erişilebilir ve çevrimdışı çalışır.
10. **Pişirme ve miktar uyarıları zorunludur.** Her tarifte pişirme kuralı zorunlu alandır; "ilk kez yiyorsan az miktar dene, bir örneği sakla" uyarısı yer alır.
11. **İlk açılış eğitimi.** Kullanıcı güvenlik eğitimini bitirip feragati onaylamadan tanımlama ekranı açılmaz.
12. **Konum gizliliği.** Toplama yerleri varsayılan olarak cihazda kalır. *Yağmur ipucu istisnası (Metin'in kararı, 2026-10-24):* `js/yagmur.js` yalnızca Open-Meteo'ya istek yapabilir. Kullanıcı gideceği yerin adını yazar; yalnızca bu ad ve seçilen yerin yuvarlanmış koordinatı gider. **Cihaz konumu hiç okunmaz** (önce onaylı "bulunduğum yer" özelliği vardı; Metin'in kararıyla kaldırıldı, gereksizdi). Takip edilen ve kaydedilen yer adları yalnızca cihazda tutulur. Bu akış avukatın yazacağı gizlilik metnine girmeli. Open-Meteo ticari olmayan kullanım için ücretsizdir ve kaynak gösterilmesini ister; uygulama ücretli olursa ücretli plan gerekir.
13. **Genç mantar kuralı.** Mantar genç/küçükse (şapka tam açılmamış, "yumurta" görünümü) uygulama tepeden aşağı ikiye kesmeyi ister. Kesitte içeride mantar taslağı (şapka/ayak şekli) görülürse sonuç kırmızıdır ("ölümcül olabilir"). Kesit yapılmadıysa veya kullanıcı emin değilse sonuç turuncudur. (Metin onayladı, 2026-10-24.)
14. **Tadına bakma yok.** Uygulama hiçbir adımda mantarın tadına bakmayı (dilin ucuyla tatma, çiğneyip tükürme dahil) önermez.

Kod yazarken:

- Bu kuralları tek bir yerde (ör. bir risk/etiket modülü) topla ve her kural için test yaz. Bu testleri asla silme, atlama veya gevşetme.
- Tür verisinde zehirlilik alanı boş veya bilinmiyorsa en kötü durumu varsay.
- Tür listesi ve zehirlilik etiketleri yayından önce bir mikolog tarafından onaylanmalı. Bu verileri kendi bilginle uydurma veya "düzeltme"; kaynağı belirsiz bir değişiklikse not düş ve sor.
- **Taslak tür listesi (Metin'in kararı, 2026-10-24):** Uzman onayı beklenirken `veri/turler.json`'a genel alan rehberi bilgisinden derlenmiş TASLAK türler eklendi (`mikologOnayi: false`, `kaynak` alanı "TASLAK" ile başlar). Onaysız türler sonucu en fazla turuncu yapar; zehirli taslak türler sonucu kırmızı yapar. Ölümcül/zehirli türlerin özellik listeleri bilerek geniş tutulur (kullanıcının yanlış cevabı onları elemesin). Uygulama tanıtılmadan/geniş paylaşılmadan önce bu liste mikologa onaylatılmalı. Metin "yenir" dedirtmek istedi; kural 1 gereği reddedildi ve değişmeyecek.
- Arayüz metinlerinde "güvenli", "yenebilir", "sorun yok" gibi ifadeleri kullanma.

## MVP kapsamı

**Var:** güvenlik eğitimi, soru-cevap anahtarıyla tanımlama (fotoğraf modeli opsiyonel), ~50 türlük ansiklopedi ve zehirli benzerler, 20–30 tarif, acil durum ekranı, Türkçe arayüz, çevrimdışı çalışma.

**Yok:** hesap, topluluk, harita paylaşımı, uzman onay ağı, çoklu dil.

Ana sekmeler: **Tanımla**, **Ansiklopedi**, **Tarifler**, **Acil**.

Yol haritası:

- Aşama 0: uzman iş birliği, tür listesi ve etiket onayı, tıklanabilir prototip.
- Aşama 1: MVP ve küçük bir toplayıcı grubuyla saha testi.
- Aşama 2: fotoğraf modeli, toplama günlüğü ve harita, uzman onay kuyruğu.
- Aşama 3: topluluk, bölgesel mevsim takvimi, daha fazla tür ve tarif.

## Tanımlama mimarisi

İki katmanlı:

1. Fotoğraf modeli (opsiyonel, Aşama 2'ye kalabilir) en olası 5 türü ve güven skorlarını verir.
2. Soru-cevap anahtarı (solungaç rengi, halka, volva, kesince renk değişimi, ağaç türü, koku) adayları eler.
3. Risk kuralı sonucu etiketler (yukarıdaki güvenlik kuralları).

Soru-cevap anahtarı uygulama içinde şeffaf bir kural tablosu olarak tutulmalı ki bir uzman denetleyebilsin.

İlk sürümde fotoğraflar kayıt ve rehberlik içindir (uzmana gösterilmek üzere saklanır); kararı kullanıcının cevapları ve kural tablosu verir.

Tanımlama akışının kullanıcıdan sırayla istediği kontroller (her soruda "Bilmiyorum / göremedim" seçeneği vardır ve sonucu turuncuya çeker):

1. Üstten fotoğraf: şapka rengi, pul/lekeler.
2. Alttan fotoğraf: solungaç / gözenek (sünger) / diken; rengi.
3. Yandan fotoğraf: ayakta halka.
4. Ayak dibi: koparmadan, bıçakla toprağı açarak çıkar; volva (torba) var mı?
5. Boyuna ikiye kesme: iç renk, dolu/boş, genç mantarda içeride taslak (kural 13).
6. Kesince renk değişimi: 5–10 dakika bekle, tekrar çek (mavileşme, kızarma, sararma).
7. Sıvı (süt) akıyor mu, rengi, havada rengi değişiyor mu?
8. Ezince renk değişimi.
9. Koku (un, anason, turp, kötü koku, kokusuz).
10. Yer: ağaç türü, toprak/odun/çayır, ay.
11. Spor izi (isteğe bağlı, birkaç saat).

Listede olmayan bir mantarın sonucu her zaman turuncudur.

## Teknoloji yığını

**Karar (2026-10-24):** İlk sürüm, telefona "ana ekrana ekle" ile kurulan ve çevrimdışı çalışan bir web uygulamasıdır (PWA). Neden: Metin programlama bilmiyor, bilgisayara ağır araç kurmak gerekmiyor, hiçbir yere ücret ödenmiyor. Mağaza uygulaması ve diğer seçenekler uygulama oturduktan sonra değerlendirilecek.

| Katman | Seçim |
| --- | --- |
| Uygulama | Düz HTML + CSS + JavaScript (ES modülleri), derleme adımı yok |
| Çevrimdışı | Service worker (`sw.js`) tüm dosyaları önbelleğe alır |
| Veri | `veri/` altında JSON dosyaları (mikolog denetleyebilsin diye) |
| Kullanıcı durumu | Cihazda `localStorage` (eğitim, onaylar); sunucu yok |
| Güvenlik kuralları | `js/kurallar.js` (tek yer), testleri `test/kurallar.test.js` |
| Yayın (ileride) | GitHub Pages (ücretsiz) |
| Arka uç | İlk sürümde yok |

## Komutlar

- Testleri çalıştır: `npm test` (veya `node --test "test/*.test.js"`)
- Yerel önizleme: `python -m http.server 8080` → `http://localhost:8080`
- Yayın klasörünü hazırla: `npm run yayin` (önce testleri çalıştırır, sonra yalnızca uygulama dosyalarını `yayin/` altına **alt klasörsüz, düz** kopyalar ve yol öneklerini siler).
- **GitHub'a yükle (2026-10-26'dan beri Claude yapar):** `npm run yukle -- "Değişikliğin Türkçe açıklaması"`. Testleri çalıştırır, `yayin/`'ı hazırlar, `%USERPROFILE%\mushkey-yayin` klasöründeki depo kopyasına aynalar, commit edip `metinkutusu-lab/mantar-rehberi`'ye gönderir. Git for Windows kurulu (`C:\Program Files\Git\cmd\git.exe`); GitHub girişi Git Credential Manager'da kayıtlı (Metin bir kez tarayıcıdan onayladı). Giriş bir gün yeniden sorulursa gönderim Claude'un kabuğunda başarısız olur; o zaman `push`'u Metin'in Terminal panelinde çalıştır ki onay penceresi açılsın. Metin'e artık dosya yükletme. Yayın adresi: https://metinkutusu-lab.github.io/mantar-rehberi/ (GitHub Pages yaklaşık 1 dakikada güncellenir).
- Yeni bir dosya eklerken `css/`, `js/`, `ikonlar/` klasörlerinde aynı adlı iki dosya olmamalı (yayın düz kopyalanır).
- Service worker'daki dosya listesi (`sw.js` içindeki `DOSYALAR`) yeni dosya eklenince güncellenmeli ve `SURUM` artırılmalı.
- **Tür fotoğrafları:** `node scripts/fotograflari-getir.js [tür-id ...]` her türün İngilizce Vikipedi maddesindeki ana fotoğrafı Wikimedia Commons'tan lisansıyla indirir (`fotograflar/ham/`, `fotograflar/bilgi.json`; yalnızca ticari kullanıma uygun lisanslar: CC0, kamu malı, CC BY, CC BY-SA). Sonra 640 px'e küçültülüp `fotograflar/<id>.jpg` olarak kaydedilir ve `veri/turler.json`'daki `fotograf` alanına (dosya, çeken, lisans, kaynak) yazılır. Çeken adı ve lisans uygulamada fotoğrafın altında gösterilmek zorundadır (test denetler). Fotoğraflar uygulamanın telif notunun dışındadır.

## Veri kaynakları

GBIF ve iNaturalist (gözlem ve fotoğraflar, lisansı kontrol et), Index Fungorum / MycoBank (bilimsel adlar), Türkiye makromantar kontrol listeleri (yerel türler ve adlar), UZEM ve hastane yayınları (zehirlenme öncelikleri), mikolog/dernek iş birliği (etiket doğrulama). Lisans koşulları geliştirme başlamadan kontrol edilmeli.

## Açık sorular

- İlk sürüm hangi bölgeye odaklanacak (Karadeniz, Ege, tüm Türkiye)?
- Ücretsiz mi, ücretli mi, abonelik mi? (Şimdilik hiçbir yere ödeme yapılmıyor.)
- Fotoğraf modeli ilk sürümde yok; Aşama 2'de değerlendirilecek.
- Acil ekranındaki belirti metinleri UZEM yayınlarıyla ve bir hekimle doğrulanmalı (şu an taslak).

## Çalışma biçimi

- Metin programlama bilmiyor: tek yol öner, seçenek listesi sunma; kendisinin yapması gereken her adımı nereye tıklayacağıyla anlat.
- Proje sahibine danışmadan repo oluşturma.
- Hukuki metinler (kullanım koşulları, feragat) bir avukat tarafından yazılmalı; taslak yazabilirsin ama "taslak" olarak işaretle.
- Uygulama mağazası için tanımlama özelliği "eğitim amaçlı rehber" olarak konumlanır.
