/* অদ্ভুতুড়ে: all sound synthesised with Web Audio. Starts OFF; the context is created only on a user tap. */
(function () {
  'use strict';
  var ctx = null, master = null, on = false, noiseBuf = null;
  var fan = null, hiss = null, drone = null, timers = [];
  var want = { power: true, fear: 0 };

  function now() { return ctx.currentTime; }
  function makeNoise() {
    var len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return b;
  }
  function noiseSrc() { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(type, f, t, a, peak, d, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    env(g, t, a, peak, d); o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }
  function burst(t, dur, freq, q, peak, type) {
    var s = noiseSrc(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    env(g, t, 0.005, peak, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }

  function startBeds() {
    // fan hum: low saw through lowpass, with slow wobble
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 50; f.type = 'lowpass'; f.frequency.value = 180; g.gain.value = 0;
    lfo.frequency.value = 3.2; lg.gain.value = 0.006; lfo.connect(lg); lg.connect(g.gain);
    var ns = noiseSrc(), nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400; nf.Q.value = 0.6;
    ns.connect(nf); nf.connect(g);
    o.connect(f); f.connect(g); g.connect(master); o.start(); lfo.start(); ns.start();
    fan = g;
    // night hiss / faint rain
    var hs = noiseSrc(), hf = ctx.createBiquadFilter(), hg = ctx.createGain();
    hf.type = 'highpass'; hf.frequency.value = 1800; hg.gain.value = 0.012;
    hs.connect(hf); hf.connect(hg); hg.connect(master); hs.start();
    hiss = hg;
    // fear drone
    var d1 = ctx.createOscillator(), d2 = ctx.createOscillator(), dg = ctx.createGain(), df = ctx.createBiquadFilter();
    d1.type = 'sine'; d1.frequency.value = 55; d2.type = 'triangle'; d2.frequency.value = 55 * 1.06;
    df.type = 'lowpass'; df.frequency.value = 300; dg.gain.value = 0;
    d1.connect(df); d2.connect(df); df.connect(dg); dg.connect(master); d1.start(); d2.start();
    drone = dg;
    apply();
    schedule('dog', 9000, 26000, function () { SFX.dog(true); });
    schedule('drip', 3000, 9000, function () { SFX.drip(true); });
  }
  function schedule(name, min, max, fn) {
    var t = setTimeout(function () { if (on) { fn(); } schedule(name, min, max, fn); }, min + Math.random() * (max - min));
    timers.push(t);
  }
  function apply() {
    if (!ctx || !fan) return;
    var t = now();
    fan.gain.setTargetAtTime(want.power ? 0.05 : 0.0001, t, 0.8);
    drone.gain.setTargetAtTime(0.004 + want.fear * 0.05, t, 1.5);
    hiss.gain.setTargetAtTime(0.008 + want.fear * 0.01, t, 1);
  }

  var SFX = {
    ring: function () {
      // old bell phone: two bursts of 400/450Hz modulated at ~20Hz, twice
      for (var r = 0; r < 2; r++) {
        for (var k = 0; k < 2; k++) {
          var t = now() + r * 3 + k * 0.6, g = ctx.createGain(), am = ctx.createOscillator(), amg = ctx.createGain();
          am.frequency.value = 20; amg.gain.value = 0.5; am.connect(amg); amg.connect(g.gain);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.02); g.gain.setValueAtTime(0.09, t + 0.4); g.gain.linearRampToValueAtTime(0, t + 0.42);
          [400, 450, 1200].forEach(function (f, i) { var o = ctx.createOscillator(); o.frequency.value = f; var og = ctx.createGain(); og.gain.value = i === 2 ? 0.2 : 0.5; o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.45); });
          g.connect(master); am.start(t); am.stop(t + 0.45);
        }
      }
    },
    knock: function () { for (var i = 0; i < 3; i++) { var t = now() + i * 0.32; tone('sine', 90, t, 0.003, 0.5, 0.18); burst(t, 0.06, 600, 2, 0.25); } },
    dog: function (far) {
      var base = now(), n = 2 + (Math.random() * 3 | 0), v = far ? 0.05 : 0.14;
      for (var i = 0; i < n; i++) {
        var t = base + i * 0.38, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.16);
        f.type = 'bandpass'; f.frequency.value = far ? 700 : 1000; f.Q.value = 3;
        env(g, t, 0.01, v, 0.16); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25);
      }
    },
    drip: function (soft) { var t = now(), o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(1400 + Math.random() * 500, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.08); env(g, t, 0.002, soft ? 0.05 : 0.12, 0.1); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.15); },
    tram: function () { for (var i = 0; i < 2; i++) { var t = now() + i * 0.28; tone('sine', 1320, t, 0.002, 0.12, 0.9); tone('sine', 1980, t, 0.002, 0.05, 0.6); tone('sine', 2650, t, 0.002, 0.03, 0.4); } burst(now() + 0.6, 2.5, 120, 0.7, 0.05, 'lowpass'); },
    bell: function () { var t = now(); tone('sine', 220, t, 0.004, 0.14, 3.5); tone('sine', 552, t, 0.004, 0.06, 2.4); tone('sine', 880, t, 0.004, 0.03, 1.6); },
    door: function () {
      var t = now(), o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(140, t + 0.6); o.frequency.linearRampToValueAtTime(70, t + 1.4);
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 8;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.2); g.gain.linearRampToValueAtTime(0.05, t + 1.0); g.gain.linearRampToValueAtTime(0, t + 1.5);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 1.6);
    },
    static: function () { burst(now(), 1.4, 3000, 0.4, 0.08); burst(now() + 0.3, 0.2, 800, 1, 0.06); },
    crow: function () { for (var i = 0; i < 3; i++) { var t = now() + i * 0.5, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(560, t + 0.25); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2; env(g, t, 0.02, 0.07, 0.26); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.32); } },
    footsteps: function () { for (var i = 0; i < 6; i++) { var t = now() + i * 0.55 + (i % 2) * 0.04; tone('sine', 70, t, 0.004, 0.25 - i * 0.02, 0.12); burst(t, 0.05, 300, 1, 0.08); } }
  };

  window.AUDIO = {
    isOn: function () { return on; },
    toggle: function () {
      if (!on) {
        try {
          if (!ctx) {
            var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
            ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
            noiseBuf = makeNoise(); startBeds();
          }
          if (ctx.state === 'suspended') ctx.resume();
          master.gain.setTargetAtTime(0.9, now(), 0.3);
          on = true;
        } catch (e) { on = false; }
      } else {
        on = false;
        try { master.gain.setTargetAtTime(0.0001, now(), 0.15); setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 600); } catch (e) {}
      }
      return on;
    },
    setPower: function (p) { want.power = !!p; apply(); },
    setFear: function (f) { want.fear = Math.max(0, Math.min(1, f)); apply(); },
    play: function (name) { if (!on || !ctx || !SFX[name]) return; try { SFX[name](); } catch (e) {} }
  };
})();
