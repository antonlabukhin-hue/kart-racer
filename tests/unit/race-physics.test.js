import { describe, it, expect } from 'vitest';
import { rampContact, stepRamps, stepAir, timeToLand, landingSpeed, launchVelocity, GRAVITY } from '../../src/race-physics.js';

// трамплин как в игре: центр z, длина 4, высота 0.85, полоса x = 0
const ramp = (over) => Object.assign({ x: 0, z: 0, zEnter: 2, zExit: -2, len: 4, width: 2.2, height: 0.85 }, over || {});
const st = (over) => Object.assign({ x: 0, z: 0, zPrev: 0.5, speed: 0.42, nitro: false, maxSpeed: 0.42 }, over || {});

describe('трамплины', () => {
    it('касание: только в своей полосе и между заездом и съездом', () => {
        expect(rampContact(0, 0, 0.5, ramp())).toEqual({ p: 0.5, crossed: false });
        expect(rampContact(1.5, 0, 0.5, ramp())).toBeNull();   // соседняя полоса
        expect(rampContact(0, 5, 5.5, ramp())).toBeNull();     // ещё не доехал
        expect(rampContact(0, -5, -4.5, ramp())).toBeNull();   // уже проехал
    });

    it('на высокой скорости кадр проносит сквозь кромку — всё равно взлёт', () => {
        const r = stepRamps(st({ z: -2.6, zPrev: -1.5 }), [ramp()]);
        expect(r.mode).toBe('launch');
        expect(r.y).toBe(0.85);
    });

    it('по трамплину — подъём, у кромки — взлёт, медленно — просто съезд', () => {
        expect(stepRamps(st({ z: 0.4, zPrev: 0.8 }), [ramp()])).toMatchObject({ mode: 'ride', y: 0.85 * 0.4 });
        expect(stepRamps(st({ z: -1.7, zPrev: -1.4 }), [ramp()]).mode).toBe('launch');
        expect(stepRamps(st({ z: -1.7, zPrev: -1.69, speed: 0.05 }), [ramp()]).mode).toBe('ride');
        expect(stepRamps(st({ x: 2 }), [ramp()]).mode).toBe('none');
    });

    it('трамплин перед разломом всегда перебрасывает, даже после аварии', () => {
        const r = stepRamps(st({ z: -1.9, zPrev: -1.85, speed: 0.05 }), [ramp({ gapRamp: true })]);
        expect(r.mode).toBe('launch');
        expect(r.speed).toBeCloseTo(0.42 * 0.6, 6);
    });

    it('нитро и трамплин тарана подбрасывают выше', () => {
        const base = launchVelocity(0.42, ramp(), false);
        expect(launchVelocity(0.42, ramp(), true)).toBeCloseTo(base * 1.6, 6);
        expect(launchVelocity(0.42, ramp({ bossRamp: true }), false)).toBeCloseTo(base * 1.7, 6);
        expect(launchVelocity(0.3, ramp(), false)).toBeLessThan(base);
    });
});

describe('полёт и приземление', () => {
    it('полёт по параболе заканчивается на земле за расчётное время', () => {
        let y = 0.85, v = launchVelocity(0.42, ramp(), false), t = 0;
        const expected = timeToLand(y, v);
        for (let i = 0; i < 1000; i++) {
            const r = stepAir(y, v, 1 / 120);
            t += 1 / 120;
            y = r.y; v = r.vel;
            if (r.landed) break;
        }
        expect(y).toBe(0);
        expect(t).toBeGreaterThan(0.5);
        expect(Math.abs(t - expected)).toBeLessThan(0.02);
    });

    it('шаг 50 мс (слабый ПК) и 8 мс (144 Гц) дают почти одинаковое время полёта', () => {
        const fly = (dt) => { let y = 0.85, v = 2, t = 0; for (;;) { const r = stepAir(y, v, dt); t += dt; y = r.y; v = r.vel; if (r.landed) return t; } };
        expect(Math.abs(fly(0.05) - fly(1 / 144))).toBeLessThan(0.06);
    });

    it('приземление: разгон не выше потолка; почти стоя — без разгона', () => {
        expect(landingSpeed(0.3, 0.42)).toEqual({ speed: 0.3 * 1.14, boosted: true });
        expect(landingSpeed(0.42, 0.42).speed).toBeCloseTo(0.42 * 1.08, 6);
        expect(landingSpeed(0.05, 0.42)).toEqual({ speed: 0.05, boosted: false });
        expect(timeToLand(0, 0)).toBe(0);
        expect(GRAVITY).toBe(9.5);
    });
});
