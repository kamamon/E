/* パンチ（前に突く） — サンドバッグ・まくら・板割り など */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

// グローブの位置：p=1 で手前（下）、p=0 で的に当たる
function glovePos(sg, p, tx = 500, ty = 430) { return { x: lerp(tx + sg * 40, 500 + sg * 300, p), y: lerp(ty, 1080, E.ioQ(p)), s: lerp(0.78, 1.25, p), a: -Math.PI / 2 - sg * lerp(0.12, 0.34, p) }; }
function gloves(g, s, col, tx, ty) {
  const alt = s.mode === 'alt';
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? -1 : 1, active = s.side === side;
    const p = active ? s.p : alt ? clamp(1 - s.p) : 1;
    const q = glovePos(sg, p, tx, ty);
    g.arm(q.x, q.y, q.a, { hand: 'glove', glove: col, side, s: q.s, sleeve: '#2b2f45' });
  }
}

const BAGS = [
  { k: 'bag', name: 'サンドバッグを打つ', short: 'サンドバッグ', theme: 'dojo', c: '#d8343c', wall: '#2f3d63', floor: '#8a5a38' },
  { k: 'pillow', name: 'まくらをパンチ', short: 'まくら', theme: 'home', c: '#ffffff', wall: '#d9d0f5', floor: '#9bd1c5', pillow: 1 },
];

/* =========================================================================
   追加の場面で使う道具
   ========================================================================= */
const PI = Math.PI, TAU = PI * 2;
const sgn = sd => sd === 'L' ? -1 : 1;
const other = sd => sd === 'L' ? 'R' : 'L';
const ageOf = s => s.k ? s.age : 9;
// 拳：p=0 で (tx,ty) に当たる / p=1 で手前のガード（画面の下）
function reach(sg, p, tx, ty, s0 = 0.8) {
  return { x: lerp(tx, 500 + sg * 300, p), y: lerp(ty, 1080, E.ioQ(p)), s: lerp(s0, 1.25, p), a: -PI / 2 - sg * lerp(0.12, 0.34, p) + (tx - 500 - sg * 40) * 0.0011 * (1 - p) };
}
// 両腕（打つ手を手前に）。T(side) → [x, y] はその手が当たる所。o: { hand, glove, sleeve, skin, s0, side（鏡の中で描くときは 'R'） }
function fists(g, s, T, o = {}) {
  const act = o.side ?? s.side, m = s.mode;
  for (const sd of act === 'L' ? ['R', 'L'] : ['L', 'R']) {
    const sg = sgn(sd), p = (m === 'both' || act === sd) ? s.p : m === 'alt' ? clamp(1 - s.p) : 1;
    const t = T(sd), q = reach(sg, p, t[0], t[1], o.s0);
    if (o.hand === 'point') { const r = q.a + PI / 2, lx = -24 * q.s * sg, ly = -143 * q.s; q.x -= lx * Math.cos(r) - ly * Math.sin(r); q.y -= lx * Math.sin(r) + ly * Math.cos(r); }
    g.arm(q.x, q.y, q.a, { hand: o.hand ?? 'fist', glove: o.glove, side: sd, s: q.s, sleeve: o.sleeve, skin: o.skin });
  }
}
const hitSides = s => s.mode === 'both' ? ['L', 'R'] : [s.lastSide];
// 的が左右に2つある場面：1回目の的は最初に打つ手の側、2回目はその反対
const first = s => s.my.f0 || (s.my.f0 = s.k === 0 ? s.side : s.lastSide);
const tSide = (s, i) => i === 0 ? first(s) : other(first(s));
// その手が向かう位置。P(i) = 的 i の位置。片手モードは 1回目のあと手を引く間に次の的へ移す（急に飛ばない）
function tPos(s, sd, P) {
  if (s.mode === 'alt') return P(sd === first(s) ? 0 : 1);
  if (s.k !== 1) return P(s.k ? 1 : 0);
  const a = P(0), b = P(1), t = E.sm(clamp(s.u / 0.5));
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}
// 飛んでいくかけら：[dx, dy, 回転]
const fly = (f, t, G = 2300) => [f.vx * t, f.vy * t + 0.5 * G * t * t, f.w * t];
function clipPts(g, p, fn) { const c = g.ctx; c.save(); c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.clip(); fn(); c.restore(); }
// ぎざぎざの輪（中心 0,0）
function jag(r, n, r0, r1) { const p = []; for (let i = 0; i < n; i++) { const a = (i + (r() - 0.5) * 0.4) / n * TAU, d = i % 2 ? lerp(r0, r1, r() * 0.45) : lerp(r1, r0, r() * 0.3); p.push(Math.cos(a) * d, Math.sin(a) * d); } return p; }
const place = (p, x, y, k = 1) => p.map((v, i) => (i % 2 ? y : x) + v * k);

/* ---------- 板割り ---------- */
const BJ = [500, 300, 515, 338, 489, 378, 511, 418, 491, 460, 513, 500, 493, 538, 505, 560];
const BJR = []; for (let i = BJ.length - 2; i >= 0; i -= 2) BJR.push(BJ[i], BJ[i + 1]);
const B_L = [340, 300, ...BJ, 340, 560], B_R = [660, 300, 660, 560, ...BJR];
function boardFace(g) {
  g.rr(340, 300, 320, 260, 6, '#f3cf92', 0);
  for (const x of [376, 418, 456, 546, 586, 626]) g.curve([x, 304, x + 7, 380, x - 6, 470, x + 3, 556], '#d9a764', 4);
  g.ell(598, 382, 9, 20, '#cf9752', 0);
  g.rect(340, 300, 320, 16, 'rgba(255,255,255,0.4)', 0);
}
function holderL(g) {   // 板を持つ人の左手（板のうしろ）
  g.taper(g.V.x0 - 80, 760, 296, 452, 90, 62, '#f7f5ee');
  g.ell(300, 452, 30, 62, '#e6e2d6', 5, 0.5);
  g.rr(278, 386, 74, 96, 28, C.skin);
}
const holderFingers = g => { for (let i = 0; i < 4; i++) g.cap(322, 396 + i * 23, 366, 398 + i * 23, 11.5, C.skin); };

/* ---------- せんべい ---------- */
const SBX = 500, SBY = 404, SBR = 172;
const CUTS = [-1.25, 0.32, 1.9, 3.45];
const CJ = [0, 11, -10, 6];
function cutPts(phi, r) { const o = []; [0, 0.36, 0.7, 1.25].forEach((t, i) => { const d = t * r, j = CJ[i]; o.push(Math.cos(phi) * d - Math.sin(phi) * j, Math.sin(phi) * d + Math.cos(phi) * j); }); return o; }
const WEDGES = CUTS.map((a0, i) => {
  const a1 = i < 3 ? CUTS[i + 1] : CUTS[0] + TAU, p = cutPts(a0, SBR), q = cutPts(a1, SBR), arc = [];
  for (let k = 1; k < 5; k++) { const a = lerp(a0, a1, k / 5); arc.push(Math.cos(a) * SBR * 1.25, Math.sin(a) * SBR * 1.25); }
  const qr = []; for (let k = q.length - 2; k >= 0; k -= 2) qr.push(q[k], q[k + 1]);
  return { pts: [...p, ...arc, ...qr], mid: (a0 + a1) / 2, a0, a1 };
});
const SPOTS = [-80, -60, 14, 60, -90, 10, 96, 30, 12, -110, 70, 9, 40, 110, 13, -40, 120, 9, 120, -40, 10];
function senbeiFace(g) {
  g.circ(0, 0, SBR, '#c9873f', 0);
  g.circ(0, 0, SBR - 15, g.rad(-40, -50, 20, SBR, ['#efbf74', '#cf8c42']), 0);
  for (let i = 0; i < SPOTS.length; i += 3) g.ell(SPOTS[i], SPOTS[i + 1], SPOTS[i + 2], SPOTS[i + 2] * 0.65, 'rgba(120,60,20,0.4)', 0);
  g.clipCirc(0, 0, SBR, () => { g.rect(-62, -SBR - 4, 124, SBR * 2 + 8, '#1f3b2c', 0); g.line([-28, -SBR, -24, SBR], '#2f5a41', 5); });
  g.hl(-70, -92, 46, 16, -0.6, 0.35);
}

/* ---------- 氷 ---------- */
const ICE_BUB = [[380, 300, 7], [612, 290, 5], [600, 560, 8], [392, 540, 5], [640, 470, 4]];
function iceFace(g) {
  g.rr(330, 232, 340, 376, 34, g.lin(0, 232, 0, 608, ['rgba(226,248,255,0.62)', 'rgba(140,208,242,0.8)']), 0);
  g.poly([374, 604, 450, 236, 506, 236, 430, 604], 'rgba(255,255,255,0.3)', 0);
  g.poly([598, 604, 640, 400, 664, 400, 626, 604], 'rgba(255,255,255,0.22)', 0);
  for (const [x, y, r] of ICE_BUB) g.circ(x, y, r, 'rgba(255,255,255,0.75)', 0);
  g.line([362, 268, 430, 246], 'rgba(255,255,255,0.9)', 9);
}
function fish(g, x, y, rot, sc, happy) {
  g.at(x, y, rot, sc, sc, () => {
    g.path('M60 0 L118 -46 Q106 0 118 46 Z', '#ff7f32');
    g.path('M-20 -40 Q16 -84 52 -36 Z', '#ff7f32');
    g.ell(0, 0, 86, 50, '#ff9b45');
    g.ell(-6, 16, 56, 20, '#ffd3a0', 0);
    g.arc(18, 0, 34, -1.1, 1.1, '#e0641c', 5);
    if (happy) { g.arc(-46, -8, 10, PI + 0.4, -0.4, C.ol, 6); g.circ(-58, 14, 7, '#ff6b6b', 0); }
    else { g.circ(-46, -10, 11, '#ffffff', 4); g.circ(-48, -10, 5, C.ol, 0); }
  });
}

/* ---------- 障子 ---------- */
function tanuki(g, x, y) {
  g.at(x, y, () => {
    g.circ(-34, -36, 15, '#5b4636'); g.circ(34, -36, 15, '#5b4636');
    g.circ(0, 0, 48, '#a07d5a');
    g.ell(-18, -2, 17, 12, '#4a382b', 0, 0.35); g.ell(18, -2, 17, 12, '#4a382b', 0, -0.35);
    g.circ(-17, -3, 6, '#ffffff', 0); g.circ(17, -3, 6, '#ffffff', 0); g.circ(-16, -2, 3, C.ol, 0); g.circ(18, -2, 3, C.ol, 0);
    g.ell(0, 20, 24, 17, '#f3e3cc', 0); g.ell(0, 12, 8, 6, C.ol, 0);
    g.arc(0, 22, 8, 0.3, PI - 0.3, C.ol, 3);
  });
}

/* ---------- 風船・水風船・しゃぼん玉 ---------- */
const POPS = [
  { k: 'balloon', name: '風船を割る', short: '風船', theme: 'party', sfx: 'pop', kind: 0, cols: [C.red, C.blue] },
  { k: 'water', name: '水風船を割る', short: '水風船', theme: 'sea', sfx: 'splash', kind: 1, cols: ['#47c4ff', '#ff7fc2'] },
  { k: 'bubble', name: 'しゃぼん玉をつぶす', short: 'しゃぼん玉', theme: 'nature', sfx: 'bubble', kind: 2 },
];
const POP_DX = 148;
function popPos(s, v, i) {
  const sd = tSide(s, i), x = 500 + sgn(sd) * POP_DX;
  if (v.kind === 1) return [x, 396 + jig(ageOf(s), 6, 14, 5)];
  if (v.kind === 2) return [x + Math.sin(s.t * 1.7 + i * 2) * 10, 392 + Math.sin(s.t * 2.3 + i) * 12];
  return [x, 380 + Math.sin(s.beat * Math.PI + i * 1.7) * 7];
}
function bubbleDraw(g, x, y, r, mini) {
  g.circ(x, y, r, g.rad(x - r * 0.3, y - r * 0.35, r * 0.1, r, ['rgba(255,255,255,0.05)', 'rgba(205,236,255,0.42)']), 0);
  g.ring(x, y, r - (mini ? 3 : 7), g.lin(x - r, y - r, x + r, y + r, ['#ff8fd8', '#7fe6ff', '#fff07a', '#b88cff']), mini ? 4 : 12);
  g.ring(x, y, r, mini ? 'rgba(43,33,64,0.35)' : C.ol, mini ? 3 : 5);
  g.arc(x, y, r * 0.72, -2.6, -1.7, '#ffffff', mini ? 4 : 13);
  g.circ(x + r * 0.42, y + r * 0.4, r * 0.08, '#ffffff', 0);
}

/* ---------- 缶タワー・積み木 ---------- */
const TOWERS = [
  { k: 'cans', name: '缶タワーをくずす', short: '缶タワー', theme: 'festival', hy: [330, 500] },
  { k: 'blocks', name: '積み木をくずす', short: '積み木', theme: 'school', hy: [404, 548] },
];
function towerPieces(v) {
  const P = [];
  if (v.k === 'cans') {
    const cols = [C.red, C.blue, '#2fbf71', C.orange, '#ffcf3a', C.purple, '#ff6fb1', C.teal, C.red, C.blue];
    let n = 0;
    for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) P.push({ x: 500 + (i - (3 - row) / 2) * 80, y: 561 - row * 98, kind: 'can', c: cols[n++], grp: row >= 2 ? 0 : 1 });
  } else {
    [['あ', C.red], ['い', C.blue], ['う', '#ffc21a']].forEach(([m, c], i) => P.push({ x: 404 + i * 96, y: 565, W: 94, H: 90, kind: 'cube', c, m, grp: 1 }));
    P.push({ x: 500, y: 498, W: 300, H: 44, kind: 'plank', c: '#3cc46b', grp: 1 });
    P.push({ x: 446, y: 431, W: 92, H: 90, kind: 'cube', c: C.orange, m: 'star', grp: 0 }, { x: 554, y: 431, W: 92, H: 90, kind: 'cube', c: C.purple, m: 'dot', grp: 0 });
    P.push({ x: 500, y: 343, W: 214, H: 86, kind: 'roof', c: '#ff6b6b', grp: 0 });
  }
  return P;
}
function towerPiece(g, p) {
  if (p.kind === 'can') {
    g.rr(-38, -49, 76, 98, 12, p.c);
    g.rect(-38, -16, 76, 34, '#ffffff', 0); g.star(0, 1, 13, 6, 5, p.c, 0);
    g.rr(-34, -51, 68, 12, 6, '#dfe5ee', 4); g.rr(-34, 39, 68, 12, 6, '#dfe5ee', 4);
    g.rr(-38, -49, 76, 98, 12, null); g.hl(-22, -6, 6, 32, 0, 0.5);
  } else if (p.kind === 'roof') {
    g.poly([-p.W / 2, p.H / 2, p.W / 2, p.H / 2, 0, -p.H / 2], p.c); g.line([-p.W / 2 + 34, p.H / 2 - 14, -6, -p.H / 2 + 26], 'rgba(255,255,255,0.4)', 8);
  } else {
    g.rr(-p.W / 2, -p.H / 2, p.W, p.H, 10, p.c); g.rr(-p.W / 2 + 8, -p.H / 2 + 6, p.W - 16, 12, 6, 'rgba(255,255,255,0.35)', 0);
    if (p.m === 'star') g.star(0, 4, 28, 12, 5, '#ffffff', 5);
    else if (p.m === 'dot') g.circ(0, 4, 22, '#ffffff', 5);
    else if (p.m) g.text(p.m, 0, 6, { size: 54, f: '#ffffff', o: 8 });
  }
}

