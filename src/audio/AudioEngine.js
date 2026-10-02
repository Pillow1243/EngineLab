/**
 * AudioEngine — Ultra-detailed procedural Web Audio synthesizer for the Inline-5 Turbo.
 * Zero external audio files: every sound is synthesized in real time.
 *
 *   Layer 1   Inline-5 Core  — 8 harmonics (1.25× warble, 2.5× firing fundamental,
 *                              3.75× off-beat, 5×, 6.25×, 7.5×, 10×, 12.5×)
 *                              + firing-cadence pulse AM/FM modulation
 *                              + asymmetric WaveShaper saturation
 *   Layer 1b  Combustion Tex — band-passed combustion roughness + valvetrain tick
 *   Layer 2   Exhaust Throat — dual-formant resonator + high-RPM metallic rasp
 *   Layer 3   Turbocharger   — blade-pass whistle + vibrato + high-pressure induction rush
 *   Layer 4   Transmission   — DCT gear whine (speed-coupled, distinct Reverse whine)
 *   FX        Starter cranking, cold-start ignition bark, BOV "pshhh" + Stututu flutter,
 *             overrun pops & bangs, 2-step launch pops, rev-match downshift blip, shutdown
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.nodes = null;
    this.muted = false;
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

  setMuted(m) {
    this.muted = !!m;
    if (this.ready && this.nodes?.master) {
      this.nodes.master.gain.setTargetAtTime(this.muted ? 0 : 0.92, this.ctx.currentTime, 0.04);
    }
  }

  /** Warm asymmetric tube/exhaust saturation curve. */
  _makeSaturationCurve(amount = 2.4) {
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // Asymmetric soft-clipping brings out even & odd harmonics like a real exhaust header
      curve[i] = Math.tanh(x * amount + 0.12 * x * x) / Math.tanh(amount);
    }
    return curve;
  }

  /** Pink-ish looping noise buffer, created once and shared. */
  _noiseBuffer() {
    if (this._sharedNoise) return this._sharedNoise;
    const c = this.ctx;
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.95 * b2 + w * 0.048;
      d[i] = clamp((b0 + b1 + b2 + w * 0.18) * 0.55, -1, 1);
    }
    this._sharedNoise = buf;
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

    /* ---------------- Master bus & compressor ---------------- */
    N.master = c.createGain();
    N.master.gain.value = this.muted ? 0 : 0.92;

    N.subBoost = c.createBiquadFilter();
    N.subBoost.type = 'lowshelf';
    N.subBoost.frequency.value = 115;
    N.subBoost.gain.value = 4.5;

    N.comp = c.createDynamicsCompressor();
    N.comp.threshold.value = -20;
    N.comp.knee.value = 15;
    N.comp.ratio.value = 5.5;
    N.comp.attack.value = 0.003;
    N.comp.release.value = 0.12;

    N.master.connect(N.subBoost);
    N.subBoost.connect(N.comp);
    N.comp.connect(c.destination);

    /* ---------------- Engine master bus ---------------- */
    N.eng = c.createGain();
    N.eng.gain.value = 0;
    N.eng.connect(N.master);

    /* ---------------- Layer 1: Inline-5 harmonic core ---------------- */
    N.shaper = c.createWaveShaper();
    N.shaper.curve = this._makeSaturationCurve(2.6);
    N.shaper.oversample = '2x';

    // Exhaust chest formant (deep resonance around 130-240 Hz)
    N.chestPeak = c.createBiquadFilter();
    N.chestPeak.type = 'peaking';
    N.chestPeak.frequency.value = 145;
    N.chestPeak.Q.value = 1.4;
    N.chestPeak.gain.value = 5.5;

    // Throat formant filter
    N.throatPeak = c.createBiquadFilter();
    N.throatPeak.type = 'peaking';
    N.throatPeak.frequency.value = 420;
    N.throatPeak.Q.value = 1.8;
    N.throatPeak.gain.value = 4.0;

    // Main dynamic lowpass
    N.lp = c.createBiquadFilter();
    N.lp.type = 'lowpass';
    N.lp.frequency.value = 420;
    N.lp.Q.value = 1.1;

    N.shaper.connect(N.chestPeak);
    N.chestPeak.connect(N.throatPeak);
    N.throatPeak.connect(N.lp);
    N.lp.connect(N.eng);

    // Firing-cadence pulse modulator (gives the distinct chug at idle & warble under load)
    N.pulseOsc = c.createOscillator();
    N.pulseOsc.type = 'sine';
    N.pulseOsc.frequency.value = 18;
    N.pulseFilterMod = c.createGain();
    N.pulseFilterMod.gain.value = 60;
    N.pulseOsc.connect(N.pulseFilterMod);
    N.pulseFilterMod.connect(N.lp.frequency);
    N.pulseOsc.start();

    // Inline-5 firing fundamental = 2.5 × (rpm/60) Hz.
    // The 1.25× and 3.75× half-orders create the signature Audi 5-cylinder warble!
    N.harmonics = [
      { mult: 1.25, type: 'triangle', gain: 0.34 }, // half-order warble sub
      { mult: 2.5, type: 'sawtooth', gain: 0.44 }, // primary 5-cyl firing fundamental
      { mult: 3.75, type: 'sawtooth', gain: 0.19 }, // 5-cyl off-beat fifth
      { mult: 5.0, type: 'sawtooth', gain: 0.25 }, // 2nd firing harmonic
      { mult: 6.25, type: 'triangle', gain: 0.11 }, // warble overtone
      { mult: 7.5, type: 'sawtooth', gain: 0.13 }, // 3rd firing harmonic
      { mult: 10.0, type: 'square', gain: 0.08 }, // 4th harmonic bite
      { mult: 12.5, type: 'sawtooth', gain: 0.06 }, // high metallic edge
    ].map((h) => {
      const o = c.createOscillator();
      o.type = h.type;
      o.frequency.value = 28;
      const g = c.createGain();
      g.gain.value = 0;
      o.connect(g);
      g.connect(N.shaper);
      o.start();
      return { ...h, o, g };
    });

    /* ---------------- Layer 1b: Combustion texture & valvetrain ---------------- */
    N.crackleBP = c.createBiquadFilter();
    N.crackleBP.type = 'bandpass';
    N.crackleBP.frequency.value = 680;
    N.crackleBP.Q.value = 1.1;
    N.crackleG = c.createGain();
    N.crackleG.gain.value = 0;
    this._loopNoise().connect(N.crackleBP);
    N.crackleBP.connect(N.crackleG);
    N.crackleG.connect(N.shaper);

    // Mechanical valvetrain / timing tick (high-Q bandpass noise)
    N.valveBP = c.createBiquadFilter();
    N.valveBP.type = 'bandpass';
    N.valveBP.frequency.value = 2800;
    N.valveBP.Q.value = 3.2;
    N.valveG = c.createGain();
    N.valveG.gain.value = 0;
    this._loopNoise().connect(N.valveBP);
    N.valveBP.connect(N.valveG);
    N.valveG.connect(N.eng);

    /* ---------------- Layer 2: High-RPM exhaust roar & rasp ---------------- */
    N.exBP = c.createBiquadFilter();
    N.exBP.type = 'bandpass';
    N.exBP.frequency.value = 1500;
    N.exBP.Q.value = 0.75;
    N.exG = c.createGain();
    N.exG.gain.value = 0;
    this._loopNoise().connect(N.exBP);
    N.exBP.connect(N.exG);
    N.exPan = this._pan(0.35);
    if (N.exPan) {
      N.exG.connect(N.exPan);
      N.exPan.connect(N.eng);
    } else {
      N.exG.connect(N.eng);
    }

    /* ---------------- Layer 3: Dual-stage Turbocharger ---------------- */
    N.twO = c.createOscillator();
    N.twO.type = 'sine';
    N.twO.frequency.value = 550;

    N.twO2 = c.createOscillator();
    N.twO2.type = 'triangle';
    N.twO2.frequency.value = 1100;
    N.twO2G = c.createGain();
    N.twO2G.gain.value = 0.22;

    N.vib = c.createOscillator();
    N.vib.type = 'sine';
    N.vib.frequency.value = 14;
    N.vibG = c.createGain();
    N.vibG.gain.value = 0;
    N.vib.connect(N.vibG);
    N.vibG.connect(N.twO.frequency);

    N.twG = c.createGain();
    N.twG.gain.value = 0;
    N.twO.connect(N.twG);
    N.twO2.connect(N.twO2G);
    N.twO2G.connect(N.twG);

    N.twPan = this._pan(-0.32);
    if (N.twPan) {
      N.twG.connect(N.twPan);
      N.twPan.connect(N.eng);
    } else {
      N.twG.connect(N.eng);
    }
    N.twO.start();
    N.twO2.start();
    N.vib.start();

    // High-pressure compressor air rush
    N.whHP = c.createBiquadFilter();
    N.whHP.type = 'bandpass';
    N.whHP.frequency.value = 3800;
    N.whHP.Q.value = 0.9;
    N.whG = c.createGain();
    N.whG.gain.value = 0;
    this._loopNoise().connect(N.whHP);
    N.whHP.connect(N.whG);
    N.whG.connect(N.eng);

    /* ---------------- Layer 4: DCT Gearbox Whine ---------------- */
    N.gearOsc = c.createOscillator();
    N.gearOsc.type = 'triangle';
    N.gearOsc.frequency.value = 180;
    N.gearBP = c.createBiquadFilter();
    N.gearBP.type = 'bandpass';
    N.gearBP.frequency.value = 600;
    N.gearBP.Q.value = 2.5;
    N.gearG = c.createGain();
    N.gearG.gain.value = 0;
    N.gearOsc.connect(N.gearBP);
    N.gearBP.connect(N.gearG);
    N.gearG.connect(N.eng);
    N.gearOsc.start();
  }

  /** Called every animation frame with the live sim state. */
  update(s) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const N = this.nodes;
    const { rpm, throttle: th, boost, spool, speed = 0, gearMode = 'D', ecuMode = 'SPORT' } = s;
    const on = rpm > 25;
    const f0 = on ? rpm / 60 : 0;
    const ecuMult = ecuMode === 'TRACK' ? 1.22 : ecuMode === 'COMFORT' ? 0.82 : 1.0;

    // Master engine bus level
    const engTarget = on
      ? (0.44 + 0.52 * th + 0.28 * clamp(rpm / 8000, 0, 1) + 0.2 * boost) * ecuMult
      : 0;
    N.eng.gain.setTargetAtTime(clamp(engTarget * 0.56, 0, 1.15), t, 0.055);

    // Firing-cadence filter modulation (pronounced at idle, smooths out at high RPM)
    N.pulseOsc.frequency.setTargetAtTime(Math.max(4, f0 * 2.5), t, 0.06);
    const idlePulse = on ? (1 - clamp((rpm - 900) / 2600, 0, 0.75)) * (85 + 110 * th) : 0;
    N.pulseFilterMod.gain.setTargetAtTime(idlePulse, t, 0.08);

    // Layer 1 — pitch harmonics by rpm
    for (const h of N.harmonics) {
      h.o.frequency.setTargetAtTime(Math.max(6, f0 * h.mult), t, 0.065);
      let hg = on ? h.gain : 0;
      if (h.mult >= 7.5) {
        hg *= clamp((rpm - 1350) / 2800, 0, 1);
      }
      if (h.mult === 1.25 || h.mult === 3.75 || h.mult === 6.25) {
        // 5-cylinder signature off-beat warble harmonics swell with load
        hg *= 0.78 + 0.55 * th + 0.25 * clamp(boost, 0, 1);
      }
      h.g.gain.setTargetAtTime(hg * (0.58 + 0.65 * th), t, 0.08);
    }

    // Dynamic formant & lowpass tracking
    N.chestPeak.frequency.setTargetAtTime(115 + rpm * 0.018, t, 0.1);
    N.throatPeak.frequency.setTargetAtTime(320 + rpm * 0.065 + th * 160, t, 0.1);
    const lpFreq = (290 + rpm * 0.68 + boost * 1550 + th * 650) * ecuMult;
    N.lp.frequency.setTargetAtTime(clamp(lpFreq, 220, 9500), t, 0.09);

    // Layer 1b — combustion crackle + mechanical valvetrain
    N.crackleBP.frequency.setTargetAtTime(420 + rpm * 0.74, t, 0.09);
    N.crackleG.gain.setTargetAtTime(
      on ? 0.06 + 0.19 * Math.pow(rpm / 8500, 1.8) * (0.38 + 0.62 * th) : 0,
      t,
      0.07,
    );
    N.valveBP.frequency.setTargetAtTime(2100 + rpm * 0.35, t, 0.1);
    N.valveG.gain.setTargetAtTime(on ? 0.018 * clamp(rpm / 3000, 0.25, 1) : 0, t, 0.1);

    // Layer 2 — high exhaust note
    N.exBP.frequency.setTargetAtTime(760 + rpm * 1.05 + boost * 1500, t, 0.09);
    N.exG.gain.setTargetAtTime(
      on
        ? clamp((rpm - 1800) / 6200, 0, 1) * (0.18 + 0.52 * th + 0.22 * boost) * ecuMult
        : 0,
      t,
      0.08,
    );

    // Layer 3 — turbo whistle & induction rush
    const turboFreq = 340 + rpm * 0.12 + spool * 1850;
    N.twO.frequency.setTargetAtTime(turboFreq, t, 0.12);
    N.twO2.frequency.setTargetAtTime(turboFreq * 2.02, t, 0.12);
    N.vibG.gain.setTargetAtTime(spool * 42, t, 0.16);
    N.twG.gain.setTargetAtTime(boost * 0.32 + spool * 0.04, t, 0.1);
    N.whHP.frequency.setTargetAtTime(2800 + spool * 2600, t, 0.1);
    N.whG.gain.setTargetAtTime(boost * 0.13, t, 0.09);

    // Layer 4 — DCT gearbox whine (tracks vehicle speed; louder in Reverse)
    const absSpd = Math.abs(speed);
    const isRev = gearMode === 'R';
    const gearFreq = isRev ? 220 + absSpd * 18 : 190 + absSpd * 7.8;
    N.gearOsc.frequency.setTargetAtTime(clamp(gearFreq, 120, 3200), t, 0.08);
    N.gearBP.frequency.setTargetAtTime(clamp(gearFreq * 1.5, 240, 4200), t, 0.08);
    const gearGain =
      on && absSpd > 2
        ? (isRev ? 0.085 : 0.028) * clamp(absSpd / 95, 0.15, 1.0)
        : 0;
    N.gearG.gain.setTargetAtTime(gearGain, t, 0.09);
  }

  /* ---------------- One-shot synthesized effects ---------------- */

  /** Blow-off valve "pshhh" + optional compressor surge flutter ("stututu"). */
  playBOV(strength = 1, flutter = false) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const out = this.nodes.master;

    // Pneumatic BOV whoosh
    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer();
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.35;
    f.frequency.setValueAtTime(3900, t);
    f.frequency.exponentialRampToValueAtTime(260, t + 0.58);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.82 * strength, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + 0.66);

    // Metallic valve whistle
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2650, t);
    o.frequency.exponentialRampToValueAtTime(680, t + 0.42);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.12 * strength, t + 0.018);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(og);
    og.connect(out);
    o.start(t);
    o.stop(t + 0.45);

    // Compressor surge flutter ("stututu-tu-tu") when boost is high or in Track+ mode
    if (flutter) {
      const flutCount = 5;
      for (let i = 0; i < flutCount; i++) {
        const dt = 0.045 + i * (0.068 + i * 0.009);
        const amp = strength * 0.28 * Math.pow(0.72, i);
        const fo = c.createOscillator();
        fo.type = 'triangle';
        const baseF = 1480 - i * 135;
        fo.frequency.setValueAtTime(baseF, t + dt);
        fo.frequency.exponentialRampToValueAtTime(baseF * 0.68, t + dt + 0.055);
        const fg = c.createGain();
        fg.gain.setValueAtTime(0.0001, t + dt);
        fg.gain.exponentialRampToValueAtTime(amp, t + dt + 0.012);
        fg.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.06);
        fo.connect(fg);
        fg.connect(out);
        fo.start(t + dt);
        fo.stop(t + dt + 0.065);
      }
    }
  }

  /** Exhaust pop / bang / overrun crackle. */
  playBackfire(intensity = 0.75) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const out = this.nodes.master;

    // Sharp exhaust detonation transient
    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer();
    const bp = c.createBiquadFilter();
    bp.type = 'lowpass';
    bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(1400 + Math.random() * 600, t);
    bp.frequency.exponentialRampToValueAtTime(130, t + 0.16);

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.78 * intensity, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + 0.2);

    // Deep muffler thump
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(125 + Math.random() * 35, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.55 * intensity, t + 0.005);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(og);
    og.connect(out);
    o.start(t);
    o.stop(t + 0.16);
  }

  _bark(t, amt) {
    const c = this.ctx;
    const N = this.nodes;
    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer();
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(980, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.36);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.72 * amt, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f);
    f.connect(g);
    g.connect(N.master);
    src.start(t);
    src.stop(t + 0.44);

    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(98, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.3);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.46 * amt, t + 0.018);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(og);
    og.connect(N.master);
    o.start(t);
    o.stop(t + 0.38);
  }

  playStart() {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const N = this.nodes;

    // Starter motor compression cadence (4 distinct compression humps + high gear whine)
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(52, t);
    o.frequency.linearRampToValueAtTime(96, t + 0.88);

    const whine = c.createOscillator();
    whine.type = 'sine';
    whine.frequency.setValueAtTime(420, t);
    whine.frequency.linearRampToValueAtTime(690, t + 0.88);
    const wg = c.createGain();
    wg.gain.value = 0.12;

    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 640;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.48, t + 0.05);
    g.gain.setValueAtTime(0.48, t + 0.82);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.96);

    o.connect(f);
    whine.connect(wg);
    wg.connect(f);
    f.connect(g);
    g.connect(N.master);
    o.start(t);
    whine.start(t);
    o.stop(t + 1.0);
    whine.stop(t + 1.0);

    // Cold-start flare bark
    this._bark(t + 0.95, 1.05);
  }

  playShutdown() {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(68, t);
    o.frequency.exponentialRampToValueAtTime(22, t + 0.28);
    const g = c.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g);
    g.connect(this.nodes.master);
    o.start(t);
    o.stop(t + 0.32);
  }

  playIgnition() {
    if (!this.ready) return;
    this._bark(this.ctx.currentTime, 0.85);
  }

  playShift() {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const out = this.nodes.master;

    // DCT pneumatic actuator thump + exhaust cut pop
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.085);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.24, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.11);
  }

  playDownshiftBlip() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.playShift();
    this._bark(t + 0.03, 0.55);
  }

  playLimiter() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._bark(t, 0.42);
    this._bark(t + 0.095, 0.36);
    this._bark(t + 0.19, 0.42);
  }

  playLaunchPop() {
    if (!this.ready) return;
    this.playBackfire(0.65);
  }

  handleEvent(e) {
    if (!e) return undefined;
    switch (e.type) {
      case 'bov':
        return this.playBOV(e.strength, e.flutter);
      case 'backfire':
        return this.playBackfire(e.intensity);
      case 'ignition':
        return this.playIgnition();
      case 'shift':
        return this.playShift();
      case 'downshiftBlip':
        return this.playDownshiftBlip();
      case 'limiter':
        return this.playLimiter();
      case 'launchPop':
        return this.playLaunchPop();
      default:
        return undefined;
    }
  }
}

export const audioEngine = new AudioEngine();
