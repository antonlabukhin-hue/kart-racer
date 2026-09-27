import { describe, it, expect } from 'vitest';
import { LAYOUTS, resolveLayout, validateLayout } from '../../src/track-layout.js';
import { CAMPAIGN_TRACKS } from '../../src/data.js';

const DIFFS = ['easy', 'medium', 'hard'];

describe('трассы из данных', () => {
    Object.keys(LAYOUTS.maps).forEach(mapId => DIFFS.forEach(diff => {
        it(`${mapId} / ${diff}: раскладка корректна`, () => {
            const l = resolveLayout(LAYOUTS, { mapId, difficulty: diff });
            expect(validateLayout(l)).toEqual([]);
            expect(l.gaps).toHaveLength(diff === 'easy' ? 2 : 3);
        });
    }));

    it('все главы кампании собираются в корректную раскладку', () => {
        CAMPAIGN_TRACKS.forEach(t => {
            const l = resolveLayout(LAYOUTS, { mapId: t.style, difficulty: t.diff, campaignId: t.id });
            expect(validateLayout(l), t.id).toEqual([]);
        });
    });

    it('у карт разные раскладки, у финала — четыре разлома', () => {
        const sig = m => JSON.stringify(resolveLayout(LAYOUTS, { mapId: m, difficulty: 'hard' }));
        expect(new Set(['arsenev', 'promzona', 'svalka'].map(sig)).size).toBe(3);
        expect(resolveLayout(LAYOUTS, { mapId: 'arsenev', difficulty: 'hard', campaignId: 'c17' }).gaps).toHaveLength(4);
    });

    it('проверка ловит ошибки', () => {
        expect(validateLayout({ gaps: [0.5], debris: [0.2], event: 0.7 })).toContain('0.5: разлом в зоне босса');
        expect(validateLayout({ gaps: [0.2], debris: [0.22], event: 0.7 }).join()).toContain('наслаиваются');
        expect(validateLayout({ gaps: [0.05], debris: [0.3], event: 0.99 })).toHaveLength(2);
        expect(validateLayout(null)).toHaveLength(1);
    });

    it('неизвестная карта и сложность — раскладка по умолчанию', () => {
        expect(resolveLayout(LAYOUTS, { mapId: '?', difficulty: '?' })).toEqual(resolveLayout(LAYOUTS, { mapId: 'arsenev', difficulty: 'medium' }));
    });
});
