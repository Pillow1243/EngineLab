# Engine Lab — Inline-5 Turbo Powertrain Simulator

> **Live demo:** https://Pillow1243.github.io/EngineLab/ (auto-deployed via GitHub Actions)

An interactive, dark-themed web application that simulates a **2.9L DOHC Inline-5 Turbo (직렬5 터보)**
engine paired with a **7-speed dual-clutch transmission (7단 더블클러치)**. Features a 100% procedural
3D engine with internal moving parts and combustion flashes, a real-time physics & thermal simulation,
and a multi-layer procedural Web Audio synthesizer — fully responsive across **Android, iOS, tablets, and desktop**.

## Highlights & Features

- **3D Procedural Inline-5 Turbo Engine**:
  - Full slider-crank kinematics (`1-2-4-5-3` firing order) with 5 pistons, 3-ring packs, connecting rods, and counterweighted crank throws.
  - **DOHC Valvetrain**: Dual overhead camshafts rotating at ½ crank speed with 10 reciprocating intake & exhaust valves.
  - **Live Combustion Flashes**: Electric-blue spark → fiery orange plasma flash inside each cylinder at firing TDC (`1-2-4-5-3` sequence).
  - **X-Ray Cutaway Mode (`X`)**: Toggle translucent engine block, cylinder head, valve cover, and intake plenum to inspect internal moving parts from any angle.
  - **Turbocharger, Intercooler & BOV**: Spinning billet compressor wheel (~14× engine speed with spool lag), finned front-mount intercooler, anodized Blow-Off Valve with visual vent pulse, and exhaust downpipe with **real EGT thermal glow** + **overrun backfire flames**.
  - **Dynamic Engine Mounts**: Real torque-reaction roll under load, shift jolts, and 2.5-order harmonic idle vibration.
- **Multi-Layer Synthesized Web Audio (`AudioEngine.js`)**:
  - **8-Harmonic Inline-5 Core** (`1.25×` & `3.75×` signature off-beat warble + `2.5×` firing fundamental) through an asymmetric **Tube-Saturation WaveShaper** and dual-formant exhaust resonator.
  - **Dual-Stage Turbo Synth**: Blade-pass whistle + high-pressure induction rush.
  - **BOV + Compressor Surge Flutter ("Stututu")**: Pneumatic valve hiss plus decaying compressor surge chirps at high boost / Track+ mode.
  - **Exhaust Pops & Bangs (Overrun Crackles)**: Realistic muffler detonations when lifting off at high RPM.
  - **DCT Gearbox Whine & Rev-Match Downshift Blip**: Speed-coupled transmission whine (distinct in Reverse) + automatic throttle bark on downshifts.
- **Interactive ECU & Transmission Controls**:
  - **3 ECU Maps (`COMFORT` / `SPORT` / `TRACK+`)**: Changes boost target (up to `1.52 bar`), throttle aggressiveness, anti-lag spool, and overrun burbles.
  - **Manual & Auto 7-DCT (`AUTO` / `MAN`)**: Shift manually with paddles/keys or enable automatic upshifts & rev-matched downshifts.
  - **2-Step Launch Control**: Hold **Brake + Throttle** simultaneously at standstill to build boost on the 4100 RPM two-step limiter, then release Brake for an explosive launch with automatic **0–100 km/h timing**.
- **100% Responsive (Android, Mobile Portrait & Landscape, Tablet, Desktop)**:
  - Aspect-adaptive 3D camera framing so vertical phone screens never clip the engine.
  - Ergonomic multi-touch dashboard in portrait mode and automatic side-by-side split view in mobile landscape.

## Run Locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run test:sim   # headless physics self-test
```

## Controls

| Input              | Action                                                  |
| ------------------ | ------------------------------------------------------- |
| `↑` / `W` or Pedal | Throttle (drag vertically on pedal to modulate 0–100%)  |
| `↓` / `S` or Pedal | Brake (hold Brake + Throttle at rest = Launch Control)  |
| `←` / `→`          | Shift down (with rev-match blip) / Shift up             |
| `R` / `N` / `D`    | Reverse / Neutral / Drive                               |
| `A`                | Toggle Automatic / Manual 7-DCT shifting                |
| `E`                | Cycle ECU Map (`COMFORT` → `SPORT` → `TRACK+`)          |
| `X`                | Toggle X-Ray Cutaway view (`투시`)                       |
| `M`                | Mute / Unmute synthesized audio                         |
| `Space`            | Engine Start / Stop                                     |
