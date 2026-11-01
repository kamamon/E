/* =========================================================================
   IMMERSE FIT — run.js
   セッションの進行：（休憩）→ 紹介 → お手本5回 → 場面（5場面×2巡、各4回）→ ラスト5回 → しめ
   すべて音楽の拍で動きます。
   ========================================================================= */
import { rig, pAt, xAt, jointsAtRep, sideOf, dirOf } from './motions.js';
import { SCENE_BY_ID } from './scenes/index.js';
import { FINALE } from './scenes/finale.js';
import { REPS, PRACTICE, PER_ROUND, SCENE_REPS, FINALE as NFIN, sceneIds } from './types.js';
import { sfxFor } from './stage.js';
import { playSfx } from './sfx.js';
import { resolveHit, prepareHits } from './hits.js';
import { hashStr } from './kit.js';
import { coachFrames } from './figure.js';
import { finaleInst } from './real.js';

const NUM = ['いち', 'に', 'さん', 'し', 'ご'];
const FINALE_INST = { id: 'finale', tpl: FINALE, v: {}, name: 'ラスト5回！', short: 'ラスト', acts: [], modes: [], theme: 'party' };

export class Run {
  // env: { music, stage, voice, showLen(4|2), drawCoach(J, view, info), drawPip(J, view, f, flash, F), drawFly(J, view, k, F), hud(info), onTypeDone(t), onSync(ok), cam }
  constructor(plan, env) {
    this.plan = plan; this.env = env; this.blocks = []; let b = 0;
    const showLen = env.showLen === 2 ? 2 : 4, nShow = SCENE_REPS / showLen;
    plan.types.forEach((t, i) => {
      const rpb = t.m.rpb, ids = sceneIds(t, env.look), blk = { t, i, rpb, rest: null, showLen, nShow, ids };
      if (i > 0) { blk.rest = [b, b + 8]; b += 8; }
      blk.start = blk.rest ? blk.rest[0] : b;
      blk.intro = [b, b + 8]; b += 8;
      blk.R0 = b; b += REPS * rpb;
      const end = Math.ceil((b + 4) / 4) * 4; blk.outro = [b, end]; b = end;
      blk.H = j => blk.R0 + rpb * (j + 1);
      blk.one = t.mode === 'one';
      // 場面のクリップ（1回の表示 = 4回 = トントン×2）
      blk.clips = [];
      for (let k = 0; k < nShow; k++) {
        const idx = k % PER_ROUND, round = k >= nShow / 2 ? 2 : 1, inst = SCENE_BY_ID.get(ids[idx % ids.length]);
        if (!inst) continue;
        const R = rig(t.m, blk.one && round === 2 ? 'L' : 'R');
        for (let q = 0; q < showLen / 2; q++) {
          const j0 = PRACTICE + k * showLen + q * 2;
          blk.clips.push({
            inst, act: t.act, mode: t.mode, round, idx: k, show: idx, sub: q, same: q > 0, j0,
            sides: [sideOf(R, j0), sideOf(R, j0 + 1)], dirs: [dirOf(R, j0), dirOf(R, j0 + 1)],
            hits: [blk.H(j0), blk.H(j0 + 1)], b0: blk.H(j0) - 0.55 * rpb, b1: blk.H(j0 + 1) + 0.45 * rpb,
            seed: hashStr(t.id + ':' + k + ':' + q),
          });
        }
      }
      blk.r2 = blk.clips.find(c => c.round === 2);
      const jF = PRACTICE + SCENE_REPS, R = rig(t.m, blk.one ? 'L' : 'R');
      const fh = []; for (let j = jF; j < REPS; j++) fh.push(blk.H(j));
      const q = x => (x.v.clip && x.v.clip.quality) || (x.v.set && x.v.set.quality) || 3;
      const fr = ids.map(id => SCENE_BY_ID.get(id)).filter(x => x && x.real).sort((a, b) => q(b) - q(a))[0];
      blk.finale = { inst: fr ? finaleInst(fr) : FINALE_INST, act: t.act, mode: t.mode, round: 2, idx: 99, j0: jF, sides: fh.map((_, k) => sideOf(R, jF + k)), dirs: fh.map((_, k) => dirOf(R, jF + k)), hits: fh, b0: blk.H(jF) - 0.55 * rpb, b1: blk.outro[1], seed: 5, last: true };
      this.blocks.push(blk);
    });
    this.total = b; this.done = new Set(); this.said = new Set(); this.sched = new Set();
    this.reps = 0; this.sync = 0; this.syncN = 0; this.kcal = 0; this.typesDone = [];
  }
  // 打点の音：場面の音を設定（場面に合わせる・お気に入り・固定）に合わせて500種から選ぶ。同じ種目の同じ場面は同じ音
  sfxOf(blk, c, k) { return resolveHit(sfxFor(c.inst, k), blk.t.id + '|' + c.inst.id); }
  finSfx(blk, j) { return resolveHit(j === REPS - 1 ? 'firework' : (sfxFor(blk.finale.inst, 1) || 'taiko'), blk.t.id + '|fin' + (j === REPS - 1 ? 'L' : '')); }
  sfxIds(blk) { const out = []; for (const c of blk.clips) out.push(this.sfxOf(blk, c, 1), this.sfxOf(blk, c, 2)); out.push(this.finSfx(blk, REPS - 2), this.finSfx(blk, REPS - 1)); return out.filter(Boolean); }
  blockAt(beat) { let k = 0; for (let i = 0; i < this.blocks.length; i++) if (beat >= this.blocks[i].start) k = i; return this.blocks[k]; }
  rigFor(blk, beat) { return rig(blk.t.m, blk.one && ((blk.r2 && beat >= blk.r2.b0) || beat >= blk.finale.b0) ? 'L' : 'R'); }

