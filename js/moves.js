/* =========================================================================
   IMMERSE FIT — moves.js
   お手本の基本の動き。fn が位相 t からポーズを組み立てます。
   fn(P, t, o): P=ポーズ（書きかえる） t=0..1 の位相 o={k:カーブ, amp, v:バリエーション, mode, side}
   ========================================================================= */
import {
  B, D2R, TAU, SPN, LEG, add, sub, mul, norm, lerp, lerp3, clamp, sm, cw, fr, bump, path,
  A, AT, AG, AW, L, F, FT, mixS, ARM, K, sidePh, each, fromChest, base,
  plank, quad, supine, prone, sideLie, seatF, aimSpine,
} from './motion.js';

export const MOVES = {};
const mv = (key, d) => {
  MOVES[key] = Object.assign({
    key, b: 2, modes: ['both'], ks: ['n'], met: 3.5, lvl: 1, imp: 0, floor: 0, calm: 0, warm: 0,
    view: 0, mus: [], cue: '', want: 'any', qk: 0, vars: [{ k: '', n: '' }],
  }, d);
};

/* ---------- 共通の部品 ---------- */
// 脚の動きに合わせた腕（下半身メニュー用）
function legArms(P, o, d, def = 'chest') {
  const a = o.arms || (o.v && o.v.arms) || def;
  let h;
  switch (a) {
    case 'hips': h = ARM.hips; break;
    case 'head': h = ARM.head; break;
    case 'prayer': h = ARM.prayer; break;
    case 'up': h = ARM.up; break;
    case 't': h = ARM.t; break;
    case 'fwd': h = mixS(ARM.chest, ARM.fwd, d); break;
    case 'reach': h = mixS(ARM.rest, ARM.fwd, d); break;
    case 'guard': h = ARM.guard; P.fist = [1, 1]; break;
    case 'jack': h = A(lerp(-78, 82, d), lerp(10, 2, d), 6); break;
    case 'rest': h = ARM.rest; break;
    case 'none': return;
    default: h = ARM.chest;
  }
  P.hand.L = P.hand.R = h;
}
// 歩くような腕振り（w>0 前・w<0 後ろ）
const swing1 = w => w >= 0 ? A(-80 + 52 * w, 12 + 70 * w, 14 + 72 * w, [0, 1, 0.4]) : A(-80 + 20 * -w, 12 - 70 * -w, 14, [0, 0, 1]);
function swingArms(P, dL, dR, amt = 1) { P.hand.L = swing1((dR - dL) * amt); P.hand.R = swing1((dL - dR) * amt); }
// 片脚を床から持ち上げる（床の足と脚の形をなめらかにつなぐ）
const liftLeg = (planted, lifted, d) => mixS(planted, lifted, sm(d * 5));

