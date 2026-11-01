/* =========================================================================
   IMMERSE FIT — imgcoach.js
   3D人形のお手本（Canva で作った画像）。1回の中の位置（当たった瞬間 = 0）で、ポーズの画像をつないで動かします。
   画像は coach/ に置きます。読みこめるまでは、ふつうのお手本のままです。画像のふちは bg の色へなじませてあります。
   2つの作り方があります：
   ・hit1（おろす）：体ごとの画像（コマ）を順に切りかえる。どのコマも体・頭・左腕・背景は同じ1枚から作ってある
   ・ほかの動き：左右対称の基準の1枚（figdata.js の FIG）に、右腕の「層」を重ねる。左腕は右の層を左右反転して使う。
     → 右腕のポーズだけで、片手・両手・交互のどれも作れて、左右が同時に動ける。
     体ごと変わる動き（ひねる・たおす など）は全身の画像（FIG.F）を切りかえる（左は左右反転）
   置き方：画像の頭の位置を、白い線のお手本の頭（設計の座標）に合わせる → 文字・小窓・横長の切り方はそのまま使える
   ========================================================================= */
import { FIG } from './figdata.js';
export const COACH_DIR = 'coach/';

/* ---------- 動きの書き方 ----------
   tl = [[u, ポーズ, つなぎ], …]：u でそのポーズになる。つなぎ = 前のポーズから重ねて切りかえる長さ（その区間に対する割合。1 = 区間ぜんぶ）
   ポーズ：右腕の層（FIG.L）か全身（FIG.F）の名前。名前のあとに ~ をつけると左右反転。'rest' は基準のまま
   n = 1 周の回数（2 = 右と左で1周：u = 0 が start の側の当たる瞬間、u = 0.5 が反対の側）
   トラック：{ tl, ph: 'f'（1回で1周）| 'c'（n 回で1周）| 'c+'（半周おくれ）, mir（左右反転）, full（全身の画像） } */
const A = (tl, o = {}) => ({ tl, ph: 'c', ...o });                       // 右腕
const AL = (tl, o = {}) => ({ tl, ph: 'c', mir: true, ...o });           // 左腕（右の流れを左右反転して、そのまま）
const ALT = tl => [A(tl), AL(tl, { ph: 'c+' })];                         // 交互：左は半周おくれ
const BOTH = tl => [A(tl), AL(tl)];                                      // 両手：同じ動き
const FULL = tl => [{ tl, ph: 'c', full: true }];                        // 全身の画像
const fig = (n, tracks, o = {}) => ({ fig: FIG, w: FIG.w, h: FIG.h, head: FIG.head, bg: FIG.bg, n, tracks, view: { cx: 271, y0: 40, y1: 905, panel: 905, land: 885, ww: 560 }, pip: { cx: 271, cy: 480, r: 395 }, ...o });

