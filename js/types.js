/* =========================================================================
   IMMERSE FIT — types.js
   種目 = 動き（お手本）× 場面セット（5場面）。1種目 = お手本5回 → 5場面×2巡（各4回＝トントン×2）→ ラスト5回 = 50回。
   全身・上半身・下半身・腕だけ それぞれ 500 種目を作ります（毎回同じ結果）。
   ========================================================================= */
import { MOTIONS } from './motions.js';
import { SCENES, SCENE_BY_ID } from './scenes/index.js';
import { MINE } from './minereg.js';
import { rng, hashStr } from './kit.js';
import { realPoolFor } from './real.js';

export const VERSIONS = [
  { key: 'full', name: '全身', pre: 'F', desc: '脚と腕をいっしょに。いちばん汗をかく' },
  { key: 'upper', name: '上半身', pre: 'U', desc: '腕・肩・背中・体幹をしっかり' },
  { key: 'lower', name: '下半身', pre: 'L', desc: 'しゃがむ・蹴る・跳ぶで脚を使う' },
  { key: 'arms', name: '腕だけ', pre: 'A', desc: '座ってもOK。振る・押す・回す' },
];
export const PER_VERSION = 500;
export const PRACTICE = 5, PER_ROUND = 5, ROUNDS = 2, SHOW = 4, FINALE = 5;
export const SCENE_REPS = PER_ROUND * ROUNDS * SHOW;                 // 40
export const REPS = PRACTICE + SCENE_REPS + FINALE;                  // 50
// テンポ（1回 = 2拍。bpm 128 なら 1回 0.94 秒）。diff = 動きのむずかしさの目安（1〜3）
export const LEVELS = [
  { key: 1, name: 'ゆっくり', bpm: 96, diff: 1 },
  { key: 2, name: 'ふつう', bpm: 112, diff: 2 },
  { key: 3, name: 'はやい', bpm: 128, diff: 3 },
  { key: 4, name: 'さらに速く', bpm: 144, diff: 3 },
  { key: 5, name: '最速', bpm: 160, diff: 3 },
];
export const levelOf = key => LEVELS.find(l => l.key === key) || LEVELS[2];
export const MUSIC = ['pop', 'house', 'tropical', 'synth', 'trance', 'techno', 'koto', 'lofi', 'space', 'dream'];

export const poolFor = m => SCENES.filter(s => s.acts.includes(m.act) && s.modes.includes(m.mode));

// 1つの動きの場面セットを n 個（なるべく重ならないように）
function makePacks(m, n, pool, seed) {
  const r = rng(seed), use = new Map(pool.map(s => [s.id, 0])), seen = new Set(), out = [];
  for (let i = 0; i < n; i++) {
    let best = null;
    for (let tries = 0; tries < 6; tries++) {
      const pick = [], tpl = new Map();
      const left = pool.slice();
      while (pick.length < PER_ROUND) {
        if (!left.length) { left.push(...pool); }   // 場面が足りないときはくり返す
        let bi = 0, bs = Infinity;
        for (let k = 0; k < left.length; k++) {
          const s = left[k], sc = use.get(s.id) * 1.0 + (tpl.get(s.grp || s.tpl.id) || 0) * 2.2 + r() * 1.3;
          if (sc < bs) { bs = sc; bi = k; }
        }
        const s = left.splice(bi, 1)[0]; pick.push(s); tpl.set(s.grp || s.tpl.id, (tpl.get(s.grp || s.tpl.id) || 0) + 1);
      }
      // 同じテンプレートが続かないように並べかえ
      const gk = x => x.grp || x.tpl;
      for (let a = 1; a < pick.length; a++) if (gk(pick[a]) === gk(pick[a - 1])) { const b = pick.findIndex((x, j) => j > a && gk(x) !== gk(pick[a - 1]) && (!pick[j + 1] || gk(pick[j + 1]) !== gk(x))); if (b > 0) [pick[a], pick[b]] = [pick[b], pick[a]]; }
      const sig = pick.map(s => s.id).sort().join('|');
      best = pick; if (!seen.has(sig)) { seen.add(sig); break; }
    }
    for (const s of best) use.set(s.id, use.get(s.id) + 1);
    out.push(best);
  }
  return out;
}

