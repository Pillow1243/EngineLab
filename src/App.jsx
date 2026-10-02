import { useEffect } from 'react';
import EngineScene from './components/scene/EngineScene.jsx';
import Dashboard from './components/hud/Dashboard.jsx';
import TopOverlay from './components/hud/TopOverlay.jsx';
import ViewButtons from './components/hud/ViewButtons.jsx';
import GearOverlay from './components/hud/GearOverlay.jsx';
import TuningModal from './components/hud/TuningModal.jsx';
import { useSimulationLoop } from './hooks/useSimulationLoop.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useEngineStore } from './store/engineStore.js';
import { audioEngine } from './audio/AudioEngine.js';

function AudioPreferenceSync() {
  useEffect(() => {
    const stopVolume = useEngineStore.subscribe(
      (s) => s.volume,
      (volume) => audioEngine.setVolume(volume),
      { fireImmediately: true },
    );
    const stopMute = useEngineStore.subscribe(
      (s) => s.muted,
      (muted) => audioEngine.setMuted(muted),
      { fireImmediately: true },
    );
    return () => {
      stopVolume();
      stopMute();
    };
  }, []);
  return null;
}

export default function App() {
  useSimulationLoop();
  useKeyboard();

  return (
    <div
      className="app-shell flex h-dvh w-full flex-col overflow-hidden bg-[#04060a] text-slate-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      <AudioPreferenceSync />
      {/* ---------- 3D engine viewport ---------- */}
      <div className="viewport-pane relative min-h-[210px] flex-1">
        <EngineScene />
        <TopOverlay />
        <ViewButtons />
        <GearOverlay />
        {/* subtle studio vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 55%, rgba(2,4,8,0.55) 100%)',
          }}
        />
      </div>

      {/* ---------- Responsive control dashboard ---------- */}
      <div className="dashboard-pane flex h-[58dvh] sm:h-[46dvh] lg:h-[42dvh] max-h-[540px] sm:max-h-[470px] min-h-[300px] sm:min-h-[330px] shrink-0 flex-col gap-1 px-2 pb-2 pt-1 sm:px-3">
        <Dashboard />
        <div className="hidden sm:block text-center text-[9px] tracking-[0.16em] text-slate-600">
          ↑/W THROTTLE · ↓/S BRAKE · ←/→ SHIFT · R/N/D GEAR · A AUTO · E ECU · G GARAGE · SHIFT N₂O · X X-RAY · M MUTE · SPACE ENGINE
        </div>
      </div>

      {/* ---------- Garage & Dyno Tuning Modal ---------- */}
      <TuningModal />
    </div>
  );
}
