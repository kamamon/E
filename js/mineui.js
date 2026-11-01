/* =========================================================================
   IMMERSE FIT — mineui.js
   「自分の画像」の画面：動きを選ぶ → 画像を入れる → 当たる場所をタップ → 効果音・擬音 → 試す → 保存。
   書き出し（GitHub Pages に置く zip）・読み込み・ファイル名でまとめて取りこみ。
   ========================================================================= */
import { ACTS, Stage } from './stage.js';
import { MINE } from './minereg.js';
import * as M from './mine.js';
import { HIT_BY_ID, playHit } from './hits.js';
import { playSfx } from './sfx.js';
import { openSfx, sfxOpen, closeSfx } from './sfxui.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const c01 = x => Math.max(0, Math.min(1, x));
const MODEJ = { one: '片手・片足', alt: '左右交互', both: '両手・両足' };
const MODE_DESC = {
  mix: '自分の画像がある動きは、その画像を先に使います。足りない分は入っている映像・写真で。',
  only: '自分の画像がある動きは、自分の画像だけ（同じ組をくり返します）。ない動きはいつもどおり。',
  off: '自分の画像は使わず、いつもの場面で。',
};
// 画像を作るときの指示文の例（ChatGPT などにそのまま貼れる）
const PROMPTS = {
  hit: '実写の写真。鍛冶職人のハンマーが赤く焼けた鉄に当たった瞬間の手元のアップ。火花が飛び散り、当たる点が画面の中央にはっきり見える。暗い工房、低い横からのアングル、浅い被写界深度、正方形。顔は写さない。文字やロゴは入れない。',
  punch: '実写の写真。ボクシンググローブの拳が赤いサンドバッグに当たった瞬間。サンドバッグが大きくへこみ、汗のしぶきが飛ぶ。ジムの照明、横からのアングル、正方形。顔は写さない。文字やロゴは入れない。',
  clap: '実写の写真。両手を打ち合わせた瞬間の手のアップ。白い粉がふわっと舞う。暗い背景にスポットライト、正方形。文字やロゴは入れない。',
  push: '実写の写真。両手で重い木の荷車を前へ押し出す瞬間の手元のアップ。土ぼこりが舞う。夕方の農道、正方形。顔は写さない。文字やロゴは入れない。',
  pull: '実写の写真。太い綱を両手で力いっぱい引く瞬間の手元のアップ。綱がぴんと張り、ほこりが舞う。綱引きの会場、正方形。顔は写さない。文字やロゴは入れない。',
  lift: '実写の写真。バーベルを頭の上まで持ち上げた瞬間を下から見上げる。白い粉が舞う。ジムの照明、正方形。顔は写さない。文字やロゴは入れない。',
  stir: '実写の写真。大きな鍋のカレーをおたまで勢いよくかき混ぜる瞬間の手元。湯気としぶき。明るいキッチン、正方形。文字やロゴは入れない。',
  wipe: '実写の写真。水滴のついた大きな窓をスクイージーで横に一気にふく瞬間の手元。光が差しこむ、正方形。顔は写さない。文字やロゴは入れない。',
  throw: '実写の写真。手から雪玉が放たれた瞬間。雪の粒が舞う。冬の公園、横からのアングル、正方形。顔は写さない。文字やロゴは入れない。',
  kick: '実写の写真。スニーカーがサッカーボールをけった瞬間の足元のアップ。ボールが大きくへこみ、芝と土が飛ぶ。低いアングル、正方形。文字やロゴは入れない。',
  stomp: '実写の写真。長靴で水たまりを踏んだ瞬間の足元。水しぶきが大きく上がる。雨上がりの道、低いアングル、正方形。文字やロゴは入れない。',
  knee: '実写の写真。ひざで紙風船を高く突き上げた瞬間。体育館、横からのアングル、正方形。顔は写さない。文字やロゴは入れない。',
  jump: '実写の写真。トランポリンで高く跳んだ瞬間を下から見上げる。青空、正方形。顔は写さない。文字やロゴは入れない。',
  squat: '実写の写真。相撲の四股のように腰を深く落とした瞬間の脚のアップ。土俵の砂が舞う、正方形。顔は写さない。文字やロゴは入れない。',
  step: '実写の写真。スケートで横に大きく踏み出した瞬間の足元。氷の削りくずが飛ぶ。低いアングル、正方形。文字やロゴは入れない。',
};

