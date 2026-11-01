/* 振り下ろす（片手） — 包丁・金づち・はんこ・ボタン など */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

/* ---------- 野菜を切る ---------- */
const VEG = [
  { k: 'carrot', name: 'にんじんを切る', short: 'にんじん', x0: 236, x1: 742, r: t => 12 + 44 * Math.pow(t, 0.62), c: C.carrot, flesh: '#ffbe73', core: '#ff9a3a', leaves: C.leaf, ridge: 1 },
  { k: 'cucumber', name: 'きゅうりを切る', short: 'きゅうり', x0: 222, x1: 778, r: t => 8 + 34 * Math.min(1, Math.sin(Math.PI * t) * 2.4), c: '#3f9d48', flesh: '#dcf6c6', core: '#b6e29a', dots: 1 },
  { k: 'daikon', name: 'だいこんを切る', short: 'だいこん', x0: 228, x1: 762, r: t => 18 + 40 * Math.pow(t, 0.7), c: '#f7f7f0', flesh: '#ffffff', core: '#eceee2', leaves: '#57b85a', top: '#d7efc0' },
  { k: 'eggplant', name: 'なすを切る', short: 'なす', x0: 250, x1: 752, r: t => 26 + 40 * Math.pow(t, 1.3), c: '#6c3fa3', flesh: '#fff2d2', core: '#e9d8a8', cap: 1, seeds: 1 },
  { k: 'negi', name: 'ねぎを切る', short: 'ねぎ', x0: 200, x1: 800, r: t => 12 + 16 * Math.min(1, Math.sin(Math.PI * t) * 3), c: '#f6faee', flesh: '#f3fbe6', core: '#d9efbf', rings: 1, green: '#6cc04a' },
];
const CY = 648, X1 = 568, X2 = 452;
function vegOutline(v) {
  const top = [], bot = [], N = 22;
  for (let i = 0; i <= N; i++) { const t = i / N; top.push(lerp(v.x0, v.x1, t), CY - v.r(t)); }
  for (let i = N; i >= 0; i--) { const t = i / N; bot.push(lerp(v.x0, v.x1, t), CY + v.r(t) * 0.88); }
  return top.concat(bot);
}
function drawVeg(g, v) {
  const pts = vegOutline(v);
  if (v.leaves) { // 葉っぱ（右端）
    for (const [a, l] of [[-0.9, 150], [-0.45, 175], [-0.1, 140]]) g.at(v.x1 - 6, CY - 10, a, 1, 1, () => g.path(`M0 0 Q${l * 0.5} -26 ${l} -6 Q${l * 0.55} 18 0 10 Z`, v.leaves));
  }
  g.blob(pts, v.green ? g.lin(v.x0, 0, v.x1, 0, [[0, v.c], [0.55, v.c], [0.7, v.green], [1, sh(v.green, -0.1)]]) : v.c);
  g.clipPath(pathOf(pts), () => {
    g.rect(v.x0 - 20, CY + 14, v.x1 - v.x0 + 40, 80, 'rgba(60,20,40,0.13)', 0);
    if (v.ridge) for (let x = v.x0 + 40; x < v.x1 - 30; x += 56) g.arc(x, CY - 70, 60, 1.2, 1.9, sh(v.c, -0.2), 5);
    if (v.dots) for (let x = v.x0 + 40; x < v.x1 - 30; x += 46) { g.circ(x, CY - 14, 4, sh(v.c, 0.45), 0); g.circ(x + 22, CY + 12, 4, sh(v.c, 0.45), 0); }
    if (v.top) g.rect(v.x1 - 120, CY - 80, 130, 160, g.lin(v.x1 - 120, 0, v.x1, 0, [[0, 'rgba(215,239,192,0)'], [1, v.top]]), 0);
  });
  g.blob(pts, null);
  g.hl(lerp(v.x0, v.x1, 0.55), CY - v.r(0.55) * 0.55, (v.x1 - v.x0) * 0.26, 7, 0, 0.5);
  if (v.cap) { g.at(v.x0 + 16, CY - 2, 0, 1, 1, () => { g.path('M30 -36 L-8 -22 L-34 0 L-8 22 L30 34 L16 0 Z', '#3e8f3a'); g.rr(-70, -9, 50, 18, 8, '#5a7a2e'); }); }
}
function pathOf(pts) { let d = `M${pts[0]} ${pts[1]}`; for (let i = 2; i < pts.length; i += 2) d += ` L${pts[i]} ${pts[i + 1]}`; return d + ' Z'; }
function cutFace(g, v, x) {
  const t = clamp((x - v.x0) / (v.x1 - v.x0)), r = v.r(t);
  g.ell(x, CY - r * 0.06, 13, r * 0.94, v.flesh, 5);
  if (v.rings) for (let i = 1; i < 3; i++) g.ell(x, CY - r * 0.06, 13 * (1 - i * 0.3), r * 0.94 * (1 - i * 0.3), null, 3);
  else g.ell(x, CY - r * 0.06, 6, r * 0.45, v.core, 0);
  if (v.seeds) for (let i = -2; i <= 2; i++) g.circ(x, CY + i * r * 0.18, 2.5, '#8a6a3a', 0);
}

/* ---------- くぎを打つ ---------- */
const NAIL = [
  { k: 'plank', name: 'くぎを打つ', short: 'くぎ打ち', wood: C.wood2, w: 560, h: 120 },
  { k: 'box', name: '木箱を作る', short: '木箱', wood: '#c98b52', w: 440, h: 190, box: 1 },
  { k: 'fence', name: 'さくを直す', short: 'さく', wood: '#f1e4cf', w: 620, h: 110, fence: 1 },
];

/* =========================================================================
   ここから追加の場面（片手で振り下ろす・mode 'one'）
   ========================================================================= */
const PI = Math.PI;
// g.mirror の中でも読める向きで文字を書く
function say(g, s, str, x, y, o) { if (s.side === 'L') g.at(x, y, 0, -1, 1, () => g.text(str, 0, 0, o)); else g.text(str, x, y, o); }
const ag1 = s => s.k === 0 ? -1 : s.k === 1 ? s.age : s.age + s.spr;   // 1回目からの秒（まだなら -1）
const ag2 = s => s.k === 2 ? s.age : -1;                                // 2回目からの秒
// 金づち・木づち・棒を振る：p=0 で打つ面が (tx, ty) に当たる。[持ち手→頭の中心, 軸→打つ面]
const TOOL = { hammer: [324, 130], mallet: [325, 120], stick: [250, 16] };
function swing(g, s, tx, ty, kind = 'hammer', o = {}) {
  const p = s.p, sc = o.s ?? 1, [L, F] = TOOL[kind];
  const ang = -PI / 2 + (o.rot ?? 0.95) * p + jig(s.age, 0.05, 30, 12);
  const gx = tx + L * sc + 40 * p, gy = ty - F * sc - 70 * p;
  if (kind === 'mallet') g.mallet(gx, gy, ang, sc, o.col); else if (kind === 'stick') g.stick(gx, gy, ang, sc, o.col); else g.hammer(gx, gy, ang, sc);
  g.arm(gx + 8 * sc, gy + 6 * sc, -PI / 2 - 0.5 + 0.35 * p, { hand: 'grip', sleeve: o.sleeve });
}
const ellD = (rx, ry) => `M${-rx} 0 A${rx} ${ry} 0 1 0 ${rx} 0 A${rx} ${ry} 0 1 0 ${-rx} 0 Z`;
const bowlD = (R, d) => `M${-R} 0 A${R} ${d} 0 0 0 ${R} 0 Z`;
function pine(g, x, y, sc, f = '#2f8a5f') { g.at(x, y, 0, sc, sc, () => { g.rect(-12, -10, 24, 40, '#7a5236', 0); for (let i = 0; i < 3; i++) { const w = 90 - i * 22, yy = -i * 62; g.tri(-w, yy, w, yy, 0, yy - 96, f, 0); g.tri(-w * 0.34, yy - 64, w * 0.34, yy - 64, 0, yy - 96, '#ffffff', 0); } }); }
function penguin(g, x, y, sc, happy, flap = 0) {
  g.at(x, y, 0, sc, sc, () => {
    g.ell(-42, 120, 36, 15, C.orange); g.ell(42, 120, 36, 15, C.orange);
    g.at(-88, -6, 0.3 + flap, 1, 1, () => g.ell(0, 46, 24, 68, '#2b3a67'));
    g.at(88, -6, -0.3 - flap, 1, 1, () => g.ell(0, 46, 24, 68, '#2b3a67'));
    g.ell(0, 0, 100, 122, '#2b3a67');
    g.path('M0 -64 C34 -96 70 -60 64 -20 C80 30 64 96 0 108 C-64 96 -80 30 -64 -20 C-70 -60 -34 -96 0 -64 Z', '#ffffff', 0);
    if (happy) { g.arc(-28, -40, 14, PI + 0.3, -0.3, C.ol, 7); g.arc(28, -40, 14, PI + 0.3, -0.3, C.ol, 7); }
    else { g.circ(-28, -40, 13, C.ol, 0); g.circ(28, -40, 13, C.ol, 0); g.circ(-32, -44, 4, '#fff', 0); g.circ(24, -44, 4, '#fff', 0); }
    g.ell(-52, -10, 14, 8, 'rgba(255,120,150,0.5)', 0); g.ell(52, -10, 14, 8, 'rgba(255,120,150,0.5)', 0);
    g.path('M-18 -22 L18 -22 L0 2 Z', C.orange, 5);
    if (!happy) g.ell(0, 22, 9, 11, C.ol, 0);
  });
}
function squirrel(g, x, y, sc, happy) {
  g.at(x, y, 0, sc, sc, () => {
    g.path('M10 -10 C90 -10 120 -90 90 -150 C70 -190 20 -190 30 -150 C50 -120 60 -80 10 -60 Z', '#c8743a');
    g.path('M40 -150 C60 -120 66 -90 40 -66', null, 4);
    g.ell(-10, -40, 52, 46, '#d98545');
    g.ell(-22, -30, 28, 30, '#ffe3bd', 0);
    g.circ(-30, -104, 40, '#d98545');
    g.tri(-50, -132, -36, -170, -18, -136, '#d98545');
    if (happy) g.arc(-44, -108, 9, PI + 0.3, -0.3, C.ol, 6); else { g.circ(-44, -108, 8, C.ol, 0); g.circ(-46, -111, 3, '#fff', 0); }
    g.ell(-56, -88, 10, 6, 'rgba(255,120,120,0.5)', 0); g.circ(-70, -98, 6, C.ol, 0);
    g.ell(-44, -52, 14, 10, '#d98545'); g.ell(-26, 4, 22, 12, '#c8743a');
  });
}
function ghost(g, x, y, sc, t) {
  g.at(x, y, Math.sin(t * 6) * 0.08, sc, sc, () => {
    g.path('M-90 40 C-96 -60 -60 -120 0 -120 C60 -120 96 -60 90 40 Q76 70 60 44 Q44 74 26 46 Q10 76 -6 46 Q-24 76 -40 46 Q-58 74 -72 44 Q-82 62 -90 40 Z', '#ffffff');
    g.ell(-30, -40, 13, 18, C.ol, 0); g.ell(30, -40, 13, 18, C.ol, 0); g.ell(0, 0, 18, 22, '#ff7a9a');
    g.ell(-56, -10, 14, 8, 'rgba(255,120,160,0.45)', 0); g.ell(56, -10, 14, 8, 'rgba(255,120,160,0.45)', 0);
    g.path('M-88 -10 Q-130 -30 -126 -64', null, 8); g.path('M88 -10 Q130 -30 126 -64', null, 8);
  });
}
function bat(g, x, y, sc, f) { g.at(x, y, 0, sc, sc * (0.7 + 0.3 * Math.abs(f)), () => { g.path('M0 -8 Q-30 -40 -70 -26 Q-58 -12 -60 4 Q-40 -6 -28 10 Q-16 0 0 8 Q16 0 28 10 Q40 -6 60 4 Q58 -12 70 -26 Q30 -40 0 -8 Z', '#120c26', 0); g.circ(0, -4, 14, '#120c26', 0); }); }

