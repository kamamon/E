/* 左右に振る（ふく・はらう・ぬる・ふる） — s.x（-1〜+1）が手の位置、両はしで当たる（s.lastDir） */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const TAU = Math.PI * 2;
const FLAME = 'M-1 0 Q-0.75 -0.6 0 -1 Q0.75 -0.6 1 0 Z';           // ほのお（g.at で大きさを変える）
const AX = 330;                                   // 手の左右のふれはば
const hxOf = s => 500 + AX * s.x;
const age1 = s => s.k >= 1 ? s.ph * s.spr : -1;
const age2 = s => s.k >= 2 ? s.age : -1;
const endX = (s, dir) => 500 + AX * (dir === 'L' ? -1 : 1);
// 片手の腕（画面の下の角から）
function arm(g, s, hx, hy, o = {}) {
  const side = o.side ?? (s.side === 'L' ? 'L' : 'R'), sg = side === 'L' ? -1 : 1;
  const ax = 500 + sg * (o.ax ?? 420), ay = o.ay ?? 1260, ang = Math.atan2(hy - ay, hx - ax);
  g.arm(hx, hy, ang, { hand: o.hand ?? 'palm', side, sleeve: o.sleeve, s: o.s ?? 1 });
  return ang;
}
// 動く形の切り抜き（矩形いくつか）
function clipRects(g, rs, fn) { const c = g.ctx; c.save(); c.beginPath(); for (const r of rs) c.rect(r[0], r[1], r[2], r[3]); c.clip(); fn(); c.restore(); }

/* =========================================================================
   帯で少しずつ変わる面（ふく・はらう・ぬる）
   1回目の往復で上の帯、2回目で下の帯。いちばん遠くまで行った所までがきれいになる
   ========================================================================= */
function track(s, hx) {
  const b = s.k; if (b > 1) return;
  const m = s.my; if (!m.ext) m.ext = [null, null];
  if (!m.ext[b]) m.ext[b] = { lo: hx, hi: hx, dir: s.dir };
  const e = m.ext[b]; e.lo = Math.min(e.lo, hx); e.hi = Math.max(e.hi, hx);
}
// まだ変わっていない所の矩形
function dirty(s, R, lead = 40) {
  const out = [], ym = (R.y0 + R.y1) / 2, ys = [R.y0 - 2, ym, R.y1 + 2];
  for (let b = 0; b < 2; b++) {
    if (s.k > b) continue;
    const e = s.my.ext && s.my.ext[b];
    if (!e || s.k < b) { out.push([R.x0 - 2, ys[b], R.x1 - R.x0 + 4, ys[b + 1] - ys[b]]); continue; }
    if (e.dir === 'R') { const x = clamp(e.hi + lead, R.x0, R.x1); if (x < R.x1) out.push([x, ys[b], R.x1 - x + 2, ys[b + 1] - ys[b]]); }
    else { const x = clamp(e.lo - lead, R.x0, R.x1); if (x > R.x0) out.push([R.x0 - 2, ys[b], x - R.x0 + 2, ys[b + 1] - ys[b]]); }
  }
  return out;
}
// 手の高さ（帯の真ん中、1回目のあと下の帯へ）
function bandY(s, R) {
  const h = (R.y1 - R.y0) / 4, y0 = R.y0 + h, y1 = R.y1 - h;
  return s.k === 0 ? y0 : s.k === 1 ? lerp(y0, y1, E.ioQ(clamp(s.u / 0.3))) : y1;
}
function twinkle(g, x, y, r, t) { const k = 0.6 + 0.4 * Math.sin(t); g.star(x, y, r * k, r * 0.22 * k, 4, '#ffffff', 0); }

