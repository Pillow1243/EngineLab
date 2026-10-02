import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { engineTorque } from '../../sim/simulation.js';
import { MAT, applyXrayMaterialState } from './materials.js';
import { XS, visualAngle } from './engineGeometry.js';
import CrankTrain from './CrankTrain.jsx';
import Turbocharger from './Turbocharger.jsx';
import TimingBelt from './TimingBelt.jsx';

function Flywheel() {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = visualAngle.value;
  });
  return (
    <group ref={ref} position={[0.9, 0.34, 0]}>
      <mesh material={MAT.steel} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 32]} />
      </mesh>
      {Array.from({ length: 6 }).map((_, k) => (
        <group key={k} rotation-x={(k * Math.PI * 2) / 6}>
          <mesh material={MAT.steelDark} position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.055, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The full Inline-5 Turbo assembly:
 * - Mounted on a dynamic torque-roll & vibration rig
 * - Supports live X-Ray cutaway mode
 * - Includes RS Red-Top Ignition Coils, High-Pressure Fuel Rail, Oil Filter & Alternator
 */
export default function EngineModel() {
  const mountRef = useRef();
  const xray = useEngineStore((s) => s.xray);
  const roll = useRef(0);

  useEffect(() => {
    applyXrayMaterialState(xray);
  }, [xray]);

  /* intake runners: plenum → each head port */
  const intakeTubes = useMemo(
    () =>
      XS.map((x) => {
        const px = x * 0.4 + 0.1;
        const pts = [
          new THREE.Vector3(px, 1.06, 0.12),
          new THREE.Vector3((px + x) / 2, 0.93, 0.06),
          new THREE.Vector3(x, 0.885, 0.02),
        ];
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.05, 10, false);
      }),
    [],
  );

  /* exhaust manifold: 5 head ports → collector → turbo inlet */
  const exhaustTubes = useMemo(
    () =>
      XS.map((x) => {
        const pts = [
          new THREE.Vector3(x, 0.83, -0.12),
          new THREE.Vector3(x * 0.55 + 0.03, 0.64, -0.27),
          new THREE.Vector3(0.06, 0.5, -0.37),
          new THREE.Vector3(0.08, 0.4, -0.43),
        ];
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.042, 10, false);
      }),
    [],
  );

  // Dynamic engine mount torque roll & 5-cylinder firing vibration
  useFrame((state, dt) => {
    if (!mountRef.current) return;
    const s = useEngineStore.getState();
    const tq = s.rpm > 25 ? engineTorque(s.rpm, s.throttle, s.boost) : 0;
    const shiftJolt = s.shiftLock > 0.22 ? -0.032 : 0;
    const targetRoll = (tq / 680) * 0.065 + shiftJolt;
    roll.current += (targetRoll - roll.current) * Math.min(1, dt * 12);

    // Subtle 2.5-order harmonic vibration on rubber mounts
    const t = state.clock.elapsedTime;
    const vibAmp = s.cranking
      ? 0.008
      : s.running
        ? 0.0018 + 0.0022 * Math.max(0, 1 - s.rpm / 2400) + 0.0015 * s.throttle
        : 0;
    const vibFreq = Math.max(14, (s.rpm / 60) * Math.PI * 5);

    mountRef.current.rotation.x = roll.current + Math.sin(t * vibFreq) * vibAmp * 1.6;
    mountRef.current.position.y = Math.cos(t * vibFreq * 1.1) * vibAmp;
  });

  return (
    <group ref={mountRef}>
      {/* ---- sump / oil pan ---- */}
      <RoundedBox
        args={[1.4, 0.16, 0.4]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.13, 0]}
        material={MAT.blockDark}
        castShadow
      />

      {/* ---- cutaway block: bottom rail, top deck, side plates, struts ---- */}
      <mesh material={MAT.block} position={[0, 0.26, 0]} castShadow>
        <boxGeometry args={[1.5, 0.1, 0.42]} />
      </mesh>
      <mesh material={MAT.block} position={[0, 0.83, 0]} castShadow>
        <boxGeometry args={[1.5, 0.07, 0.42]} />
      </mesh>
      <mesh material={MAT.block} position={[0, 0.53, 0.195]} castShadow>
        <boxGeometry args={[1.5, 0.5, 0.05]} />
      </mesh>
      <mesh material={MAT.block} position={[0, 0.53, -0.195]} castShadow>
        <boxGeometry args={[1.5, 0.5, 0.05]} />
      </mesh>
      {[
        [-0.72, 0.16],
        [-0.72, -0.16],
        [0.72, 0.16],
        [0.72, -0.16],
      ].map(([x, z], i) => (
        <mesh key={i} material={MAT.blockDark} position={[x, 0.53, z]}>
          <boxGeometry args={[0.07, 0.5, 0.07]} />
        </mesh>
      ))}

      {/* ---- Oil Filter Canister & Cooler on front-right block ---- */}
      <group position={[-0.48, 0.36, 0.26]} rotation-x={0.35}>
        <mesh material={MAT.blockDark} castShadow>
          <cylinderGeometry args={[0.058, 0.058, 0.14, 20]} />
        </mesh>
        <mesh material={MAT.alu} position={[0, -0.075, 0]}>
          <cylinderGeometry args={[0.062, 0.062, 0.025, 20]} />
        </mesh>
      </group>

      {/* ---- Alternator mounted on lower intake side ---- */}
      <group position={[-0.62, 0.32, 0.28]}>
        <mesh material={MAT.alu} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.13, 20]} />
        </mesh>
        <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[-0.08, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.035, 16]} />
        </mesh>
      </group>

      {/* ---- head + valve cover ---- */}
      <RoundedBox
        args={[1.55, 0.1, 0.4]}
        radius={0.03}
        smoothness={3}
        position={[0, 0.9, 0]}
        material={MAT.cover}
        castShadow
      />
      <RoundedBox
        args={[1.5, 0.13, 0.3]}
        radius={0.04}
        smoothness={3}
        position={[0, 1.0, 0]}
        material={MAT.cover}
        castShadow
      />
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => (
        <mesh key={i} material={MAT.steelDark} position={[x, 1.075, 0]}>
          <boxGeometry args={[0.05, 0.02, 0.26]} />
        </mesh>
      ))}

      {/* ---- 5 RS Red-Top Ignition Coil Packs + Wiring Conduit ---- */}
      {XS.map((x, i) => (
        <group key={i} position={[x, 1.08, -0.01]}>
          <mesh material={MAT.steel}>
            <cylinderGeometry args={[0.032, 0.038, 0.03, 16]} />
          </mesh>
          <RoundedBox
            args={[0.068, 0.026, 0.075]}
            radius={0.006}
            smoothness={2}
            position={[0, 0.022, 0]}
            material={MAT.coilRed}
          />
        </group>
      ))}
      {/* Ignition harness rail */}
      <mesh material={MAT.rubber} position={[0, 1.095, -0.075]}>
        <boxGeometry args={[1.36, 0.018, 0.024]} />
      </mesh>
      {/* Oil filler cap */}
      <group position={[-0.68, 1.08, 0.07]}>
        <mesh material={MAT.alu}>
          <cylinderGeometry args={[0.042, 0.042, 0.025, 18]} />
        </mesh>
        <mesh material={MAT.coilRed} position={[0, 0.015, 0]}>
          <boxGeometry args={[0.065, 0.01, 0.02]} />
        </mesh>
      </group>

      {/* ---- High-Pressure Fuel Rail + 5 Brass Injectors ---- */}
      <mesh material={MAT.alu} rotation-z={Math.PI / 2} position={[0, 0.96, 0.15]}>
        <cylinderGeometry args={[0.016, 0.016, 1.38, 14]} />
      </mesh>
      {XS.map((x, i) => (
        <mesh key={i} material={MAT.brass} position={[x, 0.92, 0.13]} rotation-x={-0.45}>
          <cylinderGeometry args={[0.01, 0.01, 0.07, 10]} />
        </mesh>
      ))}

      {/* ---- intake plenum + runners ---- */}
      <RoundedBox
        args={[0.8, 0.15, 0.22]}
        radius={0.05}
        smoothness={3}
        position={[0.1, 1.14, 0.13]}
        material={MAT.intake}
        castShadow
      />
      {intakeTubes.map((g, i) => (
        <mesh key={i} geometry={g} material={MAT.intake} castShadow />
      ))}
      <mesh material={MAT.intake} position={[0.32, 1.26, 0.13]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.07, 0.09, 16]} />
      </mesh>

      {/* ---- exhaust manifold (5 ports → collector) ---- */}
      {exhaustTubes.map((g, i) => (
        <mesh key={i} geometry={g} material={MAT.iron} />
      ))}
      <mesh material={MAT.iron} position={[0.07, 0.42, -0.41]} rotation-x={0.4}>
        <cylinderGeometry args={[0.06, 0.06, 0.12, 14]} />
      </mesh>

      {/* ---- moving sub-assemblies ---- */}
      <CrankTrain />
      <Turbocharger />
      <TimingBelt />

      {/* ---- rear: clutch cover, flywheel, 7-DCT gearbox ---- */}
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[0.79, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.22, 0.07, 28]} />
      </mesh>
      <Flywheel />
      <RoundedBox
        args={[0.55, 0.45, 0.4]}
        radius={0.05}
        smoothness={3}
        position={[1.15, 0.34, 0]}
        material={MAT.blockDark}
        castShadow
      />
      {/* Gearbox cooling ribs */}
      {[-0.12, -0.04, 0.04, 0.12].map((z, i) => (
        <mesh key={i} material={MAT.steelDark} position={[1.15, 0.57, z]}>
          <boxGeometry args={[0.46, 0.015, 0.02]} />
        </mesh>
      ))}
      <RoundedBox
        args={[0.3, 0.1, 0.14]}
        radius={0.03}
        smoothness={3}
        position={[1.1, 0.62, 0.05]}
        material={MAT.steelDark}
      />
    </group>
  );
}
