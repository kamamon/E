/* 振り下ろす（交互・両手） — 太鼓・もぐらたたき・おの・杵 など */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const DRUMS = [
  { k: 'taiko', name: '和太鼓をたたく', short: '和太鼓', theme: 'festival', bg1: '#1d1446', bg2: '#4b1f5e', skin: '#f2dfb8', body: '#9c4a22', rim: '#3a2416', lantern: 1 },
  { k: 'tom', name: 'ドラムをたたく', short: 'ドラム', theme: 'music', bg1: '#0f1838', bg2: '#2a1f63', skin: '#f6f7fb', body: '#e8434f', rim: '#c8d0dc', spot: 1 },
];
const FX = 500, FY = 560, RX = 270, RY = 205;
const tipOf = (sg, p) => [lerp(FX + sg * 92, FX + sg * 250, p), lerp(FY - 20, 140, p)];
const gripOf = (sg, p) => [lerp(FX + sg * 236, FX + sg * 300, p), lerp(880, 650, p)];

function drum(g, v, bulge) {
  // 胴
  g.path(`M${FX - RX} ${FY} C${FX - RX - 30} ${FY + 120} ${FX - RX + 10} ${FY + 230} ${FX - RX + 40} ${FY + 250} L${FX + RX - 40} ${FY + 250} C${FX + RX - 10} ${FY + 230} ${FX + RX + 30} ${FY + 120} ${FX + RX} ${FY} Z`, v.body);
  g.clipPath(`M${FX - RX} ${FY} C${FX - RX - 30} ${FY + 120} ${FX - RX + 10} ${FY + 230} ${FX - RX + 40} ${FY + 250} L${FX + RX - 40} ${FY + 250} C${FX + RX - 10} ${FY + 230} ${FX + RX + 30} ${FY + 120} ${FX + RX} ${FY} Z`, () => {
    for (let i = -3; i <= 3; i++) g.line([FX + i * 78, FY, FX + i * 84, FY + 260], sh(v.body, -0.16), 5);
    g.rect(FX + 90, FY, 120, 260, 'rgba(255,255,255,0.12)', 0);
  });
  if (v.lantern) { g.rr(FX - 50, FY + 120, 100, 70, 16, '#d8b35c', 5); g.circ(FX, FY + 155, 16, '#3a2416', 0); }
  // 面
  g.at(FX, FY, 0, bulge, bulge, () => {
    g.ell(0, 0, RX, RY, v.rim);
    g.ell(0, -4, RX - 22, RY - 18, v.skin, 5);
    if (v.lantern) {
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.circ(Math.cos(a) * (RX - 10), Math.sin(a) * (RY - 8), 7, '#e3c06a', 3); }
      for (let i = 0; i < 3; i++) g.at(0, -4, i * Math.PI * 2 / 3, 1, 0.76, () => g.path('M0 -10 C40 -14 66 18 50 52 C38 76 8 70 6 48 C26 44 30 22 0 -10 Z', '#c8312b', 0));
    } else { g.ell(0, -4, RX * 0.42, RY * 0.42, null, 3); g.hl(-90, -70, 80, 26, -0.3, 0.55); }
  });
}
function sticks(g, s) {
  const both = s.mode === 'both', alt = s.mode === 'alt';
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? -1 : 1, active = both || s.side === side;
    const p = active ? s.p : alt ? clamp(1 - s.p) : 0.85;
    const [tx, ty] = tipOf(sg, p), [gx, gy] = gripOf(sg, p);
    const d = Math.hypot(tx - gx, ty - gy), ang = Math.atan2(tx - gx, -(ty - gy));
    g.stick(gx, gy, ang, d / 336, C.wood2);
    g.arm(gx, gy + 6, ang - Math.PI / 2 - sg * 0.5, { hand: 'grip', side });
  }
}

/* =========================================================================
   ここから追加の場面（交互 alt ・ 両手 both）
   ========================================================================= */
const PI = Math.PI;
const other = sd => (sd === 'L' ? 'R' : 'L');
const sgn = sd => (sd === 'L' ? -1 : 1);
const REST = 0.72;
// 手ごとの p：両手は s.p。交互は打つ手が s.p、もう片方は休み（打った直後はゆっくり戻る）
function handP(s, side) {
  if (s.mode !== 'alt') return s.p;
  if (side === s.side) return s.k === 1 ? Math.max(s.p, REST * (1 - E.sm(clamp((s.u - 0.3) / 0.3)))) : s.p;
  if (s.k >= 1 && side === s.lastSide) return REST * E.outQ(clamp(s.age / 0.3));
  return REST + 0.03 * Math.sin(s.beat * PI);
}
// n 回目に打つ手：交互は 'L' / 'R'（1回ごとに入れかわる）、両手は 'B'
function sideOf(s, n) {
  if (s.mode !== 'alt') return 'B';
  const first = s.k === 0 ? s.side : s.k % 2 ? s.lastSide : other(s.lastSide);
  return n % 2 ? first : other(first);
}
// n 回目に当たってからの秒（まだなら -1）
const ageOf = (s, n) => (s.k < n ? -1 : s.age + (s.k - n) * s.spr);
// 片手で持つ棒：持ち手 (gx,gy) → 先 (tx,ty) の向きに合わせた腕
function gripArm(g, side, gx, gy, tx, ty, o = {}) {
  const a = Math.atan2(ty - gy, tx - gx);
  g.arm(gx, gy, a - sgn(side) * (o.k ?? 0.5), { hand: o.hand ?? 'grip', side, s: o.s ?? 1, sleeve: o.sleeve });
}
// 両手で持つ長い道具の姿勢。p=0 で頭の当たる点が T（頭の付け根の真下 hd）
function pose2(p, T, o) {
  const r0 = o.rot0 ?? 0, ax0 = T[0] + o.hd * Math.sin(r0), ay0 = T[1] - o.hd * Math.cos(r0), e0 = o.e0, e1 = o.e1;
  const a0 = Math.atan2(ay0 - e0[1], ax0 - e0[0]), L0 = Math.hypot(ax0 - e0[0], ay0 - e0[1]);
  const a1 = o.a1 ?? -PI / 2 + 0.05, L1 = o.L1 ?? L0 * 0.92;
  const ex = lerp(e0[0], e1[0], p), ey = lerp(e0[1], e1[1], p), a = lerp(a0, a1, p), L = lerp(L0, L1, p);
  return { ex, ey, a, L, ax: ex + Math.cos(a) * L, ay: ey + Math.sin(a) * L, rot: r0 + (o.rot ?? 0.5) * p, hs: 1 + (o.grow ?? 0.14) * p };
}
// 両手：右手は持ち手の端から d1、左手は d2
function arms2(g, P, o = {}) {
  const ux = Math.cos(P.a), uy = Math.sin(P.a), d1 = o.d1 ?? 80, d2 = o.d2 ?? 190;
  g.arm(P.ex + ux * d2, P.ey + uy * d2, P.a + (o.kl ?? 0.55), { hand: 'grip', side: 'L', sleeve: o.sleeve });
  g.arm(P.ex + ux * d1, P.ey + uy * d1, P.a - (o.kr ?? 0.45), { hand: 'grip', side: 'R', sleeve: o.sleeve });
}
// 持ち手の棒（端 e から付け根 a まで）
function handle(g, P, r0, r1, col, tail = 40) {
  const ux = Math.cos(P.a), uy = Math.sin(P.a);
  g.taper(P.ex - ux * tail, P.ey - uy * tail, P.ax, P.ay, r0, r1, col);
}
// ぐるぐる目（気絶）
function dizzyEyes(g, x, y, r) { for (const sx of [-1, 1]) { g.line([x + sx * r - 10, y - 10, x + sx * r + 10, y + 10], C.ink, 6); g.line([x + sx * r - 10, y + 10, x + sx * r + 10, y - 10], C.ink, 6); } }
// 模様をまとめて1回で塗る（点・市松・格子）
function fDots(g, x, y, w, h, st, r, col) { const c = g.ctx; c.beginPath(); for (let i = 0; i * st < w; i++) for (let j = 0; j * st < h; j++) { const cx = x + i * st + (j % 2 ? st / 2 : 0), cy = y + j * st; c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, PI * 2); } c.fillStyle = col; c.fill(); }
function fTiles(g, x, y, w, h, st, c1, c2) { g.rect(x, y, w, h, c1, 0); const c = g.ctx; c.beginPath(); for (let i = 0; i * st < w; i++) for (let j = 0; j * st < h; j++) if ((i + j) % 2) c.rect(x + i * st, y + j * st, Math.min(st, w - i * st), Math.min(st, h - j * st)); c.fillStyle = c2; c.fill(); }
function fGrid(g, x, y, w, h, sx, sy, col, lw) { const c = g.ctx; c.beginPath(); for (let i = 0; i * sx <= w; i++) { c.moveTo(x + i * sx, y); c.lineTo(x + i * sx, y + h); } for (let j = 0; j * sy <= h; j++) { c.moveTo(x, y + j * sy); c.lineTo(x + w, y + j * sy); } c.lineWidth = lw; c.strokeStyle = col; c.lineCap = 'butt'; c.stroke(); }
// 頭の上を回る星
function dizzyStars(g, x, y, t, n = 3, rx = 70) { for (let i = 0; i < n; i++) { const a = t * 6 + i * PI * 2 / n; g.star(x + Math.cos(a) * rx, y + Math.sin(a) * rx * 0.25, 16, 7, 5, C.yellow, 4); } }

/* ---------- もぐらたたき（交互） ---------- */
const MOLES = [
  { k: 'mole', name: 'もぐらたたき', short: 'もぐら', theme: 'farm', top: 258, h1: '#ff4d5a', h2: C.yellow, w1: 'ピコッ', w2: 'ピコーン！' },
  { k: 'ghost', name: 'おばけたたき', short: 'おばけ', theme: 'spooky', top: 254, h1: '#ff8a3d', h2: '#a77bff', w1: 'ポコッ', w2: 'ポコーン！' },
  { k: 'tako', name: 'タコたたき', short: 'タコ', theme: 'sea', top: 262, h1: '#3a86ff', h2: '#ffffff', w1: 'ポカッ', w2: 'ポカーン！' },
];
const HOLE = { L: 310, R: 690 }, HY = 700;
function moleBg(g, s, v) {
  const V = g.V;
  if (v.k === 'mole') {
    g.sky('#7fd0ff', '#e2f6ff', 480); g.cloud(200, 150, 0.8); g.cloud(830, 90, 0.6);
    g.hills(470, '#a6dc78', 60, 4, 4);
    g.band(470, 'bottom', '#8ccd5e');
    for (let i = 0; i < 3; i++) { const y = 500 + i * 46 + i * i * 10; g.band(y, y + 12 + i * 4, '#7dbd52'); }
    for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) { g.rr(x - 9, 400, 18, 90, 6, '#c98b52', 5); }
    g.band(420, 438, '#e0a86e', 0); g.band(455, 471, '#e0a86e', 0);
    for (const [x, y] of [[150, 560], [850, 560], [500, 540]]) { g.path(`M${x - 14} ${y} L${x} ${y - 46} L${x + 14} ${y} Z`, '#ff9a2a', 5); g.path(`M${x} ${y - 46} Q${x - 26} ${y - 80} ${x - 8} ${y - 86} Q${x} ${y - 66} ${x} ${y - 46} Q${x + 4} ${y - 84} ${x + 22} ${y - 76} Q${x + 12} ${y - 60} ${x} ${y - 46}Z`, C.leaf, 4); }
  } else if (v.k === 'ghost') {
    g.bg('#1f1747', '#4a2c70');
    for (let i = 0; i < 14; i++) g.circ(V.x0 + ((i * 263) % Math.max(1, V.x1 - V.x0)), 40 + ((i * 137) % 360) - (i % 3) * 160, 4 + (i % 3), '#fff6c8', 0);
    g.glow(800, 170, 210, '#fff2b8', 0.32); g.circ(800, 170, 78, '#fff1bf', 0); g.circ(772, 150, 14, '#f0dc9a', 0); g.circ(820, 196, 10, '#f0dc9a', 0);
    g.hills(540, '#2f2459', 70, 9, 4);
    g.band(560, 'bottom', '#3b2f66');
    for (const [x, d] of [[110, 1], [890, -1], [-250, 1], [1250, -1]]) { g.line([x, 570, x + d * 8, 380], '#1a1338', 18); g.line([x + d * 4, 470, x + d * 60, 420, x + d * 84, 430], '#1a1338', 10); g.line([x + d * 6, 430, x - d * 40, 380, x - d * 56, 350], '#1a1338', 9); }
    for (const sd of ['L', 'R']) { const x = HOLE[sd]; g.path(`M${x - 70} 690 L${x - 70} 560 Q${x - 70} 490 ${x} 490 Q${x + 70} 490 ${x + 70} 560 L${x + 70} 690 Z`, '#9aa0bf'); g.path(`M${x - 70} 690 L${x - 70} 560 Q${x - 70} 490 ${x} 490 L${x} 690 Z`, 'rgba(255,255,255,0.18)', 0); g.line([x - 30, 560, x + 30, 560], '#6f7596', 6); g.line([x - 22, 590, x + 22, 590], '#6f7596', 6); }
    const fl = Math.sin(s.beat * PI) * 10;
    for (const [x, y, sc] of [[180, 250 + fl, 1], [640, 120 - fl, 0.7]]) g.at(x, y, 0, sc, sc, () => g.path('M0 0 Q-20 -24 -48 -16 Q-40 -4 -56 6 Q-30 4 -20 16 Q-8 4 0 12 Q8 4 20 16 Q30 4 56 6 Q40 -4 48 -16 Q20 -24 0 0Z', '#140f2e', 0));
  } else {
    g.sky('#5cc2ff', '#d2f0ff', 400); g.sun(830, 120, 62); g.cloud(220, 170, 0.7);
    g.band(390, 570, '#2a9ee0');
    { const c = g.ctx; c.beginPath(); for (let i = 0; i < 3; i++) for (let x = V.x0 + (i % 2) * 70; x < V.x1; x += 140) { const cx = x + 40, cy = 430 + i * 48 + 6 * Math.sin(s.beat * PI + x * 0.01), r = 26 + i * 6; c.moveTo(cx + Math.cos(PI * 1.1) * r, cy + Math.sin(PI * 1.1) * r); c.arc(cx, cy, r, PI * 1.1, PI * 1.9); } c.lineWidth = 5; c.strokeStyle = '#ffffff'; c.lineCap = 'round'; c.stroke(); }
    g.band(570, 'bottom', '#d39a63');
    { const c = g.ctx; c.beginPath(); for (let y = 570, h = 40; y < V.y1; y += h, h *= 1.3) { c.moveTo(V.x0 - 10, y); c.lineTo(V.x1 + 10, y); } c.lineWidth = 5; c.strokeStyle = '#a8703f'; c.stroke(); c.beginPath(); for (let x = -600; x <= 1600; x += 170) { c.moveTo(500 + (x - 500) * 0.35, 570); c.lineTo(500 + (x - 500) * 1.4, 1500); } c.lineWidth = 4; c.strokeStyle = '#b98048'; c.stroke(); }
    const by = Math.sin(s.beat * PI) * 8;
    g.at(170, 230 + by, () => g.path('M-44 0 Q-22 -26 0 0 Q22 -26 44 0', null, 7));
  }
}
// 穴（後ろ）
function holeBack(g, v, x) {
  if (v.k === 'tako') { g.ell(x, HY, 104, 30, '#a24e2c'); g.ell(x, HY + 2, 84, 22, '#3a1d18', 0); return; }
  g.ell(x, HY + 10, 158, 58, v.k === 'ghost' ? '#5a4632' : '#a8744a', 0);
  g.ell(x, HY, 118, 36, '#2e1b12', 0);
}
// 穴（手前のふち）
function holeFront(g, v, x) {
  if (v.k === 'tako') {
    g.path(`M${x - 104} ${HY} Q${x - 168} ${HY + 120} ${x - 108} ${HY + 236} L${x + 108} ${HY + 236} Q${x + 168} ${HY + 120} ${x + 104} ${HY} A104 30 0 0 1 ${x - 104} ${HY} Z`, '#c8643a');
    g.clipPath(`M${x - 104} ${HY} Q${x - 168} ${HY + 120} ${x - 108} ${HY + 236} L${x + 108} ${HY + 236} Q${x + 168} ${HY + 120} ${x + 104} ${HY} A104 30 0 0 1 ${x - 104} ${HY} Z`, () => { g.rect(x + 40, HY, 90, 240, 'rgba(0,0,0,0.12)', 0); g.line([x - 150, HY + 80, x + 150, HY + 80], '#a24e2c', 6); g.line([x - 150, HY + 120, x + 150, HY + 120], '#a24e2c', 6); });
    g.hl(x - 80, HY + 110, 16, 50, 0.2, 0.3);
    g.path(`M${x - 104} ${HY} A104 30 0 0 0 ${x + 104} ${HY}`, null);
    return;
  }
  const c = v.k === 'ghost' ? '#5a4632' : '#a8744a';
  g.path(`M${x - 158} ${HY + 10} A158 58 0 0 0 ${x + 158} ${HY + 10} L${x + 118} ${HY} A118 36 0 0 1 ${x - 118} ${HY} Z`, c, 0);
  g.path(`M${x - 118} ${HY} A118 36 0 0 0 ${x + 118} ${HY}`, sh(c, -0.25), 0);
  g.path(`M${x - 118} ${HY + 4} A118 36 0 0 0 ${x + 118} ${HY + 4} A118 30 0 0 1 ${x - 118} ${HY + 4} Z`, sh(c, 0.12), 0);
}
function creature(g, s, v, daze, t) {
  if (v.k === 'mole') {
    g.rr(-84, -204, 168, 270, 80, '#8d5b3a');
    g.ell(0, -112, 62, 48, '#d8a77c', 0);
    if (daze) dizzyEyes(g, 0, -150, 32); else { for (const sx of [-32, 32]) { g.circ(sx, -150, 11, C.ink, 0); g.circ(sx + 4, -154, 4, '#fff', 0); } }
    g.ell(-56, -116, 14, 9, '#ff9fb0', 0); g.ell(56, -116, 14, 9, '#ff9fb0', 0);
    for (const sx of [-1, 1]) { g.line([sx * 34, -116, sx * 82, -126], C.ink, 3); g.line([sx * 34, -106, sx * 82, -104], C.ink, 3); }
    g.rr(-12, -102, 24, 20, 5, '#ffffff', 4);
    g.ell(0, -120, 22, 16, '#ff7d95', 5);
    g.path('M-80 -186 Q-80 -258 0 -258 Q80 -258 80 -186 Z', C.yellow); g.rr(-94, -196, 188, 22, 10, '#f2b705'); g.hl(-30, -236, 22, 9, -0.3, 0.6);
    g.ell(-60, -8, 28, 18, '#f3b7a0'); g.ell(60, -8, 28, 18, '#f3b7a0');
  } else if (v.k === 'ghost') {
    const w = Math.sin(t * 7) * 6;
    g.path(`M-92 60 L-92 -150 Q-92 -254 0 -254 Q92 -254 92 -150 L92 60 Z`, '#f7f5ff');
    g.hl(-46, -196, 18, 34, -0.3, 0.7);
    g.blob([-92, -90 + w, -138, -112 + w, -150, -90 + w, -118, -66 + w, -92, -60], '#f7f5ff'); g.blob([92, -90 - w, 138, -112 - w, 150, -90 - w, 118, -66 - w, 92, -60], '#f7f5ff');
    if (daze) dizzyEyes(g, 0, -150, 34); else { g.ell(-34, -150, 13, 19, C.ink, 0); g.ell(34, -150, 13, 19, C.ink, 0); g.circ(-30, -158, 4, '#fff', 0); g.circ(38, -158, 4, '#fff', 0); }
    g.ell(0, -102, daze ? 22 : 16, daze ? 10 : 18, '#3b2a5c', 0);
    g.ell(-62, -118, 14, 9, '#ffb3d0', 0); g.ell(62, -118, 14, 9, '#ffb3d0', 0);
  } else {
    for (const sx of [-1, 1]) { g.cap(sx * 60, -30, sx * 150, -6, 22, '#ff6f61'); g.circ(sx * 150, -6, 22, '#ff6f61'); for (let i = 0; i < 3; i++) g.circ(sx * (84 + i * 24), -14 + i * 4, 6, '#ffd0c8', 0); }
    g.ell(0, -168, 94, 92, '#ff5a52');
    g.ell(0, -80, 64, 40, '#ff5a52', 0);
    g.hl(-40, -216, 26, 16, -0.4, 0.55);
    g.rr(-96, -212, 192, 26, 10, '#ffffff'); g.path('M84 -206 L120 -228 L118 -190 Z', '#ffffff', 5);
    if (daze) dizzyEyes(g, 0, -146, 34); else { for (const sx of [-34, 34]) { g.circ(sx, -146, 22, '#ffffff', 5); g.circ(sx + 3, -144, 10, C.ink, 0); } }
    g.ell(0, -98, 18, 14, '#d63e3a'); g.ell(0, -98, 8, 6, '#7a1d1d', 0);
  }
}
function toyHammer(g, x, y, rot, sc, c1, c2) {
  g.at(x, y, rot, sc, sc, () => {
    g.rr(-58, -64, 116, 128, 24, c1);
    for (const yy of [-30, 0, 30]) g.line([-54, yy, 54, yy], sh(c1, -0.25), 5);
    g.hl(-28, -8, 11, 40, 0, 0.35);
    g.rr(-68, -92, 136, 34, 14, c2); g.rr(-68, 58, 136, 34, 14, c2);
  });
}

