/* ひざを上げる — リフティング・風船わり・階段・雪道・自転車 など（p=0 がひざのいちばん高い所） */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const PI = Math.PI, TAU = PI * 2;
const KY = 1270;                                   // ひざを下ろしたときの高さ（画面の下の外）
/* ---------- ひざ ----------
   o: { tx, ty（ひざ頭の中心・上げきったとき）, dx（左右の開き・上）, dx1（下）, s, pants, stripe } */
function kneePose(sg, p, o = {}) {
  const q = clamp(p), tx = o.tx ?? 500, ty = o.ty ?? 700, dx = o.dx ?? 50;
  return {
    x: lerp(tx + sg * dx, 500 + sg * (o.dx1 ?? 230), q),
    y: lerp(ty, o.ky ?? KY, E.ioQ(q)),
    a: -PI / 2 - sg * lerp(o.a0 ?? 0.16, o.a1 ?? 0.3, q),
    s: (o.s ?? 1.2) * lerp(1, 1.1, q),
  };
}
// ひざ頭のてっぺん（当たる所）
function kneeTop(sg, o = {}) { const k = kneePose(sg, 0, o); return [k.x + Math.cos(k.a) * 94 * k.s, k.y + Math.sin(k.a) * 94 * k.s]; }
function drawKnee(g, sg, p, o = {}) {
  const k = kneePose(sg, p, Object.assign({}, o, { ky: Math.max(KY, g.V.y1 + 150) })), pc = o.pants ?? C.navy, bare = !!o.shorts;
  if (k.y > g.V.y1 + 160) return;
  g.knee(k.x, k.y, k.a, { s: k.s, pants: bare ? C.skin : pc });
  if (bare) {  // 半ズボン：すそから下がはだし
    const b = k.a + PI, L = g._toEdge(k.x, k.y, b) + 40, ex = k.x + Math.cos(b) * L, ey = k.y + Math.sin(b) * L, hx = k.x + Math.cos(b) * 175 * k.s, hy = k.y + Math.sin(b) * 175 * k.s;
    g.taper(ex, ey, hx, hy, 140 * k.s, 110 * k.s, o.shorts);
    g.ell(hx, hy, 110 * k.s, 30 * k.s, sh(o.shorts, 0.18), 6, k.a + PI / 2);
    g.at(k.x, k.y, k.a + PI / 2, sg * k.s, k.s, () => { g.arc(0, 30, 40, PI * 1.2, PI * 1.8, sh(C.skin, -0.2), 5); g.alpha(0.16, () => g.poly([58, 96, 92, 86, 100, 160, 70, 160], sh(C.skin, -0.5), 0)); });
    return;
  }
  g.at(k.x, k.y, k.a + PI / 2, sg * k.s, k.s, () => {
    // 外側のかげ・しわ・ライン（ローカル：-y がひざの先、+y が腰）
    g.alpha(0.2, () => g.poly([56, 96, 92, 86, 126, 1400, 90, 1400], sh(pc, -0.6), 0));
    if (o.stripe) g.poly([66, 100, 84, 96, 112, 1400, 92, 1400], o.stripe, 0);
    g.curve([-78, 128, -30, 150, 30, 138], sh(pc, -0.3), 6);
    g.curve([-60, 190, -10, 206, 46, 196], sh(pc, -0.3), 5);
  });
}
// 交互: 上がるほう = s.side（s.p）、もう一方は 1 - s.p ／ 片足: s.side だけ
function knees(g, s, o = {}) {
  const alt = s.mode === 'alt';
  const list = alt ? (s.side === 'L' ? ['R', 'L'] : ['L', 'R']) : [s.side === 'L' ? 'L' : 'R'];
  for (const side of list) {
    const active = s.side === side || !alt;
    drawKnee(g, side === 'L' ? -1 : 1, active ? s.p : clamp(1 - s.p), o);
  }
}
const sgOf = side => side === 'L' ? -1 : 1;

/* ---------- ボール ---------- */
function soccerBall(g, x, y, r, rot = 0) {
  g.at(x, y, rot, 1, 1, () => {
    g.circ(0, 0, r, '#ffffff');
    g.clipCirc(0, 0, r, () => {
      g.star(0, 0, r * 0.36, r * 0.3, 5, C.ol, 0, -PI / 2);
      for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * TAU / 5; g.star(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.32, r * 0.26, 5, C.ol, 0, a + PI); g.line([Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7], C.ol, 5); }
    });
  });
  g.circ(x, y, r, null); g.hl(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.14, -0.6, 0.6);
}
// 紙ふうせん
function paperBalloon(g, x, y, r, rot = 0) {
  const cs = ['#ff5a7a', '#ffd23f', '#3a86ff', '#3cc46b', '#ffffff', '#ff9f1c'];
  g.at(x, y, rot, 1, 1, () => {
    g.circ(0, 0, r, '#ffffff');
    g.clipCirc(0, 0, r, () => {
      for (let i = 0; i < 6; i++) g.ell(Math.cos(i * PI / 3) * r * 0.2, 0, r * 0.34, r * 1.1, cs[i], 0, i * PI / 3);
      for (let i = 0; i < 6; i++) g.curve([0, -r, Math.cos(i * PI / 3) * r * 0.9, Math.sin(i * PI / 3) * r * 0.5, 0, r], 'rgba(60,40,80,0.25)', 3);
      g.circ(0, 0, r, g.rad(-r * 0.3, -r * 0.3, r * 0.2, r * 1.2, [[0, 'rgba(255,255,255,0.15)'], [1, 'rgba(40,20,60,0.25)']]), 0);
    });
    g.circ(0, -r * 0.02, r * 0.14, '#fff6e5', 4);
  });
  g.circ(x, y, r, null); g.hl(x - r * 0.35, y - r * 0.42, r * 0.26, r * 0.12, -0.6, 0.55);
}

/* =========================================================================
   リフティング
   ========================================================================= */
const JUGGLE = [
  { k: 'soccer', name: 'ひざでリフティング', short: 'リフティング', theme: 'sports', sfx: 'kick', pants: '#2f3a8f', stripe: '#ffffff' },
  { k: 'paper', name: '紙ふうせんをつく', short: '紙ふうせん', theme: 'home', sfx: 'bongo', pants: '#c0485a', paper: 1 },
];
const JR = 74;
/* ---------- 遠近（一人称の地面）: x 横・h 高さ・z 前方（メートル） ---------- */
function P3(cam, x, h, z) { const d = Math.max(0.08, z - cam.z); return { x: 500 + cam.f * x / d, y: cam.hy + cam.f * (cam.h - h) / d, k: cam.f / d / 100, d }; }
// 当たるたびに前へ進む量（ease つき）: 0 → step → 2*step
// d は回数単位（2回目のあと場面が終わる 0.3 回までに着くよう 0.28）
function advance(s, step, d = 0.28) { if (!s.k) return 0; return ((s.k - 1) + E.ioQ(clamp(s.age / (d * (s.spr || 1))))) * step; }

/* =========================================================================
   風船・シャボン玉・水ふうせんを割る
   ========================================================================= */
const POP = [
  { k: 'balloon', name: 'ひざで風船を割る', short: '風船わり', theme: 'party', sfx: 'pop', pants: '#5b4bd1', cols: [C.red, C.blue, C.yellow] },
  { k: 'bubble', name: 'シャボン玉を割る', short: 'シャボン玉', theme: 'nature', sfx: 'bubble', pants: '#2f7d6b', bubble: 1 },
  { k: 'water', name: '水ふうせんを割る', short: '水ふうせん', theme: 'festival', sfx: 'splash', pants: '#d0465a', water: 1, cols: ['#4cc9f0', '#ff7eb6', '#ffd23f'] },
];
const POPR = 112;
function popTarget(s) { const alt = s.mode === 'alt', [kx, ky] = kneeTop(alt ? 1 : sgOf(s.side)); return [alt ? 500 : kx, ky - POPR + 6]; }
function balloonShape(g, x, y, r, col) {
  g.curve([x, y + r * 1.08, x - 14, y + r * 1.6, x + 12, y + r * 2.2, x - 6, y + 900], C.ol, 4);
  g.tri(x - 14, y + r * 1.12, x + 14, y + r * 1.12, x, y + r * 0.98, sh(col, -0.15), 5);
  g.ell(x, y, r * 0.92, r * 1.06, col);
  g.ell(x + r * 0.3, y + r * 0.35, r * 0.45, r * 0.55, 'rgba(40,20,60,0.12)', 0, -0.4);
  g.hl(x - r * 0.34, y - r * 0.42, r * 0.2, r * 0.34, -0.5, 0.6); g.circ(x - r * 0.12, y - r * 0.72, r * 0.07, 'rgba(255,255,255,0.7)', 0);
}
function bubbleShape(g, x, y, r, t, big) {
  const w = big ? 16 : 7;
  g.circ(x, y, r, big ? 'rgba(235,225,255,0.38)' : 'rgba(220,240,255,0.22)', 0);
  g.arc(x, y, r - w / 2 - 2, 0.2 + t, 1.6 + t, 'rgba(255,110,200,0.75)', w);
  g.arc(x, y, r - w / 2 - 2, 1.7 + t, 3.1 + t, 'rgba(90,180,255,0.75)', w);
  g.arc(x, y, r - w / 2 - 2, 3.2 + t, 4.6 + t, 'rgba(255,220,90,0.75)', w);
  g.arc(x, y, r - w / 2 - 2, 4.7 + t, 6.1 + t, 'rgba(110,235,170,0.7)', w);
  if (big) g.ring(x, y, r + 3, 'rgba(43,33,64,0.45)', 4);
  g.ring(x, y, r, 'rgba(255,255,255,0.95)', big ? 6 : 4);
  g.hl(x - r * 0.38, y - r * 0.4, r * 0.26, r * 0.14, -0.7, 0.9); g.circ(x + r * 0.42, y + r * 0.38, r * 0.08, 'rgba(255,255,255,0.85)', 0);
}
function waterBalloon(g, x, y, r, col) {
  g.line([x, y - r * 1.05, x, -600], '#fdfdfd', 4);
  g.blob([x, y - r * 1.05, x + r * 0.75, y - r * 0.55, x + r * 0.95, y + r * 0.3, x + r * 0.55, y + r * 0.92, x, y + r, x - r * 0.55, y + r * 0.92, x - r * 0.95, y + r * 0.3, x - r * 0.75, y - r * 0.55], col);
  g.clipCirc(x, y + r * 0.05, r * 0.92, () => { g.rect(x - r, y + r * 0.1 + Math.sin(x) * 4, r * 2, r, sh(col, -0.18), 0); g.curve([x - r, y + r * 0.12, x - r * 0.4, y + r * 0.04, x + r * 0.3, y + r * 0.16, x + r, y + r * 0.08], 'rgba(255,255,255,0.6)', 5); });
  g.blob([x, y - r * 1.05, x + r * 0.75, y - r * 0.55, x + r * 0.95, y + r * 0.3, x + r * 0.55, y + r * 0.92, x, y + r, x - r * 0.55, y + r * 0.92, x - r * 0.95, y + r * 0.3, x - r * 0.75, y - r * 0.55], null);
  for (let i = 0; i < 3; i++) g.curve([x - r * 0.8, y - r * 0.2 + i * 26, x, y - r * 0.32 + i * 26, x + r * 0.8, y - r * 0.2 + i * 26], 'rgba(255,255,255,0.75)', 4);
  g.rr(x - 12, y - r * 1.12, 24, 18, 6, sh(col, -0.2), 4);
  g.hl(x - r * 0.4, y - r * 0.3, r * 0.14, r * 0.26, -0.4, 0.7);
}

/* =========================================================================
   石段・山道・雲の階段をのぼる（当たるたびに3段ずつ）
   ========================================================================= */
