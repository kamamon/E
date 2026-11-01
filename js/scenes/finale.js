/* ラスト5回（どの動きでも使う、しめくくりの場面）：5・4・3・2・1 → フィニッシュ！ */
import { C, E, clamp, lerp, sh } from '../kit.js';

const SPOTS = [[260, 250, C.pink], [740, 220, C.sky], [380, 140, C.gold], [640, 330, C.lime], [500, 190, C.violet]];
// カウントダウンの文字（イラストの場面と実写の場面の両方で使う）。over = 実写の上に重ねる
export function drawCountdown(g, s, over) {
  const n = s.n || 5, k = s.k, done = k >= n;
  if (over) { const V = g.V; g.alpha(0.28, () => g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, V.y1 - V.y0 + 40, '#000000', 0)); }
  if (!done) {
    const rem = n - k, near = 1 + 0.22 * clamp(1 - s.p), pulse = 1 + 0.04 * Math.sin(s.t * 14);
    const pop = k ? 1 + 0.25 * Math.exp(-10 * s.age) : 1;
    g.text('ラスト', 500, 210, { size: 76, f: '#ffffff', o: 14 });
    g.at(500, 500, 0, near * pulse * pop, near * pulse * pop, () => {
      if (over) { g.alpha(0.55, () => g.circ(0, 0, 175, '#000000', 0)); g.circ(0, 0, 175, null, 0); g.ctx.strokeStyle = C.gold; g.ctx.lineWidth = 10; g.ctx.stroke(); }
      else { g.glow(0, 0, 300, '#ffd76a', 0.45); g.circ(0, 0, 175, C.gold, 10); g.circ(0, 0, 145, '#ffe796', 0); }
      g.text(String(rem), 0, 16, { size: 230, f: '#ffffff', o: 22 });
    });
    for (let i = 0; i < n; i++) g.circ(500 + (i - (n - 1) / 2) * 56, 760, 17, i < k ? C.gold : 'rgba(255,255,255,0.35)', i < k ? 5 : 0);
  } else {
    const q = E.outBack(clamp(s.age / 0.3));
    g.at(500, 450, 0, q * 1.05, q * 1.05, () => g.text('フィニッシュ！', 0, 0, { size: 108, f: C.yellow, o: 18 }));
    if (s.age > 0.25) g.alpha(clamp((s.age - 0.25) / 0.3), () => g.text('50回 できました', 500, 610, { size: 64, f: '#ffffff', o: 12 }));
  }
}
export function countdownHit(g, s, k) {
  const n = s.n || 5, [x, y, c] = SPOTS[(k - 1) % SPOTS.length];
  g.fx.burst(x, y, { n: 30, c: [c, '#ffffff'], shape: 'spark', sp: [300, 760], size: [12, 22], g: 260, life: [0.6, 1.1] });
  g.fx.ring(x, y, { c, r1: 220, w: 10 });
  if (k >= n) { g.fx.flash('#fff6c8', 0.6, 0.25); g.fx.confetti(120); g.fx.shake(16, 0.3); for (const [xx, yy, cc] of SPOTS) g.fx.burst(xx, yy, { n: 22, c: [cc, '#ffffff'], shape: 'spark', sp: [300, 700], size: [10, 20], g: 260 }); }
  else g.fx.shake(8, 0.12);
}
export const FINALE = {
  id: 'finale', name: 'ラスト5回！', short: 'ラスト', acts: [], modes: ['one', 'alt', 'both'], theme: 'party', sfx: 'firework',
  draw(g, s) {
    const V = g.V;
    g.bg('#140d36', '#3b1c60');
    // 放射状の光
    g.at(500, 470, s.t * 0.35, 1, 1, () => { for (let i = 0; i < 16; i++) g.alpha(0.1, () => g.poly([0, 0, Math.cos(i / 16 * Math.PI * 2) * 1500, Math.sin(i / 16 * Math.PI * 2) * 1500, Math.cos((i + 0.45) / 16 * Math.PI * 2) * 1500, Math.sin((i + 0.45) / 16 * Math.PI * 2) * 1500], '#ffd76a', 0)); });
    // 夜の町
    g.band(860, 'bottom', '#120c2c');
    for (let x = V.x0 - 40, i = 0; x < V.x1 + 40; x += 92, i++) { const h = 70 + ((i * 53) % 90); g.rect(x, 860 - h, 80, h + 20, '#1d1442', 0); for (let w = 0; w < 3; w++) if ((i + w) % 3) g.rect(x + 14 + w * 20, 880 - h, 10, 14, '#ffd76a', 0); }
    drawCountdown(g, s, false);
  },
  hit(g, s, k) { countdownHit(g, s, k); },
};
