/* =========================================================================
   IMMERSE FIT — backcoach.js
   お手本「うしろ姿」：濃いグレーの地に、白い一本線で描いた上半身のうしろ姿。
   ・うしろ姿なので、画面の右の腕 ＝ 自分の右腕（鏡あわせにならず、そのまま まねできる）
   ・動かす腕だけを描く。頭・首・肩・腕は一本のなめらかな線でつながる
   ・形は「距離の場」で作って、その輪郭をなぞって線にする（部位どうしが自然につながる）
   ・腕の位置は「当たる場所までの近さ p」（motions.js の pAt）で決めるので、場面とずれない
   ・上に動きの名前（例：おろす / CHOP IT）
   設計の座標：参考動画の1コマ（幅660×高さ788）に合わせた単位。頭の幅 ≒ 212。
   3D人形の画像（imgcoach.js）がある動きは、読みこめたら画像のお手本に切りかわる（置き方・文字は同じ）。
   ========================================================================= */
import { pAt } from './motions.js';
import { imgCoach, imgCoachPip, drawImgCoach, hasImgCoach } from './imgcoach.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const mix2 = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t)];
const bez2 = (A, C, B, t) => { const u = 1 - t; return [u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]]; };
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const BACK_BG = '#4c4a44';
const INK = '#fbfbf6';
const LW = 8.6;                       // 線の太さ（設計の単位）
const FIST_THIN = 0.52;               // こぶしの線はこの割合だけ細く
const FONT_JP = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Zen Kaku Gothic New", "Hiragino Sans", sans-serif';

