import { describe, it, expect } from 'vitest';
import { hitSeverity, grazePush, grazeOutcome, CORE_K, GRAZE_PUSH } from '../../src/hit-zones.js';

describe('зоны столкновения', () => {
    it('ближе к оси — лоб в лоб, краем — задел', () => {
        const hw = 0.5;
        expect(hitSeverity(0, hw, true)).toBe('major');
        expect(hitSeverity(hw * CORE_K - 0.01, hw, true)).toBe('major');
        expect(hitSeverity(hw * CORE_K + 0.01, hw, true)).toBe('minor');
        expect(hitSeverity(-(hw * 0.9), hw, true)).toBe('minor');
    });

    it('в кампании любой удар — авария', () => {
        expect(hitSeverity(0.45, 0.5, false)).toBe('major');
    });

    it('толчок — от помехи', () => {
        expect(grazePush(0.3)).toBe(GRAZE_PUSH);
        expect(grazePush(-0.3)).toBe(-GRAZE_PUSH);
    });

    it('«ГАИ на хвосте»: задел — погоня, задел в погоне — авария; «сердца» — просто задел', () => {
        expect(grazeOutcome(false, false)).toBe('graze');
        expect(grazeOutcome(false, true)).toBe('graze');
        expect(grazeOutcome(true, false)).toBe('chase');
        expect(grazeOutcome(true, true)).toBe('major');
    });
});
