import { describe, it, expect } from 'vitest';
import { createPowers, activatePower, tickPowers, eValue, magnetPull, activePowers, continueCost, MAX_CONTINUES, POWERS, powerTime, nextPowerCost, buyPowerLevel, POWER_UP_COST } from '../../src/powerups.js';

describe('усиления бесконечной трассы', () => {
    it('магнит и ×2 действуют своё время, повторный подбор обновляет до полного', () => {
        const st = createPowers();
        expect(eValue(st)).toBe(1);
        activatePower(st, 'x2');
        expect(eValue(st)).toBe(2);
        tickPowers(st, 10);
        activatePower(st, 'x2');
        expect(st.x2).toBe(POWERS.x2.time);
        tickPowers(st, 100);
        expect(eValue(st)).toBe(1);
        expect(activatePower(st, 'nope')).toBe(false);
    });
    it('магнит тянет «Е» впереди и рядом, дальние — нет', () => {
        const st = createPowers();
        const near = { x: 2, z: -10 }, far = { x: 2, z: -40 };
        expect(magnetPull(st, near, 0, 0, 0.1)).toBe(false); // без магнита
        activatePower(st, 'magnet');
        expect(magnetPull(st, near, 0, 0, 0.1)).toBe(true);
        expect(Math.abs(near.x)).toBeLessThan(2);
        expect(near.z).toBeGreaterThan(-10);
        expect(magnetPull(st, far, 0, 0, 0.1)).toBe(false);
        expect(activePowers(st).map(p => p.type)).toEqual(['magnet']);
    });
    it('«Второй шанс»: 100, потом 200 «Е», не больше двух раз', () => {
        expect(continueCost(0)).toBe(200);
        expect(continueCost(1)).toBe(400);
        expect(MAX_CONTINUES).toBe(2);
    });
    it('прокачка усилений за «Е»: +2 с за уровень, 5 уровней, цена растёт', () => {
        expect(powerTime('magnet', 0)).toBe(10);
        expect(powerTime('magnet', 5)).toBe(20);
        const p = { season: { chips: 500 } };
        expect(buyPowerLevel(p, 'magnet')).toMatchObject({ ok: true, cost: 150, level: 1 });
        expect(buyPowerLevel(p, 'magnet')).toMatchObject({ ok: true, cost: 300, level: 2 });
        expect(buyPowerLevel(p, 'magnet')).toMatchObject({ ok: false, reason: 'no_chips', cost: 600 });
        expect(p.season.chips).toBe(50);
        expect(nextPowerCost(5)).toBe(null);
        expect(POWER_UP_COST).toHaveLength(5);
        const st = createPowers({ magnet: 2 });
        activatePower(st, 'magnet');
        expect(st.magnet).toBe(14);
    });
});

import { shieldHits, shieldBonus, powerLabel, POWER_UPGRADABLE as UPG, buyPowerLevel as buyLv } from '../../src/powerups.js';
describe('прокачка брони за «Е»', () => {
    it('броня крепнет: 1 → 4 удара, «Е» за отбитый', () => {
        expect([0, 1, 2, 3, 4, 5].map(shieldHits)).toEqual([1, 2, 2, 3, 3, 4]);
        expect(shieldBonus(0)).toBe(0);
        expect(shieldBonus(3)).toBe(30);
        expect(powerLabel('shield', 0)).toBe('1 удар');
        expect(powerLabel('shield', 1)).toBe('2 удара · +10 Е');
        expect(powerLabel('magnet', 0)).toMatch(/ с$/);
    });
    it('покупается в гараже как магнит', () => {
        expect(UPG).toContain('shield');
        const p = { season: { chips: 200 } };
        expect(buyLv(p, 'shield')).toMatchObject({ ok: true, cost: 150, level: 1 });
        expect(p.powerLvByCar.cheburashka.shield).toBe(1);
        expect(buyLv(p, 'shield')).toMatchObject({ ok: false, reason: 'no_chips' });
    });
});

import { powerLevelsFor } from '../../src/powerups.js';
describe('прокачка усилений — у каждой машины своя', () => {
    it('купил на одной машине — на другой нет; старая общая прокачка переходит машине, на которой ездишь', () => {
        const p = { season: { chips: 1000 }, preferredCar: 'kirpich', powerLv: { magnet: 2, x2: 0, shield: 1 } };
        expect(powerLevelsFor(p, 'kirpich')).toEqual({ magnet: 2, x2: 0, shield: 1 });
        expect(p.powerLv).toBeUndefined();
        expect(powerLevelsFor(p, 'turbo')).toEqual({ magnet: 0, x2: 0, shield: 0 });
        expect(buyLv(p, 'x2', 'turbo')).toMatchObject({ ok: true, level: 1 });
        expect(powerLevelsFor(p, 'turbo').x2).toBe(1);
        expect(powerLevelsFor(p, 'kirpich').x2).toBe(0);
    });
});
