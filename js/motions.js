/* =========================================================================
   IMMERSE FIT — motions.js
   お手本の「動き」の一覧と、当たる瞬間（接触）のタイミングの計算。
   act は場面の種類（stage.js の ACTS）、mode は one（片手→後半は反対の手）/ alt（交互）/ both（両手・全身）。
   ========================================================================= */
import { part, makeEx, evalEx } from './exercise.js';
import { ikSolve } from './motion.js';

// [キー, 名前, act, mode, バージョン, パーツ, 向き(度), レベル, METs, 跳ぶ, ひとこと]
const A = 'arms', U = 'upper', Lw = 'lower', F = 'full';
const DEF = [
  // ---- 腕 ----
  ['hit1', '片手で振り下ろす', 'hit', 'one', [A, U], [['hammer', '', { mode: 'one' }]], 25, 1, 3.5, 0, 'ひじを上げて、まっすぐ振り下ろす'],
  ['hitalt', '交互に振り下ろす', 'hit', 'alt', [A, U], [['hammer', '', { mode: 'alt' }]], 20, 1, 3.8, 0, '左右交互に、リズムよく'],
  ['drum', 'ドラムをたたく', 'hit', 'alt', [A, U], [['drum', '']], 20, 1, 3.5, 0, '手首をやわらかく、交互に'],
  ['chopa', '手刀で切る', 'hit', 'alt', [A], [['chopa', '']], 20, 1, 3.5, 0, '手の小指側で、まっすぐ振り下ろす'],
  ['slam', '両手で振り下ろす', 'hit', 'both', [A, U], [['slam', '']], 30, 2, 4.5, 0, '両手を頭の上から、おへその前まで'],
  ['punch', '交互にパンチ', 'punch', 'alt', [A, U], [['punch', 'f', { mode: 'alt' }]], 35, 1, 5, 0, '伸ばしきったら素早く引く'],
  ['punch1', '片手でパンチ', 'punch', 'one', [A, U], [['punch', 'f', { mode: 'one' }]], 35, 1, 4.5, 0, '肩の力を抜いて、まっすぐ前へ'],
  ['upper', 'アッパーパンチ', 'punch', 'alt', [A, U], [['punch2', 'up', { mode: 'alt' }]], 30, 2, 5, 0, '下から突き上げる'],
  ['punchup', '上へパンチ', 'punch', 'alt', [A], [['punch', 'u', { mode: 'alt' }]], 20, 1, 4.5, 0, '天井に向かってまっすぐ', { crit: 'high' }],
  ['push', '両手で押す', 'push', 'both', [A, U], [['push', 'f', { mode: 'both' }]], 40, 1, 3.5, 0, '手のひらで、ぐっと押し出す'],
  ['pushalt', '交互に押す', 'push', 'alt', [A], [['push', 'f', { mode: 'alt' }]], 40, 1, 3.5, 0, '左右交互に、手のひらで押す'],
  ['row', '両手で引く', 'pull', 'both', [A, U], [['row', '', { mode: 'both' }]], 45, 1, 3.5, 0, '肩甲骨を寄せるように引く'],
  ['cord', '紐を引っ張る', 'pull', 'one', [A, U], [['cord', '', { mode: 'one' }]], 25, 1, 3.5, 0, '上でつかんで、まっすぐ引きおろす', { crit: 'low' }],
  ['rope', 'ロープをたぐる', 'pull', 'alt', [A, U], [['rope', '']], 30, 1, 4, 0, '左右交互に、手前へたぐり寄せる'],
  ['press', 'バンザイで持ち上げる', 'lift', 'both', [A, U], [['press', '', { mode: 'both' }]], 0, 1, 3.5, 0, '頭の上までまっすぐ伸ばす'],
  ['climb', '交互に手を伸ばす', 'lift', 'alt', [A, U], [['climb', '']], 0, 1, 4, 0, '高い所をつかむように交互に'],
  ['ylift', 'Yの字に上げる', 'lift', 'both', [A], [['raise', 'y', { mode: 'both' }]], 0, 1, 3, 0, '腕をななめ上へ大きく'],
  ['stir1', '片手で回す', 'stir', 'one', [A, U], [['stir', '', { mode: 'one' }]], 25, 1, 3, 0, 'おなかの前で大きな円をかく'],
  ['stir2', '両手で回す', 'stir', 'both', [A, U], [['stir', '', { mode: 'both' }]], 25, 1, 3, 0, '両手をそろえて大きく回す'],
  ['wipe1', '片手で左右にふく', 'wipe', 'one', [A, U], [['sweep', '', { mode: 'one' }]], 0, 1, 3, 0, '胸の前で、大きく左右に'],
  ['wipe2', '両手で左右にふく', 'wipe', 'both', [A, U], [['sweep', '', { mode: 'both' }]], 0, 1, 3, 0, '両手をそろえて左右に'],
  ['clap', '手をたたく', 'clap', 'both', [A, U], [['clap', 'f']], 0, 1, 3, 0, '腕を開いて、胸の前でパン'],
  ['clapup', '頭の上で手をたたく', 'clap', 'both', [A], [['clap', 'o']], 0, 1, 3.5, 0, '腕を大きく開いて、頭の上でパン'],
  ['throw', '投げる', 'throw', 'one', [A, U], [['throw', '', { mode: 'one' }]], 30, 1, 3.5, 0, 'うしろに大きく引いて、前へ投げる'],
  // ---- 上半身（体幹も） ----
  ['twist', 'ひねって左右に', 'wipe', 'both', [U], [['twist', 't']], 0, 1, 3.5, 0, 'おへそを左右に向ける', { crit: 'yaw' }],
  ['sbend', '体を横にたおす', 'wipe', 'both', [U], [['sbend', 'u', { mode: 'alt' }]], 0, 1, 3, 0, '体の横を気持ちよく伸ばす'],
  ['woodchop', 'ななめに振り下ろす', 'hit', 'both', [U, F], [['chop', '']], 25, 2, 4.5, 0, '頭の上からななめ下へ', { rpb: 3 }],
  ['bentrow', '前かがみで引く', 'pull', 'both', [U], [['bent', 'r']], 60, 2, 4, 0, '背中をまっすぐ、ひじを引く'],
  ['bob', 'しゃがんでよける', 'squat', 'both', [U, F], [['bob', '']], 20, 2, 4.5, 0, 'ひざを曲げて、低くよける'],
  ['halo', '頭の上で回す', 'stir', 'both', [U], [['halo', '']], 0, 1, 3.5, 0, '頭のまわりを大きく回す', { rpb: 3 }],
  // ---- 下半身 ----
  ['squat', 'スクワット', 'squat', 'both', [Lw, F], [['squat', '']], 40, 1, 5, 0, 'いすに座るようにお尻を引く'],
  ['wsquat', 'ワイドスクワット', 'squat', 'both', [Lw], [['squat', 'w']], 25, 1, 5, 0, '足を広げて、ひざはつま先の方へ'],
  ['lunge', '後ろにランジ', 'squat', 'alt', [Lw], [['lunge', 'b', { mode: 'alt' }]], 60, 2, 5, 0, '大きく後ろへ下げて、まっすぐ沈む'],
  ['curtsy', 'カーテシーランジ', 'squat', 'alt', [Lw], [['lunge', 'c', { mode: 'alt' }]], 30, 2, 5, 0, '脚を後ろで交差させて沈む'],
  ['slunge', '横にランジ', 'step', 'alt', [Lw, F], [['lunge', 's', { mode: 'alt' }]], 0, 2, 5, 0, '横へ大きく踏み出す'],
  ['knee', 'ひざ上げ', 'knee', 'alt', [Lw, F], [['knee', '', { mode: 'alt' }]], 40, 1, 4, 0, 'ひざを高く、背すじは伸ばす'],
  ['hknee', 'ハイニー', 'knee', 'alt', [Lw, F], [['knee', 'h']], 40, 2, 6, 0, 'ひざを腰の高さまで'],
  ['march', 'その場で行進', 'stomp', 'alt', [Lw, F], [['knee', 'm']], 30, 1, 3.5, 0, '腕を振って、元気よく'],
  ['jog', 'その場ジョグ', 'stomp', 'alt', [Lw, F], [['heel', 'j']], 30, 1, 6, 1, '軽やかに、かかとを上げて'],
  ['heel', 'もも裏キック', 'stomp', 'alt', [Lw], [['heel', '']], 60, 1, 4.5, 0, 'かかとをお尻に近づける'],
  ['kick', '前キック', 'kick', 'alt', [Lw, F], [['kick', 'f', { mode: 'alt' }]], 50, 2, 5, 0, 'ひざを上げてから、前へ蹴り出す'],
  ['kick1', '片足キック', 'kick', 'one', [Lw], [['kick', 'f', { mode: 'one' }]], 50, 2, 5, 0, '軸足でしっかり立つ'],
  ['skick', '横キック', 'kick', 'alt', [Lw], [['kick', 's', { mode: 'alt' }]], 10, 2, 5, 0, '足の外側で横へ蹴る'],
  ['calf', 'かかと上げ', 'jump', 'both', [Lw], [['calf', '']], 50, 1, 3, 0, 'つま先立ちで背のびする'],
  ['steptouch', 'ステップタッチ', 'step', 'both', [Lw, F], [['step', 't']], 0, 1, 4, 0, '左右にステップ、リズムに乗る'],
  ['shuffle', 'サイドシャッフル', 'step', 'both', [Lw, F], [['step', 'sh']], 0, 2, 5.5, 0, '低い姿勢で横へすばやく'],
  ['skaterstep', 'スケーターステップ', 'step', 'both', [Lw], [['step', 'sc']], 0, 1, 4.5, 0, '片脚に体重をのせて左右へ'],
  ['sqjump', 'スクワットジャンプ', 'jump', 'both', [Lw, F], [['sqjump', '']], 30, 3, 8, 1, 'しゃがんで、まっすぐ高く'],
  ['tuck', 'タックジャンプ', 'jump', 'both', [Lw], [['tuck', '']], 30, 3, 8, 1, 'ひざを胸に引き寄せる'],
  ['skihop', 'スキージャンプ', 'step', 'both', [Lw, F], [['skihop', '']], 0, 2, 7, 1, '左右に小さくジャンプ'],
  ['skater', 'スケータージャンプ', 'step', 'both', [Lw, F], [['skater', '']], 0, 3, 7, 1, '横へ大きく跳んで着地'],
  ['hopknee', 'ジャンプでひざ上げ', 'knee', 'alt', [Lw, F], [['hopknee', '']], 40, 3, 7, 1, 'はずむようにひざを上げる'],
  ['sqknee', 'スクワット＋ひざ上げ', 'squat', 'alt', [Lw], [['sqplus', 'k']], 40, 2, 5.5, 0, 'しゃがんで、立ちながらひざ上げ'],
  // ---- 全身（脚＋腕） ----
  ['jack', 'ジャンピングジャック', 'lift', 'both', [F, Lw], [['jack', '']], 0, 2, 7, 1, '手と足を同時に大きく開く'],
  ['stepjack', 'ステップジャック', 'lift', 'both', [F], [['jack', 'st']], 0, 1, 4.5, 0, '片足ずつ開いてバンザイ'],
  ['starjump', 'スタージャンプ', 'lift', 'both', [F], [['sqjump', 'st']], 0, 3, 8, 1, '星の形に大きく跳ぶ'],
  ['sqpress', 'スクワット＋バンザイ', 'lift', 'both', [F], [['squat', ''], ['press', '', { mode: 'both' }]], 30, 2, 6, 0, '立ち上がりながら両手を上へ'],
  ['sqpunch', 'スクワット＋パンチ', 'punch', 'alt', [F], [['squat', ''], ['punch', 'f', { mode: 'alt', tempo: 'slow' }]], 35, 2, 6, 0, '立つたびに力強くパンチ'],
  ['marchpunch', '行進しながらパンチ', 'punch', 'alt', [F], [['knee', 'm'], ['punch', 'f', { mode: 'alt', tempo: 'slow' }]], 35, 1, 5, 0, '足ぶみに合わせてパンチ'],
  ['kneeclap', 'ひざ上げ＋拍手', 'clap', 'both', [F], [['knee', 'm'], ['clap', 'f', { tempo: 'slow' }]], 20, 1, 4.5, 0, 'ひざを上げて、手をパン'],
  ['sqslam', 'スクワットで振り下ろす', 'hit', 'both', [F], [['squat', ''], ['slam', '']], 30, 2, 6, 0, 'しゃがみながら両手を振り下ろす'],
  ['lungepunch', 'ランジ＋パンチ', 'punch', 'alt', [F], [['lunge', 'b', { mode: 'alt' }], ['punch', 'f', { mode: 'alt', tempo: 'slow' }]], 45, 2, 6, 0, '沈むたびにパンチ'],
  ['lungelift', 'ランジ＋バンザイ', 'lift', 'both', [F], [['lunge', 'b', { mode: 'alt' }], ['press', '', { mode: 'both' }]], 45, 2, 6, 0, '沈んで、立ちながら手を上へ'],
  ['stepclap', 'ステップ＋拍手', 'clap', 'both', [F], [['step', 't'], ['clap', 'f', { tempo: 'slow' }]], 0, 1, 4.5, 0, 'ステップのたびにパン'],
  ['stepwipe', 'ステップ＋左右にふく', 'wipe', 'both', [F], [['step', 't'], ['sweep', '', { mode: 'both', tempo: 'slow' }]], 0, 1, 4.5, 0, '体ごと左右に大きく'],
  ['sqthrow', 'スクワット＋投げる', 'throw', 'one', [F], [['squat', ''], ['throw', '', { mode: 'one' }]], 30, 2, 5.5, 0, '立ち上がる力で投げる'],
  ['kickpunch', 'キック＋パンチ', 'kick', 'alt', [F], [['kick', 'f', { mode: 'alt' }], ['punch', 'f', { mode: 'alt', tempo: 'slow' }]], 45, 3, 6.5, 0, '蹴りと同時に反対の手でパンチ'],
  ['calfpress', 'かかと上げ＋バンザイ', 'lift', 'both', [F], [['calf', ''], ['press', '', { mode: 'both' }]], 20, 1, 4, 0, '背のびしながら両手を上へ'],
];
export const MOTIONS = DEF.map(([key, name, act, mode, vers, parts, view, lvl, met, imp, cue, x]) => ({ key, name, act, mode, vers, parts, view, lvl, met, imp, cue, rpb: 2, ...(x || {}) }));
export const MOTION_BY_KEY = new Map(MOTIONS.map(m => [m.key, m]));