// 右腕の流れ（u：当たった瞬間 = 0）。交互（n = 2）は 2回で1周：u = 0 で右が当たり、u = 0.5 で左が当たる
const TL = {
  // おろす（交互）：当たる → 耳の横を通って上へ → 上で待つ → 一気に振りおろす
  hammer: [[0, 'chop'], [0.06, 'chop'], [0.2, 'ear', 0.8], [0.34, 'hi', 0.8], [0.5, 'up', 0.6], [0.8, 'up'], [0.9, 'hi', 1], [1, 'chop', 1]],
  slam: [[0, 'chop'], [0.1, 'chop'], [0.3, 'ear', 0.8], [0.45, 'hi', 0.8], [0.58, 'up', 0.6], [0.8, 'up'], [0.9, 'hi', 1], [1, 'chop', 1]],
  drum: [[0, 'drum'], [0.08, 'drum'], [0.28, 'guard', 0.8], [0.8, 'guard'], [1, 'drum', 1]],
  // パンチ（交互）：のばす → すぐ引く → かまえて待つ → まっすぐ前へ
  punch: [[0, 'punch'], [0.06, 'punch'], [0.2, 'guard', 0.8], [0.86, 'guard'], [1, 'punch', 1]],
  punch1: [[0, 'punch'], [0.1, 'punch'], [0.32, 'guard', 0.8], [0.8, 'guard'], [1, 'punch', 1]],
  upper: [[0, 'upp'], [0.06, 'upp'], [0.22, 'guard', 0.8], [0.62, 'guard'], [0.78, 'upl', 0.8], [0.88, 'upl'], [1, 'upp', 1]],
  punchup: [[0, 'up'], [0.06, 'up'], [0.18, 'hi', 0.8], [0.32, 'low', 0.8], [0.84, 'low'], [0.93, 'hi', 1], [1, 'up', 1]],
  // おす：手のひらで前へ
  push: [[0, 'push'], [0.1, 'push'], [0.4, 'pushc', 0.8], [0.72, 'pushc'], [1, 'push', 1]],
  pushalt: [[0, 'push'], [0.06, 'push'], [0.25, 'pushc', 0.8], [0.84, 'pushc'], [1, 'push', 1]],
  // ひく：前へのばして、ひじを後ろへ
  row: [[0, 'row'], [0.1, 'row'], [0.45, 'punch', 0.8], [0.66, 'punch'], [1, 'row', 1]],
  // ひっぱる（交互）：上でつかんで、肩まで引きおろす。引いている間に、反対の手は上へのびる
  rope: [[0, 'low'], [0.07, 'low'], [0.18, 'ear', 0.8], [0.28, 'hi', 0.8], [0.38, 'up', 0.8], [0.5, 'up'], [0.62, 'hi', 0.85], [0.78, 'ear', 0.85], [0.93, 'low', 0.85], [1, 'low']],
  // 紐を引っ張る（片手）：引きおろす（当たる）→ 少し止める → 耳の横を通って上へのばす → 上でつかむ → 一気に引きおろす
  cord: [[0, 'low'], [0.1, 'low'], [0.22, 'ear', 0.8], [0.34, 'hi', 0.8], [0.46, 'up', 0.8], [0.72, 'up'], [0.8, 'hi', 1], [0.9, 'ear', 1], [1, 'low', 1]],
  // もちあげる：肩から、まっすぐ上へ
  press: [[0, 'up'], [0.08, 'up'], [0.25, 'hi', 0.8], [0.45, 'low', 0.8], [0.74, 'low'], [0.88, 'hi', 1], [1, 'up', 1]],
  climb: [[0, 'up'], [0.06, 'up'], [0.2, 'hi', 0.8], [0.34, 'ear', 0.8], [0.5, 'low', 0.8], [0.72, 'low'], [0.86, 'hi', 1], [1, 'up', 1]],
  ylift: [[0, 'y'], [0.1, 'y'], [0.32, 'side', 0.8], [0.52, 'rest', 0.8], [0.64, 'rest'], [0.82, 'side', 1], [1, 'y', 1]],
  // まわす：前（当たる）→ 左 → 手前 → 右 → 前
  stir: [[0, 'swf'], [0.25, 'stl', 1], [0.5, 'drum', 1], [0.75, 'str', 1], [1, 'swf', 1]],
  // ふく：右の端（u = 0）→ まん中 → 左の端（u = 0.5）
  wipe: [[0, 'wpr'], [0.05, 'wpr'], [0.25, 'pushc', 1], [0.45, 'wpl', 1], [0.55, 'wpl'], [0.75, 'pushc', 1], [0.95, 'wpr', 1], [1, 'wpr']],
  clap: [[0, 'clapin'], [0.08, 'clapin'], [0.42, 'side', 0.8], [0.6, 'side'], [1, 'clapin', 1]],
  clapup: [[0, 'clapup'], [0.08, 'clapup'], [0.42, 'y', 0.8], [0.6, 'y'], [1, 'clapup', 1]],
  // なげる：はなす（前）→ 下ろす → うしろへ大きく引く → 前へ
  throw: [[0, 'chop'], [0.1, 'chop'], [0.3, 'rest', 0.8], [0.5, 'rest'], [0.7, 'throwb', 0.8], [0.86, 'throwb'], [1, 'chop', 1]],
  // ---- 脚（右脚の層。左は左右反転） ----
  knee: [[0, 'knee'], [0.08, 'knee'], [0.28, 'rest', 1], [0.8, 'rest'], [1, 'knee', 1]],
  // 行進・ジョグ（足が着いた瞬間 = 当たる）：右足は u = 0 で着地、u = 0.75 でいちばん上
  march: [[0, 'rest'], [0.5, 'rest'], [0.75, 'knee', 1], [1, 'rest', 1]],
  heel: [[0, 'rest'], [0.5, 'rest'], [0.75, 'heel', 1], [1, 'rest', 1]],
  // 腕を振る（右腕：右足が上がる時にうしろ、左足が上がる時に前）
  swing: [[0, 'swf'], [0.25, 'swf'], [0.5, 'rest', 1], [0.75, 'swb', 1], [1, 'swf', 1]],
  kick: [[0, 'kickf'], [0.08, 'kickf'], [0.25, 'rest', 1], [0.82, 'rest'], [0.92, 'knee', 1], [1, 'kickf', 1]],
  skick: [[0, 'kicks'], [0.08, 'kicks'], [0.25, 'rest', 1], [0.82, 'rest'], [0.92, 'knee', 1], [1, 'kicks', 1]],
  // 横へステップ：右へ動く前に右足を出す
  step: [[0, 'rest'], [0.6, 'rest'], [0.74, 'stepo', 1], [0.94, 'rest', 1], [1, 'rest']],
};
// 体ごと動く量：[u, dx, dy]（設計の単位。dy はマイナスが上）
const MV = {
  side: (a = 40) => ({ ph: 'c', move: true, tl: [[0, a, 0], [0.2, a, 0], [0.45, -a, 0], [0.7, -a, 0], [0.95, a, 0], [1, a, 0]] }),
  hopSide: (a = 50, h = 45) => ({ ph: 'c', move: true, tl: [[0, a, 0], [0.12, a, 0], [0.25, 0, -h], [0.38, -a, 0], [0.62, -a, 0], [0.75, 0, -h], [0.88, a, 0], [1, a, 0]] }),
  hop: (h = 40) => ({ ph: 'c', move: true, tl: [[0, 0, 0], [0.1, 0, 0], [0.25, 0, -h], [0.4, 0, 0], [0.6, 0, 0], [0.75, 0, -h], [0.9, 0, 0], [1, 0, 0]] }),
  rise: (h = 16) => ({ ph: 'c', move: true, tl: [[0, 0, -h], [0.15, 0, -h], [0.45, 0, 0], [0.65, 0, 0], [1, 0, -h]] }),   // つま先立ち（当たる瞬間がいちばん高い）
  peak: (h = 100) => ({ ph: 'c', move: true, tl: [[0, 0, -h], [0.18, 0, -h * 0.25], [0.28, 0, 0], [0.82, 0, 0], [0.92, 0, -h * 0.7], [1, 0, -h]] }),
};

