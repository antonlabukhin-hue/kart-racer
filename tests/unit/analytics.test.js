import { describe, it, expect } from 'vitest';
import { track, loadEvents, summarize, setSender, MAX_EVENTS } from '../../src/analytics.js';

function memStorage() {
    const m = {};
    return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
}

describe('аналитика', () => {
    it('события копятся в кольцевом буфере', () => {
        const st = memStorage();
        for (let i = 0; i < MAX_EVENTS + 5; i++) track('tick', { i }, st);
        const ev = loadEvents(st);
        expect(ev).toHaveLength(MAX_EVENTS);
        expect(ev[0].i).toBe(5);
        expect(ev[0].s).toBeTruthy();
    });

    it('сводка: результаты, главы, причины аварий, где проигрывают', () => {
        const ev = [
            { e: 'race_start', s: 'a' }, { e: 'crash', cause: 'Лось', s: 'a' }, { e: 'crash', cause: 'Лось', s: 'a' },
            { e: 'race_end', state: 'crash', chapter: 'c01', progress: 0.47, s: 'a' },
            { e: 'race_start', s: 'b' }, { e: 'race_end', state: 'win', chapter: 'c01', time: 60, s: 'b' },
            { e: 'race_start', s: 'b' }, { e: 'race_end', state: 'win', time: 70, wave: 3, s: 'b' },
            { e: 'race_quit', s: 'b' }
        ];
        const r = summarize(ev);
        expect(r).toMatchObject({ sessions: 2, races: 3, finished: 3, quits: 1, avgWinTime: 65, bestEndlessWave: 3 });
        expect(r.results).toEqual({ crash: 1, win: 2 });
        expect(r.chapters.c01).toEqual({ tries: 2, wins: 1, winRate: 50 });
        expect(r.crashCauses).toEqual({ 'Лось': 2 });
        expect(r.loseAt).toEqual({ '40%': 1 });
    });

    it('отправщик получает каждое событие; без хранилища не падает', () => {
        const got = [];
        setSender(e => got.push(e.e));
        track('x', {}, memStorage());
        setSender(null);
        track('y', {}, memStorage());
        expect(got).toEqual(['x']);
        expect(() => track('z', {}, null)).not.toThrow();
    });
});
