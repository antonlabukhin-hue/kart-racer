import { describe, it, expect } from 'vitest';
import { gapRampLanes, gapStyle, SETPIECE_LAYOUT } from '../../src/setpieces.js';

describe('постановочные участки', () => {
    it('чем сложнее, тем меньше полос с трамплином перед разломом', () => {
        expect(gapRampLanes('easy')).toBe(3);
        expect(gapRampLanes('medium')).toBe(2);
        expect(gapRampLanes('hard')).toBe(1);
    });

    it('у каждой карты своё «дно» разлома', () => {
        const styles = [gapStyle('arsenev', false), gapStyle('promzona', false), gapStyle('svalka', false), gapStyle('arsenev', true)];
        expect(new Set(styles.map(s => s.floor)).size).toBe(4);
    });

    it('участки не мешают старту, боссу и финишу', () => {
        const all = SETPIECE_LAYOUT.gaps.concat(SETPIECE_LAYOUT.debrisZones);
        all.forEach(f => {
            expect(f).toBeGreaterThan(0.1);   // спокойный старт
            expect(f).toBeLessThan(0.96);     // финишная прямая
        });
        // разломы — вне зоны появления босса (с 42%)
        SETPIECE_LAYOUT.gaps.forEach(f => expect(f < 0.42 || f > 0.75).toBe(true));
        // участки не наслаиваются друг на друга
        const sorted = all.slice().sort();
        for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThan(0.05);
    });
});
