/* 投げる（片手・交互） — 雪玉・豆まき・ダーツ・ボウリング など
   p=0 が手をはなす瞬間（腕が前）、p=1 がうしろに引いたところ。
   投げた物は hit() で記録（s.my.fl）し、draw() で飛ばして、着いた瞬間に1回だけ当たりの演出をします。
   背景や的は反転させず、腕と投げ始めの位置だけを左右反転します（交互モード・文字が読めるように）。 */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const PI = Math.PI, TAU = PI * 2;

/* =========================================================================
   共通：腕・飛ぶ物
   ========================================================================= */
// 飛ぶ時間（秒）：場面は2回目のあと 0.45 回分で終わるので、2回目は少し速めにして、着いたあとのごほうびを見せる時間を残す
const flyT = (s, k, m = 1) => m * (k === 1 ? clamp(0.3 * s.spr, 0.24, 0.42) : clamp(0.22 * s.spr, 0.18, 0.3));

// 投げ方ごとの右手の動き：[p=0 手をはなす（前）, p=1 うしろに引く]。lift は途中のふくらみ（上へ）
const POSE = {
  over: { x: [700, 875], y: [660, 940], a: [-PI / 2 - 0.55, -PI / 2 + 0.12], s: [0.9, 1.2], lift: 80 },
  under: { x: [650, 860], y: [800, 1000], a: [-PI / 2 - 0.32, -PI / 2 + 0.45], s: [0.92, 1.15], lift: -30 },
  side: { x: [660, 930], y: [730, 830], a: [-PI / 2 - 0.8, -PI / 2 + 0.55], s: [0.92, 1.15], lift: 40 },
  push: { x: [680, 820], y: [640, 880], a: [-PI / 2 - 0.5, -PI / 2 - 0.12], s: [0.88, 1.12], lift: 10 },
};
function pose(st, p) {
  const P = POSE[st] || POSE.over, e = clamp(p);
  return { x: lerp(P.x[0], P.x[1], e), y: lerp(P.y[0], P.y[1], e) - P.lift * Math.sin(PI * e), a: lerp(P.a[0], P.a[1], e), s: lerp(P.s[0], P.s[1], e) };
}
const holdOf = (q, d) => [q.x + Math.cos(q.a) * d * q.s, q.y + Math.sin(q.a) * d * q.s];
// 手をはなす位置（ステージ座標。左手なら反転）
function relPt(o, side) { const [x, y] = holdOf(pose(o.st, 0), o.d ?? 80); return [side === 'L' ? 1000 - x : x, y]; }

