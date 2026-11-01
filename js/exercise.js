/* =========================================================================
   IMMERSE FIT — exercise.js
   お手本の動き（moves.js）を組み合わせて「1サイクルの動き」を作り、位相 t のポーズを計算します。
   ========================================================================= */
import { MOVES } from './moves.js';
import { K, fr, sm, base, resolve, blendR, mirrorP } from './motion.js';

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const uniq = a => [...new Set(a)];
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a * b / gcd(a, b);
const TEMPO = {
  n: { mul: 1, lab: '', pr: 0 },
  slow: { mul: 2, lab: 'スロー', pr: 2 },
  quick: { mul: 0.5, lab: 'クイック', pr: 2 },
  d: { mul: 2, kk: 'd', lab: 'ゆっくり下ろす', pr: 2 },
  p: { mul: 1, kk: 'p', lab: 'パルス', pr: 3 },
  o: { mul: 2, kk: 'o', lab: '1.5回', pr: 3 },
  h: { mul: 2, kk: 'h', lab: 'キープ', pr: 3 },
};


function variant(m, vk) { return m.vars.find(v => v.k === vk) || m.vars[0]; }
function vprop(m, va, key) { return va[key] !== undefined ? va[key] : m[key]; }

// 位相のピーク（ビートの頭にそろえるため）
function peakOf(m, va, kk, mode) {
  let p = va.pk ?? m.pk ?? (kk === 'x' ? 0.33 : kk === 'd' ? 0.75 : kk === 'p' ? 0.25 : 0.5);
  if (mode === 'alt') p /= 2;
  return p;
}
// 1つのパーツ（動き1つ）
function part(mk, vk = '', opt = {}) {
  const m = MOVES[mk]; if (!m) throw new Error('unknown move ' + mk);
  const va = variant(m, vk);
  const modes = vprop(m, va, 'modes');
  const mode = opt.mode || modes[0];
  const tempo = TEMPO[opt.tempo || 'n'];
  const ks = va.ks || m.ks;
  const kk = tempo.kk || ks[0];
  const b0 = (va.b ?? m.b) * (mode === 'alt' && modes[0] !== 'alt' ? 2 : 1);
  const bp = b0 * tempo.mul;
  return {
    m: mk, vk: va.k, v: Object.assign({}, va.v || {}), mode, kk, amp: (va.v && va.v.amp) || 1, bp,
    arms: opt.arms || null, rep: 1, off: 0, mirror: vprop(m, va, 'mirror') || 0, keys: !!(va.v && va.v.keys),
    pk: peakOf(m, va, kk, mode),
  };
}
function alignBeat(p) { // ピークをビートにそろえる
  const bp = p.bp; p.off = fr(p.pk - Math.round(p.pk * bp) / bp);
}

