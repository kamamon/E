/* 持ち上げる（両手を頭の上へ） — バーベル・星を飾る・リンゴをもぐ・花火・日の出 など
   p=0 が腕をいちばん上まで上げた所（物が高く上がる・てっぺんに届く）、p=1 が胸の前 */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const PI = Math.PI;

/* =========================================================================
   共通：手の位置
   ========================================================================= */
// 両手のまん中（p=0 で cx,cy、p=1 で胸の前）と左右の幅
function hpos(p, cx, cy, o = {}) {
  return { p, mx: lerp(cx, o.bx ?? 500, p), my: lerp(cy, o.yb ?? 935, p), half: lerp(o.xt ?? 110, o.xb ?? 225, p), sc: lerp(o.st ?? 0.9, o.sb ?? 1.12, p) };
}
function hands(g, s, H, o = {}) {
  const one = s.mode === 'one';
  for (const side of one ? ['R'] : ['L', 'R']) {
    const sg = side === 'L' ? -1 : 1, x = one ? H.mx + (o.oneX ?? 0) : H.mx + sg * H.half;
    g.arm(x, H.my, -PI / 2 - sg * lerp(o.at ?? 0.1, o.ab ?? 0.5, H.p), { hand: o.hand ?? 'palm', side, s: H.sc, sleeve: o.sleeve });
  }
}
// 物を持ち上げ直す（置いたあと、手が下りたら次の物を持つ）
function reload(s) {
  const m = s.my;
  if (m.rk !== s.k) { m.rk = s.k; m.got = s.k === 0; m.gt = -9; }
  if (!m.got && s.p > 0.72) { m.got = true; m.gt = s.t; }
  return m.got ? E.outBack(clamp((s.t - m.gt) / 0.2)) : 0;
}

/* ---------- 小物 ---------- */
function balloon(g, x, y, r, c, sx = 0) {
  g.curve([x, y + r * 1.2, x + sx * 0.5 + 8, y + r * 1.9, x + sx, y + r * 2.8], C.ol, 3);
  g.ell(x, y, r, r * 1.2, c); g.tri(x - 8, y + r * 1.2, x + 8, y + r * 1.2, x, y + r * 1.2 + 12, c, 4);
  g.hl(x - r * 0.35, y - r * 0.45, r * 0.18, r * 0.32, -0.4, 0.55);
}
function dove(g, x, y, s, flap, dir = 1) {
  g.at(x, y, 0, s * dir, s, () => {
    const w = Math.sin(flap) * 0.9;
    g.at(-10, -10, -0.4 - w, 1, 1, () => g.path('M0 0 C-30 -60 -90 -90 -140 -70 C-110 -40 -60 -10 0 10 Z', '#ffffff'));
    g.ell(0, 0, 70, 36, '#ffffff');
    g.path('M60 -8 L96 -30 L104 12 Z', '#ffffff', 6);
    g.circ(-58, -22, 26, '#ffffff');
    g.circ(-66, -26, 5, C.ol, 0); g.tri(-82, -20, -100, -14, -82, -10, C.orange, 4);
    g.at(10, -10, 0.3 + w, 1, 1, () => g.path('M0 0 C-10 -70 30 -110 80 -110 C70 -70 40 -20 0 10 Z', '#f1f4fb'));
  });
}
function skyLantern(g, x, y, s, lit = 1) {
  g.at(x, y, 0, s, s, () => {
    g.glow(0, -40, 150, '#ffb347', 0.55 * lit);
    g.path('M-56 -110 Q0 -130 56 -110 L44 20 L-44 20 Z', g.lin(0, -120, 0, 20, ['#ffe7a0', '#ff9f43']));
    g.line([-20, -116, -16, 20], 'rgba(160,80,20,0.35)', 3); g.line([20, -116, 16, 20], 'rgba(160,80,20,0.35)', 3);
    g.ell(0, 20, 44, 10, '#ffcf6a', 5); g.circ(0, 26, 8, '#fff3b0', 0);
  });
}
function firework(g, x, y, age, col, R, n = 22) {
  if (age < 0 || age > 1.3) return;
  const k = age / 1.3, r = R * E.outC(Math.min(1, age / 0.45)), fall = 70 * k * k, a0 = x * 0.01;
  g.alpha(1 - k * k, () => {
    if (age < 0.25) g.glow(x, y, R * 0.9, '#ffffff', 0.7 * (1 - age / 0.25));
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * PI * 2, c = Math.cos(a), s = Math.sin(a);
      g.line([x + c * r * 0.55, y + s * r * 0.55 + fall * 0.4, x + c * r, y + s * r + fall], col, 9 * (1 - k * 0.6));
      g.circ(x + c * r * 1.04, y + s * r * 1.04 + fall, 7 * (1 - k * 0.5), '#ffffff', 0);
    }
  });
}
function pompom(g, x, y, s, c, t) {
  g.at(x, y, Math.sin(t * 9) * 0.15, s, s, () => {
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; g.line([0, 0, Math.cos(a) * 92, Math.sin(a) * 92], sh(c, i % 2 ? -0.15 : 0.15), 22); }
    g.circ(0, 0, 60, c, 0);
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2 + 0.2; g.line([Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a) * 80, Math.sin(a) * 80], sh(c, 0.35), 6); }
  });
}
function teddy(g, x, y, s, rot, joy) {
  g.at(x, y, rot, s, s, () => {
    const c = '#c98b52', l = '#f2d0a4';
    g.cap(-60, 40, -86, 100, 30, c); g.cap(60, 40, 86, 100, 30, c);
    g.ell(0, 40, 82, 90, c); g.ell(0, 56, 50, 56, l, 0);
    g.cap(-70, -10, -120, -60 - 30 * joy, 26, c); g.cap(70, -10, 120, -60 - 30 * joy, 26, c);
    g.circ(-62, -150, 30, c); g.circ(62, -150, 30, c); g.circ(-62, -150, 15, l, 0); g.circ(62, -150, 15, l, 0);
    g.circ(0, -100, 82, c);
    g.ell(0, -76, 36, 28, l);
    g.ell(0, -88, 13, 9, C.ol, 0);
    if (joy) { g.arc(-30, -112, 10, PI + 0.3, -0.3, C.ol, 6); g.arc(30, -112, 10, PI + 0.3, -0.3, C.ol, 6); g.path('M-14 -66 Q0 -54 14 -66', null, 5); }
    else { g.circ(-30, -112, 9, C.ol, 0); g.circ(30, -112, 9, C.ol, 0); }
    g.tri(-40, -20, 0, -6, -40, 8, C.red, 5); g.tri(40, -20, 0, -6, 40, 8, C.red, 5); g.circ(0, -6, 9, C.red, 4);
  });
}
function smallCat(g, x, y, s, mood) {
  g.at(x, y, 0, s, s, () => {
    const c = '#ffb36b';
    g.ell(0, -40, 60, 46, c); g.curve([50, -30, 90, -60, 80, -100], C.ol, 22); g.curve([50, -30, 90, -60, 80, -100], c, 12);
    g.circ(0, -100, 46, c); g.tri(-40, -120, -30, -170, -8, -136, c, 6); g.tri(40, -120, 30, -170, 8, -136, c, 6);
    if (mood === 'joy') { g.arc(-17, -104, 8, PI + 0.3, -0.3, C.ol, 5); g.arc(17, -104, 8, PI + 0.3, -0.3, C.ol, 5); }
    else if (mood === 'sleep') { g.arc(-17, -100, 8, 0.3, PI - 0.3, C.ol, 5); g.arc(17, -100, 8, 0.3, PI - 0.3, C.ol, 5); }
    else { g.circ(-17, -104, 7, C.ol, 0); g.circ(17, -104, 7, C.ol, 0); }
    g.tri(-6, -88, 6, -88, 0, -80, '#ff8fa3', 0);
  });
}

function pennants(g, y, cols) {
  const V = g.V; g.curve([V.x0 - 40, y, 500, y + 50, V.x1 + 40, y], C.ol, 4);
  let i = 0;
  for (let x = Math.floor((V.x0 - 40) / 90) * 90; x < V.x1 + 40; x += 90, i++) {
    const t = (x - V.x0 + 40) / (V.x1 - V.x0 + 80), yy = y + 50 * 4 * t * (1 - t) * 0.92;
    g.tri(x - 24, yy, x + 24, yy, x, yy + 50, cols[i % cols.length], 4);
  }
}
// ピザの具（ソース・サラミ・チーズ・バジル）
function pizzaTop(g, r) {
  g.circ(0, 0, r * 0.8, '#e8402f', 0);
  for (const [a, d] of [[0, 0.3], [1.3, 0.55], [2.6, 0.5], [3.9, 0.6], [5.2, 0.45], [0.7, 0.7], [3.3, 0.2]]) g.circ(Math.cos(a) * r * d, Math.sin(a) * r * d, r * 0.13, '#b8262c', 4);
  for (const [a, d] of [[0.4, 0.4], [2, 0.65], [4.4, 0.35], [5.6, 0.7]]) g.ell(Math.cos(a) * r * d, Math.sin(a) * r * d, r * 0.12, r * 0.08, '#fff2a8', 0);
  for (const a of [1, 3, 5]) g.at(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, a, 1, 1, () => g.ell(0, 0, r * 0.1, r * 0.05, '#2ea44f', 3));
}

/* =========================================================================
   1. 頭の上にかかげる（バーベル・トロフィー・おみこし）
   ========================================================================= */
const HOLD = [
  { k: 'barbell', name: 'バーベルを上げる', short: 'バーベル', theme: 'sports', sfx: ['thud', 'cheer'], hand: 'grip', xt: 205, xb: 205, yt: 330, sleeve: '#e8434f' },
  { k: 'trophy', name: 'トロフィーをかかげる', short: '優勝', theme: 'sports', sfx: ['cheer', 'cymbal'], hand: 'grip', xt: 92, xb: 92, yt: 470, sleeve: '#3a86ff' },
  { k: 'mikoshi', name: 'おみこしを上げる', short: 'おみこし', theme: 'festival', sfx: ['taiko', 'taiko'], hand: 'grip', xt: 180, xb: 200, yt: 420, sleeve: '#f4f4f4' },
];
function trophy(g, x, y, s, shine) {
  g.at(x, y, 0, s, s, () => {
    g.rr(-110, -6, 220, 60, 10, '#5a3a22'); g.rr(-90, 6, 180, 26, 6, C.gold, 4);
    g.rr(-40, -70, 80, 70, 10, C.gold); g.rr(-18, -120, 36, 56, 8, sh(C.gold, -0.1));
    for (const sg of [-1, 1]) { const c = g.ctx; c.beginPath(); c.ellipse(sg * 128, -300, 46, 70, 0, 0, PI * 2); c.lineWidth = 34; c.strokeStyle = C.ol; c.stroke(); c.lineWidth = 22; c.strokeStyle = C.gold; c.stroke(); }
    g.path('M-140 -380 L140 -380 Q140 -150 0 -120 Q-140 -150 -140 -380 Z', C.gold);
    g.clipPath('M-140 -380 L140 -380 Q140 -150 0 -120 Q-140 -150 -140 -380 Z', () => { g.rect(40, -390, 50, 280, 'rgba(255,255,255,0.35)', 0); g.rect(-140, -390, 60, 280, 'rgba(160,90,0,0.25)', 0); });
    g.path('M-140 -380 L140 -380 Q140 -150 0 -120 Q-140 -150 -140 -380 Z', null);
    g.ell(0, -380, 140, 24, sh(C.gold, 0.25)); g.ell(0, -380, 116, 14, sh(C.gold, -0.25), 0);
    g.star(0, -250, 46, 20, 5, '#fff3b0', 5);
    if (shine > 0) g.alpha(shine, () => { g.star(70, -330, 30, 6, 4, '#ffffff', 0); g.star(-90, -200, 20, 5, 4, '#ffffff', 0); });
  });
}
function mikoshi(g, x, y, s, t) {
  g.at(x, y, 0, s, s, () => {
    g.rr(-200, -50, 400, 50, 8, '#2b2140'); g.rect(-200, -50, 400, 12, C.gold, 0);
    g.rr(-150, -190, 300, 140, 6, '#c0392b');
    for (const px of [-140, -50, 50, 140]) g.rect(px - 12, -190, 24, 140, C.gold, 4);
    g.rr(-46, -160, 92, 80, 6, '#2b2140', 4); g.circ(0, -120, 22, C.gold, 4);
    g.path('M-250 -190 Q-120 -230 0 -300 Q120 -230 250 -190 Q240 -170 220 -175 Q120 -200 0 -262 Q-120 -200 -220 -175 Q-240 -170 -250 -190 Z', '#2b2140');
    g.path('M-250 -190 Q-120 -230 0 -300 Q120 -230 250 -190', null, 10); g.curve([-250, -190, -120, -230, 0, -300, 120, -230, 250, -190], C.gold, 5);
    for (const sg of [-1, 1]) { g.line([sg * 236, -180, sg * 236, -120], C.gold, 4); g.circ(sg * 236, -110 + Math.sin(t * 12) * 4, 12, C.gold, 4); }
    g.at(0, -300, 0, 1, 1, () => {   // 鳳凰
      g.path('M0 0 C-10 -30 -6 -60 10 -80 C26 -66 30 -40 18 -10 Z', C.gold);
      g.path('M6 -40 C-40 -60 -80 -40 -96 -10 C-60 -20 -30 -14 2 -14 Z', C.gold); g.path('M14 -40 C60 -70 96 -50 110 -20 C76 -30 46 -22 16 -14 Z', C.gold);
      g.circ(14, -84, 12, C.gold, 5); g.tri(24, -88, 40, -84, 24, -78, C.orange, 3);
    });
  });
}

