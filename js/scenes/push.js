/* 押す（両手で前へ） — 車・ドア・雪玉・岩・すもう など
   p=0：腕をのばして手のひらで押している / p=1：手を胸の前（画面の下）に引いている */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const PI = Math.PI, TAU = PI * 2;
const sgn = sd => sd === 'L' ? -1 : 1;
const other = sd => sd === 'L' ? 'R' : 'L';
const ageOf = s => s.k ? s.age : 9;
const age1 = s => s.k === 1 ? s.age : s.k === 2 ? s.age + s.spr : -1;   // 1回目からの秒（まだなら -1）
const age2 = s => s.k === 2 ? s.age : -1;
// 交互モード：1回目に押す手の側
const first = s => s.my.f0 || (s.my.f0 = s.k === 0 ? s.side : s.lastSide);
const tSide = (s, i) => i === 0 ? first(s) : other(first(s));
// 手のひら：p=0 で (tx,ty) を押す / p=1 で胸の前に引く
function palmAt(sg, p, tx, ty, s0 = 0.84) {
  return { x: lerp(tx, 500 + sg * 290, p), y: lerp(ty, 1090, E.ioQ(p)), s: lerp(s0, 1.25, p), a: -PI / 2 - sg * lerp(0.08, 0.36, p) + (tx - 500 - sg * 120) * 0.0009 * (1 - p) };
}
// 両手。T(side) → [x, y]：その手のひらが押す所。o: { sleeve, skin, s0 }
function palms(g, s, T, o = {}) {
  const m = s.mode, act = s.side;
  for (const sd of act === 'L' ? ['R', 'L'] : ['L', 'R']) {
    const sg = sgn(sd), p = (m === 'both' || act === sd) ? s.p : m === 'alt' ? clamp(1 - s.p) : 1;
    const t = T(sd), q = palmAt(sg, p, t[0], t[1], o.s0);
    g.arm(q.x, q.y, q.a, { hand: 'palm', side: sd, s: q.s, sleeve: o.sleeve, skin: o.skin });
  }
}
const hitSides = s => s.mode === 'both' ? ['L', 'R'] : [s.lastSide];
const fly = (f, t, G = 2300) => [f.vx * t, f.vy * t + 0.5 * G * t * t, f.w * t];
function clipPts(g, p, fn) { const c = g.ctx; c.save(); c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.clip(); fn(); c.restore(); }

/* ---------- 車（どろにはまった車を押し出す） ---------- */
function carRear(g, c, t, wave) {
  g.rr(-206, -78, 76, 90, 18, '#2b2140', 0); g.rr(130, -78, 76, 90, 18, '#2b2140', 0);
  g.rr(-162, -352, 324, 160, 56, c);
  g.rr(-132, -330, 264, 104, 34, '#bfe6ff');
  g.circ(-46, -268, 30, '#3b3550', 0); g.rr(-82, -244, 72, 30, 14, '#3b3550', 0);
  if (wave) g.at(-112, -300, -0.6 + 0.5 * Math.sin(t * 18), () => { g.rr(-14, -60, 28, 70, 12, C.skin); g.circ(0, -62, 18, C.skin); });
  g.line([-100, -318, -60, -246], 'rgba(255,255,255,0.7)', 10);
  g.rr(-214, -240, 428, 180, 48, c);
  g.rr(-200, -206, 60, 36, 12, '#ffb347'); g.rr(140, -206, 60, 36, 12, '#ffb347');
  g.rr(-58, -158, 116, 48, 8, '#ffffff'); g.line([-36, -134, 36, -134], '#8f9bb0', 6);
  g.rr(-220, -86, 440, 36, 16, '#5c6478');
  g.rr(116, -62, 44, 20, 9, '#8f9bb0');
  g.hl(-150, -220, 60, 12, 0, 0.35);
}

/* ---------- ドア（両開き）・城の門 ---------- */
const DOORS = [
  { k: 'french', name: 'ドアを押し開ける', short: 'ドア', theme: 'home' },
  { k: 'gate', name: '城の門を開ける', short: '城の門', theme: 'fantasy' },
];
const EYE = 470, DX0 = 250, DX1 = 750, DT = 130, DB = 880;
function leafQuad(hinge, dir, th) {
  const w = 250, D = w * Math.sin(th), f = 1 / (1 + D * 0.0017), X = hinge + dir * w * Math.cos(th);
  const fx = 500 + (X - 500) * f;
  return [hinge, DT, fx, EYE + (DT - EYE) * f, fx, EYE + (DB - EYE) * f, hinge, DB];
}
// u: 0 ちょうつがい → 1 先、v: 0 上 → 1 下
function qp(Q, u, v) { const tx = lerp(Q[0], Q[2], u), ty = lerp(Q[1], Q[3], u), bx = lerp(Q[6], Q[4], u), by = lerp(Q[7], Q[5], u); return [lerp(tx, bx, v), lerp(ty, by, v)]; }
const qpoly = (Q, u0, v0, u1, v1) => [...qp(Q, u0, v0), ...qp(Q, u1, v0), ...qp(Q, u1, v1), ...qp(Q, u0, v1)];
function leafAngles(s) {
  const A = 1.2, ease = a => E.outBack(clamp(a / 0.28), 1.3), a1 = age1(s), a2 = age2(s);
  if (s.mode === 'both') { const t = (a1 < 0 ? 0 : 0.55 * ease(a1)) + (a2 < 0 ? 0 : (A - 0.55) * ease(a2)); return { L: t, R: t }; }
  const f = first(s), th = sd => sd === f ? (a1 < 0 ? 0 : A * ease(a1)) : (a2 < 0 ? 0 : A * ease(a2));
  return { L: th('L'), R: th('R') };
}
function leaf(g, v, Q, dir) {
  if (v.k === 'french') {
    g.poly(Q, '#ffffff');
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) g.poly(qpoly(Q, 0.14 + i * 0.38, 0.08 + j * 0.25, 0.48 + i * 0.38, 0.3 + j * 0.25), '#bfe6ff', 4);
    g.poly(qpoly(Q, 0.14, 0.84, 0.86, 0.94), '#eef2f7', 4);
    const [hx, hy] = qp(Q, 0.9, 0.52); g.rr(hx - 7, hy - 22, 14, 44, 6, '#ffcf5a', 4);
  } else {
    g.poly(Q, '#8a5a36');
    for (const u of [0.2, 0.4, 0.6, 0.8]) g.line([...qp(Q, u, 0.02), ...qp(Q, u, 0.98)], '#6e4429', 5);
    for (const vv of [0.18, 0.82]) { g.poly(qpoly(Q, 0, vv - 0.035, 1, vv + 0.035), '#4a4f63', 0); for (const u of [0.1, 0.3, 0.5, 0.7, 0.9]) { const [x, y] = qp(Q, u, vv); g.circ(x, y, 7, '#9aa5b6', 3); } }
    const [hx, hy] = qp(Q, 0.86, 0.5); g.ring(hx, hy + 16, 22, '#ffcf5a', 8); g.circ(hx, hy, 9, '#ffcf5a', 4);
  }
  g.poly(Q, null, 6);
}

/* ---------- 雪玉 ---------- */
const SNOW_R = [150, 190, 232];
function snowBall(g, x, y, r, rot) {
  g.circ(x, y, r, '#f7fbff');
  g.clipCirc(x, y, r, () => { g.circ(x + r * 0.35, y + r * 0.4, r * 0.95, '#dde9f7', 0); for (let i = 0; i < 7; i++) { const a = rot + i * 0.9, d = r * (0.3 + 0.5 * ((i * 37) % 10) / 10); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 16, a, a + 1.6, '#c9d9ee', 6); } });
  g.circ(x, y, r, null); g.hl(x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.12, -0.6, 0.8);
}

/* ---------- 大きな岩 ---------- */
const ROCK = [-250, 40, -236, -90, -160, -196, -40, -240, 90, -226, 200, -150, 252, -20, 230, 110, -200, 116];

/* ---------- すもう（くま） ---------- */
function bear(g, face, t) {
  const B = '#a0673c', L = '#c89566';
  g.rr(-118, -130, 86, 130, 34, B); g.rr(32, -130, 86, 130, 34, B);
  g.ell(-75, -4, 50, 16, sh(B, -0.2), 0); g.ell(75, -4, 50, 16, sh(B, -0.2), 0);
  g.at(-176, -300, face === 2 ? -1.2 : 0.5, () => g.ell(0, 0, 50, 84, B));
  g.at(176, -300, face === 2 ? 1.2 : -0.5, () => g.ell(0, 0, 50, 84, B));
  g.ell(0, -240, 176, 172, B);
  g.ell(0, -246, 120, 118, L, 0);
  g.clipCirc(0, -240, 176, () => { g.rect(-180, -170, 360, 72, '#f4f4f0', 0); g.rect(-30, -120, 60, 120, '#f4f4f0', 0); });
  g.line([-170, -170, 170, -170], C.ol, 5); g.line([-170, -98, 170, -98], C.ol, 5);
  g.ell(0, -240, 176, 172, null);
  g.circ(-76, -530, 34, B); g.circ(76, -530, 34, B); g.circ(-76, -530, 16, L, 0); g.circ(76, -530, 16, L, 0);
  g.circ(0, -448, 104, B);
  g.ell(0, -560, 28, 16, '#2b2140'); g.rr(-8, -572, 16, 26, 6, '#2b2140', 0);
  g.ell(0, -414, 50, 38, '#ead0a8', 0); g.ell(0, -432, 17, 12, C.ol, 0);
  if (face === 0) { g.circ(-40, -470, 10, C.ol, 0); g.circ(40, -470, 10, C.ol, 0); g.line([-58, -500, -24, -490], C.ol, 7); g.line([58, -500, 24, -490], C.ol, 7); g.arc(0, -410, 16, 0.4, PI - 0.4, C.ol, 5); }
  else if (face === 1) { g.circ(-40, -470, 15, '#ffffff', 5); g.circ(40, -470, 15, '#ffffff', 5); g.circ(-40, -468, 7, C.ol, 0); g.circ(40, -468, 7, C.ol, 0); g.ell(0, -398, 12, 15, '#7a3a2a', 4); g.path('M106 -520 Q122 -490 106 -482 Q90 -490 106 -520 Z', '#8fd3ff', 4); }
  else { g.arc(-40, -462, 12, PI + 0.4, -0.4, C.ol, 6); g.arc(40, -462, 12, PI + 0.4, -0.4, C.ol, 6); g.arc(0, -408, 20, 0.2, PI - 0.2, C.ol, 6); g.ell(-70, -428, 16, 10, '#ff9fbd', 0); g.ell(70, -428, 16, 10, '#ff9fbd', 0); }
}

// たくさんの線分を1回で描く：[x0,y0,x1,y1, ...]
function segs(g, a, col, w) { const c = g.ctx; c.beginPath(); for (let i = 0; i < a.length; i += 4) { c.moveTo(a[i], a[i + 1]); c.lineTo(a[i + 2], a[i + 3]); } c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); }

/* ---------- 引き出し ---------- */
const DRAW_X = { L: 345, R: 655 }, DRAW_Y = 470;
function drawerOpen(s) {   // 0 = 閉じた、1 = 開いている
  const e = a => a < 0 ? 0 : E.outQ(clamp(a / 0.18)), a1 = age1(s), a2 = age2(s);
  if (s.mode === 'both') { const d = 1 - 0.5 * e(a1) - 0.5 * e(a2); return { L: d, R: d }; }
  const f = first(s), d = sd => 1 - (sd === f ? e(a1) : e(a2));
  return { L: d('L'), R: d('R') };
}
const drawerFace = (sd, d) => { const f = 1 + 0.2 * d; return { x: DRAW_X[sd] + (DRAW_X[sd] - 500) * 0.18 * d, y: DRAW_Y + 150 * d, w: 280 * f, h: 150 * f }; };
function drawer(g, sd, d, cols) {
  const F = drawerFace(sd, d), x0 = DRAW_X[sd] - 140, x1 = DRAW_X[sd] + 140, y0 = DRAW_Y - 75;
  g.rect(x0, y0, 280, 150, '#3b2a22', 0);
  if (d > 0.02) {
    const fl = F.x - F.w / 2, fr = F.x + F.w / 2, ft = F.y - F.h / 2;
    g.poly([x0, y0, x1, y0, fr, ft, fl, ft], '#b98a5a', 4);
    g.poly([x0 + 12, y0 + 4, x1 - 12, y0 + 4, fr - 14, ft, fl + 14, ft], '#e9c9a0', 0);
    clipPts(g, [x0, y0, x1, y0, fr, ft + 30, fl, ft + 30], () => {
      cols.forEach((c, i) => { const x = lerp(fl, fr, 0.06 + i * 0.31), w = (fr - fl) * 0.27; g.rr(x, ft - 34 - 50 * d, w, 90, 18, c, 4); g.line([x + 12, ft - 10 - 50 * d, x + w - 12, ft - 10 - 50 * d], 'rgba(255,255,255,0.5)', 4); });
    });
    if (d > 0.3) { g.cap(fl + F.w * 0.24, ft + 10, fl + F.w * 0.2, ft + 90 * d, 18, cols[1], 4); g.cap(fl + F.w * 0.72, ft + 6, fl + F.w * 0.77, ft + 70 * d, 15, cols[2], 4); }
  }
  g.rr(F.x - F.w / 2, F.y - F.h / 2, F.w, F.h, 12, '#f2c48a');
  g.rr(F.x - F.w / 2 + 14, F.y - F.h / 2 + 14, F.w - 28, F.h - 28, 8, '#e6b57a', 4);
  g.rr(F.x - F.w * 0.18, F.y - 10, F.w * 0.36, 20, 10, '#a0673c', 4);
}
function sleepyCat(g, x, y, awake, t) {
  g.at(x, y, () => {
    g.ell(0, 0, 90, 44, '#ff9f45'); g.at(80, 10, Math.sin(t * 4) * 0.2, () => g.cap(0, 0, 50, -40, 14, '#ff9f45'));
    for (const d of [-30, 0, 30]) g.line([d, -40, d + 10, -10], '#e07a28', 7);
    g.at(-74, -16, () => {
      g.tri(-36, -14, -14, -36, -40, -58, '#ff9f45'); g.tri(36, -14, 14, -36, 40, -58, '#ff9f45');
      g.ell(0, 0, 46, 38, '#ff9f45');
      if (awake) { g.circ(-16, -4, 7, C.ol, 0); g.circ(16, -4, 7, C.ol, 0); } else { g.arc(-16, -6, 9, 0.3, PI - 0.3, C.ol, 5); g.arc(16, -6, 9, 0.3, PI - 0.3, C.ol, 5); }
      g.tri(-5, 10, 5, 10, 0, 16, '#ff7a8a', 0);
    });
  });
}

