// Sürüm satırı: uygulamada görünen sürüm, service worker'ın sürümüyle aynı olmalı (yoksa "son sürüm yüklü" yanlış olur).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SURUM, TARIH } from '../js/surum.js';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const oku = (dosya) => readFileSync(path.join(KOK, dosya), 'utf8');

test('sürüm: js/surum.js ile sw.js aynı sürümü gösterir; tarih geçerli', () => {
  assert.equal(/const SURUM = '([^']+)'/.exec(oku('sw.js'))[1], SURUM);
  assert.match(TARIH, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(new Date(TARIH).getTime()));
});

test('sürüm: sürüm dosyaları çevrimdışı önbellekte', () => {
  const sw = oku('sw.js');
  for (const dosya of ['./js/surum.js', './js/surumSatiri.js']) assert.ok(sw.includes(`'${dosya}'`), dosya);
});
