/* =========================================================================
   IMMERSE FIT — sfx.js
   場面の効果音（すべて Web Audio で合成）。playSfx(music, 名前, 時刻, { n: 何回目 })
   ========================================================================= */
import { HIT_BY_ID, playHit } from './hits.js';
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export const SFX = {
  chop: '包丁でトン', knock: '木をコンコン', hammer: '金づちでカン', clang: '大きな金属音', ping: 'くぎの高い音',
  taiko: '和太鼓ドン', drum: 'タム', snare: '小太鼓', bongo: 'ボンゴ', cymbal: 'シンバル', gong: 'どら', bell: 'チーン（ベル）',
  ding: 'ピンポン（正解）', chime: 'キラキラ', xylo: '木琴（回ごとに音が上がる）', piano: 'ピアノ（回ごとに音が上がる）', pluck: 'ポロン（回ごとに音）',
  pop: '風船パン', splash: '水バシャ', squish: 'ぐちゃ', crunch: 'ザクッ（雪・落ち葉）', crack: 'パキッ', break: 'バキッ（板割り）', thud: 'ドスン',
  boing: 'ボヨン', whoosh: 'ビュン', swish: 'シュッ', squeak: 'キュッ（窓ふき）', rip: 'ビリッ', coin: 'チャリン', jump: 'ピョン', stomp: '足でドン',
  kick: 'ボールをボン', punch: 'ドスッ（サンドバッグ）', smack: 'パチン', clap: '手拍子パン', cheer: '歓声', stamp: 'ポン（はんこ）', click: 'カチッ',
  beep: 'ピッ', buzz: 'ブー（はずれ）', boo: 'ブッブー（おなら風）', whistle: '笛ピッ', firework: '花火ドーン', rocket: 'シュゴー', zap: 'ビビッ',
  magic: 'キラリン', bubble: 'ポコッ', meow: 'ニャー', quack: 'ガー（アヒル）', honk: 'プップー', engine: 'ブルン', wind: 'ヒュオー', swoosh: 'シュバッ',
  mochi: 'ぺったん', wood: 'カコン', glass: 'カシャン', goal: 'ゴール！',
};
export const SFX_NAMES = Object.keys(SFX);
// 音の大きさをそろえる（測った大きさから。低い音は少し大きめに残す）
const GAIN = {
  rip: 4, crunch: 4, whoosh: 3, swoosh: 3, wind: 3, clap: 3.5, beep: 2.5, rocket: 3, click: 1.6, smack: 2.4, zap: 2.2, jump: 2, magic: 2, quack: 2,
  squeak: 2, buzz: 1.8, honk: 1.6, coin: 1.4, cheer: 1.2, knock: 1.4, swish: 1.2, bubble: 1.3, chime: 1.2, goal: 1.1, pop: 1.3, glass: 1.1,
  pluck: 0.9, stamp: 0.9, snare: 0.8, boo: 0.85, bell: 0.9, hammer: 0.85, ding: 0.85, engine: 0.8, bongo: 0.75, boing: 0.75, xylo: 0.75, piano: 0.7,
  cymbal: 0.65, clang: 0.65, kick: 0.7, punch: 0.65, break: 0.55, mochi: 0.6, drum: 0.55, gong: 0.5, stomp: 0.5, thud: 0.45, taiko: 0.42, firework: 0.42,
};

