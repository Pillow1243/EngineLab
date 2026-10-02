import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const VIEWS = {
  front: { pos: [-3.3, 1.05, 1.35], tgt: [-0.1, 0.55, 0] },
  side: { pos: [0.25, 0.85, 3.7], tgt: [0.15, 0.52, 0] },
  top: { pos: [0.2, 4.4, 0.9], tgt: [0.15, 0.38, 0] },
  detail: { pos: [-1.85, 0.82, 1.85], tgt: [-0.05, 0.65, 0] },
  turbo: { pos: [-1.45, 0.62, -2.05], tgt: [-0.08, 0.45, -0.38] },
};

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Compute aspect-adjusted camera position so portrait phones never clip the engine. */
function getAspectAdjustedPos(basePos, tgt, width, height) {
  const aspect = width / Math.max(1, height);
  // On narrow portrait viewports (aspect < 1.15), pull the camera back proportionally
  const distScale = aspect < 1.15 ? Math.min(1.68, Math.pow(1.15 / Math.max(0.42, aspect), 0.52)) : 1;
  const p = new THREE.Vector3(...basePos);
  const t = new THREE.Vector3(...tgt);
  return t.clone().add(p.sub(t).multiplyScalar(distScale));
}

/**
 * Smoothly flies the orbit camera to a preset whenever `view` or viewport aspect changes.
 * The user can still orbit/zoom freely afterwards.
 */
export default function CameraRig({ view }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);
  const anim = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!controls) return;
    const v = VIEWS[view] || VIEWS.front;
    const toP = getAspectAdjustedPos(v.pos, v.tgt, size.width, size.height);
    const toT = new THREE.Vector3(...v.tgt);

    if (!initialized.current) {
      initialized.current = true;
      camera.position.copy(toP);
      controls.target.copy(toT);
      controls.update();
      return;
    }

    anim.current = {
      t: 0,
      fromP: camera.position.clone(),
      toP,
      fromT: controls.target.clone(),
      toT,
    };
  }, [view, controls, camera, size.width, size.height]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + dt / 0.75);
    const e = easeInOutCubic(a.t);
    camera.position.lerpVectors(a.fromP, a.toP, e);
    controls.target.lerpVectors(a.fromT, a.toT, e);
    controls.update();
    if (a.t >= 1) anim.current = null;
  });

  return null;
}