const CLIMB = [
  { k: 'shrine', name: '神社の石段をのぼる', short: '石段', theme: 'nature', sfx: ['stomp', 'chime'], pants: '#3d5a99', tread: '#c9c6bd', riser: '#8f8b84', side: '#3f7a3c', sky: ['#ffd9a8', '#fff3dc'] },
  { k: 'mountain', name: '山頂をめざす', short: '山のぼり', theme: 'nature', sfx: ['stomp', 'cheer'], pants: '#7a5230', mtn: 1, tread: '#b89a72', riser: '#8a6d4c', side: '#79b84f', sky: ['#5fb4ff', '#d9f1ff'] },
  { k: 'cloud', name: '雲の階段をのぼる', short: '雲の階段', theme: 'fantasy', sfx: ['boing', 'magic'], pants: '#7a5cd6', cloud: 1, tread: '#ffffff', riser: '#dfe8ff', sky: ['#a98bff', '#ffd1ec'] },
];
const SN = 6, SD = 0.34, SR = 0.2, SW = 1.3;
function climbCam(s) { const z = advance(s, 3); return { z: -0.75 + z * SD, h: 1.5 + z * SR, f: 520, hy: 430, zs: z }; }
function torii(g, b, open) {
  g.at(b.x, b.y, 0, b.k, b.k, () => {
    for (const x of [-125, 125]) { g.rr(x - 17, -330, 34, 330, 6, '#e8452c'); g.rr(x - 21, -24, 42, 26, 6, C.ol, 0); }
    g.rr(-165, -262, 330, 26, 6, '#e8452c');
    g.rr(-12, -300, 24, 40, 4, '#e8452c');
    g.path('M-205 -318 Q0 -300 205 -318 L195 -296 Q0 -282 -195 -296 Z', '#e8452c');
    g.path('M-222 -338 Q0 -318 222 -338 L208 -318 Q0 -300 -208 -318 Z', C.ol);
    if (open) g.alpha(open, () => g.glow(0, -170, 260, '#fff3b0', 0.8));
  });
}
function lantern(g, b) {
  g.at(b.x, b.y, 0, b.k, b.k, () => { g.rr(-22, -60, 44, 60, 6, '#a7a49c'); g.rr(-34, -86, 68, 26, 6, '#bcb8ae'); g.rr(-26, -132, 52, 46, 6, '#cfcabf'); g.rr(-10, -120, 20, 22, 4, '#ffe08a', 4); g.path('M-46 -132 L0 -164 L46 -132 Z', '#9c988e'); g.circ(0, -170, 9, '#9c988e'); });
}
function cedar(g, b, f) {
  g.at(b.x, b.y, 0, b.k, b.k, () => { g.rr(-12, -120, 24, 120, 6, '#6b4a2e', 5); for (let i = 0; i < 3; i++) g.tri(-90 + i * 18, -90 - i * 90, 90 - i * 18, -90 - i * 90, 0, -230 - i * 90, f, 5); });
}
function cloudPuff(g, x, y, w, f, o = 5) { g.blob([x - w, y, x - w * 0.8, y - w * 0.35, x - w * 0.35, y - w * 0.55, x, y - w * 0.4, x + w * 0.4, y - w * 0.6, x + w * 0.82, y - w * 0.3, x + w, y], f, o, 0.9); }

/* =========================================================================
   雪・落ち葉・川・草むらを進む（ひざで「かきわける」）
   ========================================================================= */
const TREK = [
  { k: 'snow', name: '深い雪の中を歩く', short: '雪道', theme: 'winter', sfx: 'crunch', pants: '#e2504c', ground: '#f4f8ff', lump: '#dbe7f7', sky: ['#9fd2ff', '#eef8ff'] },
  { k: 'leaves', name: '落ち葉の山を歩く', short: '落ち葉', theme: 'nature', sfx: 'crunch', pants: '#5a4a8a', ground: '#e8913a', lump: '#c9622b', sky: ['#ffd38a', '#fff2d6'] },
  { k: 'river', name: '浅い川をわたる', short: '川わたり', theme: 'nature', sfx: 'splash', shorts: '#3d6fb5', ground: '#5cc8e8', lump: '#8ee0f5', sky: ['#7fd0ff', '#e6f7ff'] },
  { k: 'grass', name: '草むらを進む', short: '草むら', theme: 'nature', sfx: 'swish', pants: '#4a5d8f', ground: '#5fb84a', lump: '#7ccc5a', sky: ['#8fd6ff', '#effaff'] },
];
const TCOL = { snow: ['#ffffff', '#e4eefc', '#c9dbf5'], leaves: ['#ff8a2a', '#ffb347', '#e04a2a', '#ffd23f'], river: ['#ffffff', '#bdf0ff', '#7fdcf5'], grass: ['#8edc5a', '#5fb84a', '#b4ec7a'] };
function rabbit(g, x, y, k, t, peek) {
  g.at(x, y, 0, k, k, () => {
    const e = Math.sin(t * 8) * 0.06;
    for (const sd of [-1, 1]) g.at(sd * 26, -120, sd * 0.18 + e * sd, 1, 1, () => { g.ell(0, -60, 22, 66, '#ffffff'); g.ell(0, -56, 10, 46, '#ffb3c6', 0); });
    if (peek) return;
    g.ell(0, -10, 86, 70, '#ffffff'); g.circ(0, -96, 62, '#ffffff');
    for (const sd of [-1, 1]) { g.circ(sd * 24, -104, 8, C.ol, 0); g.circ(sd * 22, -107, 3, '#fff', 0); g.ell(sd * 38, -80, 12, 7, '#ffc2d1', 0); }
    g.tri(-7, -84, 7, -84, 0, -76, '#ff8fa3', 0);
  });
}
function squirrel(g, x, y, k, t, peek) {
  g.at(x, y, 0, k, k, () => {
    g.path('M30 -10 C120 -10 140 -120 90 -170 C60 -200 20 -170 50 -140 C80 -110 60 -60 20 -40 Z', '#c8743a');
    g.curve([60, -140, 90, -120, 80, -70], '#e7a066', 8);
    if (peek) return;
    g.ell(-10, -40, 56, 62, '#c8743a'); g.ell(-14, -30, 32, 44, '#f3d2a8', 0);
    g.circ(-14, -118, 46, '#c8743a'); for (const sd of [-1, 1]) g.tri(-14 + sd * 30, -150, -14 + sd * 18, -186, -14 + sd * 6, -150, '#c8743a');
    for (const sd of [-1, 1]) g.circ(-14 + sd * 18, -122, 7, C.ol, 0);
    g.ell(-14, -100, 16, 11, '#f3d2a8', 0); g.circ(-14, -106, 5, C.ol, 0);
    g.at(-14, -56, Math.sin(t * 6) * 0.1, 1, 1, () => { g.ell(0, 0, 22, 26, '#a0673c'); g.rr(-22, -24, 44, 18, 8, '#6b4428'); g.line([0, -24, 4, -34], '#6b4428', 5); });
  });
}
function fish(g, x, y, k, rot) {
  g.at(x, y, rot, k, k, () => {
    g.path('M-110 0 C-60 -50 40 -50 90 0 C40 50 -60 50 -110 0 Z', '#9fb8d6');
    g.path('M80 0 L150 -44 L136 0 L150 44 Z', '#7f9bc0');
    g.path('M-60 -30 C-20 -44 30 -44 70 -16 L60 0 C20 -24 -30 -24 -70 -10 Z', '#6c86ad', 0);
    g.circ(-66, -8, 10, '#ffffff', 4); g.circ(-68, -8, 5, C.ol, 0);
    g.path('M-10 -38 L20 -66 L36 -34 Z', '#7f9bc0'); g.hl(-20, -16, 36, 8, 0, 0.5);
  });
}
function shiba(g, x, y, k, t, peek) {
  g.at(x, y, 0, k, k, () => {
    const w = Math.sin(t * 16) * 0.3;
    g.at(64, -60, w, 1, 1, () => g.path('M0 0 C30 -10 50 -50 20 -70 C0 -82 -18 -60 0 -46 C14 -36 10 -20 -6 -14 Z', '#e8a04f'));
    for (const sd of [-1, 1]) g.tri(sd * 50, -150, sd * 30, -210, sd * 8, -160, '#e8a04f');
    if (peek) { g.circ(0, -140, 56, '#e8a04f'); for (const sd of [-1, 1]) g.circ(sd * 20, -150, 7, C.ol, 0); return; }
    g.ell(0, -40, 74, 60, '#e8a04f'); g.ell(0, -30, 40, 40, '#fff3e0', 0);
    g.circ(0, -130, 62, '#e8a04f'); g.ell(0, -108, 40, 30, '#fff3e0', 0);
    for (const sd of [-1, 1]) { g.circ(sd * 24, -140, 8, C.ol, 0); g.ell(sd * 30, -158, 10, 5, '#fff3e0', 0); }
    g.ell(0, -118, 11, 8, C.ol, 0); g.path('M-12 -100 Q0 -88 12 -100', null, 4); g.ell(0, -92, 9, 10, '#ff8fa3', 3);
  });
}
function sproutTree(g, b, col, trunk = '#7a4a2a') { g.at(b.x, b.y, 0, b.k, b.k, () => { g.rr(-16, -180, 32, 180, 8, trunk, 5); g.circ(0, -230, 110, col, 5); g.circ(-56, -190, 70, col, 5); g.circ(60, -196, 74, col, 5); g.circ(-30, -260, 40, sh(col, 0.2), 0); }); }
function pine(g, b, snowy) {
  g.at(b.x, b.y, 0, b.k, b.k, () => {
    g.rr(-14, -80, 28, 80, 6, '#6b4a2e', 5);
    for (let i = 0; i < 3; i++) { g.tri(-110 + i * 22, -60 - i * 80, 110 - i * 22, -60 - i * 80, 0, -200 - i * 80, '#2f7a52', 5); if (snowy) g.path(`M${-60 + i * 12} ${-130 - i * 80} Q0 ${-150 - i * 80} ${60 - i * 12} ${-130 - i * 80} L0 ${-200 - i * 80} Z`, '#ffffff', 0); }
  });
}

/* =========================================================================
   自転車・スワンボートをこぐ（交互）
   ========================================================================= */
const BIKE = [
  { k: 'bike', name: '自転車をこぐ', short: '自転車', theme: 'town', sfx: ['whoosh', 'bell'], pants: '#3c6fd1' },
  { k: 'swan', name: 'スワンボートをこぐ', short: 'スワンボート', theme: 'nature', sfx: ['splash', 'quack'], pants: '#e0584f', swan: 1 },
];
const BKO = { ty: 930, dx: 150, dx1: 210, s: 1.1, a0: 0.04, a1: 0.14 };
function sakura(g, b) {
  g.at(b.x, b.y, 0, b.k, b.k, () => {
    g.rr(-16, -200, 32, 200, 8, '#6b4a3a', 5); if (b.k > 0.4) { g.line([0, -170, -60, -250], '#6b4a3a', 14); g.line([0, -180, 70, -260], '#6b4a3a', 12); }
    g.blob([-170, -230, -150, -330, -60, -390, 40, -380, 150, -330, 180, -230, 110, -170, -100, -170], '#ffc1d9');
    if (b.k < 0.4) return;
    for (const [x, y, r] of [[-90, -300, 50], [40, -320, 56]]) g.circ(x, y, r, '#ffdbe9', 0);
    if (b.k > 0.9) for (const [x, y] of [[-40, -250], [70, -280]]) g.circ(x, y, 9, '#ff8fb8', 0);
  });
}
function catFace(g, x, y, r, happy, t) {
  g.tri(x - r * 0.95, y - r * 0.3, x - r * 0.75, y - r * 1.25, x - r * 0.2, y - r * 0.8, '#ffb35c');
  g.tri(x + r * 0.95, y - r * 0.3, x + r * 0.75, y - r * 1.25, x + r * 0.2, y - r * 0.8, '#ffb35c');
  g.ell(x, y, r, r * 0.86, '#ffb35c');
  for (const d of [-0.35, 0, 0.35]) g.line([x + d * r, y - r * 0.85, x + d * r * 0.8, y - r * 0.55], '#e07a2a', 6);
  for (const sd of [-1, 1]) {
    if (happy) g.arc(x + sd * r * 0.38, y - r * 0.02, r * 0.16, PI * 1.1, PI * 1.9, C.ol, 6);
    else { g.ell(x + sd * r * 0.38, y - r * 0.05, r * 0.11, r * 0.16, C.ol, 0); g.circ(x + sd * r * 0.36, y - r * 0.1, r * 0.04, '#fff', 0); }
    g.line([x + sd * r * 0.62, y + r * 0.2, x + sd * r * 1.15, y + r * 0.1], C.ol, 3); g.line([x + sd * r * 0.62, y + r * 0.3, x + sd * r * 1.12, y + r * 0.36], C.ol, 3);
  }
  g.tri(x - r * 0.1, y + r * 0.12, x + r * 0.1, y + r * 0.12, x, y + r * 0.24, '#ff8fa3', 0);
  g.path(`M${x - r * 0.2} ${y + r * 0.32} Q${x - r * 0.1} ${y + r * 0.42} ${x} ${y + r * 0.3} Q${x + r * 0.1} ${y + r * 0.42} ${x + r * 0.2} ${y + r * 0.32}`, null, 4);
  void t;
}
function duck(g, x, y, s, rot, baby, step) {
  g.at(x, y, rot, s, s, () => {
    const body = baby ? '#ffe066' : '#ffffff';
    for (const sd of [-1, 1]) { const ph = sd * step; g.line([sd * 10, 40, sd * 10 + ph * 16, 74], '#ff9f1c', 9); g.ell(sd * 10 + ph * 16 + 10, 78, 18, 7, '#ff9f1c', 4); }
    if (baby) { g.ell(0, 0, 52, 44, body); g.tri(-48, -10, -76, -30, -54, 12, body); g.circ(34, -46, 34, body); g.path('M58 -50 L86 -42 L58 -34 Z', '#ff9f1c'); g.circ(42, -54, 6, C.ol, 0); g.curve([-20, -6, 6, 10, 26, -4], sh(body, -0.2), 5); }
    else { g.path('M-90 -20 L-130 -64 L-80 -40 Z', body); g.ell(-6, 0, 96, 60, body); g.cap(54, -30, 66, -100, 30, body); g.circ(70, -118, 42, body); g.path('M102 -122 Q140 -118 146 -104 Q120 -96 100 -102 Z', '#ff9f1c'); g.circ(82, -128, 7, C.ol, 0); g.curve([-56, -20, -10, 8, 40, -6], '#d9dee8', 6); }
  });
}
function slime(g, x, y, r, col, sq = [1, 1], face = 0) {
  g.at(x, y, 0, sq[0], sq[1], () => {
    g.path(`M${-r} 0 C${-r} ${-r * 0.75} ${-r * 0.5} ${-r * 1.1} 0 ${-r * 1.1} C${r * 0.5} ${-r * 1.1} ${r} ${-r * 0.75} ${r} 0 Q0 ${r * 0.22} ${-r} 0 Z`, col);
    g.path(`M${-r * 0.8} ${-r * 0.1} C${-r * 0.7} ${-r * 0.5} ${-r * 0.2} ${-r * 0.3} 0 ${-r * 0.05} Q${-r * 0.4} ${r * 0.1} ${-r * 0.8} ${-r * 0.1} Z`, sh(col, -0.15), 0);
    g.hl(-r * 0.45, -r * 0.75, r * 0.22, r * 0.12, -0.6, 0.8); g.circ(-r * 0.2, -r * 0.9, r * 0.06, 'rgba(255,255,255,0.9)', 0);
    if (face === 1) { for (const sd of [-1, 1]) g.path(`M${sd * r * 0.42} ${-r * 0.62} l${-sd * r * 0.18} ${r * 0.1} l${sd * r * 0.18} ${r * 0.1}`, null, 6); }
    else for (const sd of [-1, 1]) { g.ell(sd * r * 0.3, -r * 0.55, r * 0.13, r * 0.18, '#ffffff', 4); g.circ(sd * r * 0.28, -r * 0.52, r * 0.07, C.ol, 0); }
    g.path(`M${-r * 0.18} ${-r * 0.3} Q0 ${-r * 0.14} ${r * 0.18} ${-r * 0.3}`, null, 5);
  });
}

