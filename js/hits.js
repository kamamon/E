/* =========================================================================
   IMMERSE FIT — hits.js
   打点の効果音ライブラリ（500種類）。録音ファイルは使わず、すべてその場で合成します。
   37の系統（和太鼓・金づち・まき割り・パンチ・水しぶき…）× 大きさ・響き・硬さのちがい。
   音の大きさはそろえてあり、一度作った音は覚えておくので2回目からは一瞬で鳴ります。
   ========================================================================= */
const TAU = Math.PI * 2, LN1000 = 6.907755;
const lerp = (a, b, t) => a + (b - a) * t;
const lg = (a, b, t) => a * Math.pow(b / a, t);                 // 対数で補間（高さ・長さ）
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const between = (r, a, b) => a + (b - a) * r();
const lbetween = (r, a, b) => lg(a, b, r());
const TARGET = -17;          // そろえる大きさ（瞬間ラウドネス）
export const HIT_GAIN = 0.52; // 鳴らすときの大きさ（音楽とのつり合い）
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

/* ---------- 音をためる入れ物（pre = 当たる前の助走の秒数） ---------- */
class Buf {
  constructor(sr, dur, pre = 0) { this.sr = sr; this.pre = pre; this.n = Math.max(16, Math.ceil((dur + pre) * sr)); this.L = new Float32Array(this.n); this.R = new Float32Array(this.n); }
  at(t) { return Math.max(0, Math.round((t + this.pre) * this.sr)); }
}
const panG = p => { const a = (clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2]; };

/* ---------- フィルター ---------- */
class SVF {   // 状態変数フィルター（lp / bp / hp）
  constructor() { this.s1 = 0; this.s2 = 0; this.lp = 0; this.bp = 0; this.hp = 0; }
  set(fc, q, sr) { const g = Math.tan(Math.PI * clamp(fc, 20, sr * 0.45) / sr); this.k = 1 / q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2; }
  run(x) { const v3 = x - this.s2, v1 = this.a1 * this.s1 + this.a2 * v3, v2 = this.s2 + this.a2 * this.s1 + this.a3 * v3; this.s1 = 2 * v1 - this.s1; this.s2 = 2 * v2 - this.s2; this.lp = v2; this.bp = v1 * this.k; this.hp = x - this.k * v1 - v2; }
}
function biquad(x, type, f, q, sr, db = 0) {
  const w = TAU * clamp(f, 10, sr * 0.45) / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q), A = Math.pow(10, db / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'highpass') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else { const s = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + s); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - s); a0 = (A + 1) - (A - 1) * cs + s; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - s; }  // highshelf
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const x0 = x[i], y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x0; y2 = y1; y1 = y0; x[i] = y0; }
}
// 白色雑音をフィルターに通したときの大きさをそろえる係数
function ncomp(type, fc, q, sr) { const bw = type === 'bp' ? fc / q : type === 'lp' ? fc : type === 'hp' ? sr * 0.5 - fc : sr * 0.5; return 1.73 * Math.sqrt(Math.min(400, (sr * 0.5) / Math.max(60, bw))); }

