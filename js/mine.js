/* =========================================================================
   IMMERSE FIT — mine.js
   自分の画像（生成AIなどで作った画像）を、動きごとの「組」にして場面に使います。
   ・組 = 同じ場面の画像 1〜8 枚（当たる瞬間に1枚ずつ切りかわる）＋当たる場所＋効果音＋擬音
   ・この端末（ブラウザ）に保存します（IndexedDB）
   ・書き出した zip の photos/ をサイトに置くと photos/custom.json から読み込み、見る人みんなに出ます
   ========================================================================= */
import { PHOTO } from './photo.js';
import { SCENE_BY_ID } from './scenes/index.js';
import { MINE } from './minereg.js';
import { familyFor, famPick, hitWord, HIT_BY_ID } from './hits.js';
import { zipWrite, zipRead } from './zip.js';

export { MINE };
export const MAX_IMAGES = 8, MAX_SIDE = 1440;
export const ACT_ORDER = ['hit', 'punch', 'clap', 'push', 'pull', 'lift', 'stir', 'wipe', 'throw', 'kick', 'stomp', 'knee', 'jump', 'squat', 'step'];
const ACTS_OK = new Set(ACT_ORDER), MODES_OK = ['one', 'alt', 'both'];
// ファイル名の先頭に書くと、その動きの組になる言葉（例：hit-鍛冶-1.jpg、パンチ_サンドバッグ_2.png）
export const ACT_WORDS = {
  hit: ['hit', '振り下ろす', '振りおろす', 'ふりおろす', 'たたく', '叩く', '打つ'], punch: ['punch', 'パンチ'], clap: ['clap', '手をたたく', '拍手', '手拍子'],
  push: ['push', '押す', 'おす'], pull: ['pull', '引く', 'ひく'], lift: ['lift', '持ち上げる', '上げる'], stir: ['stir', '回す', 'まわす', '混ぜる'],
  wipe: ['wipe', '左右に振る', 'ふく', '拭く'], throw: ['throw', '投げる', 'なげる'], kick: ['kick', 'キック', '蹴る', 'ける'], stomp: ['stomp', '踏む', 'ふむ', '足踏み'],
  knee: ['knee', 'ひざを上げる', 'ひざ', '膝'], jump: ['jump', 'ジャンプ', '跳ぶ', 'とぶ'], squat: ['squat', 'しゃがむ', 'スクワット'], step: ['step', '横に動く', 'ステップ'],
};
export function actOfWord(w) { w = String(w || '').normalize('NFKC').toLowerCase(); for (const [k, arr] of Object.entries(ACT_WORDS)) if (arr.some(a => a.toLowerCase() === w)) return k; return null; }

let db = null;
export const state = { ready: false, persist: false, error: '' };
const local = new Map(), site = new Map(), mem = new Map(), urls = new Map(), sizes = new Map(), drafts = new Set();
let tomb = new Set();
const subs = new Set();
export const onMine = f => { subs.add(f); return () => subs.delete(f); };
const rid = p => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const c01 = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0.5));
const mimeOf = n => /\.png$/i.test(n) ? 'image/png' : /\.webp$/i.test(n) ? 'image/webp' : /\.gif$/i.test(n) ? 'image/gif' : 'image/jpeg';

/* ---------- 保存（IndexedDB）。使えない環境ではこの画面を開いているあいだだけ ---------- */
const req2p = rq => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
function openDB() {
  return new Promise((res, rej) => {
    let rq; try { rq = indexedDB.open('immersefit-mine', 1); } catch (e) { rej(e); return; }
    rq.onupgradeneeded = () => { const d = rq.result; for (const s of ['sets', 'imgs']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); };
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); rq.onblocked = () => rej(new Error('blocked'));
    setTimeout(() => rej(new Error('timeout')), 5000);
  });
}
const os = (name, mode = 'readonly') => db.transaction(name, mode).objectStore(name);
const dbAll = name => req2p(os(name).getAll());
const dbGet = (name, key) => req2p(os(name).get(key));
const dbPut = (name, val, key) => req2p(key === undefined ? os(name, 'readwrite').put(val) : os(name, 'readwrite').put(val, key));
const dbDel = (name, key) => req2p(os(name, 'readwrite').delete(key));

