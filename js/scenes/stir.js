/* 回す（腕を回す） — s.ang（1回で 2π、当たる瞬間に 0）で円をえがく。0 のとき円のいちばん上（奥） */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';
const E_ = E;

const TAU = Math.PI * 2;
const FLAME = 'M-1 0 Q-0.75 -0.6 0 -1 Q0.75 -0.6 1 0 Z';           // ほのお（g.at で大きさを変える）
const PEAK = 'M-200 0 Q-150 -120 -40 -210 Q0 -270 30 -300 Q20 -230 60 -180 Q170 -90 200 0 Z';
// 円の上の点：a=0 で上、右回り（左手は g.mirror で左回り）
const rp = (a, cx, cy, rx, ry) => [cx + rx * Math.sin(a), cy - ry * Math.cos(a)];
// 段階 0→1→2（当たったあと d 秒でなめらかに）
const lv = (s, d = 0.35, f = E.outQ) => s.k === 0 ? 0 : s.k - 1 + f(clamp(s.age / d));
const age2 = s => s.k >= 2 ? s.age : -1;
// 右下（左手は左下）から伸びる腕
function armTo(g, x, y, o = {}) {
  const ax = o.ax ?? 930, ay = o.ay ?? 1320;
  g.arm(x, y, Math.atan2(y - ay, x - ax) + (o.da ?? 0), { hand: o.hand ?? 'grip', side: o.side ?? 'R', sleeve: o.sleeve, s: o.s });
}
// 道具をにぎる：E=先（なべの中）、H=手。柄は手のこぶしを横に通る（腕は柄と直角）
function hold(g, E, H, o = {}) {
  const a = Math.atan2(H[1] - E[1], H[0] - E[0]), L = o.side === 'L', da = o.da ?? 0;
  g.arm(H[0], H[1], a + (L ? Math.PI / 2 - da : -Math.PI / 2 + da), { hand: 'grip', side: L ? 'L' : 'R', sleeve: o.sleeve, s: o.s ?? 0.95 });
}
// 左手（g.mirror の中）でも文字が裏返らないように
function utext(g, s, str, x, y, o) { g.at(x, y, 0, s.mode !== 'both' && s.side === 'L' ? -1 : 1, 1, () => g.text(str, 0, 0, o)); }
const toward = (E, H, t) => [lerp(E[0], H[0], t), lerp(E[1], H[1], t)];
function ripple(g, x, y, rx, col, t) { for (let i = 0; i < 2; i++) { const q = (t * 1.8 + i * 0.5) % 1; g.alpha(0.6 * (1 - q), () => g.at(x, y, 0, 1, 0.32, () => g.ring(0, 0, rx * (0.4 + q), col, 5))); } }
function steam(g, x, y, t, n = 3, col = '#ffffff', a = 0.5) { for (let i = 0; i < n; i++) { const q = (t * 0.7 + i / n) % 1, xx = x + (i - (n - 1) / 2) * 90 + Math.sin(q * 6 + i) * 20; g.alpha(a * Math.sin(Math.PI * q), () => g.curve([xx, y, xx - 20, y - 60 * q - 30, xx + 20, y - 110 * q - 60, xx, y - 160 * q - 80], col, 14)); } }

/* =========================================================================
   なべ・ボウルをかきまぜる（カレー・魔女の大なべ・チョコ）
   ========================================================================= */
const POT = [
  { k: 'curry', name: 'カレーをまぜる', short: 'カレー', theme: 'kitchen', sfx: 'bubble', modes: ['one', 'both'], cols: ['#f2d27a', '#d98a32', '#9a5418'], pop: ['グルン', 'できた！'] },
  { k: 'cauldron', name: '魔女の大なべ', short: '大なべ', theme: 'spooky', sfx: 'bubble', modes: ['one', 'both'], cols: ['#57d67a', '#a35cff', '#ff5fb8'], pop: ['ボコッ', 'ボワン！'] },
  { k: 'choco', name: 'チョコをとかす', short: 'チョコ', theme: 'kitchen', sfx: 'squish', modes: ['one'], cols: ['#7a4a2a', '#6a3a1e', '#5a2e14'], pop: ['トロッ', 'とろ〜り'] },
];
const PC = { x: 500, y: 600, rx: 320, ry: 104 };     // なべの口
function potBg(g, s, v) {
  const V = g.V;
  if (v.k === 'cauldron') {
    g.bg('#17123a', '#3b1f5e'); g.circ(780, 160, 80, '#fff3b0', 0); g.glow(780, 160, 220, '#fff3b0', 0.25);
    for (let i = 0; i < 14; i++) g.star(V.x0 + ((i * 263) % (V.x1 - V.x0)), V.y0 + ((i * 151) % (460 - V.y0)), 7, 3, 4, '#fff6c8', 0);
    for (const [x, h] of [[60, 380], [930, 420], [-200, 330], [1180, 360]]) { g.rect(x - 22, 760 - h, 44, h, '#2b1f3d', 0); g.circ(x, 760 - h, 110, '#2b1f3d', 0); g.circ(x - 80, 800 - h, 80, '#2b1f3d', 0); g.circ(x + 80, 810 - h, 80, '#2b1f3d', 0); }
    g.band(760, 'bottom', '#2a2140', 7);
    // たき火
    for (let i = 0; i < 5; i++) { const x = 330 + i * 85, h = 120 + 40 * Math.sin(s.t * 12 + i * 2); g.at(x, 880, 0, 46, h, () => g.path(FLAME, i % 2 ? C.orange : C.yellow, 0)); }
    for (const a of [-0.3, 0.3]) g.at(500, 900, a, () => g.rr(-200, -18, 400, 36, 16, '#7a4a2a'));
  } else {
    g.bg('#fff0d6'); g.tiles(V.x0 - 40, V.y0, V.x1 - V.x0 + 80, 640 - V.y0, 96, '#fff0d6', '#ffe5bf');
    g.band(640, 'bottom', '#5c6478', 7); g.band(660, 'bottom', '#6c768e');
    if (v.k === 'curry') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI, x = 500 + Math.cos(a) * 240, h = 30 + 10 * Math.sin(s.t * 20 + i); g.at(x, 880, 0, 18, h * 1.3, () => g.path(FLAME, '#5aa8ff', 0)); }
  }
}
function potBody(g, s, v) {
  const { x, y, rx, ry } = PC;
  if (v.k === 'choco') {
    // 湯せん：下のなべ＋ガラスのボウル
    g.path(`M${x - 300} ${y + 120} L${x - 270} ${y + 300} Q${x} ${y + 340} ${x + 270} ${y + 300} L${x + 300} ${y + 120} Z`, C.steel);
    g.ell(x, y + 120, 300, 70, '#9fd8ff');
    g.path(`M${x - rx} ${y} Q${x - rx} ${y + 230} ${x} ${y + 250} Q${x + rx} ${y + 230} ${x + rx} ${y} Z`, 'rgba(220,240,255,0.92)');
    g.hl(x - 200, y + 110, 26, 60, 0.4, 0.6);
  } else {
    const col = v.k === 'cauldron' ? '#2b2836' : '#e8434f';
    g.path(`M${x - rx} ${y} L${x - rx + 20} ${y + 200} Q${x} ${y + 270} ${x + rx - 20} ${y + 200} L${x + rx} ${y} Z`, col);
    if (v.k === 'cauldron') { g.rr(x - 220, y + 210, 60, 70, 20, col); g.rr(x + 160, y + 210, 60, 70, 20, col); g.hl(x - 180, y + 80, 40, 90, 0.2, 0.18); }
    else { g.rr(x - rx - 70, y + 20, 80, 36, 16, C.ol); g.rr(x + rx - 10, y + 20, 80, 36, 16, C.ol); g.hl(x - 200, y + 90, 30, 70, 0.3, 0.35); }
  }
  g.ell(x, y, rx, ry, v.k === 'choco' ? '#e9f4ff' : v.k === 'cauldron' ? '#3a3648' : sh('#e8434f', -0.15));
}
function potSurface(g, s, v, L, E) {
  const { x, y, rx, ry } = PC, c = v.cols, col = L < 1 ? g.mix(c[0], c[1], L) : g.mix(c[1], c[2], L - 1);
  const cx = x, cy = y + 18, srx = rx - 28, sry = ry - 18, rot = s.ang * 0.45;
  g.ell(cx, cy, srx, sry, col, 5);
  g.clipCirc(cx, cy, srx, () => g.at(cx, cy, 0, 1, sry / srx, () => {
    // うず
    g.at(0, 0, rot, () => { for (let i = 0; i < 3; i++) g.arc(0, 0, 60 + i * 70, i * 2, i * 2 + 2.4, sh(col, 0.22), 10); });
    if (v.k === 'curry') { for (let i = 0; i < 9; i++) { const a = rot + i * 2.1, r = 70 + (i * 53) % 190; g.at(Math.cos(a) * r, Math.sin(a) * r, a, () => g.rr(-24, -24, 48, 48, 10, ['#ff8a1f', '#ffe08a', '#b0703c'][i % 3], 5)); } }
    if (v.k === 'choco' && L < 1.6) { for (let i = 0; i < 8; i++) { const a = rot + i * 2.4, r = 60 + (i * 61) % 180, sc = clamp(1 - L * 0.62); if (sc > 0.05) g.at(Math.cos(a) * r, Math.sin(a) * r, a, sc, sc, () => g.rr(-34, -26, 68, 52, 8, '#8a5432', 5)); } }
    if (v.k === 'cauldron') for (let i = 0; i < 6; i++) { const q = (s.t * 1.4 + i / 6) % 1, a = i * 1.7 + rot * 0.3, r = 60 + (i * 47) % 170; g.alpha(1 - q, () => g.circ(Math.cos(a) * r, Math.sin(a) * r, 10 + q * 34, sh(col, 0.35), 5)); }
    // できあがりのつや
    if (L > 1.3) g.alpha(clamp((L - 1.3) / 0.5), () => { g.ell(-120, -50, 110, 40, 'rgba(255,255,255,0.35)', 0, -0.2); g.ell(140, 40, 50, 18, 'rgba(255,255,255,0.3)', 0, -0.2); });
  }));
  // ルー（1回目でとける）
  if (v.k === 'curry' && s.k === 0) g.at(cx + 120 * Math.cos(rot + 1), cy + 30 * Math.sin(rot + 1), Math.sin(s.t * 2) * 0.1, () => { g.rr(-60, -36, 120, 72, 10, '#8a4a1c'); g.grid(-56, -32, 112, 64, 28, '#6e3a14', 4); });
  ripple(g, E[0], E[1], 60, 'rgba(255,255,255,0.8)', s.t);
}
function potTool(g, s, v, E, both) {
  if (v.k === 'cauldron' || both) {
    // 大きなかい（両手のときはまっすぐ立てて左右から持つ）
    const T = both ? [E[0], E[1] - 420] : [E[0] + 230, E[1] - 520];
    g.at(E[0], E[1], Math.atan2(T[0] - E[0], -(T[1] - E[1])), () => g.rr(-46, -24, 92, 70, 22, '#8a5a36'));
    g.cap(E[0], E[1], T[0], T[1], 18, '#a0673c');
    const sl = v.k === 'cauldron' ? '#7d3fb0' : undefined;
    if (both) { hold(g, E, toward(E, T, 0.5), { side: 'R', sleeve: sl, da: 0.65 }); hold(g, E, toward(E, T, 0.82), { side: 'L', sleeve: sl, da: 0.65 }); }
    else hold(g, E, toward(E, T, 0.7), { sleeve: sl });
    return;
  }
  const a = s.ang, H = [E[0] + 160 + 40 * Math.sin(a), E[1] - 230 - 60 * Math.cos(a)], T = toward(E, H, 1.25);
  if (v.k === 'choco') { g.cap(E[0], E[1], T[0], T[1], 12, '#ff7aa8'); g.at(E[0], E[1], Math.atan2(H[0] - E[0], -(H[1] - E[1])), () => g.rr(-34, -10, 68, 50, 18, '#ff9fbd')); }
  else { g.cap(E[0], E[1], T[0], T[1], 11, C.steel); g.circ(T[0], T[1], 16, C.steel); g.circ(T[0], T[1], 6, '#5c6478', 0); }
  hold(g, E, H);
}