let env = null;   // { music, store, toast, saveFile, onChange, back }
const ui = { act: 'hit', ed: null, sel: 0, isNew: false, sure: false, prev: null, bulk: null, urls: [] };
const newId = () => 'm-' + Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-5);
const isImg = f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name);

/* =========================================================================
   一覧
   ========================================================================= */
export function renderMine() {
  const st = M.stats(), cnt = M.countByAct(), mode = env.store.s.mineMode || 'mix', A = ACTS[ui.act].name;
  const sets = M.allSets().filter(x => x.act === ui.act);
  $('#mineBody').innerHTML = `
    <p class="lead2">生成AIなどで作った画像を、動きごとに当てはめます。<b>1組 = 同じ場面の画像2〜5枚。</b>当たる瞬間に1枚ずつ切りかわり、タップした「当たる場所」に光と擬音が出ます。</p>
    <div class="tg col"><span>場面に使う<small>${MODE_DESC[mode]}</small></span><span class="seg" id="mMode">${[['mix', '自分の画像を先に'], ['only', '自分の画像だけ'], ['off', '使わない']].map(([k, n]) => `<button data-mode="${k}" class="${mode === k ? 'on' : ''}" aria-pressed="${mode === k}">${n}</button>`).join('')}</span></div>
    <div class="fl">動き<small>種目は「動き」ごとに場面を選びます</small></div>
    <div class="cats wrap" id="mActs">${M.ACT_ORDER.map(a => `<button data-act="${a}" class="${ui.act === a ? 'on' : ''}">${ACTS[a].name}${cnt[a] ? `<em>${cnt[a]}</em>` : ''}</button>`).join('')}</div>
    <label class="mdrop" id="mDrop"><input type="file" id="mFile" accept="image/*" multiple><b>＋ 画像を選んで「${esc(A)}」の組を作る</b><small>2〜5枚がおすすめ。ここに画像をドラッグ・貼り付けしてもOK。<br>ファイル名を「hit-鍛冶-1.jpg」のように「動き-場面名-番号」にすると、いくつもの組をまとめて作れます。</small></label>
    <div class="msets">${sets.map(card).join('') || `<p class="mempty">「${esc(A)}」の組はまだありません。</p>`}</div>
    <details class="mtips"><summary>画像を作るときの指示文の例（${esc(A)}）</summary><p class="mprompt" id="mPrompt">${esc(PROMPTS[ui.act])}</p><button class="pill" id="mCopy">コピー</button><p class="tiny">続けて「同じ場面で、角度を変えてもう3枚」と頼むと1組そろいます。当たる場所がはっきり見えて、人の顔や文字が入っていない画像が向いています。</p></details>
    <div class="h3">ほかの端末・サイトへ</div>
    <button class="ghost" id="mExport"><span><b>書き出す（zip）</b><br><span>GitHub Pages のリポジトリに置くと、サイトを開いた人みんなの場面に出ます</span></span><span aria-hidden="true">›</span></button>
    <label class="ghost" id="mImportL"><input type="file" id="mZip" accept=".zip,application/zip"><span><b>読み込む（zip）</b><br><span>書き出した zip、または画像をまとめた zip</span></span><span aria-hidden="true">›</span></label>
    ${st.hidden ? `<button class="ghost" id="mRestore"><span><b>消したサイトの画像をもとに戻す</b><br><span>${st.hidden}組</span></span><span aria-hidden="true">›</span></button>` : ''}
    <p class="note">${saveNote(st)}</p>`;
}
function card(s) {
  const h = s.sfx && s.sfx !== 'auto' && HIT_BY_ID.get(s.sfx);
  return `<button class="mset" data-edit="${esc(s.id)}"><span class="mthumbs">${s.images.slice(0, 3).map(im => `<img src="${esc(M.imgSrc(im))}" alt="" loading="lazy" decoding="async">`).join('')}</span>`
    + `<span class="minfo"><b>${esc(s.name)}</b><span>${s.images.length}枚・${s.modes.map(m => MODEJ[m]).join('／')}<br>${h ? esc(h.name) : 'おまかせの音'}「${esc(M.wordOfSet(s))}」</span></span>`
    + `${s.src === 'site' ? '<em class="badge">サイト</em>' : s.src === 'edited' ? '<em class="badge">サイト・編集ずみ</em>' : ''}<span class="go" aria-hidden="true">編集 ›</span></button>`;
}
function saveNote(st) {
  const mb = (st.bytes / 1e6).toFixed(1);
  if (!st.persist) return 'この画面では端末に保存できないため、閉じると消えます。残すときは「書き出す」で zip にしてください。';
  return `この端末のブラウザに保存しています（${st.local}組・${mb}MB）。ブラウザのデータを消すと消えるので、書き出して残しておくと安心です。${st.site ? `サイトに置いた画像：${st.site}組。` : ''}`;
}