/* ---------- 薪割り（両手） ---------- */
const AXE = [{ k: 'maki', name: '薪を割る', short: '薪割り', theme: 'nature' }];
const LG = { x: 500, top: 452, bot: 690, rx: 112, ry: 36 };
function axeHead(g, x, y, rot, sc) {
  g.at(x, y, rot, sc, sc, () => {
    g.path('M-30 4 L-70 118 Q0 164 70 118 L30 4 Z', '#dfe6f0');
    g.path('M-70 118 Q0 164 70 118 L60 102 Q0 140 -60 102 Z', '#ffffff', 0);
    g.path('M-70 118 Q0 164 70 118', null, 7);
    g.rr(-36, -44, 72, 64, 14, C.steel); g.hl(-12, -26, 16, 7, 0, 0.5);
  });
}
/* ---------- 交互・両手でたたいて鳴らす：ボンゴ・鍋・ドラム缶・バケツ ---------- */
const PERC = [
  { k: 'bongo', name: 'ボンゴをたたく', short: 'ボンゴ', theme: 'music', snd: 'bongo', tool: 'palm', w1: 'ポン', w2: 'ポコポン！', D: { L: [322, 612, 112, 40], R: [680, 622, 134, 48] } },
  { k: 'pots', name: '鍋とフライパンをたたく', short: '鍋ドラム', theme: 'kitchen', snd: 'hammer', tool: 'spoon', w1: 'カン', w2: 'カンカン！', D: { L: [310, 600, 122, 42], R: [688, 650, 146, 50] } },
  { k: 'cans', name: 'ドラム缶をたたく', short: 'ドラム缶', theme: 'party', snd: 'clang', tool: 'stick', w1: 'ゴン', w2: 'ゴゴン！', D: { L: [312, 580, 124, 44], R: [688, 580, 124, 44] } },
  { k: 'bucket', name: 'バケツをたたく', short: 'バケツ', theme: 'town', snd: 'drum', tool: 'stick', w1: 'ポン', w2: 'ポポン！', D: { L: [318, 640, 90, 32], R: [682, 640, 90, 32] } },
];
// その手が最後にたたいてからの秒（両手は最後の当たりから）
function sideAge(s, sd) {
  if (s.mode !== 'alt') return s.k ? s.age : -1;
  for (let n = s.k; n >= 1; n--) if (sideOf(s, n) === sd) return ageOf(s, n);
  return -1;
}
// 電球のひも（2次ベジェ）
function garland(g, x0, x1, y, sag, step, cols, beat) {
  g.path(`M${x0} ${y} Q${(x0 + x1) / 2} ${y + sag * 2} ${x1} ${y}`, null, 4);
  const n = Math.max(2, Math.round((x1 - x0) / step)), c = g.ctx, at = i => { const u = i / n; return [lerp(x0, x1, u), y + 4 * sag * u * (1 - u) + 16]; };
  c.beginPath(); for (let i = 1; i < n; i++) if ((i + Math.floor(beat)) % 2) { const [x, yy] = at(i); c.moveTo(x + 30, yy); c.arc(x, yy, 30, 0, PI * 2); } c.fillStyle = 'rgba(255,240,190,0.3)'; c.fill();
  for (let ci = 0; ci < cols.length; ci++) { c.beginPath(); for (let i = 1; i < n; i++) if (i % cols.length === ci) { const [x, yy] = at(i); c.moveTo(x + 11, yy); c.arc(x, yy, 11, 0, PI * 2); } c.fillStyle = cols[ci]; c.fill(); c.lineWidth = 4; c.strokeStyle = C.ol; c.stroke(); }
}
function palmTree(g, x, y, d) {
  g.path(`M${x - 16} ${y} Q${x + d * 6} ${y - 200} ${x + d * 64} ${y - 370} L${x + d * 86} ${y - 362} Q${x + d * 34} ${y - 200} ${x + 18} ${y} Z`, '#3b1d52', 0);
  for (const a of [-2.7, -2.1, -1.3, -0.6, 0.05]) g.at(x + d * 76, y - 368, d > 0 ? a : -PI - a, 1, d, () => g.path('M0 0 Q80 -46 176 6 Q120 -6 96 10 Q60 -14 0 0 Z', '#3b1d52', 0));
}
function parrot(g, x, y, k, beat, age) {
  g.line([x - 104, y - 520, x - 96, y + 70], '#4a2c18', 5); g.line([x + 104, y - 520, x + 96, y + 70], '#4a2c18', 5);
  g.rr(x - 124, y + 62, 248, 20, 10, '#8a5a36');
  const dance = k >= 2, b = Math.sin(beat * PI * 2), hop = Math.max(0, -jig(age, 30, 16, 6));
  g.at(x, y + 64 - hop - (dance ? Math.abs(b) * 16 : 0), dance ? b * 0.14 : k ? b * 0.05 : 0.08, 1, 1, () => {
    g.path('M-16 -40 L-40 84 L-4 84 L12 -40 Z', '#2f7bff');
    if (dance) for (const sx of [-1, 1]) g.path(`M${sx * 30} -90 Q${sx * 110} -170 ${sx * 120} -60 Q${sx * 90} -60 ${sx * 40} -40 Z`, sx < 0 ? '#2f7bff' : '#2ec46b');
    g.ell(0, -66, 46, 62, '#ff4b4b');
    if (!dance) g.ell(-18, -60, 22, 44, '#2ec46b', 5, 0.15);
    g.ell(10, -46, 20, 30, '#ffd23f', 0);
    g.circ(8, -140, 38, '#ff4b4b');
    g.ell(22, -146, 17, 15, '#ffffff', 0);
    if (k) { g.circ(24, -148, 7, C.ink, 0); g.circ(26, -151, 2.5, '#fff', 0); } else g.line([16, -146, 32, -146], C.ink, 5);
    g.path('M36 -156 Q72 -150 60 -112 Q52 -126 36 -128 Z', '#fff1c2'); g.path('M38 -128 Q50 -126 54 -116 Q44 -112 38 -118 Z', '#3c3a4f', 0);
    g.ell(-14, -2, 12, 8, '#8f8fa3', 4); g.ell(14, -2, 12, 8, '#8f8fa3', 4);
  });
}
function cat(g, x, y, k, age, t) {
  g.ell(x, y, 132, 38, '#8a5a32');
  const jump = k >= 2 ? E.outBack(clamp(age / 0.18)) : 0, fur = '#ff9f45', dk = '#e07b22';
  if (k < 2) {
    g.blob([x - 104, y + 4, x - 90, y - 48, x - 20, y - 70, x + 60, y - 62, x + 104, y - 20, x + 96, y + 10], fur);
    for (const sx of [-60, -24, 12]) g.path(`M${x + sx} ${y - 64} Q${x + sx + 8} ${y - 40} ${x + sx} ${y - 18}`, dk, 6);
    g.cap(x - 100, y - 4, x - 40, y + 6, 13, fur);
    const hy = k ? y - 92 : y - 46, hx = x + 58;
    g.tri(hx - 34, hy - 18, hx - 24, hy - 58, hx - 4, hy - 30, fur); g.tri(hx + 34, hy - 18, hx + 24, hy - 58, hx + 4, hy - 30, fur);
    g.ell(hx, hy, 44, 38, fur);
    if (k) { g.circ(hx - 16, hy - 4, 10, '#ffffff', 4); g.circ(hx + 16, hy - 4, 10, '#ffffff', 4); g.circ(hx - 16, hy - 4, 4, C.ink, 0); g.circ(hx + 16, hy - 4, 4, C.ink, 0); g.ell(hx, hy + 18, 6, 8, '#d0567a', 0); if (age < 0.9) g.text('！', hx + 50, hy - 70, { size: 64, f: C.yellow, o: 9 }); }
    else { g.arc(hx - 16, hy - 2, 9, 0.2, PI - 0.2, C.ink, 4); g.arc(hx + 16, hy - 2, 9, 0.2, PI - 0.2, C.ink, 4); g.tri(hx - 5, hy + 10, hx + 5, hy + 10, hx, hy + 16, '#d0567a', 0); }
  } else {
    const cy = y - 40 - 190 * jump;
    g.at(x, cy, Math.sin(t * 40) * 0.05, 1, 1, () => {
      for (let i = 0; i < 9; i++) { const a = -PI * 0.95 + i * PI * 0.95 / 8; g.tri(Math.cos(a - 0.12) * 70, Math.sin(a - 0.12) * 52 + 4, Math.cos(a + 0.12) * 70, Math.sin(a + 0.12) * 52 + 4, Math.cos(a) * 100, Math.sin(a) * 78 + 4, fur, 5); }
      g.ell(0, 10, 76, 60, fur);
      for (const [x1, y1, x2, y2] of [[-60, 50, -70, 110], [-24, 60, -28, 118], [24, 60, 28, 118], [60, 50, 70, 110]]) g.cap(x1, y1, x2, y2, 10, fur);
      g.curve([70, 0, 130, -50, 118, -126], C.ol, 26); g.curve([70, 0, 130, -50, 118, -126], fur, 13);
      g.tri(-42, -52, -30, -98, -8, -60, fur); g.tri(42, -52, 30, -98, 8, -60, fur);
      g.ell(0, -36, 50, 42, fur);
      g.circ(-18, -40, 13, '#ffffff', 4); g.circ(18, -40, 13, '#ffffff', 4); g.circ(-18, -40, 4, C.ink, 0); g.circ(18, -40, 4, C.ink, 0);
      g.ell(0, -14, 12, 9, '#7a2444', 4);
    });
  }
  g.path(`M${x - 132} ${y} Q${x - 120} ${y + 80} ${x} ${y + 84} Q${x + 120} ${y + 80} ${x + 132} ${y} A132 38 0 0 1 ${x - 132} ${y} Z`, '#c58b4f');
  for (const yy of [24, 50]) g.curve([x - 126, y + yy - 10, x, y + yy + 16, x + 126, y + yy - 10], '#9a6430', 4);
}
function audience(g, V, k, beat) {
  const jumpAll = k >= 2, c = g.ctx, cols = ['#3a2d74', '#45338a', '#332766'], x0 = Math.floor((V.x0 - 60) / 120) * 120 + 20;
  for (let ci = 0; ci < 3; ci++) {
    const arms = [];
    c.beginPath();
    for (let x = x0, i = Math.round((x0 - 20) / 120); x < V.x1 + 120; x += 120, i++) {
      if (((i % 3) + 3) % 3 !== ci) continue;
      const b = jumpAll ? Math.abs(Math.sin(beat * PI + i)) * 26 : 0, y = 520 - b + (((i % 2) + 2) % 2) * 18, up = jumpAll || (k >= 1 && i % 2 === 0);
      c.roundRect(x - 50, y - 10, 100, 120, 40); c.moveTo(x + 36, y - 46); c.arc(x, y - 46, 36, 0, PI * 2);
      if (up) for (const sx of jumpAll ? [-1, 1] : [1]) { arms.push([x + sx * 34, y - 6, x + sx * 58, y - 104]); c.moveTo(x + sx * 58 + 16, y - 108); c.arc(x + sx * 58, y - 108, 16, 0, PI * 2); }
    }
    c.fillStyle = cols[ci]; c.fill();
    if (arms.length) { c.beginPath(); for (const [a, b2, d, e] of arms) { c.moveTo(a, b2); c.lineTo(d, e); } c.lineWidth = 28; c.lineCap = 'round'; c.strokeStyle = cols[ci]; c.stroke(); }
  }
}
function pigeon(g, x, y, sc, k, age, beat, i) {
  const fly = k >= 2 ? clamp(age / 0.45) : 0, hop = k === 1 ? Math.max(0, -jig(age, 40, 14, 6)) : 0;
  const peck = k === 0 ? Math.max(0, Math.sin(beat * PI * 2 + i * 2)) : 0, d = i % 2 ? -1 : 1;
  g.at(x + d * 300 * E.inQ(fly), y - hop - 760 * E.inQ(fly), fly ? -d * 0.35 : 0, sc * d, sc, () => {
    if (!fly) g.shadow(0, 36, 54, 10);
    const f = fly ? Math.sin(age * 46) : 0;
    if (fly) g.at(-10, -24, 0, 1, 0.35 + 0.65 * Math.abs(f), () => g.path('M0 0 Q-40 -120 -150 -110 Q-90 -40 -20 10 Z', '#a7afc2'));
    g.path('M-54 -10 L-100 -4 L-96 14 L-50 10 Z', '#7d8597');
    g.ell(0, 0, 60, 38, '#aeb5c6');
    if (!fly) g.path('M-34 -14 Q10 -32 42 -6 Q10 12 -34 6 Z', '#959eb2', 4);
    else g.at(-10, -24, 0, 1, 0.35 + 0.65 * Math.abs(f), () => g.path('M0 0 Q40 -130 150 -120 Q100 -40 20 10 Z', '#c9cfdc'));
    if (!fly) { g.line([-10, 36, -14, 52], '#ff8a8a', 6); g.line([12, 36, 14, 52], '#ff8a8a', 6); }
    g.at(42, -34 + peck * 24, 0, 1, 1, () => { g.ell(-2, 8, 24, 22, '#7fc4a8', 0); g.circ(4, -6, 23, '#8d95a8'); g.circ(11, -10, k === 1 ? 6 : 4, C.ink, 0); g.tri(25, -10, 42, -4, 25, 3, '#f2c25a', 3); });
  });
  if (k === 1 && age < 0.9) g.text('！', x + 6, y - 110 - hop, { size: 64, f: C.yellow, o: 9 });
}
function percBack(g, s, v) {
  const V = g.V, a = s.k ? s.age : 9;
  if (v.k === 'bongo') {
    g.sky('#3d1f78', '#ff9a66', 500); g.sun(800, 460, 86, '#ffd36b');
    g.band(470, 560, '#6e3f93'); for (let i = 0; i < 4; i++) g.rr(800 - 66 + i * 14, 482 + i * 18, 132 - i * 28, 8, 4, '#ffcf7a', 0);
    g.band(548, 'bottom', '#9a5f3a', 6); for (let y = 548, h = 36; y < V.y1; y += h, h *= 1.25) g.line([V.x0 - 10, y, V.x1 + 10, y], '#7d4a2a', 5);
    for (const [x, d] of [[70, 1], [930, -1], [-260, 1], [1260, -1]]) palmTree(g, x, 560, d);
    garland(g, V.x0 - 20, V.x1 + 20, 40, 60, 110, ['#ff5a5f', '#ffd23f', '#3cc46b', '#3a86ff'], s.beat);
    parrot(g, 500, 300, s.k, s.beat, a);
    g.rr(420, 640, 170, 56, 14, '#6b3f22');
  } else if (v.k === 'pots') {
    g.bg('#fff1d8'); fTiles(g, V.x0 - 10, V.y0, V.x1 - V.x0 + 20, 500 - V.y0, 90, '#fff6e6', '#ffe6c2');
    g.rect(V.x0 - 10, 236, V.x1 - V.x0 + 20, 20, '#c98b52', 0); g.line([V.x0 - 10, 256, V.x1 + 10, 256], '#a8703f', 5);
    for (const [x, c, h] of [[150, '#9ad7ff', 90], [250, '#ffb3c7', 70], [770, '#b8e986', 84], [860, '#ffd36b', 66]]) { g.rr(x - 34, 236 - h, 68, h, 14, c); g.rr(x - 38, 226 - h, 76, 20, 8, '#e05a4f'); }
    g.band(486, 'bottom', '#dfaa6e', 7); g.band(486, 500, '#c38a52');
    cat(g, 500, 500, s.k, a, s.t);
  } else if (v.k === 'cans') {
    g.bg('#15113a', '#3a2370');
    { const c = g.ctx, bx = Math.floor(V.x0 / 150) * 150; c.beginPath(); for (let x = bx, i = 0; x < V.x1 + 150; x += 150, i++) { const h = 220 + (i * 97) % 160; c.rect(x, 470 - h, 140, h + 40); } c.fillStyle = '#241c52'; c.fill();
      c.beginPath(); for (let x = bx, i = 0; x < V.x1 + 150; x += 150, i++) { const h = 220 + (i * 97) % 160; for (let j = 0; j < 3; j++) if ((i + j) % 2) c.rect(x + 22 + j * 36, 500 - h + 30, 22, 30); } c.fillStyle = '#ffd36b'; c.fill(); }
    garland(g, V.x0 - 20, V.x1 + 20, 70, 50, 120, ['#ff5a5f', '#ffd23f', '#9cf2d8', '#ff9fbd'], s.beat);
    audience(g, V, s.k, s.beat);
    g.band(600, 'bottom', '#2a2352', 6);
    for (const sx of [180, 820]) g.alpha(0.16, () => g.poly([sx - 30, V.y0, sx + 30, V.y0, sx + (sx < 500 ? 1 : -1) * 280 + 120, 900, sx + (sx < 500 ? 1 : -1) * 280 - 120, 900], '#d8ccff', 0));
  } else {
    g.sky('#86d0ff', '#e9f8ff', 520); g.cloud(220, 140, 0.8); g.cloud(800, 90, 0.6);
    for (let x = Math.floor(V.x0 / 170) * 170, i = 0; x < V.x1 + 170; x += 170, i++) { g.rr(x - 12, 400, 24, 120, 8, '#8a5a36', 0); g.circ(x, 380 - (i % 2) * 30, 86, i % 2 ? '#5fb36a' : '#6cc274', 0); }
    g.band(510, 'bottom', '#e4d6b8', 6);
    for (let y = 510, h = 34; y < V.y1; y += h, h *= 1.25) g.line([V.x0 - 10, y, V.x1 + 10, y], '#cdbd9a', 4);
    for (let x = -600; x <= 1600; x += 140) g.line([500 + (x - 500) * 0.3, 510, 500 + (x - 500) * 1.6, 1500], '#cdbd9a', 4);
    [[150, 590, 1.05], [500, 560, 0.9], [856, 600, 1.1]].forEach(([x, y, sc], i) => pigeon(g, x, y, sc, s.k, a, s.beat, i));
  }
}
function percTarget(g, s, v, sd, age) {
  const [x, y, rx, ry] = v.D[sd], b = age >= 0 ? 1 + jig(age, 0.05, 30, 9) : 1, fl = age >= 0 ? Math.exp(-age * 8) : 0;
  const flash = (fx, fy, frx, fry) => { if (fl > 0.03) g.alpha(fl * 0.8, () => g.ell(fx, fy, frx, fry, '#ffffff', 0)); };
  if (v.k === 'bongo') {
    const d = `M${x - rx} ${y} L${x - rx * 0.78} ${y + 190} Q${x} ${y + 214} ${x + rx * 0.78} ${y + 190} L${x + rx} ${y} Z`;
    g.path(d, '#c8743c'); g.clipPath(d, () => { g.rect(x - rx - 10, y + 70, 2 * rx + 20, 22, '#f6e7c8', 0); g.rect(x - rx - 10, y + 116, 2 * rx + 20, 10, '#5c3a22', 0); g.rect(x + rx * 0.3, y, rx * 0.36, 230, 'rgba(255,255,255,0.14)', 0); }); g.path(d, null);
    for (const f of [-0.72, -0.25, 0.25, 0.72]) g.rr(x + f * rx - 8, y + ry * Math.sqrt(1 - f * f) - 8, 16, 46, 5, C.metal, 4);
    g.at(x, y, 0, b, b, () => { g.ell(0, 0, rx + 8, ry + 7, '#4a2c18'); g.ell(0, -2, rx - 4, ry - 4, '#f2e0bb', 5); flash(0, -2, rx - 4, ry - 4); g.hl(-rx * 0.35, -ry * 0.35, rx * 0.3, ry * 0.22, -0.15, 0.5); });
  } else if (v.k === 'pots') {
    if (sd === 'L') {
      const d = `M${x - rx} ${y} L${x - rx} ${y + 160} A${rx} ${ry} 0 0 0 ${x + rx} ${y + 160} L${x + rx} ${y} Z`;
      for (const sx of [-1, 1]) g.rr(x + sx * (rx + 18) - 26, y + 112, 52, 24, 12, '#3b3f52');
      g.path(d, '#c3ccd9'); g.clipPath(d, () => { g.rect(x + rx * 0.25, y, rx * 0.3, 240, 'rgba(255,255,255,0.4)', 0); g.rect(x - rx, y + 140, 2 * rx, 40, '#aab3c2', 0); }); g.path(d, null);
      g.at(x, y, 0, b, b, () => { g.ell(0, 0, rx, ry, '#dde4ee'); g.ell(0, 0, rx * 0.68, ry * 0.68, null, 4); flash(0, 0, rx, ry); });
    } else {
      g.cap(x + rx * 0.7, y - 18, x + rx + 160, y - 120, 18, '#2c2c3a'); g.circ(x + rx + 140, y - 108, 7, '#dfaa6e', 0);
      const d = `M${x - rx} ${y} L${x - rx + 8} ${y + 34} A${rx - 8} ${ry} 0 0 0 ${x + rx - 8} ${y + 34} L${x + rx} ${y} Z`;
      g.path(d, '#33333f');
      g.at(x, y, 0, b, b, () => { g.ell(0, 0, rx, ry, '#4b4b5e'); for (const k of [0.75, 0.5, 0.25]) g.ell(0, 0, rx * k, ry * k, '#5a5a70', 3); flash(0, 0, rx, ry); g.hl(-rx * 0.4, -ry * 0.3, rx * 0.3, ry * 0.2, -0.1, 0.25); });
    }
  } else if (v.k === 'cans') {
    const col = sd === 'L' ? '#2f6fd6' : '#e0473f', h = 330;
    g.shadow(x, y + h + 6, rx + 26, 24, 0.35);
    const d = `M${x - rx} ${y} L${x - rx} ${y + h} A${rx} ${ry} 0 0 0 ${x + rx} ${y + h} L${x + rx} ${y} Z`;
    g.path(d, col); g.clipPath(d, () => { for (const yy of [110, 220]) { g.ell(x, y + yy, rx, ry, null, 6); g.ell(x, y + yy + 8, rx, ry, sh(col, 0.25), 0); g.ell(x, y + yy + 12, rx, ry, col, 0); } g.rect(x + rx * 0.3, y, rx * 0.28, h + 60, 'rgba(255,255,255,0.18)', 0); g.rect(x - rx, y, rx * 0.3, h + 60, 'rgba(0,0,0,0.12)', 0); }); g.path(d, null);
    g.at(x, y, 0, b, b, () => { g.ell(0, 0, rx, ry, sh(col, 0.2)); g.ell(0, 3, rx - 14, ry - 8, sh(col, 0.05), 4); g.circ(rx * 0.45, -ry * 0.25, 13, sh(col, 0.35), 4); flash(0, 0, rx, ry); });
  } else {
    const col = sd === 'L' ? '#ffd23f' : '#3a86ff', R = rx * 1.34, h = 150;
    g.shadow(x, y + h + 4, R + 20, 20, 0.25);
    g.arc(x + (sd === 'L' ? -R - 10 : R + 10), y + h - 6, 46, PI, PI * 2, '#8f9bb0', 6);
    const d = `M${x - rx} ${y} L${x - R} ${y + h} A${R} ${ry * 1.3} 0 0 0 ${x + R} ${y + h} L${x + rx} ${y} Z`;
    g.path(d, col); g.clipPath(d, () => { g.rect(x - R - 10, y + h - 24, 2 * R + 20, 60, sh(col, -0.15), 0); g.rect(x + rx * 0.3, y, rx * 0.3, h + 40, 'rgba(255,255,255,0.25)', 0); }); g.path(d, null);
    g.at(x, y, 0, b, b, () => { g.ell(0, 0, rx, ry, sh(col, 0.18)); g.ell(0, 0, rx * 0.6, ry * 0.6, null, 3); flash(0, 0, rx, ry); });
  }
}
function percTool(g, s, v, sd) {
  const [cx, cy] = v.D[sd], sg = sgn(sd), p = handP(s, sd);
  if (v.tool === 'palm') {
    const x = lerp(cx + sg * 4, cx + sg * 56, p), y = lerp(cy + 18, 330, p);
    g.arm(x, y, -PI / 2 - sg * lerp(0.2, 0.36, p), { hand: 'palm', side: sd, s: lerp(0.92, 1.06, p) });
    return;
  }
  const tx = lerp(cx + sg * 14, cx + sg * 150, p), ty = lerp(cy - 2, 170, p);
  const gx = lerp(cx + sg * 170, cx + sg * 232, p), gy = lerp(cy + 292, cy + 60, p);
  const d = Math.hypot(tx - gx, ty - gy);
  if (v.tool === 'spoon') {
    g.at(gx, gy, Math.atan2(ty - gy, tx - gx) + PI / 2, () => { g.taper(0, 54, 0, -d + 30, 14, 10, '#e2a866'); g.ell(0, -d, 34, 50, '#e9b274'); g.ell(-6, -d - 6, 16, 26, '#f4cc96', 0); });
  } else g.stick(gx, gy, Math.atan2(tx - gx, -(ty - gy)), d / 336, v.k === 'cans' ? '#f3eee2' : C.wood2);
  gripArm(g, sd, gx, gy, tx, ty);
}
/* ---------- 両手の道具の頭（付け根 = 原点、当たる面が下 +y） ---------- */
const HD = { pick: 158, sledge: 92, mallet: 92, kine: 104, kakeya: 98 };
function bigHead(g, kind, x, y, rot, sc) {
  g.at(x, y, rot, sc, sc, () => {
    if (kind === 'pick') {
      g.path('M-22 -10 Q-30 60 -10 112 Q0 140 6 160 Q20 110 22 60 Q22 20 20 -10 Z', '#cbd3df'); g.path('M-8 10 Q-14 70 0 140 Q4 80 4 10 Z', '#ffffff', 0);
      g.path('M-20 0 Q-26 -60 -40 -118 Q-10 -96 16 -40 Q20 -20 20 0 Z', '#aeb8c8');
      g.rr(-28, -30, 56, 52, 12, C.steel); g.hl(-8, -14, 12, 6, 0, 0.5);
    } else if (kind === 'sledge') {
      g.rr(-46, -76, 92, 152, 14, '#8f9bb0'); g.rr(-54, 62, 108, 30, 10, '#c3ccd9'); g.rr(-54, -90, 108, 30, 10, '#c3ccd9'); g.hl(-18, -14, 9, 40, 0, 0.4);
    } else if (kind === 'mallet') {
      g.rr(-56, -80, 112, 172, 40, C.wood2); g.ell(0, 76, 52, 16, sh(C.wood2, -0.12), 5); g.line([-52, -34, 52, -34], sh(C.wood2, -0.18), 5); g.line([-52, 30, 52, 30], sh(C.wood2, -0.18), 5); g.hl(-24, -30, 10, 36, 0, 0.45);
    } else if (kind === 'kakeya') {
      g.rr(-70, -96, 140, 194, 46, '#c98b52'); g.ell(0, 80, 66, 18, '#a86f43', 5); for (const yy of [-50, 40]) g.rect(-70, yy, 140, 16, '#5c6478', 0); g.rr(-70, -96, 140, 194, 46, null); g.hl(-30, -40, 12, 40, 0, 0.4);
    } else {
      g.rr(-66, -104, 132, 208, 48, C.wood); g.ell(0, 86, 62, 18, sh(C.wood, -0.14), 5); g.ell(0, -88, 60, 16, sh(C.wood, 0.1), 0); g.hl(-28, -46, 12, 46, 0, 0.4);
    }
  });
}
// こわれた破片：list = [{ d（SVGの多角形）, cx, cy, vx, vy, vr }]、fn で全体を描いて切り抜く
function shards(g, list, age, fn, grav = 1400) {
  for (const pc of list) {
    const tx = pc.vx * age, ty = Math.min(pc.max ?? 400, pc.vy * age + 0.5 * grav * age * age), r = pc.vr * age;
    g.at(pc.cx + tx, pc.cy + ty, r, 1, 1, () => g.at(-pc.cx, -pc.cy, () => g.clipPath(pc.d, fn)));
  }
}
const CRACK = [
  { k: 'rock', name: '岩を割る', short: '岩割り', theme: 'fantasy', tool: 'pick', T: [500, 452], w1: 'カーン', w2: 'パカッ！' },
  { k: 'ice', name: '氷を割る', short: '氷割り', theme: 'winter', tool: 'sledge', T: [520, 446], w1: 'ピキッ', w2: 'パリーン！' },
  { k: 'piggy', name: '貯金箱を割る', short: '貯金箱', theme: 'home', tool: 'mallet', T: [500, 456], w1: 'コツン', w2: 'ジャラッ！' },
];
const ZIG = 'L500 452 L486 520 L514 582 L494 646 L506 712 L500 820';
const HALVES = [
  { d: `M200 300 L500 300 ${ZIG} L200 820 Z`, cx: 410, cy: 600, piv: [330, 700], sd: -1 },
  { d: `M800 300 L500 300 ${ZIG} L800 820 Z`, cx: 590, cy: 600, piv: [684, 700], sd: 1 },
];
const ICE_SH = [
  { d: 'M320 380 L520 380 L510 470 L440 560 L320 560 Z', cx: 410, cy: 470, vx: -420, vy: -500, vr: -3 },
  { d: 'M520 380 L740 380 L740 520 L600 540 L510 470 Z', cx: 620, cy: 460, vx: 420, vy: -520, vr: 3 },
  { d: 'M320 560 L440 560 L470 650 L400 760 L320 760 Z', cx: 390, cy: 660, vx: -520, vy: -160, vr: -2, max: 150 },
  { d: 'M440 560 L510 470 L600 540 L590 640 L470 650 Z', cx: 520, cy: 580, vx: 60, vy: -700, vr: 4 },
  { d: 'M470 650 L590 640 L620 760 L400 760 Z', cx: 520, cy: 710, vx: 140, vy: -200, vr: 2, max: 90 },
  { d: 'M600 540 L740 520 L740 760 L620 760 L590 640 Z', cx: 660, cy: 640, vx: 520, vy: -260, vr: 2.5, max: 150 },
];
const PIG_SH = [
  { d: 'M280 380 L500 380 L486 520 L420 600 L280 600 Z', cx: 400, cy: 500, vx: -460, vy: -560, vr: -3 },
  { d: 'M500 380 L740 380 L740 600 L560 600 L486 520 Z', cx: 610, cy: 500, vx: 460, vy: -600, vr: 3 },
  { d: 'M280 600 L420 600 L486 520 L520 640 L460 800 L280 800 Z', cx: 400, cy: 680, vx: -380, vy: -200, vr: -2, max: 80 },
  { d: 'M560 600 L740 600 L740 800 L460 800 L520 640 L486 520 Z', cx: 620, cy: 680, vx: 380, vy: -220, vr: 2, max: 80 },
];
function crackScene(g, s, v) {
  const V = g.V;
  if (v.k === 'rock') {
    g.bg('#3b2d4e', '#21182f');
    for (const [x, y, r] of [[120, 120, 150], [420, 30, 180], [820, 150, 170], [-300, 200, 200], [1300, 160, 200], [650, 330, 120]]) g.circ(x, y, r, '#46385c', 0);
    for (const [x, y, c, sc] of [[150, 380, '#5ef0ff', 1], [860, 300, '#ff7ad9', 0.9], [700, 120, '#9cf2d8', 0.6], [260, 180, '#ffd36b', 0.6], [-250, 420, '#5ef0ff', 1], [1250, 380, '#ff7ad9', 1]]) {
      g.glow(x, y, 110 * sc, c, 0.35);
      g.at(x, y, 0, sc, sc, () => { g.poly([-30, 30, -40, -30, -20, -60, 0, -30, -6, 30], c, 5); g.poly([0, 30, 10, -50, 30, -80, 48, -40, 34, 30], sh(c, 0.3), 5); });
    }
    g.band(650, 'bottom', '#4d3c5d', 6);
    for (const [x, y] of [[180, 720], [840, 740], [90, 860], [930, 880]]) g.blob([x - 40, y, x - 30, y - 30, x + 10, y - 40, x + 40, y - 14, x + 36, y + 8], '#6d5b7c');
    g.glow(500, 600, 330, '#ff9be6', s.k ? 0.18 : 0.08);
  } else if (v.k === 'ice') {
    g.sky('#9fd6ff', '#eff9ff', 520);
    for (const [x, h, w] of [[120, 260, 260], [420, 330, 300], [760, 280, 280], [-260, 300, 300], [1260, 300, 300]]) { g.tri(x - w, 540, x + w, 540, x, 540 - h, '#e3f2ff', 0); g.tri(x, 540 - h, x + w, 540, x + w * 0.2, 540, '#c6def4', 0); g.tri(x - w * 0.3, 540 - h * 0.7, x + w * 0.24, 540 - h * 0.72, x, 540 - h, '#ffffff', 0); }
    g.band(520, 'bottom', '#f2f8ff', 6);
    for (let i = 0; i < 18; i++) { const x = V.x0 + ((i * 211 + s.t * 40) % (V.x1 - V.x0)), y = ((i * 157 + s.t * 90) % 1400) - 300; g.circ(x, y, 7 + (i % 3) * 3, '#ffffff', 0); }
    g.shadow(530, 770, 260, 30, 0.18);
  } else {
    g.bg('#ffe6ee'); g.stripes(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 640 - V.y0, 70, '#ffe6ee', '#ffd9e5');
    g.rr(700, 150, 200, 170, 12, '#ffffff', 7); g.rect(712, 162, 176, 146, '#bfe6ff', 0); g.line([800, 156, 800, 314], C.ol, 6); g.line([706, 236, 894, 236], C.ol, 6);
    g.rr(110, 200, 160, 24, 6, '#c98b52'); g.rr(130, 120, 50, 80, 10, '#9ad7ff'); g.circ(225, 170, 30, '#7cd992');
    g.band(640, 'bottom', '#d39457', 7); g.planks(V.x0 - 10, 648, V.x1 - V.x0 + 20, 400, 5, '#d39457');
    g.shadow(500, 770, 240, 26);
  }
}
function crackTarget(g, s, v, a1, a2) {
  if (v.k === 'rock') {
    const rock = () => {
      g.blob([330, 700, 318, 600, 356, 500, 446, 452, 556, 448, 648, 492, 690, 590, 684, 700], '#8f8ba3');
      g.blob([356, 520, 446, 470, 520, 476, 470, 540, 380, 580], '#a9a5bc', 0); g.blob([560, 470, 640, 510, 668, 600, 600, 560], '#7a7690', 0);
      g.path('M330 700 Q500 740 684 700', '#77738c', 0);
      g.blob([330, 700, 318, 600, 356, 500, 446, 452, 556, 448, 648, 492, 690, 590, 684, 700], null);
    };
    if (a2 < 0) {
      g.at(500, 700, jig(a1, 0.03, 30, 9), 1, 1, () => g.at(-500, -700, rock));
      if (a1 >= 0) { g.line([500, 452, 486, 520, 514, 582, 494, 640], C.ol, 7); g.line([486, 520, 430, 548], C.ol, 5); g.line([514, 582, 580, 610], C.ol, 5); }
    } else {
      const t = clamp(a2 / 0.4), e = E.outBack(t, 1.4);
      g.ell(500, 600, 120, 130, '#3b2550'); for (const [x, y, c] of [[450, 650, '#c58bff'], [550, 660, '#ff7ad9'], [500, 690, '#9cf2d8']]) g.poly([x - 18, y + 24, x - 10, y - 30, x + 10, y - 40, x + 18, y + 24], c, 4);
      const gy = lerp(640, 520, E.outBack(clamp(a2 / 0.35), 2));
      g.glow(500, gy, 220, '#9cf2ff', 0.7);
      g.at(500, gy, Math.sin(s.t * 3) * 0.08, 1, 1, () => { g.poly([0, -96, 64, -36, 64, 40, 0, 96, -64, 40, -64, -36], '#5ee7ff'); g.poly([0, -96, 64, -36, 0, -12, -64, -36], '#b6f6ff', 0); g.poly([0, -12, 64, -36, 64, 40, 0, 96], '#33c4e8', 0); g.poly([0, -96, 64, -36, 64, 40, 0, 96, -64, 40, -64, -36], null); g.line([0, -12, 0, 96], '#ffffff', 4); g.hl(-30, -40, 12, 26, 0.4, 0.8); });
      for (const H of HALVES) g.at(H.piv[0] + H.sd * 70 * E.outQ(t), H.piv[1], H.sd * 0.5 * e, 1, 1, () => g.at(-H.piv[0], -H.piv[1], () => g.clipPath(H.d, rock)));
    }
  } else if (v.k === 'ice') {
    const fish = (wake, t) => g.at(510, 610, wake ? Math.sin(t * 30) * 0.25 : 0, 1, 1, () => {
      g.path('M90 0 L150 -50 L144 0 L150 50 Z', '#ff8a3d'); g.ell(0, 0, 110, 60, '#ff9a4a'); g.ell(-10, 20, 80, 26, '#ffd0a0', 0); g.path('M10 -56 Q40 -90 70 -50 Z', '#ff8a3d');
      if (wake) { g.circ(-62, -14, 15, '#ffffff', 4); g.circ(-66, -14, 6, C.ink, 0); g.ell(-100, 14, 12, 10, '#7a2a1a', 4); } else { g.line([-74, -14, -50, -12], C.ink, 5); g.line([-104, 14, -92, 18], C.ink, 5); }
      g.arc(-34, 0, 40, -0.9, 0.9, '#e0701f', 5);
    });
    const ice = () => {
      g.poly([340, 470, 400, 420, 720, 420, 660, 470], '#e4f7ff'); g.poly([660, 470, 720, 420, 720, 680, 660, 740], '#9fd6f0');
      g.alpha(0.62, () => g.rect(340, 470, 320, 270, '#bfeaff', 0)); g.rect(340, 470, 320, 270, null);
      g.alpha(0.6, () => { g.poly([370, 720, 520, 490, 560, 490, 410, 720], '#ffffff', 0); g.poly([440, 720, 590, 490, 606, 490, 456, 720], '#ffffff', 0); });
    };
    if (a2 < 0) {
      g.at(530, 740, 0, 1 + jig(a1, 0.02, 30, 9), 1, () => g.at(-530, -740, () => { fish(false, s.t); ice(); }));
      if (a1 >= 0) { for (const [x1, y1, x2, y2, x3, y3] of [[520, 446, 470, 520, 430, 600], [520, 446, 590, 530, 640, 560], [520, 446, 520, 540, 500, 640]]) g.line([x1, y1, x2, y2, x3, y3], '#ffffff', 7); g.line([520, 446, 470, 520, 430, 600], '#6fb6dc', 3); }
    } else {
      const q = E.outBack(clamp(a2 / 0.3), 2.2);
      g.at(510 - 170 * q, 610 - 150 * q, -0.5 * q, 1, 1, () => g.at(-510, -610, () => fish(true, s.t)));
      if (a2 > 0.14) g.text('ピチピチ', 190, 610, { size: 54, f: '#ff8a3d', o: 10, oc: '#ffffff' });
      shards(g, ICE_SH, a2, ice);
    }
  } else {
    const pig = () => {
      for (const x of [380, 450, 560, 630]) g.rr(x - 26, 690, 52, 64, 16, '#ff9fb8');
      g.cap(304, 586, 290, 556, 8, null); g.arc(280, 560, 22, 0.4, 5.2, C.ol, 8);
      g.ell(500, 600, 196, 148, '#ffb3c7');
      g.tri(400, 476, 430, 410, 470, 470, '#ff9fb8'); g.tri(540, 470, 590, 412, 610, 480, '#ff9fb8');
      g.ell(660, 620, 52, 44, '#ff9fb8'); g.ell(645, 618, 9, 14, '#d0567a', 0); g.ell(675, 618, 9, 14, '#d0567a', 0);
      g.circ(600, 560, 12, C.ink, 0); g.circ(604, 556, 4, '#fff', 0); g.ell(560, 610, 22, 12, '#ff8fb0', 0);
      g.rr(456, 450, 88, 18, 8, '#b84a6e', 5); g.hl(410, 530, 40, 20, -0.5, 0.5);
    };
    if (a2 < 0) {
      g.at(500, 750, jig(a1, 0.05, 26, 8), 1, 1, () => g.at(-500, -750, pig));
      if (a1 >= 0) { g.line([500, 470, 470, 530, 510, 580, 476, 640], C.ol, 6); g.line([470, 530, 420, 556], C.ol, 5); g.line([510, 580, 566, 600], C.ol, 5); }
    } else {
      const t = clamp(a2 / 0.3);
      for (let i = 0; i < 9; i++) { const r = i < 5 ? 0 : i < 8 ? 1 : 2, x = 500 + (r === 0 ? (i - 2) * 56 : r === 1 ? (i - 6) * 56 : 0), y = 720 - r * 30 - 40 * (1 - E.outBack(t)); g.ell(x, y, 34, 14, C.gold, 5); g.ell(x, y - 3, 22, 7, '#ffe27a', 0); }
      shards(g, PIG_SH, a2, () => { g.ell(500, 600, 196, 148, '#ffb3c7'); g.tri(400, 476, 430, 410, 470, 470, '#ff9fb8'); g.tri(540, 470, 590, 412, 610, 480, '#ff9fb8'); g.ell(660, 620, 52, 44, '#ff9fb8'); g.circ(600, 560, 12, C.ink, 0); });
    }
  }
}

