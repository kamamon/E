/* IMMERSE FIT — store.js : 記録と設定をこの端末（ブラウザ）に保存します */
const KEY = 'immersefit.v2';
const DEF = {
  settings: { music: 0.7, sfx: 0.9, voice: true, rate: 1.05, weight: 55, cam: false, quiet: false, level: 3, minutes: 5, ver: 'full', look: 'real', show: 4, hitMode: 'scene', hitFixed: '', hitFav: [], mineMode: 'mix' },
  history: [], fav: [], found: {}, recent: [],
};
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return { ...DEF, ...s, settings: { ...DEF.settings, ...(s.settings || {}) } }; } catch (e) { /* 保存できない環境 */ }
  return JSON.parse(JSON.stringify(DEF));
}
export const store = {
  d: load(),
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { /* 容量不足など */ } },
  get s() { return this.d.settings; },
  set(k, v) { this.d.settings[k] = v; this.save(); },
  isFav(id) { return this.d.fav.includes(id); },
  toggleFav(id) { const f = this.d.fav, i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); this.save(); return i < 0; },
  found(id) { return !!this.d.found[id]; },
  markDone(id) { const isNew = !this.d.found[id]; this.d.found[id] = (this.d.found[id] || 0) + 1; this.d.recent = [id, ...this.d.recent.filter(x => x !== id)].slice(0, 80); return isNew; },
  addSession(rec) { this.d.history.unshift(rec); this.d.history = this.d.history.slice(0, 400); this.save(); },
  foundCount(prefix) { return Object.keys(this.d.found).filter(id => !prefix || id[0] === prefix).length; },
  days() { const set = new Set(this.d.history.map(h => h.day)); return set; },
  streak() {
    const days = this.days(); let n = 0; const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  weekMinutes() { const t = Date.now() - 7 * 864e5; return Math.round(this.d.history.filter(h => h.at > t).reduce((a, h) => a + h.sec, 0) / 60); },
  totals() { const h = this.d.history; return { n: h.length, min: Math.round(h.reduce((a, x) => a + x.sec, 0) / 60), kcal: Math.round(h.reduce((a, x) => a + x.kcal, 0)) }; },
  reset() { this.d = JSON.parse(JSON.stringify(DEF)); this.save(); },
};
export function dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