/* =========================================================================
   ボウルでまぜる（メレンゲ・なっとう・絵の具）
   ========================================================================= */
const BOWL = [
  { k: 'meringue', name: 'メレンゲを作る', short: 'メレンゲ', theme: 'kitchen', sfx: 'swish', pop: ['シャカ', 'ツノ！'], modes: ['one', 'both'] },
  { k: 'natto', name: 'なっとうをまぜる', short: 'なっとう', theme: 'kitchen', sfx: 'squish', pop: ['ネバッ', 'ネバ〜'] },
  { k: 'paint', name: '絵の具をまぜる', short: '絵の具', theme: 'school', sfx: 'squish', pop: ['グルッ', 'みどり！'], modes: ['one', 'both'] },
];
const BC = { x: 500, y: 620, rx: 290, ry: 96 };
function bowlScene(g, s, v, L) { bowlBg(g, s, v); bowlVessel(g, s, v); }
function bowlBg(g, s, v) {
  const V = g.V;
  if (v.k === 'meringue') { g.bg('#e3f4ff'); g.stripes(V.x0, V.y0, V.x1 - V.x0, 650 - V.y0, 64, '#e3f4ff', '#d4ecff'); g.band(650, 'bottom', '#f6d8a8', 7); g.planks(V.x0 - 20, 660, V.x1 - V.x0 + 40, 400, 4, '#efc994'); }
  else if (v.k === 'natto') { g.bg('#f3e6cf'); g.band(650, 'bottom', '#7a4a2a', 7); g.planks(V.x0 - 20, 660, V.x1 - V.x0 + 40, 400, 4, '#8a5a36'); g.ell(200, 760, 120, 34, '#ffffff'); g.at(200, 730, 0, () => { g.circ(0, 0, 70, '#fdfaf3'); g.ell(0, -10, 60, 30, '#f6f2e6', 0); }); }
  else { g.bg('#d9f5e5'); g.grid(V.x0, V.y0, V.x1 - V.x0, 650 - V.y0, 120, '#c4ebd5', 6); g.band(650, 'bottom', '#f0e2c4', 7); for (const [px, c] of [[150, C.red], [250, C.blue], [780, C.yellow], [870, C.purple]]) g.rr(px - 30, 680, 60, 130, 14, c); }
}
function bowlVessel(g, s, v) {
  const { x, y, rx, ry } = BC;
  if (v.k === 'paint') {
    // パレット
    g.shadow(x, y + 150, 360, 30);
    g.path('M150 610 Q160 470 400 470 L640 470 Q860 470 860 620 Q860 780 640 790 L380 790 Q300 790 300 740 Q300 700 250 710 Q160 730 150 610 Z', '#f6e7c8');
    g.ell(260, 640, 36, 26, '#d9c6a0', 4);
    return;
  }
  // ボウル
  g.shadow(x, y + 230, 300, 30);
  const col = v.k === 'natto' ? '#5b6ee8' : '#ffffff';
  g.path(`M${x - rx} ${y} Q${x - rx + 10} ${y + 220} ${x} ${y + 240} Q${x + rx - 10} ${y + 220} ${x + rx} ${y} Z`, col);
  if (v.k === 'natto') for (let i = 0; i < 5; i++) g.circ(x - 200 + i * 100, y + 120 + (i % 2) * 30, 16, '#ffffff', 0);
  else g.hl(x - 180, y + 100, 26, 64, 0.4, 0.6);
  g.ell(x, y, rx, ry, v.k === 'natto' ? '#e8ecff' : '#eef3fb');
}
function bowlContent(g, s, v, L, T) {
  const { x, y, rx, ry } = BC, rot = s.ang * 0.5;
  if (v.k === 'meringue') {
    const col = g.mix('#fff6c2', '#ffffff', clamp(L));
    g.ell(x, y + 14, rx - 30, ry - 20, col, 5);
    g.clipCirc(x, y + 14, rx - 30, () => g.at(x, y + 14, 0, 1, (ry - 20) / (rx - 30), () => { for (let i = 0; i < 16; i++) { const a = rot + i * 1.9, r = 40 + (i * 37) % 200, b = L > 0.2 ? 10 + (i % 3) * 6 : 6; g.circ(Math.cos(a) * r, Math.sin(a) * r, b, 'rgba(255,255,255,0.9)', L > 0.5 ? 3 : 0); } }));
    // ツノ（2回目でぐんとのびる）
    const pk = L <= 1 ? L * 0.5 : 0.5 + 0.5 * E.outBack(clamp(L - 1));
    if (pk > 0.05) g.at(x, y + 24, 0, pk, pk, () => {
      g.blob([-210, 0, -190, -70, -120, -110, -140, -160, -70, -190, -80, -240, -10, -250, 30, -300, 60, -330, 40, -270, 80, -230, 70, -190, 140, -160, 120, -110, 190, -70, 210, 0], '#ffffff', 7 / pk, 0.9);
      g.curve([-150, -80, -40, -110, 80, -90, 150, -60], '#e3e8f2', 6 / pk); g.curve([-90, -170, 0, -200, 70, -180], '#e3e8f2', 6 / pk);
      g.hl(-60, -150, 26, 12, -0.4, 0.8);
    });
  } else if (v.k === 'natto') {
    g.ell(x, y + 14, rx - 30, ry - 20, '#c9944a', 5);
    g.clipCirc(x, y + 14, rx - 30, () => g.at(x, y + 14, 0, 1, (ry - 20) / (rx - 30), () => { for (let i = 0; i < 22; i++) { const a = rot + i * 2.3, r = 30 + (i * 29) % 210; g.ell(Math.cos(a) * r, Math.sin(a) * r, 26, 20, ['#b07a36', '#c08844', '#a06a2a'][i % 3], 4, a); } }));
    // 糸（段階で増える）
    const n = 4 + Math.floor(L * 6), up = s.k >= 2 ? 70 * E.outQ(clamp(s.age / 0.25)) : 0;
    for (let i = 0; i < n; i++) { const a = i * 2.4 + rot, bx = x + Math.cos(a) * 180, by = y + 14 + Math.sin(a) * 52, mx = (bx + T[0]) / 2 + Math.sin(i + s.t * 3) * 24, my = (by + T[1]) / 2 - 40 - up * 0.6; g.curve([bx, by, mx, my, T[0], T[1] - up], 'rgba(120,80,30,0.35)', 9); g.curve([bx, by, mx, my, T[0], T[1] - up], '#fffbe8', 5); }
  } else {
    // 絵の具：青と黄 → まだら → みどり
    const g0 = L < 1 ? 0 : clamp(L - 1);
    g.at(x, y, 0, 1, 1, () => {
      g.ell(0, 30, 230, 120, g.mix('#7fd36a', '#3cbf5a', g0), 5);
      if (L < 1.9) {
        g.clipCirc(0, 30, 230, () => g.at(0, 30, 0, 1, 120 / 230, () => g.alpha(1 - g0, () => {
          g.at(0, 0, rot, () => { g.path('M0 0 C80 -200 260 -60 230 0 C210 80 40 120 0 0 Z', '#3a86ff', 0); g.path('M0 0 C-80 200 -260 60 -230 0 C-210 -80 -40 -120 0 0 Z', '#ffd23f', 0); });
          if (L > 0.4) for (let i = 0; i < 4; i++) g.at(0, 0, rot + i * 1.6, () => g.arc(0, 0, 50 + i * 40, 0, 2.2, ['#3a86ff', '#ffd23f'][i % 2], 18));
        })));
      }
      g.ell(0, 30, 230, 120, null, 5);
    });
  }
}
function paintBrush(g, s, E, H, side = 'R', handle = '#e8434f') {
  const T = toward(E, H, 1.15);
  g.cap(E[0], E[1] - 40, T[0], T[1], 10, side === 'L' ? '#3a86ff' : handle); g.rr(E[0] - 14, E[1] - 60, 28, 40, 6, C.metal, 4);
  g.at(E[0], E[1] - 20, Math.atan2(H[0] - E[0], -(H[1] - E[1])), () => g.path('M-14 -20 Q-18 10 0 40 Q18 10 14 -20 Z', g.mix(side === 'L' ? '#ffd23f' : '#3a86ff', '#3cbf5a', clamp(lv(s)))));
  hold(g, E, H, { side });
}
function bowlTool(g, s, v, E) {
  if (v.k === 'meringue') {
    const H = [E[0] + 150 + 40 * Math.sin(s.ang), E[1] - 250 - 60 * Math.cos(s.ang)], ux = E[0] - H[0], uy = E[1] - H[1], d = Math.hypot(ux, uy);
    g.at(H[0], H[1], Math.atan2(ux, -uy), d / 330, d / 330, () => g.whisk(0, 0, 0, 1));
    hold(g, E, H);
  } else if (v.k === 'natto') {
    const H = [E[0] + 150 + 40 * Math.sin(s.ang), E[1] - 260 - 50 * Math.cos(s.ang)], T = toward(E, H, 1.2), up = s.k >= 2 ? 70 * E_.outQ(clamp(s.age / 0.25)) : 0;
    for (const dx of [-14, 12]) g.line([E[0] + dx, E[1] - up, T[0] + dx * 0.6, T[1] - up], '#c98b52', 12);
    for (const dx of [-14, 12]) g.line([E[0] + dx, E[1] - up, T[0] + dx * 0.6, T[1] - up], C.ol, 0.1);
    for (const dx of [-14, 12]) { g.cap(E[0] + dx, E[1] - up, T[0] + dx * 0.6, T[1] - up, 6, '#d9a56a', 4); }
    hold(g, [E[0], E[1] - up], [H[0], H[1] - up]);
  } else {
    const H = [E[0] + 150 + 40 * Math.sin(s.ang), E[1] - 240 - 50 * Math.cos(s.ang)], T = toward(E, H, 1.15);
    g.cap(E[0], E[1] - 40, T[0], T[1], 10, '#e8434f'); g.rr(E[0] - 14, E[1] - 60, 28, 40, 6, C.metal, 4);
    g.at(E[0], E[1] - 20, Math.atan2(H[0] - E[0], -(H[1] - E[1])), () => g.path('M-14 -20 Q-18 10 0 40 Q18 10 14 -20 Z', g.mix('#7fd36a', '#3cbf5a', clamp(lv(s) - 1))));
    hold(g, E, H);
  }
}

