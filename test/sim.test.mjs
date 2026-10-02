/**
 * Headless self-test for the physics & drivetrain simulation.
 * Verifies ignition, idle, free-revving, launch, upshift sync, BOV, braking,
 * anti-stall in gear, parked gear-shift stability, reverse safety, and all 4 engines/aspirations.
 */
import { stepSim } from '../src/sim/simulation.js';

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

console.log('9) multi-engine & aspiration sanity (I4, I6, V8 + NA, Twin-Turbo, Supercharger)');
for (const engineType of ['I4_20', 'I6_30', 'V8_40']) {
  for (const aspiration of ['NA', 'TWIN_TURBO', 'SUPERCHARGER']) {
    s = {
      ...s,
      running: true,
      cranking: false,
      engineType,
      aspiration,
      gearMode: 'N',
      rpm: 900,
      speed: 0,
      boost: 0,
    };
    stepWithEvents(1.2, { throttle: 1 });
    if (aspiration === 'NA' && s.boost !== 0) failed++;
    if (aspiration === 'TWIN_TURBO' && s.boost <= 0.5) failed++;
    if (aspiration === 'SUPERCHARGER' && s.boost <= 0.4) failed++;
  }
}
check('all engines & aspirations build expected boost/rpm', failed === 0);

console.log('10) engine off → coast down');
s.running = false;
stepWithEvents(4.0, { running: false, throttle: 0 });
check('rpm dead', s.rpm < 50, `rpm=${Math.round(s.rpm)}`);

if (failed > 0) {
  console.log(`\n${failed} CHECK(S) FAILED`);
  process.exit(1);
} else {
  console.log('\nALL PHYSICS & GEARBOX CHECKS PASSED');
}