/* ======================== 腕（ARMS） ======================== */
const G = ARM.guard.p;
const PT = {
  front: [-0.15, -0.03, 0.53], up: [-0.05, 0.55, 0.1], side: [0.54, 0.03, 0.05],
  cross: [-0.36, -0.02, 0.4], diag: [0.22, 0.4, 0.3], down: [-0.1, -0.5, 0.25],
};
export function punchArm(P, key, s, type, u, d) {
  if (type === 'upper') {
    const p = path([[0, G], [0.24, [-0.06, -0.2, 0.25]], [0.44, [-0.1, 0.14, 0.36]], [0.74, G], [1, G]], u);
    P.hand[key] = AT(p[0], p[1], p[2], [0.15, -1, -0.15]); P.chest[1] += -s * 0.22 * bump(u, 0, 0.74); return;
  }
  if (type === 'hook') {
    const p = path([[0, G], [0.2, [0.17, 0.06, 0.2]], [0.42, [-0.2, 0.04, 0.36]], [0.74, G], [1, G]], u);
    P.hand[key] = AT(p[0], p[1], p[2], [1, 0.35, -0.25]); P.chest[1] += -s * 0.45 * bump(u, 0.15, 0.74); return;
  }
  const tg = PT[type];
  P.hand[key] = mixS(ARM.guard, AT(tg[0], tg[1], tg[2], [0.3, -0.9, -0.3]), d);
  P.chest[1] += -s * d * (type === 'cross' ? 0.42 : type === 'front' ? 0.16 : 0.06);
}
mv('punch', {
  ch: 'arms', g: 'punch', n: 'パンチ', b: 2, modes: ['alt', 'both', 'one'], ks: ['x'], met: 5.5, lvl: 2, qk: 1,
  mus: ['肩', '腕', '体幹'], cue: '伸ばしきったら素早く引く。肩の力は抜いて', want: 'top',
  vars: [
    { k: 'f', n: 'ストレートパンチ', v: { t: 'front' } }, { k: 'u', n: '上へパンチ', v: { t: 'up' } },
    { k: 's', n: 'サイドパンチ', v: { t: 'side' } }, { k: 'c', n: 'クロスパンチ', v: { t: 'cross' }, mus: ['わき腹', '肩'] },
    { k: 'd', n: 'ななめ上パンチ', v: { t: 'diag' } }, { k: 'dn', n: 'ダウンパンチ', v: { t: 'down' } },
  ],
  fn(P, t, o) {
    P.fist = [1, 1]; P.hand.L = P.hand.R = ARM.guard;
    const ph = sidePh(t, o.mode, o.side);
    for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; punchArm(P, i ? 'R' : 'L', i ? 1 : -1, o.v.t, u, o.k(u) * o.amp); }
  },
});
mv('punch2', {
  ch: 'arms', g: 'punch', n: 'パンチ', b: 2, modes: ['alt', 'one'], met: 5.5, lvl: 2, qk: 1, pk: 0.44,
  mus: ['肩', '腕', 'わき腹'], cue: 'ひざと腰の回転でパンチを出す',
  vars: [{ k: 'up', n: 'アッパーカット', v: { t: 'upper' } }, { k: 'hk', n: 'フック', v: { t: 'hook' } }],
  fn(P, t, o) {
    P.fist = [1, 1]; P.hand.L = P.hand.R = ARM.guard;
    const ph = sidePh(t, o.mode, o.side);
    for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; punchArm(P, i ? 'R' : 'L', i ? 1 : -1, o.v.t, u, 0); }
  },
});
// ボクシングのコンビネーション（1拍に1発）
export const COMBOS = {
  onetwo: { n: 'ワンツー', s: [['L', 'front'], ['R', 'cross']] },
  jjc: { n: 'ジャブ・ジャブ・ストレート', s: [['L', 'front'], ['L', 'front'], ['R', 'cross'], null] },
  oth: { n: 'ワンツー・フック', s: [['L', 'front'], ['R', 'cross'], ['L', 'hook'], null] },
  hh: { n: 'フック・フック', s: [['L', 'hook'], ['R', 'hook']] },
  uu: { n: 'アッパー・アッパー', s: [['L', 'upper'], ['R', 'upper']] },
  otu: { n: 'ワンツー・アッパー', s: [['L', 'front'], ['R', 'cross'], ['L', 'upper'], null] },
  hu: { n: 'フック・アッパー', s: [['L', 'hook'], ['R', 'upper']] },
  rush: { n: 'ストレート連打', s: [['L', 'front'], ['R', 'front'], ['L', 'front'], ['R', 'front']] },
  ud: { n: '上・下・上・下', s: [['L', 'up'], ['R', 'down'], ['L', 'down'], ['R', 'up']] },
  sx: { n: 'サイド・クロス', s: [['L', 'side'], ['R', 'side'], ['L', 'cross'], ['R', 'cross']] },
  otd: { n: 'ワンツー・ダッキング', s: [['L', 'front'], ['R', 'cross'], ['duck'], null], torso: 1 },
  wd: { n: 'ウィーブ・ワンツー', s: [['weaveR'], ['weaveL'], ['L', 'front'], ['R', 'cross']], torso: 1 },
};
mv('combo', {
  ch: 'arms', g: 'boxing', n: 'コンボ', b: 2, met: 6.5, lvl: 2, mus: ['肩', '腕', '体幹'], cue: '打ったらすぐガードに戻す',
  vars: Object.entries(COMBOS).map(([k, c]) => ({ k, n: c.n, v: { seq: c.s }, b: c.s.length, torso: c.torso || 0 })),
  fn(P, t, o) {
    const seq = o.v.seq, n = seq.length, u = t * n, i = Math.floor(u) % n, f = u - Math.floor(u);
    P.fist = [1, 1]; P.hand.L = P.hand.R = ARM.guard; P.foot.L = P.foot.R = F(0.16, 0.02, 12);
    const e = seq[i]; if (!e) return;
    if (e[0] === 'duck') { const b = bump(f, 0, 1); P.root[1] -= 0.2 * b; P.rot[0] += 0.12 * b; P.chest[0] += 0.18 * b; return; }
    if (e[0] === 'weaveR' || e[0] === 'weaveL') { const s = e[0] === 'weaveR' ? 1 : -1; const b = bump(f, 0, 1); P.root[1] -= 0.17 * b; P.root[0] += s * 0.16 * Math.sin(Math.PI * f); P.chest[2] -= s * 0.15 * b; return; }
    punchArm(P, e[0], e[0] === 'R' ? 1 : -1, e[1], f, K.x(f));
  },
});
mv('circle', {
  ch: 'arms', g: 'circle', n: 'アームサークル', b: 2, met: 3.5, qk: 1, warm: 1, mus: ['肩'], cue: '肩から大きく回し、呼吸は止めない',
  vars: [
    { k: 'sf', n: '横で小さく前回し', v: { pl: 'side', r: 0.07, dir: -1 }, b: 1 },
    { k: 'sb', n: '横で小さく後ろ回し', v: { pl: 'side', r: 0.07, dir: 1 }, b: 1 },
    { k: 'mf', n: '横で大きく前回し', v: { pl: 'side', r: 0.16, dir: -1 } },
    { k: 'mb', n: '横で大きく後ろ回し', v: { pl: 'side', r: 0.16, dir: 1 } },
    { k: 'fi', n: '前で内回し', v: { pl: 'front', r: 0.13, dir: 1 } },
    { k: 'fo', n: '前で外回し', v: { pl: 'front', r: 0.13, dir: -1 } },
    { k: 'ov', n: '頭上で回す', v: { pl: 'over', r: 0.11, dir: 1 } },
    { k: 'bf', n: '大車輪（前回し）', v: { pl: 'big', dir: 1 }, b: 4 },
    { k: 'bb', n: '大車輪（後ろ回し）', v: { pl: 'big', dir: -1 }, b: 4 },
    { k: 'wf', n: '交互大車輪（前）', v: { pl: 'big', dir: 1, opp: 1 }, b: 4 },
    { k: 'wb', n: '交互大車輪（後ろ）', v: { pl: 'big', dir: -1, opp: 1 }, b: 4 },
  ],
  fn(P, t, o) {
    const v = o.v, ph = v.opp ? sidePh(t, 'opp') : [t, t];
    for (let i = 0; i < 2; i++) {
      const a = TAU * ph[i] * v.dir; let p, pole;
      if (v.pl === 'side') { p = [0.48, v.r * Math.sin(a), v.r * Math.cos(a)]; pole = [0, -0.2, -1]; }
      else if (v.pl === 'front') { p = [-0.06 + v.r * Math.cos(a), -0.03 + v.r * Math.sin(a), 0.49]; pole = [0.6, -0.6, -0.3]; }
      else if (v.pl === 'over') { p = [0.02 + v.r * Math.cos(a), 0.5, 0.1 + v.r * Math.sin(a)]; pole = [1, 0, 0]; }
      else { const g = Math.PI / 2 - a; p = mul(norm([0.17, Math.sin(g), Math.cos(g) + 0.12]), 0.545); pole = [1, 0, -0.1]; }
      P.hand[i ? 'R' : 'L'] = AT(p[0], p[1], p[2], pole);
    }
  },
});
mv('raise', {
  ch: 'arms', g: 'raise', n: 'レイズ', b: 2, modes: ['both', 'alt', 'one'], ks: ['n', 'd', 'p'], met: 3.5,
  mus: ['肩'], cue: '反動を使わず、ゆっくりコントロール', want: 'bottom',
  vars: [
    { k: 'l', n: 'サイドレイズ', v: { el: 0, az: 2 } }, { k: 'lu', n: 'サイドレイズ（頭上まで）', v: { el: 82, az: 4 } },
    { k: 'lh', n: 'ハーフサイドレイズ', v: { el: -38, az: 2 } }, { k: 'f', n: 'フロントレイズ', v: { el: 0, az: 88 } },
    { k: 'fu', n: 'フロントレイズ（頭上まで）', v: { el: 80, az: 84 } }, { k: 'y', n: 'Yレイズ', v: { el: 52, az: 30 } },
    { k: 'sc', n: 'ななめレイズ', v: { el: 12, az: 42 } },
  ],
  fn(P, t, o) { const v = o.v; each(P, t, o, (s, key, d) => { P.hand[key] = A(lerp(-80, v.el, d), v.az, lerp(12, 5, d), [0, 0, 1]); }); },
});
mv('wraise', {
  ch: 'arms', g: 'raise', n: 'Wレイズ', b: 2, ks: ['n', 'd', 'p'], met: 3, mus: ['背中', '肩'], cue: '肩甲骨を寄せて胸をひらく',
  vars: [{ k: '', n: 'Wレイズ' }],
  fn(P, t, o) { each(P, t, o, (s, key, d) => { P.hand[key] = A(lerp(-80, -26, d), lerp(12, -36, d), lerp(12, 100, d), [0, 1, 0]); }); },
});
mv('ytw', {
  ch: 'arms', g: 'raise', n: 'Y・T・W', b: 6, met: 3.5, mus: ['背中', '肩'], cue: 'アルファベットを腕で大きく描く',
  vars: [{ k: '', n: 'Y・T・Wレイズ' }],
  fn(P, t, o) {
    const u = t * 3, i = Math.floor(u) % 3, d = cw(u - Math.floor(u));
    const T = [ARM.y, ARM.t, ARM.w][i];
    P.hand.L = P.hand.R = mixS(ARM.rest, T, d);
  },
});
mv('press', {
  ch: 'arms', g: 'push', n: 'ショルダープレス', b: 2, modes: ['both', 'alt', 'one'], ks: ['n', 'd', 'p', 'o'], met: 4, lvl: 2,
  mus: ['肩', '二の腕'], cue: 'ひじは肩の高さから真上へ押し上げる', want: 'top',
  vars: [{ k: '', n: 'ショルダープレス', v: {} }, { k: 'w', n: 'ワイドプレス', v: { w: 1 } }, { k: 'a', n: 'アーノルドプレス', v: { arn: 1 } }],
  fn(P, t, o) {
    const v = o.v;
    each(P, t, o, (s, key, d) => {
      if (v.arn) { const a = path([[0, [-15, 78, 135]], [0.35, [0, -4, 92]], [1, [82, 8, 4]]], d); P.hand[key] = A(a[0], a[1], a[2], [0, 1, 0]); }
      else P.hand[key] = A(lerp(0, v.w ? 55 : 82, d), lerp(-4, v.w ? 28 : 8, d), lerp(92, 4, d), [0, 1, 0]);
    });
  },
});
mv('push', {
  ch: 'arms', g: 'push', n: 'プッシュ', b: 2, modes: ['both', 'alt'], met: 3.5, qk: 1, mus: ['胸', '肩', '二の腕'], cue: '手のひらで空気を押し出す',
  vars: [
    { k: 'f', n: '前へプッシュ', v: { e: [-0.1, -0.04, 0.53] } }, { k: 'u', n: '上へプッシュ', v: { e: [-0.04, 0.54, 0.12] } },
    { k: 's', n: '横へプッシュ', v: { e: [0.53, 0, 0.1] } }, { k: 'd', n: '下へプッシュ', v: { e: [-0.02, -0.53, 0.14] } },
    { k: 'x', n: 'ななめ上へプッシュ', v: { e: [0.24, 0.42, 0.26] } },
  ],
  fn(P, t, o) { const e = o.v.e; P.fist = [0, 0]; each(P, t, o, (s, key, d) => { P.hand[key] = mixS(AT(-0.08, -0.1, 0.17, [1, -0.6, -0.3]), AT(e[0], e[1], e[2], [0.5, -0.7, -0.3]), d); }); },
});
const ROWT = {
  low: [AT(-0.08, -0.1, 0.52, [0.2, -0.4, -1]), AT(0.03, -0.3, -0.04, [0.2, -0.4, -1])],
  hi: [AT(-0.06, 0, 0.52, [1, 0.2, -0.6]), AT(0.06, 0.02, 0.08, [1, 0.2, -0.6])],
  up: [AT(-0.13, -0.48, 0.14, [1, 0.6, 0]), AT(-0.12, 0.04, 0.12, [1, 0.6, 0])],
};
mv('row', {
  ch: 'arms', g: 'pull', n: 'ロウ', b: 2, modes: ['both', 'alt', 'one'], ks: ['n', 'd'], met: 3.5, mus: ['背中', '腕'], cue: '肩甲骨を寄せるように引く',
  vars: [{ k: '', n: 'ロウ', v: { t: 'low' } }, { k: 'h', n: 'ハイロウ', v: { t: 'hi' } }, { k: 'u', n: 'アップライトロウ', v: { t: 'up' }, mus: ['肩'] }],
  fn(P, t, o) { const T = ROWT[o.v.t]; P.fist = [1, 1]; each(P, t, o, (s, key, d) => { P.hand[key] = mixS(T[0], T[1], d); }); },
});
mv('pulldown', {
  ch: 'arms', g: 'pull', n: 'プルダウン', b: 2, modes: ['both', 'alt'], ks: ['n', 'd'], met: 3.5, mus: ['背中', '腕'], cue: 'ひじを脇腹に引き寄せる',
  vars: [{ k: '', n: 'ラットプルダウン', v: {} }, { k: 'w', n: 'ワイドプルダウン', v: { w: 1 } }],
  fn(P, t, o) {
    const w = o.v.w ? 0.12 : 0; P.fist = [1, 1];
    each(P, t, o, (s, key, d) => { P.hand[key] = mixS(AT(0.1 + w, 0.52, 0.05, [1, -0.2, -0.2]), AT(0.2 + w, -0.1, -0.04, [1, -0.5, -0.4]), d); });
  },
});
mv('curl', {
  ch: 'arms', g: 'bend', n: 'アームカール', b: 2, modes: ['both', 'alt', 'one'], ks: ['n', 'd', 'p', 'o'], met: 3.5,
  mus: ['力こぶ'], cue: 'ひじを脇に固定して曲げ伸ばし', want: 'bottom',
  vars: [{ k: '', n: 'アームカール', v: {} }, { k: 'w', n: 'ワイドカール', v: { w: 1 } }, { k: 'h', n: 'ハイカール', v: { hi: 1 } }],
  fn(P, t, o) {
    const v = o.v; P.fist = [1, 1];
    each(P, t, o, (s, key, d) => {
      if (v.hi) P.hand[key] = A(0, 0, lerp(10, 130, d), [0, 1, 0.2]);
      else P.hand[key] = A(v.w ? -68 : -84, v.w ? 22 : -6, lerp(15, 140, d), [0, 0.15, 1]);
    });
  },
});
mv('tri', {
  ch: 'arms', g: 'bend', n: 'トライセプス', b: 2, modes: ['both', 'one'], ks: ['n', 'd', 'p'], met: 3.5, mus: ['二の腕'], cue: 'ひじの位置を動かさずに伸ばす',
  vars: [{ k: 'oh', n: 'オーバーヘッドエクステンション', v: { t: 'oh' } }, { k: 'kb', n: 'キックバック', v: { t: 'kb' } }, { k: 'pb', n: '二の腕パルス', v: { t: 'pb' } }],
  fn(P, t, o) {
    const v = o.v;
    each(P, t, o, (s, key, d) => {
      if (v.t === 'oh') P.hand[key] = mixS(AT(-0.12, 0.18, -0.17, [0.1, 1, 0.4]), AT(-0.12, 0.54, 0.06, [0.1, 1, 0.4]), d);
      else if (v.t === 'kb') P.hand[key] = A(-62, -95, lerp(85, 4, d), [0, -0.6, 0.8]);
      else P.hand[key] = AT(0.05, -0.5, lerp(-0.08, -0.2, d), [0.2, 0.1, 1]);
    });
  },
});
mv('fly', {
  ch: 'arms', g: 'open', n: 'チェストフライ', b: 2, ks: ['n', 'd', 'p'], met: 3.5, qk: 1, mus: ['胸', '肩'], cue: '閉じるときに胸をギュッと寄せる',
  vars: [{ k: '', n: 'チェストフライ', v: {} }, { k: 'bf', n: 'バタフライ', v: { bf: 1 } }, { k: 'rv', n: '背中寄せパルス', v: { rv: 1 }, mus: ['背中', '肩'] }],
  fn(P, t, o) {
    const v = o.v;
    each(P, t, o, (s, key, d) => {
      if (v.bf) P.hand[key] = A(0, lerp(0, 82, d), 92, [0, 1, 0]);
      else if (v.rv) P.hand[key] = A(-4, lerp(8, -16, d), 6, [0, 1, 0]);
      else P.hand[key] = A(-2, lerp(2, 84, d), 22, [0, 0, 1]);
    });
  },
});
mv('rot', {
  ch: 'arms', g: 'open', n: 'ゴールポスト', b: 2, ks: ['n', 'p'], met: 2.5, mus: ['肩'], cue: 'ひじは肩の高さでキープ',
  vars: [{ k: '', n: 'ゴールポスト回旋', v: {} }],
  fn(P, t, o) { each(P, t, o, (s, key, d) => { const b = lerp(0, 90, d) * D2R; P.hand[key] = A(0, -4, 90, [0, Math.sin(b), Math.cos(b)]); }); },
});
mv('scissor', {
  ch: 'arms', g: 'open', n: 'アームシザーズ', b: 2, met: 3.5, qk: 1, mus: ['胸', '肩'], cue: '腕は伸ばしたまま交差させる',
  vars: [{ k: 'h', n: 'アームシザーズ（横）', v: { h: 1 } }, { k: 'v', n: 'アームシザーズ（縦）', v: { h: 0 } }],
  fn(P, t, o) {
    const w = Math.sin(TAU * t);
    if (o.v.h) { P.hand.R = AT(-0.12 + 0.3 * w, 0.02 * w, 0.5, [0, -1, 0]); P.hand.L = AT(-0.12 - 0.3 * w, -0.02 * w, 0.5, [0, -1, 0]); }
    else { P.hand.R = A(30 * w, 88, 4, [0, 1, 0]); P.hand.L = A(-30 * w, 88, 4, [0, 1, 0]); }
  },
});
mv('xswing', {
  ch: 'arms', g: 'open', n: 'クロススイング', b: 2, met: 3.5, qk: 1, warm: 1, mus: ['胸', '背中'], cue: '腕の重さで振る',
  vars: [{ k: '', n: 'クロススイング（ハグ）', v: {} }],
  fn(P, t, o) { const d = o.k(t); P.hand.R = A(lerp(-30, -42, d), lerp(-8, 150, d), 10, [0, 0, 1]); P.hand.L = A(lerp(-30, -50, d), lerp(-8, 150, d), 10, [0, 0, 1]); },
});
mv('swim', {
  ch: 'arms', g: 'swim', n: 'スイム', b: 4, met: 4.5, lvl: 2, qk: 1, mus: ['肩', '背中'], cue: '水をかくように大きく',
  vars: [{ k: 'cr', n: 'クロール', v: { t: 'cr' } }, { k: 'bk', n: '背泳ぎ', v: { t: 'bk' } }, { k: 'br', n: '平泳ぎ', v: { t: 'br' } }, { k: 'fl', n: 'バタフライ泳ぎ', v: { t: 'fl' } }],
  fn(P, t, o) {
    const v = o.v;
    if (v.t === 'br') { const p = path([[0, [-0.16, -0.12, 0.22]], [0.3, [-0.12, 0.04, 0.53]], [0.62, [0.32, 0.02, 0.32]], [1, [-0.16, -0.12, 0.22]]], t); P.hand.L = P.hand.R = AT(p[0], p[1], p[2], [1, -0.4, -0.3]); return; }
    const ph = v.t === 'fl' ? [t, t] : sidePh(t, 'opp'), dir = v.t === 'bk' ? -1 : 1;
    for (let i = 0; i < 2; i++) { const g = Math.PI / 2 - TAU * ph[i] * dir; const p = mul(norm([0.17, Math.sin(g), Math.cos(g) + 0.22]), 0.545); P.hand[i ? 'R' : 'L'] = AT(p[0], p[1], p[2], [1, 0, -0.2]); }
    if (v.t !== 'fl') P.chest[1] += 0.14 * Math.sin(TAU * t);
  },
});
mv('wave', {
  ch: 'arms', g: 'rhythm', n: 'ウェーブ', b: 2, met: 3, warm: 1, mus: ['肩', 'わき腹'], cue: '体ごと左右にゆらす',
  vars: [{ k: '', n: '頭上ウェーブ' }],
  fn(P, t, o) {
    const x = 0.24 * Math.sin(TAU * t);
    for (let i = 0; i < 2; i++) { const s = i ? 1 : -1, p = fromChest(s, [s * 0.12 + x, 0.52, 0.06]); P.hand[i ? 'R' : 'L'] = AT(p[0], p[1], p[2], [1, 0.3, 0]); }
    P.chest[2] -= 0.13 * Math.sin(TAU * t); P.root[0] += 0.04 * Math.sin(TAU * t); P.fist = [0, 0];
  },
});
mv('clap', {
  ch: 'arms', g: 'rhythm', n: 'クラップ', b: 1, ks: ['x'], met: 3.5, mus: ['胸', '肩'], cue: 'たたく瞬間に胸をしめる',
  vars: [
    { k: 'f', n: 'クラップ', v: { a: [0.34, 0, 0.3], b: [-0.165, -0.02, 0.42] } },
    { k: 'o', n: '頭上クラップ', v: { a: [0.42, 0.3, 0.05], b: [-0.165, 0.52, 0.12] } },
    { k: 'l', n: 'ロークラップ', v: { a: [0.28, -0.42, 0.2], b: [-0.165, -0.4, 0.3] } },
  ],
  fn(P, t, o) { const v = o.v, d = o.k(t) * o.amp; P.fist = [0, 0]; P.hand.L = P.hand.R = mixS(AT(v.a[0], v.a[1], v.a[2], [0.6, -0.6, -0.4]), AT(v.b[0], v.b[1], v.b[2], [0.6, -0.6, -0.4]), d); },
});
mv('drum', {
  ch: 'arms', g: 'rhythm', n: 'ドラム', b: 1, modes: ['opp'], met: 3.5, qk: 1, mus: ['腕', '肩'], cue: '手首をやわらかく',
  vars: [{ k: '', n: 'エアドラム' }],
  fn(P, t, o) { P.fist = [1, 1]; const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) { const d = cw(ph[i]); P.hand[i ? 'R' : 'L'] = AT(-0.1, -0.42 + 0.16 * d, 0.3, [0.5, -0.8, -0.2]); } },
});
mv('swing', {
  ch: 'arms', g: 'rhythm', n: 'アームスイング', b: 2, modes: ['opp'], met: 3, warm: 1, mus: ['肩'], cue: '肩の力を抜いて振り子のように',
  vars: [{ k: '', n: 'アームスイング（前後）' }],
  fn(P, t, o) { const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) { const a = lerp(-40, 55, cw(ph[i])) * D2R; const p = mul([0.12, -Math.cos(a), Math.sin(a)], 0.545); P.hand[i ? 'R' : 'L'] = AT(p[0], p[1], p[2], [0.3, 0.3, -1]); } },
});
mv('robot', {
  ch: 'arms', g: 'rhythm', n: 'ロボットアーム', b: 2, modes: ['opp'], met: 3, qk: 1, mus: ['肩'], cue: 'ひじは肩の高さで固定',
  vars: [{ k: '', n: 'ロボットアーム' }],
  fn(P, t, o) { const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) { const w = Math.cos(TAU * ph[i]); P.hand[i ? 'R' : 'L'] = A(0, 0, 90 * Math.abs(w), [0, w >= 0 ? 1 : -1, 0.05]); } },
});
mv('climb', {
  ch: 'arms', g: 'pull', n: 'ロープクライム', b: 2, modes: ['opp'], met: 4, qk: 1, mus: ['背中', '腕'], cue: '上の手でつかんで引き下ろす',
  vars: [{ k: '', n: 'ロープクライム' }],
  fn(P, t, o) { P.fist = [1, 1]; const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) P.hand[i ? 'R' : 'L'] = mixS(AT(-0.08, -0.1, 0.28, [0.4, -0.6, -0.4]), AT(-0.07, 0.55, 0.12, [0.4, -0.6, -0.4]), cw(ph[i])); },
});
mv('rope', {
  ch: 'arms', g: 'pull', n: '綱引き', b: 2, modes: ['opp'], met: 4, qk: 1, mus: ['背中', '腕'], cue: '手をたぐり寄せるように',
  vars: [{ k: '', n: '綱引きプル' }],
  fn(P, t, o) { P.fist = [1, 1]; const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) P.hand[i ? 'R' : 'L'] = mixS(AT(-0.06, -0.24, 0.12, [0.4, -0.5, -0.8]), AT(-0.13, -0.16, 0.54, [0.4, -0.5, -0.8]), cw(ph[i])); },
});
// 紐を引っ張る（片手）：上でつかんで、まっすぐ引きおろす（電気のひも・ベル）
mv('cord', {
  ch: 'arms', g: 'pull', n: '紐を引っ張る', b: 2, modes: ['one', 'alt'], met: 3.5, qk: 1, mus: ['背中', '腕'], cue: '上でつかんで、まっすぐ引きおろす',
  vars: [{ k: '', n: '紐を引っ張る' }],
  fn(P, t, o) { P.fist = [1, 1]; each(P, t, o, (s, key, d) => { P.hand[key] = mixS(AT(0.02, 0.55, 0.12, [0.4, -0.6, -0.4]), AT(-0.02, -0.12, 0.2, [0.4, -0.5, -0.8]), d); }); },
});
mv('kayak', {
  ch: 'arms', g: 'pull', n: 'カヤック', b: 4, met: 4, mus: ['背中', 'わき腹'], cue: '左右交互にパドルで水をかく',
  vars: [{ k: '', n: 'カヤックパドル' }],
  fn(P, t, o) {
    const w = Math.sin(TAU * t), c = [0.02 * w, -0.05, 0.32];
    const dir = [Math.cos(0.65 * w), Math.sin(0.65 * w), 0];
    for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; const pt = add(c, add(mul(dir, s * 0.24), [0, 0, -0.12 * s * w])); const p = fromChest(s, pt); P.hand[i ? 'R' : 'L'] = AT(p[0], p[1], p[2], [1, -0.5, -0.4]); }
    P.chest[1] += 0.3 * w; P.fist = [1, 1];
  },
});
mv('archer', {
  ch: 'arms', g: 'pull', n: 'アーチャー', b: 4, modes: ['alt'], met: 3.5, mus: ['背中', '肩'], cue: '弓を引くように胸をひらく',
  vars: [{ k: '', n: 'アーチャープル' }],
  fn(P, t, o) {
    const ph = sidePh(t, 'alt'); let yaw = 0;
    for (let i = 0; i < 2; i++) { const u = ph[i]; const d = u < 0 ? 0 : o.k(u); const key = i ? 'R' : 'L', okey = i ? 'L' : 'R', s = i ? 1 : -1; if (u < 0) continue; P.hand[key] = mixS(ARM.chest, ARM.t, d); P.hand[okey] = mixS(ARM.chest, AT(-0.22, 0.02, 0.16, [1, 0.2, -0.3]), d); yaw += s * 0.25 * d; }
    P.neck[1] += yaw * 1.6; P.fist = [1, 1];
  },
});
mv('chopa', {
  ch: 'arms', g: 'rhythm', n: 'チョップ', b: 2, modes: ['alt'], ks: ['x'], met: 3.5, qk: 1, mus: ['肩', '腕'], cue: '手刀でまっすぐ振り下ろす',
  vars: [{ k: '', n: '手刀チョップ' }],
  fn(P, t, o) { each(P, t, o, (s, key, d) => { P.hand[key] = mixS(AT(0.12, 0.4, 0.12, [1, 0.2, -0.3]), AT(-0.18, -0.36, 0.34, [1, 0.2, -0.3]), d); }); P.fist = [0, 0]; },
});
mv('wipe', {
  ch: 'arms', g: 'rhythm', n: '窓ふき', b: 2, modes: ['opp'], met: 3, qk: 1, warm: 1, mus: ['肩'], cue: '手のひらで大きく円を描く',
  vars: [{ k: '', n: '窓ふきサークル' }],
  fn(P, t, o) { P.fist = [0, 0]; const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) { const a = TAU * ph[i]; P.hand[i ? 'R' : 'L'] = AT(-0.06 + 0.14 * Math.cos(a), 0.02 + 0.14 * Math.sin(a), 0.44, [0.6, -0.6, -0.3]); } },
});
mv('speedbag', {
  ch: 'arms', g: 'boxing', n: 'スピードバッグ', b: 1, modes: ['opp'], met: 4.5, qk: 1, mus: ['肩', '腕'], cue: '顔の前で小さく速く回す',
  vars: [{ k: '', n: 'スピードバッグ' }],
  fn(P, t, o) { P.fist = [1, 1]; const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) { const a = TAU * ph[i]; P.hand[i ? 'R' : 'L'] = AT(-0.13, 0.06 + 0.06 * Math.sin(a), 0.3 + 0.06 * Math.cos(a), [0.6, -0.8, 0]); } },
});
mv('gupa', {
  ch: 'arms', g: 'rhythm', n: 'グーパー', b: 1, met: 2.5, qk: 1, mus: ['手', '前腕'], cue: '指先までしっかり開く',
  vars: [{ k: 'f', n: 'グーパー（前）', v: { a: ARM.fwd } }, { k: 'u', n: 'グーパー（上）', v: { a: ARM.up } }, { k: 's', n: 'グーパー（横）', v: { a: ARM.t } }],
  fn(P, t, o) { P.hand.L = P.hand.R = o.v.a; const g = cw(t); P.fist = [g, g]; },
});
mv('pulse', {
  ch: 'arms', g: 'rhythm', n: 'アームパルス', b: 1, met: 3, qk: 1, mus: ['肩', '二の腕'], cue: '腕は伸ばしたまま小さく速く',
  vars: [
    { k: 'tu', n: 'Tパルス（上下）', v: { f: d => A(lerp(-6, 8, d), 0, 4, [0, 1, 0]) } },
    { k: 'tf', n: 'Tパルス（前後）', v: { f: d => A(0, lerp(-10, 12, d), 4, [0, 1, 0]) } },
    { k: 'fw', n: '前ならえパルス', v: { f: d => A(lerp(-8, 6, d), 92, 4, [0, 1, 0]) } },
    { k: 'ov', n: '頭上パルス', v: { f: d => A(lerp(72, 86, d), 10, 4, [0, 0, 1]) } },
    { k: 'pr', n: '合掌プレス', v: { f: d => AT(lerp(-0.15, -0.175, d), -0.1, lerp(0.22, 0.27, d), [1, -0.6, -0.4]) }, mus: ['胸'] },
  ],
  fn(P, t, o) { const h = o.v.f(o.k(t)); P.hand.L = P.hand.R = h; P.fist = [0, 0]; },
});
mv('shrug', {
  ch: 'arms', g: 'care', n: '肩まわし', b: 2, met: 2, warm: 1, mus: ['肩', '首'], cue: '肩を耳に近づけてストンと落とす',
  vars: [{ k: 's', n: 'シュラッグ', v: { t: 's' } }, { k: 'f', n: '肩まわし（前）', v: { t: 'r', dir: 1 }, b: 4 }, { k: 'b', n: '肩まわし（後ろ）', v: { t: 'r', dir: -1 }, b: 4 }],
  fn(P, t, o) {
    if (o.v.t === 's') { const d = o.k(t); P.shrug = [0.06 * d, 0.06 * d]; return; }
    const a = TAU * t * o.v.dir; P.shrug = [0.03 * (1 - Math.cos(a)), 0.03 * (1 - Math.cos(a))]; P.prot = [0.035 * Math.sin(a), 0.035 * Math.sin(a)];
  },
});
// 脳トレ（左右で違う動き）
mv('brain', {
  ch: 'arms', g: 'brain', n: '脳トレ', b: 4, met: 3, mus: ['肩', '集中力'], cue: '左右で違う動き。ゆっくりでOK',
  vars: [
    { k: 'cc', n: '右は前回し・左は後ろ回し', v: { t: 'cc' } },
    { k: 'ud', n: '右は上下・左は左右', v: { t: 'ud' } },
    { k: 'gp', n: 'グーパー体操', v: { t: 'gp' }, b: 2 },
    { k: 'pat', n: '頭ポンポン・おなかクルクル', v: { t: 'pat' } },
    { k: 'p32', n: '3拍子と2拍子', v: { t: 'p32' }, b: 6 },
    { k: 'tri', n: '右で三角・左で四角', v: { t: 'tri' }, b: 12 },
    { k: 'ux', n: '右は上・左は横（交互）', v: { t: 'ux' } },
    { k: 'cross', n: 'クロスタッチ', v: { t: 'cross' } },
  ],
  fn(P, t, o) {
    const v = o.v;
    const big = (s, ph, dir) => { const g = Math.PI / 2 - TAU * ph * dir; const p = mul(norm([0.17, Math.sin(g), Math.cos(g) + 0.12]), 0.545); return AT(p[0], p[1], p[2], [1, 0, -0.1]); };
    switch (v.t) {
      case 'cc': P.hand.R = big(1, t, 1); P.hand.L = big(-1, t, -1); break;
      case 'ud': P.hand.R = A(lerp(-80, 80, cw(t)), 88, 6); P.hand.L = A(-2, lerp(5, 90, cw(t * 2 % 1)), 6); break;
      case 'gp': { const s = t < 0.5; const a = AT(-0.15, -0.03, 0.53, [0.3, -0.9, -0.3]), c = AT(-0.12, -0.08, 0.16, [1, -0.6, -0.3]); P.hand.R = s ? a : c; P.hand.L = s ? c : a; P.fist = s ? [0, 1] : [1, 0]; break; }
      case 'pat': { const tap = cw(fr(t * 4)); P.hand.R = AT(-0.15, 0.36 + 0.06 * tap, 0.02, [1, 0.3, 0]); const a = TAU * t; P.hand.L = AT(-0.12 + 0.07 * Math.cos(a), -0.42 + 0.07 * Math.sin(a), 0.24, [1, -0.5, -0.4]); P.fist = [0, 0]; break; }
      case 'p32': { const r = cw(fr(t * 2)), l = K.x(fr(t * 3)); P.hand.R = A(lerp(-80, 82, r), 6, 6); P.hand.L = mixS(ARM.guard, AT(-0.15, -0.03, 0.53), l); P.fist = [0, 1]; break; }
      case 'tri': {
        const tri = [[0, [0.05, 0.45, 0.3]], [1 / 3, [0.25, 0.0, 0.35]], [2 / 3, [-0.12, 0.0, 0.35]], [1, [0.05, 0.45, 0.3]]];
        const sq = [[0, [0.25, 0.3, 0.35]], [0.25, [0.25, -0.05, 0.35]], [0.5, [-0.05, -0.05, 0.35]], [0.75, [-0.05, 0.3, 0.35]], [1, [0.25, 0.3, 0.35]]];
        const lin = (pts, u) => { for (let i = 0; i < pts.length - 1; i++) if (u <= pts[i + 1][0]) return lerp3(pts[i][1], pts[i + 1][1], (u - pts[i][0]) / (pts[i + 1][0] - pts[i][0])); return pts[0][1]; };
        const a = lin(tri, fr(t * 4)), b = lin(sq, fr(t * 3)); P.hand.R = AT(a[0], a[1], a[2], [0.6, -0.6, -0.3]); P.hand.L = AT(b[0], b[1], b[2], [0.6, -0.6, -0.3]); P.fist = [0, 0]; break;
      }
      case 'ux': { const d = cw(t * 2 % 1), first = t < 0.5; P.hand.R = first ? A(lerp(-80, 82, d), 6, 6) : A(lerp(-80, 0, d), 2, 6); P.hand.L = first ? A(lerp(-80, 0, d), 2, 6) : A(lerp(-80, 82, d), 6, 6); break; }
      case 'cross': { const u = t * 4, i = Math.floor(u) % 4, d = cw(u - Math.floor(u)); const tg = [AT(-0.36, -0.02, 0.1, [1, -0.5, -0.2]), ARM.up, AT(-0.36, -0.02, 0.1, [1, -0.5, -0.2]), ARM.up][i]; const key = i < 2 ? 'R' : 'L'; P.hand[key] = mixS(ARM.rest, tg, d); break; }
    }
  },
});
// 腕のストレッチ（ゆっくり）
mv('astretch', {
  ch: 'arms', g: 'care', n: 'ストレッチ', b: 8, modes: ['one'], met: 2, calm: 1, mus: ['肩', '腕'], cue: '呼吸に合わせて、気持ちよく伸ばす',
  vars: [
    { k: 'sh', n: '肩のストレッチ', v: { t: 'sh' } }, { k: 'tr', n: '二の腕のストレッチ', v: { t: 'tr' } },
    { k: 'wr', n: '手首のストレッチ', v: { t: 'wr' } }, { k: 'ch', n: '胸のストレッチ', v: { t: 'ch' }, modes: ['both'] },
    { k: 'ov', n: '体側のびのび', v: { t: 'ov' }, modes: ['alt'] }, { k: 'nk', n: '首ほぐし', v: { t: 'nk' }, modes: ['alt'] },
  ],
  fn(P, t, o) {
    const br = 0.5 + 0.5 * Math.sin(TAU * t), s = o.side === 'L' ? -1 : 1, key = s > 0 ? 'R' : 'L', ok = s > 0 ? 'L' : 'R';
    switch (o.v.t) {
      case 'sh': P.hand[key] = AT(-0.42, -0.06 - 0.02 * br, 0.22, [0, -1, 0]); P.hand[ok] = AT(-0.42 - 0.02 * br, -0.02, 0.24, [1, -0.6, -0.3]); P.chest[1] -= s * 0.12; break;
      case 'tr': P.hand[key] = AT(-0.14, 0.24, -0.14, [0.3, 1, 0.2]); P.hand[ok] = AT(-0.34, 0.36 + 0.02 * br, -0.02, [1, 0.2, 0]); P.neck[0] += 0.12; break;
      case 'wr': P.hand[key] = A(-4, 90, 2, [0, 1, 0]); P.hand[ok] = AT(-0.36, -0.06, 0.46, [1, -0.6, -0.3]); P.fist = [0, 0]; break;
      case 'ch': P.hand.L = P.hand.R = AT(-0.15, -0.46, -0.2 - 0.04 * br, [1, 0.3, -0.4]); P.chest[0] -= 0.18 * br; P.neck[0] -= 0.15 * br; break;
      case 'ov': { const ph = sidePh(t, 'alt'); let r = 0; for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = cw(u); r += (i ? 1 : -1) * 0.38 * d; } P.hand.L = P.hand.R = AT(-0.15, 0.52, 0.04, [1, 0.3, 0]); P.chest[2] -= r; P.rot[2] -= r * 0.15; break; }
      case 'nk': { const ph = sidePh(t, 'alt'); let r = 0; for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; r += (i ? 1 : -1) * 0.45 * cw(u); } P.neck[2] -= r; P.shrug = [-0.01, -0.01]; break; }
    }
  },
});