/* =========================================================================
   ハンドルを回す（かき氷・手回しオルガン・カプセルトイ・井戸・リール）
   取っ手は円のいちばん上で当たる
   ========================================================================= */
const CRANK = [
  { k: 'kakigori', name: 'かき氷を作る', short: 'かき氷', theme: 'festival', sfx: 'crunch', ax: 660, ay: 230, r: 110, pop: ['シャリ', 'できた！'] },
  { k: 'organ', name: '手回しオルガン', short: 'オルガン', theme: 'music', sfx: 'pluck', ax: 740, ay: 470, r: 110, pop: ['プップー', 'ラララ'] },
  { k: 'gacha', name: 'カプセルトイを回す', short: 'カプセル', theme: 'game', sfx: 'click', ax: 500, ay: 620, r: 84, pop: ['ガチャ', 'あたり！'] },
  { k: 'well', name: '井戸で水くみ', short: '井戸', theme: 'nature', sfx: 'wood', ax: 650, ay: 300, r: 100, pop: ['ギィ', 'ケロッ'], modes: ['one', 'both'], both: { ax: 712, ay: 300, r: 92 } },
  { k: 'dynamo', name: '発電機を回す', short: '発電機', theme: 'school', sfx: ['zap', 'ding'], ax: 700, ay: 610, r: 95, pop: ['ビビッ', 'ピカーッ'], modes: ['one', 'both'], both: { ax: 745, ay: 610, r: 92 } },
  { k: 'reel', name: '魚をつり上げる', short: 'つり', theme: 'sea', sfx: 'click', ax: 520, ay: 690, r: 90, pop: ['グイッ', 'つれた！'] },
];
function crankArm(g, v, a, o = {}) {
  const [kx, ky] = rp(a, v.ax, v.ay, v.r, v.r);
  g.line([v.ax, v.ay, kx, ky], C.ol, 30); g.line([v.ax, v.ay, kx, ky], o.c ?? C.steel, 18);
  g.circ(v.ax, v.ay, 22, o.hub ?? C.steel);
  g.circ(kx, ky, 26, o.knob ?? C.red);
  return [kx, ky];
}
function kakigori(g, s, v, L) {
  const V = g.V; g.sky('#5cc8ff', '#d4f3ff', 780);
  // 氷の旗
  g.line([150, 110, 150, 520], '#8a5a36', 10); g.rect(150, 120, 200, 230, '#ffffff', 6); utext(g, s, '氷', 250, 210, { size: 130, f: '#e8402f', font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); for (let i = 0; i < 3; i++) g.arc(185 + i * 66, 340, 33, Math.PI, 0, '#3a86ff', 8);
  g.band(760, 'bottom', '#c98b52', 7); g.planks(V.x0 - 20, 770, V.x1 - V.x0 + 40, 400, 4, '#d39457');
  // 機械
  g.rr(300, 140, 260, 140, 26, '#4cc9f0'); g.rr(330, 166, 200, 88, 14, '#dff6ff'); g.rr(360, 180, 140, 64, 10, '#bfefff', 4); g.hl(390, 196, 30, 8, 0, 0.8);
  g.rr(306, 270, 30, 450, 12, '#4cc9f0'); g.rr(524, 270, 30, 450, 12, '#4cc9f0'); g.rr(280, 720, 300, 46, 14, '#3a9fd0');
  g.rr(380, 280, 100, 30, 8, C.steel);
  // 落ちる氷
  for (let i = 0; i < 14; i++) { const q = ((s.t * 1.7 + i / 14) % 1), y = lerp(310, 600 - L * 50, q); g.circ(430 + Math.sin(i * 7.3) * 22, y, 7, '#ffffff', 0); }
  // 器と山
  const H = lerp(40, 230, clamp(L / 2)), syrup = s.k >= 2 ? E.outQ(clamp(s.age / 0.18)) : 0;
  g.ell(430, 690, 120, 24, 'rgba(255,255,255,0.6)', 5);
  g.blob([330, 680, 340, 680 - H * 0.5, 380, 680 - H * 0.9, 430, 680 - H, 480, 680 - H * 0.9, 520, 680 - H * 0.5, 530, 680], '#ffffff', 6, 0.9);
  if (syrup > 0) g.clipRR(320, 680 - H - 10, 220, H * 0.75 * syrup, 0, () => g.blob([330, 680, 340, 680 - H * 0.5, 380, 680 - H * 0.9, 430, 680 - H, 480, 680 - H * 0.9, 520, 680 - H * 0.5, 530, 680], '#ff3b5c', 6, 0.9));
  g.path('M330 690 L360 740 L500 740 L530 690 Z', 'rgba(220,240,255,0.9)');
  // 車輪
  g.circ(v.ax, v.ay, 90, '#ff9f1c'); for (let i = 0; i < 6; i++) { const b = s.ang + i * TAU / 6; g.line([v.ax, v.ay, v.ax + Math.cos(b) * 80, v.ay + Math.sin(b) * 80], '#e07b00', 8); } g.ring(v.ax, v.ay, 80, '#e07b00', 6);
}
function organ(g, s, v, L) {
  const V = g.V; g.bg('#ffd9ec', '#fff4d6');
  for (let i = 0; i < 9; i++) { const x = V.x0 + (V.x1 - V.x0) * i / 8; g.line([x, V.y0, 500, -300], 'rgba(255,255,255,0.5)', 30); }
  g.band(780, 'bottom', '#9bd1c5', 7);
  // 台車
  g.circ(320, 800, 50, '#5c6478'); g.circ(640, 800, 50, '#5c6478'); g.circ(320, 800, 18, C.metal, 4); g.circ(640, 800, 18, C.metal, 4);
  g.rr(220, 300, 520, 470, 30, '#c0392b'); g.rr(240, 320, 480, 430, 20, '#e8534a', 5);
  g.rr(280, 350, 400, 250, 16, '#3a2140');
  for (let i = 0; i < 7; i++) { const x = 310 + i * 54, h = 140 + Math.abs(3 - i) * -18 + 60; g.rr(x, 580 - h, 34, h, 12, s.k >= 1 && Math.sin(s.t * 14 + i) > 0 ? '#fff3b0' : C.metal); }
  g.rr(270, 630, 420, 90, 14, C.gold); for (let i = 0; i < 5; i++) g.circ(320 + i * 80, 675, 16, s.k >= 1 ? PEN3[(i + Math.floor(s.t * 6)) % 4] : '#d9a520', 4);
  // 上の小鳥の家
  g.rr(400, 170, 160, 140, 12, '#8a5a36'); g.tri(380, 180, 580, 180, 480, 90, '#e8402f');
  const out = s.k >= 1 ? E.outBack(clamp(s.age / 0.25)) : 0;
  g.circ(480, 240, 40, '#2b1f3d');
  if (out > 0) g.at(480, 240 - 10 * out, 0, out, out, () => { const fl = s.k >= 2 ? Math.sin(s.t * 30) * 0.5 : 0; g.at(0, 0, -0.5 - fl, () => g.ell(30, 0, 34, 14, C.yellow)); g.at(0, 0, 0.5 + fl, () => g.ell(-30, 0, 34, 14, C.yellow)); g.circ(0, 0, 34, C.yellow); g.tri(-12, 4, 12, 4, 0, 24, C.orange, 4); g.circ(-12, -8, 5, C.ol, 0); g.circ(12, -8, 5, C.ol, 0); });
  // 車輪
  g.circ(v.ax, v.ay, 70, '#ffd23f'); g.ring(v.ax, v.ay, 50, '#e0a800', 6);
}
const PEN3 = [C.magenta, C.sky, C.lime, C.yellow];
function gacha(g, s, v, L) {
  const V = g.V; g.bg('#e6e0ff'); g.dots(-40, -40, 1080, 920, 150, 9, '#d8d0fb'); g.band(860, 'bottom', '#b39ddb', 7);
  // ドーム
  g.circ(500, 300, 220, 'rgba(255,255,255,0.75)');
  g.clipCirc(500, 300, 214, () => { for (const c of s.my.caps) { const j = s.k ? jig(s.age, 10, 20, 6) : 0; g.at(c.x, c.y + j, c.a, () => { g.circ(0, 0, 40, '#ffffff', 5); g.path('M-40 0 A40 40 0 0 1 40 0 Z', c.c, 5); }); } });
  g.circ(500, 300, 220, null); g.hl(400, 190, 40, 20, -0.6, 0.8);
  g.rr(310, 480, 380, 380, 30, '#e8402f'); g.rr(330, 500, 340, 40, 12, '#ff7a6a', 0);
  g.rr(560, 520, 70, 40, 10, '#ffffff'); g.rect(574, 534, 42, 8, C.ol, 0);
  // 出口
  g.rr(350, 720, 120, 100, 20, '#2b2140');
  const a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = age2(s);
  const capsule = (x, y, c, open) => g.at(x, y, 0, () => { if (open > 0) { g.at(0, -40 * open, -0.6 * open, () => g.path('M-44 0 A44 44 0 0 1 44 0 Z', c, 5)); g.path('M-44 0 A44 44 0 0 0 44 0 Z', '#ffffff', 5); } else { g.circ(0, 0, 44, '#ffffff', 5); g.path('M-44 0 A44 44 0 0 1 44 0 Z', c, 5); } });
  if (a1 >= 0) { const q = E.outBounce(clamp(a1 / 0.35)); capsule(410, lerp(700, 790, q), C.blue, a2 >= 0 ? E.outBack(clamp(a2 / 0.15)) : 0); }
  if (a2 >= 0) { const q = E.outBack(clamp(a2 / 0.18)); g.at(410, 780 - 120 * q, Math.sin(s.t * 8) * 0.1, q, q, () => { g.star(0, 0, 50, 24, 5, C.gold); g.circ(-12, -4, 5, C.ol, 0); g.circ(12, -4, 5, C.ol, 0); g.arc(0, 6, 10, 0.3, Math.PI - 0.3, C.ol, 4); }); }
  // つまみ
  g.circ(v.ax, v.ay, 100, '#ffffff'); g.circ(v.ax, v.ay, 80, '#ffd23f', 5);
}
function well(g, s, v, L, both) {
  const V = g.V; g.sky('#8fd8ff', '#e3f6ff', 700); g.hills(620, '#7ccf6a', 60, 5, 4); g.band(660, 'bottom', '#8fd36f', 7); g.grassTufts(700, '#6cbf55', 4, 10);
  // 柱と屋根
  g.rr(270, 160, 36, 520, 10, '#8a5a36'); g.rr(694, 160, 36, 520, 10, '#8a5a36');
  g.poly([200, 190, 800, 190, 640, 70, 360, 70], '#c0392b'); g.rect(200, 180, 600, 24, '#7a2a20', 6);
  if (both) { g.rr(300, 262, 400, 76, 30, '#c98b52'); for (let x = 340; x < 680; x += 26) g.line([x, 266, x + 10, 334], '#a0673c', 6); g.rr(300, 262, 400, 76, 30, null); }
  else g.line([306, 300, 694, 300], '#7a4a2a', 18);
  // 井戸の口（奥）
  g.ell(500, 600, 230, 60, '#7d8597'); g.ell(500, 600, 196, 44, '#232035', 0);
  // つるべ（桶）
  const lift = L < 1 ? 0 : L - 1, by = s.k === 0 ? 720 : s.k === 1 ? lerp(720, 560, E.outQ(clamp(s.age / 0.5))) : lerp(560, 430, E.outBack(clamp(s.age / 0.25)));
  const bx = both ? 500 : 560;
  g.line([bx + 30, both ? 336 : 300, bx + 30, by - 60], '#d9b06c', 7);
  g.at(bx, by, 0, () => { g.path('M-60 -50 L60 -50 L48 50 L-48 50 Z', '#a0673c'); g.rect(-60, -50, 120, 14, '#7a4a2a', 5); g.rect(-54, 20, 108, 12, '#7a4a2a', 4); g.arc(0, -50, 56, Math.PI, 0, C.ol, 6); g.ell(0, -48, 52, 10, '#4cc9f0', 4); });
  if (s.k >= 2) { const q = E.outBack(clamp(s.age / 0.2)); g.at(bx - 20, by - 70 - 40 * q, 0, q, q, () => { g.ell(0, 10, 50, 34, '#5db352'); g.circ(-24, -18, 16, '#5db352'); g.circ(24, -18, 16, '#5db352'); g.circ(-24, -20, 8, '#ffffff', 3); g.circ(24, -20, 8, '#ffffff', 3); g.circ(-24, -19, 4, C.ol, 0); g.circ(24, -19, 4, C.ol, 0); g.arc(0, 4, 20, 0.3, Math.PI - 0.3, C.ol, 4); }); }
  // 井戸の手前のかべ
  g.path('M270 600 L270 820 Q500 870 730 820 L730 600 Q500 660 270 600 Z', '#a3abbd');
  for (const [x, y] of [[330, 660], [430, 690], [550, 690], [650, 660], [380, 760], [500, 780], [620, 760]]) g.rr(x - 40, y - 24, 80, 48, 12, '#b9c0cf', 4);
  g.path('M270 600 Q500 660 730 600', null, 7);
  // 滑車（正面）
  for (const x of both ? [v.both.ax, 1000 - v.both.ax] : [v.ax]) { g.circ(x, v.ay, both ? 58 : 70, '#c98b52'); g.ring(x, v.ay, both ? 40 : 50, '#8a5a36', 6); }
}
function dynamo(g, s, v, L, both) {
  const V = g.V, t = s.t, lit = s.k === 0 ? 0.15 + 0.12 * Math.abs(Math.sin(s.ang * 2)) : s.k === 1 ? 0.75 : 1;
  g.bg('#f3e3c6'); g.stripes(V.x0, V.y0, V.x1 - V.x0, 720 - V.y0, 80, '#f3e3c6', '#ecd8b6');
  g.rr(100, 140, 230, 230, 14, '#1d2160', 9); g.circ(270, 210, 34, '#fff3b0', 0); g.circ(286, 200, 30, '#1d2160', 0); g.line([215, 140, 215, 370], '#ffffff', 9); g.rr(100, 140, 230, 230, 14, null, 9);
  g.rr(700, 330, 220, 26, 6, '#a0673c'); for (const [x, h, c] of [[720, 90, C.red], [756, 110, C.blue], [796, 80, C.green], [830, 100, C.yellow]]) g.rr(x, 330 - h, 30, h, 4, c, 5); g.circ(880, 300, 30, '#5db352');
  g.band(720, 'bottom', '#c98b52', 7); g.planks(V.x0 - 20, 730, V.x1 - V.x0 + 40, 400, 4, '#d39457');
  // 2回目でかざりの電球も
  g.curve([V.x0 - 40, 70, 500, 140, V.x1 + 40, 70], C.ol, 4);
  const bulbs = []; for (let x = Math.ceil(V.x0 / 90) * 90, i = 0; x < V.x1; x += 90, i++) { const tt = (x - V.x0) / (V.x1 - V.x0); bulbs.push([x, 70 + 70 * 4 * tt * (1 - tt) + 18, i]); }
  // 暗さ
  const dark = s.k === 0 ? 0.62 : s.k === 1 ? lerp(0.62, 0.22, E.outQ(clamp(s.age / 0.15))) : lerp(0.22, 0, E.outQ(clamp(s.age / 0.15)));
  if (dark > 0.01) g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, V.y1 - V.y0 + 40, `rgba(12,10,40,${dark})`, 0);
  for (const [x, y, i] of bulbs) { if (s.k >= 2) g.glow(x, y, 40, PEN3[i % 4], 0.7); g.circ(x, y, 13, s.k >= 2 ? PEN3[i % 4] : '#8c86a8', 4); }
  // コードと大きな電球
  g.curve([500, 560, 470, 450, 520, 360, 500, 300], C.ol, 12); g.curve([500, 560, 470, 450, 520, 360, 500, 300], C.red, 6);
  g.glow(500, 230, 120 + 160 * lit, '#fff3a0', 0.25 + 0.6 * lit);
  g.rr(470, 280, 60, 40, 8, C.steel); g.circ(500, 220, 72, g.mix('#c9c4d6', '#fff6b0', lit)); g.line([480, 250, 490, 210, 510, 210, 520, 250], g.mix('#8c86a8', '#ff9f1c', lit), 5); g.hl(476, 196, 16, 10, -0.5, 0.7);
  // 発電機の箱
  const bw = both ? 300 : 260, x0 = 500 - bw / 2;
  g.rr(x0, 540, bw, 170, 26, '#ffd23f'); g.rr(x0 + 20, 560, bw - 40, 40, 10, '#ffe873', 0);
  g.path('M440 660 A60 60 0 0 1 560 660 Z', '#ffffff'); g.at(500, 660, -1.2 + 2.4 * clamp(lit), () => g.line([0, 0, 0, -50], C.red, 6)); g.circ(500, 660, 8, C.ol, 0); g.path('M440 660 A60 60 0 0 1 560 660 Z', null, 5);
  for (const x of both ? [v.both.ax, 1000 - v.both.ax] : [v.ax]) { g.line([x < 500 ? x0 : x0 + bw, v.ay, x, v.ay], C.steel, 18); g.circ(x, v.ay, 34, '#5c6478'); }
}
function reel(g, s, v, L) {
  const V = g.V; g.sky('#7cc8ff', '#e0f4ff', 380); g.cloud(220, 140, 0.7); g.sun(820, 110, 60);
  g.band(380, 'bottom', '#2f8fd8'); for (let i = 0; i < 10; i++) g.arc(((i * 277) % 1000) + Math.sin(s.t + i) * 20, 420 + (i * 61) % 360, 30, Math.PI + 0.4, -0.4, '#ffffff', 5);
  g.band(820, 'bottom', '#a0673c', 7); g.planks(V.x0 - 20, 830, V.x1 - V.x0 + 40, 400, 3, '#b7794a');
  const a2 = age2(s), jump = a2 < 0 ? 0 : E.outQ(clamp(a2 / 0.22));
  // 魚
  const fx = s.k === 0 ? 640 + Math.sin(s.t * 5) * 20 : lerp(640, 560, clamp(s.ph)), fy = s.k === 0 ? 470 : s.k === 1 ? lerp(470, 520, clamp(s.ph)) : lerp(520, 250, jump);
  const tip = [800, 120 + (s.k >= 1 ? 50 : 20) + Math.sin(s.t * 9) * 6 * (s.k === 1 ? 1 : 0)];
  if (s.k < 2) { g.alpha(0.45, () => g.ell(fx, fy + 20, 90, 30, '#174f7a', 0)); g.line([tip[0], tip[1], fx - 40, fy], '#ffffff', 4); g.circ(fx - 40, fy - 6, 14, C.red); g.rect(fx - 54, fy - 6, 28, 12, '#ffffff', 0); g.circ(fx - 40, fy - 6, 14, null, 4); }
  else {
    g.line([tip[0], tip[1], fx - 70, fy - 10], '#ffffff', 4);
    g.at(fx, fy, -0.5 + jump * 0.3, 1.2, 1.2, () => { g.tri(80, 0, 140, -40, 140, 40, '#ff7a59'); g.ell(0, 0, 100, 52, '#ff7a59'); g.ell(10, 16, 70, 24, '#ffd2bf', 0); g.circ(-56, -10, 14, '#ffffff', 4); g.circ(-58, -10, 7, C.ol, 0); g.tri(-10, -50, 40, -50, 20, -80, '#e8603e', 5); g.arc(-90, 10, 14, 0.4, 1.8, C.ol, 4); });
  }
  // つりざお（左下から）
  g.curve([160, 1300, 420, 760, 640, 360, tip[0], tip[1]], C.ol, 22); g.curve([160, 1300, 420, 760, 640, 360, tip[0], tip[1]], '#3a3f55', 12);
  g.rr(420, 640, 70, 120, 20, '#5c6478'); g.circ(v.ax, v.ay, 64, '#8f9bb0'); g.circ(v.ax, v.ay, 40, '#cfd6e2', 5);
}
const CRANK_DRAW = { kakigori, organ, gacha, well, reel, dynamo };

