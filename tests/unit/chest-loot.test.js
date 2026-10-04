import { describe, it, expect } from 'vitest';
import { rollChestLoot, lootPool, lootChance, lootText } from '../../src/chest-loot.js';
import { CAR_PARTS } from '../../src/content.js';

const seq = function(a) { let i = 0; return function() { return a[i++ % a.length]; }; };
const prof = function() { return { preferredCar: 'cheburashka', carLoadout: { parts: [], ownedParts: [] }, upgrades: {} }; };

describe('тюнинг в сундуке', () => {
    it('7-й день — всегда, обычный — по шансу', () => {
        expect(lootChance(7)).toBe(1);
        expect(lootChance(14)).toBe(1);
        expect(rollChestLoot(prof(), 1, seq([0.9]))).toBe(null);
        expect(rollChestLoot(prof(), 7, seq([0.99, 0.1, 0]))).not.toBe(null);
    });
    it('деталь — в купленные и сияет в гараже', () => {
        const p = prof();
        const l = rollChestLoot(p, 7, seq([0, 0.1, 0]));
        expect(l.kind).toBe('part');
        expect(p.carLoadout.ownedParts).toContain(l.id);
        expect(p.carLoadout.newGifts).toContain('part:' + l.id);
        expect(lootText(l)).toMatch(/Деталь: /);
    });
    it('прокачка — +1 уровень машине, на которой ездишь', () => {
        const p = prof();
        const l = rollChestLoot(p, 7, seq([0, 0.9, 0]));
        expect(l.kind).toBe('upgrade');
        expect(p.upgrades.cheburashka[l.id]).toBe(1);
        expect(lootText(l, 'Ушастик')).toMatch(/ур\. 1 для «Ушастик»/);
    });
    it('все детали есть — даёт прокачку; всё на максимуме — ничего', () => {
        const p = prof();
        p.carLoadout.ownedParts = CAR_PARTS.map(function(x) { return x.id; });
        expect(rollChestLoot(p, 7, seq([0, 0.1, 0])).kind).toBe('upgrade');
        p.upgrades.cheburashka = { engine: 3, gearbox: 3, tires: 3, armor: 3, nitro: 3 };
        expect(lootPool(p, 'cheburashka').ups.length).toBe(0);
        expect(rollChestLoot(p, 7, seq([0, 0.1, 0]))).toBe(null);
    });
    it('«Кирпичу» не даёт багажник на крышу', () => {
        expect(lootPool(prof(), 'kirpich').parts.map(function(x) { return x.id; })).not.toContain('roof_rack');
    });
});
