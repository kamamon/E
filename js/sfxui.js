/* =========================================================================
   IMMERSE FIT — sfxui.js
   効果音500種の一覧：系統ごとに試聴・お気に入り（★）・えらぶ。
   openSfx({ pick, current, onPick, title }) … pick = true なら「これにする」で選んで閉じる
   ========================================================================= */
import { HITS, HIT_CATS, HIT_FAMS, HIT_BY_ID, playHit, prepareHits } from './hits.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kata = s => String(s).normalize('NFKC').replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)).toLowerCase();
const FAMJ = Object.fromEntries(HIT_FAMS.map(f => [f.k, f.jp]));
const IDX = new Map(HITS.map(h => [h.id, kata(`${h.name} ${h.label} ${h.word} ${FAMJ[h.fam]}`)]));

let env = null;          // { music, store, toast }
const ui = { cat: '', q: '', pick: false, current: '', onPick: null, title: '', auto: '', playing: '' };

export function setupSfx(e) {
  env = e;
  $('#sfxBg').addEventListener('click', closeSfx);
  const sh = $('#sfxSheet');
  sh.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'sfxX') { closeSfx(); return; }
    if (b.dataset.cat !== undefined) { ui.cat = b.dataset.cat; renderList(); renderCats(); $('#sfxList').scrollTop = 0; return; }
    if (b.dataset.play) { play(b.dataset.play); return; }
    if (b.dataset.fav) { toggleFav(b.dataset.fav, b); return; }
    if (b.dataset.pick) { const id = b.dataset.pick, f = ui.onPick; closeSfx(); f && f(id); return; }
    if (b.id === 'sfxRnd') { const list = filtered(); if (list.length) { const h = list[Math.floor(Math.random() * list.length)]; play(h.id); const row = sh.querySelector(`[data-row="${h.id}"]`); if (row) row.scrollIntoView({ block: 'nearest' }); } }
  });
  sh.addEventListener('input', ev => { if (ev.target.id === 'sfxQ') { ui.q = ev.target.value.trim(); renderList(); } });
  sh.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSfx(); });
}
const favs = () => (env.store.s.hitFav || []).filter(id => HIT_BY_ID.has(id));
function toggleFav(id, b) {
  const f = favs(), i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id);
  env.store.set('hitFav', f); env.onChange && env.onChange();
  const on = i < 0; b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  if (ui.cat === 'fav') renderList(); renderCats();
}
function play(id) {
  const m = env.music; m.unlock && m.unlock();
  playHit(m, id, undefined, { n: 0 });
  const sh = $('#sfxSheet'); sh.querySelectorAll('.srow.on').forEach(r => r.classList.remove('on'));
  const row = sh.querySelector(`[data-row="${id}"]`); if (row) { row.classList.add('on'); clearTimeout(ui.t); ui.t = setTimeout(() => row.classList.remove('on'), 600); }
}
function filtered() {
  let list = HITS;
  if (ui.cat === 'fav') { const f = new Set(favs()); list = list.filter(h => f.has(h.id)); }
  else if (ui.cat) list = list.filter(h => h.cat === ui.cat);
  if (ui.q) { const q = kata(ui.q).split(/\s+/).filter(Boolean); list = list.filter(h => { const s = IDX.get(h.id); return q.every(w => s.includes(w)); }); }
  return list;
}
function renderCats() {
  const f = favs().length;
  $('#sfxCats').innerHTML = [['', 'すべて', HITS.length], ['fav', '★ お気に入り', f], ...HIT_CATS.map(c => [c.k, c.name, HITS.filter(h => h.cat === c.k).length])]
    .map(([k, n, c]) => `<button data-cat="${k}" class="${ui.cat === k ? 'on' : ''}">${n}<em>${c}</em></button>`).join('');
}
function renderList() {
  const list = filtered(), f = new Set(favs()), out = [];
  if (ui.pick && !ui.q && !ui.cat) out.push(`<div class="srow auto ${ui.current === 'auto' ? 'cur' : ''}"><button class="sp" data-play="${ui.auto}" aria-label="試聴：おまかせ"><i aria-hidden="true">▶</i><span class="sn">おまかせ<small>場面の名前と動きから選びます（いまは ${esc(HIT_BY_ID.get(ui.auto) ? HIT_BY_ID.get(ui.auto).name : '')}）</small></span></button><button class="pk" data-pick="auto">${ui.current === 'auto' ? '選択中' : 'これにする'}</button></div>`);
  let fam = '';
  for (const h of list) {
    if (h.fam !== fam) { fam = h.fam; out.push(`<div class="sfam">${esc(FAMJ[fam])}</div>`); }
    const cur = ui.current === h.id;
    out.push(`<div class="srow ${cur ? 'cur' : ''}" data-row="${h.id}"><button class="sp" data-play="${h.id}" aria-label="試聴：${esc(h.name)}"><i aria-hidden="true">▶</i><span class="sn">${esc(h.name)}<small>${esc(h.label)}</small></span><em>${esc(h.word)}</em></button>`
      + `<button class="star ${f.has(h.id) ? 'on' : ''}" data-fav="${h.id}" aria-pressed="${f.has(h.id)}" aria-label="お気に入り：${esc(h.name)}">${f.has(h.id) ? '★' : '☆'}</button>`
      + (ui.pick ? `<button class="pk" data-pick="${h.id}">${cur ? '選択中' : 'これにする'}</button>` : '') + `</div>`);
  }
  if (!list.length) out.push(`<p class="sempty">${ui.cat === 'fav' ? '★を押した音がここに集まります。' : '見つかりませんでした。別の言葉でさがしてみてください（例：カーン、太鼓、水）。'}</p>`);
  $('#sfxList').innerHTML = out.join('');
  $('#sfxCount').textContent = `${list.length} 種類`;
}
export function openSfx(o = {}) {
  ui.pick = !!o.pick; ui.current = o.current || ''; ui.onPick = o.onPick || null; ui.auto = o.auto || ''; ui.title = o.title || '効果音 500';
  if (o.cat !== undefined) ui.cat = o.cat;
  $('#sfxSheet').innerHTML = `<button class="close" id="sfxX" aria-label="閉じる">✕</button>
    <h3 id="sfxT">${esc(ui.title)}</h3>
    <p class="lead">${ui.pick ? '▶で試聴して「これにする」。' : 'タップで試聴。★でお気に入り（設定の「お気に入り」で使われます）。'}</p>
    <div class="cats" id="sfxCats"></div>
    <div class="sfxtools"><input id="sfxQ" type="search" placeholder="さがす（例：カーン、太鼓、水）" enterkeyhint="search" autocomplete="off" value="${esc(ui.q)}"><button class="pill" id="sfxRnd">ランダムに鳴らす</button></div>
    <div class="count" id="sfxCount"></div>
    <div class="sfxlist" id="sfxList"></div>`;
  renderCats(); renderList();
  $('#sfxWrap').hidden = false;
  if (ui.current && ui.current !== 'auto') { const r = $('#sfxSheet').querySelector(`[data-row="${ui.current}"]`); if (r) r.scrollIntoView({ block: 'center' }); }
  $('#sfxX').focus({ preventScroll: true });
  // よく押される最初の数個を先に作っておく
  prepareHits(env.music, filtered().slice(0, 6).map(h => h.id));
}
export function closeSfx() { $('#sfxWrap').hidden = true; ui.onPick = null; }
export const sfxOpen = () => !$('#sfxWrap').hidden;
