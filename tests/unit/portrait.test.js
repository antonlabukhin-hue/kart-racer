import { describe, it, expect } from 'vitest';
import { fovFor, chaseRig, PORTRAIT_HFOV, MAX_PORTRAIT_FOV, PORTRAIT_RIG } from '../../src/portrait.js';

describe('заезд вертикально', () => {
    it('боком — угол как был; вертикально — шире, чтобы по ширине влезали три полосы', () => {
        expect(fovFor(16 / 9, 55)).toBe(55);
        const v = fovFor(390 / 844, 52);
        expect(v).toBeGreaterThan(52);
        expect(v).toBeLessThanOrEqual(MAX_PORTRAIT_FOV);
        // горизонтальный угол на телефоне 390×844 — не меньше заданного (или упёрлись в предел)
        const h = 2 * Math.atan(Math.tan(v * Math.PI / 360) * 390 / 844) * 180 / Math.PI;
        expect(h).toBeGreaterThanOrEqual(Math.min(PORTRAIT_HFOV, 40) - 0.01);
    });
    it('камера вертикально — выше и смотрит круче вниз, чем боком (как в Subway Surfers)', () => {
        const p = chaseRig('portrait', 0), m = chaseRig('mobile', 0);
        const pitch = r => Math.atan2(r.height - r.lookY, r.dist - r.lookZoff);
        expect(p.height).toBeGreaterThan(m.height);
        expect(pitch(p)).toBeGreaterThan(pitch(m) * 2);
    });
});
