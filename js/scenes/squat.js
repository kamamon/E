/* しゃがむ — よける・座る・拾う など（p=0 がいちばん低い所） */
import { C, E, clamp, lerp, sh } from '../kit.js';


/* =========================================================================
   ここから追加の場面（座る・掘る・くぐる・隠れる・拾う…）
   s.p: 0 = いちばん低い（当たる瞬間）、1 = 立っている。景色は SH(s) だけ上へずらす。
   ========================================================================= */
const PI = Math.PI, TAU = PI * 2;
const SH = s => -230 * (1 - s.p);                 // しゃがむと景色が上へ
const LOW = s => E.sm(clamp(1 - s.p));             // 0 立つ → 1 しゃがむ
const AGE = (s, k) => s.k >= k ? (s.k === k ? s.age : s.age + s.spr * (s.k - k)) : -1;   // k回目からの秒（まだなら -1）
// ひざ（しゃがむと下から見えてくる）
function knees(g, s, o = {}) {
  const t = LOW(s); if (t < 0.03) return;
  const y = lerp(1420, o.y ?? 880, t);
  for (const sd of [-1, 1]) g.knee(500 + sd * (o.dx ?? 230), y, -PI / 2 + sd * 0.22, { pants: o.pants ?? '#5b7fd6', s: o.s ?? 0.92 });
}
// 下から伸びる腕（手の位置 x,y と、腕の根もと bx,by から向きを決める）
function reach(g, x, y, bx, by, o = {}) { g.arm(x, y, Math.atan2(y - by, x - bx), o); }
function face(g, x, y, k, m, o = {}) {
  const ink = o.ink ?? C.ol;
  g.at(x, y, 0, k, k, () => {
    if (m === 2) { g.line([-50, -18, -28, -6, -50, 6], ink, 8); g.line([50, -18, 28, -6, 50, 6], ink, 8); }
    else if (m === 3) { g.arc(-36, 2, 16, PI + 0.45, -0.45, ink, 8); g.arc(36, 2, 16, PI + 0.45, -0.45, ink, 8); }
    else { const r = m === 1 ? 14 : 11; g.circ(-36, -6, r, ink, 0); g.circ(36, -6, r, ink, 0); g.circ(-32, -11, 4, '#fff', 0); g.circ(40, -11, 4, '#fff', 0); }
    if (o.cheek !== false) { g.ell(-62, 22, 16, 9, 'rgba(255,100,130,0.42)', 0); g.ell(62, 22, 16, 9, 'rgba(255,100,130,0.42)', 0); }
    if (m === 1) g.ell(0, 36, 13, 16, '#8a2f3f', 6);
    else if (m === 2) g.path('M-30 26 Q0 66 30 26 Z', '#8a2f3f', 6);
    else if (m === 3) g.path('M-28 22 Q0 62 28 22 Z', '#8a2f3f', 6);
    else g.arc(0, 16, 20, 0.35, PI - 0.35, ink, 7);
  });
}
function splatPts(r, n, r0, r1) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = i % 2 ? r0 + r() * (r1 - r0) * 0.5 : r1 * (0.8 + r() * 0.2); p.push(Math.cos(a) * rr, Math.sin(a) * rr); } return p; }
function dotRow(g, x0, x1, y, step, r, col) { let d = ''; for (let x = x0; x <= x1; x += step) d += `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; if (d) g.path(d, col, 0); }
const ALL = ['both', 'one', 'alt'];
// 見えている範囲 V だけで決まる形の文字列を作って覚えておく（毎コマ作り直さない・キャッシュを増やさない）
function vpath(s, key, V, build) { const k = key + V.x0 + ',' + V.y0 + ',' + V.x1; if (!s.my.vp) s.my.vp = {}; return s.my.vp[key] && s.my.vp[key][0] === k ? s.my.vp[key][1] : (s.my.vp[key] = [k, build()])[1]; }
const rectsPath = rs => rs.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}Z`).join('');

/* ---------- 1. いすに座る（ブーブークッション） ---------- */
function sibling(g, m, t) {
  // m: 0 もぐもぐ / 1 びっくり / 2 大笑い
  const shake = m === 2 ? Math.sin(t * 40) * 4 : 0;
  g.at(500, 0, 0, 1, 1, () => {
    g.rr(-120, 560, 240, 240, 80, '#ff8fb1'); g.rr(-120, 560, 240, 60, 30, '#ffb3cb', 0); g.rr(-120, 560, 240, 240, 80, null);
    g.at(shake, 0, () => {
      for (const sd of [-1, 1]) { g.circ(sd * 104, 430, 34, '#5a3426'); g.rr(sd * 104 - 14, 400, 28, 20, 8, C.yellow, 4); }
      g.circ(0, 470, 98, C.skin);
      g.path('M-98 470 Q-104 360 0 360 Q104 360 98 470 Q70 410 0 404 Q-70 410 -98 470 Z', '#5a3426');
      face(g, 0, 488, 0.95, m === 0 ? 0 : m === 1 ? 1 : 2);
      if (m === 2) { g.path('M-60 470 q-10 20 0 32 q10 -12 0 -32 Z', C.water, 4); g.path('M60 470 q-10 20 0 32 q10 -12 0 -32 Z', C.water, 4); }
      if (m === 1) { g.rr(120, 350, 22, 70, 10, C.red, 5); g.circ(131, 440, 11, C.red, 5); }
    });
    // 手とフォーク
    const fy = m === 1 ? -60 : 0;
    g.line([-130, 700 + fy, -150, 610 + fy], '#c8cfdc', 8); g.circ(-128, 702 + fy, 24, C.skin);
    g.circ(128, 702, 24, C.skin);
  });
}
function cat(g, x, y, m, t) {
  // m: 0 寝ている / 1 起きた / 2 とび上がる
  g.at(x, y - (m === 2 ? 120 * Math.abs(Math.sin(Math.min(t, 0.6) * 5)) : 0), 0, 1, 1, () => {
    const col = '#ffb35a', dk = '#e8892a';
    if (m === 0) { g.ell(0, -36, 80, 44, col); g.path('M-70 -20 Q-110 -10 -96 -52', null, 0); g.ell(-56, -50, 40, 34, col); for (const sd of [-1, 1]) g.tri(-56 + sd * 26, -74, -56 + sd * 8, -76, -56 + sd * 22, -100, col, 5); g.arc(-70, -50, 8, 0.2, PI - 0.2, C.ol, 4); g.arc(-44, -50, 8, 0.2, PI - 0.2, C.ol, 4); g.path('M70 -20 Q120 -10 104 -60 Q96 -30 66 -40 Z', dk, 5); for (const xx of [-10, 20, 46]) g.line([xx, -78, xx + 6, -60], dk, 5); return; }
    g.ell(0, -50, 60, 54, col); g.path('M50 -30 Q110 -60 90 -130 Q80 -90 50 -70 Z', dk, 5);
    g.circ(0, -120, 46, col); for (const sd of [-1, 1]) g.tri(sd * 40, -142, sd * 10, -158, sd * 34, -186, col, 5);
    if (m === 2) { g.circ(-16, -124, 10, '#fff', 4); g.circ(16, -124, 10, '#fff', 4); g.circ(-16, -124, 4, C.ol, 0); g.circ(16, -124, 4, C.ol, 0); g.ell(0, -100, 8, 9, '#8a2f3f', 4); for (const a of [-1, -0.5, 0.5, 1]) g.line([Math.sin(a) * 60, -120 - Math.cos(a) * 60, Math.sin(a) * 80, -120 - Math.cos(a) * 80], C.ol, 5); }
    else { g.circ(-16, -124, 7, C.ol, 0); g.circ(16, -124, 7, C.ol, 0); g.path('M-8 -104 Q0 -98 8 -104', null, 4); }
  });
}
const tplCushion = {
  id: 'squat-cushion', acts: ['squat'], modes: ALL, theme: 'home', sfx: 'boo',
  vars: [{ k: 'chair', name: 'いすに座る', short: 'いす' }],
  draw(g, s) {
    const V = g.V, dy = SH(s);
    g.bg('#ffe6c9');
    g.at(0, dy, () => {
      g.stripes(V.x0 - 40, V.y0 - 300, V.x1 - V.x0 + 80, 1300 - V.y0, 60, '#ffe6c9', '#fbdcb9');
      g.rr(130, 200, 250, 220, 10, '#ffffff', 7); g.rect(146, 216, 218, 188, g.lin(0, 216, 0, 404, ['#2b3a78', '#5a4fa0']), 0); g.circ(300, 270, 26, '#fff3c4', 0); g.line([255, 216, 255, 404], '#ffffff', 7); g.rect(146, 216, 218, 188, null, 5);
      g.path('M120 196 Q180 300 150 430 L120 430 Z', '#ff9f6b', 5); g.path('M390 196 Q330 300 360 430 L390 430 Z', '#ff9f6b', 5);
      g.rr(640, 230, 220, 160, 8, '#c98b52', 7); g.rect(656, 246, 188, 128, '#bfe6ff', 0); g.path('M656 374 L720 290 L770 340 L800 310 L844 374 Z', '#6cbf4f', 0); g.circ(800, 280, 14, C.yellow, 0); g.rect(656, 246, 188, 128, null, 4);
      g.band(980, 'bottom', '#c98b52', 7); g.planks(V.x0 - 20, 986, V.x1 - V.x0 + 40, 600, 5, '#c98b52');
      const m = s.k >= 2 ? 2 : s.k >= 1 ? 1 : 0;
      sibling(g, m, s.t);
      // テーブル
      g.rect(170, 830, 30, 200, '#8a5634', 6); g.rect(800, 830, 30, 200, '#8a5634', 6);
      g.path('M170 760 L830 760 L890 820 L110 820 Z', '#e0a868', 7); g.rr(110, 816, 780, 34, 8, '#c98b52', 7);
      g.ell(500, 785, 80, 20, '#ffffff', 5); g.path('M460 782 L540 782 L530 742 L470 742 Z', '#fff3e0', 5); g.rect(470, 742, 60, 12, '#ff8fb1', 0); g.circ(500, 732, 12, C.red, 4);
      g.rr(250, 742, 56, 50, 12, '#7cc8ff', 6); g.arc(316, 765, 14, -1.4, 1.4, C.ol, 6);
      g.ell(500, 812, 90, 14, '#ffffff', 5);
      cat(g, 820, 1060, m, AGE(s, 2));
    });
    // ひざとクッション
    const t = LOW(s); if (t > 0.03) {
      const ky = lerp(1420, 880, t), d = s.k >= 2 ? 0.35 : s.k >= 1 ? 0.65 : 1;
      const sq = Math.max(s.k >= 1 && s.age < 0.4 ? 0.2 * Math.exp(-8 * s.age) : 0, 0);
      g.at(500, ky + 50, 0, 1 + sq, d * (1 - sq), () => { g.ell(0, 0, 190, 80, '#ff7aa8'); g.ell(-40, -26, 90, 24, 'rgba(255,255,255,0.3)', 0); });
      g.at(500, ky + 50 - 74 * d, 0, 1, 1, () => { g.rr(-30, -54, 60, 64, 18, '#ff7aa8'); g.ell(0, -54, 24, 8, '#e0507e', 4); });
      knees(g, s);
    }
  },
  hit(g, s, k) {
    g.fx.smoke(500, 800, k === 2 ? 9 : 5, '#f6ecff'); g.fx.lines(500, 830, { n: 8, r0: 80, r1: 170, a0: PI + 0.4, arc: PI - 0.8, w: 10 }); g.fx.shake(k === 2 ? 10 : 6, 0.14);
    if (k === 1) g.fx.pop('ブッ', 500, 780, { size: 120 });
    else { g.fx.pop('ブブーッ！', 500, 770, { size: 130, c: C.yellow }); g.fx.pop('あはは', 790, 140, { size: 80, c: '#ff8fb1' }); }
  },
};

