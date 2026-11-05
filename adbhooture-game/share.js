/* অদ্ভুতুড়ে: shareable ending card drawn on canvas (1080x1350). */
(function () {
  'use strict';
  var W = 1080, H = 1350;
  var BN = '০১২৩৪৫৬৭৮৯';
  function toBn(n) { return String(n).replace(/[0-9]/g, function (d) { return BN[+d]; }); }

  function rnd(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function tornRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r() * 14);
    for (var i = 1; i <= 24; i++) ctx.lineTo(x + w * i / 24, y + r() * 16);
    for (var j = 1; j <= 8; j++) ctx.lineTo(x + w - r() * 10, y + h * j / 8);
    for (var k = 23; k >= 0; k--) ctx.lineTo(x + w * k / 24, y + h - r() * 16);
    for (var m = 7; m >= 1; m--) ctx.lineTo(x + r() * 10, y + h * m / 8);
    ctx.closePath();
  }

  function paperFill(ctx, x, y, w, h, r) {
    var g = ctx.createLinearGradient(x, y, x + w * .3, y + h);
    g.addColorStop(0, '#f1e6cc'); g.addColorStop(.6, '#e8d9b8'); g.addColorStop(1, '#d9c59c');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    for (var i = 0; i < 260; i++) { ctx.fillStyle = 'rgba(110,80,40,' + (r() * .12) + ')'; ctx.fillRect(x + r() * w, y + r() * h, 2, 2); }
    var v = ctx.createRadialGradient(x + w / 2, y + h / 2, h * .2, x + w / 2, y + h / 2, w * .7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(90,55,20,.35)');
    ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  function drawBg(ctx, r) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b1838'); g.addColorStop(.55, '#140a1b'); g.addColorStop(1, '#07030a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // moon
    var mg = ctx.createRadialGradient(820, 210, 10, 820, 210, 300);
    mg.addColorStop(0, 'rgba(239,227,200,.35)'); mg.addColorStop(1, 'rgba(239,227,200,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, 700);
    ctx.fillStyle = 'rgba(239,227,200,.9)'; ctx.beginPath(); ctx.arc(820, 210, 70, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(43,24,56,.6)'; ctx.beginPath(); ctx.arc(848, 196, 70, 0, 7); ctx.fill();
    // tram wires
    ctx.strokeStyle = '#07030a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-20, 120); ctx.quadraticCurveTo(540, 220, 1100, 100); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, 150); ctx.quadraticCurveTo(540, 260, 1100, 130); ctx.stroke();
    // rooftops
    ctx.fillStyle = '#07030a'; var x = -20;
    while (x < W) { var w = 120 + r() * 120, h = 140 + r() * 200; ctx.fillRect(x, 520 - h, w, h + 900); if (r() > .7) { ctx.fillStyle = 'rgba(242,166,64,.35)'; ctx.fillRect(x + w / 2 - 12, 520 - h + 60, 24, 34); ctx.fillStyle = '#07030a'; } x += w; }
    // window bars silhouette left
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 14;
    for (var b = 0; b < 4; b++) { ctx.beginPath(); ctx.moveTo(40 + b * 60, 0); ctx.lineTo(40 + b * 60, 380); ctx.stroke(); }
    // rain
    ctx.strokeStyle = 'rgba(239,227,200,.08)'; ctx.lineWidth = 2;
    for (var i = 0; i < 120; i++) { var rx = r() * W, ry = r() * H; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 10, ry + 40); ctx.stroke(); }
    // candle glow bottom
    var cg = ctx.createRadialGradient(540, 1290, 10, 540, 1290, 380);
    cg.addColorStop(0, 'rgba(242,166,64,.32)'); cg.addColorStop(1, 'rgba(242,166,64,0)');
    ctx.fillStyle = cg; ctx.fillRect(0, 850, W, 500);
    // vignette
    var vg = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 900);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  function drawCandle(ctx, x, y) {
    ctx.fillStyle = '#efe3c8'; ctx.fillRect(x - 12, y, 24, 70);
    ctx.fillStyle = '#f2a640'; ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.bezierCurveTo(x + 16, y - 22, x + 14, y - 8, x, y - 4); ctx.bezierCurveTo(x - 14, y - 8, x - 16, y - 22, x, y - 46); ctx.fill();
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.ellipse(x, y - 16, 4, 9, 0, 0, 7); ctx.fill();
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var t = new Promise(function (res) { setTimeout(res, 2500); });
    return Promise.race([Promise.all([
      document.fonts.load('72px Galada', 'অদ্ভুতুড়ে'),
      document.fonts.load('44px "Tiro Bangla"', 'রাত বারোটা'),
      document.fonts.load('italic 44px "Tiro Bangla"', 'রাত বারোটা')
    ]).catch(function () {}), t]);
  }

  function make(ending) {
    return fontsReady().then(function () {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d'), r = rnd((ending.n || 1) * 7919 + 13);
      drawBg(ctx, r);
      var HEAD = 'Galada, "Tiro Bangla", serif', BODY = '"Tiro Bangla", "Noto Serif Bengali", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      // header
      ctx.fillStyle = 'rgba(239,227,200,.92)'; ctx.font = '84px ' + HEAD;
      ctx.shadowColor = 'rgba(142,27,27,.8)'; ctx.shadowBlur = 24;
      ctx.fillText('অদ্ভুতুড়ে', W / 2, 400);
      ctx.shadowBlur = 0;
      ctx.font = '40px ' + HEAD; ctx.fillStyle = 'rgba(226,209,173,.85)';
      ctx.fillText('রাত বারোটার কলকাতা', W / 2, 460);

      // paper strip
      ctx.font = '108px ' + HEAD;
      var titleLines = wrap(ctx, ending.title, 840);
      ctx.font = 'italic 58px ' + BODY;
      var lineLines = wrap(ctx, '“' + ending.line + '”', 830);
      var ph = 130 + titleLines.length * 124 + 50 + lineLines.length * 86 + 40;
      var px = 70, pw = W - 140, py = Math.max(510, Math.min(800 - ph / 2, 1080 - ph));
      ctx.save(); ctx.translate(W / 2, py + ph / 2); ctx.rotate(-0.012); ctx.translate(-W / 2, -(py + ph / 2));
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
      tornRect(ctx, px, py, pw, ph, r); ctx.fillStyle = '#e8d9b8'; ctx.fill();
      ctx.shadowColor = 'transparent';
      tornRect(ctx, px, py, pw, ph, rnd((ending.n || 1) * 7919 + 13)); paperFill(ctx, px, py, pw, ph, r);
      ctx.fillStyle = '#8e1b1b'; ctx.font = '40px ' + BODY;
      ctx.fillText('সমাপ্তি #' + toBn(ending.n || 1) + (ending.secret ? ' · গোপন' : ''), W / 2, py + 88);
      ctx.fillStyle = '#231710'; ctx.font = '108px ' + HEAD;
      var y = py + 88 + 124;
      titleLines.forEach(function (l) { ctx.fillText(l, W / 2, y); y += 124; });
      ctx.strokeStyle = 'rgba(80,45,20,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 140, y - 62); ctx.lineTo(W / 2 + 140, y - 62); ctx.stroke();
      ctx.fillStyle = '#3d2818'; ctx.font = 'italic 58px ' + BODY; y += 24;
      lineLines.forEach(function (l) { ctx.fillText(l, W / 2, y); y += 86; });
      ctx.restore();

      drawCandle(ctx, W / 2, 1150);
      ctx.fillStyle = 'rgba(239,227,200,.92)'; ctx.font = '42px ' + BODY;
      ctx.fillText('অদ্ভুতুড়ে · facebook.com/Adbhooture', W / 2, 1276);
      ctx.fillStyle = 'rgba(200,180,210,.7)'; ctx.font = '30px ' + BODY;
      ctx.fillText('~ সুচন্দ্রা দাস', W / 2, 1322);
      return c;
    });
  }

  function toBlob(c) {
    return new Promise(function (res) {
      if (c.toBlob) c.toBlob(function (b) { res(b); }, 'image/png');
      else { var d = atob(c.toDataURL('image/png').split(',')[1]), a = new Uint8Array(d.length); for (var i = 0; i < d.length; i++) a[i] = d.charCodeAt(i); res(new Blob([a], { type: 'image/png' })); }
    });
  }

  function download(c, name) {
    var a = document.createElement('a');
    a.href = c.toDataURL('image/png'); a.download = name || 'adbhooture.png';
    document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 100);
  }

  function share(c, ending) {
    var text = 'অদ্ভুতুড়ে: রাত বারোটার কলকাতা\nআমি পেয়েছি সমাপ্তি #' + toBn(ending.n) + ': ' + ending.title + '\n“' + ending.line + '”\nতুমি কোন শেষে পৌঁছবে? facebook.com/Adbhooture';
    var url = location.href.split('?')[0].split('#')[0];
    return toBlob(c).then(function (blob) {
      var file = null;
      try { file = new File([blob], 'adbhooture-' + ending.n + '.png', { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'অদ্ভুতুড়ে', text: text }).then(function () { return 'shared'; });
      }
      if (navigator.share) return navigator.share({ title: 'অদ্ভুতুড়ে', text: text, url: url }).then(function () { return 'shared'; });
      download(c, 'adbhooture-' + ending.n + '.png');
      return 'downloaded';
    });
  }

  window.SHARE = { make: make, download: download, share: share, toBn: toBn, wrap: wrap };
})();