/* ---------- 音の部品 ---------- */
// 減衰する正弦波（金属・木・ガラスの「鳴り」）。glide = 最初だけ高さがずれる量
function partial(B, f, a, t60, o = {}) {
  const sr = B.sr; if (!(f > 18) || f > sr * 0.46 || !(a > 0) || !(t60 > 0)) return;
  const i0 = B.at(o.t0 || 0), len = Math.min(B.n - i0, Math.ceil(Math.min(t60 * 1.6, 4) * sr)); if (len <= 0) return;
  const dec = Math.exp(-LN1000 / (t60 * sr)), att = Math.max(1, Math.round((o.att ?? 0.0006) * sr)), [gl, gr] = panG(o.pan || 0), w = TAU * f / sr;
  let ph = o.ph ?? 0, amp = a, gg = o.glide || 0; const gd = gg ? Math.exp(-1 / ((o.tau || 0.03) * sr)) : 1;
  const L = B.L, R = B.R;
  if (!gg) {   // 高さが変わらないとき：回転の漸化式（sin を毎回計算しないので速い）
    const cw = Math.cos(w), sw = Math.sin(w); let c = Math.cos(ph), sn = Math.sin(ph);
    for (let i = 0; i < len; i++) {
      const s = sn * amp * (i < att ? i / att : 1);
      L[i0 + i] += s * gl; R[i0 + i] += s * gr;
      const c2 = c * cw - sn * sw; sn = sn * cw + c * sw; c = c2; amp *= dec;
    }
    return;
  }
  for (let i = 0; i < len; i++) {
    const s = Math.sin(ph) * amp * (i < att ? i / att : 1);
    L[i0 + i] += s * gl; R[i0 + i] += s * gr;
    ph += w * (1 + gg); gg *= gd; amp *= dec;
  }
}
// 共鳴の集まり：ratios = 基音に対する比、amps = 大きさ、t60 = 長さ（数か配列）、tilt = 高い音ほど短く、pair = うなり
function modes(B, r, o) {
  const rs = o.ratios;
  for (let i = 0; i < rs.length; i++) {
    const ratio = rs[i] * (1 + (o.jit ?? 0.004) * (r() * 2 - 1));
    const amp = (o.amps ? (o.amps[i] ?? o.amps[o.amps.length - 1]) : 1 / (1 + i)) * (o.a ?? 1) * (0.75 + 0.5 * r());
    const t60 = Array.isArray(o.t60) ? o.t60[Math.min(i, o.t60.length - 1)] : o.t60 * Math.pow(rs[i] / rs[0], -(o.tilt ?? 0.5));
    const pan = (r() * 2 - 1) * (o.spread ?? 0.25), base = { t0: o.t0, att: o.att, glide: o.glide, tau: o.tau, pan, ph: r() * TAU };
    if (o.pair) { const d = 1 + o.pair * (0.5 + r()); partial(B, o.f * ratio, amp * 0.55, t60, base); partial(B, o.f * ratio * d, amp * 0.45, t60 * 0.95, { ...base, ph: r() * TAU, pan: -pan }); }
    else partial(B, o.f * ratio, amp, t60, base);
  }
}
// 胴の響き（高さが下がりながら減る正弦波）。drive で倍音を足す
function thump(B, o) {
  const sr = B.sr, i0 = B.at(o.t0 || 0), len = Math.min(B.n - i0, Math.ceil(o.t60 * 1.6 * sr)); if (len <= 0) return;
  const dec = Math.exp(-LN1000 / (o.t60 * sr)), att = Math.max(1, Math.round((o.att ?? 0.0004) * sr)), td = Math.exp(-1 / ((o.tau || 0.02) * sr));
  let df = o.f0 - o.f1, ph = 0, amp = o.a ?? 1; const dr = o.drive || 0, dn = dr ? Math.tanh(dr) : 1, [gl, gr] = panG(o.pan || 0);
  for (let i = 0; i < len; i++) {
    let s = Math.sin(ph); if (dr) s = Math.tanh(s * dr) / dn;
    s *= amp * (i < att ? i / att : 1);
    B.L[i0 + i] += s * gl; B.R[i0 + i] += s * gr;
    ph += TAU * (o.f1 + df) / sr; df *= td; amp *= dec;
  }
}
// 雑音（皮・こすれ・しぶき・空気）。type = lp / bp / hp、f0→f1 に動く（path = [[秒, Hz], …] でも）
function noise(B, r, o) {
  const sr = B.sr, i0 = B.at(o.t0 || 0), hold = o.hold || 0, len = Math.min(B.n - i0, Math.ceil((hold + o.t60 * 1.6) * sr)); if (len <= 0) return;
  const att = Math.max(1, Math.round((o.att ?? 0.0005) * sr)), dec = Math.exp(-LN1000 / (o.t60 * sr)), ih = Math.round(hold * sr);
  const type = o.type || 'none', q = o.q ?? 0.707, f0 = o.f0 ?? 1000, f1 = o.f1 ?? f0, sw = o.sweep ?? o.t60 * 0.5, path = o.path;
  const fl = new SVF(), fr = new SVF(), wd = o.width ?? 0.2, [gl, gr] = panG(o.pan || 0), color = o.color || 'white';
  const fAt = t => { if (path) { let k = 0; while (k < path.length - 2 && t > path[k + 1][0]) k++; const [ta, fa] = path[k], [tb, fb] = path[k + 1]; return lg(fa, fb, clamp((t - ta) / Math.max(1e-4, tb - ta), 0, 1)); } return lg(f1, f0, Math.exp(-t / sw)); };
  const a = (o.a ?? 1) * (type === 'none' ? 1.73 : ncomp(type, path ? path[0][1] : f0, q, sr)) * (color === 'pink' ? 1.6 : color === 'brown' ? 1.4 : 1);
  let amp = 1, b0 = 0, b1 = 0, b2 = 0, br = 0;
  for (let i = 0; i < len; i++) {
    if (type !== 'none' && i % 16 === 0) { const fc = fAt(i / sr); fl.set(fc, q, sr); fr.set(fc, q, sr); }
    let w = r() * 2 - 1;
    if (color === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; w = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    else if (color === 'brown') { br = (br + 0.02 * w) / 1.02; w = br * 3.5; }
    const xl = w * (1 - wd) + (r() * 2 - 1) * wd, xr = w * (1 - wd) + (r() * 2 - 1) * wd;
    let yl = xl, yr = xr; if (type !== 'none') { fl.run(xl); fr.run(xr); yl = fl[type]; yr = fr[type]; }
    const e = (i < att ? i / att : 1) * amp * a;
    B.L[i0 + i] += yl * e * gl; B.R[i0 + i] += yr * e * gr;
    if (i >= ih) amp *= dec;
  }
}
// こまかい粒（ザクッ・ジャリッ・しずく）。前のほうに多く集まる
function grains(B, r, o) {
  const sr = B.sr, n = Math.round(o.n), sp = o.spread, a = o.a ?? 0.5;
  for (let g = 0; g < n; g++) {
    const x = o.dist === 'uni' ? r() : Math.min(1, -Math.log(1 - r() * 0.98) / 3.2);
    const t = (o.t0 || 0) + x * sp, fall = Math.pow(1 - x * 0.85, o.curve ?? 1.5);
    const f = lg(o.f[0], o.f[1], r()), len = lerp(o.len[0], o.len[1], r()), q = o.q ?? 2;
    const i0 = B.at(t), m = Math.min(B.n - i0, Math.ceil(len * 1.6 * sr)); if (m <= 0) continue;
    const flt = new SVF(); flt.set(f, q, sr); const dec = Math.exp(-LN1000 / (len * sr)), att = Math.max(1, Math.round(0.0002 * sr));
    const [gl, gr] = panG((r() * 2 - 1) * (o.width ?? 0.5)); let amp = a * fall * (0.35 + 0.65 * r()) * ncomp('bp', f, q, sr);
    for (let i = 0; i < m; i++) { flt.run(r() * 2 - 1); const s = flt.bp * amp * (i < att ? i / att : 1); B.L[i0 + i] += s * gl; B.R[i0 + i] += s * gr; amp *= dec; }
  }
}
// 泡（高さが上がりながら消える）
function bubbles(B, r, o) {
  for (let k = 0; k < o.n; k++) {
    const x = o.dist === 'uni' ? r() : Math.min(1, -Math.log(1 - r() * 0.98) / 3);
    const f = lg(o.f[0], o.f[1], r()), rise = lerp(o.rise[0], o.rise[1], r()), t60 = lerp(o.t60[0], o.t60[1], r());
    partial(B, f * (1 + rise), (o.a ?? 0.3) * (0.4 + 0.6 * r()) * Math.pow(1 - x * 0.7, 1.2), t60, { t0: (o.t0 || 0) + x * o.spread, glide: -rise / (1 + rise), tau: t60 * 0.5, att: 0.0015, pan: (r() * 2 - 1) * (o.width ?? 0.5) });
  }
}
// 当たる前の「シュッ」（pre 秒前から近づいてくる）
function whoosh(B, r, o) {
  const sr = B.sr, n1 = Math.max(1, Math.round(o.pre * sr)), i0 = B.at(-o.pre), len = Math.min(B.n - i0, n1 + Math.round(0.06 * sr)), q = o.q || 1;
  const fl = new SVF(), fr = new SVF(), comp = ncomp('bp', o.f1, q, sr);
  for (let i = 0; i < len; i++) {
    const x = Math.min(1, i / n1); if (i % 16 === 0) { const fc = lg(o.f0, o.f1, x); fl.set(fc, q, sr); fr.set(fc, q, sr); }
    const e = (i < n1 ? x * x * x : Math.exp(-LN1000 * (i - n1) / (0.035 * sr))) * o.a * comp, w = r() * 2 - 1;
    fl.run(w * 0.6 + (r() * 2 - 1) * 0.4); fr.run(w * 0.6 + (r() * 2 - 1) * 0.4);
    B.L[i0 + i] += fl.bp * e; B.R[i0 + i] += fr.bp * e;
  }
}
// ばね（ボヨン）
function spring(B, o) {
  const sr = B.sr, i0 = B.at(0), len = Math.min(B.n - i0, Math.ceil(o.t60 * 1.6 * sr)), dec = Math.exp(-LN1000 / (o.t60 * sr)), att = Math.round(0.002 * sr);
  let ph = 0, ph2 = 0, amp = o.a ?? 0.8;
  for (let i = 0; i < len; i++) {
    const t = i / sr, f = o.f * (1 + (o.up || 0) * (1 - Math.exp(-t / 0.08))) * (1 + o.depth * Math.sin(TAU * o.rate * t) * Math.exp(-t / (o.t60 * 0.6)));
    const s = (Math.sin(ph) + 0.3 * Math.sin(ph2)) * amp * (i < att ? i / att : 1); B.L[i0 + i] += s; B.R[i0 + i] += s;
    ph += TAU * f / sr; ph2 += TAU * f * 2.01 / sr; amp *= dec;
  }
}
// ゲーム機の音（矩形波・三角波）。seq = [[Hz, 秒, 終わりのHz?], …]
const blep = (t, dt) => { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; };
function chip(B, o) {
  const sr = B.sr, duty = o.duty ?? 0.5, a = o.a ?? 0.3, s0 = B.at(o.t0 || 0); let t0 = o.t0 || 0;
  for (const [f0, dur, f1] of o.seq) {
    const i0 = B.at(t0), len = Math.min(B.n - i0, Math.round(dur * sr)); let ph = 0;
    for (let i = 0; i < len; i++) {
      const f = f1 ? f0 * Math.pow(f1 / f0, i / len) : f0, dt = f / sr; ph += dt; if (ph >= 1) ph -= 1;
      let s; if (o.wave === 'tri') s = 4 * Math.abs(ph - 0.5) - 1; else { s = ph < duty ? 1 : -1; s += blep(ph, dt); s -= blep((ph - duty + 1) % 1, dt); }
      const e = a * Math.exp(-LN1000 * (i0 + i - s0) / sr / o.t60) * Math.min(1, (len - i) / (0.002 * sr));
      B.L[i0 + i] += s * e; B.R[i0 + i] += s * e;
    }
    t0 += dur;
  }
}
function lfsr(B, o) {   // ゲーム機の雑音
  const sr = B.sr, i0 = B.at(o.t0 || 0), len = Math.min(B.n - i0, Math.ceil(o.t60 * 1.6 * sr)), per = sr / o.rate, dec = Math.exp(-LN1000 / (o.t60 * sr));
  let reg = 0x4001, c = 0, out = 1, amp = o.a ?? 0.4;
  for (let i = 0; i < len; i++) { c += 1; if (c >= per) { c -= per; const fb = (reg & 1) ^ ((reg >> 1) & 1); reg = (reg >> 1) | (fb << 14); out = reg & 1 ? 1 : -1; } const s = out * amp; B.L[i0 + i] += s; B.R[i0 + i] += s; amp *= dec; }
}
// 残響（8本の遅延線のネットワーク）
function reverb(B, o) {
  const sr = B.sr, n = B.n, base = [0.0297, 0.0371, 0.0411, 0.0437, 0.0313, 0.0239, 0.0473, 0.0539];
  const len = base.map(d => Math.max(8, Math.round(d * (o.size || 1) * sr))), g = len.map(L => Math.pow(10, -3 * L / (o.t60 * sr)));
  const lines = len.map(L => new Float32Array(L)), pos = new Int32Array(8), lp = new Float64Array(8), v = new Float64Array(8);
  const dc = 1 - Math.exp(-TAU * (o.damp || 5000) / sr), pre = Math.round((o.pre ?? 0.012) * sr), mix = (o.mix ?? 0.15) * 0.5, sq = 1 / Math.sqrt(8);
  const ap = [0.0047, 0.0036, 0.0127, 0.0093].map(d => ({ b: new Float32Array(Math.max(2, Math.round(d * (o.size || 1) * sr))), p: 0 }));
  const dL = Float32Array.from(B.L), dR = Float32Array.from(B.R);
  for (let i = 0; i < n; i++) {
    let x = i >= pre ? (dL[i - pre] + dR[i - pre]) * 0.5 : 0;
    for (const A of ap) { const y = A.b[A.p], out = y - 0.6 * x; A.b[A.p] = x + 0.6 * out; A.p = (A.p + 1) % A.b.length; x = out; }
    for (let k = 0; k < 8; k++) { const y = lines[k][pos[k]]; lp[k] += (y - lp[k]) * dc; v[k] = lp[k]; }
    const oL = v[0] + v[2] + v[4] + v[6], oR = v[1] + v[3] + v[5] + v[7];
    for (let h = 1; h < 8; h *= 2) for (let a = 0; a < 8; a += h * 2) for (let j = a; j < a + h; j++) { const p = v[j], q = v[j + h]; v[j] = p + q; v[j + h] = p - q; }
    for (let k = 0; k < 8; k++) { lines[k][pos[k]] = x * (k & 1 ? 0.5 : -0.5) + g[k] * v[k] * sq; pos[k] = (pos[k] + 1) % len[k]; }
    B.L[i] += oL * mix; B.R[i] += oR * mix;
  }
}

/* ---------- 仕上げ：ひずみ → 残響 → 低音を整える → 切りつめ → 大きさをそろえる ---------- */
const soft = x => { const a = Math.abs(x); return a <= 0.75 ? x : Math.sign(x) * (0.75 + 0.25 * Math.tanh((a - 0.75) / 0.25)); };
export function loudness(L, R, n, sr) {
  const a = Float32Array.from(L.subarray(0, n)), b = Float32Array.from(R.subarray(0, n));
  for (const x of [a, b]) { biquad(x, 'highshelf', 1500, 0.707, sr, 4); biquad(x, 'highpass', 120, 0.5, sr); }   // 小さなスピーカーでの聞こえ方に近づける
  const W = Math.round(0.4 * sr), H = Math.round(0.05 * sr), cs = new Float64Array(n + 1); let best = 1e-12;
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + a[i] * a[i] + b[i] * b[i];
  for (let s = -W + H; s < n; s += H) { const i0 = Math.max(0, s), i1 = Math.min(n, s + W), e = (cs[i1] - cs[i0]) / W; if (e > best) best = e; }
  return -0.691 + 10 * Math.log10(best);
}
function finish(B, post) {
  const sr = B.sr, L = B.L, R = B.R, n = B.n; let pk = 1e-9;
  if (post.drive) { for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); const k = post.drive, d = Math.tanh(k); for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] / pk * k) / d * pk; R[i] = Math.tanh(R[i] / pk * k) / d * pk; } }
  if (post.rev) reverb(B, post.rev);
  if (post.hp) { biquad(L, 'highpass', post.hp, 0.707, sr); biquad(R, 'highpass', post.hp, 0.707, sr); }
  pk = 1e-9; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const th = pk * 0.0004; let end = n - 1; while (end > 0 && Math.abs(L[end]) < th && Math.abs(R[end]) < th) end--;
  end = Math.min(n, end + Math.round(0.012 * sr));
  const fade = Math.min(end, Math.round(0.025 * sr)); for (let i = 0; i < fade; i++) { const g = i / fade; L[end - 1 - i] *= g; R[end - 1 - i] *= g; }
  // 大きさをそろえる。ただし短く鋭い音を上げすぎてつぶさないように、ピークは 1.7 倍まで（やわらかく丸める）
  pk = 1e-9; for (let i = 0; i < end; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const lu = loudness(L, R, end, sr), gain = Math.min(Math.pow(10, (TARGET - lu) / 20), 1.7 / pk), oL = new Float32Array(end), oR = new Float32Array(end);
  for (let i = 0; i < end; i++) { oL[i] = soft(L[i] * gain); oR[i] = soft(R[i] * gain); }
  return { L: oL, R: oR, loud: lu + 20 * Math.log10(gain), over: pk * gain };
}

/* ---------- 響きの種類 ---------- */
const ROOM = {
  dry: null,
  small: { size: 0.4, t60: 0.3, damp: 6500, mix: 0.1 },
  room: { size: 0.65, t60: 0.55, damp: 5200, mix: 0.14 },
  hall: { size: 1.05, t60: 1.3, damp: 4300, mix: 0.2 },
  big: { size: 1.35, t60: 2.1, damp: 3600, mix: 0.24 },
  out: { size: 1.7, t60: 0.7, damp: 2800, mix: 0.08 },
};
const ROOMJ = { dry: '響きなし', small: '小部屋', room: '室内', hall: 'ホール', big: '大ホール', out: '野外' };
const rt = k => (ROOM[k] ? ROOM[k].t60 : 0);
const SIZE = u => u < 0.34 ? '小' : u < 0.67 ? '中' : '大';
const PITCH = u => u < 0.34 ? '高め' : u < 0.67 ? '中くらい' : '低め';

/* =========================================================================
   37の系統。p() = バリエーションの設定（名前にも使う）、g() = 音を組み立てる
   ========================================================================= */
