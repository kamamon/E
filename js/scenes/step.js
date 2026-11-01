/* 横に動く（サイドステップ・スケーター）— よける・つかまえる・集める
   s.x：からだの位置 −1（左端）〜 +1（右端）。当たる瞬間はその端（s.lastDir の側）。
   一人称なので景色を反対にずらす：g.at(−240·s.x, …)。手足に関係ない見た目なので both / alt の両方で使えます。
   世界の x=500±240 の所が、その側の端にいるとき画面のまん中に来ます。 */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const TAU = Math.PI * 2, SH = 240;
const opp = d => (d === 'L' ? 'R' : 'L'), sgn = d => (d === 'L' ? -1 : 1);
// 1回目・2回目に動く向き
function dirs(s) {
  if (s.k === 0) s.my.d1 = s.dir; else if (s.k === 1) { s.my.d1 = s.lastDir; s.my.d2 = s.dir; } else s.my.d2 = s.lastDir;
  const d1 = s.my.d1 || 'R'; return [d1, s.my.d2 || opp(d1)];
}
function ages(s) { return [s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, s.k >= 2 ? s.age : -1]; }
const WX = s => -SH * s.x;                    // 景色のずれ
const BOB = s => 24 * s.p;                    // 移動の途中は少し跳ねる
const prog = (a, d) => (a < 0 ? 0 : clamp(a / d));
const ease = (a, d = 0.25) => (a < 0 ? 0 : E.outBack(clamp(a / d)));
const fly = (s, i, T) => (s.ph - (i - T)) / T;   // i 回目（0,1）に着くものの進み具合（T rep 前に出発）
const atHit = (s, X) => X - SH * sgn(s.lastDir);  // hit() のとき、世界の X が画面のどこか
// 手を使う向き：当たったあとも腕が下がりきるまでは同じ手、そのあと次の手（いきなり入れかわらない）
const handDir = (s, d1, d2) => (s.k === 0 ? d1 : s.k === 1 ? (s.u < 0.45 ? d1 : d2) : d2);

/* ---------- 小物 ---------- */
function kid(g, x, y, sc, shirt, hair, happy) {
  g.at(x, y, 0, sc, sc, () => {
    g.shadow(0, 2, 58, 14, 0.22);
    g.cap(-17, -86, -19, -12, 14, '#34407a'); g.cap(17, -86, 19, -12, 14, '#34407a');
    g.ell(-22, -8, 22, 12, '#ffffff', 4); g.ell(22, -8, 22, 12, '#ffffff', 4);
    g.rr(-44, -200, 88, 126, 34, shirt);
    g.circ(0, -242, 48, C.skin);
    g.path('M-50 -244 Q-49 -302 0 -296 Q49 -302 50 -244 Q32 -272 0 -268 Q-32 -272 -50 -244Z', hair);
    g.circ(-16, -240, 5.5, C.ol, 0); g.circ(16, -240, 5.5, C.ol, 0);
    if (happy) g.path('M-15 -224 Q0 -202 15 -224Z', '#c8312b', 4); else g.arc(0, -228, 13, 0.35, Math.PI - 0.35, C.ol, 4);
    g.circ(-31, -226, 8, 'rgba(255,120,140,0.4)', 0); g.circ(31, -226, 8, 'rgba(255,120,140,0.4)', 0);
  });
}
function tarai(g, x, y, rot) {         // 金だらい（さかさま。y はふちの位置）
  g.at(x, y, rot, 1, 1, () => {
    g.path('M-150 0 L-108 -88 Q0 -100 108 -88 L150 0 Q0 24 -150 0Z', '#f2c14e');
    g.ell(0, -90, 108, 16, '#ffe08a', 5);
    g.path('M-112 -16 L-84 -76 Q-60 -80 -50 -78 L-70 -14Z', 'rgba(255,255,255,0.5)', 0);
    g.ell(0, 2, 152, 20, '#d39b2a', 6);
  });
}
function ghost(g, x, y, sc, face, rot = 0) {   // face 0 ふつう 1 目が回る
  g.at(x, y, rot, sc, sc, () => {
    g.path('M-90 60 C-96 -40 -60 -120 0 -120 C60 -120 96 -40 90 60 Q70 40 50 64 Q30 88 10 62 Q-10 88 -30 62 Q-50 88 -70 62 Q-80 50 -90 60Z', '#f4f2ff');
    g.path('M-90 10 Q-130 0 -128 -26 Q-110 -18 -88 -24Z', '#f4f2ff', 5); g.path('M90 10 Q130 0 128 -26 Q110 -18 88 -24Z', '#f4f2ff', 5);
    if (face) { for (const sx of [-30, 30]) { g.arc(sx, -50, 14, 0, TAU * 0.8, C.ol, 5); g.arc(sx, -50, 6, 0, TAU * 0.7, C.ol, 4); } g.ell(0, -8, 16, 10, '#6b5aa8', 4); }
    else { g.ell(-30, -52, 13, 18, C.ol, 0); g.ell(30, -52, 13, 18, C.ol, 0); g.ell(0, -8, 20, 26, '#6b5aa8', 5); }
    g.circ(-56, -22, 10, 'rgba(255,150,190,0.5)', 0); g.circ(56, -22, 10, 'rgba(255,150,190,0.5)', 0);
  });
}
function bull(g, x, y, k, dizzy) {      // 正面から走ってくる牛（y は足もと）
  g.at(x, y, 0, k, k, () => {
    g.shadow(0, 0, 180, 30, 0.3);
    g.rr(-120, -130, 50, 130, 18, '#3b2a25'); g.rr(70, -130, 50, 130, 18, '#3b2a25');
    g.ell(0, -210, 180, 120, '#4a332b');
    g.path('M-70 -300 Q-170 -310 -190 -410 Q-140 -360 -50 -350Z', '#f6eedc'); g.path('M70 -300 Q170 -310 190 -410 Q140 -360 50 -350Z', '#f6eedc');
    g.ell(-120, -300, 40, 22, '#5a3d32', 6, -0.4); g.ell(120, -300, 40, 22, '#5a3d32', 6, 0.4);
    g.ell(0, -260, 110, 100, '#5a3d32');
    g.ell(0, -200, 76, 50, '#e2a48e'); g.ell(-26, -198, 10, 14, C.ol, 0); g.ell(26, -198, 10, 14, C.ol, 0);
    g.arc(0, -170, 26, 0.2, Math.PI - 0.2, '#ffc83d', 9);
    if (dizzy) { for (const sx of [-42, 42]) { g.circ(sx, -290, 20, '#ffffff', 4); g.arc(sx, -290, 10, 0, TAU * 0.75, C.ol, 4); } }
    else { for (const sx of [-42, 42]) { g.circ(sx, -288, 18, '#ffffff', 4); g.circ(sx, -284, 9, C.ol, 0); g.line([sx - 26 * Math.sign(sx), -322, sx + 18 * Math.sign(sx), -308], C.ol, 8); } }
  });
}
function fruit(g, x, y, kind, sc = 1, rot = 0) {
  g.at(x, y, rot, sc, sc, () => {
    if (kind === 'melon') { g.circ(0, 0, 70, '#9fd36b'); g.clipCirc(0, 0, 70, () => { for (let i = -3; i <= 3; i++) { g.line([-80, i * 24 - 40, 80, i * 24 + 40], '#e8f7cf', 4); g.line([-80, i * 24 + 40, 80, i * 24 - 40], '#e8f7cf', 4); } }); g.circ(0, 0, 70, null, 6); g.line([0, -70, 8, -94], '#6b8f3a', 8); g.hl(-26, -28, 16, 9, -0.6, 0.5); }
    else { g.circ(0, 0, 46, '#ff9f1c'); g.circ(-14, -16, 10, 'rgba(255,255,255,0.5)', 0); g.at(6, -44, 0.4, 1, 1, () => g.path('M0 0 Q18 -20 38 -8 Q18 10 0 0Z', '#3cc46b')); for (const [a, b] of [[16, 8], [-10, 18], [20, -14]]) g.circ(a, b, 3, '#e07f00', 0); }
  });
}

