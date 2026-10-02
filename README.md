# Engine Lab — Inline-5 Turbo Powertrain Simulator

> **Live demo:** https://Pillow1243.github.io/EngineLab/ (auto-deployed via GitHub Actions)


A highly interactive, dark-themed web app that simulates a **2.9L Inline-5 Turbo (직렬5 터보)**
engine with a **7-speed dual-clutch transmission** (7단 더블클러치). A fully procedural 3D
engine (moving pistons, rotating crankshaft, spinning timing belt, spooling turbo) is paired
with a physics simulation and a **fully synthesized, layered Web Audio sound engine** —
no audio files, no external assets, no network dependencies.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (binds 0.0.0.0)
npm run build      # production build
npm run test:sim   # headless 60+ second physics self-test
```

## Controls

| Input              | Action                          |
| ------------------ | ------------------------------- |
| `↑` (or hold pedal)| Throttle                        |
| `↓` (or hold pedal)| Brake                           |
| `←` / `→`          | Shift down / up (in D)          |
| `R` / `N` / `D`    | Reverse / Neutral / Drive       |
| `Space`            | Engine start / stop             |
| Mouse / touch      | Orbit, zoom, view presets (정면 / 측면 / 상단 / 디테일) |

Pedals support click, touch and drag-to-modulate (vertical position = pedal %).

## Architecture

```
src/
├── App.jsx                      split-screen shell (3D top / dashboard bottom)
├── main.jsx / index.css         entry, Tailwind + glassmorphism utilities
├── sim/
│   ├── constants.js             gear ratios, redline, mass, inertia…
│   └── simulation.js            pure stepSim(state, dt) → next state + events
├── store/
│   ├── engineStore.js           Zustand store (fast fields + discrete fields)
│   └── actions.js               togglePower() — audio-gesture-safe start/stop
├── audio/
│   └── AudioEngine.js           layered Web Audio synth (see below)
├── hooks/
│   ├── useSimulationLoop.js     the single rAF heartbeat (physics → store → audio)
│   ├── useKeyboard.js           keyboard controls
│   └── useLiveNode.js           60fps direct-DOM store bindings (no re-renders)
└── components/
    ├── scene/                   Three.js via @react-three/fiber + drei
    │   ├── EngineScene.jsx      canvas, studio lighting, env reflections, floor grid
    │   ├── EngineModel.jsx      block, head, manifolds, plenum, gearbox, flywheel
    │   ├── CrankTrain.jsx       pistons + rods + crank (full slider-crank kinematics)
    │   ├── Turbocharger.jsx     volute + spinning compressor wheel (spool-scaled)
    │   ├── TimingBelt.jsx       crank/cam pulleys, idler, scrolling ribbed belt
    │   └── CameraRig.jsx        eased camera flights for the 4 view presets
    └── hud/                     Tailwind dashboard
        ├── Tachometer.jsx       analog 0–9k needle + redline + digital rpm
        ├── BoostGauge.jsx       boost dial, turbo LED, spool bar
        ├── SpeedPanel.jsx       km/h + Start/Stop button
        ├── GearStrip.jsx        R/N/D + 7 gears + ▲▼ + DCT lockout bar
        ├── Pedals.jsx           interactive throttle/brake with % fill
        ├── Telemetry.jsx        live torque / wheel rpm / ratio / traction
        └── …overlays            title, view buttons, big gear readout
```

### Physics (`sim/simulation.js`)

- **Idle governor** settles the engine at ~880 rpm; idle is maintained in gear (DCT
  idle-hold under the brake, gentle creep at standstill).
- **Torque curve**: piecewise base torque × (0.2 + 0.8·throttle) × (1 + 1.02·boost),
  with a turbo droop above ~4600 rpm and a 8500 rpm rev limiter.
- **Transmission**: 7 DCT ratios + final drive. The clutch model distinguishes
  *locked* (rpm = wheel rpm, forces shared), *slipping* (launch control / engine
  braking / downshift blips) and *disengaged* (shift lockout or hard brake —
  exactly what a real DCT does). Shifting bleeds ~20% of rpm over 0.42 s.
- **Turbo**: boost (0–1.38 bar) builds with a first-order lag while the throttle is
  open above ~1400 rpm; it bleeds off on lift-off. A **BOV** event fires on
  high-boost throttle cuts.
- **Vehicle**: mass, rolling resistance, aero drag, traction limit, 9.5 kN brake.

Run `npm run test:sim` — it drives the engine for 60+ simulated seconds and asserts
ignition, idle stability, free revving, launch, shift dip, BOV, braking and shutdown.

### Audio (`audio/AudioEngine.js`)

Everything is synthesized live (created inside a user gesture, autoplay-safe):

| Layer    | Source                                                        | Driven by                          |
| -------- | ------------------------------------------------------------- | ---------------------------------- |
| 1 Core   | 6 oscillators at inline-5 firing harmonics (2.5·k · rpm/60)   | rpm (pitch + level), lowpass tilt  |
| 1b       | band-passed noise crackle                                     | rpm², throttle                     |
| 2 Exhaust| high band-pass noise (panned right)                           | fades in above ~2000 rpm           |
| 3 Turbo  | sine whistle + 13 Hz vibrato + high-pass intake whoosh        | boost, spool                       |
| 4 BOV    | one-shot: lowpass-swept noise burst + falling sine whistle    | throttle cut while boost > 0.4 bar |
| FX       | starter whine, ignition bark, DCT clunk, limiter chop         | sim events                         |

All continuous parameters are written with `setTargetAtTime` every frame → smooth,
zipper-free response at 60 fps.

### Rendering notes

- The engine is 100 % procedural Three.js geometry (no glTF): slider-crank kinematics
  solved per frame — `y(α) = R·cos α + √(L² − R²sin²α)` with the BMW inline-5
  crank-pin phasing (firing order 1-2-4-5-3).
- Metallic reflections come from a procedural `Environment` (Lightformers) — no HDR
  downloads, works offline.
- The HUD writes 60 fps values (needle, digital readouts, fills, LEDs) **directly to
  the DOM** via rAF-throttled Zustand subscriptions — zero React re-renders on the hot
  path, no layout shifts (fixed grid, tabular numerals).