const FAMS = [
  /* ---------- 太鼓・ドラム ---------- */
  { k: 'taiko', cat: 'drum', jp: '和太鼓', n: 20,
    p(v, N, r) { const u = (v + 0.5) / N, room = ['room', 'hall', 'out', 'big'][v % 4];
      const P = { u, room, f: lg(120, 46, u) * between(r, 0.97, 1.03), gl: between(r, 0.45, 1.0), tau: between(r, 0.018, 0.04), t60: lg(0.4, 1.05, u) * between(r, 0.88, 1.12), hard: r(), skin: between(r, 0.25, 0.45) };
      P.label = `${SIZE(u)}・${ROOMJ[room]}`; P.word = u > 0.7 ? (room === 'big' ? 'ズドーン' : 'ドーン') : u > 0.35 ? 'ドン' : 'トン'; P.dur = P.t60 * 1.6 + rt(room) + 0.1; return P; },
    g(B, P, r) {
      thump(B, { f0: P.f * (1 + P.gl), f1: P.f, tau: P.tau, t60: P.t60, a: 1, drive: 1.1 });
      modes(B, r, { f: P.f, ratios: [1.59, 2.14, 2.3, 2.65, 2.92, 3.16], amps: [0.34, 0.22, 0.16, 0.11, 0.08, 0.06], t60: P.t60 * 0.32, tilt: 0.6, glide: P.gl * 0.5, tau: P.tau, spread: 0.3 });
      noise(B, r, { a: P.skin, t60: 0.11, type: 'lp', f0: 1500, f1: 350, sweep: 0.04, width: 0.3, color: 'pink' });
      noise(B, r, { a: 0.08 + 0.22 * P.hard, t60: 0.012, type: 'bp', f0: lg(2200, 3400, P.hard), q: 1.1 });
      return { rev: ROOM[P.room], hp: 28 };
    } },
  { k: 'tom', cat: 'drum', jp: 'ドラム（タム）', n: 14,
    p(v, N, r) { const u = (v + 0.5) / N, room = ['small', 'room', 'dry', 'room', 'hall'][v % 5];
      const P = { u, room, f: lg(250, 82, u) * between(r, 0.97, 1.03), t60: lg(0.2, 0.55, u) * between(r, 0.85, 1.15), gl: between(r, 0.35, 0.7), head: between(r, 0.12, 0.3), stick: between(r, 0.15, 0.35) };
      P.label = `${PITCH(u)}・${ROOMJ[room]}`; P.word = u > 0.66 ? 'ドン' : u > 0.33 ? 'トン' : 'タン'; P.dur = P.t60 * 1.6 + rt(room) + 0.05; return P; },
    g(B, P, r) {
      thump(B, { f0: P.f * (1 + P.gl), f1: P.f, tau: 0.018, t60: P.t60, a: 1, drive: 0.9 });
      modes(B, r, { f: P.f, ratios: [1.5, 1.98, 2.44], amps: [0.22, 0.13, 0.08], t60: P.t60 * 0.3, glide: P.gl * 0.5, tau: 0.018 });
      noise(B, r, { a: P.head, t60: 0.06, type: 'bp', f0: 1500, f1: 900, q: 0.7, width: 0.3 });
      noise(B, r, { a: P.stick, t60: 0.006, type: 'bp', f0: 4200, q: 1 });
      return { rev: ROOM[P.room], hp: 35 };
    } },
  { k: 'kick', cat: 'drum', jp: 'バスドラム', n: 14,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 3;
      const P = { u, kind, f: lg(68, 42, u), f0: between(r, 120, 240), tau: between(r, 0.012, 0.03), t60: kind === 2 ? between(r, 0.7, 1.1) : between(r, 0.22, 0.42), drive: between(r, 0.6, 2.6), click: between(r, 0.12, 0.4) };
      P.label = `${['タイト', 'パンチ', 'ロング'][kind]}・${PITCH(u)}`; P.word = kind === 2 ? 'ズーン' : kind ? 'ドッ' : 'ドン'; P.dur = P.t60 * 1.6 + 0.35; return P; },
    g(B, P, r) {
      thump(B, { f0: P.f0, f1: P.f, tau: P.tau, t60: P.t60, a: 1, drive: P.drive });
      noise(B, r, { a: P.click, t60: 0.005, type: 'hp', f0: 3500, q: 0.7 });
      noise(B, r, { a: P.click * 0.6, t60: 0.014, type: 'bp', f0: 1700, q: 1 });
      return { rev: P.kind === 1 ? ROOM.small : null, hp: 25 };
    } },
  { k: 'snare', cat: 'drum', jp: '小太鼓・スネア', n: 16,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 4, room = ['room', 'hall', 'small', 'room'][Math.floor(v / 4) % 4];
      const P = { u, kind, room, f: lg(270, 165, u), wires: between(r, 0.4, 0.8), wt60: kind === 3 ? between(r, 0.08, 0.14) : between(r, 0.14, 0.3), bright: lbetween(r, 1800, 4800) };
      P.label = `${['ふつう', 'リムショット', 'ブラシ', 'マーチング'][kind]}・${ROOMJ[room]}`; P.word = kind === 1 ? 'カッ' : kind === 2 ? 'シャッ' : u > 0.5 ? 'タン' : 'パン'; P.dur = P.wt60 * 1.6 + rt(room) + 0.1; return P; },
    g(B, P, r) {
      const brush = P.kind === 2;
      thump(B, { f0: P.f * 1.3, f1: P.f, tau: 0.008, t60: 0.1, a: brush ? 0.25 : 0.6, att: brush ? 0.006 : 0.0004 });
      modes(B, r, { f: P.f, ratios: [1, 1.47, 2.03], amps: [0.25, 0.18, 0.1], t60: 0.09, att: brush ? 0.006 : 0.0005 });
      noise(B, r, { a: P.wires, t60: P.wt60, type: 'hp', f0: P.bright, q: 0.6, att: brush ? 0.012 : 0.0006, width: 0.4 });
      noise(B, r, { a: P.kind === 1 ? 0.55 : brush ? 0.03 : 0.22, t60: 0.004, type: 'bp', f0: 5000, q: 0.8 });
      if (P.kind === 1) partial(B, between(r, 800, 1100), 0.18, 0.06, {});
      return { rev: ROOM[P.room], hp: 60 };
    } },
  { k: 'hand', cat: 'drum', jp: 'ハンドドラム', n: 18,
    p(v, N, r) { const kind = v % 4, j = Math.floor(v / 4), m = Math.ceil((N - kind) / 4), u = (j + 0.5) / m;
      const T = [{ nm: 'ボンゴ', f: [540, 330], t60: [0.12, 0.2], w: 'ポコ' }, { nm: 'コンガ', f: [340, 190], t60: [0.25, 0.4], w: 'ポン' }, { nm: 'カホン', f: [115, 78], t60: [0.14, 0.22], w: 'ドン' }, { nm: 'ジャンベ', f: [100, 68], t60: [0.2, 0.3], w: 'ドゥン' }][kind];
      const P = { kind, u, f: lg(T.f[0], T.f[1], u), t60: lerp(T.t60[0], T.t60[1], r()), slap: between(r, 0.15, 0.4), room: ['room', 'small', 'hall'][j % 3] };
      P.label = `${T.nm}・${PITCH(u)}`; P.word = T.w; P.dur = P.t60 * 1.6 + rt(P.room) + 0.1; return P; },
    g(B, P, r) {
      const k = P.kind;
      thump(B, { f0: P.f * (k >= 2 ? 1.8 : 1.25), f1: P.f, tau: k >= 2 ? 0.015 : 0.01, t60: P.t60, a: 1, drive: k >= 2 ? 1.2 : 0.4 });
      if (k < 2) modes(B, r, { f: P.f, ratios: [1.6, 2.3, 2.9], amps: [0.18, 0.1, 0.06], t60: P.t60 * 0.4 });
      if (k === 2) { noise(B, r, { a: 0.22, t60: 0.08, type: 'bp', f0: 2600, q: 0.7, width: 0.4 }); modes(B, r, { f: P.f * 2.2, ratios: [1, 1.63], amps: [0.15, 0.1], t60: 0.05 }); }
      if (k === 3) partial(B, between(r, 330, 420), 0.25, 0.08, {});
      noise(B, r, { a: P.slap, t60: k === 0 ? 0.012 : 0.02, type: 'bp', f0: k === 0 ? 2900 : k === 3 ? 3400 : 2000, q: 1.2 });
      return { rev: ROOM[P.room], hp: 40 };
    } },
  { k: 'tsuzumi', cat: 'drum', jp: '鼓', n: 10,
    p(v, N, r) { const u = (v + 0.5) / N; const P = { u, f: lg(640, 290, u), t60: lg(0.22, 0.55, u) * between(r, 0.9, 1.1), bend: between(r, 0.04, 0.12), room: v % 2 ? 'hall' : 'room' };
      P.label = `${PITCH(u)}・${ROOMJ[P.room]}`; P.word = u < 0.3 ? 'タ' : u < 0.65 ? 'ポン' : 'ポーン'; P.dur = P.t60 * 1.6 + rt(P.room) + 0.1; return P; },
    g(B, P, r) {
      thump(B, { f0: P.f * (1 + P.bend), f1: P.f, tau: 0.06, t60: P.t60, a: 1, drive: 0.3 });
      partial(B, P.f * 2.01, 0.14, P.t60 * 0.5, { ph: r() * TAU });
      partial(B, P.f * 2.93, 0.06, P.t60 * 0.3, { ph: r() * TAU });
      noise(B, r, { a: 0.12, t60: 0.02, type: 'bp', f0: 1600, q: 0.8 });
      return { rev: ROOM[P.room], hp: 80 };
    } },

  /* ---------- 金属・鐘 ---------- */
  { k: 'anvil', cat: 'metal', jp: '金づち・鍛冶', n: 22,
    p(v, N, r) { const u = (v + 0.5) / N; const P = { u, f: lg(1750, 560, u) * between(r, 0.96, 1.04), t60: lbetween(r, 0.55, 1.6), ex: [between(r, 1.3, 1.9), between(r, 2.0, 3.4), between(r, 3.6, 4.8)], pair: v % 2 ? 0.0025 : 0, room: ['small', 'room', 'out'][v % 3], hammer: between(r, 0.2, 0.45) };
      P.label = `${PITCH(u)}・${P.t60 > 1.1 ? '長く響く' : '短め'}`; P.word = u < 0.33 ? (P.t60 > 1.1 ? 'キーン' : 'キン') : (P.t60 > 1.1 ? 'カーン' : 'カン'); P.dur = P.t60 * 1.6 + rt(P.room); return P; },
    g(B, P, r) {
      modes(B, r, { f: P.f, ratios: [1, 2.756, 5.404, 8.933], amps: [1, 0.55, 0.3, 0.16], t60: P.t60, tilt: 0.55, pair: P.pair, spread: 0.3 });
      modes(B, r, { f: P.f, ratios: P.ex, amps: [0.25, 0.18, 0.1], t60: P.t60 * 0.5, tilt: 0.4, spread: 0.4 });
      noise(B, r, { a: 0.35, t60: 0.008, type: 'hp', f0: 4000, q: 0.7, width: 0.3 });
      thump(B, { f0: 260, f1: 150, tau: 0.01, t60: 0.045, a: P.hammer });
      return { rev: ROOM[P.room], hp: 90 };
    } },
  { k: 'plate', cat: 'metal', jp: '鉄板・フライパン', n: 16,
    p(v, N, r) { const u = (v + 0.5) / N, pan = v % 3 === 0, ratios = [1]; let x = 1; for (let i = 0; i < 13; i++) { x += between(r, 0.25, 0.75); ratios.push(x); }
      const P = { u, pan, ratios, f: pan ? lg(620, 330, u) : lg(460, 130, u), t60: pan ? between(r, 0.35, 0.8) : between(r, 0.9, 2.1), room: pan ? 'room' : ['hall', 'room', 'big'][v % 3] };
      P.label = pan ? `フライパン・${PITCH(u)}` : `鉄板・${SIZE(u)}・${ROOMJ[P.room]}`; P.word = pan ? (u < 0.5 ? 'カン' : 'コン') : (u > 0.6 ? 'グワーン' : 'ガーン'); P.dur = Math.min(2.8, P.t60 * 1.6 + rt(P.room)); return P; },
    g(B, P, r) {
      modes(B, r, { f: P.f, ratios: P.ratios, amps: P.ratios.map((x, i) => 1 / (1 + 0.45 * i)), t60: P.t60, tilt: 0.45, pair: 0.002, spread: 0.5, jit: 0.01 });
      noise(B, r, { a: 0.3, t60: 0.03, type: 'bp', f0: 2200, q: 0.8, width: 0.3 });
      thump(B, { f0: P.f * 0.9, f1: P.f * 0.6, tau: 0.01, t60: 0.05, a: 0.3 });
      return { rev: ROOM[P.room], hp: 70 };
    } },
  { k: 'pipe', cat: 'metal', jp: '鉄パイプ・鉄骨', n: 14,
    p(v, N, r) { const u = (v + 0.5) / N; const P = { u, f: lg(980, 240, u), t60: lbetween(r, 0.9, 2.2), room: ['room', 'hall', 'out', 'big'][v % 4], pair: between(r, 0.0008, 0.003) };
      P.label = `${PITCH(u)}・${ROOMJ[P.room]}`; P.word = u < 0.33 ? 'キーン' : u < 0.7 ? 'カーン' : 'コーン'; P.dur = Math.min(2.8, P.t60 * 1.5 + rt(P.room)); return P; },
    g(B, P, r) {
      modes(B, r, { f: P.f, ratios: [1, 2.756, 5.404, 8.933, 13.34], amps: [1, 0.6, 0.35, 0.2, 0.1], t60: P.t60, tilt: 0.6, pair: P.pair, spread: 0.25 });
      noise(B, r, { a: 0.3, t60: 0.006, type: 'hp', f0: 3200, q: 0.7 });
      return { rev: ROOM[P.room], hp: 120 };
    } },
  { k: 'bell', cat: 'metal', jp: '鐘・ベル', n: 16,
    p(v, N, r) { const u = (v + 0.5) / N; const P = { u, f: lg(1500, 220, u), sz: lg(0.6, 1.25, u), room: u > 0.7 ? 'big' : ['hall', 'room'][v % 2] };
      P.label = `${SIZE(u)}・${ROOMJ[P.room]}`; P.word = u < 0.3 ? 'チリン' : u < 0.7 ? 'カラーン' : 'ゴーン'; P.dur = 2.8; return P; },
    g(B, P, r) {
      const R = [0.25, 0.5, 0.6, 0.75, 1, 1.25, 1.334, 1.5, 2, 2.5], A = [0.5, 0.6, 0.5, 0.22, 1, 0.3, 0.16, 0.25, 0.15, 0.08], T = [3, 2.2, 1.8, 1.2, 1.4, 0.9, 0.8, 0.7, 0.5, 0.35].map(x => Math.min(2.2, x * P.sz));
      modes(B, r, { f: P.f, ratios: R, amps: A, t60: T, pair: 0.0018, spread: 0.35, jit: 0.002 });
      noise(B, r, { a: 0.18, t60: 0.012, type: 'bp', f0: 3000, q: 1 });
      return { rev: ROOM[P.room], hp: 60 };
    } },
  { k: 'rin', cat: 'metal', jp: 'おりん・鈴', n: 10,
    p(v, N, r) { const u = (v + 0.5) / N, suzu = v % 3 === 2; const P = { u, suzu, f: suzu ? lg(3200, 1800, u) : lg(1450, 520, u), t60: suzu ? between(r, 0.25, 0.5) : between(r, 1.8, 2.4) };
      P.label = suzu ? `鈴・${PITCH(u)}` : `おりん・${PITCH(u)}`; P.word = suzu ? 'チリン' : u < 0.5 ? 'チーン' : 'リーン'; P.dur = Math.min(2.8, P.t60 * 1.3 + 0.5); return P; },
    g(B, P, r) {
      if (P.suzu) { for (let k = 0; k < 4; k++) modes(B, r, { t0: k * between(r, 0.02, 0.05), f: P.f * between(r, 0.97, 1.03), ratios: [1, 2.4, 3.9], amps: [0.6 / (1 + k * 0.5), 0.25, 0.1], t60: P.t60, tilt: 0.6, spread: 0.5 }); }
      else modes(B, r, { f: P.f, ratios: [1, 2.71, 5.15, 8.3], amps: [1, 0.45, 0.22, 0.1], t60: [P.t60, P.t60 * 0.6, P.t60 * 0.4, P.t60 * 0.25], pair: 0.003, spread: 0.3, att: 0.002 });
      noise(B, r, { a: 0.08, t60: 0.01, type: 'lp', f0: 3000, q: 0.7 });
      return { rev: ROOM.room, hp: 150 };
    } },
  { k: 'gong', cat: 'metal', jp: 'どら', n: 8,
    p(v, N, r) { const u = (v + 0.5) / N, ratios = []; for (let i = 0; i < 22; i++) ratios.push(lg(1, 9, r())); ratios.sort((a, b) => a - b); ratios[0] = 1;
      const P = { u, ratios, f: lg(190, 68, u), t60: between(r, 1.4, 2.3), dir: v % 2 ? -0.05 : 0.04 };
      P.label = `${SIZE(u)}・音が${P.dir > 0 ? '下がる' : '上がる'}`; P.word = u < 0.4 ? 'ジャーン' : u < 0.75 ? 'ゴワーン' : 'ボワーン'; P.dur = 2.9; return P; },
    g(B, P, r) {
      modes(B, r, { f: P.f, ratios: P.ratios, amps: P.ratios.map(x => Math.pow(x, -0.7)), t60: P.t60, tilt: 0.35, spread: 0.6, glide: P.dir, tau: 0.6, pair: 0.002, jit: 0.002 });
      noise(B, r, { a: 0.25, t60: 0.15, type: 'lp', f0: 1500, q: 0.7, width: 0.5 });
      noise(B, r, { a: 0.07, att: 0.12, t60: 0.8, type: 'bp', f0: 700, q: 0.6, width: 0.6 });
      return { rev: ROOM.hall, hp: 40 };
    } },
  { k: 'can', cat: 'metal', jp: '缶・ブリキ', n: 12,
    p(v, N, r) { const u = (v + 0.5) / N, ratios = [1]; for (let i = 0; i < 9; i++) ratios.push(1 + between(r, 0.2, 3.2)); ratios.sort((a, b) => a - b);
      const P = { u, ratios, f: lg(2400, 650, u), t60: lbetween(r, 0.07, 0.3), body: lg(950, 420, u), bounce: v % 3 === 2 ? between(r, 0.12, 0.2) : 0 };
      P.label = `${PITCH(u)}${P.bounce ? '・はねる' : ''}`; P.word = P.bounce ? 'カランコロン' : u < 0.5 ? 'カン' : 'コン'; P.dur = 0.8 + P.bounce * 2; return P; },
    g(B, P, r) {
      const hit = (t0, a) => {
        modes(B, r, { t0, f: P.f, ratios: P.ratios, amps: P.ratios.map((x, i) => a / (1 + 0.3 * i)), t60: P.t60, tilt: 0.3, spread: 0.4, jit: 0.01 });
        noise(B, r, { t0, a: 0.3 * a, t60: 0.05, type: 'bp', f0: P.body, q: 2 });
        noise(B, r, { t0, a: 0.25 * a, t60: 0.005, type: 'hp', f0: 4000 });
      };
      hit(0, 1); grains(B, r, { n: 7, spread: 0.06, a: 0.12, len: [0.004, 0.012], f: [2500, 7000], q: 3 });
      if (P.bounce) { hit(P.bounce, 0.45); hit(P.bounce * 1.7, 0.25); }
      return { rev: ROOM.room, hp: 150 };
    } },
  { k: 'cymbal', cat: 'metal', jp: 'シンバル', n: 8,
    p(v, N, r) { const kind = v % 3, u = (v + 0.5) / N; const P = { u, kind, t60: kind === 1 ? between(r, 0.35, 0.6) : between(r, 0.9, 1.7), ping: between(r, 1800, 3200), drv: kind === 2 ? between(r, 1.5, 3) : 0 };
      P.label = ['クラッシュ', 'スプラッシュ', 'チャイナ'][kind] + `・${PITCH(u)}`; P.word = kind === 1 ? 'シャン' : kind === 2 ? 'ジャーン' : 'シャーン'; P.dur = P.t60 * 1.5 + 0.6; return P; },
    g(B, P, r) {
      const ratios = []; for (let i = 0; i < 26; i++) ratios.push(lg(1, 4.5, r()));
      modes(B, r, { f: 2600 * (1 - P.u * 0.3), ratios, amps: ratios.map(() => 0.08), t60: P.t60 * 0.8, tilt: 0.3, spread: 0.7, jit: 0.02 });
      noise(B, r, { a: 0.5, t60: P.t60, type: 'hp', f0: 5500 - P.u * 1500, q: 0.6, width: 0.7 });
      noise(B, r, { a: 0.35, t60: 0.02, type: 'bp', f0: 3200, q: 0.8 });
      partial(B, P.ping, 0.12, P.t60 * 0.6, {});
      return { rev: ROOM.room, hp: 300, drive: P.drv };
    } },

  /* ---------- 木・竹 ---------- */
  { k: 'woodblock', cat: 'wood', jp: '拍子木・木魚', n: 18,
    p(v, N, r) { const kind = v % 3, j = Math.floor(v / 3), u = (j + 0.5) / 6;
      const T = [{ nm: '拍子木', f: [1950, 1050], t60: [0.12, 0.22], R: [1, 2.65, 4.9], room: 'hall', w: 'カーン' }, { nm: '木魚', f: [720, 340], t60: [0.06, 0.12], R: [1, 1.83, 3.2], room: 'room', w: 'ポク' }, { nm: 'ウッドブロック', f: [1350, 680], t60: [0.05, 0.1], R: [1, 2.9, 5.3], room: 'room', w: 'コッ' }][kind];
      const P = { kind, u, R: T.R, f: lg(T.f[0], T.f[1], u), t60: lerp(T.t60[0], T.t60[1], r()), room: T.room };
      P.label = `${T.nm}・${PITCH(u)}`; P.word = T.w; P.dur = P.t60 * 1.6 + rt(P.room) + 0.05; return P; },
    g(B, P, r) {
      modes(B, r, { f: P.f, ratios: P.R, amps: [1, 0.35, 0.15], t60: P.t60, tilt: 0.6, spread: 0.15 });
      if (P.kind === 1) noise(B, r, { a: 0.25, t60: 0.05, type: 'bp', f0: P.f * 0.9, q: 4 });
      if (P.kind === 0) modes(B, r, { t0: 0.0015, f: P.f * 1.07, ratios: P.R, amps: [0.6, 0.2, 0.1], t60: P.t60 * 0.8, tilt: 0.6, spread: 0.3 });   // もう1本の木
      noise(B, r, { a: 0.3, t60: 0.004, type: 'bp', f0: 3800, q: 0.9 });
      return { rev: ROOM[P.room], hp: 120 };
    } },
  { k: 'axe', cat: 'wood', jp: 'まき割り・木', n: 16,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 4;
      const P = { u, kind, f: lg(175, 95, u), body: lg(560, 250, u), crack: lbetween(r, 1400, 3200), ct60: between(r, 0.03, 0.07), n: Math.round(between(r, 6, 20)), sp: between(r, 0.02, 0.07), fall: kind === 1 || kind === 3 ? between(r, 0.16, 0.28) : 0, room: kind === 2 ? 'out' : 'room' };
      P.label = `${['割れる', '割れて落ちる', 'スコーンと', 'メキッと'][kind]}・${SIZE(u)}`; P.word = ['パカン', 'パカーン', 'スコーン', 'メキッ'][kind]; P.dur = 0.5 + P.fall + rt(P.room); return P; },
    g(B, P, r) {
      thump(B, { f0: P.f * 1.8, f1: P.f, tau: 0.01, t60: 0.07, a: 0.85, drive: 1.5 });
      noise(B, r, { a: 0.7, t60: P.ct60, type: 'bp', f0: P.crack, q: 0.9, width: 0.3 });
      grains(B, r, { n: P.kind === 3 ? P.n * 2 : P.n, spread: P.kind === 3 ? P.sp * 2 : P.sp, a: 0.35, len: [0.003, 0.012], f: [900, 4500], q: 2.5 });
      modes(B, r, { f: P.body, ratios: [1, 2.4, 3.9], amps: [0.4, 0.2, 0.1], t60: P.kind === 2 ? 0.28 : between(r, 0.05, 0.14), tilt: 0.5 });
      if (P.fall) { modes(B, r, { t0: P.fall, f: P.body * 1.6, ratios: [1, 2.6], amps: [0.3, 0.12], t60: 0.06 }); modes(B, r, { t0: P.fall + between(r, 0.06, 0.1), f: P.body * 1.9, ratios: [1, 2.6], amps: [0.18, 0.08], t60: 0.05 }); }
      return { rev: ROOM[P.room], hp: 60 };
    } },
  { k: 'bamboo', cat: 'wood', jp: '竹・ししおどし', n: 12,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 3; const P = { u, kind, f: lg(780, 270, u), t60: lbetween(r, 0.14, 0.42), room: kind === 0 ? 'out' : kind === 1 ? 'room' : 'hall' };
      P.label = `${['ししおどし', '竹筒', '竹の棒'][kind]}・${PITCH(u)}`; P.word = kind === 0 ? 'カコーン' : u < 0.5 ? 'コン' : 'ポコッ'; P.dur = P.t60 * 1.6 + rt(P.room) + 0.1; return P; },
    g(B, P, r) {
      const hit = (t0, a, f) => { modes(B, r, { t0, f, ratios: [1, 2.01, 3.04, 4.1, 5.2], amps: [a, a * 0.5, a * 0.3, a * 0.15, a * 0.1], t60: P.t60, tilt: 0.5, spread: 0.2 }); noise(B, r, { t0, a: 0.2 * a, t60: P.t60 * 0.5, type: 'bp', f0: f, q: 6 }); noise(B, r, { t0, a: 0.35 * a, t60: 0.004, type: 'bp', f0: 4200, q: 1 }); };
      if (P.kind === 0) { hit(0, 0.55, P.f * 1.35); hit(between(r, 0.025, 0.04), 1, P.f); } else hit(0, 1, P.f);
      return { rev: ROOM[P.room], hp: 120 };
    } },
  { k: 'box', cat: 'wood', jp: '木箱・扉', n: 12,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 3; const P = { u, kind, f: lg(210, 88, u), t60: lerp(0.08, 0.2, u), body: lg(430, 160, u), room: ['small', 'room', 'hall'][Math.floor(v / 3) % 3] };
      P.label = `${['扉をノック', '木箱', '床下'][kind]}・${SIZE(u)}`; P.word = kind === 0 ? 'コン' : u > 0.6 ? 'ドン' : 'ゴン'; P.dur = 0.5 + rt(P.room); return P; },
    g(B, P, r) {
      thump(B, { f0: P.f * 1.5, f1: P.f, tau: 0.01, t60: P.t60, a: P.kind === 0 ? 0.5 : 1, drive: 0.8 });
      modes(B, r, { f: P.body, ratios: [1, 1.52, 2.27, 3.1], amps: [0.4, 0.25, 0.15, 0.1], t60: 0.08, tilt: 0.4, spread: 0.2 });
      noise(B, r, { a: 0.2, t60: 0.04, type: 'lp', f0: 1300, q: 0.7 });
      noise(B, r, { a: P.kind === 0 ? 0.35 : 0.18, t60: 0.005, type: 'bp', f0: 2600, q: 1 });
      return { rev: ROOM[P.room], hp: 50 };
    } },
  { k: 'marimba', cat: 'wood', jp: '木琴・鉄琴', n: 12, melodic: true,
    p(v, N, r) { const kind = v % 3, j = Math.floor(v / 3), u = (j + 0.5) / 4;
      const T = [{ nm: 'マリンバ', m: [72, 57], R: [1, 3.93, 9.2], A: [1, 0.25, 0.08], t60: [0.6, 1.1], w: 'ポン' }, { nm: '木琴', m: [84, 69], R: [1, 3.0, 6.0], A: [1, 0.35, 0.12], t60: [0.25, 0.45], w: 'コン' }, { nm: '鉄琴', m: [93, 79], R: [1, 2.76, 5.4, 8.9], A: [1, 0.3, 0.12, 0.05], t60: [1.0, 1.5], w: 'キン' }][kind];
      const P = { kind, u, f: 440 * Math.pow(2, (Math.round(lerp(T.m[0], T.m[1], u)) - 69) / 12), R: T.R, A: T.A, t60: lerp(T.t60[0], T.t60[1], u) };
      P.label = `${T.nm}・${PITCH(u)}・回ごとに音が上がる`; P.word = T.w; P.dur = P.t60 * 1.6 + 0.6; return P; },
    g(B, P, r) {
      modes(B, r, { f: P.f, ratios: P.R, amps: P.A, t60: P.t60, tilt: 0.7, spread: 0.1, jit: 0.001 });
      noise(B, r, { a: P.kind === 0 ? 0.06 : 0.16, t60: 0.006, type: 'lp', f0: 3500, q: 0.7 });
      return { rev: ROOM.room, hp: 100 };
    } },

  /* ---------- からだ・スポーツ ---------- */
  { k: 'punch', cat: 'body', jp: 'パンチ・サンドバッグ', n: 20,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 4; const P = { u, kind, f: lg(108, 56, u), f0r: between(r, 1.8, 2.6), tau: between(r, 0.008, 0.016), t60: between(r, 0.1, 0.22), drive: between(r, 1.5, 3), leather: lbetween(r, 700, 1600), pre: kind === 2 ? between(r, 0.08, 0.12) : 0 };
      P.label = `${['サンドバッグ', 'サンドバッグ（くさり）', '映画風', 'グローブ'][kind]}・${SIZE(u)}`; P.word = ['ドスッ', 'バスッ', 'ズドッ', 'バシッ'][kind]; P.dur = 0.55 + (kind === 2 ? 1.2 : 0.3); return P; },
    g(B, P, r) {
      if (P.pre) whoosh(B, r, { pre: P.pre, a: 0.5, f0: 400, f1: 2400, q: 1.2 });
      thump(B, { f0: P.f * P.f0r, f1: P.f, tau: P.tau, t60: P.t60, a: 1, drive: P.drive });
      noise(B, r, { a: P.kind === 3 ? 0.6 : 0.45, t60: P.kind === 3 ? 0.03 : 0.045, type: 'bp', f0: P.kind === 3 ? P.leather * 1.6 : P.leather, q: 0.8, width: 0.2 });
      noise(B, r, { a: 0.35, t60: 0.07, type: 'lp', f0: 480, q: 0.7, color: 'pink' });
      if (P.kind === 1) grains(B, r, { t0: 0.03, n: 8, spread: 0.16, a: 0.08, len: [0.01, 0.03], f: [3000, 7000], q: 6, dist: 'uni' });
      return { rev: P.kind === 2 ? ROOM.hall : ROOM.small, hp: 35, drive: P.kind === 2 ? 1.2 : 0 };
    } },
  { k: 'slap', cat: 'body', jp: '平手・ミット', n: 16,
    p(v, N, r) { const kind = v % 4, u = (v + 0.5) / N; const T = [{ nm: '平手', f: [3200, 1800], w: 'パチン' }, { nm: 'ミット', f: [1600, 900], w: 'バシッ' }, { nm: 'ハリセン', f: [4500, 2500], w: 'スパーン' }, { nm: '手のひら', f: [2400, 1400], w: 'ペチッ' }][kind];
      const P = { kind, u, f: lg(T.f[0], T.f[1], u), t60: kind === 2 ? between(r, 0.05, 0.08) : between(r, 0.015, 0.035), room: ['small', 'room', 'hall'][v % 3] };
      P.label = `${T.nm}・${PITCH(u)}`; P.word = T.w; P.dur = 0.35 + rt(P.room); return P; },
    g(B, P, r) {
      noise(B, r, { a: 1, t60: P.t60, type: 'bp', f0: P.f, q: P.kind === 2 ? 0.7 : 1.2, att: 0.0003, width: 0.2 });
      thump(B, { f0: P.kind === 1 ? 200 : 320, f1: P.kind === 1 ? 130 : 210, tau: 0.008, t60: P.kind === 1 ? 0.05 : 0.03, a: P.kind === 1 ? 0.5 : 0.3 });
      if (P.kind === 2) grains(B, r, { n: 14, spread: 0.035, a: 0.4, len: [0.002, 0.006], f: [2500, 8000], q: 2 });
      return { rev: ROOM[P.room], hp: 120 };
    } },
  { k: 'clap', cat: 'body', jp: '拍手・手拍子', n: 14,
    p(v, N, r) { const group = v % 2 === 1, u = (v + 0.5) / N; const P = { u, group, f: lg(2300, 950, u), tail: between(r, 0.04, 0.09), people: group ? Math.round(between(r, 3, 7)) : 1, room: ['room', 'hall', 'small'][Math.floor(v / 2) % 3] };
      P.label = `${group ? `${P.people}人で` : 'ひとり'}・${ROOMJ[P.room]}`; P.word = group ? 'パチパチ' : u < 0.5 ? 'パチン' : 'パン'; P.dur = 0.45 + rt(P.room); return P; },
    g(B, P, r) {
      for (let p = 0; p < P.people; p++) {
        const f = P.f * (p ? between(r, 0.8, 1.25) : 1), a = p ? between(r, 0.4, 0.8) : 1, pan = p ? between(r, -0.7, 0.7) : 0;
        let t = p ? between(r, 0, 0.028) : 0;
        for (let k = 0; k < 3; k++) { noise(B, r, { t0: t, a: 0.7 * a, t60: 0.006, type: 'bp', f0: f, q: 1.3, att: 0.0002, pan }); t += between(r, 0.006, 0.011); }
        noise(B, r, { t0: t, a: 0.5 * a, t60: P.tail, type: 'bp', f0: f * 0.9, q: 1.1, att: 0.0003, pan });
      }
      return { rev: ROOM[P.room], hp: 200 };
    } },
  { k: 'stomp', cat: 'body', jp: '足踏み・床', n: 14,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 4; const P = { u, kind, f: lg(88, 42, u), t60: lg(0.15, 0.38, u), floor: lg(230, 110, u), scuff: between(r, 0.15, 0.35), room: ['room', 'hall', 'hall', 'out'][kind] };
      P.label = `${['木の床', '体育館', '舞台', '土の上'][kind]}・${SIZE(u)}`; P.word = u > 0.75 ? 'ズシン' : u > 0.5 ? 'ドスン' : kind === 1 ? 'ダン' : 'ドン'; P.dur = Math.max(0.5, P.t60 * 1.6) + rt(P.room); return P; },
    g(B, P, r) {
      thump(B, { f0: P.f * 1.7, f1: P.f, tau: 0.015, t60: P.t60, a: 1, drive: 1.5 });
      if (P.kind !== 3) modes(B, r, { f: P.floor, ratios: [1, 1.7, 2.6], amps: [0.3, 0.18, 0.1], t60: 0.1, tilt: 0.4 });
      noise(B, r, { a: P.kind === 3 ? 0.35 : P.scuff, t60: P.kind === 3 ? 0.06 : 0.03, type: P.kind === 3 ? 'lp' : 'bp', f0: P.kind === 3 ? 900 : 1500, q: 0.8, color: P.kind === 3 ? 'pink' : 'white' });
      if (P.u > 0.6) noise(B, r, { a: 0.3, t60: 0.3, type: 'lp', f0: 160, q: 0.7, color: 'brown' });
      return { rev: ROOM[P.room], hp: 28 };
    } },
  { k: 'ball', cat: 'body', jp: 'ボール', n: 14,
    p(v, N, r) { const kind = v % 4, j = Math.floor(v / 4), u = (j + 0.5) / 4; const T = [{ nm: 'サッカー', f: [230, 150], w: 'ボン' }, { nm: 'バスケット', f: [145, 95], w: 'ダン' }, { nm: 'バレー', f: [260, 180], w: 'バシッ' }, { nm: 'ゴムまり', f: [420, 250], w: 'ポン' }][kind];
      const P = { kind, u, f: lg(T.f[0], T.f[1], u), room: ['out', 'hall', 'hall', 'room'][kind] };
      P.label = `${T.nm}・${PITCH(u)}`; P.word = T.w; P.dur = 0.5 + rt(P.room); return P; },
    g(B, P, r) {
      const k = P.kind;
      thump(B, { f0: P.f * (k === 3 ? 1.35 : 1.6), f1: P.f, tau: 0.008, t60: k === 1 ? 0.2 : k === 3 ? 0.12 : 0.09, a: 1, drive: 0.8 });
      if (k === 1) modes(B, r, { f: P.f * 4.1, ratios: [1, 2.3], amps: [0.12, 0.06], t60: 0.08 });
      noise(B, r, { a: k === 2 ? 0.9 : 0.5, t60: k === 2 ? 0.025 : 0.02, type: 'bp', f0: k === 2 ? 2200 : 1500, q: 0.9 });
      noise(B, r, { a: 0.25, t60: 0.045, type: 'lp', f0: 700, q: 0.7, color: 'pink' });
      return { rev: ROOM[P.room], hp: 50 };
    } },
  { k: 'bat', cat: 'body', jp: 'バット・ラケット', n: 12,
    p(v, N, r) { const kind = v % 4, j = Math.floor(v / 4), u = (j + 0.5) / 3; const T = [{ nm: '金属バット', w: 'カキーン' }, { nm: '木のバット', w: 'カーン' }, { nm: 'テニス', w: 'ポコン' }, { nm: 'ゴルフ', w: 'カキン' }][kind];
      const P = { kind, u }; P.label = `${T.nm}・${PITCH(u)}`; P.word = T.w; P.dur = 1.2 + rt('out'); return P; },
    g(B, P, r) {
      const k = P.kind, u = P.u;
      if (k === 0) { modes(B, r, { f: lg(2100, 1250, u), ratios: [1, 2.756, 5.404], amps: [1, 0.4, 0.15], t60: between(r, 0.35, 0.65), tilt: 0.5, pair: 0.002 }); noise(B, r, { a: 0.5, t60: 0.02, type: 'hp', f0: 2500 }); thump(B, { f0: 300, f1: 200, tau: 0.008, t60: 0.03, a: 0.35 }); }
      if (k === 1) { modes(B, r, { f: lg(820, 480, u), ratios: [1, 2.6, 4.4], amps: [1, 0.35, 0.15], t60: between(r, 0.08, 0.14), tilt: 0.5 }); noise(B, r, { a: 0.6, t60: 0.03, type: 'bp', f0: 2000, q: 0.9 }); thump(B, { f0: 260, f1: 160, tau: 0.008, t60: 0.04, a: 0.4 }); }
      if (k === 2) { const f = lg(760, 520, u); thump(B, { f0: f * 1.15, f1: f, tau: 0.006, t60: 0.06, a: 1 }); partial(B, lg(2200, 1500, u), 0.2, 0.04, {}); noise(B, r, { a: 0.4, t60: 0.012, type: 'bp', f0: 2800, q: 1 }); }
      if (k === 3) { modes(B, r, { f: lg(4000, 2600, u), ratios: [1, 1.6, 2.3], amps: [0.6, 0.3, 0.15], t60: 0.08 }); noise(B, r, { a: 0.6, t60: 0.008, type: 'hp', f0: 3000 }); thump(B, { f0: 500, f1: 350, tau: 0.005, t60: 0.02, a: 0.3 }); }
      return { rev: ROOM.out, hp: 100 };
    } },

  /* ---------- 水・自然・台所 ---------- */
  { k: 'water', cat: 'nature', jp: '水・しぶき', n: 16,
    p(v, N, r) { const kind = v % 4, j = Math.floor(v / 4), u = (j + 0.5) / 4; const T = [{ nm: '大きなしぶき', w: 'ザブン' }, { nm: 'しぶき', w: 'バシャ' }, { nm: '水たまり', w: 'ピチャ' }, { nm: 'しずく', w: 'ポチャン' }][kind];
      const P = { kind, u, bath: j % 2 === 1 }; P.room = P.bath ? 'room' : kind === 3 ? 'small' : 'out';
      P.label = `${T.nm}・${P.bath ? 'お風呂' : '外'}`; P.word = T.w; P.dur = 1.0 + rt(P.room); return P; },
    g(B, P, r) {
      const k = P.kind, u = P.u;
      if (k === 0) { thump(B, { f0: 160, f1: lg(110, 70, u), tau: 0.02, t60: 0.14, a: 0.6 }); noise(B, r, { a: 0.75, t60: 0.38, att: 0.004, type: 'bp', path: [[0, 700], [0.06, 2800], [0.4, 1100]], q: 0.8, width: 0.6 }); grains(B, r, { n: 32, spread: 0.32, a: 0.25, len: [0.004, 0.015], f: [1500, 6500], q: 3 }); bubbles(B, r, { n: 10, spread: 0.3, f: [250, 900], rise: [0.5, 1.3], t60: [0.02, 0.06], a: 0.25 }); }
      if (k === 1) { noise(B, r, { a: 0.65, t60: 0.24, att: 0.003, type: 'bp', path: [[0, 900], [0.04, 3200], [0.25, 1500]], q: 0.9, width: 0.6 }); grains(B, r, { n: 18, spread: 0.2, a: 0.25, len: [0.004, 0.012], f: [2000, 7000], q: 3 }); bubbles(B, r, { n: 6, spread: 0.15, f: [400, 1300], rise: [0.6, 1.4], t60: [0.02, 0.05], a: 0.22 }); }
      if (k === 2) { noise(B, r, { a: 0.5, t60: 0.07, type: 'bp', f0: 1900, q: 1, width: 0.4 }); bubbles(B, r, { n: 3, spread: 0.05, f: [900, 1800], rise: [0.8, 1.6], t60: [0.015, 0.03], a: 0.3 }); grains(B, r, { n: 7, spread: 0.07, a: 0.2, len: [0.003, 0.008], f: [2500, 7000], q: 3 }); }
      if (k === 3) { const f = lg(1300, 650, u); bubbles(B, r, { n: 1, spread: 0.001, f: [f, f * 1.05], rise: [1.2, 1.8], t60: [0.06, 0.09], a: 0.8 }); noise(B, r, { a: 0.18, t60: 0.02, type: 'bp', f0: 2500, q: 1.2 }); }
      return { rev: ROOM[P.room], hp: 80 };
    } },
  { k: 'crunch', cat: 'nature', jp: 'ザクッ（雪・葉・せんべい）', n: 16,
    p(v, N, r) { const kind = v % 4, j = Math.floor(v / 4), u = (j + 0.5) / 4; const T = [{ nm: '雪', w: 'ザクッ' }, { nm: '雪（ギュッ）', w: 'ギュッ' }, { nm: '落ち葉', w: 'カサッ' }, { nm: 'せんべい', w: 'バリッ' }][kind];
      const P = { kind, u }; P.label = `${T.nm}・${['軽め', 'ふつう', '強め', 'たっぷり'][j]}`; P.word = T.w; P.dur = 0.7; return P; },
    g(B, P, r) {
      const k = P.kind, s = lerp(0.8, 1.3, P.u);
      if (k === 0) { grains(B, r, { n: 32 * s, spread: 0.1 * s, a: 0.5, len: [0.003, 0.012], f: [800, 3600], q: 2 }); noise(B, r, { a: 0.3, t60: 0.08, type: 'lp', f0: 1300, q: 0.7, color: 'pink' }); thump(B, { f0: 140, f1: 90, tau: 0.01, t60: 0.06, a: 0.25 }); }
      if (k === 1) { noise(B, r, { a: 0.5, att: 0.015, t60: 0.08 * s, type: 'bp', f0: 1250, f1: 1500, q: 4 }); grains(B, r, { n: 18 * s, spread: 0.09 * s, a: 0.35, len: [0.003, 0.01], f: [900, 3000], q: 2.5 }); }
      if (k === 2) grains(B, r, { n: 45 * s, spread: 0.17 * s, a: 0.4, len: [0.002, 0.009], f: [2000, 8500], q: 1.5, dist: 'uni', curve: 0.8 });
      if (k === 3) { grains(B, r, { n: 16 * s, spread: 0.045 * s, a: 0.8, len: [0.002, 0.006], f: [2500, 9000], q: 2 }); noise(B, r, { a: 0.5, t60: 0.015, type: 'hp', f0: 3000 }); thump(B, { f0: 300, f1: 200, tau: 0.005, t60: 0.025, a: 0.2 }); }
      return { rev: ROOM.small, hp: 150 };
    } },
  { k: 'stone', cat: 'nature', jp: '石・砂利', n: 10,
    p(v, N, r) { const kind = v % 4, j = Math.floor(v / 4), u = (j + 0.5) / 3; const T = [{ nm: '小石', w: 'カチッ' }, { nm: '岩', w: 'ゴツッ' }, { nm: '砂利', w: 'ジャリッ' }, { nm: '石畳', w: 'ゴトッ' }][kind];
      const P = { kind, u }; P.label = `${T.nm}・${SIZE(u)}`; P.word = T.w; P.dur = 0.6 + rt('out'); return P; },
    g(B, P, r) {
      const k = P.kind, u = P.u;
      if (k === 0) { modes(B, r, { f: lg(4500, 2500, u), ratios: [1, 2.4, 3.9], amps: [0.6, 0.3, 0.15], t60: between(r, 0.02, 0.04) }); noise(B, r, { a: 0.4, t60: 0.003, type: 'hp', f0: 4000 }); }
      if (k === 1) { modes(B, r, { f: lg(900, 480, u), ratios: [1, 2.2, 3.4, 4.9], amps: [0.5, 0.3, 0.2, 0.1], t60: 0.04 }); thump(B, { f0: 180, f1: 110, tau: 0.008, t60: 0.05, a: 0.6, drive: 1 }); noise(B, r, { a: 0.3, t60: 0.03, type: 'lp', f0: 1500 }); }
      if (k === 2) { grains(B, r, { n: 32, spread: 0.13, a: 0.45, len: [0.004, 0.015], f: [1500, 6000], q: 4 }); noise(B, r, { a: 0.3, t60: 0.06, type: 'lp', f0: 1200, color: 'pink' }); }
      if (k === 3) { thump(B, { f0: 150, f1: 90, tau: 0.01, t60: 0.07, a: 0.8, drive: 1 }); modes(B, r, { f: lg(380, 250, u), ratios: [1, 1.9, 3.1], amps: [0.4, 0.2, 0.1], t60: 0.06 }); noise(B, r, { a: 0.2, t60: 0.02, type: 'bp', f0: 1800, q: 1 }); }
      return { rev: ROOM.out, hp: 60 };
    } },
  { k: 'glass', cat: 'nature', jp: 'ガラス・氷', n: 14,
    p(v, N, r) { const kind = v % 5, j = Math.floor(v / 5), u = (j + 0.5) / 3; const T = [{ nm: 'グラス', w: 'チン' }, { nm: '乾杯', w: 'カチン' }, { nm: '割れる', w: 'パリン' }, { nm: '大きく割れる', w: 'ガシャン' }, { nm: '氷', w: 'カラン' }][kind];
      const P = { kind, u }; P.label = `${T.nm}・${PITCH(u)}`; P.word = T.w; P.dur = 1.4; return P; },
    g(B, P, r) {
      const k = P.kind, f = lg(3400, 1600, P.u), ping = (t0, f, a, t60) => modes(B, r, { t0, f, ratios: [1, 2.32, 4.25, 6.63], amps: [a, a * 0.45, a * 0.2, a * 0.08], t60, tilt: 0.5, pair: 0.0015, spread: 0.3 });
      if (k === 0) { ping(0, f, 1, between(r, 0.5, 0.9)); noise(B, r, { a: 0.2, t60: 0.003, type: 'hp', f0: 6000 }); }
      if (k === 1) { ping(0, f, 0.8, 0.7); ping(0.0015, f * between(r, 1.06, 1.18), 0.7, 0.6); noise(B, r, { a: 0.25, t60: 0.004, type: 'hp', f0: 5000 }); }
      if (k === 2 || k === 3) {
        noise(B, r, { a: 0.6, t60: 0.03, type: 'hp', f0: 3500, width: 0.4 });
        const n = k === 3 ? 34 : 20, sp = k === 3 ? 0.45 : 0.3;
        for (let i = 0; i < n; i++) { const x = Math.min(1, -Math.log(1 - r() * 0.97) / 3); modes(B, r, { t0: x * sp, f: lbetween(r, 2800, 9000), ratios: [1, 2.32], amps: [0.25 * Math.pow(1 - x * 0.8, 1.4), 0.08], t60: lbetween(r, 0.03, 0.15), spread: 0.8 }); }
        grains(B, r, { n: k === 3 ? 30 : 16, spread: sp, a: 0.25, len: [0.002, 0.008], f: [3000, 9000], q: 2 });
        if (k === 3) thump(B, { f0: 200, f1: 120, tau: 0.01, t60: 0.08, a: 0.5, drive: 1 });
      }
      if (k === 4) { ping(0, f * 1.2, 0.7, 0.25); ping(between(r, 0.05, 0.08), f * 1.35, 0.4, 0.2); ping(between(r, 0.1, 0.14), f * 1.1, 0.25, 0.15); }
      return { rev: ROOM.room, hp: 300 };
    } },
  { k: 'chop', cat: 'nature', jp: '包丁・まな板', n: 14,
    p(v, N, r) { const kind = v % 3, u = (v + 0.5) / N; const P = { kind, u, f: lg(270, 150, u), board: lg(620, 320, u), knife: lbetween(r, 3000, 5500) };
      P.label = `${['まな板', 'にんじん', 'キャベツ'][kind]}・${SIZE(u)}`; P.word = ['トン', 'ザクッ', 'サクッ'][kind]; P.dur = 0.4 + rt('small'); return P; },
    g(B, P, r) {
      thump(B, { f0: P.f * 1.4, f1: P.f, tau: 0.006, t60: 0.06, a: 0.65, drive: 1 });
      modes(B, r, { f: P.board, ratios: [1, 2.3, 3.6], amps: [0.3, 0.15, 0.08], t60: 0.05 });
      noise(B, r, { a: 0.35, t60: 0.006, type: 'bp', f0: P.knife, q: 1.2 });
      if (P.kind === 1) grains(B, r, { n: between(r, 8, 14), spread: 0.025, a: 0.4, len: [0.002, 0.008], f: [1500, 5000], q: 2 });
      if (P.kind === 2) grains(B, r, { n: 22, spread: 0.05, a: 0.3, len: [0.002, 0.007], f: [2500, 8000], q: 1.8 });
      return { rev: ROOM.small, hp: 80 };
    } },
  { k: 'mochi', cat: 'nature', jp: '餅つき・こねる', n: 10,
    p(v, N, r) { const kind = v % 2, u = (v + 0.5) / N; const P = { kind, u, f: lg(125, 70, u), sq: between(r, 0.12, 0.22) };
      P.label = `${kind ? 'こねる' : '餅つき'}・${SIZE(u)}`; P.word = kind ? 'ムニッ' : u > 0.5 ? 'ペッタン' : 'ペタッ'; P.dur = 0.6 + rt('out'); return P; },
    g(B, P, r) {
      thump(B, { f0: P.f * 1.5, f1: P.f, tau: 0.02, t60: P.kind ? 0.1 : 0.16, a: P.kind ? 0.6 : 1, drive: 0.6 });
      noise(B, r, { a: 0.45, t60: P.sq, type: 'lp', f0: 1600, f1: 260, sweep: 0.05, q: 1.6, color: 'pink' });
      thump(B, { f0: 320, f1: 110, tau: 0.04, t60: 0.1, a: 0.22 });
      if (!P.kind) noise(B, r, { t0: between(r, 0.05, 0.09), a: 0.3, t60: 0.03, type: 'bp', f0: 1300, q: 1 });
      return { rev: ROOM.out, hp: 45 };
    } },

  /* ---------- 映画風・遊び ---------- */
  { k: 'boom', cat: 'fx', jp: 'ドーン（重低音）', n: 12,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 3; const P = { u, kind, f: lg(58, 33, u), f0r: between(r, 2.2, 3.2), tau: between(r, 0.04, 0.1), t60: between(r, 0.8, 1.7), drive: between(r, 1.6, 3), pre: kind === 2 ? 0.14 : 0 };
      P.label = `${['ドーン', '地鳴り', 'ためてドーン'][kind]}・${PITCH(u)}`; P.word = kind === 1 ? 'ズーン' : u > 0.5 ? 'ズドーン' : 'ドーン'; P.dur = Math.min(3, P.t60 * 1.4 + rt('big')); return P; },
    g(B, P, r) {
      if (P.pre) whoosh(B, r, { pre: P.pre, a: 0.45, f0: 300, f1: 3000, q: 1 });
      thump(B, { f0: P.f * P.f0r, f1: P.f, tau: P.tau, t60: P.t60, a: 1, drive: P.drive });
      noise(B, r, { a: 0.35, att: 0.01, t60: P.kind === 1 ? 1.2 : 0.7, type: 'lp', f0: 420, f1: 150, sweep: 0.3, q: 0.7, color: 'brown', width: 0.5 });
      noise(B, r, { a: 0.35, t60: 0.03, type: 'hp', f0: 1500, width: 0.4 });
      return { rev: ROOM.big, hp: 22 };
    } },
  { k: 'impact', cat: 'fx', jp: '衝撃・ガシャーン', n: 12,
    p(v, N, r) { const u = (v + 0.5) / N, kind = v % 4, ratios = [1]; let x = 1; for (let i = 0; i < 9; i++) { x += between(r, 0.3, 0.9); ratios.push(x); }
      const P = { u, kind, ratios, f: lg(420, 150, u), sub: lg(60, 38, u), t60: between(r, 0.6, 1.1) }, W = ['ガシャーン', 'ドガッ', 'ズガーン', 'バコーン'];
      P.label = `${W[kind]}・${SIZE(u)}`; P.word = W[kind]; P.dur = 1.4 + rt('hall'); return P; },
    g(B, P, r) {
      thump(B, { f0: P.sub * 3, f1: P.sub, tau: 0.03, t60: P.kind === 1 ? 0.35 : 0.7, a: 1, drive: 2.5 });
      modes(B, r, { f: P.f, ratios: P.ratios, amps: P.ratios.map((x, i) => 0.5 / (1 + 0.4 * i)), t60: P.kind === 1 ? 0.3 : P.t60, tilt: 0.45, spread: 0.6, pair: 0.003, jit: 0.01 });
      noise(B, r, { a: 0.55, t60: 0.04, type: 'hp', f0: 2500, width: 0.5 });
      if (P.kind !== 1) grains(B, r, { n: 26, spread: 0.35, a: 0.22, len: [0.003, 0.012], f: [1500, 6000], q: 2.5 });
      return { rev: ROOM.hall, hp: 30, drive: 0.8 };
    } },
  { k: 'boing', cat: 'fx', jp: 'ボヨン（ばね）', n: 8,
    p(v, N, r) { const u = (v + 0.5) / N; const P = { u, f: lg(420, 140, u), depth: between(r, 0.12, 0.35), rate: between(r, 9, 18), t60: between(r, 0.35, 0.6), up: v % 2 ? between(r, 0.3, 0.7) : 0 };
      P.label = `${PITCH(u)}・${P.up ? 'のびる' : 'ゆれる'}`; P.word = P.up ? 'ビヨーン' : u > 0.5 ? 'ボヨン' : 'ボイン'; P.dur = P.t60 * 1.6 + rt('small'); return P; },
    g(B, P, r) { spring(B, { f: P.f, depth: P.depth, rate: P.rate, t60: P.t60, up: P.up, a: 0.9 }); noise(B, r, { a: 0.15, t60: 0.01, type: 'bp', f0: 1500, q: 1 }); return { rev: ROOM.small, hp: 60 }; } },
  { k: 'pop', cat: 'fx', jp: 'ポン（風船・コルク）', n: 10,
    p(v, N, r) { const kind = v % 4, j = Math.floor(v / 4), u = (j + 0.5) / 3; const T = [{ nm: '風船', w: 'パン' }, { nm: 'コルク', w: 'ポン' }, { nm: 'あわ', w: 'ポコッ' }, { nm: 'クラッカー', w: 'パーン' }][kind];
      const P = { kind, u }; P.label = `${T.nm}・${PITCH(u)}`; P.word = T.w; P.dur = 0.8 + rt('room'); return P; },
    g(B, P, r) {
      const k = P.kind, u = P.u;
      if (k === 0) { noise(B, r, { a: 1, t60: between(r, 0.025, 0.05), type: 'lp', f0: lg(7000, 3500, u), q: 0.7, att: 0.0002, width: 0.3 }); thump(B, { f0: 180, f1: 110, tau: 0.008, t60: 0.05, a: 0.4 }); }
      if (k === 1) { partial(B, lg(950, 600, u), 0.9, 0.06, { glide: -0.65, tau: 0.008, att: 0.001 }); noise(B, r, { a: 0.3, t60: 0.02, type: 'bp', f0: 1300, q: 1 }); }
      if (k === 2) partial(B, lg(1700, 900, u), 0.8, 0.05, { glide: -0.7, tau: 0.012, att: 0.001 });
      if (k === 3) { noise(B, r, { a: 1, t60: 0.04, type: 'lp', f0: 6000, att: 0.0002 }); thump(B, { f0: 200, f1: 120, tau: 0.008, t60: 0.06, a: 0.4 }); grains(B, r, { t0: 0.02, n: 24, spread: 0.3, a: 0.15, len: [0.003, 0.01], f: [3000, 9000], q: 2, dist: 'uni' }); }
      return { rev: k === 2 ? ROOM.small : ROOM.room, hp: 120 };
    } },
  { k: 'chip', cat: 'fx', jp: 'ピコ（ゲーム）', n: 12,
    p(v, N, r) { const kind = v % 6, j = Math.floor(v / 6), u = (j + 0.5) / 2, W = ['ピコッ', 'ドコッ', 'ピュン', 'チャリン', 'バシッ', 'ボコッ'];
      const P = { kind, u, f: lg(880, 440, u) }; P.label = `${W[kind]}・${PITCH(u)}`; P.word = W[kind]; P.dur = 0.5; return P; },
    g(B, P, r) {
      const k = P.kind, f = P.f;
      if (k === 0) chip(B, { seq: [[f, 0.03], [f * 1.26, 0.03], [f * 1.5, 0.06]], duty: 0.25, a: 0.35, t60: 0.2 });
      if (k === 1) { lfsr(B, { rate: 9000, t60: 0.09, a: 0.5 }); chip(B, { seq: [[f * 0.4, 0.08, f * 0.12]], duty: 0.5, a: 0.35, t60: 0.12 }); }
      if (k === 2) chip(B, { seq: [[f * 2.2, 0.14, f * 0.3]], duty: 0.5, a: 0.3, t60: 0.2 });
      if (k === 3) chip(B, { seq: [[f * 1.12, 0.06], [f * 1.5, 0.22]], duty: 0.5, a: 0.3, t60: 0.35 });
      if (k === 4) { lfsr(B, { rate: 20000, t60: 0.05, a: 0.6 }); chip(B, { seq: [[f, 0.03, f * 0.5]], duty: 0.125, a: 0.25, t60: 0.05 }); }
      if (k === 5) chip(B, { seq: [[f * 0.35, 0.1, f * 0.15]], wave: 'tri', a: 0.7, t60: 0.15 });
      return { rev: null, hp: 40 };
    } },
  { k: 'sparkle', cat: 'fx', jp: 'キラッ（魔法）', n: 8,
    p(v, N, r) { const u = (v + 0.5) / N; const P = { u, base: Math.round(lerp(86, 74, u)), n: Math.round(between(r, 5, 8)), gap: between(r, 0.018, 0.04), down: v % 4 === 3 };
      P.label = `${PITCH(u)}・${P.down ? '下がる' : '上がる'}`; P.word = ['キラーン', 'シャラン', 'キラッ', 'ピカーン'][v % 4]; P.dur = Math.min(3, P.n * P.gap + 0.9 + rt('hall')); return P; },
    g(B, P, r) {
      const PEN = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
      for (let i = 0; i < P.n; i++) { const m = P.base + PEN[P.down ? P.n - 1 - i : i], f = 440 * Math.pow(2, (m - 69) / 12); modes(B, r, { t0: i * P.gap, f, ratios: [1, 2.76], amps: [0.35, 0.08], t60: between(r, 0.3, 0.6), spread: 0.7 }); }
      noise(B, r, { a: 0.12, att: 0.02, t60: 0.5, type: 'hp', f0: 7000, width: 0.8 });
      return { rev: ROOM.hall, hp: 300 };
    } },
];