/* ---------- 種目をつくる ---------- */
function makeEx(ver, cat, name, parts, extra = {}) {
  // パーツの周期をそろえる
  const beats = extra.beats || parts.reduce((a, p) => lcm(a, Math.max(1, Math.round(p.bp))), 1);
  parts.forEach(p => { p.rep = beats / p.bp; });
  parts.forEach(alignBeat);
  // 脚＋腕：腕のピークを「しゃがむ／立ち上がる」に合わせる
  const legs = parts.find(p => MOVES[p.m].ch === 'legs'), arms = parts.find(p => MOVES[p.m].ch === 'arms');
  if (legs && arms) {
    const ml = MOVES[legs.m], ma = MOVES[arms.m];
    const legPeakBeat = (legs.pk - legs.off) * legs.bp;
    const want = extra.want || ma.want;
    let target = legPeakBeat;
    if (want === 'top' && ['squat', 'lunge', 'sqplus'].includes(ml.g === 'squat' ? 'squat' : legs.m)) target += legs.mode === 'alt' ? legs.bp / 4 : legs.bp / 2;
    arms.off = fr(arms.pk - (target % arms.bp) / arms.bp);
  }
  const ms = parts.map(p => MOVES[p.m]);
  const vas = parts.map(p => variant(MOVES[p.m], p.vk));
  const get = (k, i) => vprop(ms[i], vas[i], k);
  const tempoMul = extra.tempoMul || 1;
  let lvl = Math.max(...parts.map((p, i) => get('lvl', i)));
  if (extra.quick) lvl = Math.min(3, lvl + 1);
  const met = Math.max(...parts.map((p, i) => get('met', i))) * (extra.quick ? 1.15 : tempoMul > 1 ? 0.88 : 1) + (parts.length > 1 ? 0.6 : 0);
  const main = parts.find(p => MOVES[p.m].ch === 'body') || legs || parts.find(p => MOVES[p.m].ch === 'torso') || parts[0];
  const mi = parts.indexOf(main);
  const sig = parts.map(p => [p.m, p.vk, p.mode, p.kk, p.bp, p.arms || ''].join(':')).join('|') + (extra.seqSig || '');
  return {
    id: ver[0] + hash(sig), ver, cat, name, parts, beats,
    one: parts.some(p => p.mode === 'one'),
    lvl, met: Math.round(met * 10) / 10,
    imp: parts.some((p, i) => get('imp', i)) ? 1 : 0,
    floor: parts.some((p, i) => get('floor', i)) ? 1 : 0,
    calm: parts.every((p, i) => get('calm', i)) ? 1 : 0,
    warm: parts.every((p, i) => get('warm', i) || get('calm', i)) && lvl <= 1 ? 1 : 0,
    view: extra.view ?? get('view', mi),
    mus: uniq(parts.flatMap((p, i) => get('mus', i))).slice(0, 4),
    cue: uniq(parts.map((p, i) => get('cue', i))).filter(Boolean).join('　'),
    base: parts.map(p => p.m + ':' + p.vk).join('+'),
    fam: uniq(parts.map(p => p.m)).join('+'),
    sig,
  };
}

/* ---------- 種目のポーズを計算 ---------- */
const keyCache = new Map();
function evalParts(parts, t, side, exId) {
  const p0 = parts[0], m0 = MOVES[p0.m];
  if (p0.keys) {
    const ck = exId + ':' + p0.m + p0.vk + side;
    let ks = keyCache.get(ck);
    if (!ks) { ks = variant(m0, p0.vk).v.keys().map(([u, P]) => [u, resolve(side === 'L' ? mirrorP(P) : P)]); keyCache.set(ck, ks); }
    const u = fr(t * p0.rep + p0.off);
    for (let i = 0; i < ks.length - 1; i++) if (u <= ks[i + 1][0]) return blendR(ks[i][1], ks[i + 1][1], sm((u - ks[i][0]) / (ks[i + 1][0] - ks[i][0] || 1)));
    return ks[ks.length - 1][1];
  }
  const P = base();
  const order = ['legs', 'body', 'torso', 'arms'];
  const sorted = parts.slice().sort((a, b) => order.indexOf(MOVES[a.m].ch) - order.indexOf(MOVES[b.m].ch));
  let mirror = false;
  for (const p of sorted) {
    const m = MOVES[p.m];
    const tt = fr(t * p.rep + p.off);
    const useMirror = p.mirror && p.mode === 'one' && side === 'L';
    if (useMirror) mirror = true;
    m.fn(P, tt, { k: K[p.kk] || K.n, kk: p.kk, amp: p.amp, v: p.v, mode: p.mode, side: useMirror ? 'R' : side, arms: p.arms });
  }
  if (mirror) mirrorP(P);
  return resolve(P);
}
// t: 0..1（種目の1サイクル） side: 片側ずつの種目で 'R' / 'L'
export function evalEx(ex, t, side = 'R') {
  if (!ex.seq) return evalParts(ex.parts, t, side, ex.id);
  const [a, b] = ex.seq, tot = a.beats + b.beats, x = fr(t) * tot;
  const inA = x < a.beats, seg = inA ? a : b, nxt = inA ? b : a;
  const u = (inA ? x : x - a.beats) / seg.beats;
  const R = evalParts(seg.parts, u, side, ex.id);
  const fade = Math.min(0.5, 1.5 / seg.beats);
  if (u > 1 - fade) return blendR(R, evalParts(nxt.parts, 0, side, ex.id), sm((u - (1 - fade)) / fade));
  return R;
}

export { part, makeEx };
