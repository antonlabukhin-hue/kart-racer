import { describe, it, expect } from 'vitest';
import { damageLook, dentFor, pitchFor } from '../../src/car-damage.js';

describe('повреждения машины', () => {
    it('до второй аварии не дымит; дальше дым гуще и темнее', () => {
        expect(damageLook(0, 5).smokeRate).toBe(0);
        expect(damageLook(1, 5).smokeRate).toBe(0);
        const a = damageLook(2, 5), b = damageLook(4, 5);
        expect(a.smokeRate).toBeGreaterThan(0);
        expect(b.smokeRate).toBeGreaterThan(a.smokeRate);
        expect(b.smokeDark).toBeGreaterThan(a.smokeDark);
        expect(b.smokeDark).toBeLessThanOrEqual(1);
    });

    it('вмятина небольшая: поворот < 0.1 рад, панель чуть проседает и темнеет', () => {
        for (let i = 0; i < 50; i++) {
            const d = dentFor();
            expect(Math.abs(d.rx)).toBeLessThan(0.1);
            expect(Math.abs(d.rz)).toBeLessThan(0.1);
            expect(d.dy).toBeLessThan(0);
            expect(d.darken).toBeGreaterThan(0.75);
            expect(d.darken).toBeLessThan(1);
        }
    });

    it('газ поднимает нос, тормоз опускает', () => {
        expect(pitchFor(1, 1)).toBeGreaterThan(0);
        expect(pitchFor(-1, 1)).toBeLessThan(0);
        expect(Math.abs(pitchFor(10, 1))).toBeCloseTo(0.035, 6);
        expect(pitchFor(0, 1)).toBeCloseTo(0, 6);
    });
});