/* ---------- 起動 ---------- */
export async function initMine() {
  try { if (typeof indexedDB !== 'undefined') { db = await openDB(); state.persist = true; } }
  catch (e) { db = null; state.persist = false; }
  if (db) {
    try {
      const [sets, imgs, t] = await Promise.all([dbAll('sets'), dbAll('imgs'), dbGet('meta', 'tomb')]);
      for (const im of imgs) if (im && im.blob) { urls.set(im.id, URL.createObjectURL(im.blob)); sizes.set(im.id, im.blob.size || 0); }
      for (const s of sets) if (s && s.id) local.set(s.id, clean(s, false));
      tomb = new Set(Array.isArray(t) ? t : []);
      await sweep();
    } catch (e) { state.error = String((e && e.message) || e); }
  }
  await loadSite();
  state.ready = true; rebuild();
  return state;
}
// サイトに置いた自分の画像（photos/custom.json）
async function loadSite() {
  try {
    const r = await fetch('photos/custom.json', { cache: 'no-cache' }); if (!r.ok) return;
    const j = await r.json(), arr = Array.isArray(j) ? j : (j && j.sets) || [];
    for (const s of arr) { const c = clean(s, true); if (c.images.length) site.set(c.id, c); }
  } catch (e) { /* サイトに自分の画像がない（ふつう） */ }
}

/* ---------- 組の形をととのえる（読み込んだ JSON も同じ形に） ---------- */
function clean(s, isSite) {
  const id = String(s.id || '').replace(/[^\w-]/g, '').slice(0, 40) || rid('m-');
  const modes = Array.isArray(s.modes) ? MODES_OK.filter(m => s.modes.includes(m)) : MODES_OK.slice();
  const images = (Array.isArray(s.images) ? s.images : []).slice(0, MAX_IMAGES).map(im => {
    if (!im) return null;
    const o = { w: +im.w > 0 ? Math.round(+im.w) : 1024, h: +im.h > 0 ? Math.round(+im.h) : 1024, focus: Array.isArray(im.focus) ? [c01(+im.focus[0]), c01(+im.focus[1])] : [0.5, 0.5] };
    if (!isSite && im.img) o.img = String(im.img);
    else { const f = String(im.file || '').replace(/^\/+/, ''); if (!/^[\w\-./]+\.(jpe?g|png|webp)$/i.test(f) || f.includes('..')) return null; o.file = f; }
    return o;
  }).filter(Boolean);
  return {
    id, act: ACTS_OK.has(s.act) ? s.act : 'hit', modes: modes.length ? modes : MODES_OK.slice(),
    name: String(s.name || '').trim().slice(0, 40) || '自分の画像', short: String(s.short || '').trim().slice(0, 20),
    sfx: typeof s.sfx === 'string' && (s.sfx === 'auto' || HIT_BY_ID.has(s.sfx)) ? s.sfx : 'auto', word: String(s.word || '').trim().slice(0, 12),
    images, at: +s.at || 0,
  };
}