/* ---------- 割る（貯金箱・氷・くるみ・原石・スイカ・かぼちゃ） ---------- */
const ZZ = [[0, -1.06], [15, -0.7], [-13, -0.38], [12, -0.06], [-10, 0.28], [9, 0.62], [0, 1.08]];
function crackLine(g, h, n = 4) {
  const P = []; for (let i = 0; i < n; i++) P.push(ZZ[i][0], ZZ[i][1] * h);
  g.line(P, C.ol, 7); g.line([P[2], P[3], P[2] + 38, P[3] + 24], C.ol, 5); g.line([P[4], P[5], P[4] - 34, P[5] + 26], C.ol, 5);
  g.at(-5, 0, () => g.line(P, 'rgba(255,255,255,0.75)', 3));
}
const halfClip = (w, h, sd) => { let d = `M${sd * (w + 220)} ${-h - 220} L0 ${-h - 220}`; for (const [x, y] of ZZ) d += ` L${x} ${y * h}`; return d + ` L0 ${h + 220} L${sd * (w + 220)} ${h + 220} Z`; };
const DINO_D = 'M0 -190 C118 -190 165 -60 165 30 C165 132 96 190 0 190 C-96 190 -165 132 -165 30 C-165 -60 -118 -190 0 -190 Z';
const HZ = 'M-220 -23 L-124 -44 L-82 -8 L-41 -40 L0 -6 L41 -40 L82 -8 L124 -44 L220 -23';
const ROCK = [1, 0.93, 1.05, 0.95, 1.02, 0.9, 1.06, 0.94, 1.01, 0.96, 1.04, 0.92].flatMap((f, i, a) => { const t = i / a.length * PI * 2; return [Math.cos(t) * 200 * f, Math.sin(t) * 150 * f]; });
const CRACK = [
  { k: 'dino', name: '恐竜のたまごを割る', short: '恐竜', theme: 'fantasy', tool: 'hammer', split: 'hatch', gy: 770, cy: 582, w: 165, h: 190, s2: 'break', c: '#f6eed6', chip: '#f6eed6', pop: 'ガオー！' },
  { k: 'ice', name: 'ペンギンを助ける', short: 'ペンギン', theme: 'winter', tool: 'hammer', split: 'apart', gy: 782, cy: 610, w: 185, h: 170, s2: 'glass', c: '#c9f1ff', chip: '#e9fbff', pop: 'パリーン' },
  { k: 'walnut', name: 'くるみを割る', short: 'くるみ', theme: 'animal', tool: 'hammer', split: 'bowl', gy: 760, cy: 610, w: 160, h: 146, R: 150, tip: 14, s2: 'break', c: '#b9814a', chip: '#d8a46a', pop: 'パカッ' },
  { k: 'geode', name: '原石を割る', short: '原石', theme: 'fantasy', tool: 'hammer', split: 'bowl', gy: 782, cy: 632, w: 200, h: 150, R: 168, s2: 'break', c: '#8f95a5', chip: '#c4a6ff', pop: 'キラーン' },
  { k: 'coconut', name: 'ココナッツを割る', short: 'ココナッツ', theme: 'sea', tool: 'mallet', split: 'bowl', gy: 778, cy: 632, w: 165, h: 146, R: 160, s2: 'break', c: '#8b5a34', chip: '#fdfbf3', pop: 'パッカーン' },
  { k: 'pumpkin', name: 'かぼちゃを割る', short: 'かぼちゃ', theme: 'spooky', tool: 'mallet', split: 'bowl', gy: 782, cy: 632, w: 218, h: 150, R: 172, s2: 'pop', c: '#ff8f1f', chip: '#ffc061', pop: 'ばあ！' },
];
const CRK = {
  dino: {
    bg(g, s, V) {
      g.sky('#ffcf7a', '#fff4d6', 720);
      g.path('M40 650 L392 236 L508 236 L860 650 Z', '#b07a52', 0); g.path('M392 236 L508 236 L494 266 L476 248 L458 276 L440 248 L422 272 Z', '#ff5a3c', 0);
      for (let i = 0; i < 3; i++) { const k = (s.t * 0.5 + i / 3) % 1; g.alpha(1 - k, () => g.circ(450 + 30 * Math.sin(k * 6 + i), 210 - 190 * k, 30 + 40 * k, '#ffffff', 0)); }
      for (const [x, y, a, k] of [[60, 640, -0.5, 1.3], [150, 690, -0.15, 1], [930, 630, 0.5, 1.3], [850, 700, 0.2, 1]]) g.at(x, y, a, k, k, () => { g.path('M0 0 Q-40 -130 0 -260 Q40 -130 0 0 Z', '#3e9a4a', 0); for (let i = 1; i < 5; i++) { g.path(`M0 ${-i * 50} Q-60 ${-i * 50 - 10} -80 ${-i * 50 + 30} Q-40 ${-i * 50 + 10} 0 ${-i * 50 + 10} Z`, '#4fb05a', 0); g.path(`M0 ${-i * 50} Q60 ${-i * 50 - 10} 80 ${-i * 50 + 30} Q40 ${-i * 50 + 10} 0 ${-i * 50 + 10} Z`, '#4fb05a', 0); } });
      g.band(700, 'bottom', '#86c86d', 7);
      g.ell(500, 772, 240, 50, '#b5824f'); for (let i = 0; i < 6; i++) g.curve([290 + i * 70, 758, 322 + i * 70, 792, 362 + i * 70, 770], '#8a5a36', 6);
    },
    body(g, s, v) {
      g.path(DINO_D, v.c);
      for (const [x, y, r] of [[-70, -96, 28], [62, -40, 34], [-44, 44, 24], [92, 92, 24], [-104, 104, 18], [22, -146, 18], [10, 120, 16]]) g.ell(x, y, r, r * 0.8, '#9ad46f', 0);
      g.path(DINO_D, null); g.hl(-64, -96, 26, 50, 0.3, 0.45);
    },
    mid(g, s, v, a) {
      const e = E.outBack(clamp(a / 0.24), 1.8), y = lerp(v.cy + 70, v.cy - 120, e);
      g.at(500, y, Math.sin(s.t * 9) * 0.05 * e, 1, 1, () => {
        for (const [x, yy] of [[-74, 20], [-88, 64], [-92, 108]]) g.tri(x, yy - 22, x - 34, yy, x, yy + 22, '#ffb03a', 5);
        g.ell(0, 90, 92, 112, '#6fcf6a'); g.ell(0, 108, 56, 72, '#d8f5b8', 0);
        g.cap(-70, 70, -128, 18, 17, '#6fcf6a'); g.cap(70, 70, 128, 18, 17, '#6fcf6a');
        g.ell(0, -36, 98, 82, '#6fcf6a');
        g.circ(-36, -56, 18, '#ffffff', 5); g.circ(36, -56, 18, '#ffffff', 5); g.circ(-32, -54, 9, C.ol, 0); g.circ(40, -54, 9, C.ol, 0); g.circ(-35, -58, 3, '#fff', 0); g.circ(37, -58, 3, '#fff', 0);
        g.path('M-44 -8 Q0 40 44 -8 Z', '#c2304b', 5); g.tri(-28, -6, -18, -6, -23, 6, '#ffffff', 0); g.tri(18, -6, 28, -6, 23, 6, '#ffffff', 0);
        g.ell(-66, -18, 16, 9, 'rgba(255,120,140,0.5)', 0); g.ell(66, -18, 16, 9, 'rgba(255,120,140,0.5)', 0);
      });
    },
  },
  ice: {
    bg(g, s, V) {
      g.bg('#bfe8ff', '#eef9ff');
      g.hills(600, '#e6f6ff', 80, 4, 4);
      for (const [x, y, k] of [[140, 590, 1], [250, 626, 0.7], [870, 600, 1.1], [770, 636, 0.75]]) pine(g, x, y, k);
      g.band(735, 'bottom', '#ffffff', 7); g.band(830, 'bottom', '#eaf4ff');
      for (const [x, y, r] of s.my.fl) { const yy = (y * 1400 + s.t * 120) % 1400 + V.y0 - 100; g.circ(V.x0 + x * (V.x1 - V.x0), yy, r, '#ffffff', 0); }
    },
    body(g, s, v) {
      penguin(g, 0, 28, 0.92, 0);
      g.rr(-185, -170, 370, 340, 36, 'rgba(170,228,255,0.62)');
      g.rr(-158, -146, 64, 250, 30, 'rgba(255,255,255,0.32)', 0);
      g.line([104, -142, 150, -96], 'rgba(255,255,255,0.85)', 9); g.line([128, -150, 158, -120], 'rgba(255,255,255,0.85)', 7);
    },
    mid(g, s, v, a) {
      const hop = Math.max(0, Math.sin(Math.min(a, 1.2) * PI / 0.3)) * 60 * Math.exp(-a * 0.6);
      penguin(g, 500, v.gy - 136 - hop, 0.92, 1, 0.5 + 0.4 * Math.sin(a * 22));
    },
  },
  walnut: {
    bg(g, s, V) {
      g.bg('#cdeccb', '#f1f9e2');
      for (const [x, r] of [[90, 120], [310, 86], [720, 96], [930, 130]]) { g.rect(x - 18, 260, 36, 480, '#a37d58', 0); g.circ(x, 260, r, '#93d38c', 0); g.circ(x - r * 0.55, 310, r * 0.7, '#86c97f', 0); }
      g.band(700, 'bottom', '#86c86d', 7);
      g.rr(258, 760, 484, 400, 36, '#a06d40'); for (const x of [320, 420, 580, 680]) g.line([x, 790, x + 6, 1000], '#7f5230', 6);
      g.ell(500, 760, 242, 46, '#e8bd84'); g.ell(500, 760, 170, 30, null, 3); g.ell(500, 760, 90, 15, null, 3);
      // 枝とリス
      g.line([V.x0 - 40, 300, 360, 322], '#8a5a36', 30); g.line([250, 316, 300, 260], '#8a5a36', 16); g.circ(300, 252, 26, '#7fc777', 0);
      const a = ag2(s), hop = a >= 0 ? Math.max(0, Math.sin(Math.min(a, 1.2) * PI / 0.25)) * 50 : 0;
      squirrel(g, 196, 306 - hop, 0.95, a >= 0);
    },
    body(g, s, v) {
      g.path('M0 -160 C40 -150 160 -110 160 0 C160 100 90 146 0 146 C-90 146 -160 100 -160 0 C-160 -110 -40 -150 0 -160 Z', v.c);
      for (const [x, y, d] of [[-110, -40, 1], [-80, 50, -1], [-120, 40, 1], [90, -60, -1], [110, 30, 1], [60, 90, -1], [-40, -90, 1], [40, -110, -1]]) g.curve([x - 26, y, x - 8, y + 18 * d, x + 10, y - 10 * d, x + 28, y + 8 * d], sh(v.c, -0.3), 5);
      g.curve([0, -158, 8, -70, -6, 30, 0, 144], sh(v.c, -0.38), 8); g.curve([8, -150, 16, -70, 2, 30, 8, 136], sh(v.c, 0.25), 4);
      g.hl(-60, -80, 40, 18, -0.6, 0.45);
    },
    half(g, s, v, sd, R) {
      g.path(bowlD(R, R * 0.8), v.c);
      g.clipPath(bowlD(R, R * 0.8), () => { for (const [x, y] of [[-90, 50], [-20, 80], [60, 46], [100, 20], [-120, 16], [10, 30]]) g.curve([x - 26, y, x - 8, y + 16, x + 10, y - 8, x + 28, y + 8], sh(v.c, -0.3), 5); });
      g.ell(0, 0, R, R * 0.34, '#eed6ad'); g.ell(0, 2, R * 0.8, R * 0.25, '#b97c45', 0);
      g.blob([-90, 0, -70, -30, -30, -26, 0, -38, 30, -26, 70, -30, 92, 0, 66, 26, 30, 20, 0, 30, -30, 20, -66, 26], '#e9c38c', 5);
      g.curve([-60, -6, -30, 6, 0, -6, 30, 6, 60, -6], '#b98a52', 4); g.hl(-30, -14, 26, 8, 0, 0.5);
    },
  },
  geode: {
    bg(g, s, V) {
      g.bg('#1c1640', '#33285e');
      g.path(`M${V.x0 - 40} ${V.y0 - 40} L${V.x0 - 40} 820 L120 820 Q60 520 150 300 Q260 120 500 110 Q740 120 850 300 Q940 520 880 820 L${V.x1 + 40} 820 L${V.x1 + 40} ${V.y0 - 40} Z`, '#120e2c', 0);
      for (const [x, y, k, c] of [[150, 360, 1, '#7cf2ff'], [860, 300, 1.2, '#c4a6ff'], [800, 560, 0.8, '#ff9fd8'], [210, 600, 0.9, '#c4a6ff']]) {
        g.glow(x, y, 90 * k, c, 0.35); g.at(x, y, 0.2, k, k, () => { g.poly([-30, 30, -14, -40, 2, 30], c, 4); g.poly([-2, 30, 16, -70, 34, 30], sh(c, 0.3), 4); g.poly([20, 30, 40, -24, 56, 30], c, 4); });
      }
      g.band(782, 'bottom', '#463a72', 7); g.band(860, 'bottom', '#3b3064');
    },
    body(g, s, v) {
      g.blob(ROCK, v.c);
      g.clipPath('M-200 -150 L200 -150 L200 150 L-200 150 Z', () => { g.ell(10, 110, 230, 70, 'rgba(30,20,60,0.18)', 0); });
      for (const [x, y, r] of [[-110, -40, 22], [70, -80, 16], [120, 40, 26], [-40, 70, 18], [-150, 50, 12], [20, -10, 10]]) g.ell(x, y, r, r * 0.7, sh(v.c, -0.18), 0);
      g.hl(-70, -90, 60, 20, -0.3, 0.45);
    },
    half(g, s, v, sd, R) {
      g.path(bowlD(R, R * 0.7), v.c);
      g.ell(0, 0, R, R * 0.34, sh(v.c, 0.1)); g.ell(0, 1, R * 0.86, R * 0.28, '#f3f1fb', 0);
      g.ell(0, 2, R * 0.72, R * 0.22, '#7445c9', 0); g.ell(0, 6, R * 0.5, R * 0.14, '#4b2a96', 0);
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, x = Math.cos(a) * R * 0.6, y = 2 + Math.sin(a) * R * 0.18, tx = Math.cos(a) * R * 0.3, ty = 4 + Math.sin(a) * R * 0.08; g.poly([x - 12, y, tx, ty, x + 12, y], i % 2 ? '#d6c2ff' : '#b18bff', 3); }
      g.glow(0, 0, R * 0.8, '#c9a8ff', 0.5 + 0.2 * Math.sin(s.t * 8));
    },
  },
  coconut: {
    bg(g, s, V) {
      g.sky('#3ec5ff', '#c8f4ff', 430); g.sun(830, 120, 58);
      g.band(430, 520, '#22c1c3'); for (let x = Math.floor(V.x0 / 110) * 110; x < V.x1; x += 110) g.arc(x + 50, 470 + 12 * Math.sin(x + s.beat * 2), 22, PI, 0, '#ffffff', 5);
      g.band(520, 'bottom', '#f5dca5', 7);
      g.curve([170, 800, 120, 560, 210, 300], '#9a6a3f', 44); for (let i = 0; i < 6; i++) { const t = i / 6, x = lerp(160, 200, t) - 40 * Math.sin(PI * t), y = lerp(760, 330, t); g.line([x - 22, y, x + 22, y - 6], '#7a4e2c', 5); }
      for (const a of [-2.6, -2, -1.2, -0.5, 0.2]) g.at(210, 300, a, 1, 1, () => g.path('M0 0 Q90 -50 210 10 Q120 0 100 30 Q60 10 0 0 Z', '#2fa04a'));
      g.circ(196, 322, 24, '#8b5a34'); g.circ(228, 320, 22, '#8b5a34');
      g.rr(290, 768, 420, 40, 16, '#c98b52'); g.rr(290, 768, 420, 14, 8, '#dea36a', 0);
    },
    body(g, s, v) {
      g.ell(0, 0, 165, 146, v.c);
      g.clipPath(ellD(165, 146), () => { for (let i = 0; i < 18; i++) { const x = Math.cos(i * 2.3) * 120, y = Math.sin(i * 3.1) * 100; g.line([x - 16, y - 8, x + 16, y + 6], sh(v.c, -0.25), 4); } g.ell(0, 120, 220, 70, 'rgba(40,20,10,0.2)', 0); });
      g.ell(0, 0, 165, 146, null);
      for (const [x, y] of [[-44, -92], [-4, -108], [-24, -64]]) g.ell(x, y, 12, 9, '#4a2c18', 0);
      g.hl(-74, -70, 40, 18, -0.5, 0.35);
    },
    half(g, s, v, sd, R) {
      g.path(bowlD(R, R * 0.78), v.c); g.clipPath(bowlD(R, R * 0.78), () => { for (let i = 0; i < 8; i++) { const x = -R * 0.8 + i * R * 0.23; g.line([x, 30, x + 20, 90], sh(v.c, -0.25), 4); } });
      g.path(bowlD(R, R * 0.78), null);
      g.ell(0, 0, R, R * 0.34, '#fdfbf3'); g.ell(0, 3, R * 0.76, R * 0.24, '#d9f1f2', 0); g.hl(-R * 0.3, -R * 0.06, R * 0.24, 6, 0, 0.7);
      if (sd > 0 && ag2(s) > 0.12) { g.line([16, 0, 70, -150], '#ffffff', 16); g.line([16, 0, 70, -150], '#ff5a8a', 16); for (let i = 1; i < 5; i++) { const t = i / 5; g.line([16 + 54 * t - 7, -150 * t + 2, 16 + 54 * t + 7, -150 * t - 2], '#ffffff', 6); } g.path('M30 -150 Q74 -206 118 -150 Z', C.yellow); g.line([74, -178, 74, -130], C.ol, 4); }
    },
  },
  pumpkin: {
    bg(g, s, V) {
      g.bg('#1a1238', '#43306f');
      g.glow(210, 180, 190, '#fff3b0', 0.3); g.circ(210, 180, 78, '#fff1b8', 0); g.circ(186, 160, 14, '#f3dc8c', 0); g.circ(236, 204, 10, '#f3dc8c', 0);
      for (let i = 0; i < 3; i++) bat(g, 640 + i * 110, 170 + i * 60 + Math.sin(s.t * 5 + i * 2) * 18, 0.7 - i * 0.1, Math.sin(s.t * 18 + i));
      g.hills(700, '#2a1f4d', 50, 9, 4);
      for (const [x, h] of [[130, 120], [860, 150], [760, 100]]) { g.rr(x - 44, 760 - h, 88, h + 30, 40, '#5b4f86'); g.line([x - 18, 720 - h * 0.5, x + 18, 720 - h * 0.5], '#463a70', 6); }
      g.band(782, 'bottom', '#33285c', 7);
    },
    body(g, s, v) {
      for (const [x, rx, k] of [[-140, 92, -0.1], [140, 92, -0.1], [-72, 100, 0], [72, 100, 0], [0, 96, 0.1]]) g.ell(x, 4, rx, 146 - Math.abs(x) * 0.1, sh(v.c, k));
      g.path('M-14 -136 Q-20 -190 10 -206 L28 -194 Q6 -176 14 -134 Z', '#3f8a3a');
      g.hl(-80, -80, 30, 50, -0.2, 0.3);
    },
    half(g, s, v, sd, R) {
      g.path(bowlD(R, R * 0.78), v.c); g.clipPath(bowlD(R, R * 0.78), () => { for (const x of [-110, -40, 40, 110]) g.curve([x, 0, x * 1.1, 70, x * 0.7, 140], sh(v.c, -0.25), 6); });
      g.path(bowlD(R, R * 0.78), null);
      g.ell(0, 0, R, R * 0.34, '#ffc86b'); g.ell(0, 2, R * 0.74, R * 0.24, '#f0962c', 0);
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; g.ell(Math.cos(a) * R * 0.5, 2 + Math.sin(a) * R * 0.14, 10, 6, '#fff3d6', 3, a); }
    },
    mid(g, s, v, a) { const t = clamp(a / 0.3); if (t > 0) ghost(g, lerp(500, 420, t), lerp(v.gy - 80, 420, E.outBack(t, 1.4)), lerp(0.4, 1.25, E.outBack(t)), s.t); },
  },
};
/* ---------- はんこを押す（スタンプラリー・消印・宿題・クッキーの型ぬき） ---------- */
const SQ = 0.6, PY = 700;     // 机の上の紙（上から見た絵を縦に SQ 倍してななめに見せる）
const STAMP = [
  { k: 'rally', name: 'スタンプラリー', short: 'スタンプ', theme: 'town', ink: '#e8433f', spots: [[80, 26], [240, 26]] },
  { k: 'letter', name: '手紙に消印を押す', short: '消印', theme: 'town', ink: '#2b3a67', spots: [[150, -96], [252, -96]] },
  { k: 'homework', name: '宿題にスタンプ', short: '宿題', theme: 'school', ink: '#ff4f8b', spots: [[170, -40], [170, 130]] },
  { k: 'cookie', name: 'クッキーの型ぬき', short: '型ぬき', theme: 'kitchen', ink: '#c98a4a', spots: [[-120, 20], [120, 20]], cutter: 1 },
];
function inkMark(g, kind, x, y, c, k = 1) {
  g.at(x, y, 0, k, k, () => g.alpha(0.92, () => {
    if (kind === 'postmark') { g.ring(0, 0, 46, c, 7); g.line([-40, 0, 40, 0], c, 5); g.circ(0, -22, 5, c, 0); g.circ(0, 22, 5, c, 0); for (const yy of [-24, 0, 24]) g.curve([-56, yy, -86, yy - 10, -116, yy + 8, -146, yy - 8, -176, yy + 6], c, 5); return; }
    if (kind === 'sakura') { for (let i = 0; i < 5; i++) { const a = i * PI * 0.4 - PI / 2; g.at(Math.cos(a) * 28, Math.sin(a) * 28, a + PI / 2, 1, 1, () => g.path('M0 22 C-26 6 -22 -22 -8 -24 L0 -16 L8 -24 C22 -22 26 6 0 22 Z', c, 0)); } g.circ(0, 0, 12, '#ffffff', 0); g.circ(0, 0, 7, c, 0); return; }
    g.ring(0, 0, 52, c, 6);
    if (kind === 'cat') { g.tri(-30, -10, -26, -40, -6, -22, c, 0); g.tri(30, -10, 26, -40, 6, -22, c, 0); g.ell(0, 4, 32, 26, c, 0); g.circ(-12, 0, 5, '#fff', 0); g.circ(12, 0, 5, '#fff', 0); g.line([-40, 8, -20, 10], c, 3); g.line([40, 8, 20, 10], c, 3); }
    else if (kind === 'bear') { g.circ(-22, -22, 13, c, 0); g.circ(22, -22, 13, c, 0); g.circ(0, 2, 30, c, 0); g.ell(0, 12, 13, 9, '#fff', 0); g.circ(-11, -4, 4, '#fff', 0); g.circ(11, -4, 4, '#fff', 0); }
    else if (kind === 'frog') { g.circ(-18, -18, 13, c, 0); g.circ(18, -18, 13, c, 0); g.ell(0, 6, 34, 22, c, 0); g.circ(-18, -18, 5, '#fff', 0); g.circ(18, -18, 5, '#fff', 0); g.arc(0, 4, 16, 0.3, PI - 0.3, '#fff', 4); }
  }));
}
function cookieCutter(g, x, y, sc) {
  g.at(x, y, 0, sc, sc, () => {
    g.rr(-24, 30, 48, 150, 14, '#ff7b98'); g.rr(-38, -42, 76, 92, 30, '#ff7b98'); g.hl(-12, 0, 8, 26, 0, 0.4);
    g.at(0, 210, 0, 1, SQ, () => g.star(0, 0, 98, 54, 5, '#9aa6bb'));
    g.at(0, 180, 0, 1, SQ, () => { g.star(0, 0, 98, 54, 5, '#e3e9f2'); g.star(0, 0, 82, 44, 5, '#a7b2c6', 0); });
    g.rr(-24, 146, 48, 40, 10, '#ff7b98', 6);
  });
}
const STP = {
  rally: {
    bg(g, s, V) { g.bg('#d6f2ee'); g.dots(V.x0, V.y0, V.x1 - V.x0, 480 - V.y0, 100, 8, '#c2e8e2'); g.rr(130, 150, 250, 190, 10, '#fff', 7); g.path('M150 320 L210 230 L250 280 L290 210 L360 320 Z', C.grass, 0); g.circ(330, 200, 18, C.red, 0); g.line([160, 190, 260, 190], C.blue, 6); g.band(480, 'bottom', '#e7b981', 7); },
    paper(g, s, v) {
      g.rr(-330, -210, 660, 420, 26, '#fffaf0'); g.clipRR(-330, -210, 660, 420, 26, () => g.rect(-330, -210, 660, 104, '#2ec4b6', 0)); g.rr(-330, -210, 660, 420, 26, null);
      say(g, s, 'スタンプラリー', 0, -158, { size: 60, f: '#fff' });
      for (let i = 0; i < 4; i++) { const x = -240 + i * 160; g.ring(x, 26, 60, '#e2d6bd', 5); say(g, s, String(i + 1), x, 128, { size: 40, f: '#c7b38f' }); }
      inkMark(g, 'bear', -240, 26, '#3a86ff'); inkMark(g, 'frog', -80, 26, '#2ea44f');
    },
    mark: 'cat',
  },
  letter: {
    bg(g, s, V) {
      g.bg('#ffe7cf'); g.stripes(V.x0 - 40, V.y0 - 40, V.x1 - V.x0 + 80, 520 - V.y0, 80, '#ffe7cf', '#ffdcbc');
      g.rr(96, 214, 150, 40, 14, '#d83a34'); g.rr(110, 250, 122, 250, 18, '#ee3a33'); g.rr(130, 290, 82, 14, 6, C.ol, 0); g.rr(126, 340, 90, 60, 8, '#fff', 5); g.rect(144, 352, 54, 36, '#ffe9e6', 4); g.line([144, 352, 171, 372, 198, 352], '#ee3a33', 4);
      g.band(480, 'bottom', '#c9935c', 7);
    },
    paper(g, s, v) {
      g.rr(-320, -200, 640, 400, 14, '#fdfdf8');
      g.clipRR(-320, -200, 640, 400, 14, () => { for (let i = 0; i < 18; i++) { const x = -340 + i * 40, c = i % 2 ? C.blue : C.red; g.poly([x, -200, x + 20, -200, x - 4, -178, x - 24, -178], c, 0); g.poly([x, 200, x + 20, 200, x + 44, 178, x + 24, 178], c, 0); } });
      g.rr(-320, -200, 640, 400, 14, null);
      for (const [x, c] of [[150, '#ff9fbd'], [252, '#8fd8ff']]) { g.rr(x - 42, -152, 84, 108, 4, '#ffffff', 4); g.rect(x - 32, -142, 64, 88, c, 0); g.path(`M${x - 32} -54 L${x - 8} -96 L${x + 6} -76 L${x + 16} -90 L${x + 32} -54 Z`, '#ffffff', 0); }
      for (let i = 0; i < 7; i++) g.rect(-270 + i * 40, -150, 30, 36, null, 4);
      for (let i = 0; i < 3; i++) g.line([-230, -10 + i * 64, 120, -10 + i * 64], '#c3cad8', 7);
    },
    mark: 'postmark',
  },
  homework: {
    bg(g, s, V) { g.bg('#f3ead8'); g.rr(110, 110, 780, 300, 16, '#2f6b4f', 10); g.rr(110, 110, 780, 300, 16, null, 0); say(g, s, 'しゅくだい', 330, 200, { size: 56, f: 'rgba(255,255,255,0.85)', font: '"Zen Kaku Gothic New", sans-serif', w: 700 }); g.line([170, 320, 420, 320], 'rgba(255,255,255,0.6)', 6); g.rr(560, 380, 120, 20, 6, '#fff', 4); g.band(480, 'bottom', '#e0b47c', 7); },
    paper(g, s, v) {
      g.rr(-300, -240, 600, 480, 10, '#ffffff');
      for (let y = -150; y < 240; y += 80) g.line([-280, y, 280, y], '#d7e6f6', 4);
      g.rr(-280, -222, 150, 56, 6, null, 4);
      [['1＋2＝3', -100], ['4＋3＝7', -20], ['5－1＝4', 60], ['2＋6＝8', 140]].forEach(([t, y]) => { say(g, s, t, -150, y, { size: 42, f: '#3d3d5c', font: '"Zen Kaku Gothic New", sans-serif', w: 700 }); g.ring(-150, y, 70, 'rgba(255,79,98,0.8)', 5); });
      for (const [x, y] of v.spots) g.rr(x - 66, y - 62, 132, 124, 14, null, 3);
    },
    mark: 'sakura',
  },
  cookie: {
    bg(g, s, V) { g.bg('#fff2dc'); g.tiles(V.x0 - 40, V.y0, V.x1 - V.x0 + 80, 480 - V.y0, 80, '#fff2dc', '#ffe6c2'); g.band(470, 'bottom', '#c8925c', 7); },
    paper(g, s, v) {
      g.rr(-350, -250, 700, 500, 30, '#e8b677'); for (const y of [-160, -40, 80, 190]) g.line([-330, y, 330, y + 10], '#d29c5e', 5);
      g.blob([-280, -150, -120, -196, 60, -184, 250, -176, 292, -40, 276, 120, 230, 186, 0, 196, -220, 180, -292, 60], '#f7dcaa');
      for (const [x, y] of [[-200, -100], [180, 140], [-60, 160], [230, -120], [20, -150]]) g.circ(x, y, 8, '#fff8ea', 0);
    },
    mark: 'cut',
  },
};
const T_STAMP = {
  id: 'hit-stamp', acts: ['hit'], modes: ['one'], sfx: (k, v) => v.cutter ? 'squish' : 'stamp', vars: STAMP,
  draw(g, s, v) {
    const V = g.V, D = STP[v.k], [A, B] = v.spots, a2 = ag2(s);
    g.mirror(s.side, () => {
      D.bg(g, s, V);
      if (v.cutter) { g.shadow(500, 545, 300, 20); g.cap(170, 520, 830, 520, 34, '#f2c88f'); g.rr(110, 500, 70, 40, 16, '#c0763f'); g.rr(820, 500, 70, 40, 16, '#c0763f'); g.hl(400, 506, 160, 8, 0, 0.45); }
      // 紙（手紙は2回目のあと羽が生えて飛んでいく）
      const fly = v.k === 'letter' && a2 > 0.04 ? clamp((a2 - 0.04) / 0.75) : 0;
      const fx = -460 * E.inQ(fly), fy = -1000 * E.inQ(fly) - 160 * Math.sin(fly * PI), sq = lerp(SQ, 0.9, clamp(fly * 3));
      g.shadow(500, PY + 140 * SQ * (1 - fly), 340 * (1 - fly * 0.7), 22 * (1 - fly));
      g.at(500 + fx, PY + fy, -0.25 * fly, 1, sq, () => {
        if (fly > 0) for (const sd of [-1, 1]) g.at(sd * 300, -40, sd * (0.3 + 0.5 * Math.sin(s.t * 30)), 1, 1, () => g.path(`M0 0 C${sd * 60} -80 ${sd * 160} -90 ${sd * 200} -40 C${sd * 150} -40 ${sd * 120} -10 ${sd * 150} 20 C${sd * 100} 20 ${sd * 60} 40 0 30 Z`, '#ffffff'));
        D.paper(g, s, v);
        for (let i = 0; i < s.k; i++) {
          const [x, y] = v.spots[i], ag = i === 0 ? ag1(s) : a2, pk = 1 + 0.25 * Math.exp(-ag * 20);
          if (D.mark === 'cut') {
            if (a2 > 0.06) g.star(x, y, 98, 54, 5, '#e8b677', 6);
            else { g.star(x, y, 98, 54, 5, '#f0cf98', 6); g.star(x, y + 8, 86, 46, 5, null, 3); }
          } else inkMark(g, D.mark, x, y, v.ink, pk);
        }
        if (v.k === 'rally' && a2 >= 0) { const e = E.outBack(clamp((a2 - 0.03) / 0.2), 2.2); if (e > 0) g.at(-246, -150, -0.2, e, e / SQ * 0.75, () => { g.poly([-30, 20, -56, 120, -30, 104, -14, 128, 0, 30], C.red); g.poly([30, 20, 56, 120, 30, 104, 14, 128, 0, 30], C.blue); g.circ(0, 0, 64, C.gold); g.circ(0, 0, 48, '#ffe27a', 4); g.star(0, 0, 32, 14, 5, '#ffffff', 4); }); }
        if (v.k === 'homework' && a2 >= 0) { const e = E.outBack(clamp((a2 - 0.03) / 0.2), 2); if (e > 0) g.at(20, -150, -0.12, e * 1.25, e * 1.25, () => { g.curve([-60, 40, -100, -20, -40, -70, 60, -62, 112, -10, 80, 50, -20, 60, -110, 30], '#ff4f62', 8); say(g, s, '100', 4, -6, { size: 74, f: '#ff4f62' }); g.line([-50, 40, 60, 40], '#ff4f62', 6); g.line([-44, 54, 54, 54], '#ff4f62', 6); }); }
      });
      // 型ぬきしたクッキーが跳び上がって焼き上がる
      if (v.cutter && a2 > 0.06) for (const [x, y] of v.spots) {
        const t = clamp((a2 - 0.06) / 0.3), h = 230 * Math.sin(PI * t), sx = 500 + x, sy = PY + y * SQ - h, done = t > 0.5;
        g.shadow(sx, PY + y * SQ + 20, 70 * (1 - h / 400), 14);
        g.at(sx, sy, t * PI * 2, Math.cos(t * PI * 2) * 0.5 + 0.5 > 0.1 ? 1 : 0.2, SQ + (1 - SQ) * Math.sin(PI * t), () => { g.star(0, 0, 98, 54, 5, done ? '#e0a04f' : '#f0cf98', 6); if (done) { g.star(0, 0, 74, 40, 5, '#f5c27a', 0); for (const [dx, dy, c] of [[-20, -10, C.pink], [18, 6, C.blue], [0, 24, C.yellow], [6, -30, C.green]]) g.rr(dx - 8, dy - 3, 16, 6, 3, c, 0); } });
      }
      // はんこと手
      const m = s.k === 0 ? 0 : s.k === 1 ? E.ioQ(clamp(s.u / 0.45)) : 1, sx = 500 + lerp(A[0], B[0], m), sy = PY + lerp(A[1], B[1], m) * SQ;
      const p = s.p, sc = 0.95, gx = sx + 34 * p, gy = sy - (v.cutter ? 210 : 280) * sc - 270 * p;
      if (v.cutter) cookieCutter(g, gx, gy, sc); else g.stamp(gx, gy, PI + 0.16 * p, sc, v.ink);
      g.arm(gx + 26, gy - 2, -PI / 2 - 0.62 + 0.15 * p, { hand: 'grip' });
    });
  },
  hit(g, s, k, v) {
    const [x0, y0] = v.spots[k - 1], x = g.mx(s.lastSide, 500 + x0), y = PY + y0 * SQ;
    g.fx.ring(x, y, { r1: 150, w: 10, sy: SQ, c: '#ffffff' }); g.fx.shake(5, 0.1);
    if (k === 1 || v.k !== 'rally') g.fx.pop(k === 1 ? (v.cutter ? 'ギュッ' : 'ポン') : (v.cutter ? 'ギュッ！' : 'ポン！'), g.mx(s.lastSide, 500 + x0 - 230), y - 300, { size: 92 });
    if (k === 1) { if (v.cutter) g.fx.burst(x, y, { n: 8, c: '#ffffff', shape: 'dot', sp: [100, 300], size: [8, 14], g: 300 }); return; }
    if (v.k === 'rally') { g.fx.confetti(70); g.sfx('cheer'); g.fx.pop('コンプリート', g.mx(s.lastSide, 420), 400, { size: 84, c: C.yellow }); }
    else if (v.k === 'letter') { g.fx.burst(500, PY, { n: 10, c: '#ffffff', shape: 'leaf', sp: [150, 400], size: [16, 26], g: 200 }); g.sfx('swoosh'); }
    else if (v.k === 'homework') { g.fx.stars(g.mx(s.lastSide, 490), PY - 90, 9); g.sfx('chime'); }
    else { g.fx.stars(500, PY - 100, 8); g.sfx('magic'); }
  },
};
/* ---------- 手のひらでたたく（発射ボタン・呼び鈴・早押し・目覚まし） ---------- */
const PRESS = [
  { k: 'party', name: '電気をつける', short: 'サプライズ', theme: 'party', bx: 500, top: 662, D: 18 },
  { k: 'bell', name: '呼び鈴を鳴らす', short: '呼び鈴', theme: 'animal', bx: 500, top: 606, D: 16 },
  { k: 'toaster', name: 'トーストを焼く', short: 'トースト', theme: 'kitchen', bx: 652, top: n => n <= 1 ? 462 : 602, D: 6 },
  { k: 'alarm', name: '目覚ましを止める', short: '目覚まし', theme: 'home', bx: 500, top: 404, D: 10 },
];
function catHead(g, x, y, sc, happy) {
  g.at(x, y, 0, sc, sc, () => {
    g.tri(-62, -30, -50, -96, -10, -60, '#ffb35c'); g.tri(62, -30, 50, -96, 10, -60, '#ffb35c'); g.tri(-50, -46, -46, -80, -24, -58, '#ff9fbd', 0); g.tri(50, -46, 46, -80, 24, -58, '#ff9fbd', 0);
    g.ell(0, 0, 78, 64, '#ffb35c'); for (const dx of [-16, 0, 16]) g.line([dx, -60, dx * 0.8, -40], '#e8893a', 6);
    g.ell(0, 22, 40, 26, '#fff4e6', 0);
    if (happy === 2) { g.line([-40, -4, -16, -4], C.ol, 6); g.line([16, -4, 40, -4], C.ol, 6); } else if (happy) { g.arc(-28, -6, 11, PI + 0.3, -0.3, C.ol, 6); g.arc(28, -6, 11, PI + 0.3, -0.3, C.ol, 6); } else { g.circ(-28, -6, 10, C.ol, 0); g.circ(28, -6, 10, C.ol, 0); g.circ(-31, -9, 3.5, '#fff', 0); g.circ(25, -9, 3.5, '#fff', 0); }
    g.tri(-7, 10, 7, 10, 0, 18, '#ff7a9a', 0); g.path('M-12 24 Q-6 30 0 22 Q6 30 12 24', null, 4);
    for (const sd of [-1, 1]) { g.line([sd * 44, 16, sd * 92, 6], C.ol, 3); g.line([sd * 44, 26, sd * 92, 30], C.ol, 3); }
  });
}
const PRS = {
  party: {
    bg(g, s, V, d) {
      const a1 = ag1(s), a2 = ag2(s), lit = s.k === 0 ? 0 : s.k === 1 ? 0.65 * E.outQ(clamp(a1 / 0.12)) : 0.65 + 0.35 * E.outQ(clamp(a2 / 0.12));
      g.bg('#ffd9e8'); g.stripes(V.x0 - 40, V.y0 - 40, V.x1 - V.x0 + 80, 640 - V.y0, 90, '#ffd9e8', '#ffcfe0');
      g.curve([150, 190, 500, 260, 850, 190], C.ol, 4); for (let i = 0; i < 9; i++) { const t = (i + 0.5) / 9, x = lerp(150, 850, t), y = 190 + 70 * 4 * t * (1 - t) * 0.95; g.tri(x - 28, y, x + 28, y, x, y + 56, [C.red, C.yellow, C.blue, C.green][i % 4], 4); }
      const hop = s.k === 2 ? Math.max(0, Math.sin(Math.min(a2, 0.6) * PI / 0.3)) * 34 : 0, F = [[290, 470], [500, 440], [710, 470]];
      F.forEach(([x, y], i) => {
        y -= hop * (i === 1 ? 1 : 0.8);
        if (i === 0) { g.circ(x - 50, y - 56, 26, '#b07a52'); g.circ(x + 50, y - 56, 26, '#b07a52'); g.circ(x, y, 72, '#b07a52'); g.ell(x, y + 22, 34, 24, '#ecc9a2', 0); g.ell(x, y + 10, 10, 7, C.ol, 0); }
        else if (i === 2) { for (const sd of [-1, 1]) g.at(x + sd * 30, y - 60, sd * 0.2, 1, 1, () => { g.ell(0, -50, 22, 62, '#ffffff'); g.ell(0, -46, 10, 44, '#ffc2d6', 0); }); g.circ(x, y, 68, '#ffffff'); g.ell(x, y + 14, 8, 6, '#ff7a9a', 0); }
        else catHead(g, x, y, 1, s.k ? 1 : 0);
        if (i !== 1) { if (s.k) { g.arc(x - 26, y - 10, 10, PI + 0.3, -0.3, C.ol, 6); g.arc(x + 26, y - 10, 10, PI + 0.3, -0.3, C.ol, 6); } else { g.circ(x - 26, y - 10, 9, C.ol, 0); g.circ(x + 26, y - 10, 9, C.ol, 0); } g.ell(x - 46, y + 18, 13, 7, 'rgba(255,120,150,0.5)', 0); g.ell(x + 46, y + 18, 13, 7, 'rgba(255,120,150,0.5)', 0); }
        if (s.k) g.at(x + 10, y - (i === 1 ? 80 : 70), 0.15, 1, 1, () => { g.tri(-34, 0, 34, 0, 0, -96, [C.blue, C.yellow, C.green][i]); g.line([-20, -30, 20, -40], '#ffffff', 6); g.circ(0, -98, 12, C.red, 4); });
      });
      g.rr(180, 560, 640, 54, 12, '#ffffff'); g.rect(204, 606, 592, 220, '#ff9fbd', 0); for (let x = 204; x < 796; x += 74) g.path(`M${x} 606 Q${x + 37} 640 ${x + 74} 606 Z`, '#ffffff', 0); g.rect(204, 606, 592, 220, null);
      g.rr(410, 470, 180, 96, 16, '#fff6ee'); g.rr(440, 410, 120, 66, 14, '#ffe3ec'); g.circ(470, 400, 14, C.red, 4); g.circ(530, 400, 14, C.red, 4);
      for (const x of [460, 500, 540]) { g.rr(x - 6, 360, 12, 54, 4, C.blue, 4); g.ell(x, 350, 8, 14, C.yellow, 0); }
      g.band(826, 'bottom', '#c98b57', 7);
      // 暗やみ（電気をつけると明るくなる）
      g.alpha(0.86 * (1 - lit), () => g.rect(V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100, '#120e2c', 0));
      if (lit < 0.3) g.alpha(1 - lit / 0.3, () => F.forEach(([x, y]) => { g.circ(x - 26, y - 10, 9, '#ffffff', 0); g.circ(x + 26, y - 10, 9, '#ffffff', 0); }));
      g.curve([V.x0 - 40, 70, 500, 140, V.x1 + 40, 70], C.ol, 4);
      for (let x = Math.ceil((V.x0 - 40) / 110) * 110; x < V.x1 + 40; x += 110) { const t = (x - V.x0 + 40) / (V.x1 - V.x0 + 80), y = 70 + 70 * 4 * t * (1 - t) + 16, c = [C.red, C.yellow, C.mint, C.pink, C.blue][((x / 110) % 5 + 5) % 5]; if (lit > 0) g.glow(x, y + 8, 60, c, 0.6 * lit); g.ell(x, y + 8, 14, 20, lit > 0 ? c : '#5c6478', 4); }
      // スイッチ
      g.line([380, 780, 300, 820, V.x0 - 40, 810], '#2b2140', 8);
      g.shadow(500, 838, 150, 14); g.rr(370, 720, 260, 118, 24, '#ffd23f'); g.rr(370, 800, 260, 38, 16, '#e0b020', 0); g.rr(370, 720, 260, 118, 24, null);
      g.glow(500, 700, 150, s.k ? '#fff3b0' : '#ff9fbd', 0.5);
      g.at(500, 726 + d * 0.3, 0, 1, 1 - d / 120, () => { g.path('M-96 0 C-96 -96 96 -96 96 0 Z', s.k ? '#ffffff' : '#ff6b8b'); g.hl(-30, -46, 30, 12, -0.3, 0.6); });
    },
  },
  bell: {
    bg(g, s, V, d) {
      g.bg('#ffe6c4'); g.rect(V.x0 - 40, 470, V.x1 - V.x0 + 80, 140, '#f6cf9c', 0);
      g.rr(160, 110, 330, 500, 6, '#4a2f24'); g.rr(176, 126, 298, 490, 4, '#6b4532', 0);
      g.rr(690, 150, 200, 240, 12, '#3f5f4a', 8); for (const y of [210, 260, 310]) g.line([720, y, 860, y], 'rgba(255,255,255,0.7)', 6); g.circ(790, 170, 10, '#fff', 0);
      const a1 = ag1(s), a2 = ag2(s);
      // ねこの店員（1回目でのぞく・2回目で出てくる）
      if (s.k >= 1) {
        const out = a2 >= 0 ? E.outBack(clamp(a2 / 0.26)) : 0, peek = E.outBack(clamp(a1 / 0.25));
        const cx = lerp(470, 330, out), cy = lerp(300, 380, out);
        if (out > 0) { g.rr(cx - 70, cy + 40, 140, 260, 50, '#ffffff'); g.path(`M${cx - 70} ${cy + 80} L${cx - 20} ${cy + 80} L${cx} ${cy + 200} L${cx + 20} ${cy + 80} L${cx + 70} ${cy + 80} L${cx + 70} ${cy + 300} L${cx - 70} ${cy + 300} Z`, '#2b2140', 0); g.path(`M${cx} ${cy + 64} L${cx - 30} ${cy + 48} L${cx - 30} ${cy + 80} Z M${cx} ${cy + 64} L${cx + 30} ${cy + 48} L${cx + 30} ${cy + 80} Z`, C.red, 4); }
        g.at(cx + (1 - out) * 60 * (1 - peek), cy, (1 - out) * -0.35, 1, 1, () => catHead(g, 0, 0, 0.95, out > 0.5));
        if (out > 0) { const tx = cx + 120, ty = cy + 110; g.line([cx + 60, cy + 150, tx, ty + 6], '#ffffff', 26); g.ell(tx + 20, ty, 110, 18, '#dfe6f0'); g.path(`M${tx - 50} ${ty - 10} Q${tx + 20} ${ty - 110} ${tx + 90} ${ty - 10} Z`, '#dfe6f0'); g.circ(tx + 20, ty - 70, 10, '#cfd6e2'); g.hl(tx, ty - 50, 30, 10, -0.4, 0.6); }
        if (out === 0) say(g, s, '！', 560, 190 - 10 * peek, { size: 80, f: C.red, o: 10 });
      }
      // のれん
      for (let i = 0; i < 3; i++) { const x = 176 + i * 100; g.rr(x, 126, 96, 200, 4, '#2b4c8c'); }
      g.circ(325, 200, 30, '#ffffff', 0); g.path('M305 200 Q325 180 345 200 Q325 220 305 200 Z M345 200 L358 188 L358 212 Z', '#2b4c8c', 0);
      g.rr(150, 110, 350, 22, 6, '#7a4a2a');
      g.band(600, 'bottom', '#c98a55', 7); g.band(650, 'bottom', '#a86f43', 7);
      g.ell(500, 744, 150, 34, '#2b2140'); g.rr(350, 716, 300, 30, 12, '#3a3150');
      const sc = 1 - d / 140;
      g.at(500, 722, 0, 1, sc, () => { g.rect(-10, -142, 20, 36, '#8f9bb0'); g.circ(0, -146, 20, '#cfd6e2'); g.path('M-124 0 C-124 -136 124 -136 124 0 Z', '#ffd25a'); g.hl(-44, -64, 40, 18, -0.4, 0.6); g.rect(-124, -6, 248, 12, '#e0a92e', 5); });
    },
  },
  toaster: {
    bg(g, s, V, d) {
      const a1 = ag1(s), a2 = ag2(s), lv = s.k === 0 ? 0 : s.k === 1 ? E.outQ(clamp(a1 / 0.06)) : 1 - E.outBack(clamp(a2 / 0.12), 2.5);
      g.bg('#fff1c9'); g.tiles(V.x0 - 40, V.y0, V.x1 - V.x0 + 80, 690 - V.y0, 90, '#fff1c9', '#ffe7ad');
      g.rr(70, 120, 250, 200, 14, '#ffffff', 8); g.rect(86, 136, 218, 168, '#9fe0ff', 0); g.circ(250, 190, 30, C.yellow, 0); g.line([195, 136, 195, 304], '#ffffff', 7);
      g.band(690, 'bottom', '#8fd1c8', 7); g.band(736, 'bottom', '#f4f0e6', 7);
      g.ell(150, 708, 110, 24, '#e8eef6'); g.ell(150, 704, 84, 16, '#ffffff', 4);
      // パン（さいしょは上に出ている）
      if (s.k === 0) for (const x of [355, 505]) { g.rr(x - 52, 362, 104, 96, 26, '#f6d29a'); g.rr(x - 42, 372, 84, 80, 20, '#fff1d0', 0); }
      g.shadow(430, 696, 210, 16);
      g.rr(250, 440, 360, 252, 70, '#ff7b7b'); g.rr(250, 560, 360, 26, 0, '#ffd0d0', 0); g.rr(250, 440, 360, 252, 70, null);
      g.rr(282, 444, 296, 28, 14, '#ffa3a3', 0); for (const x of [355, 505]) g.rr(x - 58, 448, 116, 18, 9, s.k === 1 ? '#ff8a2a' : '#2b2140', 0);
      if (s.k === 1) { for (const x of [355, 505]) g.glow(x, 450, 90, '#ffb03a', 0.55); for (let i = 0; i < 3; i++) { const k = (s.t * 1.5 + i / 3) % 1; g.alpha(1 - k, () => g.curve([300 + i * 110, 430 - k * 120, 312 + i * 110, 400 - k * 120, 300 + i * 110, 370 - k * 120], '#ffffff', 7)); } }
      g.hl(300, 500, 40, 16, -0.4, 0.4); g.rr(300, 640, 70, 26, 10, '#2b2140', 0);
      g.rr(612, 476, 20, 186, 10, '#c74d4d', 0); g.rr(604, lerp(462, 602, lv) + d * 0.2, 96, 42, 16, '#3a3f52');
      // とび出すトースト
      if (s.k === 2) for (let i = 0; i < 2; i++) {
        const t = clamp((a2 - 0.02) / 0.3), x = lerp(355 + i * 150, 120 + i * 60, E.ioQ(t)), y = lerp(430, 664 - i * 26, t) - 360 * Math.sin(PI * t);
        g.at(x, y, (i ? -1 : 1) * PI * 2 * t, 1, lerp(1, 0.55, clamp(t * 3 - 2)), () => { g.rr(-54, -50, 108, 100, 28, '#c97a2e'); g.rr(-42, -38, 84, 76, 18, '#eaa55a', 0); if (i) g.rr(-18, -14, 36, 28, 6, '#ffe27a', 4); });
      }
    },
  },
  alarm: {
    bg(g, s, V, d) {
      const a2 = ag2(s), mo = a2 >= 0 ? E.outQ(clamp(a2 / 0.3)) : 0;
      g.bg(g.mix('#8d93c9', '#fff1d6', mo));
      g.rr(110, 90, 330, 330, 12, '#ffffff', 8); g.rect(126, 106, 298, 298, g.mix('#2a2f6b', '#9fe0ff', mo), 0);
      if (mo > 0) { g.circ(330, 330 - 120 * mo, 50, C.yellow, 0); g.cloud(200, 200, 0.35); }
      else { g.circ(340, 170, 30, '#fff3b0', 0); g.circ(354, 160, 26, '#2a2f6b', 0); }
      for (const sd of [-1, 1]) { const w = lerp(150, 40, mo); g.rr(sd < 0 ? 100 : 450 - w, 80, w, 360, 18, '#ff9fbd'); for (let i = 1; i < 3; i++) g.line([(sd < 0 ? 100 : 450 - w) + w * i / 3, 96, (sd < 0 ? 100 : 450 - w) + w * i / 3, 430], '#f07fa0', 5); }
      g.band(640, 'bottom', '#b07b4f', 7); g.band(680, 'bottom', '#94643d', 7);
      const a1 = ag1(s), ringing = s.k === 0 || (s.k === 1 && a1 > 0.5), sn = s.k === 1;
      const wob = ringing ? Math.sin(s.t * 55) * (sn ? 0.04 : 0.06) : jig(s.k ? s.age : 9, 0.06, 20, 8), [sx, sy] = squash(s.k ? s.age : 9, 0.14);
      g.shadow(500, 644, 190, 18);
      g.at(500, 640, wob, sx, sy * (1 - d / 300), () => {
        g.line([-90, -20, -130, 4], C.ol, 12); g.line([90, -20, 130, 4], C.ol, 12);
        for (const sd of [-1, 1]) g.at(sd * 100, -236, sd * 0.5, 1, 1, () => { g.path('M-62 20 C-62 -50 62 -50 62 20 Z', '#ffd23f'); g.rr(-8, -46, 16, 16, 4, C.ol, 0); });
        g.line([0, -226, 0, -250], C.ol, 8); g.at(0, -250, ringing ? Math.sin(s.t * 80) * 0.6 : 0, 1, 1, () => { g.line([0, 0, 0, -20], C.ol, 6); g.line([-34, -22, 34, -22], C.ol, 10); });
        g.circ(0, -110, 150, '#ff5a5f'); g.circ(0, -110, 118, '#ffffff', 6);
        for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2, r1 = i % 3 ? 100 : 88; g.line([Math.cos(a) * r1, -110 + Math.sin(a) * r1, Math.cos(a) * 108, -110 + Math.sin(a) * 108], C.ol, i % 3 ? 4 : 8); }
        g.line([0, -110, -42, -76], C.ol, 12); g.line([0, -110, 0, -196], C.ol, 8); g.circ(0, -110, 12, C.red, 4);
        g.rr(-34, -270, 68, 22, 8, '#8f9bb0');
        g.hl(-70, -190, 40, 18, -0.6, 0.5);
      });
      if (ringing) { const k = sn ? 0.7 : 1; for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) g.arc(500 + sd * 40, 470, 210 + i * 30, sd < 0 ? PI - 0.5 : -0.5, sd < 0 ? PI + 0.5 : 0.5, 'rgba(255,255,255,0.85)', 8 * k); say(g, s, sn ? 'ジリ…' : 'ジリリリ', 560, 170 + Math.sin(s.t * 40) * 4, { size: 72 * k, f: C.yellow, o: 12 }); }
    },
  },
};
const T_PRESS = {
  id: 'hit-press', acts: ['hit'], modes: ['one'], sfx: (k, v) => v.k === 'party' ? (k === 1 ? 'click' : 'pop') : v.k === 'toaster' ? (k === 1 ? 'click' : 'bell') : v.k === 'bell' ? 'bell' : 'smack', vars: PRESS,
  draw(g, s, v) {
    const V = g.V, p = s.p, d = v.D * (1 - clamp(p / 0.12)), top = typeof v.top === 'function' ? v.top(s.k + 1) : v.top;
    g.mirror(s.side, () => {
      PRS[v.k].bg(g, s, V, d);
      g.arm(v.bx - 2 + (v.k === 'toaster' ? 150 : 270) * p, top + 10 + d - 240 * p, -PI / 2 - 0.22 - 0.2 * p, { hand: 'palm', s: 1 + 0.14 * p });
    });
  },
  hit(g, s, k, v) {
    const x = g.mx(s.lastSide, v.bx), L = g.mx(s.lastSide, 300);
    g.fx.shake(k === 2 ? 10 : 6, 0.14);
    if (v.k === 'party') {
      if (k === 1) { g.fx.pop('パッ', L, 560, { size: 110, c: C.yellow }); g.fx.flash('#fff6cf', 0.35, 0.15); }
      else { g.fx.pop('おめでとう！', g.mx(s.lastSide, 400), 690, { size: 100, c: C.yellow }); g.fx.confetti(60); for (const fx of [290, 710]) g.fx.burst(g.mx(s.lastSide, fx), 400, { n: 10, c: [C.red, C.yellow, C.blue, C.green], shape: 'conf', sp: [300, 700], size: [14, 24], g: 700, dir: -PI / 2 + (fx < 500 ? 0.4 : -0.4), spread: 1.2 }); g.sfx('cheer'); }
    } else if (v.k === 'bell') {
      g.fx.ring(x, 690, { r1: 260, sy: 0.45, w: 12 }); g.fx.pop(k === 1 ? 'チーン' : 'チーン！', g.mx(s.lastSide, 730), 470, { size: 92, c: C.yellow });
      if (k === 2) { g.fx.hearts(g.mx(s.lastSide, 330), 300, 6); g.sfx('meow'); }
    } else if (v.k === 'toaster') {
      if (k === 1) g.fx.pop('カチッ', g.mx(s.lastSide, 760), 380, { size: 90 });
      else { g.fx.pop('チン！', g.mx(s.lastSide, 480), 230, { size: 120, c: C.yellow }); g.fx.stars(g.mx(s.lastSide, 400), 330, 8); g.fx.burst(g.mx(s.lastSide, 430), 440, { n: 8, c: ['#eaa55a', '#c97a2e'], shape: 'chip', sp: [200, 500], size: [8, 14] }); }
    } else {
      g.fx.lines(x, 400, { n: 10, r0: 120, r1: 230, a0: PI * 0.9, arc: PI * 1.2 });
      if (k === 1) g.fx.pop('ピタッ', L, 280, { size: 96 });
      else { g.fx.pop('おはよう！', g.mx(s.lastSide, 640), 200, { size: 100, c: '#ff8a3d' }); g.fx.flash('#fff6cf', 0.5, 0.3); g.fx.notes(g.mx(s.lastSide, 270), 260, 5); g.sfx('chime'); }
    }
  },
};

