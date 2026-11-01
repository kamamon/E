/* IMMERSE FIT — voice.js : 日本語の音声ガイド（端末の読み上げ機能を使用） */
const PREFER = ['Kyoko', 'O-Ren', 'Otoya', 'Hattori', 'Google 日本語', 'Nanami', 'Haruka', 'Ayumi', 'Ichiro', 'Sayaka'];

export class Voice {
  constructor(music) {
    this.music = music; this.on = true; this.rate = 1.05; this.voice = null; this.busyUntil = 0;
    this.ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (this.ok) { this.pick(); window.speechSynthesis.onvoiceschanged = () => this.pick(); }
  }
  pick() {
    const vs = window.speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
    this.voice = PREFER.map(n => vs.find(v => v.name.includes(n))).find(Boolean) || vs[0] || null;
  }
  // 最初のタップの中で呼ぶ（iPhone で読み上げを有効にするため）
  unlock() {
    if (!this.ok || this.unlocked) return; this.unlocked = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'ja-JP'; window.speechSynthesis.speak(u); } catch (e) { /* ignore */ }
  }
  say(text, o = {}) {
    if (!this.ok || !this.on || !text) return;
    const ss = window.speechSynthesis, now = performance.now();
    if (o.interrupt) ss.cancel();
    else if (ss.speaking && now < this.busyUntil && !o.queue) { if ((o.prio || 1) < 2) return; ss.cancel(); }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; if (this.voice) u.voice = this.voice;
    u.rate = this.rate; u.pitch = 1.05; u.volume = 1;
    u.onstart = () => this.music && this.music.duck(true);
    u.onend = u.onerror = () => this.music && this.music.duck(false);
    this.busyUntil = now + 380 * text.length / (this.rate * 4) + 600;
    ss.speak(u);
  }
  stop() { if (this.ok) window.speechSynthesis.cancel(); if (this.music) this.music.duck(false); }
}

// ほめ言葉など（同じ言葉が続かないように順番に使う）
const LINES = {
  praise: ['ナイス！', 'いい動き！', 'その調子！', 'お見事！', 'きれいなフォーム！', 'リズムばっちり！', 'すてきです！'],
  push: ['半分きました', 'リズムに乗って', '呼吸を止めずに', '気持ちいいですね', 'あと少し', '肩の力を抜いて', '動きを大きく'],
  last: ['ラスト！', 'ラストスパート！', 'あと少し！'],
};
const idx = {};
export function line(kind) { const a = LINES[kind]; idx[kind] = ((idx[kind] ?? Math.floor(Math.random() * a.length)) + 1) % a.length; return a[idx[kind]]; }
