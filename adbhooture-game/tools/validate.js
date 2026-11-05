#!/usr/bin/env node
/*
 * অদ্ভুতুড়ে: কাহিনি-যাচাই।
 * প্রতিটা পথ হেঁটে দেখে: কোনো ভাঙা লিংক নেই, কোনো কানাগলি নেই,
 * প্রতিটা নোডে পৌঁছনো যায়, প্রতিটা সমাপ্তিতে পৌঁছনো যায়।
 * চালাও:  node adbhooture-game/tools/validate.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'story.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const S = sandbox.window.STORY;

const errors = [];
const warns = [];
const arr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);

// ---- condition evaluation (mirrors game.js contract) ----
function evalCond(c, st, meta) {
  if (!c) return true;
  for (const k of arr(c.has)) if (!st.items.has(k)) return false;
  for (const k of arr(c.lacks)) if (st.items.has(k)) return false;
  for (const k of arr(c.flag)) if (!st.flags.has(k)) return false;
  for (const k of arr(c.noflag)) if (st.flags.has(k)) return false;
  if (c.fearMin != null && st.fear < c.fearMin) return false;
  if (c.fearMax != null && st.fear > c.fearMax) return false;
  for (const k of arr(c.know)) if (!st.know.has(k)) return false;
  for (const k of arr(c.notknow)) if (st.know.has(k)) return false;
  for (const k of arr(c.seen)) if (!meta.seen.has(k)) return false;
  if (c.runsMin != null && meta.runs < c.runsMin) return false;
  return true;
}
const KNOWN_COND = ['has', 'lacks', 'flag', 'noflag', 'fearMin', 'fearMax', 'know', 'notknow', 'seen', 'runsMin'];

// ---- static checks ----
const ids = Object.keys(S.nodes);
const items = new Set(Object.keys(S.items));
const SCENES = new Set(['tram', 'lane', 'house', 'courtyard', 'stairs', 'room', 'phone', 'door', 'net', 'diary', 'cinema', 'projector', 'screen', 'depot', 'street', 'dawn', 'window', 'mirror', 'well']);
const SFX = new Set(['ring', 'knock', 'dog', 'drip', 'tram', 'door', 'static', 'crow', 'footsteps', 'bell']);
if (!S.nodes[S.start]) errors.push('start node missing: ' + S.start);
if (!S.nodes[S.panicNode]) errors.push('panic node missing: ' + S.panicNode);

function checkCond(c, where) {
  if (!c) return;
  for (const k of Object.keys(c)) if (!KNOWN_COND.includes(k)) errors.push(`${where}: unknown condition key "${k}"`);
  for (const k of [...arr(c.has), ...arr(c.lacks)]) if (!items.has(k)) errors.push(`${where}: unknown item "${k}"`);
  for (const k of arr(c.seen)) if (!S.endings[k]) errors.push(`${where}: unknown ending "${k}"`);
}
const allText = [];
for (const id of ids) {
  const n = S.nodes[id];
  if (!SCENES.has(n.scene)) warns.push(`${id}: scene "${n.scene}" not in art list`);
  if (n.sfx && !SFX.has(n.sfx)) errors.push(`${id}: unknown sfx "${n.sfx}"`);
  for (const k of [...arr(n.give), ...arr(n.take)]) if (!items.has(k)) errors.push(`${id}: unknown item "${k}"`);
  for (const p of n.text || []) {
    if (typeof p === 'string') allText.push([id, p]);
    else { checkCond(p.if, id + ' text'); allText.push([id, p.t]); }
  }
  if (n.ending) {
    if (!S.endings[n.ending]) errors.push(`${id}: unknown ending "${n.ending}"`);
    if (n.choices && n.choices.length) errors.push(`${id}: ending node has choices`);
  } else if (!n.choices || !n.choices.length) errors.push(`${id}: non-ending node has no choices (dead end)`);
  for (const ch of n.choices || []) {
    allText.push([id, ch.t]);
    if (!S.nodes[ch.to]) errors.push(`${id}: broken link to "${ch.to}"`);
    checkCond(ch.if, id + ' choice');
    for (const k of [...arr(ch.give), ...arr(ch.take)]) if (!items.has(k)) errors.push(`${id}: unknown item "${k}"`);
  }
}
for (const [eid, e] of Object.entries(S.endings)) { allText.push([eid, e.title]); allText.push([eid, e.line]); }
for (const [id, t] of allText) {
  if (/[—―]/.test(t)) errors.push(`${id}: em dash found in "${t.slice(0, 40)}…"`);
  if (/\s-\s/.test(t.replace(/^- /, ''))) warns.push(`${id}: spaced hyphen mid-text "${t.slice(0, 40)}…"`);
}

// ---- dynamic exploration ----
// Flags that no condition ever reads cannot change any outcome, so they are left out of the state.
const usedFlags = new Set();
const noteCond = c => { if (c) [...arr(c.flag), ...arr(c.noflag)].forEach(f => usedFlags.add(f)); };
for (const id of ids) {
  const n = S.nodes[id];
  (n.text || []).forEach(p => typeof p === 'object' && noteCond(p.if));
  (n.choices || []).forEach(ch => noteCond(ch.if));
}
const addFlag = (set, f) => { if (usedFlags.has(f)) set.add(f); };
function enter(st, id) {
  const n = S.nodes[id];
  const s = { node: id, flags: new Set(st.flags), items: new Set(st.items), fear: st.fear, know: new Set(st.know) };
  s.fear = Math.max(0, Math.min(S.maxFear, s.fear + (n.fear || 0)));
  arr(n.set).forEach(f => addFlag(s.flags, f));
  arr(n.unset).forEach(f => s.flags.delete(f));
  arr(n.give).forEach(f => s.items.add(f));
  arr(n.take).forEach(f => s.items.delete(f));
  arr(n.learn).forEach(f => s.know.add(f));
  if (n.panic && s.fear >= S.maxFear && id !== S.panicNode) return enter(s, S.panicNode);
  return s;
}
function applyChoice(st, ch) {
  const s = { node: st.node, flags: new Set(st.flags), items: new Set(st.items), fear: st.fear, know: new Set(st.know) };
  s.fear = Math.max(0, Math.min(S.maxFear, s.fear + (ch.fear || 0)));
  arr(ch.set).forEach(f => addFlag(s.flags, f));
  arr(ch.unset).forEach(f => s.flags.delete(f));
  arr(ch.give).forEach(f => s.items.add(f));
  arr(ch.take).forEach(f => s.items.delete(f));
  return enter(s, ch.to);
}
// Fear only matters through `panic`, and the rules are monotone in fear, so for each
// (node, flags, items, knowledge) it is enough to explore the lowest and highest fear seen.
const key = s => [s.node, [...s.flags].sort().join(','), [...s.items].sort().join(','), [...s.know].sort().join(',')].join('|');

function explore(meta) {
  const start = enter({ flags: new Set(), items: new Set(), fear: 0, know: new Set(meta.know) }, S.start);
  const range = new Map([[key(start), [start.fear, start.fear]]]);
  let count = 1;
  const visit = t => {
    const k = key(t), r = range.get(k);
    if (!r) { range.set(k, [t.fear, t.fear]); return true; }
    if (t.fear < r[0]) { r[0] = t.fear; return true; }
    if (t.fear > r[1]) { r[1] = t.fear; return true; }
    return false;
  };
  const queue = [[start, 1]];
  const reachedNodes = new Set();
  const endings = new Map(); // ending -> shortest depth
  const learned = new Set(meta.know);
  const deadEnds = [];
  let qi = 0;
  while (qi < queue.length) {
    const [s, d] = queue[qi++];
    reachedNodes.add(s.node);
    s.know.forEach(k => learned.add(k));
    const n = S.nodes[s.node];
    (n.text || []).forEach((p, i) => { if (typeof p === 'object' && evalCond(p.if, s, meta)) shownParas.add(s.node + '#' + i); });
    if (n.ending) {
      if (!endings.has(n.ending) || endings.get(n.ending) > d) endings.set(n.ending, d);
      continue;
    }
    const avail = (n.choices || []).filter(ch => evalCond(ch.if, s, meta) && S.nodes[ch.to]);
    (n.choices || []).forEach((ch, i) => { if (avail.includes(ch)) shownChoices.add(s.node + '>' + i); });
    if (!avail.length) { deadEnds.push(key(s)); continue; }
    for (const ch of avail) {
      const t = applyChoice(s, ch);
      if (visit(t)) { count++; queue.push([t, d + 1]); }
    }
    if (qi > 4096) { queue.splice(0, qi); qi = 0; }
  }
  return { reachedNodes, endings, learned, deadEnds, states: count };
}

const shownParas = new Set();
const shownChoices = new Set();
// first night: nothing known
const first = explore({ know: new Set(), seen: new Set(), runs: 0 });
// later nights: accumulate knowledge until fixpoint
let meta = { know: new Set(first.learned), seen: new Set(first.endings.keys()), runs: 1 };
let later;
for (let i = 0; i < 10; i++) {
  later = explore(meta);
  const before = meta.know.size + meta.seen.size;
  later.learned.forEach(k => meta.know.add(k));
  later.endings.forEach((_, e) => meta.seen.add(e));
  if (meta.know.size + meta.seen.size === before) break;
}

for (const d of [...first.deadEnds, ...later.deadEnds]) errors.push('dead end state: ' + d);
for (const id of ids) (S.nodes[id].text || []).forEach((p, i) => {
  if (typeof p === 'object' && !shownParas.has(id + '#' + i)) errors.push(`${id}: conditional paragraph ${i} can never be shown`);
});
for (const id of ids) (S.nodes[id].choices || []).forEach((ch, i) => {
  if (!shownChoices.has(id + '>' + i)) errors.push(`${id}: choice "${ch.t}" can never be offered`);
});
const unreachable = ids.filter(id => !first.reachedNodes.has(id) && !later.reachedNodes.has(id));
for (const id of unreachable) errors.push('unreachable node: ' + id);
for (const e of Object.keys(S.endings)) if (!first.endings.has(e) && !later.endings.has(e)) errors.push('unreachable ending: ' + e);
for (const [e, def] of Object.entries(S.endings)) {
  if (def.secret && first.endings.has(e)) errors.push(`secret ending ${e} reachable on the first night`);
}

// ---- report ----
const words = allText.reduce((a, [, t]) => a + t.split(/\s+/).length, 0);
console.log('অদ্ভুতুড়ে: কাহিনি যাচাই');
console.log('  নোড:', ids.length, ' সমাপ্তি:', Object.keys(S.endings).length, ' মোট শব্দ ~', words);
console.log('  প্রথম রাতে যাচাই করা অবস্থা:', first.states, ' পরের রাতে:', later.states);
console.log('  প্রথম রাতে পৌঁছনো যায় এমন সমাপ্তি (ন্যূনতম নোড):');
for (const [e, d] of [...first.endings].sort((a, b) => S.endings[a[0]].n - S.endings[b[0]].n)) console.log(`    #${S.endings[e].n} ${e} ${S.endings[e].title}  (${d})`);
console.log('  শুধু পরের রাতে খোলে:');
for (const [e, d] of later.endings) if (!first.endings.has(e)) console.log(`    #${S.endings[e].n} ${e} ${S.endings[e].title}  (${d})`);
console.log('  জমানো জ্ঞান:', [...meta.know].join(', '));
for (const w of warns) console.log('  সতর্কতা:', w);
if (errors.length) {
  console.log('\nত্রুটি (' + errors.length + '):');
  for (const e of errors) console.log('  ✗', e);
  process.exit(1);
}
console.log('\n✓ কোনো ভাঙা লিংক নেই, কোনো কানাগলি নেই, সব নোড ও সব সমাপ্তিতে পৌঁছনো যায়, প্রতিটা শর্তসাপেক্ষ অনুচ্ছেদ ও পছন্দ অন্তত একবার দেখা যায়।');