/* ---------- ブランコ ---------- */
function swingTh(s) {
  const a1 = age1(s), a2 = age2(s);
  if (s.k === 0) return 0.03 * Math.sin(s.t * 3);
  if (s.k === 1) return 0.58 * Math.sin(PI * clamp(a1 / s.spr));
  return 0.85 * Math.sin(PI * clamp(a2 / s.spr));
}
// 交互モード：左右のブランコ。その側の手で押された子だけがこぐ
function swingThSide(s, sd) {
  for (const j of [1, 0]) if (s.k > j && tSide(s, j) === sd) { const a = j === 0 ? age1(s) : age2(s); return Math.max(-0.2, (j ? 0.8 : 0.6) * Math.exp(-0.35 * a) * Math.sin(PI * a / s.spr)); }
  return 0.03 * Math.sin(s.t * 3 + (sd === 'L' ? 0 : 2));
}
function swingProj(th) { const L = 560, z = L * Math.sin(th), f = 1 / (1 + z * 0.0019), y = 96 + L * Math.cos(th); return { f, y: 470 + (y - 470) * f }; }
function kidBack(g, f, cheer, t, x = 500, shirt = '#ff6b6b', hat = '#ffd23f') {
  g.at(x, 0, 0, f, f, () => {
    g.rr(-58, 40, 40, 110, 16, '#3a5bd9'); g.rr(18, 40, 40, 110, 16, '#3a5bd9'); g.ell(-38, 156, 26, 14, C.red, 5); g.ell(38, 156, 26, 14, C.red, 5);
    g.rr(-110, 10, 220, 36, 10, '#c98a52');
    g.rr(-74, -150, 148, 176, 50, shirt);
    const up = cheer ? 0.6 + 0.2 * Math.sin(t * 16) : 0;
    g.at(-70, -120, -0.25 - up, () => g.cap(0, 0, -6, -120, 20, '#ffd4b8')); g.at(70, -120, 0.25 + up, () => g.cap(0, 0, 6, -120, 20, '#ffd4b8'));
    g.circ(0, -210, 72, '#ffd4b8'); g.path('M-72 -206 Q-74 -290 0 -290 Q74 -290 72 -206 Q40 -230 0 -226 Q-40 -230 -72 -206 Z', '#6b3e26');
    g.ell(-80, -190, 14, 20, '#ffd4b8'); g.ell(80, -190, 14, 20, '#ffd4b8');
    g.path('M-78 -232 Q-80 -302 0 -304 Q80 -302 78 -232 Z', hat); g.rr(-96, -240, 192, 20, 10, hat);
  });
}

/* ---------- たおれるかべ ---------- */
const WB = 800, WH = 660;
function wallPt(x, v, phi) { const h = WH * v, z = h * Math.sin(phi), f = 1 / (1 + z * 0.0013); return [500 + (x - 500) * f, 440 + (WB - h * Math.cos(phi) - 440) * f]; }

/* ---------- ボート ---------- */
function rowboat(g, t, wave) {
  g.path('M-220 -150 L220 -150 Q206 -40 150 0 L-150 0 Q-206 -40 -220 -150 Z', '#e8603c');
  g.rect(-214, -122, 428, 18, '#ffffff', 0); g.line([-200, -60, 200, -60], '#c24a2a', 6);
  g.path('M-220 -150 L220 -150 Q206 -40 150 0 L-150 0 Q-206 -40 -220 -150 Z', null);
  g.rr(-230, -170, 460, 26, 12, '#a0673c');
  g.at(0, -170, () => {
    g.ell(-30, -60, 34, 70, '#ffffff'); g.ell(30, -64, 30, 64, '#ffffff');
    g.ell(0, -10, 70, 54, '#ffffff'); g.circ(0, -90, 50, '#ffffff');
    g.ell(-22, -146, 13, 40, '#ffffff', 6, -0.15); g.ell(22, -146, 13, 40, '#ffffff', 6, 0.15); g.ell(-22, -146, 6, 28, '#ffb3c6', 0, -0.15); g.ell(22, -146, 6, 28, '#ffb3c6', 0, 0.15);
    if (wave) g.at(46, -40, -1.6 + 0.4 * Math.sin(t * 16), () => g.ell(0, -36, 16, 40, '#ffffff'));
  });
}

/* ---------- 大玉ころがし ---------- */
function bigBall(g, x, y, r, rot) {
  g.circ(x, y, r, '#ee3a33');
  g.clipCirc(x, y, r, () => { for (let i = 0; i < 3; i++) { const a = rot + i * PI / 3; g.at(x, y, a, () => g.rect(-r, -22, 2 * r, 44, '#ffffff', 0)); } g.circ(x + r * 0.3, y + r * 0.35, r * 0.9, 'rgba(120,0,0,0.12)', 0); });
  g.circ(x, y, r, null); g.hl(x - r * 0.42, y - r * 0.45, r * 0.24, r * 0.12, -0.6, 0.7);
}

/* ---------- ボウリング ---------- */
const PINS = [[500, 286], [470, 270], [530, 270], [440, 254], [500, 254], [560, 254], [410, 238], [470, 238], [530, 238], [590, 238]];
const PIN_FALL1 = [0, 1, 2, 4, 5, 8, 9];
function pin(g, x, y, s, rot) {
  g.at(x, y, rot, s, s, () => { g.path('M0 -80 C14 -80 16 -62 10 -50 C6 -42 24 -24 22 -4 C20 14 12 20 0 20 C-12 20 -20 14 -22 -4 C-24 -24 -6 -42 -10 -50 C-16 -62 -14 -80 0 -80 Z', '#ffffff'); g.rect(-11, -52, 22, 8, C.red, 0); });
}
function bowlBall(g, x, y, r, c, rot) {
  g.circ(x, y, r, c); g.at(x, y, rot, () => { g.circ(-r * 0.2, -r * 0.35, r * 0.11, '#1c1a26', 0); g.circ(r * 0.12, -r * 0.42, r * 0.11, '#1c1a26', 0); g.circ(-r * 0.02, -r * 0.1, r * 0.12, '#1c1a26', 0); });
  g.hl(x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.11, -0.6, 0.6);
}

/* ---------- ぞうのおしり ---------- */
function elephantBack(g, t, look, up, trunk) {
  const G = '#9aa5b6', D = '#7f8aa0', fl = Math.sin(t * 3) * 0.1;
  if (trunk > 0) g.at(80, -520 - 120 * up, 0, () => { g.taper(0, 0, 100, -80 - 130 * trunk, 36, 22, G); g.ell(102, -92 - 130 * trunk, 24, 14, D, 5); });
  for (const d of [-1, 1]) g.at(d * 190, -380 - 120 * up, d * (0.12 + fl), d, 1, () => { g.path('M-40 -120 Q60 -150 110 -90 Q140 -10 110 70 Q80 150 20 170 Q-10 120 -30 60 Q-60 -40 -40 -120 Z', G); g.path('M-14 -90 Q50 -110 84 -66 Q104 -6 84 54 Q60 110 22 124 Q4 86 -8 40 Q-30 -30 -14 -90 Z', '#b6bfcd', 0); });
  g.ell(0, -470 - 120 * up, 140, 96, G);
  if (look) { g.circ(116, -490 - 120 * up, 15, '#ffffff', 4); g.circ(122, -490 - 120 * up, 7, C.ol, 0); g.line([98, -514 - 120 * up, 132, -520 - 120 * up], C.ol, 5); }
  if (up > 0) for (const d of [-1, 1]) { g.rr(d * 150 - 56, -120 * up - 20, 112, 140 * up + 40, 30, D); g.ell(d * 150, 10, 60, 16, '#e9e4d6', 4); }
  g.ell(0, -230 - 120 * up, 262, 232, G);
  if (up < 1) for (const d of [-1, 1]) g.at(d * 180, -40, () => { g.ell(0, 0, 84 * (1 - up), 62 * (1 - up), D); for (const k of [-1, 0, 1]) g.circ(k * 34 * (1 - up), -40 * (1 - up), 13 * (1 - up), '#e9e4d6', 4); });
  g.at(0, -250 - 120 * up, Math.sin(t * 9) * 0.25, () => { g.curve([0, 0, 8, 50, -4, 100], C.ol, 9); g.ell(-4, 110, 12, 20, C.ol, 0); });
  g.arc(-110, -150 - 120 * up, 70, 2.2, 3.4, D, 6); g.arc(110, -150 - 120 * up, 70, -0.26, 0.94, D, 6);
}

/* ---------- 雲 ---------- */
const PUFFS = [[-120, 10, 62], [-60, -30, 74], [10, -56, 84], [86, -26, 70], [134, 14, 54], [0, 20, 80], [-60, 26, 60], [70, 28, 60]];
const RAIN = Array.from({ length: 16 }, (_, i) => [300 + ((i * 53) % 400), (i * 97) % 300]);
function cloudFace(g, mood) {
  if (mood === 0) { g.circ(-60, -10, 13, C.ol, 0); g.circ(60, -10, 13, C.ol, 0); g.line([-92, -48, -40, -34], C.ol, 9); g.line([92, -48, 40, -34], C.ol, 9); g.arc(0, 54, 30, PI + 0.5, -0.5, C.ol, 8); }
  else if (mood === 1) { g.circ(-60, -14, 16, '#ffffff', 6); g.circ(60, -14, 16, '#ffffff', 6); g.circ(-60, -12, 7, C.ol, 0); g.circ(60, -12, 7, C.ol, 0); g.ell(0, 40, 16, 20, C.ol, 0); }
  else { g.arc(-60, -6, 16, PI + 0.4, -0.4, C.ol, 8); g.arc(60, -6, 16, PI + 0.4, -0.4, C.ol, 8); g.arc(0, 24, 30, 0.3, PI - 0.3, C.ol, 8); g.ell(-98, 22, 18, 11, '#ff9fbd', 0); g.ell(98, 22, 18, 11, '#ff9fbd', 0); }
}

/* ---------- 宇宙船 ---------- */
function alien(g, x, y, mood, t) {
  g.at(x, y, () => {
    g.line([-20, -60, -34, -96], C.ol, 5); g.line([20, -60, 34, -96], C.ol, 5); g.circ(-34, -100, 9, C.yellow, 4); g.circ(34, -100, 9, C.yellow, 4);
    g.ell(0, 0, 58, 64, '#7be07b');
    g.ell(-22, -8, 16, 20, '#ffffff', 4); g.ell(22, -8, 16, 20, '#ffffff', 4); g.circ(-20, -4, 8, C.ol, 0); g.circ(24, -4, 8, C.ol, 0);
    if (mood === 0) { g.arc(0, 34, 14, PI + 0.4, -0.4, C.ol, 5); g.path('M44 -44 Q56 -24 44 -18 Q32 -24 44 -44 Z', '#8fd3ff', 4); }
    else g.arc(0, 22, 16, 0.3, PI - 0.3, C.ol, 5);
    if (mood === 2) g.at(56, 10, -1.4 + 0.4 * Math.sin(t * 16), () => g.ell(0, -26, 12, 30, '#7be07b'));
  });
}
function saucer(g, t, lit) {
  g.ell(0, 40, 120, 34, lit ? '#9ff7ff' : '#6d7590');
  g.ell(0, 0, 250, 72, '#cfd6e2'); g.ell(0, -12, 230, 44, '#e9eef5', 0);
  for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.6, x = Math.sin(a) * 210, y = 22 + Math.cos(a) * 12; g.circ(x, y, 14, lit && Math.floor(t * 8 + i) % 2 ? '#ffe066' : lit ? '#ff6bb5' : '#8a8fa3', 4); }
  g.ell(0, 0, 250, 72, null);
}