/* ---------- 餅つき（両手） ---------- */
const MOCHI = [
  { k: 'mochi', name: '餅をつく', short: '餅つき', theme: 'festival' },
  { k: 'moon', name: '月で餅つき', short: '月の餅つき', theme: 'space' },
];
const USU = { x: 500, y: 610, rx: 220, ry: 70 };
function mochiScene(g, s, v) {
  const V = g.V;
  if (v.k === 'mochi') {
    g.bg('#fff4dc'); g.stripes(V.x0 - 20, V.y0, V.x1 - V.x0 + 40, 470 - V.y0, 120, '#ffffff', '#e8402f');
    g.band(450, 480, '#3a2a55'); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) g.circ(x + 60, 465, 8, C.gold, 0);
    g.band(470, 'bottom', '#d8cdb8', 6); for (let y = 470, h = 40; y < V.y1; y += h, h *= 1.25) g.line([V.x0 - 10, y, V.x1 + 10, y], '#c2b59c', 4);
    for (const x of [100, 900]) {
      for (const [bx, h] of [[-34, 250], [34, 220], [0, 300]]) { const t = 650 - h; g.poly([x + bx - 20, 650, x + bx - 20, t + 22, x + bx + 20, t - 14, x + bx + 20, 650], '#62c35a'); g.poly([x + bx - 20, t + 22, x + bx + 20, t - 14, x + bx + 14, t + 4, x + bx - 14, t + 30], '#e8f6d2', 4); g.line([x + bx - 18, t + 120, x + bx + 18, t + 116], '#3f9a3c', 5); }
      for (const [px, py] of [[-70, 590], [70, 596], [-40, 560], [46, 566]]) g.circ(x + px, py, 30, '#2f8f4a', 0);
      g.rr(x - 74, 600, 148, 130, 20, '#d9b36c'); for (const yy of [628, 668, 706]) g.line([x - 74, yy, x + 74, yy], '#a8823f', 6); g.rr(x - 74, 600, 148, 130, 20, null);
    }
  } else {
    g.bg('#0c0d2e', '#1d1b4f');
    for (let i = 0; i < 26; i++) { const x = V.x0 + ((i * 397) % Math.max(1, V.x1 - V.x0)), y = -440 + ((i * 233) % 900), r = 3 + (i % 3) * 2; g.circ(x, y, r * (0.8 + 0.2 * Math.sin(s.t * 3 + i)), '#fff8d6', 0); }
    g.glow(800, 190, 150, '#7ec8ff', 0.4); g.circ(800, 190, 80, '#3a86ff'); g.clipCirc(800, 190, 80, () => { g.blob([740, 150, 780, 120, 820, 150, 800, 200, 760, 210], '#3cc46b', 0); g.blob([820, 230, 860, 200, 880, 250, 840, 270], '#3cc46b', 0); }); g.hl(770, 160, 24, 12, -0.5, 0.4);
    g.path(`M${V.x0 - 20} 500 Q500 440 ${V.x1 + 20} 500 L${V.x1 + 20} ${V.y1 + 20} L${V.x0 - 20} ${V.y1 + 20} Z`, '#c9c6d9', 0);
    for (const [x, y, r] of [[170, 560, 60], [840, 600, 80], [330, 880, 70], [760, 900, 50], [-260, 640, 90], [1260, 620, 90]]) { g.ell(x, y, r, r * 0.32, '#aeaac4', 0); g.ell(x, y + 4, r * 0.8, r * 0.22, '#9c98b5', 0); }
  }
  g.shadow(USU.x, 880, 250, 30, 0.3);
}
function usuBody(g) {
  const { x, y, rx } = USU, d = `M${x - rx} ${y} Q${x - rx + 40} ${y + 140} ${x - rx + 20} ${y + 260} L${x + rx - 20} ${y + 260} Q${x + rx - 40} ${y + 140} ${x + rx} ${y} Z`;
  g.path(d, '#8a5530'); g.clipPath(d, () => { for (const yy of [60, 150, 230]) g.line([x - rx, y + yy, x + rx, y + yy], '#6e4123', 6); g.rect(x + 80, y, 70, 300, 'rgba(255,255,255,0.1)', 0); }); g.path(d, null);
  g.ell(x, y, USU.rx, USU.ry, '#b07a4a'); g.ell(x, y + 6, 172, 50, '#5c3518');
}
function mochiBlob(g, s, a1, a2) {
  const st = a2 >= 0 ? 2 : a1 >= 0 ? 1 : 0, a = st === 2 ? a2 : a1, [sx, sy] = st ? squash(a, 0.28) : [1, 1];
  const top = [-58, -42, -34][st];
  g.at(USU.x, USU.y + 14, 0, sx, sy, () => {
    g.blob([-160, 4, -150, top * 0.5, -96, top, -20, top - 6 * (st === 0), 60, top + 4 * (st === 0), 120, top * 0.8, 160, 6, 80, 30, -80, 30], st === 2 ? '#ffffff' : '#f7f4ea');
    if (st === 0) for (const [x, y] of [[-110, -20], [-60, -40], [-10, -30], [40, -44], [90, -24], [-30, -8], [60, -6], [120, -6]]) g.ell(x, y, 9, 5, '#ffffff', 2);
    if (st >= 1) g.path(`M-70 ${top + 12} Q0 ${top + 34} 70 ${top + 12}`, '#e2ddcf', 4);
    g.hl(-50, top + 14, 40, 10, -0.1, st === 2 ? 0.9 : 0.6);
    if (st === 2 && a > 0.12) { g.circ(-36, -2, 7, C.ink, 0); g.circ(36, -2, 7, C.ink, 0); g.arc(0, 4, 14, 0.3, PI - 0.3, C.ink, 4); g.ell(-58, 8, 12, 7, '#ffb3c7', 0); g.ell(58, 8, 12, 7, '#ffb3c7', 0); }
  });
}
function rabbit(g, x, y, s, reach, cheer) {
  const b = cheer ? Math.abs(Math.sin(s.beat * PI)) * 30 : 0;
  g.at(x, y - b, 0, 1, 1, () => {
    g.ell(0, 40, 80, 100, '#ffffff');
    g.ell(-40, -170, 22, 70, '#ffffff', 7, -0.2); g.ell(-40, -170, 10, 50, '#ffc2d6', 0, -0.2); g.ell(20, -176, 22, 70, '#ffffff', 7, 0.15); g.ell(20, -176, 10, 50, '#ffc2d6', 0, 0.15);
    g.circ(-10, -70, 64, '#ffffff');
    g.circ(-36, -80, 8, C.ink, 0); g.circ(12, -80, 8, C.ink, 0); g.ell(-12, -58, 8, 6, '#ff8fb0', 0); g.ell(-52, -56, 12, 7, '#ffc2d6', 0); g.ell(28, -56, 12, 7, '#ffc2d6', 0);
    if (cheer) { g.cap(-60, 10, -110, -70, 18, '#ffffff'); g.cap(40, 10, 90, -70, 18, '#ffffff'); }
    else if (reach < 0.05) g.cap(40, 20, 70, 60, 18, '#ffffff');
    g.rr(-60, 110, 50, 30, 14, '#ffffff'); g.rr(10, 110, 50, 30, 14, '#ffffff');
  });
}

