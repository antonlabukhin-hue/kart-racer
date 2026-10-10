import { describe, it, expect } from 'vitest';
import { createMoves, hop, duck, tickMoves, ducking, duckScale, hurdleHit, planHurdles, HOP_V, DUCK_TIME, HURDLE_FROM, FULL_FROM, LOWBAR_H } from '../../src/hop-duck.js';
import { GRAVITY } from '../../src/race-physics.js';

describe('прыжок и подныр', () => {
    it('прыжок — только с земли; пик выше трубы', () => {
        const st = createMoves();
        expect(hop(st, false)).toBe(0);
        expect(hop(st, true)).toBe(HOP_V);
        expect(HOP_V * HOP_V / (2 * GRAVITY)).toBeGreaterThan(LOWBAR_H + 0.4);
    });
    it('подныр длится DUCK_TIME, машина приседает и встаёт', () => {
        const st = createMoves();
        expect(duck(st, true)).toBe(false);
        expect(duck(st, false)).toBe(true);
        tickMoves(st, 0.3); expect(ducking(st)).toBe(true); expect(duckScale(st)).toBeLessThan(0.6);
        tickMoves(st, DUCK_TIME); expect(ducking(st)).toBe(false); expect(duckScale(st)).toBe(1);
    });
    it('труба — перепрыгнуть, шлагбаум — только поднырнуть', () => {
        expect(hurdleHit('lowbar', 0.8, false)).toBe('over');
        ['pipe', 'log', 'jersey', 'tires'].forEach(function(k) { expect(hurdleHit(k, 0.8, false)).toBe('over'); expect(hurdleHit(k, 0, true)).toBe('hit'); });
        ['barrier', 'gantry', 'pipeline'].forEach(function(k) { expect(hurdleHit(k, 0, true)).toBe('under'); expect(hurdleHit(k, 1.1, false)).toBe('hit'); });
        expect(hurdleHit('lowbar', 0, true)).toBe('hit');
        expect(hurdleHit('highbar', 0, true)).toBe('under');
        expect(hurdleHit('highbar', 0.9, false)).toBe('hit');
        expect(hurdleHit('highbar', 0, false)).toBe('hit');
    });
    it('новичку — не раньше HURDLE_FROM; через всю дорогу — только дальше FULL_FROM', () => {
        for (let k = 0; k < 30; k++) {
            planHurdles(0, 4000).forEach(function(p) {
                expect(p.d).toBeGreaterThanOrEqual(HURDLE_FROM);
                if (p.lanes.length === 3) expect(p.d).toBeGreaterThan(FULL_FROM);
                expect(p.lanes.length).toBeGreaterThan(0);
            });
        }
    });
});

import { laneAdvice } from '../../src/hop-duck.js';
describe('подсказка полосы', () => {
    it('помеха впереди на моей полосе — в свободную соседнюю', () => {
        expect(laneAdvice(0, 100, [])).toBe(null);
        expect(laneAdvice(0, 100, [{ x: 0, z: 85 }])).toBe('left');                    // обе свободны
        expect(laneAdvice(0, 100, [{ x: 0, z: 85 }, { x: -2, z: 90 }])).toBe('right');  // слева тоже занято
        expect(laneAdvice(-2, 100, [{ x: -2, z: 85 }])).toBe('right');                 // у края — только к середине
        expect(laneAdvice(0, 100, [{ x: 0, z: 85 }, { x: -2, z: 88 }, { x: 2, z: 92 }])).toBe(null); // некуда
        expect(laneAdvice(0, 100, [{ x: 0, z: 60 }])).toBe(null);                       // далеко
    });
});

import { underDuck, carsToClear, DUCK_CLEAR } from '../../src/hop-duck.js';
describe('пусто под шлагбаумом', () => {
    const h = { z: -100, x0: -1, x1: 1 };
    it('шипы в полосе рамы рядом с ней — под ней, в стороне или далеко — нет', () => {
        expect(underDuck(h, 0, -100)).toBe(true);
        expect(underDuck(h, 0, -100 + DUCK_CLEAR - 1)).toBe(true);
        expect(underDuck(h, 2.5, -100)).toBe(false);
        expect(underDuck(h, 0, -120)).toBe(false);
    });
    it('попутка перед рамой переезжает за неё, пока рама далеко', () => {
        const cars = [{ x: 0, z: -90 }, { x: 0, z: -140 }, { x: 2.5, z: -100 }];
        const r = carsToClear(h, cars, -30);
        expect(r.length).toBe(1);
        expect(r[0].car).toBe(cars[0]);
        expect(r[0].z).toBeLessThan(h.z - DUCK_CLEAR);
    });
    it('рама уже близко — не переставляем (было бы видно)', () => {
        expect(carsToClear(h, [{ x: 0, z: -95 }], -80)).toEqual([]);
    });
});

import { duckK, duckSquash, duckWillClear, createHurdle, blinkHurdle, DUCK_SCALE } from '../../src/hop-duck.js';
describe('подныр читается', () => {
    it('машина сплющена до 40% и шире; без подныра — как была', () => {
        const st = createMoves();
        expect(duckSquash(duckK(st))).toEqual({ sx: 1, sy: 1, sz: 1 });
        duck(st, false); tickMoves(st, 0.3);
        const q = duckSquash(duckK(st));
        expect(q.sy).toBeCloseTo(DUCK_SCALE);
        expect(DUCK_SCALE).toBeLessThanOrEqual(0.4);
        expect(q.sx).toBeGreaterThan(1.1);
    });
    it('рама зелёная, только если подныр продержится до неё', () => {
        const st = createMoves();
        expect(duckWillClear(st, 10, 25)).toBe(false); // не в подныре
        duck(st, false);                               // 0.9 с
        expect(duckWillClear(st, 10, 25)).toBe(true);  // 0.4 с до рамы
        expect(duckWillClear(st, 30, 25)).toBe(false); // 1.2 с — встанет раньше
        tickMoves(st, 0.8);
        expect(duckWillClear(st, 0.3, 25)).toBe(true); // уже под ней
    });
    it('у рамы для подныра — просвет, зелёный в подныре', () => {
        const g = createHurdle('barrier', [0, 1, 2], [-2, 0, 2], -50, 2);
        expect(g.userData.okMat.opacity).toBe(0);
        for (let i = 0; i < 20; i++) blinkHurdle(g, i * 0.016, true);
        expect(g.userData.okMat.opacity).toBeGreaterThan(0.3);
        expect(g.userData.lamps[0].color.getHex()).toBe(0x3cff6a);
        blinkHurdle(g, 1, false);
        expect(g.userData.lamps[0].color.getHex()).not.toBe(0x3cff6a);
        expect(createHurdle('pipe', [0], [-2, 0, 2], -50, 2).userData.okMat).toBeUndefined();
    });
});
