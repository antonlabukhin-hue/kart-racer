import { describe, it, expect } from 'vitest';
import { settleWave, finishText, waveCardHtml } from '../../src/modes/beast-hour.js';
import { newEndlessRun, WAVE_BASE_POINTS } from '../../src/endless.js';

describe('«Звериный час»: итог волны', () => {
    it('волна пройдена — очки и следующая волна, рекорд не трогаем', () => {
        const run = newEndlessRun(123, false), p = { endlessBest: 5000 };
        const r = settleWave(run, p, { state: 'win', nearMiss: 2, strikes: 1, time: 60, timeLimit: 90, starsPicked: 1 });
        expect(r.next).toBe(true);
        expect(r.gained).toBe(WAVE_BASE_POINTS + 300 + 100 + 100);
        expect(run).toMatchObject({ wave: 2, score: r.gained, strikes: 1, nearMiss: 2 });
        expect(p.endlessBest).toBe(5000);
        expect(waveCardHtml(run, r.gained)).toContain('ВОЛНА 2');
    });
    it('забег окончен — частичные очки, рекорд и лучший за день', () => {
        const run = newEndlessRun(77, true), p = { endlessBest: 100 };
        run.score = 2000;
        expect(settleWave(run, p, { state: 'crash', nearMiss: 1, strikes: 5, progress: 0.5 }).next).toBe(false);
        expect(run.score).toBe(2000 + Math.round(0.5 * WAVE_BASE_POINTS * 0.8) + 50);
        expect(run.isNewBest).toBe(true);
        expect(p.endlessBest).toBe(run.score);
        expect(run.dailyBest).toBe(run.score);
        const ft = finishText(run, { state: 'crash', strikes: 5, maxStrikes: 5, best: p.endlessBest });
        expect(ft.title).toContain('ЗВЕРИНЫЙ ЧАС');
        expect(ft.message).toContain('НОВЫЙ РЕКОРД');
        expect(ft.message).toContain('Лучший за сегодня');
    });
    it('вызов от друга — в итогах', () => {
        const run = newEndlessRun(5, false);
        run.score = 900; run.challenge = { name: 'Лёха', score: 1000 };
        expect(finishText(run, { state: 'crash', strikes: 5, maxStrikes: 5, best: 900 }).message).toContain('не хватило 100');
    });
});
