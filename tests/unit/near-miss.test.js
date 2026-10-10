import { describe, it, expect } from 'vitest';
import { nearMissStep } from '../../src/near-miss.js';
import { laneAssist, nearestLane } from '../../src/lane-assist.js';

// попутка: hw = 0.8 · 0.55; игрок догоняет её (dz уменьшается)
const HW = 0.44;
function pass(o, path) { let got = false; path.forEach(function(p, i) { if (nearMissStep(o, p[0], p[1], HW, i * 0.05)) got = true; }); return got; }

describe('на волоске', () => {
    it('ехал на неё по своей полосе и ушёл в соседнюю в последний момент — засчитано', () => {
        const path = [];
        for (let dz = 12; dz > 3; dz -= 1) path.push([0, dz]);           // на её полосе
        for (let dz = 3; dz > -2.5; dz -= 0.5) path.push([2, dz]);        // ушёл в центр соседней
        expect(pass({}, path)).toBe(true);
    });
    it('просто обогнал по соседней полосе — не засчитано', () => {
        const path = []; for (let dz = 12; dz > -2.5; dz -= 0.5) path.push([2, dz]);
        expect(pass({}, path)).toBe(false);
    });
    it('впритирку сбоку — засчитано, как раньше; один раз на попутку', () => {
        const o = {}, path = []; for (let dz = 12; dz > -2.9; dz -= 0.5) path.push([1.0, dz]);
        expect(pass(o, path)).toBe(true);
        expect(pass(o, path.slice(-3))).toBe(false);
    });
    it('увернулся слишком рано (давно ушёл с её полосы) — не засчитано', () => {
        const o = {};
        nearMissStep(o, 0, 13, HW, 0);
        expect(nearMissStep(o, 2, -1, HW, 2.0)).toBe(false);
    });
});

describe('центр полосы', () => {
    it('отпустил руль между полосами — встаёт в центр ближайшей', () => {
        let x = 1.3; for (let i = 0; i < 60; i++) x = laneAssist(x, 0, 1 / 60, false, false);
        expect(x).toBeCloseTo(2, 2);
        x = 0.6; for (let i = 0; i < 60; i++) x = laneAssist(x, 0, 1 / 60, false, false);
        expect(x).toBeCloseTo(0, 2);
        expect(nearestLane(-2.5)).toBe(-2);
    });
    it('пока рулят, несёт по инерции или скользко — не трогает', () => {
        expect(laneAssist(1.3, 0, 0.1, true, false)).toBe(1.3);
        expect(laneAssist(1.3, 0.2, 0.1, false, false)).toBe(1.3);
        expect(laneAssist(1.3, 0, 0.1, false, true)).toBe(1.3);
    });
});
