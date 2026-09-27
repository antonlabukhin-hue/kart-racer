import { describe, it, expect } from 'vitest';
import { gapLayout, gapStyle, SETPIECE_LAYOUT } from '../../src/setpieces.js';

describe('постановочные участки', () => {
    it('на лёгкой два разлома, на средней и сложной — три', () => {
        expect(gapLayout('easy')).toHaveLength(2);
        expect(gapLayout('medium')).toHaveLength(3);
        expect(gapLayout('hard')).toHaveLength(3);
    });

    it('у каждой карты своё «дно» разлома', () => {
        const styles = [gapStyle('arsenev', false), gapStyle('promzona', false), gapStyle('svalka', false), gapStyle('arsenev', true)];
        expect(new Set(styles.map(s => s.floor)).size).toBe(4);
    });

    ['easy', 'medium', 'hard'].forEach(diff => {
        it(`участки не мешают старту, боссу и финишу (${diff})`, () => {
            const gaps = gapLayout(diff);
            const all = gaps.concat(SETPIECE_LAYOUT.debrisZones);
            all.forEach(f => {
                expect(f).toBeGreaterThan(0.1);   // спокойный старт
                expect(f).toBeLessThan(0.96);     // финишная прямая
            });
            // разломы — вне зоны появления босса (с 42%)
            gaps.forEach(f => expect(f < 0.42 || f > 0.75).toBe(true));
            // участки не наслаиваются друг на друга
            const sorted = all.slice().sort((a, b) => a - b);
            for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThan(0.05);
        });
    });
});
