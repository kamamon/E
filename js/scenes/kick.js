/* キック — サッカー・缶けり・板割り など */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

function soccerBall(g, x, y, r) {
  g.circ(x, y, r, '#ffffff');
  g.clipCirc(x, y, r, () => {
    g.star(x, y, r * 0.36, r * 0.3, 5, C.ol, 0, -Math.PI / 2);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; g.star(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, r * 0.32, r * 0.26, 5, C.ol, 0, a + Math.PI); g.line([x + Math.cos(a) * r * 0.34, y + Math.sin(a) * r * 0.34, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7], C.ol, 5); }
  });
  g.circ(x, y, r, null); g.hl(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.14, -0.6, 0.6);
}
function beachBall(g, x, y, r, rot) {
  g.circ(x, y, r, '#ffffff');
  g.clipCirc(x, y, r, () => { const cs = [C.red, C.yellow, C.blue, C.green]; for (let i = 0; i < 4; i++) g.at(x, y, rot + i * Math.PI / 2, 1, 1, () => g.path(`M0 0 L${-r * 0.5} ${-r * 1.2} L${r * 0.5} ${-r * 1.2} Z`, cs[i], 0)); });
  g.circ(x, y, r * 0.16, '#ffffff', 4); g.circ(x, y, r, null); g.hl(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.14, -0.6, 0.6);
}
const BALLS = [
  { k: 'soccer', name: 'サッカーでシュート', short: 'シュート', theme: 'sports' },
  { k: 'beach', name: 'ビーチボールを蹴る', short: 'ビーチボール', theme: 'sea', beach: 1 },
];
const SPOT = [500, 845], FLY = 0.34;

/* =========================================================================
   ここから追加分（共通の道具）
   ========================================================================= */
const PI = Math.PI, TAU = PI * 2;
// 足：tx,ty = つま先が当たる所。交互なら休んでいる足は手前で待つ
function legs(g, s, o = {}) {
  const tx = o.tx ?? 500, ty = o.ty ?? 845, alt = s.mode === 'alt', sc = o.s ?? 0.95;
  for (const side of (s.side === 'L' ? ['R', 'L'] : ['L', 'R'])) {
    const sg = side === 'L' ? -1 : 1, active = s.side === side;
    if (!active && !alt) continue;
    const p = active ? s.p : 1;
    const x = lerp(tx + sg * (o.dx ?? 18), 500 + sg * 210, p), y = lerp(ty + 96 * sc, 1290, E.ioQ(p));
    g.leg(x, y, -PI / 2 - sg * lerp(o.a0 ?? 0.08, 0.3, p), { side, s: lerp(sc, 1.25, p), shoe: o.shoe ?? C.red, pants: o.pants, sock: o.sock });
  }
}
// 1回目のあと、次のものが横から転がって来る（0→1）
const rollIn = (s, d = 0.3, t0 = 0.18) => s.k === 0 ? 1 : s.k === 1 ? clamp((s.age - t0) / d) : 0;
// 飛ばしたもの：k 回目に当たってからの進み具合（回数単位）。2回目は場面の終わり（ph 1.3）までに着くよう速く
const DUR = [0.38, 0.15];
const flyQ = (s, k) => s.k >= k ? clamp((s.ph - (k - 1)) / DUR[k - 1]) : -1;
// 着いた瞬間を1回だけ知らせる
function landed(s, k) { const q = flyQ(s, k); if (q >= 1 && !s.my['l' + k]) { s.my['l' + k] = s.t; return true; } return false; }
const sinceLand = (s, k) => s.my['l' + k] ? s.t - s.my['l' + k] : -1;
const CANS = [['#ffd23f', '#ff9f1c'], ['#9be37a', '#2ea44f']];
function can(g, x, y, s, rot, i = 0) {
  const [c1, c2] = CANS[i % 2];
  g.at(x, y, rot, s, s, () => {
    g.rr(-44, -70, 88, 140, 16, c1);
    g.circ(0, 0, 26, c2, 5); if (i % 2) g.path('M0 -16 Q14 0 0 16 Q-14 0 0 -16 Z', '#ffffff', 0); else g.circ(0, 0, 10, '#ffffff', 0);
    g.rect(-44, 46, 88, 10, sh(c1, -0.2), 0);
    g.rr(-44, -70, 88, 140, 16, null);
    g.ell(0, -70, 42, 12, '#dfe5ee', 5); g.ell(0, -70, 16, 5, '#aab4c4', 0);
    g.hl(-24, -30, 8, 40, 0, 0.45);
  });
}
function pebble(g, x, y, s, rot) { g.at(x, y, rot, s, s, () => { g.blob([-46, 10, -40, -22, -6, -36, 34, -28, 48, 4, 26, 30, -20, 32], '#9aa1ad'); g.hl(-14, -16, 16, 8, -0.3, 0.6); }); }
function frog(g, x, y, s, jump, t) {
  g.at(x, y, 0, s, s, () => {
    g.ell(0, 0, 70, 44, '#5cc95a'); g.ell(0, 10, 44, 26, '#c9f2a8', 0);
    for (const sd of [-1, 1]) { g.circ(sd * 34, -40, 22, '#5cc95a'); g.circ(sd * 34, -42, 13, '#ffffff', 0); g.circ(sd * 34, -40, 7, C.ol, 0); g.ell(sd * 60, 30, 26, 12, '#4fae4c'); }
    g.path(jump ? 'M-30 -6 Q0 24 30 -6 Z' : 'M-26 -4 Q0 10 26 -4', jump ? '#ff7a7a' : null, 5);
    void t;
  });
}
function crack(g, x, y, h) { g.line([x + 8, y, x - 8, y - h * 0.3, x + 12, y - h * 0.55, x - 6, y - h * 0.8, x + 6, y - h], C.ol, 6); }
function tanuki(g, x, y, s, t, peek) {
  g.at(x, y, 0, s, s, () => {
    g.path('M50 -30 C120 -40 140 -120 100 -150 C80 -160 70 -130 80 -110 C90 -80 70 -60 40 -60 Z', '#8a6a4a');
    for (let i = 0; i < 3; i++) g.arc(110 - i * 8, -110 + i * 26, 22, 0.2, 2.2, '#3a2a20', 7);
    for (const sd of [-1, 1]) g.circ(sd * 52, -168, 24, '#8a6a4a');
    g.circ(0, -120, 72, '#8a6a4a');
    if (peek) { for (const sd of [-1, 1]) { g.ell(sd * 28, -126, 22, 18, '#3a2a20', 0); g.circ(sd * 28, -126, 8, '#ffffff', 0); } return; }
    g.ell(0, -10, 76, 66, '#8a6a4a'); g.ell(0, 0, 50, 46, '#f3dcc0', 0);
    g.ell(0, -96, 50, 34, '#f3dcc0', 0);
    for (const sd of [-1, 1]) { g.ell(sd * 30, -126, 24, 20, '#3a2a20', 0); g.circ(sd * 28, -128, 9, '#ffffff', 0); g.circ(sd * 28, -127, 5, C.ol, 0); }
    g.circ(0, -100, 10, C.ol, 0); g.path('M-16 -84 Q0 -72 16 -84', null, 5);
    for (const sd of [-1, 1]) g.at(sd * 70, -30, sd * (0.5 + Math.sin(t * 14) * 0.3), 1, 1, () => g.ell(0, -30, 18, 34, '#8a6a4a'));
  });
}
function penguin(g, x, y, s, t, peek) {
  g.at(x, y, 0, s, s, () => {
    if (peek) { g.ell(0, -150, 62, 56, '#2b3048'); g.ell(0, -140, 40, 34, '#ffffff', 0); for (const sd of [-1, 1]) g.circ(sd * 16, -148, 7, C.ol, 0); g.tri(-12, -128, 12, -128, 0, -110, C.orange, 4); return; }
    for (const sd of [-1, 1]) g.at(sd * 66, -60, sd * (0.6 + Math.sin(t * 18) * 0.35), 1, 1, () => g.ell(0, 30, 18, 46, '#2b3048'));
    g.ell(0, -60, 72, 96, '#2b3048'); g.ell(0, -44, 50, 74, '#ffffff', 0);
    g.ell(0, -150, 62, 56, '#2b3048'); g.ell(0, -140, 40, 34, '#ffffff', 0);
    for (const sd of [-1, 1]) { g.circ(sd * 16, -148, 7, C.ol, 0); g.ell(sd * 30, 34, 22, 10, C.orange, 4); g.ell(sd * 30, -128, 10, 6, '#ffb3c6', 0); }
    g.tri(-12, -128, 12, -128, 0, -110, C.orange, 4);
  });
}
function crab(g, x, y, s, t, peek) {
  g.at(x, y, 0, s, s, () => {
    const w = peek ? 0 : Math.sin(t * 16) * 0.25;
    for (const sd of [-1, 1]) g.at(sd * 70, -70, sd * (0.4 + w), 1, 1, () => { g.line([0, 30, 0, -10], '#e8402f', 14); g.path('M-26 -10 Q-34 -60 0 -70 Q34 -60 26 -10 Q12 -34 0 -30 Q-12 -34 -26 -10 Z', '#ff5a3c'); });
    if (peek) return;
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) g.line([sd * 50, -10 + i * 10, sd * (90 + i * 6), 10 + i * 12], '#e8402f', 8);
    g.ell(0, -20, 76, 46, '#ff5a3c'); g.hl(-24, -40, 26, 10, -0.2, 0.5);
    for (const sd of [-1, 1]) { g.line([sd * 18, -56, sd * 22, -80], C.ol, 6); g.circ(sd * 22, -84, 11, '#ffffff', 5); g.circ(sd * 22, -84, 5, C.ol, 0); }
    g.path('M-16 -20 Q0 -8 16 -20', null, 5);
  });
}
function panda(g, x, y, s, happy, t) {
  g.at(x, y, 0, s, s, () => {
    g.ell(0, -230, 220, 240, '#ffffff'); g.ell(0, -40, 230, 80, '#2b2140', 0);
    for (const sd of [-1, 1]) g.circ(sd * 120, -540, 52, '#2b2140');
    g.circ(0, -470, 140, '#ffffff');
    for (const sd of [-1, 1]) { g.ell(sd * 52, -480, 38, 46, '#2b2140', 0, sd * 0.5); if (happy) g.arc(sd * 52, -478, 14, PI * 1.1, PI * 1.9, '#ffffff', 6); else { g.circ(sd * 50, -480, 13, '#ffffff', 0); g.circ(sd * 50, -478, 7, C.ol, 0); } }
    g.ell(0, -424, 20, 14, '#2b2140', 0); g.path(happy ? 'M-30 -404 Q0 -366 30 -404 Z' : 'M-22 -402 Q0 -388 22 -402', happy ? '#ff7a8a' : null, 5);
    for (const sd of [-1, 1]) g.ell(sd * 92, -430, 22, 12, '#ffc2d1', 0);
    void t;
  });
}
function robot(g, x, y, s, a1, a2, t) {
  g.at(x, y, 0, s, s, () => {
    for (const sd of [-1, 1]) g.rr(sd * 90 - 30, -120, 60, 130, 14, '#8f9bb0');
    g.rr(-170, -470, 340, 360, 40, '#b8c4d8'); g.rr(-120, -420, 240, 140, 24, '#8f9bb0', 5);
    for (let i = 0; i < 3; i++) g.circ(-60 + i * 60, -350, 18, [C.red, C.yellow, C.green][i], 5);
    const sp = a2 >= 0 ? E.outElastic(clamp(a2 / 0.7)) : 0, hy = -570 - 230 * sp;
    if (sp > 0.02) { const pts = []; for (let i = 0; i <= 8; i++) pts.push(i === 0 || i === 8 ? 0 : i % 2 ? 30 : -30, lerp(-470, hy + 100, i / 8)); g.line(pts, C.ol, 16); g.line(pts, '#cfd6e2', 8); }
    g.at(0, hy, sp ? Math.sin(t * 14) * 0.25 * (1 - clamp(a2 / 1.2)) : 0, 1, 1, () => {
      g.rr(-130, -100, 260, 200, 40, '#cfd6e2'); g.line([0, -100, 0, -170], C.ol, 7); g.circ(0, -178, 16, a1 >= 0 && a1 < 0.5 ? C.yellow : C.red);
      g.rr(-96, -54, 192, 96, 24, '#26386b', 5);
      const shut = (a1 >= 0 && a1 < 0.45) || sp > 0;
      for (const sd of [-1, 1]) { if (shut) g.line([sd * 60, -26, sd * 36, -6, sd * 60, 14], '#7dffea', 9); else g.circ(sd * 44, -6, 20, '#7dffea', 0); }
      for (const sd of [-1, 1]) g.rr(sd * 130 - 12, -40, 24, 60, 8, '#8f9bb0');
    });
  });
}

