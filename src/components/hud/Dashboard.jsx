import Tachometer from './Tachometer.jsx';
import InfoPanel from './InfoPanel.jsx';
import BoostGauge from './BoostGauge.jsx';
import SpeedPanel from './SpeedPanel.jsx';
import GearStrip from './GearStrip.jsx';
import Pedals from './Pedals.jsx';
import Telemetry from './Telemetry.jsx';

/**
 * Fully responsive control dashboard:
 * - Mobile Portrait (<640px): 6-col × 3-row ergonomic touch grid
 * - Tablet (640px–1023px): 12-col × 2-row balanced grid
 * - Desktop (>=1024px): 12-col × 2-row full cockpit with row-spanning Tachometer
 */
export default function Dashboard() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-6 grid-rows-[1.15fr_0.78fr_1.07fr] sm:grid-cols-12 sm:grid-rows-2 gap-1.5 sm:gap-2 lg:gap-2.5">
      {/* Tachometer */}
      <div className="col-span-2 row-span-1 sm:col-span-3 lg:row-span-2 panel">
        <Tachometer />
      </div>

      {/* Info & ECU Map Panel (Row 3 left on mobile portrait, Row 1 col 2 on tablet/desktop) */}
      <div className="col-span-3 row-start-3 col-start-1 sm:row-start-auto sm:col-start-auto sm:col-span-3 panel">
        <InfoPanel />
      </div>

      {/* Turbo Boost Gauge */}
      <div className="col-span-2 row-start-1 col-start-3 sm:row-start-auto sm:col-start-auto sm:col-span-3 panel">
        <BoostGauge />
      </div>

      {/* Vehicle Speed + Start/Stop */}
      <div className="col-span-2 row-start-1 col-start-5 sm:row-start-auto sm:col-start-auto sm:col-span-3 panel">
        <SpeedPanel />
      </div>

      {/* 7-DCT Gear Strip */}
      <div className="col-span-6 row-start-2 col-start-1 sm:row-start-auto sm:col-start-auto sm:col-span-5 lg:col-span-4 panel">
        <GearStrip />
      </div>

      {/* Multi-touch Brake & Throttle Pedals */}
      <div className="col-span-3 row-start-3 col-start-4 sm:row-start-auto sm:col-start-auto sm:col-span-4 lg:col-span-3 panel">
        <Pedals />
      </div>

      {/* Live Telemetry (visible on sm+ tablets & desktops; mobile portrait shows HP/Nm in InfoPanel & EGT in 3D overlay) */}
      <div className="hidden sm:block sm:col-span-3 lg:col-span-2 panel">
        <Telemetry />
      </div>
    </div>
  );
}
