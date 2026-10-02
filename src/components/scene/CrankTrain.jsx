import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { MAT } from './materials.js';
import { CRANK_Y, R, L, XS, PHASES, DEG, visualAngle } from './engineGeometry.js';

/**
 * Crank train: main shaft, 5 crank throws, pistons, connecting rods,
 * cylinder liners. Kinematics are solved every frame from the live RPM.
 * Piston height:  y(α) = R·cos α + √(L² − R²·sin²α)
 */
export default function CrankTrain() {
  const pistons = useRef([]);
  const rods = useRef([]);
  const throws = useRef([]);
  const angle = useRef(0);

  useFrame((_, dt) => {
    const { rpm } = useEngineStore.getState();
    angle.current = (angle.current + (rpm / 60) * Math.PI * 2 * dt) % (Math.PI * 2);
    const a0 = angle.current;
    visualAngle.value = a0;

    for (let i = 0; i < 5; i++) {
      const a = a0 + PHASES[i] * DEG;
      const sinA = Math.sin(a);
      const cosA = Math.cos(a);
      const pinY = CRANK_Y + (R * cosA + Math.sqrt(L * L - R * R * sinA * sinA));

      if (throws.current[i]) throws.current[i].rotation.x = a;
      if (pistons.current[i]) pistons.current[i].position.y = pinY;

      const rod = rods.current[i];
      if (rod) {
        const cpY = CRANK_Y + R * cosA;
        const cpZ = R * sinA;
        rod.position.set(XS[i], (pinY + cpY) / 2, cpZ / 2);
        rod.rotation.x = Math.atan2(-cpZ, pinY - cpY);
      }
    }
  });

  return (
    <group>
      {/* main shaft */}
      <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, CRANK_Y, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 20]} />
      </mesh>
      {/* front stub (drives the crank pulley) */}
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[-0.765, CRANK_Y, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 14]} />
      </mesh>

      {XS.map((x, i) => (
        <group key={i}>
          {/* ---- crank throw (webs + pin + counterweight), rotates ---- */}
          <group ref={(el) => (throws.current[i] = el)} position={[x, CRANK_Y, 0]}>
            <mesh material={MAT.steelDark} position={[0, R * 0.5, 0]} castShadow>
              <boxGeometry args={[0.055, R + 0.16, 0.085]} />
            </mesh>
            <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, R, 0]}>
              <cylinderGeometry args={[0.042, 0.042, 0.17, 16]} />
            </mesh>
            <mesh material={MAT.steelDark} position={[0, -0.085, 0]}>
              <boxGeometry args={[0.075, 0.15, 0.15]} />
            </mesh>
          </group>

          {/* ---- connecting rod (positioned + oriented each frame) ---- */}
          <group ref={(el) => (rods.current[i] = el)} position={[x, 0.6, 0]}>
            <mesh material={MAT.rod} castShadow>
              <boxGeometry args={[0.042, L, 0.026]} />
            </mesh>
            <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, -L / 2, 0]}>
              <cylinderGeometry args={[0.052, 0.052, 0.05, 16]} />
            </mesh>
            <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, L / 2, 0]}>
              <cylinderGeometry args={[0.036, 0.036, 0.04, 12]} />
            </mesh>
          </group>

          {/* ---- piston (translates up & down) ---- */}
          <group ref={(el) => (pistons.current[i] = el)} position={[x, 0.6, 0]}>
            <mesh material={MAT.piston} position={[0, 0.05, 0]} castShadow>
              <cylinderGeometry args={[0.145, 0.145, 0.15, 24]} />
            </mesh>
            <mesh material={MAT.steelDark} rotation-x={Math.PI / 2} position={[0, 0.105, 0]}>
              <torusGeometry args={[0.145, 0.004, 8, 32]} />
            </mesh>
            <mesh material={MAT.steelDark} rotation-x={Math.PI / 2} position={[0, 0.09, 0]}>
              <torusGeometry args={[0.145, 0.004, 8, 32]} />
            </mesh>
            {/* wrist pin */}
            <mesh material={MAT.alu} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
            </mesh>
          </group>

          {/* ---- translucent cylinder liner ---- */}
          <mesh material={MAT.liner} position={[x, 0.6, 0]}>
            <cylinderGeometry args={[0.158, 0.158, 0.5, 24, 1, true]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
