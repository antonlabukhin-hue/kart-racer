import { describe, it, expect } from 'vitest';
import { BOOSTS, buyBoosts } from '../../src/ui/boosts.js';

describe('бусты перед стартом', () => {
    it('списываются «Е» за выбранные, пока хватает', () => {
        const p = { season: { chips: 400 } };
        expect(buyBoosts(p, ['headstart', 'spare'])).toEqual(['headstart']); // 300 + 150 > 400 — на «Запаску» не хватило
        expect(p.season.chips).toBe(100);
        expect(buyBoosts(p, ['spare'])).toEqual([]);
        expect(buyBoosts({ season: { chips: 1000 } }, [])).toEqual([]);
        expect(BOOSTS.every(b => b.price > 0 && b.name && b.icon)).toBe(true);
    });
});