const CRIT = { hit: 'low', punch: 'fwd', push: 'fwd', pull: 'back', lift: 'high', stir: 'fwd', wipe: 'lat', clap: 'close', throw: 'fwd', squat: 'pelLow', knee: 'kneeUp', kick: 'footFwd', stomp: 'land', jump: 'pelHigh', step: 'pelLat' };

export function exOf(m) {
  if (!m._ex) { const ps = m.parts.map(([mk, vk, o]) => part(mk, vk, o || {})); m._ex = makeEx('x', '', m.name, ps, {}); m._ex.id = 'm-' + m.key; }
  return m._ex;
}
const N = 144, TB = 24;
const cache = new Map();
const avg3 = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mod = (a, n) => ((a % n) + n) % n;

// お手本の1周を調べて、接触の位相・左右・近づき方の表を作る（side は片手の動きのとき 'R' か 'L'）
export function rig(m, side = 'R') {
  const ck = m.key + side; if (cache.has(ck)) return cache.get(ck);
  const ex = exOf(m), J = [];
  for (let i = 0; i < N; i++) J.push(ikSolve(evalEx(ex, i / N, side)));
  const crit = m.crit || CRIT[m.act];
  // 追いかける点（track）: { side, pos[i], sig[i] (大きいほど接触), dir? }
  const tracks = [];
  const limb = (get, f) => {
    if (m.mode === 'both') tracks.push({ side: 'B', pos: J.map(j => avg3(get(j, 0), get(j, 1))) });
    else if (m.mode === 'one') { const i = side === 'L' ? 0 : 1; tracks.push({ side, pos: J.map(j => get(j, i)) }); }
    else for (const i of [0, 1]) tracks.push({ side: i ? 'R' : 'L', pos: J.map(j => get(j, i)) });
    for (const t of tracks) t.sig = t.pos.map(f);
  };
  let lateral = null;
  switch (crit) {
    case 'low': limb((j, i) => j.wr[i], p => -p[1]); break;
    case 'high': limb((j, i) => j.wr[i], p => p[1]); break;
    case 'fwd': limb((j, i) => j.wr[i], p => p[2]); break;
    case 'back': limb((j, i) => j.wr[i], p => -p[2]); break;
    case 'kneeUp': limb((j, i) => j.kn[i], p => p[1]); break;
    case 'footFwd': limb((j, i) => j.an[i], p => p[2] + 0.5 * p[1]); break;
    case 'land': limb((j, i) => j.an[i], p => p[1]); break;
    case 'close': tracks.push({ side: 'B', pos: J.map(j => [j.wr[1][0] - j.wr[0][0], j.wr[1][1] - j.wr[0][1], j.wr[1][2] - j.wr[0][2]]) }); tracks[0].sig = tracks[0].pos.map(p => -Math.hypot(...p)); break;
    case 'pelLow': tracks.push({ side: 'B', pos: J.map(j => j.pel) }); tracks[0].sig = tracks[0].pos.map(p => -p[1]); break;
    case 'pelHigh': tracks.push({ side: 'B', pos: J.map(j => j.pel) }); tracks[0].sig = tracks[0].pos.map(p => p[1]); break;
    case 'lat': {
      const pos = m.mode === 'both' ? J.map(j => avg3(j.wr[0], j.wr[1])) : J.map(j => j.wr[side === 'L' ? 0 : 1]);
      lateral = pos.map(p => p[0]); break;
    }
    case 'pelLat': lateral = J.map(j => j.pel[0]); break;
    case 'yaw': lateral = J.map(j => j.wr[0][2] - j.wr[1][2]); break;
  }
  const contacts = [];
  if (lateral) {
    const sd = m.mode === 'both' || crit === 'pelLat' || crit === 'yaw' ? 'B' : side;
    for (const i of peaks(lateral)) contacts.push({ i, side: sd, dir: 'R', pos: [lateral[i], 0, 0] });
    for (const i of peaks(lateral.map(v => -v))) contacts.push({ i, side: sd, dir: 'L', pos: [lateral[i], 0, 0] });
  } else {
    for (const t of tracks) {
      let list = peaks(t.sig);
      if (tracks.length > 1) list = [list.reduce((a, b) => t.sig[b] > t.sig[a] ? b : a, list[0])];   // 交互：左右それぞれ1回
      for (let best of list) {
        if (crit === 'land') {   // いちばん高い所から、床に着くまで進める
          let lo = Infinity; for (const y of t.sig) lo = Math.min(lo, y);
          const th = lo + (t.sig[best] - lo) * 0.12; let i = best;
          for (let k = 0; k < N; k++) { i = (best + k) % N; if (t.sig[i] <= th) break; }
          best = i;
        }
        contacts.push({ i: best, side: t.side, dir: t.side, pos: t.pos[best], t });
      }
    }
  }
  contacts.sort((a, b) => a.i - b.i);
  // 近づき方の表（前の接触 → この接触）
  const nC = contacts.length, xs = lateral ? normLat(lateral) : null;
  const tables = contacts.map((c, k) => {
    const prev = contacts[mod(k - 1, nC)], span = mod(c.i - prev.i, N) || N, tb = new Float32Array(TB + 1);
    const at = f => { const x = prev.i + f * span, i0 = Math.floor(x), w = x - i0, a = mod(i0, N), b = mod(i0 + 1, N);
      if (lateral) return Math.abs(xs[a] * (1 - w) + xs[b] * w - xs[c.i]);
      const P = c.t.pos; return dist3([P[a][0] * (1 - w) + P[b][0] * w, P[a][1] * (1 - w) + P[b][1] * w, P[a][2] * (1 - w) + P[b][2] * w], c.pos); };
    let mx = 0; for (let s = 0; s <= TB; s++) { tb[s] = at(s / TB); mx = Math.max(mx, tb[s]); }
    for (let s = 0; s <= TB; s++) tb[s] = mx > 1e-4 ? Math.min(1, tb[s] / mx) : 1 - s / TB;
    tb[TB] = 0;
    return tb;
  });
  const R = { m, ex, side, n: nC, cph: contacts.map(c => c.i / N), sides: contacts.map(c => c.side), dirs: contacts.map(c => c.dir), tables, xs };
  cache.set(ck, R); return R;
}
// 1周の中の山（十分に高く、近くでいちばん高い所）
function peaks(sig) {
  let lo = Infinity, hi = -Infinity; for (const v of sig) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const th = lo + (hi - lo) * 0.75, w = Math.floor(N / 3.4), out = [];
  for (let i = 0; i < N; i++) {
    if (sig[i] < th) continue; let ok = true;
    for (let k = -w; k <= w && ok; k++) { if (!k) continue; const v = sig[mod(i + k, N)]; if (v > sig[i] || (v === sig[i] && k < 0)) ok = false; }
    if (ok) out.push(i);
  }
  return out.length ? out.slice(0, 4) : [sig.indexOf(hi)];
}
function normLat(x) { let a = Infinity, b = -Infinity; for (const v of x) { a = Math.min(a, v); b = Math.max(b, v); } const mid = (a + b) / 2, h = Math.max(1e-3, (b - a) / 2); return Float32Array.from(x, v => Math.max(-1, Math.min(1, (v - mid) / h))); }

