import { describe, it, expect } from 'vitest';
import { WAVE_RULES, waveRule, applyChoice, defaultChoice } from '../../src/wave-rules.js';
import { settleWave } from '../../src/modes/beast-hour.js';
import { newEndlessRun, waveConfig } from '../../src/endless.js';
import { ANIMAL_TYPES } from '../../src/data.js';

describe('правила волн «Звериного часа»', () => {
    it('первая — разминка; дальше — по сиду, без повтора подряд; у друга по сиду — те же', () => {
        expect(waveRule(123, 1)).toBe(null);
        for (let w = 3; w < 30; w++) expect(waveRule(123, w)).not.toBe(waveRule(123, w - 1));
        expect(waveRule(123, 5)).toBe(waveRule(123, 5));
        const ids = new Set(Array.from({ length: 40 }, (_, w) => (waveRule(777, w + 2) || {}).id));
        expect(ids.size).toBeGreaterThanOrEqual(5);
    });
    it('звери из правил существуют; число зверей — по правилу', () => {
        WAVE_RULES.forEach(r => (r.pool || []).forEach(a => expect(ANIMAL_TYPES[a], a).toBeTruthy()));
        const base = { maxAnimals: 10, animalSpawnRate: 1 };
        expect(waveConfig(base, 2, { animalMul: 2 }).maxAnimals).toBe(20);
        expect(waveConfig(base, 2, null).maxAnimals).toBe(10);
    });
    it('выбор между волнами: сердце прощает аварию, без аварий — ×2; ×2 удваивает очки волны', () => {
        const run = newEndlessRun(1, false);
        run.strikes = 2;
        expect(defaultChoice(run)).toBe('heart');
        expect(applyChoice(run, 'heart')).toBe('heart');
        expect(run.strikes).toBe(1);
        run.strikes = 0;
        expect(applyChoice(run, 'heart')).toBe('double');
        expect(run.mul).toBe(2);
        const p = {};
        const r = settleWave(run, p, { state: 'win', strikes: 0, time: 90, timeLimit: 90 });
        expect(r.gained % 2).toBe(0);
        expect(run.mul).toBe(1);
    });
    it('«Прыгай!» — очки за перепрыгнутых зверей', () => {
        let seed = 1;
        while ((waveRule(seed, 2) || {}).id !== 'jumps') seed++;
        const a = newEndlessRun(seed, false); a.wave = 2;
        const b = newEndlessRun(seed, false); b.wave = 2;
        const ga = settleWave(a, {}, { state: 'win', strikes: 0, time: 90, timeLimit: 90, jumps: 0 }).gained;
        const gb = settleWave(b, {}, { state: 'win', strikes: 0, time: 90, timeLimit: 90, jumps: 3 }).gained;
        expect(gb - ga).toBe(750);
    });
});
