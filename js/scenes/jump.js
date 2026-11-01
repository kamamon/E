/* ジャンプ — 頭の上のブロック・風船にタッチ など（p=0 がいちばん高い所） */
import { C, E, clamp, lerp, sh, jig } from '../kit.js';
import { squash } from '../kit.js';

const UP = [
  { k: 'kusudama', name: 'くす玉を割る', short: 'くす玉', theme: 'party' },
  { k: 'balloon', name: '風船にタッチ', short: '風船', theme: 'party', balloon: 1 },
];
const BX = 500, BY = 215;

export default [
  {
    id: 'jump-up', acts: ['jump'], modes: ['both', 'one', 'alt'], sfx: (k, v) => v.balloon ? 'pop' : k === 2 ? 'firework' : 'wood', vars: UP,
    draw(g, s, v) {
      const V = g.V, up = 200 * (1 - s.p);       // 跳ぶと景色が下へ
      if (v.balloon) g.bg('#ffe3f0', '#fff6d6'); else g.bg('#fff1d6', '#ffd9c2');
      g.at(0, up, () => {
        if (v.balloon) { g.dots(V.x0, V.y0 - up, V.x1 - V.x0, V.y1 - V.y0 + 400, 120, 10, '#ffc4dd');
          g.band(880, 'bottom', '#c9a3ff', 7);
          const cols = [C.red, C.blue, C.yellow, C.green, C.purple];
          [[-1, 330, 150], [1, 670, 160]].forEach(([sgn, x, y], i) => {
            const popped = s.k > i; if (popped) return;
            const bob = Math.sin(s.beat * Math.PI + i) * 8;
            g.curve([x, y + 90 + bob, x - 10, y + 180, x + 10, y + 260], C.ol, 3);
            g.ell(x, y + bob, 70, 84, cols[(i + (s.idx | 0)) % 5]); g.tri(x - 10, y + 84 + bob, x + 10, y + 84 + bob, x, y + 98 + bob, cols[(i + (s.idx | 0)) % 5], 4);
            g.hl(x - 26, y - 30 + bob, 16, 28, -0.4, 0.55);
          });
        } else {
          for (let i = 0; i < 9; i++) { const x = 60 + i * 110; g.line([x, V.y0 - up, x + 30, 120], i % 2 ? '#ff7a7a' : '#ffd23f', 10); }
          g.band(880, 'bottom', '#d94b4b', 7); g.band(900, 'bottom', '#f2f2f2'); g.stripes(V.x0, 900, V.x1 - V.x0, 140, 70, '#ffffff', '#ff6b6b');
          const open = s.k >= 2 ? E.outBack(clamp(s.age / 0.35)) : 0, crack = s.k >= 1 ? 1 : 0, bump = s.k ? -Math.max(0, jig(s.age, 24, 18, 9)) : 0;
          g.line([BX, V.y0 - up, BX, BY - 120], C.ol, 6);
          if (open > 0) {   // 開いた垂れ幕
            const L = 380 * open; g.rr(BX - 70, BY - 20, 140, L, 6, '#ffffff'); g.rr(BX - 70, BY - 20, 140, 26, 6, '#e8402f', 0);
            if (open > 0.6) g.text('ナイス', BX, BY + 40 + L * 0.42, { size: 52, f: '#e8402f', font: '"Zen Kaku Gothic New", sans-serif', w: 900 });
          }
          for (const sd of [-1, 1]) g.at(BX + sd * (6 + 70 * open), BY + bump, sd * 0.9 * open, 1, 1, () => {
            g.path(sd < 0 ? 'M0 -120 A120 120 0 0 0 0 120 Z' : 'M0 -120 A120 120 0 0 1 0 120 Z', C.gold);
            g.clipPath(sd < 0 ? 'M0 -120 A120 120 0 0 0 0 120 Z' : 'M0 -120 A120 120 0 0 1 0 120 Z', () => { for (let a = -100; a <= 100; a += 50) g.arc(sd * 20, 0, 120, a / 120 - 0.2, a / 120 + 0.2, '#ffe17a', 6); });
          });
          if (!open) { g.circ(BX, BY + bump, 120, null); if (crack) g.line([BX, BY - 120 + bump, BX + 8, BY - 40 + bump, BX - 6, BY + 30 + bump, BX + 4, BY + 120 + bump], C.ol, 6); g.rr(BX - 22, BY - 140 + bump, 44, 26, 8, '#e8402f'); }
          g.line([BX, BY + 120, BX, BY + 200], '#e8402f', 8); g.circ(BX, BY + 206, 12, '#e8402f');
        }
      });
      // 手（自分といっしょに動く）
      // 風船：手が下にあるあいだに、次の風船の下へ移る
      if (s.my.hx === undefined) s.my.hx = 330;
      const tx = s.k === 0 ? 330 : 670; if (s.p > 0.55 || s.k >= 2) s.my.hx += (tx - s.my.hx) * Math.min(1, (s.dt || 0.016) * 9);
      const fx = v.balloon ? s.my.hx : 500;
      const ty = (v.balloon ? 260 : BY + 120 + 58) + 200;
      g.arm(fx + (v.balloon ? 0 : 20), lerp(ty, 1180, E.ioQ(s.p)), -Math.PI / 2 - 0.08, { hand: v.balloon ? 'palm' : 'fist', side: v.balloon ? (s.my.hx < 500 ? 'L' : 'R') : 'R' });
    },
    hit(g, s, k, v) {
      if (v.balloon) { const x = k === 1 ? 330 : 670; g.fx.burst(x, 350, { n: 22, c: [C.red, C.yellow, C.blue, C.pink, C.green], shape: 'conf', sp: [300, 700], size: [14, 24], g: 700 }); g.fx.pop('パーン', x, 200, { size: 100 }); g.fx.ring(x, 350, { r1: 180 }); }
      else if (k === 1) { g.fx.stars(BX, BY + 120, 6); g.fx.pop('パカッ', BX + 210, 240, { size: 90 }); }
      else { g.fx.confetti(80); g.fx.pop('おめでとう', BX, 560, { size: 90, c: C.yellow }); g.sfx('cheer'); }
      g.fx.shake(6, 0.1);
    },
  },
  /* ===== ここから追加（p=0 がジャンプの頂点。高いときは景色を 200*(1-p) だけ下へ。手足に関係ない見た目なので 3 モード対応） ===== */

  /* 大なわとび：頂点で縄が足の下を通る */
  {
    id: 'jump-rope', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'school', sfx: 'jump',
    vars: [{ k: 'rope', name: '大なわとび', short: '大なわ' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), f = s.ph - Math.floor(s.ph), th = TAU * s.ph;
      g.bg('#86d0ff', '#e3f5ff');
      g.at(0, up, () => {
        g.cloud(220, 120, 0.9); g.cloud(800, 70, 0.7);
        g.rect(V.x0 - 40, 200, V.x1 - V.x0 + 80, 290, '#f4ead3', 6);
        g.rect(V.x0 - 40, 180, V.x1 - V.x0 + 80, 30, '#d9c9a6', 0);
        for (let x = Math.floor(V.x0 / 130) * 130 + 20; x < V.x1; x += 130) for (const y of [240, 350]) { if (Math.abs(x + 45 - 500) < 70) continue; g.rect(x, y, 90, 70, '#9fd8ff', 5); g.line([x + 45, y, x + 45, y + 70], C.ol, 4); }
        g.circ(500, 290, 52, '#ffffff', 6); g.line([500, 290, 500, 256], C.ol, 6); g.line([500, 290, 526, 300], C.ol, 6);
        g.band(490, 'bottom', '#e5c28a', 7);
        g.ell(500, 900, 700, 170, '#ddb67b', 0);
        g.curve([V.x0 - 40, 560, 500, 600, V.x1 + 40, 560], '#ffffff', 8);
        // 回す人（左右）
        const hand = sg => [500 + sg * 300 + sg * 14 * Math.sin(th), 590 + 60 * Math.cos(th)];
        const cheer = s.k >= 2 ? 1 : 0;
        for (const sg of [-1, 1]) {
          const x = 500 + sg * 380, [hx, hy] = hand(sg);
          kid(g, x, 860, 1.35, sg < 0 ? '#ff6b8b' : '#4f6bff', '#3b2a20', cheer);
          g.cap(x - sg * 20, 860 - 1.35 * 170, hx, hy, 15, sg < 0 ? '#ff6b8b' : '#4f6bff');
          g.circ(hx, hy, 18, C.skin, 5);
          if (cheer) g.cap(x + sg * 30, 860 - 1.35 * 170, x + sg * 90, 860 - 1.35 * 290, 15, sg < 0 ? '#ff6b8b' : '#4f6bff');
        }
        // とんだ回数（★が2つそろうとクリア）
        for (const i of [0, 1]) { const on = s.k > i, e = on ? E.outBack(clamp((s.k === i + 1 ? s.age : 9) / 0.3)) : 1; g.star(440 + i * 120, 120, 46 * e, 21 * e, 5, on ? C.gold : 'rgba(255,255,255,0.65)', 6); }
        // 縄：上から前を通って、頂点で足の下へ
        if (f >= 0.5 || f < 0.14) {
          const q = f >= 0.5 ? (f - 0.5) / 0.5 : 1, ym = 420 - 330 * Math.cos(Math.PI * q) + (f < 0.14 ? f / 0.14 * 420 : 0);
          const [lx, ly] = hand(-1), [rx, ry] = hand(1), w = lerp(10, 20, q);
          if (f >= 0.62) g.alpha(0.35, () => g.curve([lx, ly, 500, ym - 90 - 60 * q, rx, ry], '#fff3b0', w + 10));
          g.alpha(f < 0.14 ? 1 - f / 0.2 : 1, () => { g.curve([lx, ly, 500, ym, rx, ry], C.ol, w + 9); g.curve([lx, ly, 500, ym, rx, ry], '#ffd23f', w); });
        }
      });
    },
    hit(g, s, k) {
      g.fx.smoke(500, 960, 5, '#f2dfba');
      g.fx.lines(500, 940, { n: 8, r0: 120, r1: 220, a0: Math.PI, arc: Math.PI, w: 10 });
      g.fx.pop(k === 1 ? 'いーち' : 'にーい！', 500, 300, { size: k === 1 ? 100 : 116, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) { g.fx.confetti(60); g.sfx('cheer'); }
      g.fx.shake(4, 0.08);
    },
  },

  /* ハードル：頂点でハードルが下を通りすぎる → 2台目でゴール */
  {
    id: 'jump-hurdle', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'sports', sfx: 'whoosh',
    vars: [{ k: 'hurdle', name: 'ハードルをとぶ', short: 'ハードル' }],
    init(s) { s.my.goal = 0; },
    draw(g, s, v) {
      const V = g.V, up = jUp(s), H = 290;
      const Y = d => H + 470 / (1 + 4.5 * d), LW = y => (160 + 2240 * (y - H) / 1410) / 3;
      g.bg('#79c6ff', '#d9f1ff');
      g.at(0, up, () => {
        g.band(H - 150, H, '#3b3f6b');
        for (let x = Math.floor(V.x0 / 56) * 56; x < V.x1 + 56; x += 56) { g.circ(x + 28 * ((x / 56) & 1), H - 104, 16, ['#ffd0a8', '#ff9fbd', '#9fd8ff', '#ffe066'][((x / 56) & 3)], 0); g.circ(x + 14, H - 50, 16, ['#ffe066', '#ffd0a8', '#ff9fbd', '#c4a6ff'][((x / 56) & 3)], 0); }
        g.band(H - 12, H, '#ffffff');
        g.band(H, 'bottom', '#57b85a');
        g.poly([420, H, 580, H, 1700, 1700, -700, 1700], '#d0583c', 0);
        for (const u of [0, 1 / 3, 2 / 3, 1]) g.line([420 + 160 * u, H, -700 + 2400 * u, 1700], '#ffffff', 8);
        // ゴールライン・テープ
        const dt = 1.14 - s.ph;
        if (dt > -0.12 && dt < 1.6) { const y = Y(dt), w = LW(y) * 3; g.rect(500 - w / 2, y - 6 * w / 920, w, 12 * w / 920 + 4, '#ffffff', 0); }
        // ハードル（3レーン）
        for (const i of [1, 0]) {
          const d = i - s.ph; if (d < -0.14 || d > 1.7) continue;
          const y = Y(d), lw = LW(y), k = lw / 300;
          for (const ln of [-1, 1, 0]) hurdle(g, 500 + ln * lw, y, k, ln === 0);
        }
        if (dt > -0.12 && dt < 1.6) {
          const y = Y(dt), w = LW(y) * 3, k = w / 920, ty = y - 210 * k;
          if (s.ph < 1.06) g.curve([500 - w / 2, ty, 500, ty + 12 * k, 500 + w / 2, ty], '#e8402f', 10 * k + 3);
          else { const fl = clamp((s.ph - 1.06) / 0.2); g.curve([500 - w / 2, ty, 500 - w / 3, ty + 70 * fl * k, 500 - w / 8, ty + 160 * fl * k], '#e8402f', 10 * k + 3); g.curve([500 + w / 2, ty, 500 + w / 3, ty + 70 * fl * k, 500 + w / 8, ty + 160 * fl * k], '#e8402f', 10 * k + 3); }
        }
      });
      if (s.ph >= 1.08 && !s.my.goal) { s.my.goal = 1; g.fx.pop('ゴール！', 500, 260, { size: 120, c: C.yellow }); g.fx.confetti(70); g.sfx('goal'); }
    },
    hit(g, s, k) {
      g.fx.lines(500, 900, { n: 10, r0: 140, r1: 260, a0: Math.PI * 1.05, arc: Math.PI * 0.9, w: 12 });
      g.fx.pop(k === 1 ? 'ピョーン' : 'ピョーン！', 500, 420, { size: 96 });
      g.fx.shake(4, 0.08);
    },
  },

  /* 川の飛び石：1回目で石へ、2回目で向こう岸へ */
  {
    id: 'jump-stones', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'nature', sfx: 'jump',
    vars: [{ k: 'stones', name: '川の石をわたる', short: '飛び石' }],
    init(s) { const r = s.r; s.my.rip = Array.from({ length: 8 }, () => [r() * 1000, 0.5 + r() * 1.4, r()]); s.my.fl = Array.from({ length: 14 }, () => [r() * 1600 - 300, 2.15 + r() * 0.8, (r() * 4) | 0]); },
    draw(g, s, v) {
      const V = g.V, up = jUp(s), fwd = E.sm((s.ph + 0.3) / 0.6) + E.sm((s.ph - 0.7) / 0.6);
      const Y = d => 300 + 540 / (1 + 2.2 * d), K = d => 1 / (1 + 2.2 * d);
      const yAt = z => { const d = z - fwd; return d < -0.32 ? V.y1 + 600 : Y(d); };
      g.bg('#8fd8ff', '#e6f7ff');
      g.at(0, up, () => {
        g.cloud(240, 110, 0.8); g.cloud(760, 160, 0.6);
        g.hills(300, '#7ccf6a', 40, 4, 4);
        const yb = yAt(2), yr = yAt(0.42);
        g.band(290, yb, '#79c95c');
        g.rect(V.x0 - 300, yb, V.x1 - V.x0 + 600, Math.max(0, yr - yb), '#3fa9e0', 0);
        g.rect(V.x0 - 300, yb, V.x1 - V.x0 + 600, 14 * K(2 - fwd) + 4, '#2f8fc4', 0);
        if (yr < V.y1 + 300) g.band(yr, 'bottom', '#79c95c');
        g.line([V.x0 - 300, yb, V.x1 + 300, yb], '#4e9a3c', 6);
        // 水の流れ
        for (const [x0, z, ph] of s.my.rip) { const y = yAt(z); if (z - fwd < -0.25 || y < yb || y > yr) continue; const k = K(z - fwd), x = ((x0 + s.t * 120 + ph * 400) % 1400) - 200; g.arc(x, y, 50 * k, Math.PI * 1.15, Math.PI * 1.85, 'rgba(255,255,255,0.7)', 10 * k + 2); }
        // 魚（1回目）
        if (s.k >= 1 && s.age < 0.9) { const t = clamp(s.age / 0.8), z = 1.35, k = K(z - fwd), y = yAt(z) - 260 * k * 4 * t * (1 - t), x = lerp(200, 380, t); g.at(x, y, -1.2 + 2.4 * t, k * 1.4, k * 1.4, () => { g.tri(-60, 0, -96, -26, -96, 26, '#ff9f1c'); g.ell(0, 0, 66, 30, '#ff9f1c'); g.circ(34, -6, 6, C.ol, 0); }); }
        // 向こう岸の花と友だち
        for (const [x, z, c] of s.my.fl) { const y = yAt(z), k = K(z - fwd); if (y < 292) continue; g.circ(x, y, 18 * k + 4, ['#ff6b8b', '#ffd23f', '#ffffff', '#c4a6ff'][c], 0); }
        { const z = 2.35, k = K(z - fwd), y = yAt(z); kid(g, 640, y, 1.5 * k + 0.2, '#ff9f1c', '#3b2a20', s.k >= 2 ? 1 : 0); }
        // 石
        for (const z of [1]) { const d = z - fwd; if (d < -0.3) continue; const y = Y(d), k = K(d); g.ell(500, y + 18 * k, 230 * k, 70 * k, '#2f8fc4', 0); g.ell(500, y, 210 * k, 66 * k, '#9aa3b5'); g.ell(470, y - 16 * k, 120 * k, 28 * k, '#b8c0cf', 0); g.ell(560, y + 10 * k, 50 * k, 18 * k, '#7cbf5a', 0); }
        // 手前の岸の石（スタート）
        { const d = 0 - fwd; if (d > -0.3) { const y = Y(d), k = K(d); g.ell(500, y, 260 * k, 80 * k, '#8f97aa'); } }
      });
    },
    hit(g, s, k) {
      g.fx.pop(k === 1 ? 'ピョン' : 'とうちゃく！', 500, 300, { size: k === 1 ? 104 : 104, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.splash(500, 980, C.water, 10);
      if (k === 2) { g.fx.burst(500, 700, { n: 24, c: ['#ff6b8b', '#ffd23f', '#ffffff', '#c4a6ff'], shape: 'leaf', sp: [300, 700], size: [16, 26], g: 500, life: [0.8, 1.3] }); g.fx.stars(500, 400, 8); }
    },
  },

  /* 跳び箱：頂点で手をつく → 2台目は高い段 */
  {
    id: 'jump-vault', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'school', sfx: 'smack',
    vars: [{ k: 'vault', name: '跳び箱をとぶ', short: '跳び箱' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), H = 330;
      const Y = d => H + 470 / (1 + 4 * d), K = d => (Y(d) - H) / 470;
      g.bg('#f4e7cf');
      g.at(0, up, () => {
        for (let x = Math.floor(V.x0 / 220) * 220 + 40; x < V.x1; x += 220) { g.rect(x, 90, 150, 110, '#bfe6ff', 6); g.line([x + 75, 90, x + 75, 200], C.ol, 4); }
        g.rect(V.x0 - 40, H - 40, V.x1 - V.x0 + 80, 40, '#c98b52', 0);
        g.band(H, 'bottom', '#e6b77c');
        for (let i = -12; i <= 12; i++) g.line([500 + i * 40, H, 500 + i * 330, 1800], '#d6a468', 4);
        g.line([V.x0 - 40, Y(0.6), V.x1 + 40, Y(0.6)], '#ffffff', 6);
        // マット（2台目のあと）
        { const d = 1.52 - s.ph; if (d > -0.2) { const y = Y(d), k = K(d); g.poly([500 - 340 * k, y - 60 * k, 500 + 340 * k, y - 60 * k, 500 + 380 * k, y + 40 * k, 500 - 380 * k, y + 40 * k], '#3a86ff'); } }
        for (const i of [1, 0]) {
          const d = i - s.ph; if (d < -0.2 || d > 1.8) continue;
          vaultBox(g, 500, Y(d), K(d), i ? 6 : 4, i);
        }
      });
      // 手（跳び箱の上につく）
      const n = lerp(4, 6, sw(s)), top = H + 470 - (n * 44 + 40) + 200;
      const q = E.ioQ(clamp(s.p));
      for (const sd of ['L', 'R']) { const sg = sd === 'L' ? -1 : 1; g.arm(500 + sg * (120 + 120 * q), lerp(top + 30, 1250, q), -Math.PI / 2 + sg * 0.18, { hand: 'palm', side: sd }); }
    },
    hit(g, s, k) {
      g.fx.lines(500, 880, { n: 10, r0: 140, r1: 260, a0: Math.PI, arc: Math.PI, w: 12 });
      g.fx.pop(k === 1 ? 'トン' : 'きまった！', 500, 300, { size: k === 1 ? 110 : 110, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) { g.fx.stars(500, 600, 10); g.sfx('cheer'); }
      g.fx.shake(6, 0.1);
    },
  },

  /* 噴水ショー：頂点で水がふき上がる */
  {
    id: 'jump-fountain', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'town', sfx: 'splash',
    vars: [{ k: 'fountain', name: 'ジャンプで噴水', short: '噴水' }],
    init(s) { s.my.b = [[340, 640], [430, 610], [600, 615]]; },
    draw(g, s, v) {
      const V = g.V, up = jUp(s), a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      const jet = a => (a < 0 ? 0 : E.outQ(clamp(a / 0.16)) * (1 - 0.25 * clamp((a - 0.5) / 1.2)));
      g.bg('#7fcfff', '#e6f7ff');
      g.at(0, up, () => {
        g.cloud(200, 120, 0.8); g.cloud(820, 60, 0.7);
        for (let x = Math.floor(V.x0 / 170) * 170; x < V.x1 + 170; x += 170) { const h = 120 + ((x / 170) & 3) * 40; g.rect(x, 470 - h, 150, h, ['#f2c6a0', '#c9d6f0', '#f6e1b0', '#d7c4ef'][(x / 170) & 3], 5); g.rect(x + 30, 500 - h, 30, 30, '#9fd8ff', 0); g.rect(x + 90, 500 - h, 30, 30, '#9fd8ff', 0); }
        for (const x of [120, 880]) { g.rect(x - 10, 360, 20, 120, '#8a5a36', 0); g.circ(x, 340, 70, '#4fae4a'); }
        g.band(470, 'bottom', '#eadcc3');
        g.ell(500, 720, 640, 200, '#e0cfb0', 0); g.ell(500, 720, 520, 160, '#d6c3a0', 0);
        const rb = prog(a2 - 0.15, 0.5);
        if (rb) g.alpha(0.85 * rb, () => ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'].forEach((c, i) => g.arc(500, 700, 600 - i * 24, Math.PI, TAU, c, 24)));
        // 池
        g.ell(500, 720, 420, 120, '#b9c3cf'); g.ell(500, 710, 380, 98, '#4cc9f0', 6);
        g.ell(500, 712, 300, 70, 'rgba(255,255,255,0.18)', 0);
        // ふき上がる水
        const jets = [[0, jet(a1), 1], [-170, jet(a2), 0.75], [170, jet(a2), 0.75], [-320, jet(a2 - 0.06), 0.55], [320, jet(a2 - 0.06), 0.55]];
        for (const [dx, h0, sc] of jets) {
          const x = 500 + dx, by = 700, h = 820 * h0 * sc + 30; if (h0 <= 0) { g.ell(x, by - 6, 26, 10, 'rgba(255,255,255,0.8)', 0); continue; }
          const ty = by - h;
          g.curve([x, ty, x - 70 * sc, ty + 60, x - 130 * sc, by - 10], 'rgba(220,245,255,0.75)', 12 * sc);
          g.curve([x, ty, x + 70 * sc, ty + 60, x + 130 * sc, by - 10], 'rgba(220,245,255,0.75)', 12 * sc);
          g.taper(x, by, x, ty, 26 * sc, 14 * sc, 'rgba(225,247,255,0.95)', 0);
          g.line([x - 6 * sc, by - 10, x - 6 * sc, ty + 20], '#ffffff', 6 * sc);
          for (const [ox, oy, r] of [[-24, 8, 22], [20, 4, 20], [0, -14, 24]]) g.circ(x + ox * sc, ty + oy * sc, r * sc, '#ffffff', 0);
        }
        g.rr(470, 600, 60, 110, 10, '#cfd6e2', 5); g.ell(500, 600, 110, 28, '#cfd6e2'); g.ell(500, 596, 90, 18, '#4cc9f0', 4);
        // はと
        for (const [i, [bx, by]] of s.my.b.entries()) {
          const t = a2 >= 0 ? clamp((a2 - i * 0.05) / 0.9) : 0, x = bx + (bx < 500 ? -1 : 1) * 380 * t, y = by - 520 * t, fl = t ? Math.sin(s.t * 30 + i) : 0;
          g.at(x, y, () => { g.ell(0, 0, 26, 18, '#c9ced8'); g.circ(16, -14, 11, '#a3abbd'); g.tri(25, -16, 36, -12, 25, -9, '#ff9f1c', 0); if (t) { g.ell(-4, -10 - 14 * fl, 26, 9, '#dfe2ea', 4, -0.4); } });
        }
      });
    },
    hit(g, s, k) {
      g.fx.splash(500, 300, '#bfeaff', k === 1 ? 14 : 26);
      g.fx.pop(k === 1 ? 'ザバー' : 'ザッバーン', 500, k === 1 ? 160 : 130, { size: k === 1 ? 100 : 110, c: '#ffffff', o: '#1f5f9a' });
      if (k === 2) g.fx.stars(500, 200, 8, ['#ffffff', '#bfeaff', C.gold]);
    },
  },

  /* ジャンプで記念写真（フラッシュ） */
  {
    id: 'jump-photo', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'party', sfx: 'click',
    vars: [{ k: 'photo', name: 'ジャンプで記念写真', short: '記念写真' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      g.bg('#7fcfff', '#fff1d6');
      g.at(0, up, () => {
        g.sun(820, 110, 60);
        g.poly([180, 470, 470, 150, 760, 470], '#7d8fd0', 0); g.poly([400, 230, 470, 150, 540, 230, 505, 215, 470, 240, 440, 215], '#ffffff', 0);
        g.hills(470, '#8fd16a', 50, 6, 4);
        g.band(560, 'bottom', '#74c257');
        for (let i = 0; i < 26; i++) { const x = V.x0 + ((i * 197) % (V.x1 - V.x0)), y = 600 + ((i * 131) % 420); g.circ(x, y, 12, ['#ff6b8b', '#ffd23f', '#ffffff', '#c4a6ff'][i % 4], 0); }
        // カメラをかまえる友だち
        kid(g, 500, 980, 1.25, '#3cc46b', '#5a3a22', 0);
        g.cap(440, 760, 470, 690, 15, '#3cc46b'); g.cap(560, 760, 530, 690, 15, '#3cc46b');
        g.rr(420, 640, 160, 100, 16, '#2b2140'); g.rr(440, 624, 50, 22, 6, '#2b2140'); g.circ(500, 690, 34, '#5c6478', 6); g.circ(500, 690, 18, '#9fd8ff', 0);
        for (const a of [a1, a2]) if (a >= 0 && a < 0.25) g.glow(540, 640, 260 * (1 - a / 0.25), '#ffffff', 0.95);
        g.circ(552, 636, 10, '#ffe066', 0);
      });
      // 写真（画面に固定）
      for (const [a, i] of [[a1, 0], [a2, 1]]) {
        if (a < 0) continue;
        const t = E.outBack(clamp(a / 0.45)), tx = i ? 780 : 220, x = lerp(500, tx, t), y = lerp(860, 250, t), sc = lerp(0.3, 1, t), rot = (i ? 0.14 : -0.12) * t;
        g.at(x, y, rot, sc, sc, () => polaroid(g, i));
      }
    },
    hit(g, s, k) {
      g.fx.flash('#ffffff', 0.75, 0.16);
      g.fx.pop(k === 1 ? 'パシャ' : 'いい写真！', 500, 470, { size: k === 1 ? 100 : 100, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) { g.fx.stars(500, 300, 10); g.sfx('chime'); }
    },
  },

  /* ダンクシュート */
  {
    id: 'jump-dunk', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'sports', sfx: 'swish',
    vars: [{ k: 'dunk', name: 'ダンクシュート', short: 'ダンク' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), age = s.k ? s.age : 9, rimY = 250, shake = jig(age, 0.12, 18, 6), str = Math.max(0, jig(age, 40, 14, 6));
      g.bg('#2d2457', '#5b3a7c');
      g.at(0, up, () => {
        for (let i = 0; i < 4; i++) g.alpha(0.18, () => g.circ(150 + i * 230, -80, 120, '#ffe9a8', 0));
        g.band(470, 640, '#3a2f6b');
        for (let x = Math.floor(V.x0 / 44) * 44; x < V.x1 + 44; x += 44) g.circ(x + 22 * ((x / 44) & 1), 520 + ((x / 44) % 3) * 34, 14, ['#ff9fbd', '#ffd0a8', '#9fd8ff', '#ffe066'][((x / 44) & 3)], 0);
        g.band(640, 'bottom', '#dca66a', 7);
        g.poly([380, 640, 620, 640, 760, 1100, 240, 1100], '#d0583c', 0); g.ell(500, 1100, 260, 90, null, 7);
        g.rect(486, -400, 28, 500, '#5c6478', 0);
        g.rr(320, -10, 360, 230, 16, 'rgba(255,255,255,0.9)', 7); g.rr(430, 90, 140, 100, 6, null, 7);
        // ゴール（リング・ネット）
        g.at(500, rimY, shake, 1, 1, () => {
          const nb = 120 + str;
          g.poly([-92, 0, 92, 0, 56, nb, -56, nb], 'rgba(255,255,255,0.25)', 0);
          for (let i = 0; i <= 6; i++) { const t = i / 6; g.line([lerp(-92, 92, t), 0, lerp(-56, 56, t), nb], '#ffffff', 5); }
          for (const yy of [0.35, 0.7]) g.line([-92 + 36 * yy, nb * yy, 92 - 36 * yy, nb * yy], '#ffffff', 4);
          g.ell(0, 0, 100, 22, null, 16); g.ell(0, 0, 100, 22, '#ff7a1a', 0); g.ell(0, 0, 84, 14, '#5b3a7c', 0);
        });
        // 入ったボール（落ちてはずむ）
        if (s.k >= 1 && age < 1.2) { const t = clamp(age / 0.5), y = age < 0.5 ? rimY + 440 * t * t : 690 - 160 * Math.sin(Math.PI * clamp((age - 0.5) / 0.5)); ball(g, 500, y, 62, age * 6); }
      });
      // 手とボール
      const q = E.ioQ(clamp(s.p)), hx = 560 + 60 * q, hy = lerp(rimY + 200 + 70, 1250, q), has = s.k === 0 || s.u > 0.5;
      if (has) ball(g, hx - 30, hy - 96, 64, 0.4);
      g.arm(hx, hy, -Math.PI / 2 - 0.2, { hand: 'palm', side: 'R' });
    },
    hit(g, s, k) {
      g.fx.lines(500, 440, { n: 12, r0: 120, r1: 250, w: 12 });
      g.fx.pop(k === 1 ? 'ダンク！' : 'ナイスダンク', 500, 160, { size: k === 1 ? 110 : 100, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.shake(k === 1 ? 8 : 12, 0.14);
      if (k === 2) { g.fx.confetti(70); g.sfx('cheer'); }
    },
  },

  /* バレーボールのブロック */
  {
    id: 'jump-block', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'sports', sfx: 'smack',
    vars: [{ k: 'block', name: 'バレーでブロック', short: 'ブロック' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s);
      g.bg('#f3e3c4');
      g.at(0, up, () => {
        for (let x = Math.floor(V.x0 / 240) * 240; x < V.x1; x += 240) { g.rect(x + 40, -120, 160, 120, '#bfe6ff', 6); }
        g.band(470, 'bottom', '#5aa0d8', 7); g.band(470, 520, '#3d86c6');
        g.line([V.x0 - 40, 600, V.x1 + 40, 600], '#ffffff', 8);
        // あいて（ネットのむこう）
        const opp = (i, t) => { const jy = -200 * Math.sin(Math.PI * clamp(t)); g.at(500 + lerp(-120, 120, sw(s)), 470 + jy, 0, 0.9, 0.9, () => { g.cap(-16, -80, -20, 0, 14, '#2b2140'); g.cap(16, -80, 20, 0, 14, '#2b2140'); g.rr(-44, -200, 88, 130, 34, '#e8402f'); g.circ(0, -240, 46, C.skin); g.path('M-47 -244 Q-46 -300 0 -294 Q46 -300 47 -244 Q30 -270 0 -266 Q-30 -270 -47 -244Z', '#2b2140'); g.circ(-15, -240, 5, C.ol, 0); g.circ(15, -240, 5, C.ol, 0); g.cap(30, -180, 90, -320, 14, '#e8402f'); g.circ(92, -330, 18, C.skin, 5); }); };
        const i = s.k === 0 ? 0 : 1, t = (s.ph - (i - 0.6)) / 0.6;
        opp(i, t);
        // ネット
        g.rect(V.x0 - 40, 260, V.x1 - V.x0 + 80, 180, 'rgba(30,30,50,0.18)', 0);
        g.grid(V.x0 - 40, 260, V.x1 - V.x0 + 80, 180, 30, 'rgba(40,40,60,0.55)', 3);
        g.rect(V.x0 - 40, 252, V.x1 - V.x0 + 80, 20, '#ffffff', 5);
        for (const x of [180, 820]) { g.rect(x - 5, 140, 10, 300, '#ff5a5f', 0); for (let y = 160; y < 440; y += 50) g.rect(x - 5, y, 10, 25, '#ffffff', 0); }
        // ボール
        for (const j of [0, 1]) {
          const ox = 500 + (j ? 120 : -120) + 92 * 0.9, oy = 470 - 200 - 330 * 0.9, bx = 500 + (j ? 40 : -40), by = 300;
          const a = (s.ph - (j - 0.22)) / 0.22, r = (s.ph - j) / 0.4;
          if (a > 0 && a <= 1) { ball(g, lerp(ox, bx, a), lerp(oy, by, a), lerp(36, 70, a), a * 3, 'volley'); }
          else if (a > 1 && r < 1) { const x = lerp(bx, bx + (j ? 160 : -160), r), y = by + 260 * r * r - 160 * r; ball(g, x, y, lerp(70, 40, r), 3 + r * 6, 'volley'); }
        }
      });
      for (const sd of ['L', 'R']) { const sg = sd === 'L' ? -1 : 1, q = E.ioQ(clamp(s.p)); g.arm(500 + sg * (110 + 130 * q), lerp(560, 1250, q), -Math.PI / 2 + sg * 0.08, { hand: 'palm', side: sd }); }
    },
    hit(g, s, k) {
      g.fx.lines(500, 500, { n: 12, r0: 120, r1: 260, w: 12 });
      g.fx.pop(k === 1 ? 'バシッ' : 'ブロック！', 500, 160, { size: k === 1 ? 110 : 110, c: k === 1 ? '#ffffff' : C.yellow });
      g.fx.shake(k === 1 ? 8 : 11, 0.12);
      if (k === 2) { g.fx.stars(500, 420, 10); g.sfx('whistle'); }
    },
  },

  /* 星をつかむ（夜空） */
  {
    id: 'jump-star', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'fantasy', sfx: 'chime',
    vars: [{ k: 'star', name: '星をつかむ', short: '星' }],
    init(s) { const r = s.r; s.my.sm = Array.from({ length: 22 }, () => [r(), r() * 0.7, r()]); },
    draw(g, s, v) {
      const V = g.V, up = jUp(s), a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      const ST = [[350, 230], [650, 190]], JAR = [830, 760], con = prog(a2 - 0.2, 0.6);
      g.bg('#141238', '#3b2a78');
      for (const [a, b, z] of s.my.sm) { const tw = 0.6 + 0.4 * Math.sin(s.t * 3 + z * 20); g.star(lerp(V.x0, V.x1, a), lerp(V.y0, 760, b), 6 + 6 * z * tw, 2.5, 4, '#fff6c8', 0); }
      g.at(0, up, () => {
        if (con) g.alpha(con, () => { g.line([200, 260, 300, 120, 470, 200, 560, 80, 760, 210, 860, 110], '#bfe3ff', 5); for (const [x, y] of [[200, 260], [300, 120], [470, 200], [560, 80], [760, 210], [860, 110]]) g.star(x, y, 18, 8, 5, '#ffffff', 0); });
        g.hills(760, '#2a2560', 40, 3, 3); g.band(820, 'bottom', '#231f52');
        g.at(150, 760, () => { g.rect(-60, -110, 120, 110, '#3a3070', 0); g.tri(-80, -110, 80, -110, 0, -180, '#3a3070', 0); g.rect(-20, -80, 40, 40, '#ffd86b', 0); });
        // びん
        const fill = (a1 >= 0 ? 0.5 : 0) + (a2 >= 0 ? 0.5 : 0);
        g.at(JAR[0], JAR[1], () => { if (fill) g.glow(0, -60, 200 * fill, '#ffe36b', 0.6); g.rr(-70, -140, 140, 160, 34, 'rgba(220,240,255,0.25)', 6); g.rr(-50, -170, 100, 36, 10, '#c98b52', 5); if (fill) g.rr(-56, -120 + (1 - fill) * 90, 112, 130 - (1 - fill) * 90, 26, 'rgba(255,230,110,0.85)', 0); });
        // 星（つかむと びんへ）
        for (const [i, [x, y]] of ST.entries()) {
          const a = i ? a2 : a1, tw = 1 + 0.08 * Math.sin(s.t * 5 + i);
          if (a < 0) { g.glow(x, y, 170, '#ffe36b', 0.5); g.star(x, y, 92 * tw, 42 * tw, 5, '#ffd23f'); g.hl(x - 20, y - 26, 14, 8, -0.6, 0.6); g.circ(x - 18, y + 4, 7, C.ol, 0); g.circ(x + 18, y + 4, 7, C.ol, 0); g.arc(x, y + 16, 11, 0.3, Math.PI - 0.3, C.ol, 5); g.circ(x - 32, y + 18, 7, '#ffb3c6', 0); g.circ(x + 32, y + 18, 7, '#ffb3c6', 0); continue; }
          const t = clamp((a - 0.12) / 0.45); if (t >= 1) continue;
          const px = lerp(x, JAR[0], E.ioQ(t)), py = lerp(y, JAR[1] - 60, E.ioQ(t)) - 160 * Math.sin(Math.PI * t), sc = lerp(1, 0.4, t);
          g.star(px, py, 92 * sc, 42 * sc, 5, '#ffd23f');
        }
      });
      const w = sw(s), i = w < 0.5 ? 0 : 1, [tx, ty] = mixP(ST[0], ST[1], w);
      const q = E.ioQ(clamp(s.p)); g.arm(tx + (i ? 1 : -1) * 70 * q, lerp(ty + 200 + 70, 1250, q), -Math.PI / 2 + (i ? -0.12 : 0.12), { hand: 'open', side: i ? 'R' : 'L' });
    },
    hit(g, s, k) {
      const x = k === 1 ? 350 : 650, y = (k === 1 ? 230 : 190) + 200;
      g.fx.sparks(x, y, 12, ['#fff6b0', C.gold, '#ffffff']); g.fx.ring(x, y, { c: '#ffe36b', r0: 40, r1: 220, w: 12 });
      g.fx.pop(k === 1 ? 'キラッ' : 'キラーン', k === 1 ? 640 : 380, 220, { size: k === 1 ? 100 : 110, c: '#fff1a8' });
      if (k === 2) g.fx.stars(500, 300, 10, ['#fff6b0', '#ffffff', '#bfe3ff']);
    },
  },

  /* 鐘を鳴らす */
  {
    id: 'jump-bell', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'festival', sfx: 'bell',
    vars: [{ k: 'bell', name: 'ジャンプで鐘を鳴らす', short: '鐘' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), age = s.k ? s.age : 9, sw = jig(age, s.k >= 2 ? 0.55 : 0.35, 9, 2.2), a2 = s.k >= 2 ? s.age : -1;
      g.bg('#9ad8ff', '#fff3e0');
      g.at(0, up, () => {
        g.cloud(160, 300, 0.8); g.cloud(860, 250, 0.7);
        g.hills(600, '#9bd77b', 40, 2, 4); g.band(700, 'bottom', '#86c96a');
        for (let i = 0; i < 18; i++) { const x = V.x0 + ((i * 173) % (V.x1 - V.x0)), y = 740 + ((i * 97) % 300); g.circ(x, y, 13, ['#ff9fbd', '#ffffff', '#ffd23f'][i % 3], 0); }
        // やぐら
        g.rect(230, -300, 44, 1000, '#b5713f', 6); g.rect(726, -300, 44, 1000, '#b5713f', 6);
        g.rr(190, -40, 620, 60, 14, '#8a4f2a', 6); g.rr(170, -70, 660, 40, 14, '#a5603a', 6);
        for (const x of [300, 700]) g.at(x, 20, Math.sin(s.t * 2 + x) * 0.05, 1, 1, () => { g.line([0, 0, 0, 60], C.ol, 4); g.ell(0, 100, 30, 40, '#ff5a5f'); g.rr(-18, 56, 36, 10, 4, C.ol, 0); g.rr(-18, 136, 36, 10, 4, C.ol, 0); });
        // 鐘
        g.at(500, 30, sw, 1, 1, () => {
          g.rect(-12, -10, 24, 50, '#5c6478', 0);
          g.path('M-120 230 C-118 140 -96 40 0 36 C96 40 118 140 120 230 Q130 250 150 256 L-150 256 Q-130 250 -120 230Z', '#f2c14e');
          g.path('M-70 220 C-68 150 -54 70 0 64 C-30 90 -40 150 -40 220Z', 'rgba(255,255,255,0.45)', 0);
          g.rr(-150, 246, 300, 22, 10, '#d9a02e', 6);
          g.circ(sw * -60, 280, 26, '#c48a24');
        });
        // 鳩
        if (a2 >= 0) for (let i = 0; i < 4; i++) { const t = clamp((a2 - i * 0.05) / 1), x = 500 + (i - 1.5) * 120 + (i - 1.5) * 300 * t, y = 100 - 500 * t, fl = Math.sin(s.t * 28 + i); g.at(x, y, () => { g.ell(0, 0, 30, 18, '#ffffff'); g.circ(22, -10, 12, '#ffffff'); g.tri(32, -12, 44, -8, 32, -5, '#ff9f1c', 0); g.ell(-6, -16 * fl, 34, 10, '#f2f4fa', 4, -0.3 * fl); }); }
      });
      const q = E.ioQ(clamp(s.p));
      g.arm(560 + 70 * q, lerp(30 + 268 + 200 + 40, 1250, q), -Math.PI / 2 - 0.15, { hand: 'palm', side: 'R' });
    },
    hit(g, s, k) {
      for (let i = 0; i < (k === 1 ? 2 : 3); i++) g.fx.ring(500, 330, { c: '#fff3b0', r0: 160 + i * 40, r1: 420 + i * 80, w: 12, life: 0.5 + i * 0.1 });
      g.fx.notes(500, 380, k === 1 ? 4 : 7, [C.gold, C.orange, '#ffffff']);
      g.fx.pop(k === 1 ? 'カーン' : 'カラーン！', k === 1 ? 760 : 500, k === 1 ? 600 : 640, { size: k === 1 ? 104 : 116, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) g.fx.burst(500, 100, { n: 24, c: ['#ffb3c6', '#ffffff', '#ffd6e0'], shape: 'leaf', sp: [200, 600], size: [16, 26], g: 300, life: [1, 1.6], drag: 0.96 });
      g.fx.shake(5, 0.1);
    },
  },

  /* りんごをもぐ */
  {
    id: 'jump-apple', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'farm', sfx: 'pop',
    vars: [{ k: 'apple', name: 'りんごをもぐ', short: 'りんご' }],
    init(s) { const r = s.r; s.my.lv = Array.from({ length: 16 }, () => [r() * 1100 - 50, 40 + r() * 230, 60 + r() * 50]); },
    draw(g, s, v) {
      const V = g.V, up = jUp(s), a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      const AP = [[360, 250], [650, 220]], BK = [500, 830];
      g.bg('#9fdcff', '#f2fbff');
      g.at(0, up, () => {
        g.hills(560, '#a8dc78', 40, 9, 4); g.band(640, 'bottom', '#7cc35a');
        for (let i = 0; i < 8; i++) g.at(V.x0 + 80 + i * 260, 640, () => g.path('M-20 0 Q-16 -26 -6 -38 Q-4 -16 0 -8 Q6 -30 18 -44 Q16 -16 22 0Z', '#5fae47', 0));
        // かご
        const cnt = (a1 >= 0 && a1 > 0.62 ? 1 : 0) + (a2 >= 0 && a2 > 0.62 ? 1 : 0);
        g.at(BK[0], BK[1], () => {
          g.shadow(0, 70, 190, 26, 0.25);
          if (cnt >= 1) { apple(g, -50, -26, 1); } if (cnt >= 2) { apple(g, 50, -34, 1); }
          g.path('M-170 -40 L170 -40 L130 70 L-130 70 Z', '#c98b52');
          for (let i = 0; i < 3; i++) g.line([-160 + i * 6, -10 + i * 28, 160 - i * 6, -10 + i * 28], '#a86f43', 5);
          g.curve([-150, -40, 0, -210, 150, -40], '#a86f43', 12);
        });
        // 木
        g.rect(V.x0 - 200, -600, V.x1 - V.x0 + 400, 560, '#3f9a3e', 0);
        for (const [x, y, r] of s.my.lv) g.circ(x, y - 60, r, ((x | 0) % 3) ? '#4fae4a' : '#3f9a3e', 0);
        g.curve([V.x0 - 100, 40, 300, 120, 520, 90, 800, 130, V.x1 + 100, 60], '#8a5a36', 26);
        for (const [x, y] of [[180, 120], [880, 140], [480, 60]]) apple(g, x, y, 0.8);
        // もぐりんご
        for (const [i, [x, y]] of AP.entries()) {
          const a = i ? a2 : a1;
          if (a < 0) { g.line([x, y - 120, x, y - 52], '#6b4426', 6); g.at(x + 18, y - 70, 0.5, 1, 1, () => g.path('M0 0 Q20 -26 44 -12 Q22 14 0 0Z', '#4fae4a')); apple(g, x, y, 1.2); continue; }
          g.line([x, y - 120, x, y - 70], '#6b4426', 6);
          const t = clamp((a - 0.1) / 0.52); if (t >= 1) continue;
          const px = lerp(x, BK[0] + (i ? 50 : -50), t), py = lerp(y, BK[1] - 40, t * t) - 140 * Math.sin(Math.PI * t);
          apple(g, px, py, lerp(1.2, 1, t), t * 8);
        }
      });
      const w = sw(s), i = w < 0.5 ? 0 : 1, [tx, ty] = mixP(AP[0], AP[1], w), q = E.ioQ(clamp(s.p));
      g.arm(tx + (i ? 60 : -60) * q, lerp(ty + 200 + 100, 1250, q), -Math.PI / 2 + (i ? -0.12 : 0.12), { hand: 'grip', side: i ? 'R' : 'L' });
    },
    hit(g, s, k) {
      const x = k === 1 ? 360 : 650, y = (k === 1 ? 250 : 220) + 200;
      g.fx.burst(x, y - 60, { n: 12, c: ['#4fae4a', '#7cd36a'], shape: 'leaf', sp: [200, 520], size: [16, 26], g: 600, life: [0.7, 1.1] });
      g.fx.pop(k === 1 ? 'ポン' : 'とれた！', k === 1 ? 600 : 380, 470, { size: k === 1 ? 104 : 110, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) g.fx.stars(500, 700, 8);
      g.fx.shake(4, 0.08);
    },
  },

  /* カエルといっしょにジャンプ */
  {
    id: 'jump-frog', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'animal', sfx: 'jump',
    vars: [{ k: 'frog', name: 'カエルとジャンプ', short: 'カエル' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), hop = 1 - s.p;
      g.bg('#a8e0ff', '#eaf8ff');
      g.at(0, up, () => {
        g.hills(420, '#8ccf6b', 40, 5, 4); g.band(470, 'bottom', '#7cc35a');
        g.ell(500, 760, 620, 230, '#2f9a8a', 0); g.ell(500, 750, 580, 200, '#3fb8a8', 0);
        for (const [x, y] of [[140, 560], [860, 580], [80, 900], [930, 940]]) for (let i = -1; i <= 1; i++) g.line([x + i * 16, y + 40, x + i * 26, y - 70 - (i + 1) * 20], '#4e9a3c', 8);
        const pads = [[300, 760, 1], [500, 680, 1], [700, 760, 1], [500, 880, 1.2]];
        for (const [x, y, k] of pads) { g.ell(x, y + 6, 120 * k, 42 * k, '#2c7f4a', 0); g.path(`M${x} ${y} L${x + 110 * k} ${y - 12 * k} A${116 * k} ${40 * k} 0 1 1 ${x + 112 * k} ${y + 10 * k} Z`, '#58b947', 5); }
        if (s.k >= 2) g.at(700, 700, 0, prog(s.age, 0.3), prog(s.age, 0.3), () => { for (let i = 0; i < 6; i++) g.at(0, 0, i / 6 * TAU, 1, 1, () => g.path('M0 0 Q-20 -40 0 -70 Q20 -40 0 0Z', '#ffb3d1')); g.circ(0, 0, 16, '#ffd23f'); });
        // カエル（いっしょに跳ぶ）
        const fr = [[500, 680, 0], [300, 760, 1], [700, 760, 1]];
        for (const [x, y, late] of fr) { const on = !late || s.k >= 1, h = on ? hop : 0; g.shadow(x, y + 30, 70, 16, 0.25 * (1 - 0.6 * h)); frog(g, x, y - 20 - 480 * E.outQ(h), on ? 1 : 0, h > 0.25, late ? 1.15 : 1.35); }
      });
    },
    hit(g, s, k) {
      g.fx.pop(k === 1 ? 'ケロッ' : 'ケロケロ！', 500, 200, { size: k === 1 ? 100 : 110, c: '#c8ff6b', o: '#1f5a3a' });
      g.fx.notes(500, 400, k === 1 ? 3 : 6, ['#3cc46b', '#ffd23f', '#ffffff']);
      if (k === 2) { g.fx.splash(300, 900, C.water, 10); g.fx.splash(700, 900, C.water, 10); g.sfx('quack'); }
    },
  },

  /* イルカといっしょにジャンプ */
  {
    id: 'jump-dolphin', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'sea', sfx: 'splash',
    vars: [{ k: 'dolphin', name: 'イルカとジャンプ', short: 'イルカ' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), SEA = 430;
      g.bg('#6cc6ff', '#d8f3ff');
      g.at(0, up, () => {
        g.sun(820, 120, 60); g.cloud(220, 160, 0.8);
        g.band(SEA, 'bottom', '#1f8fd6'); g.band(SEA, SEA + 14, '#58b8f0');
        for (let i = 0; i < 9; i++) { const x = ((i * 157 + s.t * 40) % 1200) - 100, y = SEA + 60 + (i % 4) * 90; g.arc(x, y, 40, Math.PI * 1.15, Math.PI * 1.85, 'rgba(255,255,255,0.6)', 6); }
        const rb = s.k >= 2 ? prog(s.age - 0.2, 0.5) : 0;
        if (rb) g.alpha(0.8 * rb, () => ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7'].forEach((c, i) => g.arc(500, SEA, 300 - i * 22, Math.PI, TAU, c, 22)));
        // イルカ（頂点で空中に）
        for (const [j, sg, ox] of [[0, 1, 0], [1, -1, -120], [1, 1, 140]]) {
          const t = (s.ph - (j - 0.4)) / 0.8; if (t <= 0 || t >= 1) continue;
          const x = 500 + ox + sg * lerp(-260, 260, t), y = SEA + 40 - 360 * Math.sin(Math.PI * t), ang = Math.atan2(-360 * Math.PI * Math.cos(Math.PI * t), sg * 520);
          g.at(x, y, sg > 0 ? ang : ang + Math.PI, sg > 0 ? 1 : -1, sg > 0 ? 1 : -1, () => dolphin(g));
        }
        for (const [j, ox] of [[0, 0], [1, -120], [1, 140]]) for (const [tt, sg2] of [[0.06, -1], [0.94, 1]]) { const t = (s.ph - (j - 0.4)) / 0.8, d = Math.abs(t - tt); if (d < 0.12) g.alpha(1 - d / 0.12, () => g.ell(500 + ox + sg2 * 240 * (j && ox < 0 ? -1 : 1), SEA + 40, 70, 18, '#ffffff', 0)); }
        // 船のてすり
        g.band(900, 'bottom', '#ffffff', 7); g.rect(V.x0 - 40, 860, V.x1 - V.x0 + 80, 18, '#e8402f', 5);
        for (let x = Math.floor(V.x0 / 120) * 120; x < V.x1 + 120; x += 120) g.rect(x, 870, 14, 60, '#e8402f', 0);
      });
    },
    hit(g, s, k) {
      g.fx.pop(k === 1 ? 'ザブーン' : 'キュイー！', 500, 150, { size: k === 1 ? 100 : 110, c: '#ffffff', o: '#1f5f9a' });
      g.fx.splash(500, 700, '#bfeaff', k === 1 ? 12 : 22);
      if (k === 2) g.fx.stars(500, 300, 8, ['#ffffff', '#bfeaff', C.gold]);
    },
  },

  /* 電気のひもを引く（部屋が明るくなる → パーティー） */
  {
    id: 'jump-light', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'home', sfx: 'click',
    vars: [{ k: 'light', name: '電気のひもを引く', short: '電気のひも' }],
    init(s) { const r = s.r; s.my.sp = Array.from({ length: 9 }, () => [r() * TAU, 0.3 + r() * 0.7, (r() * 5) | 0]); },
    draw(g, s, v) {
      const V = g.V, up = jUp(s), lit = s.k >= 1, party = s.k >= 2, age = s.k ? s.age : 9, pull = Math.max(0, jig(age, 40, 12, 7));
      const wall = lit ? '#ffe9c2' : '#2a2850', cols = ['#ff4fa3', '#ffd23f', '#3cf2c3', '#4dabf7', '#b07cff'];
      g.bg(wall);
      g.at(0, up, () => {
        g.rect(V.x0 - 40, V.y0 - up - 40, V.x1 - V.x0 + 80, 40 + up + 40 - V.y0, lit ? '#fff4dd' : '#232046', 0);
        g.rect(V.x0 - 40, 40, V.x1 - V.x0 + 80, 16, lit ? '#d9b98a' : '#1a1838', 0);
        g.rr(120, 260, 220, 300, 10, lit ? '#9fd8ff' : '#1b2a5a', 7); g.line([230, 260, 230, 560], C.ol, 5); g.line([120, 410, 340, 410], C.ol, 5);
        if (!lit) { g.circ(280, 320, 26, '#fff3b0', 0); g.circ(292, 312, 22, '#1b2a5a', 0); }
        g.band(700, 'bottom', lit ? '#c98b52' : '#3a2f4a');
        g.rr(560, 520, 360, 240, 20, lit ? '#ff8fab' : '#4a3a6a'); g.rr(580, 470, 120, 80, 30, lit ? '#ffffff' : '#5a4a7a');
        g.rr(100, 640, 180, 200, 14, lit ? '#d39457' : '#4a3a5a'); g.circ(190, 600, 50, lit ? '#3cc46b' : '#3a4a5a');
        if (party) for (const [a, r, c] of s.my.sp) { const an = a + s.t * 1.6, x = 500 + Math.cos(an) * 420 * r, y = 520 + Math.sin(an) * 260 * r; g.alpha(0.5, () => g.circ(x, y, 70, cols[c], 0)); }
        // 天井のあかり
        if (lit) g.glow(500, 70, party ? 380 : 520, party ? '#ffffff' : '#fff6c8', 0.75);
        g.ell(500, 60, 190, 46, lit ? '#ffffff' : '#8f97c0');
        g.ell(500, 46, 150, 26, lit ? '#fff8d8' : '#a6add0', 0);
        if (party) g.at(500, 120, s.t * 2, 1, 1, () => { g.circ(0, 0, 44, '#dfe4ec'); for (let i = 0; i < 4; i++) g.line([-40 + i * 26, -34, -40 + i * 26, 34], '#a3abbd', 3); });
        // ひも
        const ky = 330 + pull;
        g.line([500, 90, 500, ky - 26], lit ? '#c8a27a' : '#9a8fb0', 4);
        g.rr(486, ky - 28, 28, 44, 12, lit ? '#ff5a5f' : '#c06070');
      });
      const q = E.ioQ(clamp(s.p));
      g.arm(520 + 60 * q, lerp(330 + 200 + 70, 1250, q), -Math.PI / 2 - 0.1, { hand: 'pinch', side: 'R' });
    },
    hit(g, s, k) {
      g.fx.flash(k === 1 ? '#fff6c8' : '#ffffff', 0.6, 0.18);
      g.fx.pop(k === 1 ? 'パッ' : 'パーティー！', 500, k === 1 ? 200 : 220, { size: k === 1 ? 120 : 108, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) { g.fx.confetti(70); g.sfx('cheer'); }
    },
  },

  /* 雲にタッチ（ねむっている雲がおきて にじを出す） */
  {
    id: 'jump-cloud', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'fantasy', sfx: 'magic',
    vars: [{ k: 'cloud', name: '雲にタッチ', short: '雲' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), age = s.k ? s.age : 9, [qx, qy] = squash(age, 0.18), rb = s.k >= 2 ? prog(s.age - 0.1, 0.5) : 0;
      g.bg('#5fb6ff', '#ffe3f1');
      g.at(0, up, () => {
        g.cloud(130, 420, 0.7, '#ffffff'); g.cloud(880, 380, 0.8, '#ffffff');
        if (rb) g.alpha(rb, () => ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'].forEach((c, i) => g.arc(500, 760, 560 - i * 26, Math.PI, TAU, c, 26)));
        // 山の上
        g.poly([V.x0 - 300, 1100, 120, 760, 300, 820, 520, 700, 760, 800, 900, 740, V.x1 + 300, 1100], '#8a7fb8', 0);
        g.poly([V.x0 - 300, 1200, 200, 900, 500, 860, 800, 920, V.x1 + 300, 1200], '#6f64a3', 0);
        g.band(1100, 'bottom', '#6f64a3');
        for (const [x, y, k] of [[150, 900, 1.1], [500, 960, 1.4], [860, 920, 1.2]]) g.cloud(x, y, k, 'rgba(255,255,255,0.9)');
        // 雲の子
        g.at(500, 170, 0, 1.55 * qx, 1.55 * qy, () => {
          g.cloud(0, 0, 1, '#ffffff', 6);
          if (s.k === 0) { g.arc(-40, 0, 14, 0.2, Math.PI - 0.2, C.ol, 5); g.arc(40, 0, 14, 0.2, Math.PI - 0.2, C.ol, 5); g.text('すやすや', 150, -70, { size: 30, f: '#7a8cc4', font: '"Zen Kaku Gothic New", sans-serif', w: 700 }); }
          else { g.circ(-40, -4, 12, C.ol, 0); g.circ(40, -4, 12, C.ol, 0); g.circ(-36, -8, 4, '#ffffff', 0); g.circ(44, -8, 4, '#ffffff', 0); }
          g.circ(-70, 20, 13, '#ffb3c6', 0); g.circ(70, 20, 13, '#ffb3c6', 0);
          if (s.k >= 2) g.path('M-24 14 Q0 44 24 14Z', '#ff6b8b', 4); else if (s.k === 1) g.ell(0, 24, 10, 12, '#ff6b8b', 4);
        });
      });
      const q = E.ioQ(clamp(s.p));
      g.arm(470 + 70 * q, lerp(170 + 200 + 120, 1250, q), -Math.PI / 2 - 0.05, { hand: 'point', side: 'R' });
    },
    hit(g, s, k) {
      g.fx.burst(480, 400, { n: 12, c: ['#ffffff', '#fff0fa'], shape: 'smoke', sp: [100, 300], size: [40, 70], g: -40, life: [0.5, 0.9], grow: 1.2, drag: 0.94 });
      g.fx.pop(k === 1 ? 'フワッ' : 'にじだ！', k === 1 ? 760 : 500, k === 1 ? 540 : 620, { size: k === 1 ? 100 : 110, c: k === 1 ? '#ffffff' : C.yellow, o: '#6a5aa8' });
      if (k === 2) g.fx.stars(500, 360, 10, [C.gold, '#ffffff', '#ffb3c6']);
    },
  },

  /* ちょうちょをつかまえる（虫とりあみ） */
  {
    id: 'jump-butterfly', acts: ['jump'], modes: ['both', 'one', 'alt'], theme: 'nature', sfx: 'swish',
    vars: [{ k: 'butterfly', name: 'ちょうちょをとる', short: 'ちょうちょ' }],
    draw(g, s, v) {
      const V = g.V, up = jUp(s), BF = [[380, 170], [640, 140]], a1 = s.k >= 1 ? (s.k === 1 ? s.age : s.age + s.spr) : -1, a2 = s.k >= 2 ? s.age : -1;
      g.bg('#5cc0ff', '#e6f8ff');
      g.at(0, up, () => {
        g.blob([620, 380, 640, 240, 720, 180, 800, 220, 860, 160, 940, 220, 960, 380], '#ffffff', 0); g.blob([60, 400, 80, 300, 160, 250, 240, 300, 260, 400], '#ffffff', 0);
        g.hills(430, '#8fd16a', 40, 8, 4); g.band(520, 'bottom', '#72c257');
        for (const x of [120, 260, 760, 900]) { g.line([x, 900, x + 6, 600], '#4e9a3c', 10); g.circ(x + 6, 590, 56, '#ffd23f'); g.circ(x + 6, 590, 26, '#8a5a36', 0); }
        // 虫かご
        g.at(500, 800, () => {
          g.rr(-110, -90, 220, 160, 16, 'rgba(180,240,200,0.35)', 6); g.grid(-104, -84, 208, 148, 22, 'rgba(40,120,60,0.6)', 3); g.rr(-120, -110, 240, 34, 12, '#3cc46b', 6);
          for (const [a, i] of [[a1, 0], [a2, 1]]) if (a > 0.5) g.at(i ? 40 : -40, -10, 0, 0.5, 0.5, () => butterfly(g, s.t * 2 + i, i));
        });
        for (const [i, [x, y]] of BF.entries()) {
          const a = i ? a2 : a1; if (a >= 0 && a > 0.5) continue;
          const fx = a >= 0 ? lerp(x, 500 + (i ? 40 : -40), clamp((a - 0.1) / 0.4)) : x + 30 * Math.sin(s.t * 1.7 + i * 2), fy = a >= 0 ? lerp(y, 790, E.inQ(clamp((a - 0.1) / 0.4))) : y + 20 * Math.sin(s.t * 2.3 + i);
          g.at(fx, fy, () => butterfly(g, s.t * 2 + i, i));
        }
      });
      // あみ（右手）
      const [tx, ty] = mixP(BF[0], BF[1], sw(s)), q = E.ioQ(clamp(s.p));
      const L = 400, ang = -Math.PI / 2 - 0.32 - 0.25 * q, hx = tx - L * Math.cos(-Math.PI / 2 - 0.32) + 60 * q, hy = lerp(ty + 200 - L * Math.sin(-Math.PI / 2 - 0.32), 1500, q);
      g.at(hx, hy, ang + Math.PI / 2, 1, 1, () => { g.rr(-9, -L + 66, 18, L - 40, 8, '#d39457', 5); g.at(0, -L, 0, 1, 0.76, () => { g.circ(0, 0, 92, 'rgba(255,255,255,0.35)', 0); g.clipCirc(0, 0, 92, () => g.grid(-92, -92, 184, 184, 23, 'rgba(255,255,255,0.85)', 3)); g.ring(0, 0, 92, C.ol, 16); g.ring(0, 0, 92, '#3cc46b', 9); }); });
      g.arm(hx, hy, ang, { hand: 'grip', side: 'R' });
    },
    hit(g, s, k) {
      const x = k === 1 ? 380 : 640, y = (k === 1 ? 170 : 140) + 200;
      g.fx.burst(x, y, { n: 10, c: ['#ffd6f0', '#ffffff', '#fff3a8'], shape: 'star', sp: [200, 500], size: [12, 22], g: 300 });
      g.fx.pop(k === 1 ? 'サッ' : 'つかまえた！', k === 1 ? 640 : 420, k === 1 ? 420 : 460, { size: k === 1 ? 104 : 100, c: k === 1 ? '#ffffff' : C.yellow });
      if (k === 2) g.fx.stars(500, 760, 8);
    },
  },
];

/* ---------- 追加の場面で使う道具 ---------- */
const TAU = Math.PI * 2;
function jUp(s) { return 200 * (1 - s.p); }              // 跳ぶと景色が下へ
function prog(a, d) { return a < 0 ? 0 : clamp(a / d); }
// 1回目の目標 → 2回目の目標へ、手が下にあるあいだに切りかえる（0〜1）
function sw(s) { return s.k === 0 ? 0 : s.k >= 2 ? 1 : E.sm((s.u - 0.15) / 0.45); }
const mixP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function kid(g, x, y, sc, shirt, hair, happy) {          // 足もとが x,y
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
function hurdle(g, x, y, k) {
  g.at(x, y, 0, k, k, () => {
    g.rr(-150, -10, 50, 16, 6, '#5c6478', 0); g.rr(100, -10, 50, 16, 6, '#5c6478', 0);
    g.rect(-136, -170, 18, 166, '#ffffff', 5); g.rect(118, -170, 18, 166, '#ffffff', 5);
    g.rr(-150, -206, 300, 44, 8, '#ffffff', 0);
    for (let i = 0; i < 4; i++) g.rect(-130 + i * 70, -202, 36, 36, i % 2 ? '#2b2140' : '#e8402f', 0);
    g.rr(-150, -206, 300, 44, 8, null, 6);
  });
}
function vaultBox(g, x, y, k, n, i) {
  g.at(x, y, 0, k, k, () => {
    g.shadow(0, 6, 230, 26, 0.25);
    for (let j = 0; j < n; j++) { const w = 400 - j * 16, yy = -44 * (j + 1); g.rr(-w / 2, yy, w, 44, 6, j % 2 ? '#c98b52' : '#dba56b', 5); if (j === 1 || j === 3) g.rr(-50, yy + 12, 100, 20, 10, '#6b4426', 0); }
    const w = 400 - n * 16, top = -44 * n;
    g.poly([-w / 2, top, w / 2, top, w / 2 - 26, top - 60, -w / 2 + 26, top - 60], '#fbf6ec');
    g.rr(-w / 2 - 6, top - 14, w + 12, 26, 10, i ? '#e8402f' : '#3a86ff');
  });
}
function polaroid(g, i) {
  g.shadow(8, 14, 120, 130, 0.25);
  g.rr(-110, -125, 220, 250, 8, '#ffffff', 6);
  g.clipRR(-94, -109, 188, 170, 4, () => {
    g.rect(-94, -109, 188, 170, i ? '#ffb86b' : '#7fcfff', 0);
    g.circ(i ? -50 : 50, -70, 22, '#fff3b0', 0);
    g.ell(0, 72, 150, 52, i ? '#e0a050' : '#8fd16a', 0);
    g.at(0, -6, () => {
      g.circ(0, -42, 15, '#ffffff', 0); g.cap(0, -24, 0, 14, 12, '#ffffff', 0);
      g.cap(0, -18, i ? -42 : -24, i ? -40 : -58, 7, '#ffffff', 0); g.cap(0, -18, i ? 42 : 24, i ? -40 : -58, 7, '#ffffff', 0);
      g.cap(0, 12, i ? -36 : -16, i ? 44 : 40, 8, '#ffffff', 0); g.cap(0, 12, i ? 36 : 20, i ? 44 : 32, 8, '#ffffff', 0);
    });
  });
  g.rr(-94, -109, 188, 170, 4, null, 4);
}
function ball(g, x, y, r, rot = 0, kind) {
  g.at(x, y, rot, 1, 1, () => {
    if (kind === 'volley') {
      g.circ(0, 0, r, '#ffffff', 0);
      g.clipCirc(0, 0, r, () => { g.arc(-r * 1.1, -r * 0.2, r * 1.2, -0.6, 0.9, '#3a86ff', r * 0.34); g.arc(r * 1.0, r * 0.5, r * 1.1, 2.4, 3.9, '#ffd23f', r * 0.34); });
    } else {
      g.circ(0, 0, r, '#ff7a1a', 0);
      g.clipCirc(0, 0, r, () => { g.line([-r, 0, r, 0], C.ol, 5); g.line([0, -r, 0, r], C.ol, 5); g.arc(-r * 1.25, 0, r * 0.9, -0.95, 0.95, C.ol, 5); g.arc(r * 1.25, 0, r * 0.9, Math.PI - 0.95, Math.PI + 0.95, C.ol, 5); });
    }
    g.circ(0, 0, r, null, 6);
    g.hl(-r * 0.35, -r * 0.4, r * 0.28, r * 0.14, -0.6, 0.5);
  });
}
function apple(g, x, y, sc = 1, rot = 0) {
  g.at(x, y, rot, sc, sc, () => {
    g.path('M0 -30 C30 -52 64 -30 60 6 C56 44 26 62 0 52 C-26 62 -56 44 -60 6 C-64 -30 -30 -52 0 -30Z', '#e8343c');
    g.line([0, -30, 4, -52], '#6b4426', 6);
    g.hl(-28, -14, 12, 20, 0.3, 0.5);
  });
}
function frog(g, x, y, awake, air, sc = 1) {
  g.at(x, y, 0, sc, sc, () => {
    if (air) { g.cap(-40, 30, -74, 92, 14, '#4caf50'); g.cap(40, 30, 74, 92, 14, '#4caf50'); }
    else { g.ell(-56, 34, 30, 18, '#4caf50'); g.ell(56, 34, 30, 18, '#4caf50'); }
    g.ell(0, 10, 70, 52, '#5cc95c');
    g.ell(0, 24, 44, 26, '#c9f2a8', 0);
    for (const sg of [-1, 1]) { g.circ(sg * 32, -38, 24, '#5cc95c'); g.circ(sg * 32, -40, 15, '#ffffff', 0); if (awake) g.circ(sg * 32, -38, 8, C.ol, 0); else g.line([sg * 32 - 10, -38, sg * 32 + 10, -38], C.ol, 4); }
    g.arc(0, 0, 26, 0.3, Math.PI - 0.3, C.ol, 4);
    g.circ(-44, 6, 7, '#ff9fbd', 0); g.circ(44, 6, 7, '#ff9fbd', 0);
  });
}
function dolphin(g) {     // +x 向き
  g.path('M-20 -40 L14 -88 L34 -42Z', '#3b7fc4');
  g.path('M-118 0 L-162 -38 L-150 0 L-162 36Z', '#3b7fc4');
  g.path('M-120 0 C-80 -46 40 -58 110 -16 L152 -6 L112 6 C60 36 -60 38 -120 0Z', '#4a90d9');
  g.path('M-70 16 C-20 34 40 30 92 10 C40 20 -20 24 -70 16Z', '#cfe8ff', 0);
  g.circ(84, -16, 6, C.ol, 0);
}
function butterfly(g, t, i) {
  const f = 0.35 + 0.65 * Math.abs(Math.sin(t * 6)), c = i ? '#ffb13b' : '#ff6bb5', c2 = i ? '#fff3a8' : '#ffd6f0';
  for (const sg of [-1, 1]) g.at(0, 0, 0, sg * f, 1, () => { g.ell(34, -22, 40, 32, c, 5, -0.4); g.ell(28, 26, 26, 22, c, 5, 0.4); g.circ(36, -24, 12, c2, 0); });
  g.ell(0, 0, 9, 34, C.ol, 0); g.line([0, -30, -14, -54], C.ol, 3); g.line([0, -30, 14, -54], C.ol, 3);
}