/* ---------- キーを打つ（交互）：パソコン・ピアノ・レジ ---------- */
const KEYS = [
  { k: 'pc', name: 'キーボードを打つ', short: 'パソコン', theme: 'school', hand: 'point', T: { L: [3, 1], R: [7, 1] } },
  { k: 'piano', name: 'ピアノをひく', short: 'ピアノ', theme: 'music', hand: 'open', T: { L: [4, 0], R: [10, 0] } },
  { k: 'reji', name: 'レジを打つ', short: 'レジ', theme: 'town', hand: 'point', T: { L: [1, 1], R: [4, 1] } },
];
// 遠近のついた鍵盤面：u（左→右）, w（奥→手前）
const KB = { pc: [610, 900, 190, 810, 70, 930], piano: [600, 900, 120, 880, -20, 1020], reji: [560, 700, 300, 700, 250, 750] };
const kbP = (v, u, w) => { const b = KB[v.k]; return [lerp(lerp(b[2], b[3], u), lerp(b[4], b[5], u), w), lerp(b[0], b[1], w)]; };
const KCOL = { pc: 10, piano: 14, reji: 6 }, KROW = { pc: 3, piano: 1, reji: 3 };
// キーの中心（当たる点）
function keyPt(v, sd) {
  const [c, r] = v.T[sd], nc = KCOL[v.k], nr = KROW[v.k];
  if (v.k === 'piano') return kbP(v, (c + 0.5) / nc, 0.62);
  return kbP(v, (c + 0.5) / nc, (r + 0.5) / nr);
}
// 指先が T にくる手の位置（kit の手の形から）
function fingerTo(T, side, ang, s, tip) {
  const th = ang + PI / 2, k = side === 'L' ? -1 : 1, lx = tip[0] * k * s, ly = tip[1] * s;
  return [T[0] - (lx * Math.cos(th) - ly * Math.sin(th)), T[1] - (lx * Math.sin(th) + ly * Math.cos(th))];
}
function keyboard(g, s, v, press) {
  const nc = KCOL[v.k], nr = KROW[v.k], b = KB[v.k];
  const quad = (u0, u1, w0, w1, f, o) => { const a = kbP(v, u0, w0), bb = kbP(v, u1, w0), c = kbP(v, u1, w1), d = kbP(v, u0, w1); g.poly([a[0], a[1], bb[0], bb[1], c[0], c[1], d[0], d[1]], f, o); };
  if (v.k === 'piano') {
    g.poly([b[2] - 30, b[0] - 30, b[3] + 30, b[0] - 30, b[5] + 40, b[1] + 30, b[4] - 40, b[1] + 30], '#1c1a26');
    for (let c = 0; c < nc; c++) { const dn = press.has(c); quad(c / nc + 0.004, (c + 1) / nc - 0.004, dn ? 0.04 : 0, dn ? 1.02 : 1, dn ? '#d9dcea' : '#ffffff', 5); }
    for (let c = 0; c < nc - 1; c++) if (c % 7 !== 2 && c % 7 !== 6) quad((c + 0.68) / nc, (c + 1.32) / nc, 0, 0.58, '#22202e', 4);
    return;
  }
  const col = v.k === 'pc' ? ['#3a3f55', '#f4f6fb', '#dfe3ee'] : ['#2ec4b6', '#fff6e5', '#ffe2b8'];
  quad(-0.03, 1.03, -0.08, 1.1, col[0]);
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
    const dn = press.has(r * 100 + c), w0 = (r + 0.1) / nr, w1 = (r + 0.86) / nr;
    quad((c + 0.08) / nc, (c + 0.92) / nc, w0 + (dn ? 0.06 : 0), w1 + (dn ? 0.06 : 0), dn ? col[2] : col[1], 4);
    if (v.k === 'reji' && r === 1 && c === 4) quad((c + 0.08) / nc, (c + 0.92) / nc, w0 + (dn ? 0.06 : 0), w1 + (dn ? 0.06 : 0), dn ? '#ff8a8a' : '#ff5a5f', 4);
  }
  if (v.k === 'pc') quad(0.3, 0.7, 1.0, 1.06, col[1], 4);
}
function keysScene(g, s, v) {
  const V = g.V, k = s.k, a = s.k ? s.age : 9;
  if (v.k === 'pc') {
    g.bg('#dff3ff'); fDots(g, V.x0, V.y0 + 30, V.x1 - V.x0, 520 - V.y0, 80, 6, '#c6e6fa');
    g.band(520, 'bottom', '#e2b07a', 7); g.planks(V.x0 - 10, 527, V.x1 - V.x0 + 20, 1000, 3, '#e2b07a');
    g.rr(450, 430, 100, 90, 10, '#5c6478'); g.rr(380, 500, 240, 30, 14, '#5c6478');
    g.rr(200, 80, 600, 370, 30, '#3a3f55'); g.rr(226, 104, 548, 322, 14, '#1f2a4a', 0);
    const pr = k === 0 ? 0 : k === 1 ? lerp(0, 0.5, E.outQ(clamp(a / 0.25))) : lerp(0.5, 1, E.outQ(clamp(a / 0.25)));
    g.rr(270, 290, 460, 56, 28, '#2e3a66', 4); if (pr > 0.01) g.rr(270, 290, 460 * pr, 56, 28, pr >= 1 ? '#3cc46b' : '#4cc9f0', 0); g.rr(270, 290, 460, 56, 28, null, 4);
    g.text(k >= 2 ? '完了！' : Math.round(pr * 100) + '%', 500, 200, { size: k >= 2 ? 92 : 80, f: k >= 2 ? C.yellow : '#ffffff' });
    if (k < 2 && Math.floor(s.t * 3) % 2) g.rect(616 - (k ? 0 : 60), 168, 10, 64, '#ffffff', 0);
  } else if (v.k === 'piano') {
    g.bg('#2a1d48', '#4b2c5e'); g.glow(500, 300, 520, '#ffe3a8', 0.25);
    g.rr(V.x0 - 20, 330, V.x1 - V.x0 + 40, 300, 0, '#16141f', 0);
    g.rr(80, 340, 840, 230, 20, '#24212f'); g.line([100, 360, 900, 360], '#3a3650', 6);
    g.rr(330, 380, 340, 150, 10, '#fff8e8'); for (let i = 0; i < 4; i++) g.line([350, 410 + i * 30, 650, 410 + i * 30], '#c9c1ad', 3);
    for (const [x, y] of [[380, 410], [430, 440], [480, 420], [560, 470], [610, 440]]) { g.circ(x, y, 9, C.ink, 0); g.line([x + 8, y, x + 8, y - 34], C.ink, 3); }
    const open = k === 0 ? 0 : k === 1 ? 0.5 : 1;
    g.at(820, 330, 0, 1.35, 1.35, () => {
      g.rr(-46, -70, 92, 100, 30, '#9ad7ff'); g.rr(-36, 20, 72, 20, 8, '#7ab8e0', 4); g.hl(-20, -40, 10, 24, 0, 0.5);
      [[-34, -180, -0.35], [0, -210, 0], [34, -180, 0.35]].forEach(([x, y, r], i) => {
        g.curve([0, -66, x / 2, (y - 66) / 2 + 10, x, y + 30], '#2ea44f', 6);
        const ai = ageOf(s, i === 1 ? 1 : 2), o = ai >= 0 ? E.outBack(clamp(ai / 0.3)) : 0, c = [C.red, C.yellow, '#ff8fd0'][i];
        g.at(x, y + 20, r, 1, 1, () => { if (o > 0.02) for (const sx of [-1, 1]) g.at(0, 0, sx * 0.6 * o, 1, 1, () => g.ell(sx * 10, -16, 16, 28, c)); g.ell(0, -12, 18 - 6 * o, 28, sh(c, -0.05)); });
      });
    });
  } else {
    g.bg('#fff2d6'); g.stripes(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 460 - V.y0, 90, '#fff2d6', '#ffe6bd');
    for (const [x, c] of [[120, '#ff6b6b'], [220, '#ffd23f'], [780, '#3cc46b'], [880, '#4cc9f0']]) { g.rr(x - 40, 190, 80, 110, 14, c); g.rr(x - 30, 210, 60, 30, 8, '#ffffff', 0); }
    g.rect(V.x0 - 10, 300, V.x1 - V.x0 + 20, 20, '#c98b52', 0);
    g.band(460, 'bottom', '#c98b52', 7); g.band(480, 'bottom', '#e2a866');
    const op = k >= 2 ? E.outBack(clamp(a / 0.25)) : 0;
    g.rr(220, 520, 560, 330, 40, '#2ec4b6');
    g.rr(250, 760 + 70 * op, 500, 110, 18, '#24a89c');
    if (op > 0.05) { g.rr(270, 770 + 70 * op, 460, 40 * op + 4, 10, '#1d7f76', 0); for (let i = 0; i < 4; i++) { g.ell(330 + i * 110, 790 + 70 * op, 40, 14, C.gold, 4); } }
    g.rr(430, 790 + 70 * op, 140, 18, 9, '#1d7f76', 0);
    g.rr(440, 300, 120, 130, 14, '#24a89c'); g.rr(330, 230, 340, 130, 26, '#2ec4b6'); g.rr(356, 254, 288, 82, 14, '#173f3b', 0);
    g.text(k === 0 ? '0円' : k === 1 ? '100円' : 'ありがとう', 500, 296, { size: k === 2 ? 50 : 62, f: k === 2 ? C.yellow : '#9cf2d8' });
  }
}
function keysHands(g, s, v) {
  for (const sd of ['L', 'R']) {
    const sg = sgn(sd), p = handP(s, sd), T = keyPt(v, sd), sc = lerp(v.k === 'reji' ? 0.82 : 0.9, 1.05, p);
    const ang = -PI / 2 - sg * lerp(0.1, 0.22, p), tip = v.hand === 'point' ? [-24, -143] : [11, -134];
    const [hx, hy] = fingerTo(T, sd, ang, sc, tip);
    g.arm(hx + sg * 40 * p, hy - (v.k === 'piano' ? 150 : 210) * p, ang, { hand: v.hand, side: sd, s: sc });
  }
}

