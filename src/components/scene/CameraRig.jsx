import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

export const VIEWS = {
  front: { pos: [-3.3, 1.05, 1.35], tgt: [-0.15, 0.55, 0] },
  side: { pos: [0.4, 0.85, 3.7], tgt: [0.2, 0.5, 0] },
  top: { pos: [0.3, 4.4, 0.9], tgt: [0.2, 0.35, 0] },
  detail: { pos: [-1.9, 0.7, -2.1], tgt: [-0.15, 0.42, -0.4] },
};

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Smoothly flies the orbit camera to a preset whenever `view` changes.
 * The user can still orbit/zoom freely afterwards.
 */
export default function CameraRig({ view }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const anim = useRef(null);
  const prev = useRef(null);

  useEffect(() => {
    if (controls && prev.current !== null && prev.current !== view) {
      const v = VIEWS[view] || VIEWS.front;
      anim.current = {
        t: 0,
        fromP: camera.position.clone(),
        toP: v.pos.slice(),
        fromT: controls.target.clone(),
        toT: v.tgt.slice(),
      };
    }
    prev.current = view;
  }, [view, controls, camera]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + dt / 0.85);
    const e = easeInOutCubic(a.t);
    camera.position.lerpVectors(a.fromP, a.toP, e);
    controls.target.lerpVectors(a.fromT, a.toT, e);
    controls.update();
    if (a.t >= 1) anim.current = null;
  });

  return null;
}
