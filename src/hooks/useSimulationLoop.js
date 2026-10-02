import { useEffect } from 'react';
import { useEngineStore } from '../store/engineStore.js';
import { stepSim } from '../sim/simulation.js';
import { audioEngine } from '../audio/AudioEngine.js';

/**
 * The single simulation heartbeat:
 *   physics step (fixed rAF) → store update → audio parameter update → FX events.
 * Mounted exactly once at the App root.
 */
export function useSimulationLoop() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let prevLock = 0;

    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      const s = useEngineStore.getState();
      const out = stepSim(s, dt);
      const { events, ...next } = out;

      useEngineStore.setState(next);

      // DCT clunk when a shift lockout begins
      if (next.shiftLock > 0 && prevLock === 0) audioEngine.handleEvent({ type: 'shift' });
      prevLock = next.shiftLock;

      audioEngine.update({ ...s, ...next });
      for (const e of events) audioEngine.handleEvent(e);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