/* ---------- 場面 ---------- */
export default [
  /* 金だらいをよける（お笑いの舞台） */
  {
    id: 'step-tarai', acts: ['step'], modes: ['both', 'alt'], theme: 'festival', sfx: 'clang',
    vars: [{ k: 'tarai', name: 'タライをよける', short: 'タライ' }],
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s);
      g.bg('#2a1430');
      g.at(WX(s), BOB(s), () => {
        for (let x = Math.floor((V.x0 - 300) / 80) * 80; x < V.x1 + 300; x += 80) g.rect(x, V.y0 - 60, 80, 620 - V.y0, (Math.round(x / 80) & 1) ? '#b3203a' : '#981b32', 0);
        g.rect(V.x0 - 300, V.y0 - 60, V.x1 - V.x0 + 600, 130 - V.y0 + 60, '#7a1228', 0);
        for (let x = Math.floor((V.x0 - 300) / 160) * 160; x < V.x1 + 300; x += 160) g.circ(x + 80, 130, 80, '#7a1228', 0);
        g.rect(V.x0 - 300, 118, V.x1 - V.x0 + 600, 16, '#f2c14e', 0);
        g.band(580, 'bottom', '#c98b52', 7);
        for (let i = -16; i <= 16; i++) g.line([500 + i * 70, 580, 500 + i * 250, 1700], '#b07a45', 4);
        g.ell(500, 770, 360, 96, 'rgba(255,240,180,0.35)', 0);
        for (const i of [0, 1]) {
          const q = fly(s, i, 0.28), a = i ? a2 : a1; if (q < 0) continue;
          const land = 780 - (i ? 92 : 0), y = q < 1 ? lerp(V.y0 - 260, land, q * q) : land, r = q < 1 ? 0 : jig(a, 0.3, 16, 4);
          if (q < 1) g.shadow(500, 790 - (i ? 92 : 0), 150 * q, 22 * q, 0.3);
          tarai(g, 500 + (i && a >= 0 ? jig(a, 10, 20, 6) : 0), y, r);
        }
        // 客席（2回目で大笑い）
        const lau = a2 >= 0 ? Math.abs(Math.sin(s.t * 22)) * 18 * (1 - prog(a2, 1.2)) : 0;
        for (let x = Math.floor((V.x0 - 300) / 110) * 110; x < V.x1 + 300; x += 110) { const j = Math.round(x / 110) & 1; g.circ(x + 55, 1000 - (j ? lau : lau * 0.6), 58, '#1c1026', 0); }
      });
    },
    hit(g, s, k) {
      const x = atHit(s, 500), y = k === 1 ? 760 : 670;
      g.fx.sparks(x, y, 14); g.fx.lines(x, y, { n: 12, r0: 150, r1: 260, w: 12 }); g.fx.ring(x, y + 20, { c: '#ffe08a', r0: 120, r1: 300, w: 12, sy: 0.4 });
      g.fx.pop(k === 1 ? 'ガーン' : 'ガガーン', x, y - 230, { size: k === 1 ? 104 : 116, c: C.yellow });
      g.fx.pop(k === 1 ? 'セーフ' : 'セーフ！', 500 + sgn(s.lastDir) * 120, 330, { size: 78, c: '#ffffff', life: 0.8 });
      g.fx.shake(k === 1 ? 9 : 12, 0.16);
      if (k === 2) { g.sfx('cheer'); g.fx.pop('ドッ', 500, 880, { size: 90, c: '#ffffff', life: 0.9 }); }
    },
  },

  /* 雪玉をよける（雪だるまが投げてくる） */
  {
    id: 'step-snowball', acts: ['step'], modes: ['both', 'alt'], theme: 'winter', sfx: 'whoosh',
    vars: [{ k: 'snowball', name: '雪玉をよける', short: '雪玉' }],
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), thrown = (fly(s, 0, 0.42) > 0 ? 1 : 0) + (fly(s, 1, 0.42) > 0 ? 1 : 0);
      g.bg('#9fd6ff', '#eaf6ff');
      g.at(WX(s), BOB(s), () => {
        g.hills(420, '#e6effc', 50, 3, 5); g.band(480, 'bottom', '#f6f9ff');
        for (const x of [-250, 90, 910, 1250]) g.at(x, 470, () => { g.rect(-12, -40, 24, 50, '#8a5a36', 0); g.tri(-90, -30, 90, -30, 0, -200, '#2f8f5b'); g.tri(-70, -110, 70, -110, 0, -260, '#2f8f5b'); g.path('M-56 -120 Q0 -100 56 -120 L0 -250Z', '#ffffff', 0); });
        for (const [x, y, r] of [[200, 700, 60], [820, 760, 70], [560, 900, 50]]) g.ell(x, y, r * 2, r * 0.5, '#e2ecfa', 0);
        // 雪だるま（投げる）
        const sx = 500, sy = 520, throwA = s.k >= 2 ? 0 : (() => { const q = fly(s, s.k, 0.42); return q < 0 ? -0.2 : q < 0.15 ? -1.4 : 0.8; })();
        const nose = prog(a2 - 0.1, 0.5);
        g.at(sx, sy, () => {
          g.shadow(0, 10, 120, 24, 0.15);
          g.circ(0, -70, 84, '#ffffff'); g.circ(0, -190, 60, '#ffffff');
          g.line([-70, -110, -150, -170], C.dwood, 9);
          g.at(60, -120, throwA, 1, 1, () => { g.line([0, 0, 90, -50], C.dwood, 9); if (thrown < 2 && s.k < 2) g.circ(100, -60, 22, '#ffffff', 5); });
          if (s.k >= 2) { g.line([-34, -208, -12, -196, -34, -184], C.ol, 5); g.line([34, -208, 12, -196, 34, -184], C.ol, 5); } else { g.circ(-20, -200, 7, C.ol, 0); g.circ(20, -200, 7, C.ol, 0); g.line([-34, -220, -10, -212], C.ol, 5); g.line([34, -220, 10, -212], C.ol, 5); }
          if (!nose) g.tri(-6, -186, 6, -186, 0, -150, C.carrot, 4); else g.at(20 + 60 * nose, -170 + 160 * E.inQ(nose), nose * 4, 1, 1, () => g.tri(-6, -18, 6, -18, 0, 18, C.carrot, 4));
          g.arc(0, -166, 16, 0.3, Math.PI - 0.3, C.ol, 5);
          g.rr(-46, -258, 92, 22, 8, '#3a86ff'); g.rr(-30, -296, 60, 44, 10, '#3a86ff');
        });
        // 雪のかべと雪玉の山
        g.rr(240, 560, 520, 90, 40, '#ffffff', 6); g.line([300, 600, 700, 600], '#dbe6f7', 6);
        for (let j = 0; j < 3 - thrown; j++) g.circ(660 + j * 44, 540 - (j === 2 ? 34 : 0), 24, '#ffffff', 5);
        // 飛んでくる雪玉（ぼくがいた まん中を通る）
        for (const i of [0, 1]) {
          const q = fly(s, i, 0.42); if (q <= 0.15 || q > 1.3) continue;
          const t = (q - 0.15) / 0.85, x = t <= 1 ? lerp(sx + 100, 500, t) : 500, y = t <= 1 ? lerp(sy - 180, 640, t) - 140 * Math.sin(Math.PI * t) : 640 + (t - 1) * 1500, r = t <= 1 ? lerp(18, 84, Math.pow(t, 2.4)) : 84 + (t - 1) * 600;
          if (t > 0.5 && t <= 1) g.alpha(0.55, () => g.taper(lerp(sx + 100, 500, t - 0.3), lerp(sy - 180, 640, t - 0.3) - 140 * Math.sin(Math.PI * (t - 0.3)), x, y, r * 0.15, r * 0.85, '#ffffff', 0));
          g.circ(x, y, r, '#ffffff', 6); g.circ(x - r * 0.3, y - r * 0.3, r * 0.3, '#eaf2ff', 0); g.arc(x, y, r * 0.7, 0.3, 1.4, '#d6e4f7', Math.max(3, r * 0.08));
        }
      });
    },
    hit(g, s, k) {
      const x = atHit(s, 500);
      g.fx.lines(x, 640, { n: 10, r0: 110, r1: 230, w: 12 });
      g.fx.burst(x, 640, { n: 12, c: ['#ffffff', '#e8f1ff'], shape: 'snow', sp: [200, 500], size: [14, 26], g: 700 });
      g.fx.pop(k === 1 ? 'ヒュッ' : 'セーフ！', 500 + sgn(s.lastDir) * 100, 300, { size: k === 1 ? 100 : 110, c: k === 1 ? '#ffffff' : C.yellow, o: '#3a5a8a' });
      if (k === 2) g.fx.stars(500 + sgn(s.lastDir) * 100, 360, 8, ['#bfe3ff', '#ffffff', C.gold]);
    },
  },

  /* 隕石をよける（宇宙船） */
  {
    id: 'step-meteor', acts: ['step'], modes: ['both', 'alt'], theme: 'space', sfx: 'whoosh',
    vars: [{ k: 'meteor', name: '隕石をよける', short: '隕石' }],
    init(s) { const r = s.r; s.my.st = Array.from({ length: 40 }, () => [r() * 1.6 - 0.3, r(), r()]); },
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), warp = prog(a2 - 0.1, 0.35);
      g.bg('#0c0a28', '#2b1756');
      g.at(WX(s) * 0.3, 0, () => { for (const [a, b, z] of s.my.st) { const x = lerp(V.x0, V.x1, a), y = lerp(V.y0, V.y1, b); if (warp) { const dx = x - 500, dy = y - 450, L = 0.15 + 0.6 * warp; g.line([x, y, x + dx * L, y + dy * L], '#cfe0ff', 3 + 3 * z); } else g.circ(x, y, 2 + 3 * z, '#ffffff', 0); } });
      g.at(WX(s), BOB(s) * 0.5, () => {
        g.at(800, 230, () => { g.circ(0, 0, 110, '#f4a261'); g.clipCirc(0, 0, 110, () => { g.rect(-120, -30, 240, 30, '#e76f51', 0); g.rect(-120, 40, 240, 24, '#e9c46a', 0); }); g.circ(0, 0, 110, null, 6); g.ell(0, 0, 190, 40, null, 8); g.ell(0, 0, 190, 40, null, 0); g.arc(0, 0, 190, 0, Math.PI, '#ffd6a5', 12); });
        g.circ(170, 170, 60, '#9aa3c7'); g.circ(150, 150, 14, '#7d86ad', 0); g.circ(190, 190, 10, '#7d86ad', 0);
        for (const i of [0, 1]) {
          const q = fly(s, i, 0.45); if (q <= 0 || q > 1.25) continue;
          const t = Math.min(q, 1), r = lerp(14, 150, Math.pow(t, 2.4)) + Math.max(0, q - 1) * 1200, x = 500, y = lerp(330, 540, t) + Math.max(0, q - 1) * 900;
          g.alpha(Math.min(1, q * 3), () => { g.path(`M${x - r * 0.7} ${y - r * 0.3} L${x} ${y - r * 2.4} L${x + r * 0.7} ${y - r * 0.3}Z`, 'rgba(255,150,60,0.7)', 0); g.path(`M${x - r * 0.45} ${y - r * 0.4} L${x} ${y - r * 1.7} L${x + r * 0.45} ${y - r * 0.4}Z`, 'rgba(255,230,120,0.85)', 0);
            g.blob([x - r, y, x - r * 0.6, y - r * 0.8, x + r * 0.2, y - r, x + r, y - r * 0.3, x + r * 0.8, y + r * 0.7, x, y + r, x - r * 0.8, y + r * 0.6], '#8b6f5c', Math.max(3, r * 0.06));
            g.circ(x - r * 0.3, y - r * 0.2, r * 0.22, '#6e5646', 0); g.circ(x + r * 0.35, y + r * 0.25, r * 0.16, '#6e5646', 0); });
        }
      });
      // コックピット
      g.rect(V.x0 - 10, 860, V.x1 - V.x0 + 20, V.y1 - 850, '#39406b', 0); g.rect(V.x0 - 10, 852, V.x1 - V.x0 + 20, 16, '#5c6699', 0);
      for (let i = 0; i < 3; i++) g.circ(310 + i * 70, 930, 16, (Math.floor(s.t * 4) + i) % 3 ? '#3cf2c3' : '#ff4fa3', 5);
      for (const [i, a] of [[0, a1], [1, a2]]) { g.rr(560 + i * 130, 896, 110, 64, 16, a >= 0 ? '#3cf2c3' : '#1b1f3a', 5); if (a >= 0) { g.glow(615 + i * 130, 928, 90, '#3cf2c3', 0.5); g.star(615 + i * 130, 928, 22, 10, 5, '#ffffff', 0); } }
      g.rr(110, 890, 150, 90, 14, '#1b1f3a', 5); g.line([130, 940, 170, 920, 200, 950, 240, 910], '#3cf2c3', 4);
      g.line([V.x0 + 30, V.y0, V.x0 + 130, 860], '#5c6699', 40); g.line([V.x1 - 30, V.y0, V.x1 - 130, 860], '#5c6699', 40);
      if (warp) g.text('ワープ', 500, 930, { size: 44, f: '#3cf2c3' });
    },
    hit(g, s, k) {
      const x = atHit(s, 500);
      g.fx.lines(x, 540, { n: 12, r0: 170, r1: 300, w: 12, c: '#ffd6a5' });
      g.fx.burst(x, 540, { n: 12, c: ['#ffb15a', '#ffe36b', '#ffffff'], shape: 'spark', sp: [400, 900], size: [14, 24], g: 0 });
      g.fx.pop(k === 1 ? 'ビュン' : 'ワープ！', 500, 300, { size: k === 1 ? 104 : 116, c: k === 1 ? '#ffffff' : '#3cf2c3' });
      g.fx.shake(k === 1 ? 6 : 10, 0.14);
      if (k === 2) g.fx.flash('#cfe0ff', 0.45, 0.2);
    },
  },

  /* 波しぶきをよける（カニがびしょぬれ） */
  {
    id: 'step-wave', acts: ['step'], modes: ['both', 'alt'], theme: 'sea', sfx: 'splash',
    vars: [{ k: 'wave', name: '波しぶきをよける', short: '波しぶき' }],
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), SEA = 330;
      g.bg('#7fd0ff', '#e0f6ff');
      g.at(WX(s), BOB(s), () => {
        g.sun(200, 120, 56); g.cloud(760, 140, 0.8);
        g.band(SEA, 'bottom', '#1f8fd6'); g.band(SEA, SEA + 12, '#58b8f0');
        for (let i = 0; i < 10; i++) { const x = Math.floor(V.x0 / 100) * 100 - 200 + ((i * 263) % (V.x1 - V.x0 + 400)), y = SEA + 50 + (i % 3) * 70; g.arc(x, y, 36, Math.PI * 1.15, Math.PI * 1.85, 'rgba(255,255,255,0.6)', 6); }
        // 寄せる波
        for (const i of [0, 1]) { const q = fly(s, i, 0.5); if (q <= 0 || q >= 1) continue; const y = lerp(SEA + 20, 600, q * q), w = lerp(200, 420, q); g.curve([500 - w, y + 10, 500 - w * 0.4, y - 14, 500 + w * 0.4, y - 14, 500 + w, y + 10], '#ffffff', 16 * q + 4); }
        // 岩とカニ
        g.blob([280, 700, 300, 610, 380, 570, 500, 560, 620, 575, 700, 620, 720, 700], '#7d8597');
        g.blob([330, 690, 360, 630, 450, 600, 520, 640, 480, 690], '#9aa3b5', 0);
        g.band(700, 'bottom', '#c9ced8', 7); for (let x = Math.floor((V.x0 - 300) / 160) * 160; x < V.x1 + 300; x += 160) g.line([x, 700, x - 60, 1600], '#b4bac6', 5);
        const wet = a1 >= 0, weed = a2 >= 0 && a2 > 0.25;
        g.at(520, 560, 0, 1, 1, () => {
          for (const sg of [-1, 1]) { g.line([sg * 40, 10, sg * 80, 40], '#e2583e', 8); g.line([sg * 44, 0, sg * 90, 10], '#e2583e', 8); }
          for (const sg of [-1, 1]) g.at(sg * 70, -40, sg * (wet ? 0.7 : 0.3), 1, 1, () => g.path('M0 0 Q-14 -40 4 -52 L10 -30 L22 -48 Q30 -10 0 0Z', '#ff6b4a'));
          g.ell(0, 0, 64, 40, '#ff6b4a'); g.line([-18, -30, -22, -56], C.ol, 5); g.line([18, -30, 22, -56], C.ol, 5);
          if (wet) { g.line([-30, -60, -14, -54], C.ol, 5); g.line([30, -60, 14, -54], C.ol, 5); g.circ(-22, -58, 8, '#ffffff', 4); g.circ(22, -58, 8, '#ffffff', 4); } else { g.circ(-22, -58, 9, '#ffffff', 4); g.circ(22, -58, 9, '#ffffff', 4); g.circ(-22, -58, 4, C.ol, 0); g.circ(22, -58, 4, C.ol, 0); }
          g.arc(0, 6, 14, 0.3, Math.PI - 0.3, C.ol, 4);
          if (weed) g.path('M-60 -70 Q-30 -110 0 -86 Q30 -112 60 -72 Q50 -40 40 -20 Q30 -60 0 -60 Q-30 -60 -40 -20 Q-50 -40 -60 -70Z', '#3c9a4f');
          if (wet) for (const [dx, ph] of [[-46, 0], [40, 0.4], [0, 0.7]]) { const t = (s.t * 1.3 + ph) % 1; g.alpha(1 - t, () => g.path(`M${dx} ${20 + t * 60} q6 10 0 14 q-6 -4 0 -14Z`, '#9fdcff', 0)); }
        });
        // しぶき（ぼくがいた まん中）
        for (const [a, big] of [[a1, 1], [a2, 1.3]]) {
          if (a < 0 || a > 1.1) continue;
          const h = E.outQ(clamp(a / 0.22)) * (1 - 0.6 * prog(a - 0.4, 0.7)), fade = 1 - prog(a - 0.6, 0.5);
          g.alpha(fade, () => {
            g.ell(500, 640, 230 * big, 40, '#ffffff', 0);
            for (const [dx, hk, w] of [[-120, 0.62, 30], [120, 0.7, 30], [0, 1, 44]]) {
              const x = 500 + dx * big, top = 640 - 560 * big * hk * h;
              for (const sg of [-1, 1]) g.curve([x, top, x + sg * 90 * big, top + 40, x + sg * 170 * big, 600], 'rgba(230,248,255,0.85)', 14 * big);
              g.taper(x, 650, x, top, w * big, w * 0.55 * big, '#e6f7ff', 5);
              g.line([x - w * 0.25 * big, 640, x - w * 0.15 * big, top + 30], '#ffffff', 8 * big);
              for (const [ox, oy, r] of [[-26, 10, 26], [24, 6, 24], [0, -16, 30]]) g.circ(x + ox * big, top + oy * big, r * big, '#ffffff', 5);
            }
          });
        }
      });
    },
    hit(g, s, k) {
      const x = atHit(s, 500);
      g.fx.splash(x, 520, '#bfeaff', k === 1 ? 20 : 30);
      g.fx.pop(k === 1 ? 'ザバーン' : 'ザッパーン', x, 160, { size: 100, c: '#ffffff', o: '#1f5f9a' });
      g.fx.pop('セーフ', 500 + sgn(s.lastDir) * 130, 420, { size: 74, c: C.yellow, life: 0.8 });
      g.fx.shake(k === 1 ? 6 : 9, 0.14);
    },
  },

  /* 闘牛をひらりとかわす */
  {
    id: 'step-bull', acts: ['step'], modes: ['both', 'alt'], theme: 'animal', sfx: 'whoosh',
    vars: [{ k: 'bull', name: '闘牛をかわす', short: '闘牛' }],
    init(s) { const r = s.r; s.my.fl = Array.from({ length: 12 }, () => [r() * 800 + 100, 480 + r() * 420, r() * TAU, (r() * 3) | 0]); },
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), wx = WX(s);
      g.bg('#8fd3ff', '#fff0d0');
      let pass = 0;
      g.at(wx, BOB(s), () => {
        g.band(170, 360, '#d9b36c'); for (let row = 0; row < 2; row++) for (let x = Math.floor((V.x0 - 300) / 64) * 64; x < V.x1 + 300; x += 64) g.circ(x + (row & 1) * 32, 220 + row * 80, 22, ['#ff6b6b', '#ffd23f', '#4dabf7', '#ffffff', '#ff9fbd'][((Math.round(x / 64) + row) % 5 + 5) % 5], 0);
        g.band(360, 440, '#c0392b'); g.band(360, 372, '#ffffff');
        g.band(440, 'bottom', '#e8c48a', 7); g.ell(500, 900, 900, 300, '#e2b978', 0);
        for (const [j, [x, y, a, c]] of s.my.fl.entries()) { const aa = j < 4 ? a1 : a2, t = prog(aa - 0.1 - (x % 7) * 0.03, 0.4); if (t) g.at(x, lerp(-200, y, t), a, 1, 1, () => { g.star(0, 0, 26, 14, 5, ['#ff4f6d', '#ffd23f', '#ffffff'][c], 4); g.circ(0, 0, 7, '#ffcf3f', 0); }); }
        for (const i of [0, 1]) {
          const q = fly(s, i, 0.5); if (q <= 0 || q > 1.22) continue;
          const t = Math.min(q, 1), k = lerp(0.26, 1.02, t * t) + Math.max(0, q - 1) * 5, y = lerp(450, 770, Math.pow(t, 1.6)) + Math.max(0, q - 1) * 1600;
          bull(g, 500, y, k, i === 1 && q > 1);
          if (q > 0.7 && q <= 1.1) pass = Math.max(pass, 1 - Math.abs(q - 1) / 0.3);
        }
        if (a2 >= 0) { const t = prog(a2 - 0.25, 0.4); if (t) { const y = 470; g.at(500, y, 0, 0.32, 0.32, () => bull(g, 0, 0, 1, true)); for (let i = 0; i < 3; i++) { const an = s.t * 5 + i * TAU / 3; g.star(500 + Math.cos(an) * 60, y - 140 + Math.sin(an) * 16, 14, 6, 5, C.gold, 3); } } }
      });
      // 赤い布（両手で持つ。いつも世界のまん中＝牛が通る所）
      const cx = 500 + wx, hx = 500 + wx * 0.25, fl = pass * 0.9;
      g.line([hx, 900, cx, 520], '#8a5a36', 14);
      g.at(cx, 520, fl * (s.x > 0 ? -1 : 1), 1, 1, () => { g.path('M-150 0 Q0 -16 150 0 Q170 160 120 300 Q40 270 0 310 Q-40 270 -120 300 Q-170 160 -150 0Z', '#e8202f'); g.path('M-130 20 Q-120 150 -100 270', null, 0); g.curve([-110, 30, -100, 160, -80, 270], '#b8141f', 6); g.curve([40, 30, 50, 160, 40, 280], '#b8141f', 6); });
      for (const sd of ['L', 'R']) { const sg = sd === 'L' ? -1 : 1; g.arm(hx + sg * 30, 880 + (sd === 'L' ? 30 : 0), Math.atan2(520 - 900, cx - hx) + sg * 0.35, { hand: 'grip', side: sd }); }
    },
    hit(g, s, k) {
      const x = atHit(s, 500);
      g.fx.smoke(x, 820, 6, '#f2dcb0');
      g.fx.lines(x, 600, { n: 10, r0: 180, r1: 300, w: 12 });
      g.fx.pop(k === 1 ? 'ヒラリ' : 'オーレ！', 500, 300, { size: k === 1 ? 104 : 120, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) g.sfx('cheer');
      g.fx.shake(k === 1 ? 6 : 9, 0.14);
    },
  },

  /* おばけをよける（2回目はおばけ同士がゴツン） */
  {
    id: 'step-ghost', acts: ['step'], modes: ['both', 'alt'], theme: 'spooky', sfx: 'swish',
    vars: [{ k: 'ghost', name: 'おばけをよける', short: 'おばけ' }],
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s);
      g.bg('#1d1438');
      g.at(WX(s), BOB(s), () => {
        g.rect(V.x0 - 300, V.y0 - 40, V.x1 - V.x0 + 600, 640 - V.y0, '#3a2a5e', 0);
        for (let x = Math.floor((V.x0 - 300) / 120) * 120; x < V.x1 + 300; x += 120) g.rect(x, V.y0 - 40, 60, 640 - V.y0, '#33264f', 0);
        g.rr(400, 150, 200, 260, 90, '#0f0b22', 7); g.circ(470, 230, 34, '#fff3b0', 0); g.circ(484, 222, 30, '#0f0b22', 0);
        for (const x of [180, 820]) { g.rr(x - 70, 210, 140, 170, 10, '#7a5a2a', 7); g.rr(x - 54, 226, 108, 138, 6, '#2b2140', 0); g.circ(x, 280, 30, '#5a4a7a', 0); g.circ(x - 10, 274, 6, '#ffef8a', 0); g.circ(x + 10, 274, 6, '#ffef8a', 0); }
        g.band(640, 'bottom', '#2a1f3f'); for (let i = -12; i <= 12; i++) g.line([500 + i * 80, 640, 500 + i * 300, 1700], '#3a2c55', 5);
        for (const x of [60, 340, 660, 940]) {
          const out = (x === 340 || x === 660) && a1 > 0.05, f = 1 + 0.15 * Math.sin(s.t * 18 + x); g.rr(x - 12, 430, 24, 70, 6, '#f4ead3', 4);
          if (out) { const t = prog(a1 - 0.05, 1); g.alpha(1 - t, () => g.curve([x, 424, x - 10, 390 - 60 * t, x + 8, 350 - 100 * t], '#b9b2d6', 6)); continue; }
          g.glow(x, 410, 70 * f, '#ffd36b', 0.5); g.path(`M${x} ${404 - 22 * f} Q${x + 12} ${416} ${x} ${428} Q${x - 12} ${416} ${x} ${404 - 22 * f}Z`, '#ffcf3f', 0);
        }
        // 1回目：まん中を通りぬける
        { const q = fly(s, 0, 0.45); if (q > 0 && q < 1.25) { const t = Math.min(q, 1), sc = lerp(0.3, 1.6, t * t) + Math.max(0, q - 1) * 4, y = lerp(380, 540, t) + Math.max(0, q - 1) * 600; g.alpha(q > 1 ? 1 - (q - 1) / 0.25 : 1, () => ghost(g, 500 + Math.sin(s.t * 6) * 20 * (1 - t), y, sc, 0)); } }
        // 2回目：左右から来て、まん中でゴツン
        { const q = fly(s, 1, 0.5); if (q > 0) for (const sg of [-1, 1]) {
          let x, y, rot = 0, face = 0, sc;
          if (q < 1) { const t = q; x = 500 + sg * lerp(420, 95, E.inQ(t)); y = lerp(420, 560, t); sc = lerp(0.6, 1.3, t); }
          else { const a = Math.max(0, a2), b = prog(a, 0.5); x = 500 + sg * (95 + 120 * E.outQ(b)); y = 560 + 140 * b; sc = 1.3; rot = sg * 0.5 * b; face = 1; }
          ghost(g, x, y, sc, face, rot);
          if (q >= 1) for (let i = 0; i < 3; i++) { const an = s.t * 5 + i * TAU / 3 + sg; g.star(x + Math.cos(an) * 70, y - 170 + Math.sin(an) * 18, 14, 6, 5, C.gold, 3); }
        } }
      });
    },
    hit(g, s, k) {
      const x = atHit(s, 500);
      if (k === 1) { g.fx.lines(x, 540, { n: 10, r0: 160, r1: 280, w: 12, c: '#d9d0ff' }); g.fx.pop('スーッ', x, 250, { size: 100, c: '#e8e0ff' }); g.fx.pop('セーフ', 500 + sgn(s.lastDir) * 120, 420, { size: 74, c: C.yellow, life: 0.8 }); }
      else { g.fx.stars(x, 480, 10); g.fx.lines(x, 520, { n: 12, r0: 80, r1: 200, w: 12 }); g.fx.pop('ゴツン！', x, 250, { size: 116, c: C.yellow }); g.fx.shake(10, 0.16); g.sfx('knock'); }
    },
  },

  /* ゴールキーパー（左右のシュートをキャッチ） */
  {
    id: 'step-keeper', acts: ['step'], modes: ['both', 'alt'], theme: 'sports', sfx: 'punch',
    vars: [{ k: 'keeper', name: 'ゴールを守る', short: 'キーパー' }],
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), [d1, d2] = dirs(s), wx = WX(s);
      g.bg('#7cc8ff', '#d6f0ff');
      let held = null;
      g.at(wx, BOB(s), () => {
        g.band(220, 330, '#3b3f6b'); for (let x = Math.floor((V.x0 - 300) / 40) * 40; x < V.x1 + 300; x += 40) g.circ(x + 20 * ((Math.round(x / 40)) & 1), 250 + ((Math.round(x / 40)) % 3) * 24, 11, ['#ffd0a8', '#ff9fbd', '#9fd8ff', '#ffe066'][Math.round(x / 40) & 3], 0);
        g.band(330, 'bottom', '#4caf50');
        for (let i = 0, y = 330, h = 24; y < V.y1 + 60; i++, y += h, h *= 1.3) if (i % 2) g.band(y, y + h, '#5cbf5c');
        g.ell(500, 470, 10, 4, '#ffffff', 0);
        g.line([V.x0 - 300, 600, V.x1 + 300, 600], '#ffffff', 8); g.line([150, 600, 220, 420, 780, 420, 850, 600], '#ffffff', 6);
        // けるひと
        const kq = Math.max(fly(s, 0, 0.42), s.k >= 1 ? fly(s, 1, 0.42) : -1);
        g.at(500 + (s.k >= 1 ? -40 : 40), 470, () => { kid(g, 0, 0, 0.62, '#e8402f', '#2b2140', s.k >= 2 ? 0 : 1); g.cap(10, -50, 10 + 40 * clamp(kq * 3), -10, 9, '#34407a'); if (s.k >= 2) { g.cap(-26, -110, -54, -150, 8, '#e8402f'); g.cap(26, -110, 54, -150, 8, '#e8402f'); g.circ(-50, -152, 9, C.skin, 3); g.circ(50, -152, 9, C.skin, 3); } });
        // ゴールわく（自分のまわり）
        g.rect(-70, 20, 30, 900, '#ffffff', 6); g.rect(1040, 20, 30, 900, '#ffffff', 6); g.rect(-70, 20, 1140, 30, '#ffffff', 6);
        // ボール
        for (const i of [0, 1]) {
          const X = 500 + SH * sgn(i ? d2 : d1), q = fly(s, i, 0.42), a = i ? a2 : a1;
          if (q <= 0) continue;
          if (q < 1) { const t = q, x = lerp(500, X, t), y = lerp(462, 560, t) - 120 * Math.sin(Math.PI * t), r = lerp(14, 78, t * t); g.shadow(x, lerp(470, 900, t), r, r * 0.25, 0.2); soccer(g, x, y, r, t * 9); }
          else if (s.k === i + 1 && (i === 1 || s.u < 0.55)) held = [X, a];
        }
      });
      if (held) soccer(g, 500, 560 + jig(held[1], 10, 18, 7), 78, 0);
      // グローブ
      const p = clamp(s.p), cl = held ? 0 : p, open = 90 + 120 * cl;
      for (const sd of ['L', 'R']) { const sg = sd === 'L' ? -1 : 1; g.arm(500 + sg * open, lerp(580, 760, cl), -Math.PI / 2 - sg * lerp(0.55, 0.25, cl), { hand: 'glove', glove: '#ffd23f', cuff: '#2b2140', side: sd, s: 1.05, sleeve: '#26386b' }); }
    },
    hit(g, s, k) {
      g.fx.lines(500, 560, { n: 12, r0: 130, r1: 250, w: 12 });
      g.fx.pop(k === 1 ? 'キャッチ' : 'ナイスセーブ', 500, 250, { size: k === 1 ? 104 : 100, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.shake(k === 1 ? 7 : 10, 0.12);
      if (k === 2) { g.fx.stars(500, 500, 10); g.sfx('cheer'); }
    },
  },

  /* 落ちてくる果物をかごでキャッチ（みかん → 大きなメロン） */
  {
    id: 'step-fruit', acts: ['step'], modes: ['both', 'alt'], theme: 'farm', sfx: 'pop',
    vars: [{ k: 'fruit', name: '果物をキャッチ', short: '果物' }],
    init(s) { const r = s.r; s.my.lv = Array.from({ length: 22 }, () => [r() * 1600 - 300, r() * 200, 70 + r() * 60]); s.my.fr = Array.from({ length: 8 }, () => [r() * 1500 - 250, 120 + r() * 90]); },
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), [d1, d2] = dirs(s), wx = WX(s);
      g.bg('#9fdcff', '#f2fbff');
      g.at(wx, BOB(s), () => {
        g.hills(560, '#a8dc78', 40, 9, 4); g.band(640, 'bottom', '#7cc35a');
        for (const x of [-100, 300, 700, 1100]) g.rect(x - 22, 100, 44, 560, '#8a5a36', 0);
        g.rect(V.x0 - 300, V.y0 - 40, V.x1 - V.x0 + 600, 240 - V.y0, '#3f9a3e', 0);
        for (const [x, y, r] of s.my.lv) g.circ(x, y + 120, r, ((x | 0) % 3) ? '#4fae4a' : '#3f9a3e', 0);
        for (const [x, y] of s.my.fr) fruit(g, x, y + 60, 'mikan', 0.7);
        for (const i of [0, 1]) {
          const X = 500 + SH * sgn(i ? d2 : d1), q = fly(s, i, 0.4);
          if (q <= 0 || q >= 1) { if (q <= 0) fruit(g, X, 230, i ? 'melon' : 'mikan', i ? 1 : 1.1); continue; }
          fruit(g, X, lerp(230, 690, q * q), i ? 'melon' : 'mikan', i ? 1 : 1.1, q * 3);
        }
      });
      // かご（両手で持つ）
      const n = (a1 >= 0 ? 1 : 0) + (a2 >= 0 ? 1 : 0), heavy = a2 >= 0 ? 30 * E.outQ(prog(a2, 0.2)) + jig(a2, 18, 16, 6) : 0, [qx, qy] = squash(s.k ? s.age : 9, 0.14);
      g.at(500, 820 + heavy, 0, qx, qy, () => {
        if (n >= 1) fruit(g, a2 >= 0 ? -70 : 0, -70, 'mikan', 1.05);
        if (n >= 2) fruit(g, 50, -86, 'melon', 1);
        g.path('M-200 -60 L200 -60 L160 90 L-160 90 Z', '#c98b52');
        for (let i = 0; i < 4; i++) g.line([-190 + i * 9, -24 + i * 30, 190 - i * 9, -24 + i * 30], '#a86f43', 5);
        g.rr(-210, -76, 420, 30, 12, '#b07a45');
      });
      for (const sd of ['L', 'R']) { const sg = sd === 'L' ? -1 : 1; g.arm(500 + sg * 220, 770 + heavy, -Math.PI / 2 + sg * 0.5, { hand: 'grip', side: sd }); }
    },
    hit(g, s, k) {
      g.fx.burst(500, 740, { n: 10, c: ['#4fae4a', '#7cd36a'], shape: 'leaf', sp: [200, 500], size: [14, 24], g: 700 });
      g.fx.pop(k === 1 ? 'キャッチ' : 'ずっしり', 500, 300, { size: k === 1 ? 104 : 110, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.shake(k === 1 ? 5 : 9, 0.12);
      if (k === 2) g.fx.stars(500, 620, 10);
    },
  },
  /* 卓球（左右に来た球を打ち返す） */
  {
    id: 'step-pingpong', acts: ['step'], modes: ['both', 'alt'], theme: 'sports', sfx: 'wood',
    vars: [{ k: 'pingpong', name: '卓球で打ち返す', short: '卓球' }],
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), [d1, d2] = dirs(s), wx = WX(s), age = s.k ? s.age : 9;
      g.bg('#2f3b74');
      g.at(wx, BOB(s), () => {
        for (let x = Math.floor((V.x0 - 300) / 260) * 260; x < V.x1 + 300; x += 260) { g.rr(x + 30, 120, 200, 70, 10, '#3f4d8f', 0); g.rect(x + 50, 145, 160, 20, '#ffd23f', 0); }
        g.band(330, 430, '#1f6fb2'); g.band(330, 340, '#ffffff');

        g.band(430, 'bottom', '#d9624a');
        // あいて
        const hitBack = s.k >= 1 && s.u < 0.5 ? 1 : 0;
        g.at(500, 470, () => { kid(g, 0, 0, 0.78, '#3cc46b', '#2b2140', s.k >= 2 ? 0 : 1); const px = 90, py = -170 - 30 * Math.sin(s.t * 3); g.cap(30, -140, px, py, 10, '#3cc46b'); g.circ(px + 26, py - 20, 34, '#e8402f'); g.rr(px - 4, py - 4, 16, 40, 6, '#c98b52', 4); });
        // 台
        g.poly([330, 440, 670, 440, 900, 740, 100, 740], '#1f5fa8'); g.poly([100, 740, 900, 740, 900, 770, 100, 770], '#174a86');
        g.line([500, 440, 500, 740], '#ffffff', 5); g.poly([330, 440, 670, 440, 900, 740, 100, 740], null, 7);
        g.line([330, 440, 670, 440], '#ffffff', 6); g.line([100, 740, 900, 740], '#ffffff', 8);
        g.rect(240, 540, 520, 46, 'rgba(255,255,255,0.35)', 0); g.grid(240, 540, 520, 46, 20, 'rgba(255,255,255,0.55)', 2); g.rect(240, 536, 520, 8, '#ffffff', 0);
        g.rect(150, 770, 24, 240, '#5c6478', 0); g.rect(826, 770, 24, 240, '#5c6478', 0);
        // 球
        for (const i of [0, 1]) {
          const X = 500 + SH * sgn(i ? d2 : d1), q = fly(s, i, 0.42), r = (s.ph - i) / (i ? 0.25 : 0.38);
          let x, y, rad;
          if (q > 0 && q <= 1) { const bx = lerp(500, X, 0.55); if (q < 0.6) { const t = q / 0.6; x = lerp(560, bx, t); y = lerp(300, 650, t) - 120 * Math.sin(Math.PI * t); rad = lerp(10, 18, t); } else { const t = (q - 0.6) / 0.4; x = lerp(bx, X, t); y = lerp(650, 540, t) - 80 * Math.sin(Math.PI * t); rad = lerp(18, 24, t); } }
          else if (q > 1 && r < 1) { x = lerp(X, i ? 560 + (500 - X) * 0.3 : 420, r); y = lerp(540, i ? 150 : 360, r) - (i ? 0 : 90 * Math.sin(Math.PI * r)); rad = lerp(24, i ? 12 : 10, r); }
          else continue;
          rad *= 1.45; g.shadow(x, Math.max(y + 30, 600), rad, rad * 0.3, 0.2); g.circ(x, y, rad, '#ff9f1c', 5); g.circ(x - rad * 0.3, y - rad * 0.3, rad * 0.32, '#ffd9a0', 0);
        }
      });
      // 点数（画面に固定）
      g.rr(410, 30, 180, 92, 14, '#1b1f3a', 6); g.line([500, 44, 500, 108], '#3f4d8f', 5);
      g.text(String(Math.min(2, s.k)), 455, 78, { size: 66, f: s.k ? '#ffd23f' : '#ffffff' }); g.text('0', 545, 78, { size: 66, f: '#ffffff' });
      // ラケット（右手・画面のまん中で打つ）
      const sw = jig(age, 0.5, 16, 6), lean = -0.3 * s.x;
      g.at(560, 640, 0.5 + sw + lean, 1, 1, () => { g.rr(-14, -20, 28, 110, 10, '#c98b52', 5); g.circ(-0, -110, 92, '#e8402f'); g.circ(0, -110, 80, '#ff5a5f', 0); g.hl(-30, -140, 30, 12, -0.5, 0.4); });
      g.arm(560, 680, -Math.PI / 2 + 0.5 + lean * 0.5, { hand: 'grip', side: 'R' });
    },
    hit(g, s, k) {
      g.fx.lines(500, 540, { n: 10, r0: 90, r1: 200, w: 10 });
      g.fx.pop(k === 1 ? 'カコン' : 'スマッシュ！', 500, 230, { size: k === 1 ? 100 : 104, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.shake(k === 1 ? 5 : 9, 0.12);
      if (k === 2) { g.fx.stars(500, 300, 8); g.sfx('cheer'); }
    },
  },

  /* スキーで旗門をくぐる */
  {
    id: 'step-ski', acts: ['step'], modes: ['both', 'alt'], theme: 'winter', sfx: 'swish',
    vars: [{ k: 'ski', name: 'スキーで旗をくぐる', short: 'スキー' }],
    init(s) { const r = s.r; s.my.tr = Array.from({ length: 10 }, (_, i) => [(i % 2 ? 1 : -1) * (560 + r() * 400), r() * 2.2]); s.my.goal = 0; },
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), [d1, d2] = dirs(s), H = 330, cam = SH * s.x;
      const Y = d => H + 520 / (1 + 4 * d), K = d => 1 / (1 + 4 * d), SX = (X, d) => 500 + (X - 500 - cam) * K(d);
      g.bg('#6ec2ff', '#e6f6ff');
      g.at(-cam * 0.08, 0, () => { g.poly([V.x0 - 100, H + 6, 120, 160, 300, 260, 480, 110, 700, 250, 860, 150, V.x1 + 100, H + 6], '#8fa3d9', 0); g.poly([60, 230, 120, 160, 180, 225, 150, 215, 120, 236, 90, 214], '#ffffff', 0); g.poly([410, 190, 480, 110, 550, 190, 515, 176, 480, 200, 445, 176], '#ffffff', 0); });
      g.band(H, 'bottom', '#f4f9ff');
      const run = s.t * 2.2;
      for (let j = 0; j < 7; j++) { const d = ((j * 0.32 - run * 0.5) % 2.24 + 2.24) % 2.24 - 0.1; if (d < -0.1) continue; const y = Y(d), k = K(d); g.curve([SX(-600, d), y, SX(500, d), y + 10 * k, SX(1600, d), y], '#dde9f8', 14 * k + 2); }
      // 木
      for (const [X, z] of s.my.tr) { const d = ((z - run * 0.5) % 2.2 + 2.2) % 2.2 - 0.05; const y = Y(d), k = K(d), x = SX(500 + X, d); g.at(x, y, 0, k, k, () => { g.rect(-16, -60, 32, 60, '#8a5a36', 0); g.tri(-120, -50, 120, -50, 0, -300, '#2f8f5b'); g.tri(-90, -170, 90, -170, 0, -380, '#3aa56a'); g.path('M-70 -180 Q0 -160 70 -180 L0 -370Z', '#ffffff', 0); }); }
      // ゴール
      { const d = 1.28 - s.ph; if (d > -0.05 && d < 1.8) { const y = Y(d), k = K(d), x1 = SX(80, d), x2 = SX(920, d); g.rect(x1 - 14 * k, y - 420 * k, 28 * k, 420 * k, '#e8402f', 0); g.rect(x2 - 14 * k, y - 420 * k, 28 * k, 420 * k, '#e8402f', 0); g.rr(x1 - 20 * k, y - 470 * k, x2 - x1 + 40 * k, 90 * k, 14 * k, '#ffffff', 6 * k); g.text('ゴール', (x1 + x2) / 2, y - 425 * k, { size: 64 * k, f: '#e8402f' }); } }
      // 旗門（その側の外を通る）
      for (const i of [1, 0]) {
        const d = (i - s.ph) * 1.1; if (d < -0.12 || d > 2) continue;
        const sd = i ? d2 : d1, X = 500 + sgn(sd) * (SH + 170), y = Y(d), k = K(d), x = SX(X, d), col = i ? '#3a86ff' : '#e8402f';
        g.at(x, y, 0, k, k, () => { g.shadow(0, 0, 60, 14, 0.25); g.rect(-9, -330, 18, 330, '#ffffff', 5); g.rect(-sgn(sd) * 0 - 9 + (sgn(sd) > 0 ? -150 : 18), -320, 150, 110, col, 6); g.circ(0, -334, 12, col, 4); });
      }
      // スキー板（自分）
      const lean = s.k === 0 ? sgn(d1) : sgn(d2), carve = 0.22 * lean * Math.sin(Math.PI * clamp(s.p));
      for (const sg of [-1, 1]) g.at(500 + sg * 110 + 30 * s.x, 1120, carve, 1, 1, () => { g.rr(-34, -420, 68, 520, 30, sg < 0 ? '#ff4fa3' : '#ff4fa3'); g.rr(-34, -420, 68, 60, 30, '#ffd23f', 0); g.rr(-30, -170, 60, 70, 12, '#2b2140', 0); });
      if (s.ph >= 1.2 && !s.my.goal) { s.my.goal = 1; g.fx.confetti(60); g.sfx('goal'); }
    },
    hit(g, s, k) {
      const x = 500 + sgn(s.lastDir) * 150;
      g.fx.burst(500, 900, { n: 16, c: ['#ffffff', '#e8f1ff'], shape: 'snow', sp: [300, 700], size: [14, 26], g: 800, dir: -Math.PI / 2 - sgn(s.lastDir) * 0.8, spread: 1.4 });
      g.fx.pop(k === 1 ? 'シュッ' : 'ナイス！', 500 - sgn(s.lastDir) * 150, 300, { size: 100, c: k === 1 ? '#ffffff' : C.yellow, o: '#3a5a8a' });
      if (k === 2) g.fx.stars(x, 400, 8);
    },
  },

  /* カニと横歩き（なかまがふえる） */
  {
    id: 'step-crab', acts: ['step'], modes: ['both', 'alt'], theme: 'sea', sfx: 'click',
    vars: [{ k: 'crab', name: 'カニと横歩き', short: 'カニ歩き' }],
    init(s) { const r = s.r; s.my.sh = Array.from({ length: 14 }, () => [r() * 2000 - 500, 600 + r() * 500, (r() * 3) | 0, r() * TAU]); },
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), [d1, d2] = dirs(s);
      g.bg('#7fd0ff', '#e6f7ff');
      g.at(WX(s), BOB(s) * 0.5, () => {
        g.cloud(240, 110, 0.8); g.cloud(820, 160, 0.6);
        g.band(260, 470, '#2fa7e6'); for (let x = Math.floor((V.x0 - 300) / 120) * 120; x < V.x1 + 300; x += 120) g.arc(x + 60, 300 + 20 * Math.sin(x + s.t), 26, Math.PI, 0, '#ffffff', 5);
        g.band(470, 'bottom', '#f2d49b');
        g.curve([V.x0 - 300, 480, 200, 500, 500, 470, 800, 500, V.x1 + 300, 480], '#ffffff', 16);
        for (const [x, y, t, a] of s.my.sh) g.at(x, y, a, 1, 1, () => { if (t === 0) g.star(0, 0, 30, 13, 5, '#ff9f6b'); else if (t === 1) { g.path('M0 -24 L22 14 L-22 14Z', '#ffd6e0'); g.line([0, -20, 0, 12], '#e8a0b4', 3); } else g.ell(0, 0, 22, 14, '#c9b48a', 0); });
      });
      // カニたち（いっしょに横へ歩くので画面に固定）
      const list = [[0, 0, -1]];
      if (s.k >= 1) list.push([-230, 0, a1]); if (s.k >= 2) { list.push([230, 0, a2]); list.push([-440, 0, a2 - 0.08]); list.push([440, 0, a2 - 0.08]); }
      for (const [dx, _, a] of list) {
        const inT = a < 0 ? 1 : E.outBack(prog(a, 0.35)), x = 500 + dx + (a < 0 ? 0 : (dx >= 0 ? 1 : -1) * 600 * (1 - inT)), walk = s.t * 12 + dx;
        const snap = (s.k ? Math.max(0, jig(s.age, 1, 14, 5)) : 0), up = s.k >= 2 ? 1 : 0;
        crab(g, x, 760 + Math.abs(Math.sin(walk)) * -10, dx === 0 ? 1.25 : 1, walk, snap, up);
      }
    },
    hit(g, s, k) {
      g.fx.burst(500, 650, { n: 10, c: ['#ffffff', '#cfefff'], shape: 'dot', sp: [100, 300], size: [10, 20], g: -300, life: [0.6, 1] });
      g.fx.pop(k === 1 ? 'チョキン' : 'カニカニ！', 500, 330, { size: k === 1 ? 100 : 110, c: k === 1 ? '#ffffff' : '#ffb39a', o: '#8a2a1a' });
      if (k === 2) g.fx.stars(500, 500, 8, [C.gold, '#ffffff', '#ffb39a']);
    },
  },

  /* ハイタッチ（運動会） */
  {
    id: 'step-highfive', acts: ['step'], modes: ['both', 'alt'], theme: 'school', sfx: 'clap',
    vars: [{ k: 'highfive', name: '友だちとハイタッチ', short: 'ハイタッチ' }],
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), [d1, d2] = dirs(s), wx = WX(s);
      g.bg('#86d0ff', '#e6f6ff');
      g.at(wx, BOB(s), () => {
        g.rect(V.x0 - 300, 220, V.x1 - V.x0 + 600, 180, '#f4ead3', 6); for (let x = Math.floor((V.x0 - 300) / 130) * 130 + 20; x < V.x1 + 300; x += 130) g.rect(x, 260, 80, 60, '#9fd8ff', 5);
        g.band(400, 'bottom', '#e5c28a', 7);
        { const y = 110; g.curve([V.x0 - 300, y, 500, y + 50, V.x1 + 300, y], C.ol, 4); for (let x = Math.floor((V.x0 - 300) / 80) * 80; x < V.x1 + 300; x += 80) { const t = (x - (V.x0 - 300)) / (V.x1 - V.x0 + 600), yy = y + 50 * 4 * t * (1 - t) + 4; g.tri(x, yy, x + 50, yy, x + 25, yy + 54, ['#ff5a5f', '#ffd23f', '#3a86ff', '#3cc46b', '#ff9fbd'][((Math.round(x / 80)) % 5 + 5) % 5], 0); } }
        g.curve([V.x0 - 300, 520, 500, 560, V.x1 + 300, 520], '#ffffff', 10);
        for (const [i, d] of [[0, d1], [1, d2]]) {
          const X = 500 + SH * sgn(d), a = i ? a2 : a1, done = a >= 0, sg = sgn(d), col = i ? '#ff6b8b' : '#4f6bff';
          kid(g, X + sg * 40, 1010, 1.55, col, i ? '#5a3a22' : '#2b2140', done);
          const shy = 1010 - 1.55 * 175, hx = X + sg * 10, hy = done ? 360 - 30 * prog(a, 0.3) : 420;
          g.cap(X + sg * 40 - sg * 40, shy, hx, hy + 40, 18, col); g.at(hx, hy, -sg * 0.2, sg < 0 ? -1 : 1, 1, () => g.hand(0, 0, -Math.PI / 2, { hand: 'palm', side: 'R', s: 0.8 }));
          if (done) g.cap(X + sg * 80, shy, X + sg * 170, shy - 160, 18, col);
        }
      });
      // 自分の手（その側の手でタッチ）
      const d = handDir(s, d1, d2), sg = sgn(d), q = E.ioQ(clamp(s.p));
      g.arm(500 + sg * (30 + 260 * q), lerp(470, 1250, q), -Math.PI / 2 - sg * lerp(0.1, 0.5, q), { hand: 'palm', side: d });
    },
    hit(g, s, k) {
      g.fx.lines(500, 420, { n: 12, r0: 110, r1: 230, w: 12 }); g.fx.burst(500, 420, { n: 10, c: [C.yellow, '#ffffff'], shape: 'star', sp: [300, 700], size: [14, 24], g: 600 });
      g.fx.pop(k === 1 ? 'パチン' : 'イェーイ！', 500, 200, { size: k === 1 ? 110 : 116, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.shake(k === 1 ? 6 : 9, 0.12);
      if (k === 2) { g.fx.confetti(60); g.sfx('cheer'); }
    },
  },

  /* ペンライトの海（ステージから客席へ） */
  {
    id: 'step-penlight', acts: ['step'], modes: ['both', 'alt'], theme: 'music', sfx: 'cymbal',
    vars: [{ k: 'penlight', name: 'ペンライトの海', short: 'ペンライト' }],
    init(s) { const r = s.r, L = []; for (let row = 0; row < 4; row++) { const n = 8 + row * 2; for (let i = 0; i < n; i++) L.push([row, -400 + (i + 0.5) / n * 1800 + (r() - 0.5) * 40, r() * TAU]); } s.my.L = L; },
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), cols = ['#ff4fa3', '#ffd23f', '#3cf2c3', '#4dabf7', '#b07cff', '#ff8a3d'];
      g.bg('#140f2e', '#2a1a4f');
      g.at(WX(s) * 0.7, 0, () => {
        for (const x of [100, 500, 900]) g.alpha(0.1 + 0.06 * Math.sin(s.beat * Math.PI + x), () => g.poly([x - 30, V.y0, x + 30, V.y0, x + 220, 800, x - 220, 800], '#ffffff', 0));
        g.rr(380, 120, 240, 50, 10, '#0c0a1e', 0); g.rect(440, 130, 120, 30, '#3cc46b', 0);
        for (const [row, x, ph] of s.my.L) {
          const y = 400 + row * row * 34 + row * 90, k = 0.6 + row * 0.2, sw = Math.sin(s.beat * Math.PI + ph * 0.3 + x * 0.002) * 0.5;
          let c = '#e8f1ff';
          if (a1 >= 0) c = '#ff4fa3';
          if (a2 >= 0 && a2 > Math.abs(x - 500) / 2400) c = cols[(row + Math.round(x / 160) + 60) % 6];
          g.circ(x, y + 46 * k, 40 * k, '#0a0818', 0);
          g.at(x + 30 * k, y + 20 * k, sw, k, k, () => { g.glow(0, -70, 60, c, 0.6); g.rr(-9, -110, 18, 110, 9, c, 0); });
        }
      });
      // ステージのへり（足もと）
      g.rect(V.x0 - 10, 900, V.x1 - V.x0 + 20, V.y1 - 890, '#2b2140', 0); g.rect(V.x0 - 10, 900, V.x1 - V.x0 + 20, 12, '#ffd23f', 0);
      for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1; x += 90) g.circ(x + 45, 940, 10, cols[Math.abs(Math.round(x / 90) + Math.floor(s.beat)) % 6], 0);
      g.glow(500, 860, 260, '#fff3b0', 0.35);
    },
    hit(g, s, k) {
      g.fx.hearts(500, 420, k === 1 ? 6 : 10);
      g.fx.pop(k === 1 ? 'キャー！' : 'アンコール', 500, 230, { size: k === 1 ? 110 : 100, c: k === 1 ? '#ffb3d9' : C.yellow });
      if (k === 2) { g.fx.confetti(70); g.sfx('cheer'); }
      g.fx.flash('#ffffff', 0.25, 0.12);
    },
  },

  /* 風船をあつめる（2つ持つと ふわっと浮く） */
  {
    id: 'step-balloon', acts: ['step'], modes: ['both', 'alt'], theme: 'party', sfx: 'bubble',
    vars: [{ k: 'balloon', name: '風船をあつめる', short: '風船' }],
    init(s) { s.my.fl = 0; },
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), [d1, d2] = dirs(s), rise = 260 * E.ioQ(prog(a2 - 0.15, 0.9)), cols = ['#ff5a5f', '#3a86ff'];
      g.bg('#8fd8ff', '#fff2e0');
      g.at(WX(s), BOB(s) + rise, () => {
        g.cloud(200, 140 - rise * 0.4, 0.9); g.cloud(800, 60 - rise * 0.4, 0.7);
        g.hills(520, '#9bd77b', 40, 7, 4); g.band(600, 'bottom', '#86c96a');
        for (let x = Math.floor((V.x0 - 300) / 120) * 120; x < V.x1 + 300; x += 120) { g.rect(x + 50, 640, 20, 150, '#ffffff', 5); }
        g.rect(V.x0 - 300, 660, V.x1 - V.x0 + 600, 16, '#ffffff', 5); g.rect(V.x0 - 300, 730, V.x1 - V.x0 + 600, 16, '#ffffff', 5);
        for (const [i, d] of [[0, d1], [1, d2]]) {
          const a = i ? a2 : a1; if (a >= 0) continue;
          const X = 500 + SH * sgn(d), bob = Math.sin(s.t * 2.2 + i) * 10;
          g.curve([X, 680, X - 14, 560, X + 6, 440 + bob], C.ol, 4);
          balloonG(g, X, 340 + bob, cols[i]);
        }
      });
      // にぎった風船（画面に固定）
      for (const [i, d] of [[0, d1], [1, d2]]) {
        const a = i ? a2 : a1; if (a < 0) continue;
        const sg = sgn(d), hx = 500 + sg * 170, hy = 700 - 40 * E.outQ(prog(a, 0.3)), bx = 500 + sg * 230, by = 220 + Math.sin(s.t * 2 + i) * 8;
        g.curve([hx, hy - 40, hx + sg * 30, (hy + by) / 2, bx, by + 96], C.ol, 4);
        balloonG(g, bx, by, cols[i]);
        g.arm(hx, hy, -Math.PI / 2 - sg * 0.15, { hand: 'fist', side: d, s: 0.9 });
      }
      const d = d2;
      if (s.k === 0 || (s.k === 1 && s.u >= 0.45)) { const dd = s.k === 0 ? d1 : d, sg = sgn(dd), q = E.ioQ(clamp(s.p)); g.arm(500 + sg * (20 + 260 * q), lerp(560, 1250, q), -Math.PI / 2 - sg * lerp(0.05, 0.45, q), { hand: 'open', side: dd }); }
      if (rise > 120 && !s.my.fl) { s.my.fl = 1; g.sfx('magic'); g.fx.pop('ふわっ', 500, 520, { size: 110, c: '#ffffff', life: 0.8 }); }
    },
    hit(g, s, k) {
      g.fx.burst(500, 560, { n: 10, c: [k === 1 ? '#ff5a5f' : '#3a86ff', '#ffffff'], shape: 'star', sp: [200, 500], size: [12, 22], g: 400 });
      g.fx.pop(k === 1 ? 'ゲット' : 'ふたつめ！', 500 + sgn(s.lastDir) * 60, 140, { size: 96, c: k === 1 ? '#ffffff' : C.yellow });
    },
  },

  /* 回転ずしのお皿をとる（2皿目は金のお皿） */
  {
    id: 'step-sushi', acts: ['step'], modes: ['both', 'alt'], theme: 'kitchen', sfx: 'pop',
    vars: [{ k: 'sushi', name: '回転ずしのお皿をとる', short: '回転ずし' }],
    draw(g, s, v) {
      const V = g.V, [a1, a2] = ages(s), [d1, d2] = dirs(s), sp = 150, kinds = ['ebi', 'tamago', 'salmon', 'kappa', 'ikura', 'maguro'];
      g.bg('#f3e2c4');
      const vx0 = V.x0 + SH * s.x - 160, vx1 = V.x1 + SH * s.x + 160;
      g.at(WX(s), BOB(s) * 0.6, () => {
        for (let x = Math.floor(vx0 / 140) * 140; x < vx1; x += 140) { g.rr(x + 30, 120, 80, 170, 6, '#fffaf0', 5); g.circ(x + 70, 170, 22, ['#e8402f', '#ff9f6b', '#ffd23f', '#3cc46b'][Math.abs(Math.round(x / 140)) % 4], 0); g.rect(x + 50, 214, 40, 50, 'rgba(43,33,64,0.55)', 0); }
        g.rect(V.x0 - 300, 90, V.x1 - V.x0 + 600, 18, '#8a5a36', 0);
        g.band(400, 560, '#9aa3b5'); g.band(400, 418, '#cfd6e2'); g.band(548, 560, '#5c6478');
        const off = ((s.t * sp) % 60 + 60) % 60;  // ベルトの動き
        for (let x = Math.floor(vx0 / 90) * 90; x < vx1 + 90; x += 90) g.line([x - off * 1.5, 420, x - off * 1.5, 546], '#8f97aa', 4);
        g.band(560, 'bottom', '#d39457', 7); g.band(560, 600, '#b5713f');
        // 目当てのお皿の位置
        const tx = [0, 1].map(i => { const X = 500 + SH * sgn(i ? d2 : d1); return X - sp * (s.ph - i) * s.spr; });
        for (let n = -12; n <= 12; n++) {
          const x = ((n * 230 - s.t * sp) % 5520 + 5520) % 5520 - 1800;
          if (x < vx0 - 60 || x > vx1 + 60 || tx.some((t, i) => (s.k <= i) && Math.abs(t - x) < 140)) continue;
          sushi(g, x, 470, kinds[((n % 6) + 6) % 6], 0);
        }
        for (const i of [0, 1]) if (s.k <= i) sushi(g, tx[i], 470, i ? 'toro' : 'maguro', i);
      });
      // とったお皿（手前に重ねる）
      const n = (a1 >= 0 ? 1 : 0) + (a2 >= 0 ? 1 : 0);
      for (let i = 0; i < n; i++) { const a = i ? a2 : a1, t = E.outQ(prog(a, 0.3)); sushi(g, lerp(500, 500, t), lerp(500, 800 - i * 34, t), i ? 'toro' : 'maguro', i, lerp(1, 1.25, t)); }
      g.at(170, 820, () => { g.rr(-50, -70, 100, 120, 24, '#6b8f6b'); g.ell(0, -70, 50, 16, '#a7c9a0', 5); g.ell(0, -70, 40, 10, '#c9a96a', 0); });
      // 手（その側の手でとる）
      { const d = handDir(s, d1, d2), sg = sgn(d), q = E.ioQ(clamp(s.p)); g.arm(500 + sg * (40 + 240 * q), lerp(500, 1250, q), -Math.PI / 2 - sg * lerp(0.15, 0.5, q), { hand: 'pinch', side: d }); }
    },
    hit(g, s, k) {
      g.fx.burst(500, 470, { n: 10, c: k === 1 ? ['#ffffff', '#ff9fbd'] : [C.gold, '#fff3b0'], shape: 'star', sp: [200, 520], size: [12, 22], g: 500 });
      g.fx.pop(k === 1 ? 'まぐろ！' : '金のお皿！', 500, 250, { size: k === 1 ? 100 : 104, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) { g.fx.stars(500, 700, 10); g.sfx('coin'); }
    },
  },
];