/* ======================== 脚（LEGS） ======================== */
const SQ = {
  n: { x: 0.15, turn: 12, drop: 0.4, back: 0.13, pitch: 0.45, cp: 0.12 },
  w: { x: 0.31, turn: 38, drop: 0.36, back: 0.04, pitch: 0.18, cp: 0.05 },
  nr: { x: 0.07, turn: 4, drop: 0.36, back: 0.14, pitch: 0.5, cp: 0.12 },
};
export function squatCore(P, d, st = 'n', heel = 0) {
  const S = SQ[st];
  P.root = [P.root[0], B.hipY - S.drop * d + heel * 0.95, -S.back * d];
  P.rot = [S.pitch * d, P.rot[1], P.rot[2]]; P.chest = [S.cp * d, P.chest[1], P.chest[2]];
  P.foot.L = P.foot.R = F(S.x, 0.03, S.turn, heel);
}
mv('squat', {
  ch: 'legs', g: 'squat', n: 'スクワット', b: 2, ks: ['n', 'd', 'p', 'o', 'h'], met: 5, lvl: 2, view: 20,
  mus: ['太もも', 'お尻'], cue: 'ひざとつま先は同じ向き。お尻を後ろへ引く',
  vars: [
    { k: '', n: 'スクワット', v: { st: 'n' } }, { k: 'w', n: 'ワイドスクワット', v: { st: 'w' }, mus: ['内もも', 'お尻'] },
    { k: 'nr', n: 'ナロースクワット', v: { st: 'nr' } }, { k: 'h', n: 'ハーフスクワット', v: { st: 'n', amp: 0.55 }, lvl: 1, met: 4 },
  ],
  fn(P, t, o) { const d = o.k(t) * o.amp; squatCore(P, d, o.v.st); legArms(P, o, d, o.v.st === 'w' ? 'prayer' : 'fwd'); },
});
const LIFT = {
  knee: e => L(85 * e, 0, 95 * e), kick: e => L(78 * e, 0, 80 * (1 - e) * e * 3, 0, 0.5 * e),
  side: e => L(4, 44 * e, 4), back: e => L(-40 * e, 0, 20 * e),
};
mv('sqplus', {
  ch: 'legs', g: 'squat', n: 'スクワット＋', b: 4, modes: ['alt'], met: 5.5, lvl: 2, view: 20, mus: ['太もも', 'お尻'], cue: 'しゃがんで立ち上がる勢いで脚を動かす',
  vars: [
    { k: 'c', n: 'スクワット＋カーフレイズ', v: { t: 'calf' }, modes: ['both'], mus: ['太もも', 'ふくらはぎ'] },
    { k: 'k', n: 'スクワット＋ニーアップ', v: { t: 'knee' }, mus: ['太もも', 'お腹'] },
    { k: 'f', n: 'スクワット＋キック', v: { t: 'kick' } },
    { k: 's', n: 'スクワット＋サイドレッグ', v: { t: 'side' }, mus: ['お尻の横', '太もも'] },
    { k: 'b', n: 'スクワット＋バックキック', v: { t: 'back' }, mus: ['お尻', 'もも裏'] },
  ],
  fn(P, t, o) {
    const v = o.v;
    if (v.t === 'calf') { const d = path([[0, 0], [0.25, 1], [0.5, 0], [1, 0]], t), h = bump(t, 0.5, 1); squatCore(P, d, 'n', 0.075 * h); legArms(P, o, d, 'fwd'); return; }
    const s = t < 0.5 ? 1 : -1, key = s > 0 ? 'R' : 'L', u = fr(t * 2);
    const d = path([[0, 0], [0.25, 1], [0.5, 0], [1, 0]], u), e = bump(u, 0.5, 1);
    squatCore(P, d, 'n'); legArms(P, o, d, v.t === 'knee' ? 'head' : 'guard');
    if (e > 0) { P.foot[key] = liftLeg(P.foot[key], LIFT[v.t](e), e); P.root[0] = -s * 0.05 * e; if (v.t === 'back') P.rot[0] += 0.3 * e; if (v.t === 'side') P.chest[2] += s * 0.14 * e; }
  },
});
mv('sqhold', {
  ch: 'legs', g: 'squat', n: 'スクワットキープ', b: 2, modes: ['alt'], met: 5, lvl: 2, view: 20, mus: ['太もも', 'お尻', 'ふくらはぎ'], cue: '腰の高さを変えずにキープ',
  vars: [{ k: 'h', n: 'スクワットキープ＋かかと上げ', v: { t: 'heel' } }, { k: 'w', n: 'ワイドスクワット・ヒールリフト', v: { t: 'wheel' }, modes: ['both'] }],
  fn(P, t, o) {
    if (o.v.t === 'wheel') { const h = cw(t); squatCore(P, 0.85, 'w', 0.07 * h); legArms(P, o, 0, 'prayer'); return; }
    squatCore(P, 0.7, 'n'); legArms(P, o, 0, 'fwd');
    each(P, t, o, (s, key, d) => { P.foot[key] = F(0.15, 0.03, 12, 0.07 * d); });
  },
});
export function lungeCore(P, s, d, e, type) {
  const key = s > 0 ? 'R' : 'L', other = s > 0 ? 'L' : 'R';
  const lift = 0.28 * e * (1 - e);
  let mf, pel = [0, B.hipY, 0], pitch = 0.06 * d, yaw = 0;
  switch (type) {
    case 'back': mf = F(0.12, lerp(0.02, -0.62, e), 8, 0.07 * e + lift); pel = [0, B.hipY - 0.36 * d, -0.25 * e]; mf.pole = [0.1, -0.45 * e, 1]; break;
    case 'fwd': mf = F(0.12, lerp(0.02, 0.6, e), 10, lift); pel = [0, B.hipY - 0.36 * d, 0.24 * e]; P.foot[other] = F(0.12, 0.02, 8, 0.07 * e); break;
    case 'side': mf = F(lerp(0.11, 0.72, e), 0.06, lerp(8, 22, e), lift); pel = [s * 0.3 * e, B.hipY - 0.28 * d, -0.1 * d]; pitch = 0.42 * d; break;
    case 'curtsy': mf = F(lerp(0.11, -0.24, e), lerp(0.02, -0.48, e), 8, 0.07 * e + lift); pel = [-s * 0.04 * e, B.hipY - 0.33 * d, -0.16 * e]; yaw = -s * 0.12 * e; mf.pole = [0.1, -0.45 * e, 1]; break;
    default: mf = F(lerp(0.11, 0.42, e), lerp(0.02, -0.5, e), 20, 0.07 * e + lift); pel = [s * 0.12 * e, B.hipY - 0.34 * d, -0.2 * e]; mf.pole = [0.3, -0.4 * e, 1];
  }
  P.root = pel; P.rot = [pitch, yaw, 0]; P.foot[key] = mf;
}
mv('lunge', {
  ch: 'legs', g: 'lunge', n: 'ランジ', b: 4, modes: ['alt', 'one'], ks: ['n', 'p'], met: 5.5, lvl: 2, view: 30,
  mus: ['太もも', 'お尻'], cue: '上体はまっすぐ、前のひざはつま先より前に出さない', want: 'bottom',
  vars: [
    { k: 'b', n: 'リバースランジ', v: { t: 'back' } }, { k: 'f', n: 'フロントランジ', v: { t: 'fwd' } },
    { k: 's', n: 'サイドランジ', v: { t: 'side' }, mus: ['内もも', 'お尻'], view: 10 },
    { k: 'c', n: 'カーテシーランジ', v: { t: 'curtsy' }, mus: ['お尻', '太もも外'] },
    { k: 'd', n: 'ななめ後ろランジ', v: { t: 'diag' } },
  ],
  fn(P, t, o) {
    const ph = sidePh(t, o.mode, o.side); legArms(P, o, 0, 'hips');
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue;
      let d, e;
      if (o.kk === 'p') { e = 1; d = 0.7 + 0.3 * cw(fr(u * 2)); }
      else { e = path([[0, 0], [0.28, 1], [0.72, 1], [1, 0]], u); d = path([[0, 0], [0.2, 0.1], [0.5, 1], [0.8, 0.1], [1, 0]], u); }
      lungeCore(P, i ? 1 : -1, d * o.amp, e, o.v.t); legArms(P, o, d, 'hips');
    }
  },
});
mv('lungeplus', {
  ch: 'legs', g: 'lunge', n: 'ランジ＋', b: 4, modes: ['alt', 'one'], met: 6, lvl: 2, view: 30, mus: ['太もも', 'お尻', 'お腹'], cue: '後ろ脚をそのまま前へ運ぶ',
  vars: [{ k: 'k', n: 'リバースランジ＋ニーアップ', v: { t: 'knee' } }, { k: 'f', n: 'リバースランジ＋キック', v: { t: 'kick' } }],
  fn(P, t, o) {
    const ph = sidePh(t, o.mode, o.side); legArms(P, o, 0, 'guard');
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue; const s = i ? 1 : -1, key = i ? 'R' : 'L';
      const e = path([[0, 0], [0.2, 1], [0.48, 1], [0.66, 0], [1, 0]], u), d = path([[0, 0], [0.18, 0.2], [0.34, 1], [0.52, 0.1], [0.62, 0], [1, 0]], u);
      lungeCore(P, s, d, e, 'back');
      const k = bump(u, 0.58, 0.98); if (k > 0) { P.foot[key] = liftLeg(P.foot[key], LIFT[o.v.t](k), k); P.root[0] -= s * 0.04 * k; }
    }
  },
});
mv('knee', {
  ch: 'legs', g: 'knee', n: 'ニーアップ', b: 4, modes: ['alt', 'one'], met: 4.5, view: 15, warm: 1,
  mus: ['お腹', '太もも前'], cue: '背すじを伸ばしてひざを高く',
  vars: [
    { k: 'm', n: 'マーチ', v: { fl: 45, kn: 62, arms: 'swing' }, b: 2, met: 3.5, modes: ['alt'], qk: 1 },
    { k: '', n: 'ニーアップ', v: { fl: 82, kn: 95, arms: 'swing' } },
    { k: 'h', n: 'ハイニー（マーチ）', v: { fl: 90, kn: 105, arms: 'swing' }, b: 2, met: 6, lvl: 2, modes: ['alt'] },
    { k: 'o', n: 'ニーアウト', v: { fl: 62, ab: 24, tu: 45, kn: 95, arms: 't' }, mus: ['お尻', '股関節'] },
    { k: 'x', n: 'クロスニー', v: { fl: 72, ab: -14, tu: -22, kn: 95, arms: 'head' }, mus: ['わき腹', 'お腹'] },
  ],
  fn(P, t, o) {
    const v = o.v, ph = sidePh(t, o.mode, o.side); let dL = 0, dR = 0;
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue; const d = o.k(u) * o.amp; if (i) dR = d; else dL = d;
      P.foot[i ? 'R' : 'L'] = liftLeg(F(), L(v.fl * d, (v.ab || 0) * d, v.kn * d, (v.tu || 0) * d), d);
    }
    P.root[0] += 0.03 * (dL - dR);
    if (v.ab < 0) { P.chest[1] += 0.4 * (dR - dL); P.chest[0] += 0.25 * (dL + dR); }
    const am = o.arms || v.arms || 'swing';
    if (am === 'swing') swingArms(P, dL, dR); else legArms(P, o, Math.max(dL, dR), am);
  },
});
const KICK = {
  f: [[0, [0, 0, 0, 0, 0, 0]], [0.22, [72, 0, 95, 0, 0, 0.6]], [0.45, [80, 0, 4, 0, 0.6, 1]], [0.66, [72, 0, 95, 0, 0, 0.6]], [0.9, [0, 0, 0, 0, 0, 0]], [1, [0, 0, 0, 0, 0, 0]]],
  s: [[0, [0, 0, 0, 0, 0, 0]], [0.22, [50, 28, 100, 48, 0, 0.5]], [0.45, [12, 72, 4, 15, 0.5, 1]], [0.66, [50, 28, 100, 48, 0, 0.5]], [0.9, [0, 0, 0, 0, 0, 0]], [1, [0, 0, 0, 0, 0, 0]]],
  b: [[0, [0, 0, 0, 0, 0, 0]], [0.2, [30, 0, 90, 0, 0, 0.3]], [0.45, [-42, 0, 18, 0, 0.4, 1]], [0.66, [20, 0, 80, 0, 0, 0.4]], [0.9, [0, 0, 0, 0, 0, 0]], [1, [0, 0, 0, 0, 0, 0]]],
};
mv('kick', {
  ch: 'legs', g: 'kick', n: 'キック', b: 4, modes: ['alt', 'one'], met: 5.5, lvl: 2, view: 25, pk: 0.45,
  mus: ['太もも', 'お尻'], cue: 'ひざを先に上げてから蹴り出す',
  vars: [{ k: 'f', n: 'フロントキック', v: { t: 'f' } }, { k: 's', n: 'サイドキック', v: { t: 's' }, view: 0, mus: ['お尻の横', '太もも'] }, { k: 'b', n: 'バックキック', v: { t: 'b' }, mus: ['お尻', 'もも裏'] }],
  fn(P, t, o) {
    const v = o.v, ph = sidePh(t, o.mode, o.side); legArms(P, o, 0, 'guard');
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue; const s = i ? 1 : -1, key = i ? 'R' : 'L';
      const q = path(KICK[v.t], u), w = sm(Math.min(1, Math.max(q[0], q[1], Math.abs(q[2])) / 12));
      P.foot[key] = mixS(F(), L(q[0], q[1], q[2], q[3], q[4]), w);
      if (v.t === 's') P.chest[2] += s * 0.4 * q[5]; if (v.t === 'b') P.rot[0] += 0.35 * q[5]; P.root[0] -= s * 0.05 * q[5];
    }
  },
});
mv('heel', {
  ch: 'legs', g: 'knee', n: 'ヒールキック', b: 2, modes: ['alt'], met: 5, view: 35, qk: 1, warm: 1, mus: ['もも裏'], cue: 'かかとをお尻に近づける',
  vars: [{ k: '', n: 'ヒールキック', v: {} }, { k: 'j', n: 'その場ジョグ', v: { jog: 1 }, imp: 1, met: 7, lvl: 2 }],
  fn(P, t, o) {
    const ph = sidePh(t, 'alt'); let dL = 0, dR = 0;
    for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = o.k(u); if (i) dR = d; else dL = d; P.foot[i ? 'R' : 'L'] = liftLeg(F(), L(-6 * d, 0, 125 * d), d); }
    if (o.v.jog) P.lift = 0.045 * Math.abs(Math.sin(TAU * t));
    if (o.arms && o.arms !== 'swing') legArms(P, o, Math.max(dL, dR)); else swingArms(P, dL, dR, 0.7);
  },
});
mv('calf', {
  ch: 'legs', g: 'calf', n: 'カーフレイズ', b: 2, ks: ['n', 'd', 'p'], met: 3, mus: ['ふくらはぎ'], cue: 'かかとを高く上げ、ゆっくり下ろす',
  vars: [
    { k: '', n: 'カーフレイズ', v: {} }, { k: 'w', n: 'ワイドカーフレイズ', v: { w: 1 } },
    { k: 'one', n: '片脚カーフレイズ', v: { one: 1 }, modes: ['one'], lvl: 2 },
    { k: 'toe', n: 'トゥレイズ', v: { toe: 1 }, mus: ['すね'] }, { k: 'rock', n: 'かかと・つま先ロック', v: { rock: 1 }, b: 4, nok: 1 },
  ],
  fn(P, t, o) {
    const v = o.v, d = o.k(t) * o.amp;
    if (v.rock) { const h = bump(t, 0, 0.5), tu = bump(t, 0.5, 1); P.foot.L = P.foot.R = F(0.11, 0.02, 8, 0.075 * h, 24 * tu); P.root[1] += 0.07 * h; legArms(P, o, h, 'hips'); return; }
    if (v.toe) { P.foot.L = P.foot.R = F(0.11, 0.02, 8, 0, 26 * d); legArms(P, o, d, 'hips'); return; }
    const x = v.w ? 0.24 : 0.11, tr = v.w ? 38 : 8;
    P.foot.L = P.foot.R = F(x, 0.02, tr, 0.075 * d); P.root[1] += 0.072 * d;
    if (v.one) { const s = o.side === 'L' ? -1 : 1; P.foot[s > 0 ? 'L' : 'R'] = L(5, 0, 75); P.root[0] = s * 0.07; }
    legArms(P, o, d, 'hips');
  },
});
mv('legr', {
  ch: 'legs', g: 'legraise', n: 'レッグレイズ', b: 4, modes: ['alt', 'one'], ks: ['n', 'p'], met: 4, view: 10,
  mus: ['お尻', '太もも'], cue: '上体をゆらさず脚だけ動かす',
  vars: [
    { k: 's', n: 'サイドレッグレイズ', v: { ab: 44 }, mus: ['お尻の横', '太もも外'] },
    { k: 'b', n: 'バックレッグレイズ', v: { fl: -34 }, view: 60, mus: ['お尻', 'もも裏'] },
    { k: 'f', n: 'フロントレッグレイズ', v: { fl: 52, pt: 0.5 }, view: 45, mus: ['太もも前', 'お腹'] },
    { k: 'h', n: '立ったままヒップオープン', v: { hyd: 1 }, mus: ['お尻の横', '股関節'] },
  ],
  fn(P, t, o) {
    const v = o.v, ph = sidePh(t, o.mode, o.side); legArms(P, o, 0, 'hips');
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue; const d = o.k(u) * o.amp, s = i ? 1 : -1, key = i ? 'R' : 'L';
      const lf = v.hyd ? L(70 * sm(d * 2), 42 * sm(d * 2 - 1), 90 * sm(d * 2), 40 * sm(d * 2 - 1)) : L((v.fl || 0) * d, (v.ab || 0) * d, 4 * d, 0, (v.pt || 0) * d);
      P.foot[key] = liftLeg(F(), lf, d); P.root[0] -= s * 0.05 * Math.min(1, d * 2);
      if (v.fl < 0) P.rot[0] += 0.25 * d; if (v.ab) P.chest[2] += s * 0.12 * d;
    }
  },
});
// ステップ（足の位置をキーフレームで指定： [左x,左z,左タイプ, 右x,右z,右タイプ, 腰x, 腰z]）
// タイプ 0=踏む 1=つま先タッチ 2=かかとタッチ 3=ひざ上げ 4=その場で足ぶみ
const STEPK = {
  touch: [[0.19, 0, 1, 0.41, 0, 0, 0.3], [-0.41, 0, 0, 0.41, 0, 0, 0], [-0.41, 0, 0, -0.19, 0, 1, -0.3], [-0.41, 0, 0, 0.41, 0, 0, 0]],
  v: [[-0.11, 0, 0, 0.11, 0, 0, 0, 0], [-0.11, 0, 0, 0.36, 0.28, 0, 0.12, 0.12], [-0.36, 0.28, 0, 0.36, 0.28, 0, 0, 0.24], [-0.36, 0.28, 0, 0.11, 0, 0, -0.1, 0.12]],
  grape: [[-0.6, 0, 0, -0.08, 0, 0, -0.34], [0.04, -0.2, 0, -0.08, 0, 0, -0.02], [0.04, -0.2, 0, 0.38, 0, 0, 0.21], [0.16, 0, 1, 0.38, 0, 0, 0.27],
    [-0.14, 0, 0, 0.38, 0, 0, 0.12], [-0.14, 0, 0, -0.02, -0.2, 0, -0.08], [-0.6, 0, 0, -0.02, -0.2, 0, -0.31], [-0.6, 0, 0, -0.38, 0, 1, -0.49]],
  tapf: [[-0.11, 0, 0, 0.13, 0.32, 1, -0.04], [-0.11, 0, 0, 0.11, 0, 0, 0], [-0.13, 0.32, 1, 0.11, 0, 0, 0.04], [-0.11, 0, 0, 0.11, 0, 0, 0]],
  taps: [[-0.11, 0, 0, 0.48, 0.02, 1, -0.05], [-0.11, 0, 0, 0.11, 0, 0, 0], [-0.48, 0.02, 1, 0.11, 0, 0, 0.05], [-0.11, 0, 0, 0.11, 0, 0, 0]],
  tapb: [[-0.11, 0, 0, 0.14, -0.38, 1, -0.03, 0.04], [-0.11, 0, 0, 0.11, 0, 0, 0], [-0.14, -0.38, 1, 0.11, 0, 0, 0.03, 0.04], [-0.11, 0, 0, 0.11, 0, 0, 0]],
  heel: [[-0.11, 0, 0, 0.15, 0.3, 2, -0.04, -0.03], [-0.11, 0, 0, 0.11, 0, 0, 0], [-0.15, 0.3, 2, 0.11, 0, 0, 0.04, -0.03], [-0.11, 0, 0, 0.11, 0, 0, 0]],
  mambo: [[-0.11, 0, 0, 0.11, 0.3, 0, 0, 0.12], [-0.11, 0, 4, 0.11, 0.3, 0, 0, 0.06], [-0.11, 0, 0, 0.11, 0, 0, 0], [-0.11, 0, 4, 0.11, 0, 0, 0],
    [-0.11, 0.3, 0, 0.11, 0, 0, 0, 0.12], [-0.11, 0.3, 0, 0.11, 0, 4, 0, 0.06], [-0.11, 0, 0, 0.11, 0, 0, 0], [-0.11, 0, 0, 0.11, 0, 4, 0]],
  walk: [[-0.11, 0, 0, 0.11, 0.25, 0, 0.02, 0.12], [-0.11, 0.5, 0, 0.11, 0.25, 0, -0.02, 0.38], [-0.11, 0.5, 0, 0.11, 0.5, 0, 0, 0.5], [-0.11, 0.5, 4, 0.11, 0.5, 0, 0, 0.5],
    [-0.11, 0.5, 0, 0.11, 0.25, 0, 0.02, 0.38], [-0.11, 0, 0, 0.11, 0.25, 0, -0.02, 0.12], [-0.11, 0, 0, 0.11, 0, 0, 0, 0], [-0.11, 0, 4, 0.11, 0, 0, 0, 0]],
  side2: [[-0.6, 0, 0, -0.14, 0, 0, -0.37], [-0.36, 0, 0, -0.14, 0, 0, -0.25], [-0.36, 0, 0, 0.22, 0, 0, -0.07], [0.0, 0, 1, 0.22, 0, 0, 0.11],
    [-0.36, 0, 0, 0.22, 0, 0, -0.07], [-0.36, 0, 0, -0.14, 0, 0, -0.25], [-0.72, 0, 0, -0.14, 0, 0, -0.43], [-0.72, 0, 0, -0.5, 0, 1, -0.61]],
  sknee: [[-0.11, 0, 0, 0.32, 0, 0, 0.12], [-0.08, 0, 3, 0.32, 0, 0, 0.26], [-0.32, 0, 0, 0.32, 0, 0, 0], [-0.32, 0, 0, 0.08, 0, 3, -0.26]],
  curt: [[0.1, -0.32, 1, 0.42, 0, 0, 0.32], [-0.42, 0, 0, -0.1, -0.32, 1, -0.32]],
};
function steps(P, t, keys, o) {
  const n = keys.length, u = t * n, i = Math.floor(u) % n, f = u - Math.floor(u), a = keys[i], b = keys[(i + 1) % n];
  const g = sm(Math.min(1, f * 1.3));
  for (let j = 0; j < 2; j++) {
    const o3 = j * 3, s = j ? 1 : -1, key = j ? 'R' : 'L';
    const ax = a[o3], az = a[o3 + 1], bx = b[o3], bz = b[o3 + 1], at = a[o3 + 2], bt = b[o3 + 2];
    const moved = Math.abs(ax - bx) + Math.abs(az - bz) > 0.01;
    const x = lerp(ax, bx, g), z = lerp(az, bz, g), ty = g < 0.5 ? at : bt;
    const lift = moved ? 0.075 * Math.sin(Math.PI * g) : (bt === 4 || at === 4) ? 0.06 * Math.sin(Math.PI * f) : 0;
    let sp = F(s * x, z, 10, (ty === 1 ? 0.06 : 0) + lift, ty === 2 ? 26 : 0);
    if (bt === 3 || at === 3) { const k = bt === 3 ? bump(f, 0, 1) : 0; if (k > 0) sp = liftLeg(sp, L(82 * k, 0, 95 * k), k); }
    P.foot[key] = sp;
  }
  P.root[0] = lerp(a[6], b[6], g); P.root[2] = lerp(a[7] || 0, b[7] || 0, g);
  P.root[1] -= (o.v.dip ?? 0.035) * (0.5 + 0.5 * Math.cos(TAU * f));
  P.chest[2] -= 0.08 * (b[6] - a[6]) * Math.sin(Math.PI * g);
}
mv('step', {
  ch: 'legs', g: 'step', n: 'ステップ', b: 4, met: 4, view: 0, qk: 0, warm: 1, mus: ['脚全体'], cue: 'ひざをやわらかく、リズムに乗る',
  vars: [
    { k: 't', n: 'ステップタッチ', v: { s: 'touch' } }, { k: 'v', n: 'Vステップ', v: { s: 'v' } },
    { k: 'g', n: 'グレープバイン', v: { s: 'grape' }, b: 8 }, { k: 'tf', n: 'トゥタップ（前）', v: { s: 'tapf' } },
    { k: 'ts', n: 'トゥタップ（横）', v: { s: 'taps' } }, { k: 'tb', n: 'トゥタップ（後ろ）', v: { s: 'tapb' } },
    { k: 'h', n: 'ヒールタッチ', v: { s: 'heel' } }, { k: 'm', n: 'マンボ', v: { s: 'mambo' }, b: 8 },
    { k: 'w', n: 'ウォーク前後', v: { s: 'walk' }, b: 8 }, { k: 'd', n: 'ダブルステップ', v: { s: 'side2' }, b: 8 },
    { k: 'sh', n: 'サイドシャッフル', v: { s: 'side2', dip: 0.13 }, b: 8, met: 5.5, lvl: 2, warm: 0 },
    { k: 'sk', n: 'ステップ＆ニー', v: { s: 'sknee' }, met: 4.5 },
    { k: 'sc', n: 'スケーターステップ', v: { s: 'curt', dip: 0.12 }, b: 2, met: 5, warm: 0, mus: ['お尻', '太もも'] },
  ],
  fn(P, t, o) {
    const keys = STEPK[o.v.s]; steps(P, t, keys, o);
    if ((o.arms || '') === 'swing') { const w = Math.sin(Math.PI * t * keys.length); P.hand.L = swing1(0.75 * w); P.hand.R = swing1(-0.75 * w); }
    else legArms(P, o, 0, 'hips');
  },
});
mv('hinge', {
  ch: 'legs', g: 'hinge', n: 'グッドモーニング', b: 2, ks: ['n', 'd'], met: 3.5, view: 75, mus: ['もも裏', 'お尻', '背中'], cue: '背中をまっすぐ保ったままお尻を後ろへ',
  vars: [{ k: '', n: 'グッドモーニング', v: {} }],
  fn(P, t, o) { const d = o.k(t) * o.amp; P.root = [0, B.hipY - 0.06 * d, -0.13 * d]; P.rot = [1.15 * d, 0, 0]; P.chest = [-0.05 * d, 0, 0]; P.foot.L = P.foot.R = F(0.13, 0.03, 10); legArms(P, o, d, 'head'); },
});
mv('rdl', {
  ch: 'legs', g: 'balance', n: '片脚デッドリフト', b: 4, modes: ['one'], ks: ['n', 'd'], met: 4, lvl: 2, view: 80,
  mus: ['もも裏', 'お尻', 'バランス'], cue: '頭からかかとまで一直線に倒す',
  vars: [{ k: '', n: '片脚デッドリフト', v: {} }],
  fn(P, t, o) {
    const d = o.k(t) * o.amp, s = o.side === 'L' ? -1 : 1, key = s > 0 ? 'R' : 'L', other = s > 0 ? 'L' : 'R';
    P.root = [s * 0.09, B.hipY - 0.07 * d, -0.02]; P.rot = [1.2 * d, 0, 0]; P.neck = [-0.6 * d, 0, 0];
    P.foot[key] = F(0.1, 0.02, 6); P.foot[other] = liftLeg(F(), L(-4 * d, 0, 6 * d + 4), d);
    P.hand.L = P.hand.R = mixS(ARM.rest, AW(-0.06, -0.55, 0.06, [0.2, 0, 1]), d);
  },
});
// ジャンプ（ジャンプ時は lift を使う）
mv('jack', {
  ch: 'legs', g: 'jump', n: 'ジャンピングジャック', b: 2, met: 8, lvl: 2, imp: 1, mus: ['全身', 'ふくらはぎ'], cue: '着地はつま先からやわらかく',
  vars: [{ k: '', n: 'ジャンピングジャック', v: {} }, { k: 'st', n: 'ステップジャック', v: { step: 1 }, imp: 0, met: 5, lvl: 1, b: 4 }, { k: 'x', n: 'クロスジャック', v: { cross: 1 }, b: 4 }],
  fn(P, t, o) {
    const v = o.v;
    if (v.step) { const ph = sidePh(t, 'alt'); let dd = 0; for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = o.k(u); dd = d; P.foot[i ? 'R' : 'L'] = F(lerp(0.11, 0.42, d), 0.02, lerp(8, 20, d), 0.05 * bump(u, 0, 0.5)); P.root[0] = (i ? 1 : -1) * 0.1 * d; } legArms(P, o, dd, 'jack'); return; }
    const air = Math.abs(Math.sin(TAU * (v.cross ? t * 2 : t)));
    const tt = v.cross ? fr(t * 2) : t, out = path([[0, 0], [0.12, 0], [0.38, 1], [0.62, 1], [0.88, 0], [1, 0]], tt);
    P.lift = 0.085 * air; P.root[1] -= 0.05 * out;
    if (v.cross) { const c = t < 0.5 ? 1 : -1; P.foot.L = F(lerp(c > 0 ? 0.04 : -0.08, 0.42, out), lerp(c > 0 ? -0.08 : 0.08, 0.02, out), 12, 0.03 * air); P.foot.R = F(lerp(c > 0 ? -0.08 : 0.04, 0.42, out), lerp(c > 0 ? 0.08 : -0.08, 0.02, out), 12, 0.03 * air); }
    else P.foot.L = P.foot.R = F(lerp(0.11, 0.42, out), 0.02, lerp(8, 22, out), 0.03 * air);
    legArms(P, o, out, 'jack');
  },
});
mv('sqjump', {
  ch: 'legs', g: 'jump', n: 'スクワットジャンプ', b: 2, met: 8.5, lvl: 3, imp: 1, view: 20, mus: ['太もも', 'お尻'], cue: '深くしゃがんで真上へ。着地はひざをやわらかく',
  vars: [{ k: '', n: 'スクワットジャンプ', v: {} }, { k: 'w', n: 'ワイドスクワットジャンプ', v: { st: 'w' } }, { k: 'st', n: 'スタージャンプ', v: { star: 1 }, mus: ['全身'] }],
  fn(P, t, o) {
    const d = path([[0, 0.15], [0.5, 1], [0.6, 0.2], [0.64, 0], [0.96, 0], [1, 0.15]], t), lift = 0.2 * bump(t, 0.62, 0.98);
    squatCore(P, d, o.v.st || 'n'); P.lift = lift;
    if (o.v.star) { const a = sm(lift / 0.12); P.foot.L = P.foot.R = mixS(P.foot.L, F(0.42, 0.02, 20), a); P.hand.L = P.hand.R = mixS(mixS(ARM.chest, ARM.fwd, d), ARM.y, a); }
    else P.hand.L = P.hand.R = mixS(mixS(ARM.chest, A(-50, -40, 10), d), ARM.up, sm(lift / 0.1));
  },
});
mv('splitjump', {
  ch: 'legs', g: 'jump', n: 'スプリットジャンプ', b: 4, met: 9, lvl: 3, imp: 1, view: 35, mus: ['太もも', 'お尻'], cue: '空中で脚を入れかえる',
  vars: [{ k: '', n: 'スプリットジャンプ', v: {} }],
  fn(P, t, o) {
    const h = t < 0.5 ? 0 : 1, u = fr(t * 2), s = h ? -1 : 1;
    const d = path([[0, 0.6], [0.4, 1], [0.6, 0.6], [0.9, 0.6], [1, 0.6]], u), air = bump(u, 0.55, 0.98), sw = sm((u - 0.6) / 0.35);
    lungeCore(P, s, d, 1, 'back');
    const fb = F(0.12, -0.62, 8, 0.07), ff = F(0.12, 0.02, 8);
    P.foot[s > 0 ? 'R' : 'L'] = mixS(fb, ff, sw); P.foot[s > 0 ? 'L' : 'R'] = mixS(ff, fb, sw); P.root[2] = -0.25;
    P.lift = 0.16 * air; legArms(P, o, d, 'guard');
  },
});
mv('skater', {
  ch: 'legs', g: 'jump', n: 'スケータージャンプ', b: 2, met: 7.5, lvl: 2, imp: 1, mus: ['お尻', '太もも'], cue: '横へ跳んで片脚でやわらかく着地',
  vars: [{ k: '', n: 'スケータージャンプ', v: {} }],
  fn(P, t, o) {
    P.noGround = 1;
    const h = t < 0.5 ? 0 : 1, u = fr(t * 2), s = h ? -1 : 1, key = s > 0 ? 'R' : 'L', oth = s > 0 ? 'L' : 'R';
    const air = bump(u, 0.58, 1), go = sm((u - 0.58) / 0.42);
    const dip = path([[0, 0.8], [0.35, 0.45], [0.58, 0.7], [0.8, 0.15], [1, 0.8]], u);
    const stance = L(32 * dip, 6, 64 * dip, 0, 0, 'hw'), free = L(-24, -24, 58, 0, 0.3, 'hw'), freeAir = L(-6, -6, 40, 0, 0.2, 'hw');
    P.foot[key] = mixS(stance, freeAir, go); P.foot[oth] = mixS(free, stance, go);
    const sp = P.foot[key].f === 'mix' ? stance : P.foot[key];
    P.root = [lerp(s * 0.36, -s * 0.36, go), B.ANK + B.hipDrop - sp.p[1] + 0.13 * air, 0];
    P.rot = [0.25 + 0.2 * dip, 0, 0];
    const sw = Math.cos(Math.PI * go); P.hand.L = swing1(-0.8 * s * sw); P.hand.R = swing1(0.8 * s * sw);
  },
});
mv('skihop', {
  ch: 'legs', g: 'jump', n: 'スキージャンプ', b: 2, met: 7, lvl: 2, imp: 1, qk: 0, mus: ['ふくらはぎ', '太もも'], cue: '両足をそろえて左右に跳ぶ',
  vars: [{ k: '', n: 'スキージャンプ', v: {} }, { k: 'fb', n: '前後ジャンプ', v: { fb: 1 } }],
  fn(P, t, o) {
    const x = Math.cos(TAU * t) * 0.24, air = Math.abs(Math.sin(TAU * t));
    if (o.v.fb) { P.root[2] = x; P.foot.L = P.foot.R = F(0.1, x, 8, 0.03 * air); } else { P.root[0] = x; P.foot.L = F(0.1 - x, 0.02, 8, 0.03 * air); P.foot.R = F(0.1 + x, 0.02, 8, 0.03 * air); }
    P.lift = 0.07 * air; P.root[1] -= 0.07 * (1 - air); legArms(P, o, 0, 'guard');
  },
});
mv('hopknee', {
  ch: 'legs', g: 'jump', n: 'ハイニー', b: 2, modes: ['alt'], met: 8, lvl: 2, imp: 1, mus: ['お腹', '太もも', '心肺'], cue: 'その場で軽く弾みながらひざを上げる',
  vars: [{ k: '', n: 'ハイニー（ジャンプ）', v: {} }, { k: 'p', n: 'パワーニー', v: { pow: 1 }, modes: ['one'], b: 2 }],
  fn(P, t, o) {
    const ph = sidePh(t, o.mode, o.side); let dL = 0, dR = 0;
    for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = o.k(u); if (i) dR = d; else dL = d; P.foot[i ? 'R' : 'L'] = liftLeg(F(), L(92 * d, 0, 105 * d), d); }
    P.lift = 0.05 * (o.v.pow ? bump(t, 0.3, 0.7) * 2 : Math.abs(Math.sin(TAU * t)));
    if (o.v.pow) { const d = Math.max(dL, dR); P.hand.L = P.hand.R = mixS(ARM.up, AT(-0.16, -0.3, 0.3, [1, -0.6, -0.3]), d); P.chest[0] += 0.2 * d; }
    else swingArms(P, dL, dR);
  },
});
mv('tuck', {
  ch: 'legs', g: 'jump', n: 'タックジャンプ', b: 2, met: 10, lvl: 3, imp: 1, mus: ['全身', 'お腹'], cue: '空中でひざを胸に引きつける',
  vars: [{ k: '', n: 'タックジャンプ', v: {} }],
  fn(P, t, o) {
    P.noGround = 1;
    const d = path([[0, 0.2], [0.42, 0.85], [0.56, 0.1], [0.62, 0], [0.98, 0.1], [1, 0.2]], t), air = bump(t, 0.58, 1);
    const tk = sm(bump(t, 0.62, 0.96) * 1.4);
    const legP = L(lerp(22 * d, 92, tk), 8, lerp(52 * d, 115, tk), 0, 0, 'hw');
    P.foot.L = P.foot.R = legP;
    P.root = [0, B.ANK + B.hipDrop - L(22 * d, 8, 52 * d, 0, 0, 'hw').p[1] + 0.32 * air, -0.04 * d]; P.rot = [0.35 * d + 0.25 * tk, 0, 0];
    P.hand.L = P.hand.R = mixS(A(-40, -30, 10), AT(-0.12, -0.28, 0.32, [1, -0.6, -0.3]), tk);
  },
});
mv('frogjump', {
  ch: 'legs', g: 'jump', n: 'フロッグジャンプ', b: 4, met: 8.5, lvl: 3, imp: 1, view: 25, mus: ['太もも', 'お尻', '内もも'], cue: '床に手をついてから跳び上がる',
  vars: [{ k: '', n: 'フロッグジャンプ', v: {} }],
  fn(P, t, o) {
    const d = path([[0, 0.2], [0.4, 1], [0.55, 1], [0.65, 0], [0.95, 0], [1, 0.2]], t), lift = 0.2 * bump(t, 0.64, 0.97);
    squatCore(P, d * 1.05, 'w'); P.rot[0] += 0.55 * d; P.lift = lift;
    P.hand.L = P.hand.R = mixS(mixS(ARM.prayer, AW(-0.14, -0.5, 0.16, [0.4, 0.2, -1]), d), ARM.up, sm(lift / 0.12));
  },
});
// バランス
mv('balance', {
  ch: 'legs', g: 'balance', n: 'バランス', b: 8, modes: ['one'], met: 2.8, lvl: 2, mus: ['体幹', 'バランス'], cue: '軸足の裏全体で床を押す',
  vars: [
    { k: 'fl', n: 'フラミンゴ', v: { t: 'fl' } }, { k: 'ap', n: 'エアプレーン', v: { t: 'ap' }, view: 80, mus: ['お尻', '背中', 'バランス'] },
    { k: 'tr', n: 'ツリーポーズ', v: { t: 'tr' }, calm: 1 }, { k: 'w3', n: 'ウォーリア3', v: { t: 'w3' }, view: 80, lvl: 3 },
    { k: 'rc', n: '片脚リーチ', v: { t: 'rc' }, b: 4, view: 30 },
  ],
  fn(P, t, o) {
    const s = o.side === 'L' ? -1 : 1, key = s > 0 ? 'R' : 'L', oth = s > 0 ? 'L' : 'R', br = 0.5 + 0.5 * Math.sin(TAU * t);
    P.root[0] = s * 0.08; P.foot[key] = F(0.1, 0.02, 6);
    switch (o.v.t) {
      case 'fl': P.foot[oth] = L(82, 0, 95); P.hand.L = P.hand.R = A(-2 + 6 * br, 0, 6); break;
      case 'ap': P.rot = [1.35, 0, 0]; P.neck = [-0.7, 0, 0]; P.foot[oth] = L(-2, 0, 4, 0, 0.5); P.hand.L = P.hand.R = AW(0.52, 0.0 + 0.04 * br, 0.06, [0, 1, 0]); P.root[1] -= 0.04; break;
      case 'tr': P.foot[oth] = L(18, 38, 128, 62); P.hand.L = P.hand.R = AT(-0.16, 0.48 + 0.02 * br, 0.06, [1, 0.3, 0]); break;
      case 'w3': P.rot = [1.4, 0, 0]; P.neck = [-0.8, 0, 0]; P.foot[oth] = L(-2, 0, 4, 0, 0.5); P.hand.L = P.hand.R = A(84, 6, 4); P.root[1] -= 0.04; break;
      case 'rc': { const d = cw(t); P.rot = [1.0 * d, 0, 0]; P.root[1] -= 0.18 * d; P.foot[oth] = liftLeg(F(), L(-30 * d, 0, 30 * d), d); P.hand[oth] = mixS(ARM.rest, AW(-0.1, -0.5, 0.25, [0.3, 0, 1]), d); break; }
    }
  },
});
// 股関節まわり
mv('hip', {
  ch: 'legs', g: 'mobility', n: 'ほぐし', b: 4, met: 2.5, warm: 1, mus: ['股関節', '腰'], cue: '大きくなめらかに',
  vars: [
    { k: 'hc', n: 'ヒップサークル', v: { t: 'hc' } },
    { k: 'sf', n: 'レッグスイング（前後）', v: { t: 'sf' }, modes: ['one'], b: 2, view: 60 },
    { k: 'ss', n: 'レッグスイング（左右）', v: { t: 'ss' }, modes: ['one'], b: 2 },
    { k: 'go', n: 'ゲートオープナー', v: { t: 'go' }, modes: ['alt'] },
    { k: 'gc', n: 'ゲートクローザー', v: { t: 'gc' }, modes: ['alt'] },
  ],
  fn(P, t, o) {
    const v = o.v;
    if (v.t === 'hc') { const a = TAU * t; P.root[0] += 0.07 * Math.cos(a); P.root[2] += 0.07 * Math.sin(a); P.rot[2] += -0.12 * Math.cos(a); P.rot[0] += 0.12 * Math.sin(a); P.chest[2] += 0.1 * Math.cos(a); P.chest[0] -= 0.1 * Math.sin(a); P.foot.L = P.foot.R = F(0.16, 0.02, 10); P.hand.L = P.hand.R = ARM.hips; return; }
    if (v.t === 'sf' || v.t === 'ss') {
      const s = o.side === 'L' ? -1 : 1, key = s > 0 ? 'R' : 'L', w = Math.sin(TAU * t);
      P.root[0] = s * 0.06; P.foot[s > 0 ? 'L' : 'R'] = F(0.1, 0.02, 6);
      P.foot[key] = v.t === 'sf' ? L(lerp(-25, 55, 0.5 + 0.5 * w), 4, 8, 0, 0.3) : L(10, lerp(-18, 40, 0.5 + 0.5 * w), 6);
      P.hand[s > 0 ? 'L' : 'R'] = ARM.t; P.hand[key] = ARM.hips; return;
    }
    const ph = sidePh(t, 'alt'); P.hand.L = P.hand.R = ARM.hips;
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue; const key = i ? 'R' : 'L';
      const kf = v.t === 'go' ? [[0, [0, 0, 0, 0]], [0.3, [80, 0, 95, 0]], [0.65, [55, 34, 95, 52]], [1, [0, 0, 0, 0]]] : [[0, [0, 0, 0, 0]], [0.35, [55, 34, 95, 52]], [0.7, [80, 0, 95, 0]], [1, [0, 0, 0, 0]]];
      const q = path(kf, u), w = Math.max(q[0], q[2]) / 95;
      P.foot[key] = liftLeg(F(), L(q[0], q[1], q[2], q[3]), w);
    }
  },
});
// 下半身のストレッチ
mv('lstretch', {
  ch: 'legs', g: 'care', n: 'ストレッチ', b: 8, modes: ['one'], met: 2, calm: 1, mus: ['脚'], cue: '反動をつけずに、呼吸しながら伸ばす',
  vars: [
    { k: 'q', n: '太もも前のストレッチ', v: { t: 'q' }, mus: ['太もも前'] }, { k: 'hm', n: 'もも裏のストレッチ', v: { t: 'hm' }, mus: ['もも裏'], view: 45 },
    { k: 'cf', n: 'ふくらはぎのストレッチ', v: { t: 'cf' }, mus: ['ふくらはぎ'], view: 45 },
    { k: 'ds', n: 'ディープスクワットキープ', v: { t: 'ds' }, modes: ['both'], mus: ['股関節', '内もも'] },
    { k: 'hf', n: '股関節前のストレッチ', v: { t: 'hf' }, mus: ['股関節'], view: 45 },
    { k: 'sl', n: 'サイドランジキープ', v: { t: 'sl' }, mus: ['内もも'] },
  ],
  fn(P, t, o) {
    const br = 0.5 + 0.5 * Math.sin(TAU * t), s = o.side === 'L' ? -1 : 1, key = s > 0 ? 'R' : 'L', oth = s > 0 ? 'L' : 'R';
    switch (o.v.t) {
      case 'q': P.root[0] = -s * 0.07; P.foot[oth] = F(0.1, 0.02, 6); P.foot[key] = L(-6, 2, 162, 0, 0.5); P.hand[key] = AT(-0.06, -0.5, -0.17, [0.3, 0, -1]); P.hand[oth] = A(-20, 10, 8); P.rot[0] = 0.06; break;
      case 'hm': { lungeCore(P, s, 0, 0, 'back'); P.foot[key] = F(0.12, 0.34, 6, 0, 30); P.foot[oth] = F(0.12, -0.08, 10); P.root = [0, 0.84, -0.18]; P.rot = [0.62 + 0.08 * br, 0, 0]; P.hand.L = P.hand.R = AW(-0.08, -0.48, 0.24, [0.3, 0, -1]); break; }
      case 'cf': lungeCore(P, s, 0.5, 1, 'back'); P.foot[key] = F(0.12, -0.6, 8, 0); P.rot = [0.25 + 0.05 * br, 0, 0]; P.hand.L = P.hand.R = AW(-0.05, -0.4, 0.3, [0.3, -0.2, -1]); break;
      case 'ds': squatCore(P, 0.95, 'w'); P.root[1] -= 0.03 * br; P.hand.L = P.hand.R = ARM.prayer; break;
      case 'hf': lungeCore(P, s, 0.75 + 0.1 * br, 1, 'back'); P.foot[key] = F(0.12, -0.62, 8, 0.06); P.hand.L = P.hand.R = ARM.up; P.chest[0] -= 0.1; break;
      case 'sl': lungeCore(P, s, 0.85 + 0.1 * br, 1, 'side'); P.hand.L = P.hand.R = ARM.prayer; break;
    }
  },
});

