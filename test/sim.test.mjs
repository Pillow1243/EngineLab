/**
 * Headless self-test for the physics & drivetrain simulation.
 * Verifies ignition, idle, free-revving, launch, upshift sync, BOV, braking,
 * anti-stall in gear, parked gear-shift stability, reverse safety, and all 4 engines/aspirations.
 */
import { stepSim, resolveSpecs, engineTorque, getMode } from '../src/sim/simulation.js';
import { ENGINES, ASPIRATIONS, BUILD_PRESETS } from '../src/sim/constants.js';
import { useEngineStore } from '../src/store/engineStore.js';

let failed = 0;
function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label} ${detail}`);
  }
}

let s = {
  running: true,
  cranking: false,
  rpm: 0,
  throttle: 0,
  brake: 0,
  boost: 0,
  spool: 0,
  speed: 0,
  shiftLock: 0,
  bovFlash: 0,
  limiterHit: false,
  _crankT: 0,
  _prevThrottle: 0,
  gearMode: 'N',
  gearPos: 1,
};

function stepWithEvents(seconds, patch = {}) {
  const n = Math.round(seconds * 60);
  const allEvents = [];
  for (let i = 0; i < n; i++) {
    s = { ...s, ...patch };
    const out = stepSim(s, 1 / 60);
    if (out.events?.length) allEvents.push(...out.events);
    const { events, ...rest } = out;
    s = { ...s, ...rest };
  }
  return allEvents;
}

console.log('1) starter cranking → ignition');
const ev1 = stepWithEvents(1.2, { cranking: true });
check('engine caught', !s.cranking, `cranking=${s.cranking}`);
check('ignition event fired', ev1.some((e) => e.type === 'ignition'));
check('rpm at idle after catch', s.rpm > 750 && s.rpm < 1100, `rpm=${Math.round(s.rpm)}`);

console.log('2) idle stability (N, 6s)');
stepWithEvents(6.0, { throttle: 0, gearMode: 'N' });
check('rpm holds idle 750–1100', s.rpm > 750 && s.rpm < 1100, `rpm=${Math.round(s.rpm)}`);

console.log('3) free revving in N');
stepWithEvents(2.5, { throttle: 1, gearMode: 'N' });
check('rpm climbs past 4000', s.rpm > 4000, `rpm=${Math.round(s.rpm)}`);
check('limiter never exceeded', s.rpm <= 8660, `rpm=${Math.round(s.rpm)}`);
stepWithEvents(2.0, { throttle: 0 });
check('rpm decays back toward idle', s.rpm < 3200, `rpm=${Math.round(s.rpm)}`);

console.log('4) D 1st launch from standstill');
s = { ...s, speed: 0, rpm: 900, gearMode: 'D', gearPos: 1 };
stepWithEvents(8.0, { throttle: 1, brake: 0 });
check('speed builds > 60 km/h', s.speed > 60, `speed=${s.speed.toFixed(1)}`);
check('rpm stays sane', s.rpm > 1000 && s.rpm <= 8660, `rpm=${Math.round(s.rpm)}`);

console.log('5) upshift dip (2nd gear)');
const rpmBefore = s.rpm;
stepWithEvents(0.42, { gearPos: 2, shiftLock: 0.42, throttle: 1 });
check('rpm dropped during shift', s.rpm < rpmBefore - 120, `before=${Math.round(rpmBefore)} after=${Math.round(s.rpm)}`);
stepWithEvents(1.5, { throttle: 1 });
check('rpm recovers after re-engage', s.rpm > 1500, `rpm=${Math.round(s.rpm)}`);

console.log('6) throttle lift at high rpm → BOV');
stepWithEvents(2.0, { throttle: 1 });
const ev6 = stepWithEvents(0.2, { throttle: 0 });
check('bov event fired', ev6.some((e) => e.type === 'bov'));

console.log('7) brake to a stop (D) + anti-stall check');
stepWithEvents(6.0, { throttle: 0, brake: 1 });
check('speed at 0', Math.abs(s.speed) < 1.5, `speed=${s.speed.toFixed(2)}`);
check('engine did not stall under brake (rpm >= 750)', s.rpm >= 750, `rpm=${Math.round(s.rpm)}`);
check('auto-reset to 1st gear at stop', s.gearPos === 1, `gearPos=${s.gearPos}`);

console.log('8) gearbox edge cases: coasting anti-stall & parked shift');
s = { ...s, speed: 18, rpm: 1100, gearMode: 'D', gearPos: 4, throttle: 0, brake: 0 };
stepWithEvents(4.0, { throttle: 0, brake: 0.1 });
check('never stalls when lugging in 4th gear at low speed', s.rpm >= 800, `rpm=${Math.round(s.rpm)}`);
s = { ...s, speed: 0, rpm: 880, gearMode: 'D', gearPos: 1, shiftLock: 0.32 };
stepWithEvents(0.32, { throttle: 0, brake: 0 });
check('parked shift does not drop rpm below idle', s.rpm >= 820, `rpm=${Math.round(s.rpm)}`);

console.log('9) all engine layouts × aspiration systems');
for (const engineType of Object.keys(ENGINES)) {
  for (const aspiration of Object.keys(ASPIRATIONS)) {
    s = {
      ...s,
      running: true,
      cranking: false,
      engineType,
      aspiration,
      gearMode: 'N',
      rpm: ENGINES[engineType].idleRpm,
      throttle: 0,
      brake: 0,
      speed: 0,
      boost: 0,
      spool: 0,
    };
    stepWithEvents(1.2, { throttle: 1 });
    const validBoost = aspiration === 'NA' ? s.boost === 0 : Number.isFinite(s.boost) && s.boost >= 0;
    const validEngine = Number.isFinite(s.rpm) && s.rpm > 0 && Number.isFinite(s.speed);
    check(`${engineType} / ${aspiration} stays finite`, validBoost && validEngine, `rpm=${s.rpm} boost=${s.boost}`);
  }
}

console.log('10) engine off → coast down');
s.running = false;
stepWithEvents(4.0, { running: false, throttle: 0 });
check('rpm dead', s.rpm < 50, `rpm=${Math.round(s.rpm)}`);

console.log('11) garage presets & defensive configuration');
for (const preset of BUILD_PRESETS) {
  const specs = resolveSpecs(preset.config);
  check(`${preset.name} resolves`, !!specs.eng && specs.limitRpm > specs.redline && specs.maxBoost >= 0);
}
const store = useEngineStore.getState();
store.applyBuildPreset('i4-time-attack');
const selectedBuild = useEngineStore.getState();
check(
  'preset applies a coherent I4 track setup',
  selectedBuild.engineType === 'I4_20' &&
    selectedBuild.aspiration === 'NA' &&
    selectedBuild.ecuMode === 'TRACK' &&
    selectedBuild.transUpgrade === 'RACE_DOG',
);
const nitrousBase = {
  engineType: 'I5_29', aspiration: 'NA', ecuMode: 'SPORT',
  internalsUpgrade: 'STOCK', exhaustUpgrade: 'SPORT',
  nosActive: false, nosInstalled: true,
};
const baseTorqueNm = engineTorque(4000, 1, 0, nitrousBase);
const nitrousTorqueNm = engineTorque(4000, 1, 0, { ...nitrousBase, nosActive: true });
const uninstalledTorqueNm = engineTorque(4000, 1, 0, { ...nitrousBase, nosActive: true, nosInstalled: false });
check('installed N₂O contributes its rated torque', Math.abs(nitrousTorqueNm - baseTorqueNm - 155) < 0.01);
check('uninstalled N₂O cannot change engine torque', uninstalledTorqueNm === baseTorqueNm);
check(
  'uninstalled N₂O is not reported as active',
  getMode({ running: true, throttle: 1, nosActive: true, nosInstalled: false }).label !== 'N₂O SHOT!',
);
useEngineStore.getState().setNosActive(true);
check('store refuses to arm an uninstalled N₂O kit', useEngineStore.getState().nosActive === false);
store.setVolume(1.5);
check('audio volume clamps to 100%', useEngineStore.getState().volume === 1);
store.setVolume(-0.5);
check('audio volume clamps to 0%', useEngineStore.getState().volume === 0);

if (failed > 0) {
  console.log(`\n${failed} CHECK(S) FAILED`);
  process.exit(1);
} else {
  console.log('\nALL PHYSICS & GEARBOX CHECKS PASSED');
}
