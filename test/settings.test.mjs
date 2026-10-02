import assert from 'node:assert/strict';

const memory = new Map([
  [
    'engine-lab-settings-v1',
    JSON.stringify({ engineType: 'V8_40', aspiration: 'not-a-real-system', volume: 0.4, rpm: 9999 }),
  ],
]);

globalThis.window = {
  localStorage: {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  },
  addEventListener() {},
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
};

const { useEngineStore } = await import('../src/store/engineStore.js');
let state = useEngineStore.getState();
assert.equal(state.engineType, 'V8_40', 'valid saved settings should hydrate');
assert.equal(state.aspiration, 'SINGLE_TURBO', 'invalid values should fall back to safe defaults');
assert.equal(state.volume, 0.4, 'saved audio preference should hydrate');
assert.equal(state.rpm, 0, 'transient simulation state must never hydrate from storage');

const original = memory.get('engine-lab-settings-v1');
state.setThrottle(1);
await new Promise((resolve) => setTimeout(resolve, 210));
assert.equal(memory.get('engine-lab-settings-v1'), original, 'fast updates should not trigger storage writes');
assert.equal(JSON.parse(memory.get('engine-lab-settings-v1')).throttle, undefined, 'fast fields should not be persisted');

useEngineStore.getState().setEngineType('I4_20');
await new Promise((resolve) => setTimeout(resolve, 210));
const saved = JSON.parse(memory.get('engine-lab-settings-v1'));
assert.equal(saved.engineType, 'I4_20', 'discrete setup changes should be persisted');
assert.equal(saved.volume, 0.4);
assert.equal(saved.throttle, undefined);

console.log('✓ settings hydrate safely and only discrete preferences are persisted');