/* ---------- プリン ---------- */
const PUD = { x0: 300, x1: 700, xt0: 372, xt1: 628, yb: 720, yt: 430 };
function pudding(g, dx, sy, cream, cherry, tc) {
  const P = PUD, top = P.yb - (P.yb - P.yt) * sy;
  g.poly([P.x0, P.yb, P.x1, P.yb, P.xt1 + dx, top, P.xt0 + dx, top], '#ffd56b');
  g.poly([P.x0 + 40, P.yb - 10, P.x0 + 90, P.yb - 10, P.xt0 + dx + 40, top + 20, P.xt0 + dx + 14, top + 20], 'rgba(255,255,255,0.35)', 0);
  g.poly([P.xt0 + dx - 4, top, P.xt1 + dx + 4, top, P.xt1 + dx * 0.92 + 10, top + 60, P.xt0 + dx * 0.92 - 10, top + 60], '#8a4a1f', 0);
  for (const [u, l] of [[0.12, 50], [0.34, 80], [0.58, 46], [0.8, 70]]) { const x = lerp(P.xt0, P.xt1, u) + dx * 0.9; g.cap(x, top + 40, x - 2, top + 40 + l, 14, '#8a4a1f', 0); }
  g.poly([P.x0, P.yb, P.x1, P.yb, P.xt1 + dx, top, P.xt0 + dx, top], null);
  if (cream > 0) g.at(500 + dx, top, 0, cream, cream, () => { g.ell(0, -20, 110, 40, '#ffffff'); g.ell(0, -54, 78, 32, '#ffffff'); g.ell(0, -84, 46, 24, '#ffffff'); g.path('M-10 -100 Q0 -130 14 -104 Z', '#ffffff'); });
  if (cherry > 0) g.at(500 + dx, top - 100 - 260 * (1 - cherry), () => { g.curve([0, -30, 10, -70, 30, -86], '#3f9a46', 6); g.circ(0, 0, 34, tc); g.hl(-12, -12, 9, 6, -0.6, 0.7); });
}

/* ---------- りんごの木 ---------- */
const APPLES = [[330, 280], [420, 190], [560, 220], [660, 300], [380, 380], [500, 330], [610, 400], [280, 420], [720, 420], [460, 450], [560, 470], [350, 230]];
const APPLE_K = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1];   // 0：1回目で落ちる、1：2回目

/* ---------- 除夜の鐘 ---------- */
function bellDraw(g) {
  g.rr(-36, -330, 72, 50, 14, '#8a5a2b');
  g.path('M-150 -280 Q-160 -290 -110 -300 L110 -300 Q160 -290 150 -280 L176 40 Q180 70 150 72 L-150 72 Q-180 70 -176 40 Z', '#b87333');
  g.clipPath('M-150 -280 Q-160 -290 -110 -300 L110 -300 Q160 -290 150 -280 L176 40 Q180 70 150 72 L-150 72 Q-180 70 -176 40 Z', () => {
    g.rect(60, -310, 140, 400, 'rgba(0,0,0,0.14)', 0);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) g.circ(-120 + i * 48, -250 + r * 34, 10, '#cf8a4a', 3);
    g.line([-170, -130, 170, -130], '#8a4f22', 8); g.line([-176, 10, 176, 10], '#8a4f22', 8); g.line([0, -130, 0, 10], '#8a4f22', 6);
  });
  g.circ(0, -40, 26, '#d99a5a', 5);
  g.hl(-90, -190, 22, 70, 0, 0.3);
}

/* ---------- ペンギン（はらばいで すべる） ---------- */
function penguinBelly(g, look, t) {
  const K = '#2b3150';
  g.at(-118, -150, 0.5 + Math.sin(t * 6) * 0.08, () => g.ell(0, 0, 26, 74, K)); g.at(118, -150, -0.5 - Math.sin(t * 6) * 0.08, () => g.ell(0, 0, 26, 74, K));
  g.ell(0, -128, 112, 150, K); g.ell(-96, -110, 14, 90, '#ffffff', 0, 0.12); g.ell(96, -110, 14, 90, '#ffffff', 0, -0.12);
  g.circ(0, -282, 68, K);
  if (look) { g.circ(52, -296, 15, '#ffffff', 4); g.circ(56, -296, 7, C.ol, 0); g.tri(62, -272, 100, -264, 62, -256, C.orange, 4); }
  g.hl(-40, -190, 22, 50, -0.2, 0.18);
  for (const d of [-1, 1]) g.at(d * 44, 14, d * 0.25, () => { g.ell(0, 0, 34, 22, C.orange); g.line([-14, -6, -16, 16], '#d9741a', 4); g.line([14, -6, 16, 16], '#d9741a', 4); });
}

/* ---------- 花火のスイッチ ---------- */
function burst(g, x, y, R, a, c, n = 16) {
  if (a <= 0 || a > 1.2) return;
  const r = R * E.outQ(clamp(a / 0.45)), al = a < 0.6 ? 1 : 1 - (a - 0.6) / 0.6, sg = [];
  for (let i = 0; i < n; i++) { const an = i / n * TAU; sg.push(x + Math.cos(an) * r * 0.35, y + Math.sin(an) * r * 0.35 + a * 30, x + Math.cos(an) * r, y + Math.sin(an) * r + a * 40); }
  g.alpha(al, () => { segs(g, sg, c, 7); for (let i = 0; i < n; i += 2) { const an = i / n * TAU; g.circ(x + Math.cos(an) * r * 1.08, y + Math.sin(an) * r * 1.08 + a * 44, 8, '#ffffff', 0); } g.glow(x, y, r * 0.6, c, 0.35); });
}

