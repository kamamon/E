/* 手をたたく（両手） — p=0 で手のひらが合わさる、p=1 で大きく開く。手は左右の端から */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const TAU = Math.PI * 2;
// 当たるたびに 0→1→2 と上がる段階（d 秒かけて）
const lv = (s, d = 0.3, f = E.outQ) => s.k === 0 ? 0 : s.k - 1 + f(clamp(s.age / d));
// 2つ目の当たりから何秒（なければ -1）
const age2 = s => s.k >= 2 ? s.age : -1;

/* ---------- 手（横から見た手の甲。手のひらは中央を向く） ---------- */
function clapHand(g, side, x, y, o = {}) {
  const s = o.s ?? 1, sg = side === 'L' ? -1 : 1, rot = (o.rot ?? -0.1) * sg, skin = o.skin ?? C.skin;
  const sleeve = o.sleeve ?? C.sleeve;
  const lx = 8, ly = 76, cr = Math.cos(rot), sr = Math.sin(rot);
  const wx = x + sg * s * lx * cr - s * ly * sr, wy = y + sg * s * lx * sr + s * ly * cr;
  const ex = 500 + sg * (o.ex ?? 640), ey = o.ey ?? 1240;
  const ang = Math.atan2(wy - ey, wx - ex), back = ang + Math.PI, L = g._toEdge(wx, wy, back) + 60;
  const fx = wx + Math.cos(back) * L, fy = wy + Math.sin(back) * L;
  g.taper(fx, fy, wx, wy, 70 * s, 46 * s, skin);
  const k = Math.min(0.6, 260 * s / L), qx = lerp(wx, fx, k), qy = lerp(wy, fy, k);
  if (sleeve) { g.taper(fx, fy, qx, qy, 90 * s, 78 * s, sleeve); g.ell(qx, qy, 78 * s, 26 * s, sh(sleeve, 0.18), 6, ang + Math.PI / 2); }
  g.at(x, y, rot, sg * s, s, () => {
    g.blob([-44, 64, -48, 0, -50, -70, -44, -140, -24, -178, 4, -184, 26, -166, 40, -110, 46, -30, 42, 60, 14, 84, -24, 82], skin);
    for (const [ax, ay, bx, by] of [[-30, -150, -26, -96], [-8, -164, -4, -100], [14, -156, 16, -96]]) g.line([ax, ay, bx, by], sh(skin, -0.22), 4);
    g.blob([-47, 66, -49, 8, -42, -36, -28, -30, -24, 20, -30, 64], skin);       // 親指
    g.hl(20, -60, 10, 34, 0.1, 0.35);
  });
}
// 両手。e = 手のひらの面と中央の距離
function hands(g, s, e, o = {}) {
  const y = o.y ?? 540, sc = o.s ?? 1;
  for (const side of ['L', 'R']) { const sg = side === 'L' ? -1 : 1; clapHand(g, side, 500 + sg * (e + 49 * sc), y, o); }
}
// 手のひらの位置：p=0 で e0、p=1 で e1
const gap = (s, e0, e1 = 330) => lerp(e0, e1, E.ioQ(clamp(s.p)));
// たたいた所のふつうのエフェクト
function clapFx(g, x, y, k, o = {}) {
  g.fx.lines(x, y, { n: 10, r0: o.r0 ?? 120, r1: o.r1 ?? 230, w: 10, c: o.c ?? '#ffffff' });
  g.fx.shake(k === 2 ? 10 : 7, 0.12);
}
// でこぼこの丸（多角形の点）
function lumpy(n, r, amp, seed) { const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push(r * (1 + amp * Math.sin(a * 5 + seed) * Math.cos(a * 3 + seed * 2))); } return out; }
function polar(cx, cy, rs, sx = 1, sy = 1) { const p = [], n = rs.length; for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; p.push(cx + Math.cos(a) * rs[i] * sx, cy + Math.sin(a) * rs[i] * sy); } return p; }
const mixR = (a, b, t) => a.map((x, i) => lerp(x, b[i], t));
// 動く形で切り抜く（g.clipPath は文字列ごとにキャッシュするので、毎フレーム変わる形にはこちら）
function clipBlob(g, pts, fn) { const c = g.ctx; c.save(); g.blob(pts, null, 0); c.clip(); fn(); c.restore(); }
function clipPoly(g, pts, fn) { const c = g.ctx; c.save(); g.poly(pts, null, 0); c.clip(); fn(); c.restore(); }

/* =========================================================================
   つぶす：蚊・風船・空き缶
   ========================================================================= */
function mosquito(g, x, y, t, o = {}) {
  const fl = Math.sin(t * 80) > 0, S = o.s ?? 1.7;
  g.at(x, y, o.rot ?? 0, S, S, () => {
    g.alpha(0.75, () => { g.ell(-12, -34 - (fl ? 8 : 0), 26, 46, '#e8f6ff', 4, -0.5 - (fl ? 0.3 : 0)); g.ell(14, -32 - (fl ? 8 : 0), 24, 42, '#e8f6ff', 4, 0.6 + (fl ? 0.3 : 0)); });
    for (const [a, b, c2, d] of [[-18, 10, -58, 46], [-6, 14, -30, 64], [8, 14, 22, 66], [20, 10, 60, 50]]) g.line([a, b, (a + c2) / 2, b + 30, c2, d], C.ol, 4);
    g.ell(28, 6, 40, 16, '#4a4458', 5, 0.25);
    for (const xx of [18, 32, 46]) g.line([xx, -8, xx - 4, 20], '#ffffff', 4);
    g.circ(-14, 0, 20, '#4a4458', 5);
    g.line([-30, 4, -68, 18], C.ol, 4);
    if (o.halo) { g.line([-28, -12, -14, -8], C.ol, 4); g.line([-12, -12, 2, -8], C.ol, 4); g.at(-14, -40, 0, 1, 0.32, () => g.ring(0, 0, 30, C.gold, 8)); }
    else { g.circ(-20, -6, 9, '#ffffff', 3); g.circ(-22, -6, 4.5, C.ol, 0); }
    if (o.dizzy) for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; g.star(-14 + Math.cos(a) * 40, -48 + Math.sin(a) * 11, 11, 5, 5, C.yellow, 3); }
  });
}
function bgNight(g, s) {
  const V = g.V;
  g.bg('#283070', '#4a3c8e');
  g.dots(-60, -60, 1120, 900, 150, 6, 'rgba(255,255,255,0.08)');
  g.rr(110, 80, 300, 240, 14, '#16184a', 9); g.circ(320, 160, 46, '#fff3b0', 0); g.circ(342, 146, 42, '#16184a', 0);
  for (const [x, y] of [[160, 130], [210, 250], [270, 110], [370, 270]]) g.star(x, y, 9, 4, 4, '#fff6c8', 0);
  g.line([260, 80, 260, 320], '#7a5236', 9); g.line([110, 200, 410, 200], '#7a5236', 9);
  g.rr(110, 80, 300, 240, 14, null, 9);
  g.band(850, 'bottom', '#cdbb74', 7);
  for (let x = Math.floor(V.x0 / 260) * 260; x < V.x1; x += 260) g.line([x, 850, x + 60, V.y1 + 40], '#b4a160', 5);
  g.ell(790, 905, 90, 26, '#6a7b3a', 6); g.at(790, 884, 0, 1, 0.4, () => { g.ring(0, 0, 60, '#3d6e2f', 14); g.ring(0, 0, 34, '#3d6e2f', 12); });
  g.alpha(0.5, () => g.curve([850, 866, 840, 806 + 6 * Math.sin(s.t * 3), 860, 746, 844, 686 + 8 * Math.sin(s.t * 2)], '#e9e3ff', 6));
}
function balloon(g, x, y, rx, ry, col, o = {}) {
  g.curve([x, y + ry + 10, x - 12, y + ry + 90, x + 14, y + ry + 170, x - 4, y + ry + 260], C.ol, 4);
  g.ell(x, y, rx, ry, col);
  g.tri(x - 14, y + ry + 14, x + 14, y + ry + 14, x, y + ry - 4, col, 5);
  if (o.star) g.star(x, y, Math.min(rx, ry) * 0.38, Math.min(rx, ry) * 0.18, 5, sh(col, 0.55), 0);
  g.hl(x - rx * 0.4, y - ry * 0.45, rx * 0.16, ry * 0.26, -0.4, 0.55);
}
function can(g, x, y, hw, o = {}) {
  const H = 150, cr = clamp(1 - hw / 78), n = 7;           // cr: つぶれぐあい
  const pts = [];
  for (let i = 0; i <= n; i++) { const yy = -H + i * 2 * H / n, z = (i % 2 ? 1 : -1) * cr * 12; pts.push(x + hw + z, y + yy); }
  for (let i = n; i >= 0; i--) { const yy = -H + i * 2 * H / n, z = (i % 2 ? -1 : 1) * cr * 12; pts.push(x - hw + z, y + yy); }
  g.poly(pts, o.col ?? '#e8434f');
  clipPoly(g, pts, () => {
    g.rect(x - hw - 20, y - 40, hw * 2 + 40, 70, '#ffffff', 0);
    g.curve([x - hw - 20, y, x, y - 30, x + hw + 20, y], '#3a86ff', 18);
    g.rect(x - hw - 20, y - H, hw * 2 + 40, 26, C.metal, 0); g.rect(x - hw - 20, y + H - 22, hw * 2 + 40, 22, C.metal, 0);
    if (cr > 0.05) for (let i = 1; i < n; i++) g.line([x - hw, y - H + i * 2 * H / n, x + hw, y - H + i * 2 * H / n], 'rgba(40,20,60,0.25)', 4);
    g.rect(x - hw * 0.5, y - H, Math.max(8, hw * 0.25), H * 2, 'rgba(255,255,255,0.35)', 0);
  });
  g.poly(pts, null);
}
const SQUASH = [
  { k: 'mosquito', name: '蚊をつかまえる', short: '蚊', theme: 'home', kind: 'mosq' },
  { k: 'balloon', name: '風船をわる', short: '風船', theme: 'party', kind: 'balloon' },
  { k: 'can', name: '空き缶をつぶす', short: '空き缶', theme: 'town', kind: 'can' },
  { k: 'bubble', name: 'シャボン玉をわる', short: 'シャボン玉', theme: 'nature', kind: 'bubble' },
];
function bubble(g, x, y, rx, ry, t) {
  g.ell(x, y, rx, ry, 'rgba(210,245,255,0.28)', 0);
  g.at(x, y, t * 0.6, rx / 100, ry / 100, () => { g.arc(0, 0, 90, 0.2, 1.5, 'rgba(255,110,200,0.7)', 9); g.arc(0, 0, 90, 1.9, 3.1, 'rgba(90,190,255,0.7)', 9); g.arc(0, 0, 90, 3.5, 4.8, 'rgba(255,220,90,0.7)', 9); g.arc(0, 0, 90, 5.0, 5.9, 'rgba(120,230,140,0.7)', 9); });
  g.ell(x, y, rx, ry, null, 4);
  g.hl(x - rx * 0.42, y - ry * 0.42, rx * 0.2, ry * 0.11, -0.7, 0.95); g.circ(x + rx * 0.45, y + ry * 0.4, Math.min(rx, ry) * 0.06, 'rgba(255,255,255,0.9)', 0);
}