/* ======================== 体幹（TORSO） ======================== */
mv('twist', {
  ch: 'torso', g: 'twist', n: 'ツイスト', b: 4, met: 3.5, warm: 1, mus: ['わき腹', '背中'], cue: 'おへそは正面、胸から回す',
  vars: [
    { k: '', n: 'ツイスト', v: { a: 'bent' } }, { k: 't', n: 'ツイスト（腕を横に）', v: { a: 't' } },
    { k: 'h', n: 'ツイスト（手は頭）', v: { a: 'head' } }, { k: 'p', n: 'ツイスト（手を合わせて）', v: { a: 'fwdj' } },
  ],
  fn(P, t, o) {
    const w = Math.sin(TAU * t) * o.amp; P.chest[1] += 0.62 * w; P.rot[1] += 0.12 * w; P.neck[1] += 0.2 * w;
    const a = o.v.a; P.hand.L = P.hand.R = a === 't' ? ARM.t : a === 'head' ? ARM.head : a === 'fwdj' ? AT(-0.17, -0.04, 0.45, [1, -0.5, -0.3]) : AT(-0.12, -0.02, 0.26, [1, -0.2, -0.5]);
  },
});
mv('sbend', {
  ch: 'torso', g: 'twist', n: 'サイドベンド', b: 4, modes: ['alt'], met: 3, warm: 1, mus: ['わき腹'], cue: '体を真横に倒す。前に倒れない',
  vars: [{ k: '', n: 'サイドベンド', v: { a: 'over' } }, { k: 'u', n: 'サイドベンド（両手を上に）', v: { a: 'up' } }, { k: 'h', n: 'サイドベンド（手は頭）', v: { a: 'head' } }],
  fn(P, t, o) {
    const ph = sidePh(t, 'alt'); let dL = 0, dR = 0;
    for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = o.k(u); if (i) dR = d; else dL = d; }
    const r = 0.42 * (dR - dL); P.chest[2] -= r; P.rot[2] -= r * 0.15; P.root[0] -= r * 0.08;
    const a = o.v.a;
    if (a === 'up') P.hand.L = P.hand.R = AT(-0.15, 0.52, 0.04, [1, 0.3, 0]);
    else if (a === 'head') P.hand.L = P.hand.R = ARM.head;
    else { P.hand.L = mixS(mixS(ARM.rest, A(72, 12, 22), dR), AT(0.04, -0.6, 0.02, [1, 0, -0.2]), dL); P.hand.R = mixS(mixS(ARM.rest, A(72, 12, 22), dL), AT(0.04, -0.6, 0.02, [1, 0, -0.2]), dR); }
  },
});
mv('chop', {
  ch: 'torso', g: 'twist', n: 'ウッドチョップ', b: 4, met: 4.5, lvl: 2, view: 15, mus: ['わき腹', '肩', '脚'], cue: 'ななめ上から反対の足元へ振り下ろす',
  vars: [{ k: '', n: 'ウッドチョップ', v: { r: 0 } }, { k: 'r', n: 'リバースウッドチョップ', v: { r: 1 } }, { k: 'h', n: 'ホリゾンタルチョップ', v: { h: 1 } }],
  fn(P, t, o) {
    const v = o.v; let pt;
    if (v.h) { const w = Math.sin(TAU * t); pt = [0.34 * w, -0.04, 0.42 - 0.08 * Math.abs(w)]; }
    else {
      const hi = s => [s * 0.3, 0.42, 0.28], lo = s => [-s * 0.28, -0.62, 0.36];
      const pts = v.r ? [[0, lo(1)], [0.25, hi(1)], [0.5, hi(-1)], [0.75, lo(-1)], [1, lo(1)]] : [[0, hi(1)], [0.25, lo(1)], [0.5, lo(-1)], [0.75, hi(-1)], [1, hi(1)]];
      pt = path(pts, t);
    }
    for (let i = 0; i < 2; i++) { const s = i ? 1 : -1, p = fromChest(s, add(pt, [s * 0.035, 0, 0])); P.hand[i ? 'R' : 'L'] = AT(p[0], p[1], p[2], [1, -0.4, -0.3]); }
    P.chest[1] += 1.4 * pt[0]; P.rot[1] += 0.3 * pt[0]; const low = clamp(-pt[1] / 0.62, 0, 1); P.root[1] -= 0.2 * low; P.rot[0] += 0.25 * low; P.foot.L = P.foot.R = F(0.18, 0.02, 14); P.fist = [1, 1];
  },
});
mv('halo', {
  ch: 'torso', g: 'twist', n: 'ヘイロー', b: 4, met: 3, warm: 1, mus: ['肩', '体幹'], cue: '頭のまわりで大きく円を描く',
  vars: [{ k: '', n: 'ヘイロー' }, { k: 'r', n: 'ヘイロー（逆回り）', v: { r: 1 } }],
  fn(P, t, o) {
    const a = TAU * t * (o.v.r ? -1 : 1), pt = [0.2 * Math.cos(a), 0.4, 0.04 + 0.16 * Math.sin(a)];
    for (let i = 0; i < 2; i++) { const s = i ? 1 : -1, p = fromChest(s, add(pt, [s * 0.04, 0, 0])); P.hand[i ? 'R' : 'L'] = AT(p[0], p[1], p[2], [1, 0.5, 0]); }
    P.chest[2] -= 0.1 * Math.cos(a); P.fist = [1, 1];
  },
});
mv('tcircle', {
  ch: 'torso', g: 'twist', n: 'トルソーサークル', b: 4, met: 2.5, warm: 1, mus: ['体幹', '腰'], cue: '上半身で大きく円を描く',
  vars: [{ k: '', n: 'トルソーサークル' }],
  fn(P, t, o) { const a = TAU * t; P.chest[0] += 0.05 + 0.25 * Math.sin(a); P.chest[2] += 0.25 * Math.cos(a); P.hand.L = P.hand.R = ARM.hips; },
});
mv('bent', {
  ch: 'torso', g: 'back', n: '前傾', b: 2, modes: ['both', 'alt'], ks: ['n', 'd', 'p'], met: 3.8, view: 75, mus: ['背中', '肩'], cue: '背中はまっすぐ、胸を張ったまま前傾',
  vars: [
    { k: 'r', n: 'ベントオーバーロウ', v: { t: 'row' } }, { k: 'f', n: 'リバースフライ', v: { t: 'fly' } },
    { k: 'k', n: 'トライセプスキックバック', v: { t: 'kb' }, mus: ['二の腕'] }, { k: 'y', n: '前傾Yレイズ', v: { t: 'y' } },
    { k: 's', n: '前傾スイマー', v: { t: 'sw' }, modes: ['opp'] },
  ],
  fn(P, t, o) {
    P.root = [0, B.hipY - 0.07, -0.12]; P.rot = [0.85, 0, 0]; P.chest = [0.12, 0, 0]; P.foot.L = P.foot.R = F(0.13, 0.03, 10); P.neck = [-0.35, 0, 0];
    if (o.v.t === 'sw') { const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) { const d = cw(ph[i]); P.hand[i ? 'R' : 'L'] = mixS(AW(0.04, -0.12, -0.3, [0.3, 1, -0.2]), AW(0.08, -0.06, 0.52, [0.3, -0.3, -1]), d); } return; }
    each(P, t, o, (s, key, d) => {
      switch (o.v.t) {
        case 'row': P.hand[key] = mixS(AW(-0.04, -0.52, 0.05, [0.2, 0, -1]), AW(0.03, -0.16, -0.14, [0.3, 0.3, -1]), d); P.fist = [1, 1]; break;
        case 'fly': P.hand[key] = mixS(AW(-0.04, -0.52, 0.06, [0.5, 0, -0.2]), AW(0.45, -0.22, 0.02, [0.3, 0.3, -1]), d); break;
        case 'kb': P.hand[key] = mixS(AW(0.03, -0.38, -0.18, [0, 1, -0.5]), AW(0.03, -0.2, -0.52, [0, 1, -0.5]), d); break;
        case 'y': P.hand[key] = mixS(AW(-0.04, -0.52, 0.06, [0.5, 0, -0.2]), AW(0.16, -0.02, 0.5, [0.3, -0.2, -1]), d); break;
      }
    });
  },
});
mv('scrunch', {
  ch: 'torso', g: 'twist', n: 'スタンディングクランチ', b: 4, modes: ['alt', 'one'], met: 4.5, lvl: 2, view: 10, mus: ['お腹', 'わき腹'], cue: 'ひじとひざを近づけてお腹をしめる',
  vars: [{ k: 'x', n: 'クロスクランチ（立位）', v: { x: 1 } }, { k: 's', n: 'サイドクランチ（立位）', v: { side: 1 } }, { k: 'f', n: 'スタンディングクランチ', v: {} }],
  fn(P, t, o) {
    const ph = sidePh(t, o.mode, o.side); P.hand.L = P.hand.R = ARM.head; let dL = 0, dR = 0;
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue; const d = o.k(u); if (i) dR = d; else dL = d;
      P.foot[i ? 'R' : 'L'] = liftLeg(F(), o.v.side ? L(55 * d, 40 * d, 95 * d, 35 * d) : L(80 * d, (o.v.x ? -10 : 0) * d, 95 * d, (o.v.x ? -15 : 0) * d), d);
    }
    if (o.v.side) P.chest[2] -= 0.38 * (dR - dL);
    else { P.chest[0] += 0.32 * (dL + dR); if (o.v.x) P.chest[1] += 0.42 * (dR - dL); }
  },
});
mv('bob', {
  ch: 'torso', g: 'boxing', n: 'ボブ＆ウィーブ', b: 4, met: 5, mus: ['脚', '体幹'], cue: 'ひざを使ってU字にくぐる',
  vars: [{ k: '', n: 'ボブ＆ウィーブ' }],
  fn(P, t, o) { const x = 0.22 * Math.cos(TAU * t), dip = 0.16 * Math.abs(Math.sin(TAU * t)); P.root[0] += x; P.root[1] -= dip; P.foot.L = P.foot.R = F(0.2, 0.02, 12); P.chest[2] -= x * 0.6; P.hand.L = P.hand.R = ARM.guard; P.fist = [1, 1]; },
});
mv('chestoc', {
  ch: 'torso', g: 'back', n: '胸ひらき', b: 4, met: 2.5, warm: 1, mus: ['胸', '背中'], cue: '丸めて背中、ひらいて胸を伸ばす',
  vars: [{ k: '', n: '胸ひらき・背中まるめ' }],
  fn(P, t, o) { const d = o.k(t); P.chest[0] += lerp(0.32, -0.22, d); P.neck[0] += lerp(0.3, -0.2, d); P.hand.L = P.hand.R = mixS(AT(-0.17, -0.05, 0.45, [1, -0.3, -0.3]), A(-20, -30, 20, [0, 0, 1]), d); P.prot = [lerp(0.04, -0.03, d), lerp(0.04, -0.03, d)]; },
});
mv('rotreach', {
  ch: 'torso', g: 'twist', n: 'ローテーションリーチ', b: 4, modes: ['alt'], met: 3, warm: 1, mus: ['背中', '胸'], cue: '目線で手を追いかける',
  vars: [{ k: '', n: 'ローテーションリーチ' }],
  fn(P, t, o) {
    const ph = sidePh(t, 'alt'); let y = 0;
    for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = o.k(u), s = i ? 1 : -1; y += s * 0.8 * d; P.hand[i ? 'R' : 'L'] = mixS(ARM.chest, A(10, -60, 6), d); }
    P.chest[1] += y; P.neck[1] += y * 0.6; P.root[1] -= 0.05;
  },
});

