import { describe, it, expect } from 'vitest';
import { WORDS, wordFor, wordState, collectLetter, wordProgress, wordReward, WORD_REWARD } from '../../src/word-day.js';

describe('Слово дня', () => {
    it('слово на день — из списка 90-х, в один день одно и то же, в разные — меняется', () => {
        expect(WORDS).toContain(wordFor('2026-09-30'));
        expect(wordFor('2026-09-30')).toBe(wordFor('2026-09-30'));
        const week = ['01', '02', '03', '04', '05', '06', '07'].map(d => wordFor('2026-10-' + d));
        expect(new Set(week).size).toBeGreaterThan(3);
    });
    it('буквы собираются по порядку, прогресс держится за день, новый день — заново', () => {
        const p = { season: { chips: 0, vhs: 0 } };
        const s = wordState(p, '2026-09-30');
        expect(s.next).toBe(s.word[0]);
        const a = collectLetter(p, '2026-09-30');
        expect(a).toMatchObject({ letter: s.word[0], got: 1, done: false });
        expect(wordState(p, '2026-09-30').next).toBe(s.word[1]);
        expect(wordProgress(s.word, 1).startsWith(s.word[0] + ' _')).toBe(true);
        expect(wordState(p, '2026-10-01').got).toBe(0);
    });
    it('собрал слово — награда «Е»; серия дней подряд растёт, пропуск — заново; 7-й день — кассета', () => {
        const p = { season: { chips: 0, vhs: 0 } };
        const finish = day => { let r; for (let i = 0; i < 20 && !(r && r.done); i++) r = collectLetter(p, day); return r; };
        const r1 = finish('2026-09-30');
        expect(r1).toMatchObject({ done: true, streak: 1, reward: { chips: WORD_REWARD[0], vhs: 0 } });
        expect(p.season.chips).toBe(WORD_REWARD[0]);
        expect(collectLetter(p, '2026-09-30')).toBe(null); // сегодня уже собрано
        expect(finish('2026-10-01').streak).toBe(2);
        expect(finish('2026-10-03').streak).toBe(1);       // пропустил день
        expect(wordReward(7)).toEqual({ chips: 1000, vhs: 1 });
        expect(wordReward(9).chips).toBe(1000);
    });
});
