import { describe, it, expect } from 'vitest';
import { laneX, laneOf, hugFor, carX, HUG_CHANCE } from '../../src/traffic-lanes.js';

describe('полосы попуток', () => {
    it('центры полос симметричны: −2, 0, +2 (как у игрока)', () => {
        expect([0, 1, 2].map(laneX)).toEqual([-2, 0, 2]);
        expect([-2.5, -1.1, 0.4, 2.5].map(laneOf)).toEqual([0, 0, 1, 2]);
    });
    it('в крайних полосах попутки часто жмутся к обочине, в средней — никогда', () => {
        expect(hugFor(1, () => 0)).toBe(0);
        expect(hugFor(2, () => 0)).toBeGreaterThan(0.29);
        expect(hugFor(0, () => 0)).toBeLessThan(-0.29);
        expect(hugFor(2, () => HUG_CHANCE + 0.01)).toBe(0);
    });
    it('у правой обочины (игрок на x 2.5) прижатую попутку не объехать', () => {
        const x = carX(2, hugFor(2, () => 0.99 * HUG_CHANCE));
        expect(Math.abs(2.5 - x)).toBeLessThan(0.75 * 0.55); // меньше полуширины легковушки — удар
    });
});