/* =========================================================================
   2. 高いところに置く・飾る
   ========================================================================= */
const PLACE = [
  { k: 'tree', name: 'ツリーに星を飾る', short: 'ツリー', theme: 'winter', sfx: ['chime', 'magic'], sleeve: '#e8434f', it: [[400, 470, 70, 92], [500, 168, 96, 104]], pop: [['キラン', 760, 330], ['キラキラ！', 500, 880]] },
  { k: 'bulb', name: '電球をとりかえる', short: '電球', theme: 'home', sfx: ['click', 'ding'], sleeve: '#2ec4b6', modes: ['both', 'one'], it: [[500, 228, 140, 78], [500, 228, 140, 78]], touch: 1, pop: [['チカチカ', 720, 430], ['パッ！', 270, 220]] },
  { k: 'book', name: '本を棚にもどす', short: '本だな', theme: 'school', sfx: ['wood', 'ding'], sleeve: '#8e5cff', it: [[408, 300, -64, 84], [592, 300, -64, 86]], pop: [['トン', 760, 690], ['ピッタリ！', 500, 700]] },
  { k: 'laundry', name: '洗濯物を干す', short: '洗濯', theme: 'home', sfx: ['swish', 'chime'], sleeve: '#ff9f1c', it: [[365, 210, 64, 116], [640, 210, 64, 100]], pop: [['パサッ', 760, 560], ['カラッ！', 500, 600]] },
  { k: 'tanabata', name: '短冊を飾る', short: '七夕', theme: 'festival', sfx: ['chime', 'magic'], sleeve: '#26386b', it: [[410, 180, 190, 70], [600, 200, 190, 70]], pop: [['キラッ', 750, 560], ['ねがいごと', 500, 650]] },
  { k: 'snowman', name: '雪だるまを作る', short: '雪だるま', theme: 'winter', sfx: ['crunch', 'magic'], sleeve: '#3a86ff', it: [[500, 345, 40, 150], [500, 215, -50, 112]], pop: [['ポン', 790, 300], ['できた！', 500, 770]] },
  { k: 'nest', name: 'ひなを巣にもどす', short: 'ひな', theme: 'animal', sfx: ['chime', 'chime'], sleeve: '#72c957', it: [[452, 262, 70, 74], [530, 262, 70, 74]], pop: [['ピヨ', 770, 520], ['ピヨピヨ！', 500, 560]] },
];
function xmasTree(g, lit, t) {
  g.rect(470, 860, 60, 90, C.dwood, 6);
  const L = [[160, 330, 150], [270, 560, 230], [430, 760, 300], [600, 920, 330]];
  for (const [y0, y1, w] of L) g.poly([500, y0, 500 + w, y1, 500 - w, y1], '#2e9e52');
  for (const [y0, y1, w] of L) g.poly([500, y0, 500 + w * 0.5, lerp(y0, y1, 0.5), 500 - w * 0.5, lerp(y0, y1, 0.5)], '#38b25f', 0);
  g.curve([400, 420, 500, 450, 600, 410], C.gold, 7); g.curve([330, 640, 500, 690, 680, 630], C.gold, 7); g.curve([270, 830, 500, 880, 740, 820], C.gold, 7);
  const B = [[450, 360], [560, 380], [370, 520], [520, 540], [630, 500], [320, 700], [440, 730], [600, 720], [700, 680], [260, 880], [400, 890], [560, 900], [720, 880]];
  const cols = [C.red, C.yellow, C.blue, C.pink, '#ffffff', C.orange];
  B.forEach(([x, y], i) => { const on = lit > 0 && (Math.sin(t * 6 + i * 1.7) > -0.6); if (on) g.glow(x, y, 46, cols[i % 6], 0.7 * lit); g.circ(x, y, 14, on ? cols[i % 6] : '#9aa3b5', 4); });
}
function ornament(g, x, y) { g.circ(x, y, 50, C.red); g.ell(x, y, 50, 14, '#ffd23f', 0); g.circ(x, y, 50, null); g.hl(x - 18, y - 20, 14, 8, -0.5, 0.6); g.rr(x - 14, y - 60, 28, 16, 4, C.gold, 4); }
function bigBook(g, x, y, i) {
  const c = i ? '#3a86ff' : '#e8434f', w = 72, h = i ? 214 : 204;
  g.rr(x - w / 2, y - h, w, h, 6, c); g.rect(x - w / 2, y - h + 26, w, 10, C.gold, 0); g.rect(x - w / 2, y - 46, w, 10, C.gold, 0);
  if (i) g.path(`M${x + 6} ${y - h + 70} a24 24 0 1 0 0 46 a18 18 0 1 1 0 -46 Z`, '#ffffff', 0); else g.star(x, y - h * 0.55, 20, 9, 5, '#ffffff', 0);
  g.rr(x - w / 2, y - h, w, h, 6, null); g.hl(x - 20, y - h * 0.6, 5, 40, 0, 0.4);
}
function snowHead(g, happy) {
  g.circ(0, 0, 120, '#ffffff'); g.circ(-40, -20, 13, C.ol, 0); g.circ(40, -20, 13, C.ol, 0); g.tri(-6, 4, -6, 26, 74, 18, C.carrot, 4);
  if (happy) g.path('M-50 40 Q0 82 50 40', null, 8); else for (let i = -2; i <= 2; i++) g.circ(i * 20, 52 - Math.abs(i) * 4, 6, C.ol, 0);
  g.circ(-72, 22, 15, '#ffc7d6', 0); g.circ(72, 22, 15, '#ffc7d6', 0);
}
function bucket(g) { g.path('M-80 0 L80 0 L60 -120 L-60 -120 Z', '#e8434f'); g.rr(-96, -14, 192, 22, 8, sh('#e8434f', -0.2)); g.hl(-30, -80, 10, 26, 0.2, 0.4); }
function star5(g, x, y, r, f, o = 7) { g.star(x, y, r, r * 0.48, 5, f, o); g.hl(x - r * 0.25, y - r * 0.3, r * 0.2, r * 0.1, -0.5, 0.6); }
function bulbShape(g, x, y, s, on) {
  g.at(x, y, 0, s, s, () => {
    if (on > 0) g.glow(0, 30, 200, '#fff3b0', 0.8 * on);
    g.path('M-26 -40 L26 -40 L30 -10 C70 10 76 70 40 100 C20 116 -20 116 -40 100 C-76 70 -70 10 -30 -10 Z', on > 0 ? g.mix('#e9f6ff', '#fff6b0', on) : '#e9f6ff');
    g.hl(-24, 30, 12, 30, 0.3, 0.7);
    g.line([-12, 0, -6, 50, 6, 50, 12, 0], on > 0 ? '#ff9f1c' : '#b7c4d4', 4);
    g.rr(-28, -76, 56, 40, 6, C.metal); for (let i = 0; i < 3; i++) g.line([-28, -66 + i * 12, 28, -70 + i * 12], C.steel, 4);
  });
}
function book(g, x, y, c, w = 64, h = 190) { g.rr(x - w / 2, y - h, w, h, 6, c); g.rect(x - w / 2, y - h + 24, w, 10, sh(c, 0.35), 0); g.rect(x - w / 2, y - 44, w, 10, sh(c, 0.35), 0); g.rr(x - w / 2, y - h, w, h, 6, null); }
function tshirt(g, x, y, c, sway = 0) {
  g.at(x, y, sway, 1, 1, () => { g.path('M-60 0 L-120 40 L-96 96 L-66 80 L-66 210 L66 210 L66 80 L96 96 L120 40 L60 0 Q0 30 -60 0 Z', c); g.star(0, 100, 30, 13, 5, '#ffffff', 4); });
}
function towel(g, x, y, sway = 0) {
  g.at(x, y, sway, 1, 1, () => { g.rr(-90, 0, 180, 230, 8, '#ffffff'); for (const yy of [40, 170]) g.rect(-90, yy, 180, 22, C.pink, 0); g.rr(-90, 0, 180, 230, 8, null); for (let i = -3; i <= 3; i++) g.line([i * 24, 230, i * 24, 248], C.ol, 4); });
}
function pin(g, x, y) { g.rr(x - 8, y - 22, 16, 40, 5, C.yellow, 4); }
function tanzaku(g, x, y, c, sway = 0) {
  g.at(x, y, sway, 1, 1, () => { g.line([0, -30, 0, 0], C.ol, 3); g.rr(-40, 0, 80, 220, 4, c); for (let i = 0; i < 3; i++) g.curve([-18 + i * 18, 30, -10 + i * 18, 80, -20 + i * 18, 130, -12 + i * 18, 180], sh(c, -0.35), 5); });
}
function chick(g, x, y, s, open = 0) {
  g.at(x, y, 0, s, s, () => {
    g.circ(0, -36, 40, '#ffe14d'); g.circ(-20, -70, 4, C.ol, 0); g.circ(-4, -82, 6, '#ffe14d', 0);
    g.circ(-14, -44, 6, C.ol, 0); g.circ(14, -44, 6, C.ol, 0);
    g.tri(-8, -32, 8, -32, 0, -20 + open * 6, C.orange, 4);
    if (open) g.tri(-8, -30, 8, -30, 0, -40, C.orange, 4);
  });
}
function bird(g, x, y, s, t, fly, col = '#4f9df5', belly = '#e6f2ff') {
  g.at(x, y, 0, s, s, () => {
    const w = fly ? Math.sin(t * 22) * 0.8 : 0, wing = sh(col, -0.15);
    g.ell(0, 0, 62, 44, col); g.ell(14, 12, 34, 24, belly, 0);
    g.circ(-46, -30, 34, col); g.circ(-56, -36, 6, C.ol, 0); g.tri(-80, -34, -100, -26, -80, -20, C.orange, 4);
    g.at(10, -16, -0.2 - w, 1, 1, () => g.path('M0 0 C20 -40 70 -50 96 -30 C70 -10 30 4 0 6 Z', wing));
    g.path('M56 0 L100 -12 L96 18 Z', wing, 5);
  });
}

/* =========================================================================
   3. 木の実をもぐ（交互・片手）
   ========================================================================= */
const PICK = [
  { k: 'apple', name: 'リンゴをもぐ', short: 'リンゴ', theme: 'farm', fruit: 'apple', sky: ['#7ecbff', '#e2f6ff'], leaf: ['#3aa856', '#4cbe68'], fc: '#ee3a33', sleeve: '#ff9f1c' },
  { k: 'kaki', name: '柿をとる', short: '柿', theme: 'nature', fruit: 'kaki', sky: ['#9fd0ff', '#ffe9c8'], leaf: ['#e5893b', '#f0b13a'], fc: '#ff8a1f', sleeve: '#8a5a36' },
  { k: 'grape', name: 'ぶどうをとる', short: 'ぶどう', theme: 'farm', fruit: 'grape', sky: ['#8fd8ff', '#e8f8ff'], leaf: ['#5bb84a', '#7ccb5a'], fc: '#7b3fa0', sleeve: '#3cc46b' },
  { k: 'star', name: '星をつかむ', short: '星', theme: 'space', fruit: 'star', sky: ['#141a4a', '#3a2f7a'], leaf: [C.gold, '#ffffff'], fc: '#ffd23f', sleeve: '#8e5cff', sfx: ['chime', 'magic'] },
];
function fruit(g, kind, x, y, s, c, lite) {
  g.at(x, y, 0, s, s, () => {
    if (kind === 'star') {
      if (lite) { g.star(0, 0, 24, 10, 5, c, 4); return; }
      g.glow(0, 0, 120, '#fff3b0', 0.6); g.star(0, 0, 56, 26, 5, c, 6);
      g.circ(-13, -4, 5, C.ol, 0); g.circ(13, -4, 5, C.ol, 0); g.arc(0, 6, 9, 0.4, PI - 0.4, C.ol, 4); g.circ(-24, 8, 6, '#ffb36b', 0); g.circ(24, 8, 6, '#ffb36b', 0);
      return;
    }
    if (kind === 'grape') {
      g.line([0, -70, 0, -40], C.dwood, 8);
      if (lite) { g.blob([-50, -40, 50, -40, 40, 30, 0, 96, -40, 30], c, 6, 0.8); for (const [gx, gy] of [[-24, -14], [20, -10], [-2, 30], [10, 64]]) g.circ(gx, gy, 9, sh(c, 0.35), 0); return; }
      g.path('M0 -60 C30 -80 60 -70 70 -50 C40 -46 20 -50 0 -56 Z', '#5bb84a', 5);
      for (const [gx, gy] of [[-36, -30], [0, -34], [36, -30], [-20, 2], [20, 2], [-36, 30], [0, 34], [36, 30], [-16, 62], [18, 62], [0, 90]]) { g.circ(gx, gy, 21, c); g.circ(gx - 7, gy - 7, 5, sh(c, 0.5), 0); }
      return;
    }
    if (kind === 'kaki') {
      g.ell(0, 0, 50, 42, c); g.hl(-18, -12, 14, 8, -0.3, 0.5);
      g.path('M-34 -34 L0 -26 L34 -34 L22 -16 L0 -20 L-22 -16 Z', '#4a7a2e', 4); g.rr(-5, -50, 10, 22, 4, C.dwood, 4);
      return;
    }
    g.path('M0 -36 C30 -56 62 -34 56 6 C50 44 20 56 0 46 C-20 56 -50 44 -56 6 C-62 -34 -30 -56 0 -36 Z', c);
    g.hl(-24, -14, 12, 18, -0.3, 0.55); g.line([0, -36, 4, -62], C.dwood, 7); g.path('M4 -52 C24 -70 46 -64 54 -50 C34 -44 18 -46 4 -52 Z', '#3aa856', 4);
  });
}