/* ---------- 画像を受けとる（選ぶ・ドラッグ・貼り付け・zip） ---------- */
async function takeFiles(files) {
  files = files.filter(isImg); if (!files.length) { env.toast('画像ファイルを選んでください'); return; }
  const groups = M.groupFiles(files, ui.act);
  if (groups.length === 1) {
    const g = groups[0]; ui.act = g.act;
    await openEditor({ id: newId(), act: g.act, modes: ['one', 'alt', 'both'], name: g.name, short: '', sfx: 'auto', word: '', images: [] }, g.files);
    return;
  }
  openBulk(groups);
}

/* =========================================================================
   組の編集
   ========================================================================= */
async function openEditor(s, files) {
  ui.ed = JSON.parse(JSON.stringify(s)); ui.sel = 0; ui.isNew = !M.getSet(s.id); ui.sure = false;
  $('#mineEd').hidden = false; renderEd();
  if (files && files.length) await addFiles(files);
}
async function addFiles(files) {
  const room = M.MAX_IMAGES - ui.ed.images.length; files = files.filter(isImg);
  if (room <= 0) { env.toast(`1組 ${M.MAX_IMAGES}枚までです`); return; }
  const list = files.slice(0, room);
  for (let i = 0; i < list.length; i++) {
    busy(`画像を取りこみ中… ${i + 1}/${list.length}`);
    try { const im = await M.addImage(list[i]); if (!ui.ed) return; ui.ed.images.push(im); ui.sel = ui.ed.images.length - 1; renderEd(); }
    catch (e) { env.toast(e.message); }
  }
  busy('');
  if (files.length > room) env.toast(`1組 ${M.MAX_IMAGES}枚までなので、${files.length - room}枚は入れませんでした`);
}
function busy(t) { const b = $('#meBusy'); if (b) { b.textContent = t; b.hidden = !t; } }
const curHit = s => s.sfx && s.sfx !== 'auto' && HIT_BY_ID.has(s.sfx) ? s.sfx : M.autoHit(s);
function sfxLabel(s) {
  const h = HIT_BY_ID.get(curHit(s)); if (!h) return '';
  return s.sfx && s.sfx !== 'auto' ? `${h.name}（${h.label}）` : `おまかせ：${h.name}（場面の名前から）`;
}
function renderEd() {
  const s = ui.ed; if (!s) return;
  const im = s.images[ui.sel], ar = Math.max(0.5, Math.min(1.9, innerWidth / innerHeight));
  $('#mineEdCard').innerHTML = `
    <button class="close" id="meX" aria-label="閉じる">✕</button>
    <h2 id="meT">${ui.isNew ? '新しい組' : '組を編集'}<small>${esc(ACTS[s.act].name)}</small></h2>
    <div class="mebig" id="meBig" style="--ar:${ar.toFixed(3)}" ${im ? 'tabindex="0" aria-label="当たる場所（タップ・ドラッグ・矢印キーで動かせます）"' : ''}>
      ${im ? `<img id="meImg" src="${esc(M.imgSrc(im))}" alt="" draggable="false"><i class="mefocus" id="meFocus" aria-hidden="true"></i>` : `<label class="meadd0"><input type="file" accept="image/*" multiple data-add><span>＋ 画像を入れる<br><small>ドラッグ・貼り付けでもOK</small></span></label>`}
      <canvas id="mePrev" hidden></canvas><span class="mebusy" id="meBusy" hidden></span>
    </div>
    <p class="mehint">${im ? '画像の<b>当たる場所</b>をタップ（光と擬音がそこに出ます）。ドラッグでも動かせます。' : '同じ場面の画像を2〜5枚入れると、当たる瞬間に1枚ずつ切りかわります。'}</p>
    <div class="mestrip" id="meStrip">${s.images.map((x, i) => `<button class="${i === ui.sel ? 'on' : ''}" data-sel="${i}" aria-label="${i + 1}枚目" aria-pressed="${i === ui.sel}"><img src="${esc(M.imgSrc(x))}" alt=""><i style="left:${(x.focus[0] * 100).toFixed(1)}%;top:${(x.focus[1] * 100).toFixed(1)}%"></i><span>${i + 1}</span></button>`).join('')}${s.images.length < M.MAX_IMAGES ? `<label class="meplus" aria-label="画像を足す"><input type="file" accept="image/*" multiple data-add>＋</label>` : ''}</div>
    ${im ? `<div class="mebar"><button class="pill" data-mv="-1" ${ui.sel <= 0 ? 'disabled' : ''}>← 前へ</button><button class="pill" data-mv="1" ${ui.sel >= s.images.length - 1 ? 'disabled' : ''}>後ろへ →</button><button class="pill" id="meDelImg">この画像をはずす</button></div>` : ''}
    <div class="mefields">
      <label class="fld"><span>場面の名前</span><input id="meName" maxlength="40" value="${esc(s.name)}" placeholder="例：鍛冶、和太鼓、まき割り"></label>
      <label class="fld"><span>動き</span><select id="meAct">${M.ACT_ORDER.map(a => `<option value="${a}" ${a === s.act ? 'selected' : ''}>${ACTS[a].name}</option>`).join('')}</select></label>
    </div>
    <div class="fl">使う種目</div>
    <div class="seg" id="meModes">${['one', 'alt', 'both'].map(m => `<button data-mode="${m}" class="${s.modes.includes(m) ? 'on' : ''}" aria-pressed="${s.modes.includes(m)}">${MODEJ[m]}</button>`).join('')}</div>
    <div class="fl">効果音</div>
    <div class="mesfx"><button class="round glass" id="meSfxPlay" aria-label="効果音を試聴">▶</button><span id="meSfxName">${esc(sfxLabel(s))}</span><button class="pill" id="meSfxPick">変える</button></div>
    <label class="fld mt"><span>擬音（当たった瞬間に出る文字）</span><input id="meWord" maxlength="12" value="${esc(s.word)}" placeholder="${esc(M.wordOfSet({ ...s, word: '' }))}"></label>
    <button class="ghost center" id="mePlay" ${s.images.length ? '' : 'disabled'}>${ui.prev ? '■ 試すのをやめる' : '▶ 動かして試す（音が出ます）'}</button>
    <button class="cta" id="meSave" ${s.images.length ? '' : 'disabled'}>保存</button>
    <button class="ghost center" id="meCancel">やめる</button>
    ${ui.isNew ? '' : `<button class="danger" id="meRemove">${ui.sure ? 'もう一度押すと消えます' : 'この組を消す'}</button>`}`;
  placeFocus();
  if (ui.prev) { stopPrev(); startPrev(); }
}
// 画像が実際に表示されている四角（contain）
function imgRect() {
  const box = $('#meBig'), img = $('#meImg'); if (!box || !img || !img.naturalWidth) return null;
  const bw = box.clientWidth, bh = box.clientHeight, sc = Math.min(bw / img.naturalWidth, bh / img.naturalHeight), w = img.naturalWidth * sc, h = img.naturalHeight * sc;
  return { x: (bw - w) / 2, y: (bh - h) / 2, w, h };
}
function placeFocus() {
  const im = ui.ed && ui.ed.images[ui.sel], f = $('#meFocus'), img = $('#meImg'); if (!im || !f) return;
  const r = imgRect(); if (!r) { if (img) img.onload = placeFocus; return; }
  f.style.left = (r.x + im.focus[0] * r.w) + 'px'; f.style.top = (r.y + im.focus[1] * r.h) + 'px';
  const dot = $(`#meStrip [data-sel="${ui.sel}"] i`); if (dot) { dot.style.left = (im.focus[0] * 100) + '%'; dot.style.top = (im.focus[1] * 100) + '%'; }
}
function focusFrom(ev) {
  const r = imgRect(), im = ui.ed && ui.ed.images[ui.sel]; if (!r || !im) return;
  const b = $('#meBig').getBoundingClientRect();
  im.focus = [c01((ev.clientX - b.left - r.x) / r.w), c01((ev.clientY - b.top - r.y) / r.h)]; placeFocus();
}
function readFields() {
  const s = ui.ed; if (!s) return;
  const n = $('#meName'), w = $('#meWord'), a = $('#meAct');
  if (n) s.name = n.value.trim(); if (w) s.word = w.value.trim(); if (a) s.act = a.value;
}
function refreshSfx() { const s = ui.ed, el = $('#meSfxName'), w = $('#meWord'); if (el) el.textContent = sfxLabel(s); if (w) w.placeholder = M.wordOfSet({ ...s, word: '' }); }
async function closeEd(saved) {
  stopPrev(); $('#mineEd').hidden = true; ui.ed = null;
  if (!saved) await M.endDraft();   // 保存しなかった画像は消す
}
async function saveEd() {
  readFields(); const s = ui.ed; if (!s.images.length) { env.toast('画像を1枚以上入れてください'); return; }
  const btn = $('#meSave'); if (btn) { btn.disabled = true; btn.textContent = '保存しています…'; }
  try {
    const rec = await M.saveSet(s); await closeEd(true); ui.act = rec.act; renderMine(); env.onChange();
    env.toast(`保存しました。「${ACTS[rec.act].name}」の種目の場面に使われます`);
  } catch (e) { env.toast(e.message); if (btn) { btn.disabled = false; btn.textContent = '保存'; } }
}