/* ---------- 距離の場（2D）の部品 ---------- */
function smin(a, b, k) { const h = k - Math.abs(a - b); return h > 0 ? Math.min(a, b) - h * h * 0.25 / k : Math.min(a, b); }
const len = (x, y) => Math.sqrt(x * x + y * y);
function sdEllipse(x, y, a, b) {
  const k0 = len(x / a, y / b); if (k0 < 1e-6) return -Math.min(a, b);
  const k1 = len(x / (a * a), y / (b * b)); return k0 * (k0 - 1) / k1;
}
// 太さの変わる棒（A 側の半径 ra、B 側の半径 rb）
function sdCone(px, py, A, B, ra, rb) {
  const dx = B[0] - A[0], dy = B[1] - A[1], h = len(dx, dy), wx = px - A[0], wy = py - A[1];
  if (h < 1e-6) return len(wx, wy) - Math.max(ra, rb);
  const ux = dx / h, uy = dy / h, qx = Math.abs(wx * uy - wy * ux), qy = wx * ux + wy * uy, b = (ra - rb) / h;
  if (b >= 1) return len(wx, wy) - ra;
  if (b <= -1) return len(px - B[0], py - B[1]) - rb;
  const a = Math.sqrt(1 - b * b), k = -b * qx + a * qy;
  if (k < 0) return len(qx, qy) - ra;
  if (k > a * h) return len(qx, qy - h) - rb;
  return qx * a + qy * b - ra;
}
// 角の丸い四角（手の座標：lx = 横、ly = 指先の向き。上の角 rT・下の角 rB）
function sdBox(lx, ly, hw, hh, rT, rB) {
  const r = ly > 0 ? rT : rB, qx = Math.abs(lx) - hw + r, qy = Math.abs(ly) - hh + r;
  return len(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/* ---------- 動かない体：頭・首・肩（左の腕は下ろしたまま） ---------- */
const HEAD = { x: 271, y: 333, a: 106, b: 126 };
const NECK = { x: 276, y0: 430, y1: 660, r: 71 };
// 肩：左右同じ楕円（なで肩）。右は腕を描くので、背中の幅（xR）で切る
const TORSO = { x: 274, y: 860, a: 330, b: 296, xR: 450 };
const smax = (a, b, k) => -smin(-a, -b, k);
function sdBody(x, y) {
  const hd = sdEllipse(x - HEAD.x, y - HEAD.y, HEAD.a, HEAD.b);
  const ny = y < NECK.y0 ? NECK.y0 : y > NECK.y1 ? NECK.y1 : y, nk = len(x - NECK.x, y - ny) - NECK.r;
  const dx = x - TORSO.x;
  const tr = smax(y > TORSO.y ? Math.abs(dx) - TORSO.a : sdEllipse(dx, y - TORSO.y, TORSO.a, TORSO.b), x - TORSO.xR, 40);
  return smin(smin(hd, nk, 46), tr, 34);
}

/* ---------- 動かす腕（奥行きつき） ----------
   z は奥行き：背中の面が 0、画面の奥（体の前）ほど大きい。
   奥にある腕は、体と重なる所がかくれて、体のふち（肩の線など）が腕の手前に見える。 */
const ZOCC = 540;                      // これより奥（手のあたり）が体と重なると、体のふちが手前に見える
let coneT = 0;                         // sdConeT：いちばん近い所の位置（0 = A, 1 = B）
function sdConeT(px, py, A, B, ra, rb) {
  const dx = B[0] - A[0], dy = B[1] - A[1], h = len(dx, dy);
  coneT = h > 1e-6 ? clamp(((px - A[0]) * dx + (py - A[1]) * dy) / (h * h)) : 0;
  return sdCone(px, py, A, B, ra, rb);
}
let armZ = 0;                          // sdArm：その点の腕の奥行き
function sdFist(x, y, A) {
  const ox = x - A.C[0], oy = y - A.C[1], lx = ox * A.v[0] + oy * A.v[1], ly = ox * A.u[0] + oy * A.u[1];
  let f = sdBox(lx, ly, A.hw, A.hh, A.rT, A.rB);
  if (A.roll > 0.02) {                               // 横から：指の関節の小さなふくらみ（親指と反対の側）
    const r = 9.5 * A.roll, kx = -A.hw + 9;
    for (let i = 0; i < 4; i++) f = smin(f, len(lx - kx, ly - A.knY[i]) - r, 5);
  }
  if (A.roll < 0.98) {                               // 上げた所：手のひらが外側（画面の右）。にぎった指のふくらみが外側に
    f = smin(f, len(lx - (A.hw - 5), ly - A.hh * 0.12) - 15 * (1 - A.roll), 12);
  }
  const T = A.T, tr = A.tr;
  return smin(f, Math.min(sdCone(lx, ly, T[0], T[1], tr[0], tr[1]), sdCone(lx, ly, T[1], T[2], tr[1], tr[2])), 6);
}
function sdArm(x, y, A) {
  const du = sdConeT(x, y, A.S, A.E, A.rS, A.rE), zu = lerp(A.zS, A.zE, coneT);
  const df = sdConeT(x, y, A.E, A.W, A.rE2, A.rW), zf = lerp(A.zE, A.zC, coneT);
  const dh = sdFist(x, y, A);
  armZ = dh <= du && dh <= df ? A.zC : du < df ? zu : zf;
  return smin(smin(du, df, 18), dh, 12);
}
// 体（頭・首・肩）＋ 腕の下から背中へ流れる線（広背筋）
function sdBodyA(x, y, A) { return smin(sdBody(x, y), sdCone(x, y, A.L0, A.L1, A.rL, A.rL), 44); }

/* ---------- 動きごとの形 ----------
   1回ぶん（当たった瞬間 f = 0 → 次に当たる f = 1）の流れを、参考動画のコマから取った形でつなぐ。
   おろす：当たる（こぶしは画面の奥・首の横で小さく、下は肩のかげ）→ 耳の横を通って上げる → 腕を上げきる
   → ひじを横に張って、こぶしを頭の横へ引く（かまえ）→ もう一度上げる → 頭の横を通って画面の奥へ振りおろす
   ang：こぶしの向き（度。0 = 真上、マイナス = 頭の側へ傾く）、roll：0 = 親指が手前（手のひらは外側）、1 = にぎった指が頭の側
   ease：そのキーへ向かう動き方（io = ゆっくり出てゆっくり止まる、in = だんだん速く、out = だんだん遅く、lin = 一定） */
const P_LOW = { S: [452, 652], rS: 50, L1: [482, 1500] }, P_UP = { S: [440, 615], rS: 58, L1: [358, 955] };
const CH = {
  hit: { ...P_LOW, C: [394, 514], E: [468, 650], zC: 820, zE: 470, hw: 33, hh: 46, ang: 0, roll: 1, rE: 42, rE2: 40, rW: 28 },
  ear: { ...P_LOW, S: [446, 630], rS: 54, C: [392, 430], E: [488, 640], zC: 620, zE: 420, hw: 42, hh: 60, ang: -6, roll: 1, rE: 44, rE2: 42, rW: 32 },
  up1: { ...P_UP, C: [436, 122], E: [534, 456], zC: 300, zE: 260, hw: 23, hh: 31, ang: -15, roll: 0, rE: 44, rE2: 40, rW: 26 },
  cock: { ...P_UP, L1: [330, 950], C: [446, 418], E: [582, 488], zC: 0, zE: 0, hw: 50, hh: 76, ang: 0, roll: 1, rE: 42, rE2: 36, rW: 32 },
  rise: { ...P_UP, L1: [340, 950], C: [488, 262], E: [566, 466], zC: 0, zE: 0, hw: 32, hh: 46, ang: -4, roll: 1, rE: 42, rE2: 38, rW: 28 },
  up2: { ...P_UP, S: [450, 600], C: [474, 140], E: [492, 400], zC: 100, zE: 80, hw: 34, hh: 58, ang: 0, roll: 1, rE: 46, rE2: 44, rW: 34 },
  down: { ...P_LOW, S: [446, 630], rS: 54, C: [423, 482], E: [478, 642], zC: 620, zE: 420, hw: 36, hh: 56, ang: -10, roll: 1, rE: 44, rE2: 40, rW: 30 },
};
// 上げるのは1回・振りおろすのも1回：耳の横 → ひじを横に張りながら → 腕を上げきって止める → 一気に振りおろす
const TL_CHOP = [
  [0, 'hit'], [0.14, 'hit'], [0.26, 'ear', 'in'], [0.42, 'cock', 'io'], [0.6, 'up1', 'out'], [0.86, 'up1'], [0.94, 'down', 'in'], [1, 'hit', 'lin'],
];
// 1回の流れ（確認ページの表示用）
export const FLOW = { hit1: [[0, '当たる'], [0.12, '上げる'], [0.58, '上で止める'], [0.85, '振りおろす']] };
const EASE = { io: u => u * u * (3 - 2 * u), in: u => u * u, out: u => 1 - (1 - u) * (1 - u), lin: u => u };
function keyLerp(A, B, t) {
  const o = {};
  for (const k in A) { const a = A[k], b = B[k]; o[k] = Array.isArray(a) ? [lerp(a[0], b[0], t), lerp(a[1], b[1], t)] : lerp(a, b, t); }
  return o;
}
// 1回の中の位置 f（0〜1）→ そのときの形
function timeline(TL, KEYS, f) {
  f = f - Math.floor(f);
  let i = 0; while (i < TL.length - 2 && f >= TL[i + 1][0]) i++;
  const [f0, k0] = TL[i], [f1, k1, ez] = TL[i + 1], u = clamp((f - f0) / Math.max(1e-6, f1 - f0));
  return keyLerp(KEYS[k0], KEYS[k1], (EASE[ez] || EASE.io)(u));
}
const GLYPH = [{ T: [[-8, -22], [-8, 0], [-8, 16]], tr: [7, 7, 7], rT: 21, rB: 10 }, { T: [[-6, 36], [-13, 60], [-17, 74]], tr: [19, 12, 8], rT: 24, rB: 16 }];
// キーの値 → 描くための腕の形
function armFrom(K) {
  const G0 = GLYPH[0], G1 = GLYPH[1], roll = clamp(K.roll), a = K.ang * Math.PI / 180;
  const u = [Math.sin(a), -Math.cos(a)], v = [-u[1], u[0]];                  // v は「外側」（右腕なら画面の右）
  const C = K.C, hh = K.hh, hw = K.hw, W = [C[0] - u[0] * hh * 0.8, C[1] - u[1] * hh * 0.8];
  const sc = hh / 56;                                                          // 親指の大きさは手の大きさに合わせる
  const T = G1.T.map((q, i) => { const b = [q[0] * sc, q[1] * sc]; return mix2(G0.T[i], b, roll); }), tr = G1.tr.map((r, i) => lerp(G0.tr[i], r * sc, roll));
  return { S: K.S, zS: 110, rS: K.rS, E: K.E, zE: K.zE, rE: K.rE, rE2: K.rE2, W, rW: K.rW, C, zC: K.zC, u, v, hw, hh,
    rT: lerp(G0.rT, G1.rT, roll), rB: lerp(G0.rB, G1.rB, roll), T, tr, roll,
    aUp: 1 - sstep(0.3, 0.5, roll), aDn: sstep(0.5, 0.7, roll),
    knY: [hh * 0.8, hh * 0.4, 0, -hh * 0.4], L0: mix2(K.S, K.E, 0.6), L1: K.L1, rL: 52 };
}
const poseChop = f => armFrom(timeline(TL_CHOP, CH, f));
// 手の中の線（指・親指のつけ根）。手の座標 [横, 指先の向き]
function fistLines(A) {
  const out = [], hw = A.hw, hh = A.hh;
  const up = A.aUp !== undefined ? A.aUp : 1 - A.roll, dn = A.aDn !== undefined ? A.aDn : A.roll;
  if (up > 0.02) {                                   // 上げた所：親指の側から見たにぎりこぶし。手前に親指（たて）、手のひらは外側
    // 親指：上のふちから下まで、たての2本（参考動画のとおり）
    out.push({ a: up, thin: true, pts: [[-hw * 0.5, hh - 4], [-hw * 0.56, 0], [-hw * 0.5, -hh + 4]] });
    out.push({ a: up, thin: true, pts: [[hw * 0.18, hh - 1], [hw * 0.22, 0], [hw * 0.2, -hh + 4]] });
    out.push({ a: up * 0.8, thin: true, pts: [[-hw + 4, -hh + 3], [0, -hh + 1.5], [hw - 4, -hh + 3]] });   // こぶしの下（手首との境）
  }
  if (dn > 0.02) {                                   // 手首の側から見たこぶし：指の4本と、指先の線
    const x0 = -hw + 3, x1 = -hw * 0.08, ys = [0.68, 0.31, -0.06, -0.43], fh = hh * 0.17;   // 指4本：まるい「⊂」を縦に4つ
    for (const k of ys) {
      const yc = hh * k, r = fh, arc = [];
      for (let i = 0; i <= 6; i++) { const t = Math.PI / 2 + Math.PI * i / 6; arc.push([x0 + r + r * Math.cos(t), yc + r * Math.sin(t)]); }
      out.push({ a: dn, thin: true, pts: [[x1, yc + r], ...arc, [x1, yc - r]] });
    }
    out.push({ a: dn, pts: [[x1 + 1, hh * 0.86], [x1 + 3, 0], [x1 + 1, -hh * 0.98]] });
    // 手の甲のふち → 前腕の内側（親指のつけ根から、外側の線へ流れる）
    out.push({ a: sstep(0.7, 1, dn), pts: [[-hw * 0.3, hh * 0.52], [hw * 0.03, hh * 0.4], [hw * 0.42, hh * 0.08], [hw * 0.64, -hh * 0.48], [hw * 0.89, -hh * 0.92], [hw * 1.1, -hh * 1.3]] });
  }
  return out;
}

export const BACK = {
  hit1: { jp: 'おろす', en: 'CHOP IT', pose: poseChop, phase: true, frame: { cx: 300, lx: 283 }, pip: { cx: 322, cy: 450, r: 430 } },
};
// 3D人形の画像だけのお手本（白い線の形はない）：画像が読みこめたら、うしろ姿のお手本になる
const LABELS = {
  hitalt: ['おろす', 'CHOP IT'], drum: ['たたく', 'DRUM IT'], chopa: ['きる', 'CHOP IT'], slam: ['おろす', 'SLAM IT'],
  punch: ['パンチ', 'PUNCH IT'], punch1: ['パンチ', 'PUNCH IT'], upper: ['アッパー', 'UPPERCUT'], punchup: ['つきあげる', 'PUNCH UP'],
  push: ['おす', 'PUSH IT'], pushalt: ['おす', 'PUSH IT'], row: ['ひく', 'ROW IT'], cord: ['ひっぱる', 'PULL IT'], rope: ['たぐる', 'PULL IT'],
  press: ['もちあげる', 'LIFT IT'], climb: ['のばす', 'REACH UP'], ylift: ['あげる', 'RAISE IT'],
  stir1: ['まぜる', 'STIR IT'], stir2: ['まぜる', 'STIR IT'], wipe1: ['ふく', 'WIPE IT'], wipe2: ['ふく', 'WIPE IT'],
  clap: ['はくしゅ', 'CLAP'], clapup: ['はくしゅ', 'CLAP UP'], throw: ['なげる', 'THROW IT'],
  twist: ['ひねる', 'TWIST'], sbend: ['たおす', 'BEND'], woodchop: ['おろす', 'CHOP DOWN'], bentrow: ['ひく', 'ROW IT'], bob: ['よける', 'DUCK'], halo: ['まわす', 'CIRCLE'],
  squat: ['しゃがむ', 'SQUAT'], wsquat: ['しゃがむ', 'SQUAT'], lunge: ['しずむ', 'LUNGE'], curtsy: ['しずむ', 'LUNGE'], slunge: ['ふみだす', 'STEP OUT'],
  knee: ['あげる', 'KNEE UP'], hknee: ['あげる', 'HIGH KNEE'], march: ['あるく', 'MARCH'], jog: ['はしる', 'JOG'], heel: ['けりあげる', 'HEEL UP'],
  kick: ['ける', 'KICK IT'], kick1: ['ける', 'KICK IT'], skick: ['ける', 'SIDE KICK'], calf: ['せのび', 'TIPTOE'],
  steptouch: ['ステップ', 'STEP'], shuffle: ['よこへ', 'SHUFFLE'], skaterstep: ['すべる', 'SKATE'],
  sqjump: ['とぶ', 'JUMP'], tuck: ['とぶ', 'TUCK JUMP'], skihop: ['とぶ', 'HOP'], skater: ['とぶ', 'SKATER'], hopknee: ['とぶ', 'HOP KNEE'], sqknee: ['しゃがむ', 'SQUAT UP'],
  jack: ['とぶ', 'JACK'], stepjack: ['ひらく', 'STEP JACK'], starjump: ['とぶ', 'STAR JUMP'], sqpress: ['もちあげる', 'SQUAT LIFT'],
  sqpunch: ['パンチ', 'SQUAT PUNCH'], marchpunch: ['パンチ', 'MARCH PUNCH'], kneeclap: ['はくしゅ', 'KNEE CLAP'], sqslam: ['おろす', 'SQUAT SLAM'],
  lungepunch: ['パンチ', 'LUNGE PUNCH'], lungelift: ['もちあげる', 'LUNGE LIFT'], stepclap: ['はくしゅ', 'STEP CLAP'], stepwipe: ['ふく', 'STEP WIPE'],
  sqthrow: ['なげる', 'SQUAT THROW'], kickpunch: ['ける', 'KICK PUNCH'], calfpress: ['のびる', 'REACH UP'],
};
for (const [k, [jp, en]] of Object.entries(LABELS)) if (hasImgCoach(k)) BACK[k] = { jp, en, phase: true, frame: { cx: 271, lx: 271 }, pip: { cx: 271, cy: 455, r: 365 } };
// うしろ姿のお手本を使えるか：白い線の形があるか、3D人形の画像が読みこめたとき
export const hasBack = m => { const d = m && BACK[m.key]; return !!d && (!!d.pose || !!imgCoach(m.key)); };

/* ---------- 輪郭をなぞる（マーチングスクエア） ----------
   まず粗い格子（4目ごと）で場を調べ、輪郭が通りそうなマスだけ細かく調べる（速さのため）。
   lines：体と腕を合わせた外側の線。occ：奥にある腕の手前を横切る、体のふちの線 */
const SUB = 4, BIG = 1e4;
let fu = new Float32Array(0), fb = new Float32Array(0), fa = new Float32Array(0), fz = new Float32Array(0), fs = new Uint32Array(0);
let nb1 = new Int32Array(0), nb2 = new Int32Array(0), es = new Uint32Array(0), ex = new Float32Array(0), ey = new Float32Array(0), stampNo = 0;
let cu = new Float32Array(0), cb = new Float32Array(0);
// F：細かい格子の値、cells：調べるマス（細かい格子の左上の番号）、keep(k, fx, fy)：その線を残すか（なければ全部）
function march(F, cells, nx, X0, Y0, g, keep) {
  stampNo = (stampNo + 1) >>> 0 || 1;
  const pts = [];
  const pt = e => {
    if (es[e] === stampNo) return;
    es[e] = stampNo; nb1[e] = -1; nb2[e] = -1; pts.push(e);
    const k = e >> 1, i = k % nx, j = (k / nx) | 0, a = F[k];
    if (e & 1) { const b = F[k + nx], t = a / (a - b); ex[e] = X0 + i * g; ey[e] = Y0 + (j + t) * g; }
    else { const b = F[k + 1], t = a / (a - b); ex[e] = X0 + (i + t) * g; ey[e] = Y0 + j * g; }
  };
  const link = (a, b, k) => {
    pt(a); pt(b);
    if (keep && !keep(k, (ex[a] + ex[b]) / 2, (ey[a] + ey[b]) / 2)) return;
    if (nb1[a] < 0) nb1[a] = b; else nb2[a] = b; if (nb1[b] < 0) nb1[b] = a; else nb2[b] = a;
  };
  for (const k of cells) {
    const i = k % nx, j = (k / nx) | 0, f00 = F[k], f10 = F[k + 1], f01 = F[k + nx], f11 = F[k + nx + 1];
    const cc = (f00 < 0 ? 1 : 0) | (f10 < 0 ? 2 : 0) | (f11 < 0 ? 4 : 0) | (f01 < 0 ? 8 : 0);
    if (cc === 0 || cc === 15) continue;
    const e0 = 2 * k, e1 = 2 * (k + 1) + 1, e2 = 2 * (k + nx), e3 = 2 * k + 1;
    switch (cc) {
      case 1: case 14: link(e3, e0, k); break;
      case 2: case 13: link(e0, e1, k); break;
      case 3: case 12: link(e3, e1, k); break;
      case 4: case 11: link(e1, e2, k); break;
      case 6: case 9: link(e0, e2, k); break;
      case 7: case 8: link(e3, e2, k); break;
      case 5: if (f00 + f10 + f01 + f11 < 0) { link(e0, e1, k); link(e2, e3, k); } else { link(e3, e0, k); link(e1, e2, k); } break;
      case 10: if (f00 + f10 + f01 + f11 < 0) { link(e3, e0, k); link(e1, e2, k); } else { link(e0, e1, k); link(e2, e3, k); } break;
    }
  }
  // つないで線にする（はしのある線を先に、そのあと輪）
  const used = new Set(), lines = [];
  const walk = (s0, closedHint) => {
    const P = [ex[s0], ey[s0]]; used.add(s0); let cur = s0;
    for (;;) {
      const a = nb1[cur], b = nb2[cur], n2 = a >= 0 && !used.has(a) ? a : b >= 0 && !used.has(b) ? b : -1;
      if (n2 < 0) break;
      used.add(n2); P.push(ex[n2], ey[n2]); cur = n2;
    }
    const closed = closedHint && P.length > 4 && (nb1[cur] === s0 || nb2[cur] === s0);
    if (P.length > 2) lines.push({ P, closed });
  };
  for (const e of pts) if (!used.has(e) && nb1[e] >= 0 && nb2[e] < 0) walk(e, false);
  for (const e of pts) if (!used.has(e) && nb1[e] >= 0) walk(e, true);
  return lines;
}
// 腕と体をなめらかにつなぐ幅：背中の面から離れた（画面の奥や手前の）腕は、体とくっつけない
const kOf = z => 22 * (1 - sstep(150, 300, Math.abs(z)));
// win: 設計の座標の範囲 [x0, y0, x1, y1]、g: 細かい格子の間隔、arm: 腕の形
function trace(win, g, arm) {
  const G = g * SUB, X0 = Math.floor(win[0] / G) * G, Y0 = Math.floor(win[1] / G) * G;
  const CX = Math.max(1, Math.ceil((win[2] - X0) / G)), CY = Math.max(1, Math.ceil((win[3] - Y0) / G));
  const nx = CX * SUB + 1, ny = CY * SUB + 1, N = nx * ny, cnx = CX + 1, cny = CY + 1;
  if (fu.length < N) { fu = new Float32Array(N); fb = new Float32Array(N); fa = new Float32Array(N); fz = new Float32Array(N); fs = new Uint32Array(N); nb1 = new Int32Array(2 * N); nb2 = new Int32Array(2 * N); es = new Uint32Array(2 * N); ex = new Float32Array(2 * N); ey = new Float32Array(2 * N); }
  if (cu.length < cnx * cny) { cu = new Float32Array(cnx * cny); cb = new Float32Array(cnx * cny); }
  stampNo = (stampNo + 1) >>> 0 || 1; const nodeNo = stampNo;
  // 腕が届く範囲（それ以外は体だけ）
  let ax0 = 1e9, ay0 = 1e9, ax1 = -1e9, ay1 = -1e9;
  const grow = (P, r) => { ax0 = Math.min(ax0, P[0] - r); ay0 = Math.min(ay0, P[1] - r); ax1 = Math.max(ax1, P[0] + r); ay1 = Math.max(ay1, P[1] + r); };
  grow(arm.S, arm.rS + 40); grow(arm.E, arm.rE + 40); grow(arm.W, arm.rW + 40); grow(arm.C, arm.hh + arm.hw + 70);
  const inArm = (x, y) => x >= ax0 && x <= ax1 && y >= ay0 && y <= ay1;
  let lx0 = 1e9, ly0 = 1e9, lx1 = -1e9, ly1 = -1e9;     // 背中の線（広背筋）の範囲
  for (const P of [arm.L0, arm.L1]) { lx0 = Math.min(lx0, P[0] - arm.rL - 60); ly0 = Math.min(ly0, P[1] - arm.rL - 60); lx1 = Math.max(lx1, P[0] + arm.rL + 60); ly1 = Math.max(ly1, P[1] + arm.rL + 60); }
  const body = (x, y) => x >= lx0 && x <= lx1 && y >= ly0 && y <= ly1 ? sdBodyA(x, y, arm) : sdBody(x, y);
  // 粗い格子
  for (let j = 0; j < cny; j++) for (let i = 0; i < cnx; i++) {
    const x = X0 + i * G, y = Y0 + j * G, b = body(x, y), k = j * cnx + i;
    if (inArm(x, y)) { const a = sdArm(x, y, arm); cb[k] = b; cu[k] = smin(b, a, kOf(armZ)); } else { cb[k] = b; cu[k] = b; }
  }
  const lim = G * 0.75 + 8, may = (a, b, c, d) => !((a > 0) === (b > 0) && (a > 0) === (c > 0) && (a > 0) === (d > 0) && Math.min(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) > lim);
  const cellsU = [], cellsB = [];
  for (let cj = 0; cj < CY; cj++) for (let ci = 0; ci < CX; ci++) {
    const k = cj * cnx + ci;
    const mu = may(cu[k], cu[k + 1], cu[k + cnx], cu[k + cnx + 1]);
    const x = X0 + ci * G, y = Y0 + cj * G, nearArm = inArm(x, y) || inArm(x + G, y + G) || inArm(x + G, y) || inArm(x, y + G);
    const mb = nearArm && may(cb[k], cb[k + 1], cb[k + cnx], cb[k + cnx + 1]);
    if (!mu && !mb) continue;
    const fi0 = ci * SUB, fj0 = cj * SUB;
    for (let j = 0; j <= SUB; j++) for (let i = 0; i <= SUB; i++) {
      const q = (fj0 + j) * nx + fi0 + i; if (fs[q] === nodeNo) continue;
      fs[q] = nodeNo;
      const X = X0 + (fi0 + i) * g, Y = Y0 + (fj0 + j) * g, b = body(X, Y);
      fb[q] = b;
      if (inArm(X, Y)) { const a = sdArm(X, Y, arm); fa[q] = a; fz[q] = armZ; fu[q] = smin(b, a, kOf(armZ)); }
      else { fa[q] = BIG; fz[q] = 0; fu[q] = b; }
    }
    for (let j = 0; j < SUB; j++) for (let i = 0; i < SUB; i++) { const q = (fj0 + j) * nx + fi0 + i; if (mu) cellsU.push(q); if (mb) cellsB.push(q); }
  }
  const lines = march(fu, cellsU, nx, X0, Y0, g);
  // 体のふちのうち、奥にある腕に重なる所（腕の手前を横切る線）
  const keep = (k, x, y) => {
    const tx = clamp((x - X0) / g - (k % nx)), ty = clamp((y - Y0) / g - ((k / nx) | 0));
    const bl = (F) => (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - ty) + (F[k + nx] * (1 - tx) + F[k + nx + 1] * tx) * ty;
    if (!(bl(fa) < -2 && bl(fz) > ZOCC)) return false;
    // 上を向いたふち（肩の上の線）だけ：横のふちは腕の外の線とまぎらわしいので描かない
    const gx = fb[k + 1] - fb[k] + fb[k + nx + 1] - fb[k + nx], gy = fb[k + nx] - fb[k] + fb[k + nx + 1] - fb[k + 1];
    return gy < -0.45 * len(gx, gy);
  };
  const occ = cellsB.length ? march(fb, cellsB, nx, X0, Y0, g, keep) : [];
  return { lines, occ };
}
// 少しだけならす（格子のかくかくを消す）
function smooth(L) {
  const P = L.P, n = P.length >> 1; if (n < 4) return Float32Array.from(P);
  const Q = new Float32Array(P.length);
  for (let i = 0; i < n; i++) {
    const a = L.closed ? (i - 1 + n) % n : Math.max(0, i - 1), b = L.closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const w = !L.closed && (i === 0 || i === n - 1) ? 0 : 0.25;
    Q[2 * i] = P[2 * i] * (1 - 2 * w) + (P[2 * a] + P[2 * b]) * w; Q[2 * i + 1] = P[2 * i + 1] * (1 - 2 * w) + (P[2 * a + 1] + P[2 * b + 1]) * w;
  }
  return Q;
}
// 太さの段（lvl）ごとに別の線へ分けて足す（同じ段が続く所は1本のまま）
function addVar(paths, P, closed, lvlAt) {
  const n = P.length >> 1; if (n < 2) return;
  const lv = new Int8Array(n); let mn = 99, mx = -1;
  for (let i = 0; i < n; i++) { lv[i] = lvlAt(P[2 * i], P[2 * i + 1]); mn = Math.min(mn, lv[i]); mx = Math.max(mx, lv[i]); }
  if (mn === mx) { addPath(paths[mn], P, closed); return; }
  let start = 0, cur = Math.max(lv[0], lv[1]);
  for (let i = 1; i < n - 1; i++) { const l = Math.max(lv[i], lv[i + 1]); if (l !== cur) { addPath(paths[cur], P.subarray(2 * start, 2 * i + 2), false); start = i; cur = l; } }
  addPath(paths[cur], P.subarray(2 * start, 2 * n), false);
  if (closed) { const l = Math.max(lv[n - 1], lv[0]); paths[l].moveTo(P[2 * n - 2], P[2 * n - 1]); paths[l].lineTo(P[0], P[1]); }
}
function addPath(path, P, closed) {
  const n = P.length >> 1; if (n < 2) return;
  path.moveTo(P[0], P[1]);
  if (n < 3) { path.lineTo(P[2], P[3]); return; }
  for (let i = 1; i < n - 1; i++) path.quadraticCurveTo(P[2 * i], P[2 * i + 1], (P[2 * i] + P[2 * i + 2]) / 2, (P[2 * i + 1] + P[2 * i + 3]) / 2);
  path.lineTo(P[2 * n - 2], P[2 * n - 1]);
  if (closed) path.closePath();
}

/* ---------- 文字（動きの名前） ---------- */
let fontAsked = false;
function askFont(def) {
  if (fontAsked || typeof document === 'undefined' || !document.fonts) return; fontAsked = true;
  const txt = Object.values(BACK).map(d => d.jp + d.en).join('');
  document.fonts.load(`900 40px "M PLUS Rounded 1c"`, txt).catch(() => {});
}
// x：ラベルの中心、y：設計の y = 0 の位置（CSS px）、s：設計の単位の大きさ。参考：おろす 88、CHOP IT 36
function drawLabel(c, def, x, y, s, alpha) {
  const big = Math.max(14, 88 * s), small = Math.max(7, 36 * s);
  c.save(); c.globalAlpha = alpha; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = INK; c.strokeStyle = INK; c.lineJoin = 'round';
  c.shadowColor = 'rgba(255,255,255,0.45)'; c.shadowBlur = big * 0.08;
  c.font = `900 ${big}px ${FONT_JP}`; c.lineWidth = big * 0.045; c.strokeText(def.jp, x, y + Math.max(38 * s, big * 0.43)); c.fillText(def.jp, x, y + Math.max(38 * s, big * 0.43));
  c.font = `900 ${small}px ${FONT_JP}`; c.lineWidth = small * 0.07;
  const yb = y + Math.max(91 * s, big * 0.43 + small * 1.25); c.strokeText(def.en, x, yb); c.fillText(def.en, x, yb);
  c.restore();
}

// 切り方（設計の座標）：cx = 左右の中心（左手のときはここで反転）、ww = 見せる幅、y0〜y1 = 見せる高さ（land = 横長の画面）
const LINE_VIEW = { ww: 650, y0: -70, y1: 900, panel: 820, land: 760 };   // 白い線：横長の画面は肩のあたりまで（参考動画と同じ切り方）
const IMG_VIEW = { ww: 520, y0: -40, y1: 845, panel: 845, land: 700 };   // 3D人形：全身が入る大きさ（文字の下から足まで）。cx は動きごと
function viewOf(m) {
  const def = BACK[m.key], ic = def.phase && imgCoach(m.key);
  return ic ? { ...def.frame, ...IMG_VIEW, ...(ic.view || {}) } : { ...def.frame, ...LINE_VIEW };
}
// 配置：kind = 'stage'（全画面）| 'panel'（小さな枠）| 'pip'（丸い小窓）。top = 上にあける余白（CSS px）
export function backLayout(m, kind, w, h, top = 0) {
  const def = BACK[m.key], F = viewOf(m);
  if (kind === 'pip') { const P = imgCoachPip(m.key) || def.pip, s = Math.min(w, h) / 2 / P.r; return { s, ox: w / 2 - P.cx * s, oy: h / 2 - P.cy * s }; }
  const land = w > h * 1.15, y0 = F.y0, y1 = kind === 'panel' ? F.panel : land ? F.land : F.y1, wh = y1 - y0;
  const s = Math.min(w / F.ww, (h - top) / wh);
  return { s, ox: w / 2 - F.cx * s, oy: Math.max(top, top + (h - top - wh * s) * (kind === 'panel' ? 0.5 : 0.3)) - y0 * s };
}

// 3D人形のお手本の1周の中の位置（0〜n）。n = 2 の動きは、def.start の側（右の手・右の端）が当たる瞬間を 0 にする
function cycOf(R, rf, ic, mir) {
  const n = ic.n || 1, j = Math.floor(rf);
  if (n === 1) return rf - j;
  const want = mir ? (ic.start === 'L' ? 'R' : 'L') : (ic.start || 'R');
  let k0 = -1;
  for (let k = 0; k < R.n; k++) { const sd = R.sides[k] !== 'B' ? R.sides[k] : R.dirs[k]; if (sd === want) { k0 = k; break; } }
  if (R.n !== n || k0 < 0) k0 = 0;
  return ((rf - k0) % n + n) % n;
}

/* ---------- 描く ----------
   c: 2D コンテキスト（setTransform 済みでなくてよい）
   o: { x, y, w, h: 描く箱（CSS px）, dpr, kind: 'stage' | 'panel' | 'pip', p（指定すると pAt を使わない）,
        mirror（指定すると R.side を使わない）, bg（false で背景をぬらない）, label（false で文字なし）, alpha, impact, top（文字の上の余白） } */
export function drawBack(c, R, rf, o = {}) {
  const def = BACK[R.m.key]; if (!def) return false;
  askFont(def);
  const d = o.dpr || 1, mir = o.mirror !== undefined ? o.mirror : R.side === 'L';
  // 形を決める値：phase の動きは 1回の中の位置 f（当たった瞬間 0）、それ以外は当たる場所までの近さ p
  const p = def.phase ? (o.f !== undefined ? o.f : rf - Math.floor(rf)) : clamp(o.p !== undefined ? o.p : pAt(R, rf));
  const bx = o.x || 0, by = o.y || 0, w = o.w, h = o.h, kind = o.kind || 'stage';
  // 配置：設計の座標 → 箱の中の CSS px（s 倍して ox, oy だけずらす）
  const { s, ox, oy } = o.s ? o : backLayout(R.m, kind, w, h, o.top || 0);
  const lab = o.label !== false && kind !== 'pip', F = viewOf(R.m);
  const imp = o.impact !== undefined && o.impact >= 0 && o.impact < 1 ? 1 - o.impact : 0;
  // 3D人形の画像のお手本（読みこめていれば）
  const ic = def.phase && imgCoach(R.m.key);
  if (!ic && !def.pose) return false;
  if (ic) {
    const cyc = o.f !== undefined ? o.f : cycOf(R, rf, ic, mir);
    c.save();
    c.setTransform(d, 0, 0, d, bx * d, by * d);
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    if (o.bg !== false) { c.fillStyle = ic.bg; c.fillRect(0, 0, w, h); }
    c.setTransform(d * s * (mir ? -1 : 1), 0, 0, d * s, (bx + ox + (mir ? 2 * F.cx * s : 0)) * d, (by + oy) * d);
    drawImgCoach(c, R.m.key, cyc, imp);
    c.setTransform(d, 0, 0, d, bx * d, by * d);
    if (o.bg !== false) {
      const vg = c.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = vg; c.fillRect(0, 0, w, h);
    }
    if (lab) drawLabel(c, def, ox + (mir ? 2 * F.cx - F.lx : F.lx) * s, oy, s, c.globalAlpha);
    c.restore();
    return true;
  }
  const g = kind === 'pip' ? 9 : s > 0.5 ? 4 : s > 0.3 ? 5 : 7;
  // 見える範囲（設計の座標）
  const fx = X => mir ? 2 * F.cx - X : X;
  const vx0 = (0 - ox) / s, vx1 = (w - ox) / s, win = [Math.min(fx(vx0), fx(vx1)) - g, (0 - oy) / s - g, Math.max(fx(vx0), fx(vx1)) + g, (h - oy) / s + g];
  const arm = def.pose(p);
  const { lines, occ } = trace(win, g, arm);
  c.save();
  c.setTransform(d, 0, 0, d, bx * d, by * d);
  if (o.alpha !== undefined) c.globalAlpha = o.alpha;
  if (o.bg !== false) {
    c.fillStyle = BACK_BG; c.fillRect(0, 0, w, h);
    const vg = c.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(255,255,240,0.035)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
  }
  // 体と腕（設計の座標のまま描く）
  c.setTransform(d * s * (mir ? -1 : 1), 0, 0, d * s, (bx + ox + (mir ? 2 * F.cx * s : 0)) * d, (by + oy) * d);
  // 線の太さ：こぶしのまわりは細く（参考動画でも手の線は体の線より細い）
  const NL = 5, paths = Array.from({ length: NL }, () => new Path2D()), all = new Path2D();
  const lvlAt = (x, y) => Math.round((1 - sstep(4, 30, sdFist(x, y, arm))) * (NL - 1));
  for (const L of lines) { const P = smooth(L); addVar(paths, P, L.closed, lvlAt); addPath(all, P, L.closed); }
  for (const L of occ) { const P = smooth(L); addPath(paths[0], P, false); addPath(all, P, false); }
  const lw = Math.max(LW, (kind === 'pip' ? 1.9 : 1.6) / s);
  const wOf = l => lw * (1 - FIST_THIN * l / (NL - 1));
  c.lineJoin = 'round'; c.lineCap = 'round';
  // ぼんやり光る所は1本の線で（太さを分けると、つなぎ目が明るくなるため）
  c.strokeStyle = `rgba(255,255,255,${0.05 + 0.12 * imp})`; c.lineWidth = lw * 2.6; c.stroke(all);
  c.strokeStyle = `rgba(255,255,255,${0.11 + 0.16 * imp})`; c.lineWidth = lw * 1.5; c.stroke(all);
  c.strokeStyle = INK; paths.forEach((P, l) => { c.lineWidth = wOf(l); c.stroke(P); });
  // 手の中の線（指など）。奥にあって体のかげになる所は描かない
  const a0 = o.alpha !== undefined ? o.alpha : 1;
  for (const q of fistDetail(arm)) {
    const fp = new Path2D();
    for (const run of q.runs) run.forEach(([X, Y], i) => { if (i) fp.lineTo(X, Y); else fp.moveTo(X, Y); });
    const wd = wOf(NL - 1) * (q.thin ? 0.8 : 1);
    c.globalAlpha = a0 * q.a;
    c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = wd * 2; c.stroke(fp);
    c.strokeStyle = INK; c.lineWidth = wd; c.stroke(fp);
  }
  c.globalAlpha = a0;
  // 動きの名前
  if (lab) {
    c.setTransform(d, 0, 0, d, bx * d, by * d);
    const lx = mir ? 2 * F.cx - F.lx : F.lx;
    drawLabel(c, def, ox + lx * s, oy, s, c.globalAlpha);
  }
  c.restore();
  return true;
}

// 手の中の線を設計の座標にして、体のかげになる所を切る → [{ a, runs: [[[x,y],…],…] }]
function fistDetail(A) {
  const hide = A.zC > ZOCC, out = [];
  for (const q of fistLines(A)) {
    const P = q.pts.map(([a, b]) => [A.C[0] + a * A.v[0] + b * A.u[0], A.C[1] + a * A.v[1] + b * A.u[1]]);
    if (!hide) { out.push({ a: q.a, runs: [P] }); continue; }
    const runs = []; let cur = null;
    for (let i = 0; i < P.length - 1; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[i + 1], n = Math.max(1, Math.ceil(len(x1 - x0, y1 - y0) / 3));
      for (let k = 0; k < n; k++) {
        const ta = k / n, tb = (k + 1) / n, xa = lerp(x0, x1, ta), ya = lerp(y0, y1, ta), xb = lerp(x0, x1, tb), yb = lerp(y0, y1, tb);
        if (sdBodyA((xa + xb) / 2, (ya + yb) / 2, A) < 0) { cur = null; continue; }
        if (!cur) { cur = [[xa, ya]]; runs.push(cur); }
        cur.push([xb, yb]);
      }
    }
    if (runs.length) out.push({ a: q.a, runs });
  }
  return out;
}

// 調べる用：その p のときの腕の形と、輪郭の線（設計の座標）
export function backDebug(key, p, win = [-480, -160, 1040, 1300], g = 4) {
  const def = BACK[key], arm = def.pose(p), T = trace(win, g, arm);
  const lines = T.lines.map(L => ({ P: Array.from(smooth(L)), closed: L.closed })), occ = T.occ.map(L => ({ P: Array.from(smooth(L)), closed: false }));
  const fl = fistDetail(arm).flatMap(q => q.runs.map(r => ({ a: q.a, pts: r })));
  return { arm, lines, occ, fl };
}
