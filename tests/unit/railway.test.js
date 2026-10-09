import { describe, it, expect } from 'vitest';
import { hasBridge, trainStartX, BRIDGE_EVERY, createTrain } from '../../src/railway.js';

describe('мост с поездом', () => {
    it('мост — раз в BRIDGE_EVERY участков, не на старте и не в джунглях/на свалке', () => {
        const at = []; for (let i = 0; i < 60; i++) if (hasBridge(i, 'arsenev')) at.push(i);
        expect(at[0]).toBeGreaterThanOrEqual(6);
        expect(at[1] - at[0]).toBe(BRIDGE_EVERY);
        expect(hasBridge(at[0], 'junk')).toBe(false);
        expect(hasBridge(at[0], 'forest')).toBe(true);
    });
    it('середина состава над дорогой, когда игрок под мостом', () => {
        const dist = 150, vp = 20, vt = 30, L = 47;
        [1, -1].forEach(function(dir) {
            const head = trainStartX(dist, vp, vt, L, dir);
            const t = dist / vp, headAt = head + dir * vt * t;
            expect(headAt - dir * L / 2).toBeCloseTo(0, 6); // середина — в x = 0
        });
    });
    it('у состава есть длина (для расписания)', () => {
        let s = 1; const r = function() { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        expect(createTrain('elektrichka', r).userData.length).toBeGreaterThan(40);
        expect(createTrain('freight', r).userData.length).toBeGreaterThan(40);
    });
});