/* ======================== 床（BODY: 姿勢ごと） ======================== */
mv('pushup', {
  ch: 'body', g: 'pushup', n: 'プッシュアップ', b: 2, ks: ['n', 'd', 'p'], met: 6, lvl: 2, floor: 1, view: 90,
  mus: ['胸', '二の腕', '肩'], cue: '頭からかかとまで一直線。胸を床に近づける',
  vars: [
    { k: '', n: 'プッシュアップ', v: {} }, { k: 'kn', n: 'ひざつきプッシュアップ', v: { kn: 1 }, lvl: 1, met: 4.5 },
    { k: 'w', n: 'ワイドプッシュアップ', v: { hw: 0.32 } }, { k: 'nr', n: 'ナロープッシュアップ', v: { hw: 0.07 }, mus: ['二の腕', '胸'] },
    { k: 'pk', n: 'パイクプッシュアップ', v: { pike: 1 }, mus: ['肩', '二の腕'], lvl: 3 },
  ],
  fn(P, t, o) {
    const v = o.v, d = o.k(t) * o.amp;
    if (v.pike) { plank(P, { pike: 1, pd: d }); return; }
    plank(P, { kn: v.kn, hw: v.hw, sy: lerp(0.585, v.kn ? 0.25 : 0.23, d), pole: v.hw < 0.1 ? [0.15, 0.3, -1] : [0.6, 0.25, -1] });
  },
});
mv('plank', {
  ch: 'body', g: 'plank', n: 'プランク', b: 4, modes: ['alt'], met: 4.5, lvl: 2, floor: 1, view: 90, mus: ['お腹', '体幹', '肩'], cue: 'お尻を上げすぎず下げすぎず、お腹に力を',
  vars: [
    { k: 'tap', n: 'プランク・ショルダータッチ', v: { t: 'tap' } }, { k: 'rc', n: 'プランクリーチ', v: { t: 'reach' } },
    { k: 'toe', n: 'プランク・トゥタップ', v: { t: 'toe' }, mus: ['お腹', 'お尻の横'] }, { k: 'sp', n: 'スパイダープランク', v: { t: 'spider' }, mus: ['わき腹', 'お腹'] },
    { k: 'mc', n: 'マウンテンクライマー', v: { t: 'mc' }, b: 2, met: 8 },
    { k: 'mcx', n: 'クロスマウンテンクライマー', v: { t: 'mcx' }, b: 2, met: 8, lvl: 3, mus: ['わき腹', 'お腹'] },
    { k: 'pk', n: 'プランクパイク', v: { t: 'pike' }, modes: ['both'], b: 2 }, { k: 'rk', n: 'プランクロック', v: { t: 'rock' }, modes: ['both'], b: 2 },
    { k: 'jk', n: 'プランクジャック', v: { t: 'jack' }, modes: ['both'], b: 2, imp: 1, met: 7, lvl: 3 },
    { k: 'kt', n: 'ひざつきショルダータッチ', v: { t: 'tap', kn: 1 }, lvl: 1 },
    { k: 'hd', n: 'ひじつきプランク・ヒップツイスト', v: { t: 'hip' }, modes: ['both'], mus: ['わき腹', 'お腹'] },
    { k: 'ud', n: 'プランクアップダウン', v: { t: 'ud' }, b: 8, lvl: 3, mus: ['二の腕', '体幹'] },
  ],
  fn(P, t, o) {
    const v = o.v;
    if (v.t === 'pike') { plank(P, { pike: o.k(t) * 0.85 }); return; }
    if (v.t === 'rock') { plank(P, { sz: 0.13 * (o.k(t) * 2 - 1) }); return; }
    if (v.t === 'hip') { plank(P, { fa: 1 }); const w = Math.sin(TAU * t); P.tw = 0.45 * w; P.chest[1] -= 0.3 * w; return; }
    if (v.t === 'ud') {
      const k = [[0, 0], [0.12, 0], [0.24, 0.5], [0.36, 1], [0.62, 1], [0.74, 0.5], [0.86, 0], [1, 0]];
      const q = path(k, t), first = t < 0.5 ? (t < 0.3) : (t < 0.8);
      plank(P, { sy: lerp(0.585, 0.345, q) });
      const fa = AG(0.11, 0.05, 0.42 + 0.25 * q, [0, -1, -0.7]), hi = AG(0.17, 0.05, 0.42, [0.55, 0.25, -1]);
      const rDown = path([[0, 0], [0.12, 0], [0.24, 1], [0.62, 1], [0.74, 0], [1, 0]], t), lDown = path([[0, 0], [0.24, 0], [0.36, 1], [0.74, 1], [0.86, 0], [1, 0]], t);
      P.hand.R = mixS(hi, fa, rDown); P.hand.L = mixS(hi, fa, lDown); void first; return;
    }
    const g = plank(P, { kn: v.kn });
    if (v.t === 'jack') { const out = cw(t), air = Math.abs(Math.sin(TAU * t)); P.foot.L = P.foot.R = FT(lerp(0.1, 0.36, out), g.Ay + 0.05 * air, g.za, [0, -0.6, 1], [0, -0.75, 0.66]); return; }
    const ph = sidePh(t, 'alt');
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue; const d = o.k(u), s = i ? 1 : -1, key = i ? 'R' : 'L';
      switch (v.t) {
        case 'tap': P.hand[key] = mixS(P.hand[key], AT(-0.36, -0.04, 0.12, [0.6, -0.5, 0.4]), d); P.root[0] -= s * 0.03 * d; break;
        case 'reach': P.hand[key] = mixS(P.hand[key], AG(0.15, 0.62, g.zs + 0.52, [0.3, 0.2, -1]), d); P.root[0] -= s * 0.03 * d; break;
        case 'toe': P.foot[key] = mixS(P.foot[key], FT(0.44, g.Ay, g.za + 0.12, [0, -0.6, 1], [0.3, -0.75, 0.6]), d); break;
        case 'spider': P.foot[key] = mixS(P.foot[key], FT(0.42, 0.24, g.zs - 0.32, [1, 0.3, 0.3], [0, -0.6, 0.8]), d); P.tw = (P.tw || 0) + s * 0.15 * d; break;
        case 'mc': P.foot[key] = mixS(P.foot[key], FT(0.12, 0.22, g.zs - 0.55, [0, -0.7, 1], [0, -0.7, 0.7]), d); break;
        case 'mcx': P.foot[key] = mixS(P.foot[key], FT(-0.1, 0.24, g.zs - 0.52, [-0.5, -0.6, 1], [0, -0.7, 0.7]), d); P.tw = (P.tw || 0) - s * 0.2 * d; break;
      }
    }
  },
});
// 横向きの姿勢（X-Y 平面）
function apexXY(S, A0, r1, r2, up) {
  const dx = A0[0] - S[0], dy = A0[1] - S[1], d = Math.hypot(dx, dy);
  if (d >= r1 + r2 - 1e-6) { const k = r1 / d; return [S[0] + dx * k, S[1] + dy * k, 0]; }
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  let px = -dy / d, py = dx / d; if ((py < 0) === (up > 0)) { px = -px; py = -py; }
  return [S[0] + dx * a / d + px * h, S[1] + dy * a / d + py * h, 0];
}
function sidePlank(P, o = {}) {
  const xe = -0.48, kn = o.kn;
  const Lsh = [xe, 0.34, 0], S = add(Lsh, [0.05, 0.18, 0]);
  const leg = kn ? B.TH : LEG * 0.996, Lt = leg + B.hipDrop + SPN;
  const Ay = kn ? 0.16 : 0.17, Ax = S[0] + Math.sqrt(Lt * Lt - (S[1] - Ay) ** 2) - (o.slide || 0);
  const H = apexXY(S, [Ax, Ay, 0], SPN + B.hipDrop, leg, -1);
  const u = norm(sub(S, H));
  P.root = add(H, mul(u, B.hipDrop)); P.rot = [0, 0, Math.atan2(-u[0], u[1])]; P.chest = [0, 0, 0]; P.neck = [0, 0, -0.15];
  P.noGround = 1;
  P.hand.L = AG(-xe - 0.03, 0.05, 0.26, [0, -1, -0.5]);
  P.hand.R = o.armUp ? A(0, 0, 4, [0, 1, 0]) : ARM.hips;
  if (kn) { P.foot.L = FT(-(Ax + 0.04), 0.09, -0.38, [0, -0.5, 1], [0, 0, -1]); P.foot.R = FT(Ax - 0.02, 0.28, -0.36, [0, -0.5, 1], [0, 0, -1]); }
  else { P.foot.L = FT(-(Ax + 0.02), 0.08, 0.02, [0, 0, 1], [0, 0, 1]); P.foot.R = FT(Ax - 0.04, 0.27, 0, [0, 0, 1], [0, 0, 1]); }
  return { Ax };
}
mv('splank', {
  ch: 'body', g: 'plank', n: 'サイドプランク', b: 4, modes: ['one'], mirror: 1, met: 4.5, lvl: 2, floor: 1, view: 0,
  mus: ['わき腹', '体幹'], cue: '体を一直線に、お尻を落とさない',
  vars: [
    { k: 'dp', n: 'サイドプランク・ヒップリフト', v: { t: 'dip' } }, { k: 'rc', n: 'サイドプランク・リーチスルー', v: { t: 'reach' } },
    { k: 'kn', n: 'ひざつきサイドプランク', v: { t: 'dip', kn: 1 }, lvl: 1 }, { k: 'st', n: 'サイドプランク・レッグリフト', v: { t: 'leg' }, lvl: 3, mus: ['お尻の横', 'わき腹'] },
  ],
  fn(P, t, o) {
    const v = o.v, d = o.k(t);
    if (v.t === 'dip') { sidePlank(P, { kn: v.kn, slide: 0.07 * (1 - d), armUp: 0 }); return; }
    sidePlank(P, { armUp: v.t !== 'reach' || d < 0.5 });
    if (v.t === 'reach') { P.hand.R = mixS(A(0, 0, 4, [0, 1, 0]), AT(-0.62, -0.05, 0.12, [0, -1, 0.3]), d); P.chest[1] -= 0.55 * d; }
    if (v.t === 'leg') P.foot.R = L(0, lerp(0, 38, d), 2);
  },
});
mv('crunch', {
  ch: 'body', g: 'core', n: 'クランチ', b: 2, ks: ['n', 'd', 'p'], met: 3.8, floor: 1, view: -90, mus: ['お腹'], cue: 'おへそをのぞきこむように背中を丸める',
  vars: [
    { k: '', n: 'クランチ', v: {} }, { k: 'r', n: 'リーチクランチ', v: { reach: 1 } },
    { k: 'tt', n: 'トゥタッチクランチ', v: { tt: 1 } }, { k: 'tw', n: 'ツイストクランチ', v: { tw: 1 }, modes: ['alt'], b: 4, mus: ['わき腹', 'お腹'] },
    { k: 'ht', n: 'ヒールタッチ', v: { ht: 1 }, modes: ['alt'], b: 2, mus: ['わき腹'] },
  ],
  fn(P, t, o) {
    const v = o.v; supine(P);
    if (v.tt) { P.noGround = 1; P.foot.L = P.foot.R = L(86, 3, 8); const d = o.k(t); P.chest[0] = 0.55 * d; P.hand.L = P.hand.R = mixS(A(30, 90, 10), AT(-0.06, 0.12, 0.54, [1, -0.3, -0.2]), d); return; }
    if (v.ht) { P.chest[0] = 0.32; const ph = sidePh(t, 'alt'); let r = 0; P.hand.L = P.hand.R = AG(0.25, 0.08, 0.3, [0.3, 1, 0]); for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = o.k(u); r += (i ? 1 : -1) * d; P.hand[i ? 'R' : 'L'] = mixS(AG(0.25, 0.1, 0.3, [0.3, 1, 0]), AG(0.25, 0.1, 0.5, [0.3, 1, 0]), d); } P.chest[2] += 0.28 * r; return; }
    if (v.tw) { const ph = sidePh(t, 'alt'); let y = 0, p = 0; for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = o.k(u); y += (i ? 1 : -1) * d; p += d; } P.chest[0] = 0.15 + 0.4 * p; P.chest[1] = 0.45 * y; P.hand.L = P.hand.R = ARM.head; return; }
    const d = o.k(t) * o.amp; P.chest[0] = 0.62 * d;
    P.hand.L = P.hand.R = v.reach ? mixS(AT(0.02, -0.36, 0.18, [1, 0.5, 0]), AT(-0.02, -0.52, 0.32, [1, 0.5, 0]), d) : ARM.head;
  },
});
mv('bicycle', {
  ch: 'body', g: 'core', n: 'バイシクルクランチ', b: 4, modes: ['alt'], met: 5, lvl: 2, floor: 1, view: -90, mus: ['わき腹', 'お腹'], cue: 'ひじとひざを近づけるように体をひねる',
  vars: [{ k: '', n: 'バイシクルクランチ' }],
  fn(P, t, o) {
    supine(P); P.noGround = 1; P.chest[0] = 0.5; P.hand.L = P.hand.R = ARM.head;
    const ph = sidePh(t, 'alt'); let dL = 0, dR = 0;
    for (let i = 0; i < 2; i++) { const u = ph[i]; const d = u < 0 ? 0 : o.k(u); if (i) dR = d; else dL = d; P.foot[i ? 'R' : 'L'] = L(lerp(32, 100, d), 2, lerp(8, 98, d)); }
    P.chest[1] = 0.5 * (dR - dL);
  },
});
mv('legraise', {
  ch: 'body', g: 'core', n: 'レッグレイズ', b: 2, ks: ['n', 'd'], met: 4, lvl: 2, floor: 1, view: -90, mus: ['下腹', 'お腹'], cue: '腰を床に押しつけたまま脚を下ろす',
  vars: [
    { k: '', n: 'レッグレイズ', v: {} }, { k: 'a', n: '交互レッグレイズ', v: { alt: 1 }, modes: ['alt'], b: 4, lvl: 1 },
    { k: 'fl', n: 'フラッターキック', v: { fl: 1 }, modes: ['opp'], b: 1, met: 5 }, { k: 'sc', n: 'シザーズ', v: { sc: 1 }, modes: ['opp'], met: 5 },
    { k: 'vo', n: 'Vオープン', v: { vo: 1 }, mus: ['内もも', 'お腹'] }, { k: 'rc', n: 'リバースクランチ', v: { rc: 1 }, lvl: 2 },
  ],
  fn(P, t, o) {
    const v = o.v; supine(P); P.noGround = 1; P.chest[0] = 0.12;
    if (v.alt) { const ph = sidePh(t, 'alt'); for (let i = 0; i < 2; i++) { const u = ph[i]; const d = u < 0 ? 0 : o.k(u); P.foot[i ? 'R' : 'L'] = L(lerp(8, 86, d), 2, 4); } return; }
    if (v.fl || v.sc) { const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) { const d = cw(ph[i]); P.foot[i ? 'R' : 'L'] = v.fl ? L(lerp(4, 24, d), 3, 3) : L(16, lerp(-12, 22, d), 3); } return; }
    if (v.vo) { const d = o.k(t); P.foot.L = P.foot.R = L(88, lerp(2, 36, d), 4); return; }
    if (v.rc) { const d = o.k(t); P.rot[0] -= 0.42 * d; P.chest[0] += 0.42 * d; P.root[1] += 0.04 * d; P.foot.L = P.foot.R = L(lerp(88, 128, d), 3, lerp(88, 112, d)); return; }
    const d = o.k(t) * o.amp; P.foot.L = P.foot.R = L(lerp(8, 86, d), 2, 4);
  },
});
mv('deadbug', {
  ch: 'body', g: 'core', n: 'デッドバグ', b: 4, modes: ['alt'], met: 3.5, floor: 1, view: -90, mus: ['お腹', '体幹'], cue: '腰を床から浮かせない',
  vars: [{ k: '', n: 'デッドバグ' }],
  fn(P, t, o) {
    supine(P); P.noGround = 1; const up = A(0, 90, 4, [0, 1, 0]), over = A(82, 6, 4, [0, 0, 1]);
    P.hand.L = P.hand.R = up; P.foot.L = P.foot.R = L(90, 2, 90);
    const ph = sidePh(t, 'alt');
    for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const d = o.k(u); P.hand[i ? 'R' : 'L'] = mixS(up, over, d); P.foot[i ? 'L' : 'R'] = L(lerp(90, 10, d), 2, lerp(90, 4, d)); }
  },
});
mv('situp', {
  ch: 'body', g: 'core', n: 'シットアップ', b: 4, ks: ['n', 'd'], met: 5, lvl: 2, floor: 1, view: -90, mus: ['お腹'], cue: '背中を丸めながら起き上がる',
  vars: [{ k: '', n: 'シットアップ', v: {} }, { k: 'v', n: 'Vアップ', v: { v: 1 }, lvl: 3 }, { k: 'h', n: 'ホロウロック', v: { h: 1 }, b: 2, nok: 1 }],
  fn(P, t, o) {
    const v = o.v, d = o.k(t); supine(P); P.noGround = 1;
    if (v.h) { const w = Math.sin(TAU * t); P.rot[0] += 0.14 * w; P.root[1] += 0.03; P.chest[0] = 0.3; P.hand.L = P.hand.R = A(80, 8, 4); P.foot.L = P.foot.R = L(16, 2, 2, 0, 0.5); return; }
    if (v.v) { P.rot[0] += 0.5 * d; P.root[1] += 0.03 * d; P.chest[0] = 0.75 * d; P.foot.L = P.foot.R = L(lerp(10, 70, d), 2, 4); P.hand.L = P.hand.R = mixS(A(80, 8, 4), AT(-0.06, -0.15, 0.55, [1, -0.3, -0.2]), d); return; }
    P.rot[0] += 0.72 * d; P.root[2] += 0.03 * d; P.chest[0] = 0.55 * d; P.foot.L = P.foot.R = FT(0.12, B.ANK, 0.62, [0.1, 1, 0.25], [0, 0, 1]); P.hand.L = P.hand.R = mixS(ARM.chest, AT(-0.06, -0.1, 0.52, [1, -0.3, -0.2]), d);
  },
});
mv('rtwist', {
  ch: 'body', g: 'core', n: 'ロシアンツイスト', b: 4, met: 4.5, lvl: 2, floor: 1, view: 35, mus: ['わき腹', 'お腹'], cue: '胸ごと左右にひねる',
  vars: [{ k: '', n: 'ロシアンツイスト', v: {} }, { k: 'l', n: 'ロシアンツイスト（足を浮かせる）', v: { lift: 1 }, lvl: 3 }],
  fn(P, t, o) { seatF(P); if (o.v.lift) P.foot.L = P.foot.R = L(84, 4, 32); P.chest[1] = 0.62 * Math.sin(TAU * t); P.hand.L = P.hand.R = ARM.prayer; P.fist = [1, 1]; },
});
mv('boat', {
  ch: 'body', g: 'core', n: 'ボート', b: 2, met: 4.5, lvl: 2, floor: 1, view: 35, mus: ['お腹', '体幹'], cue: '背中を丸めずにバランスをとる',
  vars: [{ k: 'p', n: 'ボートポーズ・アームパルス', v: { t: 'p' }, b: 1 }, { k: 't', n: 'シーテッドニータック', v: { t: 'tuck' }, met: 5.5 }],
  fn(P, t, o) {
    seatF(P, { lean: 0.7 }); const d = o.k(t);
    if (o.v.t === 'p') { P.foot.L = P.foot.R = L(84, 4, 36); P.hand.L = P.hand.R = A(lerp(-30, -16, d), 88, 4); return; }
    P.foot.L = P.foot.R = L(lerp(54, 112, d), 3, lerp(10, 120, d)); P.chest[0] = lerp(0.1, 0.45, d); P.rot[0] = -lerp(0.85, 0.55, d); P.hand.L = P.hand.R = AG(0.22, 0.05, -0.3, [0.2, 0, -1]);
  },
});
mv('dip', {
  ch: 'body', g: 'pushup', n: 'ディップス', b: 2, ks: ['n', 'd'], met: 4, lvl: 2, floor: 1, view: 75, mus: ['二の腕', '肩'], cue: 'ひじを後ろに曲げてお尻を下ろす',
  vars: [{ k: '', n: 'フロアディップス', v: {} }, { k: 'c', n: 'クラブリーチ', v: { crab: 1 }, modes: ['alt'], b: 4, mus: ['お尻', '肩', 'お腹'] }],
  fn(P, t, o) {
    const zh = -0.36;
    const set = (sy, lift) => { const S = [0, sy, zh + 0.04], a = 0.62 - 0.5 * lift; const pel = add(S, mul([0, -Math.cos(a), Math.sin(a)], SPN)); pel[1] += 0.25 * lift; const u = norm(sub(S, pel)); P.root = pel; P.rot = [Math.atan2(u[2], u[1]), 0, 0]; P.chest = [0, 0, 0]; P.neck = [0.2, 0, 0]; P.hand.L = P.hand.R = AG(0.17, 0.05, zh, [0.3, 0, -1]); P.foot.L = P.foot.R = F(0.13, 0.5, 6); P.noGround = 1; };
    if (o.v.crab) { const ph = sidePh(t, 'alt'); let d = 0; for (let i = 0; i < 2; i++) { const u = ph[i]; if (u >= 0) d = o.k(u); } set(0.6, d); for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; P.hand[i ? 'R' : 'L'] = mixS(P.hand.R, A(70, -20, 6), o.k(u)); } return; }
    set(lerp(0.6, 0.45, o.k(t)), 0);
  },
});
mv('superman', {
  ch: 'body', g: 'back', n: 'スーパーマン', b: 2, ks: ['n', 'd', 'h'], met: 3.5, floor: 1, view: 90, mus: ['背中', 'お尻'], cue: '手足を遠くへ伸ばしながら浮かせる',
  vars: [
    { k: '', n: 'スーパーマン', v: {} }, { k: 'sw', n: 'スイマー', v: { sw: 1 }, modes: ['opp'], met: 4.5 },
    { k: 'y', n: 'うつ伏せYレイズ', v: { y: 1 } }, { k: 'w', n: 'うつ伏せWプル', v: { w: 1 }, b: 4 },
    { k: 'sa', n: 'リバーススノーエンジェル', v: { sa: 1 }, b: 4 }, { k: 'be', n: 'バックエクステンション', v: { be: 1 } },
  ],
  fn(P, t, o) {
    const v = o.v, d = o.k(t) * o.amp; prone(P); P.noGround = 1;
    const over = lift => AT(-0.05, 0.53, -0.02 - lift, [1, 0, -0.3]);
    if (v.sw) { P.chest[0] = -0.18; const ph = sidePh(t, 'opp'); for (let i = 0; i < 2; i++) { const a = cw(ph[i]), b = cw(ph[1 - i]); P.hand[i ? 'R' : 'L'] = over(0.12 * a); P.foot[i ? 'R' : 'L'] = L(-14 * b, 5, 2, 0, 0.5); } return; }
    if (v.be) { P.chest[0] = -0.42 * d; P.hand.L = P.hand.R = ARM.head; return; }
    P.chest[0] = -0.3 * d;
    if (v.y) { P.hand.L = P.hand.R = AT(0.2, 0.5, -0.02 - 0.12 * d, [1, 0, -0.3]); return; }
    if (v.w) { P.hand.L = P.hand.R = mixS(AT(0.15, 0.5, -0.12, [1, 0, -0.3]), AT(0.12, -0.12, -0.14, [1, 0.2, -0.6]), d); P.chest[0] = -0.3; return; }
    if (v.sa) { const p = path([[0, [0.05, -0.45, -0.1]], [0.5, [0.52, 0.08, -0.12]], [1, [0.05, 0.53, -0.1]]], d); P.hand.L = P.hand.R = AT(p[0], p[1], p[2], [0.3, 0.5, -1]); P.chest[0] = -0.3; return; }
    P.hand.L = P.hand.R = over(0.12 * d); P.foot.L = P.foot.R = L(-14 * d, 6, 2, 0, 0.5);
  },
});
mv('birddog', {
  ch: 'body', g: 'back', n: 'バードドッグ', b: 4, modes: ['alt'], ks: ['n', 'h'], met: 3, floor: 1, view: 90, mus: ['背中', 'お尻', '体幹'], cue: '手と足を対角に遠くへ伸ばす',
  vars: [{ k: '', n: 'バードドッグ', v: {} }, { k: 'bt', n: 'ベアホールド・タッチ', v: { bear: 1 }, lvl: 2, mus: ['お腹', '肩'] }],
  fn(P, t, o) {
    const g = quad(P, { hover: o.v.bear }), ph = sidePh(t, 'alt');
    for (let i = 0; i < 2; i++) {
      const u = ph[i]; if (u < 0) continue; const d = o.k(u), key = i ? 'R' : 'L', ok = i ? 'L' : 'R';
      if (o.v.bear) { P.hand[key] = mixS(P.hand[key], AT(-0.36, -0.04, 0.12, [0.6, -0.5, 0.4]), d); continue; }
      P.hand[key] = mixS(P.hand[key], AG(0.14, 0.62, g.S[2] + 0.54, [0.3, 0.2, -1]), d);
      P.foot[ok] = mixS(P.foot[ok], L(0, 2, 4, 0, 0.4), sm(d * 1.3));
    }
  },
});
// 四つ這いの脚（お尻）
function legG(s, H, th, shn) { const kn = add(H, mul(th, B.TH)), an = add(kn, mul(shn, B.SH)); return { f: 'g', p: [s * an[0], an[1], an[2]], pole: [s * th[0], th[1], th[2]], fd: null }; }
mv('quadleg', {
  ch: 'body', g: 'glute', n: '四つ這いキック', b: 2, modes: ['one'], ks: ['n', 'p'], met: 3.5, floor: 1, view: 90, mus: ['お尻'], cue: '腰をそらさずお尻の力で持ち上げる',
  vars: [
    { k: 'dk', n: 'ドンキーキック', v: { t: 'dk' } }, { k: 'fh', n: 'ファイヤーハイドラント', v: { t: 'fh' }, view: 65, mus: ['お尻の横'] },
    { k: 'kb', n: 'ニーキックバック', v: { t: 'kb' }, mus: ['お尻', 'もも裏'] }, { k: 'cr', n: '四つ這いレッグサークル', v: { t: 'cr' }, b: 4, view: 65, nok: 1 },
  ],
  fn(P, t, o) {
    const g = quad(P), s = o.side === 'L' ? -1 : 1, key = s > 0 ? 'R' : 'L', d = o.k(t) * o.amp;
    const H = [s * B.hipW, g.H[1], g.H[2]];
    let th, shn;
    switch (o.v.t) {
      case 'dk': { const a = lerp(0, 100, d) * D2R; th = [0, -Math.cos(a), -Math.sin(a)]; shn = [0, Math.sin(a), -Math.cos(a)]; break; }
      case 'fh': { const b = lerp(0, 62, d) * D2R; th = [s * Math.sin(b), -Math.cos(b), 0]; shn = [0, 0, -1]; break; }
      case 'kb': { const a = lerp(0, 105, d) * D2R; th = [0, -Math.cos(a), -Math.sin(a)]; const k = lerp(90, 0, d) * D2R; shn = norm([0, -Math.cos(a + k), -Math.sin(a + k)]); break; }
      default: { const a = TAU * t; th = norm([s * 0.35 * Math.cos(a), -0.15 + 0.3 * Math.sin(a), -0.9]); shn = th; }
    }
    P.foot[key] = legG(s, H, th, shn);
  },
});
mv('bridge', {
  ch: 'body', g: 'glute', n: 'ヒップリフト', b: 2, ks: ['n', 'd', 'p', 'h'], met: 3.5, floor: 1, view: -90, mus: ['お尻', 'もも裏'], cue: '肩からひざまで一直線になるまでお尻を上げる',
  vars: [
    { k: '', n: 'ヒップリフト', v: {} }, { k: 'o', n: '片脚ヒップリフト', v: { one: 1 }, modes: ['one'], lvl: 2 },
    { k: 'm', n: 'ヒップリフト・マーチ', v: { march: 1 }, modes: ['alt'], b: 4, lvl: 2 },
    { k: 'f', n: 'フロッグブリッジ', v: { frog: 1 }, mus: ['お尻', '内もも'] }, { k: 'a', n: 'ヒップリフト・ニーオープン', v: { ab: 1 }, mus: ['お尻の横'] },
  ],
  fn(P, t, o) {
    const v = o.v; let d = o.k(t) * o.amp; if (v.march || v.ab) d = 1;
    supine(P, { lift: 0.3 * d });
    if (v.frog) P.foot.L = P.foot.R = FT(0.03, B.ANK, 0.5, [1, 0.6, 0], [0.3, 0, 0.95]);
    if (v.one) { const key = o.side === 'L' ? 'L' : 'R'; P.foot[key] = L(lerp(30, 72, d), 2, lerp(40, 4, d)); }
    if (v.march) { const ph = sidePh(t, 'alt'); for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; const k = o.k(u); P.foot[i ? 'R' : 'L'] = mixS(P.foot.R, L(lerp(30, 95, k), 2, lerp(50, 92, k)), sm(k * 3)); } }
    if (v.ab) { const k = o.k(t); const pole = norm(lerp3([0.1, 1, 0.25], [1, 0.5, 0], k)); P.foot.L = P.foot.R = FT(0.12, B.ANK, 0.5, pole, [0, 0, 1]); }
  },
});
mv('sidelie', {
  ch: 'body', g: 'glute', n: '横向きレッグ', b: 2, modes: ['one'], mirror: 1, ks: ['n', 'p'], met: 3, floor: 1, view: 0, mus: ['お尻の横', '太もも外'], cue: 'つま先は正面に向けたまま上げる',
  vars: [
    { k: 'l', n: 'サイドライイング・レッグリフト', v: { t: 'lift' } }, { k: 'c', n: 'クラムシェル', v: { t: 'clam' } },
    { k: 'i', n: 'インナーサイリフト', v: { t: 'in' }, mus: ['内もも'] }, { k: 'r', n: 'サイドライイング・レッグサークル', v: { t: 'cir' }, b: 4, nok: 1 },
    { k: 'k', n: 'サイドライイング・前後キック', v: { t: 'kick' }, b: 4, mus: ['お尻', '太もも'], nok: 1 },
  ],
  fn(P, t, o) {
    sideLie(P); const d = o.k(t) * o.amp;
    switch (o.v.t) {
      case 'lift': P.foot.R = L(8, lerp(-3, 42, d), 4, 0, 0.3); break;
      case 'clam': P.foot.L = L(42, 0, 95); P.foot.R = L(42, lerp(-2, 8, d), 95, lerp(0, 48, d)); break;
      case 'in': P.foot.R = L(58, -8, 85); P.foot.L = L(10, lerp(0, -24, d), 4, 0, 0.3); break;
      case 'cir': { const a = TAU * t; P.foot.R = L(8 + 14 * Math.cos(a), 26 + 12 * Math.sin(a), 4, 0, 0.3); break; }
      case 'kick': P.foot.R = L(lerp(-25, 55, cw(t)), 18, 4, 0, 0.3); break;
    }
  },
});
mv('pronelegs', {
  ch: 'body', g: 'glute', n: 'うつ伏せレッグリフト', b: 4, modes: ['alt'], ks: ['n', 'h'], met: 3, floor: 1, view: 90, mus: ['お尻', 'もも裏'], cue: '骨盤を床につけたまま脚を浮かせる',
  vars: [{ k: '', n: 'うつ伏せレッグリフト', v: {} }],
  fn(P, t, o) { prone(P); P.noGround = 1; P.hand.L = P.hand.R = AT(-0.1, 0.25, 0.12, [1, 0.2, 0.3]); each(P, t, o, (s, key, d) => { P.foot[key] = L(-16 * d, 5, 3, 0, 0.5); }); },
});
// 床のストレッチ
mv('fstretch', {
  ch: 'body', g: 'care', n: '床ストレッチ', b: 8, met: 2, calm: 1, floor: 1, view: 90, mus: ['全身'], cue: '息をはきながら、力を抜いていく',
  vars: [
    { k: 'cb', n: 'コブラ', v: { t: 'cb' }, mus: ['お腹', '背中'] }, { k: 'cp', n: 'チャイルドポーズ', v: { t: 'cp' }, mus: ['背中', '肩'] },
    { k: 'cc', n: 'キャット＆カウ', v: { t: 'cc' }, mus: ['背中'] }, { k: 'tn', n: 'スレッドニードル', v: { t: 'tn' }, modes: ['one'], mirror: 1, mus: ['背中', '肩'] },
    { k: 'kh', n: 'ひざかかえ', v: { t: 'kh' }, view: -90, mus: ['腰', 'お尻'] }, { k: 'st', n: '寝ころびツイスト', v: { t: 'st' }, modes: ['alt'], view: -60, mus: ['腰', 'わき腹'] },
    { k: 'bf', n: 'バタフライ', v: { t: 'bf' }, view: 20, mus: ['内もも', '股関節'] }, { k: 'ff', n: '長座の前屈', v: { t: 'ff' }, view: 80, mus: ['もも裏', '背中'] },
    { k: 'dd', n: 'ダウンドッグ', v: { t: 'dd' }, mus: ['もも裏', 'ふくらはぎ', '肩'] },
  ],
  fn(P, t, o) {
    const br = 0.5 + 0.5 * Math.sin(TAU * t);
    switch (o.v.t) {
      case 'cb': { prone(P); P.noGround = 1; P.chest[0] = -0.55 - 0.1 * br; P.neck[0] = -0.3; P.hand.L = P.hand.R = AG(0.2, 0.05, 0.12, [0.4, 0, -1]); break; }
      case 'cp': { P.root = [0, 0.33, -0.3]; P.rot = [1.75, 0, 0]; P.chest = [0.15 + 0.04 * br, 0, 0]; P.neck = [0.2, 0, 0]; P.foot.L = P.foot.R = FT(0.1, 0.07, -0.42, [0, -0.3, 1], [0, -0.35, -0.94]); P.hand.L = P.hand.R = AG(0.16, 0.05, 0.62, [0.3, 0.5, -0.5]); P.noGround = 1; break; }
      case 'cc': { quad(P); const w = Math.sin(TAU * t); P.chest[0] += 0.28 * w; P.rot[0] += 0.12 * w; P.neck[0] += 0.4 * w; break; }
      case 'tn': { quad(P); P.hand.R = AT(-0.58, -0.08 - 0.03 * br, 0.32, [0, -1, 0.5]); P.chest[1] += 0.55; P.rot[2] -= 0.08; P.neck[1] += 0.3; break; }
      case 'kh': { supine(P); P.noGround = 1; P.foot.L = P.foot.R = L(122 + 6 * br, 8, 130); P.hand.L = P.hand.R = AT(-0.02, -0.2, 0.35, [1, -0.3, 0]); break; }
      case 'st': { supine(P); P.noGround = 1; const ph = sidePh(t, 'alt'); let r = 0; for (let i = 0; i < 2; i++) { const u = ph[i]; if (u < 0) continue; r += (i ? 1 : -1) * cw(u); } P.tw = -0.9 * r; P.chest[1] += 0.9 * r; P.foot.L = P.foot.R = L(80, 4, 90); P.hand.L = P.hand.R = AG(0.7, 0.05, -0.42, [0, 1, 0]); break; }
      case 'bf': { seatF(P, { lean: 0.05, cf: 0.25 + 0.05 * br }); const pole = norm(lerp3([1, 0.6, 0], [1, 0.3, 0], br)); P.foot.L = P.foot.R = FT(0.05, 0.08, 0.36, pole, [0, -0.2, 0.98]); P.hand.L = P.hand.R = AG(0.08, 0.1, 0.42, [1, -0.5, -0.3]); break; }
      case 'ff': { seatF(P, { lean: -0.35 - 0.12 * br, cf: 0.45 }); P.foot.L = P.foot.R = FT(0.1, 0.075, 0.85, [0, 1, 0], [0, 0.95, 0.3]); P.hand.L = P.hand.R = AG(0.12, 0.14, 0.72, [0.3, 0.5, -0.5]); break; }
      case 'dd': { plank(P, { pike: 0.9 + 0.1 * br }); break; }
    }
  },
});

