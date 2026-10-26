// Basit, şematik çizimler (SVG). Renkler css/stil.css'teki --cz-* değişkenlerinden gelir.
// Gerçek bir türü değil, bakılacak yeri gösterirler.

function svg(genislik, yukseklik, etiket, icerik) {
  return `<svg viewBox="0 0 ${genislik} ${yukseklik}" role="img" aria-label="${etiket}">${icerik}</svg>`;
}

// Yandan görünen mantar gövdesi; halka ve volva isteğe bağlı.
function yandanMantar({ x = 80, ust = 50, genislik = 100, ayakBoyu = 50, halka = '', taban = '' } = {}) {
  const sol = x - genislik / 2;
  const sag = x + genislik / 2;
  const ayakSol = x - 8;
  return `
    <rect class="cz-ayak cz-kenar" x="${ayakSol}" y="${ust + 6}" width="16" height="${ayakBoyu}" rx="4"/>
    ${taban}
    <path class="cz-sapka cz-kenar" d="M${sol} ${ust} Q${x} ${ust - genislik * 0.55} ${sag} ${ust} Z"/>
    <path class="cz-ayak cz-kenar" d="M${sol + 3} ${ust} L${sag - 3} ${ust} L${sag - 12} ${ust + 7} L${sol + 12} ${ust + 7} Z"/>
    ${halka}`;
}

function radyalCizgiler(cx, cy, ic, dis, adet) {
  let yol = '';
  for (let i = 0; i < adet; i++) {
    const a = (i / adet) * Math.PI * 2;
    yol += `M${(cx + Math.cos(a) * ic).toFixed(1)} ${(cy + Math.sin(a) * ic).toFixed(1)} L${(cx + Math.cos(a) * dis).toFixed(1)} ${(cy + Math.sin(a) * dis).toFixed(1)} `;
  }
  return `<path class="cz-ince" d="${yol}"/>`;
}

function delikler(cx, cy, r) {
  let daireler = '';
  for (let x = cx - r; x <= cx + r; x += 7) {
    for (let y = cy - r; y <= cy + r; y += 7) {
      if ((x - cx) ** 2 + (y - cy) ** 2 < (r - 4) ** 2) daireler += `<circle class="cz-delik" cx="${x}" cy="${y}" r="2"/>`;
    }
  }
  return daireler;
}

const toprak = (y) => `<rect class="cz-toprak" x="0" y="${y}" width="160" height="${120 - y}"/><path class="cz-ince" d="M0 ${y} H160"/>`;