/* ---------- 2. おいもを掘る ---------- */
function imo(g, r, w = 1) { g.at(0, 0, r, w, w, () => { g.path('M-62 0 C-56 -30 -10 -34 30 -26 C56 -20 70 -6 64 6 C56 24 20 30 -20 26 C-50 22 -66 14 -62 0 Z', '#c23a6e', 6); g.path('M-56 -6 C-40 -20 10 -24 40 -14', 'rgba(255,255,255,0.3)', 0); g.line([-62, 0, -88, 4], C.ol, 4); g.ell(-20, -14, 12, 5, 'rgba(255,255,255,0.35)', 0); }); }
function imoLeaf(g, x, y, k, a) { g.at(x, y, a, k, k, () => { g.line([0, 30, 0, 0], '#3c8a3a', 6); g.path('M0 0 C-30 -10 -40 -50 -16 -64 C-6 -70 0 -60 0 -56 C0 -60 6 -70 16 -64 C40 -50 30 -10 0 0 Z', '#4cbf5a', 5); g.line([0, -4, 0, -52], '#3c9a4c', 3); }); }
const tplImo = {
  id: 'squat-imo', acts: ['squat'], modes: ALL, theme: 'farm', sfx: ['crunch', 'pop'],
  vars: [{ k: 'satsuma', name: 'おいもを掘る', short: '芋掘り' }],
  init(s) { s.my.lv = Array.from({ length: 16 }, (_, i) => [((i * 137) % 1000) / 1000, Math.floor(i / 4), s.r() * 0.6 - 0.3]); },
  draw(g, s) {
    const V = g.V, dy = SH(s), a2 = AGE(s, 2), a1 = AGE(s, 1);
    g.bg('#bfe6ff'); g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 800, g.lin(0, V.y0, 0, 560, ['#6ec1f5', '#dff3ff']), 0);
    g.at(0, dy, () => {
      g.cloud(200, 120, 0.6); g.cloud(820, 80, 0.5);
      g.hills(400, '#8fd16a', 50, 3, 4); g.band(390, 'bottom', '#9b623d', 7);
      const rows = [440, 520, 630, 780];
      rows.forEach((y, j) => { const h = 16 + j * 14; g.band(y - h, y + h, '#b5774b'); g.line([V.x0, y - h, V.x1, y - h], 'rgba(70,35,20,0.3)', 4); });
      for (const [fx, j, a] of s.my.lv) { const y = rows[j] - 12 - j * 8, k = 0.5 + j * 0.25; if (j === 3 && Math.abs(fx - 0.5) < 0.18) continue; imoLeaf(g, V.x0 + fx * (V.x1 - V.x0), y, k, a); }
      // ねらいのつる
      const G = [500, 760];
      if (a1 >= 0) { g.path(`M${G[0] - 80} ${G[1] + 26} L${G[0] - 40} ${G[1] + 6} L${G[0] - 10} ${G[1] + 30} L${G[0] + 30} ${G[1] + 4} L${G[0] + 76} ${G[1] + 24}`, null, 6); }
      if (a2 < 0) {
        for (const [x, a] of [[-50, -0.5], [0, 0], [50, 0.5], [-24, -0.2], [26, 0.25]]) imoLeaf(g, G[0] + x, G[1] - 4, 1.15, a);
        g.line([G[0], G[1] + 20, G[0], G[1] - 10], '#3c8a3a', 9);
        if (a1 >= 0) { const e = E.outBack(clamp(a1 / 0.2)); for (const [x, r] of [[-70, -0.5], [0, 0.1], [70, 0.6]]) g.at(G[0] + x, G[1] + 50 - 26 * e, r - PI / 2 + 0.2, 0.8, 0.8, () => g.clipRR(-100, -50, 100, 100, 0, () => imo(g, 0))); }
      } else {
        // 掘り出したおいも
        const e = clamp(a2 / 0.22), up = E.outBack(e) * 230;
        g.ell(G[0], G[1] + 30, 130, 34, '#6e3f22', 0);
        g.at(G[0], G[1] + 20 - up, 0, 1.45, 1.45, () => {
          g.curve([0, -60, -50, -10, -80, 40], '#3c8a3a', 7); g.curve([0, -60, 0, 0, 10, 60], '#3c8a3a', 7); g.curve([0, -60, 60, -10, 90, 36], '#3c8a3a', 7);
          imo(g, 1.9, 1.1); g.at(-80, 40, 0, 1, 1, () => imo(g, 1.3, 0.9)); g.at(90, 36, 0, 1, 1, () => imo(g, 2.2, 1)); g.at(10, 70, 0, 1, 1, () => imo(g, 1.6, 1.05));
          for (const [x, a] of [[-30, -0.5], [0, 0], [30, 0.5]]) imoLeaf(g, x, -60, 1, a);
        });
      }
    });
    // 手（しゃがむと、つるの根もとをつかむ）
    const t = LOW(s); if (t > 0.05) for (const sd of [-1, 1]) {
      const x = lerp(500 + sd * 330, 500 + sd * 46, t), y = lerp(1250, 760 + dy + 10, t);
      reach(g, x, y, 500 + sd * 520, 1500, { hand: 'grip', side: sd < 0 ? 'L' : 'R', s: 1.05, sleeve: '#3cc46b' });
    }
  },
  hit(g, s, k) {
    g.fx.chips(500, 560, '#8b5a3c', k === 2 ? 16 : 10); g.fx.shake(k === 2 ? 10 : 6, 0.14);
    if (k === 1) g.fx.pop('うんしょ', 240, 230, { size: 90 });
    else { g.fx.pop('ズボッ！', 500, 160, { size: 130, c: C.yellow }); g.fx.stars(500, 400, 10); g.sfx('cheer'); }
  },
};

/* ---------- 3. リンボーダンス ---------- */
function limboBar(g, sc, gold) {
  const L = 340;
  for (const sd of [-1, 1]) { g.rect(sd * L - 10, 0, 20, 420, '#7a4a2a', 5); g.ell(sd * L, 420, 40, 12, '#5a3a22', 4); }
  g.rr(-L - 30, -14, 2 * L + 60, 28, 14, gold ? '#ffd23f' : '#e6c27a', 5);
  for (let x = -L + 40; x < L; x += 80) g.line([x, -12, x, 12], gold ? '#e0a81f' : '#c49a52', 5);
  if (gold) for (let x = -L + 20; x < L; x += 44) g.circ(x, 22, 13, ['#ff5a7a', '#ffffff', '#ffb703'][Math.abs(Math.round(x / 44)) % 3], 4);
}
const tplLimbo = {
  id: 'squat-limbo', acts: ['squat'], modes: ALL, theme: 'party', sfx: 'whoosh',
  vars: [{ k: 'beach', name: 'リンボーダンス', short: 'リンボー' }],
  draw(g, s) {
    const V = g.V, dy = SH(s);
    g.bg('#ffb37a'); g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 900 - V.y0, g.lin(0, V.y0, 0, 520, ['#7a4fd0', '#ff7aa8', '#ffc27a']), 0);
    g.at(0, dy, () => {
      g.sun(500, 420, 80, '#ffe08a');
      g.band(420, 520, '#3a6fd8'); for (let i = 0; i < 6; i++) g.rr(500 - 30 - i * 10, 436 + i * 14, 60 + i * 20, 6, 3, 'rgba(255,230,150,0.7)', 0);
      g.band(510, 'bottom', '#f2d49b', 7);
      for (const sd of [-1, 1]) {
        const x = 500 + sd * 420;
        g.curve([x, 920, x - sd * 30, 600, x + sd * 40, 300], '#8a5a36', 30); g.curve([x, 920, x - sd * 30, 600, x + sd * 40, 300], '#a8703a', 18);
        for (let i = 0; i < 5; i++) { const a = -PI / 2 + (i - 2) * 0.62; g.at(x + sd * 40, 300, a + PI / 2, 1, 1, () => g.path('M0 0 Q30 -60 0 -170 Q-30 -60 0 0 Z', i % 2 ? '#3fae5a' : '#2f8f4a', 5)); }
      }
      for (const sd of [-1, 1]) { const x = 500 + sd * 250, fl = Math.sin(s.t * 14 + sd); g.rect(x - 8, 520, 16, 120, '#7a4a2a', 4); g.glow(x, 500, 70, '#ffb34a', 0.5); g.at(x, 522, fl * 0.12, 1, 1 + fl * 0.1, () => g.path('M-18 0 Q-20 -42 0 -62 Q20 -42 18 0 Z', '#ff8a2a', 4)); }
      // 友だち（奥で応援）
      for (const [x, c] of [[400, '#ff8fb1'], [600, '#5ac8fa']]) { const hop = s.k >= 2 ? -Math.abs(Math.sin(s.t * 14)) * 16 : 0; g.at(x, 600 + hop, 0, 0.5, 0.5, () => { g.rr(-60, -100, 120, 120, 40, c); g.circ(0, -150, 56, C.skin); face(g, 0, -146, 0.6, s.k >= 2 ? 3 : 0); g.cap(-60, -80, -100, -170, 16, C.skin); g.cap(60, -80, 100, -170, 16, C.skin); }); }
      // 近づいてくる棒（当たる瞬間に頭の上を通る）
      for (const j of [0, 1]) {
        const q = (s.ph - (j - 0.82)) / 0.95; if (q <= 0 || q >= 1) continue;
        const c = 0.82 / 0.95, sc = lerp(0.22, 2.6, Math.pow(q / c, 2.2)), y = q < c ? lerp(470 + j * 26, 262, Math.pow(q / c, 1.4)) : 262 - (q - c) * 3000;
        g.at(500, y, 0, sc, sc, () => limboBar(g, sc, j === 1));
      }
    });
    const t = LOW(s); if (t > 0.05) for (const sd of [-1, 1]) g.arm(500 + sd * lerp(560, 400, t), lerp(1150, 760, t), -PI / 2 + sd * 0.9, { hand: 'open', side: sd < 0 ? 'L' : 'R', s: 1.05, sleeve: '#ff5a7a' });
  },
  hit(g, s, k) {
    g.fx.lines(500, -40, { n: 12, r0: 160, r1: 320, a0: 0.2, arc: PI - 0.4 });
    if (k === 1) g.fx.pop('セーフ！', 500, 640, { size: 104 });
    else { g.fx.pop('すごい！', 500, 620, { size: 130, c: C.yellow }); g.fx.confetti(70); g.sfx('cheer'); }
  },
};