/* ======================== 全身の連続動作（キーフレーム） ======================== */
const KP = {
  stand: () => base(),
  standUp: (lift = 0.13) => { const P = base(); P.hand.L = P.hand.R = ARM.up; P.lift = lift; P.foot.L = P.foot.R = F(0.11, 0.02, 8, 0.04); return P; },
  crouch: (zh = 0.36, wide = 0) => { const P = base(); P.root = [0, 0.47, -0.1]; P.rot = [1.0, 0, 0]; P.chest = [0.32, 0, 0]; P.neck = [-0.3, 0, 0]; P.foot.L = P.foot.R = F(wide ? 0.3 : 0.14, wide ? 0.15 : 0.03, wide ? 30 : 12, 0.03); P.hand.L = P.hand.R = AG(0.15, 0.05, zh, [0.4, 0.2, -1]); return P; },
  plank: (zs = 0.36, o = {}) => { const P = base(); plank(P, Object.assign({ zs }, o)); return P; },
  plankHalf: (zs = 0.36, side = 'R') => { const P = KP.plank(zs); P.foot[side === 'R' ? 'L' : 'R'] = F(0.14, 0.03 + zs - 0.36, 12, 0.03); return P; },
  fold: (zh = 0.3) => { const P = base(); P.root = [0, 0.74, -0.14]; P.rot = [1.55, 0, 0]; P.chest = [0.35, 0, 0]; P.neck = [0.3, 0, 0]; P.foot.L = P.foot.R = F(0.12, 0.02, 8); P.hand.L = P.hand.R = AG(0.14, 0.05, zh, [0.4, 0.2, -1]); return P; },
  pike: (zs) => { const P = base(); plank(P, { zs, pike: 0.85 }); return P; },
  sprawl: (zs = 0.36) => { const P = base(); prone(P, { zp: zs - 0.75 }); P.chest = [-0.45, 0, 0]; P.neck = [-0.2, 0, 0]; P.hand.L = P.hand.R = AG(0.18, 0.05, zs, [0.4, 0, -1]); P.noGround = 1; return P; },
  rot: (side = 'R') => { const P = base(); plank(P, {}); const s = side === 'R' ? 1 : -1; P.tw = s * 1.25; P.hand[side] = A(0, 0, 4, [0, 1, 0]); P.foot.L = P.foot.R = FT(0.1, 0.12, -0.86, [0, 0, 1], [0, 0, 1]); P.noGround = 1; return P; },
};
mv('flow', {
  ch: 'body', g: 'floorfull', n: '全身フロー', b: 4, met: 7, lvl: 2, floor: 1, view: 90, mus: ['全身'], cue: '手をついたら素早く足を運ぶ',
  vars: [
    { k: 'bp', n: 'バーピー', v: { keys: () => [[0, KP.stand()], [0.16, KP.crouch()], [0.32, KP.plank()], [0.5, KP.plank()], [0.64, KP.crouch()], [0.8, KP.stand()], [0.9, KP.standUp()], [1, KP.stand()]] }, met: 9, lvl: 3, imp: 1 },
    { k: 'sb', n: 'ステップバーピー', v: { keys: () => [[0, KP.stand()], [0.12, KP.crouch()], [0.24, KP.plankHalf(0.36, 'R')], [0.36, KP.plank()], [0.5, KP.plank()], [0.62, KP.plankHalf(0.36, 'R')], [0.74, KP.crouch()], [0.9, KP.standUp(0)], [1, KP.stand()]] }, b: 8, met: 6.5 },
    { k: 'st', n: 'スクワットスラスト', v: { keys: () => [[0, KP.crouch()], [0.25, KP.plank()], [0.5, KP.plank()], [0.75, KP.crouch()], [1, KP.crouch()]] }, met: 7.5, lvl: 2, imp: 1 },
    { k: 'sp', n: 'スプロール', v: { keys: () => [[0, KP.stand()], [0.18, KP.crouch()], [0.36, KP.sprawl()], [0.54, KP.sprawl()], [0.7, KP.crouch()], [0.88, KP.stand()], [1, KP.stand()]] }, b: 8, met: 8, lvl: 3, imp: 1 },
    { k: 'ps', n: 'プランク・トゥ・スクワット', v: { keys: () => [[0, KP.plank()], [0.3, KP.crouch(0.36, 1)], [0.6, KP.crouch(0.36, 1)], [0.9, KP.plank()], [1, KP.plank()]] }, met: 7.5, lvl: 2, imp: 1, mus: ['全身', '太もも'] },
    { k: 'iw', n: 'インチワーム', v: { keys: () => [[0, KP.stand()], [0.14, KP.fold(0.3)], [0.28, KP.pike(0.62)], [0.42, KP.plank(0.82)], [0.58, KP.plank(0.82)], [0.72, KP.pike(0.62)], [0.86, KP.fold(0.3)], [1, KP.stand()]] }, b: 8, met: 4.5, mus: ['もも裏', '肩', '体幹'] },
    { k: 'dp', n: 'ダウンドッグ・トゥ・プランク', v: { keys: () => [[0, KP.plank(0.42)], [0.5, KP.pike(0.42)], [1, KP.plank(0.42)]] }, met: 4.5, mus: ['肩', 'もも裏', '体幹'] },
    { k: 'tr', n: 'プッシュアップ＋Tローテーション', v: { keys: () => [[0, KP.plank(0.42)], [0.15, KP.plank(0.42, { sy: 0.25 })], [0.3, KP.plank(0.42)], [0.45, KP.rot('R')], [0.6, KP.plank(0.42)], [0.7, KP.plank(0.42, { sy: 0.25 })], [0.8, KP.plank(0.42)], [0.92, KP.rot('L')], [1, KP.plank(0.42)]] }, b: 8, met: 6.5, lvl: 3, mus: ['胸', '肩', 'わき腹'] },
  ],
});

