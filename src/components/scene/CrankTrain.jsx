import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { MAT } from './materials.js';
import { CRANK_Y, R, L, XS, PHASES, DEG, visualAngle } from './engineGeometry.js';

// 720° (4π) firing angles for cylinders 1..5 to produce exact 1-2-4-5-3 firing order
// Cylinder crank TDCs occur when (a0 + PHASES[i]*DEG) ≡ 0 (mod 2π).
// In a 4-stroke cycle (4π), each cylinder fires on one of its two TDCs:
const FIRE_ANGLES_720 = [
  0, // Cyl 1: 0°
  (360 - 144) * DEG, // Cyl 2: 216°
  (720 - 216) * DEG, // Cyl 3: 504° (4th to fire? Wait: 0, 144, 288, 432, 576!)
  (360 - 288) * DEG, // Cyl 4
  (360 - 72) * DEG, // Cyl 5
];
// Exact 144°-spaced firing sequence for 1-2-4-5-3 across 720°:
const EXACT_FIRE_720 = [
  0 * DEG, // Cyl 1 fires at 0°
  144 * DEG, // Cyl 2 fires at 144°
  576 * DEG, // Cyl 3 fires at 576° (5th in 1-2-4-5-3)
  288 * DEG, // Cyl 4 fires at 288° (3rd in 1-2-4-5-3)
  432 * DEG, // Cyl 5 fires at 432° (4th in 1-2-4-5-3)
];

const TWO_PI = Math.PI * 2;
const FOUR_PI = Math.PI * 4;

/**
 * Crank train + DOHC Valvetrain + Live 1-2-4-5-3 Combustion Flashes:
 * - Main shaft, 5 crank throws, pistons, connecting rods, cylinder liners
 * - Dual Overhead Camshafts (intake + exhaust) with cam lobes & 10 moving valves
 * - Combustion plasma glow domes inside each cylinder head
 */