// 腕（片手 / 交互）。o: { st 投げ方, d 手から持つ物まで, sleeve, hold 持つ手, emp 空の手 }
// obj(g, sc, a) … 手に持っている物（原点に描く。手より先に描く＝指の向こう側）
function arms(g, s, o, obj) {
  const alt = s.mode === 'alt';
  for (const sd of alt ? ['L', 'R'] : [s.side === 'L' ? 'L' : 'R']) {
    const act = !alt || sd === s.side, p = act ? s.p : clamp(1 - s.p);
    const has = s.k === 0 || (s.k === 1 && (alt ? sd === s.side : s.age > 0.16));
    const pop = !alt && s.k === 1 ? E.outBack(clamp((s.age - 0.16) / 0.16)) : 1;
    g.mirror(sd, () => {
      const q = pose(o.st, p);
      const held = () => { if (has && obj) { const [hx, hy] = holdOf(q, o.d ?? 80); g.at(hx, hy, 0, q.s * pop, q.s * pop, () => obj(g, q.a)); } };
      if (!o.front) held();
      g.arm(q.x, q.y, q.a, { hand: has ? (o.hold || 'grip') : (o.emp || 'open'), s: q.s, sleeve: o.sleeve });
      if (o.front) held();
    });
  }
}
// hit() で呼ぶ：投げた物を記録
function launch(s, k, o, x = {}) { const [x0, y0] = relPt(o, s.lastSide); s.my.fl.push({ k, t: s.t - s.age, d: flyT(s, k, o.fm), x0, y0, side: s.lastSide, ...x }); }
// 手をはなした瞬間の「シュッ」（手のうしろに短い線）
function swoosh(g, s, o) { const [x, y] = relPt(o, s.lastSide), L = s.lastSide === 'L'; g.fx.lines(x, y, { n: 5, r0: 46, r1: 120, w: 8, a0: L ? PI * 0.95 : -PI * 0.05 - 0.2, arc: 1.3, life: 0.18, c: o.sw || '#ffffff' }); }
// draw() の最初で呼ぶ：着いた物の演出を1回だけ（s.my.L[k] に着いた時刻）
function tick(g, s, land) { for (const f of s.my.fl) if (!f.done && s.t >= f.t + f.d) { f.done = 1; s.my.L[f.k] = f.t + f.d; land(f); } }
const LA = (s, k) => s.my.L[k] === undefined ? -1 : s.t - s.my.L[k];   // 着いてからの秒（まだなら -1）
const landed = s => (s.my.L[1] !== undefined ? 1 : 0) + (s.my.L[2] !== undefined ? 1 : 0);
// 飛んでいる物を描く（残像つき）。pos(f, q) → { x, y, s, r }
function flying(g, s, pos, draw, trail = 1) {
  for (const f of s.my.fl) {
    if (f.done) continue;
    const q = (s.t - f.t) / f.d; if (q < 0) continue;
    const tr = trail * (f.k === 2 ? 1 : 0.55);
    if (tr > 0) for (const [dq, a] of [[0.2, 0.16], [0.1, 0.3]]) { const qq = q - dq; if (qq > 0) g.alpha(a * tr, () => draw(pos(f, qq), f, qq)); }
    draw(pos(f, q), f, q);
  }
}
// ふつうの放物線（遠ざかるほどゆっくり・小さく）
function arcPos(f, q, x1, y1, h, s1, s0 = 0.9) { const e = E.outQ(q); return { x: lerp(f.x0, x1, e), y: lerp(f.y0, y1, e) - h * 4 * q * (1 - q), s: lerp(s0, s1, e) }; }
// 上から落ちて入る放物線（バスケ・ゴミ箱）
function dropPos(f, q, x1, y1, h, s1, s0 = 0.9) { return { x: lerp(f.x0, x1, E.outQ(q)), y: lerp(f.y0, y1, q) - h * 4 * q * (1 - q), s: lerp(s0, s1, E.outQ(q)) }; }
const base = (init) => (s, v, g) => { s.my.fl = []; s.my.L = {}; if (init) init(s, v, g); };
// ふちの色を変えて描く（色つきの線・輪）
function inkd(g, col, fn) { const o = g.ol; g.ol = col; fn(); g.ol = o; }
// 円をたくさん並べた形を1回で塗る（観客・模様）
function dotRow(g, x0, x1, y, step, r, col) { let d = ''; for (let x = x0; x <= x1; x += step) d += `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; if (d) g.path(d, col, 0); }
// 見えている範囲 V だけで決まる形の文字列を覚えておく（毎コマ作り直さない・キャッシュを増やさない）
function vpath(s, key, V, build) { const k = key + V.x0 + ',' + V.y0 + ',' + V.x1; if (!s.my.vp) s.my.vp = {}; return s.my.vp[key] && s.my.vp[key][0] === k ? s.my.vp[key][1] : (s.my.vp[key] = [k, build()])[1]; }
const circlesPath = cs => cs.map(([x, y, r]) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join('');
function lerpAng(a, b, t) { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return a + d * t; }

/* ---------- 小物 ---------- */
// 顔：m = 0 にっこり / 1 びっくり / 2 ぎゅっ（><） / 3 にこにこ（^^）
function face(g, x, y, k, m, o = {}) {
  const ink = o.ink ?? C.ol;
  g.at(x, y, 0, k, k, () => {
    if (m === 2) { g.line([-50, -18, -28, -6, -50, 6], ink, 8); g.line([50, -18, 28, -6, 50, 6], ink, 8); }
    else if (m === 3) { g.arc(-36, 2, 16, PI + 0.45, -0.45, ink, 8); g.arc(36, 2, 16, PI + 0.45, -0.45, ink, 8); }
    else { const r = m === 1 ? 14 : 11; g.circ(-36, -6, r, ink, 0); g.circ(36, -6, r, ink, 0); g.circ(-32, -11, 4, '#fff', 0); g.circ(40, -11, 4, '#fff', 0); }
    if (o.cheek !== false) { g.ell(-62, 22, 16, 9, 'rgba(255,100,130,0.42)', 0); g.ell(62, 22, 16, 9, 'rgba(255,100,130,0.42)', 0); }
    if (m === 1) g.ell(0, 36, 13, 16, '#8a2f3f', 6);
    else if (m === 2) g.line([-22, 36, -11, 28, 0, 36, 11, 28, 22, 36], ink, 6);
    else if (m === 3) g.path('M-28 22 Q0 62 28 22 Z', '#8a2f3f', 6);
    else g.arc(0, 16, 20, 0.35, PI - 0.35, ink, 7);
  });
}
function snowball(g, r = 44) { g.circ(0, 0, r, '#dcecff'); g.circ(-r * 0.15, -r * 0.15, r * 0.78, '#ffffff', 0); g.hl(-r * 0.34, -r * 0.38, r * 0.26, r * 0.14, -0.6, 0.9); }
function pine(g, x, y, k) {
  g.at(x, y, 0, k, k, () => {
    g.rect(-16, -46, 32, 50, C.dwood, 6);
    for (let i = 0; i < 3; i++) {
      const w = 120 - i * 28, yy = -40 - i * 74;
      g.tri(-w, yy, w, yy, 0, yy - 130, '#2f7d5b', 6);
      g.tri(-w * 0.42, yy - 76, w * 0.42, yy - 76, 0, yy - 130, '#ffffff', 0);
    }
  });
}
// 放射状にでこぼこした形（しぶき・べちゃっ）
function splatPts(r, n, r0, r1) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = i % 2 ? r0 + r() * (r1 - r0) * 0.5 : r1 * (0.8 + r() * 0.2); p.push(Math.cos(a) * rr, Math.sin(a) * rr); } return p; }

/* =========================================================================
   1. 雪だるまに雪玉
   ========================================================================= */
const SNOW = { st: 'over', d: 74, hold: 'grip', sw: '#8fb3dd' };
const tplSnow = {
  id: 'throw-snowman', acts: ['throw'], modes: ['one', 'alt'], theme: 'winter', sfx: 'swish',
  vars: [{ k: 'snowman', name: '雪だるまに雪玉', short: '雪玉' }],
  init: base(s => {
    s.my.fk = Array.from({ length: 22 }, () => [s.r(), s.r(), 0.5 + s.r() * 0.8, 5 + s.r() * 6]);
    s.my.sp1 = splatPts(s.r, 12, 22, 46); s.my.sp2 = splatPts(s.r, 12, 20, 40);
  }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      if (f.k === 1) { g.fx.burst(470, 575, { n: 16, c: ['#ffffff', '#d6e9ff'], shape: 'dot', sp: [250, 650], size: [10, 22], g: 1500, life: [0.4, 0.8] }); g.fx.pop('ベシャッ', 250, 300, { size: 92 }); g.fx.shake(7, 0.12); g.sfx('crunch'); }
      else { g.fx.burst(500, 300, { n: 14, c: ['#ffffff', '#d6e9ff'], shape: 'dot', sp: [250, 650], size: [10, 20], g: 1500 }); g.fx.stars(500, 300, 8); g.fx.pop('スポーン！', 500, 150, { size: 100, c: C.yellow }); g.fx.shake(10, 0.14); g.sfx('crunch'); g.sfx('boing'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2);
    // 空と雪原
    g.bg('#e8f4ff'); g.sky('#78c2f2', '#d9f0ff', 600);
    g.poly([V.x0 - 100, 560, 60, 420, 230, 520, 400, 380, 620, 540, 820, 400, 1000, 500, V.x1 + 100, 420, V.x1 + 100, 600, V.x0 - 100, 600], '#bcd6f2', 0);
    g.poly([400, 380, 350, 425, 380, 420, 420, 440, 450, 412], '#ffffff', 0); g.poly([820, 400, 770, 440, 800, 436, 840, 452, 866, 428], '#ffffff', 0);
    g.hills(590, '#e6f0fc', 40, 4, 4); g.hills(660, '#f7fbff', 30, 9, 3);
    for (const [x, y, k] of [[130, 660, 0.9], [880, 650, 0.8], [-150, 640, 0.8], [1170, 660, 0.9], [-420, 650, 0.7], [1430, 650, 0.7]]) if (x > V.x0 - 150 && x < V.x1 + 150) pine(g, x, y, k);
    // 雪だるま
    const wob = jig(l1, 0.09, 15, 5) - jig(l2, 0.07, 15, 5), mood = l2 >= 0 ? 3 : l1 >= 0 ? 1 : 0;
    g.shadow(500, 728, 170, 22);
    g.at(500, 722, wob, 1, 1, () => {
      // 腕（枝）
      g.line([-100, -190, -215, -265], C.dwood, 13); g.line([-185, -245, -200, -292], C.dwood, 9); g.line([-200, -255, -246, -262], C.dwood, 9);
      g.line([100, -190, 215, -265], C.dwood, 13); g.line([185, -245, 200, -292], C.dwood, 9); g.line([200, -255, 246, -262], C.dwood, 9);
      g.circ(0, -125, 132, '#dcebff'); g.circ(-22, -148, 108, '#ffffff', 0);
      g.circ(0, -160, 11, C.ol, 0); g.circ(0, -108, 11, C.ol, 0);
      if (l1 >= 0) g.at(-30, -140, 0, E.outBack(clamp(l1 / 0.12)), E.outBack(clamp(l1 / 0.12)), () => { g.blob(s.my.sp1, '#ffffff', 5); g.circ(-10, -6, 12, '#e3f0ff', 0); });
      g.circ(0, -305, 90, '#dcebff'); g.circ(-16, -322, 72, '#ffffff', 0);
      // マフラー
      g.rr(-96, -232, 192, 36, 18, C.red); g.rr(30, -222, 38, 96, 14, C.red); g.line([36, -150, 62, -150], '#ffb3b3', 5);
      face(g, 0, -312, 0.78, mood, { cheek: true });
      g.path('M-4 -306 L62 -294 L-4 -282 Z', C.carrot, 5);
      if (l2 >= 0) g.at(-6, -360, 0, E.outBack(clamp(l2 / 0.12)), E.outBack(clamp(l2 / 0.12)), () => g.blob(s.my.sp2, '#ffffff', 5));
      // バケツ（2回目で飛ぶ）
      const e = l2 >= 0 ? clamp(l2 / 0.5) : 0;
      g.at(lerp(6, 330, e), -392 - 700 * e + 900 * e * e, -0.12 + 7 * e, 1, 1, () => {
        g.path('M-66 26 L-48 -58 L48 -58 L66 26 Z', C.blue); g.rr(-74, 14, 148, 22, 10, sh(C.blue, 0.25)); g.line([-30, -50, -40, 16], 'rgba(255,255,255,0.45)', 8);
      });
    });
    // 降る雪
    for (const [fx, fy, sp, r] of s.my.fk) { const y = V.y0 + ((fy * 1400 + s.t * 90 * sp) % 1400) * (V.y1 - V.y0) / 1400, x = V.x0 + fx * (V.x1 - V.x0) + Math.sin(s.t * 2 + fy * 9) * 14; g.circ(x, y, r, 'rgba(255,255,255,0.9)', 0); }
    // 飛ぶ雪玉
    flying(g, s, (f, q) => f.k === 1 ? arcPos(f, q, 470, 575, 120, 0.42) : arcPos(f, q, 500, 300, 60, 0.36), (P) => g.at(P.x, P.y, 0, P.s, P.s, () => snowball(g)));
    arms(g, s, SNOW, () => snowball(g));
  },
  hit(g, s, k) { launch(s, k, SNOW); swoosh(g, s, SNOW); },
};

/* =========================================================================
   2. 豆まき（鬼は外）
   ========================================================================= */
const BEAN = { st: 'over', d: 64, hold: 'grip' };
function beans(g, n, spread, seed) {
  for (let i = 0; i < n; i++) { const a = i * 2.39 + seed, r = (i ? 10 + (i % 3) * 9 : 0) * spread; g.at(Math.cos(a) * r, Math.sin(a) * r * 0.8, a, 1, 1, () => { g.ell(0, 0, 13, 10, '#e9c27a', 4); g.hl(-4, -3, 5, 3, -0.5, 0.7); }); }
}
function oni(g, m, run, t) {
  // m: 0 がおー / 1 いたい / 2 にげる
  const sk = '#ff6a5c', dk = sh(sk, -0.25);
  // 足
  const lk = m === 2 ? Math.sin(t * 40) * 0.5 : 0;
  for (const sd of [-1, 1]) g.at(sd * 46, -70, sd * lk, 1, 1, () => { g.rr(-22, 0, 44, 70, 16, sk); g.ell(sd * 6, 70, 34, 16, '#fff3d6', 6); });
  // 体
  g.ell(0, -150, 116, 100, sk);
  g.path('M-112 -128 Q0 -96 112 -128 L104 -70 Q0 -40 -104 -70 Z', C.yellow, 6);
  for (const x of [-70, -26, 20, 64]) g.path(`M${x} ${-118} q16 18 4 46 q-14 -18 -4 -46 Z`, C.ol, 0);
  g.ell(-20, -190, 26, 18, 'rgba(255,255,255,0.18)', 0);
  // 腕
  for (const sd of [-1, 1]) {
    const a = m === 0 ? sd * 0.55 : m === 1 ? sd * 0.12 : sd * (1.5 + Math.sin(t * 40 + sd) * 0.6);
    g.at(sd * 100, -190, a, 1, 1, () => { g.cap(0, 0, 0, -96, 28, sk); g.circ(0, -104, 30, sk); for (const fx of [-16, 0, 16]) g.tri(fx - 7, -128, fx + 7, -128, fx, -150, '#fff3d6', 4); });
  }
  // 頭
  g.at(0, -320, 0, 1, 1, () => {
    for (const sd of [-1, 1]) g.path(`M${sd * 50} -78 Q${sd * 70} -150 ${sd * 96} -168 Q${sd * 92} -120 ${sd * 88} -70 Z`, C.yellow, 6);
    for (const sd of [-1, 1]) g.line([sd * 64, -118, sd * 86, -112], '#e0a81f', 6);
    g.circ(0, 0, 112, sk);
    g.blob([-104, -40, -90, -96, -40, -122, 10, -110, 60, -124, 100, -90, 108, -40, 70, -64, 30, -52, -10, -70, -50, -50, -80, -70], '#3b2547', 0, 0.9);
    g.circ(0, 0, 112, null);
    if (m === 0) {
      g.line([-70, -40, -24, -24], C.ol, 9); g.line([70, -40, 24, -24], C.ol, 9);
      g.circ(-42, -4, 14, '#fff', 5); g.circ(42, -4, 14, '#fff', 5); g.circ(-40, -2, 7, C.ol, 0); g.circ(40, -2, 7, C.ol, 0);
      g.path('M-48 40 Q0 92 48 40 Z', '#7a1f2a', 6); g.tri(-34, 44, -22, 44, -28, 62, '#fff', 3); g.tri(34, 44, 22, 44, 28, 62, '#fff', 3);
    } else {
      g.line([-62, -18, -30, 0, -62, 16], C.ol, 9); g.line([62, -18, 30, 0, 62, 16], C.ol, 9);
      g.path('M-34 52 Q0 30 34 52 Q0 70 -34 52 Z', '#7a1f2a', 6);
      g.path('M-60 24 q-8 26 0 40 q8 -14 0 -40 Z', C.water, 4); g.path('M60 24 q-8 26 0 40 q8 -14 0 -40 Z', C.water, 4);
    }
    g.ell(-74, 30, 16, 9, 'rgba(255,255,255,0.25)', 0);
  });
  if (m >= 1) { g.path('M118 -420 q-14 24 0 36 q14 -12 0 -36 Z', C.water, 4); g.path('M-128 -400 q-10 18 0 28 q10 -10 0 -28 Z', C.water, 4); }
}
const tplBean = {
  id: 'throw-mame', acts: ['throw'], modes: ['one', 'alt'], theme: 'festival', sfx: 'swish',
  vars: [{ k: 'oni', name: '鬼に豆まき', short: '豆まき' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      const [x, y] = f.k === 1 ? [500, 420] : [500, 590];
      g.fx.burst(x, y, { n: 16, c: ['#e9c27a', '#d7a85c'], shape: 'dot', sp: [300, 750], size: [10, 16], g: 2000, life: [0.4, 0.8] });
      g.fx.lines(x, y, { n: 10, r0: 120, r1: 220, w: 10 }); g.fx.shake(8, 0.12);
      if (f.k === 1) { g.fx.pop('イタタ！', 230, 260, { size: 92 }); g.sfx('smack'); }
      else { g.fx.pop('鬼は外！', 500, 170, { size: 120, c: C.yellow }); g.fx.stars(500, 420, 8); g.sfx('smack'); g.sfx('cheer'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2);
    // 和室
    g.bg('#efe0bd');
    g.rect(V.x0 - 10, 120, V.x1 - V.x0 + 20, 30, '#6b4429', 0);
    for (let x = Math.floor((V.x0 - 250) / 250) * 250 + 0; x < V.x1 + 250; x += 250) {
      g.rr(x + 8, 160, 234, 560, 4, '#f7eedb', 6);
      g.circ(x + 125, 330, 70, '#f1d48a', 0); g.path(`M${x + 30} 600 Q${x + 90} 520 ${x + 150} 580 Q${x + 200} 540 ${x + 230} 600 Z`, '#c9d7b0', 0);
      g.rr(x + 104, 430, 12, 60, 6, '#b08850', 0);
    }
    for (let x = Math.floor((V.x0 - 500) / 500) * 500; x < V.x1 + 500; x += 500) g.rect(x - 16, 150, 32, 580, '#8a5a36', 6);
    g.band(720, 'bottom', '#cfd48c', 7);
    for (let i = -6; i <= 6; i++) g.line([500 + i * 190, 720, 500 + i * 520, 1500], '#7d8a45', 8);
    g.line([V.x0, 860, V.x1, 860], '#7d8a45', 8);
    // 鬼
    const m = l2 >= 0 ? 2 : l1 >= 0 ? 1 : 0;
    const away = s.my.fl[1] && s.my.fl[1].side === 'L' ? 1 : -1, run = l2 >= 0 ? away * 1100 * Math.pow(clamp(l2 / 0.42), 1.5) : 0;
    const shk = jig(l1, 14, 30, 6) * (m === 1 ? 1 : 0), hop = m === 2 ? -Math.abs(Math.sin(l2 * 26)) * 30 : -Math.abs(jig(l1, 30, 18, 6));
    g.shadow(500 + run, 766, 150, 20);
    g.at(500 + run + shk, 760 + hop, m === 2 ? 0.25 * away : m === 1 ? -0.06 : 0, away < 0 && m === 2 ? -1 : 1, 1, () => oni(g, m, run, s.t));
    // 飛ぶ豆
    flying(g, s, (f, q) => f.k === 1 ? arcPos(f, q, 500, 420, 110, 0.5) : arcPos(f, q, 500, 590, 50, 0.5), (P, f, q) => g.at(P.x, P.y, 0, P.s, P.s, () => beans(g, 7, 1 + q * 1.6, f.k)), 0.6);
    arms(g, s, BEAN, () => beans(g, 6, 1, 0));
  },
  hit(g, s, k) { launch(s, k, BEAN); swoosh(g, s, BEAN); },
};

/* =========================================================================
   3. ダーツ
   ========================================================================= */
const DART = { st: 'push', d: 92, hold: 'pinch', front: 1 };
const BX = 500, BY = 400, BR = 205;
function dartboard(g, hot) {
  g.circ(0, 0, BR + 40, '#1c1a26');
  for (let i = 0; i < 20; i++) { const a = -PI / 2 + (i - 0.5) * TAU / 20; g.line([Math.cos(a) * (BR + 6), Math.sin(a) * (BR + 6), Math.cos(a) * (BR + 30), Math.sin(a) * (BR + 30)], '#555066', 4); }
  g.circ(0, 0, BR, '#f4e7c6', 0);
  for (let i = 0; i < 10; i++) {
    const a0 = -PI / 2 + (i * 2 - 0.5) * TAU / 20, a1 = a0 + TAU / 20;
    g.path(`M0 0 L${Math.cos(a0) * BR} ${Math.sin(a0) * BR} A${BR} ${BR} 0 0 1 ${Math.cos(a1) * BR} ${Math.sin(a1) * BR} Z`, '#24212e', 0);
  }
  for (const [r, w] of [[BR - 11, 22], [BR * 0.6, 20]]) {
    g.ring(0, 0, r, '#2aa05a', w);
    for (let i = 0; i < 10; i++) { const a0 = -PI / 2 + (i * 2 - 0.5) * TAU / 20; g.arc(0, 0, r, a0, a0 + TAU / 20, '#e5383b', w); }
  }
  g.circ(0, 0, 34, '#2aa05a', 0); g.circ(0, 0, 16, hot ? '#fff3a0' : '#e5383b', 0);
  g.circ(0, 0, BR, null, 5); g.circ(0, 0, BR + 40, null);
}
function dartObj(g, col) {   // 原点が先端、+y（下）へ尾
  g.line([0, 0, 0, 30], '#b8c3d4', 5); g.rr(-7, 26, 14, 50, 6, C.steel, 4); g.rr(-4, 74, 8, 30, 3, '#3a3550', 0);
  g.path('M0 92 L-26 136 L0 126 Z', col, 4); g.path('M0 92 L26 136 L0 126 Z', sh(col, -0.2), 4);
}
const tplDart = {
  id: 'throw-darts', acts: ['throw'], modes: ['one', 'alt'], theme: 'game', sfx: 'swish',
  vars: [{ k: 'board', name: 'ダーツを投げる', short: 'ダーツ' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      if (f.k === 1) { g.fx.burst(570, 320, { n: 8, c: ['#f4e7c6', '#24212e'], shape: 'chip', sp: [150, 400], size: [6, 12], g: 1600 }); g.fx.pop('トスッ', 780, 240, { size: 90 }); g.fx.shake(5, 0.1); g.sfx('knock'); }
      else { g.fx.ring(BX, BY, { c: C.yellow, r0: 20, r1: 260, w: 16 }); g.fx.stars(BX, BY, 10); g.fx.pop('ど真ん中！', 500, 120, { size: 104, c: C.yellow }); g.fx.shake(9, 0.14); g.fx.flash('#fff6c0', 0.3, 0.16); g.sfx('knock'); g.sfx('ding'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2);
    g.bg('#253252'); g.stripes(V.x0 - 40, V.y0 - 10, V.x1 - V.x0 + 80, 820 - V.y0, 60, '#253252', '#2b3a5e');
    g.alpha(0.22, () => g.poly([BX - 60, V.y0, BX + 60, V.y0, BX + 340, 760, BX - 340, 760], '#fff2c4', 0));
    g.glow(BX, BY, 380, '#fff0b8', 0.35);
    g.band(800, 'bottom', '#6d4128', 7); g.band(830, 'bottom', '#8a5634'); g.line([V.x0, 830, V.x1, 830], 'rgba(0,0,0,0.25)', 5);
    const b = jig(l1, 5, 30, 9) + jig(l2, 8, 30, 8);
    g.shadow(BX, BY + BR + 64, 200, 16, 0.25);
    g.at(BX + b, BY, 0, 1, 1, () => dartboard(g, l2 >= 0 && l2 < 0.6 && Math.floor(l2 * 12) % 2 === 0));
    // 刺さったダーツ（手前に尾が見える）
    for (const f of s.my.fl) if (f.done) g.at((f.k === 1 ? 570 : BX) + b, f.k === 1 ? 320 : BY, f.side === 'L' ? 0.42 : -0.42, 0.85, 0.85, () => dartObj(g, f.k === 1 ? C.blue : C.red));
    flying(g, s, (f, q) => f.k === 1 ? arcPos(f, q, 570, 320, 50, 0.85) : arcPos(f, q, BX, BY, 20, 0.85), (P, f) => {
      const T = f.k === 1 ? [570, 320] : [BX, BY], a = Math.atan2(T[1] - P.y, T[0] - P.x) + PI / 2;
      g.at(P.x, P.y, a, P.s, P.s, () => dartObj(g, f.k === 1 ? C.blue : C.red));
    });
    arms(g, s, DART, (g, a) => g.at(0, 0, a + PI / 2, 1, 1, () => g.at(0, -30, () => dartObj(g, s.k === 0 ? C.blue : C.red))));
  },
  hit(g, s, k) { launch(s, k, DART); swoosh(g, s, DART); },
};


/* =========================================================================
   4. バスケのシュート
   ========================================================================= */
const BBALL = { st: 'over', d: 98, hold: 'grip', sw: '#c99a5a' };
const HX = 500, HY = 350, HR = 94;
function bball(g, rot = 0) {
  const r = 60;
  g.circ(0, 0, r, '#f2852a');
  g.clipCirc(0, 0, r, () => g.at(0, 0, rot, 1, 1, () => {
    g.line([-r, 0, r, 0], C.ol, 5); g.line([0, -r, 0, r], C.ol, 5);
    g.arc(-r * 1.32, 0, r * 0.95, -0.95, 0.95, C.ol, 5); g.arc(r * 1.32, 0, r * 0.95, PI - 0.95, PI + 0.95, C.ol, 5);
  }));
  g.circ(0, 0, r, null); g.hl(-r * 0.36, -r * 0.42, r * 0.26, r * 0.14, -0.6, 0.55);
}
function rimHalf(g, front) {
  const d = `M${HX - HR} ${HY} A${HR} 23 0 0 ${front ? 0 : 1} ${HX + HR} ${HY}`;
  g.path(d, null, 18); inkd(g, front ? '#ff6a2a' : '#d9531c', () => g.path(d, null, 10));
}
function hoopNet(g, st, t) {
  const bot = HY + 110 + 34 * st, w = st * 10;
  const xs = [-90, -60, -30, 0, 30, 60, 90];
  for (let i = 0; i < xs.length; i++) { const x = xs[i], y0 = HY + 23 * Math.sqrt(1 - (x / HR) ** 2); g.line([HX + x, y0, HX + x * 0.62 + Math.sin(t * 30 + i) * w, bot], 'rgba(255,255,255,0.92)', 6); }
  for (const [k, y] of [[0.86, HY + 46], [0.72, HY + 82]]) { const pts = []; for (let i = 0; i <= 12; i++) { const x = (i / 12 * 2 - 1) * 90 * k; pts.push(HX + x + Math.sin(t * 30 + i) * w, y + 10 * st + (i % 2 ? 12 : 0)); } g.line(pts, 'rgba(255,255,255,0.92)', 5); }
}
const tplBasket = {
  id: 'throw-basket', acts: ['throw'], modes: ['one', 'alt'], theme: 'sports', sfx: 'whoosh',
  vars: [{ k: 'shoot', name: 'バスケでシュート', short: 'バスケ' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      g.fx.lines(HX, HY + 60, { n: 8, r0: 110, r1: 200, w: 9, a0: 0.3, arc: PI - 0.6 }); g.sfx('swish');
      if (f.k === 1) { g.fx.pop('スパッ', 790, 250, { size: 92 }); g.fx.shake(5, 0.1); }
      else { g.fx.pop('ナイス！', 500, 140, { size: 116, c: C.yellow }); g.fx.confetti(60); g.fx.stars(HX, HY + 60, 8); g.fx.shake(8, 0.12); g.sfx('cheer'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2), sc = landed(s) * 2;
    // 体育館
    g.bg('#f0d9ad');
    const wins = vpath(s, 'gymw', V, () => { let d = '', c = ''; for (let x = Math.floor((V.x0 - 120) / 240) * 240; x < V.x1 + 120; x += 240) for (const y of [-300, -20]) { d += `M${x + 30} ${y}h180v150h-180Z`; c += `M${x + 120} ${y}v150M${x + 30} ${y + 75}h180`; } return [d, c]; });
    g.path(wins[0], '#bfe6ff', 6); inkd(g, '#ffffff', () => g.path(wins[1], null, 6)); g.path(wins[0], null, 6);
    g.band(470, 530, '#3a6fd8'); g.band(530, 640, '#e2c38e'); g.line([V.x0, 470, V.x1, 470], C.ol, 5);
    g.band(640, 'bottom', '#dda468', 7);
    for (let i = -9; i <= 9; i++) g.line([500 + i * 70, 640, 500 + i * 300, 1500], 'rgba(120,70,30,0.22)', 5);
    g.path('M390 640 L610 640 L760 1100 L240 1100 Z', '#e8744a', 0); g.line([390, 640, 240, 1100], '#ffffff', 8); g.line([610, 640, 760, 1100], '#ffffff', 8); g.line([V.x0, 640, V.x1, 640], '#ffffff', 6);
    // 得点板
    g.rr(110, 210, 200, 150, 16, '#2b2140', 7); g.text('とくてん', 210, 245, { size: 26, f: '#ffd23f', font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
    const bump = Math.max(jig(l1, 0.25, 20, 7), jig(l2, 0.3, 20, 7));
    g.at(210, 312, 0, 1 + Math.abs(bump), 1 + Math.abs(bump), () => g.text(String(sc), 0, 0, { size: 84, f: '#ff6a2a', o: 0 }));
    // ゴール
    g.rect(486, V.y0 - 10, 28, 140 - V.y0, '#7f8798', 6);
    const sw = Math.max(l1 >= 0 ? Math.exp(-6 * l1) : 0, l2 >= 0 ? Math.exp(-6 * l2) : 0);
    g.shadow(HX, 660, 160, 14, 0.18);
    g.rr(300, 110, 400, 270, 16, '#ffffff', 7); g.line([432, 352, 432, 246, 568, 246, 568, 352], '#e8434f', 10);
    g.rr(484, 336, 32, 18, 4, '#b3bccb', 5);
    rimHalf(g, false);
    // ゴールを通り抜けて床で弾むボール
    for (const f of s.my.fl) if (f.done) {
      const a = s.t - (f.t + f.d);
      const y = a < 0.16 ? HY + 120 * (a / 0.16) : HY + 120 + (655 - HY - 120) * E.outBounce(clamp((a - 0.16) / 0.55));
      const x = HX + (f.side === 'L' ? 1 : -1) * 90 * clamp((a - 0.16) / 0.8);
      g.at(x, y, a * 6, 0.56, 0.56, () => bball(g));
    }
    flying(g, s, (f, q) => dropPos(f, q, HX, HY - 8, f.k === 1 ? 260 : 190, 0.56), (P, f, q) => g.at(P.x, P.y, q * 6, P.s, P.s, () => bball(g, q * 2)));
    hoopNet(g, sw, s.t); rimHalf(g, true);
    arms(g, s, BBALL, () => bball(g));
  },
  hit(g, s, k) { launch(s, k, BBALL); swoosh(g, s, BBALL); },
};

/* =========================================================================
   5. 紙飛行機（向かいの家の窓へ）
   ========================================================================= */
const PLANE = { st: 'push', d: 84, hold: 'pinch', front: 1, sw: '#c9a77e' };
function plane(g, col = '#ffffff') {
  g.path('M0 -62 L46 44 L0 26 L-46 44 Z', col, 5);
  g.path('M0 -62 L0 26 L-46 44 Z', sh(col, -0.08), 0); g.line([0, -60, 0, 26], '#b8c4d8', 4);
  g.path('M0 -62 L46 44 L0 26 L-46 44 Z', null, 5);
}
const tplPlane = {
  id: 'throw-plane', acts: ['throw'], modes: ['one', 'alt'], theme: 'town', sfx: 'swish',
  vars: [{ k: 'window', name: '紙飛行機をとばす', short: '紙飛行機' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      g.fx.burst(500, 390, { n: 10, c: ['#ffffff', C.yellow], shape: 'star', sp: [200, 500], size: [12, 22], g: 600 });
      if (f.k === 1) { g.fx.pop('スーッ', 250, 250, { size: 92 }); g.sfx('pop'); }
      else { g.fx.pop('ありがとう！', 500, 120, { size: 96, c: C.yellow }); g.fx.hearts(500, 360, 6); g.sfx('chime'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2);
    g.bg('#bfe6ff'); g.sky('#6ec1f5', '#d4f0ff', 700);
    g.cloud(150, 90, 0.8); g.cloud(880, 160, 0.6); g.cloud(-220, 200, 0.7); g.cloud(1250, 80, 0.8);
    // となりの家々
    for (const [x, w, c, r] of [[-330, 300, '#ffd1c2', '#7a5cff'], [1030, 300, '#d8f0c2', '#3a86ff']]) { g.rect(x, 280, w, 520, c, 7); g.tri(x - 30, 285, x + w + 30, 285, x + w / 2, 120, r, 7); g.rr(x + 80, 400, 140, 120, 8, '#bfe6ff', 6); }
    // 家
    g.rect(170, 250, 660, 560, '#ffe6c2', 7);
    g.path('M130 260 L500 40 L870 260 Z', '#e8574f', 7); g.path('M200 230 L500 64 L800 230', null, 0); g.line([170, 250, 830, 250], C.ol, 7);
    g.rr(470, 40, 60, 30, 6, '#b8413a', 5);
    g.rect(220, 560, 150, 160, '#bfe6ff', 6); g.line([295, 560, 295, 720], '#ffffff', 6); g.rr(630, 560, 140, 250, 10, '#9c5a34', 7); g.circ(745, 690, 8, C.gold, 3);
    // 窓（2階）
    const lit = l1 >= 0;
    g.rr(366, 286, 268, 212, 10, '#ffffff', 7);
    g.rect(382, 302, 236, 180, lit ? '#ffe9a8' : '#33427a', 0);
    // 友だち
    if (lit) {
      const up = E.outBack(clamp(l1 / 0.28)), wave = l2 >= 0 ? Math.sin(l2 * 30) * 0.4 : 0;
      g.clipRR(382, 302, 236, 180, 0, () => g.at(500, 690 - 190 * up, 0, 1, 1, () => {
        g.rr(-90, -40, 180, 160, 60, '#4fb3ff');
        g.circ(0, -110, 80, C.skin); g.path('M-82 -120 Q-80 -200 0 -196 Q80 -200 82 -120 Q50 -160 0 -150 Q-50 -160 -82 -120 Z', '#5a3a28');
        face(g, 0, -104, 0.72, l2 >= 0 ? 3 : 1);
        if (l2 >= 0) g.at(90, -60, -0.4 + wave, 1, 1, () => { g.cap(0, 0, 0, -70, 18, C.skin); g.circ(0, -78, 22, C.skin); g.at(-30, -90, -0.3, 0.55, 0.55, () => plane(g)); });
      }));
    }
    g.rect(382, 302, 236, 180, null, 6);
    g.path('M382 302 Q420 360 396 482 L382 482 Z', '#ff8fb1', 5); g.path('M618 302 Q580 360 604 482 L618 482 Z', '#ff8fb1', 5);
    g.rr(350, 492, 300, 24, 8, '#f3f3f3', 6);
    // 歩道と塀
    g.band(800, 'bottom', '#b9bfcc', 7); g.band(880, 'bottom', '#9aa1b0'); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) g.line([x, 800, x - 40, 880], '#8a91a1', 5);
    flying(g, s, (f, q) => { const e = E.outQ(q); return { x: lerp(f.x0, 500, e) + Math.sin(q * PI * 2) * 40 * (f.side === 'L' ? -1 : 1), y: lerp(f.y0, 395, e) - 120 * Math.sin(PI * q), s: lerp(0.88, 0.3, e), r: Math.atan2(395 - f.y0, 500 - f.x0) + PI / 2 + Math.sin(q * 9) * 0.25 }; },
      (P) => g.at(P.x, P.y, P.r, P.s, P.s, () => plane(g)), 0.5);
    arms(g, s, PLANE, (g, a) => g.at(0, 0, a + PI / 2, 1, 1, () => g.at(0, -30, () => plane(g))));
  },
  hit(g, s, k) { launch(s, k, PLANE, {}); swoosh(g, s, PLANE); },
};

/* =========================================================================
   6. 水風船で水やり（しおれたヒマワリが元気に）
   ========================================================================= */
const WB = { st: 'over', d: 80, hold: 'grip', sw: '#c9a77e' };
function wballoon(g, col = '#38b6ff', sq = 0) {
  g.at(0, 0, 0, 1 + sq, 1 - sq, () => {
    g.ell(0, 0, 44, 50, col); g.tri(-9, 48, 9, 48, 0, 62, col, 5); g.hl(-16, -20, 12, 18, -0.4, 0.6);
    g.ell(10, 14, 16, 18, 'rgba(255,255,255,0.18)', 0);
  });
}
function sunflower(g, w, happy, t) {
  // w: しおれ 1 → 0 元気
  const hx = 500 - 160 * w, hy = 300 + 190 * w, ha = -1.15 * w;
  const col = g.mix('#ffd23f', '#c8a04a', w * 0.8);
  g.curve([500, 650, 500 - 10 * w, 520, 500 - 90 * w, 400 + 70 * w, hx + 20 * w, hy + 60 * (1 - w)], '#2b2140', 26);
  g.curve([500, 650, 500 - 10 * w, 520, 500 - 90 * w, 400 + 70 * w, hx + 20 * w, hy + 60 * (1 - w)], '#3fae5a', 16);
  for (const [sd, y, a] of [[-1, 560, -0.5], [1, 500, 0.5]]) g.at(500 + sd * 6 - 30 * w, y + 20 * w, a + sd * w * 0.9 + (sd < 0 ? w * 0.5 : 0), 1, 1, () => g.path(`M0 0 Q${sd * 60} -40 ${sd * 110} 10 Q${sd * 50} 30 0 0 Z`, '#4cc46a', 6));
  g.at(hx, hy, ha, 1, 1, () => {
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; g.at(Math.cos(a) * 86, Math.sin(a) * 86, a + PI / 2, 1, 1 - 0.35 * w, () => g.ell(0, 0, 22, 44, col, 5)); }
    g.circ(0, 0, 78, '#8a5a2b'); g.circ(0, 0, 60, '#a8703a', 0);
    for (let i = 0; i < 10; i++) { const a = i * 2.4, r = 16 + (i % 4) * 11; g.circ(Math.cos(a) * r, Math.sin(a) * r, 4, '#6e4422', 0); }
    if (happy) face(g, 0, 4, 0.62, 3, { cheek: true }); else if (w > 0.6) { g.arc(-26, 0, 11, 0.3, PI - 0.3, C.ol, 7); g.arc(26, 0, 11, 0.3, PI - 0.3, C.ol, 7); g.arc(0, 40, 16, PI + 0.4, -0.4, C.ol, 7); }
    else face(g, 0, 4, 0.62, 0, { cheek: true });
  });
}
const tplWater = {
  id: 'throw-water', acts: ['throw'], modes: ['one', 'alt'], theme: 'nature', sfx: 'whoosh',
  vars: [{ k: 'flower', name: '水風船で水やり', short: '水風船' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    const l1 = LA(s, 1), l2 = LA(s, 2);
    const w = l2 >= 0 ? lerp(0.45, 0, E.outBack(clamp(l2 / 0.16))) : l1 >= 0 ? lerp(1, 0.45, E.outBack(clamp(l1 / 0.3))) : 1;
    const head = () => [500 - 160 * w, 300 + 190 * w];
    tick(g, s, f => {
      const [x, y] = head(); g.fx.splash(x, y, C.water, 22); g.fx.ring(x, y, { c: '#bfefff', r1: 200 }); g.sfx('splash'); g.fx.shake(6, 0.1);
      if (f.k === 1) g.fx.pop('バシャッ', 780, 260, { size: 92, c: '#bfefff' });
      else { g.fx.pop('シャキーン！', 500, 110, { size: 100, c: C.yellow }); g.fx.stars(500, 300, 10); g.sfx('magic'); }
    });
    g.bg('#cfeeff'); g.sky('#5cc2ff', '#fff2c6', 620); g.sun(840, 110, 80, '#ffcf3a');
    if (l2 >= 0) g.alpha(clamp(l2 / 0.2) * 0.8, () => { const cs = ['#ff6b6b', '#ffb03a', '#ffe14d', '#6bd66b', '#5aa9ff', '#a77bff']; cs.forEach((c, i) => g.arc(500, 640, 520 - i * 26, PI, TAU, c, 26)); });
    g.band(620, 'bottom', '#8fd16a', 7);
    for (let x = Math.floor((V.x0 - 60) / 90) * 90; x < V.x1 + 60; x += 90) { g.rr(x, 470, 70, 170, 10, '#f6e3c0', 5); }
    g.rect(V.x0 - 10, 520, V.x1 - V.x0 + 20, 22, '#e7cfa3', 5);
    g.grassTufts(700, '#6cbf4f', 5, 10);
    // 鉢と花
    g.shadow(500, 790, 140, 18);
    sunflower(g, w, l2 >= 0, s.t);
    g.path('M392 640 L608 640 L580 790 L420 790 Z', '#d9733f', 7); g.rr(378, 626, 244, 40, 12, '#e8854f', 7);
    if (l1 >= 0) for (const [dx, dy] of [[-30, 20], [40, -30], [10, 50], [-60, -20]]) { const [x, y] = head(); g.at(x + dx, y + dy, 0, 1, 1, () => g.path('M0 -12 C7 -2 8 6 0 10 C-8 6 -7 -2 0 -12 Z', '#9ee7ff', 3)); }
    flying(g, s, (f, q) => { const [x, y] = head(); return arcPos(f, q, x, y, f.k === 1 ? 130 : 60, 0.45); }, (P, f, q) => g.at(P.x, P.y, q * 2, P.s, P.s, () => wballoon(g, f.k === 1 ? '#38b6ff' : '#ff7ab6', Math.sin(q * 30) * 0.08)));
    arms(g, s, WB, () => wballoon(g, s.k === 0 ? '#38b6ff' : '#ff7ab6'));
  },
  hit(g, s, k) { launch(s, k, WB); swoosh(g, s, WB); },
};

/* =========================================================================
   7. 輪投げ（お祭りの屋台）
   ========================================================================= */
const RING = { st: 'push', d: 80, hold: 'grip' };
const PEGS = [[285, 730, 190, '#d39457', 40], [500, 660, 250, C.gold, 48], [715, 730, 190, '#d39457', 40]];
function ringObj(g, col, tilt = 0.32) { g.at(0, 0, 0, 1, tilt, () => { g.ring(0, 0, 62, C.ol, 28); g.ring(0, 0, 62, col, 16); }); g.at(0, -3, 0, 1, tilt, () => g.arc(0, 0, 62, PI + 0.5, TAU - 0.5, 'rgba(255,255,255,0.55)', 5)); }
function ringHalf(g, x, y, col, back) { g.at(x, y, 0, 1, 0.3, () => { g.arc(0, 0, 62, back ? PI : 0, back ? TAU : PI, C.ol, 28); g.arc(0, 0, 62, back ? PI : 0, back ? TAU : PI, col, 16); }); }
const tplRing = {
  id: 'throw-ring', acts: ['throw'], modes: ['one', 'alt'], theme: 'festival', sfx: 'swish',
  vars: [{ k: 'peg', name: '輪投げで大当たり', short: '輪投げ' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      const [x, y] = f.k === 1 ? PEGS[0] : PEGS[1];
      g.fx.ring(x, y - 6, { c: '#ffffff', r0: 30, r1: 150, sy: 0.32 }); g.sfx('wood');
      if (f.k === 1) { g.fx.pop('カラン', 250, 420, { size: 92 }); g.fx.shake(5, 0.1); }
      else { g.fx.pop('大当たり！', 500, 150, { size: 116, c: C.yellow }); g.fx.confetti(70); g.fx.stars(500, 420, 10); g.fx.shake(9, 0.14); g.sfx('bell'); }
    });
    const l2 = LA(s, 2);
    g.bg('#2a1f4d', '#4b2c62');
    for (let x = Math.floor((V.x0 - 100) / 200) * 200 + 100; x < V.x1 + 100; x += 200) { g.line([x, V.y0, x, 40], C.ol, 4); g.glow(x, 90, 90, '#ffb36b', 0.4); g.ell(x, 90, 40, 46, '#ff5a3c'); g.line([x - 36, 90, x + 36, 90], '#c7311f', 3); g.rr(x - 18, 40, 36, 10, 3, C.ol, 0); g.rr(x - 18, 130, 36, 10, 3, C.ol, 0); }
    g.rect(V.x0 - 10, 258, V.x1 - V.x0 + 20, 304, '#7a4a3a', 0);
    g.stripes(V.x0 - 40, 170, V.x1 - V.x0 + 80, 90, 70, '#ffffff', '#e8343c');
    for (const odd of [0, 1]) g.path(vpath(s, 'scal' + odd, V, () => { let d = ''; for (let x = Math.floor((V.x0 - 70) / 70) * 70; x < V.x1 + 70; x += 70) if ((Math.abs(Math.round(x / 70)) % 2) === odd) d += `M${x} 258 A35 30 0 0 0 ${x + 70} 258 Z`; return d; }), odd ? '#e8343c' : '#ffffff', 5);
    g.line([V.x0, 258, V.x1, 258], C.ol, 5);
    // 景品の棚
    g.rr(250, 420, 500, 20, 6, '#c98b52', 5);
    g.at(680, 420, 0, 0.9, 0.9, () => { g.circ(-40, -86, 26, '#c98b52'); g.circ(40, -86, 26, '#c98b52'); g.circ(0, -50, 62, '#d9a066'); g.ell(0, -30, 26, 18, '#f3d3a6', 0); g.circ(-20, -60, 7, C.ol, 0); g.circ(20, -60, 7, C.ol, 0); g.ell(0, -40, 9, 6, C.ol, 0); g.rr(-30, -10, 60, 14, 6, C.red, 4); });
    for (const [x, c] of [[300, '#5ac8fa'], [390, '#ff8fb1']]) { g.rr(x - 40, 344, 80, 76, 10, c); g.rect(x - 6, 344, 12, 76, C.yellow, 0); g.rr(x - 40, 344, 80, 76, 10, null); }
    // 台（緑の板）
    g.band(540, 'bottom', '#e8343c', 7);
    g.path(`M${V.x0 - 10} 540 L${V.x1 + 10} 540 L${V.x1 + 10} 800 L${V.x0 - 10} 800 Z`, '#2f9e5b', 0);
    g.path('M120 548 L880 548 L960 790 L40 790 Z', '#37b468', 6);
    g.line([V.x0, 800, V.x1, 800], C.ol, 7);
    g.path(vpath(s, 'zig', V, () => { let d = ''; for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1; x += 120) d += `M${x} 800 L${x + 60} 870 L${x + 120} 800 Z`; return d; }), '#ffffff', 0);
    // 棒と、入った輪
    const rings = [];
    for (const f of s.my.fl) if (f.done) rings.push([f.k === 1 ? 0 : 1, s.t - (f.t + f.d), f.k === 1 ? '#3a86ff' : '#ff4fa3']);
    PEGS.forEach(([x, y, h, c, w], i) => {
      const r = rings.find(q => q[0] === i), ry = r ? y - lerp(h, 16, E.outBounce(clamp(r[1] / 0.14))) : 0;
      if (r) ringHalf(g, x, ry, r[2], true);
      g.shadow(x, y + 4, w, 10);
      g.rr(x - w / 2, y - h, w, h, w / 2.5, c, 6); g.rect(x - w / 2 + 6, y - h + 14, 8, h - 28, 'rgba(255,255,255,0.35)', 0);
      if (i === 1) { const gl = l2 >= 0 && Math.floor(l2 * 14) % 2 === 0; g.star(x, y - h - 40, 36, 15, 5, gl ? '#fff6a0' : C.yellow, 6); g.rr(x - 54, y - 120, 108, 46, 10, '#ffffff', 5); g.text('1とう', x, y - 97, { size: 32, f: C.red, font: '"Zen Kaku Gothic New", sans-serif', w: 900 }); }
      if (r) ringHalf(g, x, ry, r[2], false);
    });
    flying(g, s, (f, q) => { const [x, y, h] = f.k === 1 ? PEGS[0] : PEGS[1]; return dropPos(f, q, x, y - h - 30, f.k === 1 ? 180 : 120, 1); },
      (P, f, q) => g.at(P.x, P.y, Math.sin(q * 12) * 0.2, P.s, P.s, () => ringObj(g, f.k === 1 ? '#3a86ff' : '#ff4fa3', 0.3 + 0.2 * Math.sin(q * 14))));
    arms(g, s, RING, () => g.at(0, -10, 0, 0.9, 0.9, () => ringObj(g, s.k === 0 ? '#3a86ff' : '#ff4fa3', 0.5)));
  },
  hit(g, s, k) { launch(s, k, RING); swoosh(g, s, RING); },
};

/* =========================================================================
   8. ボウリング（下から転がす）
   ========================================================================= */
const BOWL = { st: 'under', d: 92, hold: 'grip' };
const PINS = [[500, 356], [478, 340], [522, 340], [456, 324], [500, 324], [544, 324], [434, 308], [478, 308], [522, 308], [566, 308]];
const K1 = [0, 1, 2, 4, 5, 7, 8];
function pinObj(g) {
  g.path('M0 -64 C11 -64 13 -52 8 -43 C5 -37 19 -29 19 -15 C19 -4 12 0 0 0 C-12 0 -19 -4 -19 -15 C-19 -29 -5 -37 -8 -43 C-13 -52 -11 -64 0 -64 Z', '#ffffff', 4);
  g.line([-7, -46, 7, -46], '#e8343c', 4); g.line([-6, -40, 6, -40], '#e8343c', 4);
}
function bowlBall(g, rot = 0) {
  g.circ(0, 0, 70, '#4b3fb8'); g.circ(-14, -14, 54, '#5b4fd0', 0);
  g.at(0, 0, rot, 1, 1, () => { g.circ(-14, -22, 9, '#1c1640', 0); g.circ(10, -26, 9, '#1c1640', 0); g.circ(0, 4, 11, '#1c1640', 0); });
  g.circ(0, 0, 70, null); g.hl(-28, -34, 20, 10, -0.6, 0.6);
}
const laneX = (y, sd) => 500 + sd * (84 + (y - 330) * 0.29);
const tplBowl = {
  id: 'throw-bowling', acts: ['throw'], modes: ['one', 'alt'], theme: 'sports', sfx: 'swish',
  vars: [{ k: 'spare', name: 'ボウリングでスペア', short: 'ボウリング' }],
  init: base(s => { s.my.pv = PINS.map((_, i) => [(PINS[i][0] - 500) * 7 + (s.r() - 0.5) * 200, 380 + s.r() * 300, (s.r() < 0.5 ? -1 : 1) * (8 + s.r() * 10)]); }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      g.fx.burst(500, 330, { n: 10, c: ['#ffffff', '#ffd23f'], shape: 'spark', sp: [300, 800], size: [12, 20] }); g.sfx('wood'); g.fx.shake(f.k === 2 ? 10 : 7, 0.14);
      if (f.k === 1) g.fx.pop('ガコーン', 250, 230, { size: 90 });
      else { g.fx.pop('スペア！', 500, 160, { size: 120, c: C.yellow }); g.fx.stars(500, 320, 10); g.fx.confetti(50); g.sfx('cheer'); }
    });
    // 奥の壁
    g.bg('#221a42');
    g.rect(V.x0 - 10, 170, V.x1 - V.x0 + 20, 120, '#2e2366', 0);
    for (const [c, y] of [['#ff4fa3', 196], ['#2ec4f0', 224], ['#ffd23f', 252]]) g.curve([V.x0, y + 20, 300, y - 14, 700, y + 20, V.x1, y - 10], c, 8);
    g.line([V.x0, 290, V.x1, 290], C.ol, 6);
    // 床（となりのレーン）
    g.band(292, 'bottom', '#6a4630');
    for (const sd of [-1, 1]) for (let i = 1; i <= 3; i++) { const o = i * 2.2; g.poly([500 + sd * (70 + 140 * (o - 1)), 292, 500 + sd * (70 + 140 * o), 292, 500 + sd * (70 + 140 * o + 1210 * 0.29 * o), 1500, 500 + sd * (70 + 140 * (o - 1) + 1210 * 0.29 * (o - 1)), 1500], i % 2 ? '#8a5c3c' : '#7a5034', 0); }
    // 自分のレーン
    for (const sd of [-1, 1]) g.poly([laneX(292, sd), 292, laneX(292, sd) + sd * 26, 292, laneX(1500, sd) + sd * 150, 1500, laneX(1500, sd), 1500], '#3a3550', 0);
    g.poly([laneX(292, -1), 292, laneX(292, 1), 292, laneX(1500, 1), 1500, laneX(1500, -1), 1500], g.lin(0, 292, 0, 1000, ['#f6d6a2', '#e6b276']), 0);
    for (let i = -3; i <= 3; i++) g.line([500 + i * 18, 292, 500 + i * 120, 1500], 'rgba(150,90,40,0.18)', 4);
    for (let i = -2; i <= 2; i++) { const y = 700 - Math.abs(i) * 30, x = 500 + i * 70 * (1 + (y - 330) / 600); g.tri(x - 12, y + 16, x + 12, y + 16, x, y - 18, '#c46a3a', 0); }
    g.line([laneX(940, -1), 940, laneX(940, 1), 940], '#b0412e', 6);
    g.rect(V.x0 - 10, 292, V.x1 - V.x0 + 20, 70, 'rgba(255,240,200,0.22)', 0);
    // ピン
    const L1 = s.my.L[1], L2 = s.my.L[2];
    for (let i = PINS.length - 1; i >= 0; i--) {
      const [x, y] = PINS[i], T = K1.includes(i) ? L1 : L2;
      const a = T === undefined ? -1 : s.t - T - (352 - y) * 0.0012;
      if (a < 0) { g.shadow(x, y + 2, 18, 5); g.at(x, y, 0, 0.8, 0.8, () => pinObj(g)); continue; }
      if (a > 0.7) continue;
      const [vx, vy, vr] = s.my.pv[i];
      g.alpha(1 - clamp((a - 0.45) / 0.25), () => g.at(x + vx * a, y - vy * a + 1300 * a * a, vr * a, 0.8, 0.8, () => g.at(0, -30, () => pinObj(g))));
    }
    flying(g, s, (f, q) => { const e = E.outQ(q); return { x: lerp(f.x0, 500 + (f.side === 'L' ? -1 : 1) * 10 * Math.sin(PI * e), e), y: lerp(f.y0, 345, e), s: lerp(0.92, 0.26, e) }; },
      (P, f, q) => g.at(P.x, P.y, 0, P.s, P.s, () => { g.shadow(0, 64, 60, 14); bowlBall(g, -q * 14); }), 0.6);
    arms(g, s, BOWL, () => bowlBall(g));
  },
  hit(g, s, k) { launch(s, k, BOWL); swoosh(g, s, BOWL); },
};

/* =========================================================================
   9. 野球のピッチング（三振をとる）
   ========================================================================= */
const PITCH = { st: 'over', d: 70, hold: 'grip' };
const MITT = [512, 470];
function baseball(g) { g.circ(0, 0, 34, '#ffffff'); g.arc(-40, 0, 28, -0.8, 0.8, '#e8343c', 4); g.arc(40, 0, 28, PI - 0.8, PI + 0.8, '#e8343c', 4); g.hl(-12, -14, 9, 5, -0.6, 0.6); }
function batter(g, sw, fall, t) {
  g.at(0, 0, -1.25 * fall, 1, 1, () => {
    g.rr(-40, -130, 30, 130, 12, '#f3f3f3'); g.rr(10, -130, 30, 130, 12, '#f3f3f3'); g.rr(-46, -14, 40, 16, 6, C.ol, 0); g.rr(6, -14, 40, 16, 6, C.ol, 0);
    g.rr(-50, -270, 100, 150, 34, '#ffffff'); g.rect(-50, -150, 100, 14, '#3a4a8a', 0); g.rr(-50, -270, 100, 150, 34, null);
    g.circ(0, -304, 42, C.skin); g.path('M-46 -300 Q-46 -352 0 -352 Q48 -352 50 -300 L70 -296 L70 -286 L-46 -290 Z', '#e8343c');
    if (fall > 0.5) { g.line([-22, -300, -8, -290, -22, -280], C.ol, 5); g.line([22, -300, 8, -290, 22, -280], C.ol, 5); } else { g.circ(-14, -296, 5, C.ol, 0); g.circ(16, -296, 5, C.ol, 0); }
    const ba = lerp(-2.3, 1.2, sw);
    g.at(26, -228, ba, 1, 1, () => { g.taper(0, 20, 0, -230, 9, 18, '#e9c48a'); g.ell(0, 24, 12, 5, '#b98a52'); });
    g.cap(-30, -240, 26, -228, 18, '#ffffff'); g.circ(26, -228, 18, C.skin);
  });
}
const tplPitch = {
  id: 'throw-pitch', acts: ['throw'], modes: ['one', 'alt'], theme: 'sports', sfx: 'whoosh',
  vars: [{ k: 'strike', name: 'ストライクを投げる', short: 'ピッチング' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      g.fx.smoke(MITT[0], MITT[1], 4); g.fx.lines(MITT[0], MITT[1], { n: 10, r0: 70, r1: 150, w: 9 }); g.sfx('smack'); g.fx.shake(f.k === 2 ? 10 : 7, 0.12);
      if (f.k === 1) g.fx.pop('ストライク！', 500, 210, { size: 84 });
      else { g.fx.pop('三振！', 500, 190, { size: 140, c: C.yellow }); g.fx.confetti(60); g.sfx('cheer'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2), n = landed(s);
    g.bg('#bfe6ff'); g.sky('#7cc8ff', '#d6f0ff', 120);
    g.rect(V.x0 - 10, 110, V.x1 - V.x0 + 20, 220, '#3b3f6b', 0);
    for (let r = 0; r < 5; r++) dotRow(g, V.x0 + (r % 2) * 18, V.x1, 132 + r * 40, 36, 13, ['#ffd8a8', '#ff9fbd', '#bfe3ff', '#fff3b0', '#c9f2c2'][r]);
    g.rect(V.x0 - 10, 330, V.x1 - V.x0 + 20, 60, '#2f6b4f', 0); g.line([V.x0, 330, V.x1, 330], C.ol, 5); g.line([V.x0, 390, V.x1, 390], C.ol, 5);
    g.band(390, 'bottom', '#5cb85c');
    for (let i = 0, y = 390, h = 30; y < V.y1; i++, y += h, h *= 1.3) if (i % 2) g.band(y, y + h, '#66c466');
    g.ell(500, 575, 340, 100, '#c98d5a', 0);
    g.rect(370, 540, 90, 70, null, 0); g.line([372, 540, 452, 540, 452, 610, 372, 610, 372, 540], '#ffffff', 5); g.line([548, 540, 628, 540, 628, 610, 548, 610, 548, 540], '#ffffff', 5);
    g.poly([470, 570, 530, 570, 530, 580, 500, 592, 470, 580], '#ffffff', 4);
    g.ell(500, 1040, 520, 170, '#c98d5a', 7);
    // カウント
    g.rr(70, 150, 250, 74, 14, '#1c2a24', 6); g.text('S', 110, 188, { size: 46, f: '#ffffff' });
    for (let i = 0; i < 3; i++) { const on = i < 1 + n; g.circ(170 + i * 54, 188, 20, on ? C.yellow : '#3b4a42', 4); if (on && i === n && (n === 1 ? l1 : l2) < 0.5) g.glow(170 + i * 54, 188, 46, '#fff3a0', 0.7); }
    // 審判
    g.at(500, 470, 0, 1, 1, () => { g.rr(-80, -60, 160, 110, 40, '#2b2f45'); g.circ(0, -96, 40, '#2b2f45'); g.rr(-28, -110, 56, 40, 10, '#4a4f66', 4); });
    // バッター
    const sw = l2 >= 0 ? E.outQ(clamp(l2 / 0.12)) : l1 >= 0 ? (l1 < 0.5 ? E.outQ(clamp(l1 / 0.12)) : 1 - E.ioQ(clamp((l1 - 0.5) / 0.3))) : 0;
    g.at(360, 600, 0, 0.82, 0.82, () => batter(g, sw, l2 >= 0 ? E.outBounce(clamp((l2 - 0.05) / 0.3)) : 0, s.t));
    // キャッチャー
    g.at(500, 600, 0, 1, 1, () => {
      g.ell(-62, -26, 44, 30, '#2b3a6b'); g.ell(62, -26, 44, 30, '#2b3a6b');
      g.rr(-70, -150, 140, 120, 46, '#2b3a6b'); g.rr(-48, -140, 96, 96, 30, '#3f5a9a', 5);
      g.circ(0, -182, 44, '#2b3a6b'); g.rr(-30, -196, 60, 46, 10, '#7f8798', 4); g.grid(-30, -196, 60, 46, 15, '#2b2140', 3);
    });
    const mb = Math.max(jig(l1, 10, 30, 10), jig(l2, 12, 30, 10));
    g.at(MITT[0], MITT[1] + Math.abs(mb), 0, 1, 1, () => { g.circ(0, 0, 50, '#b8692e'); g.circ(0, 0, 32, '#8a4a20', 0); g.ell(-44, 10, 18, 26, '#b8692e', 6); g.hl(-16, -22, 14, 7, -0.5, 0.4); });
    for (const f of s.my.fl) if (f.done && s.t - (f.t + f.d) < 0.5) g.at(MITT[0], MITT[1], 0, 0.3, 0.3, () => baseball(g));
    flying(g, s, (f, q) => arcPos(f, q, MITT[0], MITT[1], f.k === 1 ? 50 : 14, 0.3), (P, f, q) => g.at(P.x, P.y, q * 10, P.s, P.s, () => baseball(g)));
    arms(g, s, PITCH, () => baseball(g));
  },
  hit(g, s, k) { launch(s, k, PITCH); swoosh(g, s, PITCH); },
};

/* =========================================================================
   10. パイ投げ（顔がクリームだらけ → おいしい）
   ========================================================================= */
const PIE = { st: 'push', d: 66, hold: 'open', front: 1 };
function pie(g) {
  g.ell(0, 14, 66, 22, '#c7ccd6'); g.ell(0, 6, 62, 18, '#e8b86a', 5);
  g.blob([-58, 8, -54, -14, -30, -28, 0, -34, 30, -28, 54, -14, 58, 8, 0, 16], '#fffdf6', 5);
  g.circ(-6, -24, 12, '#ff4f5e', 4); g.ell(-10, -32, 6, 3, '#4cc46a', 0);
}
const tplPie = {
  id: 'throw-pie', acts: ['throw'], modes: ['one', 'alt'], theme: 'party', sfx: 'whoosh',
  vars: [{ k: 'face', name: 'パイ投げ', short: 'パイ投げ' }],
  init: base(s => { s.my.c1 = splatPts(s.r, 14, 46, 78); s.my.c2 = splatPts(s.r, 16, 96, 150); }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      const [x, y] = f.k === 1 ? [550, 400] : [500, 390];
      g.fx.burst(x, y, { n: 18, c: ['#fffdf6', '#ffd6e0'], shape: 'dot', sp: [250, 700], size: [12, 24], g: 1600 }); g.sfx('squish'); g.fx.shake(8, 0.12);
      if (f.k === 1) g.fx.pop('ベチャッ', 220, 250, { size: 92 });
      else { g.fx.pop('おいしい！', 500, 120, { size: 110, c: '#ff8fb1' }); g.fx.hearts(500, 300, 7); g.sfx('cheer'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2);
    g.bg('#ffd66b'); g.stripes(V.x0 - 40, V.y0 - 10, V.x1 - V.x0 + 80, 800 - V.y0, 70, '#ffd66b', '#ffc94a');
    g.glow(500, 420, 420, '#ffffff', 0.5);
    for (const sd of [-1, 1]) { const x = sd < 0 ? V.x0 - 20 : V.x1 + 20, x2 = 500 + sd * 330; g.path(`M${x} ${V.y0} L${x2} ${V.y0} Q${x2 - sd * 40} 300 ${x2 + sd * 30} 820 L${x} 820 Z`, '#d9303f', 7); for (let i = 1; i < 4; i++) g.curve([lerp(x, x2, i / 4), V.y0, lerp(x, x2, i / 4) - sd * 20, 400, lerp(x, x2, i / 4) + sd * 10, 820], '#a8202f', 6); }
    g.band(800, 'bottom', '#8a4a2a', 7); g.planks(V.x0, 806, V.x1 - V.x0, 300, 3, '#a35d34');
    // 人
    const sx = 500 + jig(l1, 14, 26, 7) + jig(l2, 16, 26, 7);
    g.shadow(500, 812, 170, 18);
    g.at(sx, 0, 0, 1, 1, () => {
      g.rr(-150, 540, 300, 280, 100, '#4f8cff'); for (const x of [-90, -30, 30, 90]) g.rect(x - 12, 560, 24, 250, '#6ea3ff', 0); g.rr(-150, 540, 300, 280, 100, null);
      g.path('M-46 540 L0 566 L46 540 L46 584 L0 566 L-46 584 Z', C.red, 5);
      g.circ(-128, 390, 26, C.skin); g.circ(128, 390, 26, C.skin);
      g.circ(0, 390, 128, C.skin);
      g.path('M-124 360 Q-130 250 -40 248 Q0 230 40 248 Q130 250 124 360 Q100 300 40 300 Q0 312 -40 300 Q-100 300 -124 360 Z', '#4a2f22');
      g.path('M-60 262 L0 150 L60 262 Z', '#ff8fb1', 6); g.circ(0, 146, 16, C.yellow, 5); for (const y of [210, 240]) g.line([-30 + (y - 200) * 0.2, y, 30 - (y - 200) * 0.2, y], '#ffffff', 6);
      if (l2 < 0) face(g, 0, 400, 1.05, l1 >= 0 ? 2 : 0);
      if (l1 >= 0 && l2 < 0) {
        const e = E.outBack(clamp(l1 / 0.1));
        g.at(48, 400, 0, e, e, () => g.blob(s.my.c1, '#fffdf6', 6));
        const dy = 150 * E.inQ(clamp((l1 - 0.25) / 0.5));
        g.alpha(1 - clamp((l1 - 0.6) / 0.15), () => g.at(60, 420 + dy, 0.3 + dy * 0.004, 0.8, 0.8, () => { g.ell(0, 0, 66, 24, '#c7ccd6'); g.ell(0, -6, 50, 14, '#e3e6ee', 0); }));
      }
      if (l2 >= 0) {
        const e = E.outBack(clamp(l2 / 0.1));
        g.at(0, 395, 0, e, e, () => { g.blob(s.my.c2, '#fffdf6', 7); g.circ(-40, -30, 24, '#ffe3ea', 0); g.circ(50, 20, 18, '#ffe3ea', 0); g.circ(-10, -80, 14, '#ff4f5e', 4); });
        g.arc(-40, 380, 15, PI + 0.45, -0.45, C.ol, 8); g.arc(40, 380, 15, PI + 0.45, -0.45, C.ol, 8);
        const tg = clamp((l2 - 0.04) / 0.1);
        if (tg > 0) g.at(0, 438, 0, 1, tg, () => g.path('M-22 0 Q0 50 22 0 Z', '#ff6f8f', 5));
      }
    });
    flying(g, s, (f, q) => f.k === 1 ? arcPos(f, q, 550, 400, 90, 0.62) : arcPos(f, q, 500, 390, 30, 0.7), (P, f, q) => g.at(P.x, P.y, (f.side === 'L' ? 1 : -1) * q * 0.6, P.s, P.s, () => pie(g)));
    arms(g, s, PIE, () => g.at(0, 10, 0, 1, 1, () => pie(g)));
  },
  hit(g, s, k) { launch(s, k, PIE); swoosh(g, s, PIE); },
};

/* =========================================================================
   11. 水切り（石が水面をはねる）
   ========================================================================= */
const SKIP = { st: 'side', d: 76, hold: 'pinch', front: 1 };
function stoneObj(g) { g.ell(0, 0, 42, 24, '#c3cad8'); g.ell(-6, -6, 30, 13, '#e3e8f0', 0); g.hl(-14, -9, 10, 5, -0.3, 0.8); }
const SKN = [3, 6];
function skipPos(f, q) {
  const n = SKN[f.k - 1], [ex, ey] = f.k === 1 ? [470, 560] : [505, 400], e = E.outQ(q);
  const gx = lerp(f.x0, ex, e), gy = lerp(f.y0 + 40, ey, e), j = Math.min(n - 1, Math.floor(q * n)), fr = q * n - j;
  const H = (j === 0 ? 90 : 70 * Math.pow(0.7, j)) * lerp(1, 0.3, e);
  return { x: gx, y: gy - H * 4 * fr * (1 - fr) - (j === 0 ? 40 * (1 - fr) : 0), s: lerp(0.92, f.k === 1 ? 0.4 : 0.26, e), gy };
}
const tplSkip = {
  id: 'throw-skip', acts: ['throw'], modes: ['one', 'alt'], theme: 'nature', sfx: 'swish',
  vars: [{ k: 'lake', name: '石で水切り', short: '水切り' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      const P = skipPos(f, 1);
      if (f.k === 1) { g.fx.splash(P.x, P.y, '#bfe6ff', 12); g.fx.pop('3回！', 250, 300, { size: 100 }); g.sfx('bubble'); }
      else { g.fx.stars(P.x, P.y - 20, 10); g.fx.pop('6回！', 500, 160, { size: 130, c: C.yellow }); g.sfx('ding'); g.sfx('cheer'); }
    });
    g.bg('#ffcf9e'); g.sky('#ff8f7a', '#ffe0a8', 380);
    g.sun(700, 330, 70, '#fff1a8');
    g.poly([V.x0 - 50, 380, 80, 300, 220, 350, 380, 270, 560, 360, 760, 290, 940, 360, V.x1 + 50, 300, V.x1 + 50, 390, V.x0 - 50, 390], '#8a6aa8', 0);
    g.rect(V.x0 - 10, 360, V.x1 - V.x0 + 20, 30, '#4f7a5a', 0); dotRow(g, V.x0, V.x1, 362, 46, 22, '#4f7a5a');
    g.rect(V.x0 - 10, 388, V.x1 - V.x0 + 20, 1200, g.lin(0, 388, 0, 920, ['#ffb08a', '#7fb5e8', '#3a6db8']), 0);
    for (let i = 0; i < 7; i++) { const y = 410 + i * i * 9 + i * 20, w = 40 + i * 30; g.rr(700 - w / 2, y, w, 8 + i, 4, 'rgba(255,240,170,0.55)', 0); }
    for (const [x, y, w] of [[200, 470, 90], [820, 520, 110], [330, 640, 140], [120, 760, 170], [860, 720, 150]]) g.rr(x - w / 2, y, w, 6, 3, 'rgba(255,255,255,0.35)', 0);
    // 手前の岸
    g.band(900, 'bottom', '#cdb48c', 0); g.path(`M${V.x0 - 10} 900 Q500 870 ${V.x1 + 10} 900 L${V.x1 + 10} 920 L${V.x0 - 10} 920 Z`, '#cdb48c', 0);
    for (const [x, y, r] of [[160, 940, 30], [300, 980, 22], [760, 950, 34], [880, 1010, 26], [520, 1040, 30], [40, 1080, 34]]) g.ell(x, y, r, r * 0.6, '#9aa3b5', 5);
    // 波紋
    for (const f of s.my.fl) {
      const n = SKN[f.k - 1];
      for (let j = 1; j <= n; j++) {
        const tj = f.t + f.d * j / n, a = s.t - tj; if (a < 0 || a > 1.3) continue;
        const P = skipPos(f, j / n - 1e-6), r = (24 + 150 * E.outQ(clamp(a / 1.3))) * P.s;
        g.alpha(1 - a / 1.3, () => g.at(P.x, P.gy, 0, 1, 0.32, () => { g.ring(0, 0, r, '#ffffff', 12); g.ring(0, 0, r * 0.55, '#ffffff', 9); }));
      }
    }
    // はねた回数（はねるたびに数字としぶき）
    for (const f of s.my.fl) {
      const n = SKN[f.k - 1]; f.sk = f.sk || 0;
      while (f.sk < n && s.t >= f.t + f.d * (f.sk + 1) / n) {
        f.sk++; const P = skipPos(f, f.sk / n - 1e-6);
        g.fx.burst(P.x, P.gy, { n: 6, c: ['#ffffff', '#cfeaff'], shape: 'drop', sp: [150, 380], size: [8, 14], g: 1800, life: [0.3, 0.5], spread: 1.6 });
        if (f.sk < n) g.fx.pop(String(f.sk), P.x + (f.k === 1 ? -60 : -40), P.gy - 50, { size: f.k === 1 ? 64 : 50, life: 0.4, rise: 40 });
      }
    }
    flying(g, s, skipPos, (P, f, q) => g.at(P.x, P.y, q * 20, P.s, P.s * 0.8, () => stoneObj(g)), 0.8);
    arms(g, s, SKIP, () => stoneObj(g));
  },
  hit(g, s, k) { launch(s, k, SKIP); swoosh(g, s, SKIP); },
};


/* =========================================================================
   12. フリスビーを犬に（2枚ともキャッチ）
   ========================================================================= */
const FRIS = { st: 'side', d: 72, hold: 'grip' };
const DOGX = 500, DOGY = 700, DOGH = 170;
function disc(g, col) { g.ell(0, 0, 62, 20, col); g.ell(0, -4, 46, 12, sh(col, 0.25), 0); g.ell(0, 0, 62, 20, null, 6); g.at(0, -2, 0, 1, 0.3, () => g.arc(0, 0, 52, PI + 0.5, TAU - 0.7, 'rgba(255,255,255,0.7)', 7)); }
const DCOL = ['#3a86ff', '#ff4f5e'];
function dog(g, jump, n, open, happy, t) {
  const fur = '#eba95c', dk = '#a8642e', cr = '#fff3e0';
  g.at(56, -120, -0.5 + Math.sin(t * (happy ? 34 : 14)) * 0.5, 1, 1, () => g.path('M0 0 Q34 -40 14 -86 Q-4 -52 -16 -8 Z', dk, 6));
  g.ell(-54, -16, 36, 22, fur); g.ell(54, -16, 36, 22, fur);
  g.ell(0, -86, 74, 84, fur); g.ell(0, -70, 42, 56, cr, 0);
  for (const sd of [-1, 1]) g.at(sd * 30, -112, -sd * 2.5 * jump, 1, 1, () => { g.cap(0, 0, 0, 88, 17, fur); g.ell(0, 94, 20, 14, cr, 5); });
  g.at(0, -200, 0, 1, 1, () => {
    for (const sd of [-1, 1]) g.path(`M${sd * 44} -44 Q${sd * 100} -34 ${sd * 86} 42 Q${sd * 64} 32 ${sd * 38} -8 Z`, dk, 6);
    g.circ(0, 0, 70, fur); g.ell(0, 28, 44, 30, cr, 5);
    if (happy) { g.arc(-28, -14, 12, PI + 0.4, -0.4, C.ol, 7); g.arc(28, -14, 12, PI + 0.4, -0.4, C.ol, 7); }
    else { g.circ(-28, -14, 10, C.ol, 0); g.circ(28, -14, 10, C.ol, 0); g.circ(-25, -18, 3.5, '#fff', 0); g.circ(31, -18, 3.5, '#fff', 0); }
    g.ell(0, 12, 14, 10, C.ol, 0);
    if (open) g.ell(0, 44, 16, 14, '#8a2f3f', 5); else g.path('M-16 34 Q-8 44 0 36 Q8 44 16 34', null, 5);
    for (let i = 0; i < n; i++) g.at(0, 46 - i * 16, i ? 0.18 : -0.12, 0.82, 0.82, () => disc(g, DCOL[i]));
    if (happy) g.path('M-6 52 Q0 76 6 52 Z', '#ff6f8f', 4);
  });
}
const tplFris = {
  id: 'throw-frisbee', acts: ['throw'], modes: ['one', 'alt'], theme: 'animal', sfx: 'swoosh',
  vars: [{ k: 'dog', name: 'フリスビーを犬に', short: 'フリスビー' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      g.fx.lines(DOGX, DOGY - 200 - DOGH + 50, { n: 10, r0: 90, r1: 170, w: 9 }); g.sfx('pop'); g.fx.shake(5, 0.1);
      if (f.k === 1) g.fx.pop('パクッ', 240, 300, { size: 96 });
      else { g.fx.pop('ナイスキャッチ！', 500, 130, { size: 84, c: C.yellow }); g.fx.hearts(DOGX, DOGY - 300, 7); g.sfx('cheer'); }
    });
    // 跳ぶ高さ（投げたら跳び上がり、着いた瞬間がいちばん高い）
    let jy = 0;
    for (const f of s.my.fl) { const a = s.t - f.t; if (a < 0) continue; jy = Math.max(jy, a < f.d ? Math.sin(PI / 2 * a / f.d) : Math.max(0, 1 - Math.pow((a - f.d) / 0.32, 2))); }
    g.bg('#c4ebff'); g.sky('#74c4f5', '#d9f2ff', 470);
    g.cloud(160, 120, 0.7); g.cloud(820, 190, 0.55); g.cloud(-200, 90, 0.6); g.cloud(1200, 140, 0.7);
    for (let x = Math.floor((V.x0 - 100) / 150) * 150; x < V.x1 + 150; x += 150) { const h = 60 + (Math.abs(x * 7) % 50); g.rect(x - 8, 470 - h * 0.4, 16, h * 0.4, '#8a5a36', 0); g.circ(x, 470 - h * 0.6, h * 0.55, '#3f9e5a', 0); }
    g.band(470, 'bottom', '#7ccf5a', 7);
    for (let i = 0, y = 470, h = 26; y < V.y1; i++, y += h, h *= 1.3) if (i % 2) g.band(y, y + h, '#88d966');
    for (const [x, y, c] of [[150, 780, '#ffffff'], [880, 820, C.yellow], [260, 900, '#ff9fbd'], [760, 940, '#ffffff'], [-120, 860, C.yellow], [1140, 860, '#ff9fbd']]) { for (let i = 0; i < 5; i++) g.circ(x + Math.cos(i * 1.26) * 12, y + Math.sin(i * 1.26) * 12, 9, c, 3); g.circ(x, y, 7, '#ffb703', 0); }
    // 犬
    const n = landed(s), flyingNow = s.my.fl.some(f => !f.done && s.t >= f.t);
    g.shadow(DOGX, DOGY + 4, 120 - 50 * jy, 22 - 8 * jy);
    g.at(DOGX, DOGY - DOGH * jy, 0, 1, 1, () => dog(g, jy, n, flyingNow, s.my.L[2] !== undefined, s.t));
    flying(g, s, (f, q) => { const p = arcPos(f, q, DOGX, DOGY - 200 - DOGH + 46, f.k === 1 ? 90 : 30, 0.66); p.x += Math.sin(PI * q) * 90 * (f.side === 'L' ? -1 : 1); return p; },
      (P, f, q) => g.at(P.x, P.y, Math.sin(q * 5) * 0.2, P.s, P.s, () => disc(g, DCOL[f.k - 1])));
    arms(g, s, FRIS, (g) => g.at(0, 0, 0.3, 1, 1, () => disc(g, DCOL[s.k === 0 ? 0 : 1])));
  },
  hit(g, s, k) { launch(s, k, FRIS); swoosh(g, s, FRIS); },
};

/* =========================================================================
   13. 紙くずをゴミ箱へ（ゴミ箱がもぐもぐ）
   ========================================================================= */
const PAPER = { st: 'over', d: 70, hold: 'grip', sw: '#8cc0b6' };
const BINX = 500, BINB = 720, BINT = 480;
function paperBall(g) { g.blob([-32, -6, -24, -28, 4, -34, 30, -22, 34, 6, 20, 30, -8, 32, -30, 20], '#ffffff', 5); g.line([-16, -14, 4, -2, 20, -16], '#c3cad8', 4); g.line([-20, 12, 0, 4, 12, 22], '#c3cad8', 4); g.line([6, -30, 10, -12], '#c3cad8', 3); }
const tplPaper = {
  id: 'throw-paper', acts: ['throw'], modes: ['one', 'alt'], theme: 'home', sfx: 'swish',
  vars: [{ k: 'bin', name: '紙くずをゴミ箱へ', short: 'ゴミ箱' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      g.fx.burst(BINX, BINT, { n: 8, c: ['#ffffff', '#dfe6f2'], shape: 'square', sp: [200, 450], size: [8, 14], g: 1400 }); g.fx.shake(5, 0.1);
      if (f.k === 1) { g.fx.pop('モグモグ', 760, 360, { size: 86 }); g.sfx('pop'); }
      else { g.fx.pop('ごちそうさま！', 500, 150, { size: 88, c: C.yellow }); g.fx.hearts(BINX, BINT - 40, 6); g.fx.stars(BINX, BINT, 6); g.sfx('pop'); g.sfx('ding'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2), n = landed(s);
    // 部屋
    g.bg('#dff3ee'); g.stripes(V.x0 - 40, V.y0 - 10, V.x1 - V.x0 + 80, 720 - V.y0, 50, '#dff3ee', '#d2ece6');
    g.rr(90, 170, 250, 230, 12, '#ffffff', 7); g.rect(106, 186, 218, 198, g.lin(0, 186, 0, 384, ['#8fd8ff', '#d9f3ff']), 0); g.line([215, 186, 215, 384], '#ffffff', 8); g.line([106, 285, 324, 285], '#ffffff', 8); g.cloud(170, 250, 0.3); g.rect(106, 186, 218, 198, null, 5);
    g.rr(680, 230, 220, 22, 6, '#c98b52', 6); for (const [x, h, c] of [[696, 90, C.red], [726, 110, C.blue], [758, 80, C.green], [786, 100, C.yellow]]) g.rr(x, 230 - h, 26, h, 4, c, 5); g.at(860, 230, -0.2, 1, 1, () => g.rr(-16, -86, 30, 86, 4, C.purple, 5));
    g.band(720, 'bottom', '#d39457', 7); g.planks(V.x0 - 20, 726, V.x1 - V.x0 + 40, 600, 6, '#d39457');
    g.ell(BINX, BINB + 8, 230, 40, '#ff9fbd', 6); g.ell(BINX, BINB + 8, 180, 28, '#ffc4d8', 0);
    // ゴミ箱（顔つき）
    const ch = Math.max(l1 >= 0 && l1 < 0.6 ? Math.sin(l1 * 34) * (1 - l1 / 0.6) : 0, l2 >= 0 && l2 < 0.6 ? Math.sin(l2 * 34) * (1 - l2 / 0.6) : 0);
    const hop = l2 >= 0 ? -Math.abs(Math.sin(l2 * 14)) * 40 * Math.exp(-3 * l2) : 0;
    g.shadow(BINX, BINB + 6, 120, 14);
    g.at(BINX, BINB + hop, 0, 1 + 0.05 * ch, 1 - 0.05 * ch, () => {
      const T = BINT - BINB;
      g.ell(0, T, 122, 28, '#263066');
      for (let i = 0; i < Math.min(n, 2); i++) { const a = LA(s, i + 1), y = T + 8 + 26 * clamp(a / 0.1); g.at(i ? 36 : -30, y, i * 1.3, 0.7, 0.7, () => paperBall(g)); }
      for (const f of s.my.fl) if (!f.done && s.t >= f.t) { const q = (s.t - f.t) / f.d; if (q > 0.9) { const P = dropPos(f, q, BINX, BINT + 6, 1, 0.7); g.at(P.x - BINX, P.y - BINB, 0, P.s, P.s, () => paperBall(g)); f.hide = 1; } else f.hide = 0; }
      g.path(`M-122 ${T} Q0 ${T + 50} 122 ${T} L102 0 Q0 18 -102 0 Z`, '#4f8cff', 7);
      g.path(`M-122 ${T} Q0 ${T + 50} 122 ${T}`, null, 0); g.at(0, T, 0, 1, 1, () => { g.ell(0, 0, 122, 28, null, 7); });
      g.rr(-96, T + 46, 22, 150, 11, 'rgba(255,255,255,0.25)', 0);
      const ey = T + 104;
      if (l2 >= 0 || (l1 >= 0 && l1 < 0.6)) { g.arc(-44, ey, 16, PI + 0.4, -0.4, C.ol, 8); g.arc(44, ey, 16, PI + 0.4, -0.4, C.ol, 8); }
      else { g.circ(-44, ey, 15, '#ffffff', 5); g.circ(44, ey, 15, '#ffffff', 5); g.circ(-42, ey + 2, 7, C.ol, 0); g.circ(46, ey + 2, 7, C.ol, 0); }
      g.ell(-74, ey + 30, 16, 9, 'rgba(255,120,150,0.5)', 0); g.ell(74, ey + 30, 16, 9, 'rgba(255,120,150,0.5)', 0);
      if (ch !== 0) g.line([-30, ey + 46, -15, ey + 38 + 10 * ch, 0, ey + 46, 15, ey + 38 + 10 * ch, 30, ey + 46], C.ol, 7);
      else if (l2 >= 0) g.path(`M-30 ${ey + 34} Q0 ${ey + 80} 30 ${ey + 34} Z`, '#8a2f3f', 6);
      else g.ell(0, ey + 44, 20, 16, '#8a2f3f', 6);
    });
    flying(g, s, (f, q) => dropPos(f, q, BINX, BINT + 6, f.k === 1 ? 240 : 170, 0.7), (P, f, q) => { if (!f.hide) g.at(P.x, P.y, q * 8, P.s, P.s, () => paperBall(g)); });
    arms(g, s, PAPER, () => paperBall(g));
  },
  hit(g, s, k) { launch(s, k, PAPER); swoosh(g, s, PAPER); },
};

/* =========================================================================
   14. 釣りざおを投げる（2投目で鯛がかかる）
   ========================================================================= */
const W1 = [430, 540], W2 = [545, 470];
function rodPose(p) { return { x: lerp(700, 800, p), y: lerp(890, 950, p) - 30 * Math.sin(PI * p), r: lerp(-0.6, 0.6, p) }; }
const rodTip = (q, L = 600) => [q.x + Math.sin(q.r) * L, q.y - Math.cos(q.r) * L];
function bobber(g) { g.line([0, -20, 0, -38], C.ol, 5); g.circ(0, 0, 20, '#ffffff', 0); g.path('M-20 0 A20 20 0 0 1 20 0 Z', '#ff4f5e', 0); g.circ(0, 0, 20, null, 5); g.hl(-7, -9, 6, 3, -0.5, 0.7); }
function tai(g) {
  g.path('M-84 0 L-128 -40 L-116 0 L-128 40 Z', '#ff6b6b', 6);
  g.path('M-56 -40 L-40 -72 L-20 -50 L0 -78 L20 -54 L44 -70 L56 -38 Z', '#ff8f7f', 5);
  g.path('M92 0 C92 -42 40 -60 -20 -54 C-60 -48 -86 -22 -90 0 C-86 22 -60 48 -20 54 C40 60 92 42 92 0 Z', '#ff6b6b', 7);
  g.path('M90 6 C80 40 30 54 -20 50 C-50 46 -74 30 -84 10 C-40 30 30 34 90 6 Z', '#ffb3a8', 0);
  g.circ(54, -14, 11, '#ffffff', 4); g.circ(57, -14, 5, C.ol, 0); g.line([84, 8, 94, 2], C.ol, 5);
  for (const [x, y] of [[-40, -20], [-10, -28], [20, -24], [-26, 4], [6, 0]]) g.arc(x, y, 9, 0.3, PI - 0.3, '#e04848', 3);
}
const tplFish = {
  id: 'throw-fishing', acts: ['throw'], modes: ['one'], theme: 'sea', sfx: 'swoosh',
  vars: [{ k: 'tai', name: '釣りざおを投げる', short: '釣り' }],
  init: base(),
  draw(g, s) {
    const V = g.V, sd = s.side === 'L' ? 'L' : 'R', mx = x => g.mx(sd, x);
    tick(g, s, f => {
      const W = f.k === 1 ? W1 : W2;
      g.fx.splash(W[0], W[1], '#cfeeff', f.k === 1 ? 10 : 22); g.fx.ring(W[0], W[1], { c: '#ffffff', r0: 10, r1: 120, sy: 0.3 });
      if (f.k === 1) { g.fx.pop('ポチャン', 230, 400, { size: 88 }); g.sfx('bubble'); }
      else { g.fx.pop('つれた！', 500, 140, { size: 124, c: C.yellow }); g.fx.stars(W[0], W[1] - 120, 10); g.fx.shake(10, 0.16); g.sfx('splash'); g.sfx('cheer'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2);
    // 海と空
    g.bg('#bfe8ff'); g.sky('#6cc3f7', '#dff5ff', 340); g.sun(150, 110, 60);
    g.path('M680 340 Q740 300 800 300 Q860 300 900 340 Z', '#6aa86a', 5); g.rect(790, 250, 20, 54, '#ffffff', 5); g.rect(790, 266, 20, 12, '#e8343c', 0); g.tri(784, 252, 816, 252, 800, 232, '#e8343c', 5);
    for (const [x, y] of [[300, 160], [360, 190]]) g.path(`M${x - 22} ${y} Q${x - 11} ${y - 12} ${x} ${y} Q${x + 11} ${y - 12} ${x + 22} ${y}`, null, 5);
    g.rect(V.x0 - 10, 338, V.x1 - V.x0 + 20, 1300, g.lin(0, 338, 0, 900, ['#8fd8f5', '#2f86c9', '#1f5f9e']), 0); g.line([V.x0, 340, V.x1, 340], 'rgba(255,255,255,0.7)', 4);
    for (let i = 0; i < 14; i++) { const y = 370 + i * i * 3.2 + i * 18, x = ((i * 337 + s.t * 30 * (i % 2 ? 1 : -1)) % 1200) - 100, w = 30 + i * 6; g.arc(x, y + w * 0.5, w * 0.6, PI + 0.6, TAU - 0.6, 'rgba(255,255,255,0.55)', 3 + i * 0.3); }
    g.band(880, 'bottom', '#b97a48', 7); for (let x = Math.floor(V.x0 / 140) * 140; x < V.x1; x += 140) g.line([x, 880, x - 30, 1500], '#8a5634', 6); g.line([V.x0, 930, V.x1, 930], '#8a5634', 5);
    // うき（状態ごとの位置）
    const q = rodPose(s.p), tipL = rodTip(q), tip = [mx(tipL[0]), tipL[1]], hang = [tip[0] + Math.sin(s.t * 3) * 8, tip[1] + 86];
    let bob = hang, inWater = 0;
    const f1 = s.my.fl[0], f2 = s.my.fl[1];
    if (f2) { if (f2.done) { bob = null; } else bob = arcPos(f2, clamp((s.t - f2.t) / f2.d), W2[0], W2[1], 60, 0.5, 1); }
    else if (f1) {
      if (!f1.done) bob = arcPos(f1, clamp((s.t - f1.t) / f1.d), W1[0], W1[1], 120, 0.5, 1);
      else if (l1 < 0.42) { bob = { x: W1[0], y: W1[1] + 3 * Math.sin(l1 * 18), s: 0.5 }; inWater = 1; }
      else { const e = E.ioQ(clamp((l1 - 0.42) / 0.26)); bob = { x: lerp(W1[0], hang[0], e), y: lerp(W1[1], hang[1], e) - 80 * Math.sin(PI * e), s: lerp(0.5, 1, e) }; }
    }
    if (bob && bob.x === undefined) bob = { x: bob[0], y: bob[1], s: 1 };
    // 鯛
    let mouth = null;
    if (l2 >= 0) {
      const e = clamp(l2 / 0.5), x = W2[0] + (sd === 'L' ? 90 : -90) * e, y = W2[1] - 230 * Math.sin(PI * e * 0.9), r = (sd === 'L' ? 1 : -1) * (-0.7 + 1.6 * e);
      g.at(x, y, r, 0.9 * (sd === 'L' ? -1 : 1), 0.9, () => tai(g)); mouth = [x + Math.cos(r) * 84 * (sd === 'L' ? -1 : 1), y + Math.sin(r) * 84];
      g.at(W2[0], W2[1], 0, 1, 0.3, () => g.ring(0, 0, 60 + 200 * e, 'rgba(255,255,255,0.8)', 10));
    }
    if (inWater) g.alpha(1 - (l1 % 0.6) / 0.6, () => g.at(W1[0], W1[1] + 6, 0, 1, 0.3, () => g.ring(0, 0, 30 + (l1 % 0.6) * 140, '#ffffff', 6)));
    // 糸
    const end = mouth || (bob ? [bob.x, bob.y - 36 * bob.s] : null);
    if (end) { const mxp = (tip[0] + end[0]) / 2, myp = Math.max(tip[1], end[1]) + (bob && !inWater && !mouth ? 10 : 50); g.curve([tip[0], tip[1], mxp, myp, end[0], end[1]], 'rgba(255,255,255,0.9)', 3); }
    if (bob) g.at(bob.x, bob.y, 0, bob.s, bob.s, () => bobber(g));
    // さおと腕
    g.mirror(sd, () => {
      g.at(q.x, q.y, q.r, 1, 1, () => {
        g.taper(0, -40, 0, -600, 14, 6, '#3d5bd9'); g.line([-4, -60, -2, -560], 'rgba(255,255,255,0.35)', 3); for (const y of [-180, -320, -450, -560]) g.ring(0, y, 7 - y / -150, C.ol, 3);
        g.rr(-14, -60, 28, 150, 12, '#d9b07a', 6); g.circ(-30, 30, 24, '#b8c3d4', 6); g.circ(-30, 30, 9, '#7f8798', 0); g.line([-30, 30, -58, 14], C.ol, 6);
      });
      g.arm(q.x + 8, q.y + 6, -PI / 2 + 0.45 * q.r - 0.3, { hand: 'grip', s: 1.05 });
    });
  },
  hit(g, s, k) { s.my.fl.push({ k, t: s.t - s.age, d: flyT(s, k), side: s.lastSide, x0: g.mx(s.lastSide, rodTip(rodPose(0))[0]), y0: rodTip(rodPose(0))[1] + 86 }); },
};

/* =========================================================================
   15. 種まき（芽が出て、2回目で花がさく）
   ========================================================================= */
const SEED = { st: 'under', d: 62, hold: 'grip' };
const FLC = ['#ff5a7a', '#ffd23f', '#a77bff', '#ff9f1c', '#ff8fd0', '#5aa9ff', '#ffffff'];
function seedObj(g) { g.ell(0, 0, 12, 8, '#7a4e2a', 3); g.hl(-3, -3, 4, 2, -0.4, 0.6); }
function sprout(g, k) { g.line([0, 0, 0, -34 * k], '#3fae5a', 8); g.ell(-17, -32 * k, 18, 9, '#5cd16a', 4, -0.5); g.ell(17, -32 * k, 18, 9, '#5cd16a', 4, 0.5); }
const PETALS = circlesPath(Array.from({ length: 5 }, (_, i) => { const a = i / 5 * TAU - PI / 2; return [Math.cos(a) * 20, -86 + Math.sin(a) * 20, 15]; }));
let RIDGE = '', FURROW = ''; for (let i = -12; i <= 12; i++) { RIDGE += `M${500 + i * 40 - 10} 430L${500 + i * 40 + 10} 430L${500 + i * 300 + 90} 1500L${500 + i * 300 - 90} 1500Z`; FURROW += `M${500 + i * 40 + 10} 430L${500 + i * 300 + 90} 1500`; }
function flower(g, col) { g.line([0, 0, 0, -78], '#3fae5a', 9); g.ell(-18, -36, 20, 9, '#5cd16a', 4, -0.5); g.ell(18, -48, 20, 9, '#5cd16a', 4, 0.5); g.path(PETALS, col, 4); g.circ(0, -86, 12, '#ffb703', 4); }
const tplSeed = {
  id: 'throw-seed', acts: ['throw'], modes: ['one', 'alt'], theme: 'farm', sfx: 'swish',
  vars: [{ k: 'field', name: '畑に種をまく', short: '種まき' }],
  init: base(s => {
    s.my.sp = [0, 1].map(k => Array.from({ length: 6 }, (_, i) => { const y = 560 + (i % 3) * 95 + s.r() * 30, x = (k ? 545 : 215) + (Math.floor(i / 3) * 130) + (i % 3) * 24 + s.r() * 40; return [x, y, lerp(1.1, 1.9, (y - 540) / 300)]; }));
  }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      for (const [x, y] of s.my.sp[f.k - 1]) g.fx.burst(x, y, { n: 3, c: ['#8b5a3c', '#a26b45'], shape: 'dot', sp: [100, 260], size: [6, 10], g: 1500, life: [0.3, 0.5] });
      if (f.k === 1) { g.fx.pop('ポポポン', 250, 330, { size: 88 }); g.sfx('pop'); }
      else { g.fx.pop('さいた！', 500, 160, { size: 124, c: C.yellow }); g.fx.stars(500, 560, 10); g.sfx('magic'); }
    });
    g.bg('#cdeeff'); g.sky('#73c3f5', '#e4f6ff', 440); g.sun(820, 120, 70);
    g.cloud(220, 140, 0.6); g.cloud(-160, 210, 0.5); g.cloud(1180, 160, 0.6);
    g.hills(440, '#8ed36b', 50, 7, 4);
    g.path('M150 360 L150 300 L210 260 L270 300 L270 360 Z', '#e8574f', 6); g.rect(190, 320, 40, 40, '#ffffff', 5);
    g.band(430, 'bottom', '#8b5a3c', 7);
    g.path(RIDGE, '#a26b45', 0); inkd(g, 'rgba(60,30,20,0.22)', () => g.path(FURROW, null, 5));
    // 芽と花
    const L2 = s.my.L[2];
    for (let k = 0; k < 2; k++) {
      const T = s.my.L[k + 1]; if (T === undefined) continue;
      s.my.sp[k].forEach(([x, y, sc], i) => {
        const a = s.t - T - i * 0.015, b = L2 === undefined ? -1 : s.t - L2 - (k * 6 + i) * 0.008;
        if (a < 0) return;
        g.ell(x, y, 22 * sc, 8 * sc, '#6e4429', 0);
        if (b >= 0) { const e = E.outBack(clamp(b / 0.16)); g.at(x, y, 0, sc * e, sc * e, () => flower(g, FLC[(k * 3 + i) % FLC.length])); }
        else { const e = E.outBack(clamp(a / 0.18)); g.at(x, y, 0, sc, sc, () => sprout(g, e)); }
      });
    }
    // 飛ぶ種（1つぶずつ自分の場所へ）
    flying(g, s, (f, q) => ({ q }), (P, f) => { const q = P.q, e = E.outQ(q); for (const [x, y, sc] of s.my.sp[f.k - 1]) g.at(lerp(f.x0, x, e), lerp(f.y0, y, e) - (f.k === 1 ? 160 : 80) * 4 * q * (1 - q), q * 9, lerp(0.9, sc, e), lerp(0.9, sc, e), () => seedObj(g)); }, 0.5);
    arms(g, s, SEED, () => { for (const [x, y] of [[-14, -6], [8, -12], [0, 6], [16, 4], [-6, -20]]) g.at(x, y, x * 0.1, 1, 1, () => seedObj(g)); });
  },
  hit(g, s, k) { launch(s, k, SEED); swoosh(g, s, SEED); },
};

/* =========================================================================
   16. 手裏剣（2本目で的が真っ二つ）
   ========================================================================= */
const SHUR = { st: 'over', d: 66, hold: 'pinch', front: 1 };
const LX = 500, LY = 430, LR = 175;
function shuriken(g, rot = 0) { g.at(0, 0, rot, 1, 1, () => { g.star(0, 0, 46, 14, 4, '#a9b4c6', 6); g.star(0, 0, 30, 10, 4, '#cfd6e2', 0, -PI / 2 + 0.3); g.circ(0, 0, 9, '#2b2140', 0); }); }
function logFace(g) {
  g.circ(0, 0, LR, '#8a5a36'); g.circ(0, 0, LR - 20, '#f0c98a', 0);
  for (const r of [125, 88, 52]) g.ring(0, 0, r, '#d8a666', 6);
  g.circ(0, 0, 22, '#e8343c', 0); g.ring(0, 0, 40, '#e8343c', 8);
  g.line([40, -110, 70, -70], '#c9935a', 5); g.line([-100, 60, -60, 40], '#c9935a', 5);
  g.circ(0, 0, LR, null);
}
const tplShur = {
  id: 'throw-shuriken', acts: ['throw'], modes: ['one', 'alt'], theme: 'dojo', sfx: 'swoosh',
  vars: [{ k: 'log', name: '手裏剣を投げる', short: '手裏剣' }],
  init: base(s => { s.my.ff = Array.from({ length: 9 }, () => [s.r(), s.r(), s.r() * TAU]); }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      if (f.k === 1) { g.fx.chips(430, 360, '#f0c98a', 10); g.fx.pop('カッ', 240, 300, { size: 110 }); g.fx.shake(6, 0.1); g.sfx('chop'); }
      else { g.fx.chips(LX, LY, '#f0c98a', 14); g.fx.burst(LX, LY, { n: 14, c: ['#7fd67a', '#4cb050'], shape: 'leaf', sp: [250, 650], size: [14, 22], g: 500, life: [0.6, 1] }); g.fx.lines(LX, LY, { n: 12, r0: 160, r1: 300, w: 12 }); g.fx.pop('スパーン！', 500, 130, { size: 116, c: C.yellow }); g.fx.shake(12, 0.18); g.sfx('break'); }
    });
    const l1 = LA(s, 1), l2 = LA(s, 2);
    g.bg('#14244a', '#25406a');
    g.glow(790, 150, 200, '#fff6c8', 0.35); g.circ(790, 150, 74, '#fff3c4', 0); g.circ(770, 132, 14, '#f0e2a8', 0); g.circ(812, 172, 10, '#f0e2a8', 0);
    for (const [fx, fy, ph] of s.my.ff) { const x = V.x0 + fx * (V.x1 - V.x0), y = 200 + fy * 540 + Math.sin(s.t * 2 + ph) * 16; g.glow(x, y, 18, '#e8ff8a', 0.7); g.circ(x, y, 4, '#f4ffc0', 0); }
    for (const x of [-420, -300, -180, 60, 150, 860, 940, 1180, 1300, 1420]) if (x > V.x0 - 60 && x < V.x1 + 60) {
      const w = x % 3 ? 44 : 36; g.rect(x - w / 2, V.y0 - 10, w, 830 - V.y0, '#3f8f5a', 6); g.rect(x - w / 2 + 6, V.y0 - 10, 8, 830 - V.y0, 'rgba(255,255,255,0.2)', 0);
      inkd(g, '#2b6b42', () => g.path(vpath(s, 'bj' + x, V, () => { let d = ''; for (let y = Math.floor(V.y0 / 150) * 150 + 40; y < 820; y += 150) d += `M${x - w / 2} ${y}h${w}`; return d; }), null, 6));
      g.path(`M${x + w / 2} ${200 + (x % 7) * 10} q60 -10 100 20 q-56 6 -100 -20 Z`, '#4caa62', 4);
    }
    g.band(800, 'bottom', '#223b2c', 7); g.grassTufts(806, '#2f5a3c', 4, 9);
    // 台と丸太
    g.rect(LX - 80, LY + 100, 22, 320, '#5a3a22', 6); g.rect(LX + 58, LY + 100, 22, 320, '#5a3a22', 6); g.rect(LX - 110, 790, 220, 24, '#5a3a22', 6);
    g.shadow(LX, 806, 150, 14, 0.3);
    const sp = l2 >= 0 ? E.inQ(clamp(l2 / 0.4)) : 0, wob = jig(l1, 0.05, 30, 9);
    for (const side of [-1, 1]) g.at(LX + side * (6 + 220 * sp), LY + 260 * sp * sp + 40 * sp, side * 0.9 * sp + wob, 1, 1, () => {
      g.clipRR(side < 0 ? -LR - 10 : 0, -LR - 10, LR + 10, 2 * LR + 20, 0, () => logFace(g));
      if (side < 0 && l1 >= 0) g.at(-70, -70, 0.4, 0.8, 0.8, () => shuriken(g));
      if (l2 >= 0) g.line([0, -LR, 0, LR], '#6e4429', 6);
    });
    if (l2 >= 0) g.at(LX, LY + 900 * sp * sp, 2 * sp, 0.8, 0.8, () => shuriken(g));
    flying(g, s, (f, q) => f.k === 1 ? arcPos(f, q, 430, 360, 50, 0.8) : arcPos(f, q, LX, LY, 20, 0.8), (P, f, q) => g.at(P.x, P.y, 0, P.s, P.s, () => shuriken(g, q * 30)));
    arms(g, s, SHUR, () => g.at(0, -10, 0, 0.9, 0.9, () => shuriken(g, 0.3)));
  },
  hit(g, s, k) { launch(s, k, SHUR); swoosh(g, s, SHUR); },
};


/* =========================================================================
   17. 鯉にえさ（上から見た池）
   ========================================================================= */
const FOOD = { st: 'under', d: 58, hold: 'grip' };
const FP = [500, 540];
const POND = (() => { const f = [1, 0.92, 1.05, 0.95, 1.02, 0.9, 1.04, 0.96, 1, 0.93, 1.06, 0.97], p = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; p.push(500 + Math.cos(a) * 420 * f[i], 530 + Math.sin(a) * 340 * f[i]); } return p; })();
const KOIS = [
  ['#ffffff', '#ffe1d2', [[34, -6, 20, '#ff5a2a'], [-6, 8, 17, '#ff5a2a'], [-44, -4, 12, '#ff5a2a']]],
  ['#ff8a2a', '#ffc08a', [[22, 0, 15, '#ffb35a'], [-30, 6, 12, '#ffd08a']]],
  ['#ffffff', '#f2f2f2', [[26, -8, 14, C.ol], [-4, 10, 16, '#ff5a2a'], [-42, -2, 10, C.ol]]],
  ['#ffd23f', '#ffe88a', [[0, -4, 24, '#ffe68a']]],
  ['#3b3550', '#5d5775', [[22, 0, 16, '#ff8a2a'], [-28, 4, 12, '#ffffff']]],
];
const KOIP = 'M76 0 C76 -24 30 -30 -14 -24 C-46 -18 -64 -8 -74 0 C-64 8 -46 18 -14 24 C30 30 76 24 76 0 Z';
function koi(g, [body, fin, spots], mouth, wig) {
  g.at(-70, 0, wig, 1, 1, () => g.path('M4 0 L-42 -32 Q-28 0 -42 32 Z', fin, 4));
  g.ell(24, -26, 22, 8, fin, 4, -0.7); g.ell(24, 26, 22, 8, fin, 4, 0.7);
  g.path(KOIP, body, 0);
  g.clipPath(KOIP, () => { for (const [x, y, r, c] of spots) g.circ(x, y, r, c, 0); });
  g.path(KOIP, null, 5);
  g.circ(56, -12, 4, C.ol, 0); g.circ(56, 12, 4, C.ol, 0);
  if (mouth > 0) g.ell(76, 0, 5 + 5 * mouth, 7 + 6 * mouth, '#6b2433', 3);
}
function pellets(g, n, spread) { for (let i = 0; i < n; i++) { const a = i * 2.4, r = (i ? 8 + (i % 3) * 8 : 0) * spread; g.circ(Math.cos(a) * r, Math.sin(a) * r * 0.8, 7, '#a8693a', 3); } }
const tplKoi = {
  id: 'throw-koi', acts: ['throw'], modes: ['one', 'alt'], theme: 'nature', sfx: 'swish',
  vars: [{ k: 'pond', name: '鯉にえさをやる', short: '鯉のえさ' }],
  init: base(s => { s.my.k = KOIS.map((c, i) => ({ c, cx: 500 + (s.r() - 0.5) * 160, cy: 530 + (s.r() - 0.5) * 110, R: 150 + s.r() * 80, w: (i % 2 ? -1 : 1) * (0.6 + s.r() * 0.35), ph: s.r() * TAU, grp: i < 3 ? 1 : 2, b: -PI / 2 + i * TAU / 5 + 0.3 })); }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      g.fx.burst(FP[0], FP[1], { n: 10, c: ['#ffffff', '#bfefff'], shape: 'drop', sp: [150, 400], size: [8, 14], g: 1500, life: [0.3, 0.6] });
      if (f.k === 1) { g.fx.pop('ポチャ', 240, 160, { size: 92 }); g.sfx('bubble'); }
      else { g.fx.pop('パクパク！', 500, 130, { size: 116, c: C.yellow }); g.fx.splash(FP[0], FP[1], '#bfefff', 16); g.fx.hearts(FP[0], FP[1] - 60, 6); g.sfx('splash'); }
    });
    g.bg('#79bf62');
    for (let i = 0; i < 18; i++) { const x = V.x0 + ((i * 173) % 1000) / 1000 * (V.x1 - V.x0), y = V.y0 + ((i * 397) % 1000) / 1000 * (V.y1 - V.y0); g.circ(x, y, 26 + (i % 3) * 10, '#6db357', 0); }
    // 池
    g.blob(POND, '#7a8494', 0); g.at(500, 530, 0, 0.94, 0.93, () => g.at(-500, -530, () => g.blob(POND, g.rad(500, 530, 40, 420, ['#4fb8c9', '#2f8a9e', '#1f6b80']), 0)));
    const ST = [[0, 1.02], [1, 1.0], [2, 1.0], [3, 1.03], [4, 1.0], [5, 1.02], [6, 1.0], [7, 1.0], [8, 1.02], [9, 1.0], [10, 1.0], [11, 1.02]];
    for (const [i, k] of ST) { const x = POND[i * 2], y = POND[i * 2 + 1]; g.ell(lerp(500, x, k), lerp(530, y, k), 46 + (i % 3) * 10, 34 + (i % 2) * 8, i % 2 ? '#a3abbd' : '#b8bfcc', 6, i); }
    for (const [x, y, r, fl] of [[260, 380, 46, 0], [740, 690, 52, 0], [720, 300, 44, 1], [300, 720, 40, 0]]) {
      g.path(`M${x} ${y} L${x + r * Math.cos(0.3)} ${y + r * Math.sin(0.3)} A${r} ${r} 0 1 1 ${x + r * Math.cos(-0.3)} ${y + r * Math.sin(-0.3)} Z`, '#4cae5a', 5);
      g.line([x, y, x - r * 0.7, y - r * 0.4], '#3c9a4c', 3); g.line([x, y, x - r * 0.6, y + r * 0.5], '#3c9a4c', 3);
      if (fl) { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.ell(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 16, 9, '#ffb3d0', 3, a); } g.circ(x, y, 9, C.yellow, 3); }
    }
    // 波紋とえさ
    for (const k of [1, 2]) {
      const a = LA(s, k); if (a < 0) continue;
      for (const d of [0, 0.25]) { const b = a - d; if (b > 0 && b < 1.1) g.alpha(1 - b / 1.1, () => g.at(FP[0], FP[1], 0, 1, 0.8, () => g.ring(0, 0, 20 + 150 * E.outQ(b / 1.1), '#e6fbff', 6))); }
      g.alpha(1 - clamp((a - (k === 1 ? 0.45 : 0.2)) / 0.3), () => g.at(FP[0] + (k === 1 ? -10 : 14), FP[1] + (k === 1 ? 6 : -8), 0, 1, 1, () => pellets(g, 8, 1.8)));
    }
    // 鯉
    s.my.k.forEach((K, i) => {
      const th = K.ph + K.w * s.t, cx = K.cx + K.R * Math.cos(th), cy = K.cy + 0.72 * K.R * Math.sin(th);
      const hd0 = Math.atan2(0.72 * K.R * Math.cos(th) * K.w, -K.R * Math.sin(th) * K.w);
      const T = s.my.L[K.grp], gt = T === undefined ? 0 : E.ioQ(clamp((s.t - T) / (K.grp === 1 ? 0.5 : 0.28)));
      const tx = FP[0] + Math.cos(K.b) * 96, ty = FP[1] + Math.sin(K.b) * 84;
      const x = lerp(cx, tx, gt), y = lerp(cy, ty, gt), hd = lerpAng(hd0, K.b + PI, E.sm(clamp(gt * 1.6)));
      const mouth = gt > 0.7 ? 0.5 + 0.5 * Math.sin(s.t * 22 + i * 2) : 0;
      g.ell(x + 10, y + 14, 74, 24, 'rgba(0,40,60,0.2)', 0, hd);
      g.at(x, y, hd, 0.95, 0.95, () => koi(g, K.c, mouth, Math.sin(s.t * (gt > 0.5 ? 18 : 9) + i) * 0.28));
    });
    flying(g, s, (f, q) => arcPos(f, q, FP[0], FP[1], f.k === 1 ? 120 : 50, 0.7), (P, f, q) => g.at(P.x, P.y, 0, P.s, P.s, () => pellets(g, 8, 1 + q * 1.4)), 0.6);
    arms(g, s, FOOD, () => pellets(g, 6, 1));
  },
  hit(g, s, k) { launch(s, k, FOOD); swoosh(g, s, FOOD); },
};

/* =========================================================================
   18. 空き缶たおし
   ========================================================================= */
const CANB = { st: 'over', d: 66, hold: 'grip' };
const CANS = [[430, 560], [500, 560], [570, 560], [465, 464], [535, 464], [500, 368]];
const CANC = ['#e8343c', '#3a86ff', '#3cc46b', '#ffb703', '#a77bff', '#ff6b9d'];
function canObj(g, col) { g.rr(-35, -96, 70, 96, 10, col); g.rect(-35, -66, 70, 30, '#ffffff', 0); g.rect(-35, -58, 70, 12, sh(col, 0.15), 0); g.rr(-35, -96, 70, 96, 10, null); g.ell(0, -94, 33, 8, '#dfe4ec', 4); g.rect(-24, -86, 8, 74, 'rgba(255,255,255,0.35)', 0); }
function tball(g) { g.circ(0, 0, 32, '#d4f03c'); g.arc(-34, 0, 26, -0.9, 0.9, '#ffffff', 5); g.arc(34, 0, 26, PI - 0.9, PI + 0.9, '#ffffff', 5); g.circ(0, 0, 32, null, 5); g.hl(-10, -12, 8, 4, -0.5, 0.6); }
const tplCan = {
  id: 'throw-cans', acts: ['throw'], modes: ['one', 'alt'], theme: 'game', sfx: 'whoosh',
  vars: [{ k: 'tower', name: '空き缶をたおす', short: '缶たおし' }],
  init: base(s => { s.my.cv = CANS.map(([x]) => [(x - 500) * 6 + (s.r() - 0.5) * 300, -(560 + s.r() * 380), (s.r() < 0.5 ? -1 : 1) * (7 + s.r() * 9)]); }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      const y = f.k === 1 ? 330 : 510;
      g.fx.lines(500, y, { n: 12, r0: 80, r1: 180, w: 10 }); g.fx.burst(500, y, { n: 10, c: ['#ffffff', C.yellow], shape: 'spark', sp: [400, 900], size: [12, 22] }); g.sfx('clang'); g.fx.shake(f.k === 2 ? 11 : 7, 0.14);
      if (f.k === 1) g.fx.pop('カコーン', 240, 250, { size: 92 });
      else { g.fx.pop('パーフェクト！', 500, 140, { size: 100, c: C.yellow }); g.fx.confetti(60); g.fx.stars(500, 470, 8); g.sfx('cheer'); }
    });
    g.bg('#c7ecff'); g.sky('#78c8f8', '#dcf3ff', 320); g.cloud(800, 110, 0.7); g.cloud(1180, 170, 0.6); g.cloud(-200, 120, 0.6);
    g.circ(150, 210, 150, '#3f9e5a', 0); g.circ(40, 160, 110, '#4cae62', 0); g.circ(240, 140, 90, '#4cae62', 0);
    for (const odd of [0, 1]) g.path(vpath(s, 'fence' + odd, V, () => { let d = ''; for (let x = Math.floor((V.x0 - 70) / 70) * 70; x < V.x1 + 70; x += 70) if ((Math.abs(Math.round(x / 70)) % 2) === odd) d += `M${x + 4} 660L${x + 4} 300L${x + 35} 268L${x + 66} 300L${x + 66} 660Z`; return d; }), odd ? '#e2b47e' : '#d8a970', 5);
    g.rect(V.x0 - 10, 380, V.x1 - V.x0 + 20, 26, '#b9824e', 5); g.rect(V.x0 - 10, 560, V.x1 - V.x0 + 20, 26, '#b9824e', 5);
    g.band(650, 'bottom', '#7ccf5a', 7); g.grassTufts(700, '#6cbf4f', 2, 10);
    // 木箱
    g.shadow(500, 730, 170, 18);
    const bx = jig(LA(s, 2), 10, 30, 8);
    g.at(bx, 0, () => { g.wood(370, 560, 260, 170, '#c98b52', 8, 7); g.line([370, 645, 630, 645], '#8a5634', 6); for (const [x, y] of [[388, 578], [612, 578], [388, 712], [612, 712]]) g.circ(x, y, 6, '#7a4a2a', 0); });
    // 缶
    const order = [0, 1, 2, 3, 4, 5];
    for (const i of order) {
      const T = i >= 3 ? s.my.L[1] : s.my.L[2], [x, y] = CANS[i];
      const a = T === undefined ? -1 : s.t - T - (i >= 3 ? (5 - i) * 0.02 : Math.abs(x - 500) * 0.0004);
      if (a < 0) { g.at(x + (i < 3 ? bx : 0), y, 0, 1, 1, () => canObj(g, CANC[i])); continue; }
      if (a > 1.1) continue;
      const [vx, vy, vr] = s.my.cv[i];
      g.at(x + vx * a, y - 48 + vy * a + 1500 * a * a, vr * a, 1, 1, () => g.at(0, 48, () => canObj(g, CANC[i])));
    }
    // 当たって落ちるボール
    for (const f of s.my.fl) if (f.done) { const a = s.t - (f.t + f.d); if (a < 0.6) g.at(500 + (f.side === 'L' ? 1 : -1) * 120 * a, (f.k === 1 ? 330 : 510) - 300 * a + 1800 * a * a, 0, 0.5, 0.5, () => tball(g)); }
    flying(g, s, (f, q) => f.k === 1 ? arcPos(f, q, 500, 330, 90, 0.5) : arcPos(f, q, 500, 510, 30, 0.5), (P, f, q) => g.at(P.x, P.y, q * 8, P.s, P.s, () => tball(g)));
    arms(g, s, CANB, () => tball(g));
  },
  hit(g, s, k) { launch(s, k, CANB); swoosh(g, s, CANB); },
};

/* =========================================================================
   19. 玉入れ（運動会）
   ========================================================================= */
const TAMA = { st: 'over', d: 64, hold: 'grip' };
const BKX = 500, BKY = 262;
function tama(g, col = '#e8343c') { g.circ(0, 0, 30, col); g.curve([-20, -14, 0, -5, 20, -14], sh(col, 0.45), 4); g.curve([-20, 14, 0, 5, 20, 14], sh(col, 0.45), 4); g.circ(0, 0, 30, null, 5); g.hl(-10, -12, 8, 4, -0.5, 0.5); }
const BAG = `M${BKX - 130} ${BKY} Q${BKX - 118} ${BKY + 160} ${BKX} ${BKY + 172} Q${BKX + 118} ${BKY + 160} ${BKX + 130} ${BKY} Z`;
const HEAP = [[-60, 112], [-20, 122], [20, 120], [60, 108], [-80, 76], [-40, 86], [0, 90], [40, 86], [80, 74], [-60, 50], [-20, 56], [20, 54], [60, 48], [-36, 22], [6, 24], [44, 20], [-70, -2], [-18, -6], [30, -8], [74, -4], [-46, -30], [4, -34], [52, -28], [-14, -58], [30, -56]];
const tplTama = {
  id: 'throw-tamaire', acts: ['throw'], modes: ['one', 'alt'], theme: 'school', sfx: 'swish',
  vars: [{ k: 'basket', name: '玉入れ', short: '玉入れ' }],
  init: base(),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      g.fx.burst(BKX, BKY, { n: 8, c: ['#ffffff', '#ffd0d0'], shape: 'dot', sp: [200, 450], size: [8, 14], g: 1200 }); g.sfx('thud'); g.fx.shake(5, 0.1);
      if (f.k === 1) g.fx.pop('ポスッ', 240, 230, { size: 92 });
      else { g.fx.pop('やったー！', 500, 110, { size: 116, c: C.yellow }); g.fx.confetti(70); g.fx.stars(BKX, BKY, 8); g.sfx('whistle'); }
    });
    const n = landed(s), l2 = LA(s, 2);
    g.bg('#bfe6ff'); g.sky('#64bdf5', '#d6f1ff', 470); g.cloud(180, 200, 0.6); g.cloud(900, 160, 0.5);
    // 万国旗
    for (const [xa, xb] of [[V.x0 - 40, 500], [500, V.x1 + 40]]) {
      const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(lerp(xa, xb, t), 70 + 60 * 4 * t * (1 - t)); } g.curve(pts, C.ol, 4);
      const cols = [C.red, C.yellow, C.blue, C.green, '#ffffff', C.purple];
      for (let c = 0; c < 6; c++) g.path(vpath(s, 'flag' + c + (xa > 0 ? 'b' : 'a'), V, () => { const nf = Math.floor((xb - xa) / 64); let d = ''; for (let i = 1; i < nf; i++) if ((i + (xa > 0 ? 3 : 0)) % 6 === c) { const t = i / nf, x = lerp(xa, xb, t), y = 70 + 60 * 4 * t * (1 - t); d += `M${x - 20} ${y}L${x + 20} ${y}L${x} ${y + 42}Z`; } return d; }), cols[c], 4);
    }
    // 校舎
    g.rect(V.x0 - 10, 300, V.x1 - V.x0 + 20, 170, '#f5ead2', 7);
    g.path(vpath(s, 'win', V, () => { let d = ''; for (let x = Math.floor((V.x0 - 60) / 120) * 120 + 20; x < V.x1 + 60; x += 120) for (const y of [322, 396]) d += `M${x} ${y}h80v54h-80Z`; return d; }), '#a8dcff', 5);
    g.rect(700, 210, 120, 92, '#f5ead2', 7); g.circ(760, 256, 34, '#ffffff', 6); g.line([760, 256, 760, 234], C.ol, 5); g.line([760, 256, 778, 262], C.ol, 5);
    g.band(468, 'bottom', '#e3b77e', 7);
    g.at(500, 760, 0, 1, 0.25, () => g.ring(0, 0, 700, '#ffffff', 22));
    // ポールとかご
    g.rect(484, BKY + 140, 32, 700, '#e8e2c8', 6); for (let y = BKY + 220; y < 820; y += 120) g.line([484, y, 516, y], '#c9c0a0', 5);
    g.shadow(500, 820, 60, 12);
    g.at(BKX, BKY, 0, 1, 0.24, () => g.arc(0, 0, 130, PI, TAU, '#e8343c', 14));
    const cnt = 9 + n * 6 + (l2 >= 0 ? Math.floor(4 * clamp(l2 / 0.15)) : 0);
    g.path(BAG, 'rgba(255,255,255,0.35)', 0);
    g.clipPath(`M${BKX - 160} ${BKY - 140} L${BKX + 160} ${BKY - 140} L${BKX + 160} ${BKY + 180} L${BKX - 160} ${BKY + 180} Z`, () => {
      for (let i = 0; i < Math.min(cnt, HEAP.length); i++) { const [x, y] = HEAP[i]; g.circ(BKX + x * 1.15, BKY + y * 1.15, 27, i % 5 ? '#e8343c' : '#ff5a5a', 5); }
    });
    g.clipPath(BAG, () => { for (let i = -6; i <= 6; i++) { g.line([BKX + i * 25, BKY, BKX + i * 16, BKY + 180], 'rgba(255,255,255,0.9)', 4); } for (let j = 1; j < 7; j++) g.line([BKX - 140, BKY + j * 26, BKX + 140, BKY + j * 26], 'rgba(255,255,255,0.9)', 4); });
    g.path(BAG, null, 5);
    g.at(BKX, BKY, 0, 1, 0.24, () => { g.arc(0, 0, 130, 0, PI, C.ol, 22); g.arc(0, 0, 130, 0, PI, '#e8343c', 14); });
    flying(g, s, (f, q) => dropPos(f, q, BKX + (f.k === 1 ? -20 : 20), BKY - 10, f.k === 1 ? 260 : 200, 0.9), (P, f, q) => g.at(P.x, P.y, q * 6, P.s, P.s, () => tama(g)));
    arms(g, s, TAMA, () => tama(g));
  },
  hit(g, s, k) { launch(s, k, TAMA); swoosh(g, s, TAMA); },
};

/* =========================================================================
   20. ペンキ風船アート
   ========================================================================= */
const PNT = { st: 'over', d: 80, hold: 'grip', sw: '#c9a77e' };
const CVX = 290, CVY = 200, CVW = 420, CVH = 330;
const PC = ['#ff4f6d', '#3a86ff'], PS = [[430, 330], [570, 410]];
const tplPaint = {
  id: 'throw-paint', acts: ['throw'], modes: ['one', 'alt'], theme: 'party', sfx: 'whoosh',
  vars: [{ k: 'canvas', name: 'ペンキ風船アート', short: 'ペンキ' }],
  init: base(s => { s.my.sp = [splatPts(s.r, 16, 46, 104), splatPts(s.r, 16, 42, 96)]; s.my.dr = [0, 1].map(() => [[-40 + s.r() * 20, 90 + s.r() * 60], [0 + s.r() * 20, 120 + s.r() * 80], [40 + s.r() * 20, 70 + s.r() * 50]]); s.my.dt = [0, 1].map(() => Array.from({ length: 6 }, () => [(s.r() - 0.5) * 300, (s.r() - 0.5) * 220, 6 + s.r() * 10])); }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      const [x, y] = PS[f.k - 1];
      g.fx.burst(x, y, { n: 18, c: [PC[f.k - 1], sh(PC[f.k - 1], 0.3)], shape: 'drop', sp: [300, 800], size: [10, 20], g: 1800 }); g.sfx('squish'); g.fx.shake(8, 0.12);
      if (f.k === 1) g.fx.pop('ベチャッ', 200, 150, { size: 92 });
      else { g.fx.pop('げいじゅつ！', 500, 110, { size: 108, c: C.yellow }); g.fx.stars(500, 360, 12); g.sfx('magic'); }
    });
    const l2 = LA(s, 2);
    g.bg('#f6efe2');
    for (const [x, y, r, c] of [[120, 120, 30, '#ffd23f'], [880, 200, 24, '#3cc46b'], [80, 520, 20, '#ff9fbd'], [930, 560, 32, '#8e5cff'], [-160, 300, 40, '#ff9f1c'], [1170, 330, 40, '#2ec4b6']]) { g.circ(x, y, r, c, 0); g.circ(x + r * 1.3, y + r * 0.8, r * 0.35, c, 0); }
    g.band(780, 'bottom', '#c9935f', 7); g.planks(V.x0 - 20, 786, V.x1 - V.x0 + 40, 400, 4, '#c9935f');
    g.ell(500, 860, 330, 50, '#e8e2d6', 6);
    // ペンキ缶
    for (const [x, c] of [[160, '#ff4f6d'], [850, '#3a86ff']]) { g.rr(x - 50, 760, 100, 110, 12, '#cfd6e2', 6); g.rr(x - 50, 760, 100, 26, 12, c, 6); g.path(`M${x - 30} 786 q6 30 12 0 Z`, c, 0); }
    // イーゼル
    g.cap(360, 880, 430, 170, 13, '#b5793f'); g.cap(640, 880, 570, 170, 13, '#b5793f'); g.cap(500, 140, 500, 760, 12, '#9c6430');
    g.rr(300, 540, 400, 26, 8, '#b5793f', 6);
    // キャンバス
    const gold = l2 >= 0 ? E.outQ(clamp(l2 / 0.15)) : 0;
    if (gold) g.glow(500, 365, 360 * gold, '#fff2a0', 0.6);
    g.rr(CVX - 20, CVY - 20, CVW + 40, CVH + 40, 8, gold ? g.mix('#a86a34', '#ffc83d', gold) : '#a86a34', 7);
    g.rect(CVX, CVY, CVW, CVH, '#ffffff', 5);
    g.clipRR(CVX, CVY, CVW, CVH, 0, () => {
      for (const k of [1, 2]) {
        const a = LA(s, k); if (a < 0) continue;
        const [x, y] = PS[k - 1], c = PC[k - 1], e = E.outBack(clamp(a / 0.1));
        for (const [dx, len] of s.my.dr[k - 1]) g.cap(x + dx, y, x + dx, y + len * clamp(a / 0.6), 12, c, 0);
        g.at(x, y, 0, e, e, () => { g.blob(s.my.sp[k - 1], c, 0); g.circ(-14, -16, 18, sh(c, 0.3), 0); });
        for (const [dx, dy, r] of s.my.dt[k - 1]) g.circ(x + dx * e, y + dy * e, r, c, 0);
      }
      if (gold) for (const [x, y, c] of [[350, 480, C.yellow], [640, 260, '#3cc46b'], [330, 250, '#8e5cff']]) g.circ(x, y, 22 * gold, c, 0);
    });
    g.rect(CVX, CVY, CVW, CVH, null, 5);
    flying(g, s, (f, q) => arcPos(f, q, PS[f.k - 1][0], PS[f.k - 1][1], f.k === 1 ? 120 : 50, 0.46), (P, f, q) => g.at(P.x, P.y, q * 2, P.s, P.s, () => wballoon(g, PC[f.k - 1], Math.sin(q * 30) * 0.08)));
    arms(g, s, PNT, () => wballoon(g, PC[s.k === 0 ? 0 : 1]));
  },
  hit(g, s, k) { launch(s, k, PNT); swoosh(g, s, PNT); },
};

/* =========================================================================
   21. 星を投げて星座をつくる（ハートの星座）
   ========================================================================= */
const STARH = { st: 'over', d: 72, hold: 'grip' };
const HP = [[500, 285], [604, 196], [700, 268], [650, 410], [500, 545], [350, 410], [300, 268], [396, 196]];
const MISS = [2, 6];
function starObj(g, rot = 0) { g.glow(0, 0, 80, '#fff3a0', 0.55); g.star(0, 0, 42, 19, 5, '#ffe066', 5, rot - PI / 2); g.hl(-10, -14, 9, 5, -0.5, 0.6); }
const tplStar = {
  id: 'throw-star', acts: ['throw'], modes: ['one', 'alt'], theme: 'space', sfx: 'swish',
  vars: [{ k: 'heart', name: '星座をつくる', short: '星座' }],
  init: base(s => { s.my.bg = Array.from({ length: 40 }, () => [s.r(), s.r(), 2 + s.r() * 4, s.r() * TAU]); }),
  draw(g, s) {
    const V = g.V;
    tick(g, s, f => {
      const [x, y] = HP[MISS[f.k - 1]];
      g.fx.ring(x, y, { c: '#fff3a0', r0: 10, r1: 150, w: 10 }); g.fx.burst(x, y, { n: 12, c: ['#fff6c0', '#ffe066'], shape: 'star', sp: [200, 500], size: [10, 20], g: 300 });
      if (f.k === 1) { g.fx.pop('キラーン', 740, 110, { size: 92, c: '#fff3a0' }); g.sfx('chime'); }
      else { g.fx.pop('かんせい！', 500, 110, { size: 120, c: '#ff9fc8' }); g.fx.stars(500, 380, 12); g.fx.flash('#ffe3f0', 0.3, 0.2); g.sfx('magic'); }
    });
    const l2 = LA(s, 2), done = l2 >= 0 ? E.outQ(clamp(l2 / 0.16)) : 0;
    g.bg('#0f1642', '#3a2a70');
    for (const [x, y, r, ph] of s.my.bg) g.alpha(0.45 + 0.45 * Math.sin(s.t * 3 + ph), () => g.circ(V.x0 + x * (V.x1 - V.x0), V.y0 + y * (820 - V.y0), r, '#ffffff', 0));
    g.circ(150, 140, 60, '#fff3c4', 0); g.circ(178, 124, 54, '#161c4a', 0);
    if (done) { g.alpha(done * 0.5, () => g.heart(500, 400, 520, '#ff7fb8', 0)); g.glow(500, 380, 380 * done, '#ff9fc8', 0.45); }
    // 線
    for (let i = 0; i < HP.length; i++) {
      const j = (i + 1) % HP.length, on = k => !MISS.includes(k) || LA(s, MISS.indexOf(k) + 1) >= 0;
      const ok = on(i) && on(j);
      g.line([HP[i][0], HP[i][1], HP[j][0], HP[j][1]], done ? '#ffd76a' : ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.22)', done ? 8 : ok ? 5 : 4);
    }
    // 星
    HP.forEach(([x, y], i) => {
      const m = MISS.indexOf(i);
      if (m >= 0) { const a = LA(s, m + 1); if (a < 0) { g.alpha(0.5 + 0.3 * Math.sin(s.t * 6), () => g.ring(x, y, 26, '#ffffff', 4)); return; } const e = E.outBack(clamp(a / 0.14)); g.glow(x, y, 70, '#fff3a0', 0.6); g.at(x, y, 0, e, e, () => g.star(0, 0, 30, 13, 5, '#ffe066', 5)); return; }
      g.glow(x, y, 46, '#ffffff', 0.4); g.star(x, y, 22, 9, 5, '#fff7d0', 4);
    });
    if (done) for (let i = 0; i < 3; i++) { const t = clamp(l2 / 0.3 - i * 0.2); if (t > 0) g.alpha(1 - t, () => g.line([820 - i * 200 - 260 * t, 80 + i * 60 + 120 * t, 820 - i * 200 - 260 * t + 90, 80 + i * 60 + 120 * t - 40], '#ffffff', 6)); }
    // 丘と家
    g.hills(830, '#1d2150', 60, 5, 4); g.band(900, 'bottom', '#161a40');
    g.rect(760, 760, 110, 80, '#2a2f66', 5); g.tri(745, 762, 885, 762, 815, 700, '#3a3f80', 5); g.rect(790, 784, 30, 28, '#ffd76a', 4);
    flying(g, s, (f, q) => { const [x, y] = HP[MISS[f.k - 1]]; return arcPos(f, q, x, y, f.k === 1 ? 120 : 40, 0.55); }, (P, f, q) => g.at(P.x, P.y, 0, P.s, P.s, () => starObj(g, q * 10)));
    arms(g, s, STARH, () => starObj(g));
  },
  hit(g, s, k) { launch(s, k, STARH); swoosh(g, s, STARH); },
};

export default [tplSnow, tplBean, tplDart, tplBasket, tplPlane, tplWater, tplRing, tplBowl, tplPitch, tplPie, tplSkip, tplFris, tplPaper, tplFish, tplSeed, tplShur, tplKoi, tplCan, tplTama, tplPaint, tplStar];
