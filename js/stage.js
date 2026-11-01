/* =========================================================================
   IMMERSE FIT — stage.js
   場面（シーン）を拍に合わせて再生します。
   1つの「クリップ」= 1つの場面で2回（トントン）。当たる瞬間は hits の拍。
   ========================================================================= */
import { Kit, E, clamp, rng, hashStr } from './kit.js';

// 動きの種類（場面の act）
export const ACTS = {
  hit: { name: '振り下ろす', lateral: 0 },
  punch: { name: 'パンチ', lateral: 0 },
  push: { name: '押す', lateral: 0 },
  pull: { name: '引く', lateral: 0 },
  lift: { name: '持ち上げる', lateral: 0 },
  stir: { name: '回す', lateral: 0, spin: 1 },
  wipe: { name: '左右に振る', lateral: 1 },
  clap: { name: '手をたたく', lateral: 0 },
  throw: { name: '投げる', lateral: 0 },
  squat: { name: 'しゃがむ', lateral: 0, smooth: 1 },
  knee: { name: 'ひざを上げる', lateral: 0 },
  kick: { name: 'キック', lateral: 0 },
  stomp: { name: '踏む', lateral: 0 },
  jump: { name: 'ジャンプ', lateral: 0, smooth: 1 },
  step: { name: '横に動く', lateral: 1, smooth: 1 },
};
export const THEMES = {
  kitchen: 'キッチン', diy: '工作', festival: 'お祭り', music: '音楽', sports: 'スポーツ', dojo: '道場', farm: '畑', nature: '自然',
  winter: '冬', sea: '海', space: '宇宙', town: 'まち', home: 'おうち', party: 'パーティー', school: '学校', animal: 'どうぶつ', game: 'ゲーム', spooky: 'おばけ', fantasy: 'ファンタジー',
};

// お手本がないとき（確認用ページ）の動き：p は「当たる位置からの離れぐあい」0〜1
export function defaultP(act, u) {
  const A = ACTS[act] || {};
  if (A.smooth || act === 'pull' || act === 'lift') return 0.5 - 0.5 * Math.cos(Math.PI * 2 * u);
  if (u < 0.06) return 0;
  if (u < 0.5) return E.ioQ((u - 0.06) / 0.44);
  if (u < 0.7) return 1;
  return 1 - E.inQ((u - 0.7) / 0.3);
}
// 効果音の名前（場面の sfx: 文字 / [1回目, 2回目] / 関数(k, v)）
export function sfxFor(inst, k) {
  const s = inst.v && inst.v.sfx !== undefined ? inst.v.sfx : inst.tpl.sfx; if (!s) return null;
  if (typeof s === 'function') return s(k, inst.v);
  if (Array.isArray(s)) return s[Math.min(k, s.length) - 1];
  return s;
}

