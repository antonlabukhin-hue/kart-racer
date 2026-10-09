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
    it('камера вертикально — выше, чем боком, машина у низа экрана, всегда ниже крыши тоннеля (4,6 м)', () => {
        const p = chaseRig('portrait', 0), m = chaseRig('mobile', 0);
        expect(p.height).toBeGreaterThan(m.height);
        expect(PORTRAIT_RIG).toEqual({ dist: 5.2, height: 3.0, lookY: 1.2, lookZoff: -15 });
        for (const k of [0, 0.5, 1]) expect(chaseRig('portrait', k).height + 0.6).toBeLessThan(4.6 - 0.3);
    });
});
