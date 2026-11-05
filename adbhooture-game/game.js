/* অদ্ভুতুড়ে: রাত বারোটার কলকাতা · engine, UI, save */
(function () {
  'use strict';
  var STORY = window.STORY;
  var $ = function (id) { return document.getElementById(id); };
  var app = $('app');
  var toBn = (window.SHARE && SHARE.toBn) || function (n) { return String(n); };
  var RUN_KEY = 'adbhooture_v1', META_KEY = 'adbhooture_meta_v1';

  /* ---------- safe storage ---------- */
  var mem = {};
  function sget(k) { try { var v = localStorage.getItem(k); return v == null ? (mem[k] || null) : v; } catch (e) { return mem[k] || null; } }
  function sset(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function sdel(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }
  function jget(k) { try { var v = sget(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  /* ---------- state ---------- */
  function freshState() { return { node: STORY.start, flags: {}, items: [], fear: 0, visited: [] }; }
  function freshMeta() { return { endings: {}, know: {}, runs: 0 }; }
  var state = freshState();
  var meta = jget(META_KEY) || freshMeta();
  meta.endings = meta.endings || {}; meta.know = meta.know || {}; meta.runs = meta.runs || 0;

  function saveRun() { sset(RUN_KEY, JSON.stringify(state)); }
  function saveMeta() { sset(META_KEY, JSON.stringify(meta)); }
  function arr(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }
  var MAXF = STORY.maxFear || 10;

  /* ---------- pure condition evaluator ---------- */
  function evalCond(cond, st, mt) {
    if (!cond) return true;
    var items = st.items || [], flags = st.flags || {}, know = (mt && mt.know) || {}, seen = (mt && mt.endings) || {};
    var i, a;
    a = arr(cond.has); for (i = 0; i < a.length; i++) if (items.indexOf(a[i]) < 0) return false;
    a = arr(cond.lacks); for (i = 0; i < a.length; i++) if (items.indexOf(a[i]) >= 0) return false;
    a = arr(cond.flag); for (i = 0; i < a.length; i++) if (!flags[a[i]]) return false;
    a = arr(cond.noflag); for (i = 0; i < a.length; i++) if (flags[a[i]]) return false;
    if (cond.fearMin != null && (st.fear || 0) < cond.fearMin) return false;
    if (cond.fearMax != null && (st.fear || 0) > cond.fearMax) return false;
    a = arr(cond.know); for (i = 0; i < a.length; i++) if (!know[a[i]]) return false;
    a = arr(cond.notknow); for (i = 0; i < a.length; i++) if (know[a[i]]) return false;
    a = arr(cond.seen); for (i = 0; i < a.length; i++) if (!seen[a[i]]) return false;
    if (cond.runsMin != null && ((mt && mt.runs) || 0) < cond.runsMin) return false;
    return true;
  }

  /* apply effects object (node or choice) to state/meta. Returns list of newly gained items and learned keys */
  function applyEffects(fx, st, mt) {
    var gained = [], learned = [];
    if (fx.fear) st.fear = Math.max(0, Math.min(MAXF, (st.fear || 0) + fx.fear));
    arr(fx.set).forEach(function (f) { st.flags[f] = true; });
    arr(fx.unset).forEach(function (f) { delete st.flags[f]; });
    arr(fx.give).forEach(function (it) { if (st.items.indexOf(it) < 0) { st.items.push(it); gained.push(it); } });
    arr(fx.take).forEach(function (it) { var k = st.items.indexOf(it); if (k >= 0) st.items.splice(k, 1); });
    arr(fx.learn).forEach(function (k) { if (!mt.know[k]) { mt.know[k] = 1; learned.push(k); } });
    return { gained: gained, learned: learned };
  }

  /* ---------- screens ---------- */
  function show(id) {
    var s = document.querySelectorAll('.screen');
    for (var i = 0; i < s.length; i++) s[i].classList.toggle('active', s[i].id === id);
    if (id !== 'scr-story') { app.classList.remove('dark', 'fear-hi'); setFearFx(id === 'scr-ending' ? 0.25 : 0); }
  }
  function setFearFx(f) {
    app.style.setProperty('--fear', f.toFixed(2));
    app.classList.toggle('fear-hi', f >= 0.7);
    if (window.AUDIO) AUDIO.setFear(f);
  }

  var toastT;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- sound toggle ---------- */
  function refreshSound() {
    var on = window.AUDIO && AUDIO.isOn();
    var b = document.querySelectorAll('[data-sound]');
    for (var i = 0; i < b.length; i++) {
      var hud = b[i].classList.contains('hud-btn');
      b[i].textContent = (on ? '🔊' : '🔇') + (hud ? '' : ' শব্দ: ' + (on ? 'চালু' : 'বন্ধ'));
      b[i].setAttribute('aria-label', 'শব্দ: ' + (on ? 'চালু' : 'বন্ধ'));
      b[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sound]');
    if (!b || !window.AUDIO) return;
    e.stopPropagation();
    var on = AUDIO.toggle(); refreshSound();
    if (on) { var n = STORY.nodes[state.node]; AUDIO.setPower(!(n && n.dark) || !$('scr-story').classList.contains('active')); }
    toast(on ? 'শব্দ চালু হলো। হেডফোন থাকলে ভালো।' : 'শব্দ বন্ধ।');
  }, true);

  /* ---------- story flow ---------- */
  var clockT = null;
  var revealToken = 0, revealing = false, finishReveal = null, curScene = null;

  function enter(id, depth) {
    depth = depth || 0;
    var n = STORY.nodes[id];
    if (!n) { console.error('Missing node', id); toast('গল্পের এই পাতাটা হারিয়ে গেছে।'); return; }
    state.node = id;
    if (state.visited.indexOf(id) < 0) state.visited.push(id);
    var r = applyEffects(n, state, meta);
    if (r.learned.length) saveMeta();
    if (n.panic && state.fear >= MAXF && STORY.panicNode && id !== STORY.panicNode && depth < 3) return enter(STORY.panicNode, depth + 1);
    if (n.ending) {
      if (!meta.endings[n.ending]) meta.endings[n.ending] = Date.now();
      meta.runs = (meta.runs || 0) + 1; meta.last = n.ending;
      saveMeta(); sdel(RUN_KEY);
    } else saveRun();
    render(id, r);
  }

  function renderHud(n) {
    $('hud-clock').textContent = n.time || '';
    // At high fear the clock sometimes shows the hour it is waiting for, for a blink.
    clearTimeout(clockT);
    if (n.time && !n.ending && (state.fear || 0) >= 6 && n.time.indexOf('৩টে ১৭') < 0) {
      clockT = setTimeout(function () {
        var c = $('hud-clock'), real = c.textContent;
        c.textContent = 'রাত ৩টে ১৭'; c.classList.add('clock-glitch');
        setTimeout(function () { if (c.textContent === 'রাত ৩টে ১৭') c.textContent = real; c.classList.remove('clock-glitch'); }, 450);
      }, 4000 + Math.random() * 6000);
    }
    var f = '', lit = Math.round(state.fear * 10 / MAXF);
    for (var i = 0; i < 10; i++) f += '<i class="' + (i < lit ? 'on' : '') + '"></i>';
    $('hud-fear').innerHTML = f;
    $('hud-fear').setAttribute('aria-label', 'ভয় ' + toBn(state.fear) + ' / ' + toBn(MAXF));
    $('items-n').textContent = state.items.length ? toBn(state.items.length) : '';
  }

  function paraList(n) {
    var out = [];
    arr(n.text).forEach(function (p) {
      if (typeof p === 'string') out.push(p);
      else if (p && p.t && evalCond(p.if, state, meta)) out.push(p.t);
    });
    return out;
  }

  function render(id, fxr) {
    var n = STORY.nodes[id];
    show('scr-story');
    app.classList.toggle('dark', !!n.dark);
    setFearFx(state.fear / MAXF);
    if (window.AUDIO) { AUDIO.setPower(!n.dark); if (n.sfx) setTimeout(function () { AUDIO.play(n.sfx); }, 400); }
    renderHud(n);
    var sceneKey = n.scene || 'fallback', sc = $('scene');
    if (sceneKey !== curScene) {
      curScene = sceneKey; sc.classList.add('swap');
      setTimeout(function () { sc.innerHTML = window.ART ? ART.draw(sceneKey) : ''; sc.classList.remove('swap'); }, curScene ? 250 : 0);
    }
    $('story-scroll').scrollTop = 0;
    var pass = $('passage'), ch = $('choices');
    pass.innerHTML = ''; ch.innerHTML = '';
    var paras = paraList(n);
    var strips = paras.map(function (p, i) {
      var d = document.createElement('div');
      var dlg = /^\s*-\s/.test(p);
      d.className = 'strip' + (dlg ? ' dlg' : '') + (n.ending ? ' ending-strip' : '');
      d.style.setProperty('--rot', (((i * 37 + id.length * 13) % 9) - 4) * 0.12 + 'deg');
      var words = p.split(/(\s+)/);
      d.innerHTML = words.map(function (w) { return /^\s+$/.test(w) ? w : '<span class="w">' + esc(w) + '</span>'; }).join('');
      pass.appendChild(d);
      return d;
    });
    var tap = document.createElement('div'); tap.className = 'tap-more'; tap.textContent = 'ছুঁয়ে দিলে বাকিটা'; pass.appendChild(tap);

    if (fxr && fxr.gained.length) setTimeout(function () { toast('পেলে: ' + fxr.gained.map(function (g) { return STORY.items[g] || g; }).join(', ')); }, 600);
    else if (fxr && fxr.learned.length) setTimeout(function () { toast('কথাটা মনে গেঁথে রইল।'); }, 600);

    var token = ++revealToken; revealing = true;
    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(function () { if (token === revealToken) fn(); }, ms)); }
    finishReveal = function () {
      timers.forEach(clearTimeout); timers = [];
      strips.forEach(function (s) { s.classList.add('in'); var ws = s.querySelectorAll('.w'); for (var i = 0; i < ws.length; i++) ws[i].classList.add('on'); });
      done();
    };
    function done() {
      if (!revealing || token !== revealToken) return;
      revealing = false; tap.remove(); showChoices(n);
    }
    var t = 150;
    strips.forEach(function (s, si) {
      later(function () { s.classList.add('in'); }, t);
      var ws = s.querySelectorAll('.w');
      for (var i = 0; i < ws.length; i++) (function (w, at) { later(function () { w.classList.add('on'); }, at); })(ws[i], t + 200 + i * 38);
      t += 200 + ws.length * 38 + 420;
      if (si >= 1) later(function () { s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, t - 400);
    });
    later(done, t);
    if (state.fear >= MAXF * 0.5) later(shimmerSome, t + 1800);
  }

  function shimmerSome() {
    var ws = $('passage').querySelectorAll('.w');
    if (!ws.length) return;
    var w = ws[(Math.random() * ws.length) | 0];
    w.classList.remove('shimmer'); void w.offsetWidth; w.classList.add('shimmer');
    var tok = revealToken;
    setTimeout(function () { if (tok === revealToken && $('scr-story').classList.contains('active')) shimmerSome(); }, 5000 + Math.random() * 7000);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function showChoices(n) {
    var ch = $('choices'); ch.innerHTML = '';
    var list = [];
    if (n.ending) {
      list.push({ el: btn('সমাপ্তি', 'end-btn', function () { showEnding(n.ending, true); }) });
    } else {
      arr(n.choices).forEach(function (c) {
        if (!evalCond(c.if, state, meta)) return;
        list.push({ el: btn(c.t, '', function () { choose(c); }) });
      });
      if (!list.length) list.push({ el: btn('শুরুর পাতায় ফেরো', '', goTitle) }); // safety net, validator should prevent
    }
    list.forEach(function (x, i) { ch.appendChild(x.el); setTimeout(function () { x.el.classList.add('in'); }, 80 + i * 160); });
    setTimeout(function () { var last = ch.lastElementChild; if (last) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 300 + list.length * 160);
  }

  function btn(label, cls, fn) {
    var b = document.createElement('button');
    b.className = 'btn paper ' + cls; b.textContent = label;
    var used = false;
    b.addEventListener('click', function (e) { e.stopPropagation(); if (used) return; used = true; fn(); });
    return b;
  }

  function choose(c) {
    var r = applyEffects(c, state, meta);
    if (r.learned.length) saveMeta();
    if (r.gained.length) toast('পেলে: ' + r.gained.map(function (g) { return STORY.items[g] || g; }).join(', '));
    enter(c.to);
  }

  $('story-scroll').addEventListener('click', function (e) {
    if (e.target.closest('.choices')) return;
    if (revealing && finishReveal) finishReveal();
  });

  /* ---------- items & menu ---------- */
  $('btn-items').addEventListener('click', function () {
    var ul = $('items-list');
    ul.innerHTML = state.items.length ? state.items.map(function (it) { return '<li>' + esc(STORY.items[it] || it) + '</li>'; }).join('') : '<li>খালি হাত। শুধু নিজের নিঃশ্বাসের শব্দ।</li>';
    $('items-panel').hidden = false;
  });
  $('items-close').addEventListener('click', function () { $('items-panel').hidden = true; });
  $('items-panel').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  $('btn-menu').addEventListener('click', function () { $('menu-panel').hidden = false; });
  $('menu-panel').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  $('menu-resume').addEventListener('click', function () { $('menu-panel').hidden = true; });
  $('menu-title').addEventListener('click', function () { $('menu-panel').hidden = true; goTitle(); });
  $('menu-restart').addEventListener('click', function () { $('menu-panel').hidden = true; newRun(); });

  /* ---------- title ---------- */
  function goTitle() {
    revealToken++;
    var save = jget(RUN_KEY);
    $('btn-continue').hidden = !(save && STORY.nodes[save.node] && !STORY.nodes[save.node].ending);
    var total = Object.keys(STORY.endings).length, got = countSeen();
    $('title-count').textContent = got ? '(' + toBn(got) + '/' + toBn(total) + ')' : '';
    if (!$('title-art').innerHTML && window.ART) $('title-art').innerHTML = ART.draw('title');
    show('scr-title');
  }
  function countSeen() { return Object.keys(STORY.endings).filter(function (k) { return meta.endings[k]; }).length; }
  function newRun() { state = freshState(); curScene = null; sdel(RUN_KEY); enter(STORY.start); }
  function continueRun() {
    var s = jget(RUN_KEY);
    if (!s || !STORY.nodes[s.node]) return newRun();
    state = { node: s.node, flags: s.flags || {}, items: s.items || [], fear: s.fear || 0, visited: s.visited || [] };
    curScene = null; render(state.node, null);
  }
  $('btn-new').addEventListener('click', newRun);
  $('btn-continue').addEventListener('click', continueRun);
  $('btn-gallery').addEventListener('click', function () { showGallery('title'); });

  /* ---------- ending ---------- */
  var cardCanvas = null, curEnding = null;
  function showEnding(eid, fresh) {
    var e = STORY.endings[eid]; if (!e) return goTitle();
    curEnding = Object.assign({ id: eid }, e);
    revealToken++;
    $('end-num').textContent = 'সমাপ্তি #' + toBn(e.n) + (e.secret ? ' · গোপন সমাপ্তি' : '') + '  ·  সংগ্রহে ' + toBn(countSeen()) + ' / ' + toBn(Object.keys(STORY.endings).length);
    $('end-title').textContent = e.title;
    $('end-line').textContent = '“' + e.line + '”';
    var secretIds = Object.keys(STORY.endings).filter(function (k) { return STORY.endings[k].secret; });
    var missingSecret = secretIds.some(function (k) { return !meta.endings[k]; });
    $('secret-hint').hidden = !(countSeen() > 0 && missingSecret);
    var img = $('end-card'); img.removeAttribute('src'); cardCanvas = null;
    show('scr-ending');
    $('scr-ending').scrollTop = 0;
    var allBtn = $('btn-all-found');
    if (countSeen() === Object.keys(STORY.endings).length) {
      if (!allBtn) {
        allBtn = btn('সব সমাপ্তি পাওয়া গেছে। শেষ পাতায় চলো', '', function () { showFollow(); });
        allBtn.id = 'btn-all-found'; allBtn.classList.add('in');
        $('btn-again').parentNode.insertBefore(allBtn, $('btn-again'));
      }
      if (fresh) toast('সবকটা শেষ খুঁজে পেয়েছ। এই রাত এখন তোমার।');
    } else if (allBtn) allBtn.remove();
    if (window.SHARE) SHARE.make(curEnding).then(function (c) {
      if (!curEnding || curEnding.id !== eid) return;
      cardCanvas = c; try { img.src = c.toDataURL('image/png'); } catch (er) {}
    });
  }
  $('btn-download').addEventListener('click', function () {
    if (!cardCanvas) return toast('কার্ডটা আঁকা হচ্ছে, এক মুহূর্ত...');
    SHARE.download(cardCanvas, 'adbhooture-' + curEnding.n + '.png'); toast('ছবিটা নামানো হলো।');
  });
  $('btn-share').addEventListener('click', function () {
    if (!cardCanvas) return toast('কার্ডটা আঁকা হচ্ছে, এক মুহূর্ত...');
    SHARE.share(cardCanvas, curEnding).then(function (r) { if (r === 'downloaded') toast('শেয়ার করা গেল না, তাই ছবিটা নামিয়ে দিলাম।'); }).catch(function () {});
  });
  $('btn-again').addEventListener('click', newRun);
  $('btn-end-gallery').addEventListener('click', function () { showGallery('ending'); });

  /* ---------- gallery ---------- */
  var galFrom = 'title';
  function showGallery(from) {
    galFrom = from || 'title';
    var ids = Object.keys(STORY.endings).sort(function (a, b) { return STORY.endings[a].n - STORY.endings[b].n; });
    $('gal-count').textContent = toBn(countSeen()) + ' / ' + toBn(ids.length);
    var g = $('gallery'); g.innerHTML = '';
    ids.forEach(function (id) {
      var e = STORY.endings[id], found = !!meta.endings[id];
      var b = document.createElement('button');
      b.className = 'gal ' + (found ? 'strip in' : 'locked' + (e.secret ? ' secret' : ''));
      b.style.setProperty('--rot', '0deg');
      if (found) { b.innerHTML = '<b>' + toBn(e.n) + '. ' + esc(e.title) + '</b><small>' + esc(e.line) + '</small>'; b.addEventListener('click', function () { showEnding(id, false); }); }
      else b.innerHTML = '<b>' + toBn(e.n) + '. ' + (e.secret ? 'গোপন' : '???') + '</b><small>' + (e.secret ? 'যে জানে, সে-ই পৌঁছয়।' : 'এখনও অন্ধকারে।') + '</small>';
      g.appendChild(b);
    });
    show('scr-gallery'); $('scr-gallery').scrollTop = 0;
  }
  $('gal-back').addEventListener('click', function () { if (galFrom === 'ending' && curEnding) showEnding(curEnding.id, false); else goTitle(); });
  $('gal-follow').addEventListener('click', showFollow);

  function showFollow() {
    if (!$('follow-art').innerHTML && window.ART) $('follow-art').innerHTML = ART.draw('dawn');
    var all = countSeen() === Object.keys(STORY.endings).length;
    $('follow-msg').textContent = all ? 'সবকটা শেষ তুমি দেখে ফেলেছ। তবু আজ রাতে ফোনটা বাজলে, ধরার আগে একবার ভেবো।' : 'কলকাতার পুরনো গলিতে আরও অনেক দরজা আছে, যেগুলো রাতে নিজে থেকে খোলে।';
    show('scr-follow'); $('scr-follow').scrollTop = 0;
  }
  $('follow-back').addEventListener('click', goTitle);

  /* ---------- public API ---------- */
  window.GAME = {
    evalCond: evalCond,
    applyEffects: applyEffects,
    goto: function (id) { enter(id); },
    get state() { return state; },
    get meta() { return meta; },
    reset: function () { sdel(RUN_KEY); sdel(META_KEY); state = freshState(); meta = freshMeta(); goTitle(); },
    showEnding: showEnding,
    showGallery: showGallery,
    showFollow: showFollow,
    title: goTitle
  };

  /* ---------- boot ---------- */
  var q = new URLSearchParams(location.search);
  if (q.get('reset') === '1') { sdel(RUN_KEY); sdel(META_KEY); meta = freshMeta(); }
  refreshSound();
  if (q.get('node') && STORY.nodes[q.get('node')]) { state = freshState(); enter(q.get('node')); }
  else goTitle();

  if (/^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