/* ---------- 一覧と場面 ---------- */
export function allSets() {
  const out = [];
  for (const s of site.values()) if (!local.has(s.id) && !tomb.has(s.id)) out.push({ ...s, src: 'site' });
  for (const s of local.values()) out.push({ ...s, src: site.has(s.id) ? 'edited' : 'local' });
  return out.sort((a, b) => ACT_ORDER.indexOf(a.act) - ACT_ORDER.indexOf(b.act) || (a.at || 0) - (b.at || 0));
}
export const getSet = id => { const s = local.get(id) || (!tomb.has(id) && site.get(id)); return s ? { ...s, src: local.has(id) ? (site.has(id) ? 'edited' : 'local') : 'site' } : null; };
export const imgSrc = im => im.img ? (urls.get(im.img) || '') : 'photos/' + im.file;
// 効果音：自分で選んだ音、なければ「おまかせ」（場面の名前と動きから系統を選ぶ）
export const sfxOfSet = s => s.sfx && s.sfx !== 'auto' && HIT_BY_ID.has(s.sfx) ? s.sfx : 'fam:' + familyFor(s.name, s.act);
export const autoHit = s => famPick(familyFor(s.name, s.act), s.id);
export const wordOfSet = s => s.word || hitWord(HIT_BY_ID.has(s.sfx) ? s.sfx : autoHit(s)) || 'ドン';
export function sceneOf(s) {
  const images = s.images.map(im => ({ file: im.img ? 'mine:' + im.img : 'site:' + im.file, src: imgSrc(im), w: im.w, h: im.h, focus: im.focus || [0.5, 0.5] }));
  const sfx = sfxOfSet(s), short = s.short || s.name;
  const set = { id: s.id, act: s.act, modes: s.modes, name: s.name, short, sfx, word: wordOfSet(s), quality: 5, images };
  return {
    id: 'mine:' + s.id, tpl: PHOTO, file: 'photo', real: true, photo: true, mine: true, grp: 'mine:' + s.id,
    v: { k: s.id, set, sfx, name: s.name, short }, name: s.name, short, acts: [s.act], modes: s.modes && s.modes.length ? s.modes : MODES_OK.slice(), theme: 'photo',
  };
}
export function rebuild() {
  for (const x of MINE.list) SCENE_BY_ID.delete(x.id);
  const list = allSets().filter(s => s.images.length).map(sceneOf);
  MINE.list = list; for (const x of list) SCENE_BY_ID.set(x.id, x);
  MINE.ver++;
  for (const f of subs) { try { f(); } catch (e) { console.warn('[mine]', e); } }
}
export function stats() {
  const all = allSets(); let bytes = 0; for (const s of local.values()) for (const im of s.images) bytes += sizes.get(im.img) || 0;
  return { sets: all.length, images: all.reduce((a, s) => a + s.images.length, 0), local: local.size, site: [...site.keys()].filter(id => !local.has(id) && !tomb.has(id)).length, hidden: tomb.size, bytes, persist: state.persist };
}
export const countByAct = () => { const m = {}; for (const s of allSets()) m[s.act] = (m[s.act] || 0) + 1; return m; };

/* ---------- 画像を取りこむ（長い辺 1440px の JPEG にして保存） ---------- */
async function decode(file) {
  if (typeof createImageBitmap === 'function') { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* 次の方法で */ } }
  const url = URL.createObjectURL(file);
  try { const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode(); return img; }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1500); }
}
async function putImg(rec) {
  urls.set(rec.id, URL.createObjectURL(rec.blob)); sizes.set(rec.id, rec.blob.size || 0);
  if (db) { try { await dbPut('imgs', rec); return; } catch (e) { state.error = '端末の保存の空きが足りないかもしれません'; } }
  mem.set(rec.id, rec);
}
export async function addImage(file) {
  let bmp; try { bmp = await decode(file); } catch (e) { throw new Error(`「${file.name}」を画像として開けませんでした`); }
  const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight; if (!w0 || !h0) throw new Error(`「${file.name}」を画像として開けませんでした`);
  const sc = Math.min(1, MAX_SIDE / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * sc)), h = Math.max(1, Math.round(h0 * sc));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.imageSmoothingQuality = 'high'; c.drawImage(bmp, 0, 0, w, h); if (bmp.close) bmp.close();
  const blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('画像を保存できませんでした')), 'image/jpeg', 0.86));
  const id = rid('i-'); await putImg({ id, blob, w, h }); drafts.add(id);
  return { img: id, w, h, focus: [0.5, 0.5] };
}
async function blobOf(im) {
  if (im.img) { if (mem.has(im.img)) return mem.get(im.img).blob; if (db) { const r = await dbGet('imgs', im.img); if (r) return r.blob; } return null; }
  const r = await fetch('photos/' + im.file); return r.ok ? r.blob() : null;
}

