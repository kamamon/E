/* =========================================================================
   IMMERSE FIT — main.js（画面の切りかえと進行）
   ========================================================================= */
import { store, dayKey } from './store.js';
import { Music } from './music.js';
import { Voice } from './voice.js';
import { MotionCam } from './cam.js';
import { Stage, ACTS } from './stage.js';
import { drawFigure, coachFrames } from './figure.js';
import { drawBack, backLayout, BACK_BG } from './backcoach.js';
import { preloadImgCoach } from './imgcoach.js';
import { pool as realPool, CLIPS, ALL_REAL, REAL_BY_ID, realReady } from './real.js';
import { imgPool, PHOTOS } from './photo.js';
import { catalog, VERSIONS, LEVELS, levelOf, buildSession, REPS, PER_ROUND, PRACTICE, sceneIds, subOf } from './types.js';
import { rig, pAt, xAt, jointsAtRep, sideOf, dirOf } from './motions.js';
import { SCENES, SCENE_BY_ID } from './scenes/index.js';
import { Run } from './run.js';
import { hashStr, rng } from './kit.js';
import { hitCfg, HIT_BY_ID, HITS, playHit, renderHit, loudness, prepareHits, hitCached } from './hits.js';
import { playSfx } from './sfx.js';
import { setupSfx, openSfx, sfxOpen, closeSfx } from './sfxui.js';
import { initMine, MINE, stats as mineStats } from './mine.js';
import { setupMine, renderMine, closeMineDialogs } from './mineui.js';

const $ = s => document.querySelector(s);
const C = catalog();
const music = new Music(), voice = new Voice(music), mcam = new MotionCam();
const IS_ART = !!window.__ARTIFACT__;
let mode = 'home', run = null, lastPlan = null, paused = false, pauseBeat = 0, raf = 0, lastT = performance.now();
const VER = Object.fromEntries(VERSIONS.map(v => [v.key, v]));

