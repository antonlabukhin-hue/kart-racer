import { describe, it, expect } from 'vitest';
import { wavePlan, dailySeed, seedCode, parseSeedCode, rng32 } from '../../src/beast-seed.js';
import { validateLayout } from '../../src/track-layout.js';

describe('«Звериный час» по сиду', () => {
    it('один сид — одни и те же волны; другой сид — другие', () => {
        const a = [1, 2, 3, 4, 5].map(w => wavePlan(12345, w));
        const b = [1, 2, 3, 4, 5].map(w => wavePlan(12345, w));
        expect(a).toEqual(b);
        const c = [1, 2, 3, 4, 5].map(w => wavePlan(987654, w));
        expect(c).not.toEqual(a);
    });

    it('раскладка каждой волны проходит проверку трассы; разломов больше с волной', () => {
        for (let seed = 1; seed < 60; seed++) {
            for (let w = 1; w <= 8; w++) {
                const p = wavePlan(seed * 7919, w);
                expect(p.layout, 'сид ' + seed + ' волна ' + w).not.toBeNull();
                expect(validateLayout(p.layout)).toEqual([]);
                expect(p.layout.gaps.length).toBe(w <= 1 ? 1 : w <= 3 ? 2 : 3);
            }
        }
    });

    it('карты не повторяются подряд, первая волна — днём', () => {
        for (let seed = 1; seed < 40; seed++) {
            expect(wavePlan(seed, 1).weather).toBe('day');
            for (let w = 1; w < 7; w++) expect(wavePlan(seed, w).map).not.toBe(wavePlan(seed, w + 1).map);
        }
    });

    it('сид дня одинаков в течение дня и меняется на следующий', () => {
        expect(dailySeed(new Date(2026, 8, 29, 9))).toBe(dailySeed(new Date(2026, 8, 29, 23)));
        expect(dailySeed(new Date(2026, 8, 29))).not.toBe(dailySeed(new Date(2026, 8, 30)));
    });

    it('код сида читается и разбирается обратно', () => {
        const s = 0x3f7a21c9;
        expect(seedCode(s)).toBe('3F7A-21C9');
        expect(parseSeedCode('3f7a-21c9')).toBe(s);
        expect(parseSeedCode('3F7A21C9')).toBe(s);
        expect(parseSeedCode('ерунда')).toBeNull();
        const r = rng32(1);
        const v = r();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
    });
});
