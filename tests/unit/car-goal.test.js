import { describe, it, expect } from 'vitest';
import { nextCarGoal, carGoalHtml } from '../../src/car-goal.js';

const presets = {
    cheburashka: { name: 'Ушастик', priceChips: 0 },
    kirpich: { name: 'Нива', priceChips: 3500 },
    turbo: { name: 'Волга', priceChips: 4500 },
    moped: { name: 'Мопед', priceChips: 0, priceVhs: 15 },
    trike: { name: 'Трайк', priceChips: 1000 }
};

describe('цель на итогах: ближайшая машина за «Е»', () => {
    it('самая дешёвая из тех, что нет; подарочные и за кассеты — не в счёт', () => {
        const g = nextCarGoal({ owned: ['cheburashka'], chips: 850, presets, isGift: id => id === 'trike' });
        expect(g).toMatchObject({ id: 'kirpich', name: 'Нива', left: 2650 });
        expect(g.k).toBeCloseTo(850 / 3500);
        expect(carGoalHtml(g)).toContain('Ещё 2');
        expect(carGoalHtml(g)).toContain('«Нива» в твоём гараже');
    });
    it('хватает — зовёт в «Машины»; все куплены — цели нет', () => {
        const g = nextCarGoal({ owned: ['cheburashka', 'trike'], chips: 5000, presets });
        expect(g.left).toBe(0);
        expect(carGoalHtml(g)).toContain('Хватает');
        expect(nextCarGoal({ owned: ['cheburashka', 'kirpich', 'turbo', 'trike'], chips: 0, presets })).toBe(null);
    });
});
