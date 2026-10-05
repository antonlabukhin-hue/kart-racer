import { describe, it, expect } from 'vitest';
import { markVisit, newsReady, extrasReady } from '../../src/visits.js';

describe('заходы в игру', () => {
    it('новичок: новости — с 3-го захода, «Слово дня» и прочее — со 2-го дня', () => {
        const p = { id: 'a' };
        markVisit(p, '2026-10-05', '2026-10-05');
        expect(newsReady(p) || extrasReady(p)).toBe(false);
        // повторный вход в тот же профиль на этой же загрузке страницы — не новый заход
        markVisit(p, '2026-10-05', '2026-10-05');
        expect(p.visits.n).toBe(1);
        p.visits.n++; // второй заход в тот же день (перезагрузка страницы)
        expect(newsReady(p)).toBe(false);
        expect(extrasReady(p)).toBe(false);
        p.visits.n++; // третий
        expect(newsReady(p)).toBe(true);
        expect(extrasReady(p)).toBe(false);
    });

    it('новый день — тоже заход и второй день игры', () => {
        const p = { id: 'b', visits: { n: 1, days: 1, last: '2026-10-05' } };
        markVisit(p, '2026-10-06');
        expect(p.visits).toEqual({ n: 2, days: 2, last: '2026-10-06' });
        expect(extrasReady(p)).toBe(true);
        expect(newsReady(p)).toBe(false);
    });

    it('профиль из прежних версий (создан раньше) — всё уже открыто', () => {
        const p = { id: 'c' };
        markVisit(p, '2026-10-05', '2026-09-20');
        expect(newsReady(p)).toBe(true);
        expect(extrasReady(p)).toBe(true);
    });
});
