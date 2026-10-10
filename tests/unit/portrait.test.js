import { describe, it, expect } from 'vitest';
import { fovFor, chaseRig, PORTRAIT_HFOV, MAX_PORTRAIT_FOV, PORTRAIT_RIG, dollyK, chaseLag } from '../../src/portrait.js';

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
        expect(PORTRAIT_RIG).toEqual({ dist: 5.2, height: 3.0, lookY: -0.15, lookZoff: -15 });
        for (const k of [0, 0.5, 1]) expect(chaseRig('portrait', k).height + 0.6).toBeLessThan(4.6 - 0.3);
    });
});

describe('машина в кадре на любой скорости', () => {
    it('угол шире — камера ближе во столько же раз: размер машины в кадре тот же', () => {
        expect(dollyK(55, 55)).toBeCloseTo(1);
        const k = dollyK(55, 63);
        expect(k).toBeLessThan(1);
        // видимая высота машины ~ 1 / (расстояние · tan(угол/2)) — одинакова
        const r = Math.PI / 180;
        expect(1 / (1 * Math.tan(55 * r / 2))).toBeCloseTo(1 / (k * Math.tan(63 * r / 2)), 6);
    });
    it('отставание постоянное — не зависит от текущей скорости', () => {
        expect(chaseLag(0.5, 0.3)).toBeCloseTo(0.5 * 0.7 / 0.3);
        expect(chaseLag(0.5, 0)).toBe(0);
    });
});