/* =========================================================================
   丸太・ハードルをまたぐ（当たる瞬間にちょうどひざの下を通る）
   ========================================================================= */
const HURDLE = [
  { k: 'log', name: '丸太をまたぐ', short: '丸太', theme: 'nature', pants: '#6b8e3a' },
  { k: 'hurdle', name: 'ハードルをこえる', short: 'ハードル', theme: 'sports', shorts: '#e8402f', track: 1 },
];
const HSP = 3.2, HD = 1.25;   // 1回で進む距離、当たる瞬間の障害物までの距離
function fox(g, b, cheer, t) {
  g.at(b.x, b.y, 0, b.k, b.k, () => {
    g.rr(-90, -60, 180, 60, 14, '#a0673c'); g.ell(0, -60, 90, 22, '#d9a066');
    const w = Math.sin(t * (cheer ? 16 : 5)) * (cheer ? 0.4 : 0.15);
    g.at(50, -110, w, 1, 1, () => { g.path('M0 0 C60 -10 90 -70 60 -110 C40 -80 20 -50 -10 -30 Z', '#ff8a2a'); g.path('M60 -110 C70 -90 66 -80 52 -76 C56 -90 56 -100 60 -110 Z', '#ffffff', 0); });
    g.ell(0, -120, 50, 56, '#ff8a2a'); g.ell(0, -108, 28, 40, '#ffffff', 0);
    for (const sd of [-1, 1]) g.at(sd * 46, -130, sd * (cheer ? -1.3 + Math.sin(t * 16) * 0.2 : 0.2), 1, 1, () => g.ell(0, -26, 14, 30, '#ff8a2a'));
    for (const sd of [-1, 1]) g.tri(sd * 50, -210, sd * 20, -270, sd * 8, -214, '#ff8a2a');
    g.circ(0, -210, 48, '#ff8a2a'); g.path('M-48 -204 Q-20 -170 0 -166 Q20 -170 48 -204 Q30 -186 0 -186 Q-30 -186 -48 -204 Z', '#ffffff', 0);
    for (const sd of [-1, 1]) cheer ? g.arc(sd * 18, -214, 9, PI * 1.1, PI * 1.9, C.ol, 5) : g.circ(sd * 18, -216, 6, C.ol, 0);
    g.circ(0, -184, 7, C.ol, 0);
  });
}

function juggleBall(s, bx, by) {
  const ph = s.ph;
  let y, x = bx, rot;
  if (ph < 0) { const t = (ph + 0.7) / 0.7; y = lerp(60, by, t * t); rot = ph * 2; }
  else if (ph < 1) { y = by - 360 * 4 * ph * (1 - ph); rot = ph * 5; }
  else { const t = ph - 1; y = by - 1700 * t + 1500 * t * t; rot = 5 + t * 14; }
  return [x, y, rot];
}

