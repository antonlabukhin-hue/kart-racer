import { describe, it, expect } from 'vitest';
import { UPGRADES, computeCarStats, nextCost, normalizeLevels, statBars, MAX_UPGRADE_LEVEL } from '../../src/upgrades.js';
import { CAR_PRESETS } from '../../src/data.js';

describe('прокачка машин', () => {
    it('без прокачки характеристики равны заводским', () => {
        const p = CAR_PRESETS.cheburashka;
        const s = computeCarStats(p, {});
        expect(s.maxSpeed).toBeCloseTo(p.maxSpeed);
        expect(s.accel).toBeCloseTo(p.accel);
        expect(s.durability).toBeCloseTo(p.durability);
        expect(s.nitroTime).toBeCloseTo(3.2);
    });

    it('каждое улучшение улучшает своё и только своё', () => {
        const p = CAR_PRESETS.cheburashka;
        const base = computeCarStats(p, {});
        const eng = computeCarStats(p, { engine: 3 });
        expect(eng.maxSpeed).toBeGreaterThan(base.maxSpeed);
        expect(eng.accel).toBeCloseTo(base.accel);
        expect(computeCarStats(p, { armor: 3 }).durability).toBeLessThan(base.durability);
        expect(computeCarStats(p, { nitro: 2 }).nitroTime).toBeCloseTo(4.2);
        expect(computeCarStats(p, { tires: 1 }).steerMul).toBeGreaterThan(1);
    });

    it('прирост умеренный: полная прокачка не ломает баланс (скорость ≤ +12%)', () => {
        const p = CAR_PRESETS.turbo;
        const full = computeCarStats(p, { engine: 3, gearbox: 3, tires: 3, armor: 3, nitro: 3 });
        expect(full.maxSpeed / p.maxSpeed).toBeLessThanOrEqual(1.12 + 1e-9);
        expect(full.durability).toBeGreaterThan(0.5);
    });

    it('цены растут, после максимума покупать нечего; кривые уровни приводятся', () => {
        UPGRADES.forEach(u => {
            expect(nextCost(u.id, 0)).toBeLessThan(nextCost(u.id, 1));
            expect(nextCost(u.id, 1)).toBeLessThan(nextCost(u.id, 2));
            expect(nextCost(u.id, MAX_UPGRADE_LEVEL)).toBeNull();
        });
        expect(normalizeLevels({ engine: 9, nitro: -2, x: 1 })).toEqual({ engine: 3, gearbox: 0, tires: 0, armor: 0, nitro: 0 });
    });

    it('полосы характеристик в пределах 0..1 и растут с прокачкой', () => {
        Object.values(CAR_PRESETS).forEach(p => {
            const a = statBars(p, {}), b = statBars(p, { engine: 3, gearbox: 3, tires: 3, armor: 3, nitro: 3 });
            a.forEach((bar, i) => {
                expect(bar.v).toBeGreaterThan(0);
                expect(b[i].v).toBeLessThanOrEqual(1);
                expect(b[i].v).toBeGreaterThanOrEqual(bar.v);
            });
        });
    });
});
