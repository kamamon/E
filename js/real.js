/* =========================================================================
   IMMERSE FIT — real.js
   実写の場面：自由に使えるライセンスの映像（Wikimedia Commons など）を、
   映像の中の「当たる瞬間」が音楽の拍にぴったり重なるように再生します。
   ・映像の音は使わず、当たる瞬間にアプリの効果音を鳴らします
   ・映像の速さを少しだけ変えて合わせます（合わないときは、当たる瞬間の間で切りかえ）
   ========================================================================= */
import { CLIPS } from './clips.js';
import { PHOTO, PHOTO_SCENES, photoReady } from './photo.js';

export { CLIPS };
export const CLIP_DIR = 'clips/';
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const HEAVY = new Set(['jump', 'stomp', 'squat', 'kick', 'step']);

/* ---------- 映像の読み込み（先読みと使い回し） ---------- */
class Pool {
  constructor() { this.m = new Map(); this.t = 0; this.max = 11; this.cur = null; this.q = []; this.busy = false; }
  entry(c) {
    let e = this.m.get(c.id);
    if (!e) {
      const el = document.createElement('video');
      el.muted = true; el.defaultMuted = true; el.playsInline = true; el.preload = 'auto'; el.loop = false;
      el.setAttribute('muted', ''); el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', '');
      e = { el, c, ok: false, bad: false, used: 0, url: null };
      el.addEventListener('loadeddata', () => { e.ok = true; });
      el.addEventListener('error', () => { if (!e.retried && e.url) { e.retried = true; el.src = CLIP_DIR + c.file; el.load(); } else { e.bad = true; console.warn('[real] 読み込めません', c.id); } });
      // いったん全部読み込んでから再生（範囲リクエストに対応していない場所でも再生できるように）。読み込みは1本ずつ
      this.m.set(c.id, e); this.q.push(e); this.pump();
    }
    e.used = ++this.t; this.evict(); return e;
  }
  pump() {
    if (this.busy || !this.q.length) return;
    const e = this.q.shift(); if (!this.m.has(e.c.id)) return this.pump();
    const el = e.el, url = CLIP_DIR + e.c.file; this.busy = true;
    const done = () => { this.busy = false; this.pump(); };
    try {
      fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(b => { if (this.m.has(e.c.id)) { e.url = URL.createObjectURL(b.type && b.type.startsWith('video') ? b : new Blob([b], { type: 'video/mp4' })); el.src = e.url; el.load(); } done(); })
        .catch(() => { if (this.m.has(e.c.id)) { el.src = url; el.load(); } done(); });
    } catch (err) { el.src = url; el.load(); done(); }
  }
  want(clips) { for (const c of clips) if (c) this.entry(c); }
  // 再生中の1本以外は止める
  play(e) { if (this.cur && this.cur !== e && !this.cur.el.paused) this.cur.el.pause(); this.cur = e; e.used = ++this.t; }
  pauseAll() { for (const e of this.m.values()) if (!e.el.paused) e.el.pause(); this.cur = null; }
  evict() {
    if (this.m.size <= this.max) return;
    const arr = [...this.m.values()].filter(e => e !== this.cur).sort((a, b) => a.used - b.used);
    for (const e of arr.slice(0, this.m.size - this.max)) {
      try { e.el.pause(); if (e.el.parentNode) e.el.parentNode.removeChild(e.el); e.el.removeAttribute('src'); e.el.load(); } catch (err) { /* noop */ }
      if (e.url) URL.revokeObjectURL(e.url);
      this.m.delete(e.c.id);
    }
  }
  ready(c) { const e = this.m.get(c.id); return !!(e && e.el.readyState >= 2); }
}
export const pool = typeof document !== 'undefined' ? new Pool() : null;