export const IMG_COACH = {
  hit1: {
    w: 881, h: 1179, head: [0.4351, 0.3254, 0.1963], bg: '#3a3531', bob: 6, n: 1, view: { cx: 292 },
    poses: {
      hit: 'chop-hit.jpg', recoil: 'chop-recoil.jpg', earcock: 'chop-earcock.jpg', ear: 'chop-ear.jpg', lift: 'chop-lift.jpg',
      cock: 'chop-cock.jpg', rise: 'chop-rise.jpg', swing: 'chop-swing.jpg', dn30: 'chop-dn30.jpg', dn45: 'chop-dn45.jpg', dn70: 'chop-dn70.jpg',
    },
    // 1回（当たる → 次に当たる）の流れ。上げるのは1回、振りおろすのも1回（画面の奥へ）
    tl: [
      [0, 'hit'],                // 当たる（音）
      [0.12, 'hit'],             // 当たったまま少し止まる
      [0.17, 'recoil', 0.45],    // ひじを曲げて引きもどす
      [0.23, 'earcock', 0.45],   // こぶしを耳の横へ
      [0.29, 'ear', 0.45],
      [0.38, 'lift', 0.45],      // 頭の上へ
      [0.47, 'cock', 0.45],
      [0.58, 'rise', 0.5],       // 上げきる
      [0.85, 'rise'],            // 上で止める
      [0.885, 'swing', 0.8],     // 振りおろす（画面の奥へ。速いので重ねて切りかえる）
      [0.915, 'dn30', 0.8],
      [0.945, 'dn45', 0.8],
      [0.972, 'dn70', 0.8],
      [1, 'hit', 0.8],
    ],
    fist: [0.668, 0.453],                // 当たる瞬間のこぶし（画像の中の位置）
    pip: { cx: 318, cy: 405, r: 352 },   // 丸い小窓：上げたこぶしから半ズボンまで入るように（設計の座標）
  },
  // ---- 腕 ----
  hitalt: fig(2, ALT(TL.hammer), { start: 'R', hit: [['chop'], ['chop~']] }),
  drum: fig(2, ALT(TL.drum), { start: 'R', hit: [['drum'], ['drum~']] }),
  chopa: fig(2, ALT(TL.hammer), { start: 'R', hit: [['chop'], ['chop~']] }),
  slam: fig(1, BOTH(TL.slam), { hit: [['chop', 'chop~']] }),
  punch: fig(2, ALT(TL.punch), { start: 'R', hit: [['punch'], ['punch~']] }),
  punch1: fig(1, [A(TL.punch1), AL([[0, 'guard']])], { hit: [['punch']] }),
  upper: fig(2, ALT(TL.upper), { start: 'R', hit: [['upp'], ['upp~']] }),
  punchup: fig(2, ALT(TL.punchup), { start: 'R', hit: [['up'], ['up~']] }),
  push: fig(1, BOTH(TL.push), { hit: [['push', 'push~']] }),
  pushalt: fig(2, ALT(TL.pushalt), { start: 'R', hit: [['push'], ['push~']] }),
  row: fig(1, BOTH(TL.row), { hit: [['row', 'row~']] }),
  cord: fig(1, [A(TL.cord)], { hit: [['low']] }),
  rope: fig(2, ALT(TL.rope), { start: 'R', hit: [['low'], ['low~']] }),
  press: fig(1, BOTH(TL.press), { hit: [['up', 'up~']] }),
  climb: fig(2, ALT(TL.climb), { start: 'R', hit: [['up'], ['up~']] }),
  ylift: fig(1, BOTH(TL.ylift), { hit: [['y', 'y~']] }),
  stir1: fig(1, [A(TL.stir)], { hit: [['str']] }),
  wipe1: fig(2, [A(TL.wipe)], { start: 'R', hit: [['wpr'], ['wpl']] }),
  clap: fig(1, BOTH(TL.clap), { hit: [['clapin', 'clapin~']] }),
  clapup: fig(1, BOTH(TL.clapup), { hit: [['clapup']] }),
  throw: fig(1, [A(TL.throw)], { hit: [['chop']] }),
  // ---- 全身の画像で（体ごと変わる） ----
  stir2: fig(1, FULL([[0, 'st2f'], [0.25, 'st2r~', 1], [0.5, 'w2c', 1], [0.75, 'st2r', 1], [1, 'st2f', 1]]), { hit: [['st2f']] }),
  wipe2: fig(2, FULL([[0, 'w2r'], [0.05, 'w2r'], [0.25, 'w2c', 1], [0.45, 'w2r~', 1], [0.55, 'w2r~'], [0.75, 'w2c', 1], [0.95, 'w2r', 1], [1, 'w2r']]), { start: 'R', hit: [['w2r'], ['w2r~']] }),
  // ---- 上半身 ----
  twist: fig(2, FULL([[0, 'twr'], [0.06, 'twr'], [0.25, 'twr0', 1], [0.44, 'twr~', 1], [0.56, 'twr~'], [0.75, 'twr0', 1], [0.94, 'twr', 1], [1, 'twr']]), { start: 'R' }),
  sbend: fig(2, FULL([[0, 'sbr'], [0.06, 'sbr'], [0.17, 'sbm', 0.8], [0.25, 'rest', 0.8], [0.33, 'sbm~', 0.8], [0.44, 'sbr~', 0.8], [0.56, 'sbr~'], [0.67, 'sbm~', 0.8], [0.75, 'rest', 0.8], [0.83, 'sbm', 0.8], [0.94, 'sbr', 0.8], [1, 'sbr']]), { start: 'R' }),
  woodchop: fig(1, FULL([[0, 'wcdn'], [0.1, 'wcdn'], [0.35, 'wcmid', 0.7], [0.6, 'wcup', 0.7], [0.84, 'wcup'], [0.93, 'wcmid', 0.8], [1, 'wcdn', 0.8]]), { hit: [['wcdn']] }),
  bentrow: fig(1, FULL([[0, 'brup'], [0.12, 'brup'], [0.5, 'brdn', 0.5], [0.72, 'brdn'], [1, 'brup', 0.5]]), { hit: [['brup', 'brup~']] }),
  halo: fig(1, FULL([[0, 'haf'], [0.25, 'har~', 1], [0.5, 'hab', 1], [0.75, 'har', 1], [1, 'haf', 1]]), { hit: [['haf']] }),
  // よける：しゃがむ（左へ）→ 立つ → しゃがむ（右へ）。立っている間はかまえ
  bob: fig(2, [...FULL([[0, 'squat'], [0.1, 'squat'], [0.25, 'rest', 1], [0.4, 'squat', 1], [0.6, 'squat'], [0.75, 'rest', 1], [0.9, 'squat', 1], [1, 'squat']]), A([[0, 'guard']]), AL([[0, 'guard']]),
    { ph: 'c', move: true, tl: [[0, -30, 0], [0.12, -30, 0], [0.38, 30, 0], [0.62, 30, 0], [0.88, -30, 0], [1, -30, 0]] }]),
  // ---- 下半身 ----
  squat: fig(1, FULL([[0, 'squat'], [0.12, 'squat'], [0.45, 'rest', 0.7], [0.62, 'rest'], [1, 'squat', 0.7]])),
  wsquat: fig(1, FULL([[0, 'squat'], [0.12, 'squat'], [0.45, 'rest', 0.7], [0.62, 'rest'], [1, 'squat', 0.7]])),
  lunge: fig(2, FULL([[0, 'lunge'], [0.1, 'lunge'], [0.25, 'rest', 1], [0.4, 'lunge~', 1], [0.6, 'lunge~'], [0.75, 'rest', 1], [0.9, 'lunge', 1], [1, 'lunge']])),
  curtsy: fig(2, FULL([[0, 'curtsy'], [0.1, 'curtsy'], [0.25, 'rest', 1], [0.4, 'curtsy~', 1], [0.6, 'curtsy~'], [0.75, 'rest', 1], [0.9, 'curtsy', 1], [1, 'curtsy']])),
  slunge: fig(2, FULL([[0, 'slunge'], [0.1, 'slunge'], [0.25, 'rest', 1], [0.4, 'slunge~', 1], [0.6, 'slunge~'], [0.75, 'rest', 1], [0.9, 'slunge', 1], [1, 'slunge']]), { start: 'R' }),
  knee: fig(2, ALT(TL.knee), { start: 'R', hit: [['knee'], ['knee~']] }),
  hknee: fig(2, ALT(TL.knee), { start: 'R', hit: [['knee'], ['knee~']] }),
  march: fig(2, [...ALT(TL.march), ...[A(TL.swing, { ph: 'c+' }), AL(TL.swing)]], { start: 'R' }),
  jog: fig(2, [...ALT(TL.heel), ...[A(TL.swing, { ph: 'c+' }), AL(TL.swing)], MV.hop(18)], { start: 'R' }),
  heel: fig(2, ALT(TL.heel), { start: 'R' }),
  kick: fig(2, ALT(TL.kick), { start: 'R', hit: [['kickf'], ['kickf~']] }),
  kick1: fig(1, [A(TL.kick)], { hit: [['kickf']] }),
  skick: fig(2, ALT(TL.kick), { start: 'R', hit: [['kickf'], ['kickf~']] }),   // うしろから見ると、横へ上げた脚（前キックと同じ画像）
  calf: fig(1, [MV.rise(16)]),   // つま先立ち：体ごと少し上がる
  steptouch: fig(2, [...ALT(TL.step), MV.side(40)], { start: 'R' }),
  shuffle: fig(2, [...FULL([[0, 'squat']]), MV.side(70)], { start: 'R' }),
  skaterstep: fig(2, [AL([[0, 'heel'], [0.15, 'heel'], [0.3, 'rest', 1], [1, 'rest']]), A([[0, 'rest'], [0.35, 'rest'], [0.5, 'heel', 1], [0.65, 'heel'], [0.8, 'rest', 1], [1, 'rest']]), MV.side(55)], { start: 'R' }),   // 右へ：右足で立って左足をうしろへ
  sqjump: fig(1, [...FULL([[0, 'rest'], [0.25, 'rest'], [0.4, 'squat', 1], [0.75, 'squat'], [0.88, 'rest', 1], [1, 'rest']]), MV.peak(100)]),
  tuck: fig(1, [...FULL([[0, 'rest'], [0.15, 'rest'], [0.3, 'rest'], [0.45, 'squat', 1], [0.72, 'squat'], [0.85, 'rest', 1], [1, 'rest']]), ...BOTH([[0, 'knee'], [0.12, 'knee'], [0.25, 'rest', 1], [0.88, 'rest'], [1, 'knee', 1]]), MV.peak(120)]),   // 空中で両ひざを上げる
  skihop: fig(2, [MV.hopSide(45, 40)], { start: 'R' }),
  skater: fig(2, [AL([[0, 'heel'], [0.15, 'heel'], [0.3, 'rest', 1], [1, 'rest']]), A([[0, 'rest'], [0.35, 'rest'], [0.5, 'heel', 1], [0.65, 'heel'], [0.8, 'rest', 1], [1, 'rest']]), MV.hopSide(80, 60)], { start: 'R' }),
  hopknee: fig(2, [...ALT(TL.knee), MV.hop(35)], { start: 'R', hit: [['knee'], ['knee~']] }),
  sqknee: fig(2, [...FULL([[0, 'squat'], [0.1, 'squat'], [0.25, 'rest', 1], [0.4, 'squat', 1], [0.6, 'squat'], [0.75, 'rest', 1], [0.9, 'squat', 1], [1, 'squat']]),
    A([[0, 'rest'], [0.15, 'rest'], [0.25, 'knee', 1], [0.35, 'rest', 1], [1, 'rest']]), AL([[0, 'rest'], [0.65, 'rest'], [0.75, 'knee', 1], [0.85, 'rest', 1], [1, 'rest']])]),
  // ---- 全身（脚＋腕） ----
  jack: fig(1, [...BOTH([[0, 'y'], [0.12, 'y'], [0.45, 'rest', 1], [0.6, 'rest'], [0.88, 'y', 1], [1, 'y']]), ...BOTH([[0, 'stepo'], [0.12, 'stepo'], [0.45, 'rest', 1], [0.6, 'rest'], [0.88, 'stepo', 1], [1, 'stepo']]), MV.hop(45)], { hit: [['y', 'y~']] }),   // 手と足を同時に開く（腕の層＋脚の層）
  stepjack: fig(2, [A([[0, 'stepo'], [0.15, 'stepo'], [0.3, 'rest', 1], [1, 'rest']]), AL([[0, 'rest'], [0.35, 'rest'], [0.5, 'stepo', 1], [0.65, 'stepo'], [0.8, 'rest', 1], [1, 'rest']]),
    A([[0, 'up'], [0.15, 'up'], [0.25, 'rest', 1], [0.35, 'up', 1], [0.65, 'up'], [0.75, 'rest', 1], [0.85, 'up', 1], [1, 'up']], { arm: 1 }), AL([[0, 'up'], [0.15, 'up'], [0.25, 'rest', 1], [0.35, 'up', 1], [0.65, 'up'], [0.75, 'rest', 1], [0.85, 'up', 1], [1, 'up']], { arm: 1 })], { hit: [['up', 'up~']] }),
  starjump: fig(1, [...FULL([[0, 'rest'], [0.25, 'rest'], [0.45, 'squat', 1], [0.72, 'squat'], [0.85, 'rest', 1], [1, 'rest']]), ...BOTH([[0, 'y'], [0.12, 'y'], [0.3, 'rest', 1], [0.86, 'rest'], [1, 'y', 1]]), ...BOTH([[0, 'stepo'], [0.12, 'stepo'], [0.3, 'rest', 1], [0.86, 'rest'], [1, 'stepo', 1]]), MV.peak(120)], { hit: [['y', 'y~']] }),
  sqpress: fig(1, [...FULL([[0, 'rest'], [0.12, 'rest'], [0.45, 'squat', 0.8], [0.62, 'squat'], [1, 'rest', 0.8]]), ...BOTH([[0, 'up'], [0.12, 'up'], [0.3, 'hi', 1], [0.42, 'low', 1], [0.8, 'low'], [0.9, 'hi', 1], [1, 'up', 1]])], { hit: [['up', 'up~']] }),
  sqpunch: fig(2, [...FULL([[0, 'rest'], [0.1, 'rest'], [0.25, 'squat', 1], [0.35, 'squat'], [0.5, 'rest', 1], [0.6, 'rest'], [0.75, 'squat', 1], [0.85, 'squat'], [1, 'rest', 1]]),
    ...ALT([[0, 'punch'], [0.08, 'punch'], [0.2, 'guard', 1], [0.9, 'guard'], [1, 'punch', 1]])], { start: 'R', hit: [['punch'], ['punch~']] }),
  marchpunch: fig(2, [A(TL.march, { ph: 'c+' }), AL(TL.march, { ph: 'c' }), ...ALT([[0, 'punch'], [0.08, 'punch'], [0.25, 'guard', 1], [0.88, 'guard'], [1, 'punch', 1]])], { start: 'R', hit: [['punch'], ['punch~']] }),
  kneeclap: fig(1, [A([[0, 'knee'], [0.12, 'knee'], [0.3, 'rest', 1], [0.85, 'rest'], [1, 'knee', 1]]), ...BOTH(TL.clap)], { hit: [['clapin', 'clapin~']] }),
  sqslam: fig(1, [...FULL([[0, 'squat'], [0.12, 'squat'], [0.45, 'rest', 0.8], [0.62, 'rest'], [1, 'squat', 0.8]]), ...BOTH([[0, 'up']])]),
  lungepunch: fig(2, [...FULL([[0, 'lungep'], [0.1, 'lungep'], [0.25, 'rest', 1], [0.4, 'lungep~', 1], [0.6, 'lungep~'], [0.75, 'rest', 1], [0.9, 'lungep', 1], [1, 'lungep']]), ...BOTH([[0, 'guard']])], { start: 'R', hit: [['lungep'], ['lungep~']] }),   // 立っている間はかまえ
  lungelift: fig(2, [...FULL([[0, 'rest'], [0.1, 'rest'], [0.25, 'lungeup', 1], [0.35, 'lungeup'], [0.5, 'rest', 1], [0.6, 'rest'], [0.75, 'lungeup~', 1], [0.85, 'lungeup~'], [1, 'rest', 1]]), ...BOTH([[0, 'up'], [0.06, 'up'], [0.16, 'low', 1], [0.34, 'low'], [0.44, 'up', 1], [0.56, 'up'], [0.66, 'low', 1], [0.84, 'low'], [0.94, 'up', 1], [1, 'up']])], { hit: [['up', 'up~'], ['up', 'up~']] }),
  stepclap: fig(2, [...ALT(TL.step), MV.side(40), ...BOTH([[0, 'clapin'], [0.08, 'clapin'], [0.25, 'side', 1], [0.42, 'clapin', 1], [0.58, 'clapin'], [0.75, 'side', 1], [0.92, 'clapin', 1], [1, 'clapin']])], { hit: [['clapin', 'clapin~'], ['clapin', 'clapin~']] }),
  stepwipe: fig(2, [...FULL([[0, 'w2r'], [0.05, 'w2r'], [0.25, 'w2c', 1], [0.45, 'w2r~', 1], [0.55, 'w2r~'], [0.75, 'w2c', 1], [0.95, 'w2r', 1], [1, 'w2r']]), MV.side(45)], { start: 'R', hit: [['w2r'], ['w2r~']] }),
  sqthrow: fig(1, [...FULL([[0, 'rest'], [0.2, 'rest'], [0.42, 'squat', 1], [0.62, 'squat'], [0.78, 'rest', 1], [1, 'rest']]), A([[0, 'chop'], [0.1, 'chop'], [0.3, 'rest', 0.8], [0.8, 'rest'], [0.9, 'throwb', 1], [1, 'chop', 1]])], { hit: [['chop']] }),
  kickpunch: fig(2, [...ALT(TL.kick), ...[A([[0, 'guard'], [0.4, 'guard'], [0.5, 'punch', 1], [0.6, 'punch'], [0.75, 'guard', 1], [1, 'guard']]), AL([[0, 'punch'], [0.1, 'punch'], [0.25, 'guard', 1], [0.9, 'guard'], [1, 'punch', 1]])]], { start: 'R', hit: [['kickf', 'punch~'], ['kickf~', 'punch']] }),
  calfpress: fig(1, [...BOTH([[0, 'up'], [0.12, 'up'], [0.3, 'hi', 1], [0.45, 'low', 1], [0.62, 'low'], [0.82, 'hi', 1], [1, 'up', 1]]), MV.rise(16)], { hit: [['up', 'up~']] }),
};
// 当たる瞬間の輪：その名前のポーズで、手（足）のある所（FIG.P）