/* =========================================================================
   にぎる・まるめる：おにぎり・雪玉・どろだんご
   ========================================================================= */
const SHAPE = [
  { k: 'onigiri', name: 'おにぎりをにぎる', short: 'おにぎり', theme: 'kitchen', kind: 'onigiri', sfx: 'squish' },
  { k: 'snowball', name: '雪玉をまるめる', short: '雪玉', theme: 'winter', kind: 'snow', sfx: 'crunch' },
  { k: 'dango', name: 'どろだんごを作る', short: 'どろだんご', theme: 'nature', kind: 'dango', sfx: 'squish' },
];
function shapeBg(g, s, v) {
  const V = g.V;
  if (v.kind === 'onigiri') {
    g.bg('#ffe9c7'); g.tiles(V.x0 - 60, V.y0, V.x1 - V.x0 + 120, 700 - V.y0, 100, '#ffe9c7', '#ffdfb3');
    g.band(700, 'bottom', '#c98b52', 7); g.planks(V.x0 - 20, 710, V.x1 - V.x0 + 40, 400, 4, '#d39457');
    g.shadow(500, 860, 250, 30); g.ell(500, 840, 240, 52, '#ffffff'); g.ell(500, 834, 190, 34, '#eef3fb', 0);
    // 塩とのり
    g.rr(120, 560, 90, 150, 26, '#ffffff'); g.rr(120, 560, 90, 40, 16, '#8fd8ff'); g.text('しお', 165, 650, { size: 30, f: C.ol, font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
    g.rr(790, 660, 120, 60, 8, '#1f3a2a');
  } else if (v.kind === 'snow') {
    g.bg('#9fd3ff', '#e6f4ff');
    for (let i = 0; i < 26; i++) { const x = V.x0 + ((i * 173.3 + s.t * 30) % (V.x1 - V.x0)), y = V.y0 + ((i * 97.1 + s.t * (60 + i % 4 * 18)) % (V.y1 - V.y0)); g.circ(x, y, 6 + i % 3 * 3, '#ffffff', 0); }
    for (const [x, h] of [[90, 300], [900, 340], [-140, 260], [1140, 280]]) { g.tri(x - 90, 800, x + 90, 800, x, 800 - h, '#3d8f6a', 6); g.tri(x - 70, 800 - h * 0.45, x + 70, 800 - h * 0.45, x, 800 - h * 1.05, '#4ba47a', 6); g.path(`M${x - 40} ${800 - h * 0.75} Q${x} ${800 - h * 0.86} ${x + 40} ${800 - h * 0.75} L${x} ${800 - h * 1.05} Z`, '#ffffff', 0); }
    g.band(790, 'bottom', '#ffffff', 7); g.band(900, 'bottom', '#e7f0ff');
  } else {
    g.sky('#7cc8ff', '#d6f0ff', 640); g.sun(840, 120, 70); g.cloud(220, 160, 0.8);
    g.hills(640, '#7ccf6a', 50, 4, 4);
    g.band(660, 'bottom', '#f0cf8e', 7);
    for (let i = 0; i < 18; i++) g.circ(((i * 211) % 1200) - 100, 700 + (i * 67) % 300, 6, '#d9b06c', 0);
    g.rr(120, 700, 120, 110, 18, C.red); g.ell(180, 700, 60, 16, sh(C.red, -0.25)); g.line([150, 700, 150, 650, 210, 650, 210, 700], C.ol, 6);
    g.at(820, 760, 0.5, 1, 1, () => { g.rr(-14, -140, 28, 120, 10, C.yellow); g.path('M-40 -20 L40 -20 L30 60 Q0 80 -30 60 Z', C.blue); });
  }
}
// 形：k0 でこぼこ → k1 まるい（三角）→ k2 できあがり
function shapeObj(g, s, v, hw) {
  const L = lv(s, 0.25), x = 500, y = 520;
  const R0 = v.kind === 'onigiri' ? 120 : 112, n = 24;
  const A = s.my.lumps, B = s.my.mid, F = s.my.fin;
  const rs = L < 1 ? mixR(A, B, L) : mixR(B, F, L - 1);
  const w = Math.max(...rs.map((r, i) => Math.abs(Math.cos(i / n * TAU - Math.PI / 2) * r)));
  const sx = Math.min(1, hw / w), sy = 1 + (1 - sx) * 0.45;
  const pts = polar(x, y, rs, sx, sy);
  const col = v.kind === 'onigiri' ? '#fffdf6' : v.kind === 'snow' ? '#ffffff' : L < 1.5 ? mixC('#8a5a3c', '#7a4a2c', L / 1.5) : '#6b3d22';
  g.shadow(x, y + 150, 120 * sx, 18);
  g.blob(pts, col);
  if (v.kind === 'onigiri') {
    clipBlob(g, pts, () => {
      for (const [gx, gy, a] of s.my.grains) g.ell(x + gx * sx, y + gy * sy, 12, 6, '#efe9d6', 0, a);
      if (L > 1.05) { const t = clamp(L - 1); g.rect(x - 70 * sx, y + 120 * sy - 140 * t * sy, 140 * sx, 200 * sy, '#1f3a2a', 0); g.rect(x - 70 * sx, y + 120 * sy - 140 * t * sy, 140 * sx, 200 * sy, 'rgba(60,120,80,0.25)', 0); }
    });
    if (L > 1.5) for (const [a, b] of [[-30, -40], [10, -60], [36, -20], [-50, 0]]) g.ell(x + a * sx, y + b * sy, 6, 3.5, '#2b2140', 0, 0.6);
  } else if (v.kind === 'snow') {
    clipBlob(g, pts, () => { g.circ(x + 40 * sx, y + 50 * sy, 110, '#e3efff', 0); });
    if (L > 1.2) {
      const t = E.outBack(clamp((L - 1.2) / 0.6));
      g.at(x, y, 0, sx * t, sy * t, () => {
        g.circ(-38, -26, 13, C.ol, 0); g.circ(38, -26, 13, C.ol, 0); g.circ(-42, -30, 4, '#ffffff', 0); g.circ(34, -30, 4, '#ffffff', 0);
        g.path('M-6 0 L70 14 L-6 24 Z', C.carrot, 5);
        for (let i = -2; i <= 2; i++) g.circ(i * 18, 48 + Math.abs(i) * -5, 6, C.ol, 0);
        g.ell(-70, 14, 16, 9, 'rgba(255,120,150,0.5)', 0); g.ell(70, 14, 16, 9, 'rgba(255,120,150,0.5)', 0);
      });
    }
  } else {
    clipBlob(g, pts, () => {
      if (L < 1.5) for (const [gx, gy] of s.my.grains) g.circ(x + gx * sx, y + gy * sy, 7, '#a2724e', 0);
      g.circ(x + 50 * sx, y + 50 * sy, 100, 'rgba(0,0,0,0.14)', 0);
      if (L > 1.25) {
        const t = clamp((L - 1.25) / 0.4);
        g.alpha(t, () => {
          g.rect(x - 140, y - 140, 280, 280, g.rad(x - 40 * sx, y - 50 * sy, 10, 150, [[0, '#b0703f'], [0.55, '#5e2f15'], [1, '#2c140a']]), 0);
          g.ell(x + 30 * sx, y + 80 * sy, 70 * sx, 22 * sy, 'rgba(255,190,120,0.35)', 0, -0.3);
          g.rr(x - 72 * sx, y - 74 * sy, 34 * sx, 26 * sy, 8, 'rgba(255,255,255,0.9)', 0); g.rr(x - 32 * sx, y - 74 * sy, 22 * sx, 26 * sy, 7, 'rgba(255,255,255,0.75)', 0);
          g.rr(x - 72 * sx, y - 42 * sy, 34 * sx, 20 * sy, 7, 'rgba(255,255,255,0.6)', 0);
        });
      }
    });
    if (L > 1.4) { const t = E.outBack(clamp((L - 1.4) / 0.4)); g.at(x + 64 * sx, y - 70 * sy, s.t * 2, t, t, () => g.star(0, 0, 30, 8, 4, '#ffffff', 0)); }
  }
  g.blob(pts, null);
}
const mixC = (a, b, t) => { const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((x, i) => Math.round(lerp(x, B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); };
function pathOf(pts) { let d = `M${pts[0].toFixed(1)} ${pts[1].toFixed(1)}`; for (let i = 2; i < pts.length; i += 2) d += ` L${pts[i].toFixed(1)} ${pts[i + 1].toFixed(1)}`; return d + ' Z'; }

/* =========================================================================
   楽器：シンバル・拍子木・アコーディオン
   ========================================================================= */
const INST = [
  { k: 'cymbal', name: 'シンバルを鳴らす', short: 'シンバル', theme: 'music', kind: 'cymbal', sfx: 'cymbal' },
  { k: 'hyoshigi', name: '拍子木で幕を開く', short: '拍子木', theme: 'festival', kind: 'hyoshigi', sfx: 'wood' },
  { k: 'accordion', name: 'アコーディオンをひく', short: 'アコーディオン', theme: 'music', kind: 'acc', sfx: 'piano' },
];
const PEN = [C.magenta, C.yellow, C.sky, C.lime];
function drawCymbal(g, s) {
  const V = g.V;
  g.bg('#160f33', '#2c1656');
  const beams = s.k === 0 ? [] : s.k === 1 ? [[500, '#fff3b0']] : [[160, C.magenta], [500, '#fff3b0'], [840, C.sky]];
  for (const [bx, col] of beams) g.alpha(0.2 + 0.06 * Math.sin(s.beat * Math.PI), () => g.poly([bx - 50, V.y0, bx + 50, V.y0, bx + 240, 1000, bx - 240, 1000], col, 0));
  // 客席
  for (let row = 0; row < 3; row++) {
    const y = 690 + row * 100, n = 8 + row, w = (V.x1 - V.x0 + 240) / n;
    for (let i = 0; i <= n; i++) {
      const x = V.x0 - 120 + (i + (row % 2) * 0.5) * w, ph = i * 1.7 + row, bob = s.k ? Math.abs(Math.sin(s.beat * Math.PI + ph)) * 16 : 0;
      if (s.k >= 1 && (i + row) % (s.k === 2 ? 1 : 3) === 0) { const c = PEN[(i + row) % 4], a = Math.sin(s.beat * Math.PI + ph) * 0.45; g.at(x + 34, y - bob - 30, a, () => { g.glow(0, -60, 46, c, 0.55); g.rr(-8, -96, 16, 96, 6, c, 4); }); }
      g.circ(x, y - bob, 46 + row * 6, row === 2 ? '#3c2670' : '#2e1d5a', 0);
    }
  }
  g.ell(500, 1000, 700, 60, 'rgba(255,255,255,0.05)', 0);
  const e = gap(s, 0, 300), rx = 58;
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? -1 : 1, cx = 500 + sg * (e + rx);
    g.ell(cx, 500, rx, 178, C.gold);
    g.ell(cx, 500, rx * 0.72, 178 * 0.72, null, 3); g.ell(cx, 500, rx * 0.42, 178 * 0.42, null, 3);
    g.ell(cx + sg * 10, 500, 20, 44, sh(C.gold, 0.3), 4);
    g.hl(cx - sg * 18, 420, 9, 60, 0, 0.55);
  }
  hands(g, s, e + rx * 1.25, { y: 560, sleeve: '#e8434f' });
}
function drawHyoshigi(g, s) {
  const V = g.V, L = s.k === 0 ? 0 : s.k === 1 ? 0.5 * E.ioQ(clamp(s.age / 0.5)) : 0.5 + 0.5 * E.outQ(clamp(s.age / 0.28));
  // 幕のうしろの舞台
  g.bg('#ffd76a', '#f0b23a');
  g.path('M520 820 C500 640 600 560 560 380 C540 300 600 260 640 230 L668 252 C630 290 590 330 612 400 C650 560 560 650 600 820 Z', '#7a4a2a');
  for (const [x, y, r] of [[420, 260, 1], [700, 210, 1.15], [800, 380, 0.9], [520, 420, 0.85], [300, 420, 0.75]]) g.at(x, y, 0, r, r, () => { g.ell(0, 0, 150, 52, '#2e7d4f'); g.ell(-20, -26, 110, 34, '#3f9a62', 0); for (let i = -2; i <= 2; i++) g.line([i * 46 - 10, -6, i * 46 + 10, 18], '#24603c', 4); });
  g.band(800, 'bottom', '#e9c58c', 7); for (let x = Math.floor(V.x0 / 110) * 110; x < V.x1; x += 110) g.line([x, 800, x, V.y1 + 40], '#cfa66a', 4);
  // 定式幕（右へ開く）
  const cl = lerp(V.x0 - 30, V.x1 + 60, L), cols = ['#1c1a26', '#d0642a', '#1f7a4c'];
  for (let i = 0, x = cl; x < V.x1 + 40; i++, x += 120) g.rect(x, V.y0 - 10, 121, V.y1 - V.y0 + 20, cols[i % 3], 0);
  if (L < 0.999) { g.rect(cl, V.y0 - 10, 40, V.y1 - V.y0 + 20, 'rgba(0,0,0,0.25)', 0); g.line([cl, V.y0 - 10, cl, V.y1 + 10], C.ol, 7); }
  g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 110 - V.y0, '#2a1a14', 0); g.band(90, 106, '#c8302c'); g.line([V.x0, 108, V.x1, 108], C.gold, 6);
  // 拍子木
  const e = gap(s, 0, 300);
  const xs = [500 - e - 27, 500 + e + 27];
  g.curve([xs[0], 660, (xs[0] + 500) / 2, 700 + Math.max(0, 90 - e * 0.25), 500, 690 + Math.max(10, 130 - e * 0.35), (xs[1] + 500) / 2, 700 + Math.max(0, 90 - e * 0.25), xs[1], 660], '#7d3fb0', 10);
  for (const x of xs) { g.rr(x - 27, 300, 54, 370, 8, '#f6dfb2'); g.rect(x - 27, 300, 54, 18, '#e3c48c', 0); g.line([x - 10, 330, x - 10, 640], 'rgba(160,110,50,0.3)', 4); g.rr(x - 27, 300, 54, 370, 8, null); }
  hands(g, s, e + 54 - 6, { y: 600, sleeve: '#7d3fb0' });
}
function animal(g, x, y, kind, pose, t, sc = 1) {
  const bob = pose ? Math.abs(Math.sin(t)) * 18 : 0, jump = pose === 2 ? 30 : 0, arm = pose ? Math.sin(t) * 0.6 : 0;
  const body = kind === 'cat' ? '#ffb347' : '#a0673c', belly = kind === 'cat' ? '#fff1d6' : '#e5c39b';
  g.at(x, y - bob - jump, 0, sc, sc, () => {
    g.shadow(0, 96 + bob + jump, 60, 12);
    g.cap(-60, -10, -100 - (pose ? 10 : 0), pose ? -80 + arm * 40 : 40, 15, body);
    g.cap(60, -10, 100 + (pose ? 10 : 0), pose ? -80 - arm * 40 : 40, 15, body);
    g.rr(-30, 50, 24, 50, 10, body); g.rr(6, 50, 24, 50, 10, body);
    g.ell(0, 10, 64, 72, body); g.ell(0, 24, 38, 44, belly, 0);
    if (kind === 'cat') { g.tri(-56, -100, -20, -130, -54, -150, body); g.tri(56, -100, 20, -130, 54, -150, body); }
    else { g.circ(-50, -134, 22, body); g.circ(50, -134, 22, body); }
    g.circ(0, -96, 62, body);
    if (kind !== 'cat') g.ell(0, -78, 28, 20, belly, 0);
    g.circ(-22, -100, 7, C.ol, 0); g.circ(22, -100, 7, C.ol, 0);
    g.curve([-10, -72, 0, -64, 10, -72], C.ol, 4);
    if (kind === 'cat') for (const sgn of [-1, 1]) { g.line([sgn * 30, -80, sgn * 70, -86], C.ol, 3); g.line([sgn * 30, -72, sgn * 70, -68], C.ol, 3); }
    g.ell(-38, -78, 12, 7, 'rgba(255,110,140,0.45)', 0); g.ell(38, -78, 12, 7, 'rgba(255,110,140,0.45)', 0);
  });
}
function drawAccordion(g, s) {
  const V = g.V, on = s.k >= 1;
  g.bg('#ff9a6b', '#ffd59a');
  g.sun(500, 330, 120, '#fff0a8');
  for (const [x, w, h, c] of [[-300, 260, 420, '#c25a6a'], [-20, 220, 520, '#a84d66'], [190, 180, 380, '#c96d5c'], [640, 200, 470, '#b35466'], [830, 260, 400, '#c25a6a'], [1080, 240, 500, '#a84d66']]) {
    g.rect(x, 760 - h, w, h + 400, c, 6);
    if (x > -100 && x < 900) for (let yy = 800 - h; yy < 700; yy += 110) for (let xx = x + 30; xx < x + w - 40; xx += 80) g.rr(xx, yy, 36, 50, 6, on ? '#ffe9a0' : '#7b3a55', 0);
  }
  g.band(760, 'bottom', '#d9a76a', 7); for (let x = Math.floor(V.x0 / 80) * 80; x < V.x1; x += 80) g.line([x, 760, x - 30, V.y1 + 40], '#c08e55', 4);
  // ちょうちん電球
  g.curve([V.x0 - 40, 70, 500, 150, V.x1 + 40, 70], C.ol, 4);
  for (let x = Math.ceil(V.x0 / 90) * 90, i = 0; x < V.x1; x += 90, i++) { const tt = (x - V.x0) / (V.x1 - V.x0), y = 70 + 80 * 4 * tt * (1 - tt) + 16; if (on) g.glow(x, y, 40, PEN[i % 4], 0.6); g.circ(x, y, 13, on ? PEN[i % 4] : '#f6e9da', 4); }
  // 踊るどうぶつ
  const pose = s.k, t = s.beat * Math.PI;
  animal(g, 190, 640, 'cat', pose, t, 0.8); animal(g, 810, 640, 'bear', pose, t + 1.2, 0.8);
  // アコーディオン
  const e = gap(s, 60, 290), y = 520, H = 300, n = Math.max(3, Math.round(e / 40));
  g.rect(500 - e, y - H / 2 + 16, e * 2, H - 32, '#d8343c', 0);
  for (let i = 0; i <= n * 2; i++) { const x = 500 - e + i * e / n; g.line([x, y - H / 2 + 16, x, y + H / 2 - 16], i % 2 ? '#a51f2a' : '#ff7a80', 6); }
  const zz = []; for (let i = 0; i <= n * 2; i++) zz.push(500 - e + i * e / n, y - H / 2 + (i % 2 ? 28 : 10));
  g.line(zz, '#ffffff', 7); g.line(zz.map((v, i) => i % 2 ? 2 * y - v : v), '#ffffff', 7);
  g.rect(500 - e, y - H / 2 + 16, e * 2, H - 32, null);
  // 左（ボタン）と右（けんばん）
  g.rr(500 - e - 100, y - H / 2, 100, H, 16, '#26386b');
  for (let r = 0; r < 5; r++) for (let c2 = 0; c2 < 2; c2++) g.circ(500 - e - 70 + c2 * 36, y - 100 + r * 50, 12, '#ffffff', 0);
  g.rr(500 + e, y - H / 2, 100, H, 16, '#26386b');
  g.rr(500 + e + 14, y - H / 2 + 14, 52, H - 28, 6, '#ffffff', 4);
  for (let r = 1; r < 8; r++) g.line([500 + e + 14, y - H / 2 + 14 + r * (H - 28) / 8, 500 + e + 66, y - H / 2 + 14 + r * (H - 28) / 8], C.ol, 3);
  for (const r of [1, 2, 4, 5, 6]) g.rr(500 + e + 14, y - H / 2 + 14 + r * (H - 28) / 8 - 10, 30, 20, 3, C.ol, 0);
  hands(g, s, e + 82, { y: 560, sleeve: C.green });
}

/* =========================================================================
   よぶ・おどろかす：鯉・ハト・電気・神社・アシカ（手は下のほう、主役は上）
   ========================================================================= */
const CALL = [
  { k: 'koi', name: '鯉をよぶ', short: '鯉', theme: 'animal', kind: 'koi' },
  { k: 'pigeon', name: 'ハトが飛び立つ', short: 'ハト', theme: 'animal', kind: 'pigeon' },
  { k: 'light', name: '手をたたいて電気', short: '電気', theme: 'home', kind: 'light' },
  { k: 'shrine', name: '神社でお参り', short: 'お参り', theme: 'festival', kind: 'shrine' },
  { k: 'sealion', name: 'アシカに拍手', short: 'アシカ', theme: 'sea', kind: 'sealion' },
];
const age1 = s => s.k >= 1 ? s.ph * s.spr : -1;
const KOI = [
  { body: '#ffffff', spot: '#ff5a3c', fin: '#ffe2d6', spots: [[0, -36, 22, 30], [-4, 30, 18, 20]] },
  { body: '#ff8a1f', spot: '#ffffff', fin: '#ffd2a6', spots: [[6, -6, 14, 28]] },
  { body: '#ffd23f', spot: '#fff3b0', fin: '#fff0b8', spots: [[0, 0, 12, 46]] },
  { body: '#ffffff', spot: '#2b2140', fin: '#e8e8f0', spots: [[-10, -24, 13, 16], [12, 26, 12, 15]] },
  { body: '#ff5a3c', spot: '#ffffff', fin: '#ffc2b0', spots: [[0, 20, 20, 26]] },
];
function koi(g, x, y, a, sc, pat, t, mouth) {
  g.at(x, y, a, sc, sc, () => {
    const w = Math.sin(t) * 0.3;
    g.at(0, 70, w, 1, 1, () => g.path('M0 0 Q-40 40 -50 84 Q0 64 50 84 Q40 40 0 0 Z', pat.fin, 5));
    g.ell(-34, -22, 26, 12, pat.fin, 5, -0.7 + w * 0.5); g.ell(34, -22, 26, 12, pat.fin, 5, 0.7 - w * 0.5);
    g.ell(0, 0, 36, 92, pat.body, 6);
    for (const [px, py, rx, ry] of pat.spots) g.ell(px, py, rx, ry, pat.spot, 0);
    g.ell(0, 0, 36, 92, null, 6);
    g.circ(-17, -64, 5, C.ol, 0); g.circ(17, -64, 5, C.ol, 0);
    if (mouth > 0) g.ell(0, -88, 15 * mouth, 11 * mouth, '#c44a72', 4);
  });
}
function drawKoi(g, s) {
  const V = g.V, t = s.t;
  g.bg('#2aa6bf', '#16708f');
  for (let i = 0; i < 6; i++) { const q = ((t * 0.35 + i / 6) % 1); g.alpha(0.4 * (1 - q), () => g.at(((i * 331) % 900) + 50, ((i * 197) % 600) + 80, 0, 1, 0.45, () => g.ring(0, 0, 40 + q * 120, '#bff3ff', 6))); }
  for (const [x, y, r] of [[130, 150, 70], [860, 260, 60], [760, 90, 46], [-200, 400, 80], [1180, 420, 80]]) { g.circ(x, y, r, '#4caf50'); g.tri(x, y, x + r * 1.1, y - r * 0.3, x + r * 1.1, y + r * 0.3, '#2aa6bf', 0); g.line([x, y, x - r * 0.6, y + r * 0.2], '#3a8f3e', 4); }
  g.at(170, 150, 0, 0.9, 0.9, () => { for (let i = 0; i < 6; i++) g.at(0, 0, i * TAU / 6, () => g.ell(0, -22, 12, 24, '#ffb3cf', 4)); g.circ(0, 0, 12, C.yellow, 4); });
  // 鯉
  for (const f of s.my.koi) {
    const a1 = f.trig === 1 ? age1(s) : age2(s), q = a1 < 0 ? 0 : E.ioQ(clamp(a1 / f.dur));
    const ix = f.x + Math.cos(t * f.sp + f.ph) * 60, iy = f.y + Math.sin(t * f.sp + f.ph) * 30;
    const x = lerp(ix, f.tx, q), y = lerp(iy, f.ty, q);
    const ia = Math.atan2(Math.cos(t * f.sp + f.ph) * 30, -Math.sin(t * f.sp + f.ph) * 60) + Math.PI / 2;
    const a = q > 0 && q < 1 ? Math.atan2(f.ty - iy, f.tx - ix) + Math.PI / 2 : q >= 1 ? Math.PI + Math.sin(t * 2 + f.ph) * 0.15 : ia;
    const sc = lerp(0.62, 1, q) * f.s;
    koi(g, x, y, a, sc, KOI[f.pat], t * 7 + f.ph, q >= 0.9 ? 0.6 + 0.4 * Math.sin(t * 12 + f.ph) : 0);
  }
  // 手前の木の橋
  g.band(860, 'bottom', '#a0673c', 7); g.planks(V.x0 - 20, 870, V.x1 - V.x0 + 40, 400, 5, '#b7794a');
}
function pigeon(g, x, y, sc, dir, t, fly, peck) {
  g.at(x, y, 0, sc * dir, sc, () => {
    const fl = Math.sin(t * 30);
    if (fly) { g.at(10, -20, -0.4 - fl * 0.8, () => g.path('M0 0 Q30 -90 110 -120 Q90 -60 60 -20 Z', '#8f99b0')); }
    g.poly([46, -6, 118, 4, 108, 30, 46, 22], '#6c768e');
    g.ell(0, 0, 72, 46, '#b3bbd0');
    if (!fly) { g.ell(18, -6, 52, 28, '#949eb6', 5, 0.15); g.line([10, 4, 52, 0], '#5c6478', 5); g.line([18, 16, 58, 12], '#5c6478', 5); }
    else g.at(10, -20, 0.5 + fl * 0.8, () => g.path('M0 0 Q30 -90 110 -120 Q90 -60 60 -20 Z', '#a3abc2'));
    const hx = -56, hy = -40 + (peck ? peck * 50 : 0);
    g.ell(-44, -18 + (peck || 0) * 20, 24, 26, '#5fbfa6', 0);
    g.circ(hx, hy, 28, '#a3abc2');
    g.circ(hx - 6, hy - 6, 6, '#ff9f1c', 3); g.circ(hx - 6, hy - 6, 2.5, C.ol, 0);
    g.tri(hx - 26, hy - 2, hx - 26, hy + 10, hx - 44, hy + 8, '#e9b7a0', 4);
    if (!fly) { g.line([-10, 40, -14, 66], '#ff7a8a', 6); g.line([12, 40, 10, 66], '#ff7a8a', 6); }
  });
}
function drawPigeon(g, s) {
  const V = g.V, t = s.t;
  g.sky('#8fd8ff', '#e3f6ff', 460); g.cloud(220, 140, 0.8); g.cloud(820, 90, 0.6);
  for (const [x, w, h] of [[-260, 220, 200], [-40, 180, 260], [150, 240, 180], [620, 200, 240], [830, 230, 190], [1060, 220, 240]]) { g.rect(x, 460 - h, w, h, '#f2e2d0', 5); if (x > -100 && x < 900) for (let yy = 490 - h; yy < 420; yy += 80) for (let xx = x + 30; xx < x + w - 30; xx += 64) g.rr(xx, yy, 28, 34, 4, '#9cc7e8', 0); }
  g.band(450, 'bottom', '#e6d9c5', 7);
  for (let i = -8; i <= 8; i++) g.line([500 + i * 90, 450, 500 + i * 330, V.y1 + 60], '#d4c4ad', 4);
  for (let y = 480, h = 30; y < V.y1; y += h, h *= 1.35) g.line([V.x0, y, V.x1, y], '#d4c4ad', 4);
  // 噴水
  g.ell(500, 470, 170, 36, '#9aa3b5'); g.ell(500, 464, 150, 26, '#7fd3f0', 0); g.rr(486, 360, 28, 100, 8, '#b7bfcd'); g.alpha(0.8, () => { g.curve([500, 362, 440, 300, 400, 420], '#bff0ff', 10); g.curve([500, 362, 560, 300, 600, 420], '#bff0ff', 10); });
  for (const b of s.my.birds) {
    const a = b.trig === 1 ? age1(s) : age2(s);
    if (a < 0) { const pk = Math.max(0, Math.sin(t * 3 + b.ph * 5)) ** 6; pigeon(g, b.x, b.y, b.s, b.dir, t, false, pk); }
    else { const q = a; pigeon(g, b.x + b.vx * q, b.y - 1100 * q + 500 * q * q * 0, b.s * Math.max(0.35, 1 - q * 0.9), b.dir, t + b.ph, true, 0); }
  }
}
function drawLight(g, s) {
  const V = g.V, on = s.k >= 1, party = s.k >= 2, t = s.t;
  g.bg('#ffe9c9'); g.stripes(V.x0, V.y0, V.x1 - V.x0, 720 - V.y0, 60, '#ffe9c9', '#fde0b8');
  g.band(720, 'bottom', '#c98b52', 7); g.planks(V.x0 - 20, 730, V.x1 - V.x0 + 40, 500, 5, '#d39457');
  g.rr(80, 150, 230, 260, 14, '#1d2160', 9); g.circ(250, 220, 34, '#fff3b0', 0); g.circ(266, 210, 30, '#1d2160', 0); g.line([195, 150, 195, 410], '#ffffff', 9); g.rr(80, 150, 230, 260, 14, null, 9);
  // ソファ
  g.rr(400, 360, 480, 220, 40, '#4a8fe0'); g.rr(360, 470, 80, 190, 30, '#3a77c4'); g.rr(840, 470, 80, 190, 30, '#3a77c4'); g.rr(420, 520, 440, 120, 30, '#5aa0ee');
  // ねこ
  const cx = 640, cy = 500;
  if (!on) { g.ell(cx, cy, 110, 58, '#ff9f45'); g.circ(cx - 80, cy - 20, 46, '#ff9f45'); g.tri(cx - 120, cy - 50, cx - 104, cy - 90, cx - 82, cy - 62, '#ff9f45'); g.tri(cx - 70, cy - 64, cx - 46, cy - 92, cx - 40, cy - 52, '#ff9f45'); g.curve([cx - 100, cy - 22, cx - 92, cy - 16, cx - 84, cy - 22], C.ol, 4); g.curve([cx - 72, cy - 22, cx - 64, cy - 16, cx - 56, cy - 22], C.ol, 4); g.curve([cx + 100, cy + 10, cx + 150, cy - 30, cx + 120, cy - 60], C.ol, 18); g.curve([cx + 100, cy + 10, cx + 150, cy - 30, cx + 120, cy - 60], '#ff9f45', 10); }
  else {
    const j = party ? Math.abs(Math.sin(t * 9)) * 30 : jig(s.age, 30, 14, 6);
    g.at(cx, cy - 10 - j, party ? Math.sin(t * 9) * 0.15 : 0, () => {
      g.ell(0, 30, 70, 70, '#ff9f45'); g.ell(0, 44, 40, 42, '#fff1d6', 0);
      g.tri(-56, -70, -40, -130, -14, -84, '#ff9f45'); g.tri(56, -70, 40, -130, 14, -84, '#ff9f45');
      g.circ(0, -50, 62, '#ff9f45');
      g.circ(-24, -56, 15, '#ffffff', 4); g.circ(24, -56, 15, '#ffffff', 4); g.circ(-24, -54, 7, C.ol, 0); g.circ(24, -54, 7, C.ol, 0);
      g.ell(0, -26, 10, party ? 12 : 8, party ? '#ff6b8b' : C.ol, 0);
      if (party) { g.cap(-60, 10, -110, -60 + Math.sin(t * 9) * 30, 14, '#ff9f45'); g.cap(60, 10, 110, -60 - Math.sin(t * 9) * 30, 14, '#ff9f45'); g.tri(-30, -104, 30, -104, 0, -180, C.magenta); g.circ(0, -184, 10, C.yellow, 4); }
    });
    if (!party) g.text('！', cx + 110, cy - 160, { size: 90, f: C.red, o: 10 });
  }
  // 天井の電気
  g.line([500, V.y0 - 10, 500, 70], C.ol, 6);
  if (on) { g.alpha(0.35, () => g.poly([440, 130, 560, 130, 800, 720, 200, 720], '#fff6c2', 0)); g.glow(500, 140, 160, '#fff3b0', 0.8); }
  g.path('M430 140 Q430 70 500 70 Q570 70 570 140 Z', on ? '#fff3b0' : '#8c86a8');
  if (party) {
    const dq = E.outBack(clamp(s.age / 0.2));
    g.line([760, V.y0 - 10, 760, lerp(-100, 190, dq) - 60], C.ol, 5);
    g.at(760, lerp(-100, 190, dq), t * 2, () => { g.circ(0, 0, 60, '#cfd6e2'); g.clipCirc(0, 0, 58, () => { for (let i = -3; i <= 3; i++) { g.line([-70, i * 18, 70, i * 18], '#8f9bb0', 3); g.line([i * 18, -70, i * 18, 70], '#8f9bb0', 3); } }); g.hl(-20, -24, 16, 10, -0.5, 0.8); });
    for (let i = 0; i < 9; i++) { const a = t * 1.5 + i * 0.7; g.alpha(0.5, () => g.circ(500 + Math.cos(a * 1.3 + i) * 380, 380 + Math.sin(a + i * 2) * 240, 40, PEN[i % 4], 0)); }
  }
  if (!on) g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, V.y1 - V.y0 + 40, 'rgba(10,8,40,0.72)', 0);
  if (!on) for (let i = 0; i < 3; i++) { const z = 16 + i * 5, zx = 560 - i * 40, zy = 380 - i * 54 - (t * 20) % 20; g.line([zx - z, zy - z, zx + z, zy - z, zx - z, zy + z, zx + z, zy + z], '#cfd6ff', 7); }
}
function drawShrine(g, s) {
  const V = g.V, t = s.t, glow = s.k >= 1;
  g.sky('#9fd8ff', '#fff3d6', 800); g.band(780, 'bottom', '#d9cbb2', 7);
  for (let i = 0; i < 40; i++) g.circ(((i * 157) % (V.x1 - V.x0)) + V.x0, 800 + (i * 89) % 600, 6, '#c4b498', 0);
  // 社
  g.rect(110, 200, 780, 600, '#3a2418', 6);
  g.rect(150, 230, 700, 60, '#ffffff', 5); g.rect(150, 252, 700, 18, '#7d3fb0', 0); for (const x of [300, 500, 700]) g.circ(x, 261, 18, '#ffffff', 4);
  g.rect(120, 200, 50, 600, '#d9452b', 6); g.rect(830, 200, 50, 600, '#d9452b', 6);
  g.path('M20 210 Q240 180 300 60 L700 60 Q760 180 980 210 L980 236 L20 236 Z', '#4a5468'); g.rect(60, 200, 880, 26, '#d9452b', 6);
  for (let x = 330; x < 680; x += 46) g.line([x, 70, x - 10, 200], '#3b4356', 4);
  // しめなわ
  g.curve([160, 320, 500, 360, 840, 320], '#c9a03a', 26); g.curve([160, 320, 500, 360, 840, 320], '#b08525', 4);
  for (const x of [280, 420, 580, 720]) g.poly([x, 340, x + 20, 340, x + 6, 370, x + 22, 370, x + 8, 404, x - 8, 404, x + 4, 372, x - 12, 372], '#ffffff', 4);
  // 鈴と鈴緒
  const sw = jig(s.age, 0.12, 10, 3);
  g.at(500, 300, sw, () => {
    if (glow) g.glow(0, 90, s.k >= 2 ? 260 : 170, '#fff3a0', 0.75);
    g.rr(-6, 0, 12, 50, 4, '#7a4a2a', 0);
    g.circ(0, 96, 54, C.gold); g.line([-40, 100, 40, 100], '#b08525', 6); g.circ(0, 116, 7, C.ol, 0); g.hl(-18, 76, 14, 9, -0.5, 0.6);
    for (let i = 0; i < 9; i++) g.rr(-20, 150 + i * 46, 40, 48, 14, ['#e8402f', '#ffffff', '#7d3fb0'][i % 3]);
  });
  // さい銭箱
  g.rr(250, 650, 500, 160, 10, '#8a5a36'); for (let x = 270; x < 740; x += 40) g.line([x, 662, x, 700], '#5a3a22', 8); g.rect(250, 650, 500, 56, null);
  if (s.k >= 2) {
    const q = E.outBack(clamp(s.age / 0.18));
    g.at(500, 250, Math.sin(t * 3) * 0.05, q * 1.25, q * 1.25, () => { g.alpha(0.6, () => { for (let i = 0; i < 12; i++) g.at(0, 0, i * TAU / 12 + t * 0.6, () => g.tri(-18, -110, 18, -110, 0, -300, '#fff3a0', 0)); }); g.rr(-74, -120, 148, 250, 6, '#ffffff'); g.rect(-62, -108, 124, 226, null, 3); g.rect(-62, -108, 124, 30, '#e8402f', 0); g.text('おみくじ', 0, -93, { size: 22, f: '#ffffff', font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); g.text('大', 0, -20, { size: 78, f: '#e8402f', font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); g.text('吉', 0, 66, { size: 78, f: '#e8402f', font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); });
  }
}
function drawSealion(g, s) {
  const V = g.V, t = s.t;
  g.sky('#78d0ff', '#d9f4ff', 640);
  for (let r = 0; r < 4; r++) { g.band(200 + r * 80, 280 + r * 80, r % 2 ? '#e8edf6' : '#ffffff'); for (let x = Math.floor(V.x0 / 70) * 70 + (r % 2) * 35; x < V.x1; x += 70) g.circ(x, 236 + r * 80, 18, PEN[(Math.abs(x / 70 | 0) + r) % 4], 0); }
  g.band(520, 'bottom', '#2b9fe0', 7);
  for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) g.arc(x + 60, 580 + 10 * Math.sin(t * 2 + x), 40, Math.PI + 0.3, -0.3, '#ffffff', 6);
  g.band(800, 'bottom', '#1e7fc0');
  // 台
  g.ell(500, 640, 190, 50, '#e8402f'); g.rect(310, 560, 380, 80, '#ffffff', 0); g.rect(310, 580, 380, 30, '#e8402f', 0); g.ell(500, 560, 190, 50, '#ffffff'); g.line([310, 560, 310, 640], C.ol, 7); g.line([690, 560, 690, 640], C.ol, 7);
  // アシカ
  const a1 = s.k === 1 ? s.age : -1, clapP = a1 >= 0 && a1 < 0.75 ? Math.abs(Math.sin(a1 / 0.75 * Math.PI * 3)) : 0, up = s.k === 2;
  g.at(500, 560, 0, () => {
    g.blob([-92, 4, -100, -80, -78, -170, -40, -236, 14, -250, 50, -190, 84, -90, 92, 4], '#5e4033');
    g.blob([-56, 0, -60, -80, -40, -160, -6, -200, 24, -150, 44, -70, 48, 0], '#9a7358', 0);
    // 前びれ（1回目で拍手をかえす、2回目でばんざい）
    const fa = up ? 1.0 : lerp(0, 1.25, clapP);
    g.at(-70, -120, -fa, () => g.ell(-10, 52, 24, 66, '#4a3228', 5, 0.35 - fa * 0.2));
    g.at(70, -120, fa, () => g.ell(10, 52, 24, 66, '#4a3228', 5, -0.35 + fa * 0.2));
    // 頭（鼻は左上）
    g.at(-6, -262, 0.5, () => {
      g.ell(0, 0, 56, 46, '#5e4033'); g.ell(-56, -4, 36, 24, '#6e4c3d');
      g.circ(-88, -8, 9, C.ol, 0); g.circ(-4, -14, 10, C.ol, 0); g.circ(-8, -18, 3.5, '#ffffff', 0);
      for (const d of [-10, 2, 14]) g.line([-70, 6 + d * 0.2, -104, 10 + d], C.ol, 3);
      g.arc(-60, 14, 14, 0.2, 1.6, C.ol, 4);
    });
  });
  // ボール（鼻の先）
  const bx = 416, by0 = 186, by = up ? lerp(by0, 40, E.outQ(clamp(s.age / 0.25))) : by0 - jig(a1, 24, 12, 5);
  g.at(bx, by, up ? s.age * 14 : 0, () => { g.circ(0, 0, 62, '#ffffff'); g.clipCirc(0, 0, 62, () => { g.rect(-62, -20, 124, 40, C.red, 0); g.rect(-20, -62, 40, 124, C.blue, 0); }); g.circ(0, 0, 62, null); g.hl(-20, -24, 14, 8, -0.5, 0.7); });
}

export default [
  {
    id: 'clap-squash', acts: ['clap'], modes: ['both'], vars: SQUASH, sfx: (k, v) => v.kind === 'balloon' ? 'pop' : v.kind === 'can' ? 'crunch' : v.kind === 'bubble' ? 'bubble' : 'clap',
    init(s) { s.my.binDone = 0; s.my.bub = Array.from({ length: 5 }, (_, i) => ({ x: 120 + i * 190 + s.r() * 60, y: 900 + s.r() * 600, r: 30 + s.r() * 40, v: 60 + s.r() * 60 })); },
    draw(g, s, v) {
      const V = g.V;
      if (v.kind === 'mosq') {
        bgNight(g, s);
        const e = gap(s, 0), ph = s.ph, t = s.t;
        if (s.k < 2) {
          let x, y;
          if (s.k === 0) { const q = clamp((ph + 0.7) / 0.7); x = 500 + Math.sin(t * 5.2) * 150 * (1 - q * 0.8); y = lerp(470, 230, E.inQ(q)) + Math.sin(t * 9.4) * 50 * (1 - q); }
          else { const q = clamp(ph); x = 500 + Math.sin(t * 4) * 120 * Math.sin(Math.PI * q); y = lerp(230, 480, E.ioQ(q)) + Math.sin(t * 7) * 30 * Math.sin(Math.PI * q) - jig(s.age, 60, 10, 5); }
          mosquito(g, x, y, t, { dizzy: s.k === 1, rot: s.k === 1 ? Math.sin(t * 8) * 0.25 : Math.sin(t * 6) * 0.15 });
        } else {
          const a = s.age;
          if (a > 0.12) g.alpha(clamp(1.4 - a / 1.0), () => mosquito(g, 500 + Math.sin(a * 5) * 30, 440 - (a - 0.12) * 240, s.t, { halo: 1, s: 1.5 }));
        }
        hands(g, s, e, { y: 560 });
      } else if (v.kind === 'balloon') {
        g.bg('#ffd9ec', '#fff0f7');
        for (let i = 0; i < 2; i++) {
          const y0 = i ? -230 : 110; if (y0 < V.y0 - 60) continue;
          g.curve([V.x0 - 40, y0, 500, y0 + 50, V.x1 + 40, y0], C.ol, 4);
          const cs = [C.red, C.yellow, C.blue, C.green, C.purple];
          for (let x = Math.ceil((V.x0 - 40) / 90) * 90, j = 0; x < V.x1 + 40; x += 90, j++) { const tt = (x - V.x0) / (V.x1 - V.x0), y = y0 + 50 * 4 * tt * (1 - tt) * 0.9; g.tri(x - 30, y, x + 30, y, x, y + 56, cs[(j + 500) % 5], 4); }
        }
        g.band(860, 'bottom', '#b48ce8', 7);
        g.rr(130, 700, 150, 120, 12, C.blue); g.rect(195, 700, 20, 120, C.yellow, 0); g.rr(130, 700, 150, 120, 12, null); g.rr(120, 680, 170, 34, 10, sh(C.blue, 0.2));
        const e = gap(s, s.k === 0 ? 60 : s.k === 1 ? 80 : 120);
        const showB = s.k === 0 ? 1 : s.k === 1 ? clamp((s.ph - 0.12) / 0.4) : 0;
        if (showB > 0) {
          const big = s.k === 1, r0 = big ? 170 : 145, col = big ? C.gold : C.red;
          const y = lerp(-300, 450, E.outBack(showB, 1.2)) + Math.sin(s.t * 3) * 8;
          const rx = Math.min(r0, Math.max(e, 30) + 8), ry = r0 * 1.12 * Math.pow(r0 / rx, 0.35);
          balloon(g, 500, y, rx, ry, col, { star: big });
        }
        hands(g, s, e, { y: 540, sleeve: '#ff6b8b' });
      } else if (v.kind === 'bubble') {
        g.sky('#7fd0ff', '#e6f7ff', 700); g.cloud(220, 150, 0.7); g.cloud(800, 240, 0.5);
        for (const [x, r] of [[60, 150], [940, 170], [-200, 140], [1200, 160]]) { g.rr(x - 18, 520, 36, 220, 10, '#8a5a36', 0); g.circ(x, 480, r, '#5db352', 0); g.circ(x - r * 0.5, 540, r * 0.7, '#4ba347', 0); }
        g.band(700, 'bottom', '#8fd36f', 7); g.grassTufts(720, '#6cbf55', 5, 9);
        for (const b of s.my.bub) { const y = b.y - ((s.t * b.v) % 1400); bubble(g, b.x + Math.sin(s.t * 1.3 + b.x) * 30, y < -200 ? y + 1400 : y, b.r, b.r, s.t + b.x); }
        const e = gap(s, s.k === 0 ? 50 : s.k === 1 ? 70 : 120);
        const showB = s.k === 0 ? 1 : s.k === 1 ? clamp((s.ph - 0.1) / 0.45) : 0;
        if (showB > 0) {
          const big = s.k === 1, r0 = big ? 175 : 140, y = big ? lerp(1100, 450, E.outQ(showB)) : 450 + Math.sin(s.t * 3) * 10;
          const rx = Math.min(r0, Math.max(e, 30) + 8), ry = r0 * Math.pow(r0 / rx, 0.35);
          bubble(g, 500, y, rx, ry, s.t);
        }
        hands(g, s, e, { y: 540, sleeve: C.teal });
      } else {
        // 空き缶：リサイクルのかご
        g.bg('#d6f5e3'); g.stripes(V.x0, V.y0, V.x1 - V.x0, 760 - V.y0, 70, '#d6f5e3', '#c8eed9');
        g.band(760, 'bottom', '#9aa3b5', 7); g.band(780, 'bottom', '#b7bfcd');
        const bx = 820, by = 760;
        g.rr(bx - 110, by - 210, 220, 240, 20, C.blue); g.ell(bx, by - 210, 110, 26, '#1d4fa8'); g.rr(bx - 110, by - 210, 220, 240, 20, null);
        g.circ(bx, by - 110, 44, '#ffffff', 0); g.text('かん', bx, by - 110, { size: 36, f: C.blue, font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
        const target = s.k === 0 ? 42 : s.k === 1 ? 14 : 14, now = s.k === 0 ? 78 : s.k === 1 ? 42 : 14;
        const e = gap(s, target);
        const a2 = age2(s);
        if (a2 < 0 || a2 < 0.03) can(g, 500, 520, Math.max(Math.min(now, e), target));
        else {
          const q = clamp((a2 - 0.03) / 0.22), x = lerp(500, bx, q), y = lerp(520, by - 230, q) - 260 * 4 * q * (1 - q);
          if (q < 1) g.at(x, y, q * 9, 1 - q * 0.5, 1 - q * 0.5, () => can(g, 0, 0, 14));
          else if (!s.my.binDone) { s.my.binDone = 1; g.sfx('ding'); g.fx.stars(bx, by - 230, 8); g.fx.pop('ナイス！', bx - 60, by - 380, { size: 90, c: C.yellow }); }
        }
        g.ell(bx, by - 210, 110, 26, null);
        hands(g, s, e, { y: 540, sleeve: C.green });
      }
    },
    hit(g, s, k, v) {
      if (v.kind === 'mosq') {
        clapFx(g, 500, 470, k);
        if (k === 1) { g.fx.pop('スカッ', 690, 250, { size: 100, c: C.lemon }); g.fx.burst(500, 330, { n: 8, c: '#ffffff', shape: 'smoke', sp: [80, 200], size: [30, 50], g: -40, life: [0.3, 0.5] }); }
        else { g.fx.pop('パチン！', 500, 230, { size: 120, c: '#ffffff' }); g.fx.stars(500, 420, 8); }
      } else if (v.kind === 'balloon') {
        const big = k === 2;
        g.fx.burst(500, 450, { n: big ? 24 : 16, c: big ? [C.gold, '#ffe27a', C.orange] : [C.red, sh(C.red, -0.2)], shape: 'chip', sp: [300, 800], size: [14, 26], g: 1400 });
        g.fx.ring(500, 450, { r1: big ? 320 : 240, w: 16 }); g.fx.pop(big ? 'パーン！' : 'パン', 500, 210, { size: big ? 130 : 110 });
        g.fx.shake(big ? 12 : 8, 0.14);
        if (big) { g.fx.confetti(80); g.fx.stars(500, 450, 8); g.sfx('cheer'); }
      } else if (v.kind === 'bubble') {
        const big = k === 2;
        g.fx.burst(500, 450, { n: big ? 22 : 14, c: ['#bff3ff', '#ffd6f0', '#fff6b0', '#ffffff'], shape: 'drop', sp: [250, 700], size: [10, 18], g: 900 });
        g.fx.ring(500, 450, { r1: big ? 340 : 240, w: 10, c: '#ffffff' }); g.fx.pop(big ? 'パチーン' : 'パチン', 500, 210, { size: big ? 120 : 105 });
        g.fx.shake(big ? 9 : 6, 0.12);
        if (big) { g.fx.burst(500, 450, { n: 16, c: [C.red, C.orange, C.yellow, C.green, C.blue, C.purple], shape: 'star', sp: [300, 800], size: [14, 24], g: 400 }); g.sfx('chime'); }
      } else {
        clapFx(g, 500, 520, k, { r0: 130 });
        g.fx.pop(k === 1 ? 'ベコッ' : 'ペシャ！', 500, 250, { size: 110 });
        g.fx.burst(500, 520, { n: 8, c: ['#ffffff', C.metal], shape: 'spark', sp: [300, 700], size: [12, 20] });
      }
    },
  },
  {
    id: 'clap-shape', acts: ['clap'], modes: ['both'], vars: SHAPE, sfx: (k, v) => v.sfx,
    init(s, v) {
      const n = 24, seed = s.r() * 6;
      s.my.lumps = lumpy(n, v.kind === 'onigiri' ? 130 : 124, 0.16, seed).map((r, i) => r * (1 + (i % 3 === 0 ? 0.07 : -0.03)));
      s.my.mid = v.kind === 'onigiri' ? Array.from({ length: n }, (_, i) => 110 * (1 + 0.15 * Math.cos(3 * (i / n * TAU))) * (1 + (i % 2 ? 0.035 : -0.035))) : lumpy(n, 112, 0.05, seed + 1);
      s.my.fin = v.kind === 'onigiri' ? Array.from({ length: n }, (_, i) => 112 * (1 + 0.18 * Math.cos(3 * (i / n * TAU)))) : Array.from({ length: n }, () => 108);
      s.my.grains = Array.from({ length: 16 }, () => [(s.r() - 0.5) * 220, (s.r() - 0.5) * 220, s.r() * 3]);
    },
    draw(g, s, v) {
      shapeBg(g, s, v);
      const e = gap(s, s.k === 0 ? 112 : 106);
      shapeObj(g, s, v, e + 4);
      hands(g, s, e, { y: 540, sleeve: v.kind === 'snow' ? '#e8434f' : v.kind === 'dango' ? C.orange : C.sleeve });
    },
    hit(g, s, k, v) {
      const pal = v.kind === 'onigiri' ? ['#ffffff', '#f3eedc'] : v.kind === 'snow' ? ['#ffffff', '#e3efff'] : ['#8a5a3c', '#a2724e'];
      g.fx.burst(500, 520, { n: 10, c: pal, shape: v.kind === 'snow' ? 'snow' : 'dot', sp: [200, 500], size: [10, 18], g: 1200 });
      clapFx(g, 500, 520, k, { r0: 150, r1: 260 });
      if (k === 1) g.fx.pop(v.kind === 'snow' ? 'ギュッ' : v.kind === 'dango' ? 'ペタッ' : 'ギュッ', 500, 250, { size: 100 });
      else { g.fx.pop(v.kind === 'snow' ? 'できた！' : v.kind === 'dango' ? 'ピカピカ' : 'できた！', 500, 230, { size: 110, c: C.yellow }); g.fx.stars(500, 470, 10); g.sfx('chime'); }
    },
  },
  {
    id: 'clap-inst', acts: ['clap'], modes: ['both'], vars: INST, sfx: (k, v) => v.sfx,
    draw(g, s, v) { if (v.kind === 'cymbal') drawCymbal(g, s); else if (v.kind === 'hyoshigi') drawHyoshigi(g, s); else drawAccordion(g, s); },
    hit(g, s, k, v) {
      const big = k === 2;
      if (v.kind === 'cymbal') {
        g.fx.ring(500, 500, { r1: big ? 420 : 300, w: 18, c: '#fff3b0' }); g.fx.sparks(500, 500, 14); clapFx(g, 500, 500, k, { r0: 200, r1: 320, c: '#fff3b0' });
        g.fx.pop(big ? 'ジャーン！' : 'ジャン', 500, 190, { size: big ? 120 : 110, c: C.yellow });
        if (big) { g.fx.confetti(90); g.sfx('cheer'); }
      } else if (v.kind === 'hyoshigi') {
        clapFx(g, 500, 360, k, { r0: 90, r1: 200 }); g.fx.pop(big ? 'カーン！' : 'カン', 500, 190, { size: 110, c: '#ffffff' });
        if (big) { g.fx.stars(500, 420, 10); g.fx.burst(500, 200, { n: 30, c: ['#ffb3cf', '#ffffff'], shape: 'leaf', sp: [150, 500], size: [14, 22], g: 160, drag: 0.97, life: [1, 1.6], spread: Math.PI * 2 }); g.sfx('cheer'); }
      } else {
        g.fx.notes(500, 340, big ? 8 : 5); g.fx.pop(big ? 'ジャーン！' : 'プワー', 500, 200, { size: 100, c: '#ffffff' }); g.fx.shake(5, 0.1);
        if (big) { g.fx.hearts(190, 480, 5); g.fx.hearts(810, 480, 5); g.fx.confetti(60); }
      }
    },
  },
  {
    id: 'clap-call', acts: ['clap'], modes: ['both'], vars: CALL, sfx: 'clap',
    init(s, v) {
      if (v.kind === 'koi') {
        const spots = [[200, 200, 1], [470, 140, 1], [780, 220, 1], [330, 330, 2], [640, 300, 2], [880, 120, 2], [110, 120, 2]];
        const tg = [[430, 600], [560, 590], [330, 650], [680, 640], [500, 700], [240, 560], [770, 560]];
        s.my.koi = spots.map(([x, y, trig], i) => ({ x, y, trig, tx: tg[i][0], ty: tg[i][1], ph: s.r() * TAU, sp: 0.8 + s.r() * 0.6, pat: i % KOI.length, dur: trig === 1 ? 0.7 : 0.3, s: 0.95 + s.r() * 0.15 }));
      } else if (v.kind === 'pigeon') {
        const at = [[200, 560, 1], [400, 610, 2], [620, 540, 1], [800, 600, 2], [300, 500, 2], [720, 640, 1]];
        s.my.birds = at.map(([x, y, trig], i) => ({ x, y, trig, s: 0.9, dir: i % 2 ? -1 : 1, ph: s.r() * 3, vx: (x < 500 ? -1 : 1) * (300 + s.r() * 300) }));
      }
    },
    draw(g, s, v) {
      const K = v.kind;
      if (K === 'koi') drawKoi(g, s); else if (K === 'pigeon') drawPigeon(g, s); else if (K === 'light') drawLight(g, s); else if (K === 'shrine') drawShrine(g, s); else drawSealion(g, s);
      const hy = K === 'koi' ? 470 : 740;
      hands(g, s, gap(s, 0), { y: hy, sleeve: K === 'shrine' ? '#7d3fb0' : K === 'light' ? '#3cc46b' : K === 'sealion' ? C.orange : C.sleeve });
    },
    hit(g, s, k, v) {
      const K = v.kind, big = k === 2, hy = K === 'koi' ? 400 : 660;
      clapFx(g, 500, hy, k);
      if (K === 'koi') { g.fx.pop(big ? 'パクパク' : 'パン', 500, 210, { size: 100 }); if (big) { g.fx.splash(500, 640, C.water, 18); g.sfx('splash'); } }
      else if (K === 'pigeon') { g.fx.pop(big ? 'バサバサ' : 'パン', 500, 330, { size: 100 }); g.fx.burst(500, 560, { n: big ? 18 : 8, c: ['#ffffff', '#dde2ec'], shape: 'leaf', sp: [200, 600], size: [14, 24], g: 200, drag: 0.96, life: [0.8, 1.4] }); }
      else if (K === 'light') { g.fx.pop(big ? 'イェーイ' : 'ピカッ', 500, 300, { size: 110, c: C.yellow }); g.fx.flash('#fff6c2', 0.5, 0.15); if (big) { g.fx.confetti(70); g.sfx('magic'); } else g.sfx('click'); }
      else if (K === 'shrine') { g.fx.pop(big ? 'パンッ' : 'パン', big ? 760 : 500, big ? 420 : 470, { size: 100 }); if (big) { g.fx.stars(500, 300, 10); g.fx.burst(500, 100, { n: 24, c: ['#ffb3cf', '#ffd6e6'], shape: 'leaf', sp: [150, 450], size: [14, 22], g: 150, drag: 0.97, life: [1, 1.6] }); g.sfx('chime'); } else g.sfx('bell'); }
      else { g.fx.pop(big ? 'ナイス！' : 'オウッ', big ? 760 : 700, 250, { size: 100, c: big ? C.yellow : '#ffffff' }); if (big) { g.fx.stars(440, 100, 10); g.sfx('cheer'); } else g.fx.splash(500, 600, '#7fd6ff', 10); }
    },
  },
];
