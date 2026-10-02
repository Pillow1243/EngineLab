import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { ENGINES } from '../../sim/constants.js';
import { engineTorque } from '../../sim/simulation.js';
import { MAT, applyXrayMaterialState } from './materials.js';
import { visualAngle } from './engineGeometry.js';
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
 * Multi-Engine 3D Powertrain Assembly:
 * - Adapts block, heads, intake runners, exhaust headers, and coil packs to I4 / I5 / I6 / V8
 * - Supports Titanium exhaust headers, Nitrous (N₂O) bottle/rail, and X-Ray cutaway mode
 */
export default function EngineModel() {
  const mountRef = useRef();
  const xray = useEngineStore((s) => s.xray);
  const engineType = useEngineStore((s) => s.engineType);
  const aspiration = useEngineStore((s) => s.aspiration);
  const exhaustUpgrade = useEngineStore((s) => s.exhaustUpgrade);
  const nosInstalled = useEngineStore((s) => s.nosInstalled);

  const spec = ENGINES[engineType] || ENGINES.I5_29;
  const isV8 = spec.layout === 'v8';
  const exhMat = exhaustUpgrade === 'TITANIUM' ? MAT.titanium : MAT.iron;
  const roll = useRef(0);

  useEffect(() => {
    applyXrayMaterialState(xray);
  }, [xray]);

  /* intake runners: plenum → each head port */
  const intakeTubes = useMemo(
    () =>
      spec.xs.map((x, i) => {
        const zSign = isV8 ? (i < 4 ? 1 : -1) : 1;
        const px = x * 0.45 + 0.06;
        const pts = [
          new THREE.Vector3(px, 1.06, 0.1 * zSign),
          new THREE.Vector3((px + x) / 2, 0.92, 0.08 * zSign),
          new THREE.Vector3(x, isV8 ? 0.78 : 0.885, isV8 ? 0.18 * zSign : 0.02),
        ];
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.044, 10, false);
      }),
    [spec, isV8],
  );

  /* exhaust manifold: head ports → collector → turbo/downpipe inlet */
  const exhaustTubes = useMemo(
    () =>
      spec.xs.map((x, i) => {
        const pts = [
          new THREE.Vector3(x, isV8 ? 0.72 : 0.83, -0.14),
          new THREE.Vector3(x * 0.55 + 0.03, 0.58, -0.29),
          new THREE.Vector3(0.06, 0.46, -0.37),
          new THREE.Vector3(0.08, 0.38, -0.43),
        ];
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 22, 0.038, 10, false);
      }),
    [spec, isV8],
  );

  // Dynamic engine mount torque roll & firing vibration
  useFrame((state, dt) => {
    if (!mountRef.current) return;
    const s = useEngineStore.getState();
    const tq = s.rpm > 25 ? engineTorque(s.rpm, s.throttle, s.boost, s) : 0;
    const shiftJolt = s.shiftLock > 0.16 ? -0.032 : 0;
    const targetRoll = (tq / 720) * 0.068 + shiftJolt;
    roll.current += (targetRoll - roll.current) * Math.min(1, dt * 12);

    const t = state.clock.elapsedTime;
    const vibAmp = s.cranking
      ? 0.0085
      : s.running
        ? 0.0018 + 0.0024 * Math.max(0, 1 - s.rpm / 2400) + 0.0016 * s.throttle
        : 0;
    const vibFreq = Math.max(14, (s.rpm / 60) * Math.PI * spec.firingMult * 2);

    mountRef.current.rotation.x = roll.current + Math.sin(t * vibFreq) * vibAmp * 1.6;
    mountRef.current.position.y = Math.cos(t * vibFreq * 1.1) * vibAmp;
  });

  const blockLen = spec.cylinders === 6 ? 1.68 : spec.cylinders === 4 ? 1.26 : 1.5;

  return (
    <group ref={mountRef}>
      {/* ---- sump / oil pan ---- */}
      <RoundedBox
        args={[blockLen - 0.08, 0.16, isV8 ? 0.52 : 0.4]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.13, 0]}
        material={MAT.blockDark}
        castShadow
      />

      {/* ---- cutaway block ---- */}
      <mesh material={MAT.block} position={[0, 0.26, 0]} castShadow>
        <boxGeometry args={[blockLen, 0.1, isV8 ? 0.54 : 0.42]} />
      </mesh>

      {!isV8 ? (
        <>
          <mesh material={MAT.block} position={[0, 0.83, 0]} castShadow>
            <boxGeometry args={[blockLen, 0.07, 0.42]} />
          </mesh>
          <mesh material={MAT.block} position={[0, 0.53, 0.195]} castShadow>
            <boxGeometry args={[blockLen, 0.5, 0.05]} />
          </mesh>
          <mesh material={MAT.block} position={[0, 0.53, -0.195]} castShadow>
            <boxGeometry args={[blockLen, 0.5, 0.05]} />
          </mesh>
          {/* Inline head + valve cover */}
          <RoundedBox
            args={[blockLen + 0.04, 0.1, 0.4]}
            radius={0.03}
            smoothness={3}
            position={[0, 0.9, 0]}
            material={MAT.cover}
            castShadow
          />
          <RoundedBox
            args={[blockLen, 0.13, 0.3]}
            radius={0.04}
            smoothness={3}
            position={[0, 1.0, 0]}
            material={MAT.cover}
            castShadow
          />
        </>
      ) : (
        /* ---- V8 Dual Angled Cylinder Banks & Dual Valve Covers ---- */
        <>
          {[1, -1].map((bankSign) => (
            <group
              key={bankSign}
              position={[0, 0.34, 0]}
              rotation-x={bankSign * 0.68}
            >
              <RoundedBox
                args={[blockLen, 0.12, 0.32]}
                radius={0.03}
                smoothness={3}
                position={[0, 0.52, 0]}
                material={MAT.cover}
                castShadow
              />
              <RoundedBox
                args={[blockLen - 0.04, 0.09, 0.26]}
                radius={0.03}
                smoothness={3}
                position={[0, 0.61, 0]}
                material={MAT.coilRed}
                castShadow
              />
            </group>
          ))}
        </>
      )}

      {/* ---- Oil Filter Canister & Alternator ---- */}
      <group position={[-0.48, 0.36, 0.26]} rotation-x={0.35}>
        <mesh material={MAT.blockDark} castShadow>
          <cylinderGeometry args={[0.058, 0.058, 0.14, 20]} />
        </mesh>
        <mesh material={MAT.alu} position={[0, -0.075, 0]}>
          <cylinderGeometry args={[0.062, 0.062, 0.025, 20]} />
        </mesh>
      </group>
      <group position={[-0.62, 0.32, 0.28]}>
        <mesh material={MAT.alu} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.13, 20]} />
        </mesh>
        <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[-0.08, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.035, 16]} />
        </mesh>
      </group>

      {/* ---- RS Red-Top Ignition Coil Packs (1 per cylinder) ---- */}
      {!isV8 &&
        spec.xs.map((x, i) => (
          <group key={i} position={[x, 1.08, -0.01]}>
            <mesh material={MAT.steel}>
              <cylinderGeometry args={[0.03, 0.036, 0.03, 16]} />
            </mesh>
            <RoundedBox
              args={[0.062, 0.026, 0.072]}
              radius={0.006}
              smoothness={2}
              position={[0, 0.022, 0]}
              material={MAT.coilRed}
            />
          </group>
        ))}

      {/* ---- High-Pressure Fuel Rail + N₂O Nitrous Bottle/Solenoid ---- */}
      <mesh material={MAT.alu} rotation-z={Math.PI / 2} position={[0, 0.96, 0.15]}>
        <cylinderGeometry args={[0.016, 0.016, blockLen - 0.1, 14]} />
      </mesh>
      {nosInstalled && (
        <group position={[0.62, 0.68, 0.28]} rotation-z={0.2}>
          <mesh material={MAT.nosBlue} castShadow>
            <cylinderGeometry args={[0.058, 0.058, 0.26, 20]} />
          </mesh>
          <mesh material={MAT.nosBlue} position={[0, 0.13, 0]}>
            <sphereGeometry args={[0.058, 16, 12]} />
          </mesh>
          <mesh material={MAT.brass} position={[0, 0.195, 0]}>
            <cylinderGeometry args={[0.016, 0.022, 0.04, 12]} />
          </mesh>
        </group>
      )}

      {/* ---- Intake Plenum + Runners (hidden when NA ITBs or Supercharger replace it) ---- */}
      {aspiration !== 'NA' && aspiration !== 'SUPERCHARGER' && (
        <>
          <RoundedBox
            args={[0.84, 0.15, 0.22]}
            radius={0.05}
            smoothness={3}
            position={[0.08, 1.14, 0.12]}
            material={MAT.intake}
            castShadow
          />
          {intakeTubes.map((g, i) => (
            <mesh key={i} geometry={g} material={MAT.intake} castShadow />
          ))}
        </>
      )}

      {/* ---- Exhaust Manifold (ports → collector) ---- */}
      {exhaustTubes.map((g, i) => (
        <mesh key={i} geometry={g} material={exhMat} />
      ))}
      <mesh material={exhMat} position={[0.07, 0.42, -0.41]} rotation-x={0.4}>
        <cylinderGeometry args={[0.06, 0.06, 0.12, 14]} />
      </mesh>

      {/* ---- Moving sub-assemblies ---- */}
      <CrankTrain />
      <Turbocharger />
      <TimingBelt />

      {/* ---- Rear: clutch cover, flywheel, 7-DCT gearbox ---- */}
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[0.84, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.22, 0.07, 28]} />
      </mesh>
      <Flywheel />
      <RoundedBox
        args={[0.55, 0.45, 0.4]}
        radius={0.05}
        smoothness={3}
        position={[1.18, 0.34, 0]}
        material={MAT.blockDark}
        castShadow
      />
      {[-0.12, -0.04, 0.04, 0.12].map((z, i) => (
        <mesh key={i} material={MAT.steelDark} position={[1.18, 0.57, z]}>
          <boxGeometry args={[0.46, 0.015, 0.02]} />
        </mesh>
      ))}
      <RoundedBox
        args={[0.3, 0.1, 0.14]}
        radius={0.03}
        smoothness={3}
        position={[1.14, 0.62, 0.05]}
        material={MAT.steelDark}
      />
    </group>
  );
}