/* ---------- 動かして試す（音つき） ---------- */
function startPrev() {
  const cv = $('#mePrev'), img = $('#meImg'), f = $('#meFocus'); if (!cv || !ui.ed || !ui.ed.images.length) return;
  readFields(); cv.hidden = false; if (img) img.hidden = true; if (f) f.hidden = true;
  const s = ui.ed, inst = M.sceneOf({ ...s, word: s.word }), st = new Stage(cv), spb = 60 / 112, rpb = 2, hit = curHit(s);
  const P = ui.prev = { on: true, t0: performance.now() + 300, last: 0, key: -1, clip: null, w: 0, h: 0 };
  const loop = now => {
    if (!P.on) return; P.raf = requestAnimationFrame(loop);
    const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    if (w !== P.w || h !== P.h) { P.w = w; P.h = h; st.resize(w, h); }
    const beat = Math.max(0, (now - P.t0) / 1000 / spb) + 0.45 * rpb, c = Math.max(0, Math.floor((beat - 0.45 * rpb) / (2 * rpb)));
    if (c !== P.key) { const H = j => rpb * (j + 1), j0 = c * 2; P.key = c; P.clip = { inst, act: s.act, mode: 'both', round: 1, idx: Math.floor(c / 2) % 10, show: 0, sub: c % 2, same: c % 2 > 0, sides: ['R', 'R'], dirs: ['R', 'L'], hits: [H(j0), H(j0 + 1)], b0: H(j0) - 0.55 * rpb, b1: H(j0 + 1) + 0.45 * rpb, seed: c + 7 }; }
    const k = Math.floor(beat / rpb); if (k > P.last) { P.last = k; playSfx(env.music, hit, undefined, { n: k }); }
    st.frame(P.clip, { beat, spb, dt: 1 / 60 });
  };
  env.music.unlock && env.music.unlock();
  P.raf = requestAnimationFrame(loop);
  const big = $('#meBig'); if (big && big.scrollIntoView) big.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const b = $('#mePlay'); if (b) b.textContent = '■ 試すのをやめる';
}
function stopPrev() {
  const P = ui.prev; if (!P) return; P.on = false; cancelAnimationFrame(P.raf); ui.prev = null;
  const cv = $('#mePrev'), img = $('#meImg'), f = $('#meFocus'); if (cv) cv.hidden = true; if (img) img.hidden = false; if (f) f.hidden = false;
  const b = $('#mePlay'); if (b) b.textContent = '▶ 動かして試す（音が出ます）';
  placeFocus();
}

