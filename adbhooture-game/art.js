/* অদ্ভুতুড়ে: ink-wash scenes drawn in SVG. Original drawings, no external images. */
(function () {
  'use strict';
  var INK = '#07030a', INK2 = '#140a1b', INK3 = '#22132c', SEP = '#6b4a35', CREAM = '#efe3c8', FL = '#f2a640';
  var uid = 0;

  function svg(inner, sky) {
    var id = 'g' + (++uid);
    sky = sky || ['#2b1838', '#120818'];
    return '<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset="1" stop-color="' + sky[1] + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="' + FL + '" stop-opacity=".55"/><stop offset=".4" stop-color="' + FL + '" stop-opacity=".12"/><stop offset="1" stop-color="' + FL + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'm"><stop offset="0" stop-color="' + CREAM + '" stop-opacity=".5"/><stop offset="1" stop-color="' + CREAM + '" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="400" height="240" fill="url(#' + id + 's)"/>' +
      inner.replace(/#G#/g, 'url(#' + id + 'g)').replace(/#M#/g, 'url(#' + id + 'm)') +
      // ink wash bottom smear
      '<path d="M0 225 Q60 212 120 228 T250 222 T400 226 V240 H0Z" fill="' + INK + '" opacity=".9"/>' +
      '</svg>';
  }
  function moon(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 3.2) + '" fill="#M#"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + CREAM + '" opacity=".88"/>' +
      '<circle cx="' + (x + r * .35) + '" cy="' + (y - r * .2) + '" r="' + r + '" fill="#2b1838" opacity=".55"/>';
  }
  function rain(n, op) {
    var s = '<g class="rain" stroke="' + CREAM + '" stroke-width=".6" opacity="' + (op || .18) + '">';
    for (var i = 0; i < n; i++) {
      var x = (i * 37) % 410, y = (i * 53) % 220 - 30, d = (i % 5) * .2;
      s += '<line x1="' + x + '" y1="' + y + '" x2="' + (x - 4) + '" y2="' + (y + 14) + '" style="animation-delay:-' + d + 's"/>';
    }
    return s + '</g>';
  }
  function candle(x, y, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<circle r="60" cy="-14" fill="#G#" class="flk"/>' +
      '<rect x="-4" y="-6" width="8" height="24" fill="' + CREAM + '" opacity=".85"/>' +
      '<path d="M0 -22 C5 -14 5 -9 0 -6 C-5 -9 -5 -14 0 -22Z" fill="' + FL + '" class="flk"/></g>';
  }
  function wires() {
    return '<path d="M-10 40 Q200 70 410 34" stroke="' + INK + '" stroke-width="1.2" fill="none"/>' +
      '<path d="M-10 52 Q200 84 410 46" stroke="' + INK + '" stroke-width="1" fill="none"/>';
  }
  function houseRow(base, seed) {
    var s = '', x = -10, i = 0;
    while (x < 410) {
      var w = 50 + ((seed * (i + 3) * 7) % 40), h = 70 + ((seed * (i + 5) * 13) % 70);
      s += '<rect x="' + x + '" y="' + (base - h) + '" width="' + w + '" height="' + h + '" fill="' + (i % 2 ? INK2 : INK) + '"/>';
      // balcony rail
      s += '<path d="M' + (x + 6) + ' ' + (base - h + 28) + ' h' + (w - 12) + '" stroke="' + INK3 + '" stroke-width="3"/>';
      for (var k = 0; k < 3; k++) s += '<rect x="' + (x + 8 + k * (w - 16) / 3) + '" y="' + (base - h + 36) + '" width="6" height="12" fill="' + INK3 + '"/>';
      if ((i + seed) % 4 === 1) s += '<rect x="' + (x + w / 2 - 5) + '" y="' + (base - h + 40) + '" width="10" height="14" fill="' + FL + '" opacity=".55" class="flk"/>';
      x += w; i++;
    }
    return s;
  }

  var S = {};
  S.tram = function () {
    return svg(moon(320, 50, 16) + wires() + houseRow(170, 3) +
      '<rect x="0" y="170" width="400" height="60" fill="' + INK2 + '"/>' +
      '<path d="M0 205 L400 200 M0 214 L400 209" stroke="' + SEP + '" stroke-width="1.3" opacity=".6"/>' +
      '<g transform="translate(80 120)"><rect width="200" height="70" rx="8" fill="' + INK + '"/>' +
      '<rect y="58" width="200" height="6" fill="' + SEP + '" opacity=".5"/>' +
      [0, 1, 2, 3, 4, 5].map(function (i) { return '<rect x="' + (12 + i * 31) + '" y="12" width="22" height="26" fill="' + FL + '" opacity="' + (i === 3 ? .05 : .32) + '" class="' + (i === 1 ? 'flk' : '') + '"/>'; }).join('') +
      '<path d="M100 0 L120 -60 L140 -66" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
      '<circle cx="30" cy="72" r="7" fill="' + INK + '"/><circle cx="170" cy="72" r="7" fill="' + INK + '"/>' +
      '<rect x="105" y="16" width="10" height="20" fill="' + INK + '" class="ghostfig"/></g>' + rain(40), ['#2a1838', '#0f0715']);
  };
  S.lane = function () {
    return svg(moon(200, 34, 10) +
      '<path d="M0 0 L150 60 L150 230 L0 240Z" fill="' + INK2 + '"/><path d="M400 0 L250 60 L250 230 L400 240Z" fill="' + INK + '"/>' +
      '<path d="M150 230 L250 230 L400 240 L0 240Z" fill="' + INK3 + '"/>' +
      '<rect x="40" y="70" width="30" height="40" fill="' + INK + '"/><path d="M40 80h30M40 90h30M40 100h30M50 70v40M60 70v40" stroke="' + INK3 + '"/>' +
      '<rect x="320" y="100" width="34" height="46" fill="' + FL + '" opacity=".22" class="flk"/>' +
      '<path d="M150 60 Q200 80 250 60" stroke="' + INK + '" fill="none"/>' +
      '<path d="M190 150 v80 M210 150 v80" stroke="' + INK + '" stroke-width="3"/><circle cx="200" cy="146" r="6" fill="' + INK + '"/>' +
      '<ellipse cx="200" cy="232" rx="40" ry="3" fill="' + CREAM + '" opacity=".06"/>' +
      '<g class="ghostfig"><path d="M196 120 q4 -10 8 0 l2 30 h-12z" fill="' + CREAM + '" opacity=".5"/></g>', ['#21122b', '#0a050e']);
  };
  S.house = function () {
    return svg(moon(330, 44, 14) +
      '<path d="M60 230 V80 L200 40 L340 80 V230Z" fill="' + INK + '"/>' +
      '<path d="M60 80 L200 40 L340 80" stroke="' + INK3 + '" stroke-width="3" fill="none"/>' +
      [0, 1, 2, 3].map(function (i) { return '<path d="M' + (88 + i * 64) + ' 150 v-36 q14 -18 28 0 v36z" fill="' + INK3 + '"/>'; }).join('') +
      '<path d="M216 150 v-36 q14 -18 28 0 v36z" fill="' + FL + '" opacity=".3" class="flk"/>' +
      '<path d="M70 160 H330" stroke="' + INK3 + '" stroke-width="4"/>' +
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (i) { return '<rect x="' + (76 + i * 20) + '" y="160" width="4" height="18" fill="' + INK3 + '"/>'; }).join('') +
      '<path d="M180 230 v-40 q20 -20 40 0 v40z" fill="#0b050e" stroke="' + SEP + '" stroke-width="1.5"/>' +
      '<path d="M20 230 Q30 150 70 120 Q40 170 50 230Z" fill="' + INK + '"/><path d="M360 230 Q370 120 400 100 V230Z" fill="' + INK + '"/>', ['#2c1a3a', '#0d0612']);
  };
  S.courtyard = function () {
    return svg('<rect x="0" y="0" width="400" height="240" fill="' + INK + '"/>' +
      '<rect x="110" y="0" width="180" height="70" fill="#2b1838"/>' + moon(250, 30, 10) +
      '<path d="M0 0 H110 V200 L0 240Z M400 0 H290 V200 L400 240Z" fill="' + INK2 + '"/>' +
      [0, 1, 2].map(function (i) { return '<path d="M120 ' + (80 + i * 46) + ' H280" stroke="' + INK3 + '" stroke-width="4"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (k) { return '<rect x="' + (124 + k * 20) + '" y="' + (80 + i * 46) + '" width="3" height="16" fill="' + INK3 + '"/>'; }).join(''); }).join('') +
      '<path d="M110 200 H290 L400 240 H0Z" fill="' + INK3 + '"/>' +
      '<rect x="185" y="186" width="30" height="20" fill="' + INK + '" stroke="' + SEP + '"/>' +
      '<path d="M130 0 L134 60 M270 0 L266 50" stroke="' + SEP + '" opacity=".4"/>' +
      '<path d="M150 70 q10 30 0 50 M250 66 q-6 20 2 46" stroke="' + INK3 + '" fill="none" stroke-width="2"/>' +
      '<g class="sway"><path d="M200 70 v40" stroke="' + SEP + '"/><path d="M188 110 h24 l-6 24 h-12z" fill="' + CREAM + '" opacity=".25"/></g>', ['#1d1026', '#08040b']);
  };
  S.stairs = function () {
    var s = '';
    for (var i = 0; i < 10; i++) s += '<path d="M' + (40 + i * 26) + ' ' + (230 - i * 18) + ' h40 v18 h-40z" fill="' + (i % 2 ? INK2 : INK3) + '"/>';
    return svg('<rect width="400" height="240" fill="' + INK + '"/>' + s +
      '<path d="M40 214 L300 50" stroke="' + SEP + '" stroke-width="3"/>' +
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return '<path d="M' + (50 + i * 28) + ' ' + (208 - i * 17.6) + ' v26" stroke="' + SEP + '" stroke-width="1.5" opacity=".7"/>'; }).join('') +
      '<rect x="300" y="0" width="100" height="70" fill="' + INK2 + '"/>' +
      '<path d="M330 30 v40" stroke="' + INK3 + '"/>' + candle(90, 200, .7) +
      '<g class="ghostfig"><path d="M315 46 q6 -14 12 0 l3 30 h-18z" fill="' + CREAM + '" opacity=".45"/></g>', ['#120818', '#06030a']);
  };
  S.room = function () {
    return svg('<rect width="400" height="240" fill="' + INK2 + '"/>' +
      '<path d="M0 180 H400 V240 H0Z" fill="' + INK + '"/>' +
      '<g transform="translate(200 18)"><path d="M0 0 v14" stroke="' + SEP + '"/><circle cy="18" r="5" fill="' + INK3 + '"/>' +
      '<path d="M-60 16 L60 20 M-4 -40 L4 76" stroke="' + INK3 + '" stroke-width="7" stroke-linecap="round" opacity=".9"/></g>' +
      '<rect x="40" y="60" width="70" height="90" fill="' + INK + '" stroke="' + INK3 + '" stroke-width="3"/>' +
      [0, 1, 2, 3].map(function (i) { return '<path d="M' + (52 + i * 15) + ' 60 v90" stroke="' + INK3 + '" stroke-width="2"/>'; }).join('') +
      '<rect x="270" y="110" width="90" height="70" fill="' + INK + '"/><rect x="280" y="90" width="36" height="20" fill="' + INK3 + '"/>' +
      '<path d="M140 50 h70 v50 h-70z" fill="none" stroke="' + SEP + '" opacity=".5"/><path d="M150 60 h50 v30 h-50z" fill="' + SEP + '" opacity=".2"/>' +
      candle(320, 98, .8), ['#1b0f24', '#0a050e']);
  };
  S.phone = function () {
    return svg('<rect width="400" height="240" fill="' + INK + '"/>' +
      '<path d="M40 170 H360 L380 240 H20Z" fill="' + INK3 + '"/>' +
      '<g transform="translate(200 140)">' +
      '<path d="M-70 30 Q-70 -20 -40 -26 H40 Q70 -20 70 30Z" fill="#1a0d14" stroke="' + SEP + '" stroke-width="2"/>' +
      '<path d="M-84 -34 Q-84 -56 -60 -56 H60 Q84 -56 84 -34 Q84 -24 70 -24 H50 Q44 -40 0 -40 Q-44 -40 -50 -24 H-70 Q-84 -24 -84 -34Z" fill="#1a0d14" stroke="' + SEP + '" stroke-width="2"/>' +
      '<circle cy="4" r="22" fill="none" stroke="' + CREAM + '" stroke-width="1.5" opacity=".5"/>' +
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) { var a = (i * 28 - 120) * Math.PI / 180; return '<circle cx="' + (Math.cos(a) * 15).toFixed(1) + '" cy="' + (4 + Math.sin(a) * 15).toFixed(1) + '" r="3" fill="' + CREAM + '" opacity=".45"/>'; }).join('') +
      '<path d="M84 -34 Q120 -10 110 40 Q100 70 140 80" stroke="' + INK3 + '" stroke-width="2.5" fill="none"/></g>' +
      '<g stroke="' + CREAM + '" fill="none" opacity=".25" class="flk"><path d="M100 70 q-10 20 0 40"/><path d="M86 62 q-16 28 0 56"/><path d="M300 70 q10 20 0 40"/><path d="M314 62 q16 28 0 56"/></g>' +
      candle(60, 160, .6), ['#150a1b', '#07030a']);
  };
  S.door = function () {
    return svg('<rect width="400" height="240" fill="' + INK2 + '"/>' +
      '<rect x="130" y="20" width="140" height="210" fill="' + INK + '" stroke="' + SEP + '" stroke-width="3"/>' +
      '<path d="M130 20 q70 -30 140 0" stroke="' + SEP + '" stroke-width="3" fill="none"/>' +
      '<rect x="142" y="34" width="54" height="86" fill="#0b050e" stroke="' + INK3 + '"/><rect x="204" y="34" width="54" height="86" fill="#0b050e" stroke="' + INK3 + '"/>' +
      '<rect x="142" y="130" width="54" height="88" fill="#0b050e" stroke="' + INK3 + '"/><rect x="204" y="130" width="54" height="88" fill="#0b050e" stroke="' + INK3 + '"/>' +
      '<circle cx="196" cy="126" r="5" fill="' + SEP + '"/><circle cx="204" cy="126" r="5" fill="' + SEP + '"/>' +
      '<path d="M196 126 q4 10 8 0" stroke="' + SEP + '" stroke-width="2" fill="none"/>' +
      '<rect x="199" y="20" width="2" height="210" fill="' + FL + '" opacity=".35" class="flk"/>' +
      '<ellipse cx="200" cy="232" rx="60" ry="4" fill="' + FL + '" opacity=".12" class="flk"/>', ['#1b0f24', '#0a050e']);
  };
  S.net = function () {
    return svg('<rect width="400" height="240" fill="' + INK + '"/>' +
      '<path d="M80 60 L320 60 L340 200 L60 200Z" fill="' + CREAM + '" opacity=".06"/>' +
      '<g stroke="' + CREAM + '" opacity=".12">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { return '<path d="M' + (80 + i * 20) + ' 60 L' + (60 + i * 25) + ' 200"/>'; }).join('') + '</g>' +
      '<path d="M80 60 L320 60 M60 200 L340 200" stroke="' + CREAM + '" opacity=".25"/>' +
      '<path d="M60 200 v20 M340 200 v20 M80 60 v-30 M320 60 v-30" stroke="' + SEP + '" stroke-width="3"/>' +
      '<path d="M90 190 Q150 160 210 175 T320 185 L330 200 H70Z" fill="' + INK3 + '"/>' +
      '<g class="ghostfig"><path d="M240 60 q10 30 6 60 q-4 30 4 50 h-30 q8 -20 4 -50 q-4 -30 6 -60z" fill="' + INK2 + '" opacity="1"/><circle cx="233" cy="66" r="10" fill="' + INK2 + '"/></g>' +
      candle(370, 210, .5), ['#0e0713', '#050207']);
  };
  S.diary = function () {
    var lines = '';
    for (var i = 0; i < 8; i++) lines += '<path d="M' + (90) + ' ' + (80 + i * 14) + ' q40 ' + (i % 2 ? 2 : -2) + ' ' + (90 - (i * 7) % 30) + ' 0" stroke="' + INK2 + '" stroke-width="1.6" fill="none" opacity=".7"/>' +
      '<path d="M215 ' + (80 + i * 14) + ' q40 ' + (i % 2 ? -2 : 2) + ' ' + (85 - (i * 11) % 40) + ' 0" stroke="' + INK2 + '" stroke-width="1.6" fill="none" opacity=".7"/>';
    return svg('<rect width="400" height="240" fill="' + INK + '"/>' +
      '<g transform="rotate(-4 200 130)"><path d="M70 60 Q140 50 200 64 Q260 50 330 60 V200 Q260 190 200 204 Q140 190 70 200Z" fill="' + CREAM + '" opacity=".82"/>' +
      '<path d="M200 64 V204" stroke="' + SEP + '" stroke-width="2"/>' + lines +
      '<path d="M250 170 q14 -8 30 2" stroke="#8e1b1b" stroke-width="2" fill="none"/>' +
      '<ellipse cx="140" cy="170" rx="18" ry="8" fill="' + SEP + '" opacity=".35"/></g>' +
      candle(360, 120, .7), ['#120818', '#06030a']);
  };
  S.cinema = function () {
    return svg(moon(60, 40, 12) +
      '<rect x="40" y="60" width="320" height="170" fill="' + INK + '"/>' +
      '<path d="M40 60 L200 26 L360 60" fill="' + INK2 + '"/>' +
      '<rect x="80" y="70" width="240" height="34" fill="' + INK3 + '"/>' +
      '<text x="200" y="95" font-family="Galada,serif" font-size="22" fill="' + CREAM + '" opacity=".35" text-anchor="middle">ছায়াবাণী</text>' +
      '<path d="M200 70 l6 10 -8 6 4 18" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
      '<rect x="70" y="120" width="44" height="64" fill="' + SEP + '" opacity=".4" transform="rotate(-3 92 152)"/><path d="M70 160 l44 -10 0 30z" fill="' + INK + '"/>' +
      '<rect x="290" y="118" width="40" height="60" fill="#8e1b1b" opacity=".3" transform="rotate(4 310 148)"/>' +
      '<rect x="140" y="130" width="120" height="100" fill="#090409"/>' +
      '<g stroke="' + SEP + '" stroke-width="2">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (i) { return '<path d="M' + (142 + i * 9.6) + ' 130 v100"/>'; }).join('') + '</g>' +
      '<g stroke="' + SEP + '" stroke-width="1.2" opacity=".8">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<path d="M' + (142 + i * 19.2) + ' 130 l19.2 100 M' + (161.2 + i * 19.2) + ' 130 l-19.2 100"/>'; }).join('') + '</g>' +
      '<rect x="190" y="170" width="20" height="14" fill="' + SEP + '"/>' + rain(30, .12), ['#24142f', '#0b050f']);
  };
  S.projector = function () {
    return svg('<rect width="400" height="240" fill="' + INK + '"/>' +
      '<path d="M140 100 L400 40 L400 200Z" fill="' + CREAM + '" opacity=".07" class="flk"/>' +
      '<rect x="60" y="110" width="110" height="60" rx="6" fill="' + INK3 + '"/>' +
      '<circle cx="80" cy="84" r="30" fill="none" stroke="' + SEP + '" stroke-width="5"/><circle cx="80" cy="84" r="6" fill="' + SEP + '"/>' +
      '<circle cx="150" cy="84" r="30" fill="none" stroke="' + SEP + '" stroke-width="5"/><circle cx="150" cy="84" r="6" fill="' + SEP + '"/>' +
      [0, 1, 2].map(function (i) { var a = i * 2.09; return '<path d="M80 84 l' + (Math.cos(a) * 26).toFixed(1) + ' ' + (Math.sin(a) * 26).toFixed(1) + ' M150 84 l' + (Math.cos(a + 1) * 26).toFixed(1) + ' ' + (Math.sin(a + 1) * 26).toFixed(1) + '" stroke="' + SEP + '" stroke-width="3"/>'; }).join('') +
      '<rect x="170" y="128" width="20" height="18" fill="' + INK3 + '"/><circle cx="192" cy="137" r="7" fill="' + CREAM + '" opacity=".6"/>' +
      '<path d="M0 180 H400 V240 H0Z" fill="' + INK2 + '"/>' +
      '<g stroke="' + SEP + '" opacity=".5"><circle cx="300" cy="210" r="18" fill="none"/><circle cx="340" cy="214" r="14" fill="none"/></g>' +
      '<path d="M140 0 v40" stroke="' + INK3 + '"/>', ['#120818', '#06030a']);
  };
  S.screen = function () {
    var seats = '';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 12; c++) seats += '<rect x="' + (20 + c * 31 + (r % 2) * 8) + '" y="' + (176 + r * 15) + '" width="22" height="13" rx="4" fill="' + (r % 2 ? INK : INK2) + '"/>';
    return svg('<rect width="400" height="240" fill="' + INK + '"/>' +
      '<path d="M0 0 H60 V240 H0Z M400 0 H340 V240 H400Z" fill="#2a0f14" opacity=".7"/>' +
      '<rect x="70" y="30" width="260" height="130" fill="' + CREAM + '" opacity=".14"/>' +
      '<rect x="70" y="30" width="260" height="130" fill="none" stroke="' + INK3 + '" stroke-width="4"/>' +
      '<g class="ghostfig"><circle cx="200" cy="78" r="16" fill="' + INK + '"/><path d="M178 160 q0 -56 22 -64 q22 8 22 64z" fill="' + INK + '"/><path d="M186 70 q14 -16 28 0 v30 q-14 8 -28 0z" fill="' + INK + '"/></g>' +
      seats + '<g class="ghostfig" style="animation-delay:-3s"><circle cx="243" cy="170" r="7" fill="' + INK3 + '"/></g>', ['#120818', '#06030a']);
  };
  S.depot = function () {
    var s = '';
    for (var i = 0; i < 5; i++) s += '<path d="M' + (i * 90 - 10) + ' 230 V80 Q' + (i * 90 + 35) + ' 30 ' + (i * 90 + 80) + ' 80 V230" stroke="' + INK3 + '" stroke-width="6" fill="none"/>';
    return svg('<rect width="400" height="240" fill="' + INK + '"/>' + s +
      '<path d="M0 30 H400" stroke="' + INK3 + '" stroke-width="10"/>' +
      '<g transform="translate(40 130)"><rect width="150" height="70" rx="6" fill="' + INK2 + '"/>' + [0, 1, 2, 3].map(function (i) { return '<rect x="' + (12 + i * 34) + '" y="12" width="24" height="24" fill="' + INK + '"/>'; }).join('') + '</g>' +
      '<g transform="translate(230 136)"><rect width="150" height="64" rx="6" fill="' + INK2 + '"/>' + [0, 1, 2, 3].map(function (i) { return '<rect x="' + (12 + i * 34) + '" y="12" width="24" height="22" fill="' + (i === 2 ? FL : INK) + '" opacity="' + (i === 2 ? .4 : 1) + '" class="' + (i === 2 ? 'flk' : '') + '"/>'; }).join('') + '</g>' +
      '<path d="M0 214 L400 214 M0 222 L400 222" stroke="' + SEP + '" opacity=".6"/>' +
      '<g class="sway"><path d="M200 30 v30" stroke="' + SEP + '"/><circle cx="200" cy="64" r="6" fill="' + FL + '" opacity=".25"/></g>', ['#150a1b', '#07030a']);
  };
  S.street = function () {
    return svg(moon(290, 40, 13) + houseRow(150, 5) +
      '<path d="M0 150 H400 V240 H0Z" fill="' + INK2 + '"/>' +
      '<path d="M200 150 L180 240 M200 150 L220 240" stroke="' + CREAM + '" opacity=".05" stroke-width="2"/>' +
      [40, 150, 260, 370].map(function (x) { return '<path d="M' + x + ' 230 V110 q0 -10 14 -10" stroke="' + INK + '" stroke-width="3" fill="none"/><rect x="' + (x + 10) + '" y="100" width="10" height="5" fill="' + INK3 + '"/>'; }).join('') +
      '<g transform="translate(250 175)"><circle cx="0" cy="40" r="18" fill="none" stroke="' + INK + '" stroke-width="3"/><path d="M0 40 L-60 30 M-30 20 h-30 v-30 q-10 -8 0 -16 h34 v46z" stroke="' + INK + '" stroke-width="3" fill="' + INK + '"/><path d="M-60 30 L-100 28" stroke="' + INK + '" stroke-width="3"/></g>' +
      '<path d="M0 60 Q100 90 200 60 T400 70" stroke="' + INK + '" fill="none"/>' +
      '<g class="ghostfig"><path d="M90 160 q4 -10 8 0 l2 26 h-12z" fill="' + CREAM + '" opacity=".4"/></g>', ['#22132c', '#0c0610']);
  };
  S.dawn = function () {
    var crows = '';
    [[90, 50], [120, 40], [140, 58], [300, 46]].forEach(function (p) { crows += '<path d="M' + p[0] + ' ' + p[1] + ' q5 -6 10 0 q5 -6 10 0" stroke="' + INK + '" stroke-width="2" fill="none"/>'; });
    return svg('<circle cx="200" cy="200" r="90" fill="' + CREAM + '" opacity=".14"/>' + crows +
      '<path d="M0 160 h70 v-30 h40 v20 h60 v-40 h50 v30 h70 v-20 h60 v40 h50 V240 H0Z" fill="' + INK + '"/>' +
      '<rect x="230" y="70" width="44" height="40" fill="' + INK + '"/><path d="M234 110 l-4 20 M270 110 l4 20" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M40 130 v-44 M28 92 h24 M31 100 h18 M34 108 h12" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M120 150 q20 -6 40 0" stroke="' + SEP + '" opacity=".5" fill="none"/>' +
      '<path d="M0 170 Q100 160 200 168 T400 162" stroke="' + INK2 + '" stroke-width="3" fill="none"/>', ['#3b2a4a', '#9a7d82']);
  };
  S.window = function () {
    return svg('<rect width="400" height="240" fill="' + INK2 + '"/>' +
      '<rect x="110" y="30" width="180" height="170" fill="#2b1838"/>' + moon(240, 70, 12) +
      '<g class="ghostfig"><circle cx="180" cy="110" r="18" fill="' + INK + '"/><path d="M150 200 q0 -60 30 -70 q30 10 30 70z" fill="' + INK + '"/><circle cx="174" cy="108" r="2" fill="' + CREAM + '"/><circle cx="186" cy="108" r="2" fill="' + CREAM + '"/></g>' +
      '<g stroke="' + INK + '" stroke-width="6">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<path d="M' + (126 + i * 30) + ' 30 v170"/>'; }).join('') + '<path d="M110 90 h180"/></g>' +
      '<rect x="110" y="30" width="180" height="170" fill="none" stroke="' + INK + '" stroke-width="12"/>' +
      '<path d="M100 200 h200 v12 h-200z" fill="' + INK3 + '"/>' + candle(80, 210, .6) + rain(30, .14), ['#1b0f24', '#0a050e']);
  };
  S.mirror = function () {
    return svg('<rect width="400" height="240" fill="' + INK + '"/>' +
      '<ellipse cx="200" cy="110" rx="72" ry="96" fill="' + SEP + '" opacity=".6"/>' +
      '<ellipse cx="200" cy="110" rx="62" ry="86" fill="#1a1020"/>' +
      '<ellipse cx="200" cy="110" rx="62" ry="86" fill="' + CREAM + '" opacity=".06"/>' +
      '<g class="ghostfig"><circle cx="200" cy="90" r="20" fill="' + CREAM + '" opacity=".35"/><path d="M168 196 q0 -60 32 -72 q32 12 32 72z" fill="' + CREAM + '" opacity=".25"/></g>' +
      '<path d="M160 40 L230 190" stroke="' + CREAM + '" opacity=".15"/>' +
      '<path d="M120 210 H280 V230 H120Z" fill="' + INK3 + '"/>' + candle(250, 205, .55) + candle(150, 205, .55), ['#120818', '#06030a']);
  };
  S.well = function () {
    return svg(moon(320, 40, 12) +
      '<path d="M0 0 H70 V240 H0Z M400 0 H330 V240 H400Z" fill="' + INK2 + '"/>' +
      '<path d="M0 180 H400 V240 H0Z" fill="' + INK3 + '"/>' +
      '<ellipse cx="200" cy="150" rx="70" ry="18" fill="' + INK + '" stroke="' + SEP + '" stroke-width="3"/>' +
      '<path d="M130 150 V200 Q200 222 270 200 V150" fill="' + INK2 + '" stroke="' + SEP + '" stroke-width="2"/>' +
      '<path d="M140 150 V60 M260 150 V60 M134 62 H266" stroke="' + INK + '" stroke-width="6"/>' +
      '<g class="sway"><path d="M200 62 v60" stroke="' + SEP + '"/><path d="M190 122 h20 l-3 14 h-14z" fill="' + SEP + '"/></g>' +
      '<ellipse cx="200" cy="150" rx="40" ry="8" fill="' + CREAM + '" opacity=".05" class="ghostfig"/>' +
      '<path d="M90 120 q-6 30 4 60 M310 110 q8 40 -4 70" stroke="' + INK + '" stroke-width="2" fill="none"/>', ['#22132c', '#0b050f']);
  };
  S.fallback = function () {
    return svg('<circle cx="200" cy="120" r="80" fill="' + CREAM + '" opacity=".03"/>' + candle(200, 160, 1), ['#150a1b', '#06030a']);
  };
  S.title = function () {
    return svg(moon(310, 46, 15) + wires() + houseRow(180, 7) +
      '<rect x="0" y="180" width="400" height="60" fill="' + INK2 + '"/>' +
      '<g transform="translate(150 150)"><rect width="120" height="44" rx="6" fill="' + INK + '"/>' +
      [0, 1, 2, 3].map(function (i) { return '<rect x="' + (10 + i * 27) + '" y="8" width="18" height="16" fill="' + FL + '" opacity="' + (i === 2 ? .45 : .12) + '" class="' + (i === 2 ? 'flk' : '') + '"/>'; }).join('') +
      '<path d="M60 0 L74 -40" stroke="' + INK + '" stroke-width="2"/></g>' + rain(36, .14), ['#2c1a3a', '#0d0612']);
  };

  window.ART = {
    draw: function (key) { return (S[key] || S.fallback)(); },
    has: function (key) { return !!S[key]; },
    keys: Object.keys(S)
  };
})();