/* =========================================================================
   円をえがいてみがく・あらう（車・水晶玉・ぞう）— 両手なら左右で
   1回目で円の所がピカピカ、2回目で全部
   ========================================================================= */
const POLISH = [
  { k: 'car', name: '車をみがく', short: '車みがき', theme: 'town', sfx: 'squeak', modes: ['one', 'both'], c: [600, 470], r: 120, pop: ['キュッ', 'ピカーン'] },
  { k: 'crystal', name: '水晶玉をみがく', short: '水晶玉', theme: 'fantasy', sfx: 'squeak', modes: ['one', 'both'], c: [540, 420], r: 90, pop: ['キュッ', 'キラーン'] },
  { k: 'elephant', name: 'ぞうをあらう', short: 'ぞう', theme: 'animal', sfx: 'squish', modes: ['one', 'both'], c: [600, 500], r: 110, pop: ['ゴシゴシ', 'パオーン'] },
];
function holes(g, hs, fn) { const c = g.ctx; c.save(); c.beginPath(); c.rect(-3000, -3000, 7000, 7000); for (const [x, y, r] of hs) if (r > 1) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } c.clip('evenodd'); fn(); c.restore(); }
const CAR = [140, 700, 150, 560, 230, 500, 340, 470, 400, 340, 470, 300, 660, 300, 740, 360, 790, 470, 860, 500, 880, 600, 870, 700];
function carBody(g, s, shine) {
  const V = g.V; g.sky('#8fd8ff', '#e8f7ff', 640); g.cloud(200, 140, 0.7);
  for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) g.circ(x + 60, 640, 80, '#4caf50', 0);
  g.band(640, 'bottom', '#b7bfcd', 7); g.band(800, 'bottom', '#a3abbd');
  g.shadow(510, 800, 380, 30, 0.3);
  g.blob(CAR, '#e8434f', 7, 0.6);
  g.poly([420, 350, 480, 320, 560, 320, 560, 460, 380, 460], '#bfe6ff', 6); g.poly([590, 320, 650, 320, 715, 370, 750, 460, 590, 460], '#bfe6ff', 6);
  g.line([440, 450, 520, 340], 'rgba(255,255,255,0.8)', 10); g.line([620, 450, 680, 360], 'rgba(255,255,255,0.8)', 10);
  g.line([575, 470, 575, 690], 'rgba(60,20,40,0.35)', 5); g.rr(500, 520, 50, 14, 6, '#ffffff', 4);
  g.ell(860, 560, 22, 30, s.k >= 2 && Math.sin(s.t * 20) > 0 ? '#fffbe0' : C.yellow, 5); g.rr(140, 560, 26, 40, 8, C.red, 5);
  if (shine) for (const [x0, y0, x1, y1] of [[200, 640, 300, 520], [640, 680, 760, 540], [330, 680, 400, 600]]) g.line([x0, y0, x1, y1], 'rgba(255,255,255,0.75)', 14);
  for (const x of [290, 720]) { g.circ(x, 710, 82, '#2b2140'); g.circ(x, 710, 44, C.metal, 6); g.circ(x, 710, 14, '#5c6478', 0); }
}
function carHaze(g, s) { g.blob(CAR, 'rgba(150,135,120,0.62)', 0, 0.6); for (const [x, y, r] of s.my.spots) g.circ(x, y, r, 'rgba(120,100,80,0.35)', 0); }
function crystalBody(g, s, shine) {
  const V = g.V; g.bg('#2a1650', '#4a1f6e');
  for (let i = 0; i < 18; i++) g.star(V.x0 + ((i * 263) % (V.x1 - V.x0)), V.y0 + ((i * 157) % (V.y1 - V.y0)), 10, 4, 5, 'rgba(255,214,90,0.35)', 0);
  g.ell(500, 840, 520, 160, '#7d3fb0'); g.ell(500, 790, 470, 110, '#9b5fd0', 0); for (let i = 0; i < 9; i++) g.tri(80 + i * 105, 860, 130 + i * 105, 860, 105 + i * 105, 920, C.gold, 4);
  g.path('M360 720 L640 720 L600 640 L400 640 Z', C.gold);
  const glow = s.k >= 2 ? 1 : s.k === 1 ? 0.5 : 0;
  if (glow) g.glow(500, 420, 330, '#e7c4ff', 0.5 * glow + 0.15 * Math.sin(s.t * 6));
  g.circ(500, 420, 220, g.rad(440, 360, 20, 240, [[0, '#f3e6ff'], [0.6, '#b98cf0'], [1, '#6a3ab0']]));
  if (s.k >= 2) g.clipCirc(500, 420, 214, () => { const q = E.outBack(clamp(s.age / 0.2)); g.at(500, 440, 0, q, q, () => { for (let i = 0; i < 6; i++) g.arc(0, 90, 150 - i * 18, Math.PI, 0, RB6[i], 18); g.star(60, -80, 46, 20, 5, C.yellow); g.line([60, -80, 160, -150], '#fff6c8', 8); }); });
  if (shine) g.hl(420, 330, 50, 26, -0.6, 0.85);
  g.circ(500, 420, 220, null);
}
const RB6 = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple];
function crystalHaze(g, s) { g.clipCirc(500, 420, 214, () => { g.circ(500, 420, 220, 'rgba(210,205,225,0.92)', 0); for (const [x, y, r] of s.my.spots) g.circ(lerp(380, 620, (x - 150) / 700), lerp(300, 540, (y - 300) / 400), r * 0.8, 'rgba(255,255,255,0.55)', 0); }); }
function eleBody(g, s, shine) {
  const V = g.V; g.sky('#ffd27a', '#fff1c9', 700); g.sun(830, 140, 70);
  g.band(700, 'bottom', '#d9b36a', 7); g.ell(150, 860, 260, 60, '#4cc9f0');
  const sp = s.k >= 2 ? E.outQ(clamp(s.age / 0.2)) : 0;
  g.at(0, 0, () => {
    g.cap(820, 430, 900, 560, 10, '#8d95ab');
    for (const x of [360, 470, 620, 730]) g.rr(x - 50, 560, 100, 230, 30, '#a3abc2');
    g.ell(560, 480, 300, 190, '#a3abc2');
    // 鼻（2回目で上げて水をふく）
    const tr = sp > 0 ? [[230, 470], [150, 420], [120, 300], [160, 210]] : [[230, 470], [190, 600], [200, 720], [250, 760]];
    g.curve(tr.flat(), C.ol, 66); g.curve(tr.flat(), '#a3abc2', 52);
    g.circ(290, 400, 150, '#a3abc2');
    g.ell(380, 410, 110, 140, '#b8bfd2', 6, -0.15);
    g.circ(250, 360, 14, C.ol, 0); g.circ(245, 355, 4, '#ffffff', 0);
    g.ell(200, 410, 18, 10, 'rgba(255,120,150,0.5)', 0);
    if (shine) for (const [x, y] of [[520, 380], [650, 420], [470, 520]]) g.hl(x, y, 40, 14, -0.3, 0.5);
  });
}
function eleHaze(g, s) { for (const [x, y, r] of s.my.spots) g.ell(x, y, r * 1.3, r, 'rgba(130,95,60,0.78)', 0); }
const PB = { car: [carBody, carHaze], crystal: [crystalBody, crystalHaze], elephant: [eleBody, eleHaze] };

