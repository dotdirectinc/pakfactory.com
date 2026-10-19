import assert from 'node:assert/strict';
import {test} from 'node:test';

import {createSearchGate, type SearchGateOptions} from './search-gate';

const HOUR = 60 * 60 * 1000;
const START = 1_800_000 * HOUR + 5 * 60 * 1000; // 5 min into an hour

function setup(overrides: Partial<SearchGateOptions> = {}) {
    let t = START;
    const flushed: number[] = [];
    let store = 0;
    let storeUp = true;
    const gate = createSearchGate({
        perIpLimit: 3,
        perIpWindowMs: 60_000,
        instancePerMinute: 100,
        hourlyBudget: 1000,
        flushIntervalMs: 10_000,
        maxFlushDelta: 500,
        flush: async (delta) => {
            if (!storeUp) return null;
            flushed.push(delta);
            store += delta;
            return store;
        },
        now: () => t,
        ...overrides,
    });
    return {
        gate,
        flushed,
        tick: (ms: number) => (t += ms),
        setStore: (n: number) => (store = n),
        setStoreUp: (up: boolean) => (storeUp = up),
    };
}

test('per-IP window blocks the 4th request and says when to retry', () => {
    const {gate, tick} = setup();
    for (let i = 0; i < 3; i++) assert.equal(gate.check('1.1.1.1').allowed, true);
    const blocked = gate.check('1.1.1.1');
    assert.deepEqual(blocked, {allowed: false, reason: 'ip', retryAfterSec: 60});
    assert.equal(gate.check('2.2.2.2').allowed, true, 'other IPs unaffected');
    tick(60_000);
    assert.equal(gate.check('1.1.1.1').allowed, true, 'window slides');
});

test('instance cap bounds a burst spread over many IPs', () => {
    const {gate} = setup({instancePerMinute: 5});
    for (let i = 0; i < 5; i++) assert.equal(gate.check(`10.0.0.${i}`).allowed, true);
    const blocked = gate.check('10.0.0.99');
    assert.equal(blocked.allowed, false);
    assert.equal(!blocked.allowed && blocked.reason, 'instance');
});

test('flushes the in-memory tally at most every interval, not per request', async () => {
    const {gate, flushed, tick} = setup({perIpLimit: 100});
    for (let i = 0; i < 7; i++) gate.check('1.1.1.1');
    await gate.flushIfDue();
    assert.deepEqual(flushed, [], 'not due yet');
    tick(10_000);
    await gate.flushIfDue();
    assert.deepEqual(flushed, [7]);
    await gate.flushIfDue();
    assert.deepEqual(flushed, [7], 'nothing pending, no write');
});

test('site-wide budget: other instances’ usage blocks this one until the hour ends', async () => {
    const {gate, tick, setStore} = setup({perIpLimit: 100, hourlyBudget: 1000});
    gate.check('1.1.1.1');
    setStore(999); // other instances already used 999
    tick(10_000);
    await gate.flushIfDue(); // total = 1000
    const blocked = gate.check('1.1.1.1');
    assert.equal(blocked.allowed, false);
    assert.equal(!blocked.allowed && blocked.reason, 'budget');
    // 5 min + 10 s into the hour → 54 min 50 s left
    assert.equal(!blocked.allowed && blocked.retryAfterSec, 54 * 60 + 50);
    tick(blocked.allowed ? 0 : blocked.retryAfterSec * 1000);
    assert.equal(gate.check('1.1.1.1').allowed, true, 'new hour, new budget');
});

test('store unreachable: search still answers, local limits still apply, delta is retried', async () => {
    const {gate, flushed, tick, setStoreUp} = setup();
    setStoreUp(false);
    for (let i = 0; i < 3; i++) assert.equal(gate.check('1.1.1.1').allowed, true);
    tick(10_000);
    await gate.flushIfDue();
    assert.equal(gate.check('1.1.1.1').allowed, false, 'per-IP limit still enforced');
    assert.equal(gate.snapshot().pending, 3, 'delta kept for the next flush');
    setStoreUp(true);
    tick(10_000);
    await gate.flushIfDue();
    assert.deepEqual(flushed, [3]);
});

test('a flush that throws is treated like an unreachable store', async () => {
    const {gate, tick} = setup({
        flush: async () => {
            throw new Error('network');
        },
    });
    gate.check('1.1.1.1');
    tick(10_000);
    await assert.doesNotReject(gate.flushIfDue());
    assert.equal(gate.snapshot().pending, 1);
});

test('large deltas are split to the RPC cap', async () => {
    const {gate, flushed, tick} = setup({perIpLimit: 10_000, instancePerMinute: 10_000, maxFlushDelta: 500});
    for (let i = 0; i < 700; i++) gate.check('1.1.1.1');
    tick(10_000);
    await gate.flushIfDue();
    tick(10_000);
    await gate.flushIfDue();
    assert.deepEqual(flushed, [500, 200]);
});