/* =========================================================================
   まとめて取りこむ
   ========================================================================= */
function openBulk(groups) { freeUrls(); ui.bulk = groups; renderBulk(); $('#mineBulk').hidden = false; }
function freeUrls() { for (const u of ui.urls) URL.revokeObjectURL(u); ui.urls = []; }
function renderBulk() {
  const G = ui.bulk, n = G.reduce((a, g) => a + g.files.length, 0);
  const th = f => { const u = URL.createObjectURL(f); ui.urls.push(u); return `<img src="${u}" alt="">`; };
  $('#mineBulkCard').innerHTML = `<button class="close" id="mbX2" aria-label="閉じる">✕</button>
    <h2 id="mbT">まとめて組を作る</h2>
    <p>${G.length}組・${n}枚。ファイル名から動きと場面の名前を読み取りました。ちがうところは直してください。当たる場所ははじめ画像の真ん中です（あとで各組の「編集」で直せます）。</p>
    <div class="mbulk">${G.map((g, i) => `<div class="mbrow"><span class="mthumbs">${g.files.slice(0, 3).map(th).join('')}</span><label class="fld"><span>場面の名前</span><input data-bn="${i}" maxlength="40" value="${esc(g.name)}" placeholder="自分の画像"></label><label class="fld"><span>動き</span><select data-ba="${i}">${M.ACT_ORDER.map(a => `<option value="${a}" ${a === g.act ? 'selected' : ''}>${ACTS[a].name}</option>`).join('')}</select></label><small>${g.files.length}枚</small></div>`).join('')}</div>
    <button class="cta" id="mbGo">まとめて作る</button><button class="ghost center" id="mbX">やめる</button>`;
}
async function runBulk() {
  const btn = $('#mbGo'), G = ui.bulk; btn.disabled = true; let made = 0, done = 0; const total = G.reduce((a, g) => a + g.files.length, 0);
  for (const g of G) {
    const images = [];
    for (const f of g.files) { done++; btn.textContent = `取りこみ中… ${done}/${total}`; try { images.push(await M.addImage(f)); } catch (e) { env.toast(e.message); } }
    if (!images.length) continue;
    try { await M.saveSet({ id: newId(), act: g.act, modes: ['one', 'alt', 'both'], name: g.name, short: '', sfx: 'auto', word: '', images }); made++; } catch (e) { env.toast(e.message); }
  }
  $('#mineBulk').hidden = true; freeUrls(); ui.bulk = null; renderMine(); env.onChange();
  env.toast(`${made}組を作りました。当たる場所は各組の「編集」で直せます`);
}