/* ---------- 拍 → 映像の時刻 ----------
   clip: ステージのクリップ（hits: 当たる拍の列, round, sub）。
   映像の当たる瞬間 c.hits を順に拍に重ね、あいだは速さを変えてつなぐ（遅い映像は早回し、速い映像はスロー）。
   つながらないところは、当たる瞬間のまん中で切りかえる */
function plan(c, clip, spb) {
  const S = c.hits, n = S.length, H = clip.hits, N = H.length;
  const dT = N > 1 ? (H[1] - H[0]) * spb : 2 * spb;
  const gaps = []; for (let k = 1; k < n; k++) gaps.push(S[k] - S[k - 1]); gaps.sort((a, b) => a - b);
  const med = gaps.length ? gaps[gaps.length >> 1] : dT;
  // ふつうは当たる瞬間を1つずつ使う（映像の1打 = 自分の1回。遅くなるぶんはスローモーションで見せる）。
  // 0.35倍より遅くなってしまうときだけ、1つおき・2つおきにする
  let stride = 1;
  while (stride < n - 1 && stride * med / dT < 0.35) stride++;
  const span = stride * (N - 1), maxStart = Math.max(0, n - 1 - span);
  const rr = (clip.round || 1) - 1, p = rr * 2 + (clip.sub || 0), i0 = maxStart > 0 ? (2 * p + rr) % (maxStart + 1) : 0;
  const idx = j => { const k = i0 + j * stride; return k < n ? k : k % n; };
  return { S, n, N, H, dT, med, stride, idx };
}
export function srcAt(c, clip, beat, spb) {
  const t = beat * spb, c0 = c.hits.length, N = clip.hits.length;
  if (!c0 || !N) return { x: clamp(t % c.dur, 0.03, c.dur - 0.08), r: 1 };
  const { S, n, H, dT, med, stride, idx } = plan(c, clip, spb), T = j => H[j] * spb;
  const seg = j => {                         // 当たり j → j+1 の区間
    const a = idx(j), b = idx(j + 1);
    if (b === a + stride) { const r = (S[b] - S[a]) / Math.max(0.05, T(j + 1) - T(j)); if (r >= 0.42 && r <= 2.1) return { cont: true, r }; return { cont: false, r: clamp(r, 0.5, 1.8) }; }
    return { cont: false, r: clamp(stride * med / dT, 0.5, 1.8) };
  };
  let x, r;
  if (N === 1) { r = clamp(med / Math.max(0.3, 2 * spb), 0.5, 1.6); x = S[idx(0)] + (t - T(0)) * r; }
  else if (t <= T(0)) { r = seg(0).r; x = S[idx(0)] + (t - T(0)) * r; }
  else if (t >= T(N - 1)) { r = seg(N - 2).r; x = S[idx(N - 1)] + (t - T(N - 1)) * r; }
  else {
    let j = 0; while (j < N - 2 && t >= T(j + 1)) j++;
    const q = seg(j); r = q.r;
    if (q.cont) x = S[idx(j)] + (t - T(j)) * r;
    else x = t < (T(j) + T(j + 1)) / 2 ? S[idx(j)] + (t - T(j)) * r : S[idx(j + 1)] + (t - T(j + 1)) * r;
  }
  return { x: clamp(x, 0.03, c.dur - 0.08), r: Math.max(0.1, r) };
}

