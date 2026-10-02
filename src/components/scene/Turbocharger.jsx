import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { MAT } from './materials.js';

const TC = { x: -0.05, y: 0.34, z: -0.5 }; // turbo shaft centerline

/**
 * Turbocharger: turbine volute, compressor bell with a spinning wheel
 * (spool speed follows the sim's spool value), charge pipe to the
 * plenum, exhaust inlet from the manifold, air intake.
 */
export default function Turbocharger() {
  const wheel = useRef();
  const spin = useRef(0);

  const chargePipe = useMemo(() => {
    const pts = [
      new THREE.Vector3(-0.25, 0.5, -0.5),
      new THREE.Vector3(-0.52, 0.72, -0.4),
      new THREE.Vector3(-0.55, 0.98, -0.12),
      new THREE.Vector3(-0.3, 1.1, 0.08),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.075, 12, false);
  }, []);

  const inletPipe = useMemo(() => {
    const pts = [
      new THREE.Vector3(0.06, 0.46, -0.23),
      new THREE.Vector3(0.08, 0.42, -0.35),
      new THREE.Vector3(0.09, 0.38, -0.44),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.055, 10, false);
  }, []);

  const airBoxPipe = useMemo(() => {
    const pts = [new THREE.Vector3(-0.35, 0.34, -0.5), new THREE.Vector3(-0.44, 0.33, -0.6)];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.06, 10, false);
  }, []);

  useFrame((_, dt) => {
    const { rpm, spool } = useEngineStore.getState();
    // compressor spins ~14× engine speed, scaled by spool (visible lag on spool-up)
    spin.current += (0.2 + spool * 1.8) * (rpm / 60) * Math.PI * 2 * dt * 14;
    if (wheel.current) wheel.current.rotation.x = spin.current;
    MAT.turbo.emissiveIntensity = 0.08 + 0.55 * spool + 0.25 * (rpm / 8000);
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
        {/* wastegate actuator */}
        <mesh material={MAT.alu} position={[0, 0.19, -0.06]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
        </mesh>
      </group>

      {/* ---- compressor bell (open toward -X) ---- */}
      <mesh material={MAT.alu} rotation-z={-Math.PI / 2} position={[TC.x - 0.2, TC.y, TC.z]} castShadow>
        <cylinderGeometry args={[0.06, 0.17, 0.2, 28, 1, true]} />
      </mesh>
      <mesh material={MAT.steel} rotation-y={Math.PI / 2} position={[TC.x - 0.3, TC.y, TC.z]}>
        <torusGeometry args={[0.165, 0.016, 10, 40]} />
      </mesh>

      {/* ---- spinning compressor wheel ---- */}
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

      {/* ---- center plate + shaft ---- */}
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[TC.x - 0.02, TC.y, TC.z]}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 24]} />
      </mesh>
      <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[TC.x - 0.08, TC.y, TC.z]}>
        <cylinderGeometry args={[0.03, 0.03, 0.14, 12]} />
      </mesh>

      {/* ---- plumbing ---- */}
      <mesh geometry={chargePipe} material={MAT.intake} castShadow />
      <mesh geometry={inletPipe} material={MAT.iron} />
      <mesh geometry={airBoxPipe} material={MAT.rubber} />
      <mesh material={MAT.blockDark} position={[-0.52, 0.34, -0.66]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.22]} />
      </mesh>
    </group>
  );
}