/* ---------- 木琴・コップの音階（交互） ---------- */
const XYLO = [
  { k: 'xylo', name: '木琴をたたく', short: '木琴', theme: 'school', T: { L: 2, R: 5 } },
  { k: 'glass', name: 'コップの音階', short: 'コップ', theme: 'kitchen', T: { L: 1, R: 3 } },
];
const RAIN = ['#ff5a5f', '#ff9f1c', '#ffd23f', '#a8e05f', '#3cc46b', '#2ec4b6', '#3a86ff', '#8e5cff'];
const XB = i => ({ x: 150 + i * 100, h: 330 - i * 18, y: 670 });
const GL = i => ({ x: 200 + i * 150, top: 520, bot: 770, lv: [0.82, 0.68, 0.54, 0.42, 0.3][i], c: ['#ff7aa8', '#ff9f45', '#ffd23f', '#5fd67a', '#4cc9f0'][i] });
// 当たる点
function xyloPt(v, sd) { const i = v.T[sd]; if (v.k === 'xylo') { const b = XB(i); return [b.x, b.y - 30]; } const c = GL(i); return [c.x + sgn(sd) * 30, c.top + 6]; }
function xyloScene(g, s, v) {
  const V = g.V, a1 = ageOf(s, 1), a2 = ageOf(s, 2);
  if (v.k === 'xylo') {
    g.bg('#fff3dc'); g.rr(110, 70, 780, 300, 18, '#8a5a36'); g.rr(128, 88, 744, 264, 10, '#2f6b4f', 0);
    for (let i = 0; i < 5; i++) g.line([170, 150 + i * 36, 830, 150 + i * 36], 'rgba(255,255,255,0.75)', 4);
    g.text('♪', 210, 222, { size: 120, f: 'rgba(255,255,255,0.85)' });
    [[1, 420], [2, 600]].forEach(([n, x]) => {
      const a = ageOf(s, n); if (a < 0) return;
      const i = v.T[sideOf(s, n) === 'B' ? (n === 1 ? 'L' : 'R') : sideOf(s, n)], y = 294 - i * 18, sc = E.outBack(clamp(a / 0.3), 2.5) * (1 + (a2 >= 0 ? 0.12 * Math.abs(Math.sin(s.beat * PI)) : 0));
      g.at(x, y, -0.15, sc, sc, () => { g.ell(0, 0, 30, 23, RAIN[i], 5); g.line([26, -4, 26, -110], '#ffffff', 7); g.path('M26 -110 Q60 -90 56 -50', null, 7); });
    });
    g.band(470, 'bottom', '#e2b07a', 7); g.planks(V.x0 - 10, 477, V.x1 - V.x0 + 20, 1100, 4, '#e2b07a');
    g.shadow(500, 860, 430, 30);
    for (const y of [580, 760]) { g.rr(90, y - 14, 820, 28, 12, '#7a4a2a'); }
    for (let i = 0; i < 8; i++) {
      const b = XB(i), sd = i === v.T.L ? 'L' : i === v.T.R ? 'R' : null, a = sd ? sideAge(s, sd) : -1, dy = a >= 0 ? jig(a, 10, 30, 9) : 0;
      g.rr(b.x - 38, b.y - b.h / 2 + dy, 76, b.h, 16, RAIN[i]); g.hl(b.x - 14, b.y - b.h / 2 + 40 + dy, 8, b.h * 0.3, 0, 0.45);
      for (const yy of [-b.h / 2 + 30, b.h / 2 - 30]) g.circ(b.x, b.y + yy + dy, 8, sh(RAIN[i], -0.3), 0);
      if (a >= 0 && a < 0.3) g.alpha(1 - a / 0.3, () => g.rr(b.x - 38, b.y - b.h / 2 + dy, 76, b.h, 16, '#ffffff', 0));
    }
  } else {
    g.bg('#fff0f3'); fDots(g, V.x0, V.y0 + 20, V.x1 - V.x0, 470 - V.y0, 90, 8, '#ffd9e2');
    g.rr(620, 110, 260, 220, 14, '#ffffff', 7); g.rect(636, 126, 228, 188, '#c9ecff', 0); g.line([750, 116, 750, 324], C.ol, 6); g.line([626, 220, 874, 220], C.ol, 6);
    g.band(470, 'bottom', '#ff8a8a', 7); fTiles(g, V.x0 - 10, 476, V.x1 - V.x0 + 20, 1100, 80, '#ffffff', '#ffb3b3');
    for (let i = 0; i < 5; i++) {
      const c = GL(i), sd = i === v.T.L ? 'L' : i === v.T.R ? 'R' : null, a = sd ? sideAge(s, sd) : -1, lit = a >= 0 || a2 >= 0, wy = c.bot - (c.bot - c.top) * c.lv;
      const d = `M${c.x - 62} ${c.top} L${c.x - 50} ${c.bot} Q${c.x} ${c.bot + 18} ${c.x + 50} ${c.bot} L${c.x + 62} ${c.top} Z`;
      g.shadow(c.x, c.bot + 14, 70, 12);
      if (lit) g.glow(c.x, wy + 60, 150, c.c, 0.5);
      g.clipPath(d, () => { g.rect(c.x - 80, wy, 160, 400, c.c, 0); g.ell(c.x, wy, 60, 14, sh(c.c, 0.35), 0); if (a >= 0) { const r = 20 + a * 160; g.alpha(clamp(1 - a * 2), () => g.ell(c.x, wy, r, r * 0.25, null, 4)); } for (let j = 0; j < 3; j++) { const by = c.bot - 20 - ((s.t * 120 + j * 60 + i * 30) % (c.bot - wy - 20)); if (lit) g.circ(c.x - 20 + j * 20, by, 6, 'rgba(255,255,255,0.8)', 0); } });
      g.alpha(0.35, () => g.path(d, '#e8f6ff', 0)); g.path(d, null);
      g.ell(c.x, c.top, 62, 16, null, 6); g.line([c.x - 36, c.top + 30, c.x - 30, c.bot - 30], 'rgba(255,255,255,0.8)', 8);
    }
  }
}
function xyloMallet(g, s, v, sd) {
  const sg = sgn(sd), p = handP(s, sd), [x, y] = xyloPt(v, sd), glass = v.k === 'glass', br = glass ? 20 : 30;
  const tx = lerp(x, x + sg * 130, p), ty = lerp(y - br + 4, 200, p);
  const gx = lerp(x + sg * 190, x + sg * 235, p), gy = lerp(y + 300, y + 60, p);
  const a = Math.atan2(ty - gy, tx - gx), ux = Math.cos(a), uy = Math.sin(a);
  g.taper(gx - ux * 50, gy - uy * 50, tx - ux * br * 0.6, ty - uy * br * 0.6, glass ? 12 : 13, glass ? 9 : 9, glass ? '#cfd6e2' : C.wood2);
  if (glass) { g.ell(tx, ty, br * 0.8, br * 1.2, '#dfe5ee', 6, a + PI / 2); g.hl(tx - 4, ty - 4, 5, 9, a + PI / 2, 0.6); }
  else { g.circ(tx, ty, br, sd === 'L' ? '#3a86ff' : '#ff5a5f'); g.hl(tx - 9, ty - 10, 10, 7, -0.5, 0.6); }
  gripArm(g, sd, gx, gy, tx, ty);
}

/* ---------- 肩たたき（交互・両手） ---------- */
const KATA = [
  { k: 'jii', name: 'おじいちゃんの肩たたき', short: 'じいじの肩', theme: 'home', top: '#6f8f52', shirt: '#efe2c4', cush: '#7d4fb0' },
  { k: 'baa', name: 'おばあちゃんの肩たたき', short: 'ばあばの肩', theme: 'home', top: '#ff8fb0', shirt: '#ffffff', cush: '#2ec4b6', bun: 1 },
];
const SH = { L: [352, 616], R: [648, 616] };
function kataScene(g, s, v) {
  const V = g.V;
  g.bg('#f4ead2');
  const x0 = Math.floor((V.x0 - 20) / 220) * 220;
  g.rect(x0, V.y0, V.x1 + 240 - x0, 540 - V.y0, '#fbf7ec', 0); fGrid(g, x0, 540 - Math.ceil((540 - V.y0) / 48) * 48, V.x1 + 240 - x0, Math.ceil((540 - V.y0) / 48) * 48, 48, 48, '#d9c49b', 4);
  for (let x = x0; x < V.x1 + 220; x += 220) g.rect(x - 7, V.y0, 14, 540 - V.y0, '#b98b56', 0);
  g.rect(V.x0 - 10, 90, V.x1 - V.x0 + 20, 18, '#b98b56', 0);
  g.band(540, 'bottom', '#cfd98f', 6); for (let y = 540, h = 80; y < V.y1; y += h, h *= 1.3) g.line([V.x0 - 10, y, V.x1 + 10, y], '#7d6a3a', 6);
  g.line([500, 540, 500, V.y1 + 10], '#b8c278', 4);
  g.shadow(500, 900, 330, 40, 0.25);
  g.rr(200, 780, 600, 180, 50, v.cush); g.rr(220, 790, 560, 40, 20, sh(v.cush, 0.2), 0);
}
function person(g, s, v) {
  const hits = { L: 0, R: 0 };
  for (let n = 1; n <= s.k; n++) { const sd = sideOf(s, n); if (sd === 'B') { hits.L++; hits.R++; } else hits[sd] += 2; }
  const jL = Math.round(jig(sideAge(s, 'L'), 6, 26, 8)) * 2, jR = Math.round(jig(sideAge(s, 'R'), 6, 26, 8)) * 2, happy = s.k >= 2, pleased = s.k >= 1;
  const body = `M210 960 L238 700 Q252 628 ${SH.L[0]} ${SH.L[1] + jL} Q430 590 466 566 L534 566 Q570 590 ${SH.R[0]} ${SH.R[1] + jR} Q748 628 762 700 L790 960 Z`;
  g.path(body, v.shirt); g.clipPath(body, () => { g.path(`M200 960 L240 710 Q256 646 ${SH.L[0]} ${SH.L[1] + 26 + jL} L410 960 Z`, v.top, 0); g.path(`M800 960 L760 710 Q744 646 ${SH.R[0]} ${SH.R[1] + 26 + jR} L590 960 Z`, v.top, 0); g.line([500, 600, 500, 960], sh(v.shirt, -0.1), 5); }); g.path(body, null);
  const tilt = happy ? Math.sin(s.beat * PI) * 0.08 : pleased ? 0.05 : 0;
  g.at(500, 566, tilt, 0.9, 0.9, () => {
    g.rr(-50, -40, 100, 60, 24, C.skin2);
    for (const sx of [-1, 1]) { g.ell(sx * 98, -96, 22, 34, C.skin); if (pleased) { g.ell(sx * 92, -70, 16, 10, '#ff9fb0', 0); g.arc(sx * 86, -96, 12, PI + 0.4, -0.4, C.ink, 5); } }
    g.circ(0, -110, 102, C.skin);
    if (v.bun) { g.circ(0, -116, 104, '#c9ccd8'); g.circ(0, -212, 44, '#b8bcc9'); g.line([-30, -230, 30, -196], '#8f6a3a', 8); for (const yy of [-150, -110, -70]) g.arc(0, yy - 40, 90, 0.5, PI - 0.5, '#a7abb9', 4); }
    else { g.path('M-100 -96 Q-104 -40 -60 -20 Q0 -6 60 -20 Q104 -40 100 -96 Q60 -60 0 -62 Q-60 -60 -100 -96 Z', '#f2f2f4'); g.hl(-30, -170, 40, 22, -0.3, 0.55); }
  });
  // こり（肩のギザギザ）
  for (const sd of ['L', 'R']) {
    const left = 2 - Math.min(2, hits[sd]), [x, y] = SH[sd];
    for (let i = 0; i < left; i++) { const ox = x + sgn(sd) * (70 + i * 34), oy = y - 34 - i * 40; g.line([ox - 22, oy + 14, ox - 8, oy - 12, ox + 6, oy + 12, ox + 20, oy - 14], '#ffffff', 16); g.line([ox - 22, oy + 14, ox - 8, oy - 12, ox + 6, oy + 12, ox + 20, oy - 14], '#ff3b3b', 8); }
  }
  if (happy) for (let i = 0; i < 3; i++) { const t = (s.t * 0.8 + i / 3) % 1; g.alpha(Math.sin(PI * t), () => g.curve([440 + i * 60, 300 - t * 120, 430 + i * 60, 270 - t * 120, 450 + i * 60, 240 - t * 120], '#ffffff', 8)); }
}
function kataFists(g, s, v) {
  for (const sd of ['L', 'R']) {
    const sg = sgn(sd), p = handP(s, sd), [x, y] = SH[sd], sc = lerp(0.9, 1.12, p);
    g.arm(lerp(x + sg * 4, x + sg * 40, p), lerp(y - 24, 440, p), -PI / 2 - sg * lerp(0.1, 0.26, p), { hand: 'fist', side: sd, s: sc });
  }
}

/* ---------- ふとん・じゅうたんをたたく（交互・両手） ---------- */
const FUTON = [
  { k: 'futon', name: 'ふとんをたたく', short: 'ふとん', theme: 'town', c1: '#ffb3c7', c2: '#ffffff', T: { L: [360, 560], R: [640, 560] } },
  { k: 'rug', name: 'じゅうたんをたたく', short: 'じゅうたん', theme: 'home', c1: '#d9534f', c2: '#ffd36b', T: { L: [360, 560], R: [640, 560] } },
];
const DUST = [[250, 450, 'L'], [330, 640, 'L'], [420, 520, 'L'], [580, 470, 'R'], [680, 650, 'R'], [750, 520, 'R']];
function futonScene(g, s, v) {
  const V = g.V;
  if (v.k === 'futon') {
    g.sky('#7ccfff', '#e4f6ff', 760); g.sun(860, 110, 70);
    { const c = g.ctx, bx = Math.floor(V.x0 / 140) * 140; for (const odd of [0, 1]) { c.beginPath(); for (let x = bx, i = 0; x < V.x1 + 140; x += 140, i++) if (i % 2 === odd) { const h = 200 + (i * 73) % 180; c.rect(x, 760 - h, 120, h); } c.fillStyle = odd ? '#a9c6e8' : '#bcd4ee'; c.fill(); }
      c.beginPath(); for (let x = bx, i = 0; x < V.x1 + 140; x += 140, i++) { const h = 200 + (i * 73) % 180; for (let j = 0; j < 3; j++) c.rect(x + 18 + j * 34, 790 - h, 18, 24); } c.fillStyle = '#ffffff'; c.fill(); }
    g.band(760, 'bottom', '#d4d9e4', 7);
    { const c = g.ctx; c.beginPath(); for (let x = Math.floor(V.x0 / 60) * 60; x < V.x1; x += 60) c.rect(x, 300, 10, 470); c.fillStyle = '#9aa6ba'; c.fill(); } g.rect(V.x0 - 10, 290, V.x1 - V.x0 + 20, 20, '#b8c3d4', 5);
  } else {
    g.sky('#8fd8ff', '#eaf9ff', 620); g.cloud(200, 140, 0.8); g.cloud(840, 220, 0.6);
    for (let x = Math.floor(V.x0 / 100) * 100; x < V.x1; x += 100) { g.rr(x + 10, 470, 80, 170, 10, '#f6efe0', 5); }
    g.band(620, 'bottom', '#86c86a', 6); g.grassTufts(700, '#6db556', 2, 8);
    g.line([V.x0 - 20, 280, V.x1 + 20, 280], '#ffffff', 6); g.line([V.x0 - 20, 282, V.x1 + 20, 282], 'rgba(0,0,0,0.15)', 2);
    const sneeze = s.k >= 2 && s.age > 0.12;
    g.at(880, 650, 0, 1, 1, () => { g.poly([-90, 60, -90, -40, 0, -110, 90, -40, 90, 60], '#c0583f'); g.rr(-50, -20, 100, 80, 40, '#3b2433', 0);
      g.at(sneeze ? -10 : 0, sneeze ? 6 : 0, sneeze ? -0.2 : 0, 1, 1, () => { g.ell(-20, 30, 50, 40, '#f6d7a4'); g.ell(-64, 6, 18, 30, '#c98b52', 5, 0.3); g.ell(26, 6, 18, 30, '#c98b52', 5, -0.3); if (sneeze) { g.line([-40, 22, -26, 26], C.ink, 5); g.line([-6, 26, 8, 22], C.ink, 5); } else { g.circ(-34, 24, 6, C.ink, 0); g.circ(-2, 24, 6, C.ink, 0); } g.ell(-18, 44, 10, 8, C.ink, 0); }); });
  }
}
function futonBody(g, s, v) {
  const hits = { L: 0, R: 0 };
  for (let n = 1; n <= s.k; n++) { const sd = sideOf(s, n); if (sd === 'B') { hits.L++; hits.R++; } else hits[sd] += 2; }
  const fluff = s.k >= 2 ? 1 + 0.04 * E.outBack(clamp(s.age / 0.3), 3) : 1, jl = jig(sideAge(s, 'L'), 0.02, 26, 8), jr = jig(sideAge(s, 'R'), 0.02, 26, 8);
  g.at(500, 300, 0, fluff + jl + jr, fluff, () => g.at(-500, -300, () => {
    if (v.k === 'futon') {
      g.rr(160, 250, 680, 110, 50, sh(v.c1, -0.08));
      const d = 'M170 300 L170 740 Q500 790 830 740 L830 300 Z';
      g.path(d, v.c1); g.clipPath(d, () => { for (let y = 360, i = 0; y < 800; y += 90, i++) for (let x = 210 + (i % 2) * 70; x < 830; x += 140) { g.circ(x, y, 22, v.c2, 0); g.circ(x, y, 9, '#ffd36b', 0); } g.rect(170, 300, 680, 30, 'rgba(0,0,0,0.12)', 0); }); g.path(d, null);
      g.path('M170 300 Q500 270 830 300', null, 7);
    } else {
      const d = 'M190 280 L190 770 L810 770 L810 280 Z';
      g.path(d, v.c1); g.rr(222, 312, 556, 426, 6, null, 6); g.rr(250, 340, 500, 370, 4, '#f6e7c8', 0);
      g.poly([500, 380, 680, 525, 500, 670, 320, 525], v.c1); g.poly([500, 430, 620, 525, 500, 620, 380, 525], '#2b4c9b'); g.circ(500, 525, 26, v.c2, 5);
      for (const [x, y] of [[300, 390], [700, 390], [300, 660], [700, 660]]) g.star(x, y, 26, 12, 4, '#2b4c9b', 4, 0);
      for (let x = 200; x <= 800; x += 30) g.line([x, 772, x, 810], v.c2, 6);
      g.path(d, null);
    }
    for (const [x, y, sd] of DUST) if (hits[sd] < 2 && !(hits[sd] === 1 && (x < 300 || x > 700))) { g.alpha(0.55, () => { g.blob([x - 40, y, x - 20, y - 26, x + 20, y - 24, x + 44, y + 4, x + 10, y + 26, x - 30, y + 20], '#8a7f74', 0); }); g.circ(x + 50, y - 20, 6, 'rgba(138,127,116,0.6)', 0); }
  }));
}
function beaters(g, s, v) {
  for (const sd of ['L', 'R']) {
    const sg = sgn(sd), p = handP(s, sd), [x, y] = v.T[sd];
    const hx = lerp(x, x + sg * 90, p), hy = lerp(y, 190, p), rot = sg * (0.15 + 0.5 * p), sc = 1 + 0.12 * p;
    const gx = lerp(x + sg * 190, x + sg * 235, p), gy = lerp(y + 330, y + 90, p);
    const a = Math.atan2(hy - gy, hx - gx);
    g.taper(gx - Math.cos(a) * 50, gy - Math.sin(a) * 50, hx + Math.cos(a) * 10, hy + Math.sin(a) * 10, 16, 12, '#c98b52');
    g.at(hx, hy, rot, sc, sc, () => { for (const [cx, cy, r] of [[-40, -40, 52], [40, -40, 52], [0, 30, 60]]) { g.ring(cx, cy, r, C.ol, 24); g.ring(cx, cy, r, '#e0b060', 13); } g.circ(0, 0, 16, '#c98b52'); });
    gripArm(g, sd, gx, gy, hx, hy);
  }
}

