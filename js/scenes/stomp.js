/* 踏む — ぶどう・プチプチ・雪・水たまり・空き缶 など
   上から地面を見下ろす一人称。p=0 で足が着地（当たる瞬間）、p=1 で足が高い（手前＝大きく・下に見える）。
   交互（alt）：右足と左足がそれぞれの着地点を踏む。もう片方の足は地面に置いたまま。
   片足（one）：右足で描いて g.mirror で左右反転。v.one で1回目・2回目の着地点を決める。 */
import { C, E, clamp, lerp, sh, jig, squash } from '../kit.js';

const TAU = Math.PI * 2;
const opp = d => (d === 'L' ? 'R' : 'L');
const SP = { R: [650, 610], L: [350, 610] };        // 交互：右足・左足の着地点
const ONE = [[585, 610], [585, 610]];               // 片足：1回目・2回目の着地点（右足の座標）
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

/* 1回目・2回目に踏む場所 c1,c2（片足のときは反転前の座標）、その経過秒 a1,a2（まだなら -1）、描く足 feet */
function st(s, v) {
  const alt = s.mode === 'alt', P = v.sp || SP, one = v.one || ONE;
  let c1 = one[0], c2 = one[1], feet, d1 = 'R', d2 = 'R';
  const a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
  if (alt) {
    d1 = s.k === 0 ? s.side : s.k === 1 ? s.lastSide : opp(s.lastSide); d2 = opp(d1);
    c1 = P[d1]; c2 = P[d2];
    // 踏んだ足はすぐ手前（home）にもどる → 踏んだあとが見える。次の足は手前から前へ踏みこむ
    const act = s.k < 2 ? s.side : opp(s.lastSide), oth = opp(act), H = v.home ?? 230;
    const back = s.k >= 1 ? E.ioQ(clamp((s.age - 0.12) / 0.3)) : 1, w = E.ioQ(clamp((s.u - 0.15) / 0.6));
    feet = [
      { side: oth, x: P[oth][0], y: P[oth][1] + H * back, p: 0.22 * Math.sin(Math.PI * back), age: s.k ? s.age : 9, gy: P[oth][1] + H * back, raise: 0.5 },
      { side: act, x: P[act][0], y: P[act][1] + H * (1 - w), p: s.p, age: 9, raise: 0.55 },
    ];
  } else {
    let [x, y] = one[0];
    if (s.k === 1) { const t = E.ioQ(clamp((s.u - 0.08) / 0.5)); x = lerp(one[0][0], one[1][0], t); y = lerp(one[0][1], one[1][1], t); }
    else if (s.k >= 2) [x, y] = one[1];
    feet = [{ side: 'R', x, y, p: s.p, age: s.k ? s.age : 9 }];
  }
  return { alt, c1, c2, d1, d2, a1, a2, feet, M: alt ? 'R' : s.side };
}
// hit() 用：k 回目に踏んだ場所（画面の座標）
function spotAt(g, s, v, k) {
  if (s.mode === 'alt') return (v.sp || SP)[s.lastSide];
  const c = (v.one || ONE)[k - 1]; return [g.mx(s.lastSide, c[0]), c[1]];
}
const MX = (g, s, x) => (s.mode === 'alt' ? x : g.mx(s.lastSide, x));   // 片足のときだけ反転
const ease = (a, d = 0.25) => (a < 0 ? 0 : E.outBack(clamp(a / d)));
const prog = (a, d = 0.3) => (a < 0 ? 0 : clamp(a / d));