/* =========================================================================
   書き出し・読み込み
   ========================================================================= */
async function doExport() {
  const b = $('#mExport'); try {
    if (b) b.disabled = true; env.toast('書き出しています…');
    const r = await M.exportZip(), ok = await env.saveFile('immersefit-custom-photos.zip', r.blob);
    if (ok) env.toast(`${r.sets}組・${r.images}枚を書き出しました（zip の中の説明も読んでください）`);
  } catch (e) { env.toast(e.message); } finally { if (b) b.disabled = false; }
}
async function doImport(file) {
  try { env.toast('読み込んでいます…'); const r = await M.importZip(file); if (r.files) { await takeFiles(r.files); return; } renderMine(); env.onChange(); env.toast(`${r.sets}組を読み込みました`); }
  catch (e) { env.toast(e.message); }
}
function copyPrompt() {
  const el = $('#mPrompt'); if (!el) return; const t = el.textContent;
  const sel = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); env.toast('選択しました。コピーして使ってください'); };
  try { navigator.clipboard.writeText(t).then(() => env.toast('コピーしました'), sel); } catch (e) { sel(); }
}

/* =========================================================================
   つなぐ
   ========================================================================= */
export function setupMine(e) {
  env = e;
  const body = $('#mineBody');
  $('#mineX').addEventListener('click', () => env.back());
  body.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.mode) { env.store.set('mineMode', b.dataset.mode); MINE.mode = b.dataset.mode; env.onChange(); renderMine(); return; }
    if (b.dataset.act) { ui.act = b.dataset.act; renderMine(); return; }
    if (b.dataset.edit) { const s = M.getSet(b.dataset.edit); if (s) openEditor(s); return; }
    if (b.id === 'mCopy') copyPrompt();
    if (b.id === 'mExport') doExport();
    if (b.id === 'mRestore') M.restoreSite().then(() => { renderMine(); env.onChange(); });
  });
  body.addEventListener('change', ev => {
    const t = ev.target;
    if (t.id === 'mFile') { const f = [...t.files]; t.value = ''; takeFiles(f); }
    if (t.id === 'mZip') { const f = t.files[0]; t.value = ''; if (f) doImport(f); }
  });
  // ドラッグで入れる（一覧の画面・編集の画面）
  const dz = (el, on) => {
    el.addEventListener('dragover', ev => { if ([...(ev.dataTransfer && ev.dataTransfer.types || [])].includes('Files')) { ev.preventDefault(); const d = $('#mDrop'); if (d && el === body) d.classList.add('over'); } });
    el.addEventListener('dragleave', () => { const d = $('#mDrop'); if (d) d.classList.remove('over'); });
    el.addEventListener('drop', ev => { const fs = [...(ev.dataTransfer && ev.dataTransfer.files || [])]; if (!fs.length) return; ev.preventDefault(); const d = $('#mDrop'); if (d) d.classList.remove('over'); on(fs); });
  };
  dz(body, fs => { const zip = fs.find(f => /\.zip$/i.test(f.name)); if (zip) doImport(zip); else takeFiles(fs); });
  dz($('#mineEd'), fs => { if (ui.ed) addFiles(fs); });
  // 貼り付け（ChatGPT などで画像をコピー → ここで貼り付け）
  document.addEventListener('paste', ev => {
    const open = !$('#mine').hidden; if (!open || sfxOpen()) return;
    const fs = [...(ev.clipboardData && ev.clipboardData.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(f => f && isImg(f))
      .map((f, i) => new File([f], f.name && f.name !== 'image.png' ? f.name : `貼り付け-${Date.now()}-${i + 1}.png`, { type: f.type }));
    if (!fs.length) return; ev.preventDefault();
    if (ui.ed) addFiles(fs); else if (!ui.bulk) takeFiles(fs);
  });
  // 編集
  const ed = $('#mineEd');
  ed.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b || !ui.ed) return; const s = ui.ed;
    if (b.id === 'meX' || b.id === 'meCancel') { closeEd(false); return; }
    if (b.dataset.sel !== undefined) { readFields(); ui.sel = +b.dataset.sel; renderEd(); return; }
    if (b.dataset.mv) { readFields(); const j = ui.sel + +b.dataset.mv; if (j < 0 || j >= s.images.length) return; [s.images[ui.sel], s.images[j]] = [s.images[j], s.images[ui.sel]]; ui.sel = j; renderEd(); return; }
    if (b.id === 'meDelImg') { readFields(); s.images.splice(ui.sel, 1); ui.sel = Math.max(0, Math.min(ui.sel, s.images.length - 1)); stopPrev(); renderEd(); return; }
    if (b.dataset.mode) { const m = b.dataset.mode, on = s.modes.includes(m); if (on && s.modes.length === 1) { env.toast('どれか1つは選んでください'); return; } s.modes = on ? s.modes.filter(x => x !== m) : ['one', 'alt', 'both'].filter(x => x === m || s.modes.includes(x)); b.classList.toggle('on', !on); b.setAttribute('aria-pressed', !on); return; }
    if (b.id === 'meSfxPlay') { readFields(); env.music.unlock && env.music.unlock(); playHit(env.music, curHit(s), undefined, { n: 0 }); return; }
    if (b.id === 'meSfxPick') { readFields(); openSfx({ pick: true, current: s.sfx || 'auto', auto: M.autoHit(s), title: '効果音をえらぶ', onPick: id => { if (!ui.ed) return; ui.ed.sfx = id; refreshSfx(); if (ui.prev) { stopPrev(); startPrev(); } } }); return; }
    if (b.id === 'mePlay') { if (ui.prev) stopPrev(); else startPrev(); return; }
    if (b.id === 'meSave') { saveEd(); return; }
    if (b.id === 'meRemove') { if (!ui.sure) { ui.sure = true; b.textContent = 'もう一度押すと消えます'; return; } const id = s.id, act = s.act; closeEd(true).then(() => M.deleteSet(id)).then(() => { ui.act = act; renderMine(); env.onChange(); env.toast('組を消しました'); }); }
  });
  ed.addEventListener('change', ev => {
    const t = ev.target;
    if (t.dataset.add !== undefined) { const f = [...t.files]; t.value = ''; readFields(); addFiles(f); }
    if (t.id === 'meAct') { readFields(); refreshSfx(); const h = $('#meT small'); if (h) h.textContent = ACTS[ui.ed.act].name; }
  });
  ed.addEventListener('input', ev => { if (ev.target.id === 'meName' || ev.target.id === 'meWord') { readFields(); refreshSfx(); } });
  // 当たる場所：タップ・ドラッグ・矢印キー
  ed.addEventListener('pointerdown', ev => { const big = ev.target.closest('#meBig'); if (!big || ui.prev || !$('#meImg')) return; ev.preventDefault(); big.setPointerCapture && big.setPointerCapture(ev.pointerId); ui.drag = true; focusFrom(ev); });
  ed.addEventListener('pointermove', ev => { if (ui.drag) focusFrom(ev); });
  const up = () => { ui.drag = false; }; ed.addEventListener('pointerup', up); ed.addEventListener('pointercancel', up);
  ed.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !sfxOpen()) { closeEd(false); return; }
    if (ev.target.id !== 'meBig' || !ui.ed) return; const im = ui.ed.images[ui.sel]; if (!im) return;
    const d = ev.shiftKey ? 0.1 : 0.02, mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[ev.key];
    if (mv) { ev.preventDefault(); im.focus = [c01(im.focus[0] + mv[0]), c01(im.focus[1] + mv[1])]; placeFocus(); }
  });
  addEventListener('resize', () => { if (ui.ed) placeFocus(); });
  // まとめて
  const bk = $('#mineBulk');
  bk.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; if (b.id === 'mbX' || b.id === 'mbX2') { bk.hidden = true; freeUrls(); ui.bulk = null; } if (b.id === 'mbGo') runBulk(); });
  bk.addEventListener('input', ev => { const t = ev.target; if (t.dataset.bn !== undefined) ui.bulk[+t.dataset.bn].name = t.value.trim(); });
  bk.addEventListener('change', ev => { const t = ev.target; if (t.dataset.ba !== undefined) ui.bulk[+t.dataset.ba].act = t.value; });
  M.onMine(() => { if (!$('#mine').hidden && !ui.ed) renderMine(); });
}
export const mineEditing = () => !!ui.ed || !!ui.bulk;
export function closeMineDialogs() { if (sfxOpen()) closeSfx(); if (ui.ed) closeEd(false); if (ui.bulk) { $('#mineBulk').hidden = true; freeUrls(); ui.bulk = null; } }