  // 音楽の展開
  section(beat) {
    if (beat < 0) return { sec: 'intro', bar: 0, bars: 2 };
    if (beat >= this.total) return { sec: 'outro', bar: 0, bars: 1 };
    const blk = this.blockAt(beat);
    if (blk.rest && beat < blk.rest[1]) return { sec: 'rest', bar: Math.floor((beat - blk.rest[0]) / 4), bars: 2 };
    if (beat < blk.intro[1]) return beat < blk.intro[0] + 4 ? { sec: 'intro', bar: 0, bars: 4 } : { sec: 'intro', bar: 2, bars: 4 };
    const c0 = blk.clips[0], firstBar = c0 ? Math.floor(c0.hits[0] / 4) * 4 : blk.outro[0];
    if (beat < firstBar - 4) return { sec: 'intro', bar: 2, bars: 4 };
    if (beat < firstBar) return { sec: 'build', bar: 0, bars: 1, step16: Math.floor((beat - (firstBar - 4)) * 4) };
    if (beat < blk.outro[0]) { const r2 = blk.r2; return { sec: (r2 && beat >= Math.floor(r2.hits[0] / 4) * 4) || beat >= blk.finale.b0 ? 'peak' : 'work', bar: 0, bars: 8 }; }
    return { sec: 'cool', bar: 0, bars: 1 };
  }