/* ---------- スイカ割り・ピニャータ（両手で棒） ---------- */
const SUIKA = [
  { k: 'suika', name: 'スイカ割り', short: 'スイカ割り', theme: 'sea', T: [500, 492] },
  { k: 'pinata', name: 'ピニャータを割る', short: 'ピニャータ', theme: 'party', T: [512, 404] },
];
const MEL = { x: 500, y: 622, rx: 176, ry: 130 };
const MEL_H = [
  { d: `M200 300 L500 300 L500 492 L486 540 L512 590 L490 650 L506 700 L500 800 L200 800 Z`, piv: [330, 740], sd: -1 },
  { d: `M800 300 L500 300 L500 492 L486 540 L512 590 L490 650 L506 700 L500 800 L800 800 Z`, piv: [670, 740], sd: 1 },
];
const STAR_C = [500, 500], STAR_R = 150;
const starPt = (i, r) => [STAR_C[0] + Math.cos(-PI / 2 + i * PI / 5) * r, STAR_C[1] + Math.sin(-PI / 2 + i * PI / 5) * r];
const PIN_SH = [0, 1, 2, 3, 4].map(i => {
  const a = starPt(i * 2 - 1, 64), b = starPt(i * 2, STAR_R + 30), c = starPt(i * 2 + 1, 64), m = starPt(i * 2, 70), ang = -PI / 2 + i * 2 * PI / 5;
  return { d: `M${STAR_C[0]} ${STAR_C[1]} L${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} Z`, cx: m[0], cy: m[1], vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620 - 200, vr: (i % 2 ? 1 : -1) * 4 };
});
function melon(g) {
  const { x, y, rx, ry } = MEL;
  g.ell(x, y, rx, ry, '#3cb45a');
  g.clipCirc(x, y, rx + 4, () => { for (let i = -3; i <= 3; i++) { const xx = x + i * 52; g.curve([xx, y - ry, xx + 16, y - 70, xx - 8, y - 20, xx + 16, y + 30, xx - 6, y + 80, xx + 6, y + ry], '#1f7a3c', 18); } });
  g.ell(x, y, rx, ry, null); g.hl(x - 70, y - 70, 50, 22, -0.4, 0.45);
  g.path(`M${x} ${y - ry} q-6 -26 14 -34`, null, 7);
}
function melonHalfFace(g, sd) {
  const { x, y, ry } = MEL;
  g.ell(x + sd * 4, y, 22, ry - 6, '#ffffff', 5); g.ell(x + sd * 8, y, 14, ry - 20, '#ff4d5a', 0);
  for (const yy of [-60, -20, 20, 60]) g.ell(x + sd * 10, y + yy, 4, 7, C.ink, 0);
}
function crab(g, x, y, cheer, beat) {
  const b = cheer ? Math.abs(Math.sin(beat * PI)) * 20 : 0;
  g.at(x, y - b, () => {
    for (const sx of [-1, 1]) { for (let i = 0; i < 3; i++) g.line([sx * 30, 10 + i * 8, sx * 66, 30 + i * 12], '#e8443a', 7); g.cap(sx * 40, -10, sx * (cheer ? 70 : 76), cheer ? -80 : -40, 10, '#ff5a4f'); g.ell(sx * (cheer ? 72 : 80), cheer ? -94 : -52, 20, 16, '#ff5a4f'); g.tri(sx * (cheer ? 72 : 80), cheer ? -104 : -62, sx * (cheer ? 92 : 100), cheer ? -116 : -74, sx * (cheer ? 80 : 88), cheer ? -96 : -54, '#ffd0c8', 3); }
    g.ell(0, 0, 50, 34, '#ff5a4f'); for (const sx of [-14, 14]) { g.line([sx, -26, sx, -46], C.ink, 5); g.circ(sx, -50, 9, '#ffffff', 4); g.circ(sx, -50, 4, C.ink, 0); }
    if (cheer) g.arc(0, -2, 14, 0.3, PI - 0.3, C.ink, 4);
  });
}
function suikaScene(g, s, v) {
  const V = g.V;
  if (v.k === 'suika') {
    g.sky('#56c0ff', '#d6f2ff', 400); g.sun(160, 110, 66); g.cloud(760, 150, 0.7);
    g.band(380, 470, '#2a9ee0'); for (let x = V.x0; x < V.x1; x += 120) g.arc(x + 50, 420 + 6 * Math.sin(s.beat * PI + x * 0.02), 26, PI * 1.1, PI * 1.9, '#ffffff', 5);
    g.band(462, 'bottom', '#f4d9a0', 6); fDots(g, V.x0, 500, V.x1 - V.x0, V.y1 - 500, 70, 4, '#e6c585');
    g.line([860, 380, 878, 700], C.ol, 22); g.line([860, 380, 878, 700], '#ffffff', 10);
    g.path('M700 430 Q860 290 1020 430 Z', '#ff5a5f'); g.clipPath('M700 430 Q860 290 1020 430 Z', () => { g.path('M760 440 Q840 300 860 350 Q880 300 960 440 Z', '#ffffff', 0); }); g.path('M700 430 Q860 290 1020 430 Z', null); g.line([860, 360, 860, 470], C.ol, 8);
    g.poly([230, 700, 770, 700, 860, 820, 140, 820], '#3a86ff'); g.poly([230, 700, 770, 700, 790, 726, 210, 726], '#6aa8ff', 0);
    crab(g, 150, 860, s.k >= 2 && s.age > 0.1, s.beat);
    g.shadow(MEL.x, 744, 190, 26, 0.28);
  } else {
    g.bg('#ffe9d6'); fDots(g, V.x0, V.y0, V.x1 - V.x0, 760 - V.y0, 100, 10, '#ffd6b8');
    for (let row = 0; row < 2; row++) { const y0 = row ? -200 : 90; if (y0 < V.y0 - 40) continue; g.path(`M${V.x0 - 40} ${y0} Q500 ${y0 + 110} ${V.x1 + 40} ${y0}`, null, 4); const c = g.ctx; for (let ci = 0; ci < 4; ci++) { c.beginPath(); for (let x = Math.floor(V.x0 / 90) * 90, i = 0; x < V.x1 + 90; x += 90, i++) if (i % 4 === ci) { const u = (x - (V.x0 - 40)) / (V.x1 - V.x0 + 80), y = y0 + 110 * 2 * u * (1 - u) - 2; c.moveTo(x - 30, y); c.lineTo(x + 30, y); c.lineTo(x, y + 60); c.closePath(); } c.fillStyle = [C.red, C.yellow, C.green, C.blue][ci]; c.fill(); c.lineWidth = 4; c.strokeStyle = C.ol; c.lineJoin = 'round'; c.stroke(); } }
    for (const [x, y, c] of [[130, 300, C.red], [220, 230, C.yellow], [820, 260, C.blue], [900, 330, C.green], [-200, 300, C.purple], [1200, 280, C.pink]]) { g.line([x, y + 70, x + 10, y + 300], C.ol, 3); g.ell(x, y, 52, 64, c); g.hl(x - 18, y - 22, 12, 20, -0.4, 0.55); }
    g.band(760, 'bottom', '#c98b52', 6); g.planks(V.x0 - 10, 766, V.x1 - V.x0 + 20, 800, 4, '#c98b52');
    g.shadow(500, 860, 160, 24, 0.2);
  }
}
const PIN_PTS = []; for (let i = 0; i < 10; i++) { const [x, y] = starPt(i, i % 2 ? 66 : STAR_R); PIN_PTS.push(x, y); }
const PIN_D = `M${PIN_PTS.map((v, i) => (i % 2 ? v : (i ? 'L' : '') + v)).join(' ')} Z`;
function pinata(g, s, lite) {
  const pts = PIN_PTS;
  g.poly(pts, '#ff9fbd', lite ? 0 : undefined);
  g.clipPath(PIN_D, () => { for (let i = 0; i < 9; i += lite ? 2 : 1) g.rect(STAR_C[0] - 200, STAR_C[1] - 170 + i * 38, 400, 20, RAIN[i % 8], 0); });
  g.poly(pts, null);
  if (lite) return;
  for (let i = 0; i < 5; i++) { const [x, y] = starPt(i * 2, STAR_R); for (let j = -1; j <= 1; j++) g.line([x + j * 8, y, x + j * 12, y + 46], RAIN[(i + j + 8) % 8], 6); }
  g.circ(STAR_C[0] - 34, STAR_C[1] - 6, 10, C.ink, 0); g.circ(STAR_C[0] + 34, STAR_C[1] - 6, 10, C.ink, 0); g.arc(STAR_C[0], STAR_C[1] + 10, 20, 0.3, PI - 0.3, C.ink, 5);
}

/* ---------- 巨大ボタン（両手で押す） ---------- */
const BTN = [
  { k: 'rocket', name: '発射ボタンを押す', short: '発射ボタン', theme: 'space' },
  { k: 'quiz', name: '早押しボタン', short: '早押し', theme: 'game' },
];
const BT = { x: 500, y: 690, rx: 190, ry: 62 };
function btnScene(g, s, v) {
  const V = g.V, a1 = ageOf(s, 1), a2 = ageOf(s, 2);
  if (v.k === 'rocket') {
    g.bg('#141a3a', '#22295a');
    for (let x = Math.floor(V.x0 / 120) * 120, i = 0; x < V.x1 + 120; x += 120, i++) { g.rr(x + 8, 470, 104, 80, 10, '#2d3770', 0); for (let j = 0; j < 3; j++) g.circ(x + 30 + j * 30, 500, 8, ((i + j + Math.floor(s.beat * 2)) % 3) ? '#3a4790' : ['#3cc46b', '#ffd23f', '#ff5a5f'][j], 0); g.rr(x + 22, 520, 76, 14, 6, '#3a4790', 0); }
    g.rr(170, 40, 660, 400, 30, '#4a5596'); g.rr(196, 64, 608, 352, 16, '#6ac4ff', 0);
    g.clipRR(196, 64, 608, 352, 16, () => {
      g.rect(196, 300, 608, 120, '#5fbf6a', 0); g.rect(196, 330, 608, 90, '#4fae5c', 0);
      g.rr(600, 200, 26, 130, 6, '#9aa6ba', 0); g.line([626, 220, 560, 220], '#9aa6ba', 8);
      const lift = a2 >= 0 ? 480 * E.inQ(clamp(a2 / 0.5)) : 0, shake = a1 >= 0 && a2 < 0 ? Math.sin(s.t * 70) * 3 : 0;
      if (a1 >= 0) for (let i = 0; i < 4; i++) g.circ(450 + (i - 1.5) * 50 + shake, 330 - lift * 0.1, 40 + i % 2 * 10 + (a2 >= 0 ? 30 : 0), '#ffffff', 0);
      g.at(500 + shake, 300 - lift, () => {
        if (a2 >= 0) { g.path('M-30 30 Q0 150 30 30 Z', C.orange, 0); g.path('M-16 30 Q0 100 16 30 Z', C.yellow, 0); }
        g.path('M-40 30 L-40 -110 Q0 -190 40 -110 L40 30 Z', '#ffffff'); g.path('M-40 -60 L40 -60 L40 -40 L-40 -40 Z', '#ff5a5f', 0); g.circ(0, -96, 16, '#4cc9f0', 5);
        g.path('M-40 -10 L-74 34 L-40 30 Z', '#ff5a5f'); g.path('M40 -10 L74 34 L40 30 Z', '#ff5a5f');
      });
    });
    g.rr(196, 64, 608, 352, 16, null, 6);
    g.band(560, 'bottom', '#3a4170', 7); g.band(600, 'bottom', '#323a66');
  } else {
    g.bg('#3b1f6b', '#6a2c8f');
    for (const sx of [140, 860]) g.alpha(0.18 + 0.08 * Math.sin(s.beat * PI), () => g.poly([sx - 40, V.y0, sx + 40, V.y0, sx + (sx < 500 ? 1 : -1) * 260 + 140, 900, sx + (sx < 500 ? 1 : -1) * 260 - 140, 900], '#ffe9a8', 0));
    g.rr(260, 50, 480, 300, 26, '#241245'); g.rr(280, 70, 440, 260, 16, '#1b0f38', 0);
    if (a2 >= 0) { const q = E.outBack(clamp(a2 / 0.3), 2); g.at(500, 200, 0, q, q, () => { g.ring(0, 0, 96, '#ff3b5c', 36); g.ring(0, 0, 96, C.ol, 4); }); }
    else g.text('？', 500, 205, { size: 170, f: '#ffd23f', o: 12 });
    for (let i = 0; i < 10; i++) g.circ(280 + i * 49, 50, 10, (i + Math.floor(s.beat * 2)) % 2 ? '#ffd23f' : '#ff7ad9', 0);
    g.band(560, 'bottom', '#2a1550', 6);
    g.poly([250, 560, 750, 560, 800, 1000, 200, 1000], '#ff5aa8'); g.poly([250, 560, 750, 560, 760, 600, 240, 600], '#ffa3d0', 0); g.star(500, 820, 70, 30, 5, '#ffd23f');
    const lamp = a1 >= 0, fl = lamp && Math.floor(s.t * 8) % 2;
    if (lamp) { g.glow(500, 20, 220, '#fff3a0', fl ? 0.8 : 0.5); for (let i = 0; i < 8; i++) { const an = PI + (i + 0.5) * PI / 8; g.line([500 + Math.cos(an) * 90, 30 + Math.sin(an) * 90, 500 + Math.cos(an) * 150, 30 + Math.sin(an) * 150], '#fff3a0', 8); } }
    g.path('M440 50 Q440 -20 500 -20 Q560 -20 560 50 Z', lamp ? '#fff07a' : '#8a6aa8'); g.rr(420, 44, 160, 24, 10, '#2b2f45');
  }
}
function bigButton(g, s, v) {
  const { x, y, rx, ry } = BT, a = s.k ? s.age : 9, press = s.k && a < 0.22 ? 1 - E.outQ(clamp((a - 0.12) / 0.1)) : 0, h = Math.round(74 - 46 * press);
  g.shadow(x, y + 70, rx + 30, 26, 0.3);
  const base = `M${x - rx} ${y} L${x - rx} ${y + 50} A${rx} ${ry} 0 0 0 ${x + rx} ${y + 50} L${x + rx} ${y} Z`;
  g.path(base, '#2b2f45'); if (v.k === 'rocket') g.clipPath(base, () => { for (let i = -6; i < 7; i++) g.poly([x + i * 60, y - 10, x + i * 60 + 30, y - 10, x + i * 60 - 10, y + 120, x + i * 60 - 40, y + 120], C.yellow, 0); }); g.path(base, null);
  g.ell(x, y, rx, ry, v.k === 'rocket' ? '#3a3f55' : '#d0d6e2');
  const col = v.k === 'rocket' ? '#ff3b3b' : '#ff4fa3', bx = rx * 0.74, by = ry * 0.74;
  const dome = `M${x - bx} ${y} L${x - bx} ${y - h} A${bx} ${by} 0 0 1 ${x + bx} ${y - h} L${x + bx} ${y} A${bx} ${by} 0 0 1 ${x - bx} ${y} Z`;
  g.path(dome, sh(col, -0.15)); g.ell(x, y - h, bx, by, col); g.hl(x - 50, y - h - 10, 40, 12, -0.15, 0.6);
  if (s.k && a < 0.5) g.glow(x, y - h, 260, col, 0.5 * (1 - a / 0.5));
}
function palms2(g, s) {
  const p = s.p, sc = lerp(1.04, 1.14, p);
  for (const sd of ['L', 'R']) { const sg = sgn(sd); g.arm(lerp(BT.x + sg * 78, BT.x + sg * 215, p), lerp(BT.y - 58, 500, p), -PI / 2 - sg * lerp(0.3, 0.12, p), { hand: 'palm', side: sd, s: sc }); }
}

/* ---------- 力だめし（両手のかけや） ---------- */
const STRIKER = [{ k: 'tower', name: '力だめし', short: '力だめし', theme: 'festival' }];
const TW = { x: 500, top: 130, bot: 720 };
function towerScene(g, s) {
  const V = g.V;
  g.bg('#14123a', '#3a1f5e');
  { const c = g.ctx; c.beginPath(); for (let i = 0; i < 16; i++) { const x = V.x0 + ((i * 331) % Math.max(1, V.x1 - V.x0)), y = -400 + ((i * 197) % 700), r = 3 + i % 3; c.moveTo(x + r, y); c.arc(x, y, r, 0, PI * 2); } c.fillStyle = '#fff8d6'; c.fill(); }
  for (const [x0, x1] of [[V.x0 - 40, 380], [620, V.x1 + 40]]) { g.path(`M${x0} 120 Q${(x0 + x1) / 2} 220 ${x1} 120`, null, 4); for (let x = x0 + 70; x < x1 - 30; x += 110) { const u = (x - x0) / (x1 - x0), y = 120 + 100 * 2 * u * (1 - u); g.glow(x, y + 40, 80, '#ff9b6b', 0.4); g.ell(x, y + 40, 32, 38, '#e8402f'); g.rr(x - 18, y, 36, 10, 4, C.ol, 0); } }
  for (const [x, c] of [[110, '#e8402f'], [890, '#3a86ff'], [-230, '#3cc46b'], [1230, '#ff9f1c']]) { g.rect(x - 120, 430, 240, 260, '#2a1f4e', 0); g.path(`M${x - 140} 440 L${x - 120} 380 L${x + 120} 380 L${x + 140} 440 Z`, c, 0); const cx = g.ctx; cx.beginPath(); for (let i = -2; i <= 2; i++) cx.rect(x + i * 50 - 12, 380, 24, 60); cx.fillStyle = '#ffffff'; cx.fill(); g.rect(x - 100, 470, 200, 70, '#ffd36b', 0); }
  g.band(700, 'bottom', '#3b2e5e', 6);
}
function tower(g, s) {
  const { x, top, bot } = TW, a1 = ageOf(s, 1), a2 = ageOf(s, 2);
  let py = bot - 50, lit = 0;
  if (a2 >= 0) { const q = clamp(a2 / 0.16); py = lerp(lerp(bot - 50, top + 40, 0.5), top + 40, E.outQ(q)); lit = 10; }
  else if (a1 >= 0) { const up = 0.22, hold = 0.12; py = a1 < up ? lerp(bot - 50, 420, E.outQ(a1 / up)) : a1 < up + hold ? 420 : Math.min(bot - 50, 420 + 1600 * Math.pow(a1 - up - hold, 2)); lit = 5; }
  g.rr(x - 70, bot - 10, 140, 60, 12, '#5a3a22');
  g.rr(x - 50, top, 100, bot - top, 14, '#f6efe0');
  for (let i = 0; i < 10; i++) { const y = bot - 40 - i * ((bot - top - 60) / 10), on = i < lit && (lit < 10 || Math.floor(s.t * 8 + i) % 2); g.rr(x - 40, y - 46, 80, 40, 8, on ? RAIN[7 - Math.floor(i * 0.8)] : '#d8d0c0', 0); }
  g.rr(x - 50, top, 100, bot - top, 14, null);
  g.line([x, top + 20, x, bot - 10], '#8a5a36', 8);
  g.rr(x - 40, py - 22, 80, 44, 12, '#ff3b3b'); g.rr(x - 40, py - 22, 80, 14, 8, '#ff8a8a', 0);
  const ring = a2 >= 0.16 ? jig(a2 - 0.16, 0.3, 30, 4) : 0;
  g.at(x, top - 10, ring, 1, 1, () => { g.glow(0, -20, 140, '#ffe27a', a2 >= 0.16 ? 0.7 : 0.25); g.path('M-56 10 Q-56 -70 0 -76 Q56 -70 56 10 Z', C.gold); g.rr(-64, 0, 128, 20, 8, '#e0a52a'); g.circ(0, 26, 12, '#e0a52a'); g.hl(-24, -40, 10, 20, -0.4, 0.6); });
  g.rr(x - 80, bot + 20, 160, 26, 12, '#2b2f45');
}