/* ---------- 4. おばけから隠れる ---------- */
function ghost(g, hat, t) {
  const w = Math.sin(t * 8) * 6;
  g.glow(0, 0, 200, '#e8e4ff', 0.4);
  g.path('M-90 40 C-90 -60 -50 -110 0 -110 C50 -110 90 -60 90 40 L70 90 L40 60 L10 96 L-20 62 L-50 94 L-74 60 Z', '#ffffff', 7);
  g.cap(-86, 10, -130, -20 + w, 20, '#ffffff'); g.cap(86, 10, 130, -20 - w, 20, '#ffffff');
  g.ell(-32, -30, 14, 20, C.ol, 0); g.ell(32, -30, 14, 20, C.ol, 0); g.circ(-28, -38, 5, '#fff', 0); g.circ(36, -38, 5, '#fff', 0);
  g.ell(0, 16, 18, 22, '#ff7aa8', 6); g.ell(-56, -4, 14, 8, 'rgba(255,120,160,0.4)', 0); g.ell(56, -4, 14, 8, 'rgba(255,120,160,0.4)', 0);
  if (hat) { g.path('M-70 -96 L70 -96 L40 -110 L10 -220 L-20 -110 Z', '#5a3aa0', 6); g.rr(-90, -108, 180, 22, 10, '#5a3aa0', 6); g.rect(-34, -128, 68, 14, C.yellow, 0); }
}
function pumpkin(g, x, y, k) { g.at(x, y, 0, k, k, () => { g.ell(0, -50, 70, 52, '#ff8a1f'); g.ell(0, -50, 30, 52, '#ff9f3a', 5); g.rr(-8, -112, 16, 24, 6, '#5a8a2a', 4); g.tri(-34, -62, -14, -62, -24, -78, '#ffd23f', 0); g.tri(14, -62, 34, -62, 24, -78, '#ffd23f', 0); g.path('M-36 -36 L-24 -26 L-12 -36 L0 -26 L12 -36 L24 -26 L36 -36 L24 -16 L-24 -16 Z', '#ffd23f', 0); }); }
const tplGhost = {
  id: 'squat-ghost', acts: ['squat'], modes: ALL, theme: 'spooky', sfx: 'whoosh',
  vars: [{ k: 'wall', name: 'おばけから隠れる', short: 'おばけ' }],
  draw(g, s) {
    const V = g.V, dy = SH(s);
    g.bg('#1a1640'); g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 1000 - V.y0, g.lin(0, V.y0, 0, 700, ['#120f33', '#3a2a6e']), 0);
    g.at(0, dy, () => {
      g.glow(760, 150, 180, '#fff6c8', 0.3); g.circ(760, 150, 66, '#fff3c4', 0);
      for (const [x, k] of [[150, 1], [870, 0.8], [-200, 0.9], [1200, 1]]) g.at(x, 640, 0, k, k, () => { g.line([0, 0, 0, -300], '#120f26', 26); g.line([0, -160, -90, -260], '#120f26', 16); g.line([0, -220, 70, -330], '#120f26', 14); g.line([-50, -210, -60, -290], '#120f26', 10); });
      g.band(620, 'bottom', '#2b2450', 7);
      for (let x = Math.floor((V.x0 - 60) / 90) * 90; x < V.x1 + 60; x += 90) g.path(`M${x} 620 L${x} 540 L${x + 20} 520 L${x + 40} 540 L${x + 40} 620 Z`, '#3a3168', 5);
      pumpkin(g, 300, 700, 0.9); pumpkin(g, 700, 690, 0.8); pumpkin(g, 520, 660, 0.55);
      for (const j of [0, 1]) {
        const q = (s.ph - (j - 0.8)) / 0.95; if (q <= 0 || q >= 1) continue;
        const c = 0.8 / 0.95, sc = lerp(0.25, 2.1, Math.pow(q / c, 2)), y = q < c ? lerp(440, 330, q / c) : 330 - (q - c) * 3200;
        g.at(500 + (j ? 60 : -60) * q, y, (j ? 0.15 : -0.15) * Math.sin(q * 6), sc, sc, () => ghost(g, j === 1, s.t));
      }
    });
    // 手前の石垣（近いので大きく動く）
    const wy = lerp(430, 790, E.sm(s.p));
    g.rect(V.x0 - 10, wy, V.x1 - V.x0 + 20, V.y1 - wy + 600, '#6f6a8c', 0);
    const br = r => vpath(s, 'brick' + r, V, () => { const rs = []; for (let rr = r; rr < (r ? 9 : 1); rr++) for (let x = Math.floor((V.x0 - 140) / 140) * 140 + (rr % 2) * 70; x < V.x1 + 140; x += 140) rs.push([x + 4, rr * 70 + 4, 132, 62]); return rectsPath(rs); });
    g.at(0, wy, () => { g.path(br(0), '#8a86a8', 5); g.path(br(1), '#7d7898', 5); });
    g.rect(V.x0 - 10, wy - 16, V.x1 - V.x0 + 20, 26, '#4a8a4a', 0); dotRow(g, V.x0, V.x1, wy - 14, 34, 16, '#4a8a4a');
    for (const sd of [-1, 1]) g.arm(500 + sd * 260, wy + 40, -PI / 2 - sd * 0.1, { hand: 'palm', side: sd < 0 ? 'L' : 'R', s: 1.05 });
  },
  hit(g, s, k) {
    if (k === 1) g.fx.pop('ヒュ～', 500, 600, { size: 100, c: '#e8e4ff' });
    else { g.fx.pop('セーフ！', 500, 590, { size: 120, c: C.yellow }); g.fx.burst(500, 80, { n: 18, c: ['#ff5a7a', '#ffd23f', '#5ac8fa', '#a77bff', '#7ae582'], shape: 'square', sp: [200, 600], size: [14, 22], g: 1100, dir: PI / 2, spread: 2.4 }); g.sfx('magic'); }
  },
};

/* ---------- 5. 宝箱をあける ---------- */
const tplChest = {
  id: 'squat-chest', acts: ['squat'], modes: ALL, theme: 'fantasy', sfx: ['click', 'coin'],
  vars: [{ k: 'cave', name: '宝箱をあける', short: '宝箱' }],
  draw(g, s) {
    const V = g.V, dy = SH(s), a1 = AGE(s, 1), a2 = AGE(s, 2);
    g.bg('#2a2140');
    g.at(0, dy, () => {
      g.rect(V.x0 - 10, V.y0 - 300, V.x1 - V.x0 + 20, 960 - V.y0, '#2a2140', 0);
      g.path(vpath(s, 'tiles', V, () => { const rs = []; for (let r = 0; r * 90 < 1400; r++) { const y = V.y0 - 300 + r * 90; if (y > 660) break; for (let x = Math.floor((V.x0 - 160) / 160) * 160 + (r % 2) * 80; x < V.x1 + 160; x += 160) rs.push([x + 6, y + 6, 148, 78]); } return rectsPath(rs); }), '#3a3058', 0);
      for (const x of [170, 830]) { const f = Math.sin(s.t * 13 + x); g.glow(x, 300, 160, '#ffb34a', 0.4); g.rr(x - 10, 310, 20, 70, 6, '#7a4a2a', 4); g.at(x, 312, f * 0.1, 1, 1 + f * 0.08, () => { g.path('M-20 0 Q-22 -52 0 -76 Q22 -52 20 0 Z', '#ff9a2a', 4); g.path('M-9 -2 Q0 -32 9 -2 Z', '#ffe08a', 0); }); }
      g.band(660, 'bottom', '#4a3f6a', 7);
      for (let i = -6; i <= 6; i++) g.line([500 + i * 120, 660, 500 + i * 420, 1500], 'rgba(20,10,40,0.35)', 5);
      for (const y of [740, 860, 1020]) g.line([V.x0, y, V.x1, y], 'rgba(20,10,40,0.35)', 5);
      // 宝箱
      const open = a2 >= 0 ? E.outBack(clamp(a2 / 0.22)) : 0, ajar = a1 >= 0 ? E.outBack(clamp(a1 / 0.2)) * 0.1 : 0;
      g.shadow(500, 812, 210, 22, 0.35);
      if (open > 0) { g.glow(500, 560, 380 * open, '#fff2a0', 0.7); g.alpha(0.5 * open, () => { for (let i = -2; i <= 2; i++) g.poly([500 + i * 30, 600, 500 + i * 30 + 14, 600, 500 + i * 140 + 40, 200, 500 + i * 140 - 40, 200], '#fff6c0', 0); }); }
      g.rr(320, 600, 360, 210, 16, '#a8642e');
      if (open > 0) { g.rr(334, 600, 332, 30, 8, '#3a1f10', 0); dotRow(g, 360, 640, 606, 34, 18, C.gold); g.circ(420, 592, 14, '#5ac8fa', 4); g.circ(560, 594, 13, '#ff5a7a', 4); }
      for (const x of [370, 630]) g.rect(x - 16, 600, 32, 210, '#ffc83d', 5);
      g.rr(320, 600, 360, 210, 16, null);
      // ふた（開くと上へ）
      g.at(500, 600 - 160 * open - 30 * ajar, 0, 1, lerp(1, -0.35, open), () => {
        g.path('M-180 0 L-180 -70 Q-180 -120 0 -120 Q180 -120 180 -70 L180 0 Z', '#b8733a', 7);
        for (const x of [-130, 130]) g.path(`M${x - 16} 0 L${x - 16} -100 L${x + 16} -104 L${x + 16} 0 Z`, '#ffc83d', 5);
        g.rect(-180, -12, 360, 14, '#ffc83d', 5);
      });
      if (ajar && !open) g.rect(334, 590, 332, 8, '#fff6a0', 0);
      // 錠前（1回目で外れて落ちる）
      const lk = a1 >= 0 ? clamp(a1 / 0.5) : 0;
      g.at(500 + 40 * lk, 640 + 260 * lk * lk, 2.5 * lk, 1, 1, () => { g.path(lk > 0 ? 'M-20 -14 L-20 -44 Q-20 -64 0 -64 Q20 -64 20 -44 L20 -30' : 'M-20 -14 L-20 -40 Q-20 -60 0 -60 Q20 -60 20 -40 L20 -14', null, 9); g.rr(-30, -18, 60, 52, 10, '#ffc83d'); g.circ(0, 2, 8, C.ol, 0); g.rect(-3, 2, 6, 16, C.ol, 0); });
    });
    const t = LOW(s); if (t > 0.05) for (const sd of [-1, 1]) reach(g, lerp(500 + sd * 330, 500 + sd * 150, t), lerp(1260, 640 + dy, t), 500 + sd * 560, 1500, { hand: 'palm', side: sd < 0 ? 'L' : 'R', s: 1.05, sleeve: '#8e5cff' });
  },
  hit(g, s, k) {
    g.fx.shake(k === 2 ? 10 : 6, 0.14);
    if (k === 1) { g.fx.sparks(500, 410, 10); g.fx.pop('カチャッ', 240, 220, { size: 92 }); }
    else { g.fx.coins(500, 380, 14); g.fx.stars(500, 360, 10); g.fx.burst(500, 380, { n: 10, c: ['#5ac8fa', '#ff5a7a', '#7ae582'], shape: 'star', sp: [300, 800], size: [14, 24], g: 1400 }); g.fx.pop('ザクザク！', 500, 140, { size: 120, c: C.yellow }); g.sfx('magic'); }
  },
};

