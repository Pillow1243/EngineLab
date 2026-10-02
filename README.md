# Engine Lab — Multi-Engine & Forced-Induction Powertrain Simulator

> **Live demo:** https://Pillow1243.github.io/EngineLab/ (auto-deployed via GitHub Actions)

An interactive 3D powertrain & dyno simulator featuring **4 swappable engines (`I4`, `I5`, `I6`, `V8`)**,
**4 forced-induction systems (`Naturally Aspirated ITB`, `Single Turbo`, `Bi-Turbo / Twin-Turbo`, `Twin-Screw Supercharger`)**,
a **7-speed dual-clutch transmission (`7-DCT`)**, a **Live Dyno & Parts Tuning Workshop**, and a
next-generation procedural **Web Audio Convolver + PeriodicWave Sound Synthesizer** — fully responsive
across **Android, iOS, tablets, and desktop**.

## Engine Garage & Tuning Workshop (`G` or `🔧 TUNING / GARAGE`)

- **4 Swappable Engines (changes 3D geometry, cylinder count, firing order, physics & sound)**:
  - **Inline-4 2.0L VTEC (`I4_20`)**: 4 cylinders, `1-3-4-2` firing order, 9,000+ RPM limit, high-cam VTEC crossover kick.
  - **Inline-5 2.9L RS (`I5_29`)**: 5 cylinders, `1-2-4-5-3` firing order, signature 2.5× off-beat warble.
  - **Inline-6 3.0L 2JZ (`I6_30`)**: 6 cylinders, `1-5-3-6-2-4` firing order, silky turbine straight-six howl.
  - **V8 4.0L Cross-Plane (`V8_40`)**: 8 cylinders in a 90° V-block (`±39°` dual banks in 3D), `1-8-4-3-6-5-7-2` firing order, deep V8 burble.
- **4 Forced-Induction / Aspiration Systems (changes 3D model, boost physics & sound)**:
  - **Naturally Aspirated (`NA · بدون توربو`)**: Removes turbo & intercooler, installs **8/6/5/4 Polished Chrome ITB Velocity Stacks (Trumpets)** with raw induction roar.
  - **Single Turbo (`1x TURBO`)**: Large single turbocharger + FMIC + anodized BOV + glowing downpipe.
  - **Bi-Turbo / Twin-Turbo (`2x BI-TURBO · دابل توربو`)**: Dual parallel turbochargers with two spinning compressor wheels, dual wastegates, dual BOVs, fast spool, up to **2.0+ bar** boost, and detuned twin-turbine chordal whistle + flutter.
  - **Twin-Screw Supercharger (`SUPERCHARGER · سوپرشارژر`)**: Top-mounted finned roots/twin-screw blower with belt snout pulley, instant 0-lag boost right off idle, and signature supercharger gear whine.
- **Performance Parts & N₂O Nitrous Oxide**:
  - **Internals**: `Stock` vs `Forged Gold Pistons & Racing Cams (+600 RPM, -20% inertia)`.
  - **Exhaust**: `Stock` vs `Sport Cat-Back` vs `Titanium Straight-Pipe` (blue-violet titanium headers + aggressive gunshot overrun pops & flames).
  - **Transmission**: `7-DCT Street (320ms)` vs `7-DCT Race Dog-Box (120ms lightning shifts + straight-cut gear whine)`.
  - **Tires**: `Street Radial (0.92G)` vs `Semi-Slick R888 (1.22G)` vs `Drag Radial Slick (1.55G)`.
  - **N₂O Nitrous Shot (`⚡ N₂O SHOT` or `Shift`)**: Instant +155 Nm torque boost with electric-blue cylinder combustion plasma flames.

## Controls

| Input                | Action                                                  |
| -------------------- | ------------------------------------------------------- |
| `↑` / `W` or Pedal   | Throttle (drag vertically on pedal to modulate 0–100%)  |
| `↓` / `S` or Pedal   | Brake (hold Brake + Throttle at rest = Launch Control)  |
| `Shift` or `⚡ N₂O`  | Fire N₂O Nitrous Oxide Shot                             |
| `←` / `→`            | Shift down (with rev-match blip) / Shift up             |
| `R` / `N` / `D`      | Reverse / Neutral / Drive                               |
| `G`                  | Open / Close Garage & Dyno Tuning Workshop              |
| `A`                  | Toggle Automatic / Manual 7-DCT shifting                |
| `E`                  | Cycle ECU Map (`COMFORT` → `SPORT` → `TRACK+`)          |
| `X`                  | Toggle X-Ray Cutaway view (`투시`)                       |
| `M`                  | Mute / Unmute synthesized audio                         |
| `Space`              | Engine Start / Stop                                     |
