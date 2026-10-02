import { useEffect } from 'react';
import { useEngineStore } from '../store/engineStore.js';
import { togglePower, toggleMuteAudio } from '../store/actions.js';
import { audioEngine } from '../audio/AudioEngine.js';

/**
 * Keyboard controls:
 *   ↑ / W      throttle
 *   ↓ / S      brake
 *   ← / →      shift down / up (in D)
 *   R / N / D  gear mode
 *   A          toggle Auto-Shift DCT
 *   E          cycle ECU mode (Comfort / Sport / Track+)
 *   G          open/close Garage & Tuning Workshop
 *   ShiftLeft  hold for N₂O Nitrous Shot
 *   X          toggle X-Ray cutaway view
 *   M          mute / unmute audio
 *   Space      engine start / stop
 */
export function useKeyboard() {
  useEffect(() => {
    const st = () => useEngineStore.getState();

    const down = (e) => {
      const target = e.target;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      const onControl = !!target?.closest?.('button, [role="slider"]');
      if (onControl && !['Escape', 'KeyG', 'KeyM'].includes(e.code)) return;

      // Let the garage use arrow keys for scrolling and never drive behind the modal.
      if (st().tuningOpen && !['Escape', 'KeyG', 'KeyM'].includes(e.code)) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          if (!e.repeat) {
            audioEngine.ensure();
            st().setThrottle(1);
          }
          break;
        case 'ArrowDown':
        case 'KeyS':
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
        case 'KeyA':
          if (!e.repeat) st().toggleAutoShift();
          break;
        case 'KeyE':
          if (!e.repeat) st().cycleEcuMode();
          break;
        case 'KeyG':
          if (!e.repeat) st().toggleTuningOpen();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          if (!e.repeat && st().nosInstalled) {
            audioEngine.ensure();
            st().setNosActive(true);
          }
          break;
        case 'KeyX':
          if (!e.repeat) st().toggleXray();
          break;
        case 'KeyM':
          if (!e.repeat) toggleMuteAudio();
          break;
        case 'Space':
          e.preventDefault();
          if (!e.repeat) togglePower();
          break;
        case 'Escape':
          if (st().tuningOpen) st().setTuningOpen(false);
          break;
        default:
          return;
      }
    };

    const up = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') st().setThrottle(0);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') st().setBrake(0);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') st().setNosActive(false);
    };

    const blur = () => {
      const s = st();
      s.setThrottle(0);
      s.setBrake(0);
      s.setNosActive(false);
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
