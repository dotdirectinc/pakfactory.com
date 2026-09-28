import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {bandPath, numeralPos, phase, RING_R, TEXT_OUT} from './morph-framework';

/** Every coordinate pair in an SVG path string. */
function points(d: string): {x: number; y: number}[] {
    const out: {x: number; y: number}[] = [];
    // Endpoint of each command: M/L carry x y; A carries rx ry rot large sweep x y.
    for (const seg of d.replace(/Z$/, '').split(/(?=[MLA])/)) {
        const n = seg.slice(1).trim().split(/\s+/).map(Number);
        if (seg[0] === 'A') out.push({x: n[5] as number, y: n[6] as number});
        else out.push({x: n[0] as number, y: n[1] as number});
    }
    return out;
}

describe('morph-framework geometry', () => {
    it('settled bands sit on the ring (radius 76 ± half width)', () => {
        for (let target = 0; target < 5; target += 1) {
            for (const p of points(bandPath(1, target, target, 0, 0, 4))) {
                const r = Math.hypot(p.x - 100, p.y - 100);
                assert.ok(Math.abs(r - RING_R) <= 2.1, `r=${r} for arc ${target}`);
            }
        }
    });

    it('rest bands are straight cards around their rest centre', () => {
        const pts = points(bandPath(0, 0, 3, 0, 0, 26));
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        assert.ok(Math.max(...xs) - Math.min(...xs) <= 118.1);
        assert.ok(Math.max(...ys) - Math.min(...ys) <= 26.1);
    });

    it('numerals travel from beside the card to r=93', () => {
        const rest = numeralPos(0, 0, 0, 0, 0);
        assert.equal(Math.round(rest.x), 86 - 59 + 12);
        const end = numeralPos(1, 0, 0, 0, 0);
        assert.equal(Math.round(Math.hypot(end.x - 100, end.y - 100)), 93);
    });

    it('phases clamp', () => {
        assert.equal(phase(0, TEXT_OUT), 0);
        assert.equal(phase(1, TEXT_OUT), 1);
    });
});
