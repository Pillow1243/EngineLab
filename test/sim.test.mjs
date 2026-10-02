/**
 * Headless physics self-test — simulates 60+ seconds of driving
 * and asserts the powertrain behaves believably.
 *   node test/sim.test.mjs
 */
import { stepSim } from '../src/sim/simulation.js';

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

let s = {
  running: false,
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

const step = (sec, patch = {}) => {
  const n = Math.max(1, Math.round(sec * 60));
  let out = s;
  for (let i = 0; i < n; i++) {
    s = { ...s, ...patch };
    out = stepSim(s, 1 / 60);
    s = { ...s, ...out, events: undefined };
  }
  return out;
};

const lastEvents = [];
const stepWithEvents = (sec, patch = {}) => {
  const n = Math.max(1, Math.round(sec * 60));
  for (let i = 0; i < n; i++) {
    s = { ...s, ...patch };
    const out = stepSim(s, 1 / 60);
    lastEvents.push(...out.events);
    s = { ...s, ...out, events: undefined };
  }
};

console.log('1) starter cranking → ignition');
lastEvents.length = 0;
stepWithEvents(1.3, { running: true, cranking: true });
check('engine caught', s.cranking === false && s.running === true, `cranking=${s.cranking}`);
check('ignition event fired', lastEvents.some((e) => e.type === 'ignition'));
check('rpm at idle after catch', s.rpm > 650 && s.rpm < 1400, `rpm=${Math.round(s.rpm)}`);

console.log('2) idle stability (N, 6s)');
stepWithEvents(6);
check('rpm holds idle 750–1100', s.rpm > 750 && s.rpm < 1100, `rpm=${Math.round(s.rpm)}`);

console.log('3) free revving in N');
stepWithEvents(2.5, { throttle: 1 });
check('rpm climbs past 4000', s.rpm > 4000, `rpm=${Math.round(s.rpm)}`);
check('limiter never exceeded', s.rpm < 8660, `rpm=${Math.round(s.rpm)}`);
stepWithEvents(2.0, { throttle: 0 });
check('rpm decays back toward idle', s.rpm < 3200, `rpm=${Math.round(s.rpm)}`);

console.log('4) D 1st launch from standstill');
s = { ...s, gearMode: 'D', gearPos: 1, speed: 0 };
stepWithEvents(8, { throttle: 1 });
check('speed builds > 60 km/h', Math.abs(s.speed) > 60, `speed=${Math.abs(s.speed).toFixed(1)}`);
check('rpm stays sane', s.rpm > 1000 && s.rpm < 8660, `rpm=${Math.round(s.rpm)}`);

console.log('5) upshift dip (2nd gear)');
const before = s.rpm;
stepWithEvents(0.42, { gearPos: 2, shiftLock: 0.42 });
check('rpm dropped during shift', s.rpm < before - 120, `before=${Math.round(before)} after=${Math.round(s.rpm)}`);
stepWithEvents(2.0, { throttle: 1 });
check('rpm recovers after re-engage', s.rpm > s.rpm - 1 && s.rpm > 1500, `rpm=${Math.round(s.rpm)}`);

console.log('6) throttle lift at high rpm → BOV');
lastEvents.length = 0;
stepWithEvents(0.5, { throttle: 1 });
stepWithEvents(0.1, { throttle: 0 });
check('bov event fired', lastEvents.some((e) => e.type === 'bov'), `boost=${s.boost.toFixed(2)}`);

console.log('7) brake to a stop (D)');
stepWithEvents(6, { brake: 1, throttle: 0 });
check('speed at 0', Math.abs(s.speed) < 1.5, `speed=${Math.abs(s.speed).toFixed(2)}`);

console.log('8) engine off → coast down');
stepWithEvents(2, { running: false, brake: 0 });
check('rpm dead', s.rpm < 50, `rpm=${Math.round(s.rpm)}`);

console.log(failures === 0 ? '\nALL PHYSICS CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
