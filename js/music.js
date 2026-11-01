/* =========================================================================
   IMMERSE FIT — music.js
   Web Audio だけで作る自動生成ミュージック（著作権フリー）
   休憩＝静か → 開始前＝ビルドアップ → 運動中＝ドロップ、と運動の流れに合わせて変化します。
   ========================================================================= */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// スタイル：ワールドごとの曲調
export const STYLES = {
  koto: {
    prog: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 59, 64]], bass: [45, 41, 38, 40], scale: [64, 65, 69, 71, 72, 76, 77, 81],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    bassPat: [0, -1, -1, 0, -1, -1, 7, -1, 0, -1, -1, -1, 12, -1, 7, -1], kickType: 'taiko', snareType: 'wood', hatType: 'shaker',
    chord: 'pad', arp: 'koto', arpPat: 'updown', lead: 'koto', swing: 0.04, bassType: 'sub',
  },
  synth: {
    prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass: [45, 41, 36, 43], scale: [69, 71, 72, 74, 76, 79, 81, 84],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bassPat: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0], kickType: 'punch', snareType: 'snare', hatType: 'open',
    chord: 'pad', arp: 'saw', arpPat: 'up16', lead: 'lead', swing: 0, bassType: 'saw',
  },
  tropical: {
    prog: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], bass: [48, 43, 45, 41], scale: [72, 74, 76, 79, 81, 84, 86, 88],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bassPat: [-1, -1, 0, -1, -1, -1, 0, -1, -1, -1, 0, -1, -1, 12, 0, -1], kickType: 'soft', snareType: 'clap', hatType: 'shaker',
    chord: 'stab', arp: 'marimba', arpPat: 'tropical', lead: 'marimba', swing: 0.03, bassType: 'pluck',
  },
  space: {
    prog: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], bass: [38, 34, 41, 36], scale: [74, 76, 77, 79, 81, 84, 86, 89],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bassPat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], kickType: 'punch', snareType: 'clap', hatType: 'tick',
    chord: 'pad', arp: 'bell', arpPat: 'random8', lead: 'bell', swing: 0, bassType: 'pulse',
  },
  lofi: {
    prog: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], bass: [41, 40, 38, 36], scale: [72, 74, 76, 77, 79, 81, 84, 86],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bassPat: [0, -1, -1, -1, -1, -1, 0, -1, -1, -1, 7, -1, -1, -1, -1, -1], kickType: 'soft', snareType: 'snare', hatType: 'tick',
    chord: 'rhodes', arp: 'rhodes', arpPat: 'lazy', lead: 'rhodes', swing: 0.12, bassType: 'sub', vinyl: 1,
  },
  trance: {
    prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass: [45, 41, 36, 43], scale: [76, 77, 79, 81, 84, 86, 88, 89],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bassPat: [-1, -1, 0, -1, -1, -1, 0, -1, -1, -1, 0, -1, -1, -1, 0, -1], kickType: 'punch', snareType: 'clap', hatType: 'open',
    chord: 'gate', arp: 'pluck', arpPat: 'up16', lead: 'lead', swing: 0, bassType: 'saw',
  },
  dream: {
    prog: [[51, 55, 58, 62], [48, 51, 55, 58], [44, 48, 51, 55], [46, 50, 53, 57]], bass: [39, 36, 32, 34], scale: [70, 72, 74, 75, 77, 79, 82, 84],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bassPat: [0, -1, -1, -1, -1, -1, -1, -1, 0, -1, -1, -1, -1, -1, 7, -1], kickType: 'soft', snareType: 'wood', hatType: 'tick',
    chord: 'pad', arp: 'bell', arpPat: 'lazy', lead: 'bell', swing: 0.05, bassType: 'sub',
  },
  house: {
    prog: [[50, 53, 57, 60], [55, 58, 62, 65], [57, 60, 64, 67], [50, 53, 57, 60]], bass: [38, 43, 45, 38], scale: [74, 77, 79, 81, 84, 86, 89, 91],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
    bassPat: [-1, -1, 0, -1, -1, -1, 0, 12, -1, -1, 0, -1, -1, 7, 0, -1], kickType: 'punch', snareType: 'clap', hatType: 'shaker',
    chord: 'organ', arp: 'pluck', arpPat: 'tropical', lead: 'organ', swing: 0.06, bassType: 'pluck',
  },
  pop: {
    prog: [[53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64]], bass: [41, 36, 43, 45], scale: [72, 74, 76, 79, 81, 84, 86, 88],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bassPat: [0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1], kickType: 'punch', snareType: 'clap', hatType: 'tick',
    chord: 'piano', arp: 'pluck', arpPat: 'up8', lead: 'pluck', swing: 0, bassType: 'saw',
  },
  techno: {
    prog: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]], bass: [33, 33, 29, 31], scale: [69, 72, 74, 76, 79, 81, 84, 86],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bassPat: [-1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 12, 0], kickType: 'hard', snareType: 'clap', hatType: 'open',
    chord: 'stab', arp: 'saw', arpPat: 'random16', lead: 'saw', swing: 0, bassType: 'saw',
  },
};