export class Stage {
  constructor(canvas, o = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.g = new Kit(this.ctx); this.g.stage = this;
    this.clip = null; this.prevBeat = -1e9; this.safeW = o.safeW ?? 920; this.err = new Set();
    this.onSfx = o.onSfx || null;
    this.g.sfx = (name, opt) => { if (this.onSfx) this.onSfx(name, opt); };
    this.s = {}; this.lastT = 0;
    // 実写の映像を置く層（キャンバスの下）。あれば映像は <video> のまま表示し、キャンバスには効果だけを描く
    this.layer = o.layer || null; this.vidEl = null; this.vid = false;
    if (this.layer && !this.layer.querySelector('.vbg')) { const b = document.createElement('div'); b.className = 'vbg'; this.layer.appendChild(b); }
  }
  /* 映像を見せる：el = <video>、box = ステージ座標 {x,y,w,h}、o = { mirror, k: 拡大, bg: 背景画像(dataURL) } */
  showVideo(el, box, o = {}) {
    const L = this.layer; if (!L) return false;
    if (this.vidEl !== el) {
      if (this.vidEl && this.vidEl.parentNode === L) L.removeChild(this.vidEl);
      this.vidEl = el; el.classList.add('vclip'); L.appendChild(el); L.hidden = false;
    }
    const [x, y] = this.toScreen(box.x, box.y), w = box.w * this.scale, h = box.h * this.scale;
    const st = el.style;
    st.left = x + 'px'; st.top = y + 'px'; st.width = w + 'px'; st.height = h + 'px';
    st.transform = `${o.mirror ? 'scaleX(-1) ' : ''}scale(${(o.k || 1).toFixed(4)})`;
    st.opacity = o.alpha === undefined ? 1 : o.alpha;
    const bg = L.querySelector('.vbg'); if (bg && o.bg !== undefined && bg.dataset.src !== o.bg) { bg.dataset.src = o.bg; bg.style.backgroundImage = o.bg ? `url(${o.bg})` : ''; }
    return true;
  }
  hideVideo() {
    const L = this.layer; if (!L) return;
    if (this.vidEl && this.vidEl.parentNode === L) L.removeChild(this.vidEl);
    this.vidEl = null; L.hidden = true; const bg = L.querySelector('.vbg'); if (bg) { bg.dataset.src = ''; bg.style.backgroundImage = ''; }
  }
  // w,h は CSS ピクセル
  resize(w, h, dpr = Math.min(2, window.devicePixelRatio || 1)) {
    this.W = w; this.H = h; this.dpr = dpr;
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) { this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr); }
    const sc = this.scale = Math.min(w / this.safeW, h / 1000);
    this.ox = (w - 1000 * sc) / 2; this.oy = (h - 1000 * sc) / 2;
    this.g.V = { x0: -this.ox / sc, y0: -this.oy / sc, x1: (w - this.ox) / sc, y1: (h - this.oy) / sc };
  }
  // ステージ座標 → CSS ピクセル
  toScreen(x, y) { return [this.ox + x * this.scale, this.oy + y * this.scale]; }

  begin(clip) {
    // 同じ場面のつづき（2回目のトントン）は、前の絵を横へ流して入れかえる
    this.slide = null;
    if (clip.same && this.clip && !clip.inst.tpl.noSlide && this.cv.width && typeof document !== 'undefined') {
      const b = this._buf || (this._buf = document.createElement('canvas'));
      if (b.width !== this.cv.width || b.height !== this.cv.height) { b.width = this.cv.width; b.height = this.cv.height; }
      b.getContext('2d').drawImage(this.cv, 0, 0); this.slide = b;
    }
    this.clip = clip; this.fired = clip.hits.map(() => false); this.g.fx.clear(); this.tIn = 0;
    this.vid = !!(clip.inst.tpl.video && this.layer); if (!this.vid) this.hideVideo();
    const s = this.s = { my: {}, r: rng(clip.seed ?? hashStr(clip.inst.id)), round: clip.round ?? 1, mode: clip.mode ?? 'one', act: clip.act, n: clip.hits.length, V: this.g.V, idx: clip.idx ?? 0, rep: clip.rep0 ?? 0, last: !!clip.last, sub: clip.sub ?? 0, clip };
    try { clip.inst.tpl.init && clip.inst.tpl.init(s, clip.inst.v, this.g); } catch (e) { this.report(clip.inst, e); }
  }
  report(inst, e) { const k = (inst && inst.id) + ':' + e.message; if (!this.err.has(k)) { this.err.add(k); console.warn('[scene]', inst && inst.id, e); } }

  /* 1コマ描く
     clip: { inst, act, mode, sides:[...], dirs:[...], hits:[拍,...], b0, b1, seed, round, idx, same }
     o: { beat, spb, dt, p?, x?, ang? }  （p/x/ang はお手本から。なければ確認用の動き） */
  frame(clip, o) {
    if (clip !== this.clip) this.begin(clip);
    const g = this.g, c = this.ctx, s = this.s, beat = o.beat, spb = o.spb, H = clip.hits, n = H.length;
    const rpb = n > 1 ? (H[1] - H[0]) : 2;
    let k = 0; while (k < n && beat >= H[k]) k++;
    s.k = k; s.ph = (beat - H[0]) / rpb; s.u = s.ph - Math.floor(s.ph);
    const D = clip.dirs || clip.sides, nx = Math.min(k, n - 1), lx = Math.max(0, k - 1);
    s.side = clip.sides[nx]; s.lastSide = clip.sides[lx]; s.dir = D[nx]; s.lastDir = D[lx];
    s.age = k ? (beat - H[k - 1]) * spb : Infinity;
    s.p = o.p ?? defaultP(clip.act, s.u);
    // 左右の位置 -1〜1（当たる瞬間にその側の端）
    const dsg = d => d === 'L' ? -1 : 1;
    if (o.x !== undefined) s.x = o.x; else {
      let from, to, t;
      if (k === 0) { to = dsg(D[0]); from = -to; t = 1 + s.ph; }
      else if (k < n) { from = dsg(D[k - 1]); to = dsg(D[k]); t = (beat - H[k - 1]) / rpb; }
      else { from = dsg(D[n - 1]); to = -from; t = (beat - H[n - 1]) / rpb; }
      s.x = from + (to - from) * E.ioQ(clamp(t));
    }
    s.ang = o.ang ?? (s.ph * Math.PI * 2);
    s.t = (beat - clip.b0) * spb; s.beat = beat; s.spb = spb; s.spr = rpb * spb; s.dt = o.dt ?? 1 / 60; s.V = g.V;
    // 当たった瞬間
    for (let i = 0; i < n; i++) {
      if (!this.fired[i] && beat >= H[i]) {
        this.fired[i] = true;
        const keep = [s.k, s.age, s.lastSide, s.lastDir];
        s.k = i + 1; s.age = (beat - H[i]) * spb; s.lastSide = clip.sides[i]; s.lastDir = D[i];
        try { clip.inst.tpl.hit && clip.inst.tpl.hit(g, s, i + 1, clip.inst.v); } catch (e) { this.report(clip.inst, e); }
        [s.k, s.age, s.lastSide, s.lastDir] = keep;
      }
    }
    this.prevBeat = beat;
    // 描画
    const d = this.dpr, sc = this.scale;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
    if (this.vid) c.clearRect(0, 0, this.cv.width, this.cv.height); else { c.fillStyle = '#100d22'; c.fillRect(0, 0, this.cv.width, this.cv.height); }
    c.setTransform(d * sc, 0, 0, d * sc, d * this.ox, d * this.oy);
    g.fx.update(s.dt);
    const [jx, jy] = g.fx.shakeOffset();
    if (this.layer) this.layer.style.transform = (jx || jy) ? `translate(${(jx * sc).toFixed(1)}px,${(jy * sc).toFixed(1)}px)` : '';
    this.tIn += s.dt;
    const SL = 0.26, sl = this.slide && this.tIn < SL ? E.ioC(this.tIn / SL) : 1;
    const zin = !this.slide && this.tIn < 0.16 ? 1 + 0.05 * Math.pow(1 - this.tIn / 0.16, 2) : 1;
    c.save();
    c.translate(jx + (1 - sl) * (g.V.x1 - g.V.x0), jy);
    if (zin !== 1) { c.translate(500, 500); c.scale(zin, zin); c.translate(-500, -500); }
    try { clip.inst.tpl.draw(g, s, clip.inst.v); }
    catch (e) {
      this.report(clip.inst, e); c.restore(); c.save(); c.setTransform(d * sc, 0, 0, d * sc, d * this.ox, d * this.oy);
      g.bg('#1b1840'); g.text(clip.inst.name, 500, 500, { size: 70, f: '#fff' });
    }
    g.fx.draw();
    c.restore();
    g.fx.drawFlash();
    if (this.slide && sl < 1) { c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.slide, -sl * this.cv.width, 0); }
    else if (!this.slide && this.tIn < 0.1) { c.globalAlpha = 0.18 * (1 - this.tIn / 0.1); g.rect(g.V.x0, g.V.y0, g.V.x1 - g.V.x0, g.V.y1 - g.V.y0, '#ffffff', 0); c.globalAlpha = 1; }
    return s;
  }
}
