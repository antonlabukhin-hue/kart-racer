import { describe, it, expect } from 'vitest';
import { challengeUrl, parseChallenge, stripChallenge, challengeResult, dailyBest } from '../../src/challenge.js';

describe('вызов другу', () => {
    it('ссылка туда и обратно: сид, счёт, волна, имя', () => {
        const url = challengeUrl('https://game.example/kart/?start=0.5#x', { seed: 0x3f7a21c9, score: 12340, wave: 6, name: 'Антон' });
        expect(url.startsWith('https://game.example/kart/?')).toBe(true);
        expect(parseChallenge(url.split('?')[1])).toEqual({ seed: 0x3f7a21c9, score: 12340, wave: 6, name: 'Антон', mode: 'beast' });
    });

    it('битые и опасные ссылки не ломают игру', () => {
        expect(parseChallenge('?start=0.4')).toBeNull();
        expect(parseChallenge('?ch=zzzz')).toBeNull();
        const c = parseChallenge('?ch=3F7A-21C9&s=999999999&n=<script>alert(1)</script>');
        expect(c.score).toBe(10000000);
        expect(c.name).not.toMatch(/[<>]/);
        expect(parseChallenge('?ch=3F7A-21C9').name).toBe('Друг');
    });

    it('параметры вызова убираются из адреса, остальные остаются', () => {
        expect(stripChallenge('?ch=3F7A-21C9&s=5&start=0.4')).toBe('?start=0.4');
        expect(stripChallenge('?ch=3F7A-21C9&s=5')).toBe('');
    });

    it('итог и лучший за день', () => {
        expect(challengeResult(10, 5)).toBe('win');
        expect(challengeResult(5, 5)).toBe('tie');
        expect(challengeResult(4, 5)).toBe('lose');
        expect(dailyBest(null, 7, 100)).toMatchObject({ rec: { seed: 7, best: 100 }, isNew: true });
        expect(dailyBest({ seed: 7, best: 300 }, 7, 100)).toMatchObject({ rec: { seed: 7, best: 300 }, isNew: false });
        // новый день — новый сид, вчерашний рекорд не считается
        expect(dailyBest({ seed: 7, best: 300 }, 8, 100)).toMatchObject({ rec: { seed: 8, best: 100 }, isNew: true });
    });
});

describe('вызов в бесконечной трассе', () => {
    it('m=inf — метры; без m — «Звериный час»', () => {
        const url = challengeUrl('https://x.test/kart/?a=1', { seed: 77, score: 4200.4, name: 'Лёха', mode: 'inf' });
        expect(url).toContain('m=inf');
        expect(parseChallenge(url.split('?')[1])).toMatchObject({ seed: 77, score: 4200, name: 'Лёха', mode: 'inf' });
        expect(stripChallenge('?ch=1&s=2&m=inf&start=0.4')).toBe('?start=0.4');
    });
});