function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
export function playSfx(m, name, when, o = {}) {
  if (name && HIT_BY_ID.has(name)) return playHit(m, name, when, o);   // 打点の効果音500種
  const ctx = m.ensure && m.ensure(); if (!ctx || !name || !SFX[name]) return;
  const t = Math.max(when === undefined ? ctx.currentTime : (m.audioTime ? m.audioTime(when) : when), ctx.currentTime), n = o.n | 0;
  const bus = (v = 1, rev = 0) => { const g = ctx.createGain(); g.gain.value = v; g.connect(m.sfxG); if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(m.rev); } return g; };
  const tone = (dest, type, f0, f1, t0, dur, peak, a = 0.003, lfo) => {
    const os = ctx.createOscillator(), g = ctx.createGain(); os.type = type; os.frequency.setValueAtTime(f0, t0);
    if (Array.isArray(f1)) { let tt = t0; for (const [f, dt] of f1) { tt += dt; os.frequency.exponentialRampToValueAtTime(f, tt); } }
    else if (f1 && f1 !== f0) os.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    if (lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = lfo[0]; lg.gain.value = lfo[1]; l.connect(lg); lg.connect(os.frequency); l.start(t0); l.stop(t0 + dur + 0.1); }
    os.connect(g); g.connect(dest); env(g, t0, a, peak, dur); os.start(t0); os.stop(t0 + a + dur + 0.05);
  };
  const noise = (dest, t0, dur, peak, type = 'bandpass', f0 = 1000, f1, q = 1, a = 0.002) => {
    const s = ctx.createBufferSource(); s.buffer = m.noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t0);
    if (Array.isArray(f1)) { let tt = t0; for (const [fq, dt] of f1) { tt += dt; f.frequency.exponentialRampToValueAtTime(fq, tt); } } else if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    f.Q.value = q; const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(dest); env(g, t0, a, peak, dur); s.start(t0, Math.random() * 0.8); s.stop(t0 + a + dur + 0.05);
  };
  const G = GAIN[name] ?? 1, B = bus(G, 0), R = bus(G, 0.35);
  switch (name) {
    case 'chop': tone(B, 'sine', 210, 90, t, 0.09, 0.7); noise(B, t, 0.035, 0.45, 'bandpass', 2600, null, 1.2); tone(B, 'triangle', 1400, 900, t, 0.03, 0.12); break;
    case 'knock': tone(B, 'triangle', 640, 430, t, 0.09, 0.55); noise(B, t, 0.04, 0.3, 'bandpass', 1800, null, 2); break;
    case 'hammer': [1180, 2630, 3920].forEach((f, i) => tone(R, 'sine', f, f * 0.995, t, 0.28 - i * 0.06, 0.32 / (i + 1))); noise(B, t, 0.03, 0.5, 'highpass', 2500); tone(B, 'sine', 160, 80, t, 0.06, 0.4); break;
    case 'clang': [420, 910, 1530, 2380].forEach((f, i) => tone(R, 'sine', f, f * 0.99, t, 0.9 - i * 0.15, 0.3 / (i + 1))); noise(B, t, 0.04, 0.4, 'highpass', 2000); break;
    case 'ping': tone(R, 'sine', 2450, 2440, t, 0.32, 0.25); tone(R, 'sine', 5230, 5200, t, 0.18, 0.1); noise(B, t, 0.02, 0.3, 'highpass', 4000); break;
    case 'taiko': tone(R, 'sine', 118, 52, t, 0.55, 1.0); noise(B, t, 0.12, 0.5, 'lowpass', 700); tone(B, 'triangle', 240, 120, t, 0.05, 0.3); break;
    case 'drum': tone(B, 'sine', 230, 105, t, 0.26, 0.85); noise(B, t, 0.06, 0.35, 'bandpass', 1200, null, 0.8); break;
    case 'snare': noise(R, t, 0.16, 0.6, 'highpass', 1400); tone(B, 'triangle', 240, 160, t, 0.07, 0.5); break;
    case 'bongo': { const f = [410, 300, 360, 270][n % 4]; tone(B, 'sine', f * 1.3, f, t, 0.14, 0.8); noise(B, t, 0.02, 0.2, 'bandpass', 3000); break; }
    case 'cymbal': noise(R, t, 1.1, 0.45, 'highpass', 6000); noise(B, t, 0.08, 0.4, 'bandpass', 4000); break;
    case 'gong': [118, 181, 262, 347, 470].forEach((f, i) => tone(R, 'sine', f, f * 0.985, t, 2.3 - i * 0.3, 0.42 / (i + 1), 0.02)); noise(B, t, 0.08, 0.25, 'lowpass', 900); break;
    case 'bell': [2093, 3140, 4186].forEach((f, i) => tone(R, 'sine', f, f, t, 1.2 - i * 0.3, 0.24 / (i + 1))); break;
    case 'ding': tone(R, 'sine', 1318, 1318, t, 0.22, 0.35); tone(R, 'sine', 1046, 1046, t + 0.17, 0.5, 0.35); break;
    case 'ok': case 'chime': [84, 88, 91, 96].forEach((k, i) => tone(R, 'sine', mtof(k), mtof(k), t + i * 0.055, 0.5, 0.18)); break;
    case 'xylo': { const k = 72 + PENTA[n % PENTA.length]; tone(R, 'sine', mtof(k), mtof(k), t, 0.35, 0.45); tone(B, 'triangle', mtof(k + 12), mtof(k + 12), t, 0.08, 0.15); break; }
    case 'piano': { const k = 60 + PENTA[n % PENTA.length]; tone(R, 'triangle', mtof(k), mtof(k), t, 0.9, 0.42); tone(R, 'sine', mtof(k + 12), mtof(k + 12), t, 0.5, 0.12); break; }
    case 'pluck': { const k = 67 + PENTA[n % 8]; tone(R, 'triangle', mtof(k), mtof(k) * 0.998, t, 0.4, 0.4); break; }
    case 'pop': noise(B, t, 0.09, 1.0, 'bandpass', 1500, 500, 0.7, 0.001); tone(B, 'sine', 200, 70, t, 0.08, 0.5); break;
    case 'splash': noise(R, t, 0.4, 0.7, 'bandpass', 900, [[3200, 0.08], [1400, 0.3]], 0.8); tone(B, 'sine', 140, 60, t, 0.12, 0.45); break;
    case 'squish': noise(B, t, 0.18, 0.7, 'lowpass', 1100, 260, 2); tone(B, 'sine', 170, 55, t, 0.16, 0.45, 0.003, [30, 40]); break;
    case 'crunch': for (let i = 0; i < 4; i++) noise(B, t + i * 0.025, 0.04, 0.5, 'bandpass', 2200 + i * 500, null, 1.5); break;
    case 'crack': noise(B, t, 0.05, 0.8, 'highpass', 2200); tone(B, 'triangle', 900, 260, t, 0.06, 0.4); break;
    case 'break': noise(B, t, 0.05, 0.9, 'highpass', 1800); tone(B, 'sine', 120, 45, t, 0.25, 0.7); for (let i = 1; i < 4; i++) noise(B, t + i * 0.05, 0.05, 0.25, 'bandpass', 2500, null, 2); break;
    case 'thud': tone(R, 'sine', 95, 38, t, 0.32, 0.95); noise(B, t, 0.08, 0.45, 'lowpass', 320); break;
    case 'boing': tone(B, 'sine', 220, [[540, 0.07], [250, 0.35]], t, 0.42, 0.5, 0.003, [16, 35]); break;
    case 'whoosh': noise(B, t, 0.3, 0.5, 'bandpass', 400, [[2600, 0.12], [600, 0.18]], 1.2, 0.04); break;
    case 'swish': noise(B, t, 0.14, 0.45, 'highpass', 2600, 5000, 0.8, 0.02); break;
    case 'squeak': tone(B, 'sine', 1750, [[2500, 0.05], [1900, 0.08]], t, 0.14, 0.22, 0.005, [40, 120]); break;
    case 'rip': for (let i = 0; i < 6; i++) noise(B, t + i * 0.03, 0.035, 0.4, 'bandpass', 2400 + i * 300, null, 2.5); break;
    case 'coin': tone(R, 'square', 988, 988, t, 0.06, 0.16); tone(R, 'square', 1318, 1318, t + 0.07, 0.35, 0.16); break;
    case 'jump': tone(B, 'square', 280, 760, t, 0.16, 0.16); break;
    case 'stomp': tone(R, 'sine', 80, 38, t, 0.28, 0.95); noise(B, t, 0.06, 0.4, 'lowpass', 260); break;
    case 'kick': tone(B, 'sine', 160, 62, t, 0.13, 0.95); noise(B, t, 0.05, 0.45, 'bandpass', 900, null, 1.2); break;
    case 'punch': tone(B, 'sine', 130, 55, t, 0.15, 1.0); noise(B, t, 0.08, 0.6, 'lowpass', 900); break;
    case 'smack': noise(B, t, 0.06, 0.9, 'bandpass', 2100, null, 1.1, 0.001); tone(B, 'triangle', 400, 200, t, 0.03, 0.3); break;
    case 'clap': for (let i = 0; i < 3; i++) noise(B, t + i * 0.009, 0.02, 0.6, 'bandpass', 1500, null, 1.4, 0.001); noise(R, t + 0.027, 0.11, 0.5, 'bandpass', 1300, null, 1.2, 0.001); break;
    case 'cheer': { const s = ctx.createBufferSource(); s.buffer = m.noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.6; const g = ctx.createGain(); const am = ctx.createOscillator(), ag = ctx.createGain(); am.frequency.value = 9; ag.gain.value = 0.12; am.connect(ag); ag.connect(g.gain); s.connect(f); f.connect(g); g.connect(R); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.18); g.gain.linearRampToValueAtTime(0.0001, t + 1.2); s.start(t); s.stop(t + 1.3); am.start(t); am.stop(t + 1.3); break; }
    case 'stamp': tone(B, 'sine', 560, 250, t, 0.12, 0.7); noise(B, t, 0.03, 0.3, 'bandpass', 1500); break;
    case 'click': noise(B, t, 0.015, 0.6, 'highpass', 4200); tone(B, 'square', 2100, 2000, t, 0.012, 0.12); break;
    case 'beep': tone(B, 'square', 1250, 1250, t, 0.09, 0.14); break;
    case 'buzz': tone(B, 'sawtooth', 140, 130, t, 0.42, 0.22); break;
    case 'boo': { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.connect(B); tone(f, 'sawtooth', 120, 85, t, 0.55, 0.55, 0.01, [26, 18]); break; }
    case 'whistle': tone(R, 'sine', 2650, 2600, t, 0.25, 0.3, 0.005, [28, 90]); break;
    case 'firework': tone(R, 'sine', 70, 34, t, 0.7, 0.95); noise(R, t, 0.5, 0.7, 'lowpass', 1600, 300); for (let i = 0; i < 7; i++) noise(B, t + 0.15 + i * 0.06 + Math.random() * 0.03, 0.03, 0.25, 'highpass', 5000); break;
    case 'rocket': noise(R, t, 0.85, 0.55, 'bandpass', 300, [[3200, 0.7]], 0.9, 0.05); break;
    case 'zap': tone(B, 'sawtooth', 1400, 180, t, 0.16, 0.25); break;
    case 'magic': [1046, 1318, 1568, 2093, 2637].forEach((f, i) => tone(R, 'triangle', f, f, t + i * 0.045, 0.3, 0.13)); noise(B, t, 0.3, 0.08, 'highpass', 7000); break;
    case 'bubble': tone(B, 'sine', 280, 950, t, 0.09, 0.5); break;
    case 'meow': { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1900, t + 0.15); f.frequency.linearRampToValueAtTime(800, t + 0.45); f.connect(R); tone(f, 'sawtooth', 480, [[780, 0.15], [440, 0.3]], t, 0.48, 0.9, 0.03); break; }
    case 'quack': { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.value = 1100; f.connect(B); tone(f, 'sawtooth', 290, 230, t, 0.2, 0.8, 0.01, [32, 30]); break; }
    case 'honk': tone(B, 'square', 392, 390, t, 0.3, 0.12); tone(B, 'square', 330, 329, t, 0.3, 0.12); break;
    case 'engine': { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; f.connect(B); tone(f, 'sawtooth', 55, [[130, 0.2], [80, 0.35]], t, 0.55, 0.6, 0.02, [22, 20]); break; }
    case 'wind': noise(R, t, 0.9, 0.35, 'bandpass', 500, [[900, 0.4], [400, 0.5]], 1.5, 0.15); break;
    case 'swoosh': noise(B, t, 0.16, 0.6, 'bandpass', 700, 4500, 1, 0.01); break;
    case 'mochi': tone(B, 'sine', 120, 50, t, 0.2, 0.9); noise(B, t, 0.09, 0.5, 'lowpass', 1300, 400, 1.5); break;
    case 'wood': tone(R, 'sine', 920, 880, t, 0.07, 0.55); tone(B, 'sine', 1460, 1400, t, 0.04, 0.25); break;
    case 'glass': [3500, 5100, 6800].forEach((f, i) => tone(R, 'sine', f, f, t + i * 0.01, 0.35 - i * 0.08, 0.14)); noise(B, t, 0.05, 0.4, 'highpass', 5000); break;
    case 'goal': tone(R, 'sine', 2650, 2600, t, 0.3, 0.25, 0.005, [28, 90]); playSfx(m, 'cheer', t + 0.05); break;
  }
}