/* ---------- 没入型エクササイズ用に追加した腕の動き ---------- */
// 片手（または交互・両手）で上から振り下ろす：金づち・包丁・太鼓
mv('hammer', {
  ch: 'arms', g: 'rhythm', n: '振り下ろし', b: 2, modes: ['one', 'alt', 'both'], ks: ['x'], met: 3.5, qk: 1, mus: ['肩', '腕'], cue: 'ひじを上げて、まっすぐ振り下ろす',
  vars: [{ k: '', n: '振り下ろし' }],
  fn(P, t, o) { P.fist = [1, 1]; each(P, t, o, (s, key, d) => { P.hand[key] = mixS(AT(0.02, 0.3, 0.06, [0.7, -0.3, 0.6]), AT(-0.1, -0.3, 0.42, [0.5, -0.7, -0.3]), d); }); },
});
// 両手をそろえて頭の上から振り下ろす：おの・杵
mv('slam', {
  ch: 'arms', g: 'rhythm', n: '両手振り下ろし', b: 2, modes: ['both'], ks: ['x'], met: 4.5, mus: ['肩', '背中', 'お腹'], cue: '両手を頭の上から、おへその前まで振り下ろす',
  vars: [{ k: '', n: '両手振り下ろし' }],
  fn(P, t, o) { P.fist = [1, 1]; const d = o.k(t) * o.amp; for (const key of ['L', 'R']) P.hand[key] = mixS(AT(-0.13, 0.5, 0.1, [1, 0.3, 0.4]), AT(-0.15, -0.44, 0.4, [1, -0.5, -0.3]), d); P.chest[0] += 0.1 * d; },
});
// 投げる：うしろへ大きく引いて前へ
mv('throw', {
  ch: 'arms', g: 'rhythm', n: '投げる', b: 2, modes: ['one', 'alt'], met: 3.5, mus: ['肩', '腕', 'わき腹'], cue: 'うしろに大きく引いて、前へ投げる',
  vars: [{ k: '', n: '投げる' }],
  fn(P, t, o) {
    P.fist = [1, 1];
    each(P, t, o, (s, key, d, u) => {
      if (u < 0) return;
      const q = path([[0, [0.06, 0.02, 0.2]], [0.45, [0.16, 0.26, -0.2]], [0.6, [0.02, 0.2, 0.46]], [0.75, [-0.22, -0.3, 0.34]], [1, [0.06, 0.02, 0.2]]], u);
      P.hand[key] = AT(q[0], q[1], q[2], [0.8, -0.5, -0.2]);
      P.chest[1] += s * 0.32 * (u < 0.45 ? sm(u / 0.45) : u < 0.62 ? 1 - 2 * sm((u - 0.45) / 0.17) : -1 + sm((u - 0.62) / 0.38));
    });
  },
});
// 胸の前で左右に動かす：窓ふき・手をふる
mv('sweep', {
  ch: 'arms', g: 'rhythm', n: '左右にふく', b: 2, modes: ['one', 'both'], met: 3, warm: 1, mus: ['肩', '腕'], cue: '胸の前で、大きく左右に動かす',
  vars: [{ k: '', n: '左右にふく' }],
  fn(P, t, o) {
    P.fist = [0, 0];
    const c = Math.cos(TAU * t);
    if (o.mode === 'both') {
      const X = 0.3 * c;   // 体の中心から右へ +
      P.hand.R = AT(X + 0.14 - B.shW, -0.12, 0.42, [0.6, -0.6, -0.3]);
      P.hand.L = AT(-(X - 0.14) - B.shW, -0.12, 0.42, [0.6, -0.6, -0.3]);
    } else {
      const key = o.side === 'L' ? 'L' : 'R', X = lerp(-0.22, 0.42, (c + 1) / 2);
      P.hand[key] = AT(X - B.shW, -0.1 + 0.06 * Math.sin(TAU * t), 0.42, [0.6, -0.6, -0.3]);
    }
  },
});
// おなかの前で円をかく：鍋をかき混ぜる・ハンドルを回す
mv('stir', {
  ch: 'arms', g: 'circle', n: 'かき混ぜる', b: 2, modes: ['one', 'both'], met: 3, warm: 1, mus: ['肩', '腕'], cue: 'おなかの前で大きな円をかく',
  vars: [{ k: '', n: 'かき混ぜる' }],
  fn(P, t, o) {
    P.fist = [1, 1];
    const a = TAU * t, X = 0.17 * Math.cos(a), Z = 0.36 + 0.15 * Math.sin(a);
    if (o.mode === 'both') { P.hand.R = AT(X + 0.07 - B.shW, -0.34, Z, [0.6, -0.6, -0.2]); P.hand.L = AT(-(X - 0.07) - B.shW, -0.34, Z, [0.6, -0.6, -0.2]); }
    else { const key = o.side === 'L' ? 'L' : 'R'; P.hand[key] = AT(0.04 + X - B.shW, -0.34, Z, [0.6, -0.6, -0.2]); }
  },
});

// ステップ系は「ステップ」以外のバージョンで腕と組み合わせる。カテゴリ名
export const GROUPS = {
  punch: 'パンチ', boxing: 'ボクシング', circle: 'まわす', raise: 'あげる', push: '押す', pull: '引く', bend: '曲げ伸ばし',
  open: 'ひらく・とじる', swim: 'スイム', rhythm: 'リズム', brain: '脳トレ', care: 'ほぐし・ストレッチ',
  squat: 'スクワット', lunge: 'ランジ', knee: 'ニー・かかと', kick: 'キック', calf: 'カーフ', legraise: 'レッグレイズ', step: 'ステップ',
  hinge: 'ヒンジ', balance: 'バランス', jump: 'ジャンプ', mobility: 'ほぐし・ストレッチ', twist: 'ひねり・体側', back: '背中',
  pushup: 'プッシュアップ', plank: 'プランク', core: '腹筋', glute: 'お尻・脚（床）', floorfull: '床コンボ',
};
