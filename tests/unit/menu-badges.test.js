import { describe, it, expect } from 'vitest';
import { unclaimedRewards, seasonBadge, affordableUpgrades, badgeText } from '../../src/ui/menu-badges.js';

const REWARDS = [{ level: 1 }, { level: 2 }, { level: 3 }, { level: 5 }];

describe('счётчики меню', () => {
    it('награды сезона: открытые и не забранные', () => {
        const p = { season: { level: 3 }, claimedRewards: { 1: 123 } };
        expect(unclaimedRewards(p, REWARDS)).toBe(2);
        expect(unclaimedRewards({ season: { level: 0 } }, REWARDS)).toBe(0);
        expect(unclaimedRewards(null, REWARDS)).toBe(0);
    });
    it('«Подарки»: незабранные награды сезона (смена дня не считается — её нет в меню)', () => {
        const p = { season: { level: 2 }, claimedRewards: {}, daily: { done: false } };
        expect(seasonBadge(p, REWARDS)).toBe(2);
    });
    it('прокачка: сколько улучшений по карману, максимальные не считаются', () => {
        const ups = [{ id: 'engine' }, { id: 'tires' }, { id: 'armor' }];
        const cost = (id, l) => (l + 1) * 10;
        expect(affordableUpgrades({ engine: 0, tires: 1, armor: 3 }, 15, ups, cost, 3)).toBe(1);
        expect(affordableUpgrades({ engine: 0, tires: 1, armor: 3 }, 20, ups, cost, 3)).toBe(2);
        expect(affordableUpgrades({}, 0, ups, cost, 3)).toBe(0);
    });
    it('текст счётчика', () => {
        expect(badgeText(0)).toBe('');
        expect(badgeText(3)).toBe('3');
        expect(badgeText(12)).toBe('9+');
    });
});
