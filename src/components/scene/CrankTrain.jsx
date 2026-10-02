import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { ENGINES } from '../../sim/constants.js';
import { MAT } from './materials.js';
import { CRANK_Y, R, L, DEG, visualAngle } from './engineGeometry.js';

const TWO_PI = Math.PI * 2;
const FOUR_PI = Math.PI * 4;
const V_ANGLE = 0.68; // ~39° per bank for V8 layout

/**
 * Dynamic CrankTrain + DOHC Valvetrain + Live Combustion Flashes.
 * Supports I4 (4-cyl), I5 (5-cyl), I6 (6-cyl), and V8 (8-cyl 90° V-block)!
 * Also renders Gold Forged connecting rods when `internalsUpgrade === 'FORGED'`.
 */
export default function CrankTrain() {
  const engineType = useEngineStore((s) => s.engineType);
  const internalsUpgrade = useEngineStore((s) => s.internalsUpgrade);
  const spec = ENGINES[engineType] || ENGINES.I5_29;
  const isV8 = spec.layout === 'v8';
  const count = spec.cylinders;
  const rodMat = internalsUpgrade === 'FORGED' ? MAT.forgedGold : MAT.rod;

  const pistons = useRef([]);
  const rods = useRef([]);
  const throws = useRef([]);
  const inValves = useRef([]);
  const exValves = useRef([]);
  const inCam = useRef();
  const exCam = useRef();
  const flashes = useRef([]);
  const angle = useRef(0);

  // Up to 8 individual emissive materials for cylinder combustion flashes
  const flashMats = useMemo(
    () =>
      Array.from({ length: 8 }).map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#ff9500',
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );

  useFrame((_, dt) => {
    const { rpm, running, throttle, boost, nosActive } = useEngineStore.getState();
    angle.current = (angle.current + (rpm / 60) * TWO_PI * dt) % FOUR_PI;
    const a0 = angle.current;
    visualAngle.value = a0 % TWO_PI;

    if (inCam.current) inCam.current.rotation.x = a0 * 0.5;
    if (exCam.current) exCam.current.rotation.x = -a0 * 0.5;

    for (let i = 0; i < count; i++) {
      const a = a0 + spec.crankPhases[i] * DEG;
      const sinA = Math.sin(a);
      const cosA = Math.cos(a);
      const sDist = R * cosA + Math.sqrt(L * L - R * R * sinA * sinA);

      if (throws.current[i]) throws.current[i].rotation.x = a;

      if (!isV8) {
        const pinY = CRANK_Y + sDist;
        if (pistons.current[i]) pistons.current[i].position.y = pinY;
        const rod = rods.current[i];
        if (rod) {
          const cpY = CRANK_Y + R * cosA;
          const cpZ = R * sinA;
          rod.position.set(spec.xs[i], (pinY + cpY) / 2, cpZ / 2);
          rod.rotation.x = Math.atan2(-cpZ, pinY - cpY);
        }
      } else {
        // V8: cylinders 0..3 on +Z bank (+V_ANGLE), cylinders 4..7 on -Z bank (-V_ANGLE)
        const bankSign = i < 4 ? 1 : -1;
        const bankAngle = bankSign * V_ANGLE;
        const sinB = Math.sin(bankAngle);
        const cosB = Math.cos(bankAngle);
        const pinY = CRANK_Y + sDist * cosB;
        const pinZ = sDist * sinB;

        if (pistons.current[i]) {
          pistons.current[i].position.set(spec.xs[i], pinY, pinZ);
          pistons.current[i].rotation.x = bankAngle;
        }
        const rod = rods.current[i];
        if (rod) {
          const cpY = CRANK_Y + R * cosA;
          const cpZ = R * sinA;
          rod.position.set(spec.xs[i], (pinY + cpY) / 2, (pinZ + cpZ) / 2);
          rod.rotation.x = Math.atan2(pinZ - cpZ, pinY - cpY);
        }
      }

      // 4-stroke cycle phase (0..4π) relative to this cylinder's firing TDC
      const fireRad = spec.fireAngles720[i] * DEG;
      const cyc = ((a0 - fireRad) % FOUR_PI + FOUR_PI) % FOUR_PI;

      const exLift =
        cyc > Math.PI * 1.05 && cyc < Math.PI * 2.02
          ? Math.sin(((cyc - Math.PI * 1.05) / (Math.PI * 0.97)) * Math.PI)
          : 0;
      const inLift =
        cyc > Math.PI * 1.98 && cyc < Math.PI * 2.95
          ? Math.sin(((cyc - Math.PI * 1.98) / (Math.PI * 0.97)) * Math.PI)
          : 0;

      if (!isV8) {
        if (inValves.current[i]) inValves.current[i].position.y = 0.89 - inLift * 0.036;
        if (exValves.current[i]) exValves.current[i].position.y = 0.89 - exLift * 0.036;
      }

      // Combustion flash right after firing TDC
      const mat = flashMats[i];
      const fl = flashes.current[i];
      if (running && rpm > 180 && cyc < 0.75) {
        const p = 1 - cyc / 0.75;
        const load = 0.45 + 0.55 * Math.min(1, throttle + boost * 0.5);
        mat.opacity = Math.pow(p, 1.45) * 0.95 * load;
        if (nosActive && throttle > 0.4) {
          mat.color.setHex(0x38bdf8); // Nitrous cyan-blue plasma flame!
        } else if (cyc < 0.15) {
          mat.color.setHex(0x60a5fa);
        } else {
          mat.color.setHex(0xff7b1a);
        }
        if (fl) fl.scale.setScalar(0.84 + 0.28 * (1 - p));
      } else {
        mat.opacity = 0;
      }
    }
  });

  const bore = count === 6 ? 0.125 : count === 4 ? 0.15 : 0.142;

  return (
    <group key={engineType}>
      {/* main crankshaft */}
      <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, CRANK_Y, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, count === 6 ? 1.68 : 1.5, 20]} />
      </mesh>
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[-0.765, CRANK_Y, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 14]} />
      </mesh>

      {/* Inline DOHC Camshafts */}
      {!isV8 && (
        <>
          <group ref={inCam} position={[0, 0.965, 0.068]}>
            <mesh material={MAT.steel} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.018, 0.018, count === 6 ? 1.62 : 1.46, 14]} />
            </mesh>
            {spec.xs.map((x, i) => (
              <mesh
                key={i}
                material={MAT.alu}
                position={[x, 0.012, 0]}
                rotation-x={(spec.crankPhases[i] * DEG) / 2}
              >
                <boxGeometry args={[0.03, 0.048, 0.028]} />
              </mesh>
            ))}
          </group>
          <group ref={exCam} position={[0, 0.965, -0.068]}>
            <mesh material={MAT.steel} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.018, 0.018, count === 6 ? 1.62 : 1.46, 14]} />
            </mesh>
            {spec.xs.map((x, i) => (
              <mesh
                key={i}
                material={MAT.alu}
                position={[x, 0.012, 0]}
                rotation-x={(spec.crankPhases[i] * DEG) / 2 + 1.1}
              >
                <boxGeometry args={[0.03, 0.048, 0.028]} />
              </mesh>
            ))}
          </group>
        </>
      )}

      {spec.xs.map((x, i) => {
        const bankSign = isV8 ? (i < 4 ? 1 : -1) : 0;
        const bankAngle = bankSign * V_ANGLE;
        const sinB = Math.sin(bankAngle);
        const cosB = Math.cos(bankAngle);
        const linerDist = 0.26;
        const flashDist = 0.44;

        return (
          <group key={i}>
            {/* crank throw */}
            <group ref={(el) => (throws.current[i] = el)} position={[x, CRANK_Y, 0]}>
              <mesh material={MAT.steelDark} position={[0, R * 0.5, 0]} castShadow>
                <boxGeometry args={[0.048, R + 0.15, 0.082]} />
              </mesh>
              <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, R, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.14, 16]} />
              </mesh>
              <mesh material={MAT.steelDark} position={[0, -0.08, 0]}>
                <boxGeometry args={[0.065, 0.14, 0.14]} />
              </mesh>
            </group>

            {/* connecting rod */}
            <group ref={(el) => (rods.current[i] = el)} position={[x, 0.6, 0]}>
              <mesh material={rodMat} castShadow>
                <boxGeometry args={[0.038, L, 0.024]} />
              </mesh>
              <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, -L / 2, 0]}>
                <cylinderGeometry args={[0.048, 0.048, 0.045, 16]} />
              </mesh>
              <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, L / 2, 0]}>
                <cylinderGeometry args={[0.034, 0.034, 0.038, 12]} />
              </mesh>
            </group>

            {/* piston */}
            <group ref={(el) => (pistons.current[i] = el)} position={[x, 0.6, 0]}>
              <mesh
                material={internalsUpgrade === 'FORGED' ? MAT.forgedGold : MAT.piston}
                position={[0, 0.05, 0]}
                castShadow
              >
                <cylinderGeometry args={[bore, bore, 0.14, 24]} />
              </mesh>
              <mesh material={MAT.steelDark} rotation-x={Math.PI / 2} position={[0, 0.102, 0]}>
                <torusGeometry args={[bore + 0.001, 0.004, 8, 28]} />
              </mesh>
              <mesh material={MAT.steelDark} rotation-x={Math.PI / 2} position={[0, 0.086, 0]}>
                <torusGeometry args={[bore + 0.001, 0.004, 8, 28]} />
              </mesh>
              <mesh material={MAT.alu} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.028, 0.028, bore * 1.65, 12]} />
              </mesh>
            </group>

            {/* Inline reciprocating valves */}
            {!isV8 && (
              <>
                <group ref={(el) => (inValves.current[i] = el)} position={[x, 0.89, 0.062]}>
                  <mesh material={MAT.steel}>
                    <cylinderGeometry args={[0.007, 0.007, 0.11, 8]} />
                  </mesh>
                  <mesh material={MAT.alu} position={[0, -0.055, 0]}>
                    <cylinderGeometry args={[0.031, 0.012, 0.012, 14]} />
                  </mesh>
                </group>
                <group ref={(el) => (exValves.current[i] = el)} position={[x, 0.89, -0.062]}>
                  <mesh material={MAT.steel}>
                    <cylinderGeometry args={[0.007, 0.007, 0.11, 8]} />
                  </mesh>
                  <mesh material={MAT.alu} position={[0, -0.055, 0]}>
                    <cylinderGeometry args={[0.029, 0.012, 0.012, 14]} />
                  </mesh>
                </group>
              </>
            )}

            {/* combustion flash dome */}
            <group
              ref={(el) => (flashes.current[i] = el)}
              position={[
                x,
                isV8 ? CRANK_Y + flashDist * cosB : 0.79,
                isV8 ? flashDist * sinB : 0,
              ]}
              rotation-x={isV8 ? bankAngle : 0}
            >
              <mesh material={flashMats[i]}>
                <cylinderGeometry args={[bore * 0.94, bore * 0.96, 0.085, 20]} />
              </mesh>
            </group>

            {/* translucent cylinder liner */}
            <mesh
              material={MAT.liner}
              position={[
                x,
                isV8 ? CRANK_Y + linerDist * cosB : 0.6,
                isV8 ? linerDist * sinB : 0,
              ]}
              rotation-x={isV8 ? bankAngle : 0}
            >
              <cylinderGeometry args={[bore + 0.012, bore + 0.012, isV8 ? 0.44 : 0.5, 24, 1, true]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
