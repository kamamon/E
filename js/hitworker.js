/* IMMERSE FIT — hitworker.js
   打点の効果音を別のスレッドで作る（音楽や画面を止めないため）。hits.js の renderHit をそのまま使います。 */
import { renderHit } from './hits.js';
self.onmessage = e => {
  const { q, id, sr } = e.data || {};
  try { const r = renderHit(id, sr); if (!r) { self.postMessage({ q, id }); return; } self.postMessage({ q, id, L: r.L, R: r.R, pre: r.pre }, [r.L.buffer, r.R.buffer]); }
  catch (err) { self.postMessage({ q, id, err: String(err && err.message || err) }); }
};
