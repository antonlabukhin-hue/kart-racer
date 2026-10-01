import { describe, it, expect } from 'vitest';
import { createRingChain, ringPitch, CHAIN_GAP, CHAIN_STEPS, speedFov, FOV_SPEED, FOV_NITRO, speedLinesK } from '../../src/juice.js';

describe('сочность', () => {
    it('звон «Е» в цепочке поднимается по полутонам, пауза — с начала, не выше октавы', () => {
        const st = createRingChain();
        expect(ringPitch(st, 10)).toBe(1);
        expect(ringPitch(st, 10.2)).toBeCloseTo(Math.pow(2, 1 / 12), 6);
        let p = 0, t = 10.2;
        for (let i = 0; i < 30; i++) { t += 0.1; p = ringPitch(st, t); }
        expect(p).toBeCloseTo(2, 6);
        expect(st.n).toBe(CHAIN_STEPS);
        expect(ringPitch(st, t + CHAIN_GAP + 0.01)).toBe(1);
    });
    it('угол камеры: до 60% скорости — как обычно, на максимуме — шире, на нитро — ещё', () => {
        expect(speedFov(0.5, false)).toBe(0);
        expect(speedFov(1, false)).toBe(FOV_SPEED);
        expect(speedFov(1.3, true)).toBe(FOV_SPEED + FOV_NITRO);
        expect(speedFov(0.8, false)).toBeGreaterThan(0);
        expect(speedFov(0.8, false)).toBeLessThan(FOV_SPEED / 2);
    });
    it('линии скорости — только на большой скорости, нитро и «В ударе»', () => {
        expect(speedLinesK(0.7, false, false)).toBe(0);
        expect(speedLinesK(1, false, false)).toBeGreaterThan(0);
        expect(speedLinesK(0.5, true, false)).toBeGreaterThan(0);
        expect(speedLinesK(1, true, true)).toBe(1);
    });
});
