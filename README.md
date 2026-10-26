# MushKey

Doğada mantar toplayanlar için internetsiz çalışan bir güvenlik rehberi. İlk sürüm Türkçe.

Uygulama: https://metinkutusu-lab.github.io/mantar-rehberi/

> **Uyarı:** Eğitim amaçlı bir rehberdir. Bir mantarı yemeye tek başına bu uygulamayla karar verilemez. Tür bilgileri taslaktır ve henüz bir mantar uzmanı tarafından onaylanmamıştır.

## Bu depoda çalışacaklar için (insan ya da yapay zeka)

- **Önce `CLAUDE.md` dosyasını oku.** Değiştirilemez güvenlik kuralları, kararlar ve çalışma biçimi orada.
- Bu depo uygulamanın **asıl kaynak kodudur** ve GitHub Pages doğrudan buradan yayınlar (derleme adımı yok). `main` dalına giren her şey yaklaşık 1 dakikada yayına çıkar.
- Her değişiklikten önce ve sonra testleri çalıştır: `npm test` (Node.js 20+). Güvenlik testleri asla silinmez, atlanmaz, gevşetilmez.
- Yeni bir dosya eklenince `sw.js` içindeki `DOSYALAR` listesine eklenmeli ve `SURUM` artırılmalı (internetsiz çalışma için).
- Klasörler: `js/` (uygulama, güvenlik kuralları `js/kurallar.js`), `css/`, `veri/` (tür listesi), `fotograflar/`, `ikonlar/`, `test/`, `scripts/`, `notlar/`.

## Telif hakkı

© 2026 metinkutusu-lab. Tüm hakları saklıdır.

Bu depodaki kod, metinler, tür bilgileri ve çizimler 5846 sayılı Fikir ve Sanat Eserleri Kanunu kapsamında korunmaktadır. Kodun herkese açık olması, kopyalama, değiştirme, dağıtma veya başka bir uygulamada kullanma izni vermez. Bunlar için sahibinden yazılı izin alınmalıdır.

Bu telif notu tür fotoğraflarını kapsamaz; fotoğraflar aşağıda yazan kendi lisanslarına tabidir.

## Kullanılan dış kaynaklar

- Tür fotoğrafları: [Wikimedia Commons](https://commons.wikimedia.org). Her fotoğrafın çekeni, lisansı (CC BY, CC BY-SA veya kamu malı) ve dosya adı uygulamada fotoğrafın altında ve `veri/turler.json` dosyasında yazar. Fotoğraflar küçültülmüştür; CC BY-SA lisanslı fotoğrafların küçültülmüş halleri de aynı lisansla (CC BY-SA) paylaşılır.
- Hava verisi: [Open-Meteo.com](https://open-meteo.com), CC BY 4.0. Ticari olmayan kullanım için ücretsizdir.
- Yer adları: [GeoNames](https://www.geonames.org) (Open-Meteo yer arama servisi aracılığıyla), CC BY 4.0.