/* ---------- 各場面の絵 ---------- */
// 窓
function winBg(g, s) { const V = g.V; g.bg('#efe6ff'); g.stripes(V.x0, V.y0, V.x1 - V.x0, 880 - V.y0, 70, '#efe6ff', '#e6dbfb'); g.band(880, 'bottom', '#c9b2f0', 7); }
function winAfter(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, g.lin(0, R.y0, 0, R.y1, ['#69c3ff', '#d4f1ff']), 0);
  g.sun(720, 270, 64); g.cloud(330, 260, 0.7); g.cloud(600, 380, 0.5);
  g.path('M150 640 Q300 540 470 610 Q640 680 850 560 L850 760 L150 760 Z', '#7ccf6a', 0);
  g.path('M150 700 Q380 650 560 700 Q720 740 850 690 L850 760 L150 760 Z', '#5db352', 0);
  g.rr(258, 470, 28, 220, 10, '#8a5a36', 5);
  for (const [x, y, r] of [[230, 450, 70], [310, 420, 80], [270, 370, 66], [350, 480, 56]]) g.circ(x, y, r, '#ffb3cf', 5);
  g.line([290, 520, 470, 480], '#8a5a36', 12);
  const sing = s.k >= 2;
  g.at(440, 452 - (sing ? Math.abs(Math.sin(s.t * 14)) * 10 : 0), 0, () => { g.ell(0, 0, 34, 28, C.sky); g.circ(-22, -20, 20, C.sky); g.tri(-40, -22, -56, -14, -40, -10, C.orange, 4); g.circ(-26, -24, 4, C.ol, 0); g.ell(14, -2, 18, 12, sh(C.sky, -0.2), 4, 0.3); });
}
function winDirt(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, 'rgba(150,128,96,0.86)', 0);
  for (const [x, y, rx, ry, a] of s.my.blot) g.ell(x, y, rx, ry, a ? 'rgba(110,88,60,0.45)' : 'rgba(255,255,255,0.13)', 0, x * 0.01);
}
function winFrame(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, null, 0);
  const c = g.ctx; c.save(); c.beginPath(); c.rect(110, 110, 780, 690); c.rect(R.x1, R.y0, R.x0 - R.x1, R.y1 - R.y0); c.fillStyle = '#ffffff'; c.fill('evenodd'); c.restore();
  g.rr(110, 110, 780, 690, 16, null, 8); g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, null, 7);
  g.rr(80, 790, 840, 40, 10, '#ffffff');
}
// 水そう
const FISH = [[300, 330, '#ffd23f', 1], [640, 260, '#ff7a59', -1], [520, 520, '#9b7bff', 1], [760, 470, '#4cc9f0', -1]];
function fish(g, x, y, col, dir, t, sc = 1, hearts) {
  g.at(x, y, Math.sin(t * 3) * 0.08, sc * dir, sc, () => {
    g.at(52, 0, Math.sin(t * 9) * 0.3, () => g.tri(0, 0, 44, -34, 44, 34, sh(col, -0.15)));
    g.ell(0, 0, 62, 44, col); g.line([10, -40, 18, 40], sh(col, 0.45), 9); g.tri(-4, -40, 26, -40, 14, -62, sh(col, -0.15), 5);
    g.circ(-30, -8, 10, '#ffffff', 4); g.circ(-33, -8, 5, C.ol, 0); g.arc(-48, 14, 10, 0.3, 1.8, C.ol, 4);
  });
}
function tankBg(g, s) { const V = g.V; g.bg('#22305c', '#2f3f73'); g.band(800, 'bottom', '#a0673c', 7); g.planks(V.x0 - 20, 812, V.x1 - V.x0 + 40, 400, 4, '#b7794a'); }
function tankAfter(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, g.lin(0, R.y0, 0, R.y1, ['#7fe0ff', '#2a9fd0']), 0);
  g.rect(R.x0, 690, R.x1 - R.x0, 80, '#f2d49b', 0); for (let i = 0; i < 12; i++) g.circ(R.x0 + 30 + i * 62, 715 + (i % 3) * 14, 10, ['#ffb3cf', '#ffffff', '#c4a6ff'][i % 3], 3);
  for (const x of [200, 250, 760, 810]) g.curve([x, 700, x - 20 + 16 * Math.sin(s.t * 2 + x), 600, x + 10, 500, x - 10 + 12 * Math.sin(s.t * 2 + x), 420], '#3cc46b', 16);
  const a2 = age2(s);
  FISH.forEach(([x, y, col, d], i) => {
    const q = a2 < 0 ? 0 : E.outBack(clamp(a2 / 0.3)), fx = lerp(x + Math.sin(s.t * 1.4 + i) * 60 * d, 380 + i * 80, q), fy = lerp(y + Math.cos(s.t * 1.1 + i) * 20, 420 + (i % 2) * 70, q);
    fish(g, fx, fy, col, d, s.t + i, lerp(0.8, 1.1, q));
  });
  for (let i = 0; i < 6; i++) { const y = 700 - ((s.t * 120 + i * 100) % 520); g.circ(600 + Math.sin(i * 2 + s.t * 3) * 14, y, 9 + (i % 3) * 3, 'rgba(255,255,255,0.7)', 3); }
}
function tankDirt(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, 'rgba(78,128,56,0.9)', 0);
  for (const [x, y, rx, ry, a] of s.my.blot) g.ell(x, y, rx * 0.8, ry * 0.8, a ? 'rgba(46,90,40,0.6)' : 'rgba(150,200,90,0.35)', 0);
}
function tankFrame(g, s, R) {
  const c = g.ctx; c.save(); c.beginPath(); c.rect(100, 150, 800, 650); c.rect(R.x1, R.y0, R.x0 - R.x1, R.y1 - R.y0); c.fillStyle = '#3a3f55'; c.fill('evenodd'); c.restore();
  g.rr(100, 150, 800, 650, 14, null, 8); g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, null, 6);
  g.rr(90, 120, 820, 50, 12, '#5c6478');
}
// 鏡
function mirBg(g, s) {
  const V = g.V; g.bg('#d3eef2'); g.grid(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0, 90, '#ffffff', 5);
  g.band(790, 'bottom', '#ffffff', 7); g.band(830, 'bottom', '#eef3f8');
  g.ell(500, 900, 300, 50, '#dfe7f1'); g.ell(500, 894, 250, 32, '#c9d6e6', 0);
  g.at(250, 0, () => g.path('M470 800 L470 770 Q470 744 500 744 L560 744 L560 770 L540 770 Q530 764 520 770 L500 770 L500 800 Z', C.metal)); g.rr(170, 760, 90, 40, 14, '#9cf2d8');
  g.rr(700, 742, 120, 50, 20, '#ffb3cf'); g.ell(760, 742, 50, 14, '#ffd6e6', 4);
}
function mirAfter(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, '#7cc6dc', 0); g.grid(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, 70, '#9fd8ea', 5);
  g.rr(250, 220, 120, 230, 16, '#ff7aa8'); g.rect(250, 240, 120, 22, '#ffffff', 0); g.rr(240, 210, 140, 24, 10, C.metal);
  g.rr(R.x0, 560, R.x1 - R.x0, 30, 6, '#ffffff');
  const a2 = age2(s), j = a2 >= 0 ? -Math.abs(jig(a2, 60, 16, 5)) : 0;
  g.at(470, 512 + j, 0, () => { g.ell(0, 0, 70, 48, C.yellow); g.circ(-20, -60, 40, C.yellow); g.ell(-64, -54, 24, 12, C.orange); g.circ(-26, -70, 7, C.ol, 0); g.ell(20, -4, 34, 18, sh(C.yellow, -0.12), 4, -0.3); });
  g.rr(640, 450, 90, 110, 18, C.lime); for (const [x, c] of [[660, C.blue], [688, C.red], [712, C.orange]]) { g.rr(x - 6, 370, 14, 100, 6, c, 4); g.rr(x - 10, 360, 22, 30, 6, '#ffffff', 4); }
  g.alpha(0.35, () => g.poly([R.x0 + 380, R.y0, R.x0 + 460, R.y0, R.x0 + 200, R.y1, R.x0 + 120, R.y1], '#ffffff', 0));
}
function mirDirt(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, 'rgba(244,250,255,0.95)', 0);
  for (const [x, y, rx] of s.my.drops) { g.circ(x, y, rx * 0.32, '#d6e8f5', 0); g.circ(x - rx * 0.08, y - rx * 0.1, rx * 0.12, '#ffffff', 0); }
  for (let i = 0; i < 5; i++) { const [x, y] = s.my.drops[i]; g.line([x, y, x, y + 60 + i * 14], '#d6e8f5', 6); }
}
function mirFrame(g, s, R) { g.rr(R.x0 - 22, R.y0 - 22, R.x1 - R.x0 + 44, R.y1 - R.y0 + 44, 40, null, 52); const o = g.ol; g.ol = '#ffffff'; g.rr(R.x0 - 22, R.y0 - 22, R.x1 - R.x0 + 44, R.y1 - R.y0 + 44, 40, null, 38); g.ol = o; g.rr(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, 20, null, 6); }
// 黒板
function bbBg(g, s) { const V = g.V; g.bg('#fff3d6'); g.band(860, 'bottom', '#c98b52', 7); g.circ(500, 70, 46, '#ffffff', 6); g.line([500, 70, 500, 42], C.ol, 5); g.line([500, 70, 520, 78], C.ol, 5); }
function bbAfter(g, s, R) { g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, '#2f6b52', 0); for (const [x, y, rx, ry] of s.my.blot) g.ell(x, y, rx, ry * 0.5, 'rgba(255,255,255,0.05)', 0); }
function bbDirt(g, s, R) {
  bbAfter(g, s, R);
  const W = '#f4f4f4';
  g.circ(250, 280, 46, null, 0); g.ring(250, 280, 46, W, 7); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.line([250 + Math.cos(a) * 64, 280 + Math.sin(a) * 64, 250 + Math.cos(a) * 92, 280 + Math.sin(a) * 92], C.yellow, 7); }
  g.ring(720, 300, 70, W, 7); g.line([668, 252, 676, 200, 708, 236], W, 7); g.line([732, 236, 764, 200, 772, 252], W, 7); g.circ(696, 290, 7, W, 0); g.circ(744, 290, 7, W, 0); g.curve([700, 330, 720, 342, 740, 330], W, 6);
  for (const sgn of [-1, 1]) { g.line([720 + sgn * 40, 318, 720 + sgn * 100, 308], W, 4); g.line([720 + sgn * 40, 330, 720 + sgn * 100, 340], W, 4); }
  g.text('1+1=2', 480, 520, { size: 100, f: W, font: '"Zen Kaku Gothic New", sans-serif', w: 700 });
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.circ(250 + Math.cos(a) * 36, 640 + Math.sin(a) * 36, 22, null, 0); g.ring(250 + Math.cos(a) * 36, 640 + Math.sin(a) * 36, 22, C.pink, 6); }
  g.line([250, 676, 250, 730], '#9cf2d8', 7);
  g.line([640, 700, 640, 620, 720, 560, 800, 620, 800, 700], W, 7);
  g.curve([360, 400, 400, 380, 440, 410, 480, 380, 520, 410], C.yellow, 6);
}
function bbFrame(g, s, R) {
  const c = g.ctx; c.save(); c.beginPath(); c.rect(R.x0 - 30, R.y0 - 30, R.x1 - R.x0 + 60, R.y1 - R.y0 + 60); c.rect(R.x1, R.y0, R.x0 - R.x1, R.y1 - R.y0); c.fillStyle = '#b07a48'; c.fill('evenodd'); c.restore();
  g.rect(R.x0 - 30, R.y0 - 30, R.x1 - R.x0 + 60, R.y1 - R.y0 + 60, null, 7); g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, null, 6);
  g.rr(R.x0 - 40, R.y1 + 24, R.x1 - R.x0 + 80, 34, 6, '#c98b52'); for (const [x, c2] of [[200, '#ffffff'], [240, C.yellow], [280, C.pink]]) g.rr(x, R.y1 + 12, 34, 16, 6, c2, 4);
}
// 化石
function digBg(g, s) { const V = g.V; g.bg('#e9c88d'); for (let i = 0; i < 40; i++) g.circ(V.x0 + ((i * 197) % (V.x1 - V.x0)), V.y0 + ((i * 331) % (V.y1 - V.y0)), 7, '#d6ad6c', 0); }
function digAfter(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, '#b98a5c', 0); for (const [x, y, rx, ry] of s.my.blot) g.ell(x, y, rx * 0.6, ry * 0.5, 'rgba(120,80,50,0.25)', 0);
  const B = '#fff3da';
  // しっぽ〜背骨
  const sp = [[820, 640], [760, 560], [690, 500], [610, 470], [530, 470], [450, 490], [380, 470]];
  for (let i = 0; i < sp.length; i++) { const [x, y] = sp[i], r = 16 + i * 3; g.rr(x - r, y - r * 0.8, r * 2, r * 1.6, r * 0.6, B, 5); }
  for (const [x, y, l] of [[600, 480, 110], [540, 480, 120], [480, 494, 110]]) { g.curve([x, y + 10, x - 20, y + l * 0.6, x + 6, y + l], B, 16); g.curve([x, y + 10, x - 20, y + l * 0.6, x + 6, y + l], C.ol, 3); }
  for (const [x, y, a] of [[700, 520, 0.3], [470, 520, -0.2]]) g.at(x, y, a, () => { g.cap(0, 0, 10, 140, 14, B, 5); g.cap(10, 140, -30, 210, 12, B, 5); });
  // 頭
  g.at(300, 420, -0.15, () => { g.path('M-130 -20 Q-120 -80 -30 -90 Q60 -90 90 -30 Q100 20 60 40 L-110 40 Q-140 30 -130 -20 Z', B); g.circ(10, -40, 22, '#b98a5c', 5); g.path('M-120 40 L60 40 L50 70 L-110 64 Z', B); for (let i = 0; i < 6; i++) g.tri(-104 + i * 28, 40, -90 + i * 28, 40, -97 + i * 28, 58, '#ffffff', 3); });
}
function digDirt(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, '#f0d29a', 0);
  for (const [x, y, rx, ry, a] of s.my.blot) g.ell(x, y, rx * 0.7, ry * 0.35, a ? 'rgba(200,150,90,0.35)' : 'rgba(255,255,255,0.25)', 0);
  for (let i = 0; i < 14; i++) g.circ(R.x0 + 40 + (i * 137) % (R.x1 - R.x0 - 80), R.y0 + 40 + (i * 89) % (R.y1 - R.y0 - 80), 8 + (i % 3) * 3, '#c9a77a', 3);
}
function digFrame(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, null, 8);
  for (const x of [R.x0, 500, R.x1]) for (const y of [R.y0, R.y1]) { g.line([x, y, x, y - 60], '#7a4a2a', 8); g.tri(x, y - 60, x + 40, y - 48, x, y - 36, C.red, 4); }
  g.line([R.x0, (R.y0 + R.y1) / 2, R.x1, (R.y0 + R.y1) / 2], 'rgba(255,255,255,0.7)', 3); g.line([500, R.y0, 500, R.y1], 'rgba(255,255,255,0.7)', 3);
}
// 宝箱
function chest(g, x, y, open, t) {
  g.shadow(x, y + 120, 230, 24);
  if (open > 0) {
    g.at(x, y - 40, 0, 1, 1, () => { g.path('M-200 0 Q-200 -40 -180 -60 L180 -60 Q200 -40 200 0 Z', '#7a4a2a'); });
    g.ell(x, y - 30, 190, 40, '#ffd23f'); for (let i = 0; i < 9; i++) g.circ(x - 150 + i * 38, y - 36 - (i % 2) * 14, 18, C.gold, 4);
    g.glow(x, y - 60, 260 * open, '#fff3b0', 0.7);
    g.at(x, y - 40 - 130 * open, 0, 1, 1, () => g.rr(-210, -110, 420, 110, 30, '#a0673c'));
  } else { g.path(`M${x - 210} ${y - 30} Q${x - 210} ${y - 150} ${x} ${y - 160} Q${x + 210} ${y - 150} ${x + 210} ${y - 30} Z`, '#a0673c'); g.rect(x - 30, y - 160, 60, 130, C.gold, 5); }
  g.rr(x - 210, y - 40, 420, 160, 16, '#8a5a36');
  for (const xx of [x - 150, x + 150]) g.rect(xx - 20, y - 40, 40, 160, C.gold, 5);
  g.rr(x - 36, y - 46, 72, 70, 12, C.gold); g.circ(x, y - 18, 10, C.ol, 0);
}
function beachBg(g, s) { const V = g.V; g.bg('#f6dfa6'); g.band('top', 130, '#4cc9f0'); for (let x = Math.floor(V.x0 / 80) * 80; x < V.x1; x += 80) g.arc(x + 40, 130, 40, 0, Math.PI, '#ffffff', 8); g.rr(60, 810, 140, 110, 20, C.red); g.ell(130, 810, 70, 16, sh(C.red, -0.3)); g.line([90, 810, 100, 760, 160, 760, 170, 810], C.ol, 6); }
function beachAfter(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, '#d8b06c', 0); for (const [x, y, rx, ry] of s.my.blot) g.ell(x, y, rx * 0.5, ry * 0.3, 'rgba(150,100,50,0.2)', 0);
  const a2 = age2(s); g.at(500, 520, 0, 1.3, 1.3, () => chest(g, 0, 0, a2 < 0 ? 0 : E.outBack(clamp(a2 / 0.2)), s.t));
}
function beachDirt(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, '#f6dfa6', 0);
  for (const [x, y, rx, ry, a] of s.my.blot) g.arc(x, y, rx * 0.5, 3.6, 5.8, a ? '#e3c584' : '#fff1c9', 6);
  g.star(260, 300, 46, 20, 5, '#ff8a5c', 5); g.at(720, 640, 0.4, () => { g.path('M0 -44 Q44 -44 44 0 L0 44 L-44 0 Q-44 -44 0 -44 Z', '#ffd6e0'); g.line([0, -30, 0, 30], '#f0a8bc', 4); });
  g.at(560, 340, 0.3, () => { g.ell(0, 0, 18, 30, '#e3c584', 0); g.ell(36, 20, 16, 26, '#e3c584', 0); });
}
function beachFrame(g, s, R) { }
// ペンキ（にじ色ローラー）
const RB = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple];
function paintBg(g, s) { const V = g.V; g.sky('#8fd8ff', '#e3f6ff', 800); g.band(780, 'bottom', '#72c957', 7); g.grassTufts(800, '#5db352', 2, 10); }
function paintAfter(g, s, R) {
  const h = (R.y1 - R.y0) / 6; RB.forEach((c, i) => g.rect(R.x0, R.y0 + i * h, R.x1 - R.x0, h + 1, c, 0));
  for (let i = 0; i < 6; i++) g.rect(R.x0, R.y0 + i * h + 8, R.x1 - R.x0, 10, 'rgba(255,255,255,0.18)', 0);
}
function paintDirt(g, s, R) {
  g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, '#d9d2c3', 0);
  for (let y = R.y0 + 70; y < R.y1; y += 90) g.line([R.x0, y, R.x1, y], '#c6bead', 4);
  g.line([300, 260, 330, 330, 310, 380], '#a89f8c', 5); g.line([700, 560, 740, 600, 730, 660], '#a89f8c', 5);
}
function paintFrame(g, s, R) { g.rect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, null, 7); g.rr(R.x0 - 20, R.y0 - 30, R.x1 - R.x0 + 40, 34, 8, '#b7bfcd'); }
// パンにバター
const TOAST = 'M200 330 Q200 170 330 170 Q420 170 500 200 Q580 170 670 170 Q800 170 800 330 L800 760 Q800 800 760 800 L240 800 Q200 800 200 760 Z';
function toastBg(g, s) { const V = g.V; g.bg('#ffe2c2'); g.tiles(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0, 110, '#ffe2c2', '#ffd7ae'); g.shadow(500, 850, 400, 40); g.ell(500, 830, 420, 70, '#ffffff'); g.ell(500, 822, 340, 46, '#eef3fb', 0); g.path(TOAST, '#b8732f'); }
function toastAfter(g, s, R) {
  g.clipPath(TOAST, () => { g.rect(R.x0 - 40, R.y0 - 60, R.x1 - R.x0 + 80, R.y1 - R.y0 + 120, '#ffe17a', 0); for (const [x, y, rx, ry] of s.my.blot) g.ell(x, y, rx * 0.8, ry * 0.25, 'rgba(255,255,255,0.4)', 0, -0.2); });
  const a2 = age2(s), m = a2 < 0 ? 0 : clamp(a2 / 0.3);
  g.at(560, 420, 0, 1 + m * 0.4, 1 - m * 0.5, () => { g.rr(-60, -36, 120, 72, 14, '#fff3b0'); g.hl(-20, -20, 30, 8, 0, 0.7); });
}
function toastDirt(g, s, R) { g.clipPath(TOAST, () => { g.rect(R.x0 - 40, R.y0 - 60, R.x1 - R.x0 + 80, R.y1 - R.y0 + 120, '#f6cf8a', 0); for (const [x, y] of s.my.drops) g.ell(x, y, 8, 5, '#e0b06a', 0); }); }
function toastFrame(g, s, R) { const o = g.ol; g.ol = '#b8732f'; g.path(TOAST, null, 40); g.ol = o; g.path(TOAST, null, 7); }
// ケーキにクリーム
function cakeBg(g, s) { const V = g.V; g.bg('#ffe3f0'); g.dots(-40, -40, 1080, 860, 150, 9, '#ffd0e6'); g.band(800, 'bottom', '#c9a3ff', 7); g.ell(500, 790, 360, 60, '#ffffff'); g.rr(470, 790, 60, 120, 10, '#ffffff'); }
const CAKE = 'M180 330 A320 84 0 0 1 820 330 L820 690 Q500 800 180 690 Z';
function berry(g, x, y, q) { g.at(x, y, 0, q, q, () => { g.path('M0 30 Q-40 0 -30 -26 Q0 -40 30 -26 Q40 0 0 30 Z', C.red); g.tri(-20, -30, 20, -30, 0, -50, C.leaf, 4); for (const [a, b] of [[-10, -10], [10, -6], [0, 8]]) g.ell(a, b, 3, 5, '#ffe873', 0); }); }
function cakeAfter(g, s, R) {
  g.clipPath(CAKE, () => { g.rect(150, 200, 700, 620, '#fffaf0', 0); for (let y = 450; y < 760; y += 70) g.curve([180, y, 340, y + 16, 500, y + 26, 660, y + 16, 820, y], '#efe6d6', 5); g.ell(500, 330, 320, 84, '#ffffff', 5); g.curve([280, 330, 400, 300, 560, 350, 700, 320], '#efe6d6', 5); });
  if (s.k >= 2) { const q = E.outBack(clamp(s.age / 0.2)); [[300, 318], [400, 296], [500, 340], [600, 296], [700, 318], [500, 286]].forEach(([x, y], i) => berry(g, x, y - (1 - q) * 260 - i * 0 , q)); }
}
function cakeDirt(g, s, R) { g.clipPath(CAKE, () => { g.rect(150, 200, 700, 620, '#f6c56b', 0); g.rect(150, 520, 700, 40, '#ff8fab', 0); for (const [x, y] of s.my.drops) g.circ(x, y, 6, '#e3a94e', 0); g.ell(500, 330, 320, 84, '#ffd98a', 5); for (const [x, y] of s.my.drops.slice(0, 8)) g.circ(lerp(300, 700, (x - 180) / 640), lerp(300, 360, (y - 240) / 540), 5, '#e8b25e', 0); }); }
function cakeFrame(g, s, R) { g.path(CAKE, null, 7); }

