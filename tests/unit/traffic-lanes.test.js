import { describe, it, expect } from 'vitest';
import { laneX, laneOf, hugFor, carX, busyLanes, canEnterLane, wallBreaker, spawnLane, WALL_WIN } from '../../src/traffic-lanes.js';

const car = (lane, z, extra) => Object.assign({ lane, z, active: true, laneChangeTimer: 2 }, extra);

describe('полосы попуток', () => {
    it('центры полос симметричны: −2, 0, +2 (как у игрока); попутки — строго по центру', () => {
        expect([0, 1, 2].map(laneX)).toEqual([-2, 0, 2]);
        expect([-2.5, -1.1, 0.4, 2.5].map(laneOf)).toEqual([0, 0, 1, 2]);
        expect([0, 1, 2].map(l => carX(l, hugFor(l)))).toEqual([-2, 0, 2]);
    });
    it('перестраивающаяся машина занимает обе полосы', () => {
        expect([...busyLanes([car(0, 100, { isChangingLane: true, targetLane: 1 })], 100, WALL_WIN)].sort()).toEqual([0, 1]);
    });
    it('третью полосу в ряду не занять: ни перестроением, ни появлением', () => {
        const cars = [car(0, 100), car(1, 106)];
        expect(canEnterLane(cars, car(2, 103), 2)).toBe(false);
        expect(canEnterLane(cars, car(2, 130), 2)).toBe(true); // далеко по ходу — уже не ряд
        expect(spawnLane(cars, 103, 2)).toBe(null);
        expect(spawnLane([car(0, 100)], 103, 0)).toBe(1); // впритык в той же полосе — нельзя, рядом свободна
        expect(spawnLane([car(0, 100)], 120, 0)).toBe(0);
    });
    it('«стенка» из трёх: убираем переднюю подвижную; кортеж и пробку не трогаем', () => {
        const a = car(0, 100), b = car(1, 95), c = car(2, 104, { convoy: true });
        expect(wallBreaker([a, b, c], 200, 0)).toBe(b);
        expect(wallBreaker([a, car(1, 140), c], 200, 0)).toBe(null);
        const jam = [car(0, 100, { laneChangeTimer: 1e9 }), car(1, 100, { laneChangeTimer: 1e9 }), car(2, 98)];
        expect(wallBreaker(jam, 200, 0)).toBe(jam[2]);
    });
});