function soccer(g, x, y, r, rot = 0) {
  g.at(x, y, rot, 1, 1, () => {
    g.circ(0, 0, r, '#ffffff');
    g.clipCirc(0, 0, r, () => { g.star(0, 0, r * 0.36, r * 0.3, 5, C.ol, 0); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; g.star(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.32, r * 0.26, 5, C.ol, 0, a + Math.PI); } });
    g.circ(0, 0, r, null); g.hl(-r * 0.35, -r * 0.4, r * 0.28, r * 0.14, -0.6, 0.6);
  });
}

function crab(g, x, y, sc, walk, snap, up) {
  g.at(x, y, 0, sc, sc, () => {
    g.shadow(0, 46, 90, 14, 0.2);
    for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) { const w = Math.sin(walk + i * 1.7 + (sg > 0 ? 1 : 0)) * 10; g.line([sg * 40, 10 + i * 10, sg * (80 + i * 6), 40 + i * 8 + w], '#e2583e', 9); }
    for (const sg of [-1, 1]) g.at(sg * 70, -20, sg * (up ? 0.9 : 0.35 + 0.25 * snap), 1, 1, () => { g.line([0, 20, 0, -20], '#e2583e', 10); g.at(0, -40, 0, 1, 1, () => { g.path(`M0 10 Q-24 -20 -4 -44 L4 -22 L${10 + 10 * snap} -46 Q34 -10 0 10Z`, '#ff6b4a'); }); });
    g.ell(0, 0, 68, 44, '#ff6b4a'); g.hl(-20, -16, 20, 9, -0.3, 0.45);
    g.line([-18, -36, -22, -62], C.ol, 5); g.line([18, -36, 22, -62], C.ol, 5);
    g.circ(-22, -64, 11, '#ffffff', 4); g.circ(22, -64, 11, '#ffffff', 4); g.circ(-20, -64, 5, C.ol, 0); g.circ(24, -64, 5, C.ol, 0);
    if (up) g.path('M-14 4 Q0 22 14 4Z', '#8a2a1a', 4); else g.arc(0, 2, 14, 0.3, Math.PI - 0.3, C.ol, 4);
    g.circ(-40, 2, 8, 'rgba(255,200,200,0.7)', 0); g.circ(40, 2, 8, 'rgba(255,200,200,0.7)', 0);
  });
}
function balloonG(g, x, y, c) {
  g.ell(x, y, 80, 96, c); g.tri(x - 12, y + 94, x + 12, y + 94, x, y + 110, c, 4); g.hl(x - 30, y - 36, 18, 30, -0.4, 0.55);
}
function sushi(g, x, y, kind, gold, sc = 1) {
  g.at(x, y, 0, sc, sc, () => {
    const big = sc > 1.01 || gold || kind === 'maguro' || kind === 'toro';
    if (big) g.shadow(0, 22, 74, 18, 0.25);
    g.ell(0, 10, 74, 28, gold ? '#f2c14e' : kind === 'maguro' ? '#e8402f' : '#3a86ff'); if (big) g.ell(0, 6, 58, 20, gold ? '#ffe08a' : '#ffffff', 0);
    const tops = { maguro: '#e8343c', toro: '#ff9fa8', salmon: '#ff9f6b', tamago: '#ffd23f', ebi: '#ff8a5c', ikura: '#ff7a1a', kappa: '#3cc46b' };
    if (kind === 'ikura' || kind === 'kappa') { g.rr(-30, -40, 60, 46, 12, '#2b2140'); g.ell(0, -40, 28, 10, kind === 'ikura' ? '#ff7a1a' : '#ffffff', 0); if (kind === 'ikura') for (const dx of [-12, 0, 12]) g.circ(dx, -42, 6, '#ffb33d', 0); else g.circ(0, -40, 8, '#3cc46b', 0); return; }
    for (const dx of big ? [-24, 24] : [0]) { g.rr(dx - 24, -26, 48, 30, 12, '#fffaf0'); g.path(`M${dx - 32} -22 Q${dx} -48 ${dx + 32} -24 Q${dx + 28} -12 ${dx} -14 Q${dx - 28} -12 ${dx - 32} -22Z`, tops[kind]); if (kind === 'tamago') g.rect(dx - 6, -36, 12, 34, '#2b2140', 0); if (kind === 'salmon' || kind === 'toro') for (const t of [-12, 12]) g.line([dx + t - 4, -34, dx + t + 4, -18], 'rgba(255,255,255,0.7)', 3); }
  });
}
