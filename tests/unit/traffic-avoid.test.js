import { describe, it, expect } from 'vitest';
import { trafficPlan, JUMP_H } from '../../src/traffic-avoid.js';

describe('попутки объезжают помехи', () => {
    const gap = { zNear: -100, zFar: -112, lanes: [2] };
    it('перед разломом — в полосу трамплина, над разломом — в прыжке', () => {
        expect(trafficPlan(-80, 0, { gaps: [gap] }).lane).toBe(2);
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
