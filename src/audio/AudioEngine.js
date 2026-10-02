/**
 * AudioEngine — Next-Gen Procedural Acoustic Engine & Forced-Induction Synthesizer.
 *
 * Uses custom Fourier PeriodicWaves (cylinder blowdown pulse shape) + a procedural
 * Exhaust Pipe / Muffler Impulse-Response ConvolverNode + Asymmetric Tube WaveShaper.
 *
 * Dynamically adapts its harmonic structure and forced-induction layers to:
 *   - Engine Layout:  I4 (2.0× VTEC), I5 (2.5× off-beat warble), I6 (3.0× 2JZ howl), V8 (4.0× cross-plane burble)
 *   - Aspiration:     NA (ITB induction bark), Single Turbo, Twin-Turbo (dual detuned turbines), Supercharger (blower whine)
 *   - Upgrades:       Stock / Sport / Titanium Straight-Pipe exhaust, Street / Race Dog-Box DCT whine, N₂O Nitrous hiss
 */

import { ENGINES } from '../sim/constants.js';

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
      this.nodes.master.gain.setTargetAtTime(this.muted ? 0 : 0.94, this.ctx.currentTime, 0.04);
    }
  }

  /** Custom Fourier PeriodicWave shaped like a real cylinder exhaust blowdown pressure pulse. */
  _makeCombustionWave() {
    const c = this.ctx;
    const N = 32;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    for (let k = 1; k < N; k++) {
      // Steep exhaust valve opening rise + exponential blowdown tail
      const env = Math.exp(-k * 0.11) * (1 + 0.35 * Math.sin(k * 1.1));
      const phase = k * 0.42;
      real[k] = ( env * Math.cos(phase)) / Math.pow(k, 0.72);
      imag[k] = ( env * Math.sin(phase)) / Math.pow(k, 0.72);
    }
    return c.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  /** Secondary rich sub-pulse PeriodicWave for crank/bank uneven cadence. */
  _makeSubPulseWave() {
    const c = this.ctx;
    const real = new Float32Array([0, 0.2, 0.15, 0.08, 0.04, 0.02, 0.01]);
    const imag = new Float32Array([0, 1.0, 0.52, 0.28, 0.14, 0.06, 0.02]);
    return c.createPeriodicWave(real, imag);
  }

  /** Procedural stereo impulse response simulating a metal exhaust header + resonant muffler chamber. */
  _makeExhaustImpulse() {
    const c = this.ctx;
    const sr = c.sampleRate;
    const dur = 0.14;
    const len = Math.floor(sr * dur);
    const buf = c.createBuffer(2, len, sr);
    const earlyMs = [1.8, 3.9, 6.7, 10.2, 15.5, 22.8, 33.4];

    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const n = (Math.random() * 2 - 1) * Math.exp(-t * 28);
        // Low muffler body resonance around 125 Hz + pipe ring at 390 Hz
        const body =
          Math.sin(2 * Math.PI * (124 + ch * 5) * t) * Math.exp(-t * 22) * 0.42 +
          Math.sin(2 * Math.PI * (385 - ch * 11) * t) * Math.exp(-t * 38) * 0.22;
        lp = lp * 0.82 + (n * 0.45 + body) * 0.18;
        d[i] = lp;
      }
      // Early metallic pipe reflections
      earlyMs.forEach((ms, idx) => {
        const samp = Math.floor(((ms + ch * 0.35) / 1000) * sr);
        if (samp < len) {
          d[samp] += (idx % 2 === 0 ? 0.42 : -0.34) * Math.pow(0.76, idx);
        }
      });
    }
    return buf;
  }

  /** Warm asymmetric tube/header saturation curve. */
  _makeSaturationCurve(amount = 2.8) {
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * amount + 0.16 * x * x) / Math.tanh(amount);
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
    const combWave = this._makeCombustionWave();
    const subWave = this._makeSubPulseWave();

    /* ---------------- Master bus & compressor ---------------- */
    N.master = c.createGain();
    N.master.gain.value = this.muted ? 0 : 0.94;

    N.subBoost = c.createBiquadFilter();
    N.subBoost.type = 'lowshelf';
    N.subBoost.frequency.value = 118;
    N.subBoost.gain.value = 5.2;

    N.comp = c.createDynamicsCompressor();
    N.comp.threshold.value = -19;
    N.comp.knee.value = 14;
    N.comp.ratio.value = 5.5;
    N.comp.attack.value = 0.003;
    N.comp.release.value = 0.11;

    N.master.connect(N.subBoost);
    N.subBoost.connect(N.comp);
    N.comp.connect(c.destination);

    /* ---------------- Engine master bus + Convolver cabinet ---------------- */
    N.eng = c.createGain();
    N.eng.gain.value = 0;

    N.dryGain = c.createGain();
    N.dryGain.gain.value = 0.68;
    N.wetGain = c.createGain();
    N.wetGain.gain.value = 0.52;

    N.convolver = c.createConvolver();
    N.convolver.buffer = this._makeExhaustImpulse();

    N.eng.connect(N.dryGain);
    N.dryGain.connect(N.master);
    N.eng.connect(N.convolver);
    N.convolver.connect(N.wetGain);
    N.wetGain.connect(N.master);

    /* ---------------- Layer 1: Combustion Pulse Harmonic Stack ---------------- */
    N.shaper = c.createWaveShaper();
    N.shaper.curve = this._makeSaturationCurve(2.9);
    N.shaper.oversample = '2x';

    // Deep chest muffler formant (110–220 Hz)
    N.chestPeak = c.createBiquadFilter();
    N.chestPeak.type = 'peaking';
    N.chestPeak.frequency.value = 140;
    N.chestPeak.Q.value = 1.35;
    N.chestPeak.gain.value = 6.0;

    // Mid throat exhaust formant (320–780 Hz)
    N.throatPeak = c.createBiquadFilter();
    N.throatPeak.type = 'peaking';
    N.throatPeak.frequency.value = 410;
    N.throatPeak.Q.value = 1.65;
    N.throatPeak.gain.value = 4.2;

    // Main dynamic lowpass
    N.lp = c.createBiquadFilter();
    N.lp.type = 'lowpass';
    N.lp.frequency.value = 450;
    N.lp.Q.value = 1.15;

    N.shaper.connect(N.chestPeak);
    N.chestPeak.connect(N.throatPeak);
    N.throatPeak.connect(N.lp);
    N.lp.connect(N.eng);

    // Firing-cadence pulse AM/FM modulator (creates realistic cylinder chug at idle/load)
    N.pulseOsc = c.createOscillator();
    N.pulseOsc.setPeriodicWave(subWave);
    N.pulseOsc.frequency.value = 18;
    N.pulseFilterMod = c.createGain();
    N.pulseFilterMod.gain.value = 75;
    N.pulseOsc.connect(N.pulseFilterMod);
    N.pulseFilterMod.connect(N.lp.frequency);
    N.pulseOsc.start();

    // 8 harmonic voices scaled relative to the active engine's firing fundamental (fFire = f0 * firingMult)
    // Ratio is relative to fFire:
    //   0.25 & 0.5 & 0.75 = sub/off-beat warble orders (key for V8 burble & I5 warble!)
    //   1.0 = primary firing fundamental
    //   1.5 = off-beat fifth
    //   2.0, 3.0, 4.0 = upper firing harmonics
    N.harmonics = [
      { rel: 0.25, wave: 'sub', baseGain: 0.24 }, // quarter-order (V8 cross-plane burble)
      { rel: 0.5, wave: 'sub', baseGain: 0.36 }, // half-order warble sub
      { rel: 0.75, wave: 'comb', baseGain: 0.18 }, // 3/4 uneven cadence
      { rel: 1.0, wave: 'comb', baseGain: 0.48 }, // primary cylinder firing fundamental
      { rel: 1.5, wave: 'comb', baseGain: 0.22 }, // off-beat harmonic (signature I5 / V8)
      { rel: 2.0, wave: 'comb', baseGain: 0.28 }, // 2nd firing harmonic
      { rel: 3.0, wave: 'comb', baseGain: 0.16 }, // 3rd firing harmonic
      { rel: 4.0, wave: 'comb', baseGain: 0.1 }, // 4th metallic scream harmonic
    ].map((h) => {
      const o = c.createOscillator();
      o.setPeriodicWave(h.wave === 'sub' ? subWave : combWave);
      o.frequency.value = 28;
      const g = c.createGain();
      g.gain.value = 0;
      o.connect(g);
      g.connect(N.shaper);
      o.start();
      return { ...h, o, g };
    });

    /* ---------------- Layer 1b: Combustion Roughness, ITB Bark & Valvetrain ---------------- */
    N.crackleBP = c.createBiquadFilter();
    N.crackleBP.type = 'bandpass';
    N.crackleBP.frequency.value = 680;
    N.crackleBP.Q.value = 1.05;
    N.crackleG = c.createGain();
    N.crackleG.gain.value = 0;
    this._loopNoise().connect(N.crackleBP);
    N.crackleBP.connect(N.crackleG);
    N.crackleG.connect(N.shaper);

    // ITB / Naturally Aspirated Induction Throat Roar (prominent in NA mode under throttle)
    N.itbBP = c.createBiquadFilter();
    N.itbBP.type = 'bandpass';
    N.itbBP.frequency.value = 520;
    N.itbBP.Q.value = 2.1;
    N.itbG = c.createGain();
    N.itbG.gain.value = 0;
    this._loopNoise().connect(N.itbBP);
    N.itbBP.connect(N.itbG);
    N.itbG.connect(N.eng);

    // Mechanical valvetrain / timing tick
    N.valveBP = c.createBiquadFilter();
    N.valveBP.type = 'bandpass';
    N.valveBP.frequency.value = 2800;
    N.valveBP.Q.value = 3.2;
    N.valveG = c.createGain();
    N.valveG.gain.value = 0;
    this._loopNoise().connect(N.valveBP);
    N.valveBP.connect(N.valveG);
    N.valveG.connect(N.eng);

    /* ---------------- Layer 2: High-RPM Exhaust Roar & Titanium Rasp ---------------- */
    N.exBP = c.createBiquadFilter();
    N.exBP.type = 'bandpass';
    N.exBP.frequency.value = 1500;
    N.exBP.Q.value = 0.75;
    N.exG = c.createGain();
    N.exG.gain.value = 0;
    this._loopNoise().connect(N.exBP);
    N.exBP.connect(N.exG);
    N.exPan = this._pan(0.32);
    if (N.exPan) {
      N.exG.connect(N.exPan);
      N.exPan.connect(N.eng);
    } else {
      N.exG.connect(N.eng);
    }

    /* ---------------- Layer 3: Turbo / Twin-Turbo / Supercharger ---------------- */
    N.twO = c.createOscillator();
    N.twO.type = 'sine';
    N.twO.frequency.value = 550;

    // Second turbine oscillator (detuned for Twin-Turbo chordal whistle or Supercharger harmonic)
    N.twO2 = c.createOscillator();
    N.twO2.type = 'triangle';
    N.twO2.frequency.value = 1100;
    N.twO2G = c.createGain();
    N.twO2G.gain.value = 0.25;

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

    N.twPan = this._pan(-0.3);
    if (N.twPan) {
      N.twG.connect(N.twPan);
      N.twPan.connect(N.eng);
    } else {
      N.twG.connect(N.eng);
    }
    N.twO.start();
    N.twO2.start();
    N.vib.start();

    // High-pressure compressor air rush / N₂O hiss
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
    const {
      rpm,
      throttle: th,
      boost,
      spool,
      speed = 0,
      gearMode = 'D',
      ecuMode = 'SPORT',
      engineType = 'I5_29',
      aspiration = 'SINGLE_TURBO',
      exhaustUpgrade = 'SPORT',
      transUpgrade = 'STREET',
      nosActive = false,
    } = s;

    const engSpec = ENGINES[engineType] || ENGINES.I5_29;
    const fMult = engSpec.firingMult; // 2.0 (I4), 2.5 (I5), 3.0 (I6), 4.0 (V8)
    const on = rpm > 25;
    const f0 = on ? rpm / 60 : 0;
    const fFire = f0 * fMult;

    const ecuMult = ecuMode === 'TRACK' ? 1.2 : ecuMode === 'COMFORT' ? 0.84 : 1.0;
    const exhMult = exhaustUpgrade === 'TITANIUM' ? 1.25 : exhaustUpgrade === 'STOCK' ? 0.82 : 1.04;

    // Master engine bus level
    const engTarget = on
      ? (0.46 + 0.54 * th + 0.28 * clamp(rpm / 8000, 0, 1) + 0.18 * boost) * ecuMult * exhMult
      : 0;
    N.eng.gain.setTargetAtTime(clamp(engTarget * 0.56, 0, 1.25), t, 0.05);

    // Firing-cadence filter modulation (pronounced chug at idle, smooths out at high RPM)
    const chugFreq = engineType === 'V8_40' ? f0 * 1.5 : fFire;
    N.pulseOsc.frequency.setTargetAtTime(Math.max(4, chugFreq), t, 0.055);
    const idlePulse = on
      ? (1 - clamp((rpm - 900) / 2800, 0, 0.72)) * (95 + 130 * th) * (engineType === 'V8_40' ? 1.35 : 1)
      : 0;
    N.pulseFilterMod.gain.setTargetAtTime(idlePulse, t, 0.075);

    // Engine-specific harmonic weights
    // I4: strong 1.0 & 2.0, low sub warble
    // I5: strong 0.5, 1.0, 1.5 off-beat warble
    // I6: pure 1.0, 2.0, 3.0, 4.0 silky turbine wail
    // V8: heavy 0.25, 0.5, 0.75 cross-plane burble + 1.0
    for (const h of N.harmonics) {
      h.o.frequency.setTargetAtTime(Math.max(7, fFire * h.rel), t, 0.055);
      let hg = on ? h.baseGain : 0;

      if (engineType === 'I4_20') {
        if (h.rel === 0.25 || h.rel === 0.75 || h.rel === 1.5) hg *= 0.25;
        if (h.rel >= 2.0 && rpm > 5400) hg *= 1.45; // VTEC high-cam scream
      } else if (engineType === 'I5_29') {
        if (h.rel === 0.5 || h.rel === 1.5) hg *= 1.15 + 0.45 * th; // 5-cyl signature warble
      } else if (engineType === 'I6_30') {
        if (h.rel === 0.25 || h.rel === 0.75) hg *= 0.2;
        if (h.rel >= 2.0) hg *= 1.3; // 2JZ metallic straight-6 overtones
      } else if (engineType === 'V8_40') {
        if (h.rel <= 0.75) hg *= 1.65; // deep V8 cross-plane rumble
        if (h.rel >= 3.0) hg *= 0.65;
      }

      if (h.rel >= 3.0) {
        hg *= clamp((rpm - 1300) / 2600, 0, 1);
      }
      h.g.gain.setTargetAtTime(hg * (0.58 + 0.68 * th), t, 0.075);
    }

    // Dynamic formant & lowpass tracking
    const chestBase = engineType === 'V8_40' ? 98 : engineType === 'I6_30' ? 128 : 118;
    N.chestPeak.frequency.setTargetAtTime(chestBase + rpm * 0.016, t, 0.09);
    N.throatPeak.frequency.setTargetAtTime(310 + rpm * 0.068 + th * 180, t, 0.09);
    const lpFreq = (310 + rpm * 0.72 + boost * 1500 + th * 720) * ecuMult * exhMult;
    N.lp.frequency.setTargetAtTime(clamp(lpFreq, 220, 10500), t, 0.08);

    // Layer 1b — combustion texture, NA ITB induction bark & valvetrain
    N.crackleBP.frequency.setTargetAtTime(420 + rpm * 0.75, t, 0.08);
    N.crackleG.gain.setTargetAtTime(
      on ? (0.065 + 0.2 * Math.pow(rpm / 8500, 1.7) * (0.38 + 0.62 * th)) * exhMult : 0,
      t,
      0.07,
    );

    // ITB induction roar (especially loud in NA mode when opening throttle)
    const itbActive = aspiration === 'NA' ? 1.0 : 0.28;
    N.itbBP.frequency.setTargetAtTime(340 + rpm * 0.14 + th * 260, t, 0.07);
    N.itbG.gain.setTargetAtTime(on ? itbActive * th * (0.12 + 0.22 * clamp(rpm / 7500, 0, 1)) : 0, t, 0.06);

    N.valveBP.frequency.setTargetAtTime(2100 + rpm * 0.36, t, 0.1);
    N.valveG.gain.setTargetAtTime(on ? 0.018 * clamp(rpm / 3000, 0.25, 1) : 0, t, 0.1);

    // Layer 2 — high exhaust roar & Titanium rasp
    N.exBP.frequency.setTargetAtTime(
      (exhaustUpgrade === 'TITANIUM' ? 980 : 760) + rpm * 1.08 + boost * 1450,
      t,
      0.08,
    );
    N.exG.gain.setTargetAtTime(
      on
        ? clamp((rpm - 1700) / 6000, 0, 1) * (0.19 + 0.54 * th + 0.22 * boost) * ecuMult * exhMult
        : 0,
      t,
      0.075,
    );

    // Layer 3 — Forced Induction: Single Turbo / Twin-Turbo / Supercharger / NA + NOS
    if (aspiration === 'NA') {
      N.twG.gain.setTargetAtTime(0, t, 0.08);
      N.whG.gain.setTargetAtTime(nosActive && th > 0.4 ? 0.16 : 0, t, 0.08);
    } else if (aspiration === 'SUPERCHARGER') {
      // Twin-Screw Supercharger belt-driven gear whine
      const scFreq = 480 + rpm * 0.62;
      N.twO.frequency.setTargetAtTime(scFreq, t, 0.05);
      N.twO2.frequency.setTargetAtTime(scFreq * 1.5, t, 0.05);
      N.twO2G.gain.setTargetAtTime(0.45, t, 0.08);
      N.vibG.gain.setTargetAtTime(8, t, 0.1);
      const scGain = on ? (0.04 + 0.26 * th) * clamp((rpm - 900) / 5500, 0.1, 1.1) : 0;
      N.twG.gain.setTargetAtTime(scGain, t, 0.06);
      N.whHP.frequency.setTargetAtTime(2600 + rpm * 0.35, t, 0.08);
      N.whG.gain.setTargetAtTime(boost * 0.09 + (nosActive && th > 0.4 ? 0.15 : 0), t, 0.08);
    } else {
      // Single Turbo or Bi-Turbo (Twin-Turbo)
      const isTwin = aspiration === 'TWIN_TURBO';
      const turboFreq = (isTwin ? 420 : 340) + rpm * 0.13 + spool * (isTwin ? 2150 : 1850);
      N.twO.frequency.setTargetAtTime(turboFreq, t, 0.1);
      // Twin-turbo has a detuned second compressor wheel at 1.18× creating a rich chordal turbine whistle
      N.twO2.frequency.setTargetAtTime(turboFreq * (isTwin ? 1.18 : 2.02), t, 0.1);
      N.twO2G.gain.setTargetAtTime(isTwin ? 0.65 : 0.22, t, 0.1);
      N.vibG.gain.setTargetAtTime(spool * 42, t, 0.14);
      N.twG.gain.setTargetAtTime(boost * (isTwin ? 0.29 : 0.26) + spool * 0.035, t, 0.09);
      N.whHP.frequency.setTargetAtTime(2800 + spool * 2600, t, 0.09);
      N.whG.gain.setTargetAtTime(
        boost * (isTwin ? 0.15 : 0.12) + (nosActive && th > 0.4 ? 0.15 : 0),
        t,
        0.08,
      );
    }

    // Layer 4 — DCT gearbox whine (tracks vehicle speed; louder in Reverse or with Race Dog-Box)
    const absSpd = Math.abs(speed);
    const isRev = gearMode === 'R';
    const dogMult = transUpgrade === 'RACE_DOG' ? 2.2 : 1.0;
    const gearFreq = isRev ? 220 + absSpd * 18 : 190 + absSpd * 8.2;
    N.gearOsc.frequency.setTargetAtTime(clamp(gearFreq, 120, 3400), t, 0.07);
    N.gearBP.frequency.setTargetAtTime(clamp(gearFreq * 1.5, 240, 4400), t, 0.07);
    const gearGain =
      on && absSpd > 2
        ? (isRev ? 0.085 : 0.026 * dogMult) * clamp(absSpd / 95, 0.15, 1.0)
        : 0;
    N.gearG.gain.setTargetAtTime(gearGain, t, 0.08);
  }

  /* ---------------- One-shot synthesized effects ---------------- */

  /** Blow-off valve "pshhh" + optional compressor surge flutter ("stututu"). */
  playBOV(strength = 1, flutter = false) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const out = this.nodes.master;

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

    if (flutter) {
      const flutCount = 6;
      for (let i = 0; i < flutCount; i++) {
        const dt = 0.04 + i * (0.064 + i * 0.008);
        const amp = strength * 0.3 * Math.pow(0.74, i);
        const fo = c.createOscillator();
        fo.type = 'triangle';
        const baseF = 1520 - i * 130;
        fo.frequency.setValueAtTime(baseF, t + dt);
        fo.frequency.exponentialRampToValueAtTime(baseF * 0.66, t + dt + 0.055);
        const fg = c.createGain();
        fg.gain.setValueAtTime(0.0001, t + dt);
        fg.gain.exponentialRampToValueAtTime(amp, t + dt + 0.011);
        fg.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.058);
        fo.connect(fg);
        fg.connect(out);
        fo.start(t + dt);
        fo.stop(t + dt + 0.062);
      }
    }
  }

  /** Exhaust pop / bang / overrun crackle. */
  playBackfire(intensity = 0.75) {
    if (!this.ready) return;
    const c = this.ctx;
    const t = c.currentTime;
    const out = this.nodes.master;

    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer();
    const bp = c.createBiquadFilter();
    bp.type = 'lowpass';
    bp.Q.value = 1.65;
    bp.frequency.setValueAtTime(1450 + Math.random() * 650, t);
    bp.frequency.exponentialRampToValueAtTime(125, t + 0.16);

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.8 * intensity, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + 0.2);

    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(130 + Math.random() * 35, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.13);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.58 * intensity, t + 0.005);
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
    f.frequency.setValueAtTime(1020, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.36);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.74 * amt, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f);
    f.connect(g);
    g.connect(N.master);
    src.start(t);
    src.stop(t + 0.44);

    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(98, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.48 * amt, t + 0.018);
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

    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(98, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.085);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.26, t + 0.01);
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
    this._bark(t + 0.025, 0.58);
  }

  playLimiter() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._bark(t, 0.42);
    this._bark(t + 0.09, 0.38);
    this._bark(t + 0.18, 0.42);
  }

  playLaunchPop() {
    if (!this.ready) return;
    this.playBackfire(0.68);
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
