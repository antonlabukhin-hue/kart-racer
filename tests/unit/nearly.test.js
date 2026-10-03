import { describe, it, expect } from 'vitest';
import { nearlyLines, nearlyHtml } from '../../src/nearly.js';

describe('«почти» на итогах', () => {
    it('рекорд рядом — первым; далеко — нет; новый рекорд — нет', () => {
        expect(nearlyLines({ dist: 3860, best: 4000 })[0].text).toBe('До рекорда не хватило 140 м!');
        expect(nearlyLines({ dist: 1000, best: 4000 })).toEqual([]);
        expect(nearlyLines({ dist: 4100, best: 4000, isNew: true })).toEqual([]);
    });
    it('соперник и задание; не больше двух, самые близкие', () => {
        const l = nearlyLines({ dist: 2000, best: 9000, targets: [{ name: 'Лёха', dist: 2060 }, { name: 'твой рекорд', dist: 9000, mine: true }],
            missions: [{ text: 'Перепрыгни зверей', after: 3, target: 4 }, { text: 'Собери «Е»', after: 10, target: 120 }] });
        expect(l.map(x => x.icon)).toEqual(['🎯', '📋']);
        expect(l[0].text).toBe('До «Лёха» — 60 м');
        expect(l[1].text).toContain('осталось 1');
        expect(nearlyHtml(l)).toContain('Ещё разок');
        expect(nearlyHtml([])).toBe('');
    });
});
