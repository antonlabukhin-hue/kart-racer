import { describe, it, expect } from 'vitest';
import { RANKS, playerLevel, rankOf, totalFromSeason, rankLabel } from '../../src/ranks.js';
import { applyRaceResult, ensureProfileFields, seasonXpToNext } from '../../src/profile.js';

describe('уровень и звание игрока', () => {
    it('уровень растёт от всего опыта, каждый следующий дороже', () => {
        expect(playerLevel(0)).toBe(1);
        expect(playerLevel(400)).toBe(5);
        expect(playerLevel(3000)).toBe(11);
        expect(playerLevel(22000)).toBe(30);
    });
    it('звания по порядку: от «Новичка» до «Легенды 90-х»', () => {
        expect(rankOf(0).rank.name).toBe('Новичок');
        expect(rankOf(1199).rank.name).toBe('Водила');
        expect(rankOf(1200).rank.name).toBe('Шофёр');
        expect(rankOf(800).k).toBeCloseTo(0.5, 5);
        expect(rankOf(1e6)).toMatchObject({ next: null, k: 1, index: RANKS.length - 1 });
        expect(rankLabel(1200)).toBe('ур. 7 · 🚕 Шофёр');
    });
    it('старый профиль: весь опыт — из прогресса сезона; заезд поднимает звание', () => {
        expect(totalFromSeason({ level: 3, xp: 10 }, seasonXpToNext)).toBe(80 + 105 + 10);
        const p = ensureProfileFields({ season: { level: 1, xp: 0, chips: 0, gum: 0 } });
        expect(p.totalXp).toBe(0);
        p.totalXp = 390;
        const r = applyRaceResult(p, 'crash', { time: 60, strikes: 5, distance: 1000 }, { trophies: [], now: 1 });
        expect(r.totalXp).toBeGreaterThanOrEqual(400);
        expect(r.rankUp.name).toBe('Водила');
    });
});