  // 毎フレーム
  update(beat, dt) {
    const E = this.env, m = E.music, spb = m.spb(), blk = this.blockAt(beat), t = blk.t;
    if (beat >= this.total) return { end: true };
    // 実写の映像を先読み（いまの種目と次の種目）
    if (this.pre !== blk.i) {
      this.pre = blk.i; const bs = [blk, this.blocks[blk.i + 1]].filter(Boolean);
      E.preload && E.preload(bs.flatMap(b => b.ids));
      prepareHits(m, bs.flatMap(b => this.sfxIds(b)));   // 効果音も先に作っておく
    }
    const R = this.rigFor(blk, beat), rf = (beat - blk.H(0)) / blk.rpb;
    const F = coachFrames(R, rf), J = F.J, view = t.m.view, f = rf - Math.floor(rf);
    const info = { blk, t, beat, phase: 'intro', rep: 0, total: REPS, rf, F };
    let rep = 0; for (let j = 0; j < REPS; j++) if (beat >= blk.H(j)) rep = j + 1; info.rep = rep;
    // 効果音を先に予約（拍ぴったりに鳴らす）
    const ahead = beat + 0.2 / spb;
    for (let j = 0; j < REPS; j++) {
      const hb = blk.H(j); if (hb < beat - 0.05 || hb > ahead) continue;
      const key = blk.i + ':' + j; if (this.sched.has(key)) continue; this.sched.add(key);
      const when = m.timeOfBeat(hb);
      if (j < PRACTICE) m.sfx('hit', when, j);
      else if (j >= PRACTICE + SCENE_REPS) playSfx(m, this.finSfx(blk, j), when, { n: j });
      else { const c = blk.clips.find(c => c.j0 === j || c.j0 + 1 === j); if (c) playSfx(m, this.sfxOf(blk, c, j - c.j0 + 1), when, { n: j }); }
    }
    // 回数・カロリー・カメラ判定
    for (let j = 0; j < REPS; j++) if (beat >= blk.H(j) + 0.15 && !this.done.has(blk.i + ':' + j)) {
      this.done.add(blk.i + ':' + j); this.reps++; this.kcal += t.met * 3.5 * (E.weight || 55) / 200 / 60 * blk.rpb * spb;
      if (E.cam && E.cam.on && j >= PRACTICE) { const tt = performance.now() / 1000, pk = E.cam.peak(tt - 0.5, tt); this.syncN++; if (pk > 0.12) this.sync++; E.onSync && E.onSync(pk > 0.12); }
    }
    // 声
    const say = (k, text, o) => { if (this.said.has(blk.i + k)) return; this.said.add(blk.i + k); E.voice.say(text, o); };
    const c0 = blk.clips[0];
    if (blk.rest && beat < blk.rest[1]) {
      info.phase = 'rest'; say('rest', `次は、${t.name}`, { interrupt: true });
      E.drawCoach(J, view, info);
    } else if (beat < blk.intro[1]) {
      info.phase = 'intro'; say('intro', `${t.name}。まずは、お手本といっしょに5回。`, { interrupt: true });
      E.drawCoach(J, view, info);
    } else if (beat < blk.outro[0]) {
      for (let j = 0; j < PRACTICE; j++) if (beat >= blk.H(j) - 0.35) say('n' + j, NUM[j], { interrupt: true, prio: 2 });
      if (c0 && beat >= blk.H(PRACTICE - 1) + 0.25) say('go', '場面スタート！', { interrupt: true, prio: 2 });
      if (blk.r2 && beat >= blk.r2.b0 - 1.6 * blk.rpb) say('r2', blk.one ? (/kick/.test(t.m.key) ? '反対の足で！' : '反対の手で！') : '2巡目！', { interrupt: true, prio: 2 });
      if (beat >= blk.finale.b0 - 1.2 * blk.rpb) say('fin', 'ラスト5回！', { interrupt: true, prio: 2 });
      const ci = blk.clips.findIndex(c => beat >= c.b0 && beat < c.b1);
      if (rep < PRACTICE || (ci < 0 && beat < blk.finale.b0)) {
        info.phase = 'practice'; E.drawCoach(J, view, info);
      } else {
        const clip = ci >= 0 ? blk.clips[ci] : blk.finale;
        // 実写の映像がまだ届いていなければ、その場面はイラストで（映像は次の種目までに届く）
        if (clip.inst.real && clip.fb === undefined) {
          const key = clip === blk.finale ? 'F' : clip.idx;
          if (blk.fb === undefined) blk.fb = {};
          if (blk.fb[key] === undefined) blk.fb[key] = !!(E.realReady && !E.realReady(clip.inst));
          clip.fb = blk.fb[key];
          if (clip.fb) clip.inst = clip === blk.finale ? FINALE_INST : (SCENE_BY_ID.get(t.scenes[(clip.show || 0) % t.scenes.length]) || clip.inst);
        }
        info.phase = clip === blk.finale ? 'finale' : 'scene'; info.clip = clip; info.round = clip.round;
        info.s = E.stage.frame(clip, { beat, spb, dt, p: pAt(R, rf), x: xAt(R, rf) });
        // 場面が始まった直後：大きなお手本が右下へ小さくなっていく
        if (c0 && beat < c0.b0 + 1.2) E.drawFly && E.drawFly(J, view, Math.max(0, (beat - c0.b0) / 1.2), F);
        E.drawPip(J, view, f, beat - blk.H(Math.max(0, rep - 1)) < 0.25 && rep > 0, F);
      }
    } else {
      info.phase = 'outro'; info.rep = REPS; say('out', ['50回！ナイス！', 'おつかれさま！いい動き！', '50回できました！'][blk.i % 3], { interrupt: true });
      if (!this.typesDone.includes(t)) { this.typesDone.push(t); E.onTypeDone && E.onTypeDone(t); }
      E.stage.frame(blk.finale, { beat, spb, dt, p: 1 }); E.drawPip(J, view, 0.5, false, F);
    }
    E.hud(info);
    return info;
  }
}
