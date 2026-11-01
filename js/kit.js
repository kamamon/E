/* =========================================================================
   IMMERSE FIT — kit.js
   場面（シーン）を描くための道具箱。
   座標は「ステージ単位」：中央の 1000×1000 の正方形が基準（左上が 0,0）。
   縦長・横長の画面では正方形の外側も見えるので、背景は g.V（見えている範囲）まで塗ります。
   図形は「塗り f」と「ふちの太さ o」を受け取ります（o を省略すると標準のふち、0 でふちなし）。
   ========================================================================= */

export const C = {
  ol: '#2b2140', ink: '#2b2140', white: '#ffffff', cream: '#fff6e5', paper: '#fdfaf3', black: '#1c1a26',
  skin: '#ffd4b8', skin2: '#f0b48e', sleeve: '#4f6bff', sleeve2: '#ff6b8b',
  red: '#ff5a5f', tomato: '#ee3a33', orange: '#ff9f1c', carrot: '#ff8a1f', yellow: '#ffd23f', lemon: '#ffe873',
  lime: '#a8e05f', green: '#3cc46b', leaf: '#2ea44f', dgreen: '#1f7a4c', teal: '#2ec4b6', mint: '#9cf2d8',
  sky: '#8fd8ff', blue: '#3a86ff', navy: '#26386b', purple: '#8e5cff', violet: '#c4a6ff', pink: '#ff9fbd', magenta: '#ff4fa3',
  brown: '#a0673c', wood: '#d39457', wood2: '#ebb77c', dwood: '#7a4a2a', bark: '#8a5a36',
  gray: '#a3abbd', lgray: '#dde2ec', dgray: '#5c6478', metal: '#cfd6e2', steel: '#8f9bb0', gold: '#ffc83d',
  water: '#4cc9f0', snow: '#f4f8ff', ice: '#c9f1ff', grass: '#72c957', soil: '#8b5a3c', sand: '#f2d49b', night: '#1b1840', rice: '#fbfaf4',
};

