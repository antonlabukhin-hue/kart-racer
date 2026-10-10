import { describe, it, expect } from 'vitest';
import { crossK, durMul, animalRule, ANIMAL_RULES } from '../../src/animal-rules.js';
import { ANIMAL_TYPES } from '../../src/data.js';

describe('правило у каждого вида зверя', () => {
    it('все виды из правил — настоящие звери игры', () => {
        Object.keys(ANIMAL_RULES).forEach(k => expect(ANIMAL_TYPES[k], k).toBeTruthy());
    });
    it('перебежка всегда от обочины до обочины', () => {
        ['DOG', 'CHICKEN', 'BEAR', 'DEER'].forEach(k => { expect(crossK(k, 0)).toBe(0); expect(crossK(k, 1)).toBeCloseTo(1); });
    });
    it('курица мечется: выбежала, вернулась назад, потом дальше', () => {
        expect(crossK('CHICKEN', 0.35)).toBeGreaterThan(crossK('CHICKEN', 0.6));
        expect(animalRule('CHICKEN')).toBe('zigzag');
    });
    it('медведь стоит посреди дороги', () => {
        expect(crossK('BEAR', 0.4)).toBe(0.5);
        expect(crossK('BEAR', 0.7)).toBe(0.5);
        expect(durMul('BEAR')).toBeGreaterThan(1);
    });
    it('олень и кабан — напролом: быстрее и ровно; остальные — как раньше', () => {
        expect(durMul('DEER')).toBeLessThan(1);
        expect(crossK('BOAR', 0.25)).toBeCloseTo(0.25);
        expect(crossK('DOG', 0.25)).toBeCloseTo(0.25 * 0.25 * (3 - 0.5));
        expect(durMul('DOG')).toBe(1);
    });
});
