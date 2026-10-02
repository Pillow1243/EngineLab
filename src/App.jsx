import EngineScene from './components/scene/EngineScene.jsx';
import Dashboard from './components/hud/Dashboard.jsx';
import TopOverlay from './components/hud/TopOverlay.jsx';
import ViewButtons from './components/hud/ViewButtons.jsx';
import GearOverlay from './components/hud/GearOverlay.jsx';
import { useSimulationLoop } from './hooks/useSimulationLoop.js';
import { useKeyboard } from './hooks/useKeyboard.js';

export default function App() {
  useSimulationLoop();
  useKeyboard();

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#04060a] text-slate-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ---------- top half: 3D engine viewport ---------- */}
      <div className="relative min-h-0 flex-1">
        <EngineScene />
        <TopOverlay />
        <ViewButtons />
        <GearOverlay />
        {/* subtle vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 55%, rgba(2,4,8,0.55) 100%)',
          }}
        />
      </div>

      {/* ---------- bottom half: control dashboard ---------- */}
      <div className="flex h-[42vh] max-h-[470px] min-h-[336px] shrink-0 flex-col gap-1.5 px-3 pb-2 pt-1">
        <Dashboard />
        <div className="text-center text-[9px] tracking-[0.18em] text-slate-600">
          ↑ THROTTLE · ↓ BRAKE · ← → SHIFT · R/N/D GEAR · SPACE START/STOP — 가속 · 제동 · 변속 · 시동
        </div>
      </div>
    </div>
  );
}