export class Music {
  constructor() {
    this.ctx = null; this.running = false; this.bpm = 112; this.t0 = 0; this.step = 0;
    this.style = STYLES.koto; this.section = () => ({ sec: 'idle' });
    this.vol = { music: 0.8, sfx: 0.8 }; this.seed = 1;
    // 時計：音の時計（AudioContext）が止まっても進む（skew = 止まっていたあいだに進んだ分）
    this._a = 0; this._p = 0; this.skew = 0; this.skew0 = 0;
  }
  // いまの時刻（秒）。音の時計が動いていればそれ、止まっていれば端末の時計で先に進める
  get now() {
    if (!this.ctx) return performance.now() / 1000;
    const p = performance.now() / 1000, a = this.ctx.currentTime;
    if (a !== this._a || !this._p) { this._a = a; this._p = p; this.skew0 = this.skew; }   // 音の時計が進んだ
    const stalled = this.ctx.state !== 'running' || (p - this._p) > 0.25;
    if (!stalled) return a + this.skew;
    const n = this._a + this.skew0 + (p - this._p);   // 最後に進んだ時点から、端末の時計で先へ
    this.skew = n - a;                                 // 音の時計が動き出しても時刻が飛ばないように
    return n;
  }
  // この時計の時刻 → 音の予約に使う時刻
  audioTime(t) { return t - this.skew; }
  // 音の時計が止まっていたら動かしてみる（画面に触れたときや、定期的に）
  wake() {
    const ctx = this.ctx; if (!ctx || ctx.state === 'running') return;
    try { const p = ctx.resume(); if (p && p.catch) p.catch(() => { }); } catch (e) { /* 対応していない端末 */ }
  }
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 対応していない端末 */ }
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
    // 止まったら（別のアプリ・電話・端末の都合）、次に画面に触れたときに動かし直す
    ctx.addEventListener('statechange', () => { if (ctx.state !== 'running' && this.running) setTimeout(() => this.wake(), 300); });
    if (typeof document !== 'undefined' && !this._wakeHooked) {
      this._wakeHooked = true;
      for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, () => this.wake(), { passive: true, capture: true });
      setInterval(() => { if (this.running) this.wake(); }, 1500);
    }
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 3.5; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
    this.master = ctx.createGain(); this.master.gain.value = 0.76;
    this.comp.connect(this.master); this.master.connect(ctx.destination);
    this.duckG = ctx.createGain(); this.duckG.connect(this.comp);
    this.musicG = ctx.createGain(); this.musicG.gain.value = this.vol.music; this.musicG.connect(this.duckG);
    this.filt = ctx.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 18000; this.filt.Q.value = 0.7; this.filt.connect(this.musicG);
    this.drums = ctx.createGain(); this.drums.gain.value = 1; this.drums.connect(this.musicG);
    this.sfxG = ctx.createGain(); this.sfxG.gain.value = this.vol.sfx; this.sfxG.connect(this.comp);
    // 残響とディレイ
    this.rev = ctx.createConvolver(); this.rev.buffer = this.impulse(2.4); this.revG = ctx.createGain(); this.revG.gain.value = 0.32; this.rev.connect(this.revG); this.revG.connect(this.musicG);
    this.dly = ctx.createDelay(1.5); this.dlyFb = ctx.createGain(); this.dlyFb.gain.value = 0.32; this.dlyF = ctx.createBiquadFilter(); this.dlyF.type = 'lowpass'; this.dlyF.frequency.value = 3200;
    this.dly.connect(this.dlyF); this.dlyF.connect(this.dlyFb); this.dlyFb.connect(this.dly); this.dlyG = ctx.createGain(); this.dlyG.gain.value = 0.28; this.dlyF.connect(this.dlyG); this.dlyG.connect(this.musicG);
    this.noise = this.noiseBuf();
    return ctx;
  }
  // iPhone で無音スイッチでも鳴るように（ユーザー操作の中で呼ぶ）
  unlock() {
    const ctx = this.ensure(); if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    if (!this.htmlAudio) {
      try {
        const a = this.htmlAudio = new Audio(silentWav()); a.loop = true; a.setAttribute('playsinline', ''); a.volume = 0.01; a.play().catch(() => { });
      } catch (e) { /* ignore */ }
    }
  }
  impulse(sec) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    return b;
  }
  noiseBuf() { const ctx = this.ctx, n = ctx.sampleRate * 1.5, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  setVolumes(music, sfx) {
    this.vol = { music, sfx }; if (!this.ctx) return;
    this.musicG.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05); this.sfxG.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
  }
  duck(on) { if (!this.ctx) return; this.duckG.gain.setTargetAtTime(on ? 0.5 : 1, this.ctx.currentTime, on ? 0.06 : 0.35); }
  setStyle(key, seed = 1) { this.style = STYLES[key] || STYLES.koto; this.seed = seed; this.styleKey = key; }
  spb() { return 60 / this.bpm; }
  beatNow() { return (this.now - this.t0) / this.spb(); }
  timeOfBeat(b) { return this.t0 + b * this.spb(); }
  // 途中でテンポを変える（いまの拍の位置はそのまま）
  setTempo(bpm) {
    if (!bpm || bpm === this.bpm) return;
    const b = this.beatNow(); this.bpm = bpm; this.t0 = this.now - b * this.spb(); this.step = Math.max(0, Math.ceil(b * 4));
    if (this.dly) this.dly.delayTime.value = this.spb() * 0.75;
  }
  start(bpm, delay = 0.12) {
    const ctx = this.ensure();
    this.bpm = bpm; this.t0 = this.now + delay; this.step = 0; this.running = !!ctx; this.lastSec = '';
    if (!ctx) return;
    this.filt.frequency.cancelScheduledValues(ctx.currentTime); this.filt.frequency.setValueAtTime(18000, ctx.currentTime);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  }
  stop(fade = 0.6) {
    this.running = false;
    if (this.ctx) { const t = this.ctx.currentTime; this.musicG.gain.cancelScheduledValues(t); this.musicG.gain.setValueAtTime(this.musicG.gain.value, t); this.musicG.gain.linearRampToValueAtTime(0.0001, t + fade); setTimeout(() => { if (!this.running && this.ctx) this.musicG.gain.setTargetAtTime(this.vol.music, this.ctx.currentTime, 0.05); }, fade * 1000 + 80); }
  }
  tick() {
    if (!this.running || !this.ctx) return;
    if (this.ctx.state !== 'running') { void this.now; return; }   // 音の時計が止まっているあいだは予約しない（時計だけ進める）
    const ahead = this.ctx.currentTime + 0.16, sp = this.spb() / 4, sk = this.skew;
    while (this.t0 + this.step * sp - sk < ahead) {
      const s = this.step, t = this.t0 + s * sp + (s % 2 ? this.style.swing * sp : 0) - sk;
      if (t > this.ctx.currentTime - 0.02) this.play(s, t);
      this.step++;
    }
  }
  r(n) { let x = Math.sin(n * 12.9898 + this.seed * 78.233) * 43758.5453; return x - Math.floor(x); }
  play(step, t) {
    const S = this.style, beat = step / 4, info = this.section(beat) || { sec: 'idle' };
    const sec = info.sec, st = step % 16, bar = Math.floor(step / 16), ci = bar % 4;
    const chord = S.prog[ci], root = S.bass[ci];
    const work = sec === 'work' || sec === 'peak', calm = sec === 'cool' || sec === 'idle' || sec === 'outro';
    const build = sec === 'build';
    // セクションの頭
    if (st === 0) {
      if (sec !== this.lastSec) {
        if (work && this.lastSec === 'build') { this.crash(t); this.impact(t); }
        this.filterFor(sec, t);
        this.lastSec = sec;
      }
      // コード（パッド）
      if (S.chord === 'pad' || calm || sec === 'rest' || sec === 'intro') this.pad(t, chord, this.spb() * 4 * 1.02, calm ? 0.08 : 0.07);
    }
    // ドラム
    const kOn = work || (sec === 'intro' && info.bar >= 2 && info.bar < info.bars - 1);
    if (kOn && S.kick[st]) this.kick(t, S.kickType, work ? 1 : 0.6);
    if (work && S.snare[st]) this.snare(t, S.snareType);
    if ((work || sec === 'rest' || (sec === 'intro' && info.bar >= 1)) && S.hat[st]) this.hat(t, work ? S.hatType : 'tick', work ? 0.9 : 0.45);
    if (sec === 'peak' && st % 4 === 2) this.hat(t, 'open', 0.5);
    if (build) {
      const n = info.step16 ?? st;
      if (n >= 8 || n % 2 === 0) this.snare(t, 'roll', 0.25 + 0.7 * (n / 16));
      if (st === 0) this.riser(t, this.spb() * 4);
    }
    // ベース
    const bp = S.bassPat[st];
    if ((work || sec === 'rest') && bp >= 0) this.bassNote(t, root + bp, sp4(this) * (S.bassType === 'sub' ? 3 : 1.6), S.bassType, work ? 0.55 : 0.32);
    if (calm && st === 0) this.bassNote(t, root, this.spb() * 3.8, 'sub', 0.25);
    // コードのきざみ
    if (work) {
      if (S.chord === 'stab' && (st === 2 || st === 6 || st === 10 || st === 14 || (st === 7 && bar % 2))) this.chordHit(t, chord, 'stab', 0.13);
      if (S.chord === 'gate' && st % 2 === 0) this.chordHit(t, chord, 'gate', 0.06);
      if (S.chord === 'organ' && (st === 2 || st === 6 || st === 10 || st === 14)) this.chordHit(t, chord, 'organ', 0.1);
      if (S.chord === 'rhodes' && (st === 0 || st === 7 || st === 10)) this.chordHit(t, chord, 'rhodes', 0.12);
      if (S.chord === 'piano' && (st % 4 === 0 || st === 6 || st === 14)) this.chordHit(t, chord, 'piano', 0.11);
    } else if ((sec === 'rest' || sec === 'intro') && S.chord === 'rhodes' && st === 0) this.chordHit(t, chord, 'rhodes', 0.1);
    // アルペジオ
    const arpOn = work || sec === 'rest' || sec === 'intro' || sec === 'idle' || sec === 'cool';
    if (arpOn) {
      const note = this.arpNote(S, chord, st, bar, step);
      if (note) this.voice(t, note, sp4(this) * (calm ? 3 : 1.6), S.arp, (work ? 0.13 : 0.08) * (calm ? 0.8 : 1), true);
    }
    // メロディ（後半の盛り上がり）
    if (sec === 'peak' && (st % 4 === 0 || (st % 4 === 2 && this.r(step) > 0.55))) {
      const n = S.scale[Math.floor(this.r(step * 3.1 + bar) * S.scale.length)];
      this.voice(t, n, sp4(this) * 2.2, S.lead, 0.1, true);
    }
    if (S.vinyl && st === 0) this.vinyl(t, this.spb() * 4);
  }
  arpNote(S, chord, st, bar, step) {
    const notes = chord.map(n => n + 12);
    switch (S.arpPat) {
      case 'up16': return notes[st % notes.length] + (Math.floor(st / notes.length) % 2 ? 12 : 0);
      case 'up8': return st % 2 ? null : notes[(st / 2) % notes.length] + 12;
      case 'updown': { const seq = [0, 1, 2, 3, 2, 1]; const sc = S.scale; return st % 2 ? null : sc[seq[(st / 2) % 6] + (bar % 2 ? 2 : 0)]; }
      case 'random8': return st % 2 ? null : notes[Math.floor(this.r(step) * notes.length)] + (this.r(step + 9) > 0.6 ? 12 : 0);
      case 'random16': return this.r(step) > 0.45 ? notes[Math.floor(this.r(step + 1) * notes.length)] : null;
      case 'tropical': return [0, 3, 6, 10, 12, 14].includes(st) ? notes[(st + bar) % notes.length] + 12 : null;
      case 'lazy': return st % 4 === 0 || st === 6 ? notes[(st / 2 + bar) % notes.length | 0] + 12 : null;
      default: return null;
    }
  }
  filterFor(sec, t) {
    const f = this.filt.frequency; f.cancelScheduledValues(t);
    const v = sec === 'rest' ? 2600 : sec === 'intro' ? 1600 : sec === 'cool' || sec === 'idle' ? 2200 : 18000;
    f.setTargetAtTime(v, t, sec === 'work' ? 0.02 : 0.4);
    if (sec === 'build') { f.setValueAtTime(1800, t); f.exponentialRampToValueAtTime(14000, t + this.spb() * 4); }
  }
  /* ---------- 楽器 ---------- */
  env(g, t, a, peak, d, sus = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d); }
  osc(type, f, t, dur, dest, det = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = det; o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
  nz(t, dur, dest) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05); return s; }
  kick(t, type, v = 1) {
    const ctx = this.ctx, g = ctx.createGain(); g.connect(this.drums);
    const o = ctx.createOscillator(); o.type = 'sine';
    const f0 = type === 'taiko' ? 120 : type === 'hard' ? 180 : type === 'soft' ? 130 : 160, f1 = type === 'taiko' ? 52 : 46, dec = type === 'taiko' ? 0.55 : type === 'soft' ? 0.3 : 0.36;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.09);
    o.connect(g); this.env(g, t, 0.003, 0.95 * v, dec); o.start(t); o.stop(t + dec + 0.1);
    if (type !== 'soft') { const c = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = type === 'taiko' ? 600 : 2500; this.nz(t, 0.03, hp); hp.connect(c); c.connect(this.drums); this.env(c, t, 0.001, 0.25 * v, 0.025); }
  }
  snare(t, type, v = 1) {
    const ctx = this.ctx;
    if (type === 'wood') { const g = ctx.createGain(); g.connect(this.drums); this.osc('sine', 980, t, 0.08, g); this.osc('sine', 1560, t, 0.06, g); this.env(g, t, 0.001, 0.22 * v, 0.06); return; }
    if (type === 'clap') {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.9;
      const g = ctx.createGain(); bp.connect(g); g.connect(this.drums); g.connect(this.rev);
      for (let i = 0; i < 3; i++) this.nz(t + i * 0.011, 0.02, bp);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); return;
    }
    const bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = type === 'roll' ? 2200 : 1200;
    const g = ctx.createGain(); bp.connect(g); g.connect(this.drums); if (type !== 'roll') g.connect(this.rev);
    this.nz(t, 0.2, bp); this.env(g, t, 0.002, (type === 'roll' ? 0.28 : 0.42) * v, type === 'roll' ? 0.08 : 0.17);
    if (type !== 'roll') { const tg = ctx.createGain(); tg.connect(this.drums); this.osc('triangle', 190, t, 0.1, tg); this.env(tg, t, 0.002, 0.25 * v, 0.08); }
  }
  hat(t, type, v = 1) {
    const ctx = this.ctx, hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = type === 'shaker' ? 'bandpass' : 'highpass'; hp.frequency.value = type === 'shaker' ? 6500 : 8000; hp.Q.value = type === 'shaker' ? 1.2 : 0.7;
    hp.connect(g); g.connect(this.drums);
    const dec = type === 'open' ? 0.22 : type === 'shaker' ? 0.06 : 0.035;
    this.nz(t, dec + 0.02, hp); this.env(g, t, 0.001, (type === 'shaker' ? 0.16 : 0.13) * v, dec);
  }
  crash(t) { const ctx = this.ctx, hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 5000; hp.connect(g); g.connect(this.drums); g.connect(this.rev); this.nz(t, 1.4, hp); this.env(g, t, 0.002, 0.18, 1.3); }
  impact(t) { const g = this.ctx.createGain(); g.connect(this.drums); const o = this.osc('sine', 90, t, 0.8, g); o.frequency.exponentialRampToValueAtTime(32, t + 0.6); this.env(g, t, 0.005, 0.5, 0.7); }
  riser(t, dur) {
    const ctx = this.ctx, bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 2.5; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    bp.connect(g); g.connect(this.musicG); g.connect(this.rev); this.nz(t, dur, bp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
  }
  vinyl(t, dur) { const ctx = this.ctx, bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.connect(g); g.connect(this.musicG); this.nz(t, dur, bp); g.gain.value = 0.012; }
  pad(t, chord, dur, v) {
    const ctx = this.ctx, lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    lp.connect(g); g.connect(this.filt); g.connect(this.rev);
    for (const n of chord) for (const det of [-9, 9]) this.osc(this.styleKey === 'koto' || this.styleKey === 'dream' ? 'triangle' : 'sawtooth', mtof(n), t, dur, lp, det);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.6, dur * 0.3)); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }
  chordHit(t, chord, type, v) { for (const n of chord) this.voice(t, n + (type === 'gate' ? 12 : 0), type === 'gate' ? 0.09 : type === 'organ' ? 0.2 : 0.35, type, v / chord.length * 2.2, false); }
  bassNote(t, n, dur, type, v) {
    const ctx = this.ctx, lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(type === 'saw' ? 900 : 600, t); lp.frequency.exponentialRampToValueAtTime(type === 'pluck' ? 220 : 380, t + dur);
    lp.connect(g); g.connect(this.filt);
    const f = mtof(n);
    if (type === 'sub' || type === 'pulse') this.osc('sine', f, t, dur, g); else { this.osc(type === 'pluck' ? 'square' : 'sawtooth', f, t, dur, lp); this.osc('sine', f, t, dur, g); }
    if (type === 'pulse') { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + this.spb() / 4 * 0.9); return; }
    this.env(g, t, 0.005, v, dur);
  }
  voice(t, n, dur, type, v, send) {
    const ctx = this.ctx, g = ctx.createGain(), f = mtof(n);
    let out = g;
    switch (type) {
      case 'koto': { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3; const o = this.osc('sawtooth', f, t, dur, bp); o.detune.setValueAtTime(-35, t); o.detune.linearRampToValueAtTime(0, t + 0.04); bp.connect(g); this.env(g, t, 0.002, v * 2.2, Math.min(0.9, dur * 2)); break; }
      case 'bell': { const mod = ctx.createOscillator(), mg = ctx.createGain(); mod.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 1.2); mod.connect(mg); const o = this.osc('sine', f, t, 1.6, g); mg.connect(o.frequency); mod.start(t); mod.stop(t + 1.7); this.env(g, t, 0.003, v * 1.3, 1.5); break; }
      case 'marimba': { this.osc('sine', f, t, 0.5, g); const g2 = ctx.createGain(); g2.connect(g); g2.gain.value = 0.3; this.osc('sine', f * 4, t, 0.1, g2); this.env(g, t, 0.002, v * 1.6, 0.35); break; }
      case 'rhodes': { this.osc('sine', f, t, dur + 0.6, g); const g2 = ctx.createGain(); g2.gain.value = 0.25; g2.connect(g); this.osc('sine', f * 2, t, dur, g2); this.env(g, t, 0.006, v * 1.4, dur + 0.5); break; }
      case 'organ': { for (const [h, a] of [[1, 1], [2, 0.5], [3, 0.3]]) { const gg = ctx.createGain(); gg.gain.value = a; gg.connect(g); this.osc('sine', f * h, t, dur, gg); } g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur); break; }
      case 'piano': { this.osc('triangle', f, t, 0.9, g); const g2 = ctx.createGain(); g2.gain.value = 0.35; g2.connect(g); this.osc('sine', f * 2, t, 0.5, g2); this.env(g, t, 0.003, v * 1.3, 0.8); break; }
      case 'gate': case 'stab': { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(type === 'stab' ? 3200 : 2400, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur); this.osc('sawtooth', f, t, dur, lp, -8); this.osc('sawtooth', f, t, dur, lp, 8); lp.connect(g); this.env(g, t, 0.003, v, dur); break; }
      case 'lead': { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; this.osc('sawtooth', f, t, dur, lp, 6); this.osc('square', f, t, dur, lp, -6); lp.connect(g); this.env(g, t, 0.01, v * 0.9, dur); break; }
      case 'saw': case 'pluck': default: { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(type === 'saw' ? 3800 : 2600, t); lp.frequency.exponentialRampToValueAtTime(300, t + Math.max(0.12, dur)); this.osc(type === 'saw' ? 'sawtooth' : 'square', f, t, dur, lp); lp.connect(g); this.env(g, t, 0.002, v, Math.max(0.12, dur)); }
    }
    out.connect(this.filt); if (send) { out.connect(this.dly); out.connect(this.rev); }
    this.dly.delayTime.value = this.spb() * 0.75;
  }
  /* ---------- 効果音（音楽とは別の音量） ---------- */
  sfx(name, when, extra) {
    const ctx = this.ensure(); if (!ctx) return; const t = when === undefined ? ctx.currentTime : Math.max(this.audioTime(when), ctx.currentTime);
    const g = ctx.createGain(); g.connect(this.sfxG);
    switch (name) {
      case 'tick': this.osc('sine', 1046, t, 0.12, g); this.env(g, t, 0.002, 0.35, 0.1); break;
      case 'go': this.osc('sine', 1568, t, 0.3, g); this.osc('triangle', 784, t, 0.3, g); this.env(g, t, 0.002, 0.4, 0.28); break;
      case 'hit': { const S = this.style, ci = Math.floor(this.beatNow() / 4) % 4, ch = S.prog[ci]; const n = ch[(extra | 0) % ch.length] + 24; this.osc('sine', mtof(n), t, 0.25, g); const g2 = this.ctx.createGain(); g2.gain.value = 0.3; g2.connect(g); this.osc('sine', mtof(n) * 2, t, 0.12, g2); this.env(g, t, 0.002, 0.16, 0.22); g.connect(this.rev); break; }
      case 'tap': this.osc('triangle', 660, t, 0.08, g); this.env(g, t, 0.002, 0.18, 0.07); break;
      case 'switch': this.osc('sine', 880, t, 0.1, g); this.osc('sine', 1320, t + 0.09, 0.12, g); this.env(g, t, 0.002, 0.25, 0.2); break;
      case 'done': { [72, 76, 79, 84, 88].forEach((n, i) => { const gg = ctx.createGain(); gg.connect(this.sfxG); gg.connect(this.rev); this.osc('sine', mtof(n), t + i * 0.09, 0.9, gg); this.env(gg, t + i * 0.09, 0.003, 0.22, 0.85); }); break; }
      case 'warp': { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.5; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(5000, t + 0.9); bp.connect(g); this.nz(t, 1, bp); this.env(g, t, 0.3, 0.3, 0.6); break; }
    }
  }
}
const sp4 = m => m.spb() / 4;
function silentWav() {
  // 0.5 秒の無音 WAV（iOS の無音スイッチ対策）
  const n = 11025, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 22050, true); v.setUint32(28, 44100, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,' + btoa(s);
}
