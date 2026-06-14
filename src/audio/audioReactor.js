/*
 * Centralized audio reactor — one rAF loop shared by every visualizer and
 * ambient effect. It exposes live volume / bass / mids / highs / frequencyData
 * and mirrors them into CSS custom properties (--a-volume, --a-bass, …) so the
 * room border, card glow, and background can react with pure CSS (no per-frame
 * React work).
 *
 * Real frequency analysis (AudioContext + AnalyserNode + MediaElementSource)
 * is used automatically IF a same-origin / CORS <audio> or <video> element is
 * connected via connectMedia(). Our music plays through a cross-origin YouTube
 * iframe, whose audio the browser will NOT expose to the Web Audio graph, so in
 * that case we fall back to a smooth, beat-driven SIMULATION (layered
 * oscillators + a beat envelope — deliberately not random flicker).
 */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

class AudioReactor {
  constructor() {
    this.status = 'stopped'; // stopped | loading | playing | paused
    this.volume = 0;
    this.bass = 0;
    this.mids = 0;
    this.highs = 0;
    this.frequencyData = new Uint8Array(64);

    this._consumers = new Set();
    this._raf = 0;
    this._t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._real = null;
    this._tick = this._tick.bind(this);
  }

  get isPlaying() {
    return this.status === 'playing';
  }

  setStatus(status) {
    if (status === this.status) return;
    this.status = status;
    this._ensureRunning();
  }

  subscribe(fn) {
    this._consumers.add(fn);
    this._ensureRunning();
    return () => this._consumers.delete(fn);
  }

  /* Real analysis for a same-origin/CORS media element (mp3, <audio>, …).
     Returns true if a real graph was established. YouTube iframes can't be
     connected, so this simply returns false there and simulation continues. */
  connectMedia(el) {
    if (this._real || !el) return false;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      this._real = { ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
      return true;
    } catch {
      this._real = null;
      return false;
    }
  }

  _ensureRunning() {
    if (!this._raf) this._raf = requestAnimationFrame(this._tick);
  }

  _tick(now) {
    const t = (now - this._t0) / 1000;
    if (this._real) this._sampleReal();
    else this._simulate(t);

    // Mirror into CSS vars for pure-CSS ambient effects.
    const root = document.documentElement.style;
    root.setProperty('--a-volume', this.volume.toFixed(3));
    root.setProperty('--a-bass', this.bass.toFixed(3));
    root.setProperty('--a-mids', this.mids.toFixed(3));
    root.setProperty('--a-highs', this.highs.toFixed(3));

    for (const fn of this._consumers) fn(this);

    // Keep the loop alive while active or while values are still decaying to
    // idle; otherwise stop it so a stopped/paused player costs nothing.
    const active = this.status === 'playing' || this.status === 'loading';
    const energy = this.volume + this.bass + this.mids + this.highs;
    this._raf = active || energy > 0.004 ? requestAnimationFrame(this._tick) : 0;
  }

  _sampleReal() {
    const { analyser, data } = this._real;
    analyser.getByteFrequencyData(data);
    const n = data.length;
    const band = (lo, hi) => {
      let s = 0;
      for (let i = lo; i < hi; i++) s += data[i];
      return s / (hi - lo) / 255;
    };
    this.bass = band(0, Math.floor(n * 0.15));
    this.mids = band(Math.floor(n * 0.15), Math.floor(n * 0.5));
    this.highs = band(Math.floor(n * 0.5), n);
    this.volume = (this.bass + this.mids + this.highs) / 3;
    for (let i = 0; i < 64; i++) this.frequencyData[i] = data[Math.floor((i / 64) * n)];
  }

  _simulate(t) {
    let tb, tm, th, tv;
    if (this.status === 'playing') {
      const beatPhase = (t * 2) % 1; // ~120 bpm
      const beat = Math.pow(1 - beatPhase, 3); // sharp attack, smooth decay
      const lfo = 0.5 + 0.5 * Math.sin(t * 0.5); // slow musical dynamics
      tb = 0.30 + 0.55 * beat + 0.10 * Math.sin(t * 1.3);
      tm = 0.28 + 0.24 * Math.abs(Math.sin(t * 2.1 + 1)) + 0.15 * lfo;
      th = 0.22 + 0.30 * Math.abs(Math.sin(t * 3.7 + 2)) * (0.6 + 0.4 * beat);
      tv = 0.30 + 0.40 * lfo + 0.30 * beat;
    } else if (this.status === 'loading') {
      const pulse = 0.12 + 0.10 * (0.5 + 0.5 * Math.sin(t * 3)); // gentle breathing
      tb = tm = th = tv = pulse;
    } else {
      tb = tm = th = tv = 0; // paused / stopped → settle to idle
    }

    const s = this.status === 'playing' ? 0.28 : 0.12;
    this.bass = lerp(this.bass, clamp01(tb), s);
    this.mids = lerp(this.mids, clamp01(tm), s);
    this.highs = lerp(this.highs, clamp01(th), s);
    this.volume = lerp(this.volume, clamp01(tv), s);

    const fd = this.frequencyData;
    for (let i = 0; i < 64; i++) {
      const f = i / 63;
      const bassW = Math.max(0, 1 - f * 3);
      const midW = Math.max(0, 1 - Math.abs(f - 0.4) * 3);
      const highW = Math.max(0, (f - 0.5) * 2);
      let v = this.bass * bassW + this.mids * midW + this.highs * highW;
      v *= 0.7 + 0.3 * Math.abs(Math.sin(t * (2 + i * 0.3) + i)); // smooth shimmer
      fd[i] = Math.min(255, v * 255);
    }
  }
}

export const audioReactor = new AudioReactor();