// まだ作っていない全身のポーズは、近いポーズで代わりに（作ったら自動でそちらを使う）
const ALIAS = { curtsy: 'lunge', lungep: 'lunge', lungeup: 'lunge' };
for (const [a, b] of Object.entries(ALIAS)) if (!FIG.F[a] && FIG.F[b]) { FIG.F[a] = FIG.F[b]; if (FIG.FH && FIG.FH[b]) FIG.FH[a] = FIG.FH[b]; }
// 画像がまだそろっていない動きは使わない（白い線・ふつうのお手本のまま）
const poseOk = p => { p = p.endsWith('~') ? p.slice(0, -1) : p; return p === 'rest' || !!FIG.L[p] || !!FIG.F[p]; };
for (const [k, d] of Object.entries(IMG_COACH)) if (d.fig && !d.tracks.every(T => T.move || T.tl.every(([, p]) => poseOk(p)))) delete IMG_COACH[k];

// 設計の座標での頭（backcoach.js の HEAD と同じ所）と、人形の頭の大きさ
const HEAD_X = 271, HEAD_Y = 333, HEAD_R = 110;

/* ---------- 読みこみ ---------- */
const files = new Map();   // ファイル → { img, ok, bad }
function file(name) {
  let e = files.get(name);
  if (e || typeof Image === 'undefined') return e || null;
  const img = new Image(); img.decoding = 'async';
  e = { img, ok: false, bad: false };
  files.set(name, e);
  img.addEventListener('load', () => { const ok = () => { e.ok = true; }; if (img.decode) img.decode().then(ok, ok); else ok(); });   // 描く前に展開しておく（最初の1コマでかくつかない）
  img.addEventListener('error', () => { e.bad = true; console.warn('[coach] 読み込めません', name); });
  img.src = COACH_DIR + name;
  return e;
}
const bare = p => p.endsWith('~') ? p.slice(0, -1) : p;
const fileOf = (F, p) => { p = bare(p); return p === 'rest' ? null : F.L[p] ? F.L[p][0] : F.F[p] || null; };
// その動きに使うファイル
function filesOf(def) {
  if (!def.fig) return Object.values(def.poses);
  const out = new Set([def.fig.base]);
  for (const T of def.tracks) if (!T.move) for (const [, p] of T.tl) { const f = fileOf(def.fig, p); if (f) out.add(f); }
  return [...out];
}
const okOf = new Map();
function ready(key) {
  if (okOf.get(key)) return true;
  const def = IMG_COACH[key]; if (!def) return false;
  let ok = true;
  for (const n of filesOf(def)) { const e = file(n); if (!e || !e.ok) ok = false; }
  if (ok) okOf.set(key, true);
  return ok;
}
// 画像のお手本が使えるとき、その定義を返す（まだなら読みこみを始めて null）
export function imgCoach(key) { const def = IMG_COACH[key]; return def && ready(key) ? def : null; }
export const hasImgCoach = key => !!IMG_COACH[key];
export const preloadImgCoach = key => { if (IMG_COACH[key]) ready(key); };
export const imgCoachPip = key => (imgCoach(key) || {}).pip || null;
const imOf = name => files.get(name).img;