/* =========================================================================
   一覧（500）
   ========================================================================= */
export const HIT_CATS = [
  { k: 'drum', name: '太鼓・ドラム' }, { k: 'metal', name: '金属・鐘' }, { k: 'wood', name: '木・竹' },
  { k: 'body', name: 'からだ・スポーツ' }, { k: 'nature', name: '水・自然・台所' }, { k: 'fx', name: '映画風・遊び' },
];
export const HIT_FAMS = FAMS.map(F => ({ k: F.k, cat: F.cat, jp: F.jp, n: F.n }));
const FAM_BY_K = new Map(FAMS.map(F => [F.k, F]));
export const HITS = [], HIT_BY_ID = new Map(), FAM_HITS = new Map();
for (const F of FAMS) {
  const arr = [];
  for (let v = 0; v < F.n; v++) {
    const nn = String(v + 1).padStart(2, '0'), id = `${F.k}-${nn}`, P = F.p(v, F.n, rng(hash(id)));
    const h = { id, fam: F.k, cat: F.cat, v, name: `${F.jp} ${nn}`, label: P.label, word: P.word, melodic: !!F.melodic };
    arr.push(h); HITS.push(h); HIT_BY_ID.set(id, h);
  }
  FAM_HITS.set(F.k, arr);
}
export const famName = k => (FAM_BY_K.get(k) || {}).jp || k;