export const CIZIMLER = {
  anatomi: svg(220, 160, 'Mantarın bölümleri', `
    <rect class="cz-toprak" x="0" y="140" width="220" height="20"/>
    <path class="cz-ince" d="M0 140 H220"/>
    <path class="cz-ayak cz-kenar" d="M92 152 Q90 130 100 127 L120 127 Q130 130 128 152 Z"/>
    <rect class="cz-ayak cz-kenar" x="101" y="76" width="18" height="62" rx="4"/>
    <path class="cz-ayak cz-kenar" d="M99 92 Q110 101 121 92 L125 100 Q110 110 95 100 Z"/>
    <path class="cz-sapka cz-kenar" d="M50 70 Q110 4 170 70 Z"/>
    <path class="cz-ayak cz-kenar" d="M53 70 L167 70 L158 78 L62 78 Z"/>
    <path class="cz-ince" d="M14 42 L68 52 M150 76 L172 88 M124 100 L142 108 M100 118 L80 118 M128 144 L144 150"/>
    <text class="cz-etiket" x="4" y="38">Şapka</text>
    <text class="cz-etiket" x="164" y="100">Solungaç</text>
    <text class="cz-etiket" x="144" y="116">Halka</text>
    <text class="cz-etiket" x="46" y="122">Ayak</text>
    <text class="cz-etiket" x="146" y="156">Volva</text>`),

  ust: svg(160, 120, 'Üstten görünüş', `
    <circle class="cz-sapka cz-kenar" cx="80" cy="60" r="44"/>
    <circle class="cz-ayak" cx="62" cy="44" r="4" opacity="0.8"/>
    <circle class="cz-ayak" cx="95" cy="40" r="3" opacity="0.8"/>
    <circle class="cz-ayak" cx="100" cy="72" r="4" opacity="0.8"/>
    <circle class="cz-ayak" cx="66" cy="80" r="3" opacity="0.8"/>
    <circle class="cz-ayak" cx="82" cy="58" r="3" opacity="0.8"/>`),

  kucukKahverengi: svg(160, 120, 'Küçük kahverengi mantarlar', `
    ${toprak(100)}
    <rect class="cz-ayak cz-kenar" x="40" y="62" width="6" height="38" rx="2"/>
    <path class="cz-kahve cz-kenar" d="M28 64 Q43 40 58 64 Z"/>
    <rect class="cz-ayak cz-kenar" x="78" y="54" width="7" height="46" rx="2"/>
    <path class="cz-kahve cz-kenar" d="M64 56 Q81 28 98 56 Z"/>
    <rect class="cz-ayak cz-kenar" x="115" y="70" width="5" height="30" rx="2"/>
    <path class="cz-kahve cz-kenar" d="M106 72 Q117 54 129 72 Z"/>`),

  genc: svg(160, 120, 'Genç ve olgun mantar', `
    ${toprak(104)}
    <ellipse class="cz-ayak cz-kenar" cx="42" cy="80" rx="20" ry="25"/>
    <path class="cz-ince" d="M70 70 H90 M84 64 L90 70 L84 76"/>
    ${yandanMantar({ x: 122, ust: 56, genislik: 58, ayakBoyu: 42 })}
    <text class="cz-not" x="26" y="20">genç</text>
    <text class="cz-not" x="104" y="20">olgun</text>`),

  'kesit-bicak': svg(160, 120, 'Genç mantarı ikiye kesme', `
    <ellipse class="cz-ayak cz-kenar" cx="80" cy="64" rx="30" ry="38"/>
    <path class="cz-vurgu-cizgi" d="M80 14 V114" stroke-dasharray="6 5"/>
    <path class="cz-bicak" d="M108 10 L86 32 L82 28 L104 6 Z"/>
    <rect class="cz-kenar cz-sap" x="104" y="-2" width="10" height="20" rx="3" transform="rotate(45 109 8)"/>`),

  'kesit-evet': svg(80, 60, 'İçinde mantar taslağı var', `
    <ellipse class="cz-ayak cz-kenar" cx="40" cy="31" rx="20" ry="26"/>
    <path class="cz-vurgu-cizgi" d="M28 28 Q40 12 52 28 Z M37 28 V46 M43 28 V46 M37 46 H43"/>`),

  'kesit-hayir': svg(80, 60, 'İçi düz ve tek renk', `
    <ellipse class="cz-ayak cz-kenar" cx="40" cy="31" rx="20" ry="26"/>
    <ellipse class="cz-ic" cx="40" cy="31" rx="15" ry="21"/>`),

  'alt-solungac': svg(80, 60, 'Solungaç', `
    <circle class="cz-ayak cz-kenar" cx="40" cy="30" r="26"/>
    ${radyalCizgiler(40, 30, 6, 25, 36)}
    <circle class="cz-ayak cz-kenar" cx="40" cy="30" r="5"/>`),

  'alt-gozenek': svg(80, 60, 'Gözenek', `
    <circle class="cz-gozenek cz-kenar" cx="40" cy="30" r="26"/>
    ${delikler(40, 30, 26)}`),

  'alt-diken': svg(80, 60, 'Diken', `
    <path class="cz-sapka cz-kenar" d="M8 30 Q40 0 72 30 Z"/>
    ${[12, 19, 26, 33, 40, 47, 54, 61].map((x) => `<path class="cz-ayak cz-kenar" d="M${x} 30 L${x + 3.5} 42 L${x + 7} 30 Z"/>`).join('')}`),

  'alt-duz': svg(80, 60, 'Düz veya kırışık', `
    <circle class="cz-ayak cz-kenar" cx="40" cy="30" r="26"/>
    <path class="cz-ince" d="M22 22 Q30 18 38 24 T56 22 M18 32 Q28 28 38 34 T62 32 M24 42 Q32 38 40 44 T56 42"/>`),

  halka: svg(160, 120, 'Ayakta halka', `
    ${toprak(108)}
    ${yandanMantar({
      ust: 46,
      genislik: 104,
      ayakBoyu: 56,
      halka: '<path class="cz-vurgu cz-kenar" d="M70 66 Q80 76 90 66 L95 75 Q80 88 65 75 Z"/>',
    })}`),

  volva: svg(160, 120, 'Ayak dibinde torba (volva)', `
    ${toprak(84)}
    ${yandanMantar({
      ust: 36,
      genislik: 90,
      ayakBoyu: 64,
      taban: '<path class="cz-vurgu-dolgu cz-vurgu-cizgi" d="M62 112 Q58 86 70 84 L90 84 Q102 86 98 112 Z"/>',
    })}
    <text class="cz-not" x="104" y="104">toprağın altında</text>`),

  kesinceRenk: svg(160, 120, 'Kesince renk değişimi', `
    <rect class="cz-ayak cz-kenar" x="56" y="54" width="22" height="54" rx="4"/>
    <path class="cz-ayak cz-kenar" d="M20 58 Q67 8 114 58 Z"/>
    <path class="cz-mavi" d="M30 56 Q67 18 104 56 Z" opacity="0.55"/>
    <rect class="cz-mavi" x="60" y="58" width="14" height="46" rx="3" opacity="0.55"/>
    <circle class="cz-kenar cz-saat" cx="132" cy="30" r="16"/>
    <path class="cz-ince" d="M132 20 V30 L139 34"/>`),

  sut: svg(160, 120, 'Süt akması', `
    <path class="cz-sapka cz-kenar" d="M20 40 Q80 -10 140 40 Z"/>
    <path class="cz-ayak cz-kenar" d="M24 40 L136 40 L126 50 L34 50 Z"/>
    <path class="cz-ince" d="M44 41 V49 M56 41 V49 M68 41 V49 M80 41 V49 M92 41 V49 M104 41 V49 M116 41 V49"/>
    <path class="cz-damla cz-kenar" d="M62 58 Q56 68 62 72 Q68 68 62 58 Z"/>
    <path class="cz-damla cz-kenar" d="M86 62 Q80 74 86 78 Q92 74 86 62 Z"/>
    <path class="cz-damla cz-kenar" d="M104 56 Q100 63 104 66 Q108 63 104 56 Z"/>
    <path class="cz-bicak" d="M30 96 L110 64 L114 70 L34 102 Z"/>`),

  sporIzi: svg(160, 120, 'Spor izi', `
    <rect class="cz-kagit-beyaz cz-kenar" x="20" y="70" width="60" height="40"/>
    <rect class="cz-kagit-siyah cz-kenar" x="80" y="70" width="60" height="40"/>
    <ellipse class="cz-spor" cx="80" cy="90" rx="44" ry="12"/>
    <path class="cz-sapka cz-kenar" d="M40 84 Q80 40 120 84 Z"/>
    <path class="cz-ince" d="M32 84 V30 Q32 22 40 22 H120 Q128 22 128 30 V84"/>`),
};