/* =========================================================================
   4. 空へはなす（風船・はと・ランタン）
   ========================================================================= */
const RELEASE = [
  { k: 'balloon', name: '風船を空へ', short: '風船', theme: 'party', sfx: ['whoosh', 'cheer'], sleeve: '#ff6b8b', hand: 'grip' },
  { k: 'dove', name: 'はとを空へはなす', short: 'はと', theme: 'animal', sfx: ['whoosh', 'chime'], sleeve: '#3a86ff', hand: 'palm' },
  { k: 'lantern', name: 'ランタンを飛ばす', short: 'ランタン', theme: 'festival', sfx: ['magic', 'chime'], sleeve: '#26386b', hand: 'palm' },
];
const BAL = [[-150, -250, 62, C.red], [-62, -330, 66, C.yellow], [16, -250, 64, C.blue], [100, -335, 62, C.green], [170, -245, 60, C.purple]];

/* =========================================================================
   5. 両手を上げると空が変わる（花火・日の出・虹）
   ========================================================================= */
const SKY = [
  { k: 'fire', name: '花火を打ち上げる', short: '花火', theme: 'festival', sfx: ['firework', 'firework'], sleeve: '#c0392b' },
  { k: 'sun', name: '朝日をのぼらせる', short: '日の出', theme: 'nature', sfx: ['chime', 'magic'], sleeve: '#ff9f1c' },
  { k: 'rainbow', name: '虹をかける', short: '虹', theme: 'nature', sfx: ['magic', 'chime'], sleeve: '#3a86ff' },
];
const RB = ['#ff5a5f', '#ff9f1c', '#ffd23f', '#3cc46b', '#3a86ff', '#8e5cff'];

/* =========================================================================
   7. 交互に手をのばす（ハイタッチ・ちょうちん・小鳥）
   ========================================================================= */
const REACH = [
  { k: 'hi5', name: 'ハイタッチする', short: 'ハイタッチ', theme: 'party', sfx: ['clap', 'cheer'], sleeve: '#3a86ff', pop: ['パチン！', 'ナイス！'] },
  { k: 'lantern', name: 'ちょうちんを吊るす', short: 'ちょうちん', theme: 'festival', sfx: ['chime', 'taiko'], sleeve: '#26386b', pop: ['パッ', 'おまつりだ！'] },
  { k: 'bird', name: '手に小鳥をのせる', short: '小鳥', theme: 'animal', sfx: ['chime', 'chime'], sleeve: '#72c957', pop: ['ピッ', 'なかよし！'] },
];
// 手の目標：alt は左右の手それぞれ、one は 1回目・2回目（右手。g.mirror の中）
const RT = { hi5: { L: [340, 340], R: [660, 340], one: [[660, 340], [660, 340]] }, lantern: { L: [330, 410], R: [670, 410], one: [[560, 410], [770, 410]] }, bird: { L: [330, 380], R: [670, 380], one: [[640, 380], [640, 380]] } };
function buddy(g, x, y, s, kind, joy, px, py, t) {
  // kind: 'bunny' | 'bear'。px,py は上げた手（肉球）の位置（ワールド座標）
  const col = kind === 'bear' ? '#c98b52' : '#ffffff', in2 = kind === 'bear' ? '#f2d0a4' : '#ffc7d6';
  const sx = x + (px > x ? 50 : -50) * s, sy = y - 120 * s;
  g.cap(sx, sy, px, py, 22 * s, col);
  g.circ(px, py, 30 * s, col); g.circ(px, py + 4 * s, 14 * s, in2, 0);
  g.at(x, y, 0, s, s, () => {
    g.ell(0, -70, 76, 84, col); g.ell(0, -60, 44, 52, in2, 0);
    if (kind === 'bunny') { g.ell(-30, -330, 20, 66, col, 6, -0.12); g.ell(30, -330, 20, 66, col, 6, 0.12); g.ell(-30, -326, 9, 46, in2, 0, -0.12); g.ell(30, -326, 9, 46, in2, 0, 0.12); }
    else { g.circ(-52, -282, 24, col); g.circ(52, -282, 24, col); g.circ(-52, -282, 12, in2, 0); g.circ(52, -282, 12, in2, 0); }
    g.circ(0, -220, 74, col);
    if (joy) { g.arc(-26, -226, 11, PI + 0.3, -0.3, C.ol, 6); g.arc(26, -226, 11, PI + 0.3, -0.3, C.ol, 6); g.path('M-18 -196 Q0 -176 18 -196', null, 6); }
    else { g.circ(-26, -228, 9, C.ol, 0); g.circ(26, -228, 9, C.ol, 0); g.path('M-12 -196 Q0 -188 12 -196', null, 5); }
    g.ell(0, -208, 10, 7, kind === 'bear' ? C.ol : '#ff8fa3', 0); g.circ(-46, -204, 11, '#ffb3c6', 0); g.circ(46, -204, 11, '#ffb3c6', 0);
  });
}
function chochin(g, x, y, s, lit, swing = 0) {
  g.at(x, y, swing, s, s, () => {
    g.line([0, -110, 0, -90], C.ol, 6);
    if (lit > 0) g.glow(0, 0, 170, '#ffb347', 0.6 * lit);
    g.ell(0, 0, 62, 82, lit > 0 ? g.mix('#c0392b', '#ff6a3d', lit) : '#a8322a');
    for (const yy of [-50, -18, 18, 50]) g.line([-Math.sqrt(1 - (yy / 82) ** 2) * 60, yy, Math.sqrt(1 - (yy / 82) ** 2) * 60, yy], lit > 0 ? '#ffd27a' : '#7a2a20', 4);
    g.ell(0, 0, 22, 78, null, 0); g.rr(-34, -94, 68, 18, 5, C.ol, 0); g.rr(-34, 76, 68, 18, 5, C.ol, 0);
    if (lit > 0) g.ell(0, 0, 26, 50, g.rgba('#fff3b0', 0.5 * lit), 0);
  });
}

/* =========================================================================
   6. 投げ上げる（くま・ピザ）
   ========================================================================= */
const TOSS = [
  { k: 'teddy', name: 'くまを胴上げ', short: '胴上げ', theme: 'party', sfx: ['boing', 'cheer'], sleeve: '#3a86ff' },
  { k: 'pizza', name: 'ピザ生地を回す', short: 'ピザ', theme: 'kitchen', sfx: ['whoosh', 'ding'], sleeve: '#ffffff' },
];

