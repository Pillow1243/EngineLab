import { useEffect } from 'react';
import { useEngineStore } from '../store/engineStore.js';
import { togglePower } from '../store/actions.js';

/**
 * Keyboard controls:
 *   ↑        throttle
 *   ↓        brake
 *   ← / →    shift down / up (in D)
 *   R / N / D gear mode
 *   Space    engine start / stop
 */
export function useKeyboard() {
  useEffect(() => {
    const st = () => useEngineStore.getState();

    const down = (e) => {
      switch (e.code) {
        case 'ArrowUp':
          e.preventDefault();
          if (!e.repeat) st().setThrottle(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!e.repeat) st().setBrake(1);
          break;
        case 'ArrowRight':
          if (!e.repeat) st().shiftUp();
          break;
        case 'ArrowLeft':
          if (!e.repeat) st().shiftDown();
          break;
        case 'KeyR':
          if (!e.repeat) st().setGearMode('R');
          break;
        case 'KeyN':
          if (!e.repeat) st().setGearMode('N');
          break;
        case 'KeyD':
          if (!e.repeat) st().setGearMode('D');
          break;
        case 'Space':
          e.preventDefault();
          if (!e.repeat) togglePower();
          break;
        default:
          return;
      }
    };

    const up = (e) => {
      if (e.code === 'ArrowUp') st().setThrottle(0);
      if (e.code === 'ArrowDown') st().setBrake(0);
    };

    const blur = () => {
      const s = st();
      s.setThrottle(0);
      s.setBrake(0);
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
}
