import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, Grid, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore.js';
import EngineModel from './EngineModel.jsx';
import CameraRig from './CameraRig.jsx';

/**
 * The 3D viewport: dark studio environment, procedural reflections
 * (no network HDRIs), soft shadows and an orbit camera.
 */
export default function EngineScene() {
  const view = useEngineStore((s) => s.view);

  return (
    <Canvas
      shadows
      dpr={[1, 1.65]}
      camera={{ position: [-3.3, 1.05, 1.35], fov: 40 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      className="!absolute inset-0"
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[#04060a] px-6 text-center text-sm text-slate-300">
          This 3D engine view needs WebGL. Enable hardware acceleration or try a modern browser.
        </div>
      }
    >
      <AdaptiveDpr />
      <color attach="background" args={['#04060a']} />
      <fog attach="fog" args={['#04060a', 9, 20]} />

      {/* studio lighting */}
      <ambientLight intensity={0.22} />
      <spotLight
        position={[3.6, 4.6, 2.8]}
        angle={0.5}
        penumbra={0.85}
        intensity={340}
        distance={24}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-4.2, 2.6, -3.2]} color="#38bdf8" intensity={70} distance={14} />
      <pointLight position={[2.2, 1.1, -2.6]} color="#fb923c" intensity={26} distance={10} />
      <pointLight position={[-2.6, 1.4, 3.4]} color="#a5b4fc" intensity={26} distance={12} />

      {/* procedural environment for metallic reflections (offline-safe) */}
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer
            intensity={2.2}
            rotation-x={Math.PI / 2}
            position={[0, 5, 0]}
            scale={[9, 9, 1]}
            color="#dbeafe"
          />
          <Lightformer
            intensity={1.4}
            rotation-y={Math.PI / 2}
            position={[-6, 1.5, 0]}
            scale={[7, 2.5, 1]}
            color="#38bdf8"
          />
          <Lightformer
            intensity={1.0}
            rotation-y={-Math.PI / 2}
            position={[6, 1.2, 0]}
            scale={[7, 2, 1]}
            color="#fdba74"
          />
          <Lightformer
            intensity={0.7}
            position={[0, 2, -6]}
            scale={[10, 3, 1]}
            color="#1e293b"
          />
        </Environment>
        <EngineModel />
      </Suspense>

      {/* showroom floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[6.5, 64]} />
        <meshStandardMaterial color="#07090e" roughness={0.95} metalness={0.1} />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#16202e"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#24344d"
        fadeDistance={13}
        fadeStrength={1.5}
        infiniteGrid
      />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
        <ringGeometry args={[2.35, 2.38, 96]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} />
      </mesh>

      <CameraRig view={view} />
      <OrbitControls
        makeDefault
        regress
        enableDamping
        dampingFactor={0.08}
        minDistance={1.4}
        maxDistance={7.5}
        maxPolarAngle={1.5}
        target={[-0.15, 0.55, 0]}
      />
    </Canvas>
  );
}