/* =========================================================================
   くるくる大きくする（わたあめ・ソフトクリーム）
   ========================================================================= */
const SWIRL = [
  { k: 'cotton', name: 'わたあめを作る', short: 'わたあめ', theme: 'festival', sfx: 'swish', pop: ['フワッ', 'ふわふわ'], modes: ['one', 'both'] },
  { k: 'cream', name: 'ソフトクリーム', short: 'ソフト', theme: 'party', sfx: 'swish', pop: ['ニュル', 'できた！'], modes: ['one', 'both'] },
];
function cottonScene(g, s, v, L) {
  const V = g.V; g.bg('#1d1446', '#4b1f5e');
  g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 140 - V.y0, '#e8402f', 0); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) { g.rect(x, V.y0 - 20, 60, 140 - V.y0, '#ffffff', 0); g.circ(x + 30, 140, 30, '#ffffff', 0); g.circ(x + 90, 140, 30, '#e8402f', 0); }
  for (const x of [120, 880]) { g.glow(x, 300, 110, '#ff9b6b', 0.4); g.ell(x, 300, 50, 64, '#ff5a3c'); }
  // 機械
  g.path('M140 700 L190 900 L810 900 L860 700 Z', C.metal); g.rect(140, 880, 720, 400, '#8f9bb0', 6);
  g.ell(500, 700, 360, 110, '#cfd6e2'); g.ell(500, 712, 320, 88, '#f4f8ff', 0);
  g.rr(470, 640, 60, 70, 12, C.steel);
  for (let i = 0; i < 8; i++) { const a = s.t * 9 + i * TAU / 8; g.curve([500, 660, 500 + Math.cos(a) * 140, 680 + Math.sin(a) * 30, 500 + Math.cos(a + 0.6) * 280, 700 + Math.sin(a + 0.6) * 70], 'rgba(255,150,200,0.55)', 4); }
}
function cottonBall(g, x, y, R, t) {
  g.at(x, y, 0, () => { for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + t * 0.4; g.circ(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.5, R * 0.55, i % 2 ? '#ffb3d6' : '#ffc6e2', 5); } g.circ(0, 0, R * 0.62, '#ffc6e2', 0); g.hl(-R * 0.3, -R * 0.35, R * 0.25, R * 0.12, -0.4, 0.7); });
}
function creamScene(g, s, v, L) {
  const V = g.V; g.bg('#d6f5ec'); g.stripes(V.x0, V.y0, V.x1 - V.x0, V.y1 - V.y0, 70, '#d6f5ec', '#c6efe2');
  g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, 140 - V.y0, '#ff9fbd', 0); for (let x = Math.floor(V.x0 / 80) * 80; x < V.x1; x += 80) g.circ(x + 40, 140, 40, '#ff9fbd', 0);
  g.band(880, 'bottom', '#c9a3ff', 7);
  g.rr(300, -200, 400, 400, 30, C.metal); g.rr(340, 40, 320, 120, 16, '#e9eef6'); utext(g, s, 'ソフト', 500, 100, { size: 56, f: '#ff6b8b', font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
  g.rr(640, 120, 30, 120, 12, C.steel); g.circ(655, 120, 22, C.red);
  g.path('M450 200 L550 200 L530 270 L470 270 Z', C.steel);
}

/* =========================================================================
   ピザ生地を回す（両手なら両方のこぶしで）
   ========================================================================= */
const PIZZA = [{ k: 'pizza', name: 'ピザ生地を回す', short: 'ピザ', theme: 'kitchen', sfx: 'swoosh', pop: ['ポン', 'できた！'], modes: ['both', 'one'] }];
function pizzaBg(g, s) {
  const V = g.V; g.bg('#f6d3a8'); g.tiles(V.x0 - 50, V.y0, V.x1 - V.x0 + 100, 700 - V.y0, 110, '#f6d3a8', '#efc493');
  g.rr(660, 130, 300, 330, 60, '#b5523b'); for (let y = 170; y < 450; y += 50) g.line([660, y, 960, y], '#93412e', 4);
  g.path('M700 460 L700 350 Q810 250 920 350 L920 460 Z', '#2b1f2a');
  for (let i = 0; i < 4; i++) { const x = 740 + i * 46, h = 70 + 20 * Math.sin(s.t * 12 + i * 2); g.at(x, 460, 0, 26, h, () => g.path(FLAME, i % 2 ? C.orange : C.yellow, 0)); }
  g.band(700, 'bottom', '#efe1c8', 7); for (let i = 0; i < 16; i++) g.circ(((i * 173) % 1000), 740 + (i * 61) % 200, 8, '#ffffff', 0);
  g.ell(160, 760, 90, 30, '#ffffff'); g.circ(160, 740, 50, '#e8402f'); g.ell(160, 720, 14, 8, C.leaf, 0);
}
function dough(g, x, y, R, rot, top) {
  g.ell(x, y + 12, R, R * 0.42, '#e3c38e');
  g.ell(x, y, R, R * 0.42, '#f6e3b8');
  g.ell(x, y, R * 0.84, R * 0.34, '#fbeccb', 0);
  if (top > 0) g.at(x, y, 0, top, top, () => {
    g.ell(0, 0, R * 0.8, R * 0.33, '#e8402f', 0);
    for (let i = 0; i < 7; i++) { const a = rot + i * 0.9, r = R * (0.25 + (i % 3) * 0.18); g.ell(Math.cos(a) * r, Math.sin(a) * r * 0.41, 22, 10, '#ffe17a', 0); }
    for (let i = 0; i < 5; i++) { const a = rot + i * 1.26 + 0.4, r = R * 0.48; g.ell(Math.cos(a) * r, Math.sin(a) * r * 0.41, 26, 11, '#b8263a', 4); }
    for (let i = 0; i < 3; i++) { const a = rot + i * 2.1 + 1, r = R * 0.3; g.ell(Math.cos(a) * r, Math.sin(a) * r * 0.41, 16, 8, C.leaf, 3, a); }
  });
  for (let i = 0; i < 6; i++) { const a = rot + i * 1.05, r = R * 0.6; g.ell(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.41, 12, 5, 'rgba(255,255,255,0.75)', 0); }
  g.ell(x, y, R, R * 0.42, null, 6);
}

export default [
  {
    id: 'stir-pot', acts: ['stir'], vars: POT, modes: ['one'], sfx: (k, v) => v.sfx,
    draw(g, s, v) {
      const both = s.mode === 'both', L = lv(s);
      const inner = () => {
        potBg(g, s, v); potBody(g, s, v);
        const E = rp(s.ang, PC.x, PC.y + 18, 200, 62);
        potSurface(g, s, v, L, E);
        if (v.k === 'curry' && s.k >= 1) steam(g, 500, 560, s.t, 3, '#ffffff', 0.45 + 0.2 * (s.k - 1));
        if (v.k === 'cauldron') steam(g, 500, 560, s.t, 3, v.cols[Math.min(2, s.k)], 0.5);
        potTool(g, s, v, E, both);
      };
      both ? inner() : g.mirror(s.side, inner);
    },
    hit(g, s, k, v) {
      const both = s.mode === 'both', X = both ? 500 : g.mx(s.lastSide, 500), E = [X, PC.y + 18 - 62];
      g.fx.burst(E[0], E[1], { n: 10, c: [v.cols[Math.min(k, 2)], sh(v.cols[Math.min(k, 2)], 0.3)], shape: 'drop', sp: [200, 500], size: [10, 18], g: 1500, spread: 1.6 });
      g.fx.ring(500, PC.y + 18, { r0: 40, r1: 300, sy: 0.32, w: 12 });
      g.fx.pop(v.pop[k - 1], both ? 500 : g.mx(s.lastSide, 300), 330, { size: k === 2 ? 110 : 100, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 8 : 5, 0.12);
      if (k === 1 && v.k === 'curry') g.fx.smoke(g.mx(s.lastSide, 560), 600, 5, '#d9a56a');
      if (k === 2) {
        if (v.k === 'cauldron') { g.fx.burst(500, 480, { n: 16, c: ['#ffffff', C.violet, C.pink], shape: 'star', sp: [300, 700], size: [16, 28], g: 300 }); g.fx.smoke(500, 470, 8, '#d6b8ff'); g.sfx('magic'); }
        else { g.fx.hearts(500, 440, 6); g.fx.stars(500, 500, 6); g.sfx('chime'); }
      }
    },
  },
  {
    id: 'stir-bowl', acts: ['stir'], vars: BOWL, modes: ['one'], sfx: (k, v) => v.sfx,
    draw(g, s, v) {
      const L = lv(s), a = s.ang;
      if (s.mode === 'both' && v.k === 'meringue') {
        // ボウル2つ（左は鏡うつし）
        bowlBg(g, s, v);
        for (const sd of ['L', 'R']) {
          const sg = sd === 'L' ? -1 : 1, tx = 500 + sg * 228, ty = 236, sc = 0.64, W = ([x, y]) => [tx + sg * sc * (x - 500), ty + sc * y];
          const El = rp(a, BC.x, BC.y + 14, 170, 52);
          g.at(tx, ty, 0, sg * sc, sc, () => g.at(-500, 0, () => { bowlVessel(g, s, v); bowlContent(g, s, v, L, El); }));
          const Ew = W(El), Hw = W([El[0] + 150 + 40 * Math.sin(a), El[1] - 250 - 60 * Math.cos(a)]), ux = Ew[0] - Hw[0], uy = Ew[1] - Hw[1], d = Math.hypot(ux, uy);
          g.at(Hw[0], Hw[1], Math.atan2(ux, -uy), d / 330, d / 330, () => g.whisk(0, 0, 0, 1));
          hold(g, Ew, Hw, { side: sd, s: 0.8 });
        }
        return;
      }
      if (s.mode === 'both') {
        // パレットに筆2本（青と黄）
        bowlScene(g, s, v, L);
        const ER = rp(a, 590, 650, 110, 55), HR = [ER[0] + 150 + 40 * Math.sin(a), ER[1] - 240 - 50 * Math.cos(a)];
        bowlContent(g, s, v, L, ER);
        for (const sd of ['L', 'R']) { const m = p => sd === 'L' ? [1000 - p[0], p[1]] : p; paintBrush(g, s, m(ER), m(HR), sd); }
        return;
      }
      g.mirror(s.side, () => {
        bowlScene(g, s, v, L);
        const E = v.k === 'paint' ? rp(s.ang, 500, 650, 150, 70) : rp(s.ang, BC.x, BC.y + 14, 170, 52);
        bowlContent(g, s, v, L, E);
        bowlTool(g, s, v, E);
      });
    },
    hit(g, s, k, v) {
      const x = g.mx(s.lastSide, 500), y = v.k === 'paint' ? 580 : 560;
      if (v.k === 'meringue') g.fx.burst(x, y, { n: 12, c: ['#ffffff', '#f3f6ff'], shape: 'dot', sp: [200, 500], size: [10, 20], g: 1000 });
      else if (v.k === 'natto') g.fx.burst(x, y, { n: 8, c: ['#b07a36', '#c08844'], shape: 'dot', sp: [200, 450], size: [12, 18], g: 1400 });
      else g.fx.burst(x, y, { n: 10, c: k === 2 ? [C.green, C.lime] : [C.blue, C.yellow], shape: 'drop', sp: [200, 500], size: [10, 18], g: 1400 });
      g.fx.pop(v.pop[k - 1], g.mx(s.lastSide, 290), 300, { size: k === 2 ? 110 : 100, c: k === 2 ? C.yellow : '#ffffff' });
      g.fx.shake(k === 2 ? 7 : 4, 0.12);
      if (k === 2) { g.fx.stars(x, 420, 8); g.sfx('chime'); if (v.k === 'paint') g.fx.burst(x, 560, { n: 14, c: [C.leaf, C.lime, C.green], shape: 'leaf', sp: [200, 600], size: [16, 26], g: 300 }); }
    },
  },
  {
    id: 'stir-crank', acts: ['stir'], vars: CRANK, modes: ['one'], sfx: (k, v) => v.sfx,
    init(s, v) { if (v.k === 'gacha') { const cs = [C.red, C.blue, C.yellow, C.green, C.pink, C.purple, C.orange, C.teal]; s.my.caps = []; for (let i = 0; i < 12; i++) s.my.caps.push({ x: 360 + (i % 4) * 92 + (Math.floor(i / 4) % 2) * 40, y: 400 - Math.floor(i / 4) * 80, a: s.r() * TAU, c: cs[i % cs.length] }); } },
    draw(g, s, v) {
      const L = lv(s, 0.4), st = v.k === 'gacha' ? { c: '#ffffff', hub: '#ffd23f', knob: '#ff7aa8' } : v.k === 'well' ? { c: '#8a5a36', hub: '#7a4a2a', knob: '#d39457' } : {}, sleeve = v.k === 'reel' ? C.orange : undefined;
      if (s.mode === 'both') {
        // 両側のハンドルを左右の手で（左は鏡うつしに回る）
        CRANK_DRAW[v.k](g, s, v, L, true);
        const B = v.both, KR = crankArm(g, B, s.ang, st), KL = crankArm(g, { ax: 1000 - B.ax, ay: B.ay, r: B.r }, -s.ang, st);
        armTo(g, KL[0] - 6, KL[1] + 10, { side: 'L', ax: 70, sleeve }); armTo(g, KR[0] + 6, KR[1] + 10, { sleeve });
        return;
      }
      g.mirror(s.side, () => {
        CRANK_DRAW[v.k](g, s, v, L, false);
        const K = crankArm(g, v, s.ang, st);
        armTo(g, K[0] + 6, K[1] + 10, { sleeve });
      });
    },
    hit(g, s, k, v) {
      const big = k === 2, both = s.mode === 'both', mx = x => both && (v.k === 'well' || v.k === 'dynamo') ? 500 : g.mx(s.lastSide, x);
      if (both) for (const x of [v.both.ax, 1000 - v.both.ax]) g.fx.lines(x, v.both.ay - v.both.r, { n: 8, r0: 50, r1: 110, w: 8 });
      else g.fx.lines(g.mx(s.lastSide, v.ax), v.ay - v.r, { n: 8, r0: 50, r1: 110, w: 8 });
      g.fx.pop(v.pop[k - 1], v.k === 'dynamo' ? 760 : mx(v.k === 'reel' ? 300 : v.k === 'gacha' ? 810 : v.k === 'organ' ? 240 : 760), v.k === 'kakigori' ? 470 : v.k === 'gacha' ? 150 : 200, { size: big ? 110 : 96, c: big ? C.yellow : '#ffffff' });
      g.fx.shake(big ? 8 : 4, 0.12);
      if (v.k === 'kakigori') { g.fx.burst(mx(430), 560, { n: 10, c: ['#ffffff', '#dff6ff'], shape: 'snow', sp: [150, 400], size: [10, 18], g: 600 }); if (big) { g.fx.stars(mx(430), 500, 8); g.sfx('chime'); } }
      else if (v.k === 'organ') { g.fx.notes(mx(480), 300, big ? 8 : 4); if (big) { g.fx.confetti(60); g.sfx('chime'); } }
      else if (v.k === 'gacha') { if (big) { g.fx.stars(mx(410), 700, 10); g.sfx('ding'); } else g.sfx('pop'); }
      else if (v.k === 'well') { if (big) { g.fx.splash(mx(560), 400, C.water, 14); g.sfx('splash'); } else g.fx.splash(mx(560), 580, C.water, 8); }
      else if (v.k === 'dynamo') { g.fx.sparks(500, 230, big ? 16 : 10); g.fx.flash('#fff6c2', big ? 0.55 : 0.35, 0.15); if (big) { g.fx.stars(500, 300, 10); g.sfx('magic'); } }
      else { g.fx.splash(mx(560), big ? 380 : 500, '#7fd6ff', big ? 18 : 10); if (big) { g.fx.stars(mx(560), 250, 9); g.sfx('splash'); } }
    },
  },
  {
    id: 'stir-polish', acts: ['stir'], vars: POLISH, modes: ['one'], sfx: (k, v) => v.sfx,
    init(s, v) { s.my.spots = Array.from({ length: 9 }, (_, i) => [lerp(200, 820, s.r()), lerp(330, 680, s.r()), 40 + s.r() * 50]); },
    draw(g, s, v) {
      const both = s.mode === 'both', [Body, Haze] = PB[v.k];
      const inner = () => {
        const cx = both ? (v.k === 'crystal' ? 615 : 640) : v.c[0], cy = v.c[1];
        const q1 = s.k === 0 ? clamp((s.ph + 0.55) / 0.55) : 1, all = s.k === 0 ? 0 : s.k === 1 ? clamp(s.ph) * 0.35 : 0.35 + 0.65 * E.outQ(clamp(s.age / 0.2));
        const r = (v.r + 70) * Math.sqrt(q1) + all * 600, hs = [[cx, cy, r]]; if (both) hs.push([1000 - cx, cy, r]);
        Body(g, s, s.k >= 1);
        if (all < 1) g.alpha(1 - all * 0.6, () => holes(g, hs, () => Haze(g, s)));
        // 泡・つや
        if (v.k === 'elephant') for (const [x, y] of hs.map(h => [h[0], h[1]])) for (let i = 0; i < 6; i++) { const a = i * 1.1 + s.t; g.circ(x + Math.cos(a) * (v.r + 30), y + Math.sin(a) * (v.r + 10), 16 + (i % 3) * 6, 'rgba(255,255,255,0.9)', 4); }
        if (s.k >= 1) for (const [x, y] of hs.map(h => [h[0], h[1]])) for (let i = 0; i < 3; i++) { const t = s.t * 5 + i * 2.1, k = 0.6 + 0.4 * Math.sin(t); g.star(x - 60 + i * 60, y - 50 + (i % 2) * 70, 24 * k, 5 * k, 4, '#ffffff', 0); }
        // 手（パッド/スポンジ/布）
        const pads = both ? [['R', cx], ['L', 1000 - cx]] : [['R', cx]];
        for (const [sd, x0] of pads) {
          const a = sd === 'L' ? -s.ang : s.ang, [px, py] = rp(a, x0, cy, v.r, v.r * 0.8);
          if (v.k === 'car') { g.circ(px, py, 70, '#ffd23f'); g.circ(px, py, 52, '#ffe873', 0); }
          else if (v.k === 'elephant') g.at(px, py, 0.2, () => { g.rr(-80, -60, 160, 120, 30, '#ffd23f'); g.rr(-80, -60, 160, 40, 20, '#3cc46b'); });
          else g.rag(px, py, a * 0.2, 0.95, '#fff6c8');
          g.arm(px + (sd === 'L' ? -10 : 10), py + 30, Math.atan2(py - 1320, px - (sd === 'L' ? 70 : 930)), { hand: 'palm', side: sd, sleeve: v.k === 'elephant' ? C.green : undefined });
        }
      };
      both ? inner() : g.mirror(s.side, inner);
    },
    hit(g, s, k, v) {
      const big = k === 2, both = s.mode === 'both', x = both ? 500 : g.mx(s.lastSide, v.c[0]), y = v.c[1] - v.r * 0.8;
      g.fx.sparks(x, y, 10); g.fx.pop(v.pop[k - 1], both ? 500 : g.mx(s.lastSide, 300), 200, { size: big ? 110 : 100, c: big ? C.yellow : '#ffffff' });
      g.fx.shake(big ? 8 : 4, 0.12);
      if (big) {
        g.fx.stars(500, 450, 12);
        if (v.k === 'car') g.sfx('honk'); else if (v.k === 'crystal') g.sfx('magic');
        else { g.sfx('splash'); g.fx.burst(both ? 160 : g.mx(s.lastSide, 160), 200, { n: 24, c: [C.water, '#bff3ff'], shape: 'drop', sp: [400, 900], size: [12, 22], g: 1400, dir: -Math.PI / 2, spread: 1.2 }); }
      } else if (v.k === 'elephant') g.fx.burst(x, y, { n: 10, c: '#ffffff', shape: 'dot', sp: [100, 300], size: [14, 26], g: -100, drag: 0.95 });
    },
  },
  {
    id: 'stir-swirl', acts: ['stir'], vars: SWIRL, modes: ['one'], sfx: (k, v) => v.sfx,
    draw(g, s, v) {
      const L = lv(s, 0.35, E.outBack), both = s.mode === 'both';
      const inner = () => {
        if (v.k === 'cotton') {
          cottonScene(g, s, v, L);
          const Ep = rp(s.ang, 500, 560, 170, 60), H = [Ep[0] + 230, Ep[1] + 290];
          g.cap(H[0], H[1], Ep[0], Ep[1], 9, '#f6e9cf');
          cottonBall(g, Ep[0], Ep[1] - 10, 60 + 65 * L, s.t);
          g.arm(H[0], H[1], Math.atan2(Ep[1] - H[1], Ep[0] - H[0]), { hand: 'grip', s: 0.95 });
          if (both) { const Lh = toward(H, Ep, 0.3); g.arm(Lh[0], Lh[1], Math.atan2(Lh[1] - 1320, Lh[0] - 40), { hand: 'grip', side: 'L', s: 0.95 }); }
        } else {
          creamScene(g, s, v, L);
          const Cc = rp(s.ang, 500, 600, 90, 30), n = 1 + Math.min(3, Math.floor(L * 1.5 + 0.0001)), done = s.k >= 2, q = done ? E.outBack(clamp(s.age / 0.2)) : 0, S = 1.3;
          const top = Cc[1] - (20 + n * 44 + q * 40) * S;
          // ソフトの流れ
          if (!done) { g.curve([500, 268, 500, 300, (500 + Cc[0]) / 2, (300 + top) / 2, Cc[0] + 20, top + 10], C.ol, 36); g.curve([500, 268, 500, 300, (500 + Cc[0]) / 2, (300 + top) / 2, Cc[0] + 20, top + 10], '#fff8ea', 24); }
          // コーン
          g.at(Cc[0], Cc[1], 0, S, S, () => {
            g.path('M-90 0 L90 0 L0 250 Z', '#e8b06a'); g.clipPath('M-90 0 L90 0 L0 250 Z', () => { for (let i = -4; i <= 4; i++) { g.line([i * 40 - 60, 0, i * 40 + 60, 250], '#c98b52', 4); g.line([i * 40 + 60, 0, i * 40 - 60, 250], '#c98b52', 4); } });
            g.path('M-90 0 L90 0 L0 250 Z', null);
            for (let i = 0; i < n; i++) { const w = 96 - i * 16, y = -24 - i * 44; g.rr(-w, y - 26, w * 2, 52, 26, '#fff8ea'); g.curve([-w + 16, y + 6, 0, y + 18, w - 16, y + 6], '#efe2c8', 5); }
            if (done) g.at(0, -24 - n * 44 + 10, 0, q, q, () => { g.path('M-40 0 Q-30 -60 10 -90 Q0 -40 40 0 Z', '#fff8ea'); g.hl(-12, -36, 8, 18, -0.3, 0.8); });
            g.hl(-50, -40, 16, 10, -0.4, 0.7);
          });
          if (both) { const yl = Cc[1] + 215, yr = Cc[1] + 230; g.arm(Cc[0] - 48, yl, Math.atan2(yl - 1320, Cc[0] - 48 - 60), { hand: 'grip', side: 'L' }); g.arm(Cc[0] + 48, yr, Math.atan2(yr - 1320, Cc[0] + 48 - 940), { hand: 'grip', side: 'R' }); }
          else g.arm(Cc[0] + 16, Cc[1] + 230, -Math.PI / 2 - 0.35, { hand: 'grip', s: 1 });
        }
      };
      both ? inner() : g.mirror(s.side, inner);
    },
    hit(g, s, k, v) {
      const big = k === 2, x = g.mx(s.lastSide, 500), y = v.k === 'cotton' ? 420 : 380;
      g.fx.burst(x, y, { n: 10, c: v.k === 'cotton' ? ['#ffb3d6', '#ffffff'] : ['#fff8ea', '#ffffff'], shape: 'dot', sp: [150, 400], size: [10, 20], g: 300 });
      g.fx.pop(v.pop[k - 1], g.mx(s.lastSide, 250), 250, { size: big ? 110 : 100, c: big ? C.yellow : '#ffffff' });
      g.fx.shake(big ? 7 : 4, 0.12);
      if (big) { g.fx.stars(x, y, 10); g.sfx('chime'); }
    },
  },
  {
    id: 'stir-pizza', acts: ['stir'], vars: PIZZA, modes: ['both', 'one'], sfx: 'swoosh',
    draw(g, s, v) {
      const both = s.mode === 'both', L = lv(s, 0.3, E.outBack), a = s.ang;
      const inner = () => {
        pizzaBg(g, s);
        const D = rp(a, 500, 340, 80, 30), toss = s.k ? Math.max(0, jig(s.age, 70, 9, 5)) : 0, y = D[1] - toss;
        const R = 120 + 70 * L, top = s.k >= 2 ? E.outBack(clamp(s.age / 0.2)) : 0;
        // こぶしの上に生地
        if (both) { for (const sd of ['L', 'R']) { const sg = sd === 'L' ? -1 : 1, hx = D[0] + sg * 95, hy = y + 70; g.arm(hx, hy, Math.atan2(hy - 1320, hx - (500 + sg * 430)), { hand: 'fist', side: sd }); } }
        else { const hx = D[0] + 10, hy = y + 74; g.arm(hx, hy, Math.atan2(hy - 1320, hx - 900), { hand: 'fist' }); }
        dough(g, D[0], y, R, a * 1.6, top);
      };
      both ? inner() : g.mirror(s.side, inner);
    },
    hit(g, s, k, v) {
      const big = k === 2, x = s.mode === 'both' ? 500 : g.mx(s.lastSide, 500);
      g.fx.smoke(x, 300, 6, '#ffffff'); g.fx.lines(x, 280, { n: 8, r0: 160, r1: 260, w: 8, a0: Math.PI, arc: Math.PI });
      g.fx.pop(v.pop[k - 1], s.mode === 'both' ? 500 : g.mx(s.lastSide, 260), 110, { size: big ? 110 : 100, c: big ? C.yellow : '#ffffff' });
      g.fx.shake(big ? 8 : 4, 0.12);
      if (big) { g.fx.stars(x, 320, 10); g.sfx('ding'); }
    },
  },
];
