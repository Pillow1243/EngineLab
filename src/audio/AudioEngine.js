/**
 * AudioEngine — a fully synthesized, layered Web Audio sound stack.
 * No audio files: every layer is built from oscillators + filtered noise,
 * and every parameter is driven per-frame by the physics simulation.
 *
 *   Layer 1  Engine core   — firing-order harmonics (inline-5 → f0·2.5k)
 *   Layer 1b Crackle       — band-passed noise, opens up with rpm/throttle
 *   Layer 2  Exhaust note  — high band-pass noise, fades in above ~2000 rpm
 *   Layer 3  Turbo         — spooling whistle (sine + vibrato) + intake whoosh
 *   Layer 4  BOV           — one-shot "pshhh" (filtered noise sweep + whistle)
 *   FX         Starter whine, ignition bark, DCT clunk, rev-limiter chops
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.nodes = null;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Create / resume the AudioContext. Call from a user gesture. */
  async ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this._build();
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  /** Pink-ish looping noise buffer, created once and shared. */
  _noiseBuffer() {
    const c = this.ctx;
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = (w * 0.6 + last * 3) * 0.5;
    }
    return buf;
  }

  _loopNoise() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    src.start();
    return src;
  }

  _pan(pan) {
    const c = this.ctx;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      return p;
    }
    return null;
  }

  _build() {
    const c = this.ctx;
    const N = (this.nodes = {});

    /* master chain */
    N.master = c.createGain();
    N.master.gain.value = 0.9;
    N.comp = c.createDynamicsCompressor();
    N.comp.threshold.value = -22;
    N.comp.knee.value = 18;
    N.comp.ratio.value = 5;
    N.comp.attack.value = 0.003;
    N.comp.release.value = 0.14;
    N.master.connect(N.comp);
    N.comp.connect(c.destination);

    /* engine bus (the master volume knob for everything engine-related) */
    N.eng = c.createGain();
    N.eng.gain.value = 0;
    N.eng.connect(N.master);

    /* ---- Layer 1: engine core harmonics ---- */
    N.lp = c.createBiquadFilter();
    N.lp.type = 'lowpass';
    N.lp.frequency.value = 400;
    N.lp.Q.value = 0.8;
    N.lp.connect(N.eng);

    // Inline-5 firing fundamental = (5/2) · (rpm/60) Hz → mult 2.5 of (rpm/60)
    N.harmonics = [
      { mult: 2.5, type: 'sawtooth', gain: 0.4 },
      { mult: 5.0, type: 'sawtooth', gain: 0.22 },
      { mult: 7.5, type: 'sawtooth', gain: 0.1 },
      { mult: 10.0, type: 'square', gain: 0.07 },
      { mult: 12.5, type: 'sawtooth', gain: 0.05 },
      { mult: 1.25, type: 'sine', gain: 0.3 }, // sub rumble
    ].map((h) => {
      const o = c.createOscillator();
      o.type = h.type;
      o.frequency.value = 30;
      const g = c.createGain();
      g.gain.value = 0;
      o.connect(g);
      g.connect(N.lp);
      o.start();
      return { ...h, o, g };
    });

    /* ---- Layer 1b: low crackle / texture ---- */
    N.crackleBP = c.createBiquadFilter();
    N.crackleBP.type = 'bandpass';
    N.crackleBP.frequency.value = 700;
    N.crackleBP.Q.value = 0.9;
    N.crackleG = c.createGain();
    N.crackleG.gain.value = 0;
    this._loopNoise().connect(N.crackleBP);
    N.crackleBP.connect(N.crackleG);
    N.crackleG.connect(N.eng);

    /* ---- Layer 2: high exhaust note ---- */
    N.exBP = c.createBiquadFilter();
    N.exBP.type = 'bandpass';
    N.exBP.frequency.value = 1600;
    N.exBP.Q.value = 0.6;
    N.exG = c.createGain();
    N.exG.gain.value = 0;
    this._loopNoise().connect(N.exBP);
    N.exBP.connect(N.exG);
    N.exPan = this._pan(0.4);
    if (N.exPan) {
      N.exG.connect(N.exPan);
      N.exPan.connect(N.eng);
    } else {
      N.exG.connect(N.eng);
    }

    /* ---- Layer 3: turbo spool whistle + intake whoosh ---- */
    N.twO = c.createOscillator();
    N.twO.type = 'sine';
    N.twO.frequency.value = 500;
    N.vib = c.createOscillator();
    N.vib.type = 'sine';
    N.vib.frequency.value = 13;
    N.vibG = c.createGain();
    N.vibG.gain.value = 0;
    N.vib.connect(N.vibG);
    N.vibG.connect(N.twO.frequency);
    N.twG = c.createGain();
    N.twG.gain.value = 0;
    N.twO.connect(N.twG);
    N.twPan = this._pan(-0.35);
    if (N.twPan) {
      N.twG.connect(N.twPan);
      N.twPan.connect(N.eng);
    } else {
      N.twG.connect(N.eng);
    }
    N.twO.start();
    N.vib.start();

    N.whHP = c.createBiquadFilter();
    N.whHP.type = 'highpass';
    N.whHP.frequency.value = 4500;
    N.whG = c.createGain();
    N.whG.gain.value = 0;
    this._loopNoise().connect(N.whHP);
    N.whHP.connect(N.whG);
    N.whG.connect(N.eng);
  }

  /** Called every animation frame with the live sim state. */
  update(s) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const N = this.nodes;
    const { rpm, throttle: th, boost, spool } = s;
    const on = rpm > 25;
    const f0 = on ? rpm / 60 : 0;

    // engine bus — overall loudness
    const engTarget = on ? 0.42 + 0.5 * th + 0.25 * clamp(rpm / 8000, 0, 1) + 0.18 * boost : 0;
    N.eng.gain.setTargetAtTime(engTarget * 0.55, t, 0.07);

    // Layer 1 — pitch everything by rpm (the "playbackRate" of the rumble)
    for (const h of N.harmonics) {
      h.o.frequency.setTargetAtTime(Math.max(6, f0 * h.mult), t, 0.09);
      let hg = on ? h.gain : 0;
      if (h.mult >= 7.5) hg *= clamp((rpm - 1500) / 3000, 0, 1); // upper harmonics open up with speed
      h.g.gain.setTargetAtTime(hg * (0.6 + 0.6 * th), t, 0.1);
    }
    N.lp.frequency.setTargetAtTime(280 + rpm * 0.6 + boost * 1400, t, 0.12);

    // Layer 1b — crackle
    N.crackleBP.frequency.setTargetAtTime(420 + rpm * 0.7, t, 0.1);
    N.crackleG.gain.setTargetAtTime(
      on ? 0.05 + 0.16 * Math.pow(rpm / 9000, 2) * (0.4 + 0.6 * th) : 0,
      t,
      0.08,
    );

    // Layer 2 — exhaust note
    N.exBP.frequency.setTargetAtTime(800 + rpm * 1.0 + boost * 1500, t, 0.1);
    N.exG.gain.setTargetAtTime(on ? clamp((rpm - 2000) / 6500, 0, 1) * (0.16 + 0.5 * th + 0.2 * boost) : 0, t, 0.09);

    // Layer 3 — turbo whistle & whoosh
    N.twO.frequency.setTargetAtTime(300 + rpm * 0.1 + spool * 1500, t, 0.15);
    N.vibG.gain.setTargetAtTime(spool * 38, t, 0.2);
    N.twG.gain.setTargetAtTime(boost * 0.34, t, 0.12);
    N.whG.gain.setTargetAtTime(boost * 0.1, t, 0.1);
  }

  /* ---------------- one-shot effects ---------------- */

  playBOV(strength = 1) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const N = this.nodes;
    const out = N.master;

    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer();
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(3600, t);
    f.frequency.exponentialRampToValueAtTime(220, t + 0.55);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85 * strength, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + 0.65);

    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2400, t);
    o.frequency.exponentialRampToValueAtTime(650, t + 0.42);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.1 * strength, t + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(og);
    og.connect(out);
    o.start(t);
    o.stop(t + 0.45);
  }

  _bark(t, amt) {
    const c = this.ctx;
    const N = this.nodes;
    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer();
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7 * amt, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f);
    f.connect(g);
    g.connect(N.master);
    src.start(t);
    src.stop(t + 0.45);

    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.5 * amt, t + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(og);
    og.connect(N.master);
    o.start(t);
    o.stop(t + 0.4);
  }

  playStart() {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const N = this.nodes;

    // starter motor whine
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(48, t);
    o.frequency.linearRampToValueAtTime(95, t + 0.85);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
    g.gain.setValueAtTime(0.5, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    o.connect(f);
    f.connect(g);
    g.connect(N.master);
    o.start(t);
    o.stop(t + 1.0);

    this._bark(t + 0.95, 1.0); // ignition
  }

  playIgnition() {
    if (!this.ready) return;
    this._bark(this.ctx.currentTime, 0.8);
  }

  playShift() {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(85, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.09);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(g);
    g.connect(this.nodes.master);
    o.start(t);
    o.stop(t + 0.12);
  }

  playLimiter() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._bark(t, 0.35);
    this._bark(t + 0.11, 0.3);
    this._bark(t + 0.22, 0.35);
  }

  handleEvent(e) {
    switch (e.type) {
      case 'bov':
        return this.playBOV(e.strength);
      case 'ignition':
        return this.playIgnition();
      case 'shift':
        return this.playShift();
      case 'limiter':
        return this.playLimiter();
      default:
        return undefined;
    }
  }
}

export const audioEngine = new AudioEngine();