/* ---------- 卵を割る（ボウル・卵かけごはん・目玉焼き） ---------- */
const EGG_D = 'M0 -74 C42 -74 60 -20 60 16 C60 52 34 74 0 74 C-34 74 -60 52 -60 16 C-60 -20 -42 -74 0 -74 Z';
const EGG_ZZ = [-62, 22, -40, 38, -20, 18, 0, 40, 20, 20, 40, 38, 62, 22];
const EGG = [
  { k: 'bowl', name: '卵を割る', short: '卵', theme: 'kitchen', shell: '#fffaf2', rim: [646, 594], land: [500, 626] },
  { k: 'rice', name: '卵かけごはん', short: '卵ごはん', theme: 'kitchen', shell: '#f1c99c', rim: [640, 600], land: [470, 548] },
  { k: 'pan', name: '目玉焼きを作る', short: '目玉焼き', theme: 'kitchen', shell: '#fffaf2', rim: [668, 650], land: [450, 688] },
];
function yolk(g, x, y, r, sy = 0.75) { g.ell(x, y, r, r * sy, '#ffb21f'); g.ell(x - r * 0.1, y - r * 0.1, r * 0.8, r * 0.6 * sy / 0.75, '#ffc93d', 0); g.hl(x - r * 0.35, y - r * 0.3, r * 0.3, r * 0.16, -0.4, 0.75); }
function eggWhite(g, x, y, r, sy, seed = 0) { const P = []; for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, k = 1 + 0.12 * Math.sin(i * 2.7 + seed); P.push(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * sy); } g.blob(P, 'rgba(255,255,255,0.96)', 5); }
function eggHand(g, s, x, y, shell, broken) {
  const p = s.p, hx = x + 127 + 60 * p, hy = y - 134 - 280 * p, rot = 0.45 + 0.3 * p + jig(s.age, 0.08, 26, 9);
  g.at(hx - 86, hy + 50, rot, 1.3, 1.3, () => {
    if (!broken) {
      g.path(EGG_D, shell); g.hl(-24, -24, 14, 28, 0.25, 0.7);
      if (s.k === 1) { g.line(EGG_ZZ.slice(2, 12), C.ol, 5); g.line([0, 40, 6, 58], C.ol, 4); }
    } else {
      g.clipPath('M-90 -100 L90 -100 L90 22 L62 22 L40 38 L20 20 L0 40 L-20 18 L-40 38 L-62 22 L-90 22 Z', () => { g.path(EGG_D, shell); g.ell(0, 30, 54, 20, '#efe6d6', 0); });
      g.line(EGG_ZZ, C.ol, 5);
    }
  });
  g.arm(hx, hy, -PI / 2 - 0.55 + 0.2 * p, { hand: 'grip' });
}
const EGS = {
  bowl: {
    bg(g, s, V) { g.bg('#fff3c9'); g.dots(V.x0, V.y0, V.x1 - V.x0, 560 - V.y0, 90, 9, '#ffe79a'); g.rr(720, 170, 180, 220, 16, '#ffffff', 7); for (let i = 0; i < 3; i++) g.rr(744, 200 + i * 60, 132, 40, 10, i === 1 ? '#ff9fbd' : '#bfe8ff', 0); g.band(560, 'bottom', '#8ccfd8', 7); g.band(600, 'bottom', '#f4f0e6', 7); },
    back(g) { g.shadow(440, 806, 260, 24); g.at(440, 612, () => { g.path('M-232 0 C-232 160 -120 196 0 196 C120 196 232 160 232 0 Z', '#ff8fa8'); g.clipPath('M-232 0 C-232 160 -120 196 0 196 C120 196 232 160 232 0 Z', () => g.ell(0, 190, 300, 90, 'rgba(120,20,50,0.16)', 0)); g.hl(-140, 70, 26, 60, 0.4, 0.4); g.ell(0, 0, 232, 58, '#ffd6df'); g.ell(0, 4, 206, 46, '#ffeef2', 0); }); },
    clip: [440, 616, 206, 46],
    front(g) { g.ell(440, 612, 232, 58, null); },
  },
  rice: {
    bg(g, s, V) { g.bg('#f4ead2'); g.grid(V.x0, V.y0, V.x1 - V.x0, 560 - V.y0, 110, '#d9c59a', 8); g.rect(V.x0 - 40, 540, V.x1 - V.x0 + 80, 30, '#a0673c', 0); g.band(570, 'bottom', '#b9814a', 7); g.band(640, 'bottom', '#a86f43'); g.line([140, 780, 330, 700], '#c94a3a', 14); g.line([170, 800, 360, 716], '#c94a3a', 14); g.rr(90, 700, 70, 140, 20, '#fff', 6); g.rr(104, 650, 42, 60, 12, C.red, 6); },
    back(g) { g.shadow(450, 800, 230, 22); g.at(450, 604, () => { g.rr(-74, 160, 148, 36, 10, '#ffffff'); g.path('M-206 0 C-206 150 -110 180 0 180 C110 180 206 150 206 0 Z', '#ffffff'); g.clipPath('M-206 0 C-206 150 -110 180 0 180 C110 180 206 150 206 0 Z', () => { g.rect(-220, 40, 440, 34, '#2f4f9a', 0); for (let x = -190; x < 200; x += 64) g.arc(x, 120, 22, PI, 0, '#2f4f9a', 6); }); g.path('M-206 0 C-206 150 -110 180 0 180 C110 180 206 150 206 0 Z', null);
      g.ell(0, 0, 206, 50, '#ffffff'); g.blob([-188, 8, -170, -34, -120, -56, -60, -74, 0, -80, 60, -74, 120, -56, 170, -34, 188, 8, 0, 30], '#fbfaf4', 5);
      for (const [x, y, a] of [[-120, -30, 0.3], [-60, -50, -0.4], [10, -60, 0.2], [80, -44, -0.3], [130, -14, 0.5], [-20, -20, 0.6], [50, -10, -0.2], [-90, 0, 0.1]]) g.ell(x, y, 12, 6, '#ece6d6', 0, a); }); },
    front() { },
  },
  pan: {
    bg(g, s, V) { g.bg('#e4ecf2'); g.tiles(V.x0 - 40, V.y0, V.x1 - V.x0 + 80, 560 - V.y0, 100, '#e4ecf2', '#d5e0e9'); g.grid(V.x0 - 40, V.y0, V.x1 - V.x0 + 80, 560 - V.y0, 100, '#c3ced9', 3); g.band(560, 'bottom', '#3a3f52', 7); g.band(900, 'bottom', '#2c3040'); for (const x of [260, 440, 620]) g.line([x - 60, 784, x + 60, 784], '#1e2130', 12);
      for (let i = 0; i < 7; i++) { const a = i / 7 * PI - PI, fl = 18 + 6 * Math.sin(s.t * 30 + i); g.path(`M${440 + Math.cos(a) * 140 - 8} 790 Q${440 + Math.cos(a) * 140} ${790 - fl * 2} ${440 + Math.cos(a) * 140 + 8} 790 Z`, '#5aa9ff', 0); } },
    back(g) { g.rr(-60, 640, 260, 46, 22, '#2b2140'); g.at(440, 690, () => { g.ell(0, 30, 256, 92, '#2f3342'); g.ell(0, 0, 256, 88, '#4a5064'); g.ell(0, 8, 226, 72, '#2a2d3a', 0); g.hl(-120, -20, 60, 12, -0.15, 0.25); }); },
    clip: [440, 698, 226, 72],
    front() { },
  },
};
const T_EGG = {
  id: 'hit-egg', acts: ['hit'], modes: ['one'], sfx: ['knock', 'crack'], vars: EGG,
  draw(g, s, v) {
    const V = g.V, D = EGS[v.k], a2 = ag2(s), [rx, ry] = v.rim, [lx, ly] = v.land;
    g.mirror(s.side, () => {
      D.bg(g, s, V); D.back(g);
      // 中身：落ちて、着地して広がる
      if (a2 >= 0) {
        const t = clamp(a2 / 0.13), x = lerp(rx - 30, lx, t), y = lerp(ry - 20, ly, E.inQ(t));
        if (t < 1) { g.ell(x, y - 10, 30, 46, 'rgba(255,255,255,0.95)', 5); yolk(g, x, y + 6, 30, 0.95); }
        else {
          const e = E.outBack(clamp((a2 - 0.13) / 0.2), 2), [cx, cy, cw, chh] = D.clip || [0, 0, 0, 0];
          const body = () => { if (v.k === 'pan') { eggWhite(g, lx, ly, 46 + 66 * e, 0.62, 1); yolk(g, lx + 4, ly - 4, 36, 0.8); } else if (v.k === 'rice') { eggWhite(g, lx, ly + 6, 50 + 26 * e, 0.5, 2); yolk(g, lx, ly - 4, 34 * (0.8 + 0.2 * e), 0.85); } else { eggWhite(g, lx, ly, 56 + 44 * e, 0.42, 3); yolk(g, lx, ly - 2, 36, 0.7); } };
          if (D.clip) g.clipPath(`M${cx - cw} ${cy} A${cw} ${chh} 0 1 0 ${cx + cw} ${cy} A${cw} ${chh} 0 1 0 ${cx - cw} ${cy} Z`, body); else body();
          if (v.k === 'pan') for (let i = 0; i < 3; i++) { const k = (s.t * 1.6 + i / 3) % 1; g.alpha((1 - k) * 0.7, () => g.curve([lx - 60 + i * 60, ly - 40 - 120 * k, lx - 70 + i * 60, ly - 80 - 120 * k, lx - 56 + i * 60, ly - 120 - 120 * k], '#ffffff', 10)); }
          if (v.k === 'rice') for (let i = 0; i < 2; i++) { const k = (s.t * 1.2 + i / 2) % 1; g.alpha((1 - k) * 0.6, () => g.curve([lx - 90 + i * 180, ly - 70 - 100 * k, lx - 100 + i * 180, ly - 110 - 100 * k, lx - 84 + i * 180, ly - 150 - 100 * k], '#ffffff', 10)); }
        }
      }
      D.front(g);
      eggHand(g, s, rx, ry, v.shell, s.k === 2);
    });
  },
  hit(g, s, k, v) {
    const [rx, ry] = v.rim, x = g.mx(s.lastSide, rx), L = g.mx(s.lastSide, 300);
    g.fx.shake(k === 2 ? 7 : 4, 0.1); g.fx.burst(x, ry, { n: k === 2 ? 10 : 5, c: [v.shell, '#ffffff'], shape: 'chip', sp: [200, 500], size: [8, 16], g: 1600 });
    if (k === 1) { g.fx.pop('コン', L, ry - 170, { size: 92 }); return; }
    g.fx.pop(v.k === 'pan' ? 'ジュー！' : v.k === 'rice' ? 'ツルン' : 'パカッ', L, ry - 190, { size: 108, c: C.yellow });
    g.fx.stars(g.mx(s.lastSide, v.land[0]), v.land[1] - 60, 7);
    if (v.k === 'pan') { g.fx.burst(g.mx(s.lastSide, v.land[0]), v.land[1], { n: 12, c: ['#fff6b0', '#ffffff'], shape: 'dot', sp: [200, 600], size: [6, 12], g: 1200, life: [0.3, 0.6] }); g.sfx('splash'); }
    else g.sfx('bubble');
  },
};
/* ---------- 手刀で割る（瓦・板・レンガ） ---------- */
const CHOP = [
  { k: 'kawara', name: '瓦割り', short: '瓦割り', theme: 'dojo', n: 6, th: 24, gap: 6, c: '#58627c', c2: '#8a95b2' },
  { k: 'ita', name: '板割り', short: '板割り', theme: 'dojo', n: 3, th: 44, gap: 8, c: '#e6b773', c2: '#f3d29d', grain: 1 },
  { k: 'renga', name: 'レンガ割り', short: 'レンガ', theme: 'dojo', n: 4, th: 38, gap: 5, c: '#c9583e', c2: '#e07a5c', dots: 1 },
];
// 手刀（横から見た手）。x,y = 小指側のふちの当たる所、a = 回転（0 で指先が左）、fa = 前腕の向き（ひじ→手首）
function chopArm(g, x, y, a, fa, sleeve = '#ffffff') {
  const ca = Math.cos(a), sa = Math.sin(a), wx = x + 138 * ca + 34 * sa, wy = y + 138 * sa - 34 * ca;
  const back = fa + PI, L = g._toEdge(wx, wy, back) + 40, ex = wx + Math.cos(back) * L, ey = wy + Math.sin(back) * L;
  g.taper(ex, ey, wx, wy, 66, 44, C.skin);
  const k = Math.min(0.62, 300 / L), sx = lerp(wx, ex, k), sy = lerp(wy, ey, k);
  g.taper(ex, ey, sx, sy, 86, 76, sleeve); g.ell(sx, sy, 76, 28, sh(sleeve, -0.08), 6, fa + PI / 2);
  g.at(x, y, a, 1, 1, () => {
    g.path('M-128 -6 Q-140 -30 -120 -46 L-10 -56 Q40 -78 104 -76 Q150 -70 150 -30 L146 0 L-116 2 Q-128 2 -128 -6 Z', C.skin);
    g.line([-118, -18, -20, -20], sh(C.skin, -0.2), 4); g.line([-112, -34, -16, -40], sh(C.skin, -0.2), 4);
    g.cap(70, -74, -6, -66, 17, C.skin); g.line([20, -60, -8, -60], sh(C.skin, -0.25), 3);
    g.hl(40, -56, 40, 8, -0.1, 0.4);
  });
}
const CHS = {
  kawara: (g, s, V) => {
    g.bg('#e5bf87'); for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1; x += 90) g.line([x, V.y0, x, 860], '#cf9f62', 5);
    g.rect(V.x0 - 40, 330, V.x1 - V.x0 + 80, 20, '#9a6438', 0);
    g.rr(120, 120, 150, 330, 8, '#fffaf0', 6); g.rect(112, 110, 166, 18, '#6b3f22', 0); g.rect(112, 444, 166, 18, '#6b3f22', 0);
    say(g, s, '気', 195, 210, { size: 96, f: C.ol, font: '"Zen Kaku Gothic New", serif', w: 900 }); say(g, s, '合', 195, 340, { size: 96, f: C.ol, font: '"Zen Kaku Gothic New", serif', w: 900 });
    g.band(860, 'bottom', '#cdd68a', 7); for (let x = Math.floor(V.x0 / 220) * 220; x < V.x1; x += 220) g.line([x, 860, x - 60, 1500], '#3d3a2a', 6);
  },
  ita: (g, s, V) => {
    g.bg('#1d2557', '#3a2a7a');
    for (const x of [200, 800]) g.alpha(0.14, () => g.poly([x - 30, V.y0, x + 30, V.y0, 500 + (x - 500) * 0.3 + 200, 860, 500 + (x - 500) * 0.3 - 200, 860], '#ffffff', 0));
    g.rr(120, 110, 300, 124, 14, '#ffffff', 7); g.rr(132, 122, 276, 100, 8, '#e8402f', 0); say(g, s, '空手', 270, 173, { size: 80, f: '#ffffff', font: '"Zen Kaku Gothic New", serif', w: 900 });
    for (let i = 0; i < 9; i++) { const x = 80 + i * 105; g.circ(x, 420, 34, '#2b2f5e', 0); g.rr(x - 40, 444, 80, 100, 30, '#2b2f5e', 0); }
    g.band(860, 'bottom', '#3a7bd5', 7); g.rect(V.x0 - 40, 900, V.x1 - V.x0 + 80, 600, '#e8402f', 0);
  },
  renga: (g, s, V) => {
    g.sky('#ffb07a', '#ffe2b8', 600); g.sun(780, 260, 80, '#fff1b0');
    g.path('M-200 600 L120 330 L300 470 L520 260 L760 520 L900 420 L1200 600 Z', '#c98a6a', 0);
    g.at(150, 420, () => { g.rect(-14, 40, 28, 140, '#5a3a2a', 0); g.circ(0, 20, 60, '#3f7a4a', 0); g.circ(-46, 50, 40, '#3f7a4a', 0); g.circ(46, 50, 40, '#3f7a4a', 0); });
    g.band(600, 'bottom', '#d9c29a', 7); for (let y = 640, h = 30; y < V.y1; y += h, h *= 1.3) g.line([V.x0 - 40, y, V.x1 + 40, y], '#c7ad80', 4);
    g.band(860, 'bottom', '#cdb487');
  },
};
const T_CHOP = {
  id: 'hit-chop', acts: ['hit'], modes: ['one'], sfx: 'break', vars: CHOP,
  init(s) { const r = s.r; s.my.j = Array.from({ length: 8 }, () => [r() * 18 - 9, r() * 18 - 9, r() * 18 - 9, r() * 18 - 9]); },
  draw(g, s, v) {
    const V = g.V, a1 = ag1(s), a2 = ag2(s), top = 760 - v.n * (v.th + v.gap) + v.gap, half = Math.ceil(v.n / 2);
    const t1 = a1 >= 0 ? E.outBack(clamp(a1 / 0.14), 2) : 0, t2 = a2 >= 0 ? E.outBack(clamp(a2 / 0.18), 1.6) : 0;
    g.mirror(s.side, () => {
      CHS[v.k](g, s, V);
      g.shadow(500, 878, 330, 20);
      for (const x of [230, 650]) { g.rr(x, 760, 120, 118, 8, '#a3abbd'); g.rr(x + 26, 784, 26, 70, 6, '#7e879c', 0); g.rr(x + 68, 784, 26, 70, 6, '#7e879c', 0); g.rect(x + 4, 764, 112, 8, '#c4cbd8', 0); }
      for (let i = v.n - 1; i >= 0; i--) {
        const y0 = top + i * (v.th + v.gap), th = v.th, b1 = s.k >= 1 && i < half, b2 = s.k >= 2, j = s.my.j[i];
        const look = (pts, x0, x1) => {
          g.poly(pts, v.c); g.clipPath('M' + pts.map((q, n) => (n % 2 ? q + ' ' : (n ? 'L' : '') + q + ' ')).join(''), () => { g.rect(x0 - 10, y0 + 3, x1 - x0 + 20, Math.min(9, th * 0.3), v.c2, 0); if (v.grain) for (const f of [0.45, 0.75]) g.line([x0 + 10, y0 + th * f, x1 - 10, y0 + th * f + 3], sh(v.c, -0.22), 3); if (v.dots) for (let x = x0 + 30; x < x1 - 20; x += 70) g.circ(x, y0 + th * 0.62, 4, sh(v.c, -0.3), 0); });
          g.poly(pts, null);
        };
        if (!b1 && !b2) { look([260, y0, 740, y0, 740, y0 + th, 260, y0 + th], 260, 740); continue; }
        for (const sd of [-1, 1]) {
          const X = 500 + sd * 240, jag = [500 + j[0], y0, 500 + j[1], y0 + th * 0.35, 500 + j[2], y0 + th * 0.7, 500 + j[3], y0 + th];
          const pts = sd < 0 ? [X, y0, ...jag, X, y0 + th] : [X, y0, ...jag, X, y0 + th];
          const r1 = b1 ? 0.06 * t1 : 0, r2 = 0.34 * t2 + (b1 ? 0.04 * t2 : 0), px = 500 + sd * 150;
          g.at(px, 760, -sd * r2, 1, 1, () => g.at(-px, -760 + (b1 ? 30 * t2 : 0), () => g.at(X, y0 + th, -sd * r1, 1, 1, () => g.at(-X + sd * 4 * t1, -(y0 + th), () => look(pts, Math.min(X, 500), Math.max(X, 500))))));
        }
      }
      // 手刀
      const p = s.p, hx = 500 + 90 * p, hy = top - 2 - 320 * p;
      chopArm(g, hx, hy, 0.95 * p + jig(s.age, 0.05, 30, 10), lerp(-PI + 0.55, -PI / 2 - 0.45, p));
    });
  },
  hit(g, s, k, v) {
    const x = g.mx(s.lastSide, 500), top = 760 - v.n * (v.th + v.gap) + v.gap, L = g.mx(s.lastSide, 330);
    g.fx.burst(x, top + 20, { n: k === 2 ? 18 : 10, c: [v.c, v.c2], shape: 'chip', sp: [300, 800], size: [12, 24], spread: PI * 1.4 });
    g.fx.smoke(x, k === 2 ? 760 : top + 30, k === 2 ? 9 : 4, '#f2eee4');
    if (k === 1) { g.fx.pop('バキッ', L, top - 150, { size: 100 }); g.fx.shake(8, 0.12); g.fx.lines(x, top, { n: 10, r0: 90, r1: 200, a0: PI, arc: PI }); }
    else { g.fx.pop('押忍！', g.mx(s.lastSide, 560), 150, { size: 130, c: C.yellow }); g.fx.shake(14, 0.2); g.fx.stars(x, top - 40, 9); g.fx.ring(x, 700, { r1: 320, sy: 0.4, w: 16 }); if (v.k === 'ita') g.sfx('cheer'); }
  },
};
/* ---------- 指で押す（エンターキー・レジ・ピアノ） ---------- */
const KEY = [
  { k: 'enter', name: 'エンターキーを押す', short: 'エンター', theme: 'home', spots: [[752, 704], [752, 704]] },
  { k: 'camera', name: '写真をとる', short: 'カメラ', theme: 'animal', spots: [[620, 552], [620, 552]] },
  { k: 'watch', name: '10秒ぴったりで止める', short: 'タイマー', theme: 'sports', spots: [[658, 452], [658, 452]] },
];
// 人さし指で押す：p=0 で指先が (tx, ty)
function poke(g, s, tx, ty) {
  const p = s.p, ang = -PI / 2 - 0.35 + 0.12 * p, r = ang + PI / 2, sc = 1 + 0.1 * p;
  const ox = (-24 * Math.cos(r) + 143 * Math.sin(r)) * sc, oy = (-24 * Math.sin(r) - 143 * Math.cos(r)) * sc;
  g.arm(tx - ox + 70 * p, ty - oy - 250 * p, ang, { hand: 'point', s: sc });
}
const KYS = {
  enter: {
    bg(g, s, V, kd) {
      g.bg('#dfe7ff'); g.rr(40, 150, 140, 200, 10, '#ffffff', 7); g.rect(56, 166, 108, 168, '#9fe0ff', 0); g.line([110, 166, 110, 334], '#ffffff', 7);
      g.rr(860, 300, 70, 90, 14, '#ff9f6b'); g.circ(895, 270, 44, C.leaf, 0); g.circ(870, 290, 30, C.green, 0);
      g.band(560, 'bottom', '#c98b57', 7); g.band(900, 'bottom', '#b07646');
      // モニター
      g.ell(500, 548, 120, 20, '#3a3f52'); g.rect(474, 440, 52, 110, '#3a3f52', 0);
      g.rr(220, 60, 560, 400, 26, '#2b2140'); g.rr(246, 86, 508, 344, 10, '#f6f8ff', 0);
      g.rect(246, 86, 508, 50, '#3a86ff', 0); say(g, s, 'メール', 330, 112, { size: 34, f: '#fff', font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
      const a1 = ag1(s), a2 = ag2(s);
      if (s.k < 2) {
        for (let i = 0; i < 4; i++) g.rr(280, 160 + i * 44, i === 3 ? 260 : 420, 20, 10, '#d3dbef', 0);
        if (s.k === 0) { g.rr(560, 360, 160, 50, 14, C.orange); say(g, s, '送信', 640, 386, { size: 34, f: '#fff', font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); }
        else { g.rr(290, 360, 420, 36, 18, '#d3dbef', 0); g.rr(290, 360, 420 * lerp(0.1, 0.55, E.outQ(clamp(a1 / 0.3))), 36, 18, C.green, 0); g.rr(290, 360, 420, 36, 18, null, 5); }
      } else {
        const e = E.outBack(clamp(a2 / 0.2), 2);
        g.at(500, 250, 0, e, e, () => { g.circ(0, -20, 70, C.green); g.line([-34, -20, -8, 8, 38, -46], '#fff', 16); say(g, s, '送信かんりょう', 0, 110, { size: 44, f: C.ol, font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); });
      }
      // キーボード
      g.shadow(500, 846, 380, 22);
      g.poly([196, 600, 804, 600, 868, 830, 132, 830], '#4a5068'); g.poly([132, 830, 868, 830, 870, 852, 130, 852], '#33384c');
      for (let r = 0; r < 4; r++) {
        const y0 = 614 + r * 52, y1 = y0 + 42, f0 = (y0 - 600) / 230, f1 = (y1 - 600) / 230;
        const l0 = lerp(208, 146, f0), l1 = lerp(208, 146, f1), R0 = lerp(792, 854, f0) - 110, R1 = lerp(792, 854, f1) - 110, n = 9;
        for (let i = 0; i < n; i++) g.poly([lerp(l0, R0, i / n) + 3, y0, lerp(l0, R0, (i + 1) / n) - 3, y0, lerp(l1, R1, (i + 1) / n) - 3, y1, lerp(l1, R1, i / n) + 3, y1], '#eef1f8', 4);
      }
      g.at(0, kd, () => { g.poly([700, 668, 806, 668, 826, 768, 712, 768], C.orange); g.line([790, 694, 790, 728, 736, 728], '#ffffff', 9); g.path('M730 728 L748 714 L748 742 Z', '#ffffff', 0); });
      // 飛んでいく紙ひこうき
      if (a2 > 0.02) { const t = clamp((a2 - 0.02) / 0.3), sc2 = lerp(0.5, 1.5, t), q = a2 * 0.3; g.at(lerp(500, 220, E.outQ(t)) - 200 * q, lerp(250, 70, E.outQ(t)) - 160 * q, -0.35 - 0.2 * t, sc2, sc2, () => { g.path('M-90 10 L90 -40 L-20 50 Z', '#ffffff'); g.path('M-20 50 L90 -40 L0 20 Z', '#dfe7ff'); g.path('M-20 50 L0 20 L-10 70 Z', '#c3cfee'); }); }
    },
  },
  camera: {
    bg(g, s, V, kd) {
      const a1 = ag1(s), a2 = ag2(s), fl = s.k ? Math.exp(-s.age * 8) : 0;
      g.bg('#ffe1d2'); g.band(520, 'bottom', '#e7b98e', 7);
      for (const sd of [-1, 1]) { const x = 500 + sd * 330; g.line([x, 520, x, 250], '#5c6478', 8); g.line([x, 520, x - 40, 560], '#5c6478', 8); g.line([x, 520, x + 40, 560], '#5c6478', 8); g.rr(x - 60, 150, 120, 110, 10, '#ffffff'); g.glow(x, 205, 110, '#fff6cf', 0.4 + 0.5 * fl); }
      // ねこのモデル（1枚目はまばたき、2枚目はポーズ）
      g.ell(500, 492, 160, 40, '#ff9fbd'); g.ell(500, 486, 150, 30, '#ffb8cf', 0);
      g.path('M570 470 Q660 450 640 380 Q630 360 616 372 Q630 420 560 440 Z', '#ffb35c');
      g.ell(500, 420, 92, 80, '#ffb35c'); g.ell(500, 440, 54, 52, '#fff4e6', 0);
      const pose = s.k === 2 ? E.outBack(clamp(a2 / 0.2)) : 0;
      g.ell(456, 486, 30, 18, '#fff4e6'); if (pose > 0) g.at(560, 420, -1.6 * pose, 1, 1, () => g.ell(0, -40, 22, 44, '#ffb35c')); else g.ell(544, 486, 30, 18, '#fff4e6');
      catHead(g, 500, 300, 1.15, s.k === 1 && a1 < 0.45 ? 2 : s.k === 2 ? 1 : 0);
      // カメラ（後ろから見たところ）
      for (const [x2, y2] of [[380, 1000], [620, 1000], [500, 1030]]) g.line([500, 790, x2, y2], '#3a3f52', 14);
      g.rr(330, 574, 340, 30, 12, '#5fbfa9'); g.rr(380, 580, 150, 10, 4, '#2b2140', 0);
      g.rr(310, 594, 380, 214, 40, '#7dd3c0'); g.rect(312, 720, 376, 40, '#fff6e5', 0); g.rr(310, 594, 380, 214, 40, null); g.heart(500, 742, 34, C.pink, 4); g.star(420, 740, 14, 6, 5, C.yellow, 3); g.star(580, 740, 14, 6, 5, C.yellow, 3);
      g.rr(350, 628, 100, 66, 14, '#2b2140'); g.hl(380, 646, 18, 8, -0.4, 0.5); g.rr(560, 628, 96, 52, 10, g.mix('#fff7d6', '#ffffff', fl)); if (fl > 0.05) g.glow(608, 654, 160, '#ffffff', fl);
      g.rr(596, 544 + kd, 48, 30, 12, C.red); g.rr(600, 566, 40, 14, 4, '#5fbfa9', 0);
      // 出てくる写真
      for (let j = 0; j < s.k; j++) {
        const t = clamp((j ? a2 : a1) / 0.3), [dx, dy, dr] = j ? [215, 820, 0.12] : [185, 620, -0.18], sc = lerp(0.45, 1, E.outBack(t));
        g.at(lerp(455, dx, E.outQ(t)), lerp(586, dy, t) - 170 * Math.sin(PI * t), dr * t, sc, sc, () => { g.rr(-80, -94, 160, 188, 8, '#ffffff'); g.rect(-66, -80, 132, 132, '#ffe1d2', 0); g.rect(-66, 30, 132, 22, '#ff9fbd', 0); catHead(g, 0, -4, 0.62, j ? 1 : 2); if (j) g.star(46, -56, 16, 7, 5, C.yellow, 3); });
      }
    },
  },
  watch: {
    bg(g, s, V, kd) {
      const T = s.k === 0 ? 0 : s.k === 1 ? Math.min(10, 10 * s.age / s.spr) : 10, done = s.k === 2, cx = 460, cy = 650, R = 220;
      g.sky('#7fd0ff', '#dff4ff', 330);
      g.band(300, 470, '#5a5f8c'); for (let r = 0; r < 2; r++) for (let x = Math.floor(V.x0 / 64) * 64 + r * 32; x < V.x1; x += 64) g.circ(x, 340 + r * 64, 18, ['#ff9fbd', '#ffd23f', '#9cf2d8', '#c4a6ff'][((x / 32 | 0) + r) & 3], 0);
      g.band(470, 'bottom', '#e2683c', 7); for (let i = -6; i <= 6; i++) g.line([500 + i * 120, 470, 500 + i * 330, V.y1 + 300], '#ffffff', 6);
      g.shadow(cx, cy + R + 30, R * 0.9, 24);
      g.ring(cx, cy - R - 58, 30, '#aeb8c8', 12); g.rr(cx - 26, cy - R - 40, 52, 46, 10, '#aeb8c8');
      g.at(cx + (R + 20) * 0.707, cy - (R + 20) * 0.707, PI / 4, 1, 1, () => { g.rr(-16, -14, 32, 30, 6, '#aeb8c8'); g.rr(-32, -40 + kd, 64, 34, 12, C.red); g.hl(-10, -30 + kd, 12, 5, 0, 0.6); });
      if (done) g.glow(cx, cy, R * 1.5, C.yellow, 0.55);
      g.circ(cx, cy, R, done ? C.gold : '#cfd6e2'); g.circ(cx, cy, R - 28, '#ffffff', 6);
      for (let i = 0; i < 20; i++) { const a = i / 20 * PI * 2 - PI / 2, r1 = i % 2 ? R - 52 : R - 66; g.line([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * (R - 40), cy + Math.sin(a) * (R - 40)], C.ol, i % 2 ? 4 : 8); }
      say(g, s, '10', cx, cy - R + 92, { size: 40, f: C.ol, font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
      g.rr(cx - 96, cy + 46, 192, 74, 14, '#1c2a3a'); say(g, s, (T < 10 ? '0' : '') + T.toFixed(2), cx, cy + 84, { size: 56, f: done ? C.yellow : '#7dff8a' });
      const a = T / 10 * PI * 2 - PI / 2; g.line([cx, cy, cx + Math.cos(a) * (R - 60), cy + Math.sin(a) * (R - 60)], C.red, 10); g.circ(cx, cy, 16, C.red, 5);
    },
  },
};
const T_KEY = {
  id: 'hit-key', acts: ['hit'], modes: ['one'], sfx: (k, v) => v.k === 'enter' ? 'smack' : 'click', vars: KEY,
  draw(g, s, v) {
    const V = g.V, p = s.p, kd = 12 * (1 - clamp(p / 0.1)), [A, B] = v.spots, m = s.k === 0 ? 0 : s.k === 1 ? E.ioQ(clamp(s.u / 0.45)) : 1;
    s.my.fx = lerp(A[0], B[0], m);
    g.mirror(s.side, () => {
      KYS[v.k].bg(g, s, V, kd);
      poke(g, s, s.my.fx, lerp(A[1], B[1], m) + kd);
    });
  },
  hit(g, s, k, v) {
    const [x0, y0] = v.spots[k - 1], x = g.mx(s.lastSide, x0), L = g.mx(s.lastSide, 330);
    g.fx.shake(k === 2 ? 8 : 5, 0.1);
    if (v.k === 'enter') { g.fx.lines(x, y0, { n: 10, r0: 70, r1: 170 }); g.fx.pop(k === 1 ? 'ッターン' : 'ッターン！', L, 540, { size: 96, c: k === 2 ? C.yellow : '#ffffff' }); if (k === 2) { g.fx.stars(g.mx(s.lastSide, 500), 250, 8); g.sfx('swoosh'); } }
    else if (v.k === 'camera') { g.fx.flash('#ffffff', 0.7, 0.16); g.fx.pop(k === 1 ? 'パシャ' : 'ばっちり！', L, 150, { size: k === 2 ? 110 : 96, c: k === 2 ? C.yellow : '#ffffff' }); if (k === 2) { g.fx.hearts(g.mx(s.lastSide, 500), 260, 6); g.sfx('magic'); } }
    else { g.fx.ring(x, y0, { r1: 140, w: 10 }); if (k === 1) g.fx.pop('スタート', L, 230, { size: 92 }); else { g.fx.pop('ぴったり！', g.mx(s.lastSide, 500), 170, { size: 116, c: C.yellow }); g.fx.confetti(56); g.fx.stars(g.mx(s.lastSide, 500), 650, 9); g.sfx('cheer'); } }
  },
};
/* ---------- ハエたたき（上から見たテーブル） ---------- */
const SWAT = [
  { k: 'fly', name: 'ハエをたたく', short: 'ハエ', theme: 'home', col: C.green, spots: [[320, 590], [650, 580]] },
  { k: 'mosquito', name: '蚊をたたく', short: '蚊', theme: 'nature', col: '#3a86ff', spots: [[330, 600], [660, 590]] },
];
function bug(g, x, y, kind, wing, state, t) {
  // state: 0 飛ぶ / 1 とまる / 2 ぺちゃんこ（目が回る）
  const flat = state === 2;
  g.at(x, y, 0, flat ? 1.25 : 1.3, flat ? 0.75 : 1.3, () => {
    if (kind === 'fly') {
      if (!flat) for (const sd of [-1, 1]) { for (let i = 0; i < 3; i++) g.line([sd * 14, -6 + i * 14, sd * 34, -2 + i * 18], C.ol, 4); }
      for (const sd of [-1, 1]) g.at(sd * 10, -6, sd * (state ? 0.5 : 0.9 + 0.5 * wing), 1, 1, () => g.ell(sd * 22, 18, 16, 34, 'rgba(230,245,255,0.75)', 4));
      g.ell(0, 10, 22, 30, '#3d4660'); g.line([-14, 14, 14, 14], '#5c6a8a', 4); g.line([-12, 26, 12, 26], '#5c6a8a', 4);
      g.circ(0, -22, 18, '#3d4660');
    } else {
      if (!flat) for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) g.line([sd * 6, -8 + i * 8, sd * (40 + i * 6), -30 + i * 36, sd * (46 + i * 8), -10 + i * 44], C.ol, 3);
      for (const sd of [-1, 1]) g.at(sd * 6, -10, sd * (state ? 0.4 : 0.7 + 0.5 * wing), 1, 1, () => g.ell(sd * 14, 20, 11, 30, 'rgba(230,245,255,0.7)', 4));
      g.ell(0, 18, 12, 32, '#2b2f45'); for (const yy of [6, 18, 30]) g.line([-10, yy, 10, yy], '#ffffff', 4);
      g.circ(0, -16, 13, '#2b2f45'); g.line([0, -28, 0, -58], C.ol, 4);
    }
    if (flat) { for (const sd of [-1, 1]) { g.circ(sd * 9, kind === 'fly' ? -24 : -18, 9, '#ffffff', 3); g.arc(sd * 9, kind === 'fly' ? -24 : -18, 5, t * 12, t * 12 + 4.5, C.ol, 3); } }
    else { const ey = kind === 'fly' ? -26 : -18, er = kind === 'fly' ? 11 : 8; g.circ(-9, ey, er, '#e8433f', 3); g.circ(9, ey, er, '#e8433f', 3); g.circ(-11, ey - 3, 3, '#fff', 0); g.circ(7, ey - 3, 3, '#fff', 0); }
  });
  if (flat) for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.1; g.star(x + Math.cos(a) * 60, y - 50 + Math.sin(a) * 18, 14, 6, 5, C.yellow, 3); }
}
const SWS = {
  fly(g, s, V) {
    g.tiles(V.x0 - 60, V.y0 - 60, V.x1 - V.x0 + 120, V.y1 - V.y0 + 120, 110, '#fff8f4', '#ffd9d6');
    for (let x = Math.floor((V.x0 - 60) / 110) * 110 + 55; x < V.x1 + 60; x += 110) g.line([x, V.y0 - 60, x, V.y1 + 60], 'rgba(255,120,120,0.16)', 18);
    g.shadow(520, 350, 190, 150, 0.18); g.circ(510, 330, 180, '#ffffff'); g.circ(510, 330, 142, null, 4);
    g.at(510, 320, -0.2, 1, 1, () => { g.path('M-100 60 L90 60 L20 -110 Z', '#fff4dc'); g.path('M-100 60 L90 60 L80 30 L-90 30 Z', '#ffd0dc', 0); g.path('M-100 60 L90 60 L20 -110 Z', null); g.path('M10 -110 Q-20 -150 30 -160 Q60 -140 40 -100 Z', '#ff4f62'); g.path('M24 -158 L18 -176 L36 -170 Z', C.leaf, 0); g.rr(-80, 44, 160, 14, 6, '#ffb36b', 0); });
  },
  mosquito(g, s, V) {
    g.bg('#4a3a3a'); for (let x = Math.floor((V.x0 - 60) / 120) * 120; x < V.x1 + 60; x += 120) { g.rect(x, V.y0 - 60, 118, V.y1 - V.y0 + 120, '#8a5a3c', 0); g.line([x + 30, V.y0 - 60, x + 40, V.y1 + 60], '#7a4e33', 4); }
    g.glow(200, 200, 420, '#ffcf7a', 0.35);
    g.shadow(560, 330, 170, 130, 0.2); g.circ(550, 320, 160, '#e6f4ff'); g.circ(550, 320, 126, null, 4);
    for (const [x, y, a] of [[490, 310, -0.5], [600, 280, 0.3], [560, 380, 1.4]]) g.at(x, y, a, 1, 1, () => { g.path('M-70 20 Q0 -90 70 20 Z', '#ff4f62'); g.path('M-70 20 Q0 -90 70 20 L60 30 L-60 30 Z', null, 0); g.rr(-74, 16, 148, 20, 10, '#3e9a3c'); for (const sx of [-30, 0, 30]) g.ell(sx, -10 - Math.abs(sx) * 0.3, 4, 7, C.ol, 0); });
    g.at(160, 760, () => { g.ell(0, 30, 110, 40, '#9aa3b5'); g.ell(0, 26, 96, 32, '#cfd6e2', 0); for (let i = 0; i < 4; i++) g.arc(0, 20, 20 + i * 18, i * 1.3, i * 1.3 + 5.4, '#2f7d4f', 12); g.circ(36, 4, 8, '#ff6b3d', 0); });
    for (let i = 0; i < 3; i++) { const k = (s.t * 0.7 + i / 3) % 1; g.alpha((1 - k) * 0.6, () => g.curve([196, 760 - k * 300, 180 + Math.sin(k * 9 + i) * 30, 720 - k * 300, 200, 680 - k * 300], '#e8e4f4', 9)); }
  },
};
const T_SWAT = {
  id: 'hit-swat', acts: ['hit'], modes: ['one'], sfx: 'smack', vars: SWAT,
  draw(g, s, v) {
    const V = g.V, [A, B] = v.spots;
    g.mirror(s.side, () => {
      SWS[v.k](g, s, V);
      // 虫（それぞれ自分の番の少し前にとまる）
      for (let j = 0; j < 2; j++) {
        const [fx, fy] = v.spots[j], land = j - 0.16, hitd = s.k > j, ag = hitd ? (s.k === j + 1 ? s.age : s.age + s.spr) : 0;
        if (hitd) { const off = j === 0 ? Math.max(0, ag - 0.3) : 0; bug(g, fx - 260 * off, fy - 240 * off + Math.sin(off * 12) * 30, v.k, 0, off > 0 ? 0 : 2, s.t); continue; }
        const w = clamp((land - s.ph) / 0.45), bx = fx + 190 * Math.sin(s.t * 5.5 + j * 2.4) * w, by = fy - 150 * w + 70 * Math.sin(s.t * 9 + j) * w;
        bug(g, bx, by, v.k, Math.sin(s.t * 90 + j), w > 0 ? 0 : 1, s.t);
      }
      // ハエたたき（上げると近くなって大きく見える）と影
      const m = s.k === 0 ? 0 : s.k === 1 ? E.ioQ(clamp(s.u / 0.45)) : 1, tx = lerp(A[0], B[0], m), ty = lerp(A[1], B[1], m);
      const p = s.p, sc = 1 + 0.32 * p, ang = -0.5 - 0.2 * p + jig(s.age, 0.04, 30, 12), cx = tx + 70 * p, cy = ty + 30 * p;
      g.at(tx + 40 * p, ty + 60 * p, ang, 1, 1, () => g.rr(-92, -102, 184, 204, 28, `rgba(30,20,50,${0.22 - 0.1 * p})`, 0));
      const gx = cx - 370 * Math.sin(ang) * sc, gy = cy + 370 * Math.cos(ang) * sc;
      g.swatter(gx, gy, ang, sc, v.col);
      g.arm(gx + 6, gy + 8, ang - PI / 2 - 0.1, { hand: 'grip', s: sc * 0.95 });
    });
  },
  hit(g, s, k, v) {
    const [fx, fy] = v.spots[k - 1], x = g.mx(s.lastSide, fx);
    g.fx.shake(k === 2 ? 9 : 6, 0.12); g.fx.lines(x, fy, { n: 12, r0: 120, r1: 230 }); g.fx.burst(x, fy, { n: 8, c: ['#ffffff', C.yellow], shape: 'star', sp: [200, 500], size: [12, 20], g: 400 });
    if (k === 1) g.fx.pop('ペシッ', g.mx(s.lastSide, fx + 60), fy - 230, { size: 100 });
    else { g.fx.pop('スッキリ！', g.mx(s.lastSide, 400), 170, { size: 110, c: C.yellow }); g.fx.stars(g.mx(s.lastSide, 520), 320, 8); }
  },
};
/* ---------- くいを打つ（テントのペグ・トマトの支柱） ---------- */
const PEG = [
  { k: 'sunflower', name: 'ひまわりの支柱を打つ', short: 'ひまわり', theme: 'nature', x: 570, gy: 782, d: [350, 290, 230], w: 38, col: '#e8c48a' },
  { k: 'tomato', name: 'トマトの支柱を打つ', short: 'トマト', theme: 'farm', x: 580, gy: 770, d: [330, 270, 210], w: 38, col: C.wood2 },
];
const PGS = {
  sunflower(g, s, v, V, tau, top) {
    const bloom = s.k >= 2 ? E.outBack(clamp(ag2(s) / 0.25), 2) : 0;
    g.sky('#46b4ff', '#d8f2ff', 560); g.cloud(380, 170, 1.0); g.cloud(820, 110, 0.6);
    g.at(150, 150, () => { g.sun(0, 0, 64); g.arc(-20, -8, 10, PI + 0.4, -0.4, C.ol, 5); g.arc(20, -8, 10, PI + 0.4, -0.4, C.ol, 5); g.arc(0, 10, 22, 0.3 - 0.2 * bloom, PI - 0.3 + 0.2 * bloom, C.ol, 5); });
    for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1; x += 90) { g.line([x + 45, 560, x + 45, 520], '#3e8f3a', 5); g.circ(x + 45, 512, 18, C.yellow, 0); g.circ(x + 45, 512, 8, '#8a5a2b', 0); }
    g.band(556, 'bottom', '#7cc257', 7); for (let y = 600, h = 30; y < V.y1; y += h, h *= 1.3) g.grassTufts(y + h * 0.5, '#6ab34a', (y | 0) % 9, 7);
    g.ell(420, 782, 110, 24, '#8a5a36', 0);
    // ひまわり（支柱にむすぶと立ち上がって、満開になる）
    const sx = 420, hx = lerp(300, 420, tau), hy = lerp(560, 330, tau), mx = lerp(470, 430, tau), my = lerp(520, 560, tau);
    g.curve([sx, 782, mx, my, hx, hy], '#3e8f3a', 18);
    for (const [f, sd] of [[0.35, -1], [0.6, 1]]) { const x = lerp(sx, hx, f) + (mx - (sx + hx) / 2) * Math.sin(PI * f), y = lerp(782, hy, f) + (my - (782 + hy) / 2) * Math.sin(PI * f); g.at(x, y, sd * 0.5 + (1 - tau) * 0.9, 1, 1, () => g.path(`M0 0 Q${sd * 50} -50 ${sd * 110} -10 Q${sd * 60} 30 0 0 Z`, '#4fae45')); }
    const open = 0.55 + 0.25 * tau + 0.35 * bloom;
    g.at(hx, hy, lerp(2.1, 0, tau), 1, 1, () => {
      for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2; g.at(0, 0, a, 1, 1, () => g.ell(0, -(54 + 34 * open), 20, 30 + 18 * open, i % 2 ? '#ffd23f' : '#ffc21a')); }
      g.circ(0, 0, 62, '#8a5a2b'); g.circ(0, 0, 48, '#a0703c', 0); for (let i = 0; i < 8; i++) { const a = i * 0.8; g.circ(Math.cos(a) * 30, Math.sin(a) * 30, 5, '#6b4220', 0); }
      if (tau > 0.9) { g.arc(-20, -8, 10, PI + 0.4, -0.4, C.ol, 5); g.arc(20, -8, 10, PI + 0.4, -0.4, C.ol, 5); g.arc(0, 8, 22, 0.3, PI - 0.3, C.ol, 5); g.ell(-36, 12, 10, 6, 'rgba(255,120,120,0.55)', 0); g.ell(36, 12, 10, 6, 'rgba(255,120,120,0.55)', 0); }
    });
    if (tau > 0.95) g.line([lerp(sx, hx, 0.45) + 10, top + 60, v.x - 18, top + 60], '#fff6e0', 6);
  },
  tomato(g, s, v, V, tau, top) {
    g.sky('#8fd8ff', '#effaff', 520); g.sun(160, 130, 60);
    g.hills(520, '#a9dd84', 50, 5, 4);
    for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1; x += 90) { g.rr(x + 30, 430, 22, 120, 6, '#f3e3c4', 4); } g.rect(V.x0 - 40, 460, V.x1 - V.x0 + 80, 14, '#f3e3c4', 0); g.rect(V.x0 - 40, 500, V.x1 - V.x0 + 80, 14, '#f3e3c4', 0);
    g.band(560, 'bottom', '#9c6b45', 7); for (let y = 620, h = 50; y < V.y1; y += h, h *= 1.3) g.line([V.x0 - 40, y, V.x1 + 40, y], '#86593a', 8);
    g.ell(430, 772, 120, 26, '#7a5236', 0);
    // トマトの木（支柱にむすぶと立ち上がり、赤くなる）
    const red = s.k >= 2 ? E.outQ(clamp(ag2(s) / 0.25)) : 0, sx = 430, tx = lerp(300, 450, tau), ty = lerp(560, 360, tau), mx = lerp(470, 440, tau), my = lerp(470, 560, tau);
    g.curve([sx, 772, mx, my, tx, ty], '#3e8f3a', 16);
    for (const [f, sd] of [[0.3, -1], [0.55, 1], [0.8, -1], [1, 1]]) { const x = lerp(sx, tx, f) + (mx - (sx + tx) / 2) * Math.sin(PI * f), y = lerp(772, ty, f) + (my - (772 + ty) / 2) * Math.sin(PI * f); g.at(x, y, sd * 0.6 + (1 - tau) * 0.8, 1, 1, () => g.path(`M0 0 Q${sd * 40} -30 ${sd * 80} -6 Q${sd * 40} 12 0 0 Z`, '#4fae45')); }
    for (const [f, dx] of [[0.45, 26], [0.7, -30], [0.92, 22]]) { const x = lerp(sx, tx, f) + (mx - (sx + tx) / 2) * Math.sin(PI * f) + dx, y = lerp(772, ty, f) + (my - (772 + ty) / 2) * Math.sin(PI * f) + 30; g.circ(x, y, 40, g.mix('#8fcf4a', '#ee3a33', red)); g.path(`M${x - 14} ${y - 30} L${x} ${y - 22} L${x + 14} ${y - 30} L${x + 6} ${y - 36} L${x - 6} ${y - 36} Z`, '#2f7d3a', 0); g.hl(x - 12, y - 10, 10, 6, -0.5, 0.6); }
    if (tau > 0.95) g.line([lerp(sx, tx, 0.42) + 8, top + 60, v.x - 18, top + 60], '#fff6e0', 6);
  },
};
const T_PEG = {
  id: 'hit-peg', acts: ['hit'], modes: ['one'], sfx: 'knock', vars: PEG,
  draw(g, s, v) {
    const V = g.V, d = v.d, a = s.k ? s.age : 0, depth = d[s.k] + (s.k ? (d[s.k - 1] - d[s.k]) * (1 - E.outQ(clamp(a / 0.08))) : 0), top = v.gy - depth;
    const tau = s.k === 0 ? 0 : s.k === 1 ? 0.3 * E.outBack(clamp(s.age / 0.2)) : 0.3 + 0.7 * E.outBack(clamp(s.age / 0.25), 2.4);
    g.mirror(s.side, () => {
      PGS[v.k](g, s, v, V, tau, top);
      // くい
      const w = v.w;
      g.rr(v.x - w / 2, top, w, depth + 4, 6, v.col); g.line([v.x - 6, top + 14, v.x - 4, v.gy - 10], sh(v.col, -0.2), 4); g.ell(v.x, top + 4, w / 2, 8, sh(v.col, 0.25), 4);
      swing(g, s, v.x, top, 'mallet', { col: v.col, s: 0.82 });
    });
  },
  hit(g, s, k, v) {
    const x = g.mx(s.lastSide, v.x), y = v.gy - v.d[k], L = g.mx(s.lastSide, v.x - 250);
    g.fx.shake(k === 2 ? 9 : 6, 0.12); g.fx.burst(x, v.gy, { n: 8, c: ['#a77b4f', '#8a5a36'], shape: 'dot', sp: [150, 400], size: [8, 14], spread: PI * 0.9 });
    if (k === 1) { g.fx.pop('コン', L, y - 120, { size: 96 }); g.fx.sparks(x, y, 6); return; }
    if (v.k === 'sunflower') { g.fx.pop('ニコッ', g.mx(s.lastSide, 230), 470, { size: 110, c: C.yellow }); g.fx.stars(g.mx(s.lastSide, 420), 330, 9); g.fx.burst(g.mx(s.lastSide, 420), 330, { n: 10, c: [C.yellow, '#ffc21a'], shape: 'leaf', sp: [200, 500], size: [14, 22], g: 300 }); g.sfx('magic'); }
    else { g.fx.pop('まっか！', g.mx(s.lastSide, 300), 240, { size: 110, c: '#ff5a5f' }); g.fx.stars(g.mx(s.lastSide, 420), 420, 8); g.sfx('magic'); }
  },
};
/* ---------- 力だめし（台をたたくとおもりが上がる・2回目で鐘まで） ---------- */
const TEST = [
  { k: 'arcade', name: 'ハンマーゲーム', short: 'ハンマー', theme: 'game', col: '#ff6bd5' },
];
const TY0 = 742, TY1 = 190, PAD = 792;
const TSS = {
  arcade(g, s, V, h) {
    g.bg('#0f0a2a', '#2b0f55');
    for (let i = -12; i <= 12; i++) g.line([500 + i * 40, 800, 500 + i * 220, V.y1 + 300], 'rgba(255,80,220,0.45)', 3); for (let y = 820, d = 20; y < V.y1; y += d, d *= 1.35) g.line([V.x0 - 40, y, V.x1 + 40, y], 'rgba(255,80,220,0.45)', 3);
    for (const [x, y, c] of [[150, 200, '#00e5ff'], [850, 260, '#ffd23f'], [180, 560, '#ff5ad5'], [830, 600, '#7dff8a']]) { g.glow(x, y, 90, c, 0.4); g.ring(x, y, 40, c, 8); }
    g.band(800, 'bottom', 'rgba(0,0,0,0)', 0); g.line([V.x0 - 40, 800, V.x1 + 40, 800], '#ff5ad5', 6);
    g.rr(420, 120, 160, 680, 22, '#1c1640'); g.rr(420, 120, 160, 680, 22, null, 8);
    for (let i = 0; i < 12; i++) { const y = lerp(TY0, TY1, i / 11), on = h >= i / 11 - 0.01, c = g.mix('#00e5ff', '#ff3fa4', i / 11); g.rr(450, y - 18, 100, 34, 8, on ? c : '#2b2560', 0); if (on) g.glow(500, y, 60, c, 0.35); }
    g.rr(410, 40, 180, 80, 16, '#1c1640', 7); say(g, s, String(Math.round(h * 999)), 500, 82, { size: 54, f: h > 0.98 ? C.yellow : '#7dff8a' });
    const crown = s.k === 2 && h > 0.98;
    if (crown) g.at(500, 150, jig(ag2(s) - 0.16, 0.2, 26, 5), 1, 1, () => { g.glow(0, 0, 120, C.yellow, 0.5); g.path('M-60 30 L-60 -20 L-30 6 L0 -40 L30 6 L60 -20 L60 30 Z', C.gold); });
  },
};
const T_TEST = {
  id: 'hit-test', acts: ['hit'], modes: ['one'], sfx: 'thud', vars: TEST,
  init(s) { s.my.rang = 0; },
  draw(g, s, v) {
    const V = g.V, a1 = ag1(s), a2 = ag2(s);
    let h = 0;
    if (s.k === 1) h = s.age < 0.24 ? 0.55 * E.outQ(clamp(s.age / 0.24)) : 0.55 * (1 - E.inQ(clamp((s.age - 0.32) / 0.45)));
    if (s.k === 2) { h = E.outQ(clamp(a2 / 0.16)); if (h > 0.98 && !s.my.rang) { s.my.rang = 1; g.sfx(v.k === 'arcade' ? 'magic' : 'bell'); g.fx.confetti(70); g.fx.pop(v.k === 'arcade' ? '新記録！' : 'カーン！', g.mx(s.side, 300), 170, { size: 110, c: C.yellow }); g.fx.stars(g.mx(s.side, 500), 110, 10); } }
    g.mirror(s.side, () => {
      TSS[v.k](g, s, V, h);
      // たたく台
      const sq = 1 - 0.25 * Math.exp(-(s.k ? s.age : 9) * 18);
      g.shadow(500, 830, 170, 16);
      g.at(500, 826, 0, 1, sq, () => { g.rr(-130, -34, 260, 40, 12, v.k === 'arcade' ? '#ff3fa4' : '#e8402f'); g.rr(-110, -48, 220, 20, 8, '#2b2140'); });
      swing(g, s, 500, PAD - 14, 'mallet', { col: v.col, s: 1.05, rot: 1.3 });
    });
  },
  hit(g, s, k, v) {
    const x = g.mx(s.lastSide, 500);
    g.fx.shake(k === 2 ? 12 : 8, 0.14); g.fx.lines(x, 780, { n: 10, r0: 130, r1: 240, a0: PI, arc: PI }); g.fx.smoke(x, 800, 5, '#f2eee4');
    if (k === 1) g.fx.pop('おしい！', g.mx(s.lastSide, 300), 420, { size: 92 });
    else g.fx.pop('ドーン', g.mx(s.lastSide, 290), 640, { size: 100 });
  },
};
/* ---------- シーソーでとばす（カエル・バスケットボール） ---------- */
const SEE = [
  { k: 'frog', name: 'カエルをとばす', short: 'カエル', theme: 'animal' },
  { k: 'ball', name: 'シーソーシュート', short: 'シュート', theme: 'sports' },
];
const FUL = [360, 778];
function frog(g, x, y, sc, rot, fly, happy) {
  g.at(x, y, rot, sc, sc, () => {
    if (fly) { g.path('M-30 20 Q-70 70 -40 110 L-24 104 Q-44 70 -10 34 Z', '#4fb34a'); g.path('M30 20 Q70 70 40 110 L24 104 Q44 70 10 34 Z', '#4fb34a'); }
    else { g.ell(-56, 30, 34, 22, '#4fb34a'); g.ell(56, 30, 34, 22, '#4fb34a'); }
    g.ell(0, 10, 72, 52, '#5cc657'); g.ell(0, 24, 46, 30, '#d9f5b0', 0);
    for (const sd of [-1, 1]) { g.circ(sd * 34, -36, 24, '#5cc657'); g.circ(sd * 34, -38, 15, '#ffffff', 0); if (happy) g.arc(sd * 34, -36, 8, PI + 0.3, -0.3, C.ol, 5); else g.circ(sd * 34, -38, 8, C.ol, 0); }
    g.arc(0, 0, 30, 0.3, PI - 0.3, C.ol, 5); g.ell(-44, 4, 10, 6, 'rgba(255,120,140,0.55)', 0); g.ell(44, 4, 10, 6, 'rgba(255,120,140,0.55)', 0);
    if (fly) { g.cap(-60, 0, -96, -36, 12, '#4fb34a'); g.cap(60, 0, 96, -36, 12, '#4fb34a'); }
  });
}
function bball(g, x, y, r, rot) { g.at(x, y, rot, 1, 1, () => { g.circ(0, 0, r, '#ff8a2a'); g.clipCirc(0, 0, r, () => { g.line([-r, 0, r, 0], C.ol, 5); g.line([0, -r, 0, r], C.ol, 5); g.arc(-r * 1.25, 0, r * 0.9, -0.9, 0.9, C.ol, 5); g.arc(r * 1.25, 0, r * 0.9, PI - 0.9, PI + 0.9, C.ol, 5); }); g.circ(0, 0, r, null); g.hl(-r * 0.4, -r * 0.4, r * 0.25, r * 0.14, -0.6, 0.5); }); }
const SEES = {
  frog(g, s, V) {
    g.sky('#8fd8ff', '#e4f7ff', 440); g.cloud(700, 140, 0.8);
    for (const [x, r] of [[90, 110], [260, 80], [790, 90], [940, 120]]) { g.rect(x - 16, 300, 32, 160, '#8a6a4a', 0); g.circ(x, 300, r, '#7cc46f', 0); }
    g.band(420, 'bottom', '#86c86d', 0); g.ell(430, 500, 560, 90, '#3fb0d9'); g.ell(430, 492, 520, 70, '#5cc4e8', 0);
    for (const [x, y, k] of [[180, 520, 0.8], [560, 470, 0.7], [700, 520, 0.9]]) g.at(x, y, 0, k, k * 0.45, () => g.path('M0 0 L60 -14 A62 62 0 1 1 60 14 Z', '#4fae45'));
    g.at(330, 512, 0, 1, 0.45, () => { g.path('M0 0 L70 -16 A72 72 0 1 1 70 16 Z', '#3e9a3c'); g.circ(-10, -10, 22, '#ff9fbd', 0); g.circ(-10, -10, 10, '#ffe27a', 0); });
    g.band(580, 'bottom', '#86c86d', 7); for (const x of [110, 150, 860, 900]) { g.line([x, 600, x + 6, 440], '#5a8a3a', 7); g.rr(x - 2, 440, 16, 50, 8, '#8a5a36'); }
  },
  ball(g, s, V) {
    g.sky('#7fd0ff', '#e0f5ff', 560); for (let x = Math.floor(V.x0 / 60) * 60; x < V.x1; x += 60) g.line([x, 420, x, 560], '#9aa3b5', 4); g.line([V.x0 - 40, 420, V.x1 + 40, 420], '#9aa3b5', 6); g.grid(V.x0, 430, V.x1 - V.x0, 130, 30, 'rgba(154,163,181,0.6)', 2);
    g.band(560, 'bottom', '#e2683c', 7); g.line([V.x0 - 40, 640, V.x1 + 40, 640], '#ffffff', 6); g.ell(500, 720, 220, 50, null, 0); g.arc(500, 760, 300, PI + 0.4, -0.4, '#ffffff', 6);
    g.rect(120, 150, 28, 430, '#8f9bb0'); g.rr(150, 80, 240, 150, 12, '#ffffff'); g.rr(216, 120, 108, 80, 6, null, 6);
  },
};
function seeAng(s) {
  if (s.k === 0) return -0.22;
  const a = s.age; if (a < 0.06) return lerp(-0.22, 0.22, a / 0.06);
  return s.k === 1 ? lerp(0.22, -0.22, E.ioQ(clamp((a - 0.25) / 0.4))) : 0.22 + jig(a - 0.06, 0.05, 30, 8);
}
const T_SEESAW = {
  id: 'hit-seesaw', acts: ['hit'], modes: ['one'], sfx: 'boing', vars: SEE,
  init(s) { s.my.done = 0; s.my.miss = 0; },
  draw(g, s, v) {
    const V = g.V, th = seeAng(s), a1 = ag1(s), a2 = ag2(s), [fx, fy] = FUL;
    const L = [fx - 215 * Math.cos(th) + 10 * Math.sin(th), fy - 215 * Math.sin(th) - 10 * Math.cos(th)];   // 左はしの上
    // とぶもの
    let px = L[0] + 26, py = L[1] - 54, rot = 0, sc = 1, fly = 0, happy = 0;
    if (s.k === 1 && a1 < 0.7) { const t = clamp(a1 / 0.7); py = lerp(L[1] - 54, py, t) - 330 * 4 * t * (1 - t); rot = (v.k === 'ball' ? 6 : 0.6) * t; fly = t > 0 && t < 1; }
    if (s.k === 1 && v.k === 'ball' && a1 < 0.7) { const t = clamp(a1 / 0.7); px = lerp(L[0] + 26, 380, t); py = t < 0.5 ? lerp(L[1] - 54, 250, E.outQ(t * 2)) : lerp(250, 700, E.inQ(t * 2 - 1)); }
    if (s.k === 1 && a1 >= 0.66 && !s.my.miss) { s.my.miss = 1; g.fx.pop('おしい！', g.mx(s.side, v.k === 'ball' ? 520 : 330), v.k === 'ball' ? 330 : 360, { size: 86 }); }
    if (s.k === 2) {
      const t = clamp(a2 / 0.34); fly = t < 1; happy = 1;
      if (v.k === 'frog') { px = lerp(L[0] + 26, 330, t); py = lerp(L[1] - 54, 488, t) - 520 * 4 * t * (1 - t) * (1 - 0.3 * t); sc = lerp(1, 0.62, t); rot = -PI * 2 * E.ioQ(t); }
      else { px = lerp(L[0] + 26, 270, t); py = t < 0.6 ? lerp(L[1] - 54, 150, E.outQ(t / 0.6)) : lerp(150, 330, E.inQ((t - 0.6) / 0.4)); rot = 8 * t; }
      if (t >= 1 && !s.my.done) { s.my.done = 1; g.fx.pop(v.k === 'frog' ? 'ナイス！' : 'ゴール！', g.mx(s.side, 560), 250, { size: 112, c: C.yellow }); g.fx.stars(g.mx(s.side, px), py - 40, 8); if (v.k === 'frog') { g.fx.splash(g.mx(s.side, 330), 510, '#9fe0ff', 12); g.sfx('splash'); } else { g.fx.confetti(60); g.sfx('cheer'); } }
    }
    g.mirror(s.side, () => {
      SEES[v.k](g, s, V);
      if (v.k === 'frog' && s.k === 2 && a2 > 0.34) { const k = (a2 - 0.34) * 2; g.alpha(Math.max(0, 1 - k), () => g.at(330, 512, 0, 1 + k * 2, 0.4 + k * 0.8, () => g.ring(0, 0, 70, '#ffffff', 6))); }
      if (v.k === 'ball') { g.ell(270, 240, 64, 14, null, 0); g.arc(270, 240, 64, PI, PI * 2, '#e8433f', 9); }
      // シーソー
      g.shadow(fx, fy + 62, 300, 16); g.poly([fx - 70, fy + 64, fx + 70, fy + 64, fx, fy - 6], '#8f9bb0');
      g.at(fx, fy - 14, th, 1, 1, () => { g.rr(-232, -16, 474, 32, 12, C.wood); g.line([-212, 0, 222, 0], sh(C.wood, -0.2), 4); g.rr(-232, -16, 60, 32, 10, C.red); g.rr(182, -16, 60, 32, 10, C.blue); });
      if (v.k === 'frog') frog(g, px, py, sc, rot, fly, happy || (s.k === 1 && a1 > 0.7)); else bball(g, px, py, 48, rot);
      if (v.k === 'ball') { g.arc(270, 240, 64, 0, PI, '#e8433f', 9); for (let i = -3; i <= 3; i++) g.line([270 + i * 20, 244, 270 + i * 11, 330], '#ffffff', 4); g.line([226, 290, 314, 290], '#ffffff', 4); }
      swing(g, s, 586, 696, 'mallet', { s: 0.9, rot: 1.25, col: '#ff9f1c' });
    });
  },
  hit(g, s, k, v) {
    const x = g.mx(s.lastSide, 586);
    g.fx.shake(k === 2 ? 9 : 6, 0.12); g.fx.lines(x, 712, { n: 10, r0: 90, r1: 200, a0: PI, arc: PI });
    g.fx.pop(k === 1 ? 'ビヨン' : 'ビヨーン！', g.mx(s.lastSide, 560), 590, { size: 84 });
  },
};
const T_CRACK = {
  id: 'hit-crack', acts: ['hit'], modes: ['one'], sfx: (k, v) => k === 1 ? 'crack' : v.s2, vars: CRACK,
  init(s) { const r = s.r; s.my.fl = []; for (let i = 0; i < 18; i++) s.my.fl.push([r(), r(), 5 + r() * 7]); },
  draw(g, s, v) {
    const V = g.V, D = CRK[v.k], a2 = ag2(s);
    g.mirror(s.side, () => {
      D.bg(g, s, V);
      if (s.k < 2) {
        const wob = s.k ? jig(s.age, 0.06, 24, 7) : 0;
        g.shadow(500, v.gy + 4, v.w * 1.05, 22);
        g.at(500, v.gy, wob, 1, 1, () => g.at(0, v.cy - v.gy, () => {
          D.body(g, s, v);
          if (s.k === 1 && v.split === 'hatch') { const P = [-124, -44, -82, -8, -41, -40, 0, -6, 41, -40, 82, -8, 124, -44]; g.line(P, C.ol, 7); g.at(0, -5, () => g.line(P.slice(2, 12), 'rgba(255,255,255,0.8)', 3)); }
          else if (s.k === 1) crackLine(g, v.h, 4);
        }));
      } else if (v.split === 'hatch') {
        const t = clamp(a2 / 0.3);
        g.shadow(500, v.gy + 4, v.w * 1.05, 22);
        D.mid(g, s, v, a2);
        g.at(500, v.cy, () => g.clipPath(HZ + ' L220 260 L-220 260 Z', () => D.body(g, s, v)));
        g.at(500 - 170 * E.outQ(t) - 500 * Math.max(0, a2 - 0.3), v.cy - 330 * E.outQ(t) - 700 * Math.max(0, a2 - 0.3), -1.3 * t - 3 * Math.max(0, a2 - 0.3), 1, 1, () => g.clipPath(HZ + ' L220 -260 L-220 -260 Z', () => D.body(g, s, v)));
      } else if (v.split === 'apart') {
        const t = E.outQ(clamp(a2 / 0.28)), th = 0.42 * t, dx = 80 * t;
        g.shadow(500, v.gy + 4, v.w * 1.25, 22);
        for (const sd of [-1, 1]) g.at(500 + sd * (v.w * 0.9 + dx), v.gy, sd * th, 1, 1, () => g.at(-sd * v.w * 0.9, v.cy - v.gy, () => g.clipPath(halfClip(v.w, v.h, sd), () => D.body(g, s, v))));
        D.mid(g, s, v, a2);
      } else {
        const t = clamp(a2 / 0.26), e = E.outBack(t, 1.6), R = v.R;
        if (D.mid) D.mid(g, s, v, a2);
        for (const sd of [-1, 1]) { const x = 500 + sd * lerp(30, R + 14, e); g.shadow(x, v.gy + 4, R * 0.95, 18); g.at(x, v.gy - R * 0.76 - 40 * Math.sin(PI * t), sd * 0.1 * e, 1, 1, () => D.half(g, s, v, sd, R)); }
      }
      swing(g, s, 500, v.cy - v.h - (v.tip ?? 0), v.tool, v.tool === 'stick' ? { s: 1.15, rot: 1.05 } : {});
    });
  },
  hit(g, s, k, v) {
    const x = g.mx(s.lastSide, 500), y = v.cy - v.h, px = g.mx(s.lastSide, 290);
    if (k === 1) { g.fx.chips(x, y, v.chip, 8); g.fx.pop('ピキッ', px, y - 110, { size: 96 }); g.fx.shake(6, 0.12); return; }
    g.fx.shake(11, 0.18); g.fx.pop(v.pop, g.mx(s.lastSide, v.k === 'walnut' ? 560 : v.k === 'dino' ? 300 : 400), 190, { size: 116, c: C.yellow }); g.fx.ring(x, v.cy, { r1: 300, c: '#ffffff' });
    if (v.k === 'dino') { g.fx.burst(x, v.cy, { n: 14, c: [v.c, '#9ad46f'], shape: 'chip', sp: [300, 800], size: [14, 26] }); g.fx.stars(x, v.cy - 200, 8); g.sfx('boing'); }
    else if (v.k === 'ice') { g.fx.burst(x, v.cy, { n: 20, c: ['#e9fbff', '#bfeaff', '#ffffff'], shape: 'chip', sp: [300, 900], size: [14, 30] }); g.fx.hearts(x, v.cy - 160, 5); g.sfx('magic'); }
    else if (v.k === 'walnut') { g.fx.chips(x, v.cy, v.c, 12); g.fx.hearts(g.mx(s.lastSide, 196), 220, 5); }
    else if (v.k === 'geode') { g.fx.burst(x, v.cy, { n: 16, c: ['#ffffff', C.violet, C.mint], shape: 'star', sp: [300, 800], size: [14, 28], g: 600 }); g.fx.sparks(x, v.cy, 14, ['#ffffff', C.violet]); g.sfx('magic'); }
    else if (v.k === 'coconut') { g.fx.splash(x, v.cy, '#d9f1f2', 20); g.fx.chips(x, v.cy, v.c, 8); g.fx.stars(x, v.cy - 120, 6); g.sfx('splash'); }
    else { g.fx.burst(x, v.cy, { n: 12, c: ['#fff3d6', '#ffc061'], shape: 'chip', sp: [300, 800], size: [10, 18] }); g.fx.smoke(x, v.cy, 6, '#d8c8ff'); g.sfx('magic'); }
  },
};

export default [
  {
    id: 'hit-cut', acts: ['hit'], modes: ['one'], theme: 'kitchen', sfx: 'chop', vars: VEG,
    draw(g, s, v) {
      const V = g.V;
      g.mirror(s.side, () => {
        g.bg('#d8f1e8'); g.tiles(V.x0 - 40, V.y0, V.x1 - V.x0 + 80, 560 - V.y0, 92, '#d8f1e8', '#cbe9de');
        g.band(560, 'bottom', '#e7b77e', 7); g.band(760, 'bottom', '#d9a56a');
        g.shadow(500, 742, 400, 26);
        g.poly([196, 606, 804, 606, 858, 712, 142, 712], '#f6dcae'); g.rr(142, 708, 716, 30, 10, '#e6c18a');
        g.line([230, 628, 770, 628], 'rgba(160,110,60,0.18)', 5);
        // 切った数に応じてずらす
        const a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
        const d1 = a1 >= 0 ? 46 * E.outBack(clamp(a1 / 0.22)) : 0, d2 = a2 >= 0 ? 26 * E.outBack(clamp(a2 / 0.22)) : 0;
        const piece = (xa, xb, dx, rot, face) => g.at(dx, 0, 0, 1, 1, () => g.at((xa + xb) / 2, CY + 40, rot, 1, 1, () => g.at(-(xa + xb) / 2, -(CY + 40), 0, 1, 1, () => {
          g.clipRR(xa, CY - 200, xb - xa, 400, 0, () => drawVeg(g, v)); if (face) cutFace(g, v, xa);
        })));
        if (s.k === 0) piece(v.x0 - 200, v.x1 + 220, 0, 0, false);
        else if (s.k === 1) { piece(v.x0 - 200, X1, 0, 0, false); piece(X1, v.x1 + 220, d1, 0.05 * clamp(a1 / 0.2), true); }
        else { piece(v.x0 - 200, X2, 0, 0, false); piece(X2, X1, d2, 0.04 * clamp(a2 / 0.2), true); piece(X1, v.x1 + 220, d1 + d2, 0.05, true); }
        // 包丁と手
        const kx = s.k === 0 ? X1 : s.k === 1 ? lerp(X1, X2, E.ioQ(clamp(s.u / 0.45))) : X2;
        const p = s.p, gx = kx + 236, gy = 662 - 300 * p;
        g.knife(gx, gy, -Math.PI / 2 + 0.42 * p, 1);
        g.arm(gx + 14, gy + 8, -Math.PI / 2 - 0.62 + 0.12 * p, { hand: 'grip' });
      });
    },
    hit(g, s, k, v) {
      const X = g.mx(s.lastSide, k === 1 ? X1 : X2);
      g.fx.chips(X, 650, v.flesh, 9); g.fx.pop(k === 1 ? 'トン' : 'トン！', X + (s.lastSide === 'L' ? 130 : -130), 500, { size: 96 }); g.fx.shake(6, 0.12);
      if (k === 2) g.fx.stars(500, 560, 6);
    },
  },
  {
    id: 'hit-nail', acts: ['hit'], modes: ['one'], theme: 'diy', sfx: 'hammer', vars: NAIL,
    draw(g, s, v) {
      const V = g.V, top = 640;
      g.mirror(s.side, () => {
        g.bg('#efe3cf'); g.dots(V.x0, V.y0 + 20, V.x1 - V.x0, 600 - V.y0, 64, 6, '#d9c7a8');
        g.band(600, 'bottom', '#a86f43', 7); g.planks(V.x0 - 20, 610, V.x1 - V.x0 + 40, 400, 4, '#b7794a');
        const L = 500 - v.w / 2;
        g.shadow(500, top + v.h + 14, v.w / 2 + 30, 18);
        if (v.box) { g.poly([L, top, L + 60, top - 60, L + v.w + 60, top - 60, L + v.w, top], sh(v.wood, 0.12)); g.poly([L + v.w, top, L + v.w + 60, top - 60, L + v.w + 60, top + v.h - 60, L + v.w, top + v.h], sh(v.wood, -0.15)); }
        if (v.fence) for (const fx of [L + 40, L + v.w - 100]) g.rr(fx, top - 260, 60, 420, 12, sh(v.wood, -0.05));
        g.wood(L, top, v.w, v.h, v.wood, 10, 7);
        // くぎ（2回で全部入る）
        const a = s.k ? s.age : 0, depth = [150, 78, 0][s.k] + (s.k ? (s.k === 1 ? 72 : 78) * (1 - E.outQ(clamp(a / 0.08))) : 0);
        const ny = top - depth;
        if (depth > 2) { g.rect(492, ny, 16, depth + 2, '#aeb8c8', 5); g.line([496, ny + 6, 496, top], '#e8edf4', 3); }
        g.ell(500, ny, 30 - (depth < 2 ? 0 : 0), 9, '#c5cfdd', 5);
        // 金づち（頭の打つ面がくぎの頭に当たる）
        const p = s.p, jitter = jig(s.age, 0.05, 30, 12), ang = -Math.PI / 2 + 0.95 * p + jitter;
        const gx = 826 + 40 * p, gy = ny - 130 - 70 * p;
        g.hammer(gx, gy, ang, 1);
        g.arm(gx + 8, gy + 6, -Math.PI / 2 - 0.5 + 0.35 * p, { hand: 'grip' });
      });
    },
    hit(g, s, k) {
      const x = 500, y = 640 - (k === 1 ? 78 : 0);
      g.fx.sparks(x, y, 12); g.fx.pop('カン', g.mx(s.lastSide, 350), y - 150, { size: 100, c: C.yellow }); g.fx.shake(8, 0.12);
      if (k === 2) { g.fx.stars(500, 600, 8); g.fx.ring(500, 640, { c: '#fff', r1: 200, sy: 0.4 }); }
    },
  },
  T_CRACK, T_STAMP, T_PRESS, T_EGG, T_CHOP, T_KEY, T_SWAT, T_PEG, T_TEST, T_SEESAW,
];