/* ---------- エレベーター・インターホン（ボタンを指で押す） ---------- */
function penguin(g, x, y, wave) {
  g.at(x, y, () => {
    g.ell(-26, 96, 26, 11, C.orange, 5); g.ell(26, 96, 26, 11, C.orange, 5);
    g.at(-64, -14, 0.35, 1, 1, () => g.ell(0, 34, 17, 46, '#2b3150'));
    g.at(64, -14, -0.35 + wave, 1, 1, () => g.ell(0, 34, 17, 46, '#2b3150'));
    g.ell(0, 6, 72, 92, '#2b3150'); g.ell(0, 22, 50, 70, '#ffffff', 0);
    g.circ(0, -90, 54, '#2b3150'); g.ell(-20, -92, 17, 21, '#ffffff', 0); g.ell(20, -92, 17, 21, '#ffffff', 0);
    g.circ(-16, -90, 7, C.ol, 0); g.circ(16, -90, 7, C.ol, 0); g.circ(-14, -93, 2.5, '#ffffff', 0); g.circ(18, -93, 2.5, '#ffffff', 0);
    g.tri(-14, -72, 14, -72, 0, -54, C.orange, 4); g.ell(-34, -70, 9, 6, '#ff9fbd', 0); g.ell(34, -70, 9, 6, '#ff9fbd', 0);
    g.rr(-46, -48, 92, 20, 10, C.red); g.rr(18, -40, 22, 56, 8, C.red);
  });
}
function shiba(g, x, y, sc, full, t) {
  g.at(x, y, 0, sc, sc, () => {
    if (full) {
      g.at(64, 80, Math.sin(t * 22) * 0.35, 1, 1, () => { g.circ(16, -24, 28, '#e39b4f'); g.circ(16, -24, 12, '#fff3e0', 0); });
      g.ell(0, 96, 74, 70, '#e39b4f'); g.ell(0, 110, 42, 50, '#fff3e0', 0);
      g.rr(-48, 132, 30, 52, 12, '#e39b4f'); g.rr(18, 132, 30, 52, 12, '#e39b4f'); g.ell(-33, 184, 20, 10, '#fff3e0', 4); g.ell(33, 184, 20, 10, '#fff3e0', 4);
    }
    g.tri(-58, -30, -18, -44, -48, -92, '#e39b4f'); g.tri(58, -30, 18, -44, 48, -92, '#e39b4f');
    g.tri(-46, -42, -26, -48, -42, -76, '#ffb3a0', 0); g.tri(46, -42, 26, -48, 42, -76, '#ffb3a0', 0);
    g.ell(0, 0, 66, 56, '#e39b4f'); g.ell(0, 22, 46, 30, '#fff3e0', 0); g.ell(-30, -18, 10, 6, '#fff3e0', 0); g.ell(30, -18, 10, 6, '#fff3e0', 0);
    g.circ(-24, -4, 7.5, C.ol, 0); g.circ(24, -4, 7.5, C.ol, 0); g.circ(-22, -7, 2.5, '#ffffff', 0); g.circ(26, -7, 2.5, '#ffffff', 0);
    g.ell(0, 12, 11, 8, C.ol, 0); g.ell(0, 30, 9, 11, '#ff7a8a', 4); g.arc(-9, 20, 9, 0.2, PI - 0.6, C.ol, 4); g.arc(9, 20, 9, 0.6, PI - 0.2, C.ol, 4);
  });
}
function catHead(g, x, y, sc) {
  g.at(x, y, 0, sc, sc, () => {
    g.tri(-50, -18, -14, -46, -46, -78, '#9aa3b5'); g.tri(50, -18, 14, -46, 46, -78, '#9aa3b5');
    g.tri(-40, -30, -22, -42, -38, -62, '#ffb3c6', 0); g.tri(40, -30, 22, -42, 38, -62, '#ffb3c6', 0);
    g.ell(0, 0, 60, 52, '#9aa3b5'); g.line([-14, -48, -10, -30], '#6f7890', 6); g.line([0, -52, 0, -32], '#6f7890', 6); g.line([14, -48, 10, -30], '#6f7890', 6);
    g.ell(-22, -2, 12, 15, '#ffe27a', 4); g.ell(22, -2, 12, 15, '#ffe27a', 4); g.ell(-22, -2, 4, 11, C.ol, 0); g.ell(22, -2, 4, 11, C.ol, 0);
    g.tri(-7, 14, 7, 14, 0, 22, '#ff8fa8', 0); g.arc(-6, 24, 6, 0.2, PI - 0.4, C.ol, 3); g.arc(6, 24, 6, 0.4, PI - 0.2, C.ol, 3);
    for (const d of [-1, 1]) { g.line([d * 30, 18, d * 74, 10], C.ol, 3); g.line([d * 30, 26, d * 72, 30], C.ol, 3); }
  });
}

/* ---------- 自販機 ---------- */
const DRINKS = [['can', '#3cb371'], ['bottle', C.orange], ['can', '#8a5a3c'], ['bottle', '#3a86ff'], ['can', '#ff5a5f'], ['can', '#ffcf3a']];
function drink(g, x, y, kind, c) {   // y = 底
  if (kind === 'can') { g.rr(x - 27, y - 86, 54, 86, 10, c); g.rect(x - 27, y - 62, 54, 24, '#ffffff', 0); g.circ(x, y - 50, 7, c, 0); g.rr(x - 27, y - 86, 54, 86, 10, null); g.hl(x - 14, y - 40, 5, 22, 0, 0.5); }
  else { g.rr(x - 13, y - 104, 26, 14, 4, '#ffffff'); g.path(`M${x - 12} ${y - 92} L${x + 12} ${y - 92} L${x + 26} ${y - 66} L${x + 26} ${y - 6} Q${x + 26} ${y} ${x + 20} ${y} L${x - 20} ${y} Q${x - 26} ${y} ${x - 26} ${y - 6} L${x - 26} ${y - 66} Z`, sh(c, 0.55)); g.rect(x - 26, y - 56, 52, 26, c, 0); g.line([x - 26, y - 56, x + 26, y - 56], C.ol, 4); g.line([x - 26, y - 30, x + 26, y - 30], C.ol, 4); }
}
const VEND_X = [387, 500, 613];

/* ---------- ケーキのろうそく ---------- */
const CANDLE_X = [392, 438, 482, 518, 562, 608], CANDLE_C = ['#3a86ff', '#ffd23f', '#3cc46b', '#ff9f1c', '#8e5cff', '#ff5fa2'];
function flame(g, x, y, t) {
  g.at(x, y, Math.sin(t * 17 + x * 0.3) * 0.08, 1, 1 + 0.09 * Math.sin(t * 23 + x), () => {
    g.glow(0, -14, 50, '#ffcf6a', 0.6);
    g.path('M0 -46 C16 -22 18 -6 12 4 C6 12 -6 12 -12 4 C-18 -6 -16 -22 0 -46 Z', '#ff9f1c', 0);
    g.path('M0 -28 C8 -14 9 -4 6 2 C3 6 -3 6 -6 2 C-9 -4 -8 -14 0 -28 Z', '#fff2a0', 0);
  });
}
function cakeTier(g, x, y, w, h, drips) {
  g.rr(x, y, w, h, 24, '#fff3e6');
  g.clipRR(x, y, w, h, 24, () => { g.rect(x, y, w, 30, '#ff8fb1', 0); for (const [dx, l] of drips) g.cap(x + dx, y + 20, x + dx, y + 20 + l, 11, '#ff8fb1', 0); g.rect(x, y + h - 22, w, 22, '#f7e0c8', 0); });
  g.rr(x, y, w, h, 24, null);
}
const DRIP1 = [[40, 30], [96, 52], [150, 24], [214, 46], [276, 30], [330, 56], [384, 26]], DRIP2 = [[36, 34], [96, 22], [150, 44], [206, 26], [250, 38]];

/* ---------- だるま・起き上がりこぼし ---------- */
const ROLY = [
  { k: 'daruma', name: 'だるまをパンチ', short: 'だるま', theme: 'festival' },
  { k: 'koboshi', name: '起き上がりこぼし', short: 'おきあがり', theme: 'home' },
];
function darumaDraw(g, s) {
  g.ell(0, -205, 196, 206, '#e8343c');
  g.ell(0, -262, 140, 118, '#ffd23f', 0); g.ell(0, -262, 127, 105, '#fff3df', 0);
  g.curve([-114, -318, -78, -348, -24, -334], C.ol, 18); g.curve([114, -318, 78, -348, 24, -334], C.ol, 18);
  for (const i of [0, 1]) {
    const x = i ? -50 : 50, a = s.k > i ? (i === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age) : -1;
    g.circ(x, -280, 31, '#ffffff', 5);
    if (a >= 0) { const k = E.outBack(clamp(a / 0.16), 2.4); g.circ(x, -278, 21 * k, C.ol, 0); g.circ(x - 7, -285, 6 * k, '#ffffff', 0); }
  }
  g.arc(0, -238, 13, 0.3, PI - 0.3, C.ol, 6);
  g.curve([-88, -210, -46, -230, -6, -212], C.ol, 13); g.curve([88, -210, 46, -230, 6, -212], C.ol, 13);
  g.curve([-74, -184, 0, -164, 74, -184], C.ol, 8);
  g.arc(0, -150, 176, 0.25, PI - 0.25, '#ffd23f', 9);
  g.text('福', 0, -84, { size: 104, f: '#ffd23f', o: 10 });
  g.ell(0, -205, 196, 206, null); g.hl(-126, -300, 26, 64, -0.3, 0.32);
}
function koboshiDraw(g, s) {
  const f = s.k;
  g.ell(-156, -168, 34, 62, '#ffc21a', 6, 0.35); g.ell(156, -168, 34, 62, '#ffc21a', 6, -0.35);
  g.curve([-8, -348, -22, -392, 6, -408], C.ol, 8); g.curve([10, -350, 26, -384, 48, -388], C.ol, 8);
  g.ell(0, -178, 172, 178, '#ffd23f');
  g.ell(0, -92, 124, 86, '#fff1b8', 0);
  g.ell(-100, -196, 24, 15, '#ff9fbd', 0); g.ell(100, -196, 24, 15, '#ff9fbd', 0);
  if (f === 0) { g.arc(-56, -238, 22, 0.25, PI - 0.25, C.ol, 8); g.arc(56, -238, 22, 0.25, PI - 0.25, C.ol, 8); }
  else if (f === 1) { for (const x of [-56, 56]) { g.circ(x, -236, 27, '#ffffff', 6); g.circ(x, -234, 15, C.ol, 0); g.circ(x - 5, -240, 5, '#ffffff', 0); } }
  else { g.arc(-56, -226, 22, PI + 0.3, -0.3, C.ol, 8); g.arc(56, -226, 22, PI + 0.3, -0.3, C.ol, 8); }
  if (f === 2) { g.tri(-26, -200, 26, -200, 0, -186, C.orange, 5); g.path('M-24 -184 Q0 -150 24 -184 Z', '#ff6b6b'); g.line([-26, -186, 26, -186], C.ol, 5); }
  else g.tri(-24, -198, 24, -198, 0, -164, C.orange, 5);
  if (f === 0) { const r = 16 + 7 * Math.sin(s.t * 3); g.circ(36, -176, r, 'rgba(200,235,255,0.7)', 4); g.hl(30, -182, r * 0.3, r * 0.2, -0.5, 0.8); }
  g.hl(-110, -270, 30, 56, -0.4, 0.3);
}

/* ---------- ミット打ち ---------- */
const MITT = { L: [378, 404], R: [622, 404] };
function mitt(g, x, y, rot, sc) {
  g.at(x, y, rot, sc, sc, () => {
    g.rr(-60, 70, 120, 46, 18, '#2b2140', 0);
    g.ell(0, 0, 82, 96, '#e8343c'); g.ell(0, 0, 40, 44, '#ffffff', 5); g.circ(0, 0, 14, '#e8343c', 0);
    g.hl(-34, -50, 22, 12, -0.6, 0.45);
  });
}

/* ---------- ピザ生地 ---------- */
const TOPS = [[-150, -10, 's'], [-70, 20, 's'], [20, -16, 's'], [110, 14, 's'], [170, -8, 's'], [-110, -26, 'b'], [64, 26, 'b'], [150, -28, 'b'], [-20, 30, 'b'], [-180, 12, 'c'], [-40, -30, 'c'], [90, -36, 'c'], [196, 18, 'c'], [-130, 30, 'c'], [40, 6, 'c']];

/* ---------- 雪のかべ ---------- */
function snowBricks(r) {
  const B = [];
  for (let row = 0; row < 7; row++) {
    const y = 256 + row * 72, off = row % 2 ? 65 : 0;
    for (let x = 140 - off; x < 860; x += 130) {
      const x0 = Math.max(140, x), x1 = Math.min(860, x + 130); if (x1 - x0 < 30) continue;
      const b = { x: (x0 + x1) / 2, y: y + 36, bw: x1 - x0 }, dx = b.x - 500, dy = b.y - 430, d = Math.hypot(dx, dy) || 1, sp = 320 + r() * 420;
      b.grp = d < 140 ? 0 : 1; b.vx = dx / d * sp + (r() - 0.5) * 200; b.vy = dy / d * sp - 380 - r() * 240; b.w = (r() - 0.5) * 10;
      B.push(b);
    }
  }
  return B;
}