function rugbyBall(g, x, y, s, rot) {
  g.at(x, y, rot, s, s, () => {
    g.ell(0, 0, 84, 54, '#ffffff');
    g.clipPath('M-84 0 A84 54 0 1 0 84 0 A84 54 0 1 0 -84 0 Z', () => { for (const sd of [-1, 1]) { g.rect(sd * 84 - (sd > 0 ? 26 : 0), -60, 26, 120, '#e8402f', 0); g.rect(sd * 50 - 6, -60, 12, 120, '#3a86ff', 0); } });
    g.ell(0, 0, 84, 54, null); g.curve([-36, -22, 0, -30, 36, -22], '#c9d0dc', 5); g.hl(-22, -26, 22, 8, -0.2, 0.6);
  });
}
function pin(g, x, y, s, rot) {
  g.at(x, y, rot, s, s, () => {
    g.path('M0 -150 C24 -150 26 -120 18 -96 C14 -84 14 -76 22 -60 C44 -20 40 10 26 20 L-26 20 C-40 10 -44 -20 -22 -60 C-14 -76 -14 -84 -18 -96 C-26 -120 -24 -150 0 -150 Z', '#ffffff');
    g.rect(-16, -100, 32, 9, '#e8402f', 0); g.rect(-15, -86, 30, 7, '#e8402f', 0); g.hl(-10, -40, 6, 26, 0, 0.5);
  });
}
// 物理で飛ぶ（t 秒後の位置）
const toss = (o, t) => [o.x + o.vx * t, o.y + o.vy * t + 1200 * t * t, o.w * t];
function mari(g, x, y, r, rot) {
  g.at(x, y, rot, 1, 1, () => {
    g.circ(0, 0, r, '#fbfaf4');
    g.clipCirc(0, 0, r, () => { g.rect(-r, -r * 0.16, r * 2, r * 0.32, '#b98fd8', 0); g.rect(-r, -r * 0.16, r * 2, r * 0.32, null, 4); for (let i = -2; i <= 2; i++) g.line([i * r * 0.36 - 6, -r * 0.16, i * r * 0.36 + 6, r * 0.16], '#8e6cb8', 4); });
    g.circ(0, 0, r, null);
  });
  g.hl(x - r * 0.35, y - r * 0.45, r * 0.26, r * 0.12, -0.6, 0.7);
}
function noble(g, x, y, s, col, cheer, t, sd) {
  g.at(x, y, 0, s * sd, s, () => {
    g.path('M-90 0 Q-80 -150 0 -160 Q80 -150 90 0 Z', col); g.path('M-30 -150 L0 -60 L30 -150 Z', '#ffffff', 4);
    g.circ(0, -200, 46, '#fbe3cf'); g.rr(-30, -300, 60, 80, 14, C.ol); g.ell(0, -228, 44, 12, C.ol, 0);
    g.circ(-14, -200, 5, C.ol, 0); g.circ(14, -200, 5, C.ol, 0); g.path(cheer ? 'M-12 -180 Q0 -166 12 -180 Z' : 'M-10 -178 L10 -178', cheer ? '#ff7a7a' : null, 4);
    const a = cheer ? -0.9 + Math.sin(t * 16) * 0.3 : 0.2;
    g.at(60, -110, a, 1, 1, () => { g.path('M0 0 L-30 -90 Q0 -110 30 -90 Z', '#ffd23f'); for (let i = -2; i <= 2; i++) g.line([0, 0, i * 12, -96], '#c9a32a', 3); });
  });
}
function kappa(g, x, y, s, st, t, wet) {
  g.at(x, y, 0, s, s, () => {
    const arms = st === 2 ? -1.1 + Math.sin(t * 14) * 0.25 : 0.3;
    for (const sd of [-1, 1]) g.at(sd * 90, -200, sd * arms, 1, 1, () => { g.cap(0, 0, sd * 70, 70, 22, '#5fbf5a'); g.circ(sd * 74, 76, 26, '#5fbf5a'); });
    g.ell(0, -150, 110, 140, '#5fbf5a'); g.ell(0, -130, 70, 100, '#d8f0a0', 0);
    g.circ(0, -330, 110, '#5fbf5a');
    for (let i = 0; i < 9; i++) { const a = PI + i * PI / 8; g.tri(Math.cos(a) * 70, -400 + Math.sin(a) * 26, Math.cos(a + 0.2) * 96, -392 + Math.sin(a + 0.2) * 30, Math.cos(a + 0.4) * 70, -400 + Math.sin(a + 0.4) * 26, '#2f7a3a', 0); }
    g.ell(0, -410, 76, 24, wet > 0 ? g.mix('#c9c3b0', '#7fdcf5', clamp(wet)) : '#c9c3b0');
    if (!wet) g.line([-30, -412, -6, -404, 6, -414, 30, -406], '#9a937e', 4);
    if (wet > 0) { g.ell(-20, -414, 26, 6, 'rgba(255,255,255,0.8)', 0); if (wet > 1) for (let i = 0; i < 3; i++) g.star(-50 + i * 50, -450 - Math.abs(Math.sin(t * 6 + i)) * 20, 14, 6, 4, '#ffffff', 0); }
    g.path('M-40 -300 Q0 -320 40 -300 Q40 -262 0 -250 Q-40 -262 -40 -300 Z', '#ffd23f');
    for (const sd of [-1, 1]) { if (st === 0) g.path(`M${sd * 64} -350 Q${sd * 44} -344 ${sd * 26} -356`, null, 6); else { g.circ(sd * 46, -352, 16, '#ffffff', 5); g.circ(sd * 44, -350, 8, C.ol, 0); } g.ell(sd * 76, -312, 14, 8, '#ff9fbd', 0); }
    if (st === 0) g.circ(80, -260, 10, '#7fd0ff', 4);
  });
}
function catFace(g, x, y, r, happy) {
  for (const sd of [-1, 1]) g.tri(x + sd * r * 0.95, y - r * 0.3, x + sd * r * 0.75, y - r * 1.25, x + sd * r * 0.2, y - r * 0.8, '#ffb35c');
  for (const sd of [-1, 1]) g.tri(x + sd * r * 0.8, y - r * 0.45, x + sd * r * 0.72, y - r * 1.0, x + sd * r * 0.38, y - r * 0.78, '#ffc9d6', 0);
  g.ell(x, y, r, r * 0.86, '#ffb35c');
  for (const d of [-0.35, 0, 0.35]) g.line([x + d * r, y - r * 0.85, x + d * r * 0.8, y - r * 0.55], '#e07a2a', 6);
  for (const sd of [-1, 1]) {
    if (happy) g.arc(x + sd * r * 0.38, y - r * 0.02, r * 0.16, PI * 1.1, PI * 1.9, C.ol, 6);
    else { g.ell(x + sd * r * 0.38, y - r * 0.05, r * 0.11, r * 0.16, C.ol, 0); g.circ(x + sd * r * 0.36, y - r * 0.1, r * 0.04, '#fff', 0); }
    g.line([x + sd * r * 0.62, y + r * 0.2, x + sd * r * 1.15, y + r * 0.1], C.ol, 3); g.line([x + sd * r * 0.62, y + r * 0.3, x + sd * r * 1.12, y + r * 0.36], C.ol, 3);
  }
  g.tri(x - r * 0.1, y + r * 0.12, x + r * 0.1, y + r * 0.12, x, y + r * 0.24, '#ff8fa3', 0);
  g.path(`M${x - r * 0.2} ${y + r * 0.32} Q${x - r * 0.1} ${y + r * 0.42} ${x} ${y + r * 0.3} Q${x + r * 0.1} ${y + r * 0.42} ${x + r * 0.2} ${y + r * 0.32}`, null, 4);
}
function cardboard(g, x, y, s, dent, open, t) {
  g.at(x, y, 0, s, s, () => {
    // 上のふた
    if (open > 0) { for (const sd of [-1, 1]) g.at(sd * 200, -300, sd * 1.9 * open, 1, 1, () => g.poly([0, 0, -sd * 200, 0, -sd * 170, -60, sd * 0, -60], '#d9a063')); }
    else { g.poly([-200, -300, 200, -300, 150, -370, -150, -370], '#d9a063'); g.line([0, -300, 0, -370], sh('#d9a063', -0.25), 5); g.poly([-24, -300, 24, -300, 18, -370, -18, -370], 'rgba(255,240,200,0.7)', 0); }
    g.rect(-200, -300, 400, 300, '#c98b52'); g.rect(-200, -300, 400, 300, null);
    g.poly([200, -300, 250, -350, 250, -60, 200, 0], '#a86f43');
    if (dent > 0) { g.path(`M-60 ${-40} Q0 ${-40 - 70 * dent} 60 -40`, null, 6); g.line([-60, -40, -100, -120], sh('#c98b52', -0.3), 4); g.line([60, -40, 100, -130], sh('#c98b52', -0.3), 4); }
    g.rr(-150, -250, 90, 60, 6, '#fff6e5', 4); g.line([-130, -232, -80, -232], C.ol, 4); g.line([-130, -212, -95, -212], C.ol, 4);
    void t;
  });
}