/* ---------- 置き方（設計の座標） ---------- */
export function imgBox(def) {
  const W = HEAD_R / def.head[2], H = W * def.h / def.w;
  return { x: HEAD_X - def.head[0] * W, y: HEAD_Y - def.head[1] * H, w: W, h: H };
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// u の時のポーズ：[[ポーズ, 重み], …]（1つ目をそのまま描き、2つ目を重みの濃さで重ねる）
export function posesAt(def, f, soft = 1) {
  const tl = def.tl, n = tl.length;
  f -= Math.floor(f);
  let i = 0; while (i + 1 < n && f >= tl[i + 1][0]) i++;
  const A = tl[i], B = tl[Math.min(i + 1, n - 1)];
  if (B === A || B[1] === A[1]) return [[A[1], 1]];
  const u = (f - A[0]) / Math.max(1e-6, B[0] - A[0]), b = (B[2] === undefined ? 0.5 : B[2]) * soft;
  const w = b >= 1 ? u : sstep(1 - b, 1, u);
  return w > 0.001 ? [[A[1], 1], [B[1], w]] : [[A[1], 1]];
}
// 当たった瞬間に体が少し沈む（設計の単位）
const bobAt = (f, amp) => { f -= Math.floor(f); return amp && f < 0.09 ? amp * Math.pow(1 - f / 0.09, 2) : 0; };
// トラックの中の位置 u（cyc = 1周の中の位置 0〜n）
function uOf(T, cyc, n) {
  if (T.ph === 'f') return cyc - Math.floor(cyc);
  const c = ((cyc % n) + n) % n;
  return T.ph === 'c+' ? ((c + n / 2) / n) % 1 : c / n;
}

/* ---------- 重ねる ----------
   2つのポーズの間は、別のキャンバスで「A × (1−w) ＋ B × w」を作ってから重ねる（足し算の合成 'lighter'）。
   こうすると基準の腕が半分すけて見えることがない（全身の画像どうしを重ねたのと同じになる） */
let off = null;
function offCanvas(w, h) {
  if (!off) { off = document.createElement('canvas'); off.width = w + 8; off.height = h + 8; }
  else if (off.width < w || off.height < h) { off.width = Math.max(off.width, w); off.height = Math.max(off.height, h); }
  return off;
}
// 左右反転して描く（軸 ax のまわり）
function mirrored(c, on, ax, fn) { if (!on) { fn(); return; } c.save(); c.translate(2 * ax, 0); c.scale(-1, 1); fn(); c.restore(); }
function drawLayer(c, F, name, B, k, dy, a, ax) {
  name = name || 'rest'; if (bare(name) === 'rest' || a <= 0.002) return;
  const [fn, x, y, w, h] = F.L[bare(name)], a0 = c.globalAlpha;
  c.globalAlpha = a0 * Math.min(1, a);
  mirrored(c, name.endsWith('~'), ax, () => c.drawImage(imOf(fn), B.x + x * k, B.y + y * k + dy, w * k, h * k));
  c.globalAlpha = a0;
}
function drawArm(c, F, ps, B, k, dy, ax) {
  if (ps.length === 1) { drawLayer(c, F, ps[0][0], B, k, dy, 1, ax); return; }
  const [[pa], [pb, w]] = ps;
  if (bare(pa) === 'rest') { drawLayer(c, F, pb, B, k, dy, w, ax); return; }
  if (bare(pb) === 'rest') { drawLayer(c, F, pa, B, k, dy, 1 - w, ax); return; }
  if (pa.endsWith('~') !== pb.endsWith('~')) { drawLayer(c, F, pa, B, k, dy, 1 - w, ax); drawLayer(c, F, pb, B, k, dy, w, ax); return; }
  const LA = F.L[bare(pa)], LB = F.L[bare(pb)];
  const x0 = Math.min(LA[1], LB[1]), y0 = Math.min(LA[2], LB[2]), x1 = Math.max(LA[1] + LA[3], LB[1] + LB[3]), y1 = Math.max(LA[2] + LA[4], LB[2] + LB[4]);
  const o = offCanvas(F.w, F.h), oc = o.getContext('2d');
  oc.globalCompositeOperation = 'source-over'; oc.globalAlpha = 1; oc.clearRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);   // 少し広く消す（切り出すときにふちの外を拾っても、前の絵が出ないように）
  oc.globalAlpha = 1 - w; oc.drawImage(imOf(LA[0]), LA[1], LA[2]);
  oc.globalCompositeOperation = 'lighter'; oc.globalAlpha = w; oc.drawImage(imOf(LB[0]), LB[1], LB[2]);
  oc.globalCompositeOperation = 'source-over'; oc.globalAlpha = 1;
  mirrored(c, pa.endsWith('~'), ax, () => c.drawImage(o, x0, y0, x1 - x0, y1 - y0, B.x + x0 * k, B.y + y0 * k + dy, (x1 - x0) * k, (y1 - y0) * k));
}
// 体ごと動く量（u の時。直線でつなぐ）
function moveAt(T, u) {
  const tl = T.tl, n = tl.length; let i = 0; while (i + 1 < n && u >= tl[i + 1][0]) i++;
  const A = tl[i], Bk = tl[Math.min(i + 1, n - 1)]; if (Bk === A) return [A[1], A[2]];
  const t = sstep(0, 1, (u - A[0]) / Math.max(1e-6, Bk[0] - A[0]));
  return [A[1] + (Bk[1] - A[1]) * t, A[2] + (Bk[2] - A[2]) * t];
}