const SURF = {
  window: { R: { x0: 150, y0: 150, x1: 850, y1: 760 }, bg: winBg, after: winAfter, dirt: winDirt, frame: winFrame, tool: 'rag', toolC: '#fff6c8' },
  tank: { R: { x0: 130, y0: 180, x1: 870, y1: 770 }, bg: tankBg, after: tankAfter, dirt: tankDirt, frame: tankFrame, tool: 'sponge' },
  mirror: { R: { x0: 190, y0: 150, x1: 810, y1: 730 }, bg: mirBg, after: mirAfter, dirt: mirDirt, frame: mirFrame, tool: 'rag', toolC: '#9cdcff' },
  board: { R: { x0: 120, y0: 170, x1: 880, y1: 740 }, bg: bbBg, after: bbAfter, dirt: bbDirt, frame: bbFrame, tool: 'eraser' },
  fossil: { R: { x0: 110, y0: 170, x1: 890, y1: 760 }, bg: digBg, after: digAfter, dirt: digDirt, frame: digFrame, tool: 'duster' },
  chest: { R: { x0: 140, y0: 200, x1: 860, y1: 780 }, bg: beachBg, after: beachAfter, dirt: beachDirt, frame: beachFrame, tool: 'hand' },
  paint: { R: { x0: 110, y0: 180, x1: 890, y1: 760 }, bg: paintBg, after: paintAfter, dirt: paintDirt, frame: paintFrame, tool: 'roller' },
  toast: { R: { x0: 200, y0: 170, x1: 800, y1: 800 }, bg: toastBg, after: toastAfter, dirt: toastDirt, frame: toastFrame, tool: 'knife' },
  cake: { R: { x0: 180, y0: 240, x1: 820, y1: 780 }, bg: cakeBg, after: cakeAfter, dirt: cakeDirt, frame: cakeFrame, tool: 'spatula' },
};
const CLEAN = [
  { k: 'window', name: '窓をふく', short: '窓ふき', theme: 'home', sfx: 'squeak', pop: ['キュッ', 'ピカピカ'], modes: ['one', 'both'] },
  { k: 'tank', name: '水そうをみがく', short: '水そう', theme: 'sea', sfx: 'squeak', pop: ['キュッ', 'ピカピカ'], modes: ['one', 'both'] },
  { k: 'mirror', name: 'くもった鏡をふく', short: '鏡', theme: 'home', sfx: 'squeak', pop: ['キュッ', 'ピカッ'], modes: ['one', 'both'] },
  { k: 'board', name: '黒板を消す', short: '黒板', theme: 'school', sfx: 'swish', pop: ['サッ', 'ピカピカ'], modes: ['one', 'both'] },
  { k: 'fossil', name: '化石を掘り出す', short: '化石', theme: 'nature', sfx: 'swish', pop: ['サッ', 'やった！'], modes: ['one', 'both'] },
  { k: 'chest', name: '宝箱を掘り出す', short: '宝箱', theme: 'fantasy', sfx: 'swish', pop: ['ザッ', 'ジャーン'], modes: ['one', 'both'] },
  { k: 'paint', name: 'にじ色にぬる', short: 'ペンキ', theme: 'diy', sfx: 'swish', pop: ['ヌリッ', 'できた！'], modes: ['one', 'both'] },
  { k: 'toast', name: 'パンにバターをぬる', short: 'バター', theme: 'kitchen', sfx: 'swish', pop: ['ヌリッ', 'ジュワ〜'] },
  { k: 'cake', name: 'ケーキにクリーム', short: 'ケーキ', theme: 'kitchen', sfx: 'swish', pop: ['ヌリッ', 'できた！'] },
];
// 道具（手の位置 x,y、動きの向き mv）
const PAIR = new Set(['rag', 'sponge', 'eraser', 'duster', 'hand']);
// 片手ぶんの道具（sd = 'L' / 'R'）。両手のときは2つ並べる
function tool1(g, s, v, P, x, hy, sd, pair, tilt, sleeve) {
  const sg = sd === 'L' ? -1 : 1, o = { side: sd, sleeve, ax: pair ? 470 : undefined }, sc = pair ? 0.85 : 1;
  switch (P.tool) {
    case 'rag': g.rag(x, hy, tilt, pair ? 1.1 : 1.25, P.toolC); arm(g, s, x, hy + 20, { ...o, hand: 'palm' }); break;
    case 'sponge': g.at(x, hy, tilt, sc, sc, () => { g.rr(-90, -110, 180, 220, 30, '#ffd23f'); g.rr(-90, -110, 50, 220, 20, '#3cc46b'); for (let i = 0; i < 5; i++) g.circ(-10 + (i % 2) * 40, -70 + i * 34, 8, '#f2b92f', 0); }); arm(g, s, x + sg * 20, hy + 30, { ...o, hand: 'palm' }); break;
    case 'eraser': g.at(x, hy, tilt, sc, sc, () => { g.rr(-60, -130, 120, 260, 14, '#2b6ad6'); g.rr(-60, -130, 50, 260, 12, '#e8e8f0'); for (let i = 0; i < 6; i++) g.line([-60, -100 + i * 40, -10, -100 + i * 40], '#b8bfd0', 4); }); arm(g, s, x + sg * 30, hy + 30, { ...o, hand: 'grip' }); break;
    case 'duster': { const a = -sg * 0.5 + tilt * 2; g.at(x, hy, a, sc, sc, () => { g.rr(-14, 0, 28, 220, 12, C.wood); g.rr(-70, -100, 140, 110, 16, '#f6e9cf'); for (let i = -3; i <= 3; i++) g.line([i * 18, -96, i * 20, -150], '#e7d2a6', 10); g.rr(-74, -10, 148, 30, 8, C.steel); }); arm(g, s, x - Math.sin(a) * 160 * sc, hy + 170 * sc, { ...o, hand: 'grip', sleeve: '#c98b52' }); break; }
    case 'hand': arm(g, s, x, hy, { ...o, hand: 'open' }); break;
  }
}
function tool(g, s, v, P, hx, hy) {
  const tilt = clamp((s.my.vx || 0) / 900, -0.25, 0.25);
  const sleeve = v.k === 'board' ? '#ff6b8b' : v.k === 'paint' ? C.green : undefined;
  if (PAIR.has(P.tool)) {
    if (s.mode === 'both') { for (const sd of ['L', 'R']) tool1(g, s, v, P, hx + (sd === 'L' ? -115 : 115), hy, sd, true, tilt, sleeve); }
    else tool1(g, s, v, P, hx, hy, s.side === 'L' ? 'L' : 'R', false, tilt, sleeve);
    return;
  }
  switch (P.tool) {
    case 'roller': {
      const both = s.mode === 'both', px = hx + 90, pb = both ? 1300 : hy + 290;
      g.at(hx, hy, 0, () => { g.rr(-40, -120, 80, 240, 30, '#ffffff'); g.clipRR(-40, -120, 80, 240, 30, () => RB.forEach((c, i) => g.rect(-40, -120 + i * 40, 80, 41, c, 0))); g.rr(-40, -120, 80, 240, 30, null); g.line([40, 0, 90, 0, 90, 150], C.steel, 14); });
      if (both) {
        const bx = 500 + (hx - 500) * 0.4 + 30, ty = hy + 150, xAt = y => lerp(px, bx, (y - ty) / (pb - ty));
        g.cap(px, ty, bx, pb, 11, '#d39457', 5);
        const y1 = 770, y2 = 920, x1 = xAt(y1), x2 = xAt(y2);
        g.arm(x1, y1, Math.atan2(y1 - 1320, x1 - 180), { hand: 'grip', side: 'L', sleeve }); g.arm(x2, y2, Math.atan2(y2 - 1380, x2 - 820), { hand: 'grip', side: 'R', sleeve });
      }
      else { g.rr(px - 14, hy + 140, 30, 140, 12, C.red); arm(g, s, px + 4, hy + 230, { hand: 'grip', sleeve }); }
      break; }
    case 'knife': { g.at(hx, hy, 0.25 + tilt, () => { g.rr(-70, -20, 170, 40, 20, '#e9eef6'); g.rr(-70, -20, 170, 40, 20, null); g.rr(90, -22, 130, 44, 16, C.dwood); }); arm(g, s, hx + 150, hy + 60, { hand: 'grip', sleeve }); break; }
    case 'spatula': { g.at(hx, hy, tilt, () => { g.rr(-100, -26, 200, 52, 24, '#e9eef6'); g.rr(90, -16, 100, 32, 10, C.steel, 5); g.rr(180, -24, 120, 48, 18, C.purple); }); arm(g, s, hx + 230, hy + 40, { hand: 'grip', sleeve }); break; }
  }
}

