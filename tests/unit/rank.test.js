import { describe, it, expect } from 'vitest';
import { raceRank, beastRank, rankBetter } from '../../src/rank.js';

const base = { timeLimit: 90, maxStrikes: 5 };

describe('ранг свободного заезда', () => {
    it('быстро, без аварий, со стилем и боссом — S', () => {
        const r = raceRank(Object.assign({}, base, { time: 52, strikes: 0, nearMiss: 8, cleanSegments: 3, animalsJumped: 1, bossDefeated: true }));
        expect(r.letter).toBe('S');
        expect(r.tip).toBe('');
    });

    it('едва успел и 4 аварии — D; подсказка — самое слабое место', () => {
        const r = raceRank(Object.assign({}, base, { time: 89, strikes: 4 }));
        expect(r.letter).toBe('D');
        expect(r.tip).toBe('Быстрее к финишу');
    });

    it('чем лучше заезд, тем выше ранг', () => {
        const mid = raceRank(Object.assign({}, base, { time: 70, strikes: 2, nearMiss: 2 }));
        const good = raceRank(Object.assign({}, base, { time: 62, strikes: 0, nearMiss: 5, cleanSegments: 2 }));
        expect(good.score).toBeGreaterThan(mid.score);
        expect(rankBetter(good.letter, mid.letter) || good.letter === mid.letter).toBe(true);
        expect(['C', 'B']).toContain(mid.letter);
    });
});

describe('стиль', () => {
    it('снесённые щиты добавляют очки стиля', () => {
        const a = raceRank(Object.assign({}, base, { time: 70, strikes: 1 }));
        const b = raceRank(Object.assign({}, base, { time: 70, strikes: 1, billboards: 3 }));
        expect(b.parts.style - a.parts.style).toBe(6);
    });
});

describe('ранг «Звериного часа»', () => {
    it('по волне', () => {
        expect(beastRank(1).letter).toBe('D');
        expect(beastRank(3).letter).toBe('C');
        expect(beastRank(5)).toMatchObject({ letter: 'B', tip: 'До ранга A — волна 6' });
        expect(beastRank(9)).toMatchObject({ letter: 'S', tip: '' });
    });
});
