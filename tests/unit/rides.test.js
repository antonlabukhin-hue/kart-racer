import { describe, it, expect } from 'vitest';
import { RIDES, RIDE_IDS, RIDE_TIME, pickRide, createRideState, startRide, tickRide, rideOn, rideLift, createRideModel } from '../../src/rides.js';
import { planStretch } from '../../src/infinite.js';

describe('безумный транспорт', () => {
    it('10 секунд, потом снова своя машина', () => {
        const st = createRideState();
        startRide(st, 'tractor');
        expect(rideOn(st)).toBe(true);
        expect(tickRide(st, RIDE_TIME - 0.5)).toBe(false);
        expect(tickRide(st, 1)).toBe(true);
        expect(rideOn(st)).toBe(false);
    });
    it('не повторяет прошлый; кукурузник взлетает и садится', () => {
        for (let i = 0; i < 20; i++) expect(pickRide(Math.random, 'plane')).not.toBe('plane');
        const st = createRideState(); startRide(st, 'plane');
        expect(rideLift(st)).toBe(0);
        tickRide(st, 3); expect(rideLift(st)).toBeGreaterThan(1.3);
        tickRide(st, 6.8); expect(rideLift(st)).toBeLessThan(0.6);
        const tr = createRideState(); startRide(tr, 'tractor'); tickRide(tr, 3); expect(rideLift(tr)).toBe(0);
    });
    it('у каждого своя модель; жетон — не чаще одного на 4000 м, как бы ни резали трассу', () => {
        RIDE_IDS.forEach(function(id) { expect(createRideModel(id).children.length).toBeGreaterThan(0); expect(RIDES[id].name).toBeTruthy(); });
        const ds = [];
        for (let a = 0; a < 20000; a += 1300) planStretch(a, a + 1300, Math.random, { slide: 'slide', nextGap: Infinity }).items.filter(function(i) { return i.kind === 'ride'; }).forEach(function(i) { ds.push(i.d); });
        ds.sort(function(a, b) { return a - b; });
        expect(ds.length).toBeGreaterThanOrEqual(3);
        for (let i = 1; i < ds.length; i++) expect(Math.floor(ds[i] / 4000)).not.toBe(Math.floor(ds[i - 1] / 4000));
        expect(ds[0]).toBeGreaterThanOrEqual(1500);
    });
});