// rf: 連続した「回数」の座標（接触 j は rf = j ちょうど）
const cyc = (R, j) => Math.floor(j / R.n) + R.cph[mod(j, R.n)];
export function phaseAt(R, rf) { const j = Math.ceil(rf - 1e-9), f = rf - (j - 1), a = cyc(R, j - 1), b = cyc(R, j); return a + (b - a) * f; }
export function pAt(R, rf) { const j = Math.ceil(rf - 1e-9), f = rf - (j - 1), tb = R.tables[mod(j, R.n)], x = f * TB, i = Math.min(TB - 1, Math.floor(x)), w = x - i; return tb[i] * (1 - w) + tb[i + 1] * w; }
export function xAt(R, rf) { if (!R.xs) return undefined; const ph = phaseAt(R, rf), x = (ph - Math.floor(ph)) * N, i = Math.floor(x) % N, w = x - Math.floor(x); return R.xs[i] * (1 - w) + R.xs[(i + 1) % N] * w; }
export const sideOf = (R, j) => R.sides[mod(j, R.n)];
export const dirOf = (R, j) => R.dirs[mod(j, R.n)];
export function jointsAtRep(R, rf) { const ph = phaseAt(R, rf); return ikSolve(evalEx(R.ex, ph - Math.floor(ph), R.side)); }
