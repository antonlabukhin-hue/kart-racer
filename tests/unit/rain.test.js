import { describe, it, expect } from 'vitest';
import { rainStep, RAIN_FALL } from '../../src/rain.js';

describe('дождь', () => {
    it('капли падают вниз и летят навстречу сильнее на скорости', () => {
        const slow = rainStep(0.1, 0), fast = rainStep(0.1, 1);
        expect(slow[1]).toBeCloseTo(-RAIN_FALL * 0.1);
        expect(fast[2]).toBeGreaterThan(slow[2]);
        expect(rainStep(0.1, 5)[2]).toBe(fast[2]); // скорость ограничена
    });
});