/* ---------- 音を作る（sr = サンプリング周波数）。{ L, R, sr, pre, loud } ---------- */
export function renderHit(id, sr = 44100) {
  const h = HIT_BY_ID.get(id); if (!h) return null;
  const F = FAM_BY_K.get(h.fam), P = F.p(h.v, F.n, rng(hash(id))), r = rng(hash(id + '#'));
  const B = new Buf(sr, Math.min(3.2, P.dur || 1.2), P.pre || 0);
  const post = F.g(B, P, r) || {};
  return { ...finish(B, post), sr, pre: P.pre || 0 };
}

/* ---------- 鳴らす ---------- */
const cache = new Map(); let cacheCtx = null, cacheBytes = 0;
const MAX_BYTES = 28e6;   // 覚えておく音の量（だいたい 30 秒分）
function putCache(ctx, id, L, R, pre) {
  if (cacheCtx !== ctx) { cache.clear(); cacheCtx = ctx; cacheBytes = 0; }
  const b = ctx.createBuffer(2, L.length, ctx.sampleRate); b.copyToChannel(L, 0); b.copyToChannel(R, 1);
  const e = { b, pre, bytes: L.length * 8 }; if (cache.has(id)) cacheBytes -= cache.get(id).bytes; cache.set(id, e); cacheBytes += e.bytes;
  while (cacheBytes > MAX_BYTES && cache.size > 1) { const k = cache.keys().next().value; cacheBytes -= cache.get(k).bytes; cache.delete(k); }
  return e;
}
export function hitBuffer(ctx, id) {
  if (cacheCtx !== ctx) { cache.clear(); cacheCtx = ctx; cacheBytes = 0; }
  const e = cache.get(id); if (e) { cache.delete(id); cache.set(id, e); return e; }
  const r = renderHit(id, ctx.sampleRate); if (!r) return null;
  return putCache(ctx, id, r.L, r.R, r.pre);
}
export const hitCached = (ctx, id) => cacheCtx === ctx && cache.has(id);
// 先に作るのは別のスレッド（Worker）で。音楽の予約を止めないように。使えない環境では少しずつ本体で
let worker = null, wfail = false, wn = 0; const wq = new Map(), pending = new Set();
function getWorker() {
  if (worker || wfail || typeof Worker === 'undefined') return worker;
  try {
    worker = typeof window !== 'undefined' && window.__HITW
      ? new Worker(URL.createObjectURL(new Blob([window.__HITW], { type: 'text/javascript' })))
      : new Worker(new URL('./hitworker.js', import.meta.url), { type: 'module' });
    worker.onmessage = e => { const d = e.data, cb = wq.get(d.q); wq.delete(d.q); if (cb) cb(d); };
    worker.onerror = ev => { if (ev && ev.preventDefault) ev.preventDefault(); wfail = true; worker = null; const cbs = [...wq.values()]; wq.clear(); cbs.forEach(cb => cb(null)); };
  } catch (e) { wfail = true; worker = null; }
  return worker;
}
// m = Music（ensure / audioTime / sfxG）、when = 当たる時刻、o.n = 何回目（木琴は回ごとに音が上がる）
export function playHit(m, id, when, o = {}) {
  const ctx = m.ensure && m.ensure(), h = HIT_BY_ID.get(id); if (!ctx || !h) return null;
  const e = hitBuffer(ctx, id); if (!e) return null;
  const t = Math.max(when === undefined ? ctx.currentTime : (m.audioTime ? m.audioTime(when) : when), ctx.currentTime);
  const s = ctx.createBufferSource(); s.buffer = e.b;
  const rate = h.melodic ? Math.pow(2, PENTA[(o.n | 0) % PENTA.length] / 12) : 1; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = HIT_GAIN * (o.gain ?? 1); s.connect(g); g.connect(m.sfxG || ctx.destination);
  const start = t - e.pre / rate, now = ctx.currentTime;
  if (start >= now) s.start(start); else s.start(now, Math.min(e.b.duration - 0.01, (now - start) * rate));
  return s;
}
// 次に使う音を先に作っておく（再生中に止まらないように）
export function prepareHits(m, ids) {
  const ctx = m && m.ensure && m.ensure(); if (!ctx) return;
  const todo = [...new Set(ids)].filter(id => HIT_BY_ID.has(id) && !hitCached(ctx, id) && !pending.has(id));
  if (!todo.length) return;
  const w = getWorker(), slow = [];
  for (const id of todo) {
    if (!w) { slow.push(id); continue; }
    pending.add(id); const q = ++wn;
    wq.set(q, d => {
      pending.delete(id);
      if (d && d.L) { if (!hitCached(ctx, id)) putCache(ctx, id, d.L, d.R, d.pre); }
      else if (!hitCached(ctx, id)) prepareHits(m, [id]);   // Worker が使えなかった → 本体で
    });
    w.postMessage({ q, id, sr: ctx.sampleRate });
  }
  const step = () => { const id = slow.shift(); if (!id) return; try { hitBuffer(ctx, id); } catch (e) { /* 作れない音はとばす */ } if (slow.length) setTimeout(step, 30); };
  if (slow.length) setTimeout(step, 30);
}

