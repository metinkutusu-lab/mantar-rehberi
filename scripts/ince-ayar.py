# Fotoğraf modelinin mantar fotoğraflarıyla ince ayarı (Metin'in onayı, 2026-10-27: "GitHub'da dene; daha iyi çıkarsa yükle").
# Genel amaçlı MobileNet V2 (ImageNet, Apache 2.0) mantar türlerini ayırmayı öğrensin diye eğitim fotoğraflarıyla yeniden
# eğitilir; telefona yalnızca "parmak izi" çıkaran kısmı gider (çıkış 1280 sayı, eski modelle aynı biçim). Tür, şapka rengi
# ve şapka altı ayırıcıları bu yeni izlerle ayrıca öğrenilir (scripts/tur-ayirici-egit.js).
# Girdi: fotograflar/egitim-listesi.json (scripts/egitim-listesi.js). Çıktı: SavedModel klasörü (ilk argüman).
# Yalnızca GitHub'da (scripts/ince-ayar-dene.js) çalışır; Metin'in bilgisayarına hiçbir şey kurulmaz.
import json
import math
import os
import random
import sys

import tensorflow as tf

CIKTI = sys.argv[1]
BOYUT = 224
TOPLU = 48
random.seed(7)
tf.random.set_seed(7)

liste = json.load(open('fotograflar/egitim-listesi.json', encoding='utf-8'))
siniflar = liste['siniflar']
ornekler = liste['ornekler']
random.shuffle(ornekler)
# Eğitimi izlemek için küçük bir doğrulama payı (asıl karar sabit deneme setiyle verilir).
dogrulama = ornekler[: len(ornekler) // 20]
egitim = ornekler[len(ornekler) // 20 :]

# Fotoğrafı az olan türler geri kalmasın: her türün toplam ağırlığı eşit.
sayilar = [0] * len(siniflar)
for o in egitim:
    sayilar[o['sinif']] += 1
agirliklar = {i: len(egitim) / (len(siniflar) * max(1, n)) for i, n in enumerate(sayilar)}


def oku(dosya, sinif, egitimde):
    resim = tf.io.decode_jpeg(tf.io.read_file(dosya), channels=3)
    resim = tf.image.convert_image_dtype(resim, tf.float32)  # 0–1, telefondaki gibi
    kisa = tf.reduce_min(tf.shape(resim)[:2])
    if egitimde:
        # Mantar fotoğrafta farklı büyüklükte ve yerde olabilir: rastgele kare kesit, ayna, hafif ışık oynaması.
        oran = tf.random.uniform([], 0.55, 1.0)
        kenar = tf.cast(tf.cast(kisa, tf.float32) * oran, tf.int32)
        resim = tf.image.random_crop(resim, [kenar, kenar, 3])
        resim = tf.image.random_flip_left_right(resim)
        resim = tf.image.random_brightness(resim, 0.12)
        resim = tf.image.random_saturation(resim, 0.8, 1.2)
        resim = tf.clip_by_value(resim, 0.0, 1.0)
    else:
        resim = tf.image.resize_with_crop_or_pad(resim, kisa, kisa)  # telefondaki gibi ortadan kare
    resim = tf.image.resize(resim, [BOYUT, BOYUT])
    return resim, sinif


def veri(liste_, egitimde):
    d = tf.data.Dataset.from_tensor_slices(([o['dosya'] for o in liste_], [o['sinif'] for o in liste_]))
    if egitimde:
        d = d.shuffle(4096, reshuffle_each_iteration=True)
    d = d.map(lambda a, b: oku(a, b, egitimde), num_parallel_calls=tf.data.AUTOTUNE)
    return d.batch(TOPLU).prefetch(tf.data.AUTOTUNE)


egitim_verisi = veri(egitim, True)
dogrulama_verisi = veri(dogrulama, False)

girdi = tf.keras.Input([BOYUT, BOYUT, 3])
olcekli = tf.keras.layers.Rescaling(2.0, offset=-1.0)(girdi)  # MobileNet V2 -1…1 bekler; telefon 0–1 verir
taban = tf.keras.applications.MobileNetV2(include_top=False, weights='imagenet', input_shape=[BOYUT, BOYUT, 3], pooling='avg')
iz = taban(olcekli)
cikis = tf.keras.layers.Dense(len(siniflar), activation='softmax')(tf.keras.layers.Dropout(0.3)(iz))
model = tf.keras.Model(girdi, cikis)

# 1. Önce yalnızca son katman (taban dondurulmuş).
taban.trainable = False
model.compile(tf.keras.optimizers.Adam(1e-3), 'sparse_categorical_crossentropy', ['accuracy'])
model.fit(egitim_verisi, validation_data=dogrulama_verisi, epochs=int(os.environ.get('ILK_TUR', 3)), class_weight=agirliklar, verbose=2)

# 2. Sonra tabanın son katmanları da (küçük öğrenme hızıyla; genel bilgi bozulmasın).
taban.trainable = True
for katman in taban.layers[: int(os.environ.get('DONUK_KATMAN', 100))]:
    katman.trainable = False
for katman in taban.layers:
    if isinstance(katman, tf.keras.layers.BatchNormalization):
        katman.trainable = False
turlar = int(os.environ.get('INCE_TUR', 6))
adim = math.ceil(len(egitim) / TOPLU) * turlar
model.compile(tf.keras.optimizers.Adam(tf.keras.optimizers.schedules.CosineDecay(2e-4, adim)), 'sparse_categorical_crossentropy', ['accuracy'])
model.fit(egitim_verisi, validation_data=dogrulama_verisi, epochs=turlar, class_weight=agirliklar, verbose=2)

# Telefona yalnızca parmak izi kısmı gider: 0–1 resim → 1280 sayı.
iz_modeli = tf.keras.Model(girdi, iz)


@tf.function(input_signature=[tf.TensorSpec([None, BOYUT, BOYUT, 3], tf.float32, name='resim')])
def hizmet(resim):
    return {'iz': iz_modeli(resim, training=False)}


tf.saved_model.save(iz_modeli, CIKTI, signatures={'serving_default': hizmet})
print('İnce ayar bitti:', CIKTI)
