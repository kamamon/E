// 場面の自動チェック（ブラウザなし）: node tools/validate.mjs [ファイル名...]
// すべての場面を、対応するモード・左右で最初から最後まで動かし、エラーや決まりごとの違反を探します。
globalThis.Path2D = class { constructor(d) { this.d = d; } };
const noop = () => { };
const grad = { addColorStop: noop };
// ブラウザではエラーになる値（負の半径など）をここでも検出する
const bad = (name, ...v) => { if (v.some(x => typeof x === 'number' && !Number.isFinite(x))) throw new Error(`${name} に NaN/Infinity`); };
const checks = {
  arc: (x, y, r) => { bad('arc', x, y, r); if (r < 0) throw new Error('arc の半径が負'); },
  ellipse: (x, y, rx, ry) => { bad('ellipse', x, y, rx, ry); if (rx < 0 || ry < 0) throw new Error('ellipse の半径が負'); },
  roundRect: (x, y, w, h, r) => { bad('roundRect', x, y, w, h); if (typeof r === 'number' && r < 0) throw new Error('roundRect の角が負'); },
  moveTo: (x, y) => bad('moveTo', x, y), lineTo: (x, y) => bad('lineTo', x, y),
  translate: (x, y) => bad('translate', x, y), scale: (x, y) => bad('scale', x, y),
};
const ctx = new Proxy({}, {
  get(t, k) {
    if (k in t) return t[k];
    if (k in checks) return checks[k];
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    return noop;
  },
  set(t, k, v) { t[k] = v; return true; },
});
const canvas = { width: 400, height: 400, getContext: () => ctx };
globalThis.window = { devicePixelRatio: 1 };

const { expand } = await import('../js/scenes/registry.js');
const only = process.argv.slice(2);
const SCENES = only.length ? (await Promise.all(only.map(async f => expand(f, (await import(`../js/scenes/${f}.js`)).default)))).flat() : (await import('../js/scenes/index.js')).SCENES;
const { Stage, ACTS, THEMES, sfxFor } = await import('../js/stage.js');
const { SFX } = await import('../js/sfx.js');
const list = SCENES;
const problems = [], ids = new Set(), counts = {};
for (const inst of list) {
  const P = m => problems.push(`${inst.id}: ${m}`);
  if (ids.has(inst.id)) P('id が重複'); ids.add(inst.id);
  if (!inst.name) P('name がない'); else if ([...inst.name].length > 12) P(`name が長い（${[...inst.name].length}文字・12文字まで）`);
  if (!inst.short) P('short がない'); else if ([...inst.short].length > 7) P(`short が長い（${[...inst.short].length}文字・7文字まで）`);
  if (!inst.acts || !inst.acts.length) P('acts がない'); else for (const a of inst.acts) if (!ACTS[a]) P(`acts に知らない動き ${a}`);
  for (const m of inst.modes) if (!['one', 'alt', 'both'].includes(m)) P(`modes に知らない値 ${m}`);
  if (!THEMES[inst.theme]) P(`theme が知らない値 ${inst.theme}`);
  for (const k of [1, 2]) { const n = sfxFor(inst, k); if (n && !SFX[n]) P(`sfx が知らない音 ${n}`); }
  if (typeof inst.tpl.draw !== 'function') P('draw がない');
  for (const a of inst.acts || []) for (const m of inst.modes) counts[a + '/' + m] = (counts[a + '/' + m] || 0) + 1;
  for (const mode of inst.modes) for (const side of ['R', 'L']) {
    const st = new Stage(canvas); st.resize(390, 844, 1);
    const errs = []; st.report = (i, e) => errs.push(e.message);
    const lateral = inst.acts.some(a => ACTS[a] && ACTS[a].lateral);
    const sides = mode === 'alt' ? (side === 'L' ? ['L', 'R'] : ['R', 'L']) : mode === 'both' ? ['B', 'B'] : [side, side];
    const clip = { inst, act: inst.acts[0], mode, sides, dirs: lateral ? ['R', 'L'] : sides, hits: [1.1, 3.1], b0: 0, b1: 4, seed: 3, round: 1, idx: 0 };
    for (let b = 0; b <= 4; b += 1 / 30) st.frame(clip, { beat: b, spb: 0.536, dt: 1 / 56 });
    // 横長でも
    st.resize(844, 390, 1); const clip2 = { ...clip }; for (let b = 0; b <= 4; b += 0.2) st.frame(clip2, { beat: b, spb: 0.536, dt: 0.1 });
    if (errs.length) P(`${mode}/${side} でエラー: ${[...new Set(errs)].slice(0, 3).join(' / ')}`);
  }
}
console.log(`場面 ${list.length} 個`);
console.log('動き/モードごとの数:', Object.entries(counts).sort().map(([k, v]) => `${k}=${v}`).join('  '));
if (problems.length) { console.log(`\n問題 ${problems.length} 件:`); for (const p of problems) console.log(' - ' + p); process.exitCode = 1; }
else console.log('問題なし');