/* ---------- 6. 空気入れでうきわ（くじら）をふくらます ---------- */
function whale(g, lv, happy, t) {
  const rx = 120 + 90 * lv, ry = 18 + 104 * lv, cy = -ry;
  g.at(rx - 6, cy + ry * 0.2, -0.3 + 0.5 * lv, 0.4 + 0.6 * lv, 0.3 + 0.7 * lv, () => g.path('M0 0 Q40 -40 90 -60 Q70 -20 96 10 Q50 0 0 20 Z', '#3a86ff', 6));
  g.ell(0, cy, rx, ry, '#3a86ff');
  g.clipRR(-rx, cy, 2 * rx, ry, 0, () => g.ell(0, cy + ry * 0.55, rx * 0.86, ry * 0.6, '#bfe3ff', 0));
  g.ell(0, cy, rx, ry, null);
  if (lv < 0.7) for (let i = -2; i <= 2; i++) g.line([i * rx * 0.3 - 10, cy - ry * 0.4, i * rx * 0.3, cy - ry * 0.1, i * rx * 0.3 - 10, cy + ry * 0.2], 'rgba(20,40,120,0.4)', 4);
  const ex = -rx * 0.55, ey = cy - ry * 0.15;
  if (lv < 0.3) g.line([ex - 14, ey, ex + 14, ey], C.ol, 6); else { g.circ(ex, ey, 9 + 5 * lv, C.ol, 0); g.circ(ex + 3, ey - 4, 3.5, '#fff', 0); }
  g.arc(ex + 30, ey + 16, 18 * (0.5 + lv * 0.5), 0.3, PI - 0.3, C.ol, 6);
  g.ell(ex - 6, ey + 24, 12, 7, 'rgba(255,120,160,0.5)', 0);
  g.hl(-rx * 0.2, cy - ry * 0.55, rx * 0.3, ry * 0.12, -0.2, 0.5);
  if (happy) { const h = 60 + Math.sin(t * 20) * 8; for (const sd of [-1, 0, 1]) g.curve([0, cy - ry, sd * 20, cy - ry - h * 0.6, sd * 46, cy - ry - h], '#9ee7ff', 9); g.circ(-46, cy - ry - 60, 10, '#9ee7ff', 0); g.circ(46, cy - ry - 60, 10, '#9ee7ff', 0); }
}
const tplPump = {
  id: 'squat-pump', acts: ['squat'], modes: ALL, theme: 'sea', sfx: 'swish',
  vars: [{ k: 'whale', name: 'うきわをふくらます', short: '空気入れ' }],
  draw(g, s) {
    const V = g.V, dy = SH(s), a1 = AGE(s, 1), a2 = AGE(s, 2);
    const lv = a2 >= 0 ? lerp(0.5, 1, E.outBack(clamp(a2 / 0.22))) : a1 >= 0 ? lerp(0, 0.5, E.outBack(clamp(a1 / 0.3))) : 0;
    g.bg('#bfe9ff'); g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 900 - V.y0, g.lin(0, V.y0, 0, 420, ['#58bdf5', '#d7f3ff']), 0);
    g.at(0, dy, () => {
      g.sun(840, 110, 60); g.cloud(200, 130, 0.6);
      g.band(380, 470, '#2fa7e6'); for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1; x += 90) g.arc(x + 40, 420 + 12 * Math.sin(x + s.t * 2), 24, PI, 0, '#ffffff', 5);
      g.band(470, 'bottom', '#f2d49b', 7);
      for (const [x, y] of [[120, 640], [880, 700], [300, 900], [760, 980], [-160, 800], [1180, 780]]) { g.ell(x, y, 26, 10, '#e5c084', 0); }
      g.line([170, 820, 210, 460], C.ol, 9); g.path('M60 470 Q210 360 360 470 Z', '#ff5a7a', 7); g.path('M160 470 Q210 380 260 470 Z', '#ffffff', 0); g.path('M60 470 Q210 360 360 470 Z', null, 7);
      g.rr(780, 760, 90, 80, 14, C.yellow, 6); g.arc(825, 760, 40, PI, TAU, C.ol, 6);
      // ホースとくじら
      g.curve([500, 1180, 470, 980, 380, 860, 430, 720], C.ol, 16); g.curve([500, 1180, 470, 980, 380, 860, 430, 720], '#3cc46b', 9);
      g.shadow(560, 728, 150 + 60 * lv, 18);
      const bounce = a2 >= 0 ? -Math.abs(Math.sin(a2 * 16)) * 26 * Math.exp(-3 * a2) : 0;
      g.at(560, 724 + bounce, 0, 1 + 0.04 * Math.sin(s.t * 10) * (a1 >= 0 && a1 < 0.4 ? 1 : 0), 1, () => whale(g, lv, a2 >= 0, s.t));
      // ポンプの筒（地面にある：しゃがむと持ち手に近づく）
      g.rr(458, 1060, 84, 380, 14, '#e8343c'); g.rr(450, 1050, 100, 26, 8, '#b8242c'); g.rect(470, 1080, 14, 340, 'rgba(255,255,255,0.3)', 0);
    });
    // 持ち手と手（体といっしょに動く）
    g.rect(492, 830, 16, Math.max(0, 1060 + dy - 830), '#b8c3d4', 5);
    g.rr(340, 812, 320, 36, 16, '#3b3550', 6);
    for (const sd of [-1, 1]) g.arm(500 + sd * 120, 826, -PI / 2 - sd * 0.25, { hand: 'grip', side: sd < 0 ? 'L' : 'R', s: 1.05, sleeve: '#ff9f1c' });
  },
  hit(g, s, k) {
    g.fx.burst(430, 720 - 230 + 0, { n: 6, c: ['#ffffff'], shape: 'smoke', sp: [60, 160], size: [30, 50], g: -80, life: [0.4, 0.7], grow: 1.2 }); g.fx.shake(k === 2 ? 9 : 5, 0.12);
    if (k === 1) g.fx.pop('シュッ', 230, 260, { size: 92 });
    else { g.fx.pop('パンパン！', 500, 150, { size: 124, c: C.yellow }); g.fx.stars(560, 360, 10); g.sfx('boing'); }
  },
};

/* ---------- 7. 風船に座って割る ---------- */
function friend(g, x, y, c, hair, m, t) {
  g.at(x, y, 0, 0.8, 0.8, () => {
    g.rr(-80, 0, 160, 170, 60, c);
    g.circ(0, -70, 76, C.skin); g.path(`M-76 -70 Q-80 -150 0 -152 Q80 -150 76 -70 Q60 -120 0 -116 Q-60 -120 -76 -70 Z`, hair);
    face(g, 0, -62, 0.78, m === 1 ? 2 : m === 2 ? 3 : 0);
    if (m === 1) for (const sd of [-1, 1]) { g.cap(sd * 80, 40, sd * 92, -60, 18, C.skin); g.circ(sd * 90, -70, 22, C.skin); }
    else if (m === 2) for (const sd of [-1, 1]) { const w = Math.sin(t * 20 + sd) * 0.3; g.at(sd * 80, 30, sd * (0.5 + w), 1, 1, () => { g.cap(0, 0, 0, -120, 18, C.skin); g.circ(0, -126, 22, C.skin); }); }
  });
}
const tplPop = {
  id: 'squat-balloon', acts: ['squat'], modes: ALL, theme: 'party', sfx: ['squeak', 'pop'],
  vars: [{ k: 'sit', name: '風船に座って割る', short: '風船わり' }],
  draw(g, s) {
    const V = g.V, dy = SH(s), a1 = AGE(s, 1), a2 = AGE(s, 2);
    g.bg('#ffe3ef');
    g.at(0, dy, () => {
      for (let i = 0, y = V.y0 - 300; y < 900; i++, y += 110) dotRow(g, V.x0 + (i % 2) * 55, V.x1, y, 110, 9, '#ffc9de');
      for (const [xa, xb, y] of [[V.x0 - 40, 500, 110], [500, V.x1 + 40, 110]]) { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(lerp(xa, xb, t), y + 70 * 4 * t * (1 - t)); } g.curve(pts, C.ol, 4); const n = Math.floor((xb - xa) / 70); for (let i = 1; i < n; i++) { const t = i / n, x = lerp(xa, xb, t), yy = y + 70 * 4 * t * (1 - t); g.tri(x - 22, yy, x + 22, yy, x, yy + 48, [C.yellow, C.blue, C.pink, C.green, C.purple][i % 5], 4); } }
      for (const [x, c] of [[160, C.blue], [850, C.yellow], [-190, C.green], [1200, C.purple]]) { g.curve([x, 470, x - 10, 560, x + 6, 660], C.ol, 3); g.ell(x, 400, 56, 68, c); g.hl(x - 20, 376, 12, 22, -0.4, 0.5); }
      g.band(900, 'bottom', '#c9a3ff', 7);
      const m = a2 >= 0 ? 2 : a1 >= 0 ? 1 : 0;
      friend(g, 330, 620, '#5ac8fa', '#5a3426', m, s.t); friend(g, 680, 630, '#7ae582', '#2b2140', m, s.t);
      // 風船（座るとつぶれる）
      if (a2 < 0) {
        const t = LOW(s), sq = 0.42 * t * t + (a1 >= 0 ? Math.max(0, 0.12 * Math.exp(-6 * a1) * Math.cos(a1 * 30)) : 0);
        g.at(500, 1240, 0, 1 + sq * 0.9, 1 - sq, () => { g.ell(0, -190, 200, 190, '#ff4f6d'); g.hl(-70, -290, 40, 60, -0.4, 0.5); });
      }
    });
    knees(g, s, { pants: '#4f6bff' });
  },
  hit(g, s, k) {
    if (k === 1) { g.fx.pop('ムギュ', 230, 230, { size: 104 }); g.fx.shake(5, 0.12); }
    else { g.fx.ring(500, 780, { r1: 420, w: 22 }); g.fx.burst(500, 820, { n: 26, c: [C.red, C.yellow, C.blue, C.pink, C.green, C.purple], shape: 'conf', sp: [400, 1100], size: [14, 26], g: 900, life: [0.7, 1.2] }); g.fx.burst(500, 820, { n: 8, c: ['#ff4f6d'], shape: 'chip', sp: [400, 900], size: [16, 26], g: 1400 }); g.fx.pop('パーン！', 500, 560, { size: 140, c: C.yellow }); g.fx.shake(12, 0.18); g.fx.flash('#ffffff', 0.35, 0.12); g.sfx('cheer'); }
  },
};

