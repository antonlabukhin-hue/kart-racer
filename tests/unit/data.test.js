import { describe, it, expect } from 'vitest';
import { CAMPAIGN_TRACKS, CAMPAIGN_STAGE_MODS, CAR_PRESETS, ANIMAL_TYPES, MAP_ANIMALS } from '../../src/data.js';

describe('каталоги data.js', () => {
    it('у трасс кампании уникальные id, модификаторы только для существующих трасс', () => {
        const ids = CAMPAIGN_TRACKS.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        Object.keys(CAMPAIGN_STAGE_MODS).forEach(id => expect(ids).toContain(id));
    });

    it('у трасс известные карта, погода и сложность', () => {
        CAMPAIGN_TRACKS.forEach(t => {
            expect(Object.keys(MAP_ANIMALS)).toContain(t.style);
            expect(['day', 'night', 'rain']).toContain(t.weather);
            expect(['easy', 'medium', 'hard']).toContain(t.diff);
        });
    });

    it('на картах только существующие звери', () => {
        Object.values(MAP_ANIMALS).flat().forEach(k => expect(ANIMAL_TYPES).toHaveProperty(k));
    });

    it('стартовая машина бесплатная', () => {
        expect(CAR_PRESETS.cheburashka.priceChips).toBe(0);
    });
});