export default [
  /* ---------- 車を押す（どろからぬけて走り出す） ---------- */
  {
    id: 'push-car', acts: ['push'], modes: ['both'], theme: 'town', sfx: ['thud', 'engine'],
    vars: [{ k: 'car', name: '車を押す', short: '車' }],
    init(s) { s.my.bye = 0; },
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s);
      const pr = (a1 < 0 ? 0 : E.ioQ(clamp(a1 / 0.5))) + (a2 < 0 ? 0 : E.ioQ(clamp(a2 / 0.5)));
      g.sky('#78c6ff', '#d9f2ff', 440);
      g.cloud(200, 140, 0.8); g.cloud(800, 200, 0.6);
      g.hills(440, '#8fd06a', 60, 3); g.band(440, 'bottom', '#7cc35a');
      const B = V.y1 + 40;
      g.poly([480, 440, 520, 440, 500 + (B - 440) * 1.15, B, 500 - (B - 440) * 1.15, B], '#7d8293', 0);
      for (let i = 0; i < 9; i++) { const d = ((i + pr * 1.5) % 9) / 9, y = 440 + (B - 440) * d * d, h = 6 + 70 * d * d, w = 3 + 16 * d; g.rect(500 - w / 2, y, w, h, '#ffffff', 0); }
      for (let i = 0; i < 6; i++) { const d = ((i + pr * 1.2) % 6) / 6, y = 440 + 500 * d * d, sc = 0.15 + 1.3 * d * d; for (const sd of [-1, 1]) g.at(500 + sd * (60 + 700 * d * d), y, 0, sc, sc, () => { g.rect(-8, -120, 16, 120, '#8a5a36', 0); g.circ(0, -150, 46, '#3fa34d', 0); }); }
      // どろ（世界に固定：車が進むと手前に流れてくる）
      const my = 712 + 260 * pr * pr, ms = 1 + 0.7 * pr;
      g.at(500, my, 0, ms, ms, () => { g.blob([-300, 0, -250, -40, -60, -54, 160, -48, 300, -10, 260, 40, 0, 56, -230, 40], '#8a5a3c', 0); g.ell(-120, 4, 60, 12, '#6e4429', 0); g.ell(130, 14, 70, 14, '#6e4429', 0); });
      // 車
      const go = a2 < 0 ? 0 : E.ioQ(clamp((a2 - 0.04) / 0.42)), sc = lerp(1, 0.3, go);
      const cy = lerp(716, 470, go) + (s.k === 0 ? 14 : 0) - (a1 >= 0 && s.k === 1 ? 46 * Math.sin(PI * clamp(a1 / 0.45)) : 0);
      const tilt = s.k === 0 ? -0.035 : jig(ageOf(s), 0.03, 16, 6);
      g.shadow(500, cy + 8 * sc, 230 * sc, 22 * sc);
      g.at(500 + (s.k === 0 ? Math.sin(s.t * 40) * 1.5 : 0), cy, tilt, sc, sc, () => carRear(g, '#ff6b6b', s.t, s.k === 2 && a2 > 0.12));
      if (s.k === 0) g.at(500, 716, 0, 1, 1, () => { g.blob([-250, 0, -200, -30, -120, -36, -150, 14], '#8a5a3c', 0); g.blob([250, 0, 200, -30, 120, -36, 150, 14], '#8a5a3c', 0); });
      if (a2 > 0.14 && !s.my.bye) { s.my.bye = 1; g.fx.pop('ありがとう！', 500, 230, { size: 84, c: C.yellow, life: 0.8 }); }
      palms(g, s, sd => [500 + sgn(sd) * 124, (s.k === 0 ? 730 : 716) - 236], { sleeve: '#3a86ff' });
    },
    hit(g, s, k) {
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 124, 490, { n: 6, r0: 70, r1: 150, w: 8, a0: -PI, arc: PI });
      g.fx.burst(500, 720, { n: 16, c: ['#8a5a3c', '#6e4429'], shape: 'drop', sp: [300, 700], size: [10, 20], g: 1800, dir: PI / 2 + 0.2, spread: 2.4 });
      if (k === 1) { g.fx.pop('ズズッ', 500, 250, { size: 96 }); g.fx.shake(6, 0.12); }
      else { g.fx.smoke(640, 680, 6, '#d9d9e2'); g.fx.pop('ブルルン', 200, 360, { size: 84 }); g.fx.shake(8, 0.14); g.fx.stars(500, 420, 6); }
    },
  },

  /* ---------- ドア・城の門を押し開ける（左右のとびら） ---------- */
  {
    id: 'push-door', acts: ['push'], modes: ['both', 'alt'], sfx: (k, v) => v.k === 'gate' ? 'thud' : 'swish', vars: DOORS,
    draw(g, s, v) {
      const V = g.V, W = V.x1 - V.x0 + 40, th = leafAngles(s), gate = v.k === 'gate', op = Math.min(1, (th.L + th.R) / 2.4);
      // まわりの壁
      if (!gate) {
        g.rect(V.x0 - 20, V.y0 - 20, W, 900 - V.y0, '#f3e6d6', 0); g.band(880, 'bottom', '#c98a52', 7);
        for (let y = 920; y < V.y1; y += 50) g.line([V.x0 - 20, y, V.x1 + 20, y], '#b57a45', 4);
        g.rect(V.x0 - 20, 700, W, 180, '#e6d3bd', 0); g.line([V.x0 - 20, 700, V.x1 + 20, 700], '#cdb698', 6);
        g.rr(120, 520, 70, 100, 10, '#3cc46b'); g.rect(130, 610, 50, 70, '#d0683a', 4); g.rr(810, 180, 110, 140, 6, '#ffd23f', 5); g.circ(865, 250, 30, '#ff6b6b', 4);
      } else {
        g.bg('#7d8296');
        const sg = []; for (let y = Math.floor(V.y0 / 70) * 70, r = 0; y < 900; y += 70, r++) { sg.push(V.x0 - 20, y, V.x1 + 20, y); for (let x = Math.floor(V.x0 / 140) * 140 + (r % 2) * 70; x < V.x1 + 140; x += 140) sg.push(x, y, x, y + 70); }
        segs(g, sg, '#62677a', 5);
        g.band(880, 'bottom', '#5b5f6f', 7);
        for (const x of [130, 870]) { g.rr(x - 14, 380, 28, 90, 8, '#6e4429'); g.glow(x, 350, 90, '#ffb347', 0.5); g.path(`M${x} 300 C${x + 22} 330 ${x + 24} 350 ${x + 14} 366 C${x + 6} 376 ${x - 6} 376 ${x - 14} 366 C${x - 24} 350 ${x - 22} 330 ${x} 300 Z`, '#ff9f1c', 0); }
      }
      // とびらの向こう
      g.clipRR(DX0, DT, DX1 - DX0, DB - DT, 0, () => {
        if (!gate) {
          g.rect(DX0, DT, 500, 750, g.lin(0, DT, 0, 600, ['#5fbfff', '#d8f3ff']), 0); g.sun(640, 250, 60); g.cloud(380, 230, 0.5);
          g.hills(600, '#8fd06a', 50, 5); g.rect(DX0, 640, 500, 260, '#79c95a', 0);
          for (let i = 0; i < 14; i++) { const x = DX0 + 20 + (i * 71) % 470, y = 660 + (i * 53) % 200; g.circ(x, y, 10, [C.pink, C.yellow, '#ffffff', C.red][i % 4], 3); }
          g.poly([440, 880, 560, 880, 520, 640, 480, 640], '#f2d49b', 0);
        } else {
          g.rect(DX0, DT, 500, 750, '#4a2c18', 0); g.glow(500, 640, 360, '#ffcf5a', 0.8);
          for (let i = 0; i < 7; i++) g.poly([500, 640, 500 + Math.cos(-PI + i * 0.52) * 600, 640 + Math.sin(-PI + i * 0.52) * 600, 500 + Math.cos(-PI + i * 0.52 + 0.2) * 600, 640 + Math.sin(-PI + i * 0.52 + 0.2) * 600], 'rgba(255,220,120,0.25)', 0);
          g.ell(500, 820, 230, 70, '#ffc83d'); for (let i = 0; i < 12; i++) g.circ(320 + i * 32, 800 - (i % 3) * 16, 16, '#ffe27a', 4);
          g.rr(410, 640, 180, 120, 14, '#a0522d'); g.rr(400, 600, 200, 60, 24, '#b5663a'); g.rect(486, 620, 28, 60, '#ffc83d'); g.ell(500, 640, 80, 18, '#ffe27a', 4);
          g.star(420, 590, 22, 9, 5, '#7fe8ff', 4); g.star(590, 600, 18, 8, 5, '#ff7fbf', 4);
        }
      });
      g.glow(500, 900, 300, gate ? '#ffcf5a' : '#fff6c4', 0.5 * op);
      leaf(g, v, leafQuad(DX0, 1, th.L), 1); leaf(g, v, leafQuad(DX1, -1, th.R), -1);
      // わく
      if (!gate) { g.rect(DX0 - 30, DT - 30, 30, DB - DT + 30, '#ffffff'); g.rect(DX1, DT - 30, 30, DB - DT + 30, '#ffffff'); g.rect(DX0 - 30, DT - 30, DX1 - DX0 + 60, 30, '#ffffff'); }
      else { g.path(`M${DX0 - 40} ${DB} L${DX0 - 40} ${DT} Q500 ${DT - 190} ${DX1 + 40} ${DT} L${DX1 + 40} ${DB} L${DX1} ${DB} L${DX1} ${DT} Q500 ${DT - 140} ${DX0} ${DT} L${DX0} ${DB} Z`, '#a3a8b8'); g.rect(DX0, DT - 150, 500, 150, '#7d8296', 0); g.line([DX0, DT, DX1, DT], C.ol, 6); }
      palms(g, s, sd => { const Q = sd === 'L' ? leafQuad(DX0, 1, th.L) : leafQuad(DX1, -1, th.R); return qp(Q, 0.62, 0.42); }, { sleeve: gate ? '#8e5cff' : '#ff7a59' });
    },
    hit(g, s, k, v) {
      const gate = v.k === 'gate';
      g.fx.shake(gate ? 9 : 5, 0.14);
      if (k === 1) g.fx.pop(gate ? 'ギギーッ' : 'ギィ', 500, 230, { size: 96 });
      else { g.fx.pop(gate ? 'おたから！' : 'わあ！', 500, 230, { size: 110, c: C.yellow }); g.fx.stars(500, 520, 10); if (gate) g.fx.coins(500, 640, 12); else g.fx.burst(500, 560, { n: 12, c: [C.pink, C.yellow, '#ffffff'], shape: 'leaf', sp: [200, 500], size: [16, 26], g: 300, life: [0.8, 1.3] }); g.sfx(gate ? 'magic' : 'chime'); }
    },
  },

  /* ---------- 雪玉を転がす（大きくなって雪だるまに） ---------- */
  {
    id: 'push-snowball', acts: ['push'], modes: ['both'], theme: 'winter', sfx: 'crunch',
    vars: [{ k: 'snowman', name: '雪玉を転がす', short: '雪玉' }],
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s), e1 = a1 < 0 ? 0 : E.outBack(clamp(a1 / 0.3), 1.6), e2 = a2 < 0 ? 0 : E.outBack(clamp(a2 / 0.25), 1.6);
      const r = SNOW_R[0] + (SNOW_R[1] - SNOW_R[0]) * e1 + (SNOW_R[2] - SNOW_R[1]) * e2, cy = 770 - r, rot = 1.2 * e1 + 1.2 * e2;
      g.sky('#7fc3f5', '#e4f4ff', 520);
      g.poly([V.x0 - 40, 520, 120, 360, 300, 520], '#e8f1fc', 0); g.poly([520, 520, 760, 330, 980, 470, V.x1 + 40, 520], '#dce8f8', 0);
      g.band(500, 'bottom', '#f5faff', 7);
      for (const [x, y, sc] of [[110, 520, 1], [880, 540, 0.9], [210, 500, 0.6], [760, 500, 0.55]]) g.at(x, y, 0, sc, sc, () => { g.tri(-60, 0, 60, 0, 0, -150, '#2f8a5a'); g.tri(-46, -70, 46, -70, 0, -190, '#37a066'); g.tri(-22, -150, 22, -150, 0, -190, '#ffffff', 0); });
      const B = V.y1 + 40;
      g.poly([500 - r * 0.8, 760, 500 + r * 0.8, 760, 500 + r * 0.8 + (B - 760) * 0.5, B, 500 - r * 0.8 - (B - 760) * 0.5, B], '#dfeaf8', 0);
      g.shadow(500, 770, r * 1.05, 26, 0.18);
      if (s.k === 2) { const ax = jig(a2, 0.2, 10, 5); for (const d of [-1, 1]) g.line([500 + d * r * 0.82, cy - r * 0.2, 500 + d * (r + 120), cy - r * 0.6 + ax * 80, 500 + d * (r + 150), cy - r * 0.8], '#7a4a2a', 10); }
      snowBall(g, 500, cy, r, rot);
      if (s.k === 2) {
        const hy = lerp(-400, cy - r - 96, E.outBounce(clamp(a2 / 0.3)));
        g.at(500, hy, () => {
          snowBall(g, 0, 0, 118, 0.4);
          g.circ(-40, -16, 11, C.ol, 0); g.circ(40, -16, 11, C.ol, 0); g.poly([-6, 6, 6, 6, 74, 22], C.orange, 4);
          for (let i = 0; i < 5; i++) g.circ(-36 + i * 18, 46 + Math.abs(i - 2) * -5, 6, C.ol, 0);
          g.rr(-80, -108, 160, 30, 10, C.red); g.rr(-56, -186, 112, 84, 16, C.red);
        });
        if (a2 > 0.05) g.rr(500 - r * 0.6, cy - r * 0.86, r * 1.2, 38, 18, '#3a86ff');
      }
      palms(g, s, sd => [500 + sgn(sd) * Math.min(130, r * 0.72), cy + 10], { sleeve: '#e8343c' });
    },
    hit(g, s, k) {
      const r = SNOW_R[k - 1];
      g.fx.burst(500, 770 - r * 0.4, { n: 16, c: ['#ffffff', '#e6f2ff'], shape: 'snow', sp: [200, 600], size: [14, 28], g: 1000 });
      g.fx.shake(k === 2 ? 8 : 5, 0.12);
      if (k === 1) g.fx.pop('ゴロン', 500, 200, { size: 100, c: '#ffffff' });
      else { g.fx.pop('雪だるま！', 500, 880, { size: 92, c: C.yellow, rise: 40 }); g.fx.stars(500, 300, 8); g.sfx('chime'); }
    },
  },

  /* ---------- 大きな岩をどかす（向こうに絶景） ---------- */
  {
    id: 'push-rock', acts: ['push'], modes: ['both'], theme: 'nature', sfx: 'thud',
    vars: [{ k: 'boulder', name: '大きな岩をどかす', short: '岩' }],
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s), e1 = a1 < 0 ? 0 : E.outQ(clamp(a1 / 0.3)), go = a2 < 0 ? 0 : E.inQ(clamp(a2 / 0.42));
      g.sky('#ff9a76', '#ffe2a8', 520); g.sun(500, 420, 80, '#fff3b0');
      g.poly([V.x0 - 40, 540, 200, 420, 360, 500, 520, 390, 700, 480, 860, 400, V.x1 + 40, 520, V.x1 + 40, 620, V.x0 - 40, 620], '#8c6bb1', 0);
      g.band(560, 620, '#5fb0e0'); g.line([300, 590, 700, 590], 'rgba(255,255,255,0.6)', 5);
      g.band(600, 'bottom', '#c79a6b', 7);
      if (s.k === 2) g.alpha(clamp(a2 / 0.25), () => { [C.red, C.orange, C.yellow, C.green, C.blue, C.purple].forEach((c, i) => g.arc(500, 600, 420 - i * 20, PI + 0.2, -0.2, c, 20)); });
      // 両側のがけ
      g.poly([V.x0 - 40, V.y0 - 20, 230, V.y0 - 20, 260, 200, 200, 420, 250, 600, 150, 900, V.x0 - 40, 900], '#7a5a48', 0); g.poly([V.x1 + 40, V.y0 - 20, 770, V.y0 - 20, 740, 240, 810, 430, 760, 620, 860, 900, V.x1 + 40, 900], '#7a5a48', 0);
      g.line([230, V.y0 - 20, 260, 200, 200, 420, 250, 600, 150, 900], C.ol, 6); g.line([770, V.y0 - 20, 740, 240, 810, 430, 760, 620, 860, 900], C.ol, 6);
      g.poly([V.x0 - 40, 900, 150, 900, 260, 640, 740, 640, 860, 900, V.x1 + 40, 900, V.x1 + 40, V.y1 + 40, V.x0 - 40, V.y1 + 40], '#b98a5a', 0);
      // 岩
      const sc = lerp(1, 0.9, e1) * lerp(1, 0.05, go), cy = lerp(lerp(700, 676, e1), 560, go), rot = 0.12 * e1 + 4 * go;
      if (s.k >= 1 && go < 1) for (const d of [-1, 1]) g.alpha(0.7 * (1 - go), () => g.poly([500 + d * 120, cy - 220 * sc, 500 + d * 420, cy - 380, 500 + d * 470, cy - 300, 500 + d * 200, cy - 160 * sc], 'rgba(255,240,180,0.5)', 0));
      if (go < 1) {
        g.shadow(500, cy + 20 * sc, 250 * sc, 28 * sc, 0.3);
        g.at(500 + jig(ageOf(s), 6, 20, 8), cy - 100 * sc, rot, sc, sc, () => {
          g.blob(ROCK, '#9a8f86');
          g.blob([-200, 20, -170, -80, -60, -150, 20, -120, -40, -20], '#aea398', 0);
          g.line([40, -200, 70, -120, 40, -60, 90, 10], '#6f655d', 7); g.line([-150, -60, -100, -20, -120, 40], '#6f655d', 6);
          g.blob([-120, -190, -40, -236, 60, -226, 0, -196], '#5cbf5c', 0);
          g.blob(ROCK, null);
        });
      }
      palms(g, s, sd => [500 + sgn(sd) * 130, (s.k === 0 ? 700 : 676) - (s.k === 0 ? 150 : 135)], { sleeve: '#2fb5a3' });
    },
    hit(g, s, k) {
      g.fx.smoke(380, 690, 5, '#e8d5bd'); g.fx.smoke(620, 690, 5, '#e8d5bd');
      g.fx.burst(500, 690, { n: 10, c: ['#9a8f86', '#c79a6b'], shape: 'chip', sp: [200, 500], size: [8, 16], g: 1600 });
      g.fx.shake(k === 2 ? 12 : 8, 0.16);
      if (k === 1) g.fx.pop('ズズッ', 500, 230, { size: 100 });
      else { g.fx.pop('ゴロゴロ！', 500, 200, { size: 104, c: C.yellow }); g.fx.stars(500, 420, 8); g.sfx('chime'); }
    },
  },

  /* ---------- くまとおすもう（押し出し） ---------- */
  {
    id: 'push-sumo', acts: ['push'], modes: ['both', 'alt'], theme: 'animal', sfx: ['smack', 'thud'],
    vars: [{ k: 'bear', name: 'くまとおすもう', short: 'おすもう' }],
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, a1 = age1(s), a2 = age2(s), e1 = a1 < 0 ? 0 : E.outBack(clamp(a1 / 0.3), 1.5), e2 = a2 < 0 ? 0 : E.outQ(clamp(a2 / 0.3));
      g.bg('#3b2a4f', '#5a3a5f');
      for (let row = 0; row < 5; row++) { const y = 170 + row * 76; for (let x = Math.floor(V.x0 / 90) * 90 + (row % 2) * 45; x < V.x1 + 45; x += 90) g.circ(x, y, 24, ['#7d5a8a', '#9a6aa0', '#b98cc0'][(((row + Math.round(x / 90)) % 3) + 3) % 3], 0); }
      // 屋根（つり屋根）
      g.rect(V.x0 - 20, V.y0 - 20, W, 110 - V.y0, '#6b3fa0', 0); g.rect(V.x0 - 20, 90, W, 26, '#4a2a75', 0);
      for (const [x, c] of [[90, '#2b2140'], [910, '#ffffff'], [V.x0 + 60, '#3a86ff'], [V.x1 - 60, '#e8343c']]) { if (Math.abs(x - 500) < 400 && x !== 90 && x !== 910) continue; g.line([x, 116, x, 190], C.ol, 9); g.circ(x, 196, 16, c); g.poly([x - 14, 206, x + 14, 206, x + 34, 290, x - 34, 290], c); for (const d of [-16, 0, 16]) g.line([x + d * 0.6, 214, x + d * 1.4, 286], g.rgba(C.ol, 0.25), 3); }
      g.band(520, 'bottom', '#e3c28f', 7);
      const ring = [V.x0 - 40, 660, 180, 586, 500, 560, 820, 586, V.x1 + 40, 660];
      g.curve(ring, C.ol, 42); g.curve(ring, '#d8b26a', 32); g.curve(ring.map((q, i) => i % 2 ? q - 8 : q), '#ead08e', 8);
      g.line([360, 700, 360, 760], '#ffffff', 10); g.line([640, 700, 640, 760], '#ffffff', 10);
      const sc = lerp(lerp(1, 0.8, e1), 0.62, e2), by = lerp(lerp(860, 742, e1), 600, e2), fall = e2 * 0.5 * (s.lastSide === 'L' ? 1 : -1), face = s.k;
      g.shadow(500, by, 190 * sc, 24 * sc, 0.25);
      g.at(500 + jig(ageOf(s), 10, 18, 6), by, fall + jig(ageOf(s), 0.05, 14, 5), sc, sc, () => bear(g, face, s.t));
      palms(g, s, sd => [500 + sgn(sd) * 110 * (s.k === 0 ? 1 : 0.82), (s.k === 0 ? 860 : 742) - 260 * (s.k === 0 ? 1 : 0.8)], { sleeve: '#ffd23f' });
    },
    hit(g, s, k) {
      g.fx.shake(k === 2 ? 11 : 7, 0.14);
      for (const sd of hitSides(s)) g.fx.lines(500 + sgn(sd) * 110, k === 1 ? 600 : 534, { n: 7, r0: 70, r1: 160, w: 9 });
      if (k === 1) g.fx.pop('ドスコイ', 500, 160, { size: 96 });
      else {
        g.fx.pop('おしだし！', 500, 160, { size: 110, c: C.yellow }); g.sfx('cheer');
        g.fx.burst(500, g.V.y0 + 40, { n: 10, c: ['#8e5cff', '#6b3fa0'], shape: 'square', sp: [300, 700], size: [34, 50], g: 1100, dir: PI / 2, spread: 2.4, life: [0.8, 1.2] });
      }
    },
  },

  /* ---------- 引き出しを閉める（左右2つ） ---------- */
  {
    id: 'push-drawer', acts: ['push'], modes: ['both', 'alt'], theme: 'home', sfx: 'wood',
    vars: [{ k: 'chest', name: '引き出しを閉める', short: '引き出し' }],
    draw(g, s) {
      const V = g.V, d = drawerOpen(s);
      g.bg('#dff0e8'); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1 + 120; x += 120) g.rect(x, V.y0 - 20, 40, 880 - V.y0, '#d3eadf', 0);
      g.rr(640, 60, 180, 140, 8, '#ffffff', 6); g.rect(656, 76, 148, 108, g.lin(0, 76, 0, 184, ['#8fd8ff', '#c9f0b0']), 0); g.circ(760, 110, 18, '#ffd23f', 0);
      g.band(860, 'bottom', '#c98a52', 7); for (let y = 900; y < V.y1; y += 46) g.line([V.x0 - 20, y, V.x1 + 20, y], '#b57a45', 4);
      g.shadow(500, 864, 380, 20);
      g.rr(160, 330, 680, 530, 20, '#d9a066');
      for (const y of [596, 726]) { g.rr(190, y, 620, 112, 10, '#f2c48a'); g.rr(440, y + 46, 120, 20, 10, '#a0673c', 4); }
      g.rr(150, 312, 700, 36, 12, '#c48a50');
      drawer(g, 'L', d.L, ['#ff6b6b', '#3a86ff', '#ffd23f']); drawer(g, 'R', d.R, ['#3cc46b', '#ff9fbd', '#8e5cff']);
      g.rr(232, 214, 64, 98, 10, '#ffffff'); g.path('M216 222 L312 222 L290 150 L238 150 Z', '#ffd23f');
      sleepyCat(g, 640, 284, s.k === 2 && s.age > 0.08, s.t);
      palms(g, s, sd => { const F = drawerFace(sd, d[sd]); return [F.x, F.y + 6]; }, { sleeve: '#3cc46b' });
    },
    hit(g, s, k) {
      const sides = s.mode === 'both' ? ['L', 'R'] : [tSide(s, k - 1)];
      for (const sd of sides) { g.fx.lines(DRAW_X[sd], DRAW_Y, { n: 8, r0: 120, r1: 210, w: 9 }); g.fx.smoke(DRAW_X[sd], DRAW_Y - 80, 3, '#ffffff'); }
      g.fx.shake(6, 0.1);
      if (k === 1) g.fx.pop('バタン', 500, 210, { size: 100 });
      else { g.fx.pop('スッキリ！', 500, 200, { size: 104, c: C.yellow }); g.fx.stars(500, 470, 9); g.fx.hearts(560, 250, 4); g.sfx('chime'); }
    },
  },

  /* ---------- ブランコを押す（向こうへこいで、もどってくる） ---------- */
  {
    id: 'push-swing', acts: ['push'], modes: ['both', 'alt'], theme: 'nature', sfx: 'swish',
    vars: [{ k: 'kid', name: 'ブランコを押す', short: 'ブランコ' }],
    draw(g, s) {
      const V = g.V, th = swingTh(s), P = swingProj(th);
      g.sky('#7cc8ff', '#e0f4ff', 600); g.cloud(180, 200, 0.7); g.cloud(840, 150, 0.55);
      for (let x = Math.floor(V.x0 / 170) * 170; x < V.x1 + 170; x += 170) { g.circ(x, 560, 100, '#4fae5a', 0); g.circ(x + 85, 590, 80, '#3f9a4c', 0); }
      g.band(600, 'bottom', '#8fd66b', 7); g.ell(500, 760, 230, 40, '#c9a26a', 0);
      g.grassTufts(680, '#79c255', 5, 8); g.grassTufts(900, '#79c255', 8, 7);
      for (const [a, b] of [[150, 230], [310, 230], [850, 770], [690, 770]]) g.line([a, 900, b, 80], '#3a86ff', 22);
      g.rr(196, 62, 608, 36, 16, '#e8343c');
      if (s.mode === 'alt') {   // ブランコが2つ：左の子は左手、右の子は右手で押す
        const kids = ['L', 'R'].map(sd => ({ sd, P: swingProj(swingThSide(s, sd)) })).sort((a, b) => a.P.f - b.P.f);
        for (const { sd, P: Q } of kids) {
          const x = 500 + sgn(sd) * 170, kx = 500 + (x - 500) * Q.f, f = Q.f * 0.8;
          for (const d of [-1, 1]) g.line([x + d * 80, 96, kx + d * 80 * f, Q.y + 12 * f], '#8f9bb0', 7);
          g.shadow(kx, 760, 96 * f, 15 * f, 0.18);
          g.at(0, Q.y, () => kidBack(g, f, s.k === 2, s.t, kx, sd === 'L' ? '#ff6b6b' : '#3cc46b', sd === 'L' ? '#ffd23f' : '#ff9fbd'));
        }
        palms(g, s, sd => [500 + sgn(sd) * 170, 604], { sleeve: '#8e5cff' });
      } else {
        const sy = P.y, f = P.f;
        for (const d of [-1, 1]) g.line([500 + d * 100, 96, 500 + d * 100 * f, sy + 14 * f], '#8f9bb0', 7);
        g.shadow(500, 760, 120 * f, 18 * f, 0.18);
        g.at(0, sy, () => kidBack(g, f, s.k === 2, s.t));
        palms(g, s, sd => [500 + sgn(sd) * 74, 600], { sleeve: '#8e5cff' });
      }
    },
    hit(g, s, k) {
      g.fx.shake(4, 0.08);
      if (k === 1) g.fx.pop('それっ', 500, 200, { size: 96 });
      else { g.fx.pop('わーい！', 500, 190, { size: 110, c: C.yellow }); g.fx.notes(500, 330, 5); g.fx.hearts(600, 330, 4); }
    },
  },

  /* ---------- かべを押す（ドミノみたいにたおれて海が見える） ---------- */
  {
    id: 'push-wall', acts: ['push'], modes: ['both'], theme: 'town', sfx: ['thud', 'swish'],
    vars: [{ k: 'sea', name: 'かべを押す', short: 'かべ' }],
    init(s) { s.my.land = 0; },
    draw(g, s) {
      const V = g.V, a2 = age2(s), x0 = V.x0 - 30, x1 = V.x1 + 30;
      const phi = s.k === 2 ? (PI / 2) * E.inQ(clamp(a2 / 0.24)) : s.k === 1 ? jig(s.age, 0.07, 14, 4) : 0;
      g.sky('#58bdf7', '#c9efff', 430); g.sun(760, 210, 70); g.cloud(260, 170, 0.6);
      g.band(420, 560, '#2fa7e6'); for (let x = Math.floor(V.x0 / 110) * 110; x < V.x1; x += 110) g.arc(x + 50, 470 + 16 * Math.sin(x + s.t * 2), 22, PI, 0, '#ffffff', 5);
      g.band(550, 'bottom', '#f2d49b');
      g.at(230, 690, -0.12, () => { g.taper(0, 0, 40, -330, 26, 16, '#a0673c'); for (let i = 0; i < 5; i++) g.at(40, -330, -2.6 + i * 0.62, () => g.ell(0, -70, 30, 90, '#3cb85a')); });
      g.at(660, 740, () => { g.ell(0, 0, 50, 30, '#ff5a5f'); g.circ(-56, -20, 16, '#ff5a5f'); g.circ(56, -20, 16, '#ff5a5f'); g.circ(-14, -34, 8, '#ffffff', 4); g.circ(14, -34, 8, '#ffffff', 4); g.circ(-14, -34, 3, C.ol, 0); g.circ(14, -34, 3, C.ol, 0); });
      g.band(800, 'bottom', '#b9b3a8', 7); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1 + 120; x += 120) g.line([x, 800, 500 + (x - 500) * 1.6, V.y1 + 20], '#a39d91', 4);
      // かべ
      const P = (x, v) => wallPt(x, v, phi), c0 = P(x0, 0), c1 = P(x1, 0), c2 = P(x1, 1), c3 = P(x0, 1);
      g.poly([...c0, ...c1, ...c2, ...c3], '#c8553d', 0);
      const sg = [];
      for (let j = 1; j < 9; j++) { const v = j / 9; sg.push(...P(x0, v), ...P(x1, v)); }
      for (let j = 0; j < 9; j++) for (let x = Math.floor(x0 / 120) * 120 + (j % 2) * 60; x < x1; x += 120) sg.push(...P(x, j / 9), ...P(x, (j + 1) / 9));
      segs(g, sg, '#e9d9c4', 7);
      g.poly([...P(x0, 0.95), ...P(x1, 0.95), ...c2, ...c3], '#d9d4c8', 0);
      if (s.k >= 1) g.line([...P(560, 1), ...P(530, 0.8), ...P(580, 0.62), ...P(540, 0.45)], C.ol, 6);
      g.poly([...c0, ...c1, ...c2, ...c3], null, 7);
      if (s.k === 2 && a2 > 0.24 && !s.my.land) { s.my.land = 1; g.sfx('stomp'); g.fx.shake(16, 0.3); g.fx.smoke(250, 760, 6, '#e8dcc8'); g.fx.smoke(750, 760, 6, '#e8dcc8'); g.fx.pop('バターン！', 500, 260, { size: 120, c: C.yellow }); g.fx.stars(500, 420, 8); }
      palms(g, s, sd => [500 + sgn(sd) * 130, 470], { sleeve: '#ff9f1c' });
    },
    hit(g, s, k) {
      g.fx.burst(500, 150, { n: 10, c: ['#e9d9c4', '#c8553d'], shape: 'chip', sp: [100, 300], size: [8, 14], g: 1600, dir: PI / 2, spread: 2.5, jx: 600 });
      if (k === 1) { g.fx.pop('グラッ', 500, 220, { size: 100 }); g.fx.shake(7, 0.14); }
      else g.fx.pop('えっ？', 220, 300, { size: 84, life: 0.5 });
    },
  },

  /* ---------- ボートを押し出す（うさぎが乗っている） ---------- */
  {
    id: 'push-boat', acts: ['push'], modes: ['both'], theme: 'sea', sfx: 'splash',
    vars: [{ k: 'rowboat', name: 'ボートを押し出す', short: 'ボート' }],
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s), e1 = a1 < 0 ? 0 : E.ioQ(clamp(a1 / 0.4)), e2 = a2 < 0 ? 0 : E.outQ(clamp(a2 / 0.5));
      g.sky('#6cc6ff', '#d5f2ff', 380); g.sun(830, 110, 60); g.cloud(220, 150, 0.6);
      g.curve([300, 220, 320, 204, 340, 220], C.ol, 5); g.curve([340, 220, 360, 204, 380, 220], C.ol, 5);
      g.band(370, 'bottom', '#2fa7e6'); for (let i = 0; i < 4; i++) for (let x = Math.floor(V.x0 / 140) * 140 + i * 50; x < V.x1; x += 140) g.arc(x, 410 + i * 60 + 6 * Math.sin(s.t * 2 + x), 20 + i * 6, PI, 0, 'rgba(255,255,255,0.7)', 4);
      g.band(650, 'bottom', '#f2d49b', 0); g.band(650, 700, '#e3bd80'); g.curve([V.x0 - 20, 650, 200, 640 + 8 * Math.sin(s.t * 2), 500, 652, 800, 640, V.x1 + 20, 650], '#ffffff', 10);
      for (const [x, y] of [[160, 860], [820, 900], [700, 780]]) g.star(x, y, 22, 10, 5, '#ff9f8a', 4);
      const sc = lerp(lerp(1, 0.76, e1), 0.32, e2), by = lerp(lerp(840, 690, e1), 440, e2), bob = s.k >= 1 ? Math.sin(s.t * 5) * 6 : 0;
      if (e1 < 0.5) g.shadow(500, by, 220 * sc, 20 * sc, 0.25);
      g.at(500, by + bob, jig(ageOf(s), 0.03, 12, 5), sc, sc, () => rowboat(g, s.t, s.k === 2 && a2 > 0.06));
      if (e1 > 0.3) g.ell(500, by + bob + 4, 260 * sc, 22 * sc, 'rgba(255,255,255,0.75)', 0);
      palms(g, s, sd => [500 + sgn(sd) * (s.k === 0 ? 132 : 102), s.k === 0 ? 712 : 594], { sleeve: '#2fb5a3' });
    },
    hit(g, s, k) {
      g.fx.splash(500, k === 1 ? 700 : 600, '#5fd0ff', 18); g.fx.shake(6, 0.12);
      if (k === 1) g.fx.pop('ザザッ', 500, 250, { size: 100 });
      else { g.fx.pop('いってきまーす', 500, 250, { size: 76, c: C.yellow, life: 0.9 }); g.fx.stars(500, 420, 6); g.fx.notes(560, 330, 4); }
    },
  },

  /* ---------- 大玉ころがし（ゴールテープを切る） ---------- */
  {
    id: 'push-bigball', acts: ['push'], modes: ['both', 'alt'], theme: 'school', sfx: 'thud',
    vars: [{ k: 'odama', name: '大玉ころがし', short: '大玉' }],
    init(s) { s.my.goal = 0; },
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s), HZ = 420;
      const pr = a1 < 0 ? 0 : E.ioQ(clamp(a1 / 0.5)), go = a2 < 0 ? 0 : E.ioQ(clamp(a2 / 0.45));
      g.sky('#7cc8ff', '#e6f6ff', HZ);
      g.rect(140, 250, 720, 170, '#f4efe4'); for (let i = 0; i < 9; i++) g.rect(170 + i * 76, 290, 50, 40, '#9fd8ff', 4); g.circ(500, 220, 30, '#ffffff'); g.rect(470, 236, 60, 14, '#f4efe4', 0);
      for (const y0 of [60, 150]) { g.curve([V.x0 - 20, y0, 500, y0 + 50, V.x1 + 20, y0], C.ol, 3); for (let x = Math.ceil(V.x0 / 60) * 60; x < V.x1; x += 60) { if (x < -120 || x > 1120) continue; const t = (x - V.x0) / (V.x1 - V.x0), y = y0 + 50 * 4 * t * (1 - t) * 0.95; g.rect(x - 16, y, 32, 22, [C.red, C.blue, C.yellow, C.green, '#ffffff'][((x / 60) % 5 + 5) % 5], 3); } }
      g.band(HZ, 'bottom', '#d9b48a', 7);
      const B = V.y1 + 40;
      for (const d of [-1, 1]) for (const k of [0.35, 1.1]) g.line([500 + d * 40 * k, HZ, 500 + d * (B - HZ) * k, B], '#ffffff', 8);
      for (let i = 0; i < 6; i++) { const q = ((i + pr * 0.9) % 6) / 6, y = HZ + (B - HZ) * q * q; g.line([500 - (y - HZ) * 1.1, y, 500 + (y - HZ) * 1.1, y], 'rgba(255,255,255,0.45)', 3 + 8 * q); }
      const dB = 1 + 2 * go, r = 250 / dB, bb = HZ + (840 - HZ) / dB, dG = lerp(3.2, 2, pr);
      const gate = () => {
        const gb = HZ + 420 / dG, gh = 1000 / dG, gw = 700 / dG, ty = gb - 200 / dG;
        for (const d of [-1, 1]) g.rr(500 + d * gw - 10 / dG, gb - gh, 20 / dG, gh, 6, '#ffffff');
        g.rr(500 - gw, gb - gh, gw * 2, 130 / dG, 12, '#e8343c'); g.text('ゴール', 500, gb - gh + 66 / dG, { size: 90 / dG, f: '#ffffff' });
        if (dB < dG) g.line([500 - gw, ty, 500 + gw, ty], '#ffffff', 10 / dG);
        else { const t = clamp((a2 - 0.2) / 0.3); for (const d of [-1, 1]) g.curve([500 + d * gw, ty, 500 + d * gw * (1 - 0.3 * t), ty + 40 * t, 500 + d * gw * (0.7 - 0.2 * t), ty + 110 * t], '#ffffff', 10 / dG); }
      };
      if (dB >= dG) { bigBall(g, 500, bb - r, r, pr * 2.4 + go * 2); gate(); }
      else { gate(); g.shadow(500, bb, r * 0.9, r * 0.1, 0.2); bigBall(g, 500, bb - r, r, pr * 2.4 + go * 2); }
      if (dB >= dG && !s.my.goal) { s.my.goal = 1; g.sfx('goal'); g.fx.confetti(60); g.fx.pop('ゴール！', 500, 230, { size: 120, c: C.yellow }); }
      palms(g, s, sd => [500 + sgn(sd) * 150, 620], { sleeve: '#ffffff' });
    },
    hit(g, s, k) {
      g.fx.burst(500, 830, { n: 10, c: ['#d9b48a', '#c49a6c'], shape: 'dot', sp: [150, 400], size: [8, 14], g: 900, dir: PI / 2, spread: 2.6 });
      g.fx.shake(5, 0.1);
      if (k === 1) g.fx.pop('ゴロン', 500, 240, { size: 100 });
    },
  },

  /* ---------- ボウリング（2投でスペア） ---------- */
  {
    id: 'push-bowling', acts: ['push'], modes: ['both', 'alt'], theme: 'sports', sfx: 'whoosh',
    vars: [{ k: 'spare', name: 'ボウリング', short: 'ボウリング' }],
    init(s) { const r = s.r; s.my.pf = PINS.map(([x]) => ({ vx: (x - 500) * 7 + (r() - 0.5) * 260, vy: -260 - r() * 320, w: (r() - 0.5) * 18 })); s.my.snd = [0, 0]; },
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s), B = V.y1 + 40;
      g.bg('#1d1840', '#2c2463');
      for (const [c, y] of [['#ff4fa3', 70], ['#2ee6ff', 120]]) g.curve([V.x0 - 20, y, 250, y + 30, 500, y - 10, 750, y + 30, V.x1 + 20, y], c, 6);
      g.glow(500, 250, 260, '#fff3c4', 0.35);
      g.poly([400, 210, 440, 210, 130, B, V.x0 - 40, B], '#3a3260', 0); g.poly([600, 210, 560, 210, 870, B, V.x1 + 40, B], '#3a3260', 0);
      g.poly([440, 210, 560, 210, 870, B, 130, B], '#ebc48c');
      const sg = []; for (let i = 1; i < 8; i++) { const u = i / 8; sg.push(lerp(440, 560, u), 210, lerp(130, 870, u), B); } segs(g, sg, '#d9ad74', 3);
      for (let i = 0; i < 5; i++) { const x = 500 + (i - 2) * 70; g.tri(x - 12, 640, x + 12, 640, x, 610, '#c48a50', 0); }
      g.rect(420, 196, 160, 16, '#f6e3c0', 0);
      // ピン（奥から）
      for (let i = PINS.length - 1; i >= 0; i--) {
        const [x, y] = PINS[i], tf = PIN_FALL1.includes(i) ? (a1 < 0 ? -1 : a1 - 0.3) : (a2 < 0 ? -1 : a2 - 0.25);
        if (tf < 0) { g.shadow(x, y + 12, 16, 5, 0.3); pin(g, x, y, 0.62, 0); }
        else if (tf < 0.7) { const [dx, dy, rot] = fly(s.my.pf[i], tf, 1800); g.alpha(1 - tf / 0.7, () => pin(g, x + dx, y + dy, 0.62, rot)); }
      }
      // ボール
      const roll = (t, c) => { const d = 1 + 30 * t; if (t < 0.3) bowlBall(g, 500, 210 + (800 - 210) / d - 150 / d, 150 / d, c, t * 30); };
      if (a1 < 0) bowlBall(g, 500, 650, 150, '#3a86ff', 0); else roll(a1, '#3a86ff');
      if (a1 >= 0.3 && !s.my.snd[0]) { s.my.snd[0] = 1; g.sfx('wood'); g.fx.pop('ガコーン', 500, 150, { size: 90 }); g.fx.burst(500, 260, { n: 10, c: ['#ffffff', C.yellow], shape: 'spark', sp: [300, 700], size: [12, 22], g: 0, life: [0.15, 0.3] }); }
      if (s.k === 1) { const q = E.outQ(clamp((a1 - 0.45) / 0.35)); if (q > 0) bowlBall(g, lerp(1000, 500, q), 650, 150, '#ff5fa2', -3 * q); }
      if (a2 >= 0) roll(a2, '#ff5fa2');
      if (a2 >= 0.25 && !s.my.snd[1]) { s.my.snd[1] = 1; g.sfx('cheer'); g.fx.pop('スペア！', 500, 150, { size: 120, c: C.yellow }); g.fx.confetti(60); g.fx.stars(500, 260, 8); }
      palms(g, s, sd => [500 + sgn(sd) * (s.mode === 'alt' ? 64 : 104), 660], { sleeve: '#ff4fa3' });
    },
    hit(g, s, k) { g.fx.lines(500, 640, { n: 8, r0: 170, r1: 260, w: 9, a0: -PI, arc: PI }); g.fx.shake(4, 0.08); g.fx.pop(k === 1 ? 'それっ' : 'いけっ', 500, 420, { size: 80, life: 0.45 }); },
  },

  /* ---------- ぞうのおしりを押す（立ち上がって水をふく） ---------- */
  {
    id: 'push-elephant', acts: ['push'], modes: ['both', 'alt'], theme: 'animal', sfx: ['thud', 'honk'],
    vars: [{ k: 'zou', name: 'ぞうのおしりを押す', short: 'ぞう' }],
    init(s) { s.my.spray = 0; },
    draw(g, s) {
      const V = g.V, a2 = age2(s), B = V.y1 + 40;
      const up = a2 < 0 ? 0 : E.outBack(clamp(a2 / 0.16), 1.4), walk = a2 < 0 ? 0 : E.inQ(clamp((a2 - 0.14) / 0.5)), trunk = a2 < 0 ? 0 : clamp((a2 - 0.08) / 0.12);
      g.sky('#86d4ff', '#e6f7ff', 520); g.cloud(200, 150, 0.7);
      for (const x of [80, 920]) { g.rect(x - 22, 160, 44, 380, '#8a5a36'); g.circ(x, 160, 150, '#3f9a4c'); g.circ(x + (x < 500 ? 90 : -90), 230, 110, '#4fae5a'); }
      g.band(520, 'bottom', '#8fcf5a', 7);
      g.poly([450, 520, 550, 520, 500 + (B - 520) * 0.9, B, 500 - (B - 520) * 0.9, B], '#e6c38f', 0);
      for (const [x, y, c] of [[180, 640, C.pink], [820, 700, C.yellow], [120, 860, '#ffffff'], [880, 900, C.pink]]) { g.circ(x, y, 16, c, 4); g.circ(x, y, 6, C.orange, 0); }
      const sc = lerp(1, 0.5, walk), by = lerp(870, 640, walk) - Math.abs(Math.sin(s.t * 10)) * 12 * walk, [sx, sy] = squash(ageOf(s), 0.07);
      g.shadow(500, by, 270 * sc, 30 * sc, 0.25);
      g.at(500, by, 0, sc * sx, sc * sy, () => elephantBack(g, s.t, s.k >= 1, up, trunk));
      if (trunk >= 1 && !s.my.spray) { s.my.spray = 1; const hx = 500 + 182 * sc, hy = by - 870 * sc; g.fx.burst(hx, hy, { n: 24, c: ['#5fd0ff', '#bfefff', '#ffffff'], shape: 'drop', sp: [600, 1000], size: [12, 22], g: 1500, dir: -PI / 2 + 0.2, spread: 0.9 }); g.fx.pop('パオーン！', 500, 150, { size: 108, c: C.yellow }); g.fx.hearts(500, 300, 5); }
      palms(g, s, sd => [500 + sgn(sd) * 150, 690], { sleeve: '#ff9f1c' });
    },
    hit(g, s, k) {
      g.fx.lines(500, 690, { n: 8, r0: 180, r1: 270, w: 9, a0: PI * 0.1, arc: PI * 0.8 }); g.fx.shake(k === 2 ? 9 : 7, 0.14);
      if (k === 1) g.fx.pop('ムギュッ', 500, 200, { size: 100 });
    },
  },

  /* ---------- 雨雲を押す（晴れてにじが出る） ---------- */
  {
    id: 'push-cloud', acts: ['push'], modes: ['both', 'alt'], theme: 'fantasy', sfx: 'whoosh',
    vars: [{ k: 'rain', name: '雨雲を押す', short: '雨雲' }],
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s), e1 = a1 < 0 ? 0 : E.outBack(clamp(a1 / 0.3), 1.4), e2 = a2 < 0 ? 0 : E.outQ(clamp(a2 / 0.3));
      const clear = Math.max(0.35 * clamp(e1), e2), sc = lerp(lerp(2.3, 1.75, e1), 0.4, e2), cy = lerp(lerp(450, 380, e1), 110, e2), mood = s.k;
      g.bg(g.mix('#6f7d96', '#5cc0ff', clear), g.mix('#aab4c6', '#e2f6ff', clear));
      if (e2 > 0) { g.sun(500, lerp(640, 250, e2), 90); g.alpha(e2 * 0.8, () => [C.red, C.orange, C.yellow, C.green, C.blue, C.purple].forEach((c, i) => g.arc(500, 760, 460 - i * 22, PI + 0.12, -0.12, c, 22))); }
      g.hills(720, g.mix('#5e8a5a', '#7cc35a', clear), 50, 4); g.band(780, 'bottom', g.mix('#557f4f', '#8fd66b', clear), 7);
      for (let i = 0; i < 9; i++) { const x = 130 + i * 92, y = 820 + (i % 3) * 50, q = e2 > 0 ? E.outBack(clamp((a2 - i * 0.02) / 0.15), 2) : 0.35; g.line([x, y, x, y + 40], '#3f9a46', 6); g.at(x, y, 0, q, q, () => { for (let j = 0; j < 5; j++) g.circ(Math.cos(j * 1.26) * 14, Math.sin(j * 1.26) * 14, 11, [C.pink, C.yellow, '#ffffff'][i % 3], 0); g.circ(0, 0, 8, C.orange, 0); }); }
      const rain = 1 - clear;
      if (rain > 0.05) for (const [x, y0] of RAIN) { const y = cy + 60 * sc + ((y0 + s.t * 900) % 420); g.line([x, y, x - 8, y + 36], g.rgba('#e6f4ff', 0.85 * rain), 5); }
      g.at(500 + jig(ageOf(s), 14 * (s.lastSide === 'L' ? 1 : -1), 12, 5), cy, 0, sc, sc, () => {
        const cc = g.mix(g.mix('#7d8597', '#b4bbca', e1), '#ffffff', e2);
        for (const [x, y, r] of PUFFS) g.circ(x, y, r + 7 / sc, C.ol, 0);
        for (const [x, y, r] of PUFFS) g.circ(x, y, r, cc, 0);
        g.hl(-60, -70, 40, 14, -0.3, 0.35);
        g.at(0, -14, 0, 0.42, 0.42, () => cloudFace(g, mood));
      });
      palms(g, s, sd => [500 + sgn(sd) * 140, s.k === 0 ? 480 : 418], { sleeve: '#ffd23f' });
    },
    hit(g, s, k) {
      g.fx.lines(500, 420, { n: 10, r0: 160, r1: 300, w: 10, c: '#ffffff' }); g.fx.shake(6, 0.12);
      g.fx.burst(500, 450, { n: 10, c: ['#ffffff', '#dfe6f2'], shape: 'smoke', sp: [100, 300], size: [50, 90], g: -50, life: [0.5, 0.9], grow: 1.2, drag: 0.94 });
      if (k === 1) g.fx.pop('フワッ', 500, 210, { size: 100 });
      else { g.fx.pop('はれた！', 500, 160, { size: 110, c: C.yellow }); g.fx.stars(500, 280, 8); g.sfx('chime'); }
    },
  },

  /* ---------- 宇宙船を押す（月から飛び立つ） ---------- */
  {
    id: 'push-ufo', acts: ['push'], modes: ['both'], theme: 'space', sfx: ['zap', 'rocket'],
    vars: [{ k: 'alien', name: '宇宙船を押す', short: '宇宙船' }],
    init(s) { s.my.st = Array.from({ length: 34 }, () => [s.r(), s.r(), 2 + s.r() * 4]); },
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s);
      g.bg('#0b0f2e', '#2a2466');
      for (const [u, v, r] of s.my.st) g.circ(lerp(V.x0, V.x1, u), lerp(V.y0, 620, v), r, '#ffffff', 0);
      g.circ(820, 170, 72, '#3a86ff'); g.clipCirc(820, 170, 72, () => { g.blob([780, 130, 830, 120, 850, 160, 810, 190, 790, 170], '#3cc46b', 0); g.blob([840, 200, 880, 190, 870, 230, 840, 236], '#3cc46b', 0); }); g.circ(820, 170, 72, null); g.hl(796, 140, 20, 10, -0.6, 0.5);
      g.band(640, 'bottom', '#c9ccd6', 7);
      for (const [x, y, rx] of [[160, 700, 90], [780, 760, 120], [420, 920, 70], [880, 940, 80]]) { g.ell(x, y, rx, rx * 0.28, '#aeb3c2', 0); g.ell(x, y - 4, rx * 0.8, rx * 0.2, '#b9bdca', 0); }
      const hover = a1 < 0 ? 0 : 36 * E.outBack(clamp(a1 / 0.3)), go = a2 < 0 ? 0 : E.inQ(clamp(a2 / 0.36));
      const sc = lerp(1.2, 0.2, go), x = lerp(500, 720, go), y = lerp(590 - hover + (s.k === 1 ? Math.sin(s.t * 6) * 6 : 0), 60, go);
      if (s.k === 0) for (let i = 0; i < 3; i++) { const q = (s.t * 1.3 + i / 3) % 1; g.alpha(1 - q, () => g.circ(430 + i * 60, 640 - q * 140, 20 + q * 30, '#8a8fa3', 0)); }
      if (s.k >= 1 && go < 1) g.alpha(0.5, () => g.poly([x - 90 * sc, y + 40 * sc, x + 90 * sc, y + 40 * sc, x + 160 * sc, y + 240 * sc, x - 160 * sc, y + 240 * sc], '#9ff7ff', 0));
      if (go > 0) for (let i = 1; i < 6; i++) g.star(lerp(500, x, 1 - i * 0.15), lerp(600, y, 1 - i * 0.15), 16, 7, 5, C.yellow, 0);
      g.shadow(500, 660, 250, 26, 0.3 * (1 - go));
      g.at(x, y, Math.sin(s.t * 3) * 0.04, sc, sc, () => {
        alien(g, 0, -70, s.k === 2 ? 2 : s.k === 1 ? 1 : 0, s.t);
        g.path('M-122 -8 A122 118 0 0 1 122 -8 Z', 'rgba(190,240,255,0.45)'); g.hl(-60, -80, 20, 34, -0.5, 0.6);
        saucer(g, s.t, s.k >= 1);
      });
      palms(g, s, sd => [500 + sgn(sd) * 180, s.k === 0 ? 616 : 580], { sleeve: '#4fc3f7' });
    },
    hit(g, s, k) {
      g.fx.sparks(500, 620, 10, ['#9ff7ff', '#ffffff', C.yellow]); g.fx.shake(k === 2 ? 10 : 6, 0.14);
      if (k === 1) g.fx.pop('ウィーン', 500, 230, { size: 96 });
      else { g.fx.pop('ありがとう！', 500, 320, { size: 96, c: C.yellow, life: 0.9 }); g.fx.stars(560, 300, 10); }
    },
  },

  /* ---------- プリンを押す（ぷるん・クリームとさくらんぼ） ---------- */
  {
    id: 'push-pudding', acts: ['push'], modes: ['both', 'alt'], theme: 'kitchen', sfx: 'boing',
    vars: [{ k: 'purin', name: 'プリンを押す', short: 'プリン' }],
    draw(g, s) {
      const V = g.V, a = ageOf(s), a1 = age1(s), a2 = age2(s), dir = s.lastSide === 'L' ? 1 : s.lastSide === 'R' ? -1 : 0;
      const wob = jig(a, 46 * dir, 13, 3.6), sq = 1 + jig(a, dir ? 0.06 : 0.14, 15, 4);
      g.bg('#ffe9d6'); g.stripes(Math.floor(V.x0 / 120) * 120, V.y0 - 20, V.x1 - Math.floor(V.x0 / 120) * 120 + 40, 740 - V.y0, 60, '#ffe9d6', '#ffdcc2');
      g.rr(120, 120, 220, 200, 16, '#ffffff'); g.rect(136, 136, 188, 168, g.lin(0, 136, 0, 304, ['#8fd8ff', '#e6f7ff']), 0); g.line([230, 136, 230, 304], '#ffffff', 10); g.rr(120, 120, 220, 200, 16, null);
      g.rect(640, 230, 260, 14, '#c98a52'); g.rr(670, 160, 50, 70, 10, '#ff9fbd'); g.rr(740, 140, 56, 90, 10, '#9cf2d8'); g.rr(820, 170, 44, 60, 10, '#ffd23f');
      g.band(740, 'bottom', '#ffffff', 7); g.tiles(V.x0 - 20, 740, V.x1 - V.x0 + 40, V.y1 - 720, 60, '#ffffff', '#ff8fa8');
      g.ell(500, 732, 320, 54, '#ffffff'); g.ell(500, 726, 262, 38, '#eef1f6', 0);
      if (a2 >= 0) [[250, 726, 'st'], [750, 726, 'st'], [330, 760, 'ki'], [670, 760, 'ki'], [500, 776, 'st']].forEach(([x, y, k], i) => { const q = E.outBack(clamp((a2 - 0.04 - i * 0.03) / 0.12), 2.2); if (q > 0) g.at(x, y, 0, q, q, () => { if (k === 'st') { g.path('M0 30 Q-30 0 -24 -16 Q0 -30 24 -16 Q30 0 0 30 Z', '#ff4a5a'); g.tri(-14, -18, 14, -18, 0, -6, '#3cc46b', 0); } else { g.ell(0, 0, 32, 22, '#8fd14f'); g.ell(0, 0, 20, 12, '#d8f5a2', 0); } }); });
      const cream = a1 < 0 ? 0 : E.outBack(clamp(a1 / 0.2), 2), cherry = a2 < 0 ? 0 : E.outBounce(clamp(a2 / 0.28));
      pudding(g, wob, sq, cream, cherry, '#e8343c');
      palms(g, s, sd => [500 + sgn(sd) * 118, 610], { sleeve: '#ff7fbf' });
    },
    hit(g, s, k) {
      g.fx.shake(5, 0.1);
      if (k === 1) { g.fx.pop('プルン', 500, 230, { size: 100 }); g.fx.burst(500, 360, { n: 8, c: ['#ffffff'], shape: 'dot', sp: [150, 350], size: [10, 18], g: 900 }); }
      else { g.fx.pop('かんせい！', 500, 200, { size: 110, c: C.yellow }); g.fx.stars(500, 300, 8); g.fx.hearts(500, 360, 4); }
    },
  },

  /* ---------- りんごの木をゆらす（りんごが落ちる） ---------- */
  {
    id: 'push-tree', acts: ['push'], modes: ['both', 'alt'], theme: 'farm', sfx: 'thud',
    vars: [{ k: 'apple', name: 'りんごの木をゆらす', short: 'りんご' }],
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s), sw = jig(ageOf(s), (s.k === 2 ? 0.07 : 0.05) * (s.lastSide === 'L' ? -1 : 1), 20, 4);
      g.sky('#86d0ff', '#e2f5ff', 700); g.cloud(170, 110, 0.6); g.cloud(860, 170, 0.5);
      g.hills(700, '#a5d86a', 40, 6); g.band(760, 'bottom', '#8fd66b', 7);
      for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1 + 90; x += 90) { g.rect(x - 6, 700, 12, 80, '#d9a066', 0); } g.rect(V.x0 - 20, 716, V.x1 - V.x0 + 40, 12, '#d9a066', 0); g.rect(V.x0 - 20, 750, V.x1 - V.x0 + 40, 12, '#d9a066', 0);
      g.rr(752, 800, 170, 110, 20, '#c98a52'); g.ell(837, 806, 85, 22, '#8a5a36');
      const fallen = [];
      APPLES.forEach(([x, y], i) => { const grp = APPLE_K[i]; if (s.k > grp) fallen.push(i); });
      if (s.k === 2 && a2 > 0.25) for (let j = 0; j < 6; j++) g.circ(790 + (j % 3) * 36, 780 - Math.floor(j / 3) * 24, 20, '#ff4a4a', 4);
      g.rr(752, 800, 170, 110, 20, null); g.line([775, 840, 900, 840], '#a0673c', 5); g.line([775, 870, 900, 870], '#a0673c', 5);
      g.shadow(500, 880, 160, 20, 0.25);
      g.at(500, 880, sw, () => {
        g.poly([-90, 0, 90, 0, 52, -360, -52, -360], '#8a5a36'); g.line([-30, -40, -20, -300], '#6e4429', 6); g.line([30, -60, 24, -280], '#6e4429', 6);
        g.line([-40, -340, -150, -470], '#8a5a36', 30); g.line([40, -340, 170, -460], '#8a5a36', 30);
        for (const [x, y, r, c] of [[-170, -560, 170, '#3f9a4c'], [170, -560, 170, '#3f9a4c'], [0, -660, 200, '#4fae5a'], [-110, -470, 150, '#4fae5a'], [120, -470, 150, '#4fae5a'], [0, -520, 170, '#5cbf5c']]) g.circ(x, y, r, c);
        APPLES.forEach(([x, y], i) => { if (s.k > APPLE_K[i]) return; g.circ(x - 500, y - 880, 24, '#e8343c', 5); g.line([x - 500, y - 904, x - 496, y - 918], '#6e4429', 4); g.hl(x - 508, y - 888, 6, 4, -0.6, 0.7); });
      });
      for (const i of fallen) {
        const [x, y] = APPLES[i], t = (APPLE_K[i] === 0 ? a1 : a2) - (i % 4) * 0.025; if (t < 0) { g.circ(x, y, 24, '#e8343c', 5); continue; }
        const gy = 840 + (i % 4) * 26, yy = Math.min(gy, y + 0.5 * 3200 * t * t), x2 = x + (x - 500) * 0.4 * Math.min(t, 0.4);
        g.circ(x2, yy, 24, '#e8343c', 5); g.hl(x2 - 8, yy - 8, 6, 4, -0.6, 0.7);
      }
      palms(g, s, sd => [500 + sgn(sd) * 64, 650], { sleeve: '#3cc46b' });
    },
    hit(g, s, k) {
      g.fx.burst(500, 360, { n: k === 2 ? 16 : 10, c: ['#3f9a4c', '#5cbf5c', '#8fd14f'], shape: 'leaf', sp: [150, 500], size: [14, 24], g: 700, life: [0.6, 1.1] });
      g.fx.shake(k === 2 ? 9 : 6, 0.12);
      if (k === 1) g.fx.pop('ユサッ', 500, 140, { size: 96 });
      else { g.fx.pop('大りょう！', 500, 140, { size: 108, c: C.yellow }); g.fx.stars(830, 720, 8); g.sfx('coin'); }
    },
  },

  /* ---------- 除夜の鐘をつく（初日の出） ---------- */
  {
    id: 'push-bell', acts: ['push'], modes: ['both'], theme: 'festival', sfx: 'gong',
    vars: [{ k: 'joya', name: '除夜の鐘をつく', short: '鐘' }],
    init(s) { s.my.sn = Array.from({ length: 18 }, () => [s.r(), s.r() * 1000, 4 + s.r() * 6, 40 + s.r() * 60]); },
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, a = ageOf(s), dawn = s.k === 2 ? E.outQ(clamp(s.age / 0.3)) : 0;
      g.bg(g.mix('#1b1c4a', '#ff9e7a', dawn), g.mix('#3a2f6b', '#ffe3a8', dawn));
      if (dawn > 0) g.sun(500, lerp(860, 660, dawn), 120, '#ffdf6b');
      g.hills(800, g.mix('#2a2550', '#7a5a8a', dawn), 50, 7);
      for (const [u, y0, r, v] of s.my.sn) { const y = ((y0 + s.t * v) % (V.y1 - V.y0 + 100)) + V.y0 - 50; g.circ(lerp(V.x0, V.x1, u) + Math.sin(s.t + y0) * 10, y, r, 'rgba(255,255,255,0.85)', 0); }
      g.band(820, 'bottom', '#eef2f9', 7);
      g.rect(130, 110, 50, 720, '#9a3a2a'); g.rect(820, 110, 50, 720, '#9a3a2a');
      g.rect(100, 96, 800, 44, '#6e4429');
      g.path('M-60 120 Q500 30 1060 120 L1060 70 Q500 -40 -60 70 Z', '#3a2f3a');
      const sw = jig(a, 0.04, 10, 2.5);
      g.at(500, 140, sw, () => g.at(0, 300, 0, 1.12, 1.12, () => bellDraw(g)));
      if (s.k >= 1) g.alpha(Math.exp(-2.5 * a), () => g.glow(500, 300, 340, '#ffcf6a', 0.6));
      const p = s.p, ez = lerp(0.8, 1.12, p), ey = lerp(660, 770, p), er = 100 * ez;
      for (const [u, d] of [[0.3, -1], [0.7, 1]]) { const yy = lerp(ey - er, 470, u); g.line([500 + d * 150, 140, 500 + d * 20, yy], '#d9c08a', 7); }
      g.poly([500 - er, ey, 500 - 40, 480, 500 + 40, 480, 500 + er, ey], '#b5763f');
      g.line([500 - er * 0.5, ey - er * 0.8, 500 - 20, 470], '#8a5a2b', 5); g.line([500 + er * 0.4, ey - er * 0.9, 500 + 16, 470], '#8a5a2b', 5);
      g.circ(500, ey, er, '#e8c48a'); for (const k of [0.75, 0.5, 0.25]) g.ring(500, ey, er * k, '#c9965a', 5); g.circ(500, ey, er, null);
      g.ring(500, ey, er - 6, '#8a5a2b', 10);
      palms(g, s, sd => [500 + sgn(sd) * 66, 690], { sleeve: '#5b6cd8' });
    },
    hit(g, s, k) {
      for (let i = 0; i < 2; i++) g.fx.ring(500, 300, { r0: 190 + i * 40, r1: 540, w: 12, c: '#ffe7a8', life: 0.6 + i * 0.2 });
      g.fx.shake(k === 2 ? 10 : 6, 0.2);
      if (k === 1) g.fx.pop('ゴーン', 200, 300, { size: 100, c: '#ffe7a8', life: 0.9 });
      else { g.fx.pop('ゴォーン！', 500, 900, { size: 110, c: C.yellow, life: 1 }); g.fx.stars(500, 330, 10, ['#ffe7a8', '#ffffff', C.gold]); g.sfx('chime'); }
    },
  },

  /* ---------- ペンギンをすべらせる（海へドボン → 魚をゲット） ---------- */
  {
    id: 'push-penguin', acts: ['push'], modes: ['both'], theme: 'winter', sfx: 'swoosh',
    vars: [{ k: 'slide', name: 'ペンギンをすべらせる', short: 'ペンギン' }],
    init(s) { s.my.dive = 0; },
    draw(g, s) {
      const V = g.V, a1 = age1(s), a2 = age2(s), B = V.y1 + 40;
      const e1 = a1 < 0 ? 0 : E.outQ(clamp(a1 / 0.35)), e2 = a2 < 0 ? 0 : E.inQ(clamp(a2 / 0.22));
      g.sky('#8fd0ff', '#e6f6ff', 470); g.cloud(220, 140, 0.6);
      g.poly([V.x0 - 40, 470, 60, 370, 160, 420, 260, 340, 380, 470], '#ffffff'); g.poly([640, 470, 760, 380, 820, 420, 900, 360, V.x1 + 40, 470], '#e8f4ff');
      g.band(470, 'bottom', '#2f8fd8'); for (let i = 0; i < 3; i++) for (let x = Math.floor(V.x0 / 120) * 120 + i * 40; x < V.x1; x += 120) g.arc(x, 500 + i * 26 + 4 * Math.sin(s.t * 2 + x), 14, PI, 0, 'rgba(255,255,255,0.6)', 4);
      g.poly([V.x0 - 40, B, V.x0 - 40, 600, 120, 560, 260, 548, 380, 560, 500, 546, 640, 560, 760, 548, 880, 566, V.x1 + 40, 590, V.x1 + 40, B], '#f6fbff');
      g.line([V.x0 - 40, 600, 120, 560, 260, 548, 380, 560, 500, 546, 640, 560, 760, 548, 880, 566, V.x1 + 40, 590], C.ol, 6);
      if (s.k >= 1) for (const d of [-1, 1]) g.line([500 + d * 40, B, 500 + d * 34 * lerp(1, 0.72, e1), lerp(820, 700, e1)], '#cfe2f6', 8);
      const sc = lerp(lerp(1, 0.72, e1), 0.4, e2), by = lerp(lerp(820, 700, e1), 556, e2);
      if (!(s.k === 2 && a2 > 0.22)) { g.shadow(500, by + 6, 120 * sc, 18 * sc, 0.2); g.at(500, by, 0, sc, sc, () => penguinBelly(g, s.k === 1, s.t)); }
      if (s.k === 2 && a2 > 0.22) {
        if (!s.my.dive) { s.my.dive = 1; g.sfx('splash'); g.fx.splash(500, 520, '#5fd0ff', 22); g.fx.pop('ドボン！', 250, 380, { size: 92, c: '#ffffff', life: 0.5 }); }
        const up = E.outBack(clamp((a2 - 0.3) / 0.2), 2);
        if (up > 0) g.at(500, 500 - 60 * up, 0, 0.85 * up, 0.85 * up, () => {
          g.circ(0, 0, 70, '#2b3150'); g.ell(0, 14, 46, 44, '#ffffff', 0); g.circ(-22, -14, 10, C.ol, 0); g.circ(22, -14, 10, C.ol, 0); g.tri(-14, 10, 14, 10, 0, 26, C.orange, 4);
          g.at(0, 46, 0.3, () => { g.ell(0, 0, 50, 18, '#9ad0f5'); g.tri(44, 0, 70, -18, 70, 18, '#9ad0f5'); g.circ(-30, -2, 4, C.ol, 0); });
        });
        if (up > 0.5 && s.my.dive === 1) { s.my.dive = 2; g.fx.pop('ゲット！', 500, 250, { size: 100, c: C.yellow }); g.fx.stars(500, 420, 6); }
      }
      palms(g, s, sd => [500 + sgn(sd) * (s.k === 0 ? 88 : 64), s.k === 0 ? 742 : 646], { sleeve: '#e8343c' });
    },
    hit(g, s, k) {
      g.fx.burst(500, k === 1 ? 760 : 660, { n: 10, c: ['#ffffff', '#dceeff'], shape: 'snow', sp: [150, 450], size: [12, 22], g: 900 });
      g.fx.shake(5, 0.1);
      if (k === 1) g.fx.pop('スーッ', 500, 200, { size: 96 });
    },
  },

  /* ---------- 花火のスイッチ（ドーン！たまやー） ---------- */
  {
    id: 'push-hanabi', acts: ['push'], modes: ['both', 'alt'], theme: 'festival', sfx: ['click', 'firework'],
    vars: [{ k: 'button', name: '花火のスイッチ', short: '花火' }],
    init(s) { s.my.st = Array.from({ length: 24 }, () => [s.r(), s.r(), 2 + s.r() * 3]); s.my.boom = 0; },
    draw(g, s) {
      const V = g.V, W = V.x1 - V.x0 + 40, a1 = age1(s), a2 = age2(s), alt = s.mode === 'alt', fx1 = alt ? 500 + sgn(tSide(s, 0)) * 170 : 500;
      g.bg('#0e1036', '#3a2466');
      for (const [u, v, r] of s.my.st) g.circ(lerp(V.x0, V.x1, u), lerp(V.y0, 520, v), r, 'rgba(255,255,255,0.8)', 0);
      // 花火
      const up = a1 < 0 ? -1 : a1 / 0.28;
      if (up >= 0 && up < 1) { const y = lerp(560, 240, E.outQ(up)); g.line([fx1, y + 60, fx1, y], 'rgba(255,230,160,0.7)', 6); g.circ(fx1, y, 8, '#fff3b0', 0); }
      if (a1 >= 0.28 && !s.my.boom) { s.my.boom = 1; g.sfx('firework'); g.fx.stars(fx1, 240, 6); }
      burst(g, fx1, 240, 200, a1 - 0.28, '#ffd23f', 18);
      if (a2 >= 0) { burst(g, 290, 220, 190, a2, '#ff5fa2'); burst(g, 720, 260, 180, a2 - 0.08, '#2ee6ff'); burst(g, 500, 120, 230, a2 - 0.16, '#a8ff5f', 20); }
      // 町と川
      g.poly([V.x0 - 40, 560, 60, 560, 60, 470, 140, 470, 140, 520, 220, 520, 220, 440, 300, 440, 300, 540, 700, 540, 700, 460, 790, 460, 790, 500, 870, 500, 870, 430, 940, 430, 940, 560, V.x1 + 40, 560, V.x1 + 40, 600, V.x0 - 40, 600], '#1c1838', 0);
      for (const [x, y] of [[90, 490], [180, 480], [250, 460], [730, 480], [820, 515], [900, 450]]) g.rect(x, y, 16, 16, '#ffd98a', 0);
      g.band(590, 'bottom', '#16163a');
      g.band(600, 640, '#24305e'); for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1; x += 90) g.line([x, 616, x + 40, 616], 'rgba(255,220,140,0.35)', 4);
      // スイッチの台
      g.rr(190, 450, 620, 470, 30, '#c98a52'); g.rr(210, 470, 580, 50, 14, '#a0673c', 0);
      g.rr(380, 476, 240, 40, 12, '#fff6e0', 4); g.text('はなび', 500, 497, { size: 32, f: '#e8343c' });
      for (let i = 0; i < 6; i++) { const on = s.k === 2 || (s.k === 1 && i < 3); g.circ(300 + i * 80, 870, 14, on ? ['#ff5fa2', '#ffd23f', '#2ee6ff'][i % 3] : '#6e4429', 4); }
      const btn = (x, sc, a, c) => { const press = a >= 0 ? 0.06 * Math.exp(-14 * a) : 0; g.at(x, 690, 0, sc, sc, () => { g.circ(0, 0, 168, '#ffd23f'); g.ring(0, 0, 150, '#2b2140', 8); g.at(0, 0, 0, 1 - press, 1 - press, () => { g.circ(0, 0, 138, c); g.circ(0, 10, 112, sh(c, -0.12), 0); g.hl(-50, -60, 44, 22, -0.6, 0.55); }); }); };
      if (alt) { for (const sd of ['L', 'R']) { const j = tSide(s, 0) === sd ? 0 : 1; btn(500 + sgn(sd) * 170, 0.72, j ? a2 : a1, sd === 'L' ? '#e8343c' : '#3a86ff'); } palms(g, s, sd => [500 + sgn(sd) * 170, 696], { sleeve: '#3a5bd9' }); }
      else { btn(500, 1, s.k ? ageOf(s) : -1, '#e8343c'); palms(g, s, sd => [500 + sgn(sd) * 84, 700], { sleeve: '#3a5bd9' }); }
    },
    hit(g, s, k) {
      const bx = s.mode === 'alt' ? 500 + sgn(tSide(s, k - 1)) * 170 : 500, br = s.mode === 'alt' ? 0.72 : 1;
      g.fx.shake(k === 2 ? 12 : 5, 0.18); g.fx.ring(bx, 690, { r0: 140 * br, r1: 260 * br, w: 12, c: '#ffd23f' });
      if (k === 1) g.fx.pop('ポチッ', 230, 420, { size: 86 });
      else { g.fx.pop('たまやー！', 500, 420, { size: 110, c: C.yellow }); g.fx.burst(500, 200, { n: 26, c: ['#ff5fa2', '#2ee6ff', '#a8ff5f', '#ffd23f'], shape: 'spark', sp: [500, 1000], size: [14, 26], g: 300, life: [0.4, 0.8] }); }
    },
  },
];