/* ---------- 小さな道具 ---------- */
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
const lvDots = n => `<span class="lv" aria-label="強度${n}">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function glyph(region) {
  const on = 'var(--accent)', off = 'rgba(255,255,255,.26)';
  const has = p => region === 'full' || (region === 'upper' && ['torso', 'arm'].includes(p)) || (region === 'lower' && ['hips', 'leg'].includes(p)) || (region === 'arms' && p === 'arm');
  const c = p => has(p) ? on : off;
  return `<svg viewBox="0 0 44 56" aria-hidden="true"><circle cx="22" cy="7" r="5.2" fill="${region === 'full' ? on : off}"/><rect x="15" y="14" width="14" height="16" rx="6" fill="${c('torso')}"/>
  <path d="M14 17L8 29M30 17L36 29" stroke="${c('arm')}" stroke-width="4.4" stroke-linecap="round"/><rect x="15.5" y="29" width="13" height="7" rx="3.5" fill="${c('hips')}"/>
  <path d="M18.5 36L17 52M25.5 36L27 52" stroke="${c('leg')}" stroke-width="5" stroke-linecap="round"/></svg>`;
}
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4" stroke-linecap="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" stroke-linecap="round"/></svg>',
};
function unlockAudio() { music.unlock(); voice.unlock(); }
// 打点の効果音の設定・自分の画像の使い方を反映
function syncPrefs() { const s = store.s; hitCfg.mode = s.hitMode || 'scene'; hitCfg.fixed = s.hitFixed || ''; hitCfg.fav = (s.hitFav || []).filter(id => HIT_BY_ID.has(id)); MINE.mode = s.mineMode || 'mix'; }
syncPrefs();
// ファイルを保存（アーティファクトの中では「ダウンロード」の確認を出す。ふつうのブラウザではそのまま保存）
async function saveFile(name, blob) {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const d = await window.claude.use('downloads');
      if (d) { await d.save({ filename: name, data: blob }); return true; }
    }
  } catch (e) {
    if (e && e.code === 'declined') return false;
    if (e && e.code === 'rate_limited') { toast('少し待ってから、もう一度押してください'); return false; }
  }
  if (IS_ART) { toast('このプレビューではファイルを保存できません。GitHub Pages で公開した版で使えます'); return false; }
  const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 8000); return true;
}
const look = () => store.s.look || 'real';
// 実写の映像を先読み
const preload = ids => {
  const insts = ids.map(id => SCENE_BY_ID.get(id)).filter(x => x && x.real);
  if (realPool) realPool.want(insts.filter(x => !x.photo).map(x => x.v.clip));
  if (imgPool) for (const x of insts) if (x.photo) imgPool.want(x.v.set.images);
};
let wl = null;
function wakeLock(on) {
  try {
    if (on && 'wakeLock' in navigator && !wl) navigator.wakeLock.request('screen').then(x => { wl = x; x.addEventListener('release', () => { wl = null; }); }).catch(() => { });
    if (!on && wl) { wl.release().catch(() => { }); wl = null; }
  } catch (e) { /* 対応していない端末 */ }
}

/* =========================================================================
   左にお手本・右に場面を並べたプレビュー（ホーム・遊び方・種目の詳細）
   ========================================================================= */
class Duo {
  constructor(root) {
    this.root = root; this.cc = root.querySelector('.duo-c canvas'); this.sc = root.querySelector('.duo-s canvas');
    this.cx = this.cc.getContext('2d'); this.st = new Stage(this.sc, { layer: root.querySelector('.duo-s .vl') });
    this.lm = root.querySelector('.duo-c b'); this.ls = root.querySelector('.duo-s b');
    this.type = null; this.auto = false; this.t0 = performance.now(); this.key = ''; this.clip = null; this.next = null;
  }
  set(type, auto = false, next = null) { this.type = type; this.auto = auto; this.next = next; this.t0 = performance.now(); this.key = ''; this.clip = null; if (this.lm) this.lm.textContent = type ? type.name : ''; if (type) preload(sceneIds(type, look()).slice(0, 2)); }
  fit(cv) { const w = cv.clientWidth, h = cv.clientHeight, d = Math.min(2, devicePixelRatio || 1); if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); } return [w, h, d]; }
  frame(now, dt) {
    const t = this.type; if (!t || !this.sc.clientWidth) return;
    const [sw, sh] = [this.sc.clientWidth, this.sc.clientHeight]; if (sw !== this.sw || sh !== this.shh) { this.sw = sw; this.shh = sh; this.st.resize(sw, sh); }
    const spb = 60 / 100, rpb = t.m.rpb, beat = Math.max(0, (now - this.t0) / 1000) / spb + 0.45 * rpb;
    const c = Math.max(0, Math.floor((beat - 0.45 * rpb) / (2 * rpb))), k = Math.floor(c / 2), q = c % 2;
    if (this.auto && k >= 2) { this.set(this.next ? this.next() : t, true, this.next); return this.frame(now, dt); }
    const round = Math.floor(k / PER_ROUND) % 2 + 1, R = rig(t.m, t.mode === 'one' && round === 2 ? 'L' : 'R');
    const key = k + ':' + q;
    if (key !== this.key) {
      const ids = sceneIds(t, look()), H = j => rpb * (j + 1), j0 = c * 2, inst = SCENE_BY_ID.get(ids[k % ids.length]); if (!inst) return;
      if (q === 0) preload([ids[(k + 1) % ids.length]]);
      this.clip = { inst, act: t.act, mode: t.mode, round, idx: k, show: k % PER_ROUND, sub: q, same: q > 0, sides: [sideOf(R, j0), sideOf(R, j0 + 1)], dirs: [dirOf(R, j0), dirOf(R, j0 + 1)], hits: [H(j0), H(j0 + 1)], b0: H(j0) - 0.55 * rpb, b1: H(j0 + 1) + 0.45 * rpb, seed: hashStr(t.id + key) };
      this.key = key; if (this.ls) this.ls.textContent = inst.name; if (this.lm) this.lm.textContent = t.name;
    }
    const rf = (beat - rpb) / rpb;
    this.st.frame(this.clip, { beat, spb, dt, p: pAt(R, rf), x: xAt(R, rf) });
    // お手本
    const [w, h, d] = this.fit(this.cc), cx = this.cx;
    cx.setTransform(d, 0, 0, d, 0, 0);
    cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h);
    const f = rf - Math.floor(rf), hh = Math.min(h * 0.66, w * 1.25), F = coachFrames(R, rf);
    if (F.back) drawBack(cx, R, rf, { w, h, dpr: d, kind: 'panel', impact: f < 0.2 ? f / 0.2 : undefined });
    else drawFigure(cx, F.J, { x: w / 2, y: h * 0.82, h: hh, view: t.m.view, ...F, mini: true, impact: f < 0.2 ? f / 0.2 : undefined });
    // タイミングの輪（いっぱいになった瞬間に動く）。うしろ姿のお手本では、腕と反対の側（頭の横）に
    const rr = Math.min(w, h) * (F.back ? 0.1 : 0.13), flash = f < 0.12;
    const rx = F.back ? (R.side === 'L' ? w - rr - 7 : rr + 7) : w - rr - 7, ry = F.back ? h * 0.47 : rr + 7;
    cx.setTransform(d, 0, 0, d, 0, 0);
    cx.lineWidth = 4; cx.strokeStyle = 'rgba(255,255,255,0.16)'; cx.beginPath(); cx.arc(rx, ry, rr, 0, Math.PI * 2); cx.stroke();
    cx.strokeStyle = flash ? '#ffffff' : '#ffd23f'; cx.beginPath(); cx.arc(rx, ry, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (flash ? 1 : f)); cx.stroke();
    if (flash) { cx.fillStyle = 'rgba(255,210,63,0.35)'; cx.beginPath(); cx.arc(rx, ry, rr, 0, Math.PI * 2); cx.fill(); }
  }
}
function pickHeroType() {
  const all = (C[store.s.ver] || C.full), real = look() !== 'illust' ? all.filter(t => t.real && t.real.length) : [];
  const list = (real.length ? real : all).filter(t => ['hit', 'punch', 'kick', 'clap', 'stomp', 'jump', 'squat', 'lift', 'pull', 'throw'].includes(t.act));
  return list[Math.floor(Math.random() * list.length)] || C.full[0];
}
const hero = new Duo($('#hero'));
const helpDuo = new Duo($('#helpDuo'));
let detailDuo = null;
// はじめての人向けの1種目（片手で振り下ろす × キッチン・工作・お祭り）
function tutorialType() {
  const base = C.arms.find(t => t.motion === 'hit1') || C.arms[0];
  if (look() !== 'illust') {
    const qq = x => (x.v.clip && x.v.clip.quality) || (x.v.set && x.v.set.quality) || 3;
    const R1 = ALL_REAL.filter(x => x.acts.includes('hit')).sort((a, b) => (b.modes.includes('one') - a.modes.includes('one')) || (qq(b) - qq(a)));
    const ids = [], grp = new Set();
    for (const x of R1) { if (ids.length >= PER_ROUND) break; if (!grp.has(x.grp)) { grp.add(x.grp); ids.push(x.id); } }
    for (const x of R1) { if (ids.length >= PER_ROUND) break; if (!ids.includes(x.id)) ids.push(x.id); }
    if (ids.length >= 3) return { ...base, id: 'T-tutorial', scenes: ids, real: ids, sub: ids.slice(0, 3).map(id => SCENE_BY_ID.get(id).short).join('・'), subReal: ids.slice(0, 3).map(id => SCENE_BY_ID.get(id).short).join('・'), tutorial: true };
  }
  const want = ['hit-cut:carrot', 'hit-nail:plank', 'hit-drum:taiko'].filter(id => SCENE_BY_ID.has(id));
  const pool = SCENES.filter(x => x.acts.includes('hit') && x.modes.includes('one') && !want.includes(x.id) && x.tpl.id !== 'hit-cut' && x.tpl.id !== 'hit-nail');
  const ids = [...want]; const used = new Set();
  for (const x of pool) { if (ids.length >= PER_ROUND) break; if (!used.has(x.tpl.id)) { used.add(x.tpl.id); ids.push(x.id); } }
  return { ...base, id: 'T-tutorial', scenes: ids, real: [], sub: ids.slice(0, 3).map(id => SCENE_BY_ID.get(id).short).join('・'), tutorial: true };
}
function openHelp() { $('#help').hidden = false; helpDuo.set(tutorialType(), false); mode === 'home' && (mode = 'help'); }
function closeHelp() { $('#help').hidden = true; if (mode === 'help') mode = 'home'; store.d.helpSeen = 1; store.save(); }
$('#helpBtn').addEventListener('click', () => { unlockAudio(); openHelp(); });
$('#helpClose').addEventListener('click', closeHelp);
$('#helpTry').addEventListener('click', () => { unlockAudio(); closeHelp(); startSession({ only: tutorialType(), title: 'はじめての1種目' }); });

/* =========================================================================
   画面
   ========================================================================= */
function show(m) {
  if (m !== mode && realPool) realPool.pauseAll();
  mode = m;
  $('#home').hidden = !['home', 'setup'].includes(m);
  $('#library').hidden = !['library', 'detail'].includes(m);
  $('#detail').hidden = m !== 'detail';
  $('#records').hidden = m !== 'records';
  $('#settings').hidden = m !== 'settings';
  $('#mine').hidden = m !== 'mine';
  $('#play').hidden = m !== 'play';
  const tabMode = { home: 'home', setup: 'home', library: 'library', detail: 'library', records: 'records', settings: 'settings' }[m];
  const nav = tabs();
  if (tabMode && tabMode !== 'home') $('#' + tabMode).append(nav); else if (tabMode) $('#home').append(nav);
  nav.hidden = !tabMode;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tabMode));
}
function tabs() {
  const nav = $('#tabs');
  if (!nav.dataset.ready) {
    nav.dataset.ready = 1;
    nav.innerHTML = [['home', 'ホーム', ICON.home], ['library', '種目', ICON.list], ['records', '記録', ICON.cal], ['settings', '設定', ICON.gear]]
      .map(([k, n, ic]) => `<button data-t="${k}" aria-label="${n}">${ic}<span>${n}</span></button>`).join('');
    nav.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; unlockAudio();
      const t = b.dataset.t;
      if (t === 'home') { show('home'); renderHome(); }
      if (t === 'library') { show('library'); renderLibrary(); }
      if (t === 'records') { show('records'); renderRecords(); }
      if (t === 'settings') { show('settings'); renderSettings(); }
    });
  }
  return nav;
}

/* ---------- ホーム ---------- */
function daily() {
  const h = hashStr(dayKey()), v = VERSIONS[h % 4];
  return { ver: v.key, minutes: [5, 7, 10][h % 3], seed: h, title: '今日のチャレンジ' };
}
function renderHome() {
  const s = store.s, L = levelOf(s.level);
  $('#stats').innerHTML = `<span class="stat">連続 <b>${store.streak()}</b> 日</span><span class="stat">今週 <b>${store.weekMinutes()}</b> 分</span><span class="stat">図鑑 <b>${store.foundCount()}</b> / 2000</span>`;
  $('#tiles').innerHTML = VERSIONS.map(v => {
    const n = store.foundCount(v.pre), all = C[v.key].length;
    return `<button class="tile ${s.ver === v.key ? 'on' : ''}" data-v="${v.key}">${glyph(v.key)}<span class="nm">${v.name}</span><span class="meta">${all}種目　発見 ${n}</span><span class="bar"><i style="width:${Math.max(2, n / all * 100)}%"></i></span></button>`;
  }).join('');
  $('#goAuto').innerHTML = `おまかせで始める<small>${VER[s.ver].name}・${s.minutes}分・${L.name}</small>`;
  const d = daily(); $('#dailyDesc').textContent = `${VER[d.ver].name}・${d.minutes}分`;
  const ms = mineStats(); $('#mineDesc').textContent = ms.sets ? `${ms.sets}組・${ms.images}枚を場面に使っています` : '生成AIなどで作った画像を、動きごとに場面へ';
  if (!hero.type || hero.type.ver !== s.ver) hero.set(pickHeroType(), true, pickHeroType);
}
$('#tiles').addEventListener('click', e => { const b = e.target.closest('.tile'); if (!b) return; unlockAudio(); store.set('ver', b.dataset.v); renderHome(); openSetup(); });
$('#goAuto').addEventListener('click', () => { unlockAudio(); startSession({ ver: store.s.ver }); });
$('#goDaily').addEventListener('click', () => { unlockAudio(); const d = daily(); startSession({ ver: d.ver, minutes: d.minutes, seed: d.seed, title: d.title }); });
let mineFrom = 'settings';
function openMine(from) { mineFrom = from; show('mine'); renderMine(); $('#mineBody').scrollTop = 0; }
$('#goMine').addEventListener('click', () => { unlockAudio(); openMine('home'); });

/* ---------- メニュー設定 ---------- */
function openSetup() {
  const s = store.s, v = VER[s.ver];
  const sw = (k, label, sub) => `<div class="tg"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><button class="sw" role="switch" aria-checked="${!!s[k]}" data-k="${k}" aria-label="${label}"></button></div>`;
  $('#setup').innerHTML = `
    <button class="close" id="setupX" aria-label="閉じる">✕</button>
    <h3 id="setupTitle">${glyph(v.key)}${v.name}</h3>
    <p class="lead">${v.desc}。1種目 約1分・50回</p>
    <div class="fl">時間</div><div class="seg" id="sMin">${[3, 5, 10, 15, 20].map(m => `<button data-m="${m}" class="${s.minutes === m ? 'on' : ''}">${m}分</button>`).join('')}</div>
    <div class="fl">テンポ<small>プレイ中も「ひと休み」から変えられます</small></div><div class="seg" id="sLv">${LEVELS.map(l => `<button data-l="${l.key}" class="${s.level === l.key ? 'on' : ''}">${l.name}<em>${l.bpm}</em></button>`).join('')}</div>
    <div class="toggles">
      ${sw('quiet', '静音モード（ジャンプなし）', 'マンションや夜でも安心')}
      ${sw('voice', '音声ガイド', '動きの名前と回数を読み上げます')}
      ${IS_ART ? '' : sw('cam', 'カメラで動きをチェック', '映像は端末の中だけで処理します')}
    </div>
    <div class="summary" id="sSum"></div>
    <button class="cta" id="sGo">スタート</button>`;
  const sum = () => { const n = Math.max(1, Math.round(store.s.minutes * 60 / 70)); $('#sSum').textContent = `およそ ${n} 種目（${n * 50} 回）を、毎回ちがう組み合わせで。`; };
  sum();
  $('#setupWrap').hidden = false;
}
$('#setup').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'setupX') { $('#setupWrap').hidden = true; return; }
  if (b.id === 'sGo') { $('#setupWrap').hidden = true; startSession({ ver: store.s.ver }); return; }
  if (b.dataset.m) { store.set('minutes', +b.dataset.m); openSetup(); renderHome(); }
  if (b.dataset.l) { store.set('level', +b.dataset.l); openSetup(); renderHome(); }
  if (b.dataset.k) { const v = !store.s[b.dataset.k]; store.set(b.dataset.k, v); b.setAttribute('aria-checked', v); }
});
$('#setupBg').addEventListener('click', () => { $('#setupWrap').hidden = true; });

/* ---------- 種目ライブラリ ---------- */
const lib = { ver: 'full', act: '', q: '', limit: 60, sel: null };
function libList() {
  let list = C[lib.ver];
  if (lib.act) list = list.filter(t => t.act === lib.act);
  if (lib.q) { const q = lib.q.toLowerCase(); list = list.filter(t => (t.name + sceneIds(t, look()).map(id => SCENE_BY_ID.get(id)?.name || '').join(' ') + t.no).toLowerCase().includes(q)); }
  return list;
}
function renderLibrary() {
  if (!lib.verSet) { lib.ver = store.s.ver; lib.verSet = 1; }
  $('#libVer').innerHTML = VERSIONS.map(v => `<button data-v="${v.key}" class="${lib.ver === v.key ? 'on' : ''}">${v.name} ${C[v.key].length}</button>`).join('');
  const acts = [...new Set(C[lib.ver].map(t => t.act))];
  $('#libCats').innerHTML = `<button data-a="" class="${!lib.act ? 'on' : ''}">すべて</button>` + acts.map(a => `<button data-a="${a}" class="${lib.act === a ? 'on' : ''}">${ACTS[a].name}</button>`).join('');
  const list = libList();
  $('#libCount').textContent = `${list.length} 種目　発見済み ${list.filter(t => store.found(t.id)).length}`;
  $('#libList').innerHTML = list.slice(0, lib.limit).map(t => `<button class="row" data-id="${t.id}"><span class="no ${store.found(t.id) ? 'found' : ''}">${t.no}</span><span class="tt">${esc(t.name)}<span class="sub">${esc(subOf(t, look()))} ほか</span></span>${store.isFav(t.id) ? '<span class="star on">★</span>' : lvDots(t.lvl)}</button>`).join('')
    + (list.length > lib.limit ? `<button class="more" id="libMore">もっと見る（あと ${list.length - lib.limit}）</button>` : '');
}
$('#libVer').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; lib.ver = b.dataset.v; lib.act = ''; lib.limit = 60; renderLibrary(); $('#libList').scrollTop = 0; });
$('#libCats').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; lib.act = b.dataset.a; lib.limit = 60; renderLibrary(); $('#libList').scrollTop = 0; });
$('#libQ').addEventListener('input', e => { lib.q = e.target.value.trim(); lib.limit = 60; renderLibrary(); });
$('#libList').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'libMore') { lib.limit += 60; renderLibrary(); return; } openDetail(C.byId.get(b.dataset.id)); });
function openDetail(t) {
  lib.sel = t;
  const scs = sceneIds(t, look()).map(id => SCENE_BY_ID.get(id)).filter(Boolean);
  $('#detail').innerHTML = `<button class="close" id="dX" aria-label="閉じる">✕</button>
    <div class="code">No.${t.no}　${VER[t.ver].name}${store.found(t.id) ? '　発見済み' : ''}</div>
    <h3>${esc(t.name)}</h3>
    <div class="duo" id="dDuo"><div class="duo-c"><canvas></canvas><span class="dl">お手本</span><b></b></div><div class="arrow" aria-hidden="true">▶</div><div class="duo-s"><div class="vl" hidden><div class="vbg"></div></div><canvas></canvas><span class="dl">場面</span><b></b></div></div>
    <p class="cue">${esc(t.m.cue)}。お手本5回 → この5つの場面を4回ずつ2巡 → ラスト5回（合計50回）。${t.mode === 'one' ? '2巡目は反対側で。' : ''}</p>
    <div class="scn">${scs.map(s => `<span>${esc(s.name)}</span>`).join('')}</div>
    <div class="btns"><button class="cta" id="dGo">この種目をやる</button><button class="round glass star ${store.isFav(t.id) ? 'on' : ''}" id="dFav" aria-label="お気に入り" aria-pressed="${store.isFav(t.id)}">${store.isFav(t.id) ? '★' : '☆'}</button></div>`;
  show('detail');
  detailDuo = new Duo($('#dDuo')); detailDuo.set(t, false);
}
$('#detail').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'dX') { detailDuo = null; show('library'); renderLibrary(); }
  if (b.id === 'dGo') { unlockAudio(); detailDuo = null; startSession({ only: lib.sel }); }
  if (b.id === 'dFav') { const on = store.toggleFav(lib.sel.id); b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); toast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました'); }
});

/* ---------- 記録 ---------- */
function renderRecords() {
  const T = store.totals(), days = store.days(), d = new Date(), cells = [];
  const start = new Date(d); start.setDate(d.getDate() - 34 - ((d.getDay() + 6) % 7) + 6);
  for (let i = 0; i < 35; i++) { const x = new Date(start); x.setDate(start.getDate() + i); const k = dayKey(x); cells.push(`<i class="${days.has(k) ? 'on' : ''} ${k === dayKey() ? 'today' : ''}"></i>`); }
  const hist = store.d.history.slice(0, 12).map(h => { const dt = new Date(h.at); return `<li><span>${dt.getMonth() + 1}/${dt.getDate()}　${VER[h.ver] ? VER[h.ver].name : ''}・${h.n}種目</span><span>${Math.round(h.sec / 60)}分・${h.reps || 0}回</span></li>`; }).join('');
  $('#recBody').innerHTML = `
    <div class="kpis"><div><b>${store.streak()}</b><span>連続日数</span></div><div><b>${T.min}</b><span>合計（分）</span></div><div><b>${T.kcal}</b><span>kcal（目安）</span></div></div>
    <div class="h3">この5週間</div><div class="calh">${['月', '火', '水', '木', '金', '土', '日'].map(x => `<span>${x}</span>`).join('')}</div><div class="cal">${cells.join('')}</div>
    <div class="h3">図鑑（やった種目）</div><div class="disc">${VERSIONS.map(v => { const n = store.foundCount(v.pre), all = C[v.key].length; return `<div><span>${v.name}</span><span class="bar"><i style="width:${Math.max(1, n / all * 100)}%"></i></span><span>${n}/${all}</span></div>`; }).join('')}</div>
    <div class="h3">最近</div><ul class="done hist">${hist || '<li><span>まだ記録がありません。最初の1種目をやってみましょう。</span></li>'}</ul>`;
}

/* ---------- 設定 ---------- */
const HIT_MODES = [['scene', '場面に合わせる'], ['fav', 'お気に入りから'], ['fixed', '1つに固定']];
function hitRows(s) {
  const hm = s.hitMode || 'scene', fx = HIT_BY_ID.get(s.hitFixed), favN = (s.hitFav || []).filter(id => HIT_BY_ID.has(id)).length;
  const desc = hm === 'fixed' ? (fx ? `すべての打点を「${esc(fx.name)}」で鳴らします` : '鳴らす音をえらんでください')
    : hm === 'fav' ? (favN ? `★をつけた${favN}種類から、種目ごとに選びます` : '★をつけた音から選びます（まだ★がないので、いまは場面に合わせます）')
      : '太鼓・金づち・水しぶき…場面に合う系統の中から、種目ごとにちがう音を選びます';
  return `<div class="tg col"><span>打点の効果音（${HITS.length}種類）<small>${desc}</small></span><span class="seg" id="vHit">${HIT_MODES.map(([k, n]) => `<button data-hit="${k}" class="${hm === k ? 'on' : ''}" aria-pressed="${hm === k}">${n}</button>`).join('')}</span></div>
    <div class="tg"><span>効果音を試聴・えらぶ<small>★ ${favN}${fx ? `・固定：${esc(fx.name)}` : ''}</small></span><button class="pill" id="vHitLib">開く</button></div>`;
}
function mineRow() {
  const st = mineStats(), mm = { mix: '自分の画像を先に', only: '自分の画像だけ', off: '使わない' }[store.s.mineMode || 'mix'];
  return `<div class="tg"><span>自分の画像<small>${st.sets ? `${st.sets}組・${st.images}枚（${mm}）` : '生成AIなどで作った画像を、動きごとに場面へ当てはめます'}</small></span><button class="pill" id="vMine">当てはめる</button></div>`;
}
function pickFixed() {
  openSfx({ pick: true, current: store.s.hitFixed || '', title: '固定する効果音をえらぶ', onPick: id => { if (id && id !== 'auto') { store.set('hitFixed', id); store.set('hitMode', 'fixed'); } syncPrefs(); renderSettings(); } });
}
function renderSettings() {
  const s = store.s;
  const sw = (k, label, sub) => `<div class="tg"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><button class="sw" role="switch" aria-checked="${!!s[k]}" data-k="${k}" aria-label="${label}"></button></div>`;
  $('#setBody').innerHTML = `<div class="set">
    <div class="tg"><span>音楽の音量</span><input type="range" id="vMusic" min="0" max="1" step="0.05" value="${s.music}"></div>
    <div class="tg"><span>効果音の音量</span><input type="range" id="vSfx" min="0" max="1" step="0.05" value="${s.sfx}"></div>
    ${hitRows(s)}
    ${sw('voice', '音声ガイド', '動きの名前・回数・かけ声')}
    <div class="tg"><span>読み上げの速さ</span><input type="range" id="vRate" min="0.8" max="1.4" step="0.05" value="${s.rate}"></div>
    <div class="tg"><span>テンポ<small>1回 = 2拍。プレイ中も「ひと休み」から変えられます</small></span><span class="seg" id="vLv">${LEVELS.map(l => `<button data-l="${l.key}" class="${s.level === l.key ? 'on' : ''}">${l.name}<em>${l.bpm}</em></button>`).join('')}</span></div>
    <div class="tg"><span>場面の絵<small>写真：Canva で作った場面（${PHOTOS.length}組）。イラスト：アニメーション</small></span><span class="seg" id="vLook">${[['real', '写真'], ['illust', 'イラスト']].map(([k, n]) => `<button data-look="${k}" class="${look() === k ? 'on' : ''}">${n}</button>`).join('')}</span></div>
    ${mineRow()}
    <div class="tg"><span>場面の切りかえ<small>4回ごとがおすすめ。2回ごとはテンポよく次々に</small></span><span class="seg" id="vShow">${[4, 2].map(n => `<button data-show="${n}" class="${(s.show || 4) === n ? 'on' : ''}">${n}回ごと</button>`).join('')}</span></div>
    ${sw('quiet', '静音モード', 'ジャンプする種目を入れません')}
    ${IS_ART ? '<div class="tg"><span>カメラで動きをチェック<small>GitHub Pages で公開した版で使えます</small></span></div>' : sw('cam', 'カメラで動きをチェック', '場面に合わせて動けたかを数えます（映像は保存・送信しません）')}
    <div class="tg"><span>体重（消費カロリーの目安に使います）</span><span><input type="number" id="vW" min="20" max="200" value="${s.weight}"> kg</span></div>
    </div>
    <p class="note">場面の写真とお手本の3D人形は、このアプリのために Canva の画像生成で作ったものです。イラスト・音楽・効果音は、このアプリがその場で描いて鳴らしています。体調に合わせて無理をせず、痛みを感じたらすぐに中止してください。</p>
    <details class="credits"><summary>${CLIPS.length ? `映像・写真のクレジット（映像 ${CLIPS.length}本・写真 ${PHOTOS.reduce((a, s) => a + s.images.length, 0)}枚）` : `場面の写真（${PHOTOS.length}組・${PHOTOS.reduce((a, s) => a + s.images.length, 0)}枚）`}</summary><ul>${CLIPS.map(c => `<li><b>${esc(c.name)}</b><span>${esc(c.credit.author || '作者不明')}・${esc(c.credit.license)}・<a href="${esc(c.credit.page)}" target="_blank" rel="noopener">${esc(c.credit.file.replace(/^File:/, ''))}</a>（${esc(c.credit.changes || '切り出し・再エンコード')}）</span></li>`).join('')}${PHOTOS.flatMap(s => (s.credit ? [s.credit] : s.images.map(p => p.credit)).map(cr => `<li><b>${esc(s.name)}</b><span>${esc(cr.author || '作者不明')}・${esc(cr.license)}・${cr.page ? `<a href="${esc(cr.page)}" target="_blank" rel="noopener">${esc(cr.file.replace(/^File:/, ''))}</a>` : esc(cr.file)}（${esc(cr.changes || '縮小')}）</span></li>`)).join('')}</ul></details>
    <button class="danger" id="vReset">記録をすべて消す</button>`;
}
$('#setBody').addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'vMusic') { store.set('music', +t.value); music.setVolumes(store.s.music, store.s.sfx); }
  if (t.id === 'vSfx') { store.set('sfx', +t.value); music.setVolumes(store.s.music, store.s.sfx); }
  if (t.id === 'vRate') { store.set('rate', +t.value); voice.rate = +t.value; }
  if (t.id === 'vW') store.set('weight', Math.max(20, Math.min(200, +t.value || 55)));
});
$('#setBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.k) { const v = !store.s[b.dataset.k]; store.set(b.dataset.k, v); b.setAttribute('aria-checked', v); if (b.dataset.k === 'voice') { voice.on = v; if (v) voice.say('音声ガイドをオンにしました', { interrupt: true }); } }
  if (b.dataset.show) { store.set('show', +b.dataset.show); renderSettings(); return; }
  if (b.dataset.l) { store.set('level', +b.dataset.l); renderSettings(); renderHome(); return; }
  if (b.dataset.look) { store.set('look', b.dataset.look); renderSettings(); hero.set(pickHeroType(), true, pickHeroType); return; }
  if (b.dataset.hit) {
    unlockAudio(); store.set('hitMode', b.dataset.hit); syncPrefs(); renderSettings();
    if (b.dataset.hit === 'fixed' && !HIT_BY_ID.has(store.s.hitFixed)) pickFixed();
    if (b.dataset.hit === 'fav' && !hitCfg.fav.length) { toast('「開く」から好きな音に★をつけてください'); openSfx({ title: '効果音 500' }); }
    return;
  }
  if (b.id === 'vHitLib') { unlockAudio(); if ((store.s.hitMode || 'scene') === 'fixed') pickFixed(); else openSfx({ title: '効果音 500' }); return; }
  if (b.id === 'vMine') { unlockAudio(); openMine('settings'); return; }
  if (b.id === 'vReset') { if (b.dataset.sure) { store.reset(); renderSettings(); toast('記録を消しました'); } else { b.dataset.sure = 1; b.textContent = 'もう一度押すと消えます'; } }
});

/* =========================================================================
   プレイ
   ========================================================================= */
const stage = new Stage($('#stage'), { layer: $('#vl') });
const pip = $('#pipc'), pipCtx = pip.getContext('2d');
function fitStage() { stage.resize(innerWidth, innerHeight); const r = pip.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (r.width) { pip.width = Math.round(r.width * d); pip.height = Math.round(r.height * d); } measureCoachTop(); }
addEventListener('resize', () => { if (mode === 'play') fitStage(); });

// 大きなお手本（紹介・お手本5回・休憩）
let coachTop = 0, coachTopAt = 0;          // うしろ姿のお手本：上の文字（種目名など）の下から描く
function measureCoachTop() { const r = $('#play .ttl').getBoundingClientRect(); coachTop = r.height ? Math.round(r.bottom + 6) : 70; }
function drawCoachStage(J, view, info) {
  const c = stage.ctx, d = stage.dpr, W = stage.W, H = stage.H;
  c.setTransform(d, 0, 0, d, 0, 0); c.globalAlpha = 1;
  const f = info.rf - Math.floor(info.rf), imp = info.rf >= 0 && f < 0.2 ? f / 0.2 : undefined;
  if (info.F && info.F.back) { drawBack(c, info.F.R, info.rf, { w: W, h: H, dpr: d, kind: 'stage', top: coachTop, impact: imp }); return; }
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const land = W > H * 1.15, h = land ? H * 0.7 : Math.min(H * 0.56, W * 1.0), cy = land ? H * 0.5 + h * 0.5 : H * 0.53 + h * 0.5;
  drawFigure(c, J, { x: W / 2, y: cy, h, view, ...(info.F || {}), impact: imp });
}
function drawPip(J, view, f, flash, F) {
  const W = pip.width, H = pip.height; if (!W) return;
  const c = pipCtx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  const r = W / 2, lw = Math.max(4, W * 0.045), back = F && F.back;
  c.fillStyle = back ? BACK_BG : '#000'; c.beginPath(); c.arc(r, r, r - lw / 2, 0, Math.PI * 2); c.fill();
  c.save(); c.beginPath(); c.arc(r, r, r - lw, 0, Math.PI * 2); c.clip();
  if (back) { const dd = W / (pip.clientWidth || W); drawBack(c, F.R, F.rf, { w: W / dd, h: H / dd, dpr: dd, kind: 'pip', impact: f < 0.2 ? f / 0.2 : undefined }); }
  else drawFigure(c, J, { x: r, y: H * 0.88, h: H * 0.74, view, mini: true, ...(F || {}), ghosts: F && F.ghosts.slice(-2), impact: f < 0.2 ? f / 0.2 : undefined });
  c.restore();
  // タイミングの輪
  c.lineWidth = lw; c.strokeStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(r, r, r - lw / 2, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = flash ? '#ffffff' : '#ffd23f'; c.beginPath(); c.arc(r, r, r - lw / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (flash ? 1 : f)); c.stroke();
  if (flash) { c.fillStyle = 'rgba(255,210,63,0.25)'; c.beginPath(); c.arc(r, r, r - lw, 0, Math.PI * 2); c.fill(); }
}
// 場面が始まるとき：大きなお手本が右下の小窓へ縮んでいく
function drawFly(J, view, k, F) {
  const c = stage.ctx, d = stage.dpr, W = stage.W, H = stage.H, pr = pip.getBoundingClientRect(); if (!pr.width) return;
  if (F && F.back) {        // うしろ姿：全画面の配置 → 小窓の配置へ
    const e = 1 - Math.pow(1 - k, 3), A = backLayout(F.R.m, 'stage', W, H, coachTop), B = backLayout(F.R.m, 'pip', pr.width, pr.height);
    const L = { s: A.s + (B.s - A.s) * e, ox: A.ox + (pr.left + B.ox - A.ox) * e, oy: A.oy + (pr.top + B.oy - A.oy) * e };
    drawBack(c, F.R, F.rf, { w: W, h: H, dpr: d, ...L, bg: false, label: false, alpha: 1 - e * 0.8 });
    return;
  }
  const land = W > H * 1.15, h0 = land ? H * 0.7 : Math.min(H * 0.56, W * 1.0), y0 = land ? H * 0.5 + h0 * 0.5 : H * 0.53 + h0 * 0.5;
  const e = 1 - Math.pow(1 - k, 3), h = h0 + (pr.height * 0.74 - h0) * e, x = W / 2 + (pr.left + pr.width / 2 - W / 2) * e, y = y0 + (pr.top + pr.height * 0.88 - y0) * e;
  c.setTransform(d, 0, 0, d, 0, 0); c.globalAlpha = 1 - e * 0.85;
  drawFigure(c, J, { x, y, h, view, ground: false });
  c.globalAlpha = 1;
}

// 画面の文字
const hud = { name: '', cap: '', big: '', ph: '', hint: '', tb: '', ts: '' };
function setText(el, key, v, popCls) { if (hud[key] === v) return; hud[key] = v; el.textContent = v; if (popCls && v) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
let bigUntil = 0, bigText = '', bigSub = '', hintUntil = 0, hintText = '';
function flashBig(t, ms = 900, sub = '') { bigText = t; bigSub = sub; bigUntil = performance.now() + ms; }
function flashHint(t, ms = 2000) { hintText = t; hintUntil = performance.now() + ms; }
let lastRep = -1, lastRound = 0, lastBlk = -1;
function updateHud(info) {
  const t = info.t, now = performance.now(), blk = info.blk;
  if (blk.i !== lastBlk) { lastBlk = blk.i; lastRound = 0; }
  const labels = { rest: '次の種目', intro: 'お手本を見てね', practice: 'お手本といっしょに', scene: info.round === 2 ? '2巡目' : '場面', finale: 'ラスト5回', outro: 'できた！' };
  const nT = run.plan.types.length;
  setText($('#hPh'), 'ph', (labels[info.phase] || '') + (nT > 1 ? `　${blk.i + 1}/${nT}種目` : ''));
  setText($('#hName'), 'name', t.name);
  const backc = !!(info.F && info.F.back) && ['rest', 'intro', 'practice'].includes(info.phase);
  $('#play').classList.toggle('backc', backc);
  if (backc && now - coachTopAt > 700) { coachTopAt = now; measureCoachTop(); }   // 種目名が2行になったときなど
  $('#hName').style.visibility = !backc && (info.phase === 'intro' || info.phase === 'rest') ? 'hidden' : 'visible';
  // 紹介・休憩の見出し（うしろ姿のお手本では、お手本の上の動きの名前が見出しのかわり）
  const titled = !backc && (info.phase === 'intro' || info.phase === 'rest');
  $('#hTitle').hidden = !titled;
  if (titled) {
    setText($('#hTitleB'), 'tb', info.phase === 'rest' ? `次は「${t.name}」` : t.name);
    setText($('#hTitleS'), 'ts', info.phase === 'rest' ? `場面：${subOf(t, look())} ほか` : 'まずはお手本といっしょに5回');
  }
  const capOn = info.phase === 'scene' && info.clip;
  $('#hCap').hidden = !capOn;
  if (capOn) { setText($('#hScene'), 'cap', info.clip.inst.name, true); $('#hIdx').textContent = `${info.clip.show + 1}/${PER_ROUND}`; }
  $('#pipw').style.visibility = ['scene', 'finale', 'outro'].includes(info.phase) ? 'visible' : 'hidden';
  // 回数と合図
  if (info.rep !== lastRep) {
    if (info.rep >= 1 && info.rep <= PRACTICE && info.phase === 'practice') flashBig(String(info.rep), 520);
    lastRep = info.rep;
  }
  if (info.phase === 'scene' && lastRound === 0) { lastRound = 1; flashBig('場面スタート！', 2600, '動きはそのまま。右下の輪がいっぱいになったら動く'); }
  if (info.phase === 'scene' && info.round === 2 && lastRound !== 2) { lastRound = 2; flashBig(t.mode === 'one' ? (/kick/.test(t.motion) ? '反対の足で！' : '反対の手で！') : '2巡目！', 1800, t.mode === 'one' ? 'お手本も場面も左右が入れかわります' : '同じ場面をもう一度'); }
  const on = now < bigUntil, big = on ? bigText : '', sub = on ? bigSub : '';
  const bigEl = $('#hBig');
  if (hud.big !== big + '|' + sub) {
    hud.big = big + '|' + sub; bigEl.classList.toggle('small', big.length > 2);
    bigEl.innerHTML = big ? `${esc(big)}${sub ? `<small>${esc(sub)}</small>` : ''}` : '';
    if (big) { bigEl.classList.remove('pop'); void bigEl.offsetWidth; bigEl.classList.add('pop'); }
  }
  const hints = { intro: t.m.cue, practice: 'まねしてみよう', outro: 'ナイス！', rest: backc ? `次の場面：${subOf(t, look())} ほか` : '' };
  setText($('#hHint'), 'hint', now < hintUntil ? hintText : (hints[info.phase] || ''));
  $('#hRep').textContent = info.rep; $('#hOf').textContent = `/${REPS}回`;
  $('#hProg').style.width = (Math.min(1, info.beat / run.total) * 100).toFixed(1) + '%';
}

/* ---------- セッション ---------- */
async function startSession(opts) {
  const s = store.s;
  const plan = buildSession({ ver: opts.ver || s.ver, minutes: opts.minutes || s.minutes, level: s.level, quiet: s.quiet, seed: opts.seed || (Date.now() & 0xffffff), found: new Set(Object.keys(store.d.found)), recent: new Set(store.d.recent), only: opts.only });
  lastPlan = { opts, plan };
  beginPlan(plan, opts);
}
async function beginPlan(plan, opts) {
  const s = store.s;
  for (const t of plan.types) preloadImgCoach(t.m.key);   // 3D人形のお手本の画像を先に読みこむ
  $('#setupWrap').hidden = true; show('play'); fitStage();
  voice.on = s.voice; voice.rate = s.rate;
  music.setStyle(plan.music, opts.seed || 1); music.setVolumes(s.music, s.sfx);
  run = new Run(plan, {
    music, stage, voice, weight: s.weight, cam: null,
    drawCoach: drawCoachStage, drawPip, drawFly, hud: updateHud, showLen: s.show || 4, look: look(), preload, realReady,
    onTypeDone: t => { const isNew = store.markDone(t.id); if (isNew) run.fresh = (run.fresh || []).concat(t.id); store.save(); },
    onSync: ok => { const el = $('#hSync'); el.hidden = false; el.textContent = `シンクロ ${run.sync}/${run.syncN}`; },
  });
  run.t0 = performance.now(); run.opts = opts;
  music.section = b => run.section(b);
  music.start(plan.bpm, 0.5);
  paused = false; lastRep = -1; lastBlk = -1; Object.keys(hud).forEach(k => hud[k] = null); bigUntil = 0; hintUntil = 0;
  $('#hSync').hidden = true; $('#camPip').hidden = true;
  if (s.cam && !IS_ART) {
    try { await mcam.start($('#camv')); run.env.cam = mcam; $('#camPip').hidden = false; }
    catch (e) { toast('カメラが使えないため、カメラなしで続けます'); }
  }
  wakeLock(true);
}
function finish(quit) {
  if (!run) return;
  const r = run; run = null;
  music.stop(1.2); voice.stop(); wakeLock(false); mcam.stop(); realPool && realPool.pauseAll();
  const sec = Math.round((performance.now() - r.t0) / 1000);
  const done = r.typesDone;
  if (done.length || r.reps > 10) store.addSession({ day: dayKey(), at: Date.now(), ver: r.plan.ver, sec, kcal: r.kcal, n: done.length, reps: r.reps, ids: done.map(t => t.id), title: r.opts.title || '' });
  showResult(r, sec, quit);
}
function showResult(r, sec, quit) {
  show('result'); $('#play').hidden = true;
  const fresh = new Set(r.fresh || []), mm = Math.floor(sec / 60), ss = String(sec % 60).padStart(2, '0');
  const kc = r.kcal < 10 ? r.kcal.toFixed(1) : Math.round(r.kcal);
  $('#resCard').innerHTML = `<h2>おつかれさまでした${quit ? '<small style="font-size:14px;color:var(--muted);font-weight:500">（途中で終了）</small>' : ''}</h2>
    <p>${VER[r.plan.ver].name}・${r.typesDone.length}種目</p>
    <div class="big4"><div><b>${mm}:${ss}</b><span>時間</span></div><div><b>${r.reps}</b><span>回</span></div><div><b>${kc}</b><span>kcal（目安）</span></div><div><b>${r.syncN ? Math.round(r.sync / r.syncN * 100) + '%' : fresh.size}</b><span>${r.syncN ? 'シンクロ率' : '新しく発見'}</span></div></div>
    <ul class="done">${r.typesDone.map(t => `<li><span>${esc(t.name)}<span style="color:var(--muted);font-size:12px">　${esc(subOf(t, look()))}</span>${fresh.has(t.id) ? '<em>新発見</em>' : ''}</span><button class="star ${store.isFav(t.id) ? 'on' : ''}" data-fav="${t.id}" aria-label="お気に入り">${store.isFav(t.id) ? '★' : '☆'}</button></li>`).join('') || '<li><span>最後までできた種目はありませんでした</span></li>'}</ul>
    <button class="cta" id="rAgain">もう一回</button><button class="ghost" id="rHome">ホームへ</button>`;
  $('#result').hidden = false;
}
$('#result').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.fav) { const on = store.toggleFav(b.dataset.fav); b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); return; }
  if (b.id === 'rAgain') { $('#result').hidden = true; unlockAudio(); startSession(lastPlan.opts); }
  if (b.id === 'rHome') { $('#result').hidden = true; show('home'); renderHome(); }
});
// 一時停止
function renderPauseTempo() { $('#pLv').innerHTML = LEVELS.map(l => `<button data-l="${l.key}" class="${store.s.level === l.key ? 'on' : ''}">${l.name}<em>${l.bpm}</em></button>`).join(''); }
$('#pauseBtn').addEventListener('click', () => {
  if (!run || paused) return; paused = true; pauseBeat = music.beatNow();
  music.stop(0.2); voice.stop(); wakeLock(false); realPool && realPool.pauseAll();
  $('#pDesc').textContent = `${Math.floor((performance.now() - run.t0) / 60000)}分・${run.reps}回`;
  renderPauseTempo(); $('#pauseM').hidden = false;
});
// テンポを途中で変える（拍の位置はそのまま。次の「つづける」から新しい速さ）
$('#pLv').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !b.dataset.l || !run) return;
  const L = levelOf(+b.dataset.l); store.set('level', L.key); run.plan.bpm = L.bpm; run.plan.level = L.key; renderPauseTempo();
  toast(`テンポ：${L.name}（${L.bpm}）`);
});
function resumeAt(beat) {
  music.start(run.plan.bpm, 0.35); music.t0 = music.now + 0.35 - beat * music.spb(); music.step = Math.max(0, Math.ceil(beat * 4));
  paused = false; $('#pauseM').hidden = true; wakeLock(true);
}
$('#resume').addEventListener('click', () => { unlockAudio(); resumeAt(pauseBeat); });
$('#skip').addEventListener('click', () => {
  unlockAudio(); const blk = run.blockAt(pauseBeat), i = run.blocks.indexOf(blk);
  if (i >= run.blocks.length - 1) { $('#pauseM').hidden = true; paused = false; finish(true); return; }
  resumeAt(run.blocks[i + 1].intro[0]);
});
$('#quit').addEventListener('click', () => { $('#pauseM').hidden = true; paused = false; finish(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && run && !paused) $('#pauseBtn').click(); });

/* ---------- 毎フレーム ---------- */
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (mode === 'play' && run && !paused) {
    const info = run.update(music.beatNow(), dt);
    if (info && info.end) finish(false);
  } else if (mode === 'help') helpDuo.frame(now, dt);
  else if (mode === 'home') hero.frame(now, dt);
  else if (mode === 'detail' && detailDuo) detailDuo.frame(now, dt);
}

/* ---------- 効果音の一覧・自分の画像 ---------- */
const prefsChanged = () => { syncPrefs(); if (mode === 'settings') renderSettings(); if (mode === 'library') renderLibrary(); if (mode === 'home') renderHome(); hero.key = ''; };
setupSfx({ music, store, onChange: prefsChanged });
setupMine({ music, store, toast, saveFile, onChange: prefsChanged, back: () => { closeMineDialogs(); if (mineFrom === 'home') { show('home'); renderHome(); } else { show('settings'); renderSettings(); } } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sfxOpen()) closeSfx(); });
initMine().then(() => { prefsChanged(); if (MINE.list.length && mode === 'home') hero.set(pickHeroType(), true, pickHeroType); }).catch(e => console.warn('[mine]', e));

/* ---------- 起動 ---------- */
renderHome(); show('home');
requestAnimationFrame(t => { lastT = t; frame(t); });
const ld = $('#loading'); if (ld) ld.remove();
if (!store.d.helpSeen) openHelp();
if ('serviceWorker' in navigator && location.protocol === 'https:' && !IS_ART) navigator.serviceWorker.register('sw.js').catch(() => { });
window.__IF = { C, SCENES, store, music, stage, run: () => run, startSession, show, openDetail, renderHome, renderSettings, finish, openHelp, closeHelp, tutorialType, realPool, imgPool, CLIPS, PHOTOS, MINE, hitCfg, openSfx, renderMine, saveFile, snd: { playSfx, playHit, renderHit, loudness, HITS, prepareHits, hitCached } };