function blobPts(x, y, r, n, seed, ry = 0.85) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.8 + 0.26 * Math.abs(Math.sin(seed * 12.9 + i * 2.3)); p.push(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * ry); }
  return p;
}
// g.blob と同じなめらかな形を SVG パスに（クリップ用・固定の形だけに使う）
function blobD(p) {
  const n = p.length / 2, P = i => { i = (i + n) % n; return [p[i * 2], p[i * 2 + 1]]; }, f = v => Math.round(v * 10) / 10;
  let d = `M${f(p[0])} ${f(p[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), t = 1 / 6;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) * t)} ${f(p1[1] + (p2[1] - p0[1]) * t)} ${f(p2[0] - (p3[0] - p1[0]) * t)} ${f(p2[1] - (p3[1] - p1[1]) * t)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

/* ---------- 足（くつ底・はだし・かいじゅう） ---------- */
function bareSole(g, col) {
  g.blob([-44, 100, -58, 34, -62, -36, -46, -78, -8, -92, 34, -80, 56, -34, 50, 40, 32, 98, -8, 114], col);
  g.ell(16, 14, 18, 42, sh(col, -0.1), 0);
  g.ell(-6, 72, 30, 26, sh(col, 0.14), 0); g.ell(-10, -48, 36, 24, sh(col, 0.14), 0);
  [[-34, -114, 23], [0, -119, 16], [24, -111, 14], [43, -97, 12], [57, -77, 10]].forEach(([x, y, r]) => g.circ(x, y, r, col, 5));
}
function monsterSole(g, col) {
  [[-46, -100, -0.35], [0, -122, 0], [46, -100, 0.35]].forEach(([x, y, a]) => g.at(x, y, a, 1, 1, () => g.path('M-17 4 L0 -56 L17 4 Z', '#fffbe8')));
  g.blob([-64, 90, -78, 10, -68, -70, -32, -110, 28, -112, 66, -72, 78, 8, 62, 90, 0, 122], col);
  g.ell(0, 34, 44, 50, sh(col, -0.2), 0);
  [[-42, -68], [0, -84], [42, -68]].forEach(([x, y]) => g.circ(x, y, 21, sh(col, -0.2), 0));
  [[-52, 40], [54, 24], [30, 92], [-32, 96], [-56, -20]].forEach(([x, y]) => g.circ(x, y, 7, sh(col, 0.3), 0));
}
// look: { kind:'shoe'|'bare'|'monster', c:色, s:大きさ }
function foot(g, f, look) {
  const sg = f.side === 'L' ? -1 : 1, p = clamp(f.p), [qx, qy] = squash(f.age, 0.12), k = look.s ?? 1, rz = f.raise ?? 1;
  const sc = k * (1 + 0.62 * p), x = f.x + sg * 46 * p * rz, y = f.y + 255 * p * rz;
  g.shadow(f.x, f.y + 16, 84 * (1 - 0.3 * p) * k, 118 * (1 - 0.3 * p) * k, 0.3 * (1 - 0.6 * p));
  g.at(x, y, sg * 0.1 * p + (look.rot ?? 0) * sg, sg * sc * qx, sc * qy, () => {
    if (look.kind === 'bare') bareSole(g, look.c ?? C.skin);
    else if (look.kind === 'monster') monsterSole(g, look.c ?? C.green);
    else g.sole(0, 0, -Math.PI / 2, 1, 'R', look.c ?? C.red);
  });
}
function feet(g, S, look) { for (const f of S.feet) foot(g, f, typeof look === 'function' ? look(f) : look); }

/* ---------- 小物 ---------- */
function canDraw(g, x, y, q, col) {         // q: 0 立っている → 1 ぺちゃんこ
  if (q >= 0.99) {
    g.shadow(x + 8, y + 40, 130, 40, 0.25);
    g.blob([x - 128, y + 34, x - 84, y - 10, x - 20, y + 4, x + 46, y - 16, x + 126, y + 22, x + 98, y + 74, x + 14, y + 62, x - 70, y + 80], col);
    g.ell(x - 6, y + 30, 70, 32, '#dfe4ec', 5); g.ell(x - 6, y + 30, 46, 18, '#c7cdd8', 0);
    g.line([x - 104, y + 40, x - 60, y + 22, x - 30, y + 52, x + 20, y + 14, x + 60, y + 50, x + 100, y + 30], sh(col, -0.3), 5);
    return;
  }
  const h = 150 * (1 - q), w = 60 * (1 + 0.45 * q), yb = y + 70, yt = yb - h;
  g.shadow(x + 10, yb + 6, w + 14, 20, 0.25);
  g.rect(x - w, yt, w * 2, h, col, 0); g.ell(x, yb, w, w * 0.4, col, 0);
  g.clipRR(x - w, yt, w * 2, h + w * 0.4 + 2, 0, () => { g.rect(x - w, yt + h * 0.42, w * 2, h * 0.2, '#ffffff', 0); g.rect(x + w * 0.35, yt, w * 0.3, h + 40, 'rgba(255,255,255,0.25)', 0); });
  if (q > 0) g.line([x - w, yt + h * 0.3, x - w * 0.4, yt + h * 0.55, x, yt + h * 0.25, x + w * 0.5, yt + h * 0.6, x + w, yt + h * 0.32], sh(col, -0.35), 5);
  g.path(`M${x - w} ${yt} L${x - w} ${yb} A${w} ${w * 0.4} 0 0 0 ${x + w} ${yb} L${x + w} ${yt}`, null, 6);
  g.ell(x, yt, w, w * 0.4, '#e3e7ee', 6); g.ell(x, yt, w * 0.78, w * 0.3, '#c7cdd8', 0);
  g.rr(x - 14, yt - 18, 28, 26, 10, '#aeb6c4', 4);
}
function udonBowl(g, x, y, sc) {
  g.at(x, y, 0, sc, sc, () => {
    g.shadow(10, 16, 120, 112, 0.25);
    g.circ(0, 0, 118, '#2b2140'); g.circ(0, 0, 104, '#d1453b', 0); g.circ(0, 0, 90, '#e8c58c', 5);
    for (let i = 0; i < 5; i++) g.curve([-60, -40 + i * 20, -20, -55 + i * 22, 20, -30 + i * 18, 60, -46 + i * 22], '#fffaf0', 12);
    g.circ(-34, 34, 22, '#ffffff', 4); g.circ(-34, 34, 12, '#ff8fb1', 0);
    [[30, 30], [46, 10], [16, 48], [50, 44]].forEach(([a, b]) => g.circ(a, b, 7, '#58b947', 0));
  });
}
function hanamaru(g, x, y, sc, k) {     // はなまる
  g.at(x, y, 0, sc, sc, () => {
    const n = 7;
    for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; g.arc(Math.cos(a) * 62, Math.sin(a) * 62, 30, a - 1.4, a + 1.4, '#ff3b5c', 9); }
    g.arc(0, 0, 42, -Math.PI / 2, -Math.PI / 2 + TAU * k, '#ff3b5c', 9); g.arc(0, 0, 22, 0, TAU * k, '#ff3b5c', 8);
  });
}

/* ---------- 場面 ---------- */
export default [
  /* ぶどうを踏む（はだし） */
  {
    id: 'stomp-grape', acts: ['stomp'], modes: ['alt', 'one'], theme: 'farm', sfx: 'squish',
    vars: [{ k: 'grape', name: 'ぶどうを踏む', short: 'ぶどう' }],
    init(s) {
      const r = s.r, gs = [];
      for (let gy = -340; gy <= 340; gy += 78) for (let gx = -380; gx <= 380; gx += 82) {
        const x = 500 + gx + (r() - 0.5) * 30 + (Math.round(gy / 78) % 2 ? 41 : 0), y = 560 + gy + (r() - 0.5) * 26;
        if (dist(x, y, 500, 560) < 360) gs.push({ x, y, r: 33 + r() * 9, c: ['#7d3ea6', '#6a2f93', '#9150c2', '#8443b0'][(r() * 4) | 0], a: r() * TAU, z: r() });
      }
      s.my.gs = gs;
    },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), cx = 500, cy = 560;
      g.mirror(S.M, () => {
        g.bg('#86cc62'); g.grassTufts(130, '#6fb84f', 4, 8); g.grassTufts(1080, '#6fb84f', 7, 8);
        for (const [x, y, a] of [[70, 70, 0.5], [950, 110, -0.6], [50, 1010, 2.4], [960, 990, -2.3]]) g.at(x, y, a, 1, 1, () => { g.path('M0 -90 C60 -80 90 -20 70 30 C40 80 -40 80 -70 30 C-90 -20 -60 -80 0 -90Z', '#3f9a3e'); g.line([0, -70, 0, 60], '#2f7a30', 5); });
        g.shadow(cx + 14, cy + 30, 470, 460, 0.22);
        g.circ(cx, cy, 455, C.wood);
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.line([cx + Math.cos(a) * 414, cy + Math.sin(a) * 414, cx + Math.cos(a) * 452, cy + Math.sin(a) * 452], sh(C.wood, -0.25), 4); }
        g.ring(cx, cy, 440, '#5c6478', 12);
        g.circ(cx, cy, 410, '#4e2347', 7);
        const j1 = ease(S.a1, 0.3), j2 = ease(S.a2, 0.3), full = prog(S.a2, 0.7);
        g.clipCirc(cx, cy, 406, () => {
          if (j1) g.blob(blobPts(S.c1[0], S.c1[1], 175 * j1, 9, 1), '#8c1f6a', 0);
          if (j2) g.blob(blobPts(S.c2[0], S.c2[1], 175 * j2, 9, 2), '#8c1f6a', 0);
          if (full) g.circ(cx, cy, 120 + 300 * E.outQ(full), g.rgba('#a3247a', 0.55), 0);
        });
        for (const q of s.my.gs) {
          const near = (S.a1 >= 0 && dist(q.x, q.y, S.c1[0], S.c1[1]) < 130) || (S.a2 >= 0 && dist(q.x, q.y, S.c2[0], S.c2[1]) < 130);
          if (near || (full > q.z * 1.4 && q.z < 0.45)) { g.ell(q.x, q.y, q.r * 1.3, q.r * 0.7, sh(q.c, -0.3), 0, q.a); continue; }
          g.circ(q.x, q.y, q.r, q.c, 5); g.circ(q.x - q.r * 0.36, q.y - q.r * 0.36, q.r * 0.3, 'rgba(255,255,255,0.55)', 0);
        }
        // できたジュース
        if (full) g.at(840, 150, 0, E.outBack(full), E.outBack(full), () => {
          g.shadow(8, 14, 84, 80, 0.25); g.circ(0, 0, 80, 'rgba(255,255,255,0.85)'); g.circ(0, 0, 64, '#a3247a', 0); g.circ(-18, -20, 18, 'rgba(255,255,255,0.5)', 0);
          g.line([10, -10, 70, -90], '#ff5a8a', 14); g.circ(0, 0, 80, null, 6);
        });
        feet(g, S, f => ({ kind: 'bare', c: g.mix(C.skin, '#d17fc0', s.k >= 1 && (S.alt ? f.side === S.d1 || s.k >= 2 : true) ? 0.35 : 0) }));
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.burst(x, y, { n: 18, c: ['#a3247a', '#c94aa0', '#6a2f93'], shape: 'drop', sp: [300, 800], size: [12, 24], g: 1600 });
      g.fx.ring(x, y + 10, { c: '#f0a3dc', r0: 60, r1: 230, w: 12, sy: 0.75 });
      g.fx.pop(k === 1 ? 'グシャ' : 'ジュワ〜', x, y - 260, { size: k === 1 ? 100 : 110, c: k === 1 ? '#ffffff' : '#ffd6f2' });
      g.fx.shake(k === 1 ? 7 : 10, 0.14);
      if (k === 2) g.fx.stars(MX(g, s, 840), 150, 8, [C.gold, '#ffffff', '#ffb3e6']);
    },
  },

  /* プチプチを踏む */
  {
    id: 'stomp-wrap', acts: ['stomp'], modes: ['alt', 'one'], theme: 'home', sfx: 'pop',
    vars: [{ k: 'wrap', name: 'プチプチを踏む', short: 'プチプチ' }],
    init(s) {
      const b = [];
      for (let j = 0; j < 10; j++) for (let i = 0; i < 9; i++) { const x = 150 + i * 96 + (j % 2 ? 48 : 0), y = 160 + j * 86; if (x < 880) b.push({ x, y }); }
      s.my.b = b; s.my.n = 0;
    },
    draw(g, s, v) {
      const V = g.V, S = st(s, v);
      g.mirror(S.M, () => {
        g.bg('#e7c08e');
        for (let x = Math.floor((V.x0 - 40) / 160) * 160; x < V.x1 + 160; x += 160) g.line([x, V.y0 - 10, x, V.y1 + 10], '#c99b68', 5);
        g.shadow(512, 600, 440, 480, 0.2);
        g.rr(96, 104, 808, 910, 26, '#d4ecfb', 6);
        g.rr(110, 118, 780, 880, 18, '#e6f5ff', 0);
        for (const q of s.my.b) {
          let a = -1;
          if (S.a1 >= 0 && dist(q.x, q.y, S.c1[0], S.c1[1]) < 130) a = S.a1;
          if (S.a2 >= 0 && dist(q.x, q.y, S.c2[0], S.c2[1]) < 130) a = Math.max(a, S.a2);
          if (S.a2 >= 0 && a < 0) { const d = dist(q.x, q.y, S.c2[0], S.c2[1]) / 1500 + 0.06; if (S.a2 > d) a = S.a2 - d; }
          if (a >= 0) {       // つぶれた
            const k = clamp(a / 0.07);
            g.circ(q.x, q.y, lerp(42, 36, k), '#c9e2f3', 0);
            g.line([q.x - 22, q.y - 4, q.x - 8, q.y + 9, q.x + 6, q.y - 9, q.x + 22, q.y + 5], '#8fb6d3', 4);
            continue;
          }
          g.circ(q.x, q.y, 38, g.rad(q.x - 12, q.y - 14, 4, 46, [[0, '#ffffff'], [0.6, '#eef8ff'], [1, '#9cc7e6']]), 0);
          g.circ(q.x - 13, q.y - 15, 9, '#ffffff', 0);
        }
        feet(g, S, { kind: 'shoe', c: '#3a86ff' });
      });
      if (s.k >= 2) { const due = Math.min(3, Math.floor(s.age / 0.12)); while (s.my.n < due) { s.my.n++; g.sfx('pop'); } }
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.burst(x, y, { n: 10, c: ['#ffffff', '#cfe8ff'], shape: 'dot', sp: [250, 600], size: [8, 14], g: 900 });
      g.fx.ring(x, y, { c: '#ffffff', r0: 70, r1: 220, w: 10 });
      g.fx.pop(k === 1 ? 'プチッ' : 'プチプチ！', k === 1 ? x : 500, k === 1 ? y - 250 : 300, { size: k === 1 ? 100 : 110, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.shake(6, 0.1);
      if (k === 2) { g.fx.stars(500, 600, 10); g.fx.ring(x, y, { c: '#ffffff', r0: 120, r1: 700, w: 14, life: 0.5 }); }
    },
  },

  /* 雪に足あと */
  {
    id: 'stomp-snow', acts: ['stomp'], modes: ['alt', 'one'], theme: 'winter', sfx: 'crunch',
    vars: [{ k: 'snow', name: '雪に足あと', short: '雪', one: [[600, 690], [545, 430]] }],
    init(s) { const r = s.r; s.my.sp = Array.from({ length: 22 }, () => [r(), r(), 0.5 + r()]); },
    draw(g, s, v) {
      const V = g.V, S = st(s, v);
      g.mirror(S.M, () => {
        g.bg('#f3f8ff');
        g.blob([V.x0 - 40, 170, 200, 110, 420, 200, 700, 140, V.x1 + 40, 220, V.x1 + 40, 330, 640, 290, 300, 330, V.x0 - 40, 290], '#e2ecfb', 0);
        g.blob([V.x0 - 40, 930, 260, 880, 560, 960, 820, 900, V.x1 + 40, 950, V.x1 + 40, 1060, 520, 1080, V.x0 - 40, 1050], '#e2ecfb', 0);
        for (const [a, b, z] of s.my.sp) { const x = lerp(V.x0, V.x1, a), y = lerp(V.y0, V.y1, b), tw = 0.5 + 0.5 * Math.sin(s.t * 4 + a * 40); g.star(x, y, 10 * z * (0.6 + tw * 0.6), 3 * z, 4, '#a9cdfa', 0); }
        // もみの木（上から）
        g.at(150, 190, -0.35, 1, 1, () => { g.shadow(10, 14, 90, 150, 0.12); g.line([-60, -150, -60, 140, -40, 170], '#8f9bb0', 10); g.line([60, -150, 60, 140, 40, 170], '#8f9bb0', 10); g.rr(-74, -130, 148, 250, 30, '#e63946'); g.rr(-56, -110, 112, 70, 18, '#ff7b84', 0); g.curve([-40, -130, 0, -190, 40, -130], '#ffcc1a', 7); });
        // 小鳥の足あと
        for (let i = 0; i < 5; i++) g.at(330 + i * 58, 250 + (i % 2) * 28, -0.4, 1, 1, () => g.path('M0 0 L-11 -18 M0 0 L0 -21 M0 0 L11 -18 M0 0 L0 10', null, 4));
        // 足あと（くぼみ）
        for (const [c, a, d] of [[S.c1, S.a1, S.d1], [S.c2, S.a2, S.d2]]) {
          if (a < 0) continue;
          g.at(c[0], c[1] + 4, 0, d === 'L' ? -1 : 1, 1, () => { g.sole(0, 0, -Math.PI / 2, 1.04, 'R', '#c2d6f2'); g.hl(-20, -60, 26, 50, 0.2, 0.35); });
        }
        // 雪だるま（2回目でとびはねる）
        const jy = s.k >= 2 ? -Math.abs(jig(s.age, 40, 13, 4)) : 0;
        g.at(820, 210 + jy, () => {
          g.shadow(0, 92 - jy, 96, 26, 0.15); g.circ(0, 30, 84, '#ffffff'); g.circ(0, -76, 58, '#ffffff');
          g.circ(-19, -84, 6, C.ol, 0); g.circ(19, -84, 6, C.ol, 0); g.tri(-7, -70, 7, -70, 0, -52, C.carrot, 4);
          if (s.k >= 2) { g.arc(0, -64, 22, 0.35, Math.PI - 0.35, C.ol, 5); g.circ(-34, -64, 9, '#ffb3c1', 0); g.circ(34, -64, 9, '#ffb3c1', 0); }
          else g.line([-12, -56, 12, -56], C.ol, 5);
          g.rr(-48, -150, 96, 26, 8, C.red); g.rr(-30, -190, 60, 46, 10, C.red);
          g.line([-80, 10, -140, s.k >= 2 ? -60 : 30], C.dwood, 8); g.line([80, 10, 140, s.k >= 2 ? -60 : 30], C.dwood, 8);
        });
        feet(g, S, { kind: 'shoe', c: '#ff6b4a' });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.burst(x, y, { n: 16, c: ['#ffffff', '#e8f1ff'], shape: 'snow', sp: [220, 560], size: [16, 30], g: 900 });
      g.fx.smoke(x, y + 20, 5, '#ffffff');
      g.fx.pop(k === 1 ? 'ザクッ' : 'ザクザク', k === 1 ? x : 470, k === 1 ? y - 250 : 420, { size: 100, c: '#ffffff', o: '#3a5a8a' });
      g.fx.shake(5, 0.1);
      if (k === 2) g.fx.stars(MX(g, s, 820), 150, 7, ['#bfe3ff', '#ffffff', C.gold]);
    },
  },

  /* 水たまりでバシャ（長ぐつ） */
  {
    id: 'stomp-puddle', acts: ['stomp'], modes: ['alt', 'one'], theme: 'nature', sfx: 'splash',
    vars: [{ k: 'puddle', name: '水たまりでバシャ', short: '水たまり' }],
    init(s) {
      const r = s.r;
      s.my.rip = Array.from({ length: 6 }, () => [330 + r() * 340, 440 + r() * 330, r()]);
      s.my.wet = [0, 1].map(() => Array.from({ length: 6 }, () => [r() * TAU, 200 + r() * 110, 16 + r() * 22]));
    },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), wob = s.k ? jig(s.age, 0.035, 16, 5) : 0, rb = prog(S.a2 - 0.1, 0.6);
      g.mirror(S.M, () => {
        g.bg('#cfae82');
        g.band('top', 70, '#79c25a'); g.band(1130, 'bottom', '#79c25a');
        g.grassTufts(70, '#79c25a', 5, 10); g.at(0, 1130, 0, 1, -1, () => g.grassTufts(0, '#79c25a', 6, 10));
        for (const [x, y, r] of [[160, 220, 18], [840, 300, 14], [210, 960, 16], [880, 900, 20], [600, 1050, 12]]) g.ell(x, y, r * 1.3, r, '#b89569', 0);
        // はねた水のあと
        for (const [c, a, i] of [[S.c1, S.a1, 0], [S.c2, S.a2, 1]]) if (a >= 0) for (const [an, d, r] of s.my.wet[i]) g.circ(c[0] + Math.cos(an) * d, c[1] + Math.sin(an) * d * 0.8, r * ease(a, 0.2), '#a8875c', 0);
        g.at(500, 600, 0, 1 + wob, 1 - wob, () => g.at(-500, -600, () => {
          g.path(PUD_D, g.lin(0, 300, 0, 900, ['#7fcaf5', '#d6f1ff']), 7);
          g.clipPath(PUD_D, () => {
            g.cloud(430, 470, 1.1, 'rgba(255,255,255,0.85)'); g.cloud(700, 700, 0.7, 'rgba(255,255,255,0.7)');
            if (rb) g.alpha(0.9 * rb, () => ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'].forEach((c, i) => g.arc(500, 880, 380 - i * 22, Math.PI * 1.05, Math.PI * 1.95, c, 22)));
            const rain = s.k >= 2 ? 1 - prog(s.age, 0.4) : 1;
            if (rain > 0) for (const [x, y, ph] of s.my.rip) { const q = (s.t * 0.9 + ph) % 1; g.alpha(rain * (1 - q), () => g.ell(x, y, 8 + 44 * q, (8 + 44 * q) * 0.6, null, 4)); }
            for (const [c, a] of [[S.c1, S.a1], [S.c2, S.a2]]) if (a >= 0 && a < 1.2) { const q = clamp(a / 1.2); g.alpha(1 - q, () => { g.ell(c[0], c[1], 90 + 260 * q, (90 + 260 * q) * 0.7, null, 6); g.ell(c[0], c[1], 40 + 170 * q, (40 + 170 * q) * 0.7, null, 4); }); }
          });
          g.curve([250, 450, 300, 400, 380, 384], 'rgba(255,255,255,0.8)', 10);
        }));
        feet(g, S, { kind: 'shoe', c: '#ffcc1a' });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.splash(x, y, C.water, k === 1 ? 20 : 28);
      g.fx.burst(x, y, { n: 10, c: ['#ffffff', '#bfeaff'], shape: 'drop', sp: [500, 1100], size: [10, 18], g: 2400, dir: -Math.PI / 2, spread: 1.6 });
      g.fx.pop(k === 1 ? 'バシャッ' : 'バッシャーン', k === 1 ? x : 500, k === 1 ? y - 270 : 300, { size: k === 1 ? 100 : 104, c: '#ffffff', o: '#1f5f9a' });
      g.fx.shake(k === 1 ? 7 : 10, 0.14);
      if (k === 2) g.fx.stars(500, 260, 8, ['#ffe066', '#ffffff', '#9ce0ff']);
    },
  },

  /* 空き缶をつぶす */
  {
    id: 'stomp-can', acts: ['stomp'], modes: ['alt', 'one'], theme: 'town', sfx: 'crunch',
    vars: [{ k: 'can', name: '空き缶をつぶす', short: '空き缶' }],
    init(s) { s.my.landed = 0; },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), cols = ['#e63946', '#2f80ed'];
      g.mirror(S.M, () => {
        g.bg('#c9ced8');
        g.grid(V.x0 - 30, V.y0 - 30, V.x1 - V.x0 + 60, V.y1 - V.y0 + 60, 200, '#b4bac6', 6);
        // リサイクルばこ
        const fly = prog(S.a2 - 0.28, 0.42), wob = fly >= 1 ? jig(S.a2 - 0.7, 0.08, 20, 6) : 0;
        g.at(500, 170, wob, 1, 1, () => {
          g.shadow(0, 120, 190, 30, 0.3);
          g.rr(-170, -70, 340, 190, 22, '#2f9e5b'); g.rr(-150, -96, 300, 70, 30, '#24804a'); g.rr(-110, -80, 220, 36, 18, '#173d2a', 0);
          g.at(0, 36, () => { for (let i = 0; i < 3; i++) g.at(0, 0, i * TAU / 3, 1, 1, () => { g.path('M-30 -38 L22 -38 L22 -50 L46 -28 L22 -6 L22 -18 L-30 -18 Z', '#ffffff', 0); }); });
        });
        // 缶
        const cans = S.alt ? [[S.c1, S.a1, 0], [S.c2, S.a2, 1]] : [[S.c1, -1, 0]];
        for (const [c, a, i] of cans) {
          let q;
          if (S.alt) q = a >= 0 ? clamp(a / 0.07) : 0;
          else q = S.a2 >= 0 ? 0.5 + 0.5 * clamp(S.a2 / 0.07) : S.a1 >= 0 ? 0.5 * clamp(S.a1 / 0.07) : 0;
          if (fly > 0) {
            if (fly >= 1) continue;
            const x = lerp(c[0], 500, fly), y = lerp(c[1], 150, fly) - 380 * 4 * fly * (1 - fly), sc = lerp(1, 0.55, fly);
            g.at(x, y, fly * 7 * (i ? -1 : 1), sc, sc, () => canDraw(g, 0, -30, 1, cols[i]));
            continue;
          }
          canDraw(g, c[0], c[1] - 40, q, cols[i]);
        }
        feet(g, S, { kind: 'shoe', c: '#ff5a5f' });
      });
      if (S.a2 >= 0.7 && !s.my.landed) { s.my.landed = 1; g.sfx('ding'); g.fx.pop('ナイス！', 500, 90, { size: 96, c: C.yellow }); g.fx.stars(500, 140, 8); }
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.lines(x, y - 20, { n: 10, r0: 130, r1: 230, w: 10 });
      g.fx.burst(x, y, { n: 8, c: ['#ffffff', '#dfe4ec'], shape: 'spark', sp: [400, 800], size: [12, 22], g: 1200 });
      g.fx.pop(k === 1 ? 'ペシャ' : 'グシャッ', x, y - 280, { size: 100 });
      g.fx.shake(k === 1 ? 7 : 9, 0.12);
    },
  },

  /* 床のピアノ */
  {
    id: 'stomp-piano', acts: ['stomp'], modes: ['alt', 'one'], theme: 'music', sfx: 'piano',
    vars: [{ k: 'piano', name: '床のピアノを踏む', short: 'ゆかピアノ', one: [[550, 650], [650, 650]], sp: { R: [650, 650], L: [350, 650] } }],
    draw(g, s, v) {
      const V = g.V, S = st(s, v), KW = 100, TOP = 150, cols = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];
      const kOf = x => Math.floor(x / KW), k1 = kOf(S.c1[0]), k2 = kOf(S.c2[0]);
      g.mirror(S.M, () => {
        g.bg('#2a2147');
        g.band('top', TOP - 40, '#3a2d63'); for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1 + 120; x += 120) g.line([x, V.y0 - 10, x - 40, TOP - 40], '#46387a', 6);
        g.rect(V.x0 - 300, TOP - 46, V.x1 - V.x0 + 600, 46, '#151027', 0);
        const i0 = Math.floor((V.x0 - 300) / KW), i1 = Math.ceil((V.x1 + 300) / KW);
        for (let i = i0; i <= i1; i++) {
          const x = i * KW, n = ((i % 7) + 7) % 7;
          let lit = 0;
          if (S.a1 >= 0 && i === k1) lit = Math.max(lit, 1 - 0.45 * prog(S.a1 - 0.2, 0.6));
          if (S.a2 >= 0 && i === k2) lit = 1;
          if (S.a2 >= 0) { const d = Math.abs(i - k2) * 0.05; if (S.a2 > d) lit = Math.max(lit, 0.75 * (1 - 0.6 * prog(S.a2 - d - 0.15, 0.5))); }
          g.rect(x, TOP, KW, V.y1 + 40 - TOP, lit ? g.mix('#fbfbff', cols[n], lit * 0.85) : '#fbfbff', 6);
          if (lit) { g.rect(x + 6, TOP, KW - 12, 18, 'rgba(40,20,80,0.25)', 0); }
        }
        for (let i = i0; i <= i1; i++) { const n = ((i % 7) + 7) % 7; if ([0, 1, 3, 4, 5].includes(n)) { const x = (i + 1) * KW; g.rr(x - 32, TOP - 10, 64, 330, 10, '#1f1b2e', 5); g.rr(x - 20, TOP, 14, 290, 6, 'rgba(255,255,255,0.18)', 0); } }
        for (const [c, a, k] of [[S.c1, S.a1, k1], [S.c2, S.a2, k2]]) if (a >= 0) g.glow(k * KW + KW / 2, c[1], 220 * (1 - 0.5 * prog(a, 1.2)), cols[((k % 7) + 7) % 7], 0.55);
        feet(g, S, { kind: 'shoe', c: '#ff7aa8' });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.notes(x, y - 120, k === 1 ? 4 : 7);
      g.fx.ring(x, y, { c: '#ffffff', r0: 50, r1: 200, w: 10, sy: 0.8 });
      g.fx.pop(k === 1 ? 'ポーン' : 'ポロロン', k === 1 ? x : 500, k === 1 ? y - 300 : 300, { size: k === 1 ? 100 : 108, c: k === 1 ? '#ffffff' : '#ffe066' });
      g.fx.shake(5, 0.1);
      if (k === 2) g.fx.notes(500, 300, 6, [C.yellow, C.pink, C.mint]);
    },
  },

  /* 落ち葉を踏む */
  {
    id: 'stomp-leaves', acts: ['stomp'], modes: ['alt', 'one'], theme: 'nature', sfx: 'crunch',
    vars: [{ k: 'leaves', name: '落ち葉を踏む', short: '落ち葉' }],
    init(s) {
      const r = s.r, L = [];
      for (let i = 0; i < 46; i++) { const y = -60 + r() * 1180, x = 150 + r() * 700; L.push({ x, y, a: r() * TAU, s: 0.8 + r() * 0.5, t: r() < 0.32 ? 1 : 0, c: ['#e8452c', '#f28a24', '#f6c235', '#c9542a', '#f6c235'][(r() * 5) | 0] }); }
      s.my.L = L.sort((a, b) => a.y - b.y);
      s.my.nut = [0, 1].map(() => Array.from({ length: 3 }, () => [(r() - 0.5) * 150, (r() - 0.5) * 120, r() * 0.8 - 0.4]));
    },
    draw(g, s, v) {
      const V = g.V, S = st(s, v);
      g.mirror(S.M, () => {
        g.bg('#7cbf5a');
        g.rect(130, V.y0 - 20, 740, V.y1 - V.y0 + 40, '#b98b5e', 0);
        g.line([130, V.y0 - 20, 130, V.y1 + 20], '#8a6440', 8); g.line([870, V.y0 - 20, 870, V.y1 + 20], '#8a6440', 8);
        for (const [x, y] of [[60, 150], [940, 420], [50, 820], [950, 1000]]) { g.circ(x, y, 90, '#4f9a45'); g.circ(x - 20, y - 24, 40, '#63b257', 0); }
        // どんぐり（2回目で出てくる）
        for (const [c, a, i] of [[S.c1, S.a1, 0], [S.c2, S.a2, 1]]) {
          if (i === 0 && !(S.a2 >= 0)) continue;
          const e = ease(S.a2 - 0.08 - i * 0.04, 0.3); if (!e) continue;
          for (const [dx, dy, rot] of s.my.nut[i]) g.at(c[0] + dx * e * 1.6, c[1] - 30 + dy * e * 1.6, rot, e, e, () => { g.ell(0, 8, 22, 26, '#a0612f'); g.path('M-26 -4 Q0 -34 26 -4 Q0 4 -26 -4Z', '#6b4426', 5); g.line([0, -22, 4, -34], C.ol, 5); g.hl(-8, 10, 6, 10, 0.2, 0.5); });
        }
        for (const q of s.my.L) {
          if ((S.a1 >= 0 && dist(q.x, q.y, S.c1[0], S.c1[1]) < 135) || (S.a2 >= 0 && dist(q.x, q.y, S.c2[0], S.c2[1]) < 135)) continue;
          g.at(q.x, q.y, q.a, q.s, q.s, () => {
            if (q.t) { g.path('M0 30 L-36 -14 Q0 -44 36 -14 Z', q.c, 5); g.line([0, 30, 0, 44], '#8a6440', 5); }
            else { g.path('M0 -40 L10 -18 L32 -26 L24 -4 L40 6 L18 14 L22 34 L4 22 L0 40 L-4 22 L-22 34 L-18 14 L-40 6 L-24 -4 L-32 -26 L-10 -18 Z', q.c, 5); g.line([0, 30, 0, 52], '#8a6440', 5); }
          });
        }
        feet(g, S, { kind: 'shoe', c: '#9a5b34' });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.burst(x, y, { n: 16, c: ['#e8452c', '#f28a24', '#f6c235'], shape: 'leaf', sp: [300, 700], size: [18, 30], g: 500, drag: 0.95, life: [0.7, 1.2], spin: 10 });
      g.fx.pop(k === 1 ? 'カサッ' : 'ガサガサ', k === 1 ? x : 500, k === 1 ? y - 270 : 300, { size: 100, c: '#ffe066' });
      g.fx.shake(5, 0.1);
      if (k === 2) { g.fx.stars(500, 600, 8); g.fx.pop('どんぐり', 500, 860, { size: 70, c: '#ffffff', life: 0.9, rise: 40 }); }
    },
  },

  /* 四股を踏む（はだし・大きな足） */
  {
    id: 'stomp-shiko', acts: ['stomp'], modes: ['alt', 'one'], theme: 'dojo', sfx: 'stomp',
    vars: [{ k: 'shiko', name: '四股を踏む', short: '四股', sp: { R: [670, 640], L: [330, 640] } }],
    init(s) { const r = s.r; s.my.salt = Array.from({ length: 26 }, () => [300 + r() * 400, 300 + r() * 500, 3 + r() * 5]); },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), cx = 500, cy = 560;
      const bounce = s.k ? Math.abs(jig(s.age, s.k >= 2 ? 16 : 10, 20, 7)) : 0;
      g.mirror(S.M, () => {
        g.bg('#c99a5c');
        for (let i = 0; i < 6; i++) g.arc(cx, cy, 520 + i * 70, 0, TAU, '#bd8f53', 6);
        g.at(0, -bounce * 0.4, () => {
          g.circ(cx, cy, 470, '#e0bd85');
          g.circ(cx, cy, 446, null, 30); g.arc(cx, cy, 446, 0, TAU, '#e9d58c', 22);
          for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; g.line([cx + Math.cos(a) * 432, cy + Math.sin(a) * 432, cx + Math.cos(a) * 460, cy + Math.sin(a) * 460], '#b9a45a', 4); }
          g.rect(430, 330, 140, 18, '#ffffff', 0); g.rect(430, 190, 140, 18, '#ffffff', 0);
          for (const [x, y, r] of s.my.salt) g.circ(x, y, r, '#ffffff', 0);
          // 足のまわりのへこみ
          for (const [c, a] of [[S.c1, S.a1], [S.c2, S.a2]]) if (a >= 0) { const e = ease(a, 0.2); g.ell(c[0], c[1] + 10, 120 * e, 150 * e, 'rgba(150,100,50,0.25)', 0); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + 0.3; g.line([c[0] + Math.cos(an) * 110, c[1] + Math.sin(an) * 140, c[0] + Math.cos(an) * (110 + 70 * e), c[1] + Math.sin(an) * (140 + 80 * e)], '#a8773f', 5); } }
        });
        feet(g, S, { kind: 'bare', c: '#f6c39c', s: 1.18 });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.smoke(x, y + 40, 8, '#e8cfa0');
      g.fx.ring(x, y + 20, { c: '#fff2d0', r0: 90, r1: 330, w: 16, sy: 0.7 });
      g.fx.burst(x, y, { n: 12, c: ['#ffffff'], shape: 'dot', sp: [300, 700], size: [6, 12], g: 1600 });
      g.fx.pop(k === 1 ? 'ドスン' : 'ドスコイ！', k === 1 ? x : 500, k === 1 ? y - 300 : 250, { size: k === 1 ? 110 : 120, c: k === 1 ? '#ffffff' : '#ffd23f' });
      if (k === 2) { g.fx.pop('よいしょー', 500, 870, { size: 70, c: '#ffffff', life: 0.9, rise: 30 }); g.fx.stars(500, 300, 6); }
      g.fx.shake(k === 1 ? 10 : 14, 0.2);
    },
  },

  /* 怪獣になって街を歩く（小さな街がゆれる） */
  {
    id: 'stomp-kaiju', acts: ['stomp'], modes: ['alt', 'one'], theme: 'town', sfx: 'thud',
    vars: [{ k: 'kaiju', name: '怪獣になって歩く', short: '怪獣', sp: { R: [660, 620], L: [340, 620] }, home: 250 }],
    init(s) {
      const r = s.r, V = s.V, B = [], cols = ['#f4a261', '#e9c46a', '#8ecae6', '#f28482', '#cdb4db', '#a8dadc', '#ffd6a5', '#b5e48c'];
      for (let j = -6; j <= 6; j++) {
        const xc = 335 + 330 * j; if (xc + 120 < V.x0 || xc - 120 > V.x1) continue;
        for (const yc of [375, 135, -105, -345, 865, 1105, 1345]) {
          if (yc + 90 < V.y0 || yc - 90 > V.y1) continue;
          const park = r() < 0.18;
          B.push({ x: xc, y: yc, park, c: cols[(r() * cols.length) | 0], h: 10 + r() * 18, d: r(), w: 196 + r() * 24, hh: 140 + r() * 20 });
        }
      }
      s.my.B = B;
      s.my.cars = Array.from({ length: 6 }, (_, i) => ({ x: r() * 1000, lane: i % 2, c: ['#ff5a5f', '#3a86ff', '#ffd23f', '#ffffff', '#3cc46b', '#ff9f1c'][i] }));
      s.my.ppl = Array.from({ length: 9 }, (_, i) => ({ x: 60 + i * 110 + r() * 40, y: i % 2 ? 488 : 754, c: ['#ff5a5f', '#3a86ff', '#8e5cff', '#ffd23f'][i % 4] }));
      s.my.honk = 0;
    },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), last = s.k ? (s.k === 1 ? S.c1 : S.c2) : null, age = s.k ? s.age : 9;
      g.mirror(S.M, () => {
        g.bg('#c3c8d2');
        for (let x = 500 - 330 * 6; x < V.x1 + 330; x += 330) g.rect(x - 50, V.y0 - 20, 100, V.y1 - V.y0 + 40, '#8a91a1', 0);
        for (const y of [255, 15, -225, 985, 1225]) g.band(y - 35, y + 35, '#8a91a1');
        // 大通り
        g.band(460, 780, '#6c7385'); g.band(460, 478, '#d9dde5'); g.band(762, 780, '#d9dde5');
        for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1 + 120; x += 120) { g.rect(x, 544, 60, 10, '#ffffff', 0); g.rect(x + 60, 690, 60, 10, '#ffffff', 0); }
        g.band(615, 625, '#ffd23f');
        for (let i = 0; i < 6; i++) g.rect(452 + i * 18, 482, 10, 276, 'rgba(255,255,255,0.75)', 0);
        // 足あと（ひび）
        for (const [c, a] of [[S.c1, S.a1], [S.c2, S.a2]]) if (a >= 0) {
          g.at(c[0], c[1], 0, 1.2, 1.2, () => { g.blob([-64, 90, -78, 10, -68, -70, -32, -110, 28, -112, 66, -72, 78, 8, 62, 90, 0, 122], '#565c6c', 0); });
          for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + 0.4, r0 = 110, r1 = 150 + 30 * (i % 2); g.line([c[0] + Math.cos(an) * r0, c[1] + Math.sin(an) * r0 * 1.1, c[0] + Math.cos(an + 0.08) * r1, c[1] + Math.sin(an + 0.08) * r1 * 1.1, c[0] + Math.cos(an - 0.04) * (r1 + 40), c[1] + Math.sin(an - 0.04) * (r1 + 40) * 1.1], '#3f4452', 5); }
        }
        // 車
        for (const q of s.my.cars) {
          const dir = q.lane ? -1 : 1, W = V.x1 - V.x0 + 400; let x = V.x0 - 200 + (((q.x + dir * 120 * s.t - V.x0 + 200) % W) + W) % W;
          const y = q.lane ? 695 : 545;
          let hop = 0, rot = 0;
          if (last && dist(x, y, last[0], last[1]) < 420) { hop = Math.abs(jig(age, 46, 16, 6)); rot = jig(age, 0.5, 12, 5); }
          g.shadow(x, y + 14, 40, 14, 0.25);
          g.at(x, y - hop, rot, 1 + hop / 200, 1 + hop / 200, () => { g.rr(-38, -21, 76, 42, 12, q.c); g.rr(dir * 4 - 12, -15, 24, 30, 6, '#9fd8ff', 4); g.rr(-dir * 24 - 7, -15, 14, 30, 4, sh(q.c, -0.2), 0); });
          if (hop > 8) g.text('!', x + 30, y - 60 - hop, { size: 44, f: '#ffffff', o: 8 });
        }
        // 人
        for (const q of s.my.ppl) {
          let x = q.x;
          if (last) { const d = x - last[0]; x += Math.sign(d || 1) * 120 * E.outQ(clamp(age / 0.8)) * (Math.abs(d) < 400 ? 1 : 0.2); }
          g.circ(x, q.y, 11, q.c, 4); g.circ(x, q.y - 3, 6, C.skin, 0);
        }
        // ビル
        for (const b of s.my.B) {
          const near = last ? dist(b.x, b.y, last[0], last[1]) < 650 : false, w = near ? jig(age, 0.05 * (b.d > 0.5 ? 1 : -1), 18, 6) : 0;
          g.at(b.x, b.y, w, 1, 1, () => {
            if (b.park) { g.rr(-110, -80, 220, 160, 14, '#7cc85c'); g.circ(-40, -10, 34, '#4f9a45'); g.circ(42, 20, 28, '#4f9a45'); g.circ(30, -40, 20, '#4f9a45'); return; }
            g.rr(-b.w / 2 + b.h, -b.hh / 2 + b.h, b.w, b.hh, 10, 'rgba(40,30,60,0.35)', 0);
            g.rr(-b.w / 2, -b.hh / 2, b.w, b.hh, 10, b.c, 6);
            if (b.d < 0.3) g.circ(b.w * 0.2, -b.hh * 0.12, 22, '#dfe4ec', 4); else if (b.d < 0.6) g.rr(-30, -24, 52, 36, 6, sh(b.c, -0.15), 0);
          });
        }
        feet(g, S, { kind: 'monster', c: '#43b97f', s: 1.2 });
      });
      if (s.k >= 2 && s.age > 0.25 && !s.my.honk) { s.my.honk = 1; g.sfx('honk'); g.fx.pop('プップー', MX(g, s, 820), 860, { size: 64, c: '#ffffff', life: 0.8, rise: 30 }); }
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.smoke(x, y + 30, 7, '#d9dde5');
      g.fx.ring(x, y, { c: '#ffffff', r0: 100, r1: 360, w: 14, sy: 0.8 });
      g.fx.pop(k === 1 ? 'ズシン' : 'ズシーン', k === 1 ? x : 500, k === 1 ? y - 300 : 280, { size: k === 1 ? 110 : 124, c: k === 1 ? '#ffffff' : '#c8ff6b' });
      g.fx.shake(k === 1 ? 12 : 16, 0.22);
    },
  },

  /* 小枝をパキッ（たき火がつく） */
  {
    id: 'stomp-twig', acts: ['stomp'], modes: ['alt', 'one'], theme: 'nature', sfx: 'crack',
    vars: [{ k: 'twig', name: '小枝をパキッ', short: '小枝', one: [[585, 690], [585, 470]] }],
    init(s) { const r = s.r; s.my.st = Array.from({ length: 9 }, () => [r(), r(), r()]); s.my.lit = 0; },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), lit = ease(S.a2 - 0.1, 0.35);
      g.mirror(S.M, () => {
        g.bg('#5f8a3e');
        for (const [a, b, z] of s.my.st) g.ell(lerp(V.x0, V.x1, a), lerp(V.y0, V.y1, b), 70 + 60 * z, 40 + 30 * z, '#76523a', 0);
        for (const [x, y, c] of [[90, 420, C.red], [910, 640, '#ff9f1c'], [140, 900, C.red]]) { g.rr(x - 8, y, 16, 34, 6, '#f6eedc', 4); g.ell(x, y, 34, 24, c); g.circ(x - 10, y - 6, 5, '#ffffff', 0); g.circ(x + 12, y - 2, 4, '#ffffff', 0); }
        // たき火
        g.at(500, 210, () => {
          if (lit) g.glow(0, 0, 330, '#ffb15a', 0.6 * lit);
          for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; g.ell(Math.cos(a) * 112, Math.sin(a) * 84, 36, 26, i % 2 ? '#a3abbd' : '#8f97aa'); }
          g.circ(0, 0, 86, lit ? '#5a3424' : '#3d2b22', 0);
          for (const a of [0.4, -0.5, 1.6]) g.at(0, 0, a, 1, 1, () => { g.cap(-80, 0, 80, 0, 18, '#8a5a36'); g.circ(80, 0, 14, '#d39457', 4); });
          if (lit) { const f = 1 + 0.08 * Math.sin(s.t * 19); g.at(0, 0, 0, lit * f, lit / f, () => { g.path('M0 -150 C48 -96 82 -50 66 -6 C52 34 -52 34 -66 -6 C-82 -50 -40 -88 0 -150Z', '#ff6b2c'); g.path('M4 -104 C30 -70 46 -36 38 -6 C30 18 -30 18 -38 -6 C-44 -34 -20 -60 4 -104Z', '#ffd23f', 0); g.ell(0, -4, 18, 14, '#ffffff', 0); }); }
        });
        // 小枝
        for (const [c, a, i] of [[S.c1, S.a1, 0], [S.c2, S.a2, 1]]) {
          const br = a >= 0 ? E.outBack(clamp(a / 0.12)) : 0, an = 0.32 * br, gap = 8 * br;
          g.at(c[0], c[1] - 10, i ? 0.18 : -0.12, 1, 1, () => {
            g.shadow(0, 14, 180, 18, 0.2);
            g.at(-175, 0, -an, 1, 1, () => { g.cap(0, 0, 175 - gap, 0, 14, '#8a5a36'); g.cap(70, -2, 112, -44, 7, '#8a5a36'); g.line([20, -4, 150, -4], '#b07a4e', 4); if (br) g.tri(175 - gap, -12, 175 - gap, 12, 196, -2, '#f2d49b', 4); });
            g.at(175, 0, an, 1, 1, () => { g.cap(0, 0, -175 + gap, 0, 14, '#8a5a36'); g.cap(-86, 2, -128, 40, 7, '#8a5a36'); g.line([-20, -4, -150, -4], '#b07a4e', 4); if (br) g.tri(-175 + gap, -12, -175 + gap, 12, -196, 2, '#f2d49b', 4); });
          });
        }
        feet(g, S, { kind: 'shoe', c: '#ff8a1f' });
      });
      if (lit >= 0.5 && !s.my.lit) { s.my.lit = 1; g.sfx('firework'); }
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.chips(x, y, '#d39457', 10);
      g.fx.lines(x, y, { n: 8, r0: 120, r1: 220, w: 10 });
      g.fx.pop('パキッ', k === 1 ? x : MX(g, s, 250), k === 1 ? y - 270 : 430, { size: 104 });
      g.fx.shake(6, 0.1);
      if (k === 2) { g.fx.sparks(MX(g, s, 500), 170, 14, ['#ffd23f', '#ff9f1c', '#ffffff']); g.fx.pop('ボッ', MX(g, s, 700), 150, { size: 100, c: '#ffd23f', life: 0.8 }); }
    },
  },

  /* 泥んこを踏む（ぶたが喜ぶ） */
  {
    id: 'stomp-mud', acts: ['stomp'], modes: ['alt', 'one'], theme: 'farm', sfx: 'squish',
    vars: [{ k: 'mud', name: '泥んこを踏む', short: '泥んこ' }],
    init(s) { const r = s.r; s.my.spl = [0, 1].map(() => Array.from({ length: 6 }, () => [r() * TAU, 150 + r() * 120, 20 + r() * 26])); s.my.pud = Array.from({ length: 6 }, () => [r(), r(), r()]); s.my.straw = Array.from({ length: 16 }, () => [r(), r(), r() * TAU]); },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), mood = s.k, e2 = ease(S.a2 - 0.15, 0.3);
      g.mirror(S.M, () => {
        g.bg('#93603a');
        for (const [a, b, z] of s.my.pud) { const x = lerp(V.x0, V.x1, a), y = lerp(V.y0, V.y1, b); g.ell(x, y, 120 + 80 * z, 70 + 40 * z, '#7a4c2b', 0); g.ell(x - 30, y - 20, 50, 12, 'rgba(255,255,255,0.18)', 0, -0.2); }
        for (const [a, b, an] of s.my.straw) g.at(lerp(V.x0, V.x1, a), lerp(V.y0, V.y1, b), an, 1, 1, () => g.line([-30, 0, 30, 0], '#f0d27a', 6));
        // さく
        g.band('top', 60, '#7cbf5a'); g.rect(V.x0 - 20, 40, V.x1 - V.x0 + 40, 26, '#c98b52', 5);
        for (let x = Math.floor(V.x0 / 200) * 200; x < V.x1 + 200; x += 200) g.circ(x, 52, 24, '#a86f43');
        // 泥はね
        for (const [c, a, i] of [[S.c1, S.a1, 0], [S.c2, S.a2, 1]]) if (a >= 0) { const e = ease(a, 0.2); for (const [an, d, r] of s.my.spl[i]) { const x = c[0] + Math.cos(an) * d * e, y = c[1] + Math.sin(an) * d * e * 0.8; g.circ(x, y, r * e, '#5b3419', 0); g.circ(x - r * 0.3, y - r * 0.3, r * 0.3 * e, 'rgba(255,255,255,0.3)', 0); } g.ell(c[0], c[1] + 10, 120 * e, 150 * e, 'rgba(70,35,15,0.35)', 0); }
        // ぶた
        const jy = s.k ? -Math.abs(jig(s.age, 36, 13, 5)) : 0, roll = mood >= 2 ? jig(S.a2, 0.25, 9, 3) : 0;
        g.at(500, 245 + jy, roll, 1, 1, () => {
          g.shadow(0, 96 - jy, 170, 30, 0.2);
          g.ell(0, 40, 160, 92, '#ffb3c6'); g.ell(-70, 60, 34, 20, '#8c5a36', 0); g.ell(80, 30, 26, 16, '#8c5a36', 0);
          g.tri(-78, -64, -26, -102, -40, -40, '#ff9fb8'); g.tri(78, -64, 26, -102, 40, -40, '#ff9fb8');
          g.circ(0, -16, 82, '#ffc2d1');
          g.ell(0, 16, 38, 27, '#ff9fb8'); g.ell(-13, 16, 6, 10, '#c2667f', 0); g.ell(13, 16, 6, 10, '#c2667f', 0);
          if (mood === 0) { g.arc(-32, -30, 13, 0.2, Math.PI - 0.2, C.ol, 5); g.arc(32, -30, 13, 0.2, Math.PI - 0.2, C.ol, 5); }
          else if (mood === 1) { g.circ(-32, -32, 13, '#ffffff', 4); g.circ(32, -32, 13, '#ffffff', 4); g.circ(-30, -30, 6, C.ol, 0); g.circ(34, -30, 6, C.ol, 0); }
          else { g.arc(-32, -24, 14, Math.PI + 0.3, -0.3, C.ol, 6); g.arc(32, -24, 14, Math.PI + 0.3, -0.3, C.ol, 6); g.circ(-58, 2, 12, '#ff7aa2', 0); g.circ(58, 2, 12, '#ff7aa2', 0); }
          if (e2) g.at(0, 0, 0, e2, e2, () => { g.ell(-110, -40, 30, 18, '#5b3419', 0); g.ell(120, -10, 24, 16, '#5b3419', 0); });
        });
        feet(g, S, { kind: 'shoe', c: '#3cc46b' });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.burst(x, y, { n: 20, c: ['#5b3419', '#7a4c2b', '#9a6a40'], shape: 'dot', sp: [300, 850], size: [14, 28], g: 1800 });
      g.fx.pop(k === 1 ? 'ベチャッ' : 'ドロドロ', k === 1 ? x : MX(g, s, 760), k === 1 ? y - 270 : 470, { size: 100, c: '#ffe2c2', o: '#4a2a14' });
      g.fx.shake(k === 1 ? 7 : 9, 0.12);
      if (k === 1) g.fx.pop('ブヒ？', MX(g, s, 700), 140, { size: 64, c: '#ffffff', life: 0.8, rise: 20 });
      else { g.fx.hearts(MX(g, s, 500), 150, 6); g.fx.pop('ブヒー！', MX(g, s, 290), 130, { size: 76, c: '#ffc2d1', life: 0.9 }); }
    },
  },

  /* 足ふみポンプでうきわをふくらませる（片足） */
  {
    id: 'stomp-pump', acts: ['stomp'], modes: ['one'], theme: 'sea', sfx: 'swish',
    vars: [{ k: 'pump', name: 'うきわをふくらます', short: 'うきわ', one: [[600, 700], [600, 700]] }],
    init(s) { s.my.b = 0; },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), fx = 600, fy = 700;
      const f0 = [0.42, 0.72, 1][s.k], fp = [0.42, 0.42, 0.72][s.k], f = s.k ? lerp(fp, f0, E.outElastic(clamp(s.age / 0.55))) : f0;
      g.mirror(S.M, () => {
        g.bg('#eef8fd');
        g.tiles(V.x0 - 40, 260, V.x1 - V.x0 + 80, V.y1 - 220, 110, '#f6fcff', '#e1f2fa');
        g.rect(V.x0 - 40, V.y0 - 40, V.x1 - V.x0 + 80, 300 - V.y0, '#36b4e6', 0);
        for (let x = Math.floor(V.x0 / 160) * 160; x < V.x1 + 160; x += 160) for (let y = Math.floor(V.y0 / 90) * 90; y < 240; y += 90) g.arc(x + ((y / 90) % 2) * 80 + 20 * Math.sin(s.t * 2 + y), y + 30, 30, Math.PI * 1.1, Math.PI * 1.9, 'rgba(255,255,255,0.6)', 5);
        g.band(250, 290, '#ffffff', 6);
        // ホース
        const hose = [fx - 10, fy - 150, fx - 70, fy - 250, 520, 520, 430, 470];
        g.curve(hose, C.ol, 22); g.curve(hose, '#5a6b8a', 12);
        for (const [a] of [[S.a1], [S.a2]]) if (a >= 0 && a < 0.5) { const q = a / 0.5, i = Math.min(2, Math.floor(q * 3)), t = q * 3 - i; g.circ(lerp(hose[i * 2], hose[i * 2 + 2], t), lerp(hose[i * 2 + 1], hose[i * 2 + 3], t), 18, '#8fa3c4', 5); }
        // うきわ（アヒル）
        g.at(330, 400, 0, f, f, () => {
          g.shadow(14, 22, 190, 176, 0.18);
          g.circ(0, 0, 175, '#ffd23f'); g.circ(0, 0, 70, '#e9f6fc', 7);
          for (let i = 0; i < 6; i++) g.arc(0, 0, 122, i * TAU / 6, i * TAU / 6 + 0.5, '#ff8a3d', 52);
          g.ring(0, 0, 175, C.ol, 7); g.ring(0, 0, 70, C.ol, 7);
          g.hl(-70, -90, 56, 20, -0.7, 0.55);
          if (f < 0.7) for (const a of [0.6, 2.2, 3.9, 5.2]) g.line([Math.cos(a) * 100, Math.sin(a) * 100, Math.cos(a + 0.25) * 150, Math.sin(a + 0.25) * 150], sh('#ffd23f', -0.3), 6);
          g.at(0, -170, () => { g.circ(0, 0, 66, '#ffd23f'); g.ell(0, -62, 32, 20, '#ff8a1f'); g.circ(-24, -14, 9, C.ol, 0); g.circ(24, -14, 9, C.ol, 0); g.hl(-20, 20, 18, 9, -0.4, 0.5); });
        });
        // ポンプ
        const press = 1 - clamp(S.feet[0].p * 2.5);
        g.shadow(fx, fy + 20, 104, 150, 0.2);
        g.rr(fx - 88, fy - 150, 176, 290, 34, '#3a86ff');
        g.rr(fx - 70, fy - 128, 140, 240, 26, press > 0.5 ? '#e6b800' : '#ffd23f');
        for (let i = 0; i < 5; i++) g.line([fx - 46, fy - 90 + i * 40, fx + 46, fy - 90 + i * 40], 'rgba(120,90,0,0.4)', 7);
        feet(g, S, { kind: 'shoe', c: '#ff6b8b' });
      });
      if (s.k >= 2 && s.age > 0.3 && !s.my.b) { s.my.b = 1; g.sfx('boing'); g.fx.pop('パンパン！', MX(g, s, 330), 120, { size: 96, c: C.yellow }); g.fx.stars(MX(g, s, 330), 400, 10); }
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.smoke(x, y - 150, 4, '#ffffff');
      g.fx.pop(k === 1 ? 'シュッ' : 'シュッ！', g.mx(s.lastSide, 840), 470, { size: 96 });
      g.fx.shake(5, 0.1);
    },
  },

  /* バスドラムのペダル */
  {
    id: 'stomp-drum', acts: ['stomp'], modes: ['alt', 'one'], theme: 'music', sfx: 'stomp',
    vars: [{ k: 'drum', name: 'バスドラムを踏む', short: 'バスドラム', sp: { R: [630, 740], L: [370, 740] }, one: [[560, 740], [560, 740]], home: 190 }],
    draw(g, s, v) {
      const V = g.V, S = st(s, v), age = s.k ? s.age : 9, b = 1 + 0.035 * Math.exp(-14 * age), cym = S.a2 >= 0 ? jig(S.a2, 0.22, 16, 4) : 0;
      g.mirror(S.M, () => {
        g.bg('#241d3d');
        for (const sx of [200, 800]) g.alpha(0.12, () => g.circ(sx, 300, 380, '#ffe9a8', 0));
        g.circ(500, 600, 560, '#7a2338'); g.ring(500, 600, 530, '#9c3550', 14);
        // シンバルとハイハット
        g.at(850, 170, cym, 1, 1, () => { g.line([0, 0, 40, 300], '#8f9bb0', 10); g.ell(0, 0, 150, 60, '#f2c14e'); g.ell(0, 0, 100, 40, null, 4); g.ell(0, 0, 20, 10, '#c99a2e', 0); g.hl(-50, -14, 50, 12, -0.1, 0.5); });
        g.at(150, 230, () => { g.line([0, 0, -30, 300], '#8f9bb0', 10); g.ell(0, 0, 110, 44, '#f2c14e'); g.ell(0, -10, 110, 44, '#f7d27a'); g.ell(0, -10, 16, 8, '#c99a2e', 0); });
        // ドラム
        g.line([300, 470, 210, 640], '#8f9bb0', 12); g.line([700, 470, 790, 640], '#8f9bb0', 12);
        g.at(500, 320, 0, b, b, () => {
          g.circ(0, 0, 270, '#d7263d');
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.rr(Math.cos(a) * 262 - 12, Math.sin(a) * 262 - 12, 24, 24, 6, '#cfd6e2', 4); }
          g.circ(0, 0, 238, '#f6f1e6', 6); g.ring(0, 0, 200, '#e6dfcf', 6);
          g.circ(0, 140, 42, '#d9d2c2', 0);
          if (s.k >= 1) g.glow(0, -40, 150, '#fff09a', 0.7);
          g.star(0, -40, 60, 26, 5, s.k >= 1 ? '#fff3a0' : '#ffd23f', 5);
          if (s.k >= 2) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + s.t * 2; g.circ(Math.cos(a) * 252, Math.sin(a) * 252, 13, ['#ff4fa3', '#ffd23f', '#3cf2c3', '#4dabf7'][i % 4], 0); }
          g.hl(-100, -120, 70, 24, -0.6, 0.5);
        });
        // ペダル
        const pedals = S.alt ? S.feet.map(f => [f.side, f]) : [['R', S.feet[0]]];
        for (const [sd, f] of pedals) {
          const P = S.alt ? (v.sp)[sd] : v.one[0], x = P[0], y = P[1], sg = S.alt ? (sd === 'L' ? -1 : 1) : 0;
          const press = S.alt ? clamp(f.p * 2.2) : clamp(f.p * 2.2), hx = lerp(x - sg * 50 - (S.alt ? 0 : 40), x + sg * 16, press), hy = lerp(440, 620, press);
          g.rr(x - 58, y - 150, 116, 290, 24, '#5c6478');
          g.rr(x - 46, y - 136, 92, 262, 18, '#b7bfcc', 0);
          for (let i = 0; i < 6; i++) g.line([x - 30, y - 110 + i * 40, x + 30, y - 110 + i * 40], '#8f9bb0', 6);
          g.rect(x - 70, y - 178, 140, 26, '#2b2140', 0);
          g.line([x, y - 166, hx, hy], '#cfd6e2', 12);
          g.circ(hx, hy, 34 + 10 * press, '#ffffff'); g.circ(hx, hy, 14, '#e3e7ee', 0);
        }
        feet(g, S, { kind: 'shoe', c: '#3b3b4f' });
      });
    },
    hit(g, s, k, v) {
      const x = MX(g, s, 500);
      g.fx.ring(x, 330, { c: '#ffffff', r0: 120, r1: 330, w: 16 });
      g.fx.pop(k === 1 ? 'ドン' : 'ドドン！', MX(g, s, k === 1 ? 830 : 500), k === 1 ? 470 : 640, { size: k === 1 ? 120 : 130, c: k === 1 ? '#ffffff' : '#ffd23f' });
      g.fx.shake(k === 1 ? 8 : 12, 0.14);
      if (k === 2) { g.sfx('cymbal'); g.fx.sparks(MX(g, s, 850), 170, 12); g.fx.notes(x, 400, 6, [C.yellow, C.pink, '#ffffff']); }
    },
  },

  /* 光るダンスフロア */
  {
    id: 'stomp-dance', acts: ['stomp'], modes: ['alt', 'one'], theme: 'party', sfx: 'pluck',
    vars: [{ k: 'dance', name: '光るゆかを踏む', short: '光るゆか', one: [[650, 610], [650, 610]] }],
    init(s) { const r = s.r; s.my.amb = Array.from({ length: 10 }, () => [Math.floor(r() * 9) - 4, Math.floor(r() * 9) - 3, r() * TAU, (r() * 6) | 0]); s.my.dot = Array.from({ length: 12 }, () => [r(), r(), r()]); },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), T = 150, cols = ['#ff4fa3', '#ffd23f', '#3cf2c3', '#4dabf7', '#b07cff', '#ff8a3d'];
      const tile = (i, j, c, a) => g.alpha(a, () => { g.rr(50 + i * T - T / 2 + 8, 10 + j * T - T / 2 + 8, T - 16, T - 16, 12, c, 0); });
      const tij = c => [Math.round((c[0] - 50) / T), Math.round((c[1] - 10) / T)];
      g.mirror(S.M, () => {
        g.bg('#1b1236');
        const i0 = Math.floor((V.x0 - 50) / T) - 1, i1 = Math.ceil((V.x1 - 50) / T) + 1, j0 = Math.floor((V.y0 - 10) / T) - 1, j1 = Math.ceil((V.y1 - 10) / T) + 1;
        for (const [di, dj, ph, ci] of s.my.amb) tile(3 + di, 4 + dj, cols[ci], 0.18 + 0.14 * Math.sin(s.beat * Math.PI + ph));
        if (S.a2 >= 0) {
          const [ci, cj] = tij(S.c2);
          for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const d = Math.hypot(i - ci, j - cj); if (S.a2 * 9 > d) tile(i, j, cols[(Math.round(d) + Math.floor(s.beat * 2)) % 6], 0.85 - 0.25 * prog(S.a2 - d / 9, 0.6)); }
        }
        for (const [c, a, n] of [[S.c1, S.a1, 0], [S.c2, S.a2, 1]]) if (a >= 0) { const [i, j] = tij(c), pulse = 0.85 + 0.15 * Math.sin(s.beat * Math.PI * 2); g.glow(50 + i * T, 10 + j * T, 260, cols[n * 2], 0.5); tile(i, j, cols[n * 2], pulse); g.alpha(0.8, () => g.rr(50 + i * T - 40, 10 + j * T - 40, 80, 80, 12, '#ffffff', 0)); }
        for (let i = i0; i <= i1 + 1; i++) g.line([50 + i * T - T / 2, V.y0 - 20, 50 + i * T - T / 2, V.y1 + 20], '#3a2d6b', 8);
        for (let j = j0; j <= j1 + 1; j++) g.line([V.x0 - 20, 10 + j * T - T / 2, V.x1 + 20, 10 + j * T - T / 2], '#3a2d6b', 8);
        for (const [a, b, z] of s.my.dot) { const x = lerp(V.x0, V.x1, (a + s.t * 0.06 * (z + 0.5)) % 1), y = lerp(V.y0, V.y1, b); g.alpha(0.6, () => g.circ(x, y, 8 + 8 * z, '#ffffff', 0)); }
        feet(g, S, { kind: 'shoe', c: '#e9e4ff' });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.ring(x, y, { c: k === 1 ? '#ff4fa3' : '#3cf2c3', r0: 80, r1: 260, w: 14 });
      g.fx.burst(x, y, { n: 12, c: ['#ffffff', '#ff4fa3', '#3cf2c3'], shape: 'star', sp: [300, 700], size: [14, 24], g: 600 });
      g.fx.pop(k === 1 ? 'ピカッ' : 'フィーバー！', k === 1 ? x : 500, k === 1 ? y - 270 : 300, { size: k === 1 ? 100 : 104, c: k === 1 ? '#ffffff' : '#3cf2c3' });
      g.fx.shake(5, 0.1);
      if (k === 2) g.fx.confetti(60);
    },
  },

  /* うどんを踏む（はだし） */
  {
    id: 'stomp-udon', acts: ['stomp'], modes: ['alt', 'one'], theme: 'kitchen', sfx: 'mochi',
    vars: [{ k: 'udon', name: 'うどんを踏む', short: 'うどん' }],
    draw(g, s, v) {
      const V = g.V, S = st(s, v), R = [190, 250, 305], r = s.k ? lerp(R[s.k - 1], R[s.k], E.outBack(clamp(s.age / 0.2))) : R[0], bowl = ease(S.a2 - 0.25, 0.35);
      g.mirror(S.M, () => {
        g.bg('#d3d995');
        for (let y = Math.floor(V.y0 / 34) * 34; y < V.y1; y += 34) g.line([V.x0 - 20, y, V.x1 + 20, y], '#c2c97f', 4);
        for (let x = Math.floor((V.x0 - 10) / 490) * 490 + 10; x < V.x1 + 20; x += 490) g.rect(x - 14, V.y0 - 20, 28, V.y1 - V.y0 + 40, '#2f5d3a', 0);
        // ふくろ
        g.shadow(510, 620, 400, 440, 0.15);
        g.rr(130, 190, 740, 840, 60, 'rgba(255,255,255,0.32)', 5);
        g.tri(460, 196, 540, 196, 500, 150, 'rgba(255,255,255,0.55)', 5); g.tri(470, 140, 530, 140, 500, 170, 'rgba(255,255,255,0.55)', 5);
        g.curve([180, 300, 170, 600, 200, 900], 'rgba(255,255,255,0.7)', 10);
        // 生地
        const sy = s.k ? lerp(0.9, 0.82, clamp(s.age / 0.2)) : 0.9;
        g.ell(500, 612, r, r * sy, '#fbf3df', 7);
        g.ell(500 - r * 0.25, 612 - r * 0.3, r * 0.45, r * 0.18, 'rgba(255,255,255,0.6)', 0, -0.2);
        for (const [c, a, d] of [[S.c1, S.a1, S.d1], [S.c2, S.a2, S.d2]]) if (a >= 0) g.at(c[0], c[1], 0, d === 'L' ? -1 : 1, 1, () => g.sole(0, 0, -Math.PI / 2, 0.98, 'R', '#efe2bf'));
        if (bowl) udonBowl(g, 830, 150, bowl);
        feet(g, S, { kind: 'bare', c: '#ffd9bf' });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.ring(x, y, { c: '#ffffff', r0: 80, r1: 240, w: 12, sy: 0.8 });
      g.fx.burst(x, y, { n: 8, c: ['#ffffff', '#fbf3df'], shape: 'dot', sp: [200, 500], size: [10, 18], g: 900 });
      g.fx.pop(k === 1 ? 'ペタッ' : 'モチモチ', k === 1 ? x : 480, k === 1 ? y - 270 : 260, { size: k === 1 ? 100 : 110, c: k === 1 ? '#ffffff' : '#ffe9a8' });
      g.fx.shake(6, 0.12);
      if (k === 2) g.fx.stars(MX(g, s, 830), 150, 8);
    },
  },

  /* 氷をパリン */
  {
    id: 'stomp-ice', acts: ['stomp'], modes: ['alt', 'one'], theme: 'winter', sfx: ['crack', 'glass'],
    vars: [{ k: 'ice', name: '氷を踏みわる', short: '氷' }],
    init(s) {
      const r = s.r;
      s.my.cr = [0, 1].map(() => Array.from({ length: 7 }, (_, i) => { const a = i / 7 * TAU + r() * 0.5, L = 170 + r() * 110, pts = [0, 0]; for (let j = 1; j <= 3; j++) { const aa = a + (r() - 0.5) * 0.5; pts.push(Math.cos(aa) * L * j / 3, Math.sin(aa) * L * j / 3); } return pts; }));
    },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), sht = prog(S.a2, 0.25);
      g.mirror(S.M, () => {
        g.bg('#c9d4e0');
        g.grassTufts(170, '#c7b27a', 3, 9); g.grassTufts(1100, '#c7b27a', 8, 9);
        for (const [x, y] of [[120, 300], [880, 260], [90, 930], [900, 980], [520, 1090]]) g.ell(x, y, 46, 30, '#aab4c3');
        if (!sht) {
          g.path(ICE_D, g.lin(200, 250, 800, 950, ['#d9f4ff', '#a8def5']), 7);
          g.clipPath(ICE_D, () => {
            for (let i = 0; i < 5; i++) g.line([150 + i * 160, 1000, 350 + i * 160, 200], 'rgba(255,255,255,0.5)', 10 + (i % 2) * 8);
            for (const [x, y, r] of [[300, 450, 10], [330, 480, 6], [700, 760, 9], [660, 420, 7]]) g.ring(x, y, r, 'rgba(255,255,255,0.8)', 4);
            g.at(440, 820, 0.6, 1, 1, () => g.path('M0 -40 L10 -18 L32 -26 L24 -4 L40 6 L18 14 L22 34 L4 22 L0 40 L-4 22 L-22 34 L-18 14 L-40 6 L-24 -4 L-32 -26 L-10 -18 Z', 'rgba(232,90,50,0.55)', 0));
            for (const [c, a, i] of [[S.c1, S.a1, 0], [S.c2, S.a2, 1]]) if (a >= 0) { const e = E.outQ(clamp(a / 0.12)); g.at(c[0], c[1], 0, e, e, () => { for (const p of s.my.cr[i]) { g.line(p, '#5a7da0', 9); g.line(p, '#ffffff', 4); } }); }
          });
        } else {
          g.path(ICE_D, '#3d8fc6', 7);
          const [cx, cy] = S.c2, n = ICE.length / 2;
          for (let i = 0; i < n; i++) {
            const x1 = ICE[i * 2], y1 = ICE[i * 2 + 1], x2 = ICE[((i + 1) % n) * 2], y2 = ICE[((i + 1) % n) * 2 + 1];
            const mx = (x1 + x2) / 2 - cx, my = (y1 + y2) / 2 - cy, L = Math.hypot(mx, my) || 1, d = 34 * E.outQ(sht);
            g.at(mx / L * d, my / L * d, () => g.at(cx, cy, (i % 2 ? 0.05 : -0.05) * sht, 1, 1, () => { g.poly([0, 0, x1 - cx, y1 - cy, x2 - cx, y2 - cy], i % 2 ? '#c4ecfb' : '#b2e2f6', 6); g.line([(x1 - cx) * 0.3, (y1 - cy) * 0.3, (x1 - cx) * 0.8, (y1 - cy) * 0.8], 'rgba(255,255,255,0.8)', 6); }));
          }
        }
        feet(g, S, { kind: 'shoe', c: '#26386b' });
      });
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k);
      g.fx.burst(x, y, { n: k === 1 ? 8 : 20, c: ['#ffffff', '#d9f4ff', '#a8def5'], shape: 'chip', sp: [300, 900], size: [12, 26], g: 1600 });
      g.fx.pop(k === 1 ? 'ピキッ' : 'パリーン', k === 1 ? x : 500, k === 1 ? y - 270 : 250, { size: k === 1 ? 100 : 116, c: '#ffffff', o: '#2f6c9a' });
      g.fx.shake(k === 1 ? 6 : 11, 0.14);
      if (k === 2) { g.fx.splash(x, y, C.water, 16); g.fx.stars(500, 600, 6, ['#ffffff', '#bfeaff', C.gold]); }
    },
  },

  /* 足でペイント（はなまる） */
  {
    id: 'stomp-paint', acts: ['stomp'], modes: ['alt', 'one'], theme: 'school', sfx: 'stamp',
    vars: [{ k: 'paint', name: '足でお絵かき', short: '足あとアート', one: [[610, 700], [520, 430]] }],
    init(s) { const r = s.r; s.my.dr = [0, 1].map(() => Array.from({ length: 7 }, () => [r() * TAU, 120 + r() * 90, 6 + r() * 12])); s.my.ok = 0; },
    draw(g, s, v) {
      const V = g.V, S = st(s, v), cR = '#ff4f8b', cL = '#3a86ff', fr = ease(S.a2 - 0.06, 0.3);
      const colOf = d => (S.alt && d === 'L' ? cL : cR);
      g.mirror(S.M, () => {
        g.bg('#e5b98a'); g.planks(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, V.y1 - V.y0 + 40, Math.ceil((V.y1 - V.y0 + 40) / 130), '#e5b98a');
        g.shadow(512, 616, 400, 480, 0.18);
        g.rect(110, 130, 780, 940, '#ffffff', 6);
        for (const [x, y, a] of [[120, 140, -0.7], [880, 140, 0.7], [120, 1060, 0.7], [880, 1060, -0.7]]) g.at(x, y, a, 1, 1, () => g.rect(-46, -16, 92, 32, 'rgba(255,224,102,0.8)', 0));
        for (const [c, a, d, i] of [[S.c1, S.a1, S.d1, 0], [S.c2, S.a2, S.d2, 1]]) if (a >= 0) {
          const col = colOf(d), e = ease(a, 0.15);
          for (const [an, dd, r] of s.my.dr[i]) g.circ(c[0] + Math.cos(an) * dd * e, c[1] + Math.sin(an) * dd * e * 1.1, r, col, 0);
          g.at(c[0], c[1], 0, d === 'L' ? -1 : 1, 1, () => g.sole(0, 0, -Math.PI / 2, 1, 'R', col));
        }
        if (fr) {
          const z = lerp(1.12, 1, clamp(fr));
          g.alpha(clamp(fr * 1.5), () => g.at(500, 600, 0, z, z, () => { g.line([-410, -490, 410, -490, 410, 490, -410, 490, -410, -490], '#f2b632', 44); g.rr(-432, -512, 864, 1024, 20, null, 6); g.rr(-388, -468, 776, 936, 6, null, 5); g.line([-410, -490, 410, -490], '#ffd978', 10); }));
          hanamaru(g, 250, 270, 1.15 * fr, clamp((S.a2 - 0.1) / 0.3));
        }
        feet(g, S, f => ({ kind: 'shoe', c: S.alt && f.side === 'L' ? cL : cR }));
      });
      if (fr >= 0.9 && !s.my.ok) { s.my.ok = 1; g.sfx('chime'); }
    },
    hit(g, s, k, v) {
      const [x, y] = spotAt(g, s, v, k), col = s.mode === 'alt' && s.lastSide === 'L' ? '#3a86ff' : '#ff4f8b';
      g.fx.burst(x, y, { n: 14, c: [col, '#ffffff'], shape: 'drop', sp: [250, 650], size: [10, 20], g: 1400 });
      g.fx.pop(k === 1 ? 'ペタッ' : 'アート！', k === 1 ? x : 560, k === 1 ? y - 270 : 220, { size: k === 1 ? 100 : 116, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.shake(5, 0.1);
      if (k === 2) g.fx.stars(500, 500, 10);
    },
  },
];

const PUD_D = blobD(blobPts(500, 600, 380, 12, 3, 0.8));
const ICE = blobPts(500, 600, 395, 12, 5, 0.84), ICE_D = blobD(ICE);