/* ---------- 描く ---------- */
let tiny = null;
// 小さな絵（背景のぼかし用）
function tinyBg(el) {
  try {
    if (!tiny) { tiny = document.createElement('canvas'); tiny.width = 32; tiny.height = 32; }
    tiny.getContext('2d').drawImage(el, 0, 0, 32, 32); return tiny.toDataURL('image/jpeg', 0.6);
  } catch (e) { return ''; }
}
function blurBg(g, el, V) {
  const ctx = g.ctx;
  if (!tiny) { tiny = document.createElement('canvas'); tiny.width = 24; tiny.height = 24; }
  const t = tiny.getContext('2d');
  try { t.drawImage(el, 0, 0, 24, 24); } catch (e) { return; }
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
  ctx.drawImage(tiny, V.x0 - 40, V.y0 - 40, V.x1 - V.x0 + 80, V.y1 - V.y0 + 80);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#000'; ctx.fillRect(V.x0 - 40, V.y0 - 40, V.x1 - V.x0 + 80, V.y1 - V.y0 + 80);
  ctx.restore();
}
// 映像を画面に合わせて置く（全体が見えることを優先。少しだけ拡大して画面を広く使う）
export function layout(c, V) {
  const VW = V.x1 - V.x0, VH = V.y1 - V.y0, portrait = VH > VW * 1.15;
  const contain = Math.min(VW / c.w, VH / c.h), cover = Math.max(VW / c.w, VH / c.h);
  const sc = Math.min(cover, contain * (portrait ? 1.32 : 1.12)), dw = c.w * sc, dh = c.h * sc;
  const f = c.focus || [0.5, 0.5], cx = (V.x0 + V.x1) / 2, cy = portrait ? V.y0 + VH * 0.45 : (V.y0 + V.y1) / 2;
  let x = cx - dw * f[0], y = cy - dh * f[1];
  if (dw >= VW) x = clamp(x, V.x1 - dw, V.x0); else x = cx - dw / 2;
  if (dh >= VH) y = clamp(y, V.y1 - dh, V.y0); else y = clamp(cy - dh / 2, V.y0, V.y1 - dh);
  return { x, y, w: dw, h: dh };
}