/* =========================================================================
   手をふる：ねこ・パンダ・電車
   ========================================================================= */
const vxOf = (s, hx) => { const m = s.my; if (m.px != null && s.dt > 0) m.vx = lerp(m.vx || 0, (hx - m.px) / s.dt, 0.3); m.px = hx; return m.vx || 0; };
function waveArm(g, s, hx, hy, o = {}) {
  const side = o.side ?? (s.side === 'L' ? 'L' : 'R'), sg = side === 'L' ? -1 : 1, tilt = clamp(-(s.my.vx || 0) / 2400, -0.3, 0.3);
  g.arm(hx, hy, -Math.PI / 2 - sg * 0.32 + tilt + (hx - 500) / 2200, { hand: o.hand ?? 'open', side, sleeve: o.sleeve });
}
// すわったどうぶつ（正面）pose 0=知らんぷり 1=片手 2=両手でふる
function sitter(g, x, y, kind, pose, t) {
  const panda = kind === 'panda', body = panda ? '#ffffff' : '#ff9f45', limb = panda ? '#2b2140' : '#ff9f45';
  const wv = Math.sin(t * 14) * 0.5;
  g.at(x, y, 0, () => {
    if (!panda) { g.curve([70, 140, 160, 130, 150, 40], C.ol, 26); g.curve([70, 140, 160, 130, 150, 40], body, 14); }
    g.ell(0, 70, 104, 110, body);
    g.ell(0, 92, 62, 70, panda ? '#f1f1f6' : '#fff1d6', 0);
    if (panda) g.rect(-104, 10, 208, 50, null, 0);
    // 足
    g.ell(-50, 170, 40, 26, limb); g.ell(50, 170, 40, 26, limb);
    // 手
    const L = pose >= 2 ? [-120, -90 + wv * 40] : [-40, 120], Rr = pose >= 1 ? [130, -100 - wv * 40 * (pose >= 1 ? 1 : 0)] : [40, 120];
    g.cap(-70, 30, L[0], L[1], 26, limb); g.cap(70, 30, Rr[0], Rr[1], 26, limb);
    if (pose >= 1) g.circ(Rr[0], Rr[1], 30, limb); if (pose >= 2) g.circ(L[0], L[1], 30, limb);
    if (panda && pose === 0) { g.rr(-60, 60, 120, 18, 8, '#7ccf6a', 4); g.rr(-60, 100, 120, 18, 8, '#7ccf6a', 4); }
    // 頭
    if (panda) { g.circ(-70, -150, 34, limb); g.circ(70, -150, 34, limb); }
    else { g.tri(-80, -110, -60, -190, -20, -140, body); g.tri(80, -110, 60, -190, 20, -140, body); g.tri(-66, -126, -56, -170, -34, -140, '#ffb3c1', 0); g.tri(66, -126, 56, -170, 34, -140, '#ffb3c1', 0); }
    g.circ(0, -80, 92, body);
    const look = pose === 0 ? -24 : 0;
    if (panda) { g.ell(-36 + look, -86, 26, 34, limb, 0, 0.5); g.ell(36 + look, -86, 26, 34, limb, 0, -0.5); }
    if (pose === 0 && !panda) { g.arc(-34 + look, -86, 14, Math.PI * 0.15, Math.PI * 0.85, C.ol, 6); g.arc(34 + look, -86, 14, Math.PI * 0.15, Math.PI * 0.85, C.ol, 6); }
    else { g.circ(-34 + look, -86, 13, panda ? '#ffffff' : C.ol, 0); g.circ(34 + look, -86, 13, panda ? '#ffffff' : C.ol, 0); g.circ(-34 + look, -86, 6, C.ol, 0); g.circ(34 + look, -86, 6, C.ol, 0); g.circ(-30 + look, -90, 3, '#ffffff', 0); g.circ(38 + look, -90, 3, '#ffffff', 0); }
    g.ell(look, -52, 12, 8, panda ? limb : '#ff7a8a', 0);
    if (pose >= 1) g.path('M-24 -34 Q0 -6 24 -34 Q0 -22 -24 -34 Z', '#ff6b8b', 4); else g.curve([-16 + look, -36, look, -30, 16 + look, -36], C.ol, 4);
    if (!panda) for (const sgn of [-1, 1]) { g.line([sgn * 56, -52, sgn * 112, -60], C.ol, 3); g.line([sgn * 56, -40, sgn * 112, -34], C.ol, 3); }
    g.ell(-62, -46, 16, 9, 'rgba(255,110,140,0.5)', 0); g.ell(62, -46, 16, 9, 'rgba(255,110,140,0.5)', 0);
  });
}
function townBg(g, s) {
  const V = g.V; g.sky('#7cc8ff', '#e0f4ff', 560); g.cloud(200, 140, 0.7); g.cloud(800, 210, 0.55);
  for (const [x, w, h, c] of [[-320, 300, 300, '#ffd6a8'], [10, 240, 360, '#ffe9c2'], [700, 260, 330, '#ffd6a8'], [990, 300, 300, '#ffe9c2']]) { g.rect(x, 560 - h, w, h, c, 6); g.tri(x - 20, 560 - h, x + w + 20, 560 - h, x + w / 2, 560 - h - 100, '#e8634f'); g.rr(x + w / 2 - 40, 560 - h + 80, 80, 80, 6, '#9cd6ff'); }
  g.band(400, 560, '#c7cbd6'); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) for (let r = 0; r < 4; r++) g.rect(x + (r % 2) * 60, 400 + r * 40, 120, 40, null, 3);
  g.band(400, 420, '#b0b6c4'); g.band(560, 'bottom', '#9fdc84', 7); g.band(720, 'bottom', '#d9cbb2', 6);
}
function zooBg(g, s) {
  const V = g.V; g.bg('#c9f0c8', '#e9fbe2');
  for (let x = Math.floor(V.x0 / 150) * 150; x < V.x1; x += 150) { const h = 380 + ((x * 7) % 120); g.rr(x + 20, 600 - h, 26, h + 40, 10, '#6cc04a', 5); for (let y = 640 - h; y < 600; y += 90) g.line([x + 20, y, x + 46, y], '#3e8f3a', 5); g.path(`M${x + 46} ${620 - h} Q${x + 100} ${600 - h} ${x + 120} ${640 - h} Q${x + 80} ${630 - h} ${x + 46} ${640 - h} Z`, '#7ccf6a', 4); }
  g.band(600, 'bottom', '#b9915e', 7); g.band(760, 'bottom', '#8a5a36', 7); for (let x = Math.floor(V.x0 / 100) * 100; x < V.x1; x += 100) g.rr(x, 740, 30, 260, 8, '#a0673c', 5);
}
function station(g, s, go) {
  const V = g.V; g.sky('#8fd8ff', '#e8f7ff', 640); g.cloud(250, 120, 0.6);
  g.band(560, 640, '#5c6478'); g.line([V.x0, 600, V.x1, 600], '#a3abbd', 8);
  // 電車
  const tx = go;
  g.at(tx, 0, () => {
    for (const cx of [-760, 40, 840]) {
      g.rr(cx, 250, 760, 320, 40, '#f4f8ff'); g.rect(cx, 470, 760, 40, '#3cc46b', 0); g.rect(cx, 500, 760, 14, '#ff9f1c', 0); g.rr(cx, 250, 760, 320, 40, null);
      for (let w = 0; w < 4; w++) {
        const wx = cx + 50 + w * 180; g.rr(wx, 300, 140, 120, 14, '#bfe6ff');
        // 乗客
        const ph = (cx + w * 37) * 0.7, k = s.k, hc = ['#ffd4b8', '#f0b48e', '#ffe0c8'][w % 3], hair = ['#2b2140', '#7a4a2a', '#c4a6ff', '#ff9f1c'][(w + cx / 40) & 3];
        g.clipRR(wx, 300, 140, 120, 14, () => {
          g.circ(wx + 70, 390, 36, hc, 5); g.ell(wx + 70, 362, 38, 22, hair, 0); g.rr(wx + 26, 420, 88, 40, 20, PEN2[w % 4], 5);
          if (k >= 1) { const a = Math.sin(s.t * 12 + ph) * 0.4; g.at(wx + 118, 402, -0.4 + a, () => { g.cap(0, 0, 0, -50, 11, hc, 4); g.circ(0, -56, 15, hc, 4); }); }
        });
        g.rr(wx, 300, 140, 120, 14, null, 5);
      }
      g.circ(cx + 140, 584, 34, '#5c6478'); g.circ(cx + 620, 584, 34, '#5c6478');
    }
  });
  g.band(640, 'bottom', '#cfd3dc', 7); g.band(660, 690, '#ffd23f'); for (let x = Math.floor(V.x0 / 60) * 60; x < V.x1; x += 60) g.circ(x + 30, 675, 6, '#e8b800', 0);
}
const PEN2 = [C.red, C.blue, C.purple, C.teal];
const WAVE = [
  { k: 'cat', name: 'ねこに手をふる', short: 'ねこ', theme: 'animal', sfx: 'meow', who: 'cat' },
  { k: 'panda', name: 'パンダに手をふる', short: 'パンダ', theme: 'animal', sfx: ['boing', 'chime'], who: 'panda' },
  { k: 'train', name: '電車を見送る', short: '電車', theme: 'town', sfx: ['whistle', 'honk'], who: 'train' },
];

