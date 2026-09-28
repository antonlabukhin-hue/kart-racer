import { describe, it, expect } from 'vitest';
import { newEndlessRun, waveDifficulty, waveConfig, waveScore, partialScore, recordBest } from '../../src/endless.js';

describe('Звериный час', () => {
    it('волны ужесточаются: лёгкая → средняя → сложная (карты — по сиду, beast-seed.test.js)', () => {
        expect([1, 2, 3, 7].map(waveDifficulty)).toEqual(['easy', 'medium', 'hard', 'hard']);
    });

    it('с 4-й волны зверей больше, но не бесконечно', () => {
        const base = { maxAnimals: 10, animalSpawnRate: 1, timeLimit: 90 };
        expect(waveConfig(base, 3).maxAnimals).toBe(10);
        expect(waveConfig(base, 5).maxAnimals).toBe(12);
        expect(waveConfig(base, 50).maxAnimals).toBe(16);
        expect(waveConfig(base, 50).timeLimit).toBe(90);
        expect(base.maxAnimals).toBe(10);
    });

    it('очки: волна дороже любой недоеханной', () => {
        expect(waveScore({ time: 70, nearMiss: 2, starsPicked: 1, timeLimit: 90 })).toBe(1000 + 200 + 100 + 100);
        expect(partialScore(0.99, 0)).toBeLessThan(waveScore({ time: 90 }));
        expect(partialScore(-1)).toBe(0);
    });

    it('рекорд и новый забег', () => {
        expect(recordBest(500, 800)).toEqual({ best: 800, isNew: true });
        expect(recordBest(900, 800)).toEqual({ best: 900, isNew: false });
        expect(newEndlessRun(7)).toEqual({ wave: 1, score: 0, strikes: 0, nearMiss: 0, seed: 7, daily: false });
    });
});

describe('сид забега', () => {
    it('забег помнит сид и то, что он «дня»', () => {
        const r = newEndlessRun(0xABCDEF01, true);
        expect(r.seed).toBe(0xABCDEF01);
        expect(r.daily).toBe(true);
        expect(newEndlessRun(5).daily).toBe(false);
    });
});