/* ---------- 8. 拾う（落とし物・栗・貝がら） ---------- */
const PICK = [
  {
    k: 'coin', name: '落とし物を拾う', short: '落とし物', theme: 'town', sfx: 'coin', p1: 'チャリン', p2: 'ラッキー！', hand: '#4f6bff',
    bg(g, V) {
      g.rect(V.x0 - 10, V.y0 - 310, V.x1 - V.x0 + 20, 820 - V.y0, g.lin(0, V.y0, 0, 400, ['#8fd3ff', '#e2f5ff']), 0);
      for (const [x, w, h, c, d] of BLDG) { g.rect(x, 440 - h, w, h, c, 6); g.path(d, '#ffffff', 4); }
      g.band(440, 520, '#6c7488'); g.line([V.x0, 480, V.x1, 480], '#ffffff', 6);
      g.band(520, 'bottom', '#d9dde6', 7);
      for (let i = -8; i <= 8; i++) g.line([500 + i * 120, 520, 500 + i * 420, 1500], '#b9bfcc', 5);
      for (const y of [600, 720, 900, 1160]) g.line([V.x0, y, V.x1, y], '#b9bfcc', 5);
    },
    item(g, i) { if (i === 0) { g.circ(0, 0, 34, '#d5dbe6'); g.circ(0, 0, 24, '#c2c9d6', 4); g.text('100', 0, 2, { size: 16, f: '#8a93a6', font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); g.hl(-12, -14, 10, 5, -0.5, 0.8); } else { g.glow(0, 0, 70, '#fff3a0', 0.6); g.circ(0, 0, 40, C.gold); g.star(0, 0, 20, 9, 5, '#ffe27a', 4); g.hl(-14, -16, 12, 6, -0.5, 0.8); } },
  },
  {
    k: 'kuri', name: '栗を拾う', short: '栗拾い', theme: 'nature', sfx: 'pop', p1: 'ゲット！', p2: '大きい！', hand: '#ff9f1c',
    bg(g, V) {
      g.rect(V.x0 - 10, V.y0 - 310, V.x1 - V.x0 + 20, 820 - V.y0, g.lin(0, V.y0, 0, 420, ['#ffd9a0', '#fff1d6']), 0);
      for (const [x, w] of [[90, 60], [300, 44], [700, 54], [900, 66], [-200, 60], [1150, 56]]) { g.rect(x - w / 2, V.y0 - 310, w, 800 - V.y0, '#8a5a36', 6); }
      for (const [x, y, r, c] of [[90, 120, 180, '#e8743a'], [700, 80, 200, '#f2a03a'], [400, 40, 160, '#d9542a'], [-160, 120, 180, '#f2a03a'], [1150, 90, 190, '#e8743a']]) g.circ(x, y, r, c, 0);
      g.band(460, 'bottom', '#a8703a', 7);
      for (let i = 0; i < 26; i++) { const x = V.x0 + ((i * 263) % 1000) / 1000 * (V.x1 - V.x0), y = 490 + ((i * 431) % 1000) / 1000 * 900; g.at(x, y, i, 1, 0.6, () => g.path('M0 -20 Q16 0 0 20 Q-16 0 0 -20 Z', ['#e8543a', '#ffb703', '#d97a2a'][i % 3], 0)); }
    },
    item(g, i) { const k = i ? 1.25 : 1; g.at(0, 0, 0, k, k, () => { let d = ''; for (let a = 0; a < 18; a++) { const aa = a / 18 * TAU, c = Math.cos(aa), sn = Math.sin(aa); d += `M${c * 40} ${sn * 22 + 14} L${c * 70} ${sn * 40 + 14}`; } g.path(d, null, 6); g.ell(0, 14, 56, 30, '#b5c24a', 5); g.ell(0, 14, 40, 18, '#7a8a2a', 0); g.path('M0 -40 C28 -34 38 -6 34 12 C30 26 -30 26 -34 12 C-38 -6 -28 -34 0 -40 Z', '#7a3a1a', 6); g.path('M-34 12 C-30 26 30 26 34 12 C22 4 -22 4 -34 12 Z', '#e8c48a', 0); g.path('M0 -40 C28 -34 38 -6 34 12 C30 26 -30 26 -34 12 C-38 -6 -28 -34 0 -40 Z', null, 6); g.hl(-12, -20, 10, 6, -0.5, 0.75); g.line([0, -40, 0, -50], C.ol, 5); }); },
  },
  {
    k: 'shell', name: '貝がらを拾う', short: '貝がら', theme: 'sea', sfx: 'ding', p1: 'みっけ！', p2: 'きれい！', hand: '#2ec4b6',
    bg(g, V) {
      g.rect(V.x0 - 10, V.y0 - 310, V.x1 - V.x0 + 20, 820 - V.y0, g.lin(0, V.y0, 0, 380, ['#6cc3f7', '#dff5ff']), 0);
      g.band(380, 480, '#2fa7e6'); g.band(470, 'bottom', '#f4dca6', 7);
      g.path(`M${V.x0 - 10} 480 Q300 520 500 490 Q700 460 ${V.x1 + 10} 500 L${V.x1 + 10} 470 L${V.x0 - 10} 470 Z`, 'rgba(255,255,255,0.75)', 0);
      for (let i = 0; i < 10; i++) { const y = 560 + i * 70 + i * i * 4; g.curve([V.x0, y, 300, y + 10, 700, y - 10, V.x1, y], 'rgba(200,160,100,0.35)', 5); }
    },
    item(g, i) { if (i === 0) { g.path('M0 -40 C30 -36 44 -6 30 20 C20 36 -20 36 -30 20 C-44 -6 -30 -36 0 -40 Z', '#ffb3c6', 5); for (const a of [-0.5, -0.17, 0.17, 0.5]) g.line([0, 30, Math.sin(a) * 60, 30 - Math.cos(a) * 64], '#ff8fb1', 4); g.rr(-16, 26, 32, 14, 6, '#ffb3c6', 5); } else { g.star(0, 0, 50, 22, 5, '#ff8a3a', 6); for (let k = 0; k < 5; k++) { const a = -PI / 2 + k * TAU / 5; g.circ(Math.cos(a) * 24, Math.sin(a) * 24, 4, '#ffd23f', 0); } g.circ(0, 0, 6, '#ffd23f', 0); } },
  },
];
const PIT = [[380, 800], [620, 810]];
const BLDG = [[60, 160, 300, '#ffd1a8'], [240, 200, 380, '#c9d8ff'], [470, 160, 260, '#ffe8a8'], [660, 220, 340, '#d8f0c2'], [900, 180, 300, '#ffc4d8'], [-160, 200, 360, '#e0d4ff'], [1100, 200, 330, '#c9f1ff']].map(([x, w, h, c]) => { const rs = []; for (let yy = 440 - h + 30; yy < 400; yy += 60) for (let xx = x + 24; xx < x + w - 30; xx += 50) rs.push([xx, yy, 26, 30]); return [x, w, h, c, rectsPath(rs)]; });
const tplPick = {
  id: 'squat-pick', acts: ['squat'], modes: ALL, sfx: (k, v) => v.sfx, vars: PICK,
  draw(g, s, v) {
    const V = g.V, dy = SH(s), t = LOW(s);
    g.bg('#e2f5ff');
    g.at(0, dy, () => {
      v.bg(g, V);
      PIT.forEach(([x, y], i) => { if (s.k > i) return; g.shadow(x, y + 36, 60, 14); g.at(x, y, 0, 1.5, 1.5, () => v.item(g, i)); });
      if (v.k === 'kuri') for (let i = 0; i < s.k; i++) { const [x, y] = PIT[i]; g.at(x, y + 20, 0, 1.5, 1.5, () => { g.ell(0, 0, 56, 30, '#b5c24a', 5); g.ell(0, 0, 40, 18, '#7a8a2a', 0); }); }
    });
    // 手：1回目は左手、2回目は右手で拾う
    for (const i of [0, 1]) {
      const sd = i ? 1 : -1, [ix, iy] = PIT[i], held = s.k > i;
      const reachN = s.k === i;                 // いま拾いに行く手
      if (!held && !reachN) continue;
      let x, y;
      if (reachN) { const tt = i ? t * clamp((AGE(s, 1) - 0.3) / 0.25) : t; x = lerp(ix + sd * 300, ix, tt); y = lerp(1280, iy + dy + 6, tt); }
      else { const e = E.outQ(clamp(AGE(s, i + 1) / 0.35)); x = lerp(ix, 500 + sd * 300, e); y = lerp(iy - 230 + 6, 820, e); }
      if (y > 1200) continue;
      reach(g, x, y, 500 + sd * 560, 1500, { hand: held ? 'pinch' : 'open', side: sd < 0 ? 'L' : 'R', s: 1.05, sleeve: v.hand });
      if (held) g.at(x + sd * 6, y - 86, 0, 1.15, 1.15, () => v.item(g, i));
    }
  },
  hit(g, s, k, v) {
    const [x, y] = PIT[k - 1];
    g.fx.stars(x, y - 230, k === 2 ? 10 : 5); g.fx.shake(k === 2 ? 8 : 4, 0.1);
    if (k === 1) g.fx.pop(v.p1, k === 1 ? 230 : 770, 300, { size: 92 });
    else { g.fx.pop(v.p2, 500, 170, { size: 120, c: C.yellow }); g.fx.burst(x, y - 230, { n: 12, c: ['#ffffff', C.yellow], shape: 'spark', sp: [300, 800], size: [12, 22] }); g.sfx('chime'); }
  },
};

/* ---------- 9. 重量挙げ（バーベルスクワット） ---------- */
const tplLift = {
  id: 'squat-barbell', acts: ['squat'], modes: ALL, theme: 'sports', sfx: 'thud',
  vars: [{ k: 'meet', name: 'バーベルスクワット', short: '重量挙げ' }],
  draw(g, s) {
    const V = g.V, dy = SH(s), n = s.k;
    g.bg('#1b1638');
    g.at(0, dy, () => {
      g.rect(V.x0 - 10, V.y0 - 300, V.x1 - V.x0 + 20, 760 - V.y0, g.lin(0, V.y0, 0, 600, ['#14112a', '#2c2560']), 0);
      for (const x of [200, 800]) g.alpha(0.16, () => g.poly([x - 30, V.y0 - 300, x + 30, V.y0 - 300, x + (x < 500 ? 300 : -300) + 120, 760, x + (x < 500 ? 300 : -300) - 120, 760], '#bfe3ff', 0));
      for (let r = 0; r < 4; r++) dotRow(g, V.x0 + (r % 2) * 20, V.x1, 330 + r * 42, 40, 17, ['#3a3170', '#433a80', '#4c4290', '#5549a0'][r]);
      g.rr(330, 60, 340, 150, 16, '#2b2140', 7); g.text('回数', 500, 96, { size: 34, f: '#ffd23f', font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
      g.text(String(n), 500, 160, { size: 92, f: '#ff6a2a' });
      g.band(500, 'bottom', '#3a3058'); g.rect(V.x0 - 10, 500, V.x1 - V.x0 + 20, 16, '#ffc83d', 0);
      g.rr(250, 560, 500, 120, 14, '#26386b', 7); g.rect(250, 600, 500, 14, '#ffc83d', 0);
      for (let i = 0; i < 3; i++) { const on = i < (n === 0 ? 0 : n === 1 ? 1 : 3), x = 380 + i * 120; g.rect(x - 6, 520, 12, 44, '#7f8798', 4); if (on) g.glow(x, 500, 80, '#ffffff', 0.7); g.circ(x, 500, 34, on ? '#ffffff' : '#4a4f66', 6); }
      g.band(700, 'bottom', '#8a5a36', 7); g.planks(V.x0 - 20, 706, V.x1 - V.x0 + 40, 600, 5, '#a86f43');
    });
    // バーベル（体といっしょに動く）
    const a = s.k ? s.age : 9, bend = 22 * Math.exp(-6 * a) * Math.cos(a * 22) + 10 * LOW(s);
    for (const sd of [-1, 1]) {
      const x = 500 + sd * 400;
      g.rr(x - 18, 878 + bend, 36, 54, 8, '#b8c3d4', 5);
      for (const [dx, ry, c] of [[sd * 40, 190, sd < 0 ? '#e8343c' : '#3a86ff'], [sd * 96, 160, sd < 0 ? '#3a86ff' : '#e8343c']]) {
        g.ell(x + dx, 905 + bend, 54, ry, c); g.ell(x + dx, 905 + bend, 36, ry * 0.8, sh(c, 0.18), 0); g.ell(x + dx, 905 + bend, 14, 24, '#d5dbe6', 4);
      }
    }
    g.curve([120, 905 + bend, 500, 905 + bend * 0.2, 880, 905 + bend], C.ol, 30); g.curve([120, 905 + bend, 500, 905 + bend * 0.2, 880, 905 + bend], '#d5dbe6', 18);
    for (const sd of [-1, 1]) g.arm(500 + sd * 170, 905 + bend * 0.5, -PI / 2 - sd * 0.15, { hand: 'grip', side: sd < 0 ? 'L' : 'R', s: 1.05, sleeve: null });
  },
  hit(g, s, k) {
    g.fx.shake(k === 2 ? 10 : 7, 0.14);
    if (k === 1) g.fx.pop('1回！', 230, 300, { size: 100 });
    else { g.fx.pop('成功！', 500, 260, { size: 140, c: C.yellow }); g.fx.confetti(70); g.fx.flash('#ffffff', 0.3, 0.15); g.sfx('cheer'); }
  },
};

/* ---------- 10. 集合写真（前の列でしゃがむ） ---------- */
function peace(g, x, y, a, k, side) {
  g.at(x, y, a, side === 'L' ? -k : k, k, () => {
    g.cap(-12, -40, -36, -150, 17, C.skin); g.cap(18, -40, 42, -146, 17, C.skin);
    g.rr(-52, -50, 104, 96, 34, C.skin);
    g.ell(-30, -48, 16, 13, C.skin, 5); g.ell(30, -48, 16, 13, C.skin, 5);
    g.rr(-52, -50, 104, 96, 34, null);
    g.blob([-52, 14, -66, -12, -46, -30, -18, -24, -14, 0, -32, 20], C.skin);
    g.rect(-40, 40, 80, 200, C.skin, 6);
  });
}
const tplPhoto = {
  id: 'squat-photo', acts: ['squat'], modes: ALL, theme: 'school', sfx: 'click',
  vars: [{ k: 'class', name: '集合写真をとる', short: '集合写真' }],
  draw(g, s) {
    const V = g.V, dy = SH(s), a1 = AGE(s, 1), a2 = AGE(s, 2);
    g.bg('#cdefff'); g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 900 - V.y0, g.lin(0, V.y0, 0, 420, ['#6cc3f7', '#e2f6ff']), 0);
    g.at(0, dy, () => {
      g.rect(V.x0 - 10, 210, V.x1 - V.x0 + 20, 300, '#f6ecd8', 7);
      for (let x = Math.floor((V.x0 - 60) / 130) * 130 + 30; x < V.x1 + 60; x += 130) for (const y of [240, 360]) g.rr(x, y, 84, 80, 6, '#a8dcff', 5);
      g.rect(440, 150, 120, 70, '#f6ecd8', 7); g.circ(500, 186, 26, '#ffffff', 5);
      for (const [x, y, r] of [[90, 260, 150], [930, 280, 160], [-210, 240, 150], [1220, 260, 160]]) { g.rect(x - 16, y, 32, 300, '#7a4a2a', 6); g.circ(x, y, r, '#ffc4dc', 0); g.circ(x - r * 0.4, y - r * 0.3, r * 0.6, '#ffd6e6', 0); g.circ(x + r * 0.5, y + r * 0.1, r * 0.5, '#ffb3d0', 0); }
      g.band(500, 'bottom', '#e2c08f', 7);
      g.rr(160, 360, 120, 150, 6, '#d9d2c2', 6); g.rr(176, 380, 88, 110, 4, '#ffffff', 4); g.text('入学式', 220, 435, { size: 26, f: C.ol, font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
      // カメラマン
      const thumb = a2 >= 0;
      g.at(690, 640, 0, 0.9, 0.9, () => {
        g.rr(-80, -120, 160, 200, 60, '#5a6b8a'); g.circ(0, -190, 64, C.skin); g.path('M-66 -200 Q-60 -268 0 -268 Q60 -268 66 -200 L90 -196 L90 -184 L-66 -192 Z', '#e8574f', 5);
        if (thumb) { face(g, 0, -184, 0.62, 3); g.at(-110, -130, 0, 1, 1, () => { g.rr(-30, -26, 60, 56, 18, C.skin); g.cap(-14, -24, -14, -74, 14, C.skin); }); } else { g.circ(-22, -192, 7, C.ol, 0); g.line([10, -196, 34, -196], C.ol, 6); g.arc(0, -160, 14, 0.4, PI - 0.4, C.ol, 5); }
      });
      // 三脚とカメラ
      for (const [x2, y2] of [[420, 800], [500, 820], [580, 800]]) g.line([500, 600, x2, y2], '#3b3550', 10);
      const fl = Math.max(a1 >= 0 ? Math.exp(-10 * a1) : 0, a2 >= 0 ? Math.exp(-10 * a2) : 0);
      if (fl > 0.05) g.glow(500, 500, 160 * fl + 40, '#ffffff', fl);
      g.rr(472, 488, 56, 26, 6, fl > 0.3 ? '#ffffff' : '#d5dbe6', 5);
      g.rr(420, 512, 160, 96, 16, '#2b2f45', 7); g.circ(500, 560, 38, '#4a5070', 6); g.circ(500, 560, 24, '#5ac8fa', 5); g.hl(492, 552, 8, 5, -0.5, 0.7); g.circ(556, 530, 7, C.red, 0);
      // 出てくる写真
      for (const [a, x] of [[a1, -36], [a2, 36]]) if (a >= 0) { const e = E.outQ(clamp(a / 0.3)); g.at(500 + x, 606 + 70 * e, (x < 0 ? -0.08 : 0.08) * e, 1, 1, () => { g.rect(-34, -4, 68, 80 * e, '#ffffff', 5); if (e > 0.6) { g.rect(-26, 4, 52, 44, '#9fd6ff', 0); g.circ(-10, 34, 9, '#ffd4b8', 0); g.circ(10, 34, 9, '#ffd4b8', 0); } }); }
    });
    // となりの友だち（いっしょにしゃがむ）
    for (const [x, y, sd, hair, rib, shirt] of [[60, 640, -1, '#3b2547', '#ff5a7a', '#ffffff'], [940, 660, 1, '#5a3426', null, '#26386b'], [-250, 660, -1, '#2b2140', '#5ac8fa', '#ffffff'], [1250, 650, 1, '#7a4a2a', null, '#26386b']]) {
      g.rr(x - 190, y + 90, 380, 400, 120, shirt);
      for (const e of [-1, 1]) g.ell(x + e * 128, y + 20, 26, 34, C.skin);
      g.circ(x, y, 132, hair); g.path(`M${x - 40} ${y - 120} Q${x} ${y - 70} ${x + 40} ${y - 120}`, sh(hair, 0.25), 6);
      if (rib) { g.path(`M${x} ${y - 132} l-56 -36 l6 70 Z`, rib, 5); g.path(`M${x} ${y - 132} l56 -36 l-6 70 Z`, rib, 5); g.circ(x, y - 130, 14, rib, 5); }
      else g.path(`M${x + 10} ${y - 128} q30 -50 60 -40 q-36 6 -40 40 Z`, hair, 5);
      peace(g, x - sd * 150, y - 150, sd * 0.25, 0.85, sd < 0 ? 'R' : 'L');
    }
  },
  hit(g, s, k) {
    g.fx.flash('#ffffff', 0.6, 0.18); g.fx.sparks(500, 270, 10, ['#ffffff', '#fff6b0']);
    if (k === 1) g.fx.pop('パシャ', 500, 120, { size: 100 });
    else { g.fx.pop('いい笑顔！', 500, 120, { size: 116, c: C.yellow }); g.fx.stars(500, 300, 10); g.sfx('chime'); }
  },
};

/* ---------- 11. 温泉につかる ---------- */
function monkey(g, m, towel) {
  const fur = '#a8754a', fc = '#ff8f86';
  g.ell(0, 40, 80, 70, fur);
  g.circ(0, -40, 66, fur); g.circ(-62, -40, 18, fc, 5); g.circ(62, -40, 18, fc, 5);
  g.path('M-46 -40 C-46 -80 -10 -84 0 -64 C10 -84 46 -80 46 -40 C46 -6 22 10 0 10 C-22 10 -46 -6 -46 -40 Z', fc, 5);
  if (m === 0 || m === 3) { g.arc(-20, -42, 9, 0.3, PI - 0.3, C.ol, 5); g.arc(20, -42, 9, 0.3, PI - 0.3, C.ol, 5); } else { g.circ(-20, -40, 8, C.ol, 0); g.circ(20, -40, 8, C.ol, 0); g.circ(-17, -43, 3, '#fff', 0); g.circ(23, -43, 3, '#fff', 0); }
  g.path(m === 3 ? 'M-12 -14 Q0 0 12 -14 Z' : 'M-8 -12 Q0 -6 8 -12', m === 3 ? '#8a2f3f' : null, 4);
  if (towel) { g.rr(-44, -118, 88, 30, 8, '#ffffff', 5); g.line([-30, -112, 30, -112], '#9ad4ff', 4); }
}
const tplOnsen = {
  id: 'squat-onsen', acts: ['squat'], modes: ALL, theme: 'nature', sfx: ['bubble', 'splash'],
  vars: [{ k: 'saru', name: '温泉につかる', short: '温泉' }],
  init(s) { s.my.fk = Array.from({ length: 16 }, () => [s.r(), s.r(), 0.5 + s.r() * 0.8, 4 + s.r() * 5]); s.my.st = Array.from({ length: 6 }, () => [s.r(), s.r()]); },
  draw(g, s) {
    const V = g.V, dy = SH(s), a2 = AGE(s, 2);
    g.bg('#dce9f5'); g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 900 - V.y0, g.lin(0, V.y0, 0, 420, ['#a9c8e8', '#eef5fb']), 0);
    g.at(0, dy, () => {
      g.poly([V.x0 - 100, 420, 100, 220, 300, 380, 520, 180, 760, 360, 900, 250, V.x1 + 100, 380, V.x1 + 100, 460, V.x0 - 100, 460], '#9fb4d0', 0);
      g.poly([520, 180, 470, 230, 500, 226, 540, 246, 570, 214], '#ffffff', 0); g.poly([100, 220, 60, 262, 90, 258, 130, 270], '#ffffff', 0);
      g.band(440, 'bottom', '#eef3f8');
      g.rect(V.x0 - 10, 380, 300 - V.x0, 200, '#c9a66b', 6); for (let x = Math.floor(V.x0 / 30) * 30; x < 290; x += 30) g.line([x, 384, x, 576], '#a8854a', 4);
      // 奥の岩とお湯
      g.rect(V.x0 - 10, 560, V.x1 - V.x0 + 20, 400, '#7fd0c8', 0);
      for (const [x, y, rx, ry] of [[160, 560, 150, 70], [420, 540, 120, 56], [700, 540, 160, 80], [930, 570, 140, 70], [-200, 560, 160, 70], [1200, 560, 170, 80]]) { g.ell(x, y, rx, ry, '#8b93a6', 6); g.ell(x - rx * 0.1, y - ry * 0.55, rx * 0.8, ry * 0.4, '#ffffff', 0); }
      g.rr(380, 470, 70, 50, 10, '#c98b52', 5); g.rect(380, 488, 70, 8, '#8a5634', 0);
      if (a2 < 0.16) g.at(lerp(700, 660, clamp(a2 / 0.16)), 470 - (a2 >= 0 ? 120 * Math.sin(PI * a2 / 0.16) - 120 * a2 : 0), 0, 0.85, 0.85, () => monkey(g, s.k >= 1 ? 1 : 0, false));
      else { g.at(650, 690, 0, 1.3, 1.3, () => monkey(g, 3, true)); g.rect(V.x0 - 10, 706, V.x1 - V.x0 + 20, 400, 'rgba(127,208,200,0.9)', 0); g.at(650, 706, 0, 1, 0.25, () => g.ring(0, 0, 90 + 60 * Math.sin(s.t * 3), 'rgba(255,255,255,0.7)', 7)); }
    });
    // 手前のお湯（しゃがむと肩までつかる）
    const wy = lerp(560, 940, E.sm(s.p));
    g.rect(V.x0 - 10, wy, V.x1 - V.x0 + 20, V.y1 - wy + 600, g.lin(0, wy, 0, wy + 500, ['#8fe0d6', '#4fb8b0']), 0);
    g.line([V.x0, wy, V.x1, wy], 'rgba(255,255,255,0.85)', 8);
    for (let i = 0; i < 4; i++) { const y = wy + 60 + i * 70 + i * i * 12; g.at(500 + Math.sin(s.t * 1.5 + i) * 60, y, 0, 1, 0.25, () => g.ring(0, 0, 140 + i * 90, 'rgba(255,255,255,0.35)', 6)); }
    // 湯気と雪
    for (const [fx, ph] of s.my.st) { const k = (s.t * 0.3 + ph) % 1, x = V.x0 + fx * (V.x1 - V.x0) + Math.sin(s.t + ph * 9) * 30; g.alpha(Math.sin(PI * k), () => g.glow(x, wy - 40 - k * 400, 110 + 90 * k, '#ffffff', 0.5)); }
    for (const [fx, fy, sp, r] of s.my.fk) { const y = V.y0 + ((fy * 1400 + s.t * 70 * sp) % 1400) * (V.y1 - V.y0) / 1400, x = V.x0 + fx * (V.x1 - V.x0) + Math.sin(s.t * 2 + fy * 9) * 14; g.circ(x, y, r, 'rgba(255,255,255,0.95)', 0); }
  },
  hit(g, s, k) {
    g.fx.splash(500, 560, '#bff4ec', 14); g.fx.smoke(500, 520, 6, '#ffffff');
    if (k === 1) g.fx.pop('ふぅ～', 260, 360, { size: 100 });
    else { g.fx.pop('ごくらく～', 500, 150, { size: 112, c: C.yellow }); g.fx.hearts(650, 330, 7); g.sfx('magic'); }
  },
};

/* ---------- 12. 草むらに隠れる（ライオンが通る） ---------- */
function lion(g, look, yawn, step) {
  const b = '#f0b65a', m = '#c9762a';
  g.path('M90 -90 Q160 -100 170 -170', null, 0); g.curve([80, -90, 150, -110, 160, -170], '#c9862a', 12); g.circ(162, -176, 18, m, 5);
  g.ell(30, -100, 120, 70, b);
  for (const [x, ph] of [[-50, 0], [10, 1], [60, 2], [100, 3]]) g.rr(x - 18, -60 + Math.max(0, Math.sin(step + ph * 1.6)) * -14, 36, 70, 14, b);
  g.at(-40, -190, 0, 1, 1, () => {
    const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 104 : 124; pts.push(Math.cos(a) * r, Math.sin(a) * r); } g.blob(pts, m, 7, 0.8);
    g.circ(-52, -54, 20, b, 5); g.circ(52, -54, 20, b, 5);
    g.circ(0, 0, 72, '#f6c76e');
    if (yawn) { g.arc(-24, -14, 10, 0.3, PI - 0.3, C.ol, 6); g.arc(24, -14, 10, 0.3, PI - 0.3, C.ol, 6); g.ell(0, 34, 26, 30, '#8a2f3f', 6); g.ell(0, 46, 14, 10, '#ff8fa8', 0); }
    else { g.circ(-24 + look * 8, -14, 9, C.ol, 0); g.circ(24 + look * 8, -14, 9, C.ol, 0); g.ell(0, 22, 30, 20, '#fff1d6', 0); g.path('M-12 10 L12 10 L0 24 Z', '#5a3426', 4); g.path('M-14 34 Q0 44 14 34', null, 4); }
  });
}
const tplLion = {
  id: 'squat-lion', acts: ['squat'], modes: ALL, theme: 'animal', sfx: 'swish',
  vars: [{ k: 'grass', name: '草むらに隠れる', short: 'ライオン' }],
  draw(g, s) {
    const V = g.V, dy = SH(s), a1 = AGE(s, 1), a2 = AGE(s, 2);
    g.bg('#ffe2a8'); g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 900 - V.y0, g.lin(0, V.y0, 0, 470, ['#ffb35a', '#fff0c4']), 0);
    g.at(0, dy, () => {
      g.sun(760, 300, 90, '#fff3b0');
      g.hills(470, '#c99a5a', 40, 5, 4);
      g.at(200, 470, 0, 1, 1, () => { g.line([0, 0, 0, -170], '#6e4429', 18); g.line([0, -120, -60, -190], '#6e4429', 12); g.ell(0, -200, 170, 42, '#5f8f3a', 0); g.ell(-70, -186, 90, 26, '#6fa04a', 0); });
      g.band(468, 'bottom', '#e9c46a', 7);
      for (let i = 0; i < 12; i++) { const x = V.x0 + ((i * 271) % 1000) / 1000 * (V.x1 - V.x0), y = 520 + ((i * 613) % 1000) / 1000 * 300; g.path(`M${x - 14} ${y} L${x} ${y - 40} L${x + 14} ${y} Z`, '#d6ad4f', 0); }
      // ライオン：歩いてきて止まり（1回目）、あくびして去る（2回目）
      const xin = lerp(1080, 560, E.outQ(clamp((s.ph + 0.7) / 0.62))), xout = a2 >= 0 ? -1100 * E.inQ(clamp(a2 / 0.55)) : 0;
      const walking = s.ph < -0.1 || a2 >= 0, look = a1 >= 0 && a2 < 0 ? Math.sin(a1 * 9) : 0;
      g.shadow(xin + xout + 10, 660, 170, 18);
      g.at(xin + xout, 650 - (walking ? Math.abs(Math.sin(s.t * 12)) * 8 : 0), 0, 0.95, 0.95, () => lion(g, look, a2 >= 0 && a2 < 0.6, walking ? s.t * 12 : 0));
      if (a1 >= 0 && a2 < 0 && a1 < 0.9) g.text('？', xin - 40, 330 + Math.sin(a1 * 6) * 8, { size: 80, f: '#ffffff', o: 10 });
    });
    // 手前の草（近いので大きく動く）
    const gy = lerp(440, 800, E.sm(s.p)), sw = Math.sin(s.t * 3) * 6;
    g.rect(V.x0 - 10, gy, V.x1 - V.x0 + 20, V.y1 - gy + 600, '#8cbf3f', 0);
    const d = vpath(s, 'grass', V, () => { let d = ''; for (let x = Math.floor((V.x0 - 60) / 46) * 46; x < V.x1 + 60; x += 46) { const h = 70 + (Math.abs(x * 7) % 50); d += `M${x - 24} 30 Q${x - 8} ${-h * 0.5} ${x} ${-h} Q${x + 6} ${-h * 0.4} ${x + 24} 30 Z`; } return d; });
    g.at(sw * 0.6, gy, () => { g.path(d, '#8cbf3f', 0); g.path(d, null, 4); });
    g.rect(V.x0 - 10, gy + 120, V.x1 - V.x0 + 20, 900, '#7aae35', 0);
    const t = LOW(s); if (t > 0.05) for (const sd of [-1, 1]) g.arm(500 + sd * 250, gy + 60, -PI / 2 - sd * 0.15, { hand: 'open', side: sd < 0 ? 'L' : 'R', s: 1.05, sleeve: '#c98b52' });
  },
  hit(g, s, k) {
    if (k === 1) g.fx.pop('クンクン', 760, 260, { size: 90 });
    else { g.fx.pop('セーフ！', 500, 600, { size: 124, c: C.yellow }); g.fx.stars(500, 560, 10); g.sfx('ding'); }
  },
};

/* ---------- 13. 子犬をなでる ---------- */
function puppy(g, m, t) {
  const fur = '#fff1dc', ear = '#d9965a';
  const wag = Math.sin(t * (m ? 30 : 16)) * 0.5;
  g.at(70, -110, -0.6 + wag, 1, 1, () => g.path('M0 0 Q36 -30 26 -76 Q8 -46 -12 -10 Z', fur, 6));
  g.ell(0, -90, 92, 92, fur); g.ell(0, -70, 52, 60, '#ffffff', 0);
  for (const sd of [-1, 1]) { g.cap(sd * 40, -100, sd * 44, -10, 22, fur); g.ell(sd * 46, -6, 28, 18, '#ffffff', 5); }
  g.at(0, -230, 0, 1, 1, () => {
    g.circ(0, 0, 86, fur); g.ell(0, 36, 48, 34, '#ffffff', 5);
    for (const sd of [-1, 1]) g.at(sd * 74, -40, sd * (m === 1 ? 0.5 : 0.15), 1, 1, () => g.path(`M${sd * -20} -10 Q${sd * 40} -20 ${sd * 36} 70 Q${sd * 10} 92 ${sd * -14} 50 Z`, ear, 6));
    if (m >= 1) { g.arc(-34, -10, 14, PI + 0.4, -0.4, C.ol, 8); g.arc(34, -10, 14, PI + 0.4, -0.4, C.ol, 8); } else { g.circ(-34, -10, 14, C.ol, 0); g.circ(34, -10, 14, C.ol, 0); g.circ(-29, -16, 5, '#fff', 0); g.circ(39, -16, 5, '#fff', 0); }
    g.ell(0, 20, 16, 11, C.ol, 0);
    g.path('M-18 36 Q0 50 18 36', null, 5); g.path('M-10 42 Q0 74 10 42 Z', '#ff7a95', 4);
    g.ell(-58, 22, 16, 9, 'rgba(255,120,150,0.5)', 0); g.ell(58, 22, 16, 9, 'rgba(255,120,150,0.5)', 0);
  });
}
const tplPuppy = {
  id: 'squat-puppy', acts: ['squat'], modes: ALL, theme: 'animal', sfx: ['chime', 'magic'],
  vars: [{ k: 'pet', name: '子犬をなでる', short: '子犬' }],
  draw(g, s) {
    const V = g.V, dy = SH(s), a1 = AGE(s, 1), a2 = AGE(s, 2);
    g.bg('#cdeeff'); g.rect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, 900 - V.y0, g.lin(0, V.y0, 0, 420, ['#7cc8f8', '#e2f6ff']), 0);
    g.at(0, dy, () => {
      g.cloud(200, 120, 0.6); g.cloud(850, 180, 0.5);
      for (const [x, r] of [[80, 120], [260, 90], [740, 100], [930, 130], [-200, 120], [1200, 120]]) g.circ(x, 420, r, '#4cae62', 0);
      for (let x = Math.floor((V.x0 - 60) / 70) * 70; x < V.x1 + 60; x += 70) g.path(`M${x + 6} 520 L${x + 6} 380 L${x + 30} 356 L${x + 54} 380 L${x + 54} 520 Z`, '#ffffff', 5);
      g.rect(V.x0 - 10, 410, V.x1 - V.x0 + 20, 20, '#ffffff', 5);
      g.band(510, 'bottom', '#7ccf5a', 7);
      g.at(820, 640, 0, 1, 1, () => { g.rect(-90, -110, 180, 130, '#ffe08a', 6); g.path('M-120 -100 L0 -190 L120 -100 Z', '#e8574f', 6); g.path('M-36 20 L-36 -50 Q0 -90 36 -50 L36 20 Z', '#5a3426', 5); });
      for (const [x, y, c] of [[150, 760, C.pink], [260, 820, C.yellow], [880, 860, '#ffffff'], [-160, 800, C.pink], [1160, 820, C.yellow]]) { for (let i = 0; i < 5; i++) g.circ(x + Math.cos(i * 1.26) * 13, y + Math.sin(i * 1.26) * 13, 10, c, 3); g.circ(x, y, 8, '#ffb703', 0); }
      const hop = a2 >= 0 ? -Math.abs(Math.sin(a2 * 12)) * 70 * Math.exp(-2 * a2) : 0;
      g.shadow(480, 846, 120, 20);
      g.at(480, 840 + hop, 0, 1, 1, () => puppy(g, a2 >= 0 ? 2 : a1 >= 0 ? 1 : 0, s.t));
    });
    // なでる手
    const t = LOW(s), rub = s.k && s.age < 0.5 ? Math.sin(s.age * 26) * 22 * (1 - s.age / 0.5) : 0;
    if (t > 0.05) reach(g, lerp(820, 480 + rub, t), lerp(1250, 590 + dy, t), 900, 1500, { hand: 'palm', side: 'R', s: 1.05, sleeve: '#ff9f1c' });
  },
  hit(g, s, k) {
    if (k === 1) { g.fx.pop('なでなで', 230, 240, { size: 90 }); g.fx.hearts(560, 300, 3); }
    else { g.fx.pop('だいすき！', 500, 140, { size: 116, c: '#ff8fb1' }); g.fx.hearts(480, 320, 9); }
  },
};