export default [
  {
    id: 'kick-ball', acts: ['kick'], modes: ['one', 'alt'], sfx: 'kick', vars: BALLS,
    init(s) { s.my.fl = []; },
    draw(g, s, v) {
      const V = g.V;
      // 背景
      if (v.beach) {
        g.sky('#5bc0ff', '#bfeaff', 360); g.sun(820, 100, 70);
        g.band(300, 400, '#2fa7e6'); for (let x = V.x0; x < V.x1; x += 90) g.arc(x + 40, 330 + 20 * Math.sin(x + s.beat), 26, Math.PI, 0, '#ffffff', 5);
        g.band(400, 'bottom', C.sand, 7);
        g.line([330, 400, 330, 210], C.ol, 8); g.line([670, 400, 670, 210], C.ol, 8); g.grid(330, 210, 340, 70, 34, '#ffffff', 3); g.line([330, 210, 670, 210], '#ffffff', 8);
      } else {
        g.sky('#7cc8ff', '#d6f0ff', 330);
        g.band(220, 330, '#3b3f6b'); g.dots(V.x0, 236, V.x1 - V.x0, 90, 26, 8, '#ffd8a8'); g.dots(V.x0 + 13, 250, V.x1 - V.x0, 80, 26, 7, '#ff9fbd');
        g.band(330, 'bottom', '#4caf50', 7);
        for (let i = 0, y = 330, h = 24; y < V.y1; i++, y += h, h *= 1.28) if (i % 2) g.band(y, y + h, '#5cbf5c');
        g.rect(318, 196, 364, 140, 'rgba(255,255,255,0.15)', 0); g.grid(318, 196, 364, 140, 22, 'rgba(255,255,255,0.55)', 2);
        g.line([318, 336, 318, 190, 682, 190, 682, 336], '#ffffff', 12);
      }
      // 飛んでいくボール
      for (const f of s.my.fl) {
        const q = clamp((s.t - f.t) / FLY); if (q <= 0) continue;
        const x = lerp(SPOT[0], 500 + f.dx, E.outQ(q)), y = lerp(SPOT[1], 262, E.outQ(q)) - 220 * 4 * q * (1 - q), r = lerp(78, 22, E.outQ(q));
        v.beach ? beachBall(g, x, y, r, q * 9) : soccerBall(g, x, y, r);
        if (q >= 1 && !f.done) { f.done = 1; g.sfx(v.beach ? 'boing' : 'cheer'); g.fx.pop(v.beach ? 'ナイス！' : 'ゴール！', 500, 130, { size: 110, c: C.yellow }); g.fx.stars(500 + f.dx, 262, 6); }
      }
      // 次のボール（転がってくる）
      const roll = s.k === 0 ? 1 : clamp((s.age - 0.2) / 0.28);
      if (roll > 0) {
        const x = SPOT[0] + 620 * (1 - E.outQ(roll)), rot = -(1 - roll) * 8;
        g.shadow(x, SPOT[1] + 70, 70, 16);
        v.beach ? beachBall(g, x, SPOT[1], 78, rot) : g.at(x, SPOT[1], rot, 1, 1, () => soccerBall(g, 0, 0, 78));
      }
      // 足
      const alt = s.mode === 'alt';
      for (const side of ['L', 'R']) {
        const sg = side === 'L' ? -1 : 1, active = s.side === side;
        if (!active && !alt) continue;
        const p = active ? s.p : 1;
        const x = lerp(SPOT[0] + sg * 18, 500 + sg * 210, p), y = lerp(SPOT[1] + 96, 1290, E.ioQ(p));
        g.leg(x, y, -Math.PI / 2 - sg * lerp(0.08, 0.3, p), { side, s: lerp(0.95, 1.25, p), shoe: C.red });
      }
    },
    hit(g, s, k) {
      s.my.fl.push({ t: s.t, dx: k === 1 ? -100 : 100 });
      g.fx.lines(SPOT[0], SPOT[1] + 40, { n: 10, r0: 100, r1: 200, a0: Math.PI, arc: Math.PI });
      g.fx.pop('バシッ', g.mx(s.lastSide, 720), 700, { size: 90 }); g.fx.shake(6, 0.1);
    },
  },

  /* ---------- 空き缶をゴミ箱へ・小石を池へ ---------- */
  {
    id: 'kick-can', acts: ['kick'], modes: ['one', 'alt'], sfx: 'kick', vars: [
      { k: 'can', name: '空き缶をゴミ箱へ', short: '空き缶', theme: 'town' },
      { k: 'stone', name: '小石を池へける', short: '小石', theme: 'nature', stone: 1 },
    ],
    draw(g, s, v) {
      const V = g.V, l1 = sinceLand(s, 1), l2 = sinceLand(s, 2), wob = jig(l2 >= 0 ? l2 : l1, 0.12, 18, 6), fj = s.k >= 2 ? s.age : -1;
      if (v.stone) {
        g.sky('#8fd8ff', '#eaf8ff', 360); g.cloud(230, 110, 0.7); g.hills(360, '#6fc35a', 50, 4, 5);
        g.band(360, 'bottom', '#8edc6a', 7);
        g.ell(500, 470, 560, 120, '#3fb6e8'); g.ell(500, 462, 520, 96, '#6fd3f5', 0);
        for (const [x, y, r] of [[280, 440, 46], [760, 500, 40], [380, 512, 30]]) { g.ell(x, y, r, r * 0.34, '#4fb35a', 4); g.line([x, y, x + r * 0.6, y - r * 0.12], '#3f8f48', 3); }
        for (const x of [60, 110, 900, 950]) for (let i = 0; i < 3; i++) { g.line([x + i * 14, 470, x + i * 14 - 10, 330 + i * 20], '#4f8a3a', 7); g.ell(x + i * 14 - 10, 330 + i * 20, 9, 24, '#8a5a36', 4); }
        // カエル（2回目でジャンプ）
        const fy = fj >= 0 ? -Math.max(0, Math.sin(PI * clamp(fj / 0.5))) * 120 : 0;
        g.ell(680, 470, 70, 22, '#4fb35a', 4); frog(g, 680, 446 + fy, 0.8, fj >= 0 && fj < 0.6, s.t);
        // 小石の山
        for (const [x, y] of [[720, 880], [770, 860], [800, 900]]) pebble(g, x, y, 0.7, x);
      } else {
        g.sky('#7cc8ff', '#e2f5ff', 420); g.cloud(200, 120, 0.7); g.cloud(820, 80, 0.5);
        for (let x = V.x0 - 40; x < V.x1 + 80; x += 160) { g.rr(x - 12, 300, 24, 130, 6, '#7a4a2a', 5); g.circ(x, 270, 74, '#3f9e4a', 6); }
        g.band(420, 'bottom', '#d9d4cc', 7); for (let i = 0, y = 420, h = 30; y < V.y1; i++, y += h, h *= 1.25) g.line([V.x0 - 40, y, V.x1 + 40, y], '#c2bcb2', 4);
        for (let x = -2000; x < 3000; x += 120) g.line([500 + (x - 500) * 0.25, 420, x, 1000], '#c2bcb2', 4);
        // 自動販売機（右）
        g.rr(760, 180, 170, 270, 12, '#f4f6fb'); g.rr(760, 180, 170, 30, 12, '#3a86ff', 0); g.rr(780, 220, 130, 110, 6, '#dff3ff', 5); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.rr(790 + i * 40, 228 + j * 50, 28, 40, 8, [C.yellow, C.green, C.orange, C.lime, C.pink, C.sky][i + j * 3], 3); g.rr(800, 380, 90, 30, 6, '#2b2140', 0); g.rr(760, 180, 170, 270, 12, null);
        // ゴミ箱（ゆれる）
        g.at(500, 560, wob, 1, 1, () => {
          g.shadow(0, 6, 130, 20);
          g.rr(-110, -230, 220, 236, 26, '#3a86ff'); g.rr(-122, -262, 244, 50, 20, '#2f6fd8');
          g.ell(0, -250, 52, 14, '#1c2a55', 0);
          g.text('かん', 0, -120, { size: 64, f: '#ffffff', o: 0 });
          g.hl(-70, -170, 14, 50, 0, 0.35);
        });
      }
      // 飛んでいく缶・小石
      for (const k of [1, 2]) {
        const q = flyQ(s, k), dst = v.stone ? (k === 1 ? [420, 470] : [590, 490]) : [500, 312];
        if (q < 0) continue;
        if (landed(s, k)) {
          if (v.stone) { g.sfx('splash'); for (let i = 0; i < 3; i++) g.fx.ring(dst[0], dst[1], { c: '#ffffff', r0: 20 + i * 30, r1: 160 + i * 60, w: 8, sy: 0.3, life: 0.6 + i * 0.15 }); g.fx.splash(dst[0], dst[1], C.water, 12); if (k === 1) g.fx.pop('ポチャン', dst[0], dst[1] - 130, { size: 88 }); }
          else { g.sfx('clang'); g.fx.stars(500, 300, k === 2 ? 10 : 4); if (k === 1) g.fx.pop('カラン', 500, 160, { size: 96 }); }
        }
        if (q >= 1) continue;
        const x = lerp(SPOT[0], dst[0], q), y = lerp(SPOT[1] - 40, dst[1], q) - (v.stone ? 300 : 460) * (k === 2 ? 0.6 : 1) * 4 * q * (1 - q), sc = lerp(1, 0.42, q);
        if (v.stone) pebble(g, x, y, sc * 1.1, q * 9); else can(g, x, y, sc, q * 11, k - 1 + (s.idx | 0));
      }
      // つぎの缶・小石
      if (s.k < 2) {
        const r = rollIn(s, 0.35, 0.15);
        if (r > 0) {
          if (v.stone) { const x = lerp(720, SPOT[0], E.outQ(r)); g.shadow(x, SPOT[1] + 30, 50, 12); pebble(g, x, SPOT[1], 1.1, -(1 - r) * 6); }
          else { const y = SPOT[1] - 40 - 700 * (1 - E.outBounce(r)); g.shadow(SPOT[0], SPOT[1] + 32, 56 * (0.5 + 0.5 * r), 12); can(g, SPOT[0], y, 1, 0, s.k + (s.idx | 0)); }
        }
      }
      legs(g, s, { ty: 835, shoe: v.stone ? '#3cc46b' : C.red, pants: v.stone ? '#6b4a8a' : C.navy });
    },
    hit(g, s, k, v) {
      g.fx.lines(SPOT[0], SPOT[1] - 10, { n: 9, r0: 90, r1: 180, a0: PI, arc: PI });
      g.fx.shake(5, 0.1);
      if (k === 1) g.fx.pop(v.stone ? 'コツン' : 'カコン', g.mx(s.lastSide, 760), 720, { size: 84 });
      else if (v.stone) { g.fx.pop('ケロッ！', 680, 280, { size: 100, c: C.yellow, life: 0.9 }); g.fx.notes(680, 380, 4); g.sfx('jump'); }
      else g.fx.pop('ナイスシュート！', 500, 160, { size: 88, c: C.yellow, life: 0.9 });
    },
  },

  /* ---------- 落ち葉・雪・砂の山をける（中から動物） ---------- */
  {
    id: 'kick-pile', acts: ['kick'], modes: ['one', 'alt'], sfx: (k, v) => v.sfx, vars: [
      { k: 'leaves', name: '落ち葉の山をける', short: '落ち葉', theme: 'nature', sfx: 'crunch', c: ['#ff8a2a', '#ffb347', '#e04a2a', '#ffd23f'], pile: '#e8913a' },
      { k: 'snow', name: '雪の山をける', short: '雪山', theme: 'winter', sfx: 'crunch', c: ['#ffffff', '#e4eefc', '#c9dbf5'], pile: '#ffffff' },
      { k: 'sand', name: '砂山をける', short: '砂山', theme: 'sea', sfx: 'swish', c: ['#f2d49b', '#e6bf78', '#fff0c9'], pile: '#f2d49b' },
    ],
    init(s) { s.my.dots = []; for (let i = 0; i < 16; i++) s.my.dots.push([s.r() * 2 - 1, s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      if (v.k === 'snow') { g.sky('#9fd2ff', '#eef8ff', 470); g.poly([V.x0 - 100, 470, 200, 300, 380, 420, 560, 260, 760, 400, 900, 320, V.x1 + 100, 460, V.x1 + 100, 480, V.x0 - 100, 480], '#ffffff', 6); g.band(470, 'bottom', '#f4f8ff', 7); for (const [x, y, r] of [[160, 560, 60], [840, 600, 80], [300, 700, 40]]) g.ell(x, y, r * 2, r * 0.4, '#dbe7f7', 0); g.at(150, 470, 0, 0.9, 0.9, () => { g.rr(-12, -60, 24, 60, 6, '#6b4a2e', 5); for (let i = 0; i < 3; i++) { g.tri(-90 + i * 18, -40 - i * 70, 90 - i * 18, -40 - i * 70, 0, -160 - i * 70, '#2f7a52', 5); g.path(`M${-50 + i * 10} ${-100 - i * 70} Q0 ${-118 - i * 70} ${50 - i * 10} ${-100 - i * 70} L0 ${-160 - i * 70} Z`, '#ffffff', 0); } }); }
      else if (v.k === 'sand') { g.sky('#5bc0ff', '#c6ecff', 380); g.sun(820, 110, 60); g.band(360, 470, '#2fa7e6'); for (let x = V.x0; x < V.x1; x += 110) g.arc(x + 50, 400 + 14 * Math.sin(x + s.beat), 30, PI, 0, '#ffffff', 5); g.band(470, 'bottom', '#f6dfa8', 7); g.at(820, 470, 0.12, 1, 1, () => { g.line([0, 0, 0, -300], C.ol, 10); g.path('M-200 -260 Q0 -380 200 -260 Z', C.red); g.path('M-70 -264 Q0 -370 70 -264 Z', '#ffffff', 0); }); g.at(200, 640, 0.3, 1, 1, () => g.path('M0 -30 L26 20 L-26 20 Z', '#ff9fbd', 4)); }
      else { g.sky('#ffd38a', '#fff2d6', 470); g.hills(470, '#e0a24a', 50, 3, 5); for (const [x, c] of [[120, '#ff8a2a'], [880, '#e04a2a'], [300, '#ffc23f']]) g.at(x, 470, 0, 0.9, 0.9, () => { g.rr(-14, -170, 28, 170, 8, '#7a4a2a', 5); g.circ(0, -220, 100, c, 6); g.circ(-50, -180, 60, c, 6); g.circ(54, -186, 64, c, 6); }); g.band(470, 'bottom', '#d9a35a', 7); g.rr(640, 430, 220, 30, 8, '#8a5a36'); for (const x of [660, 840]) g.rr(x - 8, 450, 16, 60, 4, '#5a3a22'); }
      // 山の大きさ（1回目で半分、2回目でなくなる）
      const sz = s.k === 0 ? 1 : s.k === 1 ? lerp(1, 0.55, E.outQ(clamp(s.age / 0.25))) : lerp(0.55, 0.1, E.outQ(clamp(s.age / 0.25)));
      const W = 300 * (0.6 + 0.4 * sz), H = 240 * sz, by = 860, peek = s.k >= 1;
      const fn = v.k === 'snow' ? penguin : v.k === 'sand' ? crab : tanuki;
      if (peek) {
        const hop = a2 >= 0 ? Math.max(0, Math.sin(PI * clamp(a2 / 0.55))) * 190 : 0, rise = a2 >= 0 ? 0 : 60 * (1 - E.outBack(clamp(a1 / 0.3)));
        g.at(0, rise - hop, () => fn(g, 500, by - (a2 >= 0 ? 0 : 30), 1.25, s.t, a2 < 0));
      }
      g.blob([500 - W, by, 500 - W * 0.7, by - H * 0.55, 500 - W * 0.3, by - H * 0.95, 500 + W * 0.1, by - H, 500 + W * 0.5, by - H * 0.8, 500 + W * 0.85, by - H * 0.4, 500 + W, by], v.pile, 7, 0.9);
      g.clipPath(`M${500 - W} ${by} L${500 + W} ${by} L${500 + W} ${by - H - 20} L${500 - W} ${by - H - 20} Z`, () => {
        for (const [dx, dy, r] of s.my.dots) { const x = 500 + dx * W * 0.8, y = by - dy * H * 0.8 * (1 - Math.abs(dx) * 0.5); if (v.k === 'leaves') g.at(x, y, r * 6, 1, 0.6, () => g.path('M0 -22 Q16 0 0 22 Q-16 0 0 -22Z', v.c[Math.floor(r * 4)], 3)); else if (v.k === 'snow') g.ell(x, y, 26, 8, '#dbe7f7', 0); else g.circ(x, y, 5, '#d6b070', 0); }
      });
      if (v.k === 'snow') g.hl(500 - W * 0.3, by - H * 0.7, W * 0.3, H * 0.1, -0.3, 0.6);
      legs(g, s, { ty: 820, shoe: v.k === 'snow' ? '#3a86ff' : v.k === 'sand' ? '#ff9f1c' : C.red, pants: v.k === 'snow' ? '#e2504c' : v.k === 'sand' ? '#2ec4b6' : '#5a4a8a' });
    },
    hit(g, s, k, v) {
      const x = 500, y = 760;
      g.fx.burst(x, y, { n: 26, c: v.c, shape: v.k === 'leaves' ? 'leaf' : 'dot', sp: [400, 900], size: v.k === 'sand' ? [8, 14] : [14, 26], g: v.k === 'leaves' ? 600 : 1500, drag: v.k === 'leaves' ? 0.96 : 0.985, life: [0.6, 1.1], dir: -PI / 2, spread: PI * 0.9 });
      g.fx.shake(6, 0.1);
      if (k === 1) g.fx.pop({ leaves: 'ガサッ', snow: 'ザクッ', sand: 'ザザッ' }[v.k], g.mx(s.lastSide, 760), 620, { size: 92 });
      else { g.fx.pop({ leaves: 'たぬきだ！', snow: 'ペンギン！', sand: 'カニだ！' }[v.k], 500, 300, { size: 100, c: C.yellow, life: 0.9 }); g.fx.stars(500, 520, 10); g.sfx('magic'); }
    },
  },

  /* ---------- 板割りキック（パンダ） ---------- */
  {
    id: 'kick-board', acts: ['kick'], modes: ['one', 'alt'], theme: 'dojo', sfx: ['crack', 'break'], vars: [{ k: 'panda', name: '板割りキック', short: '板割り' }],
    draw(g, s, v) {
      const V = g.V, a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      g.bg('#efe0c2'); for (let x = Math.floor(V.x0 / 260) * 260; x < V.x1 + 260; x += 260) g.rect(x - 14, V.y0, 28, 760 - V.y0, '#c9a06a', 0);
      g.rr(40, 120, 250, 300, 6, '#fbf6ea', 7); g.grid(40, 120, 250, 300, 62, '#c9a06a', 5);
      g.rr(720, 90, 200, 340, 6, '#fbf6ea', 6); g.rr(710, 80, 220, 20, 6, '#7a4a2a', 0); g.rr(710, 426, 220, 20, 6, '#7a4a2a', 0); g.text('力', 820, 262, { size: 170, f: C.ol, o: 0 });
      g.band(760, 'bottom', '#d8d98f', 7); for (let i = 0, y = 760, h = 60; y < V.y1; i++, y += h, h *= 1.4) g.line([V.x0 - 40, y, V.x1 + 40, y], '#3a3a2a', 8);
      for (let x = -3000; x < 4000; x += 400) g.line([500 + (x - 500) * 0.3, 760, x, 1600], '#b9ba6e', 5);
      // パンダ
      const happy = a2 >= 0, sw = a1 >= 0 ? jig(a1 < 2 ? a1 : 9, 8, 20, 7) : 0;
      panda(g, 500, 820, 1, happy, s.t);
      for (const sd of [-1, 1]) g.cap(500 + sd * 170, 450, 500 + sd * 176, 600 + sw, 46, '#2b2140');
      // 板（パンダが持つ）
      const brk = a2 >= 0 ? E.outBack(clamp(a2 / 0.3)) : 0;
      const paw = (x, y) => { g.ell(x, y, 46, 58, '#2b2140'); g.ell(x, y + 6, 22, 26, '#4a3f5e', 0); };
      if (brk > 0) {
        for (const sd of [-1, 1]) g.at(500 + sd * 175, 610 + sw, -sd * 0.8 * brk, 1, 1, () => { g.clipRR(sd < 0 ? 0 : -175, -110, 175, 220, 0, () => g.wood(-sd * 175 - 170, -105, 340, 210, '#f0c58a', 12, 7)); paw(sd * 4, 0); });
        if (happy) { for (const sd of [-1, 1]) g.heart(500 + sd * 260, 330 + Math.sin(s.t * 6 + sd) * 10, 50, C.pink, 5); }
      } else {
        g.at(500, 610 + sw, 0, 1, 1, () => { g.wood(-170, -105, 340, 210, '#f0c58a', 12, 7); if (s.k >= 1) crack(g, 0, 105, 150); for (const sd of [-1, 1]) paw(sd * 176, 0); });
      }
      legs(g, s, { ty: 700, shoe: '#ffffff', pants: '#f4f4f4', sock: '#ffffff' });
    },
    hit(g, s, k) {
      g.fx.lines(500, 690, { n: 12, r0: 110, r1: 240, w: 11 }); g.fx.shake(k === 2 ? 12 : 8, 0.14);
      if (k === 1) { g.fx.chips(500, 690, '#f0c58a', 6); g.fx.pop('ピシッ', g.mx(s.lastSide, 790), 420, { size: 96 }); }
      else { g.fx.chips(500, 620, '#f0c58a', 16); g.fx.pop('バキッ！', 500, 230, { size: 120, c: C.yellow }); g.fx.stars(500, 560, 10); g.fx.ring(500, 610, { r1: 320 }); }
    },
  },

  /* ---------- ロボのたてをける ---------- */
  {
    id: 'kick-robot', acts: ['kick'], modes: ['one', 'alt'], theme: 'game', sfx: ['clang', 'boing'], vars: [{ k: 'robot', name: 'ロボのたてをける', short: 'ロボット' }],
    draw(g, s, v) {
      const V = g.V, a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      g.bg('#151a3a', '#2a2f6b');
      for (let x = Math.floor(V.x0 / 140) * 140; x < V.x1 + 140; x += 140) g.rr(x + 10, 120, 120, 200, 14, '#1f2550', 4);
      for (let i = 0; i < 6; i++) { const x = 70 + i * 170; g.circ(x, 220, 14, ['#7dffea', '#ff7eb6', '#ffd23f'][i % 3], 0); }
      g.band(640, 'bottom', '#0f1430', 0);
      for (let i = 0, y = 640, h = 30; y < V.y1; i++, y += h, h *= 1.3) g.line([V.x0 - 40, y, V.x1 + 40, y], 'rgba(125,255,234,0.45)', 4);
      for (let x = -3000; x < 4000; x += 160) g.line([500 + (x - 500) * 0.2, 640, x, 1600], 'rgba(125,255,234,0.45)', 4);
      const sw = a1 >= 0 ? jig(a1 < 2 ? a1 : 9, 10, 22, 7) : 0;
      g.shadow(500, 930, 220, 30, 0.4);
      robot(g, 500, 930, 0.9, a1 < 2 ? a1 : -1, a2, s.t);
      // たて
      g.at(500, 650 + sw, jig(a1 < 2 ? a1 : 9, 0.06, 20, 7), 1, 1, () => {
        g.circ(0, 0, 160, '#ffd23f'); g.circ(0, 0, 130, '#ffb020', 0); g.star(0, 0, 80, 36, 5, '#ffffff', 6); g.hl(-60, -80, 40, 16, -0.6, 0.5);
        for (const sd of [-1, 1]) { g.rr(sd * 160 - 34, -40, 68, 80, 26, '#cfd6e2'); g.line([sd * 160 - 20, -20, sd * 160 + 20, -20], '#8f9bb0', 5); }
      });
      legs(g, s, { ty: 735, shoe: '#ff7eb6', pants: '#3b3f6b' });
    },
    hit(g, s, k) {
      g.fx.lines(500, 720, { n: 12, r0: 120, r1: 250, w: 11, c: '#7dffea' }); g.fx.sparks(500, 700, 14); g.fx.shake(k === 2 ? 11 : 8, 0.14);
      if (k === 1) { g.fx.pop('ガーン', g.mx(s.lastSide, 800), 470, { size: 100, c: '#7dffea' }); g.fx.sparks(500, 175, 10); }
      else { g.fx.pop('ボヨヨーン', 500, 120, { size: 100, c: C.yellow, life: 0.9 }); g.fx.stars(500, 330, 10); g.sfx('zap'); }
    },
  },

  /* ---------- ラグビーのキック ---------- */
  {
    id: 'kick-rugby', acts: ['kick'], modes: ['one', 'alt'], theme: 'sports', sfx: 'kick', vars: [{ k: 'rugby', name: 'ラグビーのキック', short: 'ラグビー' }],
    draw(g, s, v) {
      const V = g.V, T = [500, 175];
      g.bg('#1b2a5e', '#3b4f9a');
      for (let i = 0; i < 14; i++) g.circ(V.x0 + (V.x1 - V.x0) * ((i * 0.37) % 1), V.y0 + (230 - V.y0) * ((i * 0.61) % 1), 3, '#ffffff', 0);
      for (const x of [90, 910]) { g.line([x, 330, x, 60], '#8f9bb0', 12); g.rr(x - 70, 20, 140, 60, 10, '#cfd6e2'); g.glow(x, 50, 200, '#fff6c0', 0.5); for (let i = 0; i < 3; i++) g.circ(x - 40 + i * 40, 50, 14, '#fff6c0', 0); }
      g.band(230, 340, '#2a2f5a'); g.dots(V.x0, 254, V.x1 - V.x0, 80, 70, 15, '#ffd8a8'); g.dots(V.x0 + 35, 290, V.x1 - V.x0, 40, 70, 14, '#9fc4ff');
      g.band(340, 'bottom', '#3fae4f', 7); for (let i = 0, y = 340, h = 26; y < V.y1; i++, y += h, h *= 1.3) if (i % 2) g.band(y, y + h, '#4cbf5c');
      g.line([V.x0 - 40, 420, V.x1 + 40, 420], '#ffffff', 6); g.line([V.x0 - 40, 600, V.x1 + 40, 600], '#ffffff', 8);
      // H のゴール
      for (const x of [390, 610]) { g.rr(x - 9, 40, 18, 330, 6, '#ffffff'); g.rr(x - 20, 300, 40, 70, 8, C.blue); }
      g.rr(390, 262, 220, 16, 6, '#ffffff');
      // 飛ぶボール
      for (const k of [1, 2]) {
        const q = flyQ(s, k); if (q < 0) continue;
        if (landed(s, k)) { g.fx.stars(T[0], T[1], k === 2 ? 12 : 6); if (k === 1) g.fx.pop('ナイスキック', 500, 470, { size: 84, c: '#ffffff' }); else { g.sfx('cheer'); g.fx.confetti(50); } }
        if (q >= 1) continue;
        const x = lerp(SPOT[0], T[0] + (k === 1 ? -30 : 30), q), y = lerp(SPOT[1] - 30, T[1], E.outQ(q)) - 160 * 4 * q * (1 - q);
        rugbyBall(g, x, y, lerp(0.95, 0.32, E.outQ(q)), q * 14);
      }
      // ティーとつぎのボール
      g.poly([465, 880, 535, 880, 515, 840, 485, 840], C.orange); g.ell(500, 840, 16, 5, sh(C.orange, -0.2), 0);
      const r = rollIn(s, 0.3, 0.15);
      if (r > 0) rugbyBall(g, SPOT[0], SPOT[1] - 30 - 600 * (1 - E.outBounce(r)), 0.95, -PI / 2 + 0.25);
      legs(g, s, { ty: 840, shoe: '#ffffff', pants: '#1c2a55', sock: '#e8402f' });
    },
    hit(g, s, k) {
      g.fx.lines(SPOT[0], SPOT[1] - 20, { n: 10, r0: 100, r1: 200, a0: PI, arc: PI }); g.fx.shake(6, 0.1);
      if (k === 1) g.fx.pop('ドスッ', g.mx(s.lastSide, 760), 700, { size: 88 });
      else g.fx.pop('ゴール！', 500, 470, { size: 120, c: C.yellow, life: 0.9 });
    },
  },

  /* ---------- 的あて：パネル・缶タワー・ボウリング ---------- */
  {
    id: 'kick-target', acts: ['kick'], modes: ['one', 'alt'], sfx: 'kick', vars: [
      { k: 'panel', name: 'パネルをうちぬく', short: 'パネル', theme: 'sports' },
      { k: 'cans', name: '缶のタワーをたおす', short: '缶たおし', theme: 'festival', cans: 1 },
      { k: 'pins', name: 'キックボウリング', short: 'ボウリング', theme: 'party', pins: 1 },
    ],
    init(s, v) {
      s.my.o = [];
      const n = v.cans ? 6 : v.pins ? 10 : 9;
      for (let i = 0; i < n; i++) s.my.o.push({ r1: s.r() - 0.5, r2: s.r(), r3: s.r() - 0.5 });
    },
    draw(g, s, v) {
      const V = g.V, l1 = sinceLand(s, 1), l2 = sinceLand(s, 2);
      let T;
      if (v.pins) {
        g.bg('#2a1f5e', '#5a2f7a'); for (let i = 0; i < 7; i++) g.circ(100 + i * 140, 120, 30, ['#ff7eb6', '#7dffea', '#ffd23f'][i % 3], 0);
        g.poly([V.x0 - 100, 1000, 280, 330, 720, 330, V.x1 + 100, 1000], '#3b2a6a', 0);
        g.poly([160, V.y1 + 200, 400, 330, 600, 330, 840, V.y1 + 200], '#e8b97a', 0);
        for (let i = 1; i < 6; i++) { const t = i / 6; g.line([lerp(400, 160, 0) + (600 - 400) * t, 330, 160 + (840 - 160) * t, V.y1 + 200], '#d39f62', 4); }
        g.line([400, 330, 160, V.y1 + 200], '#8a5a36', 8); g.line([600, 330, 840, V.y1 + 200], '#8a5a36', 8);
        for (let i = 0; i < 3; i++) g.at(500, 520 + i * 90, 0, 1 + i * 0.3, 1 + i * 0.3, () => g.tri(-10, 0, 10, 0, 0, -18, '#ff7eb6', 0));
        T = [500, 380];
      } else if (v.cans) {
        g.bg('#1d1446', '#4b1f5e');
        for (let x = Math.ceil((V.x0 - 40) / 130) * 130; x < V.x1 + 40; x += 130) { g.glow(x, 110, 70, '#ff9b6b', 0.35); g.ell(x, 110, 30, 28, '#e8402f', 5); }
        g.rect(V.x0 - 40, 180, V.x1 - V.x0 + 80, 50, '#e8402f', 0); g.stripes(V.x0 - 40, 180, V.x1 - V.x0 + 80, 50, 60, '#e8402f', '#ffffff');
        g.rect(V.x0 - 40, 230, V.x1 - V.x0 + 80, 400, '#3a2a55', 0);
        g.rr(180, 610, 640, 60, 10, '#c98b52'); g.rr(200, 670, 600, 260, 0, '#a86f43');
        g.band(930, 'bottom', '#2a1f40');
        T = [500, 470];
      } else {
        g.sky('#7cc8ff', '#e2f5ff', 640); g.cloud(160, 120, 0.6); g.cloud(860, 160, 0.5);
        g.band(640, 'bottom', '#5cbf5c', 7); for (let i = 0, y = 640, h = 34; y < V.y1; i++, y += h, h *= 1.3) if (i % 2) g.band(y, y + h, '#6ccb66');
        g.rr(270, 160, 460, 460, 20, '#26386b'); g.rr(470, 610, 60, 60, 4, '#1c2a55'); g.rr(330, 640, 340, 20, 6, '#1c2a55');
        T = [500, 390];
      }
      // 的
      const fall = (i, k) => k === 1 ? l1 : l2;
      if (v.pins) {
        const P = []; for (let r = 0; r < 4; r++) for (let j = 0; j <= r; j++) P.push([500 + (j - r / 2) * 58, 410 - r * 20, 0.46 - r * 0.03, r]);
        for (let i = P.length - 1; i >= 0; i--) {
          const [x, y, sc, row] = P[i], o = s.my.o[i], grp = row < 3 ? 1 : 2, t = fall(i, grp);
          if (t < 0) { pin(g, x, y, sc, 0); continue; }
          const [px, py, pr] = toss({ x, y, vx: (x - 500) * 9 + o.r1 * 300, vy: -500 - o.r2 * 300, w: (o.r3 + (x - 500) / 60) * 14 }, t);
          if (py < 1200) pin(g, px, py, sc, pr);
        }
      } else if (v.cans) {
        const P = [[405, 548], [500, 548], [595, 548], [452, 422], [548, 422], [500, 296]];
        P.forEach(([x, y], i) => {
          const o = s.my.o[i], t = i < 3 ? l2 : l1;
          if (t < 0) { can(g, x, y, 0.9, 0, i); return; }
          const [px, py, pr] = toss({ x, y, vx: (x - 500) * 6 + o.r1 * 500, vy: -700 - o.r2 * 400, w: o.r3 * 30 }, t);
          if (py < 1300) can(g, px, py, 0.9, pr, i);
        });
      } else {
        for (let i = 0; i < 9; i++) {
          const x = 500 + (i % 3 - 1) * 132, y = 390 + (Math.floor(i / 3) - 1) * 132, o = s.my.o[i];
          const t = i === 4 ? l1 : l2 >= 0 ? l2 - (i === 2 ? 0 : 0.012 * (1 + ((i * 5) % 9))) : -1;
          const fl = t >= 0 ? clamp(t / 0.1) : 0;
          if (fl >= 1) { g.rr(x - 60, y - 60, 120, 120, 8, '#1c2a55', 0); continue; }
          g.at(x, y + 60, 0, 1, 1 - fl, () => { g.rr(-60, -120, 120, 120, 10, ['#ffffff', '#ffe066'][i % 2]); g.text(String(i + 1), 0, -58, { size: 70, f: '#26386b' }); });
          void o;
        }
      }
      // 飛ぶボール
      for (const k of [1, 2]) {
        const q = flyQ(s, k); if (q < 0) continue;
        const dst = v.pins ? T : v.cans ? (k === 1 ? [500, 380] : [500, 548]) : (k === 1 ? [500, 390] : [632, 258]);
        if (landed(s, k)) {
          g.fx.shake(k === 2 ? 10 : 6, 0.12);
          if (v.pins) { g.sfx('wood'); g.fx.burst(dst[0], dst[1], { n: 10, c: ['#ffffff', '#ff7eb6'], shape: 'star', sp: [200, 500], size: [12, 20], g: 600 }); if (k === 1) g.fx.pop('カコーン', 500, 230, { size: 96 }); }
          else if (v.cans) { g.sfx('clang'); g.fx.sparks(dst[0], dst[1], 10); if (k === 1) g.fx.pop('ガラガラ', 500, 300, { size: 96 }); }
          else { g.sfx('thud'); g.fx.ring(dst[0], dst[1], { r1: 160 }); if (k === 1) g.fx.pop('バコン', 500, 120, { size: 96 }); }
        }
        if (q >= 1) continue;
        const sc = lerp(1, v.pins ? 0.4 : 0.5, E.outQ(q)), x = lerp(SPOT[0], dst[0], q), y = v.pins ? lerp(SPOT[1], dst[1] - 10, E.outQ(q)) : lerp(SPOT[1], dst[1], q) - 200 * 4 * q * (1 - q);
        if (v.pins) { g.circ(x, y, 78 * sc, '#3a86ff'); g.circ(x - 20 * sc, y - 24 * sc, 10 * sc, '#1c2a55', 0); g.circ(x + 6 * sc, y - 32 * sc, 10 * sc, '#1c2a55', 0); g.hl(x - 30 * sc, y - 34 * sc, 20 * sc, 9 * sc, -0.6, 0.6); }
        else g.at(x, y, q * 8, 1, 1, () => soccerBall(g, 0, 0, 78 * sc));
      }
      // つぎのボール
      const r = rollIn(s, 0.3, 0.15);
      if (r > 0) {
        const x = SPOT[0] + 600 * (1 - E.outQ(r));
        g.shadow(x, SPOT[1] + 70, 70, 16);
        if (v.pins) { g.circ(x, SPOT[1], 78, '#3a86ff'); g.circ(x - 20, SPOT[1] - 24, 10, '#1c2a55', 0); g.circ(x + 6, SPOT[1] - 32, 10, '#1c2a55', 0); g.hl(x - 30, SPOT[1] - 34, 20, 9, -0.6, 0.6); }
        else g.at(x, SPOT[1], -(1 - r) * 8, 1, 1, () => soccerBall(g, 0, 0, 78));
      }
      legs(g, s, { ty: 845, shoe: v.pins ? '#ff7eb6' : v.cans ? '#ffd23f' : C.red, pants: v.cans ? '#5a4a8a' : C.navy });
    },
    hit(g, s, k, v) {
      g.fx.lines(SPOT[0], SPOT[1] + 40, { n: 10, r0: 100, r1: 200, a0: PI, arc: PI }); g.fx.shake(5, 0.1);
      if (k === 1) g.fx.pop('バシッ', g.mx(s.lastSide, 760), 700, { size: 86 });
      else { g.fx.pop(v.pins ? 'スペア！' : v.cans ? 'ぜんぶたおした！' : 'パーフェクト！', 500, v.pins ? 230 : v.cans ? 300 : 88, { size: v.cans ? 84 : 96, c: C.yellow, life: 0.9, rot: 0 }); g.fx.stars(500, 360, 8); }
    },
  },

  /* ---------- けまり ---------- */
  {
    id: 'kick-kemari', acts: ['kick'], modes: ['one', 'alt'], theme: 'festival', sfx: 'kick', vars: [{ k: 'kemari', name: 'けまりをける', short: 'けまり' }],
    draw(g, s, v) {
      const V = g.V, by = 740, ph = s.ph;
      g.sky('#bfe6ff', '#fff6e0', 420); g.cloud(200, 100, 0.6);
      // 寝殿
      g.rect(V.x0 - 40, 260, V.x1 - V.x0 + 80, 170, '#fbf6ea', 0); for (let x = Math.floor(V.x0 / 150) * 150; x < V.x1 + 150; x += 150) g.rect(x - 12, 250, 24, 180, '#d8452c', 0);
      g.poly([V.x0 - 60, 270, V.x0 + 40, 180, V.x1 - 40, 180, V.x1 + 60, 270], '#6b5a4a', 0); g.band(266, 280, '#4a3a2e');
      g.rect(V.x0 - 40, 400, V.x1 - V.x0 + 80, 30, '#8a5a36', 0);
      g.band(430, 'bottom', '#efe9dc', 7); for (let i = 0, y = 450, h = 24; y < V.y1; i++, y += h, h *= 1.25) g.curve([V.x0 - 40, y, 250, y + 6, 500, y, 750, y + 6, V.x1 + 40, y], '#d9d0bd', 4);
      // もみじ
      g.at(120, 430, 0, 1, 1, () => { g.rr(-14, -220, 28, 220, 8, '#6b4a3a', 5); g.circ(0, -260, 110, '#e8452c', 6); g.circ(-60, -220, 60, '#ff6b3a', 0); g.circ(50, -300, 50, '#ff8a3a', 0); });
      // 見ている人
      const cheer = s.k >= 2;
      noble(g, 860, 600, 0.9, '#7a5cd6', cheer, s.t, -1); noble(g, 150, 620, 0.8, '#2ec4b6', cheer, s.t + 1, 1);
      // まり
      let y, rot;
      if (ph < 0) { const t = (ph + 0.7) / 0.7; y = lerp(80, by, t * t); rot = ph * 2; }
      else if (ph < 1) { y = by - 420 * 4 * ph * (1 - ph); rot = ph * 5; }
      else { const t = ph - 1; y = by - 1900 * t + 1400 * t * t; rot = 5 + t * 12; }
      g.shadow(500, 880, 70 * clamp(1 - (by - y) / 900, 0.4, 1), 14, 0.15);
      mari(g, 500, y, 66, rot);
      legs(g, s, { ty: 812, shoe: '#2b2140', pants: '#8e7cc3', sock: '#ffffff' });
    },
    hit(g, s, k) {
      g.fx.lines(500, 790, { n: 8, r0: 80, r1: 160, a0: PI + 0.3, arc: PI - 0.6, w: 10 }); g.fx.shake(4, 0.08);
      g.fx.pop(k === 2 ? 'ヤア！' : 'アリ！', g.mx(s.lastSide, 780), 560, { size: k === 2 ? 110 : 100, c: k === 2 ? C.yellow : '#ffffff', life: k === 2 ? 0.9 : 0.62 });
      if (k === 2) { g.fx.stars(500, 600, 10); g.fx.hearts(860, 420, 4); g.sfx('chime'); }
    },
  },

  /* ---------- 水をける（海・かっぱ） ---------- */
  {
    id: 'kick-splash', acts: ['kick'], modes: ['one', 'alt'], sfx: 'splash', vars: [
      { k: 'beach', name: '波打ちぎわで水をける', short: '水けり', theme: 'sea' },
      { k: 'kappa', name: 'かっぱに水をかける', short: 'かっぱ', theme: 'fantasy', kappa: 1 },
    ],
    draw(g, s, v) {
      const V = g.V, a2 = s.k >= 2 ? s.age : -1;
      if (v.kappa) {
        g.sky('#9fdcff', '#eaf8ff', 330); g.hills(330, '#5fae5a', 60, 3, 5);
        g.band(330, 'bottom', '#7cc85a');
        g.poly([V.x0 - 60, 470, 300, 380, 700, 380, V.x1 + 60, 470, V.x1 + 60, V.y1 + 60, V.x0 - 60, V.y1 + 60], '#4cc0e8', 0);
        g.poly([V.x0 - 60, 480, 300, 392, 700, 392, V.x1 + 60, 480, V.x1 + 60, V.y1 + 60, V.x0 - 60, V.y1 + 60], '#5fd0f0', 0);
        for (let i = 0; i < 9; i++) { const y = 420 + i * i * 9 + ((s.t * 40 + i * 30) % 30), w = 60 + i * 20; g.curve([500 - w * 3 + (i % 3) * 140, y, 500 - w * 2.4 + (i % 3) * 140, y - 8, 500 - w * 1.8 + (i % 3) * 140, y], 'rgba(255,255,255,0.7)', 4); g.curve([500 + w + (i % 2) * 120, y + 10, 500 + w * 1.6 + (i % 2) * 120, y + 2, 500 + w * 2.2 + (i % 2) * 120, y + 10], 'rgba(255,255,255,0.7)', 4); }
        for (const [x, y, r] of [[160, 520, 60], [860, 560, 70], [760, 430, 36]]) { g.blob([x - r, y, x - r * 0.8, y - r * 0.6, x, y - r * 0.8, x + r * 0.8, y - r * 0.5, x + r, y], '#9aa1ad'); }
        // かっぱ（1回目：お皿がぬれる、2回目：元気いっぱい）
        const l1 = sinceLand(s, 1), l2 = sinceLand(s, 2), st = l2 >= 0 || a2 >= 0 ? 2 : l1 >= 0 ? 1 : 0;
        const wet = l2 >= 0 ? 2 : l1 >= 0 ? 1 : 0, hop = a2 >= 0 ? Math.max(0, Math.sin(PI * clamp(a2 / 0.3))) * 40 : 0;
        kappa(g, 500, 620 - hop, 0.95, st, s.t, wet);
        g.ell(500, 622, 170, 30, '#5fd0f0', 0); g.at(500, 622, 0, 1, 0.2, () => g.ring(0, 0, 170 + Math.sin(s.t * 4) * 8, 'rgba(255,255,255,0.85)', 24));
        for (const k of [1, 2]) {
          const q = flyQ(s, k); if (q < 0) continue;
          if (landed(s, k)) { g.fx.splash(500, 240, C.water, 16); if (k === 1) g.fx.pop('ピチャッ', 760, 260, { size: 88 }); else g.fx.hearts(500, 200, 6); }
          if (q >= 1) continue;
          const x = 500, y = lerp(760, 230, q) - 200 * 4 * q * (1 - q), sc = lerp(1, 0.5, q);
          g.alpha(0.9, () => { for (let i = 0; i < 5; i++) g.circ(x + Math.cos(i * 1.3) * 40 * sc, y + Math.sin(i * 1.7) * 30 * sc, (34 - i * 3) * sc, i % 2 ? '#bdeeff' : '#7fdcf5', 4); });
        }
      } else {
        g.sky('#5bc0ff', '#cdeeff', 340); g.sun(800, 110, 64);
        // にじ（2回目）
        if (a2 >= 0) g.alpha(clamp(a2 / 0.15), () => { const cs = ['#ff6b6b', '#ffb347', '#ffe066', '#7be08a', '#6bb8ff', '#a98bff']; for (let i = 0; i < 6; i++) g.arc(500, 640, 460 - i * 30, PI * 1.05, PI * 1.95, cs[i], 30); });
        g.band(320, 520, '#2fa7e6'); for (let i = 0; i < 4; i++) for (let x = V.x0 + (i % 2) * 60; x < V.x1; x += 120) g.arc(x + 50, 360 + i * 40 + 8 * Math.sin(x + s.beat * 2), 26 + i * 6, PI, 0, 'rgba(255,255,255,0.8)', 5);
        g.band(520, 'bottom', '#f6dfa8');
        g.path(`M${V.x0 - 60} 600 Q250 ${570 + Math.sin(s.t * 2) * 10} 500 600 Q750 ${630 + Math.sin(s.t * 2) * 10} ${V.x1 + 60} 600 L${V.x1 + 60} ${V.y1 + 60} L${V.x0 - 60} ${V.y1 + 60} Z`, 'rgba(76,201,240,0.55)', 0);
        g.curve([V.x0 - 60, 600, 250, 570 + Math.sin(s.t * 2) * 10, 500, 600, 750, 630 + Math.sin(s.t * 2) * 10, V.x1 + 60, 600], '#ffffff', 8);
        for (let i = 0; i < 4; i++) g.curve([200 + i * 180, 720 + (i % 2) * 80, 240 + i * 180, 712 + (i % 2) * 80, 280 + i * 180, 720 + (i % 2) * 80], 'rgba(255,255,255,0.8)', 5);
        // カモメ
        for (const [x, y] of [[260, 160], [340, 200]]) g.path(`M${x - 30} ${y} Q${x - 15} ${y - 16} ${x} ${y} Q${x + 15} ${y - 16} ${x + 30} ${y}`, null, 5);
        // 水しぶき（扇形に飛ぶ水のかたまり）
        for (const k of [1, 2]) {
          if (s.k < k) continue; const t = s.ph - (k - 1); if (t > 0.6) continue;
          const q = E.outQ(clamp(t / 0.4)), a = 1 - clamp((t - 0.32) / 0.28);
          g.alpha(a, () => {
            for (let i = 0; i < 9; i++) {
              const ang = -PI / 2 + (i - 4) * 0.2, L = lerp(40, 380 + (i % 3) * 60, q), x = 500 + Math.cos(ang) * L, y = 780 + Math.sin(ang) * L + 260 * q * q, r = lerp(14, 40 - (i % 3) * 8, q);
              g.at(x, y, ang + PI / 2, 1, 1, () => { g.path(`M0 ${-r * 1.6} C${r} ${-r * 0.4} ${r} ${r} 0 ${r} C${-r} ${r} ${-r} ${-r * 0.4} 0 ${-r * 1.6} Z`, i % 2 ? '#bdeeff' : '#7fdcf5', 4); g.circ(-r * 0.3, -r * 0.2, r * 0.25, 'rgba(255,255,255,0.8)', 0); });
            }
          });
        }
      }
      legs(g, s, { ty: 800, shoe: v.kappa ? '#ffd23f' : '#2ec4b6', pants: v.kappa ? '#3d6fb5' : '#ff7eb6' });
    },
    hit(g, s, k, v) {
      g.fx.splash(500, 780, C.water, 22); g.fx.splash(500, 760, '#ffffff', 10); g.fx.shake(5, 0.1);
      if (v.kappa) { if (k === 2) { g.fx.pop('げんきー！', 500, 130, { size: 100, c: C.yellow, life: 0.9 }); g.sfx('magic'); } else g.fx.pop('バシャッ', g.mx(s.lastSide, 790), 700, { size: 88 }); }
      else if (k === 1) g.fx.pop('バシャーッ', 500, 260, { size: 96 });
      else { g.fx.pop('にじだ！', 500, 240, { size: 110, c: C.yellow, life: 0.9 }); g.fx.stars(500, 360, 10); g.sfx('chime'); }
    },
  },

  /* ---------- ダンボール・宝箱・かぼちゃ（中から何か出る） ---------- */
  {
    id: 'kick-box', acts: ['kick'], modes: ['one', 'alt'], sfx: (k, v) => v.sfx[k - 1], vars: [
      { k: 'box', name: '大きなダンボールをける', short: 'ダンボール', theme: 'home', sfx: ['thud', 'meow'] },
      { k: 'chest', name: '宝箱をける', short: '宝箱', theme: 'fantasy', sfx: ['clang', 'coin'], chest: 1 },
      { k: 'pumpkin', name: 'かぼちゃをける', short: 'かぼちゃ', theme: 'spooky', sfx: ['thud', 'magic'], pumpkin: 1 },
    ],
    draw(g, s, v) {
      const V = g.V, a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      const hop = a1 >= 0 && a2 < 0 ? -Math.max(0, Math.sin(PI * clamp(a1 / 0.3))) * 40 : a2 >= 0 ? -Math.max(0, Math.sin(PI * clamp(a2 / 0.25))) * 30 : 0;
      const sq = squash(a2 >= 0 ? a2 : a1 < 2 ? a1 : 9, 0.12);
      if (v.chest) {
        g.bg('#2a2440', '#3d3358');
        for (let j = 0; j * 90 < 700 - V.y0; j++) for (let i = Math.floor(V.x0 / 160) - 1; i * 160 < V.x1 + 160; i++) g.rr(i * 160 + (j % 2) * 80, V.y0 + j * 90, 150, 80, 12, ['#4a4166', '#463d60', '#514770'][(i + j * 2 + 9) % 3], 0);
        g.band(700, 'bottom', '#3a3150', 7);
        for (const x of [150, 850]) { g.rr(x - 12, 260, 24, 100, 6, '#7a4a2a', 5); g.glow(x, 230, 160, '#ffb36b', 0.45); g.path(`M${x} ${190 + Math.sin(s.t * 12 + x) * 8} Q${x + 30} 240 ${x} 262 Q${x - 30} 240 ${x} ${190 + Math.sin(s.t * 12 + x) * 8} Z`, '#ffb020', 4); g.path(`M${x} 222 Q${x + 14} 248 ${x} 260 Q${x - 14} 248 ${x} 222 Z`, '#fff3b0', 0); }
        const open = a2 >= 0 ? E.outBack(clamp(a2 / 0.25)) : 0;
        g.shadow(500, 790, 260, 30, 0.35);
        g.at(500, 780 + hop, 0, sq[0], sq[1], () => {
          if (open > 0) { g.glow(0, -320, 330, '#fff3b0', 0.9 * open); g.at(0, -330, 0, 1, -0.6 * open + 0.4 * (1 - open), () => { g.path('M-230 0 Q-230 -120 0 -130 Q230 -120 230 0 Z', '#a8582e'); g.rr(-230, -14, 460, 28, 6, C.gold); }); for (let i = 0; i < 7; i++) g.circ(-150 + i * 50, -330 - Math.abs(Math.sin(i * 1.7)) * 30, 24, C.gold, 5); }
          g.rr(-230, -330, 460, 330, 16, '#a8582e'); for (const x of [-150, 150]) g.rr(x - 18, -330, 36, 330, 4, C.gold); g.rr(-230, -30, 460, 30, 8, '#8a4a26', 5);
          if (!open) { g.path('M-230 -330 Q-230 -450 0 -460 Q230 -450 230 -330 Z', '#b8663a'); for (const x of [-150, 150]) g.path(`M${x - 18} -330 L${x - 18} ${-440 + Math.abs(x) * 0.05} L${x + 18} ${-440 + Math.abs(x) * 0.05} L${x + 18} -330 Z`, C.gold, 0); g.path('M-230 -330 Q-230 -450 0 -460 Q230 -450 230 -330 Z', null); g.rr(-240, -344, 480, 28, 8, C.gold); }
          if (s.k === 0) { g.rr(-44, -330, 88, 100, 14, '#ffd23f'); g.arc(0, -330, 30, PI, TAU, '#8f9bb0', 14); g.circ(0, -290, 12, C.ol, 0); g.rect(-4, -290, 8, 26, C.ol, 0); }
          else g.rr(-30, -330, 60, 40, 8, '#c9a32a', 5);
        });
        if (s.k >= 1 && a1 < 1) { const t = a1, [x, y] = [500 + 400 * t, 450 - 900 * t + 1400 * t * t]; g.at(x, y, t * 12, 1, 1, () => { g.rr(-44, 0, 88, 100, 14, '#ffd23f'); g.arc(0, 0, 30, PI, TAU, '#8f9bb0', 14); }); }
      } else if (v.pumpkin) {
        g.bg('#1b1840', '#4b2a6e'); g.glow(800, 140, 200, '#fff6c0', 0.4); g.circ(800, 140, 80, '#fff6c0', 0); g.circ(830, 120, 70, '#3a2a60', 0);
        for (const [x, y] of [[200, 160], [300, 110], [650, 220]]) { const f = Math.sin(s.t * 10 + x) * 12; g.path(`M${x} ${y} Q${x - 20} ${y - 20 - f} ${x - 46} ${y - 6} Q${x - 30} ${y - 4} ${x - 24} ${y + 8} Q${x - 10} ${y} ${x} ${y + 10} Q${x + 10} ${y} ${x + 24} ${y + 8} Q${x + 30} ${y - 4} ${x + 46} ${y - 6} Q${x + 20} ${y - 20 - f} ${x} ${y} Z`, C.ol, 0); }
        for (let x = Math.floor(V.x0 / 90) * 90; x < V.x1 + 90; x += 90) g.path(`M${x - 30} 640 L${x - 30} 470 L${x} 440 L${x + 30} 470 L${x + 30} 640 Z`, '#3a2a55', 0);
        g.band(620, 'bottom', '#2a1f40', 7);
        const lit = s.k >= 1, lid = a2 >= 0 ? clamp(a2 / 0.3) : 0;
        g.shadow(500, 800, 260, 30, 0.4);
        if (lit) g.glow(500, 600, 420, '#ffb020', 0.35);
        g.at(500, 790 + hop, 0, sq[0], sq[1], () => {
          const body = (f) => { g.ell(0, -200, 260, 200, f); for (const sx of [-0.62, -0.25, 0.25, 0.62]) g.ell(sx * 260, -200, 70, 196, null, 5); };
          body('#ff8a1f'); g.ell(-140, -200, 60, 170, '#ff9f3a', 0); g.ell(140, -200, 60, 170, '#ff9f3a', 0); g.ell(0, -200, 70, 196, '#ff9f3a', 0); body(null);
          const fc = lit ? '#ffe27a' : '#5a2a10';
          g.tri(-150, -250, -60, -250, -105, -320, fc); g.tri(150, -250, 60, -250, 105, -320, fc);
          g.path('M-170 -150 L-120 -110 L-80 -150 L-40 -110 L0 -150 L40 -110 L80 -150 L120 -110 L170 -150 Q0 -40 -170 -150 Z', fc);
          if (lit) { g.glow(-105, -280, 80, '#fff3b0', 0.6); g.glow(105, -280, 80, '#fff3b0', 0.6); }
          g.at(lid * 120, -400 - lid * 380, lid * 4, 1, 1, () => { g.path('M-90 10 Q0 -40 90 10 Q0 30 -90 10 Z', '#e8761a'); g.rr(-16, -70, 32, 70, 10, '#5a8a3a'); g.curve([16, -50, 50, -80, 70, -60], '#5a8a3a', 8); });
        });
      } else {
        g.bg('#fbe3c8'); g.rr(80, 120, 300, 300, 10, '#bfe6ff', 8); g.line([230, 120, 230, 420], '#ffffff', 10); g.line([80, 270, 380, 270], '#ffffff', 10); g.rr(70, 100, 320, 30, 8, '#e8a0a0', 0);
        g.rr(760, 300, 120, 140, 14, '#e07a5f'); g.circ(790, 260, 60, '#4fae4c', 0); g.circ(850, 240, 54, '#58c46e', 0); g.circ(820, 200, 46, '#3f9e4a', 0);
        g.band(640, 'bottom', '#d39457', 7); g.planks(V.x0 - 40, 646, V.x1 - V.x0 + 80, 700, 6, '#d9a066');
        const dent = s.k >= 1 ? E.outQ(clamp(a1 / 0.15)) : 0, open = a2 >= 0 ? E.outBack(clamp(a2 / 0.25)) : 0;
        g.shadow(510, 810, 280, 30, 0.3);
        // ねこ（1回目：耳がのぞく、2回目：とび出す）
        if (s.k >= 1) {
          const up = open > 0 ? 330 * open : 60 * E.outBack(clamp((a1 - 0.1) / 0.3));
          g.at(500, 520 + hop - up, 0, 1, 1, () => {
            if (open > 0) { g.ell(0, 130, 120, 110, '#ffb35c'); g.ell(0, 150, 70, 70, '#fff3e0', 0); for (const sd of [-1, 1]) g.at(sd * 110, 80, sd * -0.9, 1, 1, () => g.ell(0, -40, 26, 50, '#ffb35c')); }
            catFace(g, 0, 0, 100, open > 0);
          });
        }
        g.at(500, 800 + hop, 0, sq[0], sq[1], () => cardboard(g, 0, 0, 1, dent, open, s.t));
      }
      legs(g, s, { ty: 760, shoe: v.pumpkin ? '#7a5cd6' : v.chest ? '#a0673c' : C.red, pants: v.pumpkin ? '#2b2140' : v.chest ? '#5a3a6a' : C.navy });
    },
    hit(g, s, k, v) {
      g.fx.lines(500, 740, { n: 12, r0: 110, r1: 230, w: 11 }); g.fx.shake(k === 2 ? 10 : 7, 0.12);
      const px = g.mx(s.lastSide, 790);
      if (v.chest) { if (k === 1) { g.fx.sparks(500, 480, 12); g.fx.pop('ガチャン', px, 560, { size: 92 }); } else { g.fx.coins(500, 450, 16); g.fx.pop('おたから！', 500, 140, { size: 104, c: C.yellow, life: 0.9 }); g.fx.stars(500, 300, 10); } }
      else if (v.pumpkin) { if (k === 1) { g.fx.pop('ボッ', px, 520, { size: 100, c: '#ffe27a' }); g.fx.burst(500, 560, { n: 10, c: ['#ffe27a', '#ffb020'], shape: 'spark', sp: [300, 700], size: [12, 22], g: 300 }); } else { g.fx.burst(500, 400, { n: 26, c: [C.pink, C.yellow, C.lime, C.sky, C.violet, C.orange], shape: 'square', sp: [400, 900], size: [16, 26], g: 1300, spin: 18 }); g.fx.burst(500, 400, { n: 10, c: [C.pink, C.yellow], shape: 'star', sp: [300, 800], size: [16, 26], g: 900 }); g.fx.pop('おかしだ！', 500, 140, { size: 104, c: C.yellow, life: 0.9 }); } }
      else { if (k === 1) g.fx.pop('ボコッ', px, 540, { size: 96 }); else { g.fx.pop('ニャー！', 500, 120, { size: 110, c: C.yellow, life: 0.9 }); g.fx.hearts(500, 300, 6); } }
    },
  },

  /* ---------- いん石・おばけをけとばす（近づいてくる → けって遠くへ） ---------- */
  {
    id: 'kick-away', acts: ['kick'], modes: ['one', 'alt'], sfx: (k, v) => v.sfx, vars: [
      { k: 'meteor', name: 'いん石をけりかえす', short: 'いん石', theme: 'space', sfx: 'kick' },
      { k: 'ghost', name: 'おばけをけとばす', short: 'おばけ', theme: 'spooky', sfx: 'boing', ghost: 1 },
    ],
    init(s) { s.my.st = []; for (let i = 0; i < 40; i++) s.my.st.push([s.r(), s.r(), s.r()]); },
    draw(g, s, v) {
      const V = g.V, T = [500, 730];
      if (v.ghost) {
        g.bg('#141238', '#3a2466'); g.circ(780, 160, 90, '#fff6c0', 0); g.glow(780, 160, 220, '#fff6c0', 0.35);
        for (const [a, b] of s.my.st.slice(0, 14)) g.circ(V.x0 + (V.x1 - V.x0) * a, V.y0 + (360 - V.y0) * b, 3, '#ffffff', 0);
        g.hills(560, '#2a2050', 50, 6, 5); g.band(600, 'bottom', '#231a46', 7);
        g.at(160, 600, 0, 1, 1, () => { g.line([0, 0, 0, -260, -60, -330], '#1a1430', 16); g.line([0, -200, 70, -270], '#1a1430', 12); });
        for (const [x, y, w] of [[260, 640, 80], [760, 650, 90], [880, 720, 70], [120, 760, 70]]) { g.path(`M${x - w / 2} ${y} L${x - w / 2} ${y - w * 1.1} Q${x} ${y - w * 1.7} ${x + w / 2} ${y - w * 1.1} L${x + w / 2} ${y} Z`, '#8f9bb0'); g.line([x - w * 0.2, y - w * 1.0, x + w * 0.2, y - w * 1.0], '#5c6478', 5); }
      } else {
        g.bg('#0b0f2a', '#1f1a4e');
        for (const [a, b, c] of s.my.st) g.circ(V.x0 + (V.x1 - V.x0) * a, V.y0 + (V.y1 - V.y0) * b, 2 + c * 3, c > 0.8 ? '#ffe27a' : '#ffffff', 0);
        g.at(180, 200, -0.3, 1, 1, () => {
          g.at(0, 0, 0, 1, 0.22, () => { g.arc(0, 0, 170, PI, TAU, C.ol, 34); g.arc(0, 0, 170, PI, TAU, '#ffd8a8', 20); });
          g.circ(0, 0, 90, '#ff9f6b'); g.clipCirc(0, 0, 90, () => { g.rect(-90, -24, 180, 20, '#ffb98f', 0); g.rect(-90, 22, 180, 16, '#e8834f', 0); }); g.circ(0, 0, 90, null);
          g.at(0, 0, 0, 1, 0.22, () => { g.arc(0, 0, 170, 0.05, PI - 0.05, C.ol, 34); g.arc(0, 0, 170, 0.05, PI - 0.05, '#ffd8a8', 20); });
        });
        g.circ(820, 820, 260, '#5a7ad8'); g.clipCirc(820, 820, 260, () => { g.blob([640, 700, 720, 640, 800, 680, 760, 760, 680, 780], '#5fbf5a', 0); g.blob([840, 600, 940, 640, 920, 720, 860, 700], '#5fbf5a', 0); }); g.circ(820, 820, 260, null);
      }
      // 近づいてくる → けられて飛んでいく
      for (let i = 0; i < 2; i++) {
        const t = s.ph - i;
        if (t < -0.85) continue;
        let x, y, sc, rot = 0, gone = false;
        if (t <= 0) { const q = clamp((t + 0.85) / 0.85), e = q * q; x = lerp(500 + (i ? -140 : 140), T[0], q); y = lerp(400, T[1] - 60, e) + (v.ghost ? Math.sin(s.t * 5 + i) * 14 * (1 - q) : 0); sc = lerp(0.2, 1.3, e); rot = v.ghost ? Math.sin(s.t * 4) * 0.1 : t * 3; }
        else { const q = clamp(t / 0.22); x = lerp(T[0], 500 + (i ? 120 : -120), E.outQ(q)); y = lerp(T[1] - 60, 260, E.outQ(q)); sc = lerp(1.3, 0.04, E.outQ(q)); rot = q * 10; gone = q >= 1; if (gone && !s.my['tw' + i]) { s.my['tw' + i] = 1; g.fx.burst(x, y, { n: 10, c: ['#ffe27a', '#ffffff'], shape: 'star', sp: [100, 300], size: [14, 24], g: 0, life: [0.4, 0.7] }); if (!v.ghost) g.sfx('magic'); } }
        if (gone) { const tw = (t - 0.22) / 0.25; if (tw < 1) { const ex = 500 + (i ? 120 : -120), r = 40 * Math.sin(PI * tw); g.star(ex, 260, r, r * 0.25, 4, '#fff6b0', 0); } continue; }
        if (v.ghost) g.at(x, y, rot, sc, sc, () => {
          g.path('M-110 40 Q-120 -120 0 -140 Q120 -120 110 40 Q90 20 70 50 Q50 20 30 50 Q10 20 -10 50 Q-30 20 -50 50 Q-70 20 -90 50 Q-100 30 -110 40 Z', 'rgba(255,255,255,0.95)');
          const hit = t > 0; for (const sd of [-1, 1]) { if (hit) g.line([sd * 50, -70, sd * 30, -54, sd * 50, -38], C.ol, 7); else g.ell(sd * 38, -60, 14, 20, C.ol, 0); g.ell(sd * 66, -24, 14, 8, '#ffb3c6', 0); }
          g.path(hit ? 'M-24 -10 Q0 20 24 -10 Z' : 'M-20 -10 Q0 6 20 -10', hit ? '#5a3a6a' : null, 5);
        });
        else g.at(x, y, rot, sc, sc, () => {
          if (t <= 0) for (let j = 0; j < 3; j++) g.alpha(0.5 - j * 0.12, () => g.circ(-60 * (j + 1) * 0.6 * (i ? 1 : -1) * 0.3, -70 * (j + 1) * 0.6, 70 - j * 14, '#ff9f3a', 0));
          g.blob([-110, 10, -90, -70, -20, -110, 60, -96, 112, -30, 100, 50, 30, 100, -70, 86], '#8a7a6a');
          for (const [cx, cy, cr] of [[-40, -30, 26], [40, 30, 20], [50, -50, 14], [-50, 46, 12]]) { g.circ(cx, cy, cr, '#6f6152', 0); g.arc(cx, cy, cr, PI * 0.9, PI * 1.9, '#5a4e42', 4); }
          g.hl(-40, -70, 30, 12, -0.4, 0.4);
        });
      }
      legs(g, s, { ty: T[1] + 40, shoe: v.ghost ? '#ff9f1c' : '#cfd6e2', pants: v.ghost ? '#3b3f6b' : '#eef2f8', sock: v.ghost ? '#ffffff' : '#9aa3b5' });
    },
    hit(g, s, k, v) {
      g.fx.lines(500, 730, { n: 12, r0: 110, r1: 230, w: 11, c: v.ghost ? '#c4a6ff' : '#ffe27a' }); g.fx.shake(k === 2 ? 10 : 7, 0.12);
      if (v.ghost) { g.fx.ring(500, 680, { c: '#c4a6ff', r1: 220 }); g.fx.burst(500, 680, { n: 10, c: ['#c4a6ff', '#ffffff'], shape: 'star', sp: [300, 700], size: [14, 24], g: 400 }); } else g.fx.chips(500, 700, '#8a7a6a', 10);
      if (k === 1) g.fx.pop(v.ghost ? 'ポーン' : 'カキーン', g.mx(s.lastSide, 780), 560, { size: 96 });
      else { g.fx.pop(v.ghost ? 'バイバーイ！' : 'キラーン！', 500, 150, { size: 104, c: C.yellow, life: 0.9 }); g.fx.stars(500, 500, 10); }
    },
  },
];