let _types = null;
export function catalog() {
  if (_types) return _types;
  const all = {}, byId = new Map();
  for (const V of VERSIONS) {
    const ms = MOTIONS.filter(m => m.vers.includes(V.key)).map(m => ({ m, pool: poolFor(m) })).filter(x => x.pool.length >= 3);
    // 場面の多い動きほど多くの種目に（最低 4）
    const w = ms.map(x => Math.min(48, x.pool.length) + 6), sw = w.reduce((a, b) => a + b, 0);
    const n = w.map(x => Math.max(4, Math.floor(PER_VERSION * x / sw)));
    let sum = n.reduce((a, b) => a + b, 0), k = 0;
    const order = ms.map((x, i) => i).sort((a, b) => ms[b].pool.length - ms[a].pool.length);
    while (sum < PER_VERSION) { n[order[k % order.length]]++; sum++; k++; }
    while (sum > PER_VERSION) { const i = order[k % order.length]; if (n[i] > 4) { n[i]--; sum--; } k++; }
    const list = [];
    ms.forEach((x, i) => {
      const packs = makePacks(x.m, n[i], x.pool, hashStr(V.key + x.m.key));
      const rpool = realPoolFor(x.m), rpacks = rpool.length ? makePacks(x.m, n[i], rpool, hashStr('R' + V.key + x.m.key)) : null;
      packs.forEach((sc, j) => {
        const rs = rpacks ? rpacks[j] : [];
        const t = {
          id: `${V.pre}-${x.m.key}-${String(j + 1).padStart(2, '0')}`, ver: V.key, motion: x.m.key, m: x.m,
          name: x.m.name, act: x.m.act, mode: x.m.mode, lvl: x.m.lvl, met: x.m.met, imp: x.m.imp,
          scenes: sc.map(s => s.id), sub: sc.slice(0, 3).map(s => s.short).join('・'),
          real: rs.map(s => s.id), subReal: [...new Set(rs.map(s => s.short))].slice(0, 3).join('・'),
          music: MUSIC[hashStr(V.key + x.m.key + j) % MUSIC.length], n: j + 1,
        };
        list.push(t);
      });
    });
    // 一覧の並び：動きごとの1番目 → 2番目…（いろいろな動きが混ざるように）
    const byM = new Map(); for (const t of list) (byM.get(t.motion) || byM.set(t.motion, []).get(t.motion)).push(t);
    const mixed = []; for (let r = 0; mixed.length < list.length; r++) for (const arr of byM.values()) if (arr[r]) mixed.push(arr[r]);
    mixed.forEach((t, i) => { t.no = i + 1; byId.set(t.id, t); });
    all[V.key] = mixed;
  }
  _types = { ...all, byId };
  return _types;
}

// 場面の絵：look = 'real'（実写・ふだん）/ 'illust'（イラスト）。実写の場面がない動きはイラスト
// 自分の画像があれば、その動きの場面に先に使う（MINE.mode = 'mix'）／自分の画像だけにする（'only'）
export function sceneIds(t, look) {
  const base = look !== 'illust' && t.real && t.real.length ? t.real : t.scenes;
  if (MINE.mode === 'off' || !MINE.list.length) return base;
  let mine = MINE.list.filter(s => s.acts.includes(t.act) && s.modes.includes(t.mode));
  if (!mine.length) mine = MINE.list.filter(s => s.acts.includes(t.act));
  if (!mine.length) return base;
  const k = hashStr(t.id) % mine.length, ids = mine.slice(k).concat(mine.slice(0, k)).map(s => s.id);   // 種目ごとに順番を変える
  if (MINE.mode === 'only') { const out = []; while (out.length < PER_ROUND) out.push(...ids); return out.slice(0, Math.max(PER_ROUND, ids.length)); }
  return ids.slice(0, PER_ROUND).concat(base.filter(id => !ids.includes(id))).slice(0, Math.max(PER_ROUND, base.length));
}
export function subOf(t, look) {
  const base = look !== 'illust' && t.real && t.real.length ? t.subReal : t.sub;
  if (MINE.mode === 'off' || !MINE.list.length) return base;
  const names = [];
  for (const id of sceneIds(t, look)) { const s = SCENE_BY_ID.get(id); if (s && !names.includes(s.short)) names.push(s.short); if (names.length >= 3) break; }
  return names.join('・') || base;
}

// 1種目の長さ（拍）
export const repsBeats = t => REPS * t.m.rpb;
export function typeBeats(t) { const b = 8 + repsBeats(t) + 4; return Math.ceil(b / 4) * 4; }

// おまかせメニュー: { ver, minutes, level, quiet, seed, found:Set, recent:Set, only }
export function buildSession(o) {
  const C = catalog(), L = levelOf(o.level), D = L.diff || 2;
  if (o.only) return { ver: o.only.ver, bpm: L.bpm, level: L.key, types: [o.only], music: o.only.music };
  const r = rng(o.seed || Date.now());
  const list = C[o.ver].filter(t => !o.quiet || !t.imp);
  const spb = 60 / L.bpm, target = (o.minutes || 5) * 60;
  const out = []; let sec = 0;
  while (sec < target - 20 || !out.length) {
    const last = out.slice(-2);
    const w = list.map(t => {
      let x = 1;
      if (out.includes(t)) return 0;
      if (o.found && !o.found.has(t.id)) x *= 2.4;
      if (o.recent && o.recent.has(t.id)) x *= 0.2;
      if (last.some(l => l.motion === t.motion)) x *= 0.02;
      if (last.length && last[last.length - 1].act === t.act) x *= 0.25;
      if (out.filter(l => l.act === t.act).length >= 2) x *= 0.3;
      if (last.length && last[last.length - 1].imp && t.imp) x *= 0.3;
      if (!out.length && t.lvl > 1) x *= 0.3;                    // 1種目めはやさしい動きから
      x *= t.lvl === D ? 1.5 : Math.abs(t.lvl - D) === 1 ? 1 : 0.4;
      return x;
    });
    const sum = w.reduce((a, b) => a + b, 0); if (!sum) break;
    let q = r() * sum, i = 0; while (i < w.length - 1 && (q -= w[i]) > 0) i++;
    out.push(list[i]); sec += (typeBeats(list[i]) + 8) * spb;
    if (out.length > 30) break;
  }
  return { ver: o.ver, bpm: L.bpm, level: L.key, types: out, music: o.music || out[0].music };
}