export default [
  {
    id: 'knee-juggle', acts: ['knee'], modes: ['alt', 'one'], sfx: (k, v) => v.sfx, vars: JUGGLE,
    draw(g, s, v) {
      const V = g.V, alt = s.mode === 'alt', sg = sgOf(s.side);
      const ko = { pants: v.pants, stripe: v.stripe, dx: alt ? 40 : 52 };
      const [kx, ky] = kneeTop(alt ? 1 : sg, ko);
      const bx = alt ? 500 : kx, by = ky - JR + 6;
      if (v.paper) {
        // 和室：しょうじ・たたみ
        g.bg('#f3e6c8');
        g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 150 - V.y0, '#8a5a36', 0);
        for (let x = 60; x < V.x1 + 200; x += 300) { g.rect(x - 300, 150, 300, 440, '#fbf6e8', 0); g.grid(x - 300, 150, 300, 440, 74, '#c99a66', 6); g.rect(x - 300, 150, 300, 440, null, 8); }
        g.band(150, 170, '#6b4428');
        g.band(590, 'bottom', '#c9d68f'); g.band(590, 612, '#5f7a3a');
        for (let i = 0, y = 612; y < V.y1 + 40; i++) { const h = 150 * Math.pow(1.22, i); g.line([V.x0 - 40, y, V.x1 + 40, y], '#a9b86a', 5); for (let x = 500 - 1400; x < 2400; x += 380) g.line([x + (i % 2) * 190, y, x + (i % 2) * 190, y + h], '#a9b86a', 5); y += h; }
        // ねこ（ボールを目で追う）
        const cx = 830, cy = 560, lx = (bx - cx) / 600, ly = clamp((by - 260 - cy) / 600, -0.6, 0.6);
        const [, bY] = juggleBall(s, bx, by), look = clamp((bY - cy) / 500, -0.7, 0.5);
        g.ell(cx, cy + 50, 120, 34, '#e07a5f'); g.ell(cx, cy + 40, 110, 28, '#f2a07b', 0);
        g.ell(cx, cy - 10, 74, 60, '#f7f7f7'); g.path(`M${cx + 64} ${cy + 20} q60 -10 50 -70`, null, 0); g.curve([cx + 60, cy + 20, cx + 110, cy + 10, cx + 112, cy - 50], C.ol, 22); g.curve([cx + 60, cy + 20, cx + 110, cy + 10, cx + 112, cy - 50], '#f7f7f7', 10);
        g.circ(cx - 6, cy - 70, 54, '#f7f7f7'); g.tri(cx - 52, cy - 96, cx - 46, cy - 150, cx - 14, cy - 116, '#f7f7f7'); g.tri(cx + 40, cy - 96, cx + 34, cy - 150, cx + 2, cy - 116, '#f7f7f7');
        g.ell(cx + 22, cy - 90, 22, 16, '#f2a35a', 0);
        for (const ex of [-26, 14]) { g.ell(cx - 6 + ex, cy - 74, 11, 13, '#ffffff', 3); g.circ(cx - 6 + ex + lx * 8, cy - 74 + look * 8, 6, C.ol, 0); }
        g.tri(cx - 12, cy - 56, cx, cy - 56, cx - 6, cy - 50, '#ff8fa3', 0);
        void ly;
      } else {
        // 公園のグラウンド
        g.sky('#7cc8ff', '#e2f5ff', 520); g.cloud(220, 120, 0.8); g.cloud(820, 200, 0.6);
        g.hills(470, '#8fd16a', 70, 4, 6); g.hills(520, '#6dbf55', 40, 9, 5);
        for (const [tx, sc] of [[130, 1], [300, 0.8], [760, 0.9], [900, 1.1]]) g.at(tx, 520, 0, sc, sc, () => { g.rr(-12, -90, 24, 90, 8, C.bark, 5); g.circ(0, -130, 70, '#3fae5a', 6); g.circ(-30, -150, 36, '#58c46e', 0); });
        g.band(520, 'bottom', '#5cbf5c', 7);
        for (let i = 0, y = 520, h = 34; y < V.y1; i++, y += h, h *= 1.3) if (i % 2) g.band(y, y + h, '#6ccb66');
        g.line([V.x0, 560, V.x1, 560], '#ffffff', 6);
      }
      // ボール
      const [x, y, rot] = juggleBall(s, bx, by);
      const sq = s.k && s.age < 0.25 ? squash(s.age, 0.18) : [1, 1];
      g.shadow(bx, 720, 70 * clamp(1 - (by - y) / 900, 0.4, 1), 14, 0.15);
      g.at(x, y, 0, sq[0], sq[1], () => v.paper ? paperBalloon(g, 0, 0, JR, rot * 0.4) : soccerBall(g, 0, 0, JR, rot));
      knees(g, s, ko);
      // 回数
      if (s.k) g.at(140, 130, 0, 1, 1, () => { const b = E.outBack(clamp(s.age / 0.25)); g.at(0, 0, 0, b, b, () => { g.circ(0, 0, 70, s.k === 2 ? C.yellow : '#ffffff'); g.text(String(s.k), 0, 4, { size: 84, f: C.ol }); }); });
    },
    hit(g, s, k, v) {
      const alt = s.mode === 'alt', [kx, ky] = kneeTop(alt ? 1 : sgOf(s.lastSide), { dx: alt ? 40 : 52 });
      const x = alt ? 500 : kx, y = ky - 10;
      g.fx.lines(x, y, { n: 8, r0: 90, r1: 170, a0: PI + 0.3, arc: PI - 0.6, w: 10 });
      const ps = v.paper || x > 500 ? -1 : 1;   // 紙ふうせんはねこ（右）とかさならないよう左へ
      g.fx.pop(k === 2 ? 'ナイス！' : 'ポン', x + ps * (k === 2 ? 270 : 250), k === 2 ? y + 50 : y - 60, { size: k === 2 ? 90 : 96, c: k === 2 ? C.yellow : '#ffffff', life: k === 2 ? 0.9 : 0.62 });
      g.fx.shake(5, 0.1);
      if (k === 2) g.fx.stars(x, y - 120, 9);
    },
  },

  /* ---------- 風船・シャボン玉・水ふうせんを割る ---------- */
  {
    id: 'knee-pop', acts: ['knee'], modes: ['alt', 'one'], sfx: (k, v) => v.sfx, vars: POP,
    init(s, v) { s.my.bub = []; for (let i = 0; i < 9; i++) s.my.bub.push([s.r(), s.r(), 0.3 + s.r() * 0.7]); },
    draw(g, s, v) {
      const V = g.V, alt = s.mode === 'alt', sg = alt ? 1 : sgOf(s.side);
      const [tx, ty] = popTarget(s);
      // 背景
      if (v.bubble) {
        g.sky('#8fd8ff', '#effaff', 560); g.cloud(200, 140, 0.7); g.cloud(800, 90, 0.5);
        g.hills(520, '#7ccf5f', 50, 6, 5);
        for (let x = V.x0 - 40; x < V.x1 + 80; x += 120) { g.circ(x, 520, 70, '#3f9e4a', 6); g.circ(x + 60, 500, 54, '#4fb35a', 0); }
        g.band(560, 'bottom', '#8edc6a', 7);
        for (let i = 0; i < 12; i++) { const x = V.x0 + (V.x1 - V.x0) * ((i * 0.618) % 1), y = 600 + (i % 4) * 60; g.line([x, y, x, y + 30], '#3f9e4a', 5); g.circ(x, y, 14, [C.pink, C.yellow, '#ffffff', C.violet][i % 4], 4); g.circ(x, y, 5, C.orange, 0); }
        // ふわふわ飛ぶ小さいシャボン玉
        for (const [a, b, r] of s.my.bub) { const x = V.x0 + (V.x1 - V.x0) * a + Math.sin(s.t * 1.3 + b * 9) * 30, y = 80 + b * 380 - s.t * 30 * r; bubbleShape(g, x, y, 26 * r + 10, s.t + a * 6); }
      } else if (v.water) {
        g.bg('#1d1446', '#4b1f5e'); g.band(700, 'bottom', '#3a2a55');
        for (let x = Math.floor(V.x0 / 220) * 220; x < V.x1 + 220; x += 220) { g.rr(x - 90, 520, 180, 180, 10, '#8a4a2a', 6); g.rr(x - 100, 480, 200, 50, 10, ['#e8402f', '#ffffff', '#3a86ff'][((x / 220) % 3 + 3) % 3], 6); g.glow(x, 610, 120, '#ffb36b', 0.3); }
        g.curve([V.x0 - 40, 60, 500, 120, V.x1 + 40, 60], C.ol, 5);
        for (let x = Math.ceil((V.x0 - 40) / 140) * 140; x < V.x1 + 40; x += 140) { const t = (x - V.x0) / (V.x1 - V.x0), y = 60 + 60 * 4 * t * (1 - t) * 0.8 + 16; g.glow(x, y + 30, 70, '#ff9b6b', 0.35); g.ell(x, y + 32, 28, 26, '#e8402f', 5); }
        // 水を張ったたらい
        g.ell(500, 760, 380, 80, '#2ec4b6'); g.ell(500, 752, 350, 62, '#5fe0d2', 0);
        // 竹のさお
        g.rr(V.x0 - 40, 132, V.x1 - V.x0 + 80, 26, 12, '#9cc95a', 6); for (let x = V.x0; x < V.x1; x += 160) g.line([x, 134, x, 156], '#6f9a3a', 5);
      } else {
        g.bg('#ffe8f2'); g.dots(V.x0, Math.max(V.y0, -200), V.x1 - V.x0, 720 - Math.max(V.y0, -200), 150, 14, '#ffd0e4');
        g.curve([V.x0 - 40, 70, 500, 150, V.x1 + 40, 70], C.ol, 5);
        for (let i = -6; i < 7; i++) { const x = 500 + i * 110, t = (x - V.x0) / (V.x1 - V.x0), y = 70 + 80 * 4 * t * (1 - t); g.tri(x - 40, y - 4, x + 40, y + 2, x, y + 70, [C.red, C.yellow, C.blue, C.green, C.purple][(i + 7) % 5], 5); }
        g.band(720, 'bottom', '#c98b52', 7); g.planks(V.x0 - 40, 728, V.x1 - V.x0 + 80, 800, 6, '#d39457');
        g.rr(700, 560, 260, 170, 12, '#ffffff'); g.rr(700, 560, 260, 40, 12, '#ff9fbd', 0); g.rr(780, 470, 110, 90, 14, '#fff6e5'); g.rr(780, 470, 110, 26, 10, '#ff5a7a', 0); g.circ(835, 450, 14, C.red); g.line([835, 436, 835, 420], C.ol, 5);
      }
      // ターゲット（1つ目 → 2つ目がすべりこむ）
      const sl = s.k >= 1 ? E.outBack(clamp((s.k === 1 ? s.age : 9) / 0.4)) : 0;
      const items = [[tx, ty, 1], [lerp(tx + sg * 330, tx, sl), lerp(ty - 110, ty, sl), lerp(0.72, 1, sl)]];
      if (v.water) items[1][1] = ty;
      for (let i = 1; i >= 0; i--) {
        if (s.k > i) continue;
        const [x, y0, sc] = items[i], bob = Math.sin(s.t * 2.6 + i * 2) * 10, y = y0 + bob;
        if (v.bubble) bubbleShape(g, x, y, POPR * 1.08 * sc, s.t * 0.8 + i, true);
        else if (v.water) waterBalloon(g, x, y0 + Math.sin(s.t * 3 + i) * 4, POPR * 0.86 * sc, v.cols[(i + (s.idx | 0)) % 3]);
        else balloonShape(g, x, y, POPR * sc, v.cols[(i + (s.idx | 0)) % 3]);
      }
      knees(g, s, { pants: v.pants });
      if (s.k === 2 && s.age > 0.2) { const b = E.outBack(clamp((s.age - 0.2) / 0.3)); g.at(500, 200, 0, b, b, () => g.text(v.bubble ? 'ぜんぶ割れた！' : 'ぜんぶ割った！', 0, 0, { size: 96, f: C.yellow, o: 16 })); }
    },
    hit(g, s, k, v) {
      const [x, y] = popTarget({ mode: s.mode, side: s.lastSide }), px = s.mode === 'alt' ? 260 : g.mx(s.lastSide, 250), py = k === 2 ? y + 30 : y - 80;
      if (v.bubble) {
        g.fx.ring(x, y, { c: '#ffffff', r0: 60, r1: 220, w: 12 });
        g.fx.burst(x, y, { n: 18, c: ['#9fe6ff', '#ffc1ea', '#fff0a0'], shape: 'drop', sp: [250, 650], size: [12, 20], g: 900 });
        g.fx.burst(x, y, { n: k === 2 ? 14 : 6, c: ['rgba(255,255,255,0.7)'], shape: 'dot', sp: [120, 380], size: [24, 48], g: -120, life: [0.8, 1.3], drag: 0.95 });
        g.fx.pop('パチン', px, py, { size: 92 });
      } else if (v.water) {
        g.fx.splash(x, y + 20, C.water, 26); g.fx.splash(x, y, '#ffffff', 10);
        g.fx.ring(x, y, { c: '#bdf0ff', r0: 40, r1: 220, w: 14 });
        g.fx.pop('バシャッ', px, py, { size: 92, c: '#bdf0ff' });
      } else {
        g.fx.burst(x, y, { n: 26, c: [C.red, C.yellow, C.blue, C.pink, C.green, '#ffffff'], shape: 'conf', sp: [300, 800], size: [14, 24], g: 700 });
        g.fx.burst(x, y, { n: 6, c: v.cols[(k - 1 + (s.idx | 0)) % 3], shape: 'chip', sp: [300, 600], size: [16, 26], g: 1400 });
        g.fx.ring(x, y, { r1: 220 });
        g.fx.pop('パーン', px, py, { size: 100 });
      }
      g.fx.shake(k === 2 ? 10 : 6, 0.12);
      if (k === 2) { g.fx.stars(500, 300, 8); if (!v.bubble && !v.water) g.fx.confetti(60); }
    },
  },

  /* ---------- 石段・山道・雲の階段 ---------- */
  {
    id: 'knee-climb', acts: ['knee'], modes: ['alt', 'one'], sfx: (k, v) => v.sfx[k - 1], vars: CLIMB,
    init(s, v) { s.my.tr = []; for (let i = 0; i < 10; i++) s.my.tr.push({ x: (i % 2 ? 1 : -1) * (SW + 0.9 + s.r() * 1.8), z: 0.2 + i * 0.5 + s.r() * 0.3 }); },
    draw(g, s, v) {
      const V = g.V, cam = climbCam(s), top = SN * SR, zt = SN * SD + 1.6, done = s.k >= 2 ? clamp(s.age / 0.6) : 0;
      // 空と遠く
      g.bg(v.sky[0], v.sky[1]);
      const hz = P3(cam, 0, top, 40).y;
      if (v.cloud) {
        for (let i = 0; i < 18; i++) { const a = (i * 0.37) % 1, b = (i * 0.61) % 1; g.star(V.x0 + (V.x1 - V.x0) * a, V.y0 + (hz - V.y0) * b * 0.9, 8, 3.5, 4, '#ffffff', 0); }
        if (done) g.alpha(done, () => { for (let i = 0; i < 5; i++) g.arc(500, hz + 60, 500 - i * 36, PI, TAU, ['#ff6b6b', '#ffb347', '#ffe066', '#7be08a', '#6bb8ff'][i], 36); });
      } else {
        if (done) g.alpha(done, () => g.sun(500, hz - 40, 90, '#ffe27a'));
        const far = v.mtn ? '#8fb6e0' : '#9fbf8a';
        g.poly([V.x0 - 100, hz + 10, 120, hz - 120, 300, hz - 40, 520, hz - 170, 760, hz - 60, 900, hz - 130, V.x1 + 100, hz - 20, V.x1 + 100, hz + 30, V.x0 - 100, hz + 30], far, 0);
        if (v.mtn) for (let i = -4; i < 6; i++) cloudPuff(g, 500 + i * 240, hz + 30, 150, '#ffffff', 0);
      }
      // 上の広場
      const L0 = P3(cam, 0, top, SN * SD), L1 = P3(cam, 0, top, 40);
      if (v.cloud) { const a = P3(cam, -3.2, top, SN * SD), c = P3(cam, 3.2, top, SN * SD + 6); g.ell(500, (L0.y + c.y) / 2 + 10, (c.x - a.x) / 2 + 60, (L0.y - c.y) / 2 + 30, '#ffffff', 6); g.ell(500, (L0.y + c.y) / 2, (c.x - a.x) / 2, (L0.y - c.y) / 2, '#f3f6ff', 0); }
      else g.rect(V.x0 - 600, L1.y, V.x1 - V.x0 + 1200, L0.y - L1.y + 4, v.mtn ? '#a8c070' : '#d8d1c0', 0);
      // 鳥居・旗・お城
      const b = P3(cam, 0, top, v.cloud ? zt + 2.6 : zt);
      if (v.mtn) {
        g.at(b.x, b.y, 0, b.k, b.k, () => {
          g.rr(-14, -260, 28, 260, 6, '#8a5a36'); g.path(`M14 -258 L${150 + Math.sin(s.t * 6) * 10} -220 L14 -180 Z`, '#ff5a5f');
          g.rr(-180, -150, 140, 70, 10, '#d39457'); g.text('山頂', -110, -114, { size: 44, f: C.ol, font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); g.rr(-118, -80, 16, 80, 4, '#8a5a36');
        });
      } else if (v.cloud) {
        g.at(b.x, b.y, 0, b.k, b.k, () => {
          for (const x of [-170, 170]) { g.rr(x - 50, -380, 100, 380, 8, '#fff2fb'); g.tri(x - 66, -380, x + 66, -380, x, -520, '#ff7eb6'); g.rr(x - 18, -300, 36, 50, 18, '#7a5cd6', 5); }
          g.rr(-130, -300, 260, 300, 8, '#ffffff'); g.tri(-150, -300, 150, -300, 0, -470, '#a98bff');
          g.path('M-50 0 L-50 -110 Q0 -170 50 -110 L50 0 Z', '#7a5cd6'); g.line([0, -470, 0, -560], C.ol, 6); g.path(`M0 -560 L${70 + Math.sin(s.t * 6) * 8} -540 L0 -520 Z`, C.yellow);
          if (done) g.alpha(done, () => g.glow(0, -250, 380, '#ffffff', 0.7));
        });
      } else {
        const hb = P3(cam, 0, top, zt + 3.2);
        g.at(hb.x, hb.y, 0, hb.k, hb.k, () => { g.rr(-260, -230, 520, 230, 6, '#b5542f'); g.rr(-200, -200, 400, 200, 4, '#f6e7c8', 5); g.path('M-360 -220 Q-200 -250 -160 -330 L160 -330 Q200 -250 360 -220 Z', '#4a5a6a'); g.rr(-40, -190, 80, 190, 4, '#7a4a2a', 5); g.circ(0, -280, 26, C.gold); });
        torii(g, b, done);
        for (const sd of [-1, 1]) lantern(g, P3(cam, sd * (SW + 0.5), top, SN * SD + 0.5));
      }
      // 横の斜面（階段といっしょに上がる）
      for (const sd of [-1, 1]) {
        const pts = [sd * 4000, L0.y];
        for (let i = SN; i >= 1; i--) { const zz = i * SD; if (zz - cam.z < 0.12) break; const a = P3(cam, sd * SW, i * SR, zz), c = P3(cam, sd * SW, (i - 1) * SR, zz); pts.push(a.x, a.y, c.x, c.y); }
        pts.push(500 + sd * 4000, V.y1 + 600);
        const px = [sd < 0 ? V.x0 - 600 : V.x1 + 600, L0.y];
        for (let i = 2; i < pts.length - 2; i += 2) px.push(pts[i], pts[i + 1]);
        px.push(px[px.length - 2], V.y1 + 600, sd < 0 ? V.x0 - 600 : V.x1 + 600, V.y1 + 600);
        if (v.cloud) g.poly(px, 'rgba(255,255,255,0.0)', 0); else g.poly(px, v.side, 0);
      }
      // 階段（遠い → 近い）
      for (let i = SN; i >= 1; i--) {
        const zz = i * SD; if (zz - cam.z < 0.12) continue;
        if (i < SN) { const a = P3(cam, -SW, i * SR, zz), b2 = P3(cam, SW, i * SR, zz), c = P3(cam, SW, i * SR, zz + SD), d = P3(cam, -SW, i * SR, zz + SD); g.poly([a.x, a.y, b2.x, b2.y, c.x, c.y, d.x, d.y], v.tread, v.cloud ? 0 : 5); }
        const a = P3(cam, -SW, (i - 1) * SR, zz), b2 = P3(cam, SW, (i - 1) * SR, zz), c = P3(cam, SW, i * SR, zz), d = P3(cam, -SW, i * SR, zz);
        if (v.cloud) { const w = (b2.x - a.x) / 2, n = 4; for (let j = 0; j < n; j++) g.circ(a.x + (j + 0.5) * w * 2 / n, (a.y + d.y) / 2, (a.y - d.y) * 0.75, j % 2 ? '#ffffff' : '#eef3ff', 5); g.rect(a.x, d.y, b2.x - a.x, (a.y - d.y) * 0.6, '#ffffff', 0); }
        else if (v.mtn) {  // 丸太の段
          const hh = a.y - d.y; g.rr(a.x - hh * 0.3, d.y, b2.x - a.x + hh * 0.6, hh, hh / 2, v.riser, 5);
          g.line([a.x + hh * 0.2, d.y + hh * 0.35, b2.x - hh * 0.2, d.y + hh * 0.3], sh(v.riser, 0.2), Math.max(2, hh * 0.1));
          for (const ex of [a.x - hh * 0.3 + hh / 2, b2.x + hh * 0.3 - hh / 2]) { g.ell(ex, d.y + hh / 2, hh * 0.36, hh * 0.46, '#e2b27a', 4); g.ell(ex, d.y + hh / 2, hh * 0.16, hh * 0.22, null, 3); }
        }
        else { g.poly([a.x, a.y, b2.x, b2.y, c.x, c.y, d.x, d.y], v.riser, 5); g.line([lerp(a.x, b2.x, 0.33), lerp(a.y, d.y, 0.1), lerp(a.x, b2.x, 0.33), lerp(a.y, d.y, 0.9)], sh(v.riser, -0.15), 3); g.line([lerp(a.x, b2.x, 0.7), lerp(a.y, d.y, 0.1), lerp(a.x, b2.x, 0.7), lerp(a.y, d.y, 0.9)], sh(v.riser, -0.15), 3); }
      }
      // 横の木・岩・雲
      for (const t of s.my.tr) {
        const zz = t.z + SN * SD * 0.2; if (zz - cam.z < 0.3) continue;
        const hh = clamp(zz / SD, 0, SN) * SR, b3 = P3(cam, t.x, Math.floor(hh / SR) * SR, zz);
        if (v.cloud) cloudPuff(g, b3.x, b3.y, 120 * b3.k, '#ffffff', 5);
        else if (v.mtn) { g.at(b3.x, b3.y, 0, b3.k, b3.k, () => { if (t.x > 0) { g.blob([-70, 0, -64, -50, -10, -76, 50, -60, 74, 0], '#a3a6ad'); g.blob([-40, -40, -6, -62, 34, -50, 10, -36], '#c4c7cd', 0); } else { for (const [fx, fc] of [[-30, '#ff8fb8'], [10, '#ffffff'], [44, '#ffd23f']]) { g.line([fx, 0, fx, -50], '#4f8a3a', 5); g.circ(fx, -56, 16, fc, 4); g.circ(fx, -56, 6, C.orange, 0); } } }); }
        else cedar(g, b3, '#2f6b3c');
      }
      knees(g, s, { pants: v.pants });
    },
    hit(g, s, k, v) {
      g.fx.shake(k === 2 ? 9 : 6, 0.14);
      if (k === 1) { g.fx.pop(v.cloud ? 'ふわっ' : 'ザッ', 500, 560, { size: 92 }); if (v.cloud) g.fx.burst(500, 800, { n: 10, c: '#ffffff', shape: 'smoke', sp: [100, 300], size: [50, 80], g: -40 }); else g.fx.burst(500, 860, { n: 10, c: ['#d8d1c0', '#a89f8e'], shape: 'dot', sp: [200, 500], size: [8, 14], spread: PI, dir: -PI / 2 }); }
      else { g.fx.pop(v.mtn ? 'やっほー！' : 'とうちゃく！', 500, 150, { size: 100, c: C.yellow, life: 0.9, rot: 0 }); g.fx.stars(500, 420, 10); g.fx.flash('#fff6d0', 0.4, 0.25); }
    },
  },

  /* ---------- 雪・落ち葉・川・草むらを進む ---------- */
  {
    id: 'knee-trek', acts: ['knee'], modes: ['alt', 'one'], sfx: (k, v) => v.sfx, vars: TREK,
    init(s, v) {
      s.my.rows = []; for (let i = 0; i < 18; i++) { const r = []; for (let j = 0; j < 3; j++) r.push(-4 + s.r() * 8, 0.6 + s.r() * 0.8, s.r()); s.my.rows.push(r); }
      s.my.side = []; for (let i = 0; i < 9; i++) s.my.side.push({ x: (i % 2 ? 1 : -1) * (2.4 + s.r() * 2.6), z: 2 + i * 1.3 + s.r() * 0.8, c: s.r() });
    },
    draw(g, s, v) {
      const V = g.V, zc = advance(s, 1.3), cam = { z: zc, h: 1.4, f: 520, hy: 400 }, rv = s.k >= 2 ? s.age : -1;
      g.bg(v.sky[0], v.sky[1]);
      const hz = cam.hy;
      // 遠く
      if (v.k === 'snow') { g.poly([V.x0 - 100, hz, 160, hz - 170, 330, hz - 70, 520, hz - 210, 720, hz - 80, 880, hz - 150, V.x1 + 100, hz - 10, V.x1 + 100, hz + 4, V.x0 - 100, hz + 4], '#ffffff', 6); g.poly([520, hz - 210, 470, hz - 150, 520, hz - 160, 570, hz - 150], '#dbe7f7', 0); }
      else if (v.k === 'leaves') { g.hills(hz + 6, '#e0a24a', 60, 3, 5); g.hills(hz + 10, '#c9622b', 30, 7, 7); }
      else if (v.k === 'river') { g.hills(hz + 6, '#5fae5a', 90, 5, 5); g.hills(hz + 8, '#4c9a52', 40, 8, 6); }
      else { g.hills(hz + 6, '#7cc85a', 70, 2, 5); g.sun(820, 120, 60); }
      g.band(hz, 'bottom', v.ground);
      if (v.k === 'river') { // 川岸
        for (const sd of [-1, 1]) { const a = P3(cam, sd * 1.9, 0, cam.z + 0.3), b = P3(cam, sd * 1.9, 0, cam.z + 60); g.poly([a.x, a.y + 400, b.x, b.y, sd * 5000 + 500, b.y, sd * 5000 + 500, V.y1 + 600], '#7cc85a', 0); g.line([a.x, a.y + 400, b.x, b.y], '#5a9e4a', 6); }
      }
      // 地面の模様（近づいてくる）
      for (let i = s.my.rows.length - 1; i >= 0; i--) {
        const z = Math.ceil(zc / 0.8) * 0.8 + i * 0.8 - 0.8, row = s.my.rows[Math.round(z / 0.8) % s.my.rows.length]; if (z - zc < 0.5) continue;
        for (let j = 0; j < row.length; j += 3) {
          const b = P3(cam, row[j], 0, z); if (b.x < V.x0 - 200 || b.x > V.x1 + 200 || b.k < 0.14) continue;
          const w = 60 * b.k * row[j + 1];
          if (v.k === 'snow') { g.ell(b.x, b.y, w * 1.6, w * 0.4, '#dbe7f7', 0); g.ell(b.x - w * 0.2, b.y - w * 0.12, w * 1.2, w * 0.3, '#ffffff', 0); }
          else if (v.k === 'leaves') { g.at(b.x, b.y, row[j + 2] * 6, 1, 0.5, () => g.path(`M0 ${-w} Q${w * 0.8} 0 0 ${w} Q${-w * 0.8} 0 0 ${-w}Z`, TCOL.leaves[(i + j) % 4], 3)); }
          else if (v.k === 'river') { if (Math.abs(row[j]) < 1.8) { g.curve([b.x - w * 1.4, b.y, b.x - w * 0.5, b.y - w * 0.18, b.x + w * 0.5, b.y + w * 0.1, b.x + w * 1.4, b.y], 'rgba(255,255,255,0.7)', Math.max(2, 6 * b.k)); if (row[j + 2] > 0.7) g.ell(b.x, b.y, w * 0.7, w * 0.3, '#8a9aa8', 3); } }
          else { g.path(`M${b.x - w} ${b.y} Q${b.x - w * 0.8} ${b.y - w * 1.6} ${b.x - w * 0.2} ${b.y - w * 2.2} Q${b.x - w * 0.1} ${b.y - w} ${b.x} ${b.y - w * 0.3} Q${b.x + w * 0.3} ${b.y - w * 1.8} ${b.x + w} ${b.y - w * 2.5} Q${b.x + w * 0.8} ${b.y - w} ${b.x + w} ${b.y}Z`, TCOL.grass[(i + j) % 3], 0); }
        }
      }
      // 横の木
      for (let i = s.my.side.length - 1; i >= 0; i--) {
        const t = s.my.side[i]; if (t.z - zc < 0.8) continue; const b = P3(cam, t.x, 0, t.z);
        if (v.k === 'snow') pine(g, b, true);
        else if (v.k === 'leaves') sproutTree(g, b, ['#ff8a2a', '#e04a2a', '#ffc23f'][Math.floor(t.c * 3)]);
        else if (v.k === 'river') { if (Math.abs(t.x) > 2.4) sproutTree(g, b, '#3fae5a'); }
        else sproutTree(g, b, '#3fae5a');
      }
      // かくれている動物（1回目でちらっ、2回目でとび出す）
      const az = 4.6, ab = P3(cam, 0.55, 0, az), peek = s.k >= 1, jumpT = rv >= 0 ? clamp(rv / 0.6) : 0;
      if (v.k === 'river') {
        if (peek && !jumpT) g.alpha(0.5 + 0.3 * Math.sin(s.t * 6), () => g.ell(ab.x, ab.y, 90 * ab.k, 26 * ab.k, '#2a8fb0', 0));
        if (peek && !jumpT) g.at(ab.x, ab.y - 6 * ab.k, 0, ab.k, ab.k, () => g.path('M-20 0 L10 -50 L30 0 Z', '#7f9bc0'));
        if (jumpT > 0 && jumpT < 1) { const x = lerp(ab.x + 200 * ab.k, ab.x - 260 * ab.k, jumpT), y = ab.y - 520 * ab.k * 4 * jumpT * (1 - jumpT); fish(g, x, y, ab.k * 1.1, lerp(-0.9, 0.9, jumpT)); }
      } else {
        const moundW = 150 * ab.k, yb = ab.y;
        const hop = jumpT > 0 ? -Math.max(0, Math.sin(PI * clamp(jumpT * 1.4))) * 160 * ab.k : 0;
        if (peek) {
          const fn = v.k === 'snow' ? rabbit : v.k === 'leaves' ? squirrel : shiba;
          g.at(0, jumpT > 0 ? hop : 20 * ab.k * (1 - clamp(s.age * 4)), () => fn(g, ab.x, yb + 10 * ab.k, ab.k * 0.9, s.t, !jumpT));
        }
        // 手前の山（雪・落ち葉・草）
        if (v.k === 'snow') { g.blob([ab.x - moundW, yb + 10, ab.x - moundW * 0.6, yb - 40 * ab.k, ab.x, yb - 56 * ab.k, ab.x + moundW * 0.6, yb - 40 * ab.k, ab.x + moundW, yb + 10], '#ffffff', 5); g.ell(ab.x + 30 * ab.k, yb - 20 * ab.k, moundW * 0.5, 12 * ab.k, '#e4eefc', 0); }
        else if (v.k === 'leaves') { g.blob([ab.x - moundW, yb + 10, ab.x - moundW * 0.6, yb - 46 * ab.k, ab.x, yb - 62 * ab.k, ab.x + moundW * 0.6, yb - 46 * ab.k, ab.x + moundW, yb + 10], '#e8913a', 5); for (let i = 0; i < 5; i++) g.at(ab.x + (i - 2) * 50 * ab.k, yb - (20 + (i % 2) * 20) * ab.k, i, ab.k, ab.k, () => g.path('M0 -18 Q14 0 0 18 Q-14 0 0 -18Z', TCOL.leaves[i % 4], 3)); }
        else for (let i = -3; i <= 3; i++) { const x = ab.x + i * 40 * ab.k; g.path(`M${x - 22 * ab.k} ${yb + 10} Q${x - 10 * ab.k} ${yb - 90 * ab.k} ${x + (i % 2 ? 30 : -30) * ab.k} ${yb - 150 * ab.k} Q${x + 6 * ab.k} ${yb - 60 * ab.k} ${x + 22 * ab.k} ${yb + 10}Z`, i % 2 ? '#5fb84a' : '#7ccc5a', 4); }
      }
      knees(g, s, { pants: v.pants, shorts: v.shorts, ty: 720 });
    },
    hit(g, s, k, v) {
      const col = TCOL[v.k], [x, y] = kneeTop(sgOf(s.lastSide), { ty: 720 });
      if (v.k === 'river') { g.fx.splash(x, y + 20, C.water, 20); g.fx.splash(x, y, '#ffffff', 8); }
      else if (v.k === 'leaves') g.fx.burst(x, y, { n: 18, c: col, shape: 'leaf', sp: [300, 700], size: [16, 26], g: 500, drag: 0.96, life: [0.8, 1.3], spread: PI * 1.2 });
      else if (v.k === 'snow') g.fx.burst(x, y, { n: 18, c: col, shape: 'dot', sp: [300, 700], size: [12, 26], g: 1400, spread: PI * 1.2 });
      else g.fx.burst(x, y, { n: 14, c: col, shape: 'leaf', sp: [250, 550], size: [12, 22], g: 900, spread: PI * 1.1 });
      g.fx.shake(6, 0.1);
      if (k === 1) g.fx.pop({ snow: 'ザクッ', leaves: 'ガサッ', river: 'ジャブッ', grass: 'ガサッ' }[v.k], x + (x > 500 ? -230 : 230), y - 60, { size: 88 });
      else {
        const cam = { z: 1.3, h: 1.4, f: 520, hy: 400 }, ab = P3(cam, 0.55, 0, 4.6);
        g.fx.pop({ snow: 'ぴょこっ', leaves: 'ひょこっ', river: 'ピチャッ', grass: 'ワン！' }[v.k], ab.x - 330, ab.y - 260 * ab.k, { size: 96, c: C.yellow, life: 0.9 });
        g.fx.stars(ab.x, ab.y - 150 * ab.k, 8);
        g.sfx('magic');
      }
    },
  },

  /* ---------- 自転車・スワンボートをこぐ（交互） ---------- */
  {
    id: 'knee-bike', acts: ['knee'], modes: ['alt'], sfx: (k, v) => v.sfx[k - 1], vars: BIKE,
    init(s) { s.my.pt = []; for (let i = 0; i < 12; i++) s.my.pt.push([s.r(), s.r(), s.r()]); s.my.rw = []; for (let i = 0; i < 20; i++) s.my.rw.push([-3 + s.r() * 6, s.r()]); },
    draw(g, s, v) {
      const V = g.V, zc = s.t * 1.5 + advance(s, 1, 0.3) * 3.4, cam = { z: zc, h: 1.25, f: 520, hy: 360 }, done = s.k >= 2 ? s.age : -1;
      if (v.swan) {
        g.sky('#7fd0ff', '#e3f6ff', cam.hy + 4); g.cloud(220, 110, 0.7); g.cloud(780, 170, 0.5);
        g.hills(cam.hy + 4, '#5fae5a', 50, 3, 6);
        for (let x = V.x0 - 60; x < V.x1 + 60; x += 90) g.circ(x, cam.hy - 6, 50, '#3f9e4a', 0);
        g.band(cam.hy, 'bottom', g.lin(0, cam.hy, 0, 1000, ['#7fdcf5', '#2f9fd8']));
        // 島と噴水
        const isl = P3(cam, 2.6, 0, 26); g.at(isl.x, isl.y, 0, isl.k, isl.k, () => { g.ell(0, 0, 300, 60, '#7cc85a'); g.rr(-60, -170, 120, 170, 6, '#e8452c'); g.path('M-110 -160 Q0 -230 110 -160 Z', '#4a5a6a'); });
        const fo = P3(cam, -1.6, 0, 20); g.at(fo.x, fo.y, 0, fo.k, fo.k, () => { const h = 260 + Math.sin(s.t * 8) * 16; g.path(`M-26 0 Q-30 ${-h * 0.6} 0 ${-h} Q30 ${-h * 0.6} 26 0 Z`, 'rgba(255,255,255,0.85)', 4); g.cloud(0, -h, 0.5, '#ffffff', 4); g.ell(0, 0, 120, 26, '#bdeeff', 4); });
        // 波・はす
        for (let i = 0; i < 18; i++) {
          const z = Math.ceil(zc / 1.4) * 1.4 + (17 - i) * 1.4, w = s.my.rw[Math.round(z / 1.4) % 20]; if (z - zc < 0.6) continue;
          const b = P3(cam, w[0], 0, z), ww = 50 * b.k;
          if (w[1] > 0.8) { g.ell(b.x, b.y, ww * 1.4, ww * 0.45, '#4fb35a', 4); g.line([b.x, b.y, b.x + ww * 0.8, b.y - ww * 0.2], '#3f8f48', 3); }
          else g.curve([b.x - ww * 1.4, b.y, b.x - ww * 0.4, b.y - ww * 0.25, b.x + ww * 0.5, b.y + ww * 0.1, b.x + ww * 1.4, b.y], 'rgba(255,255,255,0.8)', Math.max(2, 5 * b.k));
        }
        // カモの親子（2回目でこっちを向く）
        const dk = P3(cam, 1.35, 0, 13.5);
        if (dk.d > 1.2) for (let i = 0; i < 3; i++) { const bob = Math.sin(s.t * 5 + i) * 3, hop = done >= 0 && i ? -Math.max(0, Math.sin(PI * clamp((done - i * 0.08) / 0.25))) * 40 * dk.k : 0; g.at(dk.x + i * 120 * dk.k, dk.y + bob + hop, 0, 1, 1, () => duck(g, 0, -30 * dk.k, dk.k * (i ? 0.55 : 0.9), 0, i > 0, 0)); }
        // スワンのからだ（手前）
        g.path(`M${V.x0 - 60} 1000 L${V.x0 - 60} 880 Q200 780 360 830 Q500 870 640 830 Q800 780 ${V.x1 + 60} 880 L${V.x1 + 60} ${V.y1 + 60} L${V.x0 - 60} ${V.y1 + 60} Z`, '#ffffff');
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) g.curve([500 + sd * (200 + i * 90), 860 + i * 10, 500 + sd * (250 + i * 90), 900 + i * 14, 500 + sd * (300 + i * 90), 880 + i * 10], '#d9dee8', 6);
        g.curve([500, 1100, 470, 800, 545, 580, 515, 400], C.ol, 104); g.curve([500, 1100, 470, 800, 545, 580, 515, 400], '#ffffff', 90);
        const nod = done >= 0 ? jig(done, 0.12, 14, 5) : Math.sin(s.t * 3) * 0.03;
        g.at(515, 380, nod, 1, 1, () => { g.ell(0, -10, 62, 52, '#ffffff'); g.path('M-40 -18 Q-100 -14 -118 4 Q-80 16 -36 8 Z', '#ff9f1c'); g.ell(-44, -6, 14, 18, C.ol, 0); g.circ(-14, -26, 8, C.ol, 0); g.circ(-16, -29, 3, '#fff', 0); });
      } else {
        g.sky('#8fd3ff', '#eaf7ff', cam.hy + 4); g.cloud(200, 120, 0.7); g.cloud(800, 80, 0.55);
        for (let i = 0; i < 9; i++) { const x = 60 + i * 115, h = 60 + (i * 37) % 70; g.rr(x - 40, cam.hy - h, 80, h + 4, 4, ['#c9d6e8', '#b8c7de', '#d6dfec'][i % 3], 0); }
        g.band(cam.hy, 'bottom', '#8edc6a');
        const R = (x0, x1, col) => { const a = P3(cam, x0, 0, zc + 0.4), b = P3(cam, x1, 0, zc + 0.4), c = P3(cam, x1, 0, zc + 120), d = P3(cam, x0, 0, zc + 120); g.poly([a.x, V.y1 + 400, b.x, V.y1 + 400, c.x, c.y, d.x, d.y], col, 0); void b; };
        R(-3.4, 3.4, '#eadbb8'); R(-2.2, 2.2, '#737a8f');
        for (const x of [-2.05, 2.05]) { const a = P3(cam, x, 0, zc + 0.4), c = P3(cam, x, 0, zc + 120); g.line([a.x, a.y, c.x, c.y], '#ffffff', 6); }
        for (let n = Math.floor(zc / 2.6); n < Math.floor(zc / 2.6) + 12; n++) { const z0 = n * 2.6; if (z0 - zc < 0.5) continue; const a = P3(cam, -0.09, 0, z0), b = P3(cam, 0.09, 0, z0), c = P3(cam, 0.09, 0, z0 + 1.2), d = P3(cam, -0.09, 0, z0 + 1.2); g.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y], '#ffffff', 0); }
        for (let n = Math.floor(zc / 3.6) + 9; n >= Math.floor(zc / 3.6); n--) { const z = n * 3.6 + 1; if (z - zc < 1.2) continue; for (const sd of [-1, 1]) { const b = P3(cam, sd * 4.1, 0, z); if (b.k > 0.1 && b.x + 200 * b.k > V.x0 && b.x - 200 * b.k < V.x1) sakura(g, b); } }
        // 花びら
        for (const [a, b, c] of s.my.pt) { const x = V.x0 + (V.x1 - V.x0) * ((a + s.t * 0.06 + Math.sin(s.t * 2 + c * 9) * 0.02) % 1), y = V.y0 + (V.y1 - V.y0) * ((b + s.t * (0.08 + 0.08 * c)) % 1); g.ell(x, y, 13, 8, '#ff9fc4', 0, s.t * 3 + c * 6); }
        // かご・ハンドル・ベル
        g.rr(480, 640, 40, 140, 10, '#c9d0dc');
        g.poly([330, 520, 670, 520, 640, 690, 360, 690], '#c98b52'); g.clipPath('M330 520 L670 520 L640 690 L360 690 Z', () => { for (let y = 545; y < 690; y += 34) g.line([300, y, 700, y], '#a86f43', 5); for (let x = 350; x < 670; x += 40) g.line([x, 520, x + (x - 500) * 0.1, 690], '#a86f43', 4); });
        g.rr(322, 508, 356, 26, 12, '#d9a56a');
        catFace(g, 500, 470, 70, done >= 0, s.t); g.ell(440, 512, 26, 16, '#ffb35c'); g.ell(560, 512, 26, 16, '#ffb35c');
        g.curve([170, 860, 250, 760, 400, 728, 500, 724, 600, 728, 750, 760, 830, 860], C.ol, 36); g.curve([170, 860, 250, 760, 400, 728, 500, 724, 600, 728, 750, 760, 830, 860], '#d5dbe6', 22);
        for (const sd of [-1, 1]) g.cap(500 + sd * 330, 860, 500 + sd * 300, 800, 26, '#3a3a48');
        const bj = done >= 0 ? jig(done, 0.35, 40, 6) : 0;
        g.at(690, 742, bj, 1, 1, () => { g.path('M-40 0 A40 40 0 0 1 40 0 Z', '#ffd23f'); g.rr(-44, -4, 88, 14, 6, '#c9a32a'); g.circ(0, -40, 8, '#c9a32a', 4); });
      }
      knees(g, s, Object.assign({ pants: v.pants }, BKO));
    },
    hit(g, s, k, v) {
      if (v.swan) { for (const sd of [-1, 1]) g.fx.splash(500 + sd * 430, 860, C.water, 12); g.fx.ring(500, 600, { c: '#ffffff', r0: 120, r1: 420, w: 10, sy: 0.25 }); }
      else { g.fx.lines(500, 360, { n: 14, r0: 260, r1: 600, w: 9, c: '#ffffff', life: 0.3 }); g.fx.burst(500, 200, { n: 9, c: ['#ffc1d9', '#ffdbe9', '#ff8fb8'], shape: 'leaf', sp: [200, 600], size: [12, 20], g: 300, drag: 0.96, life: [0.8, 1.3] }); }
      g.fx.shake(5, 0.1);
      if (k === 1) g.fx.pop(v.swan ? 'スイー' : 'シャーッ', 500, 210, { size: 92 });
      else if (v.swan) { g.fx.pop('ガーガー', 730, 250, { size: 88, c: C.yellow }); g.fx.hearts(730, 420, 5); }
      else { g.fx.pop('チリン！', 790, 600, { size: 88, c: C.yellow }); g.fx.hearts(500, 400, 4); g.fx.burst(500, 0, { n: 14, c: ['#ffc1d9', '#ffdbe9', '#ff8fb8'], shape: 'leaf', sp: [200, 700], size: [14, 22], g: 260, drag: 0.97, life: [1, 1.6], dir: PI / 2, spread: 2.4 }); }
    },
  },

  /* ---------- 板割り・クマのミット ---------- */
  {
    id: 'knee-strike', acts: ['knee'], modes: ['alt', 'one'], vars: [
      { k: 'board', name: 'ひざで板を割る', short: '板わり', theme: 'dojo', sfx: ['crack', 'break'], pants: '#f4f4f4' },
      { k: 'bear', name: 'クマのミットにひざげり', short: 'ひざげり', theme: 'animal', sfx: ['punch', 'punch'], pants: '#2b2f45', bear: 1 },
    ], sfx: (k, v) => v.sfx[k - 1],
    draw(g, s, v) {
      const V = g.V, ko = { pants: v.pants, ty: 650 }, a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      if (v.bear) {
        g.sky('#8fd8ff', '#e6f7ff', 640); for (let x = V.x0 - 40; x < V.x1 + 80; x += 150) { g.rr(x - 14, 440, 28, 200, 6, '#7a4a2a', 5); g.circ(x, 400, 90, '#3f9e4a', 6); g.circ(x - 30, 380, 40, '#58c46e', 0); }
        g.band(640, 'bottom', '#8edc6a', 7); g.grassTufts(700, '#6cc04a', 4, 8);
        // クマ
        const fall = a2 >= 0 ? E.outBack(clamp(a2 / 0.4)) : 0, push = a1 >= 0 ? jig(a1 < 2 ? a1 : 9, 1, 16, 6) : 0;
        g.shadow(500, 840, 230, 30);
        g.at(500, 840 - fall * 40, -0.16 * fall + push * 0.04, 1 - 0.1 * fall, 1 - 0.18 * fall, () => {
          if (fall > 0) for (const sd of [-1, 1]) { g.ell(sd * 130, -30, 70, 60, '#8a5a36'); g.ell(sd * 130, -26, 38, 32, '#f3d2a8', 0); }
          g.ell(0, -260, 210, 250, '#8a5a36'); g.ell(0, -230, 130, 160, '#c8925e', 0);
          const hy = -520; for (const sd of [-1, 1]) { g.circ(sd * 96, hy - 90, 48, '#8a5a36'); g.circ(sd * 96, hy - 90, 24, '#c8925e', 0); }
          g.circ(0, hy, 130, '#8a5a36'); g.ell(0, hy + 46, 66, 50, '#e3b98a', 0); g.ell(0, hy + 22, 24, 16, C.ol, 0);
          const shut = (a1 >= 0 && a1 < 0.45) || fall > 0;
          for (const sd of [-1, 1]) { if (shut) g.path(`M${sd * 64} ${hy - 30} l${-sd * 22} 12 l${sd * 22} 12`, null, 7); else { g.circ(sd * 50, hy - 20, 12, C.ol, 0); g.circ(sd * 46, hy - 24, 4, '#fff', 0); } }
          g.path(fall > 0 ? `M-30 ${hy + 66} Q0 ${hy + 40} 30 ${hy + 66}` : `M-26 ${hy + 56} Q0 ${hy + 80} 26 ${hy + 56}`, null, 6);
          if (fall > 0) for (let i = 0; i < 3; i++) { const a = s.t * 5 + i * TAU / 3; g.star(Math.cos(a) * 150, hy - 140 + Math.sin(a) * 30, 22, 10, 5, C.yellow, 4); }
          // ミット
          const mf = fall;
          g.at(0, -330 - 120 * mf, -0.9 * mf, 1, 1, () => {
            g.rr(-150, -130, 300, 260, 50, '#e8343f'); g.rr(-118, -100, 236, 200, 40, '#ff5a5f', 0); g.circ(0, 0, 70, '#ffffff', 6); g.circ(0, 0, 34, '#e8343f', 0);
            if (!mf) for (const sd of [-1, 1]) { g.circ(sd * 160, -10, 44, '#8a5a36'); g.circ(sd * 168, -10, 18, '#c8925e', 0); }
          });
          if (a1 >= 0 && a1 < 0.6 && !fall) g.at(140, hy - 80, 0, 1, 1, () => g.path('M0 -30 Q20 0 0 20 Q-20 0 0 -30 Z', '#7fd0ff', 4));
        });
      } else {
        // 道場：板を持つ相手
        g.bg('#f1dfbd'); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1 + 120; x += 120) g.line([x, V.y0, x, 700], '#dcc49a', 5);
        g.rr(740, 90, 150, 380, 6, '#fbf6ea', 6); g.rr(730, 80, 170, 20, 6, '#7a4a2a', 0); g.rr(730, 466, 170, 20, 6, '#7a4a2a', 0); g.arc(815, 270, 56, 0.4, TAU - 0.2, C.ol, 16);
        g.band(700, 'bottom', '#d39457', 7); for (let i = 0, y = 700, h = 40; y < V.y1; i++, y += h, h *= 1.3) g.line([V.x0 - 40, y, V.x1 + 40, y], '#b77a45', 5);
        // 相手（白い道着）
        const sw = a1 >= 0 ? jig(a1 < 2 ? a1 : 9, 6, 20, 7) : 0;
        g.poly([300, 1000, 330, 380, 400, 330, 600, 330, 670, 380, 700, 1000], '#ffffff');
        g.poly([420, 330, 500, 520, 580, 330, 548, 330, 500, 440, 452, 330], '#e9edf3', 5);
        g.rr(310, 760, 380, 46, 10, '#2b2140', 0);
        g.circ(500, 230, 92, C.skin); g.path('M408 220 Q420 120 500 118 Q580 120 592 220 Q560 160 500 160 Q440 160 408 220 Z', '#2b2140'); g.rr(410, 182, 180, 26, 8, '#e8343f', 0);
        const wow = a2 >= 0;
        for (const sd of [-1, 1]) { if (wow) g.star(500 + sd * 34, 240, 16, 7, 5, C.yellow, 4); else g.circ(500 + sd * 32, 240, 9, C.ol, 0); }
        g.path(wow ? 'M470 274 Q500 304 530 274 Z' : 'M478 280 Q500 290 522 280', wow ? '#ff7a7a' : null, 5);
        // 板
        const brk = a2 >= 0 ? E.outBack(clamp(a2 / 0.3)) : 0, crack = s.k >= 1;
        const half = (sd) => g.at(500 + sd * 170, 480 + sw, -sd * 0.75 * brk, 1, 1, () => {
          g.clipRR(sd < 0 ? 0 : -170, -100, 170, 200, 0, () => g.wood(-sd * 170 - 165, -100, 330, 200, '#f0c58a', 12, 7));
          g.cap(sd * 6, -60, sd * 6, 60, 40, '#ffffff'); g.rr(sd * 6 - 30, -40, 60, 80, 24, C.skin);
        });
        if (brk > 0) { half(-1); half(1); g.alpha(1 - clamp(a2 / 0.5), () => g.circ(500, 470, 140 * brk, 'rgba(255,255,255,0.6)', 0)); }
        else {
          g.at(500, 480 + sw, 0, 1, 1, () => {
            g.wood(-165, -100, 330, 200, '#f0c58a', 12, 7);
            if (crack) g.line([10, 100, -8, 50, 14, 10, -6, -34, 8, -60], C.ol, 6);
            for (const sd of [-1, 1]) { g.cap(sd * 176, -60, sd * 176, 60, 40, '#ffffff'); g.rr(sd * 176 - 30, -40, 60, 80, 24, C.skin); }
          });
        }
      }
      knees(g, s, ko);
    },
    hit(g, s, k, v) {
      const x = s.mode === 'alt' ? 500 : kneeTop(sgOf(s.lastSide), { ty: 650 })[0], y = 540, px = x > 500 ? 220 : 780;
      g.fx.lines(x, y, { n: 12, r0: 110, r1: 230, w: 11 }); g.fx.shake(k === 2 ? 12 : 8, 0.14);
      if (v.bear) {
        g.fx.pop(k === 2 ? 'まいった〜' : 'ドスッ', k === 2 ? 500 : px, k === 2 ? 130 : 300, { size: k === 2 ? 96 : 100, c: k === 2 ? C.yellow : '#ffffff', life: k === 2 ? 0.9 : 0.62 });
        if (k === 2) g.fx.stars(500, 300, 10); else g.fx.smoke(x, y, 4);
      } else {
        if (k === 1) { g.fx.chips(x, y, '#f0c58a', 6); g.fx.pop('ピシッ', px, 330, { size: 96 }); }
        else { g.fx.chips(500, 480, '#f0c58a', 16); g.fx.pop('バキッ！', 500, 700, { size: 120, c: C.yellow }); g.fx.stars(500, 420, 10); g.fx.ring(500, 480, { r1: 300 }); }
      }
    },
  },

  /* ---------- アヒルと行進（交互） ---------- */
  {
    id: 'knee-march', acts: ['knee'], modes: ['alt'], theme: 'animal', sfx: (k) => k === 2 ? 'splash' : 'quack', vars: [{ k: 'duck', name: 'アヒルと行進', short: 'アヒル行進', pants: '#e0a63a' }],
    draw(g, s, v) {
      const V = g.V, st = advance(s, 1, 0.25), a2 = s.k >= 2 ? s.age : -1;
      g.sky('#8fd8ff', '#e8f7ff', 430); g.cloud(220, 120, 0.7); g.cloud(760, 90, 0.5);
      g.hills(430, '#7ccf5f', 40, 5, 5); for (let x = V.x0; x < V.x1 + 100; x += 170) { g.rr(x - 12, 320, 24, 110, 6, '#7a4a2a', 5); g.circ(x, 290, 70, '#3f9e4a', 6); }
      g.band(430, 'bottom', '#8edc6a', 7);
      g.poly([V.x0 - 60, 560, V.x1 + 60, 540, V.x1 + 60, 700, V.x0 - 60, 720], '#e8d3a4', 0); g.line([V.x0 - 60, 560, V.x1 + 60, 540], '#c9ae7a', 5); g.line([V.x0 - 60, 720, V.x1 + 60, 700], '#c9ae7a', 5);
      // 池（右）
      g.ell(900, 640, 260, 90, '#3fb6e8'); g.ell(900, 630, 230, 70, '#6fd3f5', 0); g.ell(840, 660, 40, 14, '#4fb35a', 4); g.ell(990, 616, 34, 12, '#4fb35a', 4);
      // アヒルの列（1歩ずつ右へ）
      const step = 110, list = [[0, 0], [1, 1], [2, 1], [3, 1]];
      for (let i = list.length - 1; i >= 0; i--) {
        const baby = list[i][1], bx = 470 - i * (baby ? 130 : 0) - (i ? 60 : 0) + st * step, hop = s.k ? -Math.max(0, Math.sin(PI * clamp(s.age / 0.3))) * 30 : 0;
        let x = bx, y = 600 + hop + Math.sin(s.t * 9 + i) * 2, rot = Math.sin(s.t * 9 + i) * 0.06;
        if (i === 0 && a2 >= 0) { const q = clamp(a2 / 0.35); x = lerp(bx, 820, q); y = lerp(600, 640, q) - 140 * 4 * q * (1 - q); rot = q * 0.6; if (q >= 1) { g.ell(830, 640, 80, 20, '#ffffff', 0); continue; } }
        duck(g, x, y, baby ? 0.9 : 1.05, rot, baby, Math.sin(s.t * 9 + i));
      }
      knees(g, s, { pants: v.pants, ty: 860, dx: 70 });
    },
    hit(g, s, k) {
      g.fx.shake(4, 0.08);
      if (k === 1) { g.fx.pop('ガー', 600, 380, { size: 92 }); g.fx.notes(560, 470, 3); }
      else { g.fx.splash(830, 640, C.water, 22); g.fx.pop('ドボン！', 700, 360, { size: 100, c: C.yellow }); g.fx.hearts(500, 450, 5); }
    },
  },

  /* ---------- ゴールテープを切る（交互） ---------- */
  {
    id: 'knee-race', acts: ['knee'], modes: ['alt'], theme: 'school', sfx: ['stomp', 'goal'], vars: [{ k: 'tape', name: 'ゴールテープを切る', short: 'かけっこ', shorts: '#26386b' }],
    init(s) { s.my.fans = []; for (let i = 0; i < 30; i++) s.my.fans.push([s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, zc = 2.0 * (s.ph + 0.7) + advance(s, 1.6), cam = { z: zc, h: 1.4, f: 520, hy: 380 }, ZT = 6.2, a2 = s.k >= 2 ? s.age : -1;
      g.sky('#7cc8ff', '#e2f5ff', cam.hy + 4);
      // 校舎
      const sc = P3(cam, 0, 0, 60); g.at(sc.x, sc.y, 0, sc.k, sc.k, () => { g.rr(-1500, -900, 3000, 900, 10, '#f4f1ea', 10); for (let i = -4; i <= 4; i++) for (let j = 0; j < 2; j++) g.rr(i * 320 - 90, -760 + j * 330, 180, 200, 8, '#9fd4f5', 6); g.rr(-200, -1200, 400, 320, 10, '#f4f1ea', 10); g.circ(0, -1050, 110, '#ffffff', 10); g.line([0, -1050, 0, -1120, 0, -1050, 50, -1030], C.ol, 12); });
      g.band(cam.hy, 'bottom', '#8edc6a');
      const T = (x0, x1, col) => { const a = P3(cam, x0, 0, zc + 0.4), c = P3(cam, x1, 0, zc + 70), b = P3(cam, x1, 0, zc + 0.4), d = P3(cam, x0, 0, zc + 70); g.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y], col, 0); };
      T(-3.2, 3.2, '#d9663f');
      for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) { const a = P3(cam, x, 0, zc + 0.4), c = P3(cam, x, 0, zc + 70); g.line([a.x, a.y, c.x, c.y], '#ffffff', 6); }
      // 応援
      for (const sd of [-1, 1]) for (let n = Math.floor(zc / 2) + 8; n >= Math.floor(zc / 2); n--) { const z = n * 2 + (sd > 0 ? 1 : 0); if (z - zc < 1) continue; const b = P3(cam, sd * 4.4, 0, z), f = s.my.fans[n % 30 >= 0 ? n % 30 : 0]; const jump = s.k ? Math.abs(Math.sin(s.t * 12 + n)) * 14 : 0; g.at(b.x, b.y - jump * b.k, 0, b.k, b.k, () => { g.rr(-40, -150, 80, 150, 30, [C.red, C.blue, C.yellow, C.green, C.pink][Math.floor(f[0] * 5)]); g.circ(0, -190, 44, C.skin); g.path('M-44 -196 Q0 -250 44 -196 Z', '#3a2a20'); if (f[1] > 0.5) { g.line([30, -140, 70, -260], C.ol, 6); g.tri(70, -260, 70, -210, 130, -235, C.yellow); } }); }
      // ゴール
      const p0 = P3(cam, -1.6, 0, ZT), p1 = P3(cam, 1.6, 0, ZT);
      if (ZT - zc > 0.3) {
        for (const b of [p0, p1]) g.at(b.x, b.y, 0, b.k, b.k, () => { g.rr(-10, -200, 20, 200, 6, '#ffffff'); g.circ(0, -206, 14, C.red); });
        const h = 1.0, t0 = P3(cam, -1.6, h, ZT), t1 = P3(cam, 1.6, h, ZT);
        if (a2 < 0) { g.curve([t0.x, t0.y, 500, t0.y + 14 * t0.k, t1.x, t1.y], C.ol, 18 * t0.k + 6); g.curve([t0.x, t0.y, 500, t0.y + 14 * t0.k, t1.x, t1.y], '#ffffff', 18 * t0.k); }
        else { const q = clamp(a2 / 0.4); for (const [b, sd] of [[t0, -1], [t1, 1]]) { const ex = lerp(500, b.x + sd * 40, q), ey = b.y + lerp(10, 200, q) * b.k; g.curve([b.x, b.y, lerp(b.x, ex, 0.5), b.y + 40 * b.k, ex, ey], C.ol, 18 * b.k + 6); g.curve([b.x, b.y, lerp(b.x, ex, 0.5), b.y + 40 * b.k, ex, ey], '#ffffff', 18 * b.k); } }
        const bt = P3(cam, 0, 2.6, ZT); g.curve([p0.x, bt.y, 500, bt.y + 30 * bt.k, p1.x, bt.y], C.ol, 4); for (let i = 1; i < 8; i++) { const x = lerp(p0.x, p1.x, i / 8), y = bt.y + 30 * bt.k * Math.sin(PI * i / 8); g.tri(x - 14 * bt.k, y, x + 14 * bt.k, y, x, y + 36 * bt.k, [C.red, C.yellow, C.blue, C.green][i % 4], 3); }
      }
      if (a2 > 0.15) { const b = E.outBack(clamp((a2 - 0.15) / 0.3)); g.at(500, 200, 0, b, b, () => { g.circ(0, 0, 90, C.gold); g.circ(0, 0, 66, '#ffe27a', 0); g.text('1', 0, 6, { size: 100, f: C.ol }); g.tri(-60, 70, -20, 70, -70, 170, C.red); g.tri(60, 70, 20, 70, 70, 170, C.blue); }); }
      knees(g, s, { shorts: v.shorts, ty: 720 });
    },
    hit(g, s, k) {
      g.fx.shake(k === 2 ? 10 : 5, 0.12);
      if (k === 1) { g.fx.pop('がんばれー', 500, 150, { size: 84 }); g.fx.burst(500 + (s.lastSide === 'L' ? -40 : 40), 980, { n: 8, c: ['#e9a07a', '#c9603a'], shape: 'dot', sp: [200, 500], size: [8, 14], spread: PI, dir: -PI / 2 }); }
      else { g.fx.pop('ゴール！', 500, 560, { size: 120, c: C.yellow, life: 0.9 }); g.fx.confetti(55); }
    },
  },

  /* ---------- 丸太・ハードルをまたぐ ---------- */
  {
    id: 'knee-hurdle', acts: ['knee'], modes: ['alt', 'one'], sfx: 'jump', vars: HURDLE,
    init(s) { s.my.tr = []; for (let i = 0; i < 10; i++) s.my.tr.push({ x: (i % 2 ? 1 : -1) * (2.6 + s.r() * 2.2), z: 1 + i * 1.6 + s.r() }); },
    draw(g, s, v) {
      const V = g.V, cam = { z: HSP * (s.ph + 0.7), h: 1.4, f: 520, hy: 380 }, z0 = HSP * 0.7 + HD, cheer = s.k >= 2;
      if (v.track) {
        g.sky('#7cc8ff', '#e2f5ff', cam.hy + 4); g.cloud(220, 120, 0.7); g.cloud(800, 90, 0.5);
        g.band(cam.hy - 70, cam.hy + 4, '#3b4f8a'); g.dots(V.x0, cam.hy - 56, V.x1 - V.x0, 50, 50, 10, '#ffd8a8');
        g.band(cam.hy, 'bottom', '#5cbf5c');
        const a = P3(cam, -2.4, 0, cam.z + 0.3), b = P3(cam, 2.4, 0, cam.z + 0.3), c = P3(cam, 2.4, 0, cam.z + 80), d = P3(cam, -2.4, 0, cam.z + 80);
        g.poly([a.x, V.y1 + 300, b.x, V.y1 + 300, c.x, c.y, d.x, d.y], '#d9663f', 0);
        for (const x of [-2.4, -1.2, 0, 1.2, 2.4]) { const p = P3(cam, x, 0, cam.z + 0.3), q = P3(cam, x, 0, cam.z + 80); g.line([p.x, p.y, q.x, q.y], '#ffffff', 5); }
      } else {
        g.sky('#9fdcff', '#eaf8ff', cam.hy + 4);
        for (let x = V.x0 - 60; x < V.x1 + 60; x += 110) g.circ(x, cam.hy - 30, 70, '#3f8f4a', 0);
        g.band(cam.hy, 'bottom', '#6cc04a');
        const a = P3(cam, -1.3, 0, cam.z + 0.3), b = P3(cam, 1.3, 0, cam.z + 0.3), c = P3(cam, 1.3, 0, cam.z + 80), d = P3(cam, -1.3, 0, cam.z + 80);
        g.poly([a.x, V.y1 + 300, b.x, V.y1 + 300, c.x, c.y, d.x, d.y], '#d9b47a', 0);
        for (let i = s.my.tr.length - 1; i >= 0; i--) { const t = s.my.tr[i], zz = t.z; if (zz - cam.z < 0.8) continue; sproutTree(g, P3(cam, t.x, 0, zz), i % 3 ? '#3fae5a' : '#58c46e'); }
      }
      // ゴールで待つ（2回目で大よろこび）
      const fb = P3(cam, v.track ? 1.4 : 0.9, 0, z0 + HSP + 4.5);
      if (v.track) g.at(fb.x, fb.y, 0, fb.k, fb.k, () => { g.rr(-14, -200, 28, 200, 6, '#ffffff'); g.rr(-140, -260, 280, 80, 14, cheer ? C.yellow : '#ffffff'); g.text(cheer ? 'クリア' : 'ゴール', 0, -220, { size: 52, f: C.ol }); });
      else fox(g, fb, cheer, s.t);
      // 障害物（遠い → 近い）
      for (let k = 2; k >= 1; k--) {
        const z = z0 + (k - 1) * HSP; if (z - cam.z < 0.35) continue;
        const L = P3(cam, v.track ? -0.9 : -1.6, 0, z), R = P3(cam, v.track ? 0.9 : 1.6, 0, z);
        if (v.track) {
          const t0 = P3(cam, -0.9, 0.76, z), t1 = P3(cam, 0.9, 0.76, z), w = 9 * t0.k;
          for (const [p, q] of [[L, t0], [R, t1]]) { g.line([p.x, p.y, q.x, q.y], C.ol, w + 6); g.line([p.x, p.y, q.x, q.y], '#ffffff', w); g.line([p.x - 30 * p.k, p.y, p.x + 30 * p.k, p.y], C.ol, w); }
          g.rr(t0.x - 6 * t0.k, t0.y - 14 * t0.k, t1.x - t0.x + 12 * t0.k, 28 * t0.k, 6 * t0.k, '#ffffff', Math.max(3, 5 * t0.k));
          g.clipRR(t0.x, t0.y - 14 * t0.k, t1.x - t0.x, 28 * t0.k, 0, () => { for (let i = 0; i < 6; i += 2) g.rect(lerp(t0.x, t1.x, i / 6), t0.y - 14 * t0.k, (t1.x - t0.x) / 6, 28 * t0.k, '#e8402f', 0); });
          g.rr(t0.x - 6 * t0.k, t0.y - 14 * t0.k, t1.x - t0.x + 12 * t0.k, 28 * t0.k, 6 * t0.k, null, Math.max(3, 5 * t0.k));
        } else {
          const r = 0.28, T0 = P3(cam, -1.6, r, z), rr = (L.y - T0.y);
          g.rr(L.x, T0.y - rr, R.x - L.x, rr * 2, rr, '#9a6a3e', Math.max(3, 6 * L.k));
          g.line([L.x + rr, T0.y - rr * 0.3, R.x - rr, T0.y - rr * 0.4], '#7a4a2a', Math.max(2, 5 * L.k));
          g.ell(R.x - rr * 0.4, T0.y, rr * 0.55, rr * 0.95, '#e2b27a', Math.max(2, 5 * L.k)); g.ell(R.x - rr * 0.4, T0.y, rr * 0.25, rr * 0.45, null, Math.max(2, 3 * L.k));
        }
      }
      knees(g, s, { pants: v.pants, shorts: v.shorts, ty: 690 });
    },
    hit(g, s, k, v) {
      const sg = sgOf(s.lastSide), [x, y] = kneeTop(sg, { ty: 690 });
      g.fx.lines(500, 760, { n: 10, r0: 260, r1: 420, a0: PI + 0.2, arc: PI - 0.4, w: 10 }); g.fx.shake(4, 0.08);
      if (k === 1) g.fx.pop('ひょいっ', x + (x > 500 ? -260 : 260), y - 90, { size: 92 });
      else { g.fx.pop(v.track ? 'ナイス！' : 'やったね！', 500, 170, { size: 104, c: C.yellow, life: 0.9 }); g.fx.stars(500, 320, 9); if (v.track) g.sfx('whistle'); else g.fx.hearts(560, 380, 5); }
    },
  },

  /* ---------- スライムをはじく ---------- */
  {
    id: 'knee-slime', acts: ['knee'], modes: ['alt', 'one'], theme: 'game', sfx: ['boing', 'coin'], vars: [{ k: 'slime', name: 'スライムをはじく', short: 'スライム', pants: '#3b3f6b' }],
    draw(g, s, v) {
      const V = g.V, alt = s.mode === 'alt', sg = alt ? 1 : sgOf(s.side), [kx, ky] = kneeTop(sg, { ty: 700 }), tx = alt ? 500 : kx, cols = ['#56b7ff', '#ff7eb6'];
      g.sky('#6fc3ff', '#d6f0ff', 520); g.cloud(180, 130, 0.6, '#ffffff', 5); g.cloud(820, 90, 0.5, '#ffffff', 5);
      // お城
      g.at(820, 470, 0, 0.6, 0.6, () => { g.rr(-120, -200, 240, 200, 6, '#c9d0e6'); for (const x of [-140, 140]) { g.rr(x - 40, -280, 80, 280, 6, '#b8c0da'); g.tri(x - 54, -280, x + 54, -280, x, -380, '#5b6bd1'); } g.path('M-30 0 L-30 -70 Q0 -110 30 -70 L30 0 Z', '#5a3a6a'); });
      g.hills(500, '#6dcf5a', 50, 2, 6); g.band(520, 'bottom', '#5ebf4f', 7);
      g.poly([440, 520, 560, 520, 760, V.y1 + 300, 240, V.y1 + 300], '#e8c98a', 0);
      for (let i = 0; i < 6; i++) { const y = 540 + i * i * 22; g.rr(V.x0 + 40 + (i % 2) * 60, y, 50, 24, 8, '#4fae45', 0); g.rr(V.x1 - 110 - (i % 2) * 60, y + 10, 50, 24, 8, '#4fae45', 0); }
      // HUD（コイン）
      const coins = s.k >= 2 ? 10 : s.k * 1;
      g.rr(V.x1 - 250, Math.max(V.y0, 0) + 30, 210, 80, 40, 'rgba(43,33,64,0.55)', 0); g.circ(V.x1 - 205, Math.max(V.y0, 0) + 70, 26, C.gold, 5); g.text('×' + coins, V.x1 - 120, Math.max(V.y0, 0) + 72, { size: 52, f: '#ffffff' });
      // スライム（はねて来る → ひざではじく）
      for (let i = 0; i < 2; i++) {
        const t = s.ph - i, col = cols[i];
        if (t < -0.85) continue;
        if (t <= 0) {
          const q = clamp((t + 0.85) / 0.85), hops = 2, hp = q * hops, f = hp - Math.floor(hp);
          const x = lerp(500 + (i ? -1 : 1) * 160 * sg, tx, q), base = lerp(520, ky - 4, q * q), sc = lerp(0.35, 1, q);
          const y = base - (q < 1 ? Math.sin(PI * f) * lerp(90, 160, q) : 0);
          g.shadow(x, lerp(530, 760, q), 80 * sc, 16 * sc);
          slime(g, x, y, 112 * sc, col, f < 0.12 ? [1.12, 0.88] : [0.94, 1.06]);
        } else if (t < 1.2) {
          const q = clamp(t / 0.6), x = tx + (i ? -1 : 1) * sg * 520 * q, y = ky - 4 - 700 * q + 500 * q * q, sc = lerp(1, 0.5, q);
          g.at(x, y, q * 6 * (i ? -1 : 1), 1, 1, () => slime(g, 0, 0, 112 * sc, col, [1, 1], 1));
        }
      }
      knees(g, s, { pants: v.pants });
    },
    hit(g, s, k) {
      const alt = s.mode === 'alt', [kx, ky] = kneeTop(alt ? 1 : sgOf(s.lastSide)), x = alt ? 500 : kx;
      g.fx.ring(x, ky - 40, { r1: 200, c: '#ffffff' }); g.fx.stars(x, ky - 60, 6); g.fx.shake(6, 0.1);
      if (k === 1) g.fx.pop('ポヨーン', x + (x > 500 ? -260 : 260), ky - 220, { size: 92 });
      else { g.fx.coins(x, ky - 80, 12); g.fx.pop('クリア！', 500, 200, { size: 120, c: C.yellow, life: 0.9 }); g.sfx('magic'); }
    },
  },
];
