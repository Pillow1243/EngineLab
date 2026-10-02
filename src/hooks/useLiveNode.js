import { useEffect, useRef } from 'react';
import { useEngineStore } from '../store/engineStore.js';

/**
 * 60fps-friendly direct-DOM binding to the Zustand store.
 * Bypasses React re-renders: the callback is applied via requestAnimationFrame
 * whenever the store changes, writing straight to the DOM node.
 */
export function useLiveNode(apply) {
  const ref = useRef(null);
  const fn = useRef(apply);
  fn.current = apply;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (el) fn.current(el, useEngineStore.getState());
    };
    const unsub = useEngineStore.subscribe(() => {
      if (!raf) raf = requestAnimationFrame(tick);
    });
    tick();
    return () => {
      unsub();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}

export const useLiveText = (sel, fmt = (v) => v) =>
  useLiveNode((el, s) => {
    el.textContent = fmt(sel(s));
  });

export const useLiveAttribute = (sel, attr, fmt = (v) => v) =>
  useLiveNode((el, s) => {
    el.setAttribute(attr, fmt(sel(s)));
  });

export const useLiveStylePart = (sel, fn) =>
  useLiveNode((el, s) => {
    Object.assign(el.style, fn(sel(s)));
  });
