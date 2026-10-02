import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import { MAT } from './materials.js';
import { visualAngle } from './engineGeometry.js';

const BX = -0.815; // belt plane (X)
const CRANK = { y: 0.34, r: 0.155 };
const CAM = { y: 0.74, r: 0.235 };

/**
 * Timing belt drive: crank + cam pulleys, idler tensioner and a
 * ribbed belt whose texture scrolls with engine speed.
 */
export default function TimingBelt() {
  const crankPulley = useRef();
  const camPulley = useRef();
  const idler = useRef();
  const angle = useRef(0);

  const { beltGeo, beltMat } = useMemo(() => {
    const p = (y, z) => new THREE.Vector3(BX, y, z);
    const pts = [
      p(CRANK.y - CRANK.r - 0.012, 0),
      p(CRANK.y, -(CRANK.r + 0.012)),
      p(CAM.y, -(CAM.r + 0.012)),
      p(CAM.y + CAM.r + 0.012, 0),
      p(CAM.y, CAM.r + 0.012),
      p(CRANK.y, CRANK.r + 0.012),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.6);
    const geo = new THREE.TubeGeometry(curve, 80, 0.021, 10, true);

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#101318';
    g.fillRect(0, 0, 256, 32);
    g.fillStyle = '#2c333f';
    for (let x = 0; x < 256; x += 32) g.fillRect(x + 8, 5, 12, 22);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 1);

    const mat = new THREE.MeshStandardMaterial({
      color: '#9aa3ad',
      metalness: 0.25,
      roughness: 0.65,
      map: tex,
    });
    return { beltGeo: geo, beltMat: mat };
  }, []);

  useFrame((_, dt) => {
    const { rpm } = useEngineStore.getState();
    angle.current += (rpm / 60) * Math.PI * 2 * dt;
    const a = angle.current % (Math.PI * 2);
    if (crankPulley.current) crankPulley.current.rotation.x = a;
    if (camPulley.current) camPulley.current.rotation.x = a / 2;
    if (idler.current) idler.current.rotation.x = a * 3;
    beltMat.map.offset.x -= (rpm / 60) * dt * 0.8;
  });

  return (
    <group>
      {/* front cover plate */}
      <mesh material={MAT.blockDark} position={[BX + 0.055, 0.55, 0]} castShadow>
        <boxGeometry args={[0.03, 0.78, 0.46]} />
      </mesh>

      {/* cam shaft stub */}
      <mesh material={MAT.steelDark} rotation-z={Math.PI / 2} position={[-0.765, CAM.y, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.08, 12]} />
      </mesh>

      {/* crank pulley */}
      <group ref={crankPulley} position={[BX, CRANK.y, 0]}>
        <mesh material={MAT.steel} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[CRANK.r, CRANK.r, 0.07, 28]} />
        </mesh>
        <mesh material={MAT.alu} position={[0, CRANK.r * 0.55, 0]}>
          <boxGeometry args={[0.06, 0.05, 0.02]} />
        </mesh>
      </group>

      {/* cam pulley */}
      <group ref={camPulley} position={[BX, CAM.y, 0]}>
        <mesh material={MAT.steel} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[CAM.r, CAM.r, 0.075, 32]} />
        </mesh>
        <mesh material={MAT.alu} rotation-z={Math.PI / 2} position={[0.042, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        </mesh>
        <mesh material={MAT.alu} position={[0, CAM.r * 0.55, 0]}>
          <boxGeometry args={[0.06, 0.05, 0.02]} />
        </mesh>
      </group>

      {/* idler tensioner */}
      <group ref={idler} position={[BX, 0.52, 0.235]}>
        <mesh material={MAT.alu} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.055, 0.055, 0.05, 18]} />
        </mesh>
      </group>
      <mesh material={MAT.steelDark} position={[BX + 0.02, 0.56, 0.19]}>
        <boxGeometry args={[0.04, 0.12, 0.09]} />
      </mesh>

      {/* the belt */}
      <mesh geometry={beltGeo} material={beltMat} />
    </group>
  );
}
