import { useEngineStore } from '../store/engineStore.js';
import { audioEngine } from '../audio/AudioEngine.js';

/**
 * Master power toggle. Ensures the AudioContext exists & is resumed
 * (must happen inside a user gesture to satisfy autoplay policy),
 * then toggles the engine and fires the starter sequence.
 */
export async function togglePower() {
  const store = useEngineStore.getState();
  await audioEngine.ensure();
  store.togglePower();
  const s = useEngineStore.getState();
  if (s.cranking) audioEngine.playStart();
}