const WORDS = { chop: 'トン', hammer: 'カン', clang: 'カーン', taiko: 'ドン', drum: 'ドン', punch: 'バシッ', kick: 'ドカッ', stomp: 'ドン', jump: 'ポン', clap: 'パン', splash: 'バシャ', thud: 'ドスッ', crack: 'バキッ', pop: 'ポン', swish: 'シュッ', whoosh: 'ヒュン', squish: 'ムニッ', wood: 'コン', mochi: 'ペッタン', bell: 'カラン', ding: 'チン', crunch: 'ザクッ', smack: 'パチン', swoosh: 'シュッ', mochi2: 'ペタン', squeak: 'キュッ', break: 'バリッ', knock: 'コン', snare: 'タン', bongo: 'ポコ', cymbal: 'シャーン', gong: 'ゴーン' };
const wordOf = c => c.word || WORDS[c.sfx] || 'ドン';
export const REAL = {
  id: 'real', name: '実写', acts: [], modes: ['one', 'alt', 'both'], theme: 'real', noSlide: true, video: true,
  init(s, v) { s.my.e = pool ? pool.entry(v.clip) : null; s.my.pulse = 0; s.my.seen = 0; s.my.bg = null; },
  draw(g, s, v) {
    const c = v.clip, e = s.my.e, V = g.V, ctx = g.ctx, stage = g.stage, useLayer = !!(stage && stage.vid);
    if (!useLayer) { ctx.fillStyle = '#050505'; ctx.fillRect(V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100); }
    const el = e && e.el, now = performance.now();
    // 先に画面に置いてから再生をたのむ（置かれていない <video> の再生を止める端末があるため）
    if (useLayer && el && !e.bad && stage.vidEl !== el) stage.showVideo(el, layout(c, V), { alpha: 0 });
    if (el && !e.bad && s.clip) {
      const st = srcAt(c, s.clip, s.beat, s.spb);
      if (el.readyState >= 1) {
        pool.play(e);
        if (el.paused || el.ended) {
          // 止まっているとき：再生をたのむのは 0.4 秒に1回まで（たのみすぎると重くなる端末があるため）
          if (!e.tried || now - e.tried > 400) {
            e.tried = now;
            if (Math.abs(el.currentTime - st.x) > 0.06 && !el.seeking) el.currentTime = st.x;
            el.playbackRate = clamp(st.r, 0.25, 3);
            const pr = el.play(); if (pr && pr.catch) pr.catch(err => { if (!e.warned) { e.warned = 1; console.warn('[real] play', err && err.name); } });
          }
        } else {
          const err = el.currentTime - st.x;
          if (Math.abs(err) > 0.3 && !el.seeking && (!e.sought || now - e.sought > 250)) { e.sought = now; el.currentTime = st.x; }
          else if (!el.seeking) { const r = clamp(st.r * (1 - clamp(err, -0.2, 0.2) * 2.2), 0.25, 3); if (Math.abs(r - el.playbackRate) > 0.02) el.playbackRate = r; }
        }
      }
    }
    if (!el || e.bad || el.readyState < 2) {
      // 読み込み中（まれ）：場面の名前だけ出す
      if (useLayer) stage.showVideo(el || stage.vidEl || document.createElement('video'), { x: 0, y: 0, w: 0, h: 0 }, { alpha: 0 });
      g.alpha(0.85, () => g.rect(V.x0 - 20, V.y0 - 20, V.x1 - V.x0 + 40, V.y1 - V.y0 + 40, '#050505', 0));
      g.text(c.name, 500, 480, { size: 64, f: '#ffffff', o: 0 });
      g.alpha(0.6, () => g.text(e && e.bad ? '映像を読み込めませんでした' : '映像を読み込み中…', 500, 560, { size: 34, f: '#ffffff', o: 0 }));
      return;
    }
    const mirror = s.mode === 'one' && s.round === 2;
    s.my.pulse *= Math.exp(-(s.dt || 1 / 60) * 10);
    const L = layout(c, V), k = 1 + 0.035 * s.my.pulse; s.my.L = L;
    if (useLayer) {
      // 背景：最初のコマをぼかしたもの（1回だけ作る）
      if (s.my.bg === null) { s.my.bg = tinyBg(el) || ''; }
      const zin = stage.tIn < 0.16 ? 1 + 0.05 * Math.pow(1 - stage.tIn / 0.16, 2) : 1;
      stage.showVideo(el, L, { mirror, k: k * zin, bg: s.my.bg });
    } else {
      ctx.save();
      if (mirror) { ctx.translate(500, 0); ctx.scale(-1, 1); ctx.translate(-500, 0); }
      blurBg(g, el, V);
      const cx = L.x + L.w / 2, cy = L.y + L.h / 2;
      ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
      try { ctx.drawImage(el, L.x, L.y, L.w, L.h); } catch (err) { /* まだ描けない */ }
      ctx.restore();
    }
    // 当たる直前：画面の縁がほんのり明るくなる（タイミングの合図）
    if (s.k < s.n) {
      const H = s.clip.hits[s.k], left = (H - s.beat) * s.spb;
      if (left < 0.35 && left > 0) g.alpha(0.22 * (1 - left / 0.35), () => { ctx.lineWidth = 26; ctx.strokeStyle = '#ffffff'; ctx.strokeRect(V.x0 + 13, V.y0 + 13, V.x1 - V.x0 - 26, V.y1 - V.y0 - 26); });
    }
  },
  hit(g, s, k, v) {
    s.my.pulse = 1;
    g.fx.flash('#ffffff', 0.2, 0.11);
    if (HEAVY.has(v.clip.act)) g.fx.shake(14, 0.2); else g.fx.shake(6, 0.1);
    // 当たる場所（focus）に、閃光の線と擬音
    const c = v.clip, L = s.my.L; if (!L || !c.focus) return;
    const mirror = s.mode === 'one' && s.round === 2, fx = L.x + L.w * c.focus[0], fy = L.y + L.h * c.focus[1], x = mirror ? 1000 - fx : fx;
    g.fx.lines(x, fy, { n: 12, r0: 90, r1: 240, w: 9, life: 0.18 });
    g.fx.ring(x, fy, { c: '#ffffff', r0: 30, r1: 200, w: 10, life: 0.28 });
    if (c.word !== '') g.fx.pop(wordOf(c), x, fy - 110, { size: 96, life: 0.5, rise: 50 });
  },
};