export default function CrankTrain() {
  const pistons = useRef([]);
  const rods = useRef([]);
  const throws = useRef([]);
  const inValves = useRef([]);
  const exValves = useRef([]);
  const inCam = useRef();
  const exCam = useRef();
  const flashes = useRef([]);
  const angle = useRef(0);

  // Create 5 individual emissive materials for the cylinder combustion flashes
  const flashMats = useMemo(
    () =>
      XS.map(
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
    const { rpm, running, throttle, boost } = useEngineStore.getState();
    angle.current = (angle.current + (rpm / 60) * TWO_PI * dt) % FOUR_PI;
    const a0 = angle.current;
    visualAngle.value = a0 % TWO_PI;

    // Camshafts rotate at 1/2 crank speed
    if (inCam.current) inCam.current.rotation.x = a0 * 0.5;
    if (exCam.current) exCam.current.rotation.x = -a0 * 0.5;

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

      // 4-stroke cycle phase (0..4π) relative to this cylinder's firing TDC
      const cyc = ((a0 - EXACT_FIRE_720[i]) % FOUR_PI + FOUR_PI) % FOUR_PI;

      // Valve lift:
      // Exhaust stroke is roughly 1.1π .. 2.0π; Intake stroke is roughly 2.0π .. 2.9π
      const exLift = cyc > Math.PI * 1.05 && cyc < Math.PI * 2.02
        ? Math.sin(((cyc - Math.PI * 1.05) / (Math.PI * 0.97)) * Math.PI)
        : 0;
      const inLift = cyc > Math.PI * 1.98 && cyc < Math.PI * 2.95
        ? Math.sin(((cyc - Math.PI * 1.98) / (Math.PI * 0.97)) * Math.PI)
        : 0;

      if (inValves.current[i]) inValves.current[i].position.y = 0.89 - inLift * 0.036;
      if (exValves.current[i]) exValves.current[i].position.y = 0.89 - exLift * 0.036;

      // Combustion flash right after firing TDC (0 .. 0.65 rad)
      const mat = flashMats[i];
      const fl = flashes.current[i];
      if (running && rpm > 180 && cyc < 0.72) {
        const p = 1 - cyc / 0.72;
        const load = 0.45 + 0.55 * Math.min(1, throttle + boost * 0.5);
        mat.opacity = Math.pow(p, 1.5) * 0.92 * load;
        // Spark starts electric cyan-blue then turns fiery orange
        if (cyc < 0.14) {
          mat.color.setHex(0x60a5fa);
        } else {
          mat.color.setHex(0xff7b1a);
        }
        if (fl) fl.scale.setScalar(0.82 + 0.28 * (1 - p));
      } else {
        mat.opacity = 0;
      }
    }
  });

  return (
    <group>
      {/* main crankshaft */}
      <mesh material={MAT.steel} rotation-z={Math.PI / 2} position={[0, CRANK_Y, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 20]} />
      </mesh>
      {/* front stub (drives the crank pulley) */}
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[-0.765, CRANK_Y, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 14]} />
      </mesh>

      {/* DOHC Intake & Exhaust Camshafts */}
      <group ref={inCam} position={[0, 0.965, 0.068]}>
        <mesh material={MAT.steel} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 1.46, 14]} />
        </mesh>
        {XS.map((x, i) => (
          <mesh
            key={i}
            material={MAT.alu}
            position={[x, 0.012, 0]}
            rotation-x={(PHASES[i] * DEG) / 2}
          >
            <boxGeometry args={[0.032, 0.048, 0.028]} />
          </mesh>
        ))}
      </group>
      <group ref={exCam} position={[0, 0.965, -0.068]}>
        <mesh material={MAT.steel} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 1.46, 14]} />
        </mesh>
        {XS.map((x, i) => (
          <mesh
            key={i}
            material={MAT.alu}
            position={[x, 0.012, 0]}
            rotation-x={(PHASES[i] * DEG) / 2 + 1.1}
          >
            <boxGeometry args={[0.032, 0.048, 0.028]} />
          </mesh>
        ))}
      </group>

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
            {/* 3 piston compression & oil control rings */}
            <mesh material={MAT.steelDark} rotation-x={Math.PI / 2} position={[0, 0.108, 0]}>
              <torusGeometry args={[0.146, 0.004, 8, 32]} />
            </mesh>
            <mesh material={MAT.steelDark} rotation-x={Math.PI / 2} position={[0, 0.092, 0]}>
              <torusGeometry args={[0.146, 0.004, 8, 32]} />
            </mesh>
            <mesh material={MAT.brass} rotation-x={Math.PI / 2} position={[0, 0.076, 0]}>
              <torusGeometry args={[0.146, 0.0035, 8, 32]} />
            </mesh>
            {/* wrist pin */}
            <mesh material={MAT.alu} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
            </mesh>
          </group>

          {/* ---- reciprocating intake & exhaust valves ---- */}
          <group ref={(el) => (inValves.current[i] = el)} position={[x, 0.89, 0.062]}>
            <mesh material={MAT.steel}>
              <cylinderGeometry args={[0.007, 0.007, 0.11, 8]} />
            </mesh>
            <mesh material={MAT.alu} position={[0, -0.055, 0]}>
              <cylinderGeometry args={[0.034, 0.012, 0.012, 14]} />
            </mesh>
          </group>
          <group ref={(el) => (exValves.current[i] = el)} position={[x, 0.89, -0.062]}>
            <mesh material={MAT.steel}>
              <cylinderGeometry args={[0.007, 0.007, 0.11, 8]} />
            </mesh>
            <mesh material={MAT.alu} position={[0, -0.055, 0]}>
              <cylinderGeometry args={[0.031, 0.012, 0.012, 14]} />
            </mesh>
          </group>

          {/* ---- combustion flash dome (fires in 1-2-4-5-3 sequence) ---- */}
          <group ref={(el) => (flashes.current[i] = el)} position={[x, 0.79, 0]}>
            <mesh material={flashMats[i]}>
              <cylinderGeometry args={[0.138, 0.142, 0.09, 20]} />
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
