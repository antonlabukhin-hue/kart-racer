import { describe, it, expect } from 'vitest';
import { smashSpots, AD_TEXTS } from '../../src/smash.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('сносимые щиты', () => {
    it('ставятся подальше от занятых мест, в одну из трёх полос', () => {
        const busy = [0.17, 0.3, 0.42, 0.6, 0.88];
        const spots = smashSpots(4, busy, seq([0.5, 0.2, 0.9]));
        expect(spots.length).toBeGreaterThan(0);
        expect(spots.length).toBeLessThanOrEqual(4);
        spots.forEach(sp => {
            busy.forEach(b => expect(Math.abs(b - sp.frac)).toBeGreaterThan(0.045));
            expect([0, 1, 2]).toContain(sp.lane);
            expect(sp.ad).toBeGreaterThanOrEqual(0);
            expect(sp.ad).toBeLessThan(AD_TEXTS.length);
        });
    });

    it('не больше заказанного и не на боссе (0.42–0.82)', () => {
        const spots = smashSpots(3, [], Math.random);
        expect(spots.length).toBe(3);
        smashSpots(8, [], Math.random).forEach(sp => expect(sp.frac < 0.4 || sp.frac > 0.84).toBe(true));
    });
});
