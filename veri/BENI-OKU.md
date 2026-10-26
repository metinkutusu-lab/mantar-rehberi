# Tür verisi (mikolog için)

`turler.json` dosyası uygulamanın tanıyabileceği türleri tutar. Şu an içindeki 26 tür **TASLAK**tır: genel alan rehberi bilgisinden derlendi, kaynaklarla tek tek doğrulanmadı ve hiçbiri mikolog onaylı değildir. Onaysız türler sonucu en fazla turuncu yapar; zehirli türler sonucu kırmızı yapar.

Uygulamada **Ansiklopedi** sekmesinde her türün altında "Uygulamanın kullandığı özellikler (uzman kontrolü için)" bölümü vardır; bir uzman listeyi oradan da okuyabilir.

**Uzmandan istenen:** Her türün adı, zehirliliği, açıklaması, zehirli benzerleri ve özellik listelerinin doğruluğu. Özellikle ölümcül türlerin listeleri yeterince geniş mi (bu türler kullanıcının hatalı bir cevabıyla elenmemeli)? Onaylanan kayıtta `mikologOnayi: true`, `onaylayan` ve `onayTarihi` doldurulur.

## Bir tür kaydı

```json
{
  "id": "kisa-tekil-ad",
  "ad": "Türkçe yerel ad",
  "bilimselAd": "Genus species",
  "zehirlilik": "olumcul",
  "mikologOnayi": false,
  "onaylayan": "",
  "onayTarihi": "",
  "kaynak": "TASLAK: ...",
  "aciklama": "Kullanıcıya gösterilen kısa tanım.",
  "karistirilanlar": ["Zehirli türler için: karıştırıldığı yenen türlerin adları"],
  "ozellikler": {
    "sapkaRengi": ["beyaz", "yesil-zeytin"],
    "altYapi": ["solungac"],
    "solungacRengi": ["beyaz"],
    "halka": ["evet"],
    "volva": ["evet"]
  },
  "zehirliBenzerler": []
}
```

- **zehirlilik:** `olumcul`, `zehirli` veya `yenen`. Bunların dışındaki her değer (boş dahil) zehirli sayılır.
- **zehirTipi** (zehirli türlerde): zehrin ne yaptığı, sembolü ve belirtileri `js/zehir.js`'te: `karaciger`, `bobrek`, `olumcul`, `sinir`, `ter`, `mide`. Türün açıklamasından alındı (TASLAK). Yoksa "etkisi bilinmiyor" gösterilir.
- **mikologOnayi:** Yalnızca bir mikolog kaydı onayladıysa `true` yapılır. Onaysız `yenen` bir tür hiçbir zaman sarı sonuç vermez.
- **ozellikler:** Her soru için bu türde görülebilecek **bütün** cevaplar. Bir soru yazılmazsa o soru bu türü elemez. Tür, kullanıcının kesin cevabı listede yoksa elenir. Bu yüzden listeler cömert tutulmalı: genç ve yaşlı örnekleri, renk değişkenliğini kapsamalı.
- **zehirliBenzerler:** `yenen` türler için zorunlu. Her biri `{ "ad": "...", "fark": "ayırt edici fark" }`.

## Sorular ve geçerli cevaplar

Sorular ve metinleri `js/sorular.js` dosyasındadır. Geçerli değerler:

| Soru | Değerler |
| --- | --- |
| sapkaRengi | beyaz, krem-sari, kahverengi, kirmizi-turuncu, yesil-zeytin, gri-siyah |
| kucukKahverengi | evet, hayir |
| genc | evet, hayir |
| kesitteTaslak | evet, hayir |
| altYapi | solungac, gozenek, diken, duz |
| solungacRengi | beyaz, krem-sari, pembe, kahverengi, koyu |
| halka | evet, hayir |
| volva | evet, hayir |
| kesinceRenk | degismedi, mavi, kirmizi-pembe, sari |
| sut | yok, beyaz, turuncu-kirmizi |
| ezince | degismedi, mavi, sari, kirmizi-kahve |
| koku | un, anason, turp, kotu, kokusuz |
| zemin | toprak, odun, cayir |
| agac | yaprakli, igne, karisik, yok |
| sporIzi | beyaz, krem, pembe, kahverengi, koyu |

"diger", "bilmiyorum" ve "yapilmadi" cevapları hiçbir türü elemez.

Uygulamanın güvenlik kuralları (Amanita, genç mantar, küçük kahverengi mantar) tür listesinden bağımsız çalışır ve her zaman önce gelir.
