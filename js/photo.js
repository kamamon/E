/* =========================================================================
   IMMERSE FIT — photo.js
   写真の場面：同じ動きの写真を何枚かつないで見せます。
   当たる瞬間（拍）に次の写真へ切りかわり、その場所へズーム・揺れ・閃光・擬音が入るので、
   タイミングは必ず拍に合います（映像の速さに左右されません）。
   ========================================================================= */
import { PHOTOS } from './photos.js';
import { clamp } from './kit.js';
import { HIT_BY_ID, hitWord } from './hits.js';

export { PHOTOS };
export const PHOTO_DIR = 'photos/';
const HEAVY = new Set(['jump', 'stomp', 'squat', 'kick', 'step']);

/* ---------- 写真の読み込み（使い回し） ---------- */
class ImgPool {
  constructor() { this.m = new Map(); this.max = 60; this.t = 0; }
  entry(p) {
    let e = this.m.get(p.file);
    if (!e) {
      const img = new Image(); img.decoding = 'async';
      e = { img, p, ok: false, bad: false, used: 0 };
      img.addEventListener('load', () => { e.ok = true; });
      img.addEventListener('error', () => { if (e.gone) return; e.bad = true; console.warn('[photo] 読み込めません', p.file); });   // gone = 使わなくなって外した（src を消すと error が出る）
      img.src = p.src || (PHOTO_DIR + p.file);   // 自分の画像は src（この端末に保存した画像・サイトの photos/custom/）
      this.m.set(p.file, e);
      if (this.m.size > this.max) { const old = [...this.m.values()].sort((a, b) => a.used - b.used).slice(0, 10); for (const x of old) { this.m.delete(x.p.file); x.gone = true; x.img.src = ''; } }
    }
    e.used = ++this.t; return e;
  }
  want(list) { for (const p of list) this.entry(p); }
  ready(set) { const e = set.images[0] && this.m.get(set.images[0].file); return !!(e && e.ok); }
}
export const imgPool = typeof document !== 'undefined' ? new ImgPool() : null;

// 画面に合わせて写真を置く：全体が見える大きさと画面をおおう大きさの間（横長の写真を縦の画面で切りすぎない）。当たる場所 focus を中心に
function layout(p, V, focus) {
  const VW = V.x1 - V.x0, VH = V.y1 - V.y0, contain = Math.min(VW / p.w, VH / p.h), cover = Math.max(VW / p.w, VH / p.h);
  const sc = Math.max(contain, cover * 0.72), dw = p.w * sc, dh = p.h * sc;
  const f = focus || [0.5, 0.5], cx = (V.x0 + V.x1) / 2, cy = (V.y0 + V.y1) / 2;
  let x = cx - dw * f[0], y = cy - dh * f[1];
  x = dw >= VW ? clamp(x, V.x1 - dw, V.x0) : cx - dw / 2;
  y = dh >= VH ? clamp(y, V.y1 - dh, V.y0) : cy - dh / 2;
  return { x, y, w: dw, h: dh, fx: x + dw * f[0], fy: y + dh * f[1] };
}
// 背景：同じ写真をぼかして敷く（小さく縮めてから引きのばす）
let tiny = null;
function backdrop(ctx, img, V) {
  if (!tiny) { tiny = document.createElement('canvas'); tiny.width = 24; tiny.height = 24; }
  try { tiny.getContext('2d').drawImage(img, 0, 0, 24, 24); } catch (e) { return; }
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tiny, V.x0 - 60, V.y0 - 60, V.x1 - V.x0 + 120, V.y1 - V.y0 + 120);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(V.x0 - 60, V.y0 - 60, V.x1 - V.x0 + 120, V.y1 - V.y0 + 120);
  ctx.restore();
}
const wordOf = set => set.word || (HIT_BY_ID.has(set.sfx) && hitWord(set.sfx)) || ({ chop: 'トン', hammer: 'カン', clang: 'カーン', taiko: 'ドン', drum: 'ドン', punch: 'バシッ', kick: 'ドカッ', stomp: 'ドン', jump: 'ポン', clap: 'パン', splash: 'バシャ', thud: 'ドスッ', crack: 'バキッ', pop: 'ポン', swish: 'シュッ', whoosh: 'ヒュン', squish: 'ムニッ', wood: 'コン', mochi: 'ペッタン', bell: 'カラン', ding: 'チン', crunch: 'ザクッ', smack: 'パチン', swoosh: 'シュッ' })[set.sfx] || 'ドン';

// k 回当たったあとの写真。seq（続きの写真）は順に進んで最後で止まる
function pick(set, s, k) {
  const n = set.images.length;
  return set.seq ? set.images[Math.min(s.my.i0 + k, n - 1)] : set.images[(s.my.i0 + Math.min(k, n)) % n];
}
// 写真を置く場所（seq は場面の中で動かないように set.focus で固定）と、当たった所
function place(set, p, V) {
  const L = layout(p, V, set.seq ? (set.focus || p.focus) : p.focus);
  if (p.at) { L.hx = L.x + L.w * p.at[0]; L.hy = L.y + L.h * p.at[1]; } else { L.hx = L.fx; L.hy = L.fy; }
  return L;
}