/* ---------- ピニャータ ---------- */
const PIN_R1 = 205, PIN_R2 = 100;
const PIN_PTS = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? PIN_R2 : PIN_R1, a = -PI / 2 + i * PI / 5; PIN_PTS.push(Math.cos(a) * r, Math.sin(a) * r); }
const PIN_COL = ['#ff5fa2', '#ffd23f', '#2ec4b6', '#a8e05f', '#ff9f1c', '#8e5cff'];
function pinataBody(g, cracked) {
  for (let i = 0; i < 5; i++) { const x = PIN_PTS[i * 4], y = PIN_PTS[i * 4 + 1]; for (let j = -1; j <= 1; j++) g.line([x + j * 9, y, x + j * 12, y + 70 + j * j * 10], PIN_COL[(i + j + 3) % 6], 7); }
  clipPts(g, PIN_PTS, () => { for (let k = 0, y = -PIN_R1; y < PIN_R1; k++, y += 46) { g.rect(-PIN_R1, y, PIN_R1 * 2, 46, PIN_COL[k % 6], 0); g.line([-PIN_R1, y + 46, -150, y + 38, -100, y + 46, -50, y + 38, 0, y + 46, 50, y + 38, 100, y + 46, 150, y + 38, PIN_R1, y + 46], 'rgba(255,255,255,0.6)', 5); } });
  g.poly(PIN_PTS, null);
  g.circ(-40, -20, 14, C.ol, 0); g.circ(40, -20, 14, C.ol, 0); g.arc(0, 4, 26, 0.3, PI - 0.3, C.ol, 7);
  if (cracked) g.line([-120, -40, -70, -10, -86, 30, -30, 50, -40, 90], C.ol, 6);
}

/* ---------- 発射ボタン ---------- */
function rocket(g, fk, t) {
  if (fk > 0) g.at(0, 0, 0, 1, fk * (1 + 0.15 * Math.sin(t * 40)), () => { g.path('M-36 0 Q-32 80 0 150 Q32 80 36 0 Z', '#ff9f1c', 0); g.path('M-20 0 Q-16 46 0 92 Q16 46 20 0 Z', '#fff2a0', 0); });
  g.path('M-44 -70 L-92 -6 L-92 12 L-44 -6 Z', C.red); g.path('M44 -70 L92 -6 L92 12 L44 -6 Z', C.red);
  g.rr(-30, -14, 60, 18, 6, '#8f9bb0');
  g.rr(-46, -240, 92, 236, 34, '#f4f6fb');
  g.path('M-46 -206 Q-40 -282 0 -326 Q40 -282 46 -206 Z', C.red);
  g.circ(0, -160, 23, '#7fd3ff', 6); g.hl(-7, -167, 7, 5, -0.6, 0.7);
  g.rect(-46, -86, 92, 16, C.red, 0); g.line([-46, -86, 46, -86], C.ol, 4); g.line([-46, -70, 46, -70], C.ol, 4);
  g.hl(-24, -170, 8, 50, 0, 0.5);
}

