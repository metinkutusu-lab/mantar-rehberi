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
12. **Konum gizliliği.** Toplama yerleri varsayılan olarak cihazda kalır. *Yağmur ipucu istisnası (Metin'in kararı, 2026-10-24):* `js/yagmur.js` yalnızca Open-Meteo'ya istek yapabilir. Kullanıcı gideceği yerin adını yazar; yalnızca bu ad ve seçilen yerin yuvarlanmış koordinatı gider. *Konum kararı (Metin, 2026-10-26, "yasalsa olsun"):* cihaz konumu yalnızca kullanıcı "Konumumu kullan"a dokununca (sonuçta "takip et" ya da "gizli yer olarak kaydet" seçilir), tarayıcı izin sorduktan sonra, tek seferlik okunur (`cihazKonumu`, yalnızca `js/yagmur.js`'te; sürekli izleme yok, test denetler). Hava servisine yalnızca ~10 km'ye yuvarlanmış koordinat gider. "Gizli yerlerim" tam konumu yalnızca cihazda saklar; "Haritada aç" telefonun kendi harita uygulamasını açar. Takip edilen ve kaydedilen yerler yalnızca cihazda tutulur. *Mantar ara kararı (Metin, 2026-10-26, "canlı konum ve harita sunucusunu onaylıyorum"):* Mantar ara ekranında "Konumumu göster"e dokununca konum canlı izlenir (`konumuIzle`, yalnızca `js/yagmur.js`'te); ekrandan çıkınca durur ve konum hiçbir yere gönderilmez. Harita parçaları OpenFreeMap'ten, yükseklik parçaları Terrain Tiles'tan (AWS) yalnızca `js/harita.js` ile istenir; bu sunucular bakılan bölgeyi görür, konumu görmez. İndirilen bölgeler `sw.js`'teki harita önbelleğinde kalır. Testler dosya başına izinli adresleri denetler. KVKK: konum kişisel veridir; bu akış, açık rıza/izin metni ile avukatın yazacağı gizlilik metnine girmeli. Bu akış avukatın yazacağı gizlilik metnine girmeli. Open-Meteo ticari olmayan kullanım için ücretsizdir ve kaynak gösterilmesini ister; uygulama ücretli olursa ücretli plan gerekir.
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
10. Yer: ağaç türü, toprak/odun/çayır, ay. "Çevrede neler var?" sorusu çoklu seçimlidir (Metin'in isteği, 2026-10-26: yapraklı, iğne yapraklı, meyve ağaçları, tarla/açık arazi aynı anda olabilir); tür, seçilenlerden herhangi birine uyuyorsa elenmez (kural 3), "Bilmiyorum" tek başına seçilir.
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
- **GitHub'a yükle (2026-10-26'dan beri Claude yapar):** `npm run yukle -- "Değişikliğin Türkçe açıklaması"`. Proje klasörünün kendisi git deposudur ve `metinkutusu-lab/mantar-rehberi` deposunda kaynağın tamamı (testler, veri, notlar, betikler) durur; GitHub Pages kökteki `index.html`'i klasörleriyle yayınlar. Komut testleri çalıştırır, commit eder, `git pull --rebase` ile uzaktaki değişiklikleri alır (çakışmada durur) ve gönderir. Git for Windows kurulu (`C:\Program Files\Git\cmd\git.exe`); GitHub girişi Git Credential Manager'da kayıtlı (Metin bir kez tarayıcıdan onayladı). Giriş bir gün yeniden sorulursa gönderim Claude'un kabuğunda başarısız olur; o zaman `push`'u Metin'in Terminal panelinde çalıştır ki onay penceresi açılsın. Metin'e artık dosya yükletme. Yayın adresi: https://metinkutusu-lab.github.io/mantar-rehberi/ (GitHub Pages yaklaşık 1 dakikada güncellenir).
- **claude.ai'deki plan projesi** de aynı depoda çalışır (2026-10-26'da `konum-yagmur-radar` ve "Yanına al" işleri elle alındı). Orada yapılan işler dal olarak gelirse, düz kopya değil kaynak yapısına uygun alınmalı; testler geçmeli. Başkasının dallarını Metin'e sormadan silme.
- Service worker'daki dosya listesi (`sw.js` içindeki `DOSYALAR`) yeni dosya eklenince güncellenmeli ve `SURUM` artırılmalı.
- **Tür fotoğrafları:** `node scripts/fotograflari-getir.js [tür-id ...]` her türün İngilizce Vikipedi maddesindeki ana fotoğrafı Wikimedia Commons'tan lisansıyla indirir (`fotograflar/ham/`, `fotograflar/bilgi.json`; yalnızca ticari kullanıma uygun lisanslar: CC0, kamu malı, CC BY, CC BY-SA). Sonra 640 px'e küçültülüp `fotograflar/<id>.jpg` olarak kaydedilir ve `veri/turler.json`'daki `fotograf` alanına (dosya, çeken, lisans, kaynak) yazılır. Çeken adı ve lisans uygulamada fotoğrafın altında gösterilmek zorundadır (test denetler). Fotoğraflar uygulamanın telif notunun dışındadır.
- **Ana ekran "Mantar zamanı" kartı (Metin'in isteği, 2026-10-26):** Mevsim, takip edilen yer ve yerler tek kartta (`js/anaKart.js`). Üstte iki çubuk ve Şimdi güncelle / Takibi bırak; bütün açıklamalar (i) düğmesinin arkasında tek yerde; "Yerlerim" bölümünde kayıtlı ve gizli yerlerin tek listesi (radar), tek konum düğmesi, yer arama ve elle yağmur tarihi (`js/yerlerim.js`, `js/yagmurKarti.js`). Aynı işi yapan ikinci bir düğme veya liste ekleme.
- **Mantar ara (Metin'in isteği, 2026-10-26; adı "Mantar bul" değil, çünkü bulmayı garanti etmez):** Ana karttaki düğmeyle açılan harita ekranı (`js/mantarAra.js`). Çevredeki ~2,5 km'de mantar çıkmaya uygun yerleri 3 renkle boyar; hesap `js/uygunluk.js`'te, açık kural tablosu ve testleri `test/uygunluk.test.js`. Girdiler: zemin (OpenStreetMap: orman, çayır, meyve bahçesi, çalılık), yamaç yönü ve eğimi (yükseklik verisinden telefonda hesaplanır), mevsim ve son yağmur/sıcaklık, seçilen türün `zemin` özelliği. Yön kuralı: serin/ilkbahar → güneye bakan, sıcak/kuru/yaz → kuzeye bakan yamaç (toplayıcı tecrübesi, taslak; mikolog görmeli). Haritada ağaç cinsi yok. Aranacak türler yalnızca "yenen" türler; seçilen türün zehirli benzerleri her zaman gösterilir. Tür seçici fotoğraflı ve dünya mutfağında en gözde olanlar önce sıralı (`ARANMA_SIRASI`, taslak; Metin "dünya gastronomisinde en lezzetliden geriye" istedi); uygulama yemeye özendirmesin diye ekranda "lezzetli" yazılmaz. 2026-10-26'da Metin'in isteğiyle gözde türler eklendi (hepsi TASLAK, mikolog onaysız): beyaz trüf (Türkiye kaydı 2024, Sakarya), kara trüf, keme, çaşır, mayıs mantarı, mor kadife, ballıca; beyaz trüfün zehirli benzeri olarak damarlı sahte trüf (zehirli sayılır). Zehirli benzeri kaynakla gösterilemeyen türler (ör. aslan yelesi, kirpi mantarı) kural 8 gereği eklenmedi. Çiğken zehirli türler (kuzugöbeği, tavuk mantarı, mor kadife, ballıca) listede kalır (Metin'in kararı, 2026-10-26: "çıkarma listeden hiçbirini"); veride `cigkenZehirli: true`, ansiklopedide ve Mantar ara'da `CIG_UYARISI` kırmızı kutuyla gösterilir (test denetler). Toplanan türlerde `aylar` ve `aramaIpucu` (nereye bakılır: ağaç dibi, gövde üstü, çayır…) TASLAK veridir. "Bu alanda bu mevsimde aranabilecekler" listesi alandaki zemine ve aya göredir, gözlem kaydı değildir. Yön, telefonun pusulasına göre söylenir ("sağ önünde", "arkanda"; `js/pusula.js`, pusula yoksa yürüme yönü); oklar telefon döndükçe döner, mavi noktada bakılan yönü gösteren burun var. Sesli yönlendirme (`js/ses.js`, açık/kapalı cihazda saklanır): yalnızca telefondaki yerel Türkçe ses, internetsiz; hedef seçilince, her 50/100/200 m'de, varınca ve bulunduğun yerin zemini/uygunluğu değişince konuşur, en az 8 sn arayla. Canlı konumda "Buradasın" kutusu bulunduğun hücrenin zeminini, uygunluğunu, en yakın çok uygun yere mesafeyi ve orada aranacak türlerin ipuçlarını gösterir (ağ isteği yapmaz). Hesap yapılan yerin mantar zamanı ana karttaki gibi bir çubukla gösterilir (yakındaki bilinen yerin adıyla); canlı konumda 1,5 km yürüyünce kendiliğinden yeniden hesaplanır; internet yokken indirilen bölgenin indirme günündeki yağmur bilgisi kullanılır ve bu yazılır. Yer işaretleme (gizli yerlere yazar), hedefe mesafe/yön oku, adlı "Bu bölgeyi indir" ve "İndirdiğim bölgeler" listesi (Haritada aç / Sil; internet yokken harita son indirilen bölgede açılır) (OpenFreeMap kuralı: bir indirmede en fazla 3.000 parça, en fazla 4 eşzamanlı istek). Harita kütüphanesi MapLibre GL JS 4.7.1 `vendor/` altında (BSD-3, `vendor/LICENSE.txt`); yalnızca bu ekran açılınca yüklenir. MGM verisi ücretli/izinli olduğu için kullanılmaz.
- **Hızlı tanımlama (Metin'in isteği, 2026-10-26: "Google Lens gibi pratik, az veri, sesli, internetli ve internetsiz"):** **Tek tanımlama yolu budur** (Metin'in kararı, 2026-10-26: eski 15 soruluk adım adım akış "sinir bozucu, gereksiz" diye kaldırıldı); Tanımla sayfasında başlık gizli, ana kartın altında büyük "Fotoğrafla tanımla" düğmesi ve açıklama (i)'nin arkasında, hemen altında "Yanına al" (telefon, bıçak, fırça, sepet; fırça şapkadaki benekleri silmesin diye fotoğraf ve tanımlamadan sonra) (`js/hizliTanimla.js`). Şapka rengi çoklu seçimlidir; ardından "Şapkanın üstü nasıl?" (`sapkaYuzeyi`: düz, benek, pul, lifli, kırışık; tür verisi TASLAK, tehlikeli türlerde geniş). Çoklu seçimli sorular da ayırabiliyorsa sorulur (önceden hiç sorulmuyordu). Önce üstten fotoğraf (uygulama içi kamera `js/kamera.js`, olmazsa telefonun kamerası), sonra yalnızca kalan türleri ayıran sorular (`js/siradaki.js`: aynı kural tablosu, beklenen elenen ağırlığa göre sıralar; güvenlik soruları her zaman sorulur, genç denince kesit hemen sorulur, ayırabilecek soru kaldıkça bitmez; spor izi hızlı akışta yok). Sonuç eski akıştaki aynı `degerlendir`den geçer. Her olası tür, karıştırıldığı zehirli/yenen türle yan yana, "Farkı" ve "Ayıran kontrol" ile gösterilir. Süreli kontroller `sorular.js`'te `sure`/`sureMetni` (süt 10 sn, ezince 30 sn, kesince 5 dk): sayaç ve süre dolunca sesli haber. Süt rengi testi yalnızca adaylar arasında fark yaratıyorsa sorulur; "beyaz süt = zehirli" genel bir kural değildir (yalnızca süt mantarları arasında ayırır), uygulama böyle söylemez. Sonuçta yüzde gösterilmez (Metin "kanunun izin verdiği oran" istedi; böyle bir yasal oran yok, yüzde garanti gibi okunur): "Muhtemelen X olabilir" yalnızca cevaplara uyan tek tür kaldıysa ya da fotoğraf belirgin benziyorsa (`BELIRGIN_BENZERLIK`) yazılır; her sonuçta "Kime sorabilirsin?" (mikolog/dernek, il-ilçe tarım ve orman müdürlüğü, 114/112) kartı var.
- **Zehir sembolleri (Metin'in isteği, 2026-10-26):** Tanımlamada zehirli her türün yanında zehrin ne yaptığını gösteren sembol (`js/zehir.js`): ölümcül = kırmızı kurukafa (karaciğer, böbrek, genel), sinir sistemi, terleme/salya, kusma-ishal; alan yoksa "etkisi bilinmiyor" (en kötüsü). Dokununca belirtiler, ne kadar sürede başladığı (ör. mide 30 dk–3 sa, karaciğer 6–24 sa ve sahte iyileşme, böbrek 2–20 gün), "erken başlaması hafif demek değildir" uyarısı ve 114/112 açılır. Türün tipi `veri/turler.json` → `zehirTipi` (açıklamadan alındı). Belirti ve süreler TASLAK: UZEM ve hekimle doğrulanmalı.
- **Tanımlamada çizim yok, gerçek fotoğraf (Metin'in kuralı, 2026-10-26):** İki akışta da adım ve seçenek görselleri sözlükteki işaretli gerçek fotoğraflardır (`js/isaretliFoto.js`); fotoğrafı olmayan adımda görsel gösterilmez (çizimler `js/cizimler.js`'te veri olarak duruyor). Fotoğrafı eksik olanlar: küçük kahverengi mantar, genç mantar kesiti (içeride taslak), kesince maviye dönme, ezince renk değişimi, düz/kırışık alt yüzey. Ticari kullanıma uygun lisanslı fotoğraf bulunup sözlük fotoğrafları gibi eklenmeli.
- **Fotoğraf kıyası (isteğe bağlı, varsayılan kapalı):** Küçük bir yapay zeka modeli (MobileNet V2, Apache 2.0; `vendor/mobilenet/`, son katmanı atılmış ve 8 bite sıkıştırılmış, `scripts/model-hazirla.js`) ve TensorFlow.js 4.22.0 (`vendor/tf.min.js`, lisans `vendor/LICENSE-tensorflow.txt`) telefonda çalışır. Uygulamayla indirilmez; kullanıcı "Fotoğraf kıyası"nı açınca bir kez ~2 MB iner, `sw.js`'teki ayrı model önbelleğinde kalır (sürüm değişince silinmez), sonra internetsiz çalışır. Fotoğraf hiçbir yere gitmez. Kıyas yalnızca sıralar ve soru sırasını etkiler; hiçbir türü elemez, sonucun rengini değiştirmez (test denetler). Türlerin parmak izleri `vendor/mobilenet/parmak-izleri.json` (`node scripts/parmak-izi-uret.js`, Playwright gerekir). **Zayıf yanı:** her türün tek fotoğrafı var; farklı bir fotoğrafla benzerlik çoğunlukla düşük çıkar ("az benziyor"). İyileştirmek için `fotograflar/referans/<tür-id>/` altına tür başına 10–20 ticari kullanıma uygun lisanslı fotoğraf (kaynağıyla) koyup betiği yeniden çalıştır; fotoğraflar uygulamaya girmez, yalnızca izleri girer.
- **Sesli yönlendirme ve komut (hızlı tanımlama):** Ayar cihazda (`sesliTanimlama`, `ellerSerbest`, `fotoKiyasi`). Okuma telefonun yerel Türkçe sesiyle (`js/ses.js`). Sesli komutlar ("çek", "evet", "hayır", "bilmiyorum", "tekrar", "geri", seçenek adları; `js/sesliKomut.js`) yalnızca telefon içi ses tanıma varsa çalışır (`processLocally`); konuşma hiçbir yere gitmez, yoksa düğmeler çalışır. "Eller serbest çekim" açıkken kamera 5 sn geri sayıp kendisi çeker. Google'ın (internetli) ses tanıması kullanılmaz: Metin böyle bir şey istemedi, soru yanlış anlaşılmadan çıkmıştı (Metin, 2026-10-26). Konuşma telefondan hiçbir zaman çıkmaz.
- **Sözlük fotoğrafları (Metin'in isteği, 2026-10-26: çizimler anlaşılmıyordu):** Sözlükteki her terim, bölümleri üzerine işaretlenmiş gerçek bir fotoğrafla gösterilir (`js/sozluk.js` → `SOZLUK_FOTOGRAFLARI`, dosyalar `fotograflar/sozluk-*.jpg`). İşaretlerin yeri fotoğrafın yüzdesi olarak yazılır. **Telif kuralı:** yalnızca ticari kullanıma izin veren lisanslar (CC0, kamu malı, CC BY, CC BY-SA; NC/ND asla). Fotoğraf kırpılıp işaretlendiği için altında çeken, lisans, Commons dosya adı ve "kırpıldı ve işaret eklendi; aynı lisansla paylaşılır" yazar (CC BY-SA bunu ister). Kodda tam web adresi yazılmaz (kural 12 testi), Commons dosya adı yazılır. Test bunları denetler.

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