// 全身の画像の頭の位置（画像の px）。名前に ~ がつくと左右反転
function headPx(F, p) {
  const b = bare(p), H = b === 'rest' ? F.head : (F.FH && F.FH[b]) || F.head;
  return [p.endsWith('~') ? (2 * F.axis - H[0]) * F.w : H[0] * F.w, H[1] * F.h];
}
// 立った形（基準 ＋ 腕・脚の層）を描く。box = 置く場所、kk = 倍率、ax0 = 左右反転の軸
function drawStanding(c, def, F, cyc, n, soft, box, kk, dy, ax0) {
  c.drawImage(imOf(F.base), box.x, box.y + dy, box.w, box.h);
  for (const T of def.tracks) {
    if (T.full || T.move) continue;
    const ps = posesAt(T, uOf(T, cyc, n), soft);
    // 左腕（左脚）のトラック：ポーズの名前を左右反転にする
    drawArm(c, F, T.mir ? ps.map(([p, w]) => [p === 'rest' ? p : p.endsWith('~') ? bare(p) : p + '~', w]) : ps, box, kk, dy, ax0);
  }
}
let stc = null;   // 立った形をいったん描くキャンバス（ゆがめて重ねるとき）
// 1つのポーズを描く。d = 腰から上をずらす量（画像の px。画面の向き）、a = 濃さ
function drawPose(c, def, F, p, cyc, n, soft, B, k, dy, ax, d, a) {
  if (a <= 0.002) return;
  const a0 = c.globalAlpha, warp = Math.abs(d[0]) + Math.abs(d[1]) > 0.5;
  let src, mir = p.endsWith('~');
  if (bare(p) === 'rest') {
    if (!warp) { if (a >= 0.999) drawStanding(c, def, F, cyc, n, soft, B, k, dy, ax); else { c.globalAlpha = a0 * a; drawStanding(c, def, F, cyc, n, soft, B, k, dy, ax); c.globalAlpha = a0; } return; }
    if (!stc) stc = document.createElement('canvas');
    if (stc.width !== F.w || stc.height !== F.h) { stc.width = F.w; stc.height = F.h; }
    const sc = stc.getContext('2d'); sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalAlpha = 1; sc.clearRect(0, 0, F.w, F.h);
    sc.imageSmoothingEnabled = true; sc.imageSmoothingQuality = 'high';
    drawStanding(sc, def, F, cyc, n, soft, { x: 0, y: 0, w: F.w, h: F.h }, 1, 0, F.axis * F.w);
    src = stc; mir = false;
  } else src = imOf(F.F[bare(p)]);
  c.globalAlpha = a0 * Math.min(1, a);
  if (!warp) mirrored(c, mir, ax, () => c.drawImage(src, B.x, B.y + dy, B.w, B.h));
  else {
    const YH = F.hip * F.h, YK = F.knee * F.h, L = YK - YH;
    const dl = [mir ? -d[0] : d[0], Math.max(-2 * L, Math.min(0.8 * L, d[1]))];   // 画像の中の向き（反転していれば x は逆）
    mirrored(c, mir, ax, () => {
      // ひざから下：そのまま
      c.drawImage(src, 0, YK, F.w, F.h - YK, B.x, B.y + dy + YK * k, B.w, (F.h - YK) * k);
      // 腰〜ひざ：上のふちは dl、下のふちは 0 だけずらす
      c.save(); c.translate(B.x, B.y + dy); c.scale(k, k);
      c.transform(1, 0, -dl[0] / L, 1 - dl[1] / L, dl[0] * YK / L, dl[1] * YK / L);
      c.drawImage(src, 0, YH, F.w, L + 1, 0, YH, F.w, L + 1);
      c.restore();
      // 腰から上：そのままずらす
      c.drawImage(src, 0, 0, F.w, YH + 0.5, B.x + dl[0] * k, B.y + dy + dl[1] * k, B.w, (YH + 0.5) * k);
    });
  }
  c.globalAlpha = a0;
}

