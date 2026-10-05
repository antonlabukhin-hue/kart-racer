import { describe, it, expect } from 'vitest';
import { trafficPlan, laneBlocked, freeZ, JUMP_H } from '../../src/traffic-avoid.js';

describe('попутки объезжают помехи', () => {
    const gap = { zNear: -100, zFar: -112, lanes: [2] };
    it('перед разломом — не лезут в полосу трамплина, над разломом — в прыжке', () => {
        expect(trafficPlan(-80, 0, { gaps: [gap] }).lane).toBe(null);
        expect(trafficPlan(-80, 2, { gaps: [gap] }).lane).toBe(null);
        const mid = trafficPlan(-106, 2, { gaps: [gap] });
        expect(mid.y).toBeGreaterThan(JUMP_H * 0.8);
        expect(trafficPlan(-200, 0, { gaps: [gap] })).toEqual({ lane: null, y: 0 });
    });
    it('ремонт и трамплин в своей полосе — в соседнюю', () => {
        expect(trafficPlan(-30, 0, { works: [{ type: 'roadworks', z0: -50, z1: -110, x: -2 }] }).lane).toBe(1);
        expect(trafficPlan(-30, 1, { ramps: [{ x: 0, z: -45 }] }).lane).not.toBe(1);
        expect(trafficPlan(-30, 2, { ramps: [{ x: 0, z: -45 }] }).lane).toBe(null);
    });
});

describe('попутки и трамплины перед разломом', () => {
    it('прыжок начинается от начала трамплина: машина всё время над плитой, не внутри неё', () => {
        const gap = { zNear: -100, zFar: -105.5, lanes: [2] };
        // трамплин перед разломом: центр zNear+2.8, длина 4, высота 0.85 (src/main.js createRamp)
        const zEnter = gap.zNear + 4.8, zExit = gap.zNear + 0.8;
        for (let z = zEnter; z >= zExit; z -= 0.2) {
            const surface = (zEnter - z) / (zEnter - zExit) * 0.85;
            expect(trafficPlan(z, 2, { gaps: [gap] }).y).toBeGreaterThanOrEqual(surface);
        }
    });
    it('в полосу трамплина или ремонта впереди не перестраиваются', () => {
        const h = { ramps: [{ x: 0, z: -45 }], works: [{ type: 'roadworks', z0: -50, z1: -110, x: 2 }] };
        expect(laneBlocked(-30, 1, h)).toBe(true);
        expect(laneBlocked(-30, 2, h)).toBe(true);
        expect(laneBlocked(-30, 0, h)).toBe(false);
        expect(laneBlocked(-200, 1, h)).toBe(false);
    });
});

describe('перенос попутки вперёд', () => {
    it('не над разломом и не на трамплин в своей полосе — дальше по дороге', () => {
        const h = { gaps: [{ zNear: -100, zFar: -105.5 }], ramps: [{ x: 2, z: -200 }] };
        expect(freeZ(-103, 1, h)).toBeLessThan(-105.5 - 2);
        expect(freeZ(-97, 0, h)).toBeLessThan(-105.5 - 2); // на трамплине перед разломом — тоже
        expect(freeZ(-201, 2, h)).toBeLessThan(-203);
        expect(freeZ(-201, 0, h)).toBe(-201); // трамплин в другой полосе — не мешает
        expect(freeZ(-150, 1, h)).toBe(-150);
    });
});
