import { describe, it, expect } from 'vitest';
import { oncSection, oncIndexAt, inOncoming, ONC_FROM, ONC_EVERY, ONC_LEN, ONC_SIGN } from '../../src/oncoming-lane.js';
import { trafficPlan } from '../../src/traffic-avoid.js';

describe('встречка ×2', () => {
    it('участки — по дистанции, одинаковые при каждом заезде', () => {
        expect(oncSection(0).d0).toBe(ONC_FROM);
        expect(oncSection(2).d0).toBe(ONC_FROM + 2 * ONC_EVERY);
        expect(oncSection(3)).toEqual(oncSection(3));
        const c = oncSection(1).cars;
        expect(c.length).toBeGreaterThanOrEqual(3);
        for (let i = 1; i < c.length; i++) expect(c[i] - c[i - 1]).toBeGreaterThanOrEqual(55); // между встречными — есть куда вернуться
    });
    it('номер участка ставится заранее', () => {
        expect(oncIndexAt(0, 260)).toBe(-1);
        expect(oncIndexAt(ONC_FROM - ONC_SIGN - 260, 260)).toBe(0);
        expect(oncIndexAt(ONC_FROM + ONC_EVERY - ONC_SIGN - 260, 260)).toBe(1);
    });
    it('«на встречке» — левая полоса внутри участка', () => {
        const sec = { z0: 0, z1: -ONC_LEN };
        expect(inOncoming(-2, -50, sec, -2)).toBe(true);
        expect(inOncoming(0, -50, sec, -2)).toBe(false);
        expect(inOncoming(-2, 10, sec, -2)).toBe(false);
        expect(inOncoming(-2, -50, null, -2)).toBe(false);
    });
    it('попутки уходят из встречной полосы', () => {
        const works = [{ type: 'oncoming', z0: 0, z1: -ONC_LEN, x: -2 }];
        expect(trafficPlan(-50, 0, { works }).lane).toBe(1);
        expect(trafficPlan(-50, 2, { works }).lane).toBe(null);
    });
});
