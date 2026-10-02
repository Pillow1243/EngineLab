import Tachometer from './Tachometer.jsx';
import InfoPanel from './InfoPanel.jsx';
import BoostGauge from './BoostGauge.jsx';
import SpeedPanel from './SpeedPanel.jsx';
import GearStrip from './GearStrip.jsx';
import Pedals from './Pedals.jsx';
import Telemetry from './Telemetry.jsx';

/** Bottom-half control dashboard (glass panels, fixed layout — no shifts). */
export default function Dashboard() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-2 gap-2.5">
      <div className="col-span-3 row-span-2 panel">
        <Tachometer />
      </div>
      <div className="col-span-3 panel">
        <InfoPanel />
      </div>
      <div className="col-span-3 panel">
        <BoostGauge />
      </div>
      <div className="col-span-3 panel">
        <SpeedPanel />
      </div>
      <div className="col-span-4 panel">
        <GearStrip />
      </div>
      <div className="col-span-3 panel">
        <Pedals />
      </div>
      <div className="col-span-2 panel">
        <Telemetry />
      </div>
    </div>
  );
}