/* ---------- テントのくい打ち（両手のかけや） ---------- */
const KUI = [{ k: 'tent', name: 'テントのくい打ち', short: 'くい打ち', theme: 'nature' }];
const STK = { x: 600, ground: 760 };
function kuiTop(s) {
  const a = s.k ? s.age : 0, tops = [560, 650, 730], prev = tops[Math.min(2, Math.max(0, s.k - 1))], cur = tops[Math.min(2, s.k)];
  return s.k ? lerp(prev, cur, E.outQ(clamp(a / 0.08))) : cur;
}
function kuiScene(g, s) {
  const V = g.V, a2 = ageOf(s, 2), taut = Math.round((s.k === 0 ? 0 : s.k === 1 ? 0.45 * E.outBack(clamp(s.age / 0.3)) : 0.45 + 0.55 * E.outBack(clamp(a2 / 0.3))) * 50) / 50;
  g.sky('#ffb37a', '#ffe9c2', 560); g.sun(800, 300, 80, '#fff1a8');
  g.hills(470, '#7c86c2', 90, 5, 3); g.hills(530, '#6a9e6a', 60, 8, 5);
  for (let x = Math.floor((V.x0 - 60) / 110) * 110, i = 0; x < V.x1 + 110; x += 110, i++) if (x < 40 || x > 940) { g.tri(x - 56, 560, x + 56, 560, x, 380 - (i % 2) * 40, '#2f7a4c', 0); }
  g.band(540, 'bottom', '#7cc36a', 6); g.grassTufts(620, '#68b356', 6, 8);
  // テント（くいを打つとピンと立つ）
  const px = lerp(250, 330, taut), py = lerp(470, 230, taut), lean = (1 - taut);
  g.shadow(330, 612, 230, 18, 0.2);
  g.path(`M110 610 Q${lerp(160, 210, taut)} ${lerp(560, 420, taut)} ${px} ${py} Q${lerp(420, 450, taut)} ${lerp(520, 420, taut)} 540 610 Z`, '#ff8a3d');
  g.path(`M${px} ${py} L${px - 26 + 26 * taut} 610 L${px + 40 - 10 * taut} 610 Z`, '#8a3a14', 0);
  if (lean > 0.2) for (const [x1, y1, x2, y2] of [[180, 560, 220, 520], [420, 560, 460, 540], [380, 520, 420, 500]]) g.curve([x1, y1, (x1 + x2) / 2, (y1 + y2) / 2 + 14 * lean, x2, y2], '#c95a1f', 5);
  g.line([px, py, px, py - 100 * taut], C.ol, 6);
  if (taut > 0.6) g.at(px, py - 100 * taut, Math.sin(s.t * 8) * 0.12, 1, 1, () => g.path('M0 0 L84 16 L0 42 Z', C.yellow));
  // ロープ（テントの上 → くいの頭）
  const ty = kuiTop(s), rx = STK.x - 20, ry = ty + 26, sag = lerp(120, 0, taut);
  const rp = [px, py + 6, (px + rx) / 2, (py + ry) / 2 + sag, rx, ry];
  g.curve(rp, C.ol, 12); g.curve(rp, '#fff3d6', 6);
}
function stake(g, s) {
  const ty = kuiTop(s), { x, ground } = STK;
  g.ell(x, ground, 90, 24, '#5f9e4f', 0);
  g.rect(x - 34, ty, 68, ground - ty, '#d9a066'); g.rect(x + 8, ty, 18, ground - ty, '#c48848', 0); g.rect(x - 34, ty, 68, ground - ty, null);
  g.ell(x, ty, 34, 12, '#f0c48a'); g.ring(x, ty, 16, '#c48848', 3);
  g.path(`M${x - 90} ${ground} A90 24 0 0 0 ${x + 90} ${ground} L${x + 60} ${ground + 10} L${x - 60} ${ground + 10} Z`, '#4e8a42', 0);
}

function logPart(g, x0, x1) {
  const L = LG.x - LG.rx, R = LG.x + LG.rx, d = `M${L} ${LG.top} L${L} ${LG.bot} A${LG.rx} ${LG.ry} 0 0 0 ${R} ${LG.bot} L${R} ${LG.top} Z`;
  g.clipRR(x0, LG.top - 60, x1 - x0, LG.bot - LG.top + 120, 0, () => {
    g.path(d, '#9a6236');
    g.clipPath(d, () => { for (const xx of [-80, -30, 26, 74]) g.line([LG.x + xx, LG.top + 20, LG.x + xx + 6, LG.bot + 30], '#7c4a26', 6); g.rect(LG.x + 50, LG.top, 50, 300, 'rgba(255,255,255,0.1)', 0); });
    g.path(d, null);
    g.ell(LG.x, LG.top, LG.rx, LG.ry, '#f0c98f');
    for (const k of [0.68, 0.4]) g.ell(LG.x, LG.top, LG.rx * k, LG.ry * k, null, 4);
  });
}