/* ---------- 保存・削除 ---------- */
export async function saveSet(s) {
  const rec = clean({ ...s, at: s.at || Date.now() }, false); if (!rec.images.length) throw new Error('画像を1枚以上入れてください');
  // サイトの組を直したとき：画像をこの端末にコピー
  for (const im of rec.images) if (!im.img && im.file) {
    const b = await blobOf(im); if (!b) throw new Error('サイトの画像を読み込めませんでした');
    const id = rid('i-'); await putImg({ id, blob: b, w: im.w, h: im.h }); im.img = id; delete im.file;
  }
  local.set(rec.id, rec);
  if (db) { try { await dbPut('sets', rec); } catch (e) { state.error = '保存できませんでした（端末の空きがいっぱいかもしれません）'; } }
  await endDraft(); rebuild(); return rec;
}
export async function deleteSet(id) {
  if (local.has(id)) { local.delete(id); if (db) await dbDel('sets', id).catch(() => { }); }
  if (site.has(id)) { tomb.add(id); if (db) await dbPut('meta', [...tomb], 'tomb').catch(() => { }); }
  await sweep(); rebuild();
}
export async function restoreSite() { tomb.clear(); if (db) await dbPut('meta', [], 'tomb').catch(() => { }); rebuild(); }
// 編集をやめたとき・保存したとき：どの組にも使われていない画像を消す
export async function endDraft() { drafts.clear(); await sweep(); }
async function sweep() {
  const used = new Set(); for (const s of local.values()) for (const im of s.images) if (im.img) used.add(im.img);
  const ids = new Set([...urls.keys(), ...mem.keys()]);
  if (db) { try { for (const k of await req2p(os('imgs').getAllKeys())) ids.add(k); } catch (e) { /* 一覧を取れない */ } }
  for (const id of ids) if (!used.has(id) && !drafts.has(id)) {
    if (urls.has(id)) URL.revokeObjectURL(urls.get(id)); urls.delete(id); mem.delete(id); sizes.delete(id);
    if (db) await dbDel('imgs', id).catch(() => { });
  }
}

/* ---------- まとめて取りこむ：ファイル名で組に分ける ---------- */
// 「動き-場面名-番号.拡張子」（例：hit-鍛冶-1.jpg / パンチ_サンドバッグ_2.png）。名前に決まりがなければ、選んだ画像を5枚ずつの組に
export function groupFiles(files, defAct) {
  const G = new Map();
  for (const f of files) {
    let b = f.name.replace(/\.[^.]+$/, '').normalize('NFKC').trim(), num = 0;
    const m = b.match(/^(.*?)[\s_\-]*(\d{1,3}|[a-zA-Z])$/); if (m && m[1]) { b = m[1]; num = /\d/.test(m[2]) ? +m[2] : m[2].toLowerCase().charCodeAt(0) - 96; }
    const parts = b.split(/[\s_\-]+/).filter(Boolean); let act = actOfWord(parts[0]);
    if (act) parts.shift();
    const name = parts.join(' ').slice(0, 40), key = (act || '') + '|' + name;
    if (!G.has(key)) G.set(key, { act: act || defAct, name, files: [] });
    G.get(key).files.push({ f, num });
  }
  let groups = [...G.values()].map(g => ({ act: g.act, name: g.name, files: g.files.sort((a, b) => a.num - b.num).map(x => x.f) }));
  if (groups.length > 1 && groups.every(g => g.files.length === 1 && !actOfWord(g.files[0].name.split(/[\s_\-]+/)[0]))) groups = [{ act: defAct, name: '', files: files.slice() }];
  // 多すぎる組は分ける（1組 5枚くらいがちょうどいい）
  const out = [];
  for (const g of groups) {
    if (g.files.length <= MAX_IMAGES) { out.push(g); continue; }
    const k = Math.ceil(g.files.length / 5), per = Math.ceil(g.files.length / k);
    for (let i = 0; i < k; i++) out.push({ act: g.act, name: g.name ? `${g.name} ${i + 1}` : '', files: g.files.slice(i * per, (i + 1) * per) });
  }
  return out.filter(g => g.files.length);
}