/* =========================================================================
   うちわであおぐ：やきとり・あついいぬ・おもちゃのヨット
   ========================================================================= */
function uchiwa(g, x, y, a, v, sc = 1) {
  g.at(x, y, a, sc, sc, () => {
    g.rr(-13, 40, 26, 190, 10, '#d8b36a');
    g.circ(0, -70, 124, v.face);
    for (let i = -3; i <= 3; i++) g.line([0, 40, Math.sin(i * 0.42) * 118, -70 - Math.cos(i * 0.42) * 118], 'rgba(160,120,60,0.25)', 4);
    if (v.k === 'grill') { g.circ(0, -70, 56, C.red, 0); g.text('祭', 0, -68, { size: 64, f: '#ffffff', font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); }
    else if (v.k === 'dog') { for (let i = 0; i < 3; i++) g.at(-40 + i * 44, -60 + (i % 2) * 40, 0.5, () => { g.ell(0, 0, 26, 14, C.red, 4); g.tri(22, 0, 44, -14, 44, 14, C.red, 4); g.circ(-12, -3, 3, C.ol, 0); }); }
    else { for (let i = 0; i < 4; i++) g.arc(0, 30, 50 + i * 28, Math.PI * 1.15, Math.PI * 1.85, ['#4cc9f0', '#3a86ff', '#4cc9f0', '#3a86ff'][i], 12); }
    g.circ(0, -70, 124, null);
  });
}
function grill(g, s, L) {
  const V = g.V; g.bg('#1d1446', '#4b1f5e');
  for (let x = Math.floor(V.x0 / 170) * 170; x < V.x1; x += 170) { const y = 110 + 26 * Math.sin(x); g.glow(x, y + 30, 70, '#ff9b6b', 0.35); g.ell(x, y + 30, 32, 28, '#e8402f'); g.line([x - 26, y + 30, x + 26, y + 30], '#b8261c', 3); }
  g.band(780, 'bottom', '#3a2a55');
  const fire = L, fl = [0.35, 0.75, 1.15][Math.min(2, Math.round(fire))] + 0.08 * Math.sin(s.t * 20);
  g.rr(140, 600, 720, 180, 20, '#5c6478'); g.rr(160, 560, 680, 70, 14, '#2b2140');
  for (let i = 0; i < 9; i++) g.circ(200 + i * 75, 600, 34, g.mix('#5a4a50', '#ff6a2a', clamp(fire / 1.5)), 0);
  g.alpha(0.9, () => { for (let i = 0; i < 6; i++) { const x = 230 + i * 110, h = 120 * fl * (0.8 + 0.3 * Math.sin(s.t * 13 + i * 2)); g.at(x, 600, 0, 40, h, () => g.path(FLAME, i % 2 ? C.orange : C.yellow, 0)); } });
  // くし
  const cook = clamp(L / 2);
  for (let i = 0; i < 4; i++) { const x = 250 + i * 160; g.line([x - 70, 540, x + 70, 540], '#e8d2a6', 8); for (let j = 0; j < 3; j++) g.rr(x - 54 + j * 38, 512, 34, 56, 10, g.mix('#ffd9b0', '#a0522d', cook)); }
  g.rr(140, 600, 720, 180, 20, null);
}
function hotDog(g, s, L) {
  const V = g.V; g.sky('#ffb14a', '#ffe38a', 640); g.sun(820, 140, 90, '#ffef70');
  g.band(600, 'bottom', '#d39457', 7); g.planks(V.x0 - 20, 610, V.x1 - V.x0 + 40, 500, 5, '#c98b52');
  const cool = L >= 1, happy = L >= 1.9, a = s.t;
  g.at(500, 500, 0, () => {
    g.ell(0, 120, 130, 90, '#e8b07a');
    const ear = cool ? Math.sin(a * 10) * 0.3 : 0;
    g.at(-100, -60, -0.3 + ear, () => g.ell(0, 50, 40, 80, '#a0673c'));
    g.at(100, -60, 0.3 - ear, () => g.ell(0, 50, 40, 80, '#a0673c'));
    g.circ(0, -10, 120, '#e8b07a'); g.ell(0, 40, 66, 50, '#fff1d6', 0);
    if (happy) { g.arc(-44, -30, 16, Math.PI * 1.15, Math.PI * 1.85, C.ol, 7); g.arc(44, -30, 16, Math.PI * 1.15, Math.PI * 1.85, C.ol, 7); }
    else { g.circ(-44, -30, 12, C.ol, 0); g.circ(44, -30, 12, C.ol, 0); }
    g.ell(0, 10, 22, 15, C.ol, 0);
    const tg = happy ? 30 : cool ? 50 : 70 + Math.abs(Math.sin(a * 16)) * 14;
    g.rr(-20, 34, 40, tg, 18, '#ff6b8b'); g.line([0, 40, 0, 30 + tg * 0.8], '#e0456b', 4);
    g.path('M-50 30 Q-25 50 0 30 Q25 50 50 30', null, 6);
    g.ell(-80, 30, 18, 10, 'rgba(255,110,140,0.5)', 0); g.ell(80, 30, 18, 10, 'rgba(255,110,140,0.5)', 0);
    if (!cool) for (const [x, y] of [[-130, -100], [140, -60]]) g.path(`M${x} ${y - 30} Q${x + 16} ${y} ${x} ${y + 12} Q${x - 16} ${y} ${x} ${y - 30} Z`, '#8fd8ff', 4);
  });
  if (cool) for (let i = 0; i < 3; i++) { const y = 380 + i * 70, o = ((s.t * 1.6 + i * 0.3) % 1); g.alpha(1 - o, () => g.curve([380 + o * 60, y, 440 + o * 60, y - 14, 500 + o * 60, y + 6], '#ffffff', 8)); }
}
function boat(g, s, L) {
  const V = g.V; g.bg('#bfe9ff'); g.tiles(V.x0, V.y0, V.x1 - V.x0, 300 - V.y0, 90, '#ffffff', '#e6f6ff');
  g.band(300, 'bottom', '#4cc9f0', 7);
  for (let i = 0; i < 9; i++) { const y = 340 + i * 70; g.arc(((i * 237) % 900) + 50 + Math.sin(s.t * 2 + i) * 20, y, 30, Math.PI + 0.4, -0.4, '#ffffff', 5); }
  g.at(500, 230, 0, () => { g.line([0, 80, 0, -60], C.ol, 7); g.tri(0, -60, 90, -36, 0, -12, C.red); g.ell(0, 80, 50, 14, '#ffffff'); });
  const y = lerp(590, 330, clamp(L / 2)), sc = lerp(1.05, 0.72, clamp(L / 2)), bob = Math.sin(s.t * 4) * 6;
  g.at(500, y + bob, Math.sin(s.t * 3) * 0.05, sc, sc, () => {
    g.ell(0, 60, 170, 24, 'rgba(255,255,255,0.6)', 0);
    g.path('M-150 0 L150 0 L110 60 L-110 60 Z', C.red); g.rect(-150, 0, 300, 16, '#ffffff', 5);
    g.line([0, 0, 0, -250], '#7a4a2a', 10);
    const puff = 1 + 0.12 * Math.sin(s.t * 9);
    g.at(8, 0, 0, puff, 1, () => g.path('M0 -240 Q150 -150 0 -20 Z', '#ffffff')); g.at(-8, 0, 0, puff, 1, () => g.path('M0 -200 Q-110 -120 0 -30 Z', '#ffe873'));
    g.tri(0, -250, 50, -236, 0, -222, C.blue, 4);
  });
}
const FAN = [
  { k: 'grill', name: 'やきとりを焼く', short: 'やきとり', theme: 'festival', sfx: 'whoosh', face: '#ffffff', hy: 330 },
  { k: 'dog', name: 'いぬをあおぐ', short: 'あつい犬', theme: 'animal', sfx: 'wind', face: '#e8f7ff', hy: 215, modes: ['one'] },
  { k: 'boat', name: 'ヨットを進める', short: 'ヨット', theme: 'sea', sfx: 'wind', face: '#ffffff', hy: 760 },
];

/* =========================================================================
   指揮をする：どうぶつ楽団・カエルの合唱
   ========================================================================= */
function frog(g, x, y, sing, t, sc = 1) {
  g.at(x, y, 0, sc, sc, () => {
    g.ell(0, 60, 150, 36, '#3a9a4a'); g.tri(0, 60, 150, 40, 150, 80, '#1f6b5e', 0);
    const b = sing ? Math.abs(Math.sin(t * 10)) : 0;
    g.ell(0, 0, 90, 70, '#7ccf6a');
    if (sing) g.circ(0, 30, 30 + b * 22, '#ffe2f0');
    g.circ(-46, -60, 30, '#7ccf6a'); g.circ(46, -60, 30, '#7ccf6a');
    g.circ(-46, -62, 16, '#ffffff', 4); g.circ(46, -62, 16, '#ffffff', 4); g.circ(-46, -60, 8, C.ol, 0); g.circ(46, -60, 8, C.ol, 0);
    if (sing) g.ell(0, -6, 30, 16 + b * 10, '#c44a72', 5); else g.curve([-40, -10, 0, 6, 40, -10], C.ol, 5);
    g.ell(-64, 10, 14, 8, 'rgba(255,110,140,0.5)', 0); g.ell(64, 10, 14, 8, 'rgba(255,110,140,0.5)', 0);
    g.ell(-70, 56, 30, 14, '#5db352'); g.ell(70, 56, 30, 14, '#5db352');
  });
}
function choir(g, s) {
  const V = g.V; g.bg('#16184a', '#2d3a7a'); g.circ(820, 140, 60, '#fff3b0', 0); g.glow(820, 140, 160, '#fff3b0', 0.3);
  for (let i = 0; i < 14; i++) g.star(V.x0 + ((i * 263) % (V.x1 - V.x0)), V.y0 + ((i * 137) % (420 - V.y0)), 7, 3, 4, '#fff6c8', 0);
  g.band(430, 'bottom', '#1f5a6e'); for (let i = 0; i < 8; i++) g.arc(((i * 211) % 1000), 480 + (i * 83) % 400, 40, Math.PI + 0.4, -0.4, 'rgba(255,255,255,0.3)', 5);
  const sing = [s.k >= 1, s.k >= 2, s.k >= 1];
  [[230, 470, 0.85], [500, 420, 1], [770, 470, 0.85]].forEach(([x, y, sc], i) => frog(g, x, y, sing[i], s.t + i, sc));
}
function band(g, s) {
  const V = g.V; g.bg('#4a1f5e', '#2a1446');
  g.band(620, 'bottom', '#a0673c', 7); g.planks(V.x0 - 20, 630, V.x1 - V.x0 + 40, 500, 5, '#b7794a');
  if (s.k >= 1) for (const [x, c] of [[230, '#fff3b0'], [500, '#ffd6f0'], [770, '#d6f0ff']]) g.alpha(0.25, () => g.poly([x - 40, V.y0, x + 40, V.y0, x + 170, 640, x - 170, 640], c, 0));
  const play = [s.k >= 1, s.k >= 2, s.k >= 1], t = s.t * 9;
  // くま（たいこ）
  g.at(230, 470, 0, () => {
    const b = play[0] ? Math.abs(Math.sin(t)) * 10 : 0;
    g.circ(-60, -150 - b, 26, '#a0673c'); g.circ(60, -150 - b, 26, '#a0673c'); g.ell(0, -40, 90, 110, '#a0673c'); g.circ(0, -110 - b, 70, '#a0673c'); g.ell(0, -90 - b, 30, 22, '#e5c39b', 0);
    g.circ(-24, -120 - b, 8, C.ol, 0); g.circ(24, -120 - b, 8, C.ol, 0);
    g.ell(0, 70, 110, 40, '#e8434f'); g.rect(-110, 70, 220, 70, '#e8434f', 0); g.ell(0, 140, 110, 40, '#c8303a'); g.line([-110, 70, -110, 140], C.ol, 7); g.line([110, 70, 110, 140], C.ol, 7); g.ell(0, 70, 110, 40, '#ffffff');
    g.line([-60, -20, -30, 60 - (play[0] ? Math.abs(Math.sin(t)) * 50 : 0)], C.wood2, 12); g.line([60, -20, 30, 60 - (play[0] ? Math.abs(Math.cos(t)) * 50 : 0)], C.wood2, 12);
  });
  // ねこ（ラッパ）
  g.at(500, 420, 0, () => {
    const b = play[1] ? Math.abs(Math.sin(t + 1)) * 10 : 0;
    g.ell(0, 60, 80, 110, '#ffb347'); g.tri(-60, -90 - b, -40, -170 - b, -10, -110 - b, '#ffb347'); g.tri(60, -90 - b, 40, -170 - b, 10, -110 - b, '#ffb347'); g.circ(0, -80 - b, 74, '#ffb347');
    g.circ(-26, -90 - b, 8, C.ol, 0); g.circ(26, -90 - b, 8, C.ol, 0);
    g.at(0, -50 - b, play[1] ? -0.2 : 0.5, () => { g.rr(-6, -8, 120, 18, 8, C.gold); g.path('M110 -30 L170 -56 L170 36 L110 10 Z', C.gold); });
  });
  // うさぎ（バイオリン）
  g.at(770, 470, 0, () => {
    const b = play[2] ? Math.abs(Math.sin(t + 2)) * 10 : 0;
    g.ell(-26, -230 - b, 22, 70, '#ffffff'); g.ell(26, -230 - b, 22, 70, '#ffffff'); g.ell(0, -30, 80, 110, '#ffffff'); g.circ(0, -110 - b, 66, '#ffffff');
    g.circ(-22, -116 - b, 8, C.ol, 0); g.circ(22, -116 - b, 8, C.ol, 0); g.ell(0, -92 - b, 8, 6, '#ff7a8a', 0);
    g.at(-40, -40, -0.6, () => { g.path('M0 -70 Q40 -70 36 -30 Q30 0 40 30 Q40 70 0 70 Q-40 70 -40 30 Q-30 0 -36 -30 Q-40 -70 0 -70 Z', '#c8743a'); g.rr(-8, -150, 16, 90, 6, C.ol, 0); });
    g.line([60, -110 + (play[2] ? Math.sin(t) * 40 : 0), -100, 30 + (play[2] ? Math.sin(t) * 40 : 0)], '#f6e9cf', 6);
  });
}
const COND = [
  { k: 'band', name: 'どうぶつ楽団の指揮', short: '指揮', theme: 'music', sfx: 'piano' },
  { k: 'frog', name: 'カエルの合唱', short: 'カエル', theme: 'nature', sfx: 'pluck' },
];

/* =========================================================================
   のこぎりで丸太を切る（片手・左手は左右反転）
   ========================================================================= */
function saw(g, s, bx, depth) {
  g.at(bx, 0, () => {
    const top = 430 + depth;
    g.at(0, top, () => g.path('M-300 -120 L250 -90 L250 10 L-300 10 Z', '#e6ecf4'));
    const tz = []; for (let x = -300; x <= 250; x += 22) tz.push(x, top + 10, x + 11, top + 28);
    g.line(tz, C.steel, 5);
    g.line([-280, top - 90, 230, top - 66], '#ffffff', 6);
    g.rr(240, top - 120, 60, 140, 14, C.steel);
    g.rr(290, top - 70, 170, 64, 30, '#c0392b');
  });
}
function logScene(g, s, v) {
  const V = g.V, ph = s.ph, depth = s.k >= 2 ? 160 : 160 * clamp(lerp(0.18, 0.55, clamp((ph + 0.7) / 0.7)) + (s.k >= 1 ? 0.45 * clamp(ph) : 0));
  g.sky('#8fd8ff', '#e3f6ff', 700); g.hills(560, '#7ccf6a', 50, 2, 4); g.band(700, 'bottom', '#72c957', 7);
  for (const x of [270, 730]) { g.line([x - 70, 900, x, 560, x + 70, 900], '#8a5a36', 22); }
  const a2 = age2(s), fall = a2 < 0 ? 0 : E.outBounce(clamp(a2 / 0.3));
  // 丸太（左は固定、右は2回目で落ちる）
  const bark = '#a0673c', end = '#f2d49b';
  const draw = (x0, x1, capL, capR) => { g.rr(x0, 450, x1 - x0, 160, 20, bark); for (let x = x0 + 30; x < x1 - 20; x += 70) g.line([x, 470, x + 20, 590], '#7a4a2a', 5); if (capR) { g.ell(x1, 530, 40, 80, end); g.ell(x1, 530, 24, 50, null, 4); g.ell(x1, 530, 10, 22, null, 4); } if (capL) { g.ell(x0, 530, 40, 80, end); g.ell(x0, 530, 24, 50, null, 4); } };
  draw(130, 500, true, s.k >= 2);
  g.at(500 + fall * 70, 610 + fall * 170, fall * 0.55, () => g.at(-500, -610, () => draw(500, 870, s.k >= 2, true)));
  if (s.k < 2) { g.rect(492, 450, 16, depth, '#5a3a22', 0); }
}
const SAW = [{ k: 'log', name: '丸太を切る', short: 'のこぎり', theme: 'diy', sfx: ['rip', 'break'] }];

/* =========================================================================
   けんばんをすべる（グリッサンド）：ピアノ・木琴
   ========================================================================= */
const GL = [
  { k: 'piano', name: 'ピアノでグリッサンド', short: 'ピアノ', theme: 'music', sfx: 'piano' },
  { k: 'xylo', name: '木琴をすべらせる', short: '木琴', theme: 'music', sfx: 'xylo' },
];
const RAIN = [C.red, C.orange, C.yellow, C.lime, C.teal, C.blue, C.purple, C.magenta];
export default [
  {
    id: 'wipe-clean', acts: ['wipe'], modes: ['one'], vars: CLEAN, sfx: (k, v) => v.sfx,
    init(s, v) {
      const R = SURF[v.k].R;
      s.my.blot = Array.from({ length: 8 }, () => [lerp(R.x0, R.x1, s.r()), lerp(R.y0, R.y1, s.r()), 40 + s.r() * 90, 30 + s.r() * 70, s.r() < 0.6]);
      s.my.drops = Array.from({ length: 26 }, () => [lerp(R.x0 + 10, R.x1 - 10, s.r()), lerp(R.y0 + 10, R.y1 - 10, s.r()), 10 + s.r() * 26]);
      s.my.px = null; s.my.vx = 0;
    },
    draw(g, s, v) {
      const P = SURF[v.k], R = P.R, pair = s.mode === 'both' && PAIR.has(P.tool), hx = pair ? 500 + 245 * s.x : hxOf(s);
      if (s.my.px !== null && s.dt > 0) s.my.vx = lerp(s.my.vx, (hx - s.my.px) / s.dt, 0.3); s.my.px = hx;
      track(s, hx);
      P.bg(g, s); P.after(g, s, R);
      const rs = dirty(s, R, P.tool === 'roller' ? 0 : pair ? 160 : 40);
      if (rs.length) clipRects(g, rs, () => P.dirt(g, s, R));
      if (s.k >= 1 && v.k !== 'board' && v.k !== 'paint') { const ym = (R.y0 + R.y1) / 2, y0 = s.k >= 2 ? R.y0 : R.y0; clipRects(g, [[R.x0, y0, R.x1 - R.x0, (s.k >= 2 ? R.y1 : ym) - y0]], () => { for (let i = 0; i < 5; i++) twinkle(g, R.x0 + 60 + ((i * 173) % (R.x1 - R.x0 - 120)), R.y0 + 50 + ((i * 263) % (R.y1 - R.y0 - 100)), 26, s.t * 5 + i * 2); }); }
      P.frame(g, s, R);
      tool(g, s, v, P, hx, bandY(s, R));
    },
    hit(g, s, k, v) {
      const P = SURF[v.k], R = P.R, x = endX(s, s.lastDir), ym = (R.y0 + R.y1) / 2, y = k === 1 ? (R.y0 + ym) / 2 : (ym + R.y1) / 2;
      const dust = v.k === 'board' ? '#ffffff' : v.k === 'fossil' || v.k === 'chest' ? '#f0d29a' : null;
      if (dust) g.fx.smoke(x, y, 6, dust); else g.fx.sparks(x, y, 10);
      g.fx.pop(v.pop[k - 1], s.lastDir === 'L' ? 700 : 300, k === 1 ? ym - 20 : R.y0 + 60, { size: k === 2 ? 110 : 100, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 8 : 5, 0.12);
      if (k === 2) {
        g.fx.stars(500, (R.y0 + R.y1) / 2, 10);
        g.sfx(v.k === 'chest' ? 'coin' : v.k === 'mirror' ? 'quack' : v.k === 'fossil' ? 'cheer' : 'chime');
        if (v.k === 'chest') g.fx.coins(500, 480, 14);
        if (v.k === 'window') g.fx.notes(440, 400, 4);
        if (v.k === 'tank') g.fx.hearts(500, 420, 6);
      }
    },
  },
  {
    id: 'wipe-wave', acts: ['wipe'], modes: ['one', 'both'], vars: WAVE, sfx: (k, v) => Array.isArray(v.sfx) ? v.sfx[k - 1] : v.sfx,
    draw(g, s, v) {
      const hx = hxOf(s); vxOf(s, hx);
      if (v.who === 'cat') { townBg(g, s); g.at(500, 214, 0, 0.92, 0.92, () => sitter(g, 0, 0, 'cat', s.k, s.t)); }
      else if (v.who === 'panda') { zooBg(g, s); g.at(500, 400, 0, 0.98, 0.98, () => sitter(g, 0, 0, 'panda', s.k, s.t)); }
      else { const a2 = age2(s), go = s.k === 0 ? 0 : s.k === 1 ? 140 * E.inQ(clamp(s.ph)) : 140 + 1600 * a2 * a2 + 300 * a2; station(g, s, go); }
      const wy = v.who === 'train' ? 760 : 720, sl = v.who === 'panda' ? C.green : undefined;
      if (s.mode === 'both') { const cx = 500 + 230 * s.x; waveArm(g, s, cx - 150, wy, { sleeve: sl, side: 'L' }); waveArm(g, s, cx + 150, wy, { sleeve: sl, side: 'R' }); }
      else waveArm(g, s, hx, wy, { sleeve: sl });
    },
    hit(g, s, k, v) {
      const x = v.who === 'train' ? 500 : 500, y = v.who === 'cat' ? 160 : v.who === 'panda' ? 300 : 330;
      const pops = { cat: ['ニャッ', 'ニャーン'], panda: ['あっ', 'わーい'], train: ['プァン', 'バイバイ'] }[v.who];
      g.fx.pop(pops[k - 1], s.lastDir === 'L' ? 770 : 230, v.who === 'cat' ? 300 : 200, { size: 100, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 7 : 4, 0.1);
      if (k === 2) g.fx.hearts(x, y, 7); else g.fx.burst(x, y - 60, { n: 6, c: ['#ffffff', C.yellow], shape: 'star', sp: [200, 400], size: [14, 22], g: 300 });
      if (v.who === 'train' && k === 2) g.fx.smoke(820, 300, 6);
    },
  },
  {
    id: 'wipe-fan', acts: ['wipe'], modes: ['one', 'both'], vars: FAN, sfx: (k, v) => v.sfx,
    draw(g, s, v) {
      const both = s.mode === 'both', hx = both ? 500 + 250 * s.x : hxOf(s), vx = vxOf(s, hx), L = s.k === 0 ? 0 : s.k - 1 + E.outBack(clamp(s.age / 0.3));
      if (v.k === 'grill') grill(g, s, L); else if (v.k === 'dog') hotDog(g, s, L); else boat(g, s, L);
      const a = clamp(-vx / 2600, -0.45, 0.45), hy = v.hy + (both && v.k === 'dog' ? 30 : 0), sleeve = v.k === 'grill' ? '#e8434f' : undefined;
      if (both) {
        // 大うちわを両手で
        const sc = 1.22; uchiwa(g, hx, hy, a, v, sc);
        const P = t => [hx - t * sc * Math.sin(a), hy + t * sc * Math.cos(a)], [lx, ly] = P(120), [rx, ry] = P(205);
        g.arm(lx, ly, Math.atan2(ly - 1320, lx - 60), { hand: 'grip', side: 'L', sleeve }); g.arm(rx, ry, Math.atan2(ry - 1320, rx - 940), { hand: 'grip', side: 'R', sleeve });
      } else {
        uchiwa(g, hx, hy, a, v);
        const gx = hx - 175 * Math.sin(a), gy = hy + 175 * Math.cos(a), sg = s.side === 'L' ? -1 : 1;
        g.arm(gx, gy, a - Math.PI / 2 - sg * 0.55, { hand: 'grip', side: s.side === 'L' ? 'L' : 'R', sleeve });
      }
    },
    hit(g, s, k, v) {
      const big = k === 2, x = endX(s, s.lastDir);
      g.fx.burst(500, v.k === 'boat' ? 500 : 420, { n: 6, c: '#ffffff', shape: 'smoke', sp: [80, 220], size: [30, 50], g: -40, life: [0.3, 0.6], dir: s.lastDir === 'L' ? 0 : Math.PI, spread: 1 });
      if (v.k === 'grill') { g.fx.sparks(500, 560, big ? 18 : 10, [C.yellow, C.orange, '#fff6b0']); g.fx.pop(big ? 'ジュ〜' : 'ボッ', s.lastDir === 'L' ? 740 : 260, 330, { size: 100, c: big ? C.yellow : '#ffffff' }); if (big) { g.fx.smoke(500, 470, 8, '#ffffff'); g.sfx('squish'); } }
      else if (v.k === 'dog') { g.fx.pop(big ? 'ふぅ〜' : 'そよ', s.lastDir === 'L' ? 760 : 240, 260, { size: 96 }); if (big) { g.fx.hearts(500, 300, 7); g.sfx('chime'); } }
      else { g.fx.splash(500, big ? 400 : 560, C.water, 10); g.fx.pop(big ? 'ゴール！' : 'スイー', s.lastDir === 'L' ? 750 : 250, 180, { size: 100, c: big ? C.yellow : '#ffffff' }); if (big) { g.fx.stars(500, 260, 9); g.sfx('ding'); } }
      g.fx.shake(big ? 6 : 3, 0.1);
    },
  },
  {
    id: 'wipe-conduct', acts: ['wipe'], modes: ['one', 'both'], vars: COND, sfx: (k, v) => v.sfx,
    draw(g, s, v) {
      const both = s.mode === 'both', cx = both ? 500 + 200 * s.x : hxOf(s), vx = vxOf(s, cx);
      if (v.k === 'band') band(g, s); else choir(g, s);
      const hy = 700 - 60 * (1 - s.x * s.x), a = clamp(vx / 3000, -0.35, 0.35) + s.x * 0.35;
      // 両手のときは左手を開いて、右手に指揮棒
      const side = both ? 'R' : (s.side === 'L' ? 'L' : 'R'), sg = side === 'L' ? -1 : 1, hx = both ? cx + 150 : cx;
      if (both) g.arm(cx - 150, hy + 10, -Math.PI / 2 + 0.3 + a * 0.7, { hand: 'open', side: 'L', sleeve: '#2b2140' });
      g.at(hx, hy, a, () => { g.cap(0, 10, 0, -250, 6, '#ffffff', 4); g.rr(-12, -10, 24, 50, 10, '#ffffff', 5); });
      g.arm(hx + 10 * sg, hy + 40, a - Math.PI / 2 - sg * 0.35, { hand: 'grip', side, sleeve: '#2b2140' });
    },
    hit(g, s, k, v) {
      const big = k === 2;
      g.fx.notes(v.k === 'band' ? (s.lastDir === 'L' ? 230 : 770) : 500, 300, big ? 9 : 5);
      g.fx.pop(big ? 'ジャーン！' : v.k === 'band' ? 'ブンチャ' : 'ケロケロ', 500, 130, { size: big ? 110 : 100, c: big ? C.yellow : '#ffffff' });
      if (big) { g.fx.confetti(60); g.sfx(v.k === 'band' ? 'cymbal' : 'chime'); }
      g.fx.shake(big ? 6 : 3, 0.1);
    },
  },
  {
    id: 'wipe-saw', acts: ['wipe'], modes: ['one'], vars: SAW, sfx: ['rip', 'break'],
    draw(g, s, v) {
      g.mirror(s.side, () => {
        logScene(g, s, v);
        const sx = s.side === 'L' ? -s.x : s.x, bx = 520 + 140 * sx, depth = s.k >= 2 ? 160 : 160 * clamp(lerp(0.18, 0.55, clamp((s.ph + 0.7) / 0.7)) + (s.k >= 1 ? 0.45 * clamp(s.ph) : 0));
        const lift = s.k >= 2 ? 60 * E.outQ(clamp(s.age / 0.2)) : 0;
        g.at(0, -lift, () => saw(g, s, bx - 40, Math.min(depth, 150)));
        g.arm(bx + 330, 395 + Math.min(depth, 150) - lift, -Math.PI / 2 - 0.55, { hand: 'grip', sleeve: '#3cc46b' });
      });
    },
    hit(g, s, k) {
      const x = 500, big = k === 2;
      g.fx.chips(x, 560, '#f2d49b', big ? 16 : 10); g.fx.burst(x, 600, { n: 8, c: ['#f2d49b', '#e3c584'], shape: 'dot', sp: [100, 300], size: [8, 14], g: 900, spread: 2 });
      g.fx.pop(big ? 'ゴトン！' : 'ギコッ', g.mx(s.lastSide, big ? 640 : 320), big ? 320 : 330, { size: big ? 110 : 96, c: big ? C.yellow : '#ffffff' });
      g.fx.shake(big ? 10 : 4, 0.14); if (big) g.fx.stars(g.mx(s.lastSide, 700), 600, 8);
    },
  },
  {
    id: 'wipe-gliss', acts: ['wipe'], modes: ['one', 'both'], vars: GL, sfx: (k, v) => v.sfx,
    init(s) { s.my.lit = []; },
    draw(g, s, v) {
      const V = g.V, both = s.mode === 'both', hx = both ? 500 + 240 * s.x : hxOf(s), hxs = both ? [hx - 110, hx + 110] : [hx];
      if (v.k === 'piano') {
        g.bg('#2a1650', '#4a1f5e'); for (const x of [V.x0 - 40, V.x1 - 160]) g.rect(x, V.y0, 200, 1000 - V.y0, '#b8263a', 0);
        if (s.k >= 1) g.alpha(0.25, () => g.poly([440, V.y0, 560, V.y0, 820, 900, 180, 900], '#fff3b0', 0));
        g.rr(60, 300, 880, 260, 20, '#1c1a26'); g.rr(300, 330, 400, 150, 8, '#fdfaf3'); for (let i = 0; i < 4; i++) g.line([320, 360 + i * 30, 680, 360 + i * 30], '#cfc8b8', 3); for (const [x, y] of [[380, 368], [460, 390], [540, 360], [620, 396]]) g.circ(x, y, 8, C.ol, 0);
        g.band(860, 'bottom', '#1c1a26');
        const n = 22, w = 880 / n, x0 = 60;
        const keys = hxs.map(x => clamp(Math.floor((x - x0) / w), 0, n - 1));
        for (let i = 0; i < n; i++) { const lit = s.my.lit[i], on = lit != null && s.t - lit < 2; const kx = x0 + i * w; g.rect(kx, 560, w, 300, on ? g.mix(RAIN[i % 8], '#ffffff', clamp((s.t - lit) / 1.2) * 0.6) : '#ffffff', 4); if (keys.includes(i)) g.rect(kx, 560, w, 300, 'rgba(40,30,60,0.15)', 0); }
        for (let i = 0; i < n - 1; i++) { const m = i % 7; if (m === 2 || m === 6) continue; g.rr(x0 + (i + 1) * w - 13, 560, 26, 180, 4, '#1c1a26', 0); }
        g.rect(60, 548, 880, 16, '#b8263a', 5);
      } else {
        g.bg('#ffe9a8', '#ffd27a'); g.dots(-40, -40, 1080, 920, 160, 9, '#ffe08a');
        g.band(860, 'bottom', '#c98b52', 7);
        g.line([80, 520, 920, 580], '#7a4a2a', 22); g.line([80, 760, 920, 700], '#7a4a2a', 22);
        const n = 8;
        for (let i = 0; i < n; i++) { const kx = 110 + i * 102, h = 330 - i * 22, lit = s.my.lit[i], on = lit != null && s.t - lit < 0.5, j = on ? -jig(s.t - lit, 16, 30, 9) : 0; g.rr(kx, 640 - h / 2 + j, 86, h, 14, RAIN[i]); g.circ(kx + 43, 640 - h / 2 + 24 + j, 8, '#ffffff', 4); g.circ(kx + 43, 640 + h / 2 - 24 + j, 8, '#ffffff', 4); g.hl(kx + 24, 640 - h / 4 + j, 8, h / 5, 0, 0.4); }
      }
      // さわったけん
      const n = v.k === 'piano' ? 22 : 8, kw = v.k === 'piano' ? 40 : 102, k0 = v.k === 'piano' ? 60 : 110;
      if (!s.my.last) s.my.last = [];
      hxs.forEach((x, j) => { const idx = Math.floor((x - k0) / kw); if (idx >= 0 && idx < n && s.my.last[j] !== idx) { s.my.lit[idx] = s.t; s.my.last[j] = idx; } });
      const sides = both ? ['L', 'R'] : [s.side === 'L' ? 'L' : 'R'];
      sides.forEach((sd, j) => {
        const x = hxs[j], sg = sd === 'L' ? -1 : 1;
        if (v.k === 'piano') g.arm(x, 700, -Math.PI / 2 - sg * 0.25, { hand: 'open', side: sd });
        else { const a = -sg * 0.5; g.at(x, 560, a, () => { g.rr(-8, 0, 16, 260, 8, C.wood2); g.circ(0, -6, 30, sd === 'L' ? C.blue : C.red); g.hl(-10, -14, 9, 6, -0.5, 0.6); }); g.arm(x - Math.sin(a) * 210, 560 + Math.cos(a) * 210, a - Math.PI / 2 - sg * 0.6, { hand: 'grip', side: sd }); }
      });
    },
    hit(g, s, k, v) {
      const big = k === 2, x = endX(s, s.lastDir);
      g.fx.notes(x, 500, big ? 8 : 5, [C.yellow, C.pink, C.sky]);
      g.fx.pop(big ? 'ジャーン！' : 'ポロロン', 500, 180, { size: big ? 110 : 100, c: big ? C.yellow : '#ffffff' });
      if (big) { g.fx.stars(500, 500, 10); g.fx.confetti(50); g.sfx('chime'); }
      g.fx.shake(big ? 6 : 3, 0.1);
    },
  },
];