/* =========================================================================
   どの音を鳴らすか
   ========================================================================= */
// これまでの場面の音の名前 → 系統（場面に合わせる設定のとき、その系統の中から種目ごとに選ぶ）
export const LEGACY = {
  taiko: 'taiko', drum: 'tom', snare: 'snare', bongo: 'hand', cymbal: 'cymbal', gong: 'gong', bell: 'bell',
  hammer: 'anvil', clang: 'pipe', chop: 'chop', knock: 'box', wood: 'woodblock', punch: 'punch', smack: 'slap', clap: 'clap',
  stomp: 'stomp', thud: 'stomp', kick: 'ball', splash: 'water', crunch: 'crunch', crack: 'axe', break: 'axe', glass: 'glass',
  mochi: 'mochi', squish: 'mochi', pop: 'pop', boing: 'boing', firework: 'boom',
};
// 自分の画像の「おまかせ」：場面の名前から系統を選ぶ。わからなければ動きから
const KEYS = [
  [/拍子木|木魚/, 'woodblock'], [/太鼓|たいこ/, 'taiko'], [/ドラム/, 'tom'], [/鼓/, 'tsuzumi'],
  [/鍛冶|かじ|ハンマー|金づち|かなづち|くぎ|釘|鉄/, 'anvil'], [/まき|薪|斧|おの|木を割/, 'axe'], [/パンチ|サンドバッグ|ボクシング/, 'punch'],
  [/ミット|平手|ビンタ|剣道|竹刀|木刀/, 'slap'], [/拍手|手拍子/, 'clap'], [/水|海|プール|しぶき|雨|川/, 'water'], [/雪|落ち葉|葉っぱ|せんべい/, 'crunch'],
  [/ガラス|グラス|氷/, 'glass'], [/包丁|まな板|野菜|にんじん|キャベツ/, 'chop'], [/餅|もち|こね|パン生地/, 'mochi'], [/ボール|サッカー|バスケ|バレー/, 'ball'],
  [/バット|野球|テニス|ゴルフ|ラケット/, 'bat'], [/鐘|かね|ベル/, 'bell'], [/竹|ししおどし/, 'bamboo'], [/石|岩|砂利/, 'stone'], [/ドア|扉|箱|ノック/, 'box'],
  [/足|床|四股|しこ|行進|踏/, 'stomp'], [/鍋|フライパン/, 'plate'], [/缶/, 'can'], [/シンバル/, 'cymbal'], [/どら|銅鑼/, 'gong'],
];
const ACT_FAM = { hit: 'taiko', punch: 'punch', clap: 'clap', push: 'box', pull: 'woodblock', lift: 'boom', stir: 'water', wipe: 'slap', throw: 'ball', kick: 'ball', stomp: 'stomp', knee: 'punch', jump: 'stomp', squat: 'stomp', step: 'stomp' };
export function familyFor(name, act) { for (const [re, f] of KEYS) if (re.test(name || '')) return f; return ACT_FAM[act] || 'taiko'; }
export function famPick(fam, key) { const L = FAM_HITS.get(fam); return L ? L[hash(String(key) + ':' + fam) % L.length].id : null; }
// 設定：mode = 'scene'（場面に合わせる）/ 'fav'（お気に入りから）/ 'fixed'（1つに固定）
export const hitCfg = { mode: 'scene', fixed: '', fav: [] };
// name = 場面の音（これまでの名前 / 500種のid / 'fam:系統'）、key = 種目と場面（同じ種目の同じ場面は同じ音に）
export function resolveHit(name, key) {
  const c = hitCfg, favs = c.mode === 'fav' ? c.fav.filter(id => HIT_BY_ID.has(id)) : [];
  if (c.mode === 'fixed' && HIT_BY_ID.has(c.fixed)) return c.fixed;
  if (name && HIT_BY_ID.has(name)) return name;                          // 自分で選んだ音
  if (favs.length) return favs[hash(String(key)) % favs.length];
  if (name && name.startsWith('fam:')) return famPick(name.slice(4), key);
  if (name && LEGACY[name]) return famPick(LEGACY[name], key);
  return name;                                                           // これまでの合成音（歓声・鳴き声など）
}
export const hitWord = id => (HIT_BY_ID.get(id) || {}).word || '';
