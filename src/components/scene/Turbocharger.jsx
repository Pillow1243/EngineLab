import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { MAT } from './materials.js';

const TC = { x: -0.05, y: 0.34, z: -0.5 }; // turbo shaft centerline

/**
 * Turbocharger + Intercooler + Blow-Off Valve (BOV) + Downpipe:
 * - Turbine volute & exhaust manifold glow with real EGT temperature
 * - Compressor wheel spins at ~14× engine speed scaled by spool
 * - Anodized BOV on the charge pipe flashes when venting boost
 * - Exhaust downpipe flashes orange-yellow on overrun backfires
 */
export default function Turbocharger() {
  const wheel = useRef();
  const bovRing = useRef();
  const backfireMesh = useRef();
  const spin = useRef(0);

  const chargePipe = useMemo(() => {
    const pts = [
      new THREE.Vector3(-0.25, 0.5, -0.5),
      new THREE.Vector3(-0.52, 0.72, -0.4),
      new THREE.Vector3(-0.55, 0.98, -0.12),
      new THREE.Vector3(-0.3, 1.1, 0.08),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.072, 12, false);
  }, []);

  const inletPipe = useMemo(() => {
    const pts = [
      new THREE.Vector3(0.06, 0.46, -0.23),
      new THREE.Vector3(0.08, 0.42, -0.35),
      new THREE.Vector3(0.09, 0.38, -0.44),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.055, 10, false);
  }, []);

  const downPipe = useMemo(() => {
    const pts = [
      new THREE.Vector3(TC.x + 0.22, TC.y, TC.z),
      new THREE.Vector3(0.45, 0.28, -0.52),
      new THREE.Vector3(0.82, 0.2, -0.44),
      new THREE.Vector3(1.18, 0.18, -0.38),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.062, 12, false);
  }, []);

  const airBoxPipe = useMemo(() => {
    const pts = [new THREE.Vector3(-0.35, 0.34, -0.5), new THREE.Vector3(-0.44, 0.33, -0.6)];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.06, 10, false);
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
    // compressor spins ~14× engine speed, scaled by spool (visible lag on spool-up)
    spin.current += (0.2 + spool * 1.8) * (rpm / 60) * Math.PI * 2 * dt * 14;
    if (wheel.current) wheel.current.rotation.x = spin.current;

    // Thermal glow driven by simulated Exhaust Gas Temperature (320°C..980°C)
    const heat = Math.max(0, Math.min(1, (egt - 380) / 560));
    MAT.turbo.emissiveIntensity = 0.05 + heat * 0.95 + (backfireFlash > 0 ? 0.35 : 0);
    MAT.iron.emissiveIntensity = heat * 0.72;

    // BOV visual pulse when venting boost
    MAT.bov.emissiveIntensity = 0.12 + bovFlash * 1.8;
    if (bovRing.current) {
      bovRing.current.scale.setScalar(1 + bovFlash * 0.35);
    }

    // Backfire / overrun flame inside downpipe exit
    if (backfireMesh.current) {
      flameMat.opacity = Math.min(1, backfireFlash * 5.5);
      backfireMesh.current.scale.setScalar(0.85 + backfireFlash * 1.8);
    }
  });

  return (
    <group>
      {/* ---- turbine volute (snail) ---- */}
      <group position={[TC.x + 0.14, TC.y, TC.z]}>
        <mesh material={MAT.turbo} rotation-y={Math.PI / 2} castShadow>
          <torusGeometry args={[0.15, 0.08, 14, 40, Math.PI * 1.55]} />
        </mesh>
        <mesh material={MAT.turbo} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.115, 0.115, 0.15, 24]} />
        </mesh>
        {/* wastegate actuator + linkage rod */}
        <mesh material={MAT.alu} position={[0, 0.19, -0.06]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
        </mesh>
        <mesh material={MAT.brass} position={[0.04, 0.14, -0.06]} rotation-z={Math.PI / 3}>
          <cylinderGeometry args={[0.006, 0.006, 0.12, 8]} />
        </mesh>
      </group>

      {/* ---- compressor bell (open toward -X) ---- */}
      <mesh material={MAT.alu} rotation-z={-Math.PI / 2} position={[TC.x - 0.2, TC.y, TC.z]} castShadow>
        <cylinderGeometry args={[0.06, 0.17, 0.2, 28, 1, true]} />
      </mesh>
      <mesh material={MAT.steel} rotation-y={Math.PI / 2} position={[TC.x - 0.3, TC.y, TC.z]}>
        <torusGeometry args={[0.165, 0.016, 10, 40]} />
      </mesh>

      {/* ---- spinning billet compressor wheel ---- */}
      <group ref={wheel} position={[TC.x - 0.24, TC.y, TC.z]}>
        <mesh material={MAT.steel} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.045, 0.045, 0.07, 16]} />
        </mesh>
        {Array.from({ length: 7 }).map((_, k) => (
          <group key={k} rotation-x={(k * Math.PI * 2) / 7}>
            <mesh material={MAT.alu} position={[0, 0.09, 0]} rotation-y={0.45}>
              <boxGeometry args={[0.05, 0.1, 0.012]} />
            </mesh>
          </group>
        ))}
        <mesh material={MAT.steelDark} rotation-y={Math.PI / 2} position={[0.02, 0, 0]}>
          <torusGeometry args={[0.125, 0.016, 8, 32]} />
        </mesh>
      </group>

      {/* ---- center bearing housing (CHRA) + shaft ---- */}
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[TC.x - 0.02, TC.y, TC.z]}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 24]} />
      </mesh>
      <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[TC.x - 0.08, TC.y, TC.z]}>
        <cylinderGeometry args={[0.03, 0.03, 0.14, 12]} />
      </mesh>

      {/* ---- Blow-Off Valve (BOV) mounted on upper charge pipe ---- */}
      <group position={[-0.54, 0.89, -0.22]} rotation-z={0.55}>
        <mesh material={MAT.bov} castShadow>
          <cylinderGeometry args={[0.042, 0.032, 0.095, 16]} />
        </mesh>
        <mesh ref={bovRing} material={MAT.bov} position={[0, 0.052, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.044, 0.008, 8, 24]} />
        </mesh>
      </group>

      {/* ---- Silicone Charge Couplers ---- */}
      <mesh material={MAT.siliconeBlue} position={[-0.31, 1.09, 0.07]} rotation-z={-0.6}>
        <cylinderGeometry args={[0.08, 0.08, 0.07, 16]} />
      </mesh>

      {/* ---- Intercooler / Heat Exchanger block on front-left ---- */}
      <group position={[-0.56, 0.66, -0.45]} rotation-y={0.35}>
        <RoundedBox args={[0.12, 0.24, 0.28]} radius={0.02} smoothness={2} material={MAT.alu} castShadow />
        {[-0.07, -0.035, 0, 0.035, 0.07].map((y, idx) => (
          <mesh key={idx} material={MAT.steelDark} position={[0, y, 0]}>
            <boxGeometry args={[0.125, 0.008, 0.24]} />
          </mesh>
        ))}
      </group>

      {/* ---- plumbing & exhaust downpipe ---- */}
      <mesh geometry={chargePipe} material={MAT.intake} castShadow />
      <mesh geometry={inletPipe} material={MAT.iron} />
      <mesh geometry={downPipe} material={MAT.iron} castShadow />
      <mesh geometry={airBoxPipe} material={MAT.rubber} />
      <mesh material={MAT.blockDark} position={[-0.52, 0.34, -0.66]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.22]} />
      </mesh>

      {/* ---- Downpipe backfire flame glow ---- */}
      <mesh ref={backfireMesh} material={flameMat} position={[1.22, 0.18, -0.37]} rotation-z={Math.PI / 2}>
        <coneGeometry args={[0.075, 0.22, 14]} />
      </mesh>
    </group>
  );
}