// ラスト5回：実写の上にカウントダウン
import { drawCountdown, countdownHit } from './scenes/finale.js';
export const REAL_FINALE = {
  ...REAL, id: 'real-finale', name: 'ラスト5回！',
  draw(g, s, v) { REAL.draw(g, s, v); drawCountdown(g, s, true); },
  hit(g, s, k, v) { REAL.hit(g, s, k, v); countdownHit(g, s, k); },
};
export const PHOTO_FINALE = {
  ...PHOTO, id: 'photo-finale', name: 'ラスト5回！',
  draw(g, s, v) { PHOTO.draw(g, s, v); drawCountdown(g, s, true); },
  hit(g, s, k, v) { PHOTO.hit(g, s, k, v); countdownHit(g, s, k); },
};
// ラスト5回の場面（映像でも写真でも）
export function finaleInst(inst) {
  if (inst.photo) return { id: 'photo-finale:' + inst.v.set.id, tpl: PHOTO_FINALE, file: 'photo', real: true, photo: true, v: { ...inst.v, name: 'ラスト5回！', short: 'ラスト' }, name: 'ラスト5回！', short: 'ラスト', acts: [], modes: [], theme: 'photo' };
  const clip = inst.v.clip;
  return { id: 'real-finale:' + clip.id, tpl: REAL_FINALE, file: 'real', real: true, v: { k: clip.id, clip, sfx: clip.sfx || null, name: 'ラスト5回！', short: 'ラスト' }, name: 'ラスト5回！', short: 'ラスト', acts: [], modes: [], theme: 'real' };
}

// 場面（インスタンス）にする
export const REAL_SCENES = CLIPS.map(c => ({
  id: 'real:' + c.id, tpl: REAL, file: 'real', real: true, grp: (c.credit && c.credit.file) || c.id,
  v: { k: c.id, clip: c, sfx: c.sfx || null, name: c.name, short: c.short },
  name: c.name, short: c.short || c.name, acts: [c.act], modes: c.modes && c.modes.length ? c.modes : ['one', 'alt', 'both'], theme: 'real',
}));
export const REAL_BY_ID = new Map(REAL_SCENES.map(s => [s.id, s]));
// その動きに合う実写の場面。同じ動き・同じモードが少なければ、同じ動きの別モード →
// それでも足りなければ「当たる感じ」が近い動きの映像も使う（場面がイラストに戻らないように）
const NEAR = {
  hit: ['clap', 'punch'], punch: ['hit', 'push'], push: ['punch', 'lift'], pull: ['lift', 'push'], lift: ['pull', 'push'],
  stir: ['wipe', 'pull'], wipe: ['stir', 'push'], clap: ['hit', 'punch'], throw: ['punch', 'hit'],
  squat: ['jump', 'stomp'], knee: ['stomp', 'kick'], kick: ['stomp', 'knee'], stomp: ['knee', 'jump'], jump: ['stomp', 'squat'], step: ['stomp', 'jump'],
};
export const ALL_REAL = [...REAL_SCENES, ...PHOTO_SCENES];   // 映像と写真の場面
export function realPoolFor(m) {
  const same = ALL_REAL.filter(s => s.acts.includes(m.act) && s.modes.includes(m.mode));
  if (same.length >= 5) return same;
  let pool = ALL_REAL.filter(s => s.acts.includes(m.act));
  for (const a of NEAR[m.act] || []) { if (pool.length >= 5) break; pool = pool.concat(ALL_REAL.filter(s => s.acts.includes(a) && !pool.includes(s))); }
  return pool.length >= 2 ? pool : [];
}
// 場面の映像・写真が届いているか
export const realReady = inst => inst.photo ? photoReady(inst) : (!pool || pool.ready(inst.v.clip));
