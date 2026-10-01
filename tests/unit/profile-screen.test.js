import { describe, it, expect } from 'vitest';
import { profileStats } from '../../src/ui/profile-screen.js';
import { BADGES } from '../../src/badges.js';

describe('экран профиля', () => {
    it('сводка прогресса: заезды, победы, рекорд, «Е», кассеты, машины, значки, серия слова', () => {
        const p = { stats: { totalRaces: 12, wins: 3 }, season: { chips: 4500, vhs: 2 }, infinite: { best: 5160 }, unlockedCars: ['a', 'b'], badges: { got: { tech: 1 } }, wordDay: { streak: 4 } };
        const r = profileStats(p, 24);
        const v = Object.fromEntries(r.map(x => [x[1], String(x[2])]));
        expect(v['Заездов']).toBe('12');
        expect(v['Побед']).toBe('3');
        expect(v['Рекорд дальности']).toMatch(/^5\s?160 м$/);
        expect(v['Машин']).toBe('2 / 24');
        expect(v['Значков 90-х']).toBe('1 / ' + BADGES.length);
        expect(v['Серия «Слова дня»']).toBe('4');
        expect(profileStats({}, 24).length).toBe(8);
    });
});
