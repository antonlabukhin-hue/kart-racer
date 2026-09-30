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
        expect(continueCost(0)).toBe(100);
        expect(continueCost(1)).toBe(200);
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