export const E = {
  lin: t => t,
  inQ: t => t * t, outQ: t => 1 - (1 - t) * (1 - t), ioQ: t => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
  inC: t => t * t * t, outC: t => 1 - Math.pow(1 - t, 3), ioC: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outBack: (t, k = 1.7) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2),
  outElastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
  outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
  sm: t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t),
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
export const map = (x, a, b, c, d, cl = true) => { let t = (x - a) / (b - a); if (cl) t = clamp(t); return c + (d - c) * t; };
export const TAU = Math.PI * 2;
// ふるえ（当たったあとに揺れて止まる）: age 秒、amp 大きさ、f 速さ、d 止まる速さ
export const jig = (age, amp = 1, f = 22, d = 7) => (age >= 0 && age < 4) ? amp * Math.exp(-d * age) * Math.sin(f * age) : 0;
// つぶれ（当たった瞬間に横に広がって戻る）: [横, 縦]
export const squash = (age, k = 0.22) => { if (!(age >= 0) || age > 1.5) return [1, 1]; const v = k * Math.exp(-9 * age) * Math.cos(18 * age); return [1 + v, 1 - v]; };
export function rng(seed = 1) { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- 色 ---------- */
const hexCache = new Map();
function toRGB(c) {
  let v = hexCache.get(c); if (v) return v;
  let h = c.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
  v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; hexCache.set(c, v); return v;
}
const toHex = (r, g, b) => '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
// k>0 で明るく、k<0 で暗く（-1〜1）
export function sh(c, k) { const [r, g, b] = toRGB(c); return k >= 0 ? toHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k) : toHex(r * (1 + k), g * (1 + k), b * (1 + k)); }
export function mix(a, b, t) { const A = toRGB(a), B = toRGB(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
export function rgba(c, a) { const [r, g, b] = toRGB(c); return `rgba(${r},${g},${b},${a})`; }

const P2 = new Map();
// 同じ形は使い回す（毎フレーム形が変わる場面でふくらみすぎないよう、上限で入れかえる）
function path2d(d) { let p = P2.get(d); if (!p) { if (P2.size > 1500) P2.clear(); p = new Path2D(d); P2.set(d, p); } return p; }
export const FONT_POP = '"Dela Gothic One", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
export const FONT_BODY = '"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

/* =========================================================================
   エフェクト（当たった瞬間の粒・輪・文字・ゆれ）— 場面が切りかわるまで残ります
   ========================================================================= */
class FX {
  constructor(g) { this.g = g; this.clear(); }
  clear() { this.ps = []; this.rings = []; this.pops = []; this.lns = []; this.shk = { t: 0, d: 0, m: 0 }; this.fl = { t: 0, d: 0, a: 0, c: '#fff' }; }
  // 粒: shape = dot / chip / spark / star / drop / conf / leaf / snow / heart / note / coin / smoke / square
  burst(x, y, o = {}) {
    const n = o.n ?? 14, cs = [].concat(o.c ?? '#ffffff'), r = Math.random;
    const sp = o.sp ?? [250, 650], sz = o.size ?? [8, 18], life = o.life ?? [0.45, 0.9];
    const dir = o.dir ?? -Math.PI / 2, spread = o.spread ?? Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = dir + (r() - 0.5) * spread, v = sp[0] + r() * (sp[1] - sp[0]);
      this.ps.push({
        x: x + (r() - 0.5) * (o.jx ?? 0), y: y + (r() - 0.5) * (o.jy ?? 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        s: sz[0] + r() * (sz[1] - sz[0]), c: cs[i % cs.length], sh: o.shape ?? 'dot', t: 0, life: life[0] + r() * (life[1] - life[0]),
        g: o.g ?? 1300, drag: o.drag ?? 0.985, rot: r() * TAU, vr: (r() - 0.5) * (o.spin ?? 14), ol: o.ol ?? (o.shape === 'smoke' || o.shape === 'spark' ? 0 : 1), grow: o.grow ?? 0,
      });
    }
  }
  ring(x, y, o = {}) { this.rings.push({ x, y, c: o.c ?? '#ffffff', r0: o.r0 ?? 30, r1: o.r1 ?? 240, w: o.w ?? 18, t: 0, life: o.life ?? 0.38, sy: o.sy ?? 1 }); }
  pop(text, x, y, o = {}) { this.pops.push({ text, x, y, c: o.c ?? '#ffffff', o: o.o ?? C.ol, size: o.size ?? 120, rot: o.rot ?? (Math.random() - 0.5) * 0.35, t: 0, life: o.life ?? 0.62, rise: o.rise ?? 70 }); }
  lines(x, y, o = {}) { const n = o.n ?? 12; for (let i = 0; i < n; i++) { const a = (o.a0 ?? 0) + i / n * (o.arc ?? TAU) + (Math.random() - 0.5) * 0.2; this.lns.push({ x, y, a, r0: o.r0 ?? 130, r1: o.r1 ?? 260, c: o.c ?? '#ffffff', w: o.w ?? 12, t: 0, life: o.life ?? 0.22 }); } }
  shake(m = 18, d = 0.2) { this.shk = { t: 0, d, m: Math.max(m, this.shk.t < this.shk.d ? this.shk.m : 0) }; }
  flash(c = '#ffffff', a = 0.45, d = 0.14) { this.fl = { t: 0, d, a, c }; }
  // よく使う組み合わせ
  stars(x, y, n = 8, c = [C.gold, C.yellow, '#fff']) { this.burst(x, y, { n, c, shape: 'star', sp: [300, 700], size: [16, 30], g: 900, life: [0.5, 0.9] }); }
  sparks(x, y, n = 12, c = ['#fff6b0', C.gold, '#ffffff']) { this.burst(x, y, { n, c, shape: 'spark', sp: [500, 1100], size: [14, 26], g: 1600, life: [0.18, 0.4] }); }
  chips(x, y, c = C.wood2, n = 10) { this.burst(x, y, { n, c: [c, sh(c, -0.15)], shape: 'chip', sp: [250, 650], size: [10, 20], g: 1800, life: [0.5, 0.9], spread: Math.PI * 1.3 }); }
  splash(x, y, c = C.water, n = 16) { this.burst(x, y, { n, c: [c, sh(c, 0.35)], shape: 'drop', sp: [300, 900], size: [10, 22], g: 2200, life: [0.4, 0.8], spread: Math.PI * 1.1 }); }
  smoke(x, y, n = 7, c = '#ffffff') { this.burst(x, y, { n, c, shape: 'smoke', sp: [60, 240], size: [40, 80], g: -60, life: [0.5, 0.9], grow: 1.6, drag: 0.94 }); }
  confetti(n = 70) { const V = this.g.V; this.burst(500, V.y0 - 40, { n, c: [C.red, C.yellow, C.blue, C.green, C.pink, C.purple, C.orange], shape: 'conf', sp: [100, 500], size: [14, 26], g: 600, life: [1.2, 2], dir: Math.PI / 2, spread: 1.6, jx: V.x1 - V.x0, drag: 0.97 }); }
  notes(x, y, n = 5, c = [C.purple, C.blue, C.magenta]) { this.burst(x, y, { n, c, shape: 'note', sp: [150, 380], size: [34, 52], g: -180, life: [0.6, 1], spread: 1.6, spin: 3 }); }
  hearts(x, y, n = 6, c = [C.pink, C.magenta, C.red]) { this.burst(x, y, { n, c, shape: 'heart', sp: [150, 420], size: [26, 44], g: -200, life: [0.6, 1], spread: 1.8, spin: 3 }); }
  coins(x, y, n = 8) { this.burst(x, y, { n, c: [C.gold, '#ffe27a'], shape: 'coin', sp: [400, 900], size: [22, 34], g: 2000, life: [0.6, 1], spread: 1.4, spin: 10 }); }

  update(dt) {
    for (const p of this.ps) { p.t += dt; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    this.ps = this.ps.filter(p => p.t < p.life);
    for (const a of [this.rings, this.pops, this.lns]) for (const r of a) r.t += dt;
    this.rings = this.rings.filter(r => r.t < r.life); this.pops = this.pops.filter(r => r.t < r.life); this.lns = this.lns.filter(r => r.t < r.life);
    this.shk.t += dt; this.fl.t += dt;
  }
  shakeOffset() { const s = this.shk; if (s.t >= s.d) return [0, 0]; const k = Math.pow(1 - s.t / s.d, 2) * s.m; return [(Math.random() - 0.5) * 2 * k, (Math.random() - 0.5) * 2 * k]; }
  draw() {
    const g = this.g, c = g.ctx;
    for (const l of this.lns) { const k = l.t / l.life, r0 = lerp(l.r0, l.r1 * 0.9, E.outQ(k)), r1 = lerp(l.r0 + 30, l.r1, E.outQ(k)); c.globalAlpha = 1 - k; g.line([l.x + Math.cos(l.a) * r0, l.y + Math.sin(l.a) * r0, l.x + Math.cos(l.a) * r1, l.y + Math.sin(l.a) * r1], l.c, l.w * (1 - k * 0.6)); }
    c.globalAlpha = 1;
    for (const r of this.rings) { const k = r.t / r.life; c.globalAlpha = (1 - k) * 0.9; c.save(); c.translate(r.x, r.y); c.scale(1, r.sy); c.beginPath(); c.arc(0, 0, lerp(r.r0, r.r1, E.outC(k)), 0, TAU); c.restore(); c.lineWidth = r.w * (1 - k * 0.7); c.strokeStyle = r.c; c.stroke(); }
    c.globalAlpha = 1;
    for (const p of this.ps) {
      const k = p.t / p.life, a = p.sh === 'smoke' ? (1 - k) * 0.55 : k > 0.7 ? (1 - k) / 0.3 : 1;
      const s = p.s * (1 + p.grow * k);
      c.globalAlpha = a; c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      const o = p.ol ? 4 : 0;
      switch (p.sh) {
        case 'chip': g.rr(-s * 0.6, -s * 0.4, s * 1.2, s * 0.8, s * 0.2, p.c, o); break;
        case 'square': g.rect(-s / 2, -s / 2, s, s, p.c, o); break;
        case 'spark': c.rotate(-p.rot + Math.atan2(p.vy, p.vx)); g.line([-s * 1.6, 0, s * 0.6, 0], p.c, s * 0.35); break;
        case 'star': g.star(0, 0, s, s * 0.45, 5, p.c, o); break;
        case 'drop': c.rotate(-p.rot + Math.atan2(p.vy, p.vx) + Math.PI / 2); c.scale(s / 100, s / 100); g.path('M0 -100 C55 -20 60 60 0 60 C-60 60 -55 -20 0 -100Z', p.c, 0); break;
        case 'conf': c.scale(Math.cos(p.t * 9 + p.rot * 3), 1); g.rect(-s / 2, -s * 0.3, s, s * 0.6, p.c, 0); break;
        case 'leaf': c.scale(s / 100, s / 100); g.path('M0 -100 Q80 0 0 100 Q-80 0 0 -100Z', p.c, o ? o * 100 / s : 0); break;
        case 'snow': g.circ(0, 0, s * 0.5, '#ffffff', 0); break;
        case 'heart': g.heart(0, 0, s, p.c, o); break;
        case 'note': c.rotate(-p.rot * 0.8); g.text('♪', 0, 0, { size: s * 1.6, f: p.c, o: 6 }); break;
        case 'coin': c.scale(Math.cos(p.t * 12), 1); g.circ(0, 0, s * 0.55, p.c, o); g.circ(0, 0, s * 0.32, sh(p.c, -0.12), 0); break;
        case 'smoke': g.circ(0, 0, s * 0.5, p.c, 0); break;
        default: g.circ(0, 0, s * 0.5, p.c, o);
      }
      c.restore();
    }
    c.globalAlpha = 1;
    for (const p of this.pops) {
      const k = p.t / p.life, sc = k < 0.22 ? E.outBack(k / 0.22, 2.4) : 1, a = k > 0.72 ? (1 - k) / 0.28 : 1;
      c.globalAlpha = a; c.save(); c.translate(p.x, p.y - p.rise * E.outQ(k)); c.rotate(p.rot); c.scale(sc, sc);
      g.text(p.text, 0, 0, { size: p.size, f: p.c, o: Math.max(10, p.size * 0.14), font: FONT_POP });
      c.restore();
    }
    c.globalAlpha = 1;
  }
  drawFlash() { const f = this.fl; if (f.t >= f.d) return; const g = this.g, V = g.V; g.ctx.globalAlpha = f.a * (1 - f.t / f.d); g.rect(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0, f.c, 0); g.ctx.globalAlpha = 1; }
}

/* =========================================================================
   描画キット本体
   ========================================================================= */
export class Kit {
  constructor(ctx) {
    this.ctx = ctx; this.ol = C.ol; this.lw = 7; this.V = { x0: 0, y0: 0, x1: 1000, y1: 1000 };
    this.fx = new FX(this); this.C = C; this.E = E;
    this.lerp = lerp; this.clamp = clamp; this.map = map; this.jig = jig; this.squash = squash; this.sh = sh; this.mix = mix; this.rgba = rgba; this.rng = rng;
    this.sfx = () => { };   // 再生エンジンが差しかえます
  }
  /* ---------- 状態 ---------- */
  save() { this.ctx.save(); } restore() { this.ctx.restore(); }
  tr(x, y) { this.ctx.translate(x, y); } rot(a) { this.ctx.rotate(a); } sc(x, y = x) { this.ctx.scale(x, y); }
  // 平行移動・回転・拡大して fn を描く
  at(x, y, a, sx, sy, fn) {
    if (typeof a === 'function') { fn = a; a = 0; } else if (typeof sx === 'function') { fn = sx; sx = 1; } else if (typeof sy === 'function') { fn = sy; sy = sx; }
    const c = this.ctx; c.save(); c.translate(x, y); if (a) c.rotate(a); if (sx !== 1 || sy !== 1) c.scale(sx ?? 1, sy ?? sx ?? 1); fn(); c.restore();
  }
  // 左手のときは左右反転（x=500 を軸に）
  mirror(side, fn) { if (side !== 'L') return fn(); const c = this.ctx; c.save(); c.translate(1000, 0); c.scale(-1, 1); fn(); c.restore(); }
  // 左手のときの x（g.mirror の中と同じ位置を、エフェクト用に求める）
  mx(side, x) { return side === 'L' ? 1000 - x : x; }
  alpha(a, fn) { const c = this.ctx, o = c.globalAlpha; c.globalAlpha = o * a; fn(); c.globalAlpha = o; }
  clipRR(x, y, w, h, r, fn) { const c = this.ctx; c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip(); fn(); c.restore(); }
  clipCirc(x, y, r, fn) { const c = this.ctx; c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); fn(); c.restore(); }
  clipPath(d, fn) { const c = this.ctx; c.save(); c.clip(path2d(d)); fn(); c.restore(); }

  /* ---------- 塗りとふち ---------- */
  _fs(f, o, p) {
    const c = this.ctx;
    if (f) { c.fillStyle = f; p ? c.fill(p) : c.fill(); }
    if (o !== 0 && o !== false) { c.lineWidth = o ?? this.lw; c.strokeStyle = this.ol; c.lineJoin = 'round'; c.lineCap = 'round'; p ? c.stroke(p) : c.stroke(); }
  }
  rect(x, y, w, h, f, o) { const c = this.ctx; c.beginPath(); c.rect(x, y, w, h); this._fs(f, o); }
  rr(x, y, w, h, r, f, o) { const c = this.ctx; c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); this._fs(f, o); }
  circ(x, y, r, f, o) { const c = this.ctx; c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); this._fs(f, o); }
  ell(x, y, rx, ry, f, o, rot = 0) { const c = this.ctx; c.beginPath(); c.ellipse(x, y, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), rot, 0, TAU); this._fs(f, o); }
  // pts: [x0,y0,x1,y1,...]
  poly(pts, f, o) { const c = this.ctx; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); this._fs(f, o); }
  tri(x1, y1, x2, y2, x3, y3, f, o) { this.poly([x1, y1, x2, y2, x3, y3], f, o); }
  // なめらかな閉じた形（点を通る）
  blob(pts, f, o, k = 1) { const c = this.ctx; c.beginPath(); smooth(c, pts, true, k); this._fs(f, o); }
  // SVG のパス（M L C Q A Z など）
  path(d, f, o) { this._fs(f, o, path2d(d)); }
  star(x, y, r1, r2, n = 5, f, o, rot = -Math.PI / 2) { const p = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; p.push(x + Math.cos(a) * r, y + Math.sin(a) * r); } this.poly(p, f, o); }
  heart(x, y, s, f, o) { this.at(x, y, 0, s / 100, s / 100, () => this.path('M0 35 C-60 -5 -55 -60 -22 -60 C-8 -60 0 -48 0 -38 C0 -48 8 -60 22 -60 C55 -60 60 -5 0 35Z', f, o)); }
  // カプセル（太い線分の両端が丸い）
  cap(x1, y1, x2, y2, r, f, o) { const c = this.ctx, a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.arc(x1, y1, r, a + Math.PI / 2, a - Math.PI / 2); c.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2); c.closePath(); this._fs(f, o); }
  // 先が細くなるカプセル（r1 → r2）
  taper(x1, y1, x2, y2, r1, r2, f, o) {
    const c = this.ctx, a = Math.atan2(y2 - y1, x2 - x1), d = Math.hypot(x2 - x1, y2 - y1), b = Math.asin(clamp((r1 - r2) / Math.max(d, 1e-3), -1, 1));
    c.beginPath(); c.arc(x1, y1, r1, a + Math.PI / 2 + b, a - Math.PI / 2 - b); c.arc(x2, y2, r2, a - Math.PI / 2 - b, a + Math.PI / 2 + b); c.closePath(); this._fs(f, o);
  }

  /* ---------- 線 ---------- */
  line(pts, col = this.ol, w = this.lw, cap = 'round') { const c = this.ctx; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.lineWidth = w; c.strokeStyle = col; c.lineCap = cap; c.lineJoin = 'round'; c.stroke(); }
  curve(pts, col = this.ol, w = this.lw) { const c = this.ctx; c.beginPath(); smooth(c, pts, false, 1); c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
  arc(x, y, r, a0, a1, col = this.ol, w = this.lw) { const c = this.ctx; c.beginPath(); c.arc(x, y, Math.max(0, r), a0, a1); c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); }
  ring(x, y, r, col = this.ol, w = this.lw) { this.arc(x, y, r, 0, TAU, col, w); }

  /* ---------- 文字 ---------- */
  // o: { size, f, o（ふちの太さ）, oc（ふちの色）, font, align, base, w（太さ） }
  text(str, x, y, o = {}) {
    const c = this.ctx, size = o.size ?? 60;
    c.font = `${o.w ?? (o.font ? 400 : 700)} ${size}px ${o.font ?? FONT_POP}`; c.textAlign = o.align ?? 'center'; c.textBaseline = o.base ?? 'middle';
    if (o.o) { c.lineWidth = o.o; c.strokeStyle = o.oc ?? this.ol; c.lineJoin = 'round'; c.strokeText(str, x, y); }
    c.fillStyle = o.f ?? '#fff'; c.fillText(str, x, y);
  }

  /* ---------- グラデーション ---------- */
  lin(x0, y0, x1, y1, stops) { const gr = this.ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s)); return gr; }
  rad(x, y, r0, r1, stops) { const gr = this.ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((s, i) => gr.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s)); return gr; }

  /* ---------- 立体感 ---------- */
  shadow(x, y, rx, ry, a = 0.22) { this.ell(x, y, rx, ry, `rgba(30,20,50,${a})`, 0); }
  hl(x, y, rx, ry, rot = -0.5, a = 0.45) { this.ell(x, y, rx, ry, `rgba(255,255,255,${a})`, 0, rot); }
  glow(x, y, r, col = '#ffffff', a = 0.6) { this.circ(x, y, r, this.rad(x, y, 0, r, [[0, rgba(col, a)], [1, rgba(col, 0)]]), 0); }

  /* ---------- 背景 ---------- */
  // 画面全体（景色をずらす場面のために、上下左右に 500 ずつはみ出して塗る）
  bg(c1, c2) { const V = this.V; this.rect(V.x0 - 500, V.y0 - 500, V.x1 - V.x0 + 1000, V.y1 - V.y0 + 1000, c2 ? this.lin(0, V.y0, 0, V.y1, [[0, c1], [1, c2]]) : c1, 0); }
  // 横いっぱいの帯（y0〜y1、'top' / 'bottom' で画面の端まで）
  band(y0, y1, f, o = 0) { const V = this.V; const a = y0 === 'top' ? V.y0 - 500 : y0, b = y1 === 'bottom' ? V.y1 + 500 : y1; this.rect(V.x0 - 500, a, V.x1 - V.x0 + 1000, b - a, f, 0); if (o) this.line([V.x0 - 500, a, V.x1 + 500, a], this.ol, o); }
  sky(c1 = '#7cc8ff', c2 = '#d8f1ff', y1 = 1000) { const V = this.V; this.rect(V.x0 - 2, V.y0 - 2, V.x1 - V.x0 + 4, y1 - V.y0 + 2, this.lin(0, Math.min(V.y0, 0), 0, y1, [c1, c2]), 0); }
  cloud(x, y, s = 1, f = '#ffffff', o = 0) { this.at(x, y, 0, s, s, () => { this.blob([-120, 30, -110, -20, -60, -50, -10, -80, 50, -60, 90, -30, 130, 0, 120, 35], f, o, 0.8); }); }
  sun(x, y, r = 90, f = C.yellow) { this.glow(x, y, r * 2.2, '#fff3b0', 0.55); this.circ(x, y, r, f, 0); }
  hills(y, f, amp = 60, seed = 1, n = 5) { const V = this.V, r = rng(seed), pts = []; const w = V.x1 - V.x0 + 200; for (let i = 0; i <= n; i++) pts.push(V.x0 - 100 + w * i / n, y - r() * amp); const c = this.ctx; c.beginPath(); c.moveTo(V.x0 - 100, V.y1 + 10); c.lineTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) { const mx = (pts[i - 2] + pts[i]) / 2, my = (pts[i - 1] + pts[i + 1]) / 2; c.quadraticCurveTo(pts[i - 2], pts[i - 1], mx, my); } c.lineTo(V.x1 + 100, pts[pts.length - 1]); c.lineTo(V.x1 + 100, V.y1 + 10); c.closePath(); this._fs(f, 0); }
  // 模様
  tiles(x, y, w, h, s, c1, c2) { this.rect(x, y, w, h, c1, 0); this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(x, y, w, h); this.ctx.clip(); for (let i = 0; i * s < w; i++) for (let j = 0; j * s < h; j++) if ((i + j) % 2) this.rect(x + i * s, y + j * s, s, s, c2, 0); this.ctx.restore(); }
  grid(x, y, w, h, s, col, lw = 4) { this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(x, y, w, h); this.ctx.clip(); for (let i = 0; i * s <= w; i++) this.line([x + i * s, y, x + i * s, y + h], col, lw); for (let j = 0; j * s <= h; j++) this.line([x, y + j * s, x + w, y + j * s], col, lw); this.ctx.restore(); }
  stripes(x, y, w, h, s, c1, c2, vertical = true) { this.rect(x, y, w, h, c1, 0); if (vertical) for (let i = 0; i * s < w; i += 2) this.rect(x + i * s, y, s, h, c2, 0); else for (let j = 0; j * s < h; j += 2) this.rect(x, y + j * s, w, s, c2, 0); }
  dots(x, y, w, h, s, r, col) { for (let i = 0; i * s < w; i++) for (let j = 0; j * s < h; j++) this.circ(x + i * s + (j % 2 ? s / 2 : 0), y + j * s, r, col, 0); }
  planks(x, y, w, h, n, f = C.wood) { const ph = h / n; for (let i = 0; i < n; i++) { this.rect(x, y + i * ph, w, ph, i % 2 ? sh(f, -0.06) : f, 0); this.line([x, y + i * ph, x + w, y + i * ph], sh(f, -0.3), 4); } }
  // 木の板（木目つき）
  wood(x, y, w, h, f = C.wood, r = 14, o) { this.rr(x, y, w, h, r, f, o); this.clipRR(x, y, w, h, r, () => { for (let i = 1; i < 5; i++) this.curve([x + 10, y + h * i / 5, x + w * 0.35, y + h * i / 5 + 6, x + w * 0.7, y + h * i / 5 - 5, x + w - 10, y + h * i / 5 + 3], sh(f, -0.16), 3); }); }
  grassTufts(y, f = C.grass, seed = 3, n = 9) { const V = this.V, r = rng(seed); for (let i = 0; i < n; i++) { const x = V.x0 + (V.x1 - V.x0) * (i + r() * 0.6) / n; this.path(`M${x - 22} ${y} Q${x - 18} ${y - 30} ${x - 6} ${y - 44} Q${x - 4} ${y - 18} ${x} ${y - 8} Q${x + 6} ${y - 36} ${x + 20} ${y - 50} Q${x + 18} ${y - 18} ${x + 24} ${y}Z`, f, 0); } }

  /* =======================================================================
     手と足（一人称：画面の手前から伸びてくる）
     ang は「ひじ → 手」の向き（ラジアン、0=右、-PI/2=上）。腕は画面の外まで伸びます。
     ===================================================================== */
  _toEdge(x, y, a) { const V = this.V, dx = Math.cos(a), dy = Math.sin(a); let t = 3000; if (dx > 1e-3) t = Math.min(t, (V.x1 + 80 - x) / dx); if (dx < -1e-3) t = Math.min(t, (V.x0 - 80 - x) / dx); if (dy > 1e-3) t = Math.min(t, (V.y1 + 80 - y) / dy); if (dy < -1e-3) t = Math.min(t, (V.y0 - 80 - y) / dy); return Math.max(260, t); }
  // o: { side:'R'|'L', hand:'fist'|'palm'|'grip'|'point'|'open'|'glove'|'pinch', s:大きさ, sleeve:色, skin:色, glove:色, cuff:色 }
  arm(x, y, ang, o = {}) {
    const s = o.s ?? 1, skin = o.skin ?? C.skin, back = ang + Math.PI, L = this._toEdge(x, y, back) + 40;
    const ex = x + Math.cos(back) * L, ey = y + Math.sin(back) * L;
    const wx = x + Math.cos(back) * 58 * s, wy = y + Math.sin(back) * 58 * s;
    this.taper(ex, ey, wx, wy, 64 * s, 44 * s, skin);                      // 前腕
    const k = Math.min(0.62, 300 * s / L), sx = lerp(wx, ex, k), sy = lerp(wy, ey, k);
    if (o.sleeve !== null) { this.taper(ex, ey, sx, sy, 84 * s, 74 * s, o.sleeve ?? C.sleeve); this.ell(sx, sy, 74 * s, 26 * s, sh(o.sleeve ?? C.sleeve, 0.18), 6, ang + Math.PI / 2); }
    this.hand(x, y, ang, o);
  }
  hand(x, y, ang, o = {}) {
    const s = o.s ?? 1, side = o.side ?? 'R', skin = o.skin ?? C.skin, k = side === 'L' ? -1 : 1, kind = o.hand ?? 'fist';
    this.at(x, y, ang + Math.PI / 2, s * k, s, () => {
      // ローカル座標：指先が上（-y）、手首が下（+y）、親指は左（-x、右手のとき）
      switch (kind) {
        case 'glove': {
          const gc = o.glove ?? C.red;
          this.rr(-62, 28, 124, 70, 24, o.cuff ?? '#ffffff');
          this.blob([-74, 40, -82, -20, -60, -74, 0, -92, 60, -78, 82, -24, 74, 40], gc);
          this.blob([-74, 8, -104, -14, -96, -48, -66, -46], gc);
          this.hl(-22, -52, 30, 16, -0.4, 0.5);
          break;
        }
        case 'palm': case 'open': {
          this.rr(-50, -40, 100, 96, 34, skin);
          const fl = kind === 'palm' ? [66, 76, 72, 58] : [74, 84, 80, 64];
          [-34, -12, 11, 33].forEach((fx, i) => this.cap(fx, -36, fx + (i - 1.5) * (kind === 'open' ? 6 : 2), -36 - fl[i], 12, skin));
          this.cap(-46, 18, -84, -16, 15, skin);
          this.rr(-50, -40, 100, 96, 34, skin, 0);
          [-34, -12, 11, 33].forEach((fx, i) => this.line([fx, -30, fx + (i - 1.5) * 2, -40], sh(skin, -0.2), 4));
          break;
        }
        case 'point': {
          this.rr(-50, -40, 100, 92, 36, skin);
          this.cap(-24, -36, -24, -128, 15, skin);
          [0, 24].forEach(fx => this.ell(fx, -40, 16, 12, skin, 6));
          this.cap(-46, 2, -20, -26, 16, skin);
          break;
        }
        case 'pinch': {
          this.rr(-48, -30, 96, 84, 34, skin);
          this.cap(-30, -26, -12, -96, 14, skin); this.cap(-46, 0, -18, -88, 15, skin);
          break;
        }
        default: {   // fist / grip
          this.rr(-56, -44, 112, 98, 38, skin);
          [-36, -12, 12, 36].forEach(fx => this.ell(fx, -42, 17, 15, skin, 6));
          this.line([-52, -16, 52, -16], sh(skin, -0.22), 4);
          if (kind === 'grip') this.line([-24, -30, 36, -30], sh(skin, -0.25), 4);
          this.blob([-56, 18, -70, -8, -50, -30, -22, -24, -18, 0, -36, 20], skin);
        }
      }
    });
  }
  // 脚（膝から下＋くつ）。ang は「ひざ → 足先」の向き
  leg(x, y, ang, o = {}) {
    const s = o.s ?? 1, back = ang + Math.PI, L = this._toEdge(x, y, back) + 40;
    const ex = x + Math.cos(back) * L, ey = y + Math.sin(back) * L, ax = x + Math.cos(back) * 70 * s, ay = y + Math.sin(back) * 70 * s;
    this.taper(ex, ey, ax, ay, 92 * s, 60 * s, o.skin ?? C.skin);
    const k = Math.min(0.75, 170 * s / L), px = lerp(ax, ex, k), py = lerp(ay, ey, k);
    if (o.pants !== null) this.taper(ex, ey, px, py, 112 * s, 100 * s, o.pants ?? C.navy);
    this.taper(lerp(ax, px, 0.45), lerp(ay, py, 0.45), ax, ay, 64 * s, 58 * s, o.sock ?? '#ffffff');
    this.shoe(x, y, ang, s, o.side ?? 'R', o.shoe ?? C.red);
  }
  // くつ（つま先が ang の向き、かかとが反対側）
  shoe(x, y, ang, s = 1, side = 'R', col = C.red) {
    const k = side === 'L' ? -1 : 1;
    this.at(x, y, ang + Math.PI / 2, s * k, s, () => {
      this.blob([-58, 70, -66, 0, -54, -70, -10, -112, 38, -96, 62, -40, 60, 40, 30, 92, -26, 96], '#ffffff');      // ソール
      this.blob([-48, 58, -56, 0, -44, -64, -8, -100, 32, -86, 52, -36, 50, 36, 24, 80, -22, 84], col);
      this.rr(-26, -40, 52, 92, 20, sh(col, 0.75), 5);                                                        // ベロ
      for (let i = 0; i < 4; i++) this.line([-26, -24 + i * 22, 26, -16 + i * 22], '#ffffff', 7);
      this.hl(-24, -78, 18, 10, -0.6, 0.5);
    });
  }
  // 足の裏（踏む場面用・上から見たくつ底）
  sole(x, y, ang, s = 1, side = 'R', col = C.red) {
    const k = side === 'L' ? -1 : 1;
    this.at(x, y, ang + Math.PI / 2, s * k, s, () => {
      this.blob([-60, 80, -70, 0, -56, -80, -6, -120, 44, -100, 66, -40, 62, 46, 32, 104, -28, 108], sh(col, -0.25));
      this.blob([-48, 64, -56, 0, -44, -66, -4, -102, 34, -86, 52, -36, 48, 40, 24, 88, -22, 92], col, 0);
      for (let i = -3; i <= 3; i++) this.line([-40, i * 26, 40, i * 26 - 6], sh(col, -0.35), 6);
    });
  }
  // ひざ（もも＋ひざ頭）。x,y はひざ頭、ang は「もも → ひざ」の向き
  knee(x, y, ang, o = {}) {
    const s = o.s ?? 1, back = ang + Math.PI, L = this._toEdge(x, y, back) + 40, ex = x + Math.cos(back) * L, ey = y + Math.sin(back) * L;
    this.taper(ex, ey, x, y, 130 * s, 96 * s, o.pants ?? C.navy);
    this.ell(x, y, 92 * s, 80 * s, sh(o.pants ?? C.navy, 0.12), this.lw, ang);
    this.hl(x - 30 * s, y - 26 * s, 34 * s, 18 * s, -0.5, 0.25);
  }

  /* =======================================================================
     道具（持つ所 = x,y。ang=0 のとき道具の先は上 -y を向く）
     ===================================================================== */
  _tool(x, y, ang, s, fn) { this.at(x, y, ang, s, s, fn); }
  // 包丁：刃は左（-x）側が下向き…ang=-PI/2 で刃先が左・刃が下
  knife(x, y, ang = 0, s = 1) { this._tool(x, y, ang, s, () => {
    this.rr(-22, -40, 44, 150, 18, C.dwood); this.circ(0, 0, 6, C.metal, 0); this.circ(0, 60, 6, C.metal, 0);
    this.rr(-26, -64, 52, 30, 8, C.steel);
    this.path('M-30 -60 L-30 -300 Q-30 -352 0 -372 L30 -360 L30 -60 Z', '#e9eef6');
    this.path('M-30 -60 L-30 -300 Q-30 -352 0 -372 L-10 -350 L-14 -60 Z', '#ffffff', 0);
    this.line([22, -80, 22, -330], '#b8c3d4', 5);
  }); }
  // 金づち：頭の打つ面は -x 側
  hammer(x, y, ang = 0, s = 1) { this._tool(x, y, ang, s, () => {
    this.rr(-18, -310, 36, 380, 16, C.wood);
    this.line([0, -290, 0, 50], sh(C.wood, -0.15), 4);
    this.rr(-24, 10, 48, 70, 14, C.red);
    this.rr(-108, -362, 150, 76, 16, C.steel);
    this.path('M40 -356 Q96 -350 118 -300 Q86 -322 40 -300 Z', C.steel);
    this.rr(-130, -370, 36, 92, 10, sh(C.steel, 0.25));
    this.hl(-50, -346, 40, 10, 0, 0.5);
  }); }
  // 木づち
  mallet(x, y, ang = 0, s = 1, col = C.wood2) { this._tool(x, y, ang, s, () => {
    this.rr(-17, -300, 34, 370, 16, C.wood);
    this.rr(-120, -380, 240, 110, 40, col);
    this.ell(-120, -325, 22, 55, sh(col, -0.12));
    this.hl(-30, -360, 60, 12, 0, 0.45);
  }); }
  // ばち・スティック
  stick(x, y, ang = 0, s = 1, col = C.wood2) { this._tool(x, y, ang, s, () => { this.taper(0, 70, 0, -330, 20, 13, col); this.circ(0, -336, 17, sh(col, 0.15)); }); }
  // おの：刃は -x 側
  axe(x, y, ang = 0, s = 1) { this._tool(x, y, ang, s, () => {
    this.rr(-18, -420, 36, 500, 18, C.wood);
    this.path('M-14 -440 L-150 -490 Q-190 -420 -150 -340 L-14 -380 Z', '#dfe5ee');
    this.path('M-150 -490 Q-190 -420 -150 -340 L-132 -350 Q-162 -420 -134 -480 Z', '#ffffff', 0);
    this.rr(-26, -452, 60, 84, 12, C.steel);
  }); }
  // 杵（きね）：頭の打つ面は -x 側
  kine(x, y, ang = 0, s = 1) { this._tool(x, y, ang, s, () => {
    this.rr(-20, -330, 40, 470, 18, C.wood2);
    this.rr(-170, -440, 300, 130, 50, C.wood);
    this.ell(-170, -375, 26, 64, sh(C.wood, -0.14));
    this.hl(-60, -420, 80, 14, 0, 0.4);
  }); }
  // はんこ：印面は -y の先
  stamp(x, y, ang = 0, s = 1, col = C.red) { this._tool(x, y, ang, s, () => {
    this.rr(-34, -40, 68, 90, 30, C.dwood);
    this.rr(-42, -250, 84, 220, 20, '#f4e3c3');
    this.rr(-48, -280, 96, 40, 10, col);
  }); }
  // ハエたたき
  swatter(x, y, ang = 0, s = 1, col = C.green) { this._tool(x, y, ang, s, () => {
    this.taper(0, 60, 0, -280, 13, 9, sh(col, -0.2));
    this.rr(-90, -470, 180, 200, 26, col);
    this.grid(-80, -460, 160, 180, 30, sh(col, -0.2), 4);
    this.rr(-90, -470, 180, 200, 26, null);
  }); }
  // ラケット
  racket(x, y, ang = 0, s = 1, col = C.blue) { this._tool(x, y, ang, s, () => {
    this.rr(-20, -120, 40, 190, 16, C.dwood);
    this.path('M-14 -120 L-40 -200 M14 -120 L40 -200', null, 10);
    this.ell(0, -310, 112, 140, '#ffffff', 0); this.ctx.save(); this.ctx.beginPath(); this.ctx.ellipse(0, -310, 104, 132, 0, 0, TAU); this.ctx.clip(); this.grid(-110, -450, 220, 280, 30, '#b7c4dc', 4); this.ctx.restore();
    this.ell(0, -310, 112, 140, null, 0); this.arc(0, -310, 108, 0, TAU, col, 18); this.ell(0, -310, 118, 146, null, this.lw);
  }); }
  bat(x, y, ang = 0, s = 1, col = C.wood2) { this._tool(x, y, ang, s, () => { this.taper(0, 90, 0, -460, 20, 46, col); this.ell(0, 92, 30, 12, sh(col, -0.2)); this.hl(-12, -300, 10, 90, 0, 0.35); }); }
  // ぞうきん（手にかぶせる）
  rag(x, y, ang = 0, s = 1, col = '#ffffff') { this._tool(x, y, ang, s, () => { this.blob([-90, 60, -110, -20, -70, -90, 10, -110, 90, -80, 110, 0, 80, 70, 0, 90], col); this.line([-60, -40, 60, -60], sh(col, -0.15), 5); this.line([-70, 10, 70, -6], sh(col, -0.15), 5); }); }
  // はけ（ペンキ）
  brush(x, y, ang = 0, s = 1, paint = C.blue) { this._tool(x, y, ang, s, () => { this.rr(-18, -170, 36, 240, 16, C.wood); this.rr(-60, -220, 120, 64, 10, C.steel); this.path('M-62 -214 L62 -214 L58 -320 Q0 -336 -58 -320 Z', paint); }); }
  whisk(x, y, ang = 0, s = 1) { this._tool(x, y, ang, s, () => { this.rr(-20, -130, 40, 200, 18, C.red); for (const w of [-60, -30, 0, 30, 60]) this.curve([0, -130, w * 1.1, -240, w * 0.5, -340, 0, -360], C.steel, 7); this.curve([-70, -260, 0, -246, 70, -260], C.steel, 0.1); }); }
  ladle(x, y, ang = 0, s = 1) { this._tool(x, y, ang, s, () => { this.rr(-14, -300, 28, 370, 12, C.steel); this.path('M-90 -300 Q-90 -400 0 -400 Q90 -400 90 -300 Z', C.metal); }); }
}

// 点を通るなめらかな線（Catmull-Rom → ベジェ）
function smooth(c, p, closed, k = 1) {
  const n = p.length / 2; if (n < 2) return;
  const P = i => { i = closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i)); return [p[i * 2], p[i * 2 + 1]]; };
  c.moveTo(p[0], p[1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), t = k / 6;
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t, p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t, p2[0], p2[1]);
  }
  if (closed) c.closePath();
}
