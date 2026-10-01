import { describe, it, expect } from 'vitest';
import { goalsInView, goalKey, AHEAD, BEHIND } from '../../src/road-goals.js';

describe('цели на дороге', () => {
    const targets = [{ name: 'Шурик', dist: 40 }, { name: 'Лёха', dist: 800 }, { name: 'твой рекорд', dist: 1200, mine: true }, { name: 'Дед', dist: 3000 }];
    it('ставятся заранее и убираются позади; у самого старта — нет', () => {
        expect(goalsInView(targets, 0).map(t => t.name)).toEqual([]);
        expect(goalsInView(targets, 800 - AHEAD).map(t => t.name)).toEqual(['Лёха']);
        expect(goalsInView(targets, 1000).map(t => t.name)).toEqual(['твой рекорд']);
        expect(goalsInView(targets, 800 + BEHIND - 1).map(t => t.name)).toEqual(['Лёха']);
        expect(goalsInView(targets, 800 + BEHIND + 1).map(t => t.name)).toEqual([]);
        expect(goalsInView(null, 100)).toEqual([]);
    });
    it('ключ — свой рекорд отдельно от соперника с тем же именем', () => {
        expect(goalKey({ name: 'твой рекорд', dist: 1200, mine: true })).not.toBe(goalKey({ name: 'твой рекорд', dist: 1200 }));
        expect(goalKey({ name: 'Лёха', dist: 800.4 })).toBe(goalKey({ name: 'Лёха', dist: 800 }));
    });
});