/* ---------- 書き出し（GitHub Pages に置く zip）・読み込み ---------- */
const GUIDE = `IMMERSE FIT ── 自分の画像

この zip の中の「photos」フォルダを、サイト（リポジトリ）のいちばん上にある「photos」フォルダに重ねて置いてください。
  photos/custom.json    … 組の一覧（動き・場面の名前・当たる場所・効果音・擬音）
  photos/custom/…       … 画像

GitHub にアップロード（コミット）すると、サイトを開いた人みんなの場面にこの画像が出ます。
前に置いた photos/custom フォルダがあるときは、消してから置くと古い画像が残りません。

別の端末やブラウザで続きを編集するときは、アプリの「自分の画像」→「読み込む」でこの zip を選びます。
`;
export async function exportZip() {
  const sets = allSets(); if (!sets.length) throw new Error('書き出す組がありません');
  const files = [], json = [];
  for (const s of sets) {
    const imgs = [];
    for (let i = 0; i < s.images.length; i++) {
      const im = s.images[i], blob = await blobOf(im); if (!blob) continue;
      const ext = /png/.test(blob.type) ? 'png' : /webp/.test(blob.type) ? 'webp' : 'jpg', file = `custom/${s.id}-${i + 1}.${ext}`;
      files.push({ name: 'photos/' + file, data: blob }); imgs.push({ file, w: im.w, h: im.h, focus: im.focus.map(x => Math.round(x * 1000) / 1000) });
    }
    if (imgs.length) json.push({ id: s.id, act: s.act, modes: s.modes, name: s.name, short: s.short || '', sfx: s.sfx || 'auto', word: s.word || '', images: imgs });
  }
  files.unshift({ name: 'photos/custom.json', data: JSON.stringify({ app: 'IMMERSE FIT', version: 1, sets: json }, null, 1) });
  files.push({ name: 'README-custom-photos.txt', data: GUIDE });
  return { blob: await zipWrite(files), sets: json.length, images: files.length - 2 };
}
// zip を読み込む。custom.json があれば組ごと、画像だけの zip なら { files } を返す（まとめて取りこむへ）
export async function importZip(file) {
  const m = await zipRead(file), jk = [...m.keys()].find(k => /(^|\/)custom\.json$/i.test(k));
  if (!jk) {
    const files = [...m.entries()].filter(([k]) => /\.(jpe?g|png|webp|gif|avif)$/i.test(k)).map(([k, u8]) => new File([u8], k.split('/').pop(), { type: mimeOf(k) }));
    if (!files.length) throw new Error('この zip には画像も photos/custom.json も入っていません');
    return { files };
  }
  const base = jk.replace(/custom\.json$/i, ''); let j;
  try { j = JSON.parse(new TextDecoder().decode(m.get(jk))); } catch (e) { throw new Error('custom.json を読めませんでした'); }
  const arr = Array.isArray(j) ? j : (j && j.sets) || []; let n = 0;
  for (const s0 of arr) {
    const s = clean(s0, true), images = [];
    for (const im of s.images) {
      const u8 = m.get(base + im.file) || m.get(im.file) || m.get('photos/' + im.file); if (!u8) continue;
      const id = rid('i-'); await putImg({ id, blob: new Blob([u8], { type: mimeOf(im.file) }), w: im.w, h: im.h }); images.push({ img: id, w: im.w, h: im.h, focus: im.focus });
    }
    if (!images.length) continue;
    const rec = { ...s, images, at: Date.now() + n }; local.set(rec.id, rec); tomb.delete(rec.id);
    if (db) await dbPut('sets', rec).catch(() => { });
    n++;
  }
  if (db) await dbPut('meta', [...tomb], 'tomb').catch(() => { });
  await sweep(); rebuild();
  if (!n) throw new Error('読み込める組がありませんでした');
  return { sets: n };
}