/* ---------- 描く ----------
   c は設計の座標に合わせた変換ずみ（左右の反転もふくむ）。cyc = 1周の中の位置（0〜n。当たった瞬間が整数）
   imp = 当たった直後の強さ（1 → 0） */
export function drawImgCoach(c, key, cyc, imp = 0) {
  const def = imgCoach(key); if (!def) return false;
  const B = { ...imgBox(def) }, a0 = c.globalAlpha, f = cyc - Math.floor(cyc), dy = bobAt(f, def.bob || 0);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  let hits = [];
  if (!def.fig) {
    for (const [pose, wt] of posesAt(def, f)) {
      if (wt <= 0) continue;
      c.globalAlpha = a0 * wt;
      c.drawImage(imOf(def.poses[pose]), B.x, B.y + dy, B.w, B.h);
    }
    c.globalAlpha = a0;
    if (def.fist) hits = [[def.fist[0], def.fist[1]]];
  } else {
    const F = def.fig, n = def.n || 1, soft = def.soft || 0.6;   // soft：重ねて切りかえる長さ（短いほど、二重に見える時間が短い）
    // 体ごと動く（跳ぶ・横へ動く）：move のトラック [[u, dx, dy], …]（設計の単位。dy はマイナスが上）
    const MT = def.tracks.find(T => T.move), mv = MT ? moveAt(MT, uOf(MT, cyc, n)) : [0, 0];
    B.x += mv[0]; B.y += mv[1];
    const k = B.w / F.w, ax = B.x + F.axis * B.w;
    const full = def.tracks.find(T => T.full), ps = full ? posesAt(full, uOf(full, cyc, n), soft) : [['rest', 1]];
    if (ps.length === 1) drawPose(c, def, F, ps[0][0], cyc, n, soft, B, k, dy, ax, [0, 0], 1);
    else {
      // 体ごと変わるポーズの間：頭の位置をそろえながら重ねる（腰から上をずらし、腰〜ひざをのばす）→ 頭が2つに見えない
      const [[pa], [pb, w]] = ps, HA = headPx(F, pa), HB = headPx(F, pb), D = [HB[0] - HA[0], HB[1] - HA[1]];
      drawPose(c, def, F, pa, cyc, n, soft, B, k, dy, ax, [D[0] * w, D[1] * w], 1);
      drawPose(c, def, F, pb, cyc, n, soft, B, k, dy, ax, [-D[0] * (1 - w), -D[1] * (1 - w)], w);
    }
    if (def.hit) {
      const list = def.hit[(Math.floor(cyc) % def.hit.length + def.hit.length) % def.hit.length] || [];
      for (const p of list) {
        const P = F.P[bare(p)]; if (!P) continue;
        hits.push(p.endsWith('~') ? [2 * F.axis - P[0], P[1]] : P);
      }
    }
  }
  // 当たった瞬間：手のまわりに白い輪（音と同じ所で）
  if (imp > 0) for (const [hx, hy] of hits) {
    const x = B.x + hx * B.w, y = B.y + dy + hy * B.h, r = 34 + 96 * (1 - imp);
    c.save(); c.globalAlpha = a0 * 0.7 * imp; c.strokeStyle = '#ffffff'; c.lineWidth = 9 * imp + 3;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); c.restore();
  }
  return true;
}