export default [
  {
    id: 'hit-drum', acts: ['hit'], modes: ['one', 'alt', 'both'], sfx: v => v.k === 'tom' ? 'drum' : 'taiko', vars: DRUMS,
    draw(g, s, v) {
      const V = g.V;
      g.bg(v.bg1, v.bg2);
      if (v.lantern) {
        g.band(820, 'bottom', '#3a2a55');
        for (let row = 0; row < 2; row++) {
          const y0 = row ? -220 : 110; if (y0 < V.y0 - 40) continue;
          g.curve([V.x0 - 40, y0, 500, y0 + 60, V.x1 + 40, y0], '#2b2140', 5);
          for (let x = Math.ceil((V.x0 - 40) / 160) * 160 + (row ? 80 : 0); x < V.x1 + 40; x += 160) {
            const t = (x - V.x0) / (V.x1 - V.x0), y = y0 + 60 * 4 * t * (1 - t) * 0.9 + 18, sw = Math.sin(s.beat * Math.PI + x) * 0.06;
            g.at(x, y, sw, 1, 1, () => { g.glow(0, 38, 90, '#ff9b6b', 0.35); g.rr(-20, 0, 40, 12, 4, C.ol, 0); g.ell(0, 40, 36, 32, '#e8402f'); for (const yy of [26, 40, 54]) g.line([-30, yy, 30, yy], '#b8261c', 3); g.rr(-20, 68, 40, 12, 4, C.ol, 0); });
          }
        }
      } else {
        g.band(840, 'bottom', '#1c1640');
        for (const sx of [180, 820]) g.alpha(0.18 + 0.08 * Math.sin(s.beat * Math.PI), () => g.poly([sx - 40, V.y0, sx + 40, V.y0, sx + 260 * (sx < 500 ? 1 : -1) + 120, 900, sx + 260 * (sx < 500 ? 1 : -1) - 120, 900], '#bfe3ff', 0));
      }
      g.shadow(FX, FY + 262, RX + 40, 30, 0.35);
      if (v.lantern) { g.line([FX - 210, FY + 140, FX - 280, FY + 330], '#5a3a22', 22); g.line([FX + 210, FY + 140, FX + 280, FY + 330], '#5a3a22', 22); }
      else { g.line([FX - 150, FY + 240, FX - 200, FY + 330], C.steel, 14); g.line([FX + 150, FY + 240, FX + 200, FY + 330], C.steel, 14); }
      const b = 1 + 0.03 * Math.exp(-14 * (s.age || 9));
      drum(g, v, b);
      sticks(g, s);
    },
    hit(g, s, k, v) {
      const sides = s.mode === 'both' ? ['L', 'R'] : [s.lastSide];
      for (const sd of sides) { const [x, y] = tipOf(sd === 'L' ? -1 : 1, 0); g.fx.ring(x, y + 10, { c: '#ffffff', r0: 20, r1: 210, w: 14, sy: RY / RX }); }
      g.fx.pop(k === 2 ? 'ドドン！' : 'ドン', 500, 250, { size: k === 2 ? 130 : 110, c: v.lantern ? '#ffe08a' : '#ffffff' });
      g.fx.shake(k === 2 ? 12 : 8, 0.14);
      if (!v.lantern) g.fx.notes(500, 400, 4);
    },
  },
  /* ---------- もぐらたたき（交互） ---------- */
  {
    id: 'hit2-mole', acts: ['hit'], modes: ['alt'], sfx: 'squeak', vars: MOLES,
    draw(g, s, v) {
      const V = g.V;
      moleBg(g, s, v);
      const n1 = sideOf(s, 1), top = {};
      for (const sd of ['L', 'R']) {
        const x = HOLE[sd], n = sd === n1 ? 1 : 2, a = ageOf(s, n);
        let up = n === 1 ? E.outBack(clamp((s.ph + 0.46) / 0.24)) : E.outBack(clamp((s.ph - 0.16) / 0.26));
        if (n === 1 && a >= 0) { const a2 = ageOf(s, 2); up = a2 > 0.25 ? E.outBack(clamp((a2 - 0.25) / 0.26)) : 1 - E.inQ(clamp((a - 0.42) / 0.22)); }
        const [sx, sy] = a >= 0 ? squash(a, 0.3) : [1, 1], dy = (1 - up) * 290;
        top[sd] = HY + dy - v.top * sy;
        holeBack(g, v, x);
        if (up > 0.01) {
          g.clipRR(x - 240, V.y0 - 10, 480, HY - V.y0 + 10, 0, () => g.at(x, HY + dy, 0, sx, sy, () => creature(g, s, v, a >= 0, s.t + n)));
          if (a >= 0 && up > 0.7) dizzyStars(g, x, top[sd] + 6, s.t + n);
        }
        holeFront(g, v, x);
      }
      for (const sd of ['L', 'R']) {
        const x = HOLE[sd], sg = sgn(sd), p = handP(s, sd);
        const r0 = sg * 0.36, tx = x + sg * 14, ty = Math.min(top[sd], HY - v.top) + 6;
        const ax = lerp(tx + 92 * Math.sin(r0), x + sg * 70, p), ay = lerp(ty - 92 * Math.cos(r0), 150, p);
        const gx = lerp(x + sg * 200, x + sg * 228, p), gy = lerp(660, 455, p);
        toyHammer(g, ax, ay, r0 + sg * 0.45 * p, 1 + 0.12 * p, v.h1, v.h2);
        const d = Math.hypot(ax - gx, ay - gy), ux = (ax - gx) / d, uy = (ay - gy) / d;
        g.taper(gx - ux * 46, gy - uy * 46, ax, ay, 15, 12, '#ffe08a');
        g.circ(ax, ay, 15, v.h2);
        gripArm(g, sd, gx, gy, ax, ay);
      }
    },
    hit(g, s, k, v) {
      const x = HOLE[s.lastSide], y = HY - v.top;
      g.fx.ring(x, y + 14, { c: '#ffffff', r0: 20, r1: 170, w: 12, sy: 0.45 });
      g.fx.burst(x, y + 10, { n: 8, c: [C.yellow, '#ffffff'], shape: 'star', sp: [250, 520], size: [12, 22], g: 700, life: [0.4, 0.7], spread: PI * 1.2 });
      if (v.k === 'tako') g.fx.burst(x, y + 150, { n: 14, c: ['#2b2140', '#4a3b70'], shape: 'drop', sp: [300, 800], size: [12, 22], g: 1600, spread: 1.4 });
      if (v.k === 'ghost') g.fx.smoke(x, y + 80, 6, '#ece6ff');
      g.fx.pop(k === 2 ? v.w2 : v.w1, 500 + (x < 500 ? -30 : 30), 285, { size: k === 2 ? 110 : 96, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 12 : 8, 0.14);
      if (k === 2) { g.fx.confetti(60); g.sfx('cheer'); }
    },
  },
  /* ---------- ボンゴ・鍋・ドラム缶・バケツ（交互・両手） ---------- */
  {
    id: 'hit2-perc', acts: ['hit'], modes: ['alt', 'both'], sfx: (k, v) => v.snd, vars: PERC,
    draw(g, s, v) {
      percBack(g, s, v);
      for (const sd of ['L', 'R']) percTarget(g, s, v, sd, sideAge(s, sd));
      for (const sd of ['L', 'R']) percTool(g, s, v, sd);
    },
    hit(g, s, k, v) {
      const sides = s.mode === 'both' ? ['L', 'R'] : [s.lastSide];
      for (const sd of sides) { const [x, y, rx, ry] = v.D[sd]; g.fx.ring(x, y, { c: '#ffffff', r0: 20, r1: rx * 1.6, w: 12, sy: ry / rx }); if (v.k === 'bongo') g.fx.notes(x, y - 60, 3); else g.fx.sparks(x, y, 6, ['#ffffff', C.yellow]); }
      const both = s.mode === 'both', hx = both || k === 2 ? 500 : v.D[s.lastSide][0];
      const PY = { bongo: both ? 470 : 440, pots: 140, cans: 380, bucket: both ? 400 : 430 }[v.k];
      g.fx.pop(k === 2 ? v.w2 : v.w1, hx, PY, { size: k === 2 ? 110 : 92, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 11 : 7, 0.13);
      if (k === 2) {
        if (v.k === 'bongo') { g.fx.notes(500, 220, 7); g.fx.confetti(50); }
        else if (v.k === 'pots') { g.sfx('meow'); g.fx.pop('ニャッ！', 690, 300, { size: 84, c: '#ffffff', rot: 0.15 }); g.fx.burst(500, 330, { n: 10, c: ['#ff9f45', '#ffd2a0'], shape: 'leaf', sp: [200, 500], size: [12, 20], g: 400, drag: 0.95, life: [0.6, 1] }); }
        else if (v.k === 'cans') { g.fx.confetti(70); g.sfx('cheer'); }
        else { g.fx.burst(500, 420, { n: 16, c: ['#ffffff', '#c9cfdc', '#aeb5c6'], shape: 'leaf', sp: [200, 600], size: [14, 24], g: 300, drag: 0.95, life: [0.7, 1.2], spread: PI * 2 }); g.fx.stars(500, 300, 6); }
      }
    },
  },
  /* ---------- キーを打つ（交互） ---------- */
  {
    id: 'hit2-keys', acts: ['hit'], modes: ['alt'], vars: KEYS,
    sfx: (k, v) => v.k === 'pc' ? 'click' : v.k === 'piano' ? 'piano' : (k === 1 ? 'beep' : 'bell'),
    init(s) { s.my.fly = []; },
    draw(g, s, v) {
      keysScene(g, s, v);
      const press = new Set();
      for (const sd of ['L', 'R']) { const a = sideAge(s, sd); if (a >= 0 && a < 0.18) { const [c, r] = v.T[sd]; if (v.k === 'piano') { press.add(c - 1); press.add(c); press.add(c + 1); } else press.add(r * 100 + c); } }
      keyboard(g, s, v, press);
      for (const f of s.my.fly) {
        const q = (s.t - f.t) / 0.5; if (q < 0 || q > 1) continue;
        const x = lerp(f.x, f.tx, E.outQ(q)), y = lerp(f.y, 330, E.outQ(q)) - 50 * Math.sin(PI * q), sz = lerp(70, 100, Math.sin(PI * q));
        g.alpha(q > 0.6 ? (1 - q) / 0.4 : 1, () => g.text(f.ch, x, y, { size: sz, f: f.c, o: 12 }));
      }
      keysHands(g, s, v);
    },
    hit(g, s, k, v) {
      const sd = s.lastSide, [x, y] = keyPt(v, sd);
      g.fx.shake(k === 2 ? 9 : 5, 0.12);
      if (v.k === 'pc') {
        s.my.fly.push({ t: s.t, x, y, tx: k === 1 ? 380 : 620, ch: k === 1 ? 'カ' : 'タ', c: k === 1 ? '#ff9fbd' : '#9cf2d8' });
        g.fx.burst(x, y, { n: 6, c: ['#ffffff', '#cfe3ff'], shape: 'square', sp: [200, 420], size: [10, 18], g: 900, spread: PI });
        g.fx.pop(k === 2 ? 'カタッ！' : 'カタ', sd === 'L' ? 240 : 760, 560, { size: 76 });
        if (k === 2) { g.fx.stars(500, 260, 10); g.fx.confetti(50); }
      } else if (v.k === 'piano') {
        g.fx.notes(x, y - 120, 4);
        g.fx.pop(k === 2 ? 'ジャーン！' : 'ポロン', k === 2 ? 500 : sd === 'L' ? 230 : 770, k === 2 ? 220 : 250, { size: k === 2 ? 100 : 80, c: k === 2 ? C.yellow : '#ffffff' });
        if (k === 2) { g.fx.hearts(835, 160, 6); g.fx.notes(500, 400, 8); }
      } else {
        g.fx.pop(k === 2 ? 'チーン！' : 'ピッ', k === 2 ? 500 : sd === 'L' ? 190 : 810, k === 2 ? 150 : 420, { size: k === 2 ? 100 : 84, c: k === 2 ? C.yellow : '#ffffff' });
        if (k === 2) { g.sfx('coin'); g.fx.coins(500, 800, 14); g.fx.stars(500, 300, 8); }
      }
    },
  },
  /* ---------- 木琴・コップ（交互） ---------- */
  {
    id: 'hit2-xylo', acts: ['hit'], modes: ['alt'], sfx: 'xylo', vars: XYLO,
    draw(g, s, v) {
      xyloScene(g, s, v);
      for (const sd of ['L', 'R']) xyloMallet(g, s, v, sd);
    },
    hit(g, s, k, v) {
      const [x, y] = xyloPt(v, s.lastSide), i = v.T[s.lastSide];
      g.fx.ring(x, y + 20, { c: '#ffffff', r0: 20, r1: 150, w: 10, sy: 0.5 });
      g.fx.notes(x, y - 60, 3, [v.k === 'xylo' ? RAIN[i] : GL(i).c, '#ffffff']);
      g.fx.pop(k === 2 ? 'ポロロン！' : v.k === 'xylo' ? 'ポン' : 'チン', k === 2 ? 500 : x < 500 ? 250 : 750, v.k === 'xylo' ? 430 : 400, { size: k === 2 ? 96 : 84, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 8 : 5, 0.12);
      if (k === 2) { g.fx.stars(500, 260, 10); if (v.k === 'glass') g.fx.burst(500, 520, { n: 26, c: RAIN, shape: 'star', sp: [300, 700], size: [14, 24], g: 600, life: [0.6, 1] }); }
    },
  },
  /* ---------- 肩たたき（交互・両手） ---------- */
  {
    id: 'hit2-kata', acts: ['hit'], modes: ['alt', 'both'], sfx: 'knock', vars: KATA,
    draw(g, s, v) {
      kataScene(g, s, v);
      person(g, s, v);
      kataFists(g, s, v);
    },
    hit(g, s, k, v) {
      const sides = s.mode === 'both' ? ['L', 'R'] : [s.lastSide];
      for (const sd of sides) { const [x, y] = SH[sd]; g.fx.burst(x, y - 60, { n: 6, c: [C.yellow, '#ffffff'], shape: 'star', sp: [200, 420], size: [12, 20], g: 500, life: [0.4, 0.7] }); g.fx.lines(x, y - 20, { n: 6, r0: 70, r1: 140, w: 8, a0: -PI * 0.9, arc: PI * 0.8 }); }
      const both = s.mode === 'both';
      g.fx.pop(k === 2 ? 'トントン♪' : 'トン', k === 2 || both ? 500 : s.lastSide === 'L' ? 190 : 810, k === 2 ? 290 : both ? 270 : 420, { size: k === 2 ? 92 : 90, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.hearts(500, 330, k === 2 ? 6 : 2);
      g.fx.shake(k === 2 ? 7 : 5, 0.12);
      if (k === 2) { g.fx.pop('ごくらく〜', 500, 150, { size: 76, c: '#ff8fb0', life: 1 }); g.sfx('chime'); }
    },
  },
  /* ---------- ふとん・じゅうたん（交互・両手） ---------- */
  {
    id: 'hit2-futon', acts: ['hit'], modes: ['alt', 'both'], sfx: 'smack', vars: FUTON,
    draw(g, s, v) {
      futonScene(g, s, v);
      futonBody(g, s, v);
      beaters(g, s, v);
    },
    hit(g, s, k, v) {
      const sides = s.mode === 'both' ? ['L', 'R'] : [s.lastSide];
      for (const sd of sides) { const [x, y] = v.T[sd]; g.fx.smoke(x, y, 7, '#b5aa9c'); g.fx.burst(x, y, { n: 8, c: ['#a89c8e', '#cfc6ba'], shape: 'dot', sp: [200, 520], size: [8, 16], g: 300, drag: 0.94 }); }
      g.fx.pop(k === 2 ? 'ふかふか！' : 'パン', s.mode === 'both' || k === 2 ? 500 : s.lastSide === 'L' ? 300 : 700, k === 2 ? 200 : 210, { size: k === 2 ? 100 : 90, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 9 : 6, 0.12);
      if (k === 2) { g.fx.stars(500, 500, 10); if (v.k === 'rug') { g.sfx('boing'); g.fx.pop('クシュン！', 770, 500, { size: 64, c: '#ffffff' }); } else g.sfx('chime'); }
    },
  },
  /* ---------- スイカ割り・ピニャータ（両手） ---------- */
  {
    id: 'hit2-suika', acts: ['hit'], modes: ['both'], vars: SUIKA, sfx: (k, v) => v.k === 'suika' ? (k === 1 ? 'thud' : 'squish') : (k === 1 ? 'thud' : 'pop'),
    draw(g, s, v) {
      const a1 = ageOf(s, 1), a2 = ageOf(s, 2);
      suikaScene(g, s, v);
      if (v.k === 'suika') {
        if (a2 < 0) { g.at(MEL.x, MEL.y + MEL.ry, jig(a1, 0.04, 26, 8), 1, 1, () => g.at(-MEL.x, -MEL.y - MEL.ry, () => melon(g))); if (a1 >= 0) g.line([500, 492, 486, 540, 512, 590, 492, 630], C.ol, 7); }
        else { const t = clamp(a2 / 0.35), e = E.outBack(t, 1.4); for (const H of MEL_H) g.at(H.piv[0] + H.sd * 60 * E.outQ(t), H.piv[1], H.sd * 0.55 * e, 1, 1, () => g.at(-H.piv[0], -H.piv[1], () => { g.clipPath(H.d, () => melon(g)); melonHalfFace(g, H.sd); })); }
      } else {
        const sw = jig(a1, 0.22, 9, 3) + jig(a2, 0.1, 9, 3);
        g.line([500, g.V.y0 - 10, 500, STAR_C[1] - STAR_R], C.ol, 6);
        if (a2 < 0) { g.at(500, STAR_C[1] - STAR_R, sw, 1, 1, () => g.at(-500, -(STAR_C[1] - STAR_R), () => { pinata(g, s); if (a1 >= 0) { g.line([512, 404, 490, 450, 520, 490], C.ol, 6); g.line([490, 450, 450, 470], C.ol, 5); } })); }
        else { shards(g, PIN_SH, a2, () => pinata(g, s, true), 1200); }
      }
      const P = pose2(s.p, v.T, { hd: 0, e0: [660, 1010], e1: [690, 770], a1: -PI / 2 + 0.12, rot: 0 });
      handle(g, P, 20, 15, v.k === 'suika' ? '#e8c07a' : '#ffd23f', 60); g.circ(P.ax, P.ay, 15, v.k === 'suika' ? '#e8c07a' : '#ffd23f');
      if (v.k === 'pinata') { const ux = Math.cos(P.a), uy = Math.sin(P.a); for (let i = 1; i < 6; i++) g.line([P.ex + ux * i * 90 - uy * 18, P.ey + uy * i * 90 + ux * 18, P.ex + ux * (i * 90 + 30) + uy * 18, P.ey + uy * (i * 90 + 30) - ux * 18], '#ff5aa8', 7); }
      arms2(g, P, { d1: 70, d2: 170, kl: 0.38 });
    },
    hit(g, s, k, v) {
      const [x, y] = v.T;
      g.fx.lines(x, y, { n: 10, r0: 80, r1: 190, w: 10 }); g.fx.shake(k === 2 ? 12 : 7, 0.14);
      if (v.k === 'suika') {
        if (k === 1) { g.fx.pop('ポコッ', 290, 340, { size: 92 }); g.fx.burst(x, y, { n: 6, c: ['#3cb45a', '#1f7a3c'], shape: 'chip', sp: [200, 500], size: [10, 18] }); }
        else { g.fx.pop('パッカーン！', 500, 250, { size: 110, c: C.yellow }); g.fx.splash(500, 600, '#ff4d5a', 22); g.fx.burst(500, 600, { n: 10, c: [C.ink], shape: 'drop', sp: [300, 700], size: [8, 12], g: 1800 }); g.fx.stars(500, 520, 8); g.sfx('cheer'); }
      } else {
        if (k === 1) { g.fx.pop('ポコッ', 270, 330, { size: 92 }); g.fx.burst(500, 560, { n: 5, c: RAIN, shape: 'square', sp: [150, 400], size: [14, 22], g: 1400, dir: PI / 2, spread: 1.5 }); }
        else { g.fx.pop('パーン！', 500, 230, { size: 120, c: C.yellow }); g.fx.burst(500, 500, { n: 20, c: RAIN, shape: 'square', sp: [300, 900], size: [16, 28], g: 1300 }); g.fx.burst(500, 500, { n: 8, c: [C.red, C.yellow, '#ffffff'], shape: 'dot', sp: [300, 800], size: [18, 26], g: 1500 }); g.fx.confetti(44); g.sfx('cheer'); }
      }
    },
  },
  /* ---------- 巨大ボタン（両手） ---------- */
  {
    id: 'hit2-button', acts: ['hit'], modes: ['both'], vars: BTN, sfx: (k, v) => v.k === 'rocket' ? (k === 1 ? 'click' : 'rocket') : (k === 1 ? 'beep' : 'ding'),
    draw(g, s, v) {
      btnScene(g, s, v);
      bigButton(g, s, v);
      palms2(g, s);
    },
    hit(g, s, k, v) {
      g.fx.ring(BT.x, BT.y - 30, { c: '#ffffff', r0: 40, r1: 300, w: 14, sy: 0.4 }); g.fx.shake(k === 2 ? 12 : 7, 0.15);
      if (v.k === 'rocket') {
        if (k === 1) { g.sfx('engine'); g.fx.pop('点火！', 500, 470, { size: 84, c: C.orange }); }
        else { g.fx.pop('発射！', 500, 470, { size: 110, c: C.yellow }); g.fx.burst(500, 120, { n: 18, c: [C.yellow, C.orange, '#ffffff'], shape: 'star', sp: [300, 700], size: [16, 28], g: 400 }); g.fx.flash('#fff3c0', 0.35, 0.2); }
      } else {
        if (k === 1) g.fx.pop('ピンポン', 500, 470, { size: 84, c: '#fff3a0' });
        else { g.fx.pop('正解！', 500, 450, { size: 110, c: C.yellow }); g.fx.confetti(80); g.sfx('cheer'); }
      }
    },
  },
  /* ---------- 力だめし（両手） ---------- */
  {
    id: 'hit2-striker', acts: ['hit'], modes: ['both'], vars: STRIKER, sfx: 'wood',
    init(s) { s.my.bell = 0; },
    draw(g, s, v) {
      towerScene(g, s);
      tower(g, s);
      const a2 = ageOf(s, 2);
      if (a2 >= 0.16 && !s.my.bell) { s.my.bell = 1; g.sfx('bell'); g.fx.ring(TW.x, TW.top - 30, { c: C.gold, r0: 40, r1: 260, w: 16 }); g.fx.pop('カーン！', 500, 260, { size: 110, c: C.yellow }); g.fx.confetti(70); g.fx.stars(TW.x, TW.top, 10); }
      const P = pose2(s.p, [TW.x, TW.bot + 22], { hd: HD.kakeya, e0: [700, 1080], e1: [700, 800], a1: -PI / 2 + 0.14, rot: 0.5 });
      handle(g, P, 20, 17, '#d9a066');
      bigHead(g, 'kakeya', P.ax, P.ay, P.rot, P.hs);
      arms2(g, P, { d1: 75, d2: 185, kl: 0.38 });
    },
    hit(g, s, k) {
      g.fx.lines(TW.x, TW.bot + 22, { n: 10, r0: 90, r1: 190, w: 10, a0: PI, arc: PI });
      g.fx.shake(k === 2 ? 12 : 8, 0.14);
      if (k === 1) g.fx.pop('もう少し！', 250, 470, { size: 72, c: '#ffffff', rot: -0.12 }); else g.fx.pop('ドーン', 250, 600, { size: 90, c: '#ffffff' });
    },
  },
  /* ---------- テントのくい打ち（両手） ---------- */
  {
    id: 'hit2-kui', acts: ['hit'], modes: ['both'], vars: KUI, sfx: 'wood',
    draw(g, s, v) {
      kuiScene(g, s);
      stake(g, s);
      const P = pose2(s.p, [STK.x, kuiTop(s) + 4], { hd: HD.kakeya, e0: [780, 1060], e1: [760, 790], a1: -PI / 2 + 0.14, rot: 0.5 });
      handle(g, P, 20, 17, '#d9a066');
      bigHead(g, 'kakeya', P.ax, P.ay, P.rot, P.hs);
      arms2(g, P, { d1: 75, d2: 185, kl: 0.38 });
    },
    hit(g, s, k) {
      g.fx.chips(STK.x, kuiTop(s), '#f0c48a', 8); g.fx.lines(STK.x, kuiTop(s), { n: 10, r0: 80, r1: 180, w: 10 });
      g.fx.shake(k === 2 ? 11 : 7, 0.14);
      g.fx.pop(k === 2 ? 'ピーン！' : 'ドン', k === 2 ? 420 : 800, k === 2 ? 130 : 420, { size: k === 2 ? 110 : 92, c: k === 2 ? C.yellow : '#ffffff' });
      if (k === 2) { g.fx.stars(330, 260, 10); g.sfx('chime'); }
    },
  },
  /* ---------- 岩・氷・貯金箱を割る（両手） ---------- */
  {
    id: 'hit2-crack', acts: ['hit'], modes: ['both'], vars: CRACK,
    sfx: (k, v) => v.k === 'rock' ? (k === 1 ? 'clang' : 'break') : v.k === 'ice' ? (k === 1 ? 'crack' : 'glass') : (k === 1 ? 'knock' : 'break'),
    draw(g, s, v) {
      crackScene(g, s, v);
      crackTarget(g, s, v, ageOf(s, 1), ageOf(s, 2));
      const P = pose2(s.p, [v.T[0], v.T[1] + (s.k ? 6 : 0)], { hd: HD[v.tool], rot0: v.tool === 'pick' ? 0.62 : 0, e0: [690, 1010], e1: [690, 770], a1: -PI / 2 + 0.12, rot: 0.5 });
      handle(g, P, 18, 15, v.tool === 'mallet' ? C.wood : '#c98b52');
      bigHead(g, v.tool, P.ax, P.ay, P.rot, P.hs);
      arms2(g, P, { d1: 75, d2: 180, kl: 0.38 });
    },
    hit(g, s, k, v) {
      const [x, y] = v.T;
      g.fx.lines(x, y, { n: 10, r0: 90, r1: 200, w: 10 });
      g.fx.shake(k === 2 ? 13 : 8, 0.15);
      g.fx.pop(k === 2 ? v.w2 : v.w1, k === 2 ? 500 : 290, k === 2 ? 250 : 330, { size: k === 2 ? 116 : 92, c: k === 2 ? C.yellow : '#ffffff' });
      if (v.k === 'rock') { g.fx.chips(x, y, '#9a96ae', k === 2 ? 14 : 9); g.fx.sparks(x, y, 10); if (k === 2) { g.sfx('magic'); g.fx.stars(500, 520, 12, ['#ffffff', '#9cf2ff', C.gold]); g.fx.pop('キラーン', 500, 380, { size: 80, c: '#9cf2ff' }); } }
      else if (v.k === 'ice') { g.fx.burst(x, y, { n: k === 2 ? 22 : 10, c: ['#ffffff', '#cdefff'], shape: 'chip', sp: [300, 800], size: [12, 26], g: 1600, spread: PI * 1.4 }); if (k === 2) g.fx.stars(420, 470, 8); }
      else { if (k === 1) g.fx.coins(500, 450, 3); else { g.sfx('coin'); g.fx.coins(500, 560, 14); g.fx.stars(500, 600, 6); } }
    },
  },
  /* ---------- 餅つき（両手） ---------- */
  {
    id: 'hit2-mochi', acts: ['hit'], modes: ['both'], sfx: 'mochi', vars: MOCHI,
    draw(g, s, v) {
      const V = g.V, a1 = ageOf(s, 1), a2 = ageOf(s, 2);
      mochiScene(g, s, v);
      const reach = s.k === 1 ? Math.sin(PI * clamp((s.u - 0.22) / 0.38)) : 0;
      if (v.k === 'moon') rabbit(g, 150, 610, s, reach, s.k >= 2 && a2 > 0.1);
      usuBody(g);
      mochiBlob(g, s, a1, a2);
      if (reach > 0.02) {
        if (v.k === 'moon') { g.cap(190, 630, lerp(200, 400, reach), lerp(640, 600, reach), 20, '#ffffff'); g.circ(lerp(200, 400, reach), lerp(640, 600, reach), 24, '#ffffff'); }
        else g.arm(lerp(V.x0 - 40, 390, reach), lerp(660, 600, reach), -0.3, { hand: 'palm', side: 'L', s: 0.82, sleeve: '#f3efe6' });
      }
      const st = a2 >= 0 ? 2 : a1 >= 0 ? 1 : 0, sy = st ? squash(st === 2 ? a2 : a1, 0.28)[1] : 1;
      const P = pose2(s.p, [USU.x, USU.y + 14 + [-58, -42, -34][st] * sy], { hd: HD.kine, e0: [700, 1010], e1: [690, 770], a1: -PI / 2 + 0.12, rot: 0.5 });
      handle(g, P, 20, 17, C.wood2);
      bigHead(g, 'kine', P.ax, P.ay, P.rot, P.hs);
      arms2(g, P, { d1: 75, d2: 185, kl: 0.38, sleeve: v.k === 'mochi' ? '#2b4c9b' : undefined });
    },
    hit(g, s, k, v) {
      g.fx.smoke(USU.x, USU.y - 10, k === 2 ? 8 : 5, '#ffffff');
      g.fx.ring(USU.x, USU.y + 10, { c: '#ffffff', r0: 40, r1: 260, w: 12, sy: 0.32 });
      g.fx.pop(k === 2 ? 'ぺったん！' : 'ぺったん', k === 2 ? 500 : 300, k === 2 ? 250 : 330, { size: k === 2 ? 110 : 90, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 11 : 7, 0.14);
      if (k === 2) { g.fx.stars(500, 560, 10); g.fx.pop('できた！', 500, 420, { size: 80, c: '#ffffff' }); if (v.k === 'moon') g.fx.hearts(170, 420, 5); }
    },
  },
  /* ---------- 薪割り（両手） ---------- */
  {
    id: 'hit2-axe', acts: ['hit'], modes: ['both'], sfx: ['wood', 'break'], vars: AXE,
    draw(g, s, v) {
      const V = g.V;
      g.sky('#8fd8ff', '#eaf8ff', 600); g.cloud(230, 130, 0.8); g.cloud(830, 210, 0.6);
      for (let x = Math.floor((V.x0 - 100) / 130) * 130; x < V.x1 + 130; x += 130) { const h = 170 + (((x / 130) % 3) + 3) % 3 * 45; g.tri(x - 74, 560, x + 74, 560, x, 560 - h, '#4f9e63', 0); g.tri(x - 50, 500 - h * 0.3, x + 50, 500 - h * 0.3, x, 560 - h - 10, '#5fb373', 0); }
      g.band(550, 'bottom', '#86c86a');
      for (const [x, y] of [[120, 640], [190, 640], [155, 584], [880, 650]]) { g.circ(x, y, 34, '#8a5a36'); g.circ(x, y, 25, '#eec48a', 0); g.ring(x, y, 13, '#c48a4e', 4); }
      g.grassTufts(760, '#6db556', 5, 7);
      // 切り株
      g.shadow(500, 868, 240, 30);
      g.path('M300 700 L310 850 Q500 900 690 850 L700 700 Z', '#8a5a36');
      g.clipPath('M300 700 L310 850 Q500 900 690 850 L700 700 Z', () => { for (const xx of [-150, -70, 20, 110]) g.line([500 + xx, 720, 500 + xx * 1.05, 900], '#6e4426', 7); });
      g.ell(500, 700, 200, 60, '#e9bd84'); for (const k of [0.7, 0.42, 0.16]) g.ell(500, 700, 200 * k, 60 * k, null, 4);
      // 薪
      const a1 = ageOf(s, 1), a2 = ageOf(s, 2);
      if (a2 < 0) {
        g.at(500, LG.bot, 0, 1, 1 + jig(a1, 0.04, 30, 10), () => g.at(-500, -LG.bot, () => logPart(g, 0, 1000)));
        if (a1 >= 0) { g.path(`M490 ${LG.top} L500 ${LG.top + 34} L510 ${LG.top} Z`, C.ink, 0); g.line([500, LG.top + 34, 492, LG.top + 70, 506, LG.top + 104, 497, LG.top + 140], C.ink, 6); }
      } else {
        const t = clamp(a2 / 0.42), e = E.outBack(t, 1.3);
        for (const sd of [-1, 1]) {
          const px = 500 + sd * LG.rx;
          g.at(px + sd * 70 * E.outQ(t), LG.bot, sd * 0.62 * e, 1, 1, () => g.at(-px, -LG.bot, () => {
            logPart(g, sd < 0 ? 0 : 500, sd < 0 ? 500 : 1000);
            g.rr(sd < 0 ? 484 : 500, LG.top, 16, LG.bot - LG.top + 20, 4, '#f6d7a4', 4);
          }));
        }
      }
      // おの（両手）
      const T = [500, s.k === 0 ? LG.top + 10 : lerp(LG.top + 10, LG.top + 46, E.sm(clamp(a1 / 0.3)))];
      const P = pose2(s.p, T, { hd: 150, e0: [700, 1010], e1: [690, 770], a1: -PI / 2 + 0.12, rot: 0.55 });
      handle(g, P, 19, 15, C.wood);
      axeHead(g, P.ax, P.ay, P.rot, P.hs);
      arms2(g, P, { d1: 75, d2: 180, kl: 0.38 });
    },
    hit(g, s, k) {
      const y = LG.top + (k === 1 ? 10 : 46);
      g.fx.chips(500, y, '#f0c98f', k === 2 ? 16 : 10);
      g.fx.pop(k === 2 ? 'パカーン！' : 'コーン', k === 2 ? 500 : 300, k === 2 ? 250 : 300, { size: k === 2 ? 120 : 96, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 12 : 7, 0.14);
      if (k === 2) { g.fx.stars(500, 560, 10); g.fx.ring(500, 600, { c: '#ffffff', r1: 260, sy: 0.4 }); }
    },
  },
];