export default [
  /* ---------------- 1. かかげる ---------------- */
  {
    id: 'lift-hold', acts: ['lift'], modes: ['both'], vars: HOLD,
    sfx: (k, v) => v.sfx[k - 1],
    init(s) { s.my.fl = []; for (let i = 0; i < 14; i++) s.my.fl.push([s.r(), s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, aj = s.k ? s.age : 9, t = s.t, H = hpos(s.p, 500, v.yt, { xt: v.xt, xb: v.xb, at: 0.04, ab: 0.3 });
      const bob = jig(aj, 14, 16, 6);
      if (v.k === 'barbell') {
        g.bg('#1d2240'); g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 820 - V.y0, g.lin(0, 0, 0, 820, ['#151a36', '#2c3566']), 0);
        g.alpha(0.18, () => g.poly([380, V.y0 - 20, 620, V.y0 - 20, 860, 820, 140, 820], '#fff6c8', 0));
        g.rr(250, 60, 500, 110, 20, '#0f1229', 6);
        for (let i = 0; i < 3; i++) { const on = (s.k >= 1 && i < 2) || s.k >= 2; if (on) g.glow(390 + i * 110, 115, 70, '#ffffff', 0.6); g.circ(390 + i * 110, 115, 34, on ? '#ffffff' : '#3a3f5a', 5); }
        g.band(820, 'bottom', '#8a5a38', 6); g.rect(V.x0 - 20, 820, V.x1 - V.x0 + 40, 20, '#a8714a', 0);
        for (let i = 0; i < 9; i++) g.circ(V.x0 + (V.x1 - V.x0) * (i + 0.5) / 9, 960, 70, '#141833', 0);
        const by = H.my, bend = 10 + Math.abs(bob) * 0.8;
        const pts = [V.x0 - 60, by + bend * 1.6, 300, by, 700, by, V.x1 + 60, by + bend * 1.6];
        g.curve(pts, C.ol, 24); g.curve(pts, C.metal, 13);
        for (const sg of [-1, 1]) {
          const px = 500 + sg * 330, py = by + bend * 0.5;
          g.rr(px - 22 + sg * 4, py - 140, 44, 280, 14, '#e8434f'); g.rr(px - 16 + sg * 50, py - 116, 34, 232, 12, '#3a86ff'); g.rr(px - 10 + sg * 88, py - 90, 22, 180, 8, C.yellow);
          g.rr(px - 12 - sg * 38, py - 34, 24, 68, 6, C.steel);
        }
      } else if (v.k === 'trophy') {
        g.bg('#3c9a48'); g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 600 - V.y0, g.lin(0, 0, 0, 600, ['#0f1838', '#2a3d78']), 0);
        for (const lx of [150, 850]) { g.rect(lx - 6, 120, 12, 240, '#5c6478', 0); g.rr(lx - 70, 70, 140, 60, 8, '#dde2ec', 5); g.glow(lx, 100, 180, '#ffffff', 0.4); }
        g.rect(V.x0 - 20, 380, V.x1 - V.x0 + 40, 220, '#25306a', 0);
        for (let r = 0; r < 3; r++) for (let x = V.x0 + (r % 2) * 34; x < V.x1; x += 68) g.circ(x, 410 + r * 64, 22, ['#ff9fbd', '#ffd23f', '#9cf2d8', '#ffffff'][(r + Math.floor(x / 68)) % 4], 0);
        if (s.k) for (const [fx, fy, fk] of s.my.fl) { const a = (s.age * 3 + fk) % 1; if (a < 0.4) g.star(lerp(V.x0, V.x1, fx), 400 + fy * 160, 26 * (1 - a / 0.4), 6, 4, '#ffffff', 0); }
        g.band(600, 'bottom', '#3c9a48', 6); for (let i = 0; i < 4; i++) g.band(640 + i * 110, 690 + i * 110, '#45ab52');
        trophy(g, H.mx, H.my + 30 * H.sc, H.sc * 0.95, s.k ? clamp(1 - aj) : 0);
      } else {
        g.bg('#3a2350', '#ff9a5c'); g.sun(500, 560, 120, '#ffd27a');
        for (let i = 0; i < 6; i++) { const x = V.x0 + (V.x1 - V.x0) * i / 5; g.rect(x - 90, 520 - (i % 2) * 40, 180, 600, '#4a2a55', 0); g.poly([x - 110, 520 - (i % 2) * 40, x, 440 - (i % 2) * 40, x + 110, 520 - (i % 2) * 40], '#2f1a3a', 0); }
        for (const yy of [130, 300]) { g.curve([V.x0 - 40, yy, 500, yy + 50, V.x1 + 40, yy], C.ol, 4); for (let x = Math.ceil(V.x0 / 140) * 140; x < V.x1; x += 140) { const tt = (x - V.x0) / (V.x1 - V.x0), y = yy + 50 * 4 * tt * (1 - tt) * 0.9 + 10; g.glow(x, y + 30, 70, '#ff9b6b', 0.4); g.ell(x, y + 30, 28, 26, '#e8402f'); } }
        g.band(820, 'bottom', '#5a3a4a');
        mikoshi(g, H.mx, H.my - 22 + bob * 0.5, H.sc * 0.95, t);
        g.rr(V.x0 - 40, H.my - 18, V.x1 - V.x0 + 80, 36, 14, C.wood, 6);
        for (const sg of [-1, 1]) g.rect(500 + sg * 330 - 12, H.my - 20, 24, 40, '#2b2140', 0);
      }
      hands(g, s, H, { hand: v.hand, sleeve: v.sleeve, at: 0.04, ab: 0.3 });
    },
    hit(g, s, k, v) {
      if (v.k === 'barbell') {
        g.fx.lines(500, 330, { n: 12, r0: 200, r1: 330, w: 10 });
        if (k === 1) g.fx.pop('フンッ！', 500, 560, { size: 96 });
        else { g.fx.pop('新記録！', 500, 520, { size: 130, c: C.yellow }); g.fx.confetti(70); g.fx.flash('#ffffff', 0.4, 0.15); }
      } else if (v.k === 'trophy') {
        g.fx.stars(500, 150, k === 2 ? 12 : 6);
        if (k === 1) g.fx.pop('やったー', 500, 600, { size: 110 });
        else { g.fx.pop('優勝！', 500, 600, { size: 140, c: C.yellow }); g.fx.confetti(70); }
      } else {
        g.fx.burst(500, 160, { n: k === 2 ? 30 : 14, c: [C.red, '#ffffff', C.gold], shape: 'conf', sp: [300, 700], size: [14, 24], g: 700 });
        g.fx.pop(k === 1 ? 'ワッショイ' : 'ワッショイ！', 500, 560, { size: k === 2 ? 120 : 100, c: k === 2 ? C.yellow : '#ffffff' });
        if (k === 2) g.fx.stars(500, 120, 10);
      }
      g.fx.shake(k === 2 ? 10 : 7, 0.14);
    },
  },

  /* ---------------- 2. 置く・飾る ---------------- */
  {
    id: 'lift-place', acts: ['lift'], modes: ['both'], vars: PLACE,
    sfx: (k, v) => v.sfx[k - 1],
    init(s) { s.my.st = []; for (let i = 0; i < 46; i++) s.my.st.push([s.r(), s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, t = s.t, aj = s.k ? s.age : 9, side = s.mode === 'one' ? s.side : 'R';
      const got = reload(s), idx = Math.min(1, s.k), [tx, ty, hold, ixt] = v.it[idx];
      const placed = i => s.k > i ? (s.k === i + 1 ? s.age : s.age + s.spr) : -1;   // 置いてからの秒（まだなら -1）
      const done = s.k >= 2 ? clamp(aj / 0.3) : 0;
      g.mirror(side, () => {
        const H = hpos(s.p, tx, ty + hold, { xt: ixt ?? v.xt ?? 96, xb: 220 });
        const ix = H.mx, iy = H.my - hold * lerp(1, 0.9, s.p);
        const inHand = got > 0 && s.k < 2 && !(v.touch && s.k >= 1);
        let held = null;   // 手より手前に描く「持っている物」
        const a0 = placed(0), a1 = placed(1);
        if (v.k === 'tree') {
          g.bg('#1b2350', '#34408a'); for (const [a, b] of s.my.st.slice(0, 26)) g.circ(lerp(V.x0, V.x1, a), lerp(V.y0, 700, b), 3, 'rgba(255,255,255,0.7)', 0);
          g.band(900, 'bottom', '#eef4ff', 6);
          xmasTree(g, done, t);
          if (a0 >= 0) g.at(400, 410, jig(a0, 0.4, 10, 3), 1, 1, () => { g.line([0, 0, 0, 14], C.ol, 4); ornament(g, 0, 60); });
          if (a1 >= 0) { g.glow(500, 168, 220, '#fff3b0', 0.85); star5(g, 500, 168, 84, C.gold); }
          held = () => g.at(ix, iy, 0, got, got, () => idx === 0 ? ornament(g, 0, 0) : star5(g, 0, 0, 84, C.gold));
        } else if (v.k === 'bulb') {
          const st = s.k, fl = st === 1 ? (Math.sin(a0 * 40) > 0.2 || a0 > 0.5 ? 1 : 0) : 0, on = st >= 2 ? 1 : fl * 0.45;
          g.bg('#f4e9d8'); g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 70 - V.y0, '#e9dcc6', 0);
          g.rr(130, 300, 240, 180, 6, '#ffffff', 6); g.rr(146, 316, 208, 148, 4, '#bfe6ff', 0); g.circ(300, 360, 26, '#fff3b0', 0);
          g.band(760, 'bottom', '#c9a77c', 6);
          g.rr(560, 600, 340, 200, 40, '#5c7cfa', 7); g.rr(540, 560, 60, 200, 30, '#4c6ae8', 6); g.rr(860, 560, 60, 200, 30, '#4c6ae8', 6);
          smallCat(g, 730, 640, 1.1, st >= 2 ? 'joy' : 'sleep');
          const dark = st >= 2 ? 0.6 * (1 - clamp(aj / 0.12)) : 0.6 * (1 - on * 0.75);
          if (dark > 0.01) g.alpha(dark, () => g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, V.y1 - V.y0 + 40, '#141030', 0));
          g.line([500, V.y0 - 20, 500, 110], C.ol, 6); g.rr(470, 100, 60, 52, 10, '#5c6478', 6);
          if (st >= 1) bulbShape(g, 500, 228, 1.1, on);
          held = () => bulbShape(g, ix, iy, 1.1 * got, 0);
        } else if (v.k === 'book') {
          g.bg('#f3e4c8'); g.band(860, 'bottom', '#d8b98c'); g.line([V.x0 - 20, 860, V.x1 + 20, 860], '#c9a77c', 8);
          g.rr(150, 40, 700, 980, 12, '#8a5a36', 7); g.rect(180, 70, 640, 920, '#5a3a22', 0);
          const C6 = ['#ffd23f', '#3cc46b', '#8e5cff', '#ff9f1c', '#2ec4b6', '#ff6b8b'];
          [[190, 362], [452, 546], [638, 812]].forEach(([x0, x1], j) => { for (let x = x0, i = j; x + 30 < x1; i++) { const w = Math.min(x1 - x, 40 + (i * 7 % 3) * 9); book(g, x + w / 2, 300, C6[i % 6], w - 4, 170 + (i * 5 % 3) * 14); x += w; } });
          for (const y of [560, 820]) { for (let x = 190, i = y; x < 800; i++) { const w = 46 + (i * 7 % 4) * 10, h = 170 + (i % 3) * 16; g.rr(x, y - h, w - 5, h, 5, C6[i % 6], 5); g.rect(x, y - h + 22, w - 5, 9, 'rgba(255,255,255,0.4)', 0); x += w; } }
          for (const y of [300, 560, 820]) g.rect(170, y, 660, 22, '#a0673c', 5);
          if (a0 >= 0) { if (a0 < 0.5) g.glow(408, 200, 140, '#fff3b0', 0.7 * (1 - a0 / 0.5)); bigBook(g, 408, 300 - 12 * jig(a0, 1, 20, 8), 0); }
          if (a1 >= 0) { if (a1 < 0.5) g.glow(592, 200, 140, '#fff3b0', 0.7 * (1 - a1 / 0.5)); bigBook(g, 592, 300 - 12 * jig(a1, 1, 20, 8), 1); }
          g.at(700, 30 - 26 * (s.k >= 2 ? E.outBack(done) : 0), () => { g.ell(0, 0, 44, 50, '#a0673c'); g.circ(-15, -10, 15, '#ffffff', 4); g.circ(15, -10, 15, '#ffffff', 4); g.circ(-15, -10, 6, C.ol, 0); g.circ(15, -10, 6, C.ol, 0); g.tri(-6, 6, 6, 6, 0, 18, C.orange, 3); });
          held = () => g.at(ix, iy, 0, got, got, () => bigBook(g, 0, 0, idx));
        } else if (v.k === 'laundry') {
          const sunny = s.k >= 2 ? done : 0;
          g.bg('#bfe6ff'); g.sky(g.mix('#9fb8d0', '#5cbcff', sunny), g.mix('#dde6ee', '#d8f2ff', sunny), 760);
          g.sun(800, 120, 70); g.cloud(800 + 280 * sunny, 140, 1.15, '#f4f6fa'); g.cloud(220, 330, 0.7, '#ffffff');
          g.band(760, 'bottom', '#d9d3c7', 6); for (let x = Math.floor(V.x0 / 60) * 60; x < V.x1; x += 60) g.line([x, 760, x, 900], '#b8b0a2', 8); g.rect(V.x0 - 20, 750, V.x1 - V.x0 + 40, 24, '#a8a090', 5);
          g.line([110, 760, 110, 200], C.ol, 12); g.line([890, 760, 890, 200], C.ol, 12);
          g.rr(V.x0 - 40, 198, V.x1 - V.x0 + 80, 20, 10, '#c9d1de', 5);
          const sw = Math.sin(t * 4) * 0.04 * (1 + sunny);
          if (a0 >= 0) { tshirt(g, 365, 210, '#3a86ff', sw + jig(a0, 0.15, 12, 4)); pin(g, 320, 212); pin(g, 410, 212); }
          if (a1 >= 0) { towel(g, 640, 210, -sw + jig(a1, 0.15, 12, 4)); pin(g, 580, 212); pin(g, 700, 212); }
          if (inHand) g.at(ix, iy, 0, got, got, () => idx === 0 ? tshirt(g, 0, 0, '#3a86ff') : towel(g, 0, 0));
        } else if (v.k === 'tanabata') {
          const mw = s.k >= 2 ? done : 0;
          g.bg('#141a4a', '#2a2f78');
          for (const [a, b, c] of s.my.st) g.circ(lerp(V.x0, V.x1, a), lerp(V.y0, 760, b), 2 + c * 3, 'rgba(255,255,255,0.8)', 0);
          if (mw > 0) g.alpha(mw, () => {
            g.at(500, 330, -0.42, 1, 1, () => { g.rect(-1000, -120, 2000, 240, g.lin(0, -120, 0, 120, [g.rgba('#a9c0ff', 0), g.rgba('#c9d6ff', 0.45), g.rgba('#a9c0ff', 0)]), 0); for (const [a, b, c] of s.my.st) g.circ(lerp(-900, 900, a), (b - 0.5) * 170, 3 + c * 5, c > 0.5 ? '#fff6c8' : '#ffffff', 0); });
          });
          g.band(860, 'bottom', '#1c2a3a', 6);
          g.curve([140, 1100, 150, 600, 300, 200, 560, 90, 900, 140], C.ol, 34); g.curve([140, 1100, 150, 600, 300, 200, 560, 90, 900, 140], '#5fbf5a', 22);
          for (const [lx, ly, a] of [[260, 260, -0.6], [330, 170, -0.3], [470, 110, 0.1], [640, 100, 0.3], [790, 130, 0.6], [880, 150, 0.9], [210, 380, -0.9]]) g.at(lx, ly, a, 1, 1, () => { g.path('M0 0 C20 -16 70 -20 110 0 C70 20 20 16 0 0 Z', '#4caf50', 5); g.path('M0 0 C20 16 60 30 100 40 C60 40 20 30 0 0 Z', '#3d9a46', 5); });
          for (const [dx, dy, c] of [[290, 225, '#9cf2d8'], [750, 150, '#c4a6ff']]) tanzaku(g, dx, dy, c, Math.sin(t * 3 + dx) * 0.06);
          if (a0 >= 0) tanzaku(g, 410, 180, '#ff6b8b', Math.sin(t * 3) * 0.06 + jig(a0, 0.2, 12, 4));
          if (a1 >= 0) tanzaku(g, 600, 200, '#ffd23f', Math.sin(t * 3 + 1) * 0.06 + jig(a1, 0.2, 12, 4));
          held = () => g.at(ix, iy, 0, got, got, () => tanzaku(g, 0, 0, idx === 0 ? '#ff6b8b' : '#ffd23f'));
        } else if (v.k === 'snowman') {
          g.bg('#f4f8ff'); g.sky('#9fd3ff', '#eaf6ff', 640);
          for (const [hx, hw] of [[120, 220], [860, 240]]) { g.rect(hx - hw / 2, 480, hw, 180, '#ffe3c2', 6); g.poly([hx - hw / 2 - 30, 490, hx, 380, hx + hw / 2 + 30, 490], '#ffffff', 6); }
          g.band(640, 'bottom', '#f4f8ff', 6);
          for (const [a, b, c] of s.my.st.slice(0, 18)) { const y = ((b * 1400 + t * 60 * (0.6 + c)) % 1400) + V.y0 - 100; g.circ(lerp(V.x0, V.x1, a), y, 6 + c * 6, '#ffffff', 0); }
          g.shadow(500, 960, 330, 40);
          g.circ(500, 690, 270, '#ffffff'); g.hl(400, 580, 60, 36, -0.5, 0.6);
          for (const yy of [600, 700, 800]) g.circ(500, yy, 12, '#2b2140', 0);
          const happy = s.k >= 2;
          for (const sg of [-1, 1]) g.at(500 + sg * 250, 560, sg * (happy ? -0.5 + Math.sin(t * 12) * 0.3 : -0.1), 1, 1, () => { g.line([0, 0, sg * 160, -60], C.dwood, 12); g.line([sg * 110, -40, sg * 140, -90], C.dwood, 9); });
          if (a0 >= 0) g.at(500, 345 - 14 * jig(a0, 1, 18, 7), () => snowHead(g, happy));
          if (a1 >= 0) g.at(500, 215 - 14 * jig(a1, 1, 18, 7), () => bucket(g));
          held = () => g.at(ix, iy, 0, got, got, () => idx === 0 ? g.circ(0, 0, 120, '#ffffff') : bucket(g));
        } else {   // nest
          g.bg('#9fe08a'); g.sky('#80cfff', '#e0f6ff', 760); g.cloud(230, 500, 0.7);
          g.rect(820, V.y0 - 20, 150, 1100, C.bark, 7); g.line([860, 100, 880, 600], sh(C.bark, -0.2), 6);
          for (const [cx, cy, r] of [[700, 0, 200], [400, -40, 220], [130, 20, 180], [940, 80, 180]]) g.circ(cx, cy, r, '#4cb85c', 0);
          g.band(900, 'bottom', '#7cc463', 6);
          g.curve([V.x0 - 40, 300, 300, 290, 600, 280, 840, 250], C.ol, 34); g.curve([V.x0 - 40, 300, 300, 290, 600, 280, 840, 250], C.bark, 22);
          const happy = s.k >= 2, mf = happy ? E.outQ(done) : 0;
          bird(g, lerp(690, 610, mf), lerp(200, 170, mf) - 20 * Math.abs(Math.sin(t * (happy ? 10 : 3))), 1, t, happy && done < 1);
          g.path('M370 262 Q490 330 610 262 Q610 300 490 312 Q370 300 370 262 Z', '#a0673c');
          if (a0 >= 0) chick(g, 452, 262 - 10 * jig(a0, 1, 16, 6), 1.1, Math.sin(t * 14) > 0 ? 1 : 0);
          if (a1 >= 0) chick(g, 530, 262 - 10 * jig(a1, 1, 16, 6), 1.1, Math.sin(t * 14 + 1) > 0 ? 1 : 0);
          g.path('M360 256 Q490 350 620 256 L614 282 Q490 342 366 282 Z', '#8a5a36');
          for (let i = 0; i < 6; i++) g.line([384 + i * 40, 270, 404 + i * 40, 300], '#6b4428', 4);
          held = () => g.at(ix, iy, 0, got, got, () => chick(g, 0, 0, 1.1, 0));
        }
        hands(g, s, H, { hand: s.mode === 'one' ? 'open' : 'palm', sleeve: v.sleeve, at: 0.26, ab: 0.5 });
        if (inHand && held) held();
      });
    },
    hit(g, s, k, v) {
      const side = s.mode === 'one' ? s.lastSide : 'R', [tx, ty] = v.it[k - 1], X = g.mx(side, tx);
      const [w, px, py] = v.pop[k - 1];
      g.fx.burst(X, ty, { n: k === 2 ? 16 : 9, c: [C.gold, '#ffffff', C.yellow], shape: 'star', sp: [200, 500], size: [14, 24], g: 500 });
      g.fx.pop(w, g.mx(side, px), py, { size: k === 2 ? 110 : 96, c: k === 2 ? C.yellow : '#ffffff' });
      if (k === 2) { if (v.k === 'tree' || v.k === 'tanabata') g.fx.stars(500, 200, 12); else if (v.k === 'nest') g.fx.hearts(560, 200, 6); else g.fx.stars(X, ty, 8); if (v.k === 'bulb') g.fx.flash('#fff6d0', 0.5, 0.2); }
      g.fx.shake(k === 2 ? 8 : 5, 0.12);
    },
  },

  /* ---------------- 3. もぐ ---------------- */
  {
    id: 'lift-pick', acts: ['lift'], modes: ['alt', 'one'], vars: PICK,
    sfx: ['pop', 'pop'],
    init(s) { s.my.fr = []; for (let i = 0; i < 12; i++) s.my.fr.push([s.r(), s.r()]); s.my.n = 0; s.my.hold = { L: 0, R: 0 }; },
    draw(g, s, v) {
      const V = g.V, t = s.t, alt = s.mode === 'alt';
      const tgt = (k, side) => alt ? [side === 'L' ? 330 : 670, k === 1 ? 300 : 320] : k === 1 ? [600, 290] : [760, 360];
      g.mirror(alt ? 'R' : s.side, () => {
        const ground = v.k === 'kaki' ? '#d8b26a' : v.k === 'star' ? '#252b5e' : '#8ccf5c';
        g.bg(v.k === 'star' ? '#252b5e' : v.k === 'grape' ? '#a8d86a' : '#8ccf5c'); g.sky(v.sky[0], v.sky[1], 700);
        if (v.k === 'star') { for (const [a, b] of s.my.fr) g.circ(lerp(V.x0, V.x1, a), lerp(V.y0, 680, b), 3, 'rgba(255,255,255,0.8)', 0); g.circ(840, 140, 56, '#fff3b0', 0); g.circ(820, 130, 10, '#f0dd8a', 0); g.circ(856, 160, 7, '#f0dd8a', 0); g.hills(720, '#2d3570', 60, 4, 4); }
        g.band(700, 'bottom', ground, 6);
        if (v.k === 'grape') {
          for (let x = Math.floor(V.x0 / 160) * 160; x < V.x1 + 160; x += 160) g.line([x, V.y0 - 20, x, 700], '#7a4a2a', 10);
          g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 200 - V.y0, '#5bb84a', 0);
          for (let i = 0; i < 14; i++) g.at(V.x0 + (V.x1 - V.x0) * i / 13, 200 + (i % 3) * 20, (i % 2 ? 0.4 : -0.4), 1, 1, () => g.path('M0 -40 C40 -40 60 0 40 40 C20 30 0 50 -20 30 C-50 40 -50 0 -30 -30 Z', i % 2 ? '#4caf50' : '#6cc95a', 5));
          for (let x = Math.floor(V.x0 / 160) * 160 - 80; x < V.x1 + 160; x += 160) g.line([x - 80, 170, x + 80, 170], '#7a4a2a', 8);
        } else if (v.k !== 'star') {
          g.rect(470, 300, 60, 420, C.bark, 6);
          g.blob([V.x0 - 60, V.y0 - 40, V.x1 + 60, V.y0 - 40, V.x1 + 60, 300, 820, 430, 640, 400, 500, 450, 330, 400, 160, 440, V.x0 - 60, 320], v.leaf[0], 0, 0.6);
          for (const [a, b] of s.my.fr) g.circ(lerp(V.x0, V.x1, a), lerp(Math.max(V.y0, -200), 330, b), 50, v.leaf[1], 0);
        }
        for (const [a, b] of s.my.fr.slice(0, 9)) { const x = lerp(V.x0 + 40, V.x1 - 40, a), y = lerp(Math.max(V.y0 + 40, 20), 250, b); if (Math.abs(x - 330) < 90 || Math.abs(x - 670) < 90 || Math.abs(x - 760) < 70) continue; fruit(g, v.fruit, x, y, 0.65, v.fc, 1); }
        // バスケット（星はビン）
        if (v.k === 'star') g.at(500, 1010, () => { g.rr(-150, -250, 300, 290, 60, 'rgba(190,225,255,0.35)', 6); g.glow(0, -110, 170, '#fff3b0', 0.35 + 0.1 * s.my.n); for (let i = 0; i < 3 + s.my.n; i++) fruit(g, 'star', -84 + (i % 4) * 56, -100 - Math.floor(i / 4) * 52, 0.9, v.fc, 1); g.rr(-112, -292, 224, 50, 14, '#c98b52', 6); g.hl(-110, -170, 12, 56, 0, 0.45); });
        else g.at(500, 1010, () => { g.ell(0, -150, 210, 50, '#7a4a2a'); for (let i = 0; i < 5 + s.my.n; i++) fruit(g, v.fruit, -150 + (i % 6) * 60, -170 - Math.floor(i / 6) * 30, 0.6, v.fc, 1); g.path('M-220 -150 L-180 60 L180 60 L220 -150 Q0 -110 -220 -150 Z', '#c98b52'); for (let i = 0; i < 3; i++) g.line([-210 + i * 6, -100 + i * 50, 210 - i * 6, -100 + i * 50], '#a0673c', 6); });
        // 実（まだ木にあるもの）
        const m = s.my, first = m.first ?? (m.first = s.side), sides = alt ? [first, first === 'L' ? 'R' : 'L'] : ['R', 'R'];
        for (let k = 1; k <= 2; k++) if (s.k < k) { const [x, y] = tgt(k, sides[k - 1]); fruit(g, v.fruit, x, y - 60, 1, v.fc); }
        // 手（もいだ実は、手が下りるまで持ってからカゴへ）
        for (const side of alt ? ['L', 'R'] : ['R']) {
          const sg = side === 'L' ? -1 : 1, p = alt ? (s.side === side ? s.p : 1 - s.p) : s.p;
          if (m.hold[side] && p > 0.88) { m.hold[side] = 0; m.n++; }
          const hk = m.hold[side], next = alt ? (side === first ? 1 : 2) : Math.min(2, s.k + 1);
          const [gx, gy] = tgt(hk || next, side);
          const hx = lerp(gx, 500 + sg * (alt ? 230 : 120), p), hy = lerp(gy, 950, p), sc = lerp(0.9, 1.12, p);
          g.arm(hx, hy, -PI / 2 - sg * lerp(alt ? 0.08 : 0.15, 0.45, p), { hand: hk ? 'grip' : 'open', side, s: sc, sleeve: v.sleeve });
          if (hk) fruit(g, v.fruit, hx, hy - 70 * sc, 0.95 * sc, v.fc);
        }
      });
    },
    hit(g, s, k, v) {
      const alt = s.mode === 'alt', side = s.lastSide;
      s.my.hold[alt ? side : 'R'] = k;
      const [x, y] = alt ? [side === 'L' ? 330 : 670, k === 1 ? 300 : 320] : k === 1 ? [600, 290] : [760, 360];
      const X = alt ? x : g.mx(side, x);
      g.fx.burst(X, y - 60, { n: 10, c: v.leaf, shape: v.k === 'star' ? 'star' : 'leaf', sp: [200, 500], size: [16, 26], g: 400, drag: 0.95, life: [0.6, 1] });
      g.fx.pop(v.k === 'star' ? (k === 1 ? 'キラッ' : 'つかまえた！') : k === 1 ? 'プチッ' : 'とれた！', alt ? 500 : g.mx(side, 380), k === 1 ? 520 : 500, { size: k === 2 ? 120 : 100, c: k === 2 ? C.yellow : '#ffffff' });
      if (k === 2) g.fx.stars(X, y - 60, 10);
      g.fx.shake(k === 2 ? 8 : 5, 0.1);
    },
  },

  /* ---------------- 4. 空へはなす ---------------- */
  {
    id: 'lift-release', acts: ['lift'], modes: ['both'], vars: RELEASE,
    sfx: (k, v) => v.sfx[k - 1],
    init(s) { s.my.rel = []; s.my.st = []; for (let i = 0; i < 30; i++) s.my.st.push([s.r(), s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, t = s.t, aj = s.k ? s.age : 9;
      const H = hpos(s.p, 500, v.k === 'balloon' ? 470 : 380, { xt: v.k === 'balloon' ? 40 : 84, xb: 200, at: 0.05, ab: 0.45 });
      const got = v.k === 'balloon' ? 1 : reload(s);
      if (v.k === 'balloon') {
        g.bg('#8ccf5c'); g.sky('#5ab8f5', '#d9f3ff', 720); g.cloud(200, 200, 0.8); g.cloud(800, 380, 0.6);
        g.hills(700, '#6cc04a', 60, 2, 4); g.band(760, 'bottom', '#8ccf5c');
        for (const x of [130, 870]) { g.rect(x - 12, 600, 24, 160, C.bark, 5); g.circ(x, 560, 80, '#3fae5a'); }
      } else if (v.k === 'dove') {
        g.bg('#cfe9ff'); g.sky('#3fa9f5', '#bfe6ff', 760); g.sun(160, 140, 60); g.cloud(780, 160, 0.7);
        g.rect(V.x0 - 20, 560, V.x1 - V.x0 + 40, 200, '#f6efe2', 0); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) g.rr(x + 10, 600, 70, 100, 30, '#d8cdb8', 0);
        g.band(760, 'bottom', '#e0d6c2', 6);
        if (s.k >= 2) { const a = clamp(aj / 0.4); g.alpha(a, () => { for (let i = 0; i < 6; i++) g.arc(500, 760, 560 - i * 26, PI, 2 * PI, RB[i], 26); }); }
      } else {
        g.bg('#0f1238', '#2a2560');
        for (const [a, b, c] of s.my.st) g.circ(lerp(V.x0, V.x1, a), lerp(V.y0, 700, b), 2 + c * 3, 'rgba(255,255,255,0.8)', 0);
        g.ell(500, 860, 900, 160, '#1a1a40', 0); g.band(820, 'bottom', '#141432');
        for (let i = 0; i < 7; i++) g.rect(V.x0 + (V.x1 - V.x0) * i / 7, 720 - (i % 3) * 50, 90, 400, '#1d1f4a', 0);
        if (s.k >= 2) for (const [a, b, c] of s.my.st.slice(0, 12)) { const y = lerp(900, -200, clamp(aj * 0.35 + b * 0.6)) - aj * 60; skyLantern(g, lerp(V.x0 + 60, V.x1 - 60, a), y, 0.35 + c * 0.35); }
      }
      // はなしたもの
      for (const r of s.my.rel) {
        const a = t - r.t; if (a < 0) continue;
        if (v.k === 'balloon') { const y = r.y - 420 * a - 80 * a * a, x = r.x + 30 * Math.sin(a * 3 + r.x); balloon(g, x, y, r.r * (1 - 0.15 * Math.min(1, a)), r.c, Math.sin(a * 4) * 20); }
        else if (v.k === 'dove') { const x = r.x + r.dx * 500 * a, y = r.y - 520 * a + 60 * Math.sin(a * 5); dove(g, x, y, r.s * (1 - 0.3 * Math.min(1, a)), t * 18 + r.dx, r.dx < 0 ? -1 : 1); }
        else skyLantern(g, r.x + 20 * Math.sin(a * 2), r.y - 260 * a, 1 - 0.3 * Math.min(1, a * 0.7));
      }
      // 手に持っているもの
      if (v.k === 'balloon') {
        const keep = s.k === 0 ? [0, 1, 2, 3, 4] : s.k === 1 ? [1, 2, 3] : [];
        for (const i of keep) { const [dx, dy, r, c] = BAL[i]; const sw = Math.sin(t * 2 + i) * 10; g.curve([H.mx, H.my - 30, H.mx + dx * 0.4 + sw * 0.5, H.my + dy * 0.5, H.mx + dx + sw, H.my + dy + r * 1.2], C.ol, 3); balloon(g, H.mx + dx + sw, H.my + dy, r, c, 0); }
      } else if (got > 0 && s.k < 2) {
        if (v.k === 'dove') dove(g, H.mx, H.my - 80, 1.25 * got, Math.sin(t * 3) * 0.3 + 0.6);
        else skyLantern(g, H.mx, H.my - 30, 1.05 * got);
      }
      hands(g, s, H, { hand: v.hand, sleeve: v.sleeve, at: 0.05, ab: 0.45 });
      if (v.k === 'dove' && s.k >= 2) for (const [dx, dy, sc, ph] of [[-300, 120, 0.5, 0], [280, 160, 0.55, 1], [-180, 260, 0.45, 2], [380, 300, 0.4, 3]]) { const a = aj; dove(g, 500 + dx + dx * 0.8 * a, 420 + dy - 480 * a, sc, t * 18 + ph, dx < 0 ? -1 : 1); }
    },
    hit(g, s, k, v) {
      const H = hpos(0, 500, v.k === 'balloon' ? 470 : 380);
      if (v.k === 'balloon') { const rel = k === 1 ? [0, 4] : [1, 2, 3]; for (const i of rel) { const [dx, dy, r, c] = BAL[i]; s.my.rel.push({ t: s.t, x: H.mx + dx, y: H.my + dy, r, c }); } }
      else if (v.k === 'dove') s.my.rel.push({ t: s.t, x: H.mx, y: H.my - 80, s: 1.25, dx: k === 1 ? -0.5 : 0.4 });
      else s.my.rel.push({ t: s.t, x: H.mx, y: H.my - 30 });
      if (k === 1) g.fx.pop(v.k === 'dove' ? 'バサッ' : 'フワッ', 760, 560, { size: 100 });
      else { g.fx.pop(v.k === 'lantern' ? 'キラキラ' : 'バイバーイ', 500, 600, { size: 110, c: C.yellow }); g.fx.stars(500, 250, 10); }
      g.fx.burst(500, 300, { n: 8, c: ['#ffffff', C.lemon], shape: 'star', sp: [150, 400], size: [12, 20], g: 200 });
      g.fx.shake(k === 2 ? 7 : 4, 0.1);
    },
  },

  /* ---------------- 5. 空が変わる ---------------- */
  {
    id: 'lift-sky', acts: ['lift'], modes: ['both', 'alt', 'one'], vars: SKY,
    sfx: (k, v) => v.sfx[k - 1],
    init(s) { s.my.fw = []; s.my.st = []; for (let i = 0; i < 30; i++) s.my.st.push([s.r(), s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, t = s.t, aj = s.k ? s.age : 9, alt = s.mode === 'alt', one = s.mode === 'one', solo = alt || one;
      const sideOf = k => s.mode === 'both' ? null : alt ? (k === 1 ? s.my.s1 : s.my.s2) : s.side;
      if (v.k === 'fire') {
        g.bg('#0b0e2e', '#24285e');
        for (const [a, b, c] of s.my.st) g.circ(lerp(V.x0, V.x1, a), lerp(V.y0, 640, b), 2 + c * 2, 'rgba(255,255,255,0.7)', 0);
        for (let i = 0; i < 9; i++) { const x = V.x0 + (V.x1 - V.x0) * i / 8, h = 90 + (i * 37 % 70); g.rect(x - 50, 700 - h, 100, h + 40, '#161a40', 0); }
        g.band(720, 'bottom', '#12163a'); for (let i = 0; i < 4; i++) g.line([V.x0 - 20, 760 + i * 50, V.x1 + 20, 760 + i * 50], 'rgba(120,140,255,0.25)', 4);
        for (const f of s.my.fw) { const a = t - f.t; firework(g, f.x, f.y, a, f.c, f.R); if (a > 0 && a < 1.2) g.alpha(0.4 * (1 - a / 1.2), () => g.ell(f.x, 820, f.R * 0.6, 30, f.c, 0)); }
        // 打ち上がる玉（腕を上げている間に上っていく）
        if (s.k < 2 && (s.k === 0 ? s.ph > -0.55 : s.u > 0.5) && s.p < 0.75) {
          const rx = solo ? (s.side === 'L' ? 320 : 680) : 500, ry = lerp(250, 760, s.p / 0.75);
          g.line([rx, ry, rx + 3 * Math.sin(ry * 0.05), ry + 120], g.rgba('#ffd27a', 0.6), 8); g.circ(rx, ry, 10, '#fff3c0', 0); g.glow(rx, ry, 40, '#ffd27a', 0.6);
        }
      } else if (v.k === 'sun') {
        const lv = s.k === 0 ? 0 : s.k === 1 ? E.outQ(clamp(aj / 0.5)) : 1 + E.outQ(clamp(aj / 0.4));
        const sky1 = lv < 1 ? g.mix('#26306b', '#ff8a5c', lv) : g.mix('#ff8a5c', '#5ab8f5', lv - 1), sky2 = lv < 1 ? g.mix('#5b4a8a', '#ffd27a', lv) : g.mix('#ffd27a', '#d9f3ff', lv - 1);
        g.bg(sky2); g.sky(sky1, sky2, 580);
        if (lv < 1) for (const [a, b] of s.my.st.slice(0, 20)) g.alpha(1 - lv, () => g.circ(lerp(V.x0, V.x1, a), lerp(V.y0, 450, b), 3, '#ffffff', 0));
        const sy = lv <= 1 ? lerp(700, 560, lv) : lerp(560, 330, E.outBack(clamp(aj / 0.4))), r = 120;
        g.glow(500, sy, 380, '#fff1b0', 0.45 + 0.2 * Math.min(1, lv));
        g.circ(500, sy, r, lv > 1 ? '#ffe14d' : '#ff9f43', 0);
        g.rect(V.x0 - 20, 580, V.x1 - V.x0 + 40, V.y1 - 560, lv < 1 ? g.mix('#1d2a5a', '#d86b4a', lv) : g.mix('#d86b4a', '#2b9ee0', lv - 1), 0);
        for (let i = 0; i < 7; i++) g.rr(500 - 120 + i * 6 + Math.sin(t * 2 + i) * 20, 600 + i * 46, 240 - i * 12, 12, 6, g.rgba('#ffe9a0', 0.75 * Math.min(1, lv)), 0);
        g.line([V.x0 - 20, 580, V.x1 + 20, 580], 'rgba(255,255,255,0.6)', 4);
        if (lv > 1.2) for (const [x, y, ph] of [[230, 260, 0], [300, 200, 1], [720, 230, 2]]) { const w = Math.sin(t * 10 + ph) * 14; g.line([x - 30, y - w, x, y, x + 30, y - w], C.ol, 6); }
      } else {
        const lv = s.k === 0 ? 0 : s.k === 1 ? clamp(aj / 0.4) : 1 + clamp(aj / 0.35);
        g.bg('#7fcf5c'); g.sky(g.mix('#8fa6c0', '#5ab8f5', Math.min(1, lv * 0.7)), g.mix('#d8e2ec', '#e2f6ff', Math.min(1, lv)), 720);
        const a1 = lv <= 1 ? lerp(0, 0.5, E.outQ(lv)) : lerp(0.5, 1, E.outQ(lv - 1));
        const fromR = sideOf(1) === 'R';   // 1回目に上げた手の側から虹がのびる
        if (a1 > 0) for (let i = 0; i < 6; i++) { if (fromR) g.arc(500, 760, 520 - i * 26, 2 * PI - PI * a1, 2 * PI, RB[i], 27); else g.arc(500, 760, 520 - i * 26, PI, PI + PI * a1, RB[i], 27); }
        if (lv > 1) g.glow(500, 240, 200, '#ffffff', 0.4 * (2 - lv));
        g.cloud(170 - 120 * Math.min(1, lv), 160, 1, '#eef2f7'); g.cloud(830 + 120 * Math.min(1, lv), 220, 0.9, '#eef2f7');
        g.hills(700, '#5fb35a', 50, 3, 4); g.band(740, 'bottom', '#7fcf5c');
        if (lv < 1) for (const [a, b, c] of s.my.st) { const y = (b * 900 + t * 900 * (0.8 + c * 0.4)) % 900 + V.y0; g.alpha(0.6 * (1 - lv), () => g.line([lerp(V.x0, V.x1, a), y, lerp(V.x0, V.x1, a) - 10, y + 40], '#ffffff', 4)); }
        for (const [px, c] of [[260, C.pink], [740, C.yellow]]) g.at(px, 760, 0, 1, 1, () => { g.line([0, 0, 0, 70], '#3d9a46', 6); for (let i = 0; i < 5; i++) g.circ(Math.cos(i / 5 * PI * 2) * 20, -10 + Math.sin(i / 5 * PI * 2) * 20, 16, c, 4); g.circ(0, -10, 12, C.yellow, 4); });
      }
      // 手（ひらいて上へ）
      for (const side of one ? [s.side] : ['L', 'R']) {
        const sg = side === 'L' ? -1 : 1, p = alt ? (s.side === side ? s.p : 1 - s.p) : s.p;
        const x = 500 + sg * lerp(250, 220, p), y = lerp(340, 950, p);
        g.arm(x, y, -PI / 2 + sg * lerp(0.22, -0.4, p), { hand: 'palm', side, s: lerp(0.9, 1.12, p), sleeve: v.sleeve });
      }
    },
    hit(g, s, k, v) {
      if (k === 1) s.my.s1 = s.lastSide; else s.my.s2 = s.lastSide;
      if (v.k === 'fire') {
        const x0 = s.mode === 'both' ? 500 : s.lastSide === 'L' ? 320 : 680;
        if (k === 1) s.my.fw.push({ t: s.t, x: x0, y: 250, c: '#ff5a7a', R: 230 });
        else { s.my.fw.push({ t: s.t, x: x0, y: 220, c: C.gold, R: 280 }, { t: s.t + 0.12, x: 230, y: 330, c: '#7ad7ff', R: 160 }, { t: s.t + 0.2, x: 770, y: 320, c: '#b388ff', R: 170 }); g.fx.pop('たまやー！', 500, 560, { size: 110, c: C.yellow }); }
        if (k === 1) g.fx.pop('ドーン', 500, 560, { size: 100 });
        g.fx.shake(k === 2 ? 10 : 6, 0.14);
      } else if (v.k === 'sun') {
        g.fx.burst(500, 560, { n: 10, c: ['#fff3b0', '#ffffff'], shape: 'spark', sp: [300, 700], size: [16, 26], g: 0 });
        g.fx.pop(k === 1 ? 'ぐぐっ' : 'おはよう！', 500, k === 1 ? 320 : 680, { size: k === 2 ? 120 : 96, c: k === 2 ? C.yellow : '#ffffff' });
        if (k === 2) g.fx.stars(500, 330, 10);
        g.fx.shake(k === 2 ? 7 : 4, 0.1);
      } else {
        const fromR = s.mode !== 'both' && s.my.s1 === 'R';
        g.fx.stars((k === 1) !== fromR ? 260 : 740, 420, 8);
        g.fx.pop(k === 1 ? 'キラッ' : 'にじだ！', 500, 600, { size: k === 2 ? 120 : 96, c: k === 2 ? C.yellow : '#ffffff' });
        g.fx.shake(k === 2 ? 7 : 4, 0.1);
      }
    },
  },

  /* ---------------- 6. 応援（ポンポン） ---------------- */
  {
    id: 'lift-cheer', acts: ['lift'], modes: ['both', 'alt'], theme: 'sports', sfx: ['clap', 'cheer'],
    vars: [{ k: 'race', name: 'リレーを応援する', short: '応援' }],
    draw(g, s, v) {
      const V = g.V, t = s.t, aj = s.k ? s.age : 9, alt = s.mode === 'alt';
      g.bg('#c9774a'); g.sky('#6cc3ff', '#d6f0ff', 380); g.cloud(220, 120, 0.7);
      g.rr(560, 230, 360, 150, 6, '#fff3dc', 6); for (let i = 0; i < 5; i++) g.rr(580 + i * 66, 262, 46, 50, 4, '#9fd8ff', 4);
      g.band(380, 'bottom', '#7cc463');
      g.rect(V.x0 - 20, 450, V.x1 - V.x0 + 40, 230, '#d9774a', 0); for (const y of [450, 525, 600, 680]) g.line([V.x0 - 20, y, V.x1 + 20, y], '#ffffff', 5);
      // 走る（ウサギ）とカメ
      const pos = s.k === 0 ? lerp(120, 200, clamp((s.ph + 0.7) / 0.7)) : s.k === 1 ? lerp(200, 520, E.outQ(clamp(aj / 0.5))) + (aj > 0.5 ? (aj - 0.5) * 60 : 0) : lerp(560, 790, E.outQ(clamp(aj / 0.3)));
      const tx = 360 + (s.ph + 0.7) * 30;
      g.rect(792, 450, 16, 230, '#ffffff', 0);
      g.line([860, 690, 860, 330], C.ol, 8);
      { const w = s.k >= 2 ? Math.sin(t * 14) * 12 : Math.sin(t * 4) * 4; g.at(864, 336, () => { const P = [0, 0, 70, w, 140, 0, 140, 90, 70, 90 + w, 0, 90]; g.poly(P, '#ffffff'); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) g.rect(i * 35, j * 30 + w * (i % 2) * 0.5, 35, 30, C.ol, 0); g.poly(P, null); }); }
      g.at(tx, 610, 0, 0.95, 0.95, () => { g.ell(0, -40, 80, 54, '#5aa04a'); for (let i = 0; i < 3; i++) g.circ(-40 + i * 40, -60, 18, '#7cc463', 0); g.circ(84, -40, 26, '#8fcf6a'); g.circ(92, -46, 5, C.ol, 0); g.ell(-40, 6, 20, 12, '#8fcf6a'); g.ell(40, 6, 20, 12, '#8fcf6a'); });
      const run = Math.sin(t * 22), boost = s.k >= 1 ? clamp(1 - aj / 0.6) : 0;
      if (boost > 0) for (let i = 0; i < 3; i++) g.line([pos - 120 - i * 30, 470 + i * 26, pos - 60 - i * 30, 470 + i * 26], '#ffffff', 8);
      g.at(pos, 575 + Math.abs(run) * -10, 0.15, 1.05, 1.05, () => {
        g.cap(-10, 0, -40 - run * 30, 50, 14, '#ffffff'); g.cap(10, 0, 40 + run * 30, 50, 14, '#ffffff');
        g.ell(0, -40, 46, 56, '#ffffff'); g.circ(30, -120, 44, '#ffffff');
        g.ell(10, -190, 14, 46, '#ffffff', 6, -0.3); g.ell(40, -190, 14, 46, '#ffffff', 6, 0.2);
        g.rect(-10, -146, 84, 14, C.red, 0); g.circ(46, -126, 6, C.ol, 0); g.circ(70, -110, 7, '#ff9fbd', 0);
        g.cap(-10, -60, -50 + run * 30, -30, 12, '#ffffff'); g.cap(20, -60, 60 - run * 30, -30, 12, '#ffffff');
        g.rr(-30, -40, 60, 40, 10, '#3a86ff', 4); g.star(0, -20, 14, 6, 5, '#ffffff', 0);
      });
      for (const side of ['L', 'R']) {
        const sg = side === 'L' ? -1 : 1, p = alt ? (s.side === side ? s.p : 1 - s.p) : s.p;
        const x = 500 + sg * lerp(300, 230, p), y = lerp(300, 960, p), sc = lerp(0.9, 1.12, p);
        g.arm(x, y, -PI / 2 + sg * lerp(0.3, -0.4, p), { hand: 'grip', side, s: sc, sleeve: '#ffffff' });
        pompom(g, x + sg * 10 * sc, y - 60 * sc, sc * 0.95, side === 'L' ? C.red : C.yellow, t + (side === 'L' ? 0 : 1));
      }
    },
    hit(g, s, k) {
      if (k === 1) { g.fx.pop('フレー！', 500, 330, { size: 110 }); g.fx.notes(500, 300, 4); }
      else { g.fx.pop('ゴール！', 500, 300, { size: 140, c: C.yellow }); g.fx.confetti(70); g.fx.stars(800, 500, 8); }
      g.fx.shake(k === 2 ? 9 : 5, 0.12);
    },
  },

  /* ---------------- 7. かさ ---------------- */
  {
    id: 'lift-umbrella', acts: ['lift'], modes: ['both', 'one'], theme: 'town', sfx: ['swish', 'chime'],
    vars: [{ k: 'kasa', name: '傘をひらく', short: '傘' }],
    init(s) { s.my.rn = []; for (let i = 0; i < 40; i++) s.my.rn.push([s.r(), s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, t = s.t, aj = s.k ? s.age : 9, one = s.mode === 'one';
      const clear = s.k >= 2 ? clamp(aj / 0.3) : 0;
      g.mirror(one ? s.side : 'R', () => {
        g.bg('#7a8aa0'); g.sky(g.mix('#8796ad', '#5ab8f5', clear), g.mix('#c3ccd8', '#dff4ff', clear), 640);
        if (clear > 0) { g.sun(800, 120, 70); g.alpha(clear, () => { for (let i = 0; i < 6; i++) g.arc(500, 700, 500 - i * 22, PI, 2 * PI, RB[i], 22); }); }
        for (let i = 0; i < 6; i++) { const x = V.x0 + (V.x1 - V.x0) * i / 5, h = 260 + (i * 53) % 120; g.rect(x - 80, 640 - h, 160, h, ['#b9a6c9', '#a6b9c9', '#c9b9a6'][i % 3], 6); for (let j = 0; j < 3; j++) g.rect(x - 50, 660 - h + j * 70, 40, 36, '#e8eef6', 4); }
        g.band(640, 'bottom', '#5c6478', 6); g.rect(V.x0 - 20, 640, V.x1 - V.x0 + 40, 30, '#9aa3b5', 0);
        for (const [a, b] of s.my.rn.slice(0, 8)) g.ell(lerp(V.x0, V.x1, a), 720 + b * 200, 60, 12, g.rgba('#a8c8ff', 0.5 * (1 - clear)), 0);
        const H = hpos(s.p, one ? 560 : 500, 470, { xt: 0, xb: 0, at: 0.05, ab: 0.4 });
        const open = s.k >= 1 ? E.outBack(clamp((s.k === 1 ? aj : aj + 2) / 0.25)) : 0, spin = s.k >= 2 ? E.outQ(clamp(aj / 0.4)) * PI : 0;
        const cx = H.mx, cy = H.my - 300 * H.sc;
        // 雨
        if (clear < 1) g.alpha(1 - clear, () => { for (const [a, b, c] of s.my.rn) { const x = lerp(V.x0, V.x1, a), y = ((b * 1400 + t * 1300 * (0.8 + c * 0.4)) % 1400) + V.y0 - 100; const under = open > 0.5 && Math.abs(x - cx) < 300 * H.sc && y > cy; if (under) continue; g.line([x, y, x - 12, y + 46], '#e6f0ff', 4); } });
        g.line([cx, H.my - 10, cx, cy], C.ol, 14); g.line([cx, H.my - 10, cx, cy], '#5c6478', 7);
        g.at(cx, H.my + 40 * H.sc, 0, H.sc, H.sc, () => { g.curve([0, -60, 0, 30, -20, 76, -50, 76, -70, 50], C.ol, 24); g.curve([0, -60, 0, 30, -20, 76, -50, 76, -70, 50], '#8a5a36', 13); });
        g.at(cx, cy, 0, H.sc, H.sc, () => {
          if (open < 0.05) { g.path('M-30 0 L30 0 L8 -230 L-8 -230 Z', '#e8434f'); g.line([0, -230, 0, -270], C.ol, 8); g.rr(-14, -100, 28, 20, 6, '#ffffff', 4); return; }
          const w = 330 * open, h = 170 * open;
          const N = 8, pts = [];
          for (let i = 0; i <= N; i++) { const a = PI + i / N * PI; pts.push(Math.cos(a) * w, Math.sin(a) * h); }
          for (let i = N; i >= 0; i--) { const x = -w + 2 * w * i / N, sag = (i % 2 ? 26 : 0) * open; pts.push(x, sag); }
          g.poly(pts, '#e8434f');
          for (let i = 0; i < N; i += 2) { const a0 = PI + (i + spin / PI * 2) / N * PI, a1 = PI + (i + 1 + spin / PI * 2) / N * PI; if (a1 > 2 * PI) continue; g.poly([0, -h, Math.cos(a0) * w, Math.sin(a0) * h + 4, Math.cos(a1) * w, Math.sin(a1) * h + 4], '#ffffff', 0); }
          g.poly(pts, null);
          for (let i = 1; i < N; i++) { const a = PI + i / N * PI; g.line([0, -h, Math.cos(a) * w * 0.98, Math.sin(a) * h * 0.98], 'rgba(43,33,64,0.35)', 4); }
          g.line([0, -h, 0, -h - 40], C.ol, 8);
        });
        hands(g, s, H, { hand: 'grip', sleeve: '#ffd23f', at: 0.05, ab: 0.4, oneX: 0 });
        if (!one) g.arm(H.mx - 6, H.my - 100 * H.sc, -PI / 2 + lerp(0.1, 0.5, H.p), { hand: 'grip', side: 'L', s: H.sc * 0.95, sleeve: '#ffd23f' });
      });
    },
    hit(g, s, k) {
      const side = s.mode === 'one' ? s.lastSide : 'R';
      if (k === 1) { g.fx.pop('バサッ', g.mx(side, 250), 560, { size: 100 }); g.fx.burst(g.mx(side, s.mode === 'one' ? 560 : 500), 200, { n: 16, c: ['#e6f0ff', '#ffffff'], shape: 'drop', sp: [300, 700], size: [10, 18], g: 1400, dir: -PI / 2, spread: PI }); }
      else { g.fx.pop('はれた！', 500, 600, { size: 130, c: C.yellow }); g.fx.burst(g.mx(side, s.mode === 'one' ? 560 : 500), 200, { n: 30, c: ['#bfe9ff', '#ffffff'], shape: 'drop', sp: [500, 1000], size: [12, 20], g: 1000, spread: PI * 2 }); g.fx.stars(500, 200, 8); }
      g.fx.shake(k === 2 ? 8 : 5, 0.12);
    },
  },

  /* ---------------- 7b. 交互に手をのばす ---------------- */
  {
    id: 'lift-reach', acts: ['lift'], modes: ['alt', 'one'], vars: REACH,
    sfx: (k, v) => v.sfx[k - 1],
    init(s) { s.my.st = []; for (let i = 0; i < 24; i++) s.my.st.push([s.r(), s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, t = s.t, alt = s.mode === 'alt', m = s.my, R = RT[v.k];
      const first = m.first ?? (m.first = s.side), other = first === 'L' ? 'R' : 'L';
      const ageK = k => s.k >= k ? (s.k === k ? s.age : s.age + s.spr) : -1;   // k 回目からの秒（まだなら -1）
      const done2 = s.k >= 2 ? clamp(s.age / 0.3) : 0;
      // 手の位置と、その手が当たる回
      const hands2 = [];
      if (alt) for (const side of ['L', 'R']) hands2.push({ side, k: side === first ? 1 : 2, T: R[side], p: s.side === side ? s.p : 1 - s.p });
      else {
        if (s.k === 1 && !m.ret && s.p > 0.95) m.ret = 1;
        const kk = s.k === 0 || (s.k === 1 && !m.ret) ? 1 : 2;
        hands2.push({ side: 'R', k: kk, T: R.one[kk - 1], p: s.p, both: true });
      }
      for (const h of hands2) { const sg = h.side === 'L' ? -1 : 1; h.x = lerp(h.T[0], 500 + sg * (alt ? 230 : 140), h.p); h.y = lerp(h.T[1], 950, h.p); h.sc = lerp(0.9, 1.12, h.p); h.sg = sg; }
      const hand = k => alt ? hands2.find(h => h.k === k) : hands2[0];
      g.mirror(alt ? 'R' : s.side, () => {
        if (v.k === 'hi5') {
          g.bg('#8fd16a'); g.sky('#79c9ff', '#dcf3ff', 640); g.cloud(200, 130, 0.7); g.cloud(800, 90, 0.5);
          for (const x of [120, 880]) { g.rect(x - 14, 470, 28, 170, C.bark, 5); g.circ(x, 430, 100, '#3fae5a'); }
          g.band(640, 'bottom', '#8fd16a', 6);
          for (let x = Math.floor(V.x0 / 60) * 60; x < V.x1; x += 60) g.rr(x, 560, 16, 90, 6, '#ffffff', 4); g.rect(V.x0 - 20, 580, V.x1 - V.x0 + 40, 14, '#ffffff', 4);
          const jump = s.k >= 2 ? Math.abs(Math.sin(s.age * 9)) * 30 * done2 : 0;
          // 左の友だち（うさぎ）・右の友だち（くま）
          const kL = alt ? (first === 'L' ? 1 : 2) : 0, kR = alt ? (first === 'R' ? 1 : 2) : 1;
          const aL = kL ? ageK(kL) : (s.k >= 2 ? s.age : -1), aR = ageK(alt ? kR : Math.min(2, Math.max(1, s.k)));
          const pawL = [R.L[0], R.L[1] - 60], pawR = alt ? [R.R[0], R.R[1] - 60] : [R.one[0][0], R.one[0][1] - 60];
          buddy(g, 205, 840 - jump - Math.max(0, jig(aL, 30, 16, 6)), 1.4, 'bunny', aL >= 0, pawL[0], pawL[1] - jump, t);
          buddy(g, 795, 840 - jump - Math.max(0, jig(aR, 30, 16, 6)), 1.4, 'bear', aR >= 0 && (alt || s.k >= 1), pawR[0], pawR[1] - jump, t);
        } else if (v.k === 'lantern') {
          const all = done2;
          g.bg('#1a1640', '#3a2560');
          for (const [a, b] of s.my.st) g.circ(lerp(V.x0, V.x1, a), lerp(V.y0, 120, b), 2 + b * 2, 'rgba(255,255,255,0.6)', 0);
          for (let i = 0; i < 6; i++) { const x = V.x0 + (V.x1 - V.x0) * (i + 0.5) / 6; g.rect(x - 110, 640, 220, 200, '#2a1f45', 0); g.poly([x - 130, 650, x, 590, x + 130, 650], '#c0392b', 0); }
          g.band(840, 'bottom', '#2a2140');
          for (let x = Math.ceil((V.x0 - 40) / 130) * 130; x < V.x1 + 40; x += 130) { const yy = 520 + 30 * Math.sin(x * 0.01); if (all > 0) g.glow(x, yy, 70, '#ffb347', 0.5 * all); g.ell(x, yy, 26, 32, all > 0 ? '#ff7a3a' : '#6a2a30', 4); }
          g.rr(V.x0 - 40, 132, V.x1 - V.x0 + 80, 26, 8, '#7a4a2a', 6);
          const hooks = alt ? [R.L, R.R] : R.one;
          for (const [hx] of hooks) g.line([hx, 158, hx, 172], C.ol, 6);
          // 吊るしたちょうちん
          if (alt) { for (const side of ['L', 'R']) { const k = side === first ? 1 : 2, a = ageK(k); if (a >= 0) chochin(g, R[side][0], 290, 1.2, 1, jig(a, 0.25, 9, 3) + Math.sin(t * 2 + k) * 0.03); } }
          else for (const k of [1, 2]) { const a = ageK(k); if (a >= 0) chochin(g, R.one[k - 1][0], 290, 1.2, 1, jig(a, 0.25, 9, 3) + Math.sin(t * 2 + k) * 0.03); }
        } else {   // bird
          g.bg('#9fe08a'); g.sky('#7fd0ff', '#e3f7ff', 720); g.cloud(220, 420, 0.6);
          g.rect(V.x0 - 20, V.y0 - 20, 140 - V.x0, 1100, C.bark, 7);
          g.circ(60, 60, 200, '#4cb85c', 0); g.circ(400, -60, 220, '#4cb85c', 0); g.circ(800, -40, 230, '#4cb85c', 0);
          g.band(720, 'bottom', '#9fe08a', 6); for (const [x, c] of [[260, C.pink], [520, C.yellow], [760, '#c4a6ff']]) { g.line([x, 720, x, 800], '#3d9a46', 6); g.circ(x, 712, 18, c, 4); }
          g.curve([V.x0 - 40, 285, 300, 262, 600, 258, V.x1 + 40, 245], C.ol, 32); g.curve([V.x0 - 40, 285, 300, 262, 600, 258, V.x1 + 40, 245], C.bark, 20);
        }
        // 手
        const sorted = hands2.slice().sort((a, b) => b.p - a.p);
        for (const h of sorted) g.arm(h.x, h.y, -PI / 2 - h.sg * lerp(0.08, 0.45, h.p), { hand: v.k === 'lantern' ? 'palm' : 'open', side: h.side, s: h.sc, sleeve: v.sleeve });
        // 手に持つ・手にとまるもの（手の上に描く）
        if (v.k === 'lantern') {
          for (const h of hands2) {
            const hung = alt ? s.k >= h.k : s.k >= h.k;
            const got = alt ? 1 : h.k === 1 ? 1 : (s.k >= 1 && m.ret ? E.outBack(clamp((t - (m.rt ?? (m.rt = t))) / 0.2)) : 0);
            if (!hung && got > 0) chochin(g, h.x, h.y - 120 * h.sc, 1.2 * h.sc * got, 0);
          }
        } else if (v.k === 'bird') {
          const cols = [['#4f9df5', '#e6f2ff'], ['#ffd23f', '#fff6c8']];
          for (const k of [1, 2]) {
            const h = hand(k), a = ageK(k), T = alt ? h.T : R.one[k - 1], perchX = T[0] + (k === 2 && !alt ? 50 : 0);
            if (a < 0) { const look = clamp(1 - h.p / 0.3); bird(g, perchX, 222 + look * 10, 0.8, t, look > 0.5, cols[k - 1][0], cols[k - 1][1]); continue; }
            const f = clamp(a / 0.25), hh = alt ? h : hands2[0];
            const fx = lerp(perchX, hh.x + (k === 2 && !alt ? 50 : -6) * hh.sc, f), fy = lerp(222, hh.y - 128 * hh.sc, f) - 70 * Math.sin(PI * f);
            bird(g, fx, fy, 0.8 * lerp(1, hh.sc, f), t, f < 1, cols[k - 1][0], cols[k - 1][1]);
          }
        }
      });
    },
    hit(g, s, k, v) {
      const alt = s.mode === 'alt', R = RT[v.k];
      s.my.first = s.my.first ?? (k === 1 ? s.lastSide : s.lastSide === 'L' ? 'R' : 'L');
      const T = alt ? R[s.lastSide] : R.one[k - 1], X = alt ? T[0] : g.mx(s.lastSide, T[0]);
      if (v.k === 'hi5') { g.fx.lines(X, T[1] - 60, { n: 10, r0: 70, r1: 160, w: 10 }); g.fx.burst(X, T[1] - 60, { n: 8, c: [C.yellow, '#ffffff'], shape: 'star', sp: [200, 500], size: [14, 22], g: 500 }); }
      else if (v.k === 'lantern') { g.fx.burst(X, 280, { n: 10, c: ['#ffd27a', '#ffffff'], shape: 'spark', sp: [300, 700], size: [14, 24], g: 400 }); }
      else { g.fx.notes(X, T[1] - 200, 3); }
      g.fx.pop(v.pop[k - 1], 500, k === 1 ? 600 : 640, { size: k === 2 ? 120 : 100, c: k === 2 ? C.yellow : '#ffffff' });
      if (k === 2) { if (v.k === 'bird') g.fx.hearts(500, 360, 7); else g.fx.confetti(60); }
      g.fx.shake(k === 2 ? 8 : 5, 0.12);
    },
  },

  /* ---------------- 8. 投げ上げる ---------------- */
  {
    id: 'lift-toss', acts: ['lift'], modes: ['both'], vars: TOSS,
    sfx: (k, v) => v.sfx[k - 1],
    init(s) { s.my.br = []; for (let i = 0; i < 16; i++) s.my.br.push([s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, t = s.t, aj = s.k ? s.age : 9;
      const H = hpos(s.p, 500, 470, { xt: v.k === 'pizza' ? 40 : 120, xb: v.k === 'pizza' ? 120 : 210, at: 0.05, ab: 0.45 });
      const T = 0.62, up = s.k ? Math.sin(PI * clamp(aj / T)) * (s.k === 2 ? 420 : 300) : 0;
      if (v.k === 'teddy') {
        g.bg('#ffe9d6', '#fff6e8'); g.stripes(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 760 - V.y0, 70, '#ffe9d6', '#ffdfc6');
        pennants(g, 100, [C.red, C.yellow, C.blue, C.green]);
        g.band(760, 'bottom', '#9fd9c2', 6);
        for (const [bx, by, c] of [[150, 420, C.red], [860, 380, C.blue], [780, 560, C.yellow]]) { g.line([bx, by + 70, bx + 10, by + 220], C.ol, 3); g.ell(bx, by, 56, 68, c); g.hl(bx - 18, by - 24, 10, 18, -0.4, 0.5); }
        teddy(g, H.mx, H.my - 160 * H.sc - up, H.sc * 1.05, s.k ? Math.sin(aj * 9) * 0.25 * clamp(1 - aj / T) : 0, s.k > 0);
      } else {
        g.bg('#c98b52'); g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 720 - V.y0, '#b5533c', 0);
        for (const [a, b] of s.my.br) g.rr(lerp(V.x0, V.x1, a) - 56, lerp(Math.max(V.y0, -300), 640, b), 112, 50, 6, '#c4614a', 0);
        g.rect(V.x0 - 20, 620, V.x1 - V.x0 + 40, 100, '#9a4532', 0);
        g.path('M620 720 L620 520 Q760 360 900 520 L900 720 Z', '#8a8f9e', 7); g.path('M680 720 L680 600 Q760 520 840 600 L840 720 Z', '#2b2140', 0);
        g.glow(760, 660, 120, '#ff9f43', 0.7); for (let i = 0; i < 3; i++) g.path(`M${700 + i * 40} 720 q20 -50 0 -90 q30 30 20 90 Z`, i % 2 ? C.yellow : C.orange, 0);
        g.band(720, 'bottom', '#e8d6b8', 6);
        const r = s.k === 0 ? 140 : s.k === 1 ? lerp(140, 175, clamp(aj / 0.3)) : lerp(175, 215, clamp(aj / 0.3));
        const top = s.k >= 2 ? E.outBack(clamp(aj / 0.25)) : 0, spinA = t * 8;
        g.at(H.mx, H.my - 150 * H.sc - up, 0, H.sc, H.sc * 0.42, () => {
          g.circ(0, 0, r, '#f3dcae'); g.ring(0, 0, r * 0.86, '#e5c48a', 10);
          g.at(0, 0, spinA, 1, 1, () => { g.line([-r * 0.5, 0, r * 0.5, 0], 'rgba(200,160,100,0.5)', 8); g.line([0, -r * 0.5, 0, r * 0.5], 'rgba(200,160,100,0.5)', 8); });
          if (top > 0) g.at(0, 0, spinA, top, top, () => pizzaTop(g, r));
          g.circ(0, 0, r, null);
        });
      }
      hands(g, s, H, { hand: v.k === 'pizza' ? 'point' : 'palm', sleeve: v.sleeve, at: 0.05, ab: 0.45 });
    },
    hit(g, s, k, v) {
      if (v.k === 'teddy') {
        if (k === 1) { g.fx.pop('ポーン', 760, 560, { size: 100 }); g.fx.stars(500, 300, 6); }
        else { g.fx.pop('バンザーイ', 500, 640, { size: 110, c: C.yellow }); g.fx.confetti(70); g.fx.stars(500, 200, 10); }
      } else {
        g.fx.burst(500, 300, { n: 10, c: ['#ffffff', '#f3dcae'], shape: 'dot', sp: [150, 400], size: [8, 14], g: 600 });
        if (k === 1) g.fx.pop('クルクル', 300, 560, { size: 96 });
        else { g.fx.pop('ピザ完成！', 500, 640, { size: 120, c: C.yellow }); g.fx.stars(500, 200, 10); }
      }
      g.fx.shake(k === 2 ? 8 : 5, 0.12);
    },
  },
];
