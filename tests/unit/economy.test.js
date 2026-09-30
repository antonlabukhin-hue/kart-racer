import { describe, it, expect } from 'vitest';
import { ensureProfileFields } from '../../src/profile.js';
import { CAR_PRESETS } from '../../src/data.js';
import { UPGRADES } from '../../src/upgrades.js';

describe('экономика «Е»', () => {
    it('накопленное у старого профиля — один раз ×10', () => {
        const p = ensureProfileFields({ season: { level: 2, xp: 5, chips: 7, gum: 3 } });
        expect(p.season.chips).toBe(70);
        ensureProfileFields(p);
        expect(p.season.chips).toBe(70);
        expect(ensureProfileFields({}).season.chips).toBe(0);
    });
    it('цены в «Е»: машины — сотни, прокачка — десятки–сотни, «Зубило» — только за кассеты', () => {
        // машины — от 3000 Е (кроме бесплатного «Ушастика» и машин за кассеты)
        Object.keys(CAR_PRESETS).forEach(id => { const c = CAR_PRESETS[id]; if (id !== 'cheburashka' && !c.priceVhs) expect(c.priceChips).toBeGreaterThanOrEqual(3000); });
        expect(CAR_PRESETS.zubilo).toMatchObject({ priceChips: 0, priceVhs: 5 });
        UPGRADES.forEach(u => u.cost.forEach(c => expect(c).toBeGreaterThanOrEqual(500)));
    });
});
