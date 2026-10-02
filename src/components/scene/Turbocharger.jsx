import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { ENGINES } from '../../sim/constants.js';
import { MAT } from './materials.js';

const TC1 = { x: -0.08, y: 0.34, z: -0.5 }; // Primary turbo centerline
const TC2 = { x: 0.46, y: 0.36, z: -0.48 }; // Secondary turbo (for Bi-Turbo / Twin-Turbo)

function TurboUnit({ pos, scale = 1, wheelRef, bovRingRef, showBov = true }) {
  return (
    <group position={[pos.x, pos.y, pos.z]} scale={scale}>
      {/* turbine volute (snail) */}
      <group position={[0.14, 0, 0]}>
        <mesh material={MAT.turbo} rotation-y={Math.PI / 2} castShadow>
          <torusGeometry args={[0.15, 0.08, 14, 40, Math.PI * 1.55]} />
        </mesh>
        <mesh material={MAT.turbo} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.115, 0.115, 0.15, 24]} />
        </mesh>
        {/* wastegate actuator */}
        <mesh material={MAT.alu} position={[0, 0.19, -0.06]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
        </mesh>
        <mesh material={MAT.brass} position={[0.04, 0.14, -0.06]} rotation-z={Math.PI / 3}>
          <cylinderGeometry args={[0.006, 0.006, 0.12, 8]} />
        </mesh>
      </group>

      {/* compressor bell */}
      <mesh material={MAT.alu} rotation-z={-Math.PI / 2} position={[-0.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.17, 0.2, 28, 1, true]} />
      </mesh>
      <mesh material={MAT.steel} rotation-y={Math.PI / 2} position={[-0.3, 0, 0]}>
        <torusGeometry args={[0.165, 0.016, 10, 40]} />
      </mesh>

      {/* spinning billet compressor wheel */}
      <group ref={wheelRef} position={[-0.24, 0, 0]}>
        <mesh material={MAT.steel} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.045, 0.045, 0.07, 16]} />
        </mesh>
        {Array.from({ length: 7 }).map((_, k) => (
          <group key={k} rotation-x={(k * Math.PI * 2) / 7}>
            <mesh material={MAT.chrome} position={[0, 0.09, 0]} rotation-y={0.45}>
              <boxGeometry args={[0.05, 0.1, 0.012]} />
            </mesh>
          </group>
        ))}
        <mesh material={MAT.steelDark} rotation-y={Math.PI / 2} position={[0.02, 0, 0]}>
          <torusGeometry args={[0.125, 0.016, 8, 32]} />
        </mesh>
      </group>

      {/* CHRA bearing housing */}
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[-0.02, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 24]} />
      </mesh>
      <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[-0.08, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.14, 12]} />
      </mesh>

      {showBov && (
        <group position={[-0.22, 0.24, 0.06]} rotation-z={0.35}>
          <mesh material={MAT.bov} castShadow>
            <cylinderGeometry args={[0.038, 0.028, 0.085, 16]} />
          </mesh>
          <mesh ref={bovRingRef} material={MAT.bov} position={[0, 0.046, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.04, 0.008, 8, 24]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Dynamic Aspiration & Forced-Induction 3D Assembly:
 * - NA: Individual Throttle Body (ITB) chrome velocity stacks + free-flow header
 * - SINGLE_TURBO: Big single turbocharger + FMIC + BOV + glowing downpipe
 * - TWIN_TURBO: Bi-Turbo parallel twin turbochargers + dual spinning wheels + dual BOVs
 * - SUPERCHARGER: Top-mounted Twin-Screw Supercharger blower + belt snout pulley
 */
export default function Turbocharger() {
  const aspiration = useEngineStore((s) => s.aspiration);
  const engineType = useEngineStore((s) => s.engineType);
  const exhaustUpgrade = useEngineStore((s) => s.exhaustUpgrade);
  const spec = ENGINES[engineType] || ENGINES.I5_29;
  const pipeMat = exhaustUpgrade === 'TITANIUM' ? MAT.titanium : MAT.iron;

  const wheel1 = useRef();
  const wheel2 = useRef();
  const scPulley = useRef();
  const bovRing1 = useRef();
  const bovRing2 = useRef();
  const backfireMesh = useRef();
  const spin = useRef(0);

  const chargePipe1 = useMemo(() => {
    const pts = [
      new THREE.Vector3(-0.26, 0.5, -0.5),
      new THREE.Vector3(-0.52, 0.72, -0.4),
      new THREE.Vector3(-0.55, 0.98, -0.12),
      new THREE.Vector3(-0.3, 1.1, 0.08),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.068, 12, false);
  }, []);

  const chargePipe2 = useMemo(() => {
    const pts = [
      new THREE.Vector3(0.28, 0.48, -0.48),
      new THREE.Vector3(-0.1, 0.68, -0.45),
      new THREE.Vector3(-0.48, 0.85, -0.25),
      new THREE.Vector3(-0.22, 1.1, 0.08),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.058, 12, false);
  }, []);

  const downPipe = useMemo(() => {
    const pts = [
      new THREE.Vector3(0.14, 0.34, -0.5),
      new THREE.Vector3(0.45, 0.26, -0.52),
      new THREE.Vector3(0.82, 0.2, -0.44),
      new THREE.Vector3(1.18, 0.18, -0.38),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.062, 12, false);
  }, []);

  const flameMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ff6a00',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, dt) => {
    const { rpm, spool, egt = 320, bovFlash = 0, backfireFlash = 0 } = useEngineStore.getState();
    spin.current += (0.2 + spool * 1.8) * (rpm / 60) * Math.PI * 2 * dt * 14;
    if (wheel1.current) wheel1.current.rotation.x = spin.current;
    if (wheel2.current) wheel2.current.rotation.x = spin.current * 1.12;
    if (scPulley.current) scPulley.current.rotation.x = spin.current * 0.35;

    const heat = Math.max(0, Math.min(1, (egt - 380) / 560));
    MAT.turbo.emissiveIntensity = 0.05 + heat * 0.95 + (backfireFlash > 0 ? 0.35 : 0);
    MAT.iron.emissiveIntensity = heat * 0.72;
    MAT.titanium.emissiveIntensity = heat * 0.82;

    MAT.bov.emissiveIntensity = 0.12 + bovFlash * 1.8;
    if (bovRing1.current) bovRing1.current.scale.setScalar(1 + bovFlash * 0.38);
    if (bovRing2.current) bovRing2.current.scale.setScalar(1 + bovFlash * 0.38);

    if (backfireMesh.current) {
      flameMat.opacity = Math.min(1, backfireFlash * 5.5);
      backfireMesh.current.scale.setScalar(0.85 + backfireFlash * 1.9);
    }
  });

  /* ---- 1) NATURALLY ASPIRATED (ITB Velocity Stacks + Header) ---- */
  if (aspiration === 'NA') {
    return (
      <group>
        {/* Polished ITB Velocity Stacks / Trumpets for each cylinder */}
        {spec.xs.map((x, i) => (
          <group
            key={i}
            position={[x, 1.12, spec.layout === 'v8' ? (i < 4 ? 0.14 : -0.14) : 0.16]}
            rotation-x={spec.layout === 'v8' ? (i < 4 ? 0.35 : -0.35) : 0.38}
          >
            <mesh material={MAT.chrome} castShadow>
              <cylinderGeometry args={[0.052, 0.034, 0.16, 20, 1, true]} />
            </mesh>
            <mesh material={MAT.forgedGold} position={[0, 0.08, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.053, 0.007, 10, 24]} />
            </mesh>
          </group>
        ))}
        <mesh geometry={downPipe} material={pipeMat} castShadow />
        <mesh ref={backfireMesh} material={flameMat} position={[1.22, 0.18, -0.37]} rotation-z={Math.PI / 2}>
          <coneGeometry args={[0.075, 0.22, 14]} />
        </mesh>
      </group>
    );
  }

  /* ---- 2) TWIN-SCREW SUPERCHARGER ---- */
  if (aspiration === 'SUPERCHARGER') {
    return (
      <group>
        {/* Top-mounted Finned Roots / Twin-Screw Supercharger Blower */}
        <group position={[0.02, 1.22, 0.02]}>
          <RoundedBox args={[0.92, 0.2, 0.32]} radius={0.04} smoothness={3} material={MAT.blockDark} castShadow />
          {[-0.1, -0.05, 0, 0.05, 0.1].map((z, idx) => (
            <mesh key={idx} material={MAT.alu} position={[0, 0.105, z]}>
              <boxGeometry args={[0.84, 0.014, 0.018]} />
            </mesh>
          ))}
          {/* Supercharger front drive snout + pulley */}
          <mesh material={MAT.alu} rotation-z={Math.PI / 2} position={[-0.58, -0.02, 0]}>
            <cylinderGeometry args={[0.045, 0.058, 0.32, 18]} />
          </mesh>
          <group ref={scPulley} position={[-0.76, -0.02, 0]}>
            <mesh material={MAT.coilRed} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.078, 0.078, 0.05, 24]} />
            </mesh>
            <mesh material={MAT.chrome} position={[0, 0.045, 0]}>
              <boxGeometry args={[0.055, 0.02, 0.02]} />
            </mesh>
          </group>
          {/* Front throttle body inlet */}
          <mesh material={MAT.chrome} position={[0.5, 0.02, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.075, 0.065, 0.12, 20]} />
          </mesh>
        </group>
        <mesh geometry={downPipe} material={pipeMat} castShadow />
        <mesh ref={backfireMesh} material={flameMat} position={[1.22, 0.18, -0.37]} rotation-z={Math.PI / 2}>
          <coneGeometry args={[0.075, 0.22, 14]} />
        </mesh>
      </group>
    );
  }

  /* ---- 3) SINGLE TURBO or BI-TURBO (TWIN-TURBO) ---- */
  const isTwin = aspiration === 'TWIN_TURBO';

  return (
    <group>
      {/* Primary Turbocharger (#1) */}
      <TurboUnit
        pos={isTwin ? { x: -0.22, y: 0.36, z: -0.5 } : TC1}
        scale={isTwin ? 0.84 : 1}
        wheelRef={wheel1}
        bovRingRef={bovRing1}
      />

      {/* Secondary Turbocharger (#2 — visible when Twin-Turbo is installed!) */}
      {isTwin && (
        <>
          <TurboUnit
            pos={TC2}
            scale={0.84}
            wheelRef={wheel2}
            bovRingRef={bovRing2}
          />
          <mesh geometry={chargePipe2} material={MAT.intake} castShadow />
        </>
      )}

      {/* Silicone Charge Couplers */}
      <mesh material={MAT.siliconeBlue} position={[-0.31, 1.09, 0.07]} rotation-z={-0.6}>
        <cylinderGeometry args={[0.08, 0.08, 0.07, 16]} />
      </mesh>

      {/* Front-Mount Intercooler (larger dual-core in Twin-Turbo mode) */}
      <group position={[-0.56, 0.66, -0.45]} rotation-y={0.35} scale={isTwin ? [1.15, 1.22, 1.18] : [1, 1, 1]}>
        <RoundedBox args={[0.12, 0.24, 0.28]} radius={0.02} smoothness={2} material={MAT.alu} castShadow />
        {[-0.07, -0.035, 0, 0.035, 0.07].map((y, idx) => (
          <mesh key={idx} material={MAT.steelDark} position={[0, y, 0]}>
            <boxGeometry args={[0.125, 0.008, 0.24]} />
          </mesh>
        ))}
      </group>

      {/* Charge Pipe & Exhaust Downpipe */}
      <mesh geometry={chargePipe1} material={MAT.intake} castShadow />
      <mesh geometry={downPipe} material={pipeMat} castShadow />

      {/* Downpipe backfire flame glow */}
      <mesh ref={backfireMesh} material={flameMat} position={[1.22, 0.18, -0.37]} rotation-z={Math.PI / 2}>
        <coneGeometry args={[0.078, 0.24, 14]} />
      </mesh>
    </group>
  );
}