export const PHOTO = {
  id: 'photo', name: '写真', acts: [], modes: ['one', 'alt', 'both'], theme: 'photo', noSlide: true, photo: true,
  init(s, v) {
    const set = v.set, n = set.images.length;
    const r = (s.round || 1) - 1, p = (s.idx || 0) * 3 + (s.sub || 0) * 2 + r;
    if (set.seq) { const q = (s.sub || 0) * 2; s.my.i0 = q + 2 <= n - 1 ? q : 0; }   // 続きの写真：前半は 1枚目から、後半は前半の続きから
    else s.my.i0 = n > 1 ? p % n : 0;                 // 何枚目から始めるか（場面の順番・前半後半・巡で変える）
    s.my.pulse = 0; s.my.L = null;
    if (imgPool) imgPool.want(set.images);
  },
  draw(g, s, v) {
    const set = v.set, V = g.V, ctx = g.ctx;
    const p = pick(set, s, s.k), e = imgPool ? imgPool.entry(p) : null;
    ctx.fillStyle = '#060606'; ctx.fillRect(V.x0 - 50, V.y0 - 50, V.x1 - V.x0 + 100, V.y1 - V.y0 + 100);
    if (!e || !e.ok) {
      g.text(set.name, 500, 480, { size: 64, f: '#ffffff', o: 0 });
      g.alpha(0.6, () => g.text(e && e.bad ? '写真を読み込めませんでした' : '写真を読み込み中…', 500, 560, { size: 34, f: '#ffffff', o: 0 }));
      return;
    }
    const mirror = s.mode === 'one' && s.round === 2 && p.mirror !== false;
    const L = place(set, p, V); s.my.L = L; s.my.mirror = mirror;
    // ゆっくり寄っていき（予感）、当たった瞬間に大きく → 落ちつく
    s.my.pulse = s.k ? Math.exp(-Math.max(0, s.age) * 7) : 0;
    const base = 1 + 0.06 * clamp(s.u), z = base * (1 + 0.1 * s.my.pulse);
    ctx.save();
    if (mirror) { ctx.translate(500, 0); ctx.scale(-1, 1); ctx.translate(-500, 0); }
    if (L.w < V.x1 - V.x0 + 2 || L.h < V.y1 - V.y0 + 2) backdrop(ctx, e.img, V);
    ctx.translate(L.hx, L.hy); ctx.scale(z, z); ctx.translate(-L.hx, -L.hy);
    try { ctx.drawImage(e.img, L.x, L.y, L.w, L.h); } catch (err) { /* まだ描けない */ }
    ctx.restore();
    // ふちを暗く（写真らしく、文字が読みやすい）
    const vg = ctx.createRadialGradient(500, (V.y0 + V.y1) / 2, Math.min(V.x1 - V.x0, V.y1 - V.y0) * 0.45, 500, (V.y0 + V.y1) / 2, Math.max(V.x1 - V.x0, V.y1 - V.y0) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(V.x0 - 10, V.y0 - 10, V.x1 - V.x0 + 20, V.y1 - V.y0 + 20);
    // 当たる直前：画面の縁がほんのり明るくなる（タイミングの合図）
    if (s.k < s.n) {
      const H = s.clip.hits[s.k], left = (H - s.beat) * s.spb;
      if (left < 0.35 && left > 0) g.alpha(0.25 * (1 - left / 0.35), () => { ctx.lineWidth = 26; ctx.strokeStyle = '#ffffff'; ctx.strokeRect(V.x0 + 13, V.y0 + 13, V.x1 - V.x0 - 26, V.y1 - V.y0 - 26); });
    }
  },
  hit(g, s, k, v) {
    // 当たった瞬間に切りかわる写真の「当たる場所」に出す（前の写真の位置ではなく。写真の大きさは分かっているので、まだ描いていなくても置ける）
    const set = v.set, p = pick(set, s, k);
    if (!p) { g.fx.flash('#ffffff', 0.3, 0.12); return; }
    const L = place(set, p, g.V), mirror = s.mode === 'one' && s.round === 2 && p.mirror !== false;
    const x = mirror ? 1000 - L.hx : L.hx, y = L.hy;
    g.fx.flash('#ffffff', 0.28, 0.12);
    g.fx.shake(HEAVY.has(set.act) ? 16 : 9, 0.2);
    g.fx.lines(x, y, { n: 14, r0: 120, r1: 300, w: 10, life: 0.2 });
    g.fx.ring(x, y, { c: '#ffffff', r0: 40, r1: 260, w: 12, life: 0.32 });
    g.fx.burst(x, y, { n: 16, c: ['#ffffff', '#ffe27a'], shape: 'spark', sp: [400, 900], size: [10, 20], g: 900, life: [0.25, 0.5] });
    // 文字：上の端に近いときは下に出す（場面の名前と重ならない）。左右は画面からはみ出さないように寄せる
    const w = wordOf(set), hw = w.length * 110 * 0.5 + 24, V = g.V;
    const wx = V.x1 - V.x0 > 2 * hw ? Math.min(Math.max(x, V.x0 + hw), V.x1 - hw) : (V.x0 + V.x1) / 2;
    g.fx.pop(w, wx, y - 120 < V.y0 + 260 ? y + 150 : y - 120, { size: 110, life: 0.55, rise: 60 });
  },
};

// 場面（インスタンス）にする
export const PHOTO_SCENES = PHOTOS.map(set => ({
  id: 'photo:' + set.id, tpl: PHOTO, file: 'photo', real: true, photo: true, grp: 'photo:' + set.id,
  v: { k: set.id, set, sfx: set.sfx || null, name: set.name, short: set.short },
  name: set.name, short: set.short || set.name, acts: [set.act], modes: set.modes && set.modes.length ? set.modes : ['one', 'alt', 'both'], theme: 'photo',
}));
export const photoReady = inst => !imgPool || imgPool.ready(inst.v.set);