export default [
  {
    id: 'punch-bag', acts: ['punch'], modes: ['one', 'alt'], sfx: v => v.pillow ? 'thud' : 'punch', vars: BAGS,
    draw(g, s, v) {
      const V = g.V, sg = s.lastSide === 'L' ? -1 : 1, age = s.k ? s.age : 9;
      g.bg(v.wall); g.band(820, 'bottom', v.floor, 7);
      if (!v.pillow) {
        g.rect(V.x0 - 20, 300, V.x1 - V.x0 + 40, 26, sh(v.wall, -0.18), 0);
        g.shadow(500 + jig(age, 40, 9, 3), 860, 150, 24);
        g.at(500, V.y0 - 10, jig(age, -0.14 * sg, 9, 3.2), 1, 1, () => {
          g.line([0, 0, 0, 160 - V.y0], '#9aa3b5', 12);
          for (let y = 30; y < 150 - V.y0; y += 40) g.ell(0, y, 10, 18, null, 5);
          const [sx, sy] = squash(age, 0.12);
          g.at(0, 160 - V.y0 + 260, 0, sx, sy, () => {
            g.rr(-120, -260, 240, 520, 100, v.c);
            for (const yy of [-120, 110]) g.rect(-120, yy, 240, 36, sh(v.c, -0.25), 0);
            g.rr(-120, -260, 240, 520, 100, null);
            g.hl(-60, -170, 26, 120, 0, 0.35);
          });
        });
      } else {
        g.rr(170, 690, 660, 220, 60, '#5aa6d8'); g.rr(170, 690, 660, 60, 30, '#7cc0ea', 0);
        const [sx, sy] = squash(age, 0.2);
        g.at(500 + jig(age, 10 * sg, 14, 6), 560, jig(age, 0.05 * sg, 12, 5), sx, sy, () => {
          g.blob([-250, -110, -120, -150, 0, -140, 120, -150, 250, -110, 270, 0, 250, 110, 120, 150, 0, 140, -120, 150, -250, 110, -270, 0], '#ffffff');
          g.curve([-200, -60, -100, -20, 0, -40], '#e3e0f0', 5); g.curve([60, 50, 140, 20, 210, 60], '#e3e0f0', 5);
        });
      }
      gloves(g, s, v.pillow ? C.blue : C.red, 500, 430);
    },
    hit(g, s, k, v) {
      const x = 500 + (s.lastSide === 'L' ? -40 : 40), y = 430;
      g.fx.lines(x, y, { n: 12, r0: 120, r1: 250, w: 12 }); g.fx.shake(10, 0.14);
      if (v.pillow) g.fx.burst(x, y, { n: 18, c: ['#ffffff', '#f2eefc'], shape: 'leaf', sp: [200, 520], size: [16, 26], g: 120, drag: 0.96, life: [0.8, 1.3] });
      else g.fx.smoke(x, y, 5);
      g.fx.pop(v.pillow ? 'ボフッ' : 'ドスッ', 500 - (s.lastSide === 'L' ? -250 : 250), 260, { size: 100 });
    },
  },

  /* ---------- 板割り（道場・正拳突き） ---------- */
  {
    id: 'punch-board', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'dojo', sfx: ['crack', 'break'],
    vars: [{ k: 'board', name: '板割り', short: '板割り' }],
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40;
      g.bg('#6e4932');
      for (let x = Math.floor(V.x0 / 110) * 110 + 50; x < V.x1; x += 110) g.line([x, V.y0 - 10, x, 640], '#5d3c28', 6);
      g.rect(V.x0 - 20, 640, W, 170, '#8f5e3a', 0); g.rect(V.x0 - 20, 640, W, 22, '#a8764d', 0); g.line([V.x0 - 20, 640, V.x1 + 20, 640], C.ol, 6);
      g.band(810, 'bottom', '#d6d290', 7);
      for (let y = 836; y < V.y1; y += 34) g.line([V.x0 - 20, y, V.x1 + 20, y], '#c4c07c', 4);
      g.rect(V.x0 - 20, 900, W, 18, '#3f5b2f', 0);
      // 掛け軸「気合」
      g.line([430, 6, 500, -60, 570, 6], C.ol, 5);
      g.rr(424, 10, 152, 254, 4, '#5f8152'); g.rr(438, 22, 124, 230, 2, '#fbf6e6', 0);
      g.text('気', 500, 88, { size: 78, f: C.ol }); g.text('合', 500, 180, { size: 78, f: C.ol });
      g.rr(410, 0, 180, 18, 8, '#3a2416'); g.rr(410, 256, 180, 20, 9, '#3a2416');
      // 持つ人の手と板
      holderL(g); g.mirror('L', () => holderL(g));
      g.shadow(500, 640, 150, 14, 0.18);
      if (s.k < 2) {
        const [sx, sy] = squash(ageOf(s), 0.06);
        g.at(500, 430, 0, sx, sy, () => g.at(-500, -430, () => {
          boardFace(g);
          if (s.k === 1) { g.line(BJ.slice(0, 12), '#7a4a22', 6); g.line([506, 420, 560, 404, 600, 420], '#7a4a22', 4); }
          g.rr(340, 300, 320, 260, 6, null);
        }));
      } else {
        const th = 0.5 * E.outBack(clamp(s.age / 0.16), 2.2);
        for (const [poly, px, d] of [[B_L, 340, 1], [B_R, 660, -1]]) g.at(px, 430, d * th, () => g.at(-px, -430, () => { clipPts(g, poly, () => boardFace(g)); g.poly(poly, null, 6); }));
      }
      holderFingers(g); g.mirror('L', () => holderFingers(g));
      const both = s.mode === 'both';
      fists(g, s, sd => [500 + sgn(sd) * (both ? 72 : 22), 432], { sleeve: '#f7f5ee' });
    },
    hit(g, s, k) {
      const both = s.mode === 'both';
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * (both ? 72 : 22), 430, { n: 10, r0: 90, r1: 210, w: 11 });
      if (k === 1) { g.fx.chips(500, 420, '#f3cf92', 6); g.fx.pop('ミシッ', 500 - sgn(s.lastSide) * 270, 250, { size: 96 }); g.fx.shake(7, 0.12); }
      else { g.fx.chips(500, 430, '#f3cf92', 20); g.fx.sparks(500, 430, 12); g.fx.stars(500, 380, 9); g.fx.ring(500, 430, { r1: 320 }); g.fx.pop('バキッ！', 500, 190, { size: 130, c: C.yellow }); g.fx.shake(13, 0.18); }
    },
  },

  /* ---------- せんべいを割る ---------- */
  {
    id: 'punch-senbei', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'kitchen', sfx: ['crack', 'crunch'],
    vars: [{ k: 'senbei', name: 'せんべいを割る', short: 'せんべい' }],
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40;
      g.bg('#fff0cc');
      g.dots(V.x0, 250, V.x1 - V.x0, 380, 140, 7, '#f6dfae');
      // のれん
      g.rect(V.x0 - 20, V.y0 - 20, W, 216 - V.y0, '#2c3f7a', 0);
      for (let x = 500 - 255 * 6; x < V.x1 + 255; x += 255) if (x > V.x0 - 255 && x !== 500) g.rect(x - 5, 70, 10, 140, '#fff0cc', 0);
      g.rect(V.x0 - 20, 196, W, 20, '#fff0cc', 0);
      g.text('せんべい', 500, 128, { size: 76, f: '#ffffff' });
      // カウンター
      g.band(650, 'bottom', '#7a4a2a', 7); g.rect(V.x0 - 20, 650, W, 18, '#a06c42', 0);
      for (let x = Math.floor(V.x0 / 160) * 160; x < V.x1; x += 160) g.line([x, 690, x, V.y1 + 20], '#6a3f23', 5);
      // 小皿と湯のみ
      g.ell(200, 640, 92, 20, '#ffffff'); g.ell(184, 616, 46, 14, '#c9873f', 5); g.ell(214, 600, 46, 14, '#d99a4e', 5);
      g.path('M748 566 L852 566 L840 650 L760 650 Z', '#6aa86a'); g.ell(800, 566, 52, 12, '#3f7a45', 5);
      g.line([760, 612, 840, 612], '#4f8c52', 5);
      for (const dx of [-14, 14]) g.curve([800 + dx, 540, 790 + dx + Math.sin(s.t * 3 + dx) * 8, 500, 806 + dx, 460], 'rgba(255,255,255,0.8)', 6);
      // せんべい
      g.shadow(500, 652, 160, 12, 0.2);
      if (s.k < 2) {
        const [sx, sy] = squash(ageOf(s), 0.05), wob = jig(ageOf(s), 0.05 * sgn(s.lastSide), 16, 6);
        g.at(SBX, SBY, wob, sx, sy, () => {
          senbeiFace(g);
          if (s.k === 1) for (const a of [CUTS[0], CUTS[1], CUTS[3]]) g.line(cutPts(a, SBR * 0.85).slice(0, 8), '#6b3a14', 5);
          g.circ(0, 0, SBR, null);
        });
      } else {
        const t = s.age;
        for (let i = 0; i < 4; i++) {
          const w = WEDGES[i], dx = Math.cos(w.mid) * (340 * t), dy = Math.sin(w.mid) * 300 * t + 0.5 * 1500 * t * t, rot = (i % 2 ? 1 : -1) * 2.6 * t;
          const px = Math.cos(w.mid) * SBR * 0.5, py = Math.sin(w.mid) * SBR * 0.5;
          g.at(SBX + px + dx, SBY + py + dy, rot, () => g.at(-px, -py, () => {
            clipPts(g, w.pts, () => senbeiFace(g));
            clipPts(g, w.pts, () => g.circ(0, 0, SBR, null));
            g.line(cutPts(w.a0, SBR * 0.8).slice(0, 8), C.ol, 5); g.line(cutPts(w.a1, SBR * 0.8).slice(0, 8), C.ol, 5);
          }));
        }
      }
      // 台
      g.rr(410, 576, 180, 74, 14, '#a8743f'); g.rr(426, 576, 148, 12, 6, '#5a3a22', 0); g.rr(410, 576, 180, 74, 14, null);
      const both = s.mode === 'both';
      fists(g, s, sd => [500 + sgn(sd) * (both ? 70 : 24), 410], { sleeve: '#2c3f7a' });
    },
    hit(g, s, k) {
      if (k === 1) { g.fx.burst(500, 410, { n: 10, c: ['#d99a4e', '#efbf74'], shape: 'chip', sp: [200, 520], size: [8, 14], g: 1800 }); g.fx.pop('パリッ', 500 - sgn(s.lastSide) * 280, 300, { size: 96 }); g.fx.shake(6, 0.1); }
      else { g.fx.burst(500, 410, { n: 26, c: ['#d99a4e', '#efbf74', '#c9873f'], shape: 'chip', sp: [300, 900], size: [10, 20], g: 2000 }); g.fx.stars(500, 330, 7); g.fx.pop('バリン！', 500, 190, { size: 120, c: C.yellow }); g.fx.shake(11, 0.16); }
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 24, 410, { n: 10, r0: 90, r1: 200, w: 10 });
    },
  },

  /* ---------- 氷を割る（中の魚が出てくる） ---------- */
  {
    id: 'punch-ice', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'winter', sfx: ['crack', 'glass'],
    vars: [{ k: 'ice', name: '氷をくだく', short: '氷' }],
    init(s) {
      const r = s.r, xs = [322, 440, 560, 678], ys = [224, 356, 486, 618], G = [];
      for (let i = 0; i < 4; i++) { G.push([]); for (let j = 0; j < 4; j++) G[i].push([xs[i] + (i % 3 ? (r() - 0.5) * 60 : 0), ys[j] + (j % 3 ? (r() - 0.5) * 60 : 0)]); }
      s.my.G = G; s.my.ch = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const q = [G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]].flat();
        const cx = (q[0] + q[2] + q[4] + q[6]) / 4, cy = (q[1] + q[3] + q[5] + q[7]) / 4, dx = cx - 500, dy = cy - 430, d = Math.hypot(dx, dy) || 1, sp = 380 + r() * 360;
        s.my.ch.push({ q, cx, cy, vx: dx / d * sp, vy: dy / d * sp - 420, w: (r() - 0.5) * 9 });
      }
    },
    draw(g, s) {
      const V = g.V, G = s.my.G;
      g.sky('#3d7fd6', '#c4e8ff', 610);
      g.poly([V.x0 - 60, 612, 120, 380, 250, 500, 400, 330, 640, 612], '#d5e3fa', 0);
      g.poly([360, 612, 620, 360, 760, 470, 880, 390, V.x1 + 60, 560, V.x1 + 60, 612], '#c3d4f2', 0);
      g.poly([400, 330, 450, 380, 420, 384, 380, 360], '#ffffff', 0); g.poly([620, 360, 668, 412, 640, 400, 596, 392], '#ffffff', 0);
      g.band(600, 'bottom', '#f5faff', 7);
      g.ell(180, 700, 200, 30, '#e1eeff', 0); g.ell(820, 760, 240, 34, '#e1eeff', 0);
      for (const tx of [130, 870]) { g.tri(tx - 70, 600, tx + 70, 600, tx, 430, '#2f8a5a'); g.tri(tx - 56, 520, tx + 56, 520, tx, 380, '#37a066'); g.tri(tx - 30, 420, tx + 30, 420, tx, 380, '#ffffff', 0); g.rect(tx - 12, 600, 24, 30, '#7a4a2a'); }
      g.shadow(500, 614, 200, 20);
      if (s.k < 2) {
        const sx = 1 + jig(ageOf(s), 0.025, 30, 9);
        g.at(500, 610, 0, sx, 1, () => g.at(-500, -610, () => {
          fish(g, 500, 432, -0.12, 1.15, false);
          iceFace(g);
          if (s.k === 1) g.clipRR(330, 232, 340, 376, 34, () => {
            for (const j of [1, 2]) { const L = [0, 1, 2, 3].map(i => G[i][j]).flat(); g.line(L, '#ffffff', 8); g.line(L, '#4f97c4', 3); }
            for (const i of [1, 2]) { const L = [0, 1, 2, 3].map(j => G[i][j]).flat(); g.line(L, '#ffffff', 8); g.line(L, '#4f97c4', 3); }
          });
          g.rr(330, 232, 340, 376, 34, null);
        }));
      } else {
        const t = s.age;
        for (const c of s.my.ch) {
          const [dx, dy, rot] = fly(c, t, 2200);
          g.at(c.cx + dx, c.cy + dy, rot, () => g.at(-c.cx, -c.cy, () => { clipPts(g, c.q, () => iceFace(g)); g.poly(c.q, null, 5); }));
        }
        const fy = 432 - 1100 * t + 0.5 * 2600 * t * t;
        fish(g, 500 + 60 * t, fy, -0.12 - 5 * t, 1.15, true);
      }
      const both = s.mode === 'both';
      fists(g, s, sd => [500 + sgn(sd) * (both ? 74 : 24), 432], { sleeve: '#3fa7a0' });
    },
    hit(g, s, k) {
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 24, 432, { n: 10, r0: 90, r1: 210, w: 10, c: '#ffffff' });
      if (k === 1) { g.fx.burst(500, 430, { n: 12, c: ['#e6f8ff', '#a6e1fa'], shape: 'chip', sp: [250, 600], size: [8, 16], g: 1600 }); g.fx.pop('ピキッ', 500 - sgn(s.lastSide) * 280, 260, { size: 96, c: '#e6f8ff' }); g.fx.shake(7, 0.12); }
      else { g.fx.burst(500, 430, { n: 22, c: ['#ffffff', '#c9f1ff', '#8fd3f0'], shape: 'chip', sp: [350, 900], size: [10, 22], g: 1800 }); g.fx.sparks(500, 430, 10, ['#ffffff', '#c9f1ff']); g.fx.stars(500, 300, 7); g.fx.pop('パリーン！', 500, 160, { size: 116, c: '#e6f8ff' }); g.fx.shake(12, 0.16); }
    },
  },

  /* ---------- 障子を破る（たぬきがのぞく） ---------- */
  {
    id: 'punch-shoji', acts: ['punch'], modes: ['one', 'alt'], theme: 'home', sfx: 'rip',
    vars: [{ k: 'shoji', name: '障子を破る', short: '障子' }],
    init(s) { s.my.h = [jag(s.r, 16, 62, 92), jag(s.r, 16, 62, 92)]; },
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, hx = i => 500 + sgn(tSide(s, i)) * 110;
      g.bg('#e8dab8');
      g.rect(V.x0 - 20, 36, W, 824, g.lin(0, 36, 0, 860, ['#fffdf6', '#f6eedb']), 0);
      // 破れた穴（外の庭が見える）
      for (let i = 0; i < 2; i++) {
        if (s.k <= i) continue;
        const a = i === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age, o = lerp(0.35, 1, E.outBack(clamp(a / 0.1), 2));
        const pts = place(s.my.h[i], hx(i), 430, o);
        clipPts(g, pts, () => {
          g.rect(hx(i) - 110, 310, 220, 240, g.lin(0, 330, 0, 530, ['#7fcfff', '#d6f3ff']), 0);
          g.cloud(hx(i) + 40, 370, 0.35);
          g.ell(hx(i) - 40, 520, 90, 56, '#5fbf5a', 0); g.ell(hx(i) + 60, 536, 80, 52, '#4aa84c', 0);
          if (i === 0 && s.k === 2) g.at(hx(0), 452 + 110 * (1 - E.outBack(clamp((s.age - 0.02) / 0.2), 1.6)), 0, 1.45, 1.45, () => tanuki(g, 0, 0));
        });
        g.poly(pts, null, 4);
        for (let j = 0; j < pts.length; j += 6) g.line([pts[j], pts[j + 1], lerp(hx(i), pts[j], 1.35), lerp(430, pts[j + 1], 1.35)], '#d9cfb8', 3);
      }
      // 組子（格子）
      for (let x = Math.floor(V.x0 / 220) * 220 + 60; x < V.x1 + 20; x += 220) g.rect(x - 7, 36, 14, 824, '#b98a58', 0);
      for (const y of [70, 310, 550, 790]) g.rect(V.x0 - 20, y - 7, W, 14, '#b98a58', 0);
      for (let x = Math.floor((V.x0 - 60) / 880) * 880 + 60; x < V.x1 + 30; x += 880) g.rect(x - 16, 36, 32, 824, '#9c6f42', 0);
      g.rect(V.x0 - 20, 830, W, 30, '#9c6f42', 0);
      g.rect(V.x0 - 20, V.y0 - 20, W, 56 - V.y0, '#e2d2ab', 0); g.rect(V.x0 - 20, 0, W, 40, '#6e4329', 0);
      g.band(860, 'bottom', '#d8d39a', 0); g.rect(V.x0 - 20, 860, W, 26, '#6e4329', 0);
      for (let y = 918; y < V.y1; y += 34) g.line([V.x0 - 20, y, V.x1 + 20, y], '#c7c288', 4);
      fists(g, s, sd => tPos(s, sd, i => [hx(i), 432]), { sleeve: '#e07a5f' });
    },
    hit(g, s, k) {
      const x = 500 + sgn(tSide(s, k - 1)) * 110;
      g.fx.burst(x, 430, { n: 14, c: ['#ffffff', '#f3ead6'], shape: 'square', sp: [200, 520], size: [8, 16], g: 900, drag: 0.95, life: [0.5, 0.9] });
      g.fx.lines(x, 430, { n: 10, r0: 70, r1: 170, w: 9, c: '#ffffff' });
      g.fx.pop(k === 1 ? 'ボスッ' : 'ズボッ', 1000 - x, 250, { size: 100 });
      g.fx.shake(k === 1 ? 6 : 9, 0.12);
      if (k === 2) g.fx.pop('ひょこっ', 500 + sgn(tSide(s, 0)) * 110, 640, { size: 70, c: '#ffd9a0', life: 0.9, rise: 30 });
    },
  },

  /* ---------- 風船・水風船・しゃぼん玉（左右に1つずつ） ---------- */
  {
    id: 'punch-pop', acts: ['punch'], modes: ['one', 'alt'], sfx: (k, v) => v.sfx, vars: POPS,
    init(s) { s.my.mini = Array.from({ length: 8 }, () => ({ x: 60 + s.r() * 880, y: s.r() * 900, r: 14 + s.r() * 22, v: 40 + s.r() * 50 })); },
    draw(g, s, v) {
      const V = g.V, W = V.x1 - V.x0 + 40;
      if (v.kind === 0) {
        g.bg('#dff5ee'); g.dots(V.x0, Math.max(V.y0, -300), V.x1 - V.x0, 900 - Math.max(V.y0, -300), 150, 12, '#ffffff');
        g.curve([V.x0 - 40, 40, 250, 110, 500, 120, 750, 110, V.x1 + 40, 40], C.ol, 5);
        for (let x = Math.ceil(V.x0 / 90) * 90; x < V.x1; x += 90) { const y = 40 + 80 * (1 - Math.pow((x - 500) / 620, 2)); g.tri(x - 30, y - 4, x + 30, y - 4, x, y + 52, [C.yellow, C.pink, C.blue, C.orange][((x / 90) % 4 + 4) % 4], 5); }
        g.band(880, 'bottom', '#f4c28a', 7); for (let x = Math.floor(V.x0 / 200) * 200; x < V.x1; x += 200) g.line([x, 880, x - 80, V.y1 + 20], '#dda56c', 5);
        // プレゼント箱（ひもの先）
        g.rr(440, 790, 120, 96, 8, C.purple); g.rect(488, 790, 24, 96, C.yellow, 0); g.rr(430, 776, 140, 30, 8, sh(C.purple, 0.15)); g.rect(488, 776, 24, 30, C.yellow, 0);
        g.rr(430, 776, 140, 30, 8, null); g.rr(440, 790, 120, 96, 8, null);
      } else if (v.kind === 1) {
        g.sky('#5cc3ff', '#d2f1ff', 640); g.sun(860, 70, 70);
        g.band(600, 'bottom', '#79c95a', 7);
        for (let y = 640, h = 30; y < V.y1; y += h * 2, h *= 1.3) g.band(y, y + h, '#86d466');
        for (let x = Math.floor(V.x0 / 110) * 110; x < V.x1 + 60; x += 110) g.circ(x, 600, 70, '#3f9e4a', 0);
        g.band(600, 640, '#79c95a');
        for (const px of [110, 890]) { g.rr(px - 12, 170, 24, 560, 8, '#9a6a3f'); g.shadow(px, 730, 40, 10); }
        g.curve([110, 200, 300, 236, 500, 246, 700, 236, 890, 200], '#ffffff', 6);
        for (let i = 0; i < 2; i++) { const x = 500 + sgn(tSide(s, i)) * POP_DX, pt = s.k > i; if (!pt) continue; const a = i === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age; g.ell(x, 720, 120 * E.outQ(clamp(a / 0.3)), 26 * E.outQ(clamp(a / 0.3)), 'rgba(60,140,200,0.35)', 0); }
        if (s.k === 2) g.alpha(0.75 * E.outQ(clamp(s.age / 0.25)), () => { const cs = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple]; cs.forEach((c, i) => g.arc(500, 720, 470 - i * 22, PI + 0.15, -0.15, c, 22)); });
      } else {
        g.sky('#56b6f5', '#c7ecff', 640);
        g.cloud(190, 150, 0.8); g.cloud(820, 90, 0.6);
        for (let x = Math.floor(V.x0 / 140) * 140; x < V.x1 + 80; x += 140) { g.circ(x, 560, 90, '#4fae5a', 0); g.circ(x + 70, 590, 70, '#3f9a4c', 0); }
        g.band(610, 'bottom', '#8fd66b', 7);
        g.grassTufts(700, '#79c255', 4, 8); g.grassTufts(860, '#79c255', 9, 7);
        for (const m of s.my.mini) { const y = ((m.y - s.t * m.v) % 1000 + 1000) % 1000 - 100; bubbleDraw(g, m.x, y, m.r, 1); }
      }
      // 2つの的
      for (let i = 0; i < 2; i++) {
        const [x, y] = popPos(s, v, i), alive = s.k <= i;
        if (v.kind === 0) {
          const a = alive ? 0 : (i === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age), top = alive ? y + 118 : lerp(y + 118, 800, E.outQ(clamp(a / 0.35)));
          g.curve([x, top, lerp(x, 500, 0.5) + (alive ? 0 : 20), lerp(top, 790, 0.5), 500 + sgn(tSide(s, i)) * 20, 790], C.ol, 4);
          if (alive) { const c = v.cols[i]; g.tri(x - 14, y + 120, x + 14, y + 120, x, y + 102, sh(c, -0.15), 5); g.ell(x, y, 94, 110, c); g.hl(x - 36, y - 46, 20, 34, -0.5, 0.55); g.ell(x + 34, y + 44, 26, 40, 'rgba(0,0,0,0.08)', 0, -0.5); }
        } else if (v.kind === 1) {
          g.line([x, 238, x, 270], C.ol, 4);
          if (alive) { const c = v.cols[i]; g.at(x, y, () => { g.blob([0, -128, 46, -96, 80, -10, 70, 66, 0, 96, -70, 66, -80, -10, -46, -96], c); g.circ(0, -128, 10, sh(c, -0.2), 4); g.hl(-30, -40, 16, 30, -0.4, 0.55); g.ell(26, 44, 20, 26, 'rgba(255,255,255,0.25)', 0); }); }
        } else if (alive) bubbleDraw(g, x, y, 96);
      }
      fists(g, s, sd => tPos(s, sd, i => popPos(s, v, i)), { sleeve: v.kind === 0 ? '#ff7a59' : v.kind === 1 ? '#2fb5a3' : '#ffb13b' });
    },
    hit(g, s, k, v) {
      const [x, y] = popPos(s, v, k - 1), big = k === 2, px = 1000 - x;
      if (v.kind === 0) {
        g.fx.burst(x, y, { n: 12, c: [v.cols[k - 1], sh(v.cols[k - 1], -0.2)], shape: 'chip', sp: [300, 700], size: [10, 18], g: 1400 });
        g.fx.ring(x, y, { r1: 200, w: 14 }); g.fx.lines(x, y, { n: 12, r0: 110, r1: 230 });
        g.fx.pop(big ? 'パパーン！' : 'パーン', big ? 500 : px, 210, { size: big ? 120 : 100 });
        if (big) { g.fx.confetti(56); g.fx.stars(x, y, 6); }
      } else if (v.kind === 1) {
        g.fx.splash(x, y, v.cols[k - 1], 14); g.fx.splash(x, y, '#5fd0ff', big ? 22 : 12);
        g.fx.burst(x, y, { n: 8, c: ['#ffffff', '#bfefff'], shape: 'drop', sp: [200, 500], size: [10, 18], g: 1500, dir: PI / 2, spread: 2.4 });
        g.fx.pop(big ? 'バッシャーン' : 'バシャッ', big ? 500 : px, 200, { size: big ? 104 : 100, c: '#e2f7ff' });
        if (big) g.fx.stars(500, 330, 6, ['#ffffff', C.yellow, '#bfefff']);
      } else {
        g.fx.burst(x, y, { n: 16, c: ['#ffffff', '#d9f6ff', '#ffe0f4'], shape: 'dot', sp: [200, 520], size: [6, 12], g: 600, ol: 0 });
        g.fx.ring(x, y, { r0: 80, r1: 170, w: 8, c: '#ffffff', life: 0.3 });
        g.fx.pop(big ? 'パチーン！' : 'パチン', big ? 500 : px, 210, { size: big ? 110 : 96 });
        if (big) g.fx.burst(x, y, { n: 14, c: ['rgba(255,255,255,0.35)'], shape: 'dot', sp: [150, 420], size: [26, 50], g: -150, drag: 0.96, life: [0.7, 1.2] });
      }
      g.fx.shake(big ? 9 : 6, 0.12);
    },
  },

  /* ---------- 缶タワー・積み木をくずす（1回目で上、2回目で全部） ---------- */
  {
    id: 'punch-tower', acts: ['punch'], modes: ['one', 'alt', 'both'], sfx: (k, v) => v.k === 'cans' ? 'clang' : 'wood', vars: TOWERS,
    init(s, v) {
      const r = s.r; s.my.P = towerPieces(v);
      for (const p of s.my.P) { const hy = v.hy[p.grp]; p.vx = (p.x - 500) * 4.4 + (r() - 0.5) * 360; p.vy = -(420 + r() * 420) + (p.y - hy) * 1.3; p.w = (r() - 0.5) * 15; }
    },
    draw(g, s, v) {
      const V = g.V, W = V.x1 - V.x0 + 40;
      if (v.k === 'cans') {
        g.bg('#211a4d', '#3b2366');
        for (let x = Math.floor(V.x0 / 190) * 190 + 30; x < V.x1 + 60; x += 190) {
          g.line([x, 150, x, 196], C.ol, 4); g.glow(x, 236, 90, '#ff9b6b', 0.35);
          g.ell(x, 236, 40, 44, '#e8402f'); g.line([x - 38, 236, x + 38, 236], '#b8261c', 3); g.rr(x - 22, 188, 44, 12, 4, C.ol, 0); g.rr(x - 22, 274, 44, 12, 4, C.ol, 0);
        }
        const sx0 = Math.floor((V.x0 - 20) / 140) * 140;
        g.stripes(sx0, V.y0 - 20, V.x1 + 160 - sx0, 150 - V.y0, 70, '#e8343c', '#ffffff');
        for (let x = sx0; x < V.x1 + 80; x += 70) g.circ(x + 35, 150, 35, (x / 70) % 2 ? '#ffffff' : '#e8343c', 0);
        g.line([V.x0 - 20, 116, V.x1 + 20, 116], 'rgba(0,0,0,0.12)', 14);
        g.rect(V.x0 - 20, 610, W, 30, '#c98a52', 0); g.line([V.x0 - 20, 610, V.x1 + 20, 610], C.ol, 6);
        g.rect(V.x0 - 20, 640, W, 190, '#2f5fb3', 0); for (const y of [672, 736, 800]) g.line([V.x0 - 20, y, V.x1 + 20, y], 'rgba(255,255,255,0.35)', 8);
        g.band(830, 'bottom', '#5b4a3e', 7);
      } else {
        g.bg('#fff2c4');
        g.rr(110, 110, 230, 250, 12, '#ffffff'); g.rect(126, 126, 198, 218, g.lin(0, 126, 0, 344, ['#8fd8ff', '#d9f3ff']), 0); g.cloud(210, 220, 0.4); g.line([225, 126, 225, 344], '#ffffff', 10); g.line([126, 235, 324, 235], '#ffffff', 10); g.rr(110, 110, 230, 250, 12, null);
        g.rr(690, 140, 190, 150, 6, '#ffffff', 5); g.circ(740, 190, 26, '#ffd23f', 4); g.poly([780, 270, 820, 222, 860, 270], '#ff9f1c', 4); g.line([706, 272, 864, 272], '#3cc46b', 6);
        g.band(570, 'bottom', '#e7b77e', 7);
        for (let x = Math.floor(V.x0 / 150) * 150; x < V.x1 + 150; x += 150) g.line([x, 570, 500 + (x - 500) * 2.2, V.y1 + 20], '#d6a168', 4);
        g.ell(500, 640, 360, 74, '#ff9fbd'); g.ell(500, 640, 300, 56, '#ffb8cf', 0); g.ell(500, 640, 360, 74, null, 0);
      }
      g.shadow(500, 612, 190, 14, 0.25);
      for (const p of s.my.P) {
        const on = s.k > p.grp, t = on ? (p.grp === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age) : 0;
        const [dx, dy, rot] = on ? fly(p, t, 2400) : [0, 0, 0], wob = !on && s.k === 1 ? jig(s.age, 0.05, 22, 6) : 0;
        g.at(p.x + dx, p.y + dy, rot + wob, () => towerPiece(g, p));
      }
      const both = s.mode === 'both', ty = v.hy[Math.min(s.k, 1)];
      fists(g, s, sd => [500 + sgn(sd) * (both ? 64 : 22), ty], { sleeve: v.k === 'cans' ? '#ff9f1c' : '#3cc46b' });
    },
    hit(g, s, k, v) {
      const y = v.hy[k - 1];
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 22, y, { n: 10, r0: 80, r1: 190, w: 10 });
      g.fx.pop(k === 1 ? (v.k === 'cans' ? 'ガシャン' : 'コトン') : 'ガラガラ！', k === 1 ? 500 - sgn(s.lastSide) * 280 : 500, k === 1 ? 300 : 170, { size: k === 1 ? 96 : 116, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 1 ? 7 : 12, 0.14);
      if (k === 2) { g.fx.stars(500, 420, 9); g.fx.sparks(500, y, 10); }
    },
  },

  /* ---------- エレベーターを呼ぶ（ドアが開くとペンギン） ---------- */
  {
    id: 'punch-elevator', acts: ['punch'], modes: ['one'], theme: 'town', sfx: ['beep', 'bell'],
    vars: [{ k: 'penguin', name: 'エレベーターを呼ぶ', short: 'エレベーター' }],
    draw(g, s) {
      const V = g.V, open = s.k === 2 ? E.ioQ(clamp((s.age - 0.03) / 0.22)) : 0, lit = s.k >= 1;
      g.mirror(s.side, () => {
        g.bg('#e9e3d8');
        for (let x = Math.floor(V.x0 / 200) * 200; x < V.x1 + 100; x += 200) g.rect(x, V.y0 - 20, 100, 900 - V.y0, '#e1d9ca', 0);
        g.band(870, 'bottom', '#b7ab96', 7);
        for (let x = Math.floor(V.x0 / 170) * 170; x < V.x1 + 170; x += 170) g.line([x, 870, 470 + (x - 470) * 1.8, V.y1 + 20], '#a5997f', 4);
        // かごの中
        g.rect(270, 190, 400, 680, '#f3d7a7', 0);
        for (let x = 320; x < 670; x += 100) g.line([x, 190, x, 800], '#e6c48f', 5);
        g.rect(270, 800, 400, 70, '#c9a074', 0); g.rect(270, 610, 400, 14, '#c3ccd9', 0);
        g.glow(470, 200, 260, '#fff6d0', 0.7);
        penguin(g, 470, 700, s.k === 2 ? -2.0 + 0.45 * Math.sin(s.t * 16) : 0);
        g.clipRR(270, 190, 400, 680, 0, () => {
          for (const d of [-1, 1]) { const x0 = d < 0 ? 270 - 198 * open : 470 + 198 * open; g.rect(x0, 190, 200, 680, g.lin(x0, 0, x0 + 200, 0, ['#bcc6d4', '#eef2f7', '#aeb9c8']), 5); g.line([x0 + 34, 220, x0 + 34, 840], 'rgba(255,255,255,0.65)', 7); }
        });
        g.rect(246, 168, 448, 24, '#98a3b5'); g.rect(246, 168, 24, 702, '#98a3b5'); g.rect(670, 168, 24, 702, '#98a3b5');
        g.rr(398, 62, 144, 84, 14, '#262a40');
        g.tri(420, 92, 452, 92, 436, 120, lit ? '#ffb347' : '#4a4f6a', 0);
        // 呼びボタン
        g.rr(772, 384, 86, 172, 18, '#c3ccd9'); g.rr(782, 394, 66, 152, 12, '#dfe5ee', 0);
        if (lit) g.glow(815, 470, 84, '#ffb347', 0.75);
        g.circ(815, 470, 31, lit ? '#ffb347' : '#f4f6fa'); g.tri(801, 460, 829, 460, 815, 484, lit ? '#ffffff' : '#9aa5b6', 0);
        fists(g, s, () => [815, 470], { hand: 'point', side: 'R', sleeve: '#5b6cd8' });
      });
      const n = s.k === 0 ? 5 : s.k === 2 ? 1 : Math.max(2, 5 - Math.floor(s.age / (s.spr * 0.72) * 4));
      g.text(String(n), g.mx(s.side, 500), 106, { size: 62, f: lit ? '#ffb347' : '#8e93ad' });
    },
    hit(g, s, k) {
      const bx = g.mx(s.lastSide, 815);
      g.fx.ring(bx, 470, { r0: 30, r1: 130, w: 10, c: '#ffd08a' });
      if (k === 1) { g.fx.pop('ピッ', bx, 320, { size: 84 }); g.fx.shake(4, 0.08); }
      else { g.fx.pop('チン！', g.mx(s.lastSide, 470), 300, { size: 104, c: C.yellow }); g.fx.stars(g.mx(s.lastSide, 470), 520, 8); }
    },
  },

  /* ---------- 自販機のボタン（缶が落ちる・2回目はあたり） ---------- */
  {
    id: 'punch-vending', acts: ['punch'], modes: ['one', 'alt'], theme: 'town', sfx: 'beep',
    vars: [{ k: 'vending', name: '自販機のボタン', short: '自販機' }],
    init(s) { s.my.drop = [0, 0]; s.my.win = 0; },
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, bx = i => VEND_X[tSide(s, i) === 'L' ? 0 : 2], dc = i => DRINKS[tSide(s, i) === 'L' ? 3 : 5][1];
      g.bg('#1c2152', '#2f3b7a');
      g.glow(840, 70, 120, '#fff4c2', 0.35); g.circ(840, 70, 42, '#fff4c2', 0);
      g.rect(V.x0 - 20, 360, W, 520, '#5d627d', 0);
      for (let y = 434; y < 880; y += 74) g.line([V.x0 - 20, y, V.x1 + 20, y], '#4e536c', 4);
      g.line([V.x0 - 20, 360, V.x1 + 20, 360], C.ol, 6);
      g.band(880, 'bottom', '#34374a', 7);
      g.glow(500, 520, 580, '#dff3ff', 0.3);
      g.rr(738, 752, 96, 136, 14, '#3a86ff'); g.ell(786, 772, 30, 12, '#1d4fa8', 0);
      g.shadow(500, 894, 250, 16);
      // 本体
      g.rr(290, 118, 420, 772, 28, '#e8434f');
      g.rr(304, 132, 392, 42, 12, '#ffffff', 0); g.text('つめた〜い', 500, 154, { size: 28, f: '#3a86ff' });
      g.rr(318, 186, 364, 300, 16, '#e3f4ff');
      for (let i = 0; i < 6; i++) drink(g, VEND_X[i % 3], i < 3 ? 296 : 436, DRINKS[i][0], DRINKS[i][1]);
      g.poly([330, 470, 420, 196, 470, 196, 380, 470], 'rgba(255,255,255,0.35)', 0);
      for (let i = 0; i < 6; i++) {
        const x = VEND_X[i % 3], y = i < 3 ? 316 : 456;
        let on = false, cue = false;
        for (const j of [0, 1]) if (i === (tSide(s, j) === 'L' ? 3 : 5)) { on = s.k > j; cue = s.k === j; }
        if (cue) g.glow(x, y, 46, '#7dffb0', 0.35 + 0.25 * Math.sin(s.t * 12));
        g.rr(x - 26, y - 12, 52, 24, 9, on ? '#7dffb0' : '#eef2f7');
      }
      g.rr(318, 500, 364, 370, 16, '#d6343f', 0);
      g.rr(388, 522, 224, 66, 12, '#12090f');
      for (let j = 0; j < 4; j++) {
        let d = '8', c = '#3a1d24';
        if (s.k > 0) { const spin = s.k === 1 ? 0.3 : 0.1; c = '#ff4a4a'; d = s.age < spin + j * 0.04 ? String(Math.floor(s.t * 31 + j * 3.3) % 10) : (s.k === 2 || j < 3 ? '7' : '3'); if (s.k === 2 && s.age > 0.26) c = Math.floor(s.age * 10) % 2 ? '#ffe066' : '#ff4a4a'; }
        g.text(d, 418 + j * 55, 557, { size: 50, f: c });
      }
      g.rr(632, 618, 22, 66, 8, '#2b2140'); g.rr(622, 700, 42, 28, 9, '#c3ccd9');
      g.rr(338, 742, 324, 112, 18, '#1e1a24');
      for (let i = 0; i < 2; i++) {
        if (s.k <= i) continue;
        const a = i === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age; if (a < 0.12) continue;
        if (!s.my.drop[i]) { s.my.drop[i] = 1; g.sfx('thud'); g.fx.pop('ガコン', 500, 690, { size: 70, life: 0.5, rise: 20 }); }
        const x = 432 + i * 136, y = lerp(768, 812, E.outBounce(clamp((a - 0.12) / 0.2))), c = dc(i);
        g.rr(x - 54, y - 25, 108, 50, 14, c); g.rect(x - 22, y - 25, 30, 50, '#ffffff', 0); g.rr(x - 54, y - 25, 108, 50, 14, null);
      }
      g.rr(342, 746, 316, 58, 12, 'rgba(255,255,255,0.2)', 0); g.line([350, 804, 650, 804], 'rgba(255,255,255,0.35)', 4);
      if (s.k === 2 && s.age > 0.26 && !s.my.win) { s.my.win = 1; g.sfx('coin'); g.fx.pop('あたり！', 500, 660, { size: 112, c: C.yellow }); g.fx.coins(500, 560, 10); g.fx.stars(500, 560, 7); }
      fists(g, s, sd => tPos(s, sd, i => [bx(i), 456]), { hand: 'point', sleeve: '#4f6bff' });
    },
    hit(g, s, k) {
      const x = VEND_X[tSide(s, k - 1) === 'L' ? 0 : 2];
      g.fx.ring(x, 456, { r0: 26, r1: 110, w: 9, c: '#7dffb0' });
      g.fx.pop('ピッ', x < 500 ? 190 : 810, 330, { size: 80 });
      g.fx.shake(4, 0.08);
    },
  },

  /* ---------- インターホンを押す（犬が出てくる） ---------- */
  {
    id: 'punch-intercom', acts: ['punch'], modes: ['one'], theme: 'town', sfx: 'ding',
    vars: [{ k: 'dog', name: 'インターホンを押す', short: 'ピンポン' }],
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, lit = s.k >= 1, open = s.k === 2 ? E.outBack(clamp((s.age - 0.03) / 0.22), 1.2) : 0;
      g.mirror(s.side, () => {
        g.bg('#97d5ff');
        g.rect(V.x0 - 20, 150, W, 760, '#f7e8bf', 0);
        for (let y = 196; y < 900; y += 46) g.line([V.x0 - 20, y, V.x1 + 20, y], '#ead6a3', 4);
        g.rect(V.x0 - 20, 112, W, 44, '#6b4a3a', 0); g.rect(V.x0 - 20, 156, W, 12, 'rgba(0,0,0,0.12)', 0); g.line([V.x0 - 20, 112, V.x1 + 20, 112], C.ol, 6);
        g.band(906, 'bottom', '#c9c1b1', 7);
        for (let x = Math.floor(V.x0 / 140) * 140; x < V.x1 + 140; x += 140) g.line([x, 906, 470 + (x - 470) * 1.6, V.y1 + 20], '#b5ad9c', 4);
        // 植木鉢
        g.ell(176, 760, 60, 80, '#4caf50'); g.ell(140, 800, 40, 52, '#3f9a46'); g.ell(214, 796, 40, 52, '#5cbf5c');
        g.path('M126 806 L226 806 L214 892 L138 892 Z', '#d0683a'); g.rr(118, 798, 116, 22, 8, '#e07a48');
        // 玄関
        g.rr(270, 870, 400, 46, 8, '#d8d0c2');
        g.rr(284, 234, 372, 650, 8, '#7a4a2a');
        g.rect(300, 250, 340, 630, '#3e2c24', 0); g.glow(470, 420, 300, '#ffcf7a', 0.55 * clamp(open * 2));
        if (open > 0.02) shiba(g, 520, 600, 1.15, true, s.t);
        const dw = 340 * (1 - 0.8 * clamp(open));
        g.rr(300, 250, dw, 630, 6, '#b5703f');
        g.rr(300 + dw * 0.14, 530, dw * 0.72, 300, 6, '#a5643a', 4);
        const wx = 300 + dw * 0.3, ww = dw * 0.4;
        g.rr(wx, 318, ww, 156, 10, lit ? '#ffd98a' : '#cfe3ef');
        if (lit && open < 0.05) g.clipRR(wx, 318, ww, 156, 10, () => shiba(g, 470, 430 + jig(s.age, 12, 20, 6), 0.74, false, s.t));
        g.rr(wx, 318, ww, 156, 10, null);
        g.circ(300 + dw * 0.88, 590, 14, '#ffcf5a');
        // ライトとインターホン
        if (lit) g.glow(470, 206, 110, '#fff0a0', 0.7);
        g.rr(446, 186, 48, 40, 10, lit ? '#fff4b8' : '#e9e4d0');
        g.rr(758, 396, 84, 140, 16, '#f2f2f2'); g.circ(800, 430, 13, '#2b2f45'); for (const y of [454, 462]) g.line([782, y, 818, y], '#b9bfcc', 4);
        if (lit) g.glow(800, 498, 62, '#ffb347', 0.7);
        g.circ(800, 498, 24, lit ? '#ffb347' : '#dfe5ee');
        fists(g, s, () => [800, 498], { hand: 'point', side: 'R', sleeve: '#ff7a59' });
      });
    },
    hit(g, s, k) {
      const bx = g.mx(s.lastSide, 800);
      g.fx.ring(bx, 498, { r0: 24, r1: 120, w: 9, c: '#ffd08a' });
      if (k === 1) { g.fx.pop('ピンポーン', g.mx(s.lastSide, 560), 170, { size: 78 }); g.fx.pop('ワン！', g.mx(s.lastSide, 200), 400, { size: 80, c: '#ffd08a', life: 0.8 }); }
      else { g.fx.pop('ワンワン！', g.mx(s.lastSide, 470), 170, { size: 96, c: C.yellow }); g.fx.hearts(g.mx(s.lastSide, 520), 560, 8); }
    },
  },

  /* ---------- ドアをノック（ねこが顔を出す） ---------- */
  {
    id: 'punch-knock', acts: ['punch'], modes: ['one', 'alt'], theme: 'home', sfx: 'knock',
    vars: [{ k: 'cat', name: 'ドアをノック', short: 'ノック' }],
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, open = s.k === 2 ? E.outBack(clamp((s.age - 0.04) / 0.2), 1.4) : 0;
      // ねこは 2回目に打つ腕と反対側から（腕にかくれないように）。図は「左にすき間」で描き、必要なら反転
      const cs = s.mode === 'alt' ? first(s) : other(first(s)), mf = cs === 'R' ? 'L' : 'R';
      const dw = 340 * (1 - 0.44 * clamp(open)), kx = jig(ageOf(s), 6, 30, 10);
      g.bg('#cfe8d8');
      for (let x = Math.floor(V.x0 / 60) * 60; x < V.x1 + 60; x += 60) g.rect(x, V.y0 - 20, 22, 680 - V.y0, '#c3e0cd', 0);
      g.rect(V.x0 - 20, 640, W, 250, '#f4efe4', 0); g.rect(V.x0 - 20, 640, W, 18, '#e2d8c4', 0); g.line([V.x0 - 20, 640, V.x1 + 20, 640], C.ol, 5);
      g.band(886, 'bottom', '#c9925b', 7);
      for (let y = 926; y < V.y1; y += 46) g.line([V.x0 - 20, y, V.x1 + 20, y], '#b57f4b', 4);
      g.mirror(mf, () => {
        g.rr(306, 148, 388, 744, 10, '#fbf8f1');
        g.rect(330, 170, 340, 716, '#3b2a2a', 0); g.glow(380, 560, 260, '#ffcf7a', 0.6 * clamp(open * 2));
        const gx = 670 - dw;
        if (open > 0.02) clipPts(g, [330, 170, gx, 170, gx, 886, 330, 886], () => catHead(g, gx - 62 + 40 * (1 - clamp(open)), 600, 1.3));
        g.at(kx, 0, () => {
          g.rr(gx, 170, dw, 716, 4, '#c88a52');
          for (const [x, y, w, h] of [[0.09, 212, 0.35, 210], [0.56, 212, 0.35, 210], [0.09, 486, 0.35, 340], [0.56, 486, 0.35, 340]]) { g.rr(gx + x * dw, y, w * dw, h, 6, '#b97b45', 4); g.line([gx + 4 + x * dw, y + h - 6, gx - 4 + (x + w) * dw, y + h - 6], '#d9a06a', 5); }
          g.rr(gx + dw * 0.33, 226, dw * 0.34, 56, 14, '#fff6e0', 4);
          g.circ(gx + dw * 0.12, 560, 17, '#ffcf5a'); g.circ(gx + dw * 0.14, 556, 6, '#fff3b0', 0);
        });
      });
      const nx = g.mx(mf, 670 - dw * 0.5) + kx * (mf === 'L' ? -1 : 1);
      g.text('ねこ', nx, 255, { size: 34 * Math.max(0.5, dw / 340), f: '#a0673c' });
      if (s.k >= 1) { g.rect(330, 878, 340, 8, '#ffd98a', 0); g.glow(500, 884, 120, '#ffd98a', 0.5); }
      if (s.k === 1) g.text('？', g.mx(mf, 240) + Math.sin(s.t * 6) * 6, 230, { size: 90, f: '#ffffff', o: 10 });
      fists(g, s, sd => [500 + sgn(sd) * 26, 452], { sleeve: '#8e5cff' });
    },
    hit(g, s, k) {
      const cs = s.mode === 'alt' ? first(s) : other(first(s)), cx = 500 + sgn(cs) * 120;
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 26, 452, { n: 8, r0: 70, r1: 160, w: 9 });
      g.fx.pop('コンコン', 500 - sgn(s.lastSide) * 250, 320, { size: 88 });
      g.fx.shake(5, 0.1);
      if (k === 2) { g.fx.pop('ニャー', 500 + sgn(cs) * 250, 420, { size: 88, c: '#ffe27a', life: 0.9 }); g.fx.hearts(cx, 560, 6); }
    },
  },

  /* ---------- パンチングマシン（点数が上がる） ---------- */
  {
    id: 'punch-machine', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'game', sfx: ['punch', 'punch'],
    vars: [{ k: 'arcade', name: 'パンチングマシン', short: 'パンチ力' }],
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, a = ageOf(s);
      g.bg('#1b1446', '#2a1d5e');
      for (const [y, c] of [[120, '#ff4fa3'], [760, '#2ee6ff']]) { g.curve([V.x0 - 20, y, 150, y + 40, 300, y - 30, 700, y + 30, 850, y - 40, V.x1 + 20, y], g.rgba(c, 0.3), 26); g.curve([V.x0 - 20, y, 150, y + 40, 300, y - 30, 700, y + 30, 850, y - 40, V.x1 + 20, y], c, 6); }
      for (const x of [140, 860]) { g.rr(x - 110, 260, 220, 640, 20, '#241b55'); g.rr(x - 86, 300, 172, 130, 10, '#3f3a8f', 0); g.glow(x, 365, 120, '#2ee6ff', 0.25); }
      g.tiles(V.x0 - 20, 880, W, V.y1 - 860, 60, '#2a2160', '#382c80'); g.line([V.x0 - 20, 880, V.x1 + 20, 880], C.ol, 6);
      // 本体
      g.shadow(500, 900, 230, 16, 0.4);
      g.rr(306, 20, 388, 890, 34, '#3d31a0'); g.rr(306, 20, 30, 890, 15, '#ff4fa3', 0); g.rr(664, 20, 30, 890, 15, '#ff4fa3', 0); g.rr(306, 20, 388, 890, 34, null);
      g.rr(338, 48, 324, 176, 20, '#0d0b1f');
      g.text('パンチ力', 500, 78, { size: 30, f: '#c4a6ff' });
      const sc = s.k === 0 ? 0 : s.k === 1 ? 136 * E.outQ(clamp(a / 0.55)) : 136 + 152 * E.outQ(clamp(a / 0.28));
      g.glow(500, 150, 160, '#ff6a3d', 0.25 + (s.k ? 0.2 : 0));
      g.text(String(Math.round(sc)).padStart(3, '0'), 500, 152, { size: 104, f: s.k === 2 && a > 0.28 && Math.floor(a * 10) % 2 ? '#ffe066' : '#ff6a3d' });
      for (let i = 0; i < 12; i++) { const on = sc / 288 * 12 > i; g.rr(352 + i * 25, 236, 19, 30, 5, on ? (i < 5 ? '#3cff8f' : i < 9 ? '#ffe066' : '#ff4a4a') : '#2a2160', 0); }
      // パッド（当たると後ろに倒れる）
      const th = a < 0.06 ? 1.25 * a / 0.06 : 1.25 * (1 - E.ioQ(clamp((a - 0.06) / 0.5)));
      g.rr(484, 276, 32, 56, 10, '#9aa5b6');
      g.at(500, 312, 0, 1, Math.max(0.2, Math.cos(th)), () => g.at(0, 120, () => {
        g.circ(0, 0, 112, '#e8343c'); g.ring(0, 0, 76, '#ffffff', 14); g.circ(0, 0, 32, '#ffffff', 0); g.circ(0, 0, 112, null); g.hl(-44, -50, 30, 16, -0.6, 0.45);
      }));
      g.rr(352, 770, 296, 110, 20, '#2a2170'); g.circ(430, 826, 26, '#3cff8f'); g.circ(510, 826, 26, '#ffe066'); g.rr(590, 798, 22, 56, 8, '#0d0b1f');
      if (s.k === 2 && a > 0.28) { g.rr(362, 560, 276, 90, 20, '#ffe066'); g.text('しんきろく！', 500, 606, { size: 52, f: '#e8343c' }); }
      const both = s.mode === 'both';
      fists(g, s, sd => [500 + sgn(sd) * (both ? 60 : 22), 430], { hand: 'glove', glove: '#2ec4b6', sleeve: '#2b2f45' });
    },
    hit(g, s, k) {
      for (const sd of hitSides(s)) { g.fx.lines(500 + sgn(sd) * 22, 430, { n: 12, r0: 110, r1: 240, w: 12, c: '#ffe066' }); }
      g.fx.ring(500, 430, { r1: 260, c: '#ff4fa3' }); g.fx.shake(k === 2 ? 13 : 9, 0.15);
      g.fx.pop(k === 1 ? 'ドン！' : 'ドドーン！', 500 - sgn(s.lastSide) * (k === 1 ? 270 : 220), 340, { size: k === 1 ? 96 : 112, c: '#ffffff' });
      if (k === 2) { g.fx.confetti(70); g.fx.stars(500, 200, 8); g.sfx('cheer'); }
    },
  },

  /* ---------- ろうそくの火を消す（拳の風で） ---------- */
  {
    id: 'punch-candle', acts: ['punch'], modes: ['one', 'alt'], theme: 'party', sfx: 'whoosh',
    vars: [{ k: 'cake', name: 'ろうそくを消す', short: 'ろうそく' }],
    draw(g, s) {
      const V = g.V, on = s.k === 2 ? E.outQ(clamp((s.age - 0.06) / 0.2)) : 0;
      const outAge = c => { const sd = c < 3 ? 'L' : 'R'; if (s.k >= 1 && sd === tSide(s, 0)) return s.k === 1 ? s.age : s.age + s.spr; if (s.k >= 2 && sd === tSide(s, 1)) return s.age; return -1; };
      g.bg(g.mix('#2c2350', '#ffe1ea', on));
      g.dots(V.x0, Math.max(V.y0, -200), V.x1 - V.x0, 700 - Math.max(V.y0, -200), 170, 10, g.rgba('#ffffff', 0.06 + 0.3 * on));
      g.curve([V.x0 - 20, 60, 250, 130, 500, 140, 750, 130, V.x1 + 20, 60], C.ol, 4);
      for (let x = Math.ceil(V.x0 / 80) * 80; x < V.x1; x += 80) { const y = 62 + 78 * (1 - Math.pow((x - 500) / 640, 2)), c = [C.yellow, C.pink, C.mint, C.orange][((x / 80) % 4 + 4) % 4]; if (x > -100 && x < 1100) g.glow(x, y + 18, 36, c, 0.6 * (1 - on)); g.ell(x, y + 18, 10, 14, c, 4); }
      g.band(700, 'bottom', g.mix('#5e3a6e', '#ff9fbd', on), 7);
      g.dots(V.x0, 740, V.x1 - V.x0, Math.min(V.y1, 1200) - 740, 140, 9, g.rgba('#ffffff', 0.2 + 0.3 * on));
      let lit = 0; for (let c = 0; c < 6; c++) if (outAge(c) < 0) lit++;
      g.glow(500, 380, 360, '#ffcf6a', 0.07 * lit * (1 - on));
      g.ell(500, 708, 272, 36, '#ffffff');
      cakeTier(g, 290, 548, 420, 160, DRIP1);
      for (const x of [316, 684]) { g.ell(x, 552, 22, 26, '#ee3a33', 5); g.tri(x - 14, 530, x + 14, 530, x, 540, '#3cc46b', 0); }
      cakeTier(g, 358, 444, 284, 112, DRIP2);
      for (let c = 0; c < 6; c++) {
        const x = CANDLE_X[c], a = outAge(c);
        g.rr(x - 9, 372, 18, 78, 6, CANDLE_C[c]); g.line([x - 8, 394, x + 8, 384], '#ffffff', 4); g.line([x - 8, 420, x + 8, 410], '#ffffff', 4);
        g.line([x, 372, x, 358], C.ol, 4);
        if (a < 0) flame(g, x, 360, s.t);
        else if (a < 1) g.alpha(1 - a, () => g.curve([x, 354, x + 10 * Math.sin(a * 9), 330 - a * 50, x - 8, 300 - a * 110], '#d9d4e8', 7));
      }
      fists(g, s, sd => tPos(s, sd, i => [500 + sgn(tSide(s, i)) * 92, 486]), { s0: 0.95, sleeve: '#ff5fa2' });
    },
    hit(g, s, k) {
      const x = 500 + sgn(tSide(s, k - 1)) * 92;
      g.fx.lines(x, 470, { n: 9, r0: 80, r1: 250, a0: -PI / 2 - 0.7, arc: 1.4, w: 10, c: '#ffffff' });
      g.fx.smoke(x, 340, 4, '#d9d4e8');
      if (k === 1) g.fx.pop('フッ', 1000 - x, 300, { size: 100 });
      else { g.fx.confetti(56); g.fx.pop('おめでとう！', 500, 210, { size: 100, c: C.yellow, life: 1 }); g.fx.stars(500, 330, 8); g.sfx('cheer'); }
      g.fx.shake(5, 0.1);
    },
  },

  /* ---------- だるま（目が入る）・起き上がりこぼし（ゆれて起きる） ---------- */
  {
    id: 'punch-roly', acts: ['punch'], modes: ['one', 'alt', 'both'], sfx: (k, v) => v.k === 'daruma' ? (k === 1 ? 'thud' : 'taiko') : 'boing', vars: ROLY,
    draw(g, s, v) {
      const V = g.V, W = V.x1 - V.x0 + 40, a = ageOf(s), dir = s.lastSide === 'L' ? 1 : s.lastSide === 'R' ? -1 : (s.k === 1 ? -1 : 1);
      const tilt = jig(a, (s.k === 2 ? 0.4 : 0.28) * dir, 8.5, 2.4), dar = v.k === 'daruma', by = dar ? 704 : 736;
      if (dar) {
        g.bg('#f6e2bf');
        for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + 0.1; g.poly([500, 470, 500 + Math.cos(an) * 1400, 470 + Math.sin(an) * 1400, 500 + Math.cos(an + 0.2) * 1400, 470 + Math.sin(an + 0.2) * 1400], 'rgba(255,190,110,0.22)', 0); }
        g.circ(500, 470, 330, '#ffd79a', 0);
        g.band(760, 'bottom', '#b9773f', 7); for (let y = 800; y < V.y1; y += 44) g.line([V.x0 - 20, y, V.x1 + 20, y], '#a4672f', 4);
        for (const x of [130, 870]) g.at(x, 760, 0, 0.36, 0.36, () => darumaDraw(g, { k: 2, age: 9, spr: 1 }));
        g.rr(276, 700, 448, 64, 10, '#7a4a2a'); g.ell(500, 704, 228, 26, '#8e5cff');
      } else {
        g.bg('#e2f1ff');
        for (const [x, y, sc] of [[150, 150, 0.6], [830, 110, 0.5], [700, 330, 0.35], [250, 390, 0.4]]) g.cloud(x, y, sc, '#ffffff');
        g.band(700, 'bottom', '#e3b47c', 7); for (let x = Math.floor(V.x0 / 140) * 140; x < V.x1 + 140; x += 140) g.line([x, 700, 500 + (x - 500) * 2, V.y1 + 20], '#d29f66', 4);
        g.ell(500, 744, 310, 56, '#a8e0c0'); g.ell(500, 744, 246, 40, '#c4ecd4', 0);
        g.circ(140, 760, 50, '#ff5a5f'); g.arc(140, 760, 50, -1.2, 1.2, '#ffffff', 8); g.circ(140, 760, 50, null);
        g.rr(800, 690, 100, 100, 12, '#3a86ff'); g.text('あ', 850, 744, { size: 60, f: '#ffffff', o: 8 });
      }
      g.shadow(500 + tilt * 90, by + 8, 180, 22);
      g.at(500, by, tilt, () => dar ? darumaDraw(g, s) : koboshiDraw(g, s));
      const both = s.mode === 'both', ty = dar ? 562 : 622;
      fists(g, s, sd => [500 + sgn(sd) * (both ? 64 : 24), ty], { sleeve: dar ? '#3a5bd9' : '#ff7a59' });
    },
    hit(g, s, k, v) {
      const dar = v.k === 'daruma', ty = dar ? 562 : 622;
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 24, ty, { n: 10, r0: 80, r1: 190, w: 10 });
      g.fx.shake(k === 2 ? 9 : 6, 0.12);
      if (dar) {
        if (k === 1) { g.fx.pop('ポコッ', 500 - sgn(s.lastSide) * 290, 360, { size: 96 }); g.fx.stars(550, 424, 5); }
        else { g.fx.pop('めでたい！', 500, 170, { size: 110, c: C.gold }); g.fx.stars(450, 424, 8); g.fx.coins(500, 300, 10); }
      } else if (k === 1) { g.fx.pop('ハッ！', 500 - sgn(s.lastSide) * 290, 330, { size: 96 }); g.fx.burst(536, 560, { n: 10, c: ['#ffffff', '#c8ebff'], shape: 'dot', sp: [150, 400], size: [6, 12], g: 600, ol: 0 }); }
      else { g.fx.pop('ボヨヨン', 500, 200, { size: 104, c: C.yellow }); g.fx.stars(500, 360, 8); g.fx.hearts(500, 420, 5); }
    },
  },

  /* ---------- ミット打ち（トレーナーが持つミットを打つ） ---------- */
  {
    id: 'punch-mitt', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'sports', sfx: 'smack',
    vars: [{ k: 'mitt', name: 'ミット打ち', short: 'ミット' }],
    draw(g, s) {
      const V = g.V, both = s.mode === 'both', win = s.k === 2 ? E.outBack(clamp(s.age / 0.14)) : 0;
      g.bg('#22445c', '#2f5a76');
      for (const [x, c] of [[150, '#ff5a5f'], [850, '#ffd23f']]) { g.rr(x - 80, 110, 160, 210, 8, c); g.rr(x - 64, 126, 128, 100, 6, 'rgba(255,255,255,0.35)', 0); for (const y of [254, 282]) g.line([x - 56, y, x + 56, y], 'rgba(0,0,0,0.25)', 8); }
      g.band(700, 'bottom', '#d8d2c4', 7); g.band(700, 730, '#c9c1b0');
      for (const [y, c] of [[560, '#e8343c'], [606, '#ffffff'], [652, '#3a86ff']]) g.line([V.x0 - 20, y, V.x1 + 20, y], c, 12);
      // トレーナー
      g.rr(368, 470, 264, 600, 110, '#2b2f45'); g.text('コーチ', 500, 640, { size: 40, f: '#ffd23f' });
      g.rr(472, 360, 56, 120, 20, C.skin2);
      g.circ(500, 300, 68, C.skin);
      g.path('M432 296 Q430 228 500 224 Q570 228 568 296 Q540 262 500 262 Q460 262 432 296 Z', '#3a2a2a');
      g.rr(432, 262, 136, 22, 10, '#e8343c', 5);
      if (s.k === 2) { g.arc(472, 306, 11, PI + 0.4, -0.4, C.ol, 6); g.arc(528, 306, 11, PI + 0.4, -0.4, C.ol, 6); g.path('M470 330 Q500 370 530 330 Z', '#ff6b6b'); }
      else { g.circ(474, 304, 7, C.ol, 0); g.circ(526, 304, 7, C.ol, 0); g.arc(500, 326, 16, 0.4, PI - 0.4, C.ol, 5); }
      for (const sd of ['L', 'R']) { const [mx, my] = MITT[sd]; g.taper(500 + sgn(sd) * 112, 560, mx + sgn(sd) * 8, my + 80 - 60 * win, 44, 36, C.skin2); }
      for (const sd of ['L', 'R']) {
        let a = 9;
        for (const j of [0, 1]) if (s.k > j && (both || tSide(s, j) === sd)) a = j === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age;
        const [mx, my] = MITT[sd], rec = a < 1 ? Math.exp(-9 * a) * Math.sin(Math.min(1, a / 0.05) * PI / 2) : 0;
        mitt(g, mx + sgn(sd) * 18 * rec, my - 60 * win - 12 * rec, sgn(sd) * (-0.22 + 0.22 * rec), 1 - 0.1 * rec);
      }
      for (let i = 0; i < 2; i++) { const on = s.k > i, a = i === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age, k = on ? E.outBack(clamp(a / 0.18), 2.5) : 1; g.at(440 + i * 120, 100, 0, k, k, () => g.star(0, 0, 42, 19, 5, on ? C.gold : 'rgba(255,255,255,0.16)', 6)); }
      fists(g, s, sd => both ? MITT[sd] : tPos(s, sd, i => MITT[tSide(s, i)]), { hand: 'glove', glove: '#3a86ff', sleeve: '#2b2f45' });
    },
    hit(g, s, k) {
      const sides = s.mode === 'both' ? ['L', 'R'] : [tSide(s, k - 1)];
      for (const sd of sides) { const [x, y] = MITT[sd]; g.fx.lines(x, y, { n: 10, r0: 80, r1: 180, w: 10, c: '#ffe066' }); }
      if (k === 1) g.fx.pop(s.mode === 'both' ? 'パパン' : 'パン！', s.mode === 'both' ? 500 : 1000 - MITT[sides[0]][0], 230, { size: 92 });
      else { g.fx.pop('ナイス！', 500, 200, { size: 110, c: C.yellow }); g.fx.stars(560, 100, 8); }
      g.fx.shake(6, 0.1);
    },
  },

  /* ---------- ピザ生地をパンチ（2回目でピザになる） ---------- */
  {
    id: 'punch-dough', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'kitchen', sfx: ['mochi', 'squish'],
    vars: [{ k: 'pizza', name: 'ピザ生地をパンチ', short: 'ピザ生地' }],
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40;
      g.bg('#fbfbf7'); g.grid(V.x0 - 20, V.y0 - 20, W, 560 - V.y0, 80, '#d5ece4', 5);
      g.rect(V.x0 - 20, 250, W, 18, '#c98a52', 0); g.line([V.x0 - 20, 268, V.x1 + 20, 268], C.ol, 4);
      for (const [x, c, h] of [[150, '#e8432f', 110], [250, '#3cc46b', 80], [760, '#ffd23f', 96], [860, '#f2f2f2', 120]]) { g.rr(x - 38, 250 - h, 76, h, 12, c); g.rr(x - 30, 250 - h - 14, 60, 18, 6, '#a0673c'); }
      g.band(540, 'bottom', '#d39457', 7); g.rect(V.x0 - 20, 540, W, 16, '#e7b47a', 0);
      g.rr(210, 566, 580, 234, 36, '#e9c08a');
      for (const [x, y, r] of [[300, 620, 40], [700, 760, 50], [640, 600, 30], [330, 750, 36]]) g.ell(x, y, r * 1.6, r * 0.5, 'rgba(255,255,255,0.55)', 0);
      g.at(880, 690, -0.55, () => { g.rr(-110, -24, 220, 48, 24, '#efc690'); g.rr(-172, -12, 70, 24, 12, '#c98a52'); g.rr(102, -12, 70, 24, 12, '#c98a52'); });
      g.circ(126, 650, 44, '#e8432f'); g.circ(190, 700, 38, '#ff5a3c'); g.star(126, 612, 16, 7, 5, '#3cc46b', 0); g.star(190, 668, 14, 6, 5, '#3cc46b', 0);
      const a1 = s.k === 1 ? s.age : s.k === 2 ? s.age + s.spr : -1, a2 = s.k === 2 ? s.age : -1;
      const f1 = a1 < 0 ? 0 : E.outBack(clamp(a1 / 0.12), 2), f2 = a2 < 0 ? 0 : E.outBack(clamp(a2 / 0.12), 1.6);
      const rx = lerp(lerp(190, 228, f1), 262, f2), ry = lerp(lerp(108, 84, f1), 68, f2), cy = lerp(lerp(640, 654, f1), 676, f2);
      g.shadow(500, cy + ry * 0.55, rx * 1.02, ry * 0.42, 0.2);
      if (a2 < 0.04) {
        g.ell(500, cy, rx, ry, '#f8e8c8'); g.hl(430, cy - ry * 0.5, rx * 0.34, ry * 0.16, -0.2, 0.6);
        if (s.k >= 1) { const dy = cy - ry * 0.2; g.ell(500, dy, 74, 30, '#ead2a4', 0); for (let i = 0; i < 4; i++) g.ell(458 + i * 28, dy - 6, 12, 9, '#dcc08f', 0); }
        g.circ(380, cy + 10, 4, '#e6cfa3', 0); g.circ(610, cy - 6, 3, '#e6cfa3', 0);
      } else {
        g.ell(500, cy, rx, ry, '#e8b066'); g.ell(500, cy - 3, rx - 26, ry - 14, '#e8432f', 0);
        TOPS.forEach(([x, y, k], i) => {
          const q = E.outBack(clamp((a2 - 0.05 - i * 0.012) / 0.1), 2.2); if (q <= 0) return;
          g.at(500 + x, cy - 3 + y * (ry / 68), 0, q, q * 0.8, () => {
            if (k === 's') { g.circ(0, 0, 25, '#c8423a', 4); g.circ(-8, -6, 4, '#ffb3a0', 0); g.circ(8, 4, 4, '#ffb3a0', 0); }
            else if (k === 'b') g.path('M0 -18 Q18 0 0 18 Q-18 0 0 -18 Z', '#3cc46b', 4);
            else g.blob([-22, -6, -8, -16, 14, -12, 22, 4, 6, 14, -14, 10], '#fff3b0', 0);
          });
        });
        g.ell(500, cy, rx, ry, null);
      }
      const both = s.mode === 'both', ty = s.k === 0 ? 600 : 628;
      fists(g, s, sd => [500 + sgn(sd) * (both ? 66 : 24), ty], { sleeve: '#ffffff' });
    },
    hit(g, s, k) {
      const y = k === 1 ? 600 : 628;
      g.fx.smoke(500, y, 7, '#ffffff'); g.fx.burst(500, y, { n: 12, c: ['#ffffff', '#f6efe0'], shape: 'dot', sp: [150, 450], size: [8, 16], g: 500, ol: 0 });
      if (k === 1) { g.fx.pop('ボフッ', 500 - sgn(s.lastSide) * 280, 420, { size: 96 }); g.fx.shake(6, 0.1); }
      else { g.fx.pop('ピザかんせい！', 500, 380, { size: 96, c: C.yellow, life: 0.9 }); g.fx.stars(500, 560, 8); g.fx.shake(9, 0.14); }
    },
  },

  /* ---------- 雪のかべを破る（うしろにペンギン） ---------- */
  {
    id: 'punch-snowwall', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'winter', sfx: 'crunch',
    vars: [{ k: 'penguin', name: '雪のかべを破る', short: '雪のかべ' }],
    init(s) { s.my.B = snowBricks(s.r); },
    draw(g, s) {
      const V = g.V;
      g.sky('#6fb6f2', '#dff1ff', 700);
      g.ell(200, 700, 440, 130, '#eaf4ff', 0); g.ell(840, 712, 480, 150, '#e1eeff', 0);
      g.band(700, 'bottom', '#f5faff', 7);
      g.at(500, 566, 0, 1.4, 1.4, () => penguin(g, 0, 0, s.k === 2 ? -2 + 0.5 * Math.sin(s.t * 16) : 0));
      g.ell(110, 780, 160, 96, '#ffffff'); g.ell(890, 780, 160, 96, '#ffffff');
      for (const b of s.my.B) {
        const on = s.k > b.grp, t = on ? (b.grp === 0 ? (s.k === 1 ? s.age : s.age + s.spr) : s.age) : 0;
        const [dx, dy, rot] = on ? fly(b, t, 2200) : [0, 0, 0];
        g.at(b.x + dx, b.y + dy, rot, () => { g.rr(-b.bw / 2 + 3, -33, b.bw - 6, 66, 16, '#f7fbff', 5); g.line([-b.bw / 2 + 16, 20, b.bw / 2 - 16, 20], '#d6e6f7', 7); });
      }
      const both = s.mode === 'both';
      fists(g, s, sd => [500 + sgn(sd) * (both ? 66 : 24), s.k === 0 ? 432 : 470], { sleeve: '#e8343c' });
    },
    hit(g, s, k) {
      const y = k === 1 ? 432 : 470;
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 24, y, { n: 10, r0: 90, r1: 220, w: 10, c: '#ffffff' });
      g.fx.burst(500, y, { n: k === 1 ? 14 : 28, c: ['#ffffff', '#e6f2ff'], shape: 'snow', sp: [250, 760], size: [14, 30], g: 1200 });
      if (k === 1) { g.fx.pop('ボコッ', 500 - sgn(s.lastSide) * 280, 220, { size: 96, c: '#ffffff' }); g.fx.shake(7, 0.12); }
      else { g.fx.pop('ドサドサッ', 500, 170, { size: 104, c: '#ffffff' }); g.fx.notes(600, 420, 5); g.fx.stars(500, 360, 6, ['#ffffff', C.yellow]); g.fx.shake(12, 0.18); }
    },
  },

  /* ---------- ピニャータを割る（おかしが降る） ---------- */
  {
    id: 'punch-pinata', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'party', sfx: ['smack', 'pop'],
    vars: [{ k: 'star', name: 'ピニャータを割る', short: 'ピニャータ' }],
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, a = ageOf(s), dir = s.lastSide === 'L' ? 1 : -1;
      g.sky('#7fd0ff', '#d8f3ff', 760);
      g.cloud(170, 260, 0.7); g.cloud(850, 330, 0.55);
      g.rect(V.x0 - 20, 30, W, 44, '#a0673c'); g.line([V.x0 - 20, 74, V.x1 + 20, 74], C.ol, 5);
      for (let x = Math.ceil(V.x0 / 110) * 110; x < V.x1; x += 110) { g.line([x, 74, x, 96], C.ol, 3); g.ell(x, 104, 12, 15, [C.yellow, C.pink, C.mint][((x / 110) % 3 + 3) % 3], 4); }
      for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1 + 120; x += 120) g.circ(x, 760, 80, '#4fae5a', 0);
      g.band(740, 'bottom', '#8fd66b', 7); g.band(760, 'bottom', '#8fd66b');
      for (const [x, c] of [[150, C.purple], [850, C.blue]]) { g.rr(x - 60, 800, 120, 96, 8, c); g.rect(x - 12, 800, 24, 96, C.yellow, 0); g.rr(x - 70, 786, 140, 28, 8, sh(c, 0.15)); g.rr(x - 60, 800, 120, 96, 8, null); }
      g.line([500, V.y0 - 10, 500, 74], C.ol, 5);
      if (s.k < 2) {
        const sw = jig(a, 0.2 * dir, 7, 2.2), [sx, sy] = squash(a, 0.1);
        g.at(500, 74, sw, () => { g.line([0, 0, 0, 160], C.ol, 5); g.at(0, 356, 0, sx, sy, () => pinataBody(g, s.k === 1)); });
      } else {
        g.at(500, 74, jig(a, 0.5 * dir, 9, 3), () => g.line([0, 0, 0, 150], C.ol, 5));
        for (let i = 0; i < 5; i++) {
          const j0 = (2 * i + 9) % 10, j1 = 2 * i, j2 = 2 * i + 1, poly = [0, 0, PIN_PTS[j0 * 2], PIN_PTS[j0 * 2 + 1], PIN_PTS[j1 * 2], PIN_PTS[j1 * 2 + 1], PIN_PTS[j2 * 2], PIN_PTS[j2 * 2 + 1]];
          const an = -PI / 2 + i * 2 * PI / 5, px = Math.cos(an) * 90, py = Math.sin(an) * 90, t = a;
          const dx = Math.cos(an) * 520 * t, dy = Math.sin(an) * 420 * t - 200 * t + 0.5 * 2200 * t * t;
          g.at(500 + px + dx, 430 + py + dy, (i % 2 ? 1 : -1) * 5 * t, () => g.at(-px, -py, () => {
            clipPts(g, poly, () => { for (let k = 0, y = -PIN_R1; y < PIN_R1; k++, y += 46) g.rect(-PIN_R1, y, PIN_R1 * 2, 46, PIN_COL[k % 6], 0); });
            g.poly(poly, null, 6);
          }));
        }
      }
      const both = s.mode === 'both';
      fists(g, s, sd => [500 + sgn(sd) * (both ? 66 : 24), 440], { sleeve: '#8e5cff' });
    },
    hit(g, s, k) {
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 24, 440, { n: 10, r0: 100, r1: 230, w: 11 });
      if (k === 1) { g.fx.pop('バシッ', 500 - sgn(s.lastSide) * 290, 300, { size: 96 }); g.fx.burst(470, 470, { n: 5, c: [C.red, C.yellow, C.blue], shape: 'square', sp: [100, 300], size: [14, 22], g: 1800, dir: PI / 2, spread: 1 }); g.fx.shake(7, 0.12); }
      else {
        g.fx.burst(500, 430, { n: 34, c: [C.red, C.yellow, C.blue, C.green, C.pink, C.orange, C.purple], shape: 'square', sp: [300, 900], size: [16, 26], g: 1900 });
        g.fx.burst(500, 430, { n: 14, c: [C.yellow, C.pink, '#ffffff'], shape: 'star', sp: [300, 800], size: [16, 28], g: 1500 });
        g.fx.confetti(40); g.fx.pop('パカーン！', 500, 170, { size: 116, c: C.yellow }); g.fx.shake(12, 0.18); g.sfx('cheer');
      }
    },
  },

  /* ---------- 発射ボタンを押す（ロケットが飛ぶ） ---------- */
  {
    id: 'punch-rocket', acts: ['punch'], modes: ['one', 'alt', 'both'], theme: 'space', sfx: ['click', 'rocket'],
    vars: [{ k: 'launch', name: '発射ボタンを押す', short: '発射' }],
    init(s) { s.my.st = Array.from({ length: 26 }, () => [110 + s.r() * 780, 70 + s.r() * 280, 2 + s.r() * 4]); },
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, a = ageOf(s);
      g.bg('#2a3050');
      g.rr(66, 26, 868, 408, 40, '#4a5480');
      g.clipRR(96, 54, 808, 352, 24, () => {
        g.rect(96, 54, 808, 352, g.lin(0, 54, 0, 406, ['#0b0f2e', '#33307a']), 0);
        for (const [x, y, r] of s.my.st) g.circ(x, y, r, '#ffffff', 0);
        g.circ(790, 124, 46, '#f4f0d8', 0); g.circ(774, 112, 9, '#ddd6b8', 0); g.circ(806, 140, 6, '#ddd6b8', 0);
        g.rect(96, 386, 808, 30, '#3a3f5c', 0);
        g.rect(606, 130, 24, 258, '#c3ccd9', 5); for (let y = 150; y < 380; y += 40) g.line([606, y, 630, y + 30], '#8f9bb0', 4);
        g.rect(560, 200, 50, 12, '#c3ccd9', 0);
        const lift = s.k === 2 ? 240 * a + 1800 * a * a : 0, shake = s.k >= 1 ? Math.sin(s.t * 70) * 3 : 0;
        if (s.k >= 1) for (let i = 0; i < 6; i++) { const t = s.k === 1 ? a : a + s.spr, r = 30 + 22 * Math.min(1, t * 1.4) + i * 4; g.circ(500 + (i - 2.5) * 46 * (1 + Math.min(1, t) * 0.5), 380 - (i % 2) * 18, r, '#e9e6f2', 0); }
        g.at(500 + shake, 384 - lift, () => rocket(g, s.k === 0 ? 0 : s.k === 1 ? 0.55 : 1.4, s.t));
      });
      g.rr(96, 54, 808, 352, 24, null, 8);
      g.rect(V.x0 - 20, 446, W, V.y1 - 426, '#39406b', 0); g.line([V.x0 - 20, 446, V.x1 + 20, 446], C.ol, 6);
      g.rect(V.x0 - 20, 446, W, 24, '#4a5384', 0);
      for (let i = 0; i < 8; i++) { const x = 130 + i * 34 + (i > 3 ? 470 : 0), c = [C.lime, C.yellow, C.red, C.sky][i % 4], on = Math.sin(s.t * 6 + i * 1.7) > 0; g.circ(x, 500, 10, on ? c : '#2b2f45', 4); }
      g.rr(110, 560, 200, 120, 14, '#0d1a2a'); g.curve([126, 650, 160, 620, 190, 636, 226, 590, 260, 604, 294, 574], '#3cff8f', 5);
      g.rr(690, 560, 200, 120, 14, '#0d1a2a');
      const n = s.k === 0 ? '- -' : s.k === 2 ? '0' : String(Math.max(1, 3 - Math.floor(s.age / (s.spr / 3))));
      g.text(n, 790, 622, { size: 72, f: s.k ? '#3cff8f' : '#2f6b4f' });
      g.ell(500, 566, 150, 50, '#ffd23f');
      g.clipPath('M350 566 A150 50 0 0 0 650 566 A150 50 0 0 0 350 566 Z', () => { for (let x = 330; x < 680; x += 60) g.poly([x, 520, x + 30, 520, x - 10, 620, x - 40, 620], '#2b2140', 0); });
      g.ell(500, 566, 150, 50, null); g.ell(500, 552, 110, 36, '#c9cfda');
      const press = s.k ? 14 * Math.exp(-12 * a) : 0;
      g.at(0, press, () => { g.ell(500, 552, 96, 22, '#c41f2a'); g.path('M404 552 Q404 460 500 460 Q596 460 596 552 Z', '#e8343c'); g.hl(462, 500, 22, 12, -0.6, 0.5); });
      const both = s.mode === 'both';
      fists(g, s, sd => [500 + sgn(sd) * (both ? 60 : 22), 500], { sleeve: '#f4f6fb' });
    },
    hit(g, s, k) {
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 22, 500, { n: 10, r0: 90, r1: 200, w: 10, c: '#ffe066' });
      if (k === 1) { g.fx.pop('ポチッ', 500 - sgn(s.lastSide) * 280, 620, { size: 92 }); g.fx.shake(5, 0.1); }
      else { g.fx.flash('#fff3c4', 0.5, 0.2); g.fx.pop('はっしゃ！', 500, 700, { size: 112, c: C.yellow }); g.fx.stars(500, 300, 10); g.fx.shake(14, 0.3); }
    },
  },
];
