/* IMMERSE FIT — cam.js
   カメラで「どれだけ動いているか」を測ります（映像は端末の中だけで処理し、保存も送信もしません）。 */
export class MotionCam {
  constructor() { this.level = 0; this.hist = []; this.on = false; this.cv = null; }
  async start(video) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('この端末ではカメラが使えません');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false });
    this.video = video; video.srcObject = this.stream; video.muted = true; video.setAttribute('playsinline', '');
    await video.play();
    this.cv = document.createElement('canvas'); this.cv.width = 48; this.cv.height = 36;
    this.cx = this.cv.getContext('2d', { willReadFrequently: true }); this.prev = null; this.on = true;
    this.timer = setInterval(() => this.sample(), 50);
  }
  sample() {
    if (!this.on || this.video.readyState < 2) return;
    const { cx, cv } = this; cx.drawImage(this.video, 0, 0, cv.width, cv.height);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, g = new Float32Array(n);
    for (let i = 0; i < n; i++) g[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
    if (this.prev) {
      let s = 0; for (let i = 0; i < n; i++) { const x = Math.abs(g[i] - this.prev[i]); if (x > 14) s += x; }
      const e = Math.min(1, s / n / 22);
      this.level += (e - this.level) * 0.5;
      const t = performance.now() / 1000; this.hist.push([t, e]);
      while (this.hist.length && this.hist[0][0] < t - 4) this.hist.shift();
    }
    this.prev = g;
  }
  // [t0, t1]（performance 秒）の最大の動き
  peak(t0, t1) { let m = 0; for (const [t, e] of this.hist) if (t >= t0 && t <= t1) m = Math.max(m, e); return m; }
  stop() { this.on = false; clearInterval(this.timer); if (this.stream) this.stream.getTracks().forEach(t => t.stop()); this.stream = null; if (this.video) this.video.srcObject = null; }
}
