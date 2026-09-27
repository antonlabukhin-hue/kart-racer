import { describe, it, expect } from 'vitest';
import { mapAudioTheme, musicRate, MAP_AUDIO, BOSS_RATE_BOOST } from '../../src/map-audio.js';

describe('звуковая тема карты', () => {
    it('у каждой карты свой фон и темп', () => {
        const beds = ['arsenev', 'promzona', 'svalka'].map(m => mapAudioTheme(m).bed);
        expect(new Set(beds).size).toBe(3);
        expect(mapAudioTheme('promzona').rate).toBeLessThan(mapAudioTheme('svalka').rate);
    });

    it('снежная трасса — вьюга на любой карте; неизвестная карта — тайга', () => {
        expect(mapAudioTheme('svalka', 'snow').bed).toBe('blizzard');
        expect(mapAudioTheme('нет').id).toBe('arsenev');
    });

    it('с боссом трек быстрее', () => {
        const t = mapAudioTheme('arsenev');
        expect(musicRate(t, true)).toBeCloseTo(MAP_AUDIO.arsenev.rate + BOSS_RATE_BOOST, 5);
        expect(musicRate(t, false)).toBe(1);
        expect(musicRate(null, false)).toBe(1);
    });
});