/* ---------- 14. 金魚すくい ---------- */
function goldfish(g, col, dm) {
  g.path('M-26 0 L-58 -22 Q-48 0 -58 22 Z', sh(col, 0.25), 4);
  g.ell(0, 0, 34, 20, col, 5);
  if (dm) { g.circ(22, -16, 9, col, 4); g.circ(22, 16, 9, col, 4); g.circ(24, -16, 4, '#ffffff', 0); g.circ(24, 16, 4, '#ffffff', 0); }
  else { g.circ(18, -9, 3.5, C.ol, 0); g.circ(18, 9, 3.5, C.ol, 0); }
  g.hl(-4, -8, 12, 4, 0, 0.5);
}
const FISH = [['#ff5a3a', 0], ['#2b2140', 1], ['#ff8a2a', 0], ['#ffffff', 0], ['#ff5a3a', 0], ['#ffb03a', 0]];
const POI = [560, 770];
const tplKingyo = {
  id: 'squat-kingyo', acts: ['squat'], modes: ALL, theme: 'festival', sfx: ['bubble', 'splash'],
  vars: [{ k: 'poi', name: '金魚すくい', short: '金魚' }],
  init(s) { s.my.f = FISH.map((c, i) => ({ c, cx: 300 + s.r() * 400, cy: 640 + s.r() * 260, R: 50 + s.r() * 90, w: (i % 2 ? 1 : -1) * (1 + s.r()), ph: s.r() * TAU })); },
  draw(g, s) {
    const V = g.V, dy = SH(s);
    g.bg('#1d1848');
    g.at(0, dy, () => {
      g.rect(V.x0 - 10, V.y0 - 300, V.x1 - V.x0 + 20, 800 - V.y0, g.lin(0, V.y0, 0, 400, ['#120f33', '#2c2466']), 0);
      for (let x = Math.floor((V.x0 - 100) / 200) * 200 + 100; x < V.x1 + 100; x += 200) { g.line([x, V.y0 - 300, x, 60], C.ol, 4); g.glow(x, 110, 90, '#ffb36b', 0.4); g.ell(x, 110, 40, 46, '#ff5a3c'); for (const yy of [92, 110, 128]) g.line([x - 34, yy, x + 34, yy], '#c7311f', 3); }
      g.stripes(V.x0 - 40, 200, V.x1 - V.x0 + 80, 70, 70, '#ffffff', '#e8343c');
      g.rect(V.x0 - 10, 270, V.x1 - V.x0 + 20, 250, '#3a2a55', 0);
      g.rr(360, 300, 280, 100, 14, '#ffffff', 6); g.text('きんぎょ', 500, 352, { size: 56, f: '#e8343c', font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
      g.band(500, 'bottom', '#5a4a7a');
      g.rr(90, 480, 820, 700, 30, '#ffffff', 8); g.rr(116, 506, 768, 650, 22, g.lin(0, 506, 0, 1100, ['#7ad9ff', '#3aa8e8']), 0);
      for (let i = 0; i < 5; i++) g.at(300 + i * 110, 560 + (i % 2) * 260 + Math.sin(s.t * 2 + i) * 10, 0, 1, 0.3, () => g.ring(0, 0, 50 + (i % 3) * 20, 'rgba(255,255,255,0.4)', 5));
      g.clipRR(116, 506, 768, 650, 22, () => {
        s.my.f.forEach((F, i) => {
          if (i < 2 && s.k > i) return;
          let x, y, hd;
          if (i < 2) { const a = s.t * 2.2 + i * 3; x = POI[0] + Math.cos(a) * 40 + (i ? 30 : -30); y = POI[1] + Math.sin(a) * 26; hd = a + PI / 2; }
          else { const a = F.ph + F.w * s.t * 0.6; x = F.cx + Math.cos(a) * F.R; y = F.cy + Math.sin(a) * F.R * 0.6; hd = a + (F.w > 0 ? PI / 2 : -PI / 2); }
          g.at(x, y, hd, 1.1, 1.1, () => goldfish(g, F.c[0], F.c[1]));
        });
      });
    });
    // ポイ（右手）とおわん（左手）
    const t = LOW(s), px = lerp(820, POI[0], t), py = lerp(1080, POI[1] + dy, t);
    g.at(px, py, 0, 1, 1, () => { g.line([40, 40, 150, 170], '#ff8fb1', 18); g.circ(0, 0, 70, 'rgba(255,255,255,0.55)', 0); g.ring(0, 0, 70, C.ol, 16); g.ring(0, 0, 70, '#ff8fb1', 9); });
    reach(g, px + 150, py + 176, 1000, 1500, { hand: 'grip', side: 'R', s: 1, sleeve: '#5ac8fa' });
    const bx = 190, by = 880;
    g.ell(bx, by, 130, 60, 'rgba(200,240,255,0.65)', 6); g.ell(bx, by - 8, 110, 40, '#8fdcff', 0);
    for (let i = 0; i < s.k; i++) { const a = AGE(s, i + 1); if (a < 0.3) continue; g.at(bx - 40 + i * 70, by - 6, 0.4 * (i ? -1 : 1) + Math.sin(s.t * 6 + i) * 0.2, 0.8, 0.8, () => goldfish(g, FISH[i][0], FISH[i][1])); }
    g.arm(bx + 20, by + 70, -PI / 2 + 0.3, { hand: 'open', side: 'L', s: 1, sleeve: '#5ac8fa' });
    g.ell(bx, by, 130, 60, null, 6);
    // すくった金魚が飛ぶ
    for (let i = 0; i < s.k; i++) { const a = AGE(s, i + 1); if (a < 0 || a >= 0.3) continue; const q = a / 0.3, x = lerp(POI[0], bx, q), y = lerp(POI[1] - 230, by - 10, q) - 200 * 4 * q * (1 - q); g.at(x, y, q * 8, 1, 1, () => goldfish(g, FISH[i][0], FISH[i][1])); }
  },
  hit(g, s, k) {
    g.fx.splash(POI[0], POI[1] - 230, '#bff0ff', 12); g.fx.shake(k === 2 ? 8 : 5, 0.1);
    if (k === 1) g.fx.pop('ピチャッ', 760, 250, { size: 92 });
    else { g.fx.pop('やった！', 500, 140, { size: 124, c: C.yellow }); g.fx.stars(300, 760, 8); g.sfx('cheer'); }
  },
};

/* ---------- 15. こたつに入る（ねこが出てくる） ---------- */
function kcat(g, m) {
  const col = '#9aa3b5', st = '#6d7588';
  if (m === 2) { g.ell(0, 0, 120, 64, col); for (const x of [-60, -20, 20]) g.line([x, -58, x + 10, -30], st, 7); g.circ(80, -30, 52, col); for (const sd of [-1, 1]) g.tri(80 + sd * 44, -60, 80 + sd * 12, -76, 80 + sd * 38, -104, col, 5); g.arc(64, -30, 9, 0.3, PI - 0.3, C.ol, 5); g.arc(96, -30, 9, 0.3, PI - 0.3, C.ol, 5); g.path('M74 -12 Q80 -6 86 -12', null, 4); g.path('M-110 10 Q-160 0 -140 -50', null, 0); g.curve([-110, 10, -150, 0, -130, -40], col, 16); return; }
  g.circ(0, 0, 54, col); for (const sd of [-1, 1]) g.tri(sd * 46, -26, sd * 14, -44, sd * 40, -76, col, 5);
  for (const x of [-16, 0, 16]) g.line([x, -50, x, -36], st, 6);
  g.circ(-20, -4, 9, C.ol, 0); g.circ(20, -4, 9, C.ol, 0); g.circ(-17, -7, 3, '#fff', 0); g.circ(23, -7, 3, '#fff', 0); g.path('M-8 16 Q0 22 8 16', null, 4);
  for (const sd of [-1, 1]) { g.line([sd * 30, 12, sd * 70, 4], C.ol, 3); g.line([sd * 30, 20, sd * 70, 24], C.ol, 3); }
}
const tplKotatsu = {
  id: 'squat-kotatsu', acts: ['squat'], modes: ALL, theme: 'home', sfx: 'meow',
  vars: [{ k: 'neko', name: 'こたつに入る', short: 'こたつ' }],
  draw(g, s) {
    const V = g.V, dy = SH(s), a1 = AGE(s, 1), a2 = AGE(s, 2);
    g.bg('#f3e3c3');
    g.at(0, dy, () => {
      g.rect(V.x0 - 10, V.y0 - 300, V.x1 - V.x0 + 20, 960 - V.y0, '#f3e3c3', 0);
      g.rr(160, 140, 420, 300, 6, '#c9a06a', 7); g.rect(176, 156, 388, 268, '#cfe6ff', 0);
      for (let i = 0; i < 9; i++) { const x = 190 + ((i * 97) % 360), y = 170 + ((i * 53 + s.t * 60) % 240); g.circ(x, y, 6, '#ffffff', 0); }
      g.grid(176, 156, 388, 268, 67, '#e9dcc0', 8); g.rect(176, 156, 388, 268, null, 5);
      g.rr(700, 130, 120, 330, 8, '#f8f2e4', 6); g.curve([720, 400, 750, 330, 790, 280, 800, 200], '#5a3a28', 6); for (const [x, y] of [[752, 330], [786, 282], [800, 220], [770, 300]]) { for (let i = 0; i < 5; i++) g.circ(x + Math.cos(i * 1.26) * 9, y + Math.sin(i * 1.26) * 9, 7, '#ff8fb1', 0); g.circ(x, y, 4, '#ffd23f', 0); } g.rr(690, 120, 140, 18, 6, '#8a5634', 5); g.rr(690, 452, 140, 18, 6, '#8a5634', 5);
      g.band(560, 'bottom', '#d9d48a', 7);
      for (let i = -6; i <= 6; i++) g.line([500 + i * 200, 560, 500 + i * 560, 1500], '#8a8a3a', 6); g.line([V.x0, 760, V.x1, 760], '#8a8a3a', 6);
      // こたつ
      g.path('M150 660 Q120 820 90 900 L910 900 Q880 820 850 660 Z', '#ff8a5a', 7);
      g.clipPath('M150 660 Q120 820 90 900 L910 900 Q880 820 850 660 Z', () => { for (let r = 0; r < 4; r++) for (let x = 120 + (r % 2) * 60; x < 900; x += 120) g.circ(x, 690 + r * 60, 16, '#ffb38a', 0); });
      g.path('M270 600 L730 600 L800 662 L200 662 Z', '#c98b52', 7); g.rr(196, 656, 608, 26, 8, '#a86f43', 6);
      g.ell(500, 628, 90, 22, '#c9a06a', 5); for (const [x, y] of [[470, 606], [520, 604], [494, 590], [450, 618], [544, 616]]) { g.circ(x, y, 22, '#ff9f1c', 5); g.ell(x - 4, y - 18, 6, 3, '#4cae5a', 0); }
      g.rr(640, 600, 50, 40, 10, '#ffffff', 5); g.ell(665, 600, 25, 7, '#7cc88a', 4);
      // ねこ（1回目で顔を出す）
      if (a2 < 0) {
        g.curve([220, 880, 180, 860, 170, 820], '#9aa3b5', 18);
        if (a1 >= 0) { const e = E.outBack(clamp(a1 / 0.25)); g.at(720, 920 - 90 * e, 0, 1, 1, () => kcat(g, 1)); g.path('M610 900 Q720 860 830 900 L830 930 L610 930 Z', '#ff8a5a', 0); }
      }
    });
    // 手前のふとん（ひざにかかる）
    const fy = lerp(800, 960, E.sm(s.p));
    g.at(0, fy, () => g.path(vpath(s, 'futon', V, () => `M${V.x0 - 10} 40 Q500 -40 ${V.x1 + 10} 40 L${V.x1 + 10} 900 L${V.x0 - 10} 900 Z`), '#ff8a5a', 7));
    for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) g.circ(x + 60, fy + 70, 16, '#ffb38a', 0);
    if (a2 >= 0) { const e = E.outBack(clamp(a2 / 0.22)); g.at(500, fy + 50 - 60 * e, 0, e, e, () => kcat(g, 2)); }
  },
  hit(g, s, k) {
    if (k === 1) g.fx.pop('ニャ？', 760, 520, { size: 96 });
    else { g.fx.pop('ぬくぬく～', 500, 170, { size: 116, c: '#ff8a5a' }); g.fx.hearts(500, 650, 8); g.sfx('chime'); }
  },
};

const MORE = [tplCushion, tplImo, tplLimbo, tplGhost, tplChest, tplPump, tplPop, tplPick, tplLift, tplPhoto, tplOnsen, tplLion, tplPuppy, tplKingyo, tplKotatsu];

export default [
  ...MORE,
];
