import { describe, it, expect } from 'vitest';
import { cleanName, topUrl, rowsToRuns, submitRun, fetchTop, ONLINE } from '../../src/online-board.js';

describe('онлайн-таблица рекордов', () => {
    it('имя чистится и обрезается до 24 символов', () => {
        expect(cleanName('  Аня   Б ')).toBe('Аня Б');
        expect(cleanName('')).toBe('Игрок');
        expect(cleanName('x'.repeat(40))).toHaveLength(24);
    });
    it('запрос топа: всё время — без даты, неделя — с понедельника', () => {
        expect(topUrl('all')).toContain('order=dist.desc');
        expect(topUrl('all')).not.toContain('created_at=gte');
        const u = decodeURIComponent(topUrl('week', new Date(2026, 8, 30, 15)));
        expect(u).toContain('created_at=gte.' + new Date(2026, 8, 28).toISOString());
    });
    it('строки базы → записи таблицы; мусор отбрасывается', () => {
        expect(rowsToRuns([{ name: 'Аня', dist: 1200.6, car: 'neon', created_at: '2026-09-30T10:00:00Z' }, { dist: 5 }, null]))
            .toEqual([{ name: 'Аня', dist: 1201, car: 'neon', at: Date.parse('2026-09-30T10:00:00Z') }]);
        expect(rowsToRuns('x')).toEqual([]);
    });
    it('отправка: короткий заезд не шлём; ключ и тело на месте; нет сети — false', async () => {
        const calls = [];
        const ok = async (url, o) => { calls.push([url, o]); return { ok: true }; };
        expect(await submitRun({ name: 'Аня', dist: 10 }, ok)).toBe(false);
        expect(await submitRun({ name: 'Аня', dist: 999999, car: 'bull' }, ok)).toBe(true);
        expect(calls[0][0]).toBe(ONLINE.url);
        expect(calls[0][1].headers.apikey).toBe(ONLINE.key);
        expect(JSON.parse(calls[0][1].body)).toEqual({ name: 'Аня', dist: 200000, car: 'bull' });
        expect(await submitRun({ name: 'Аня', dist: 500 }, async () => { throw new Error('offline'); })).toBe(false);
    });
    it('топ: ответ сервера → записи; ошибка — null', async () => {
        const rows = [{ name: 'Боря', dist: 3000, car: null, created_at: '2026-09-30T10:00:00Z' }];
        expect(await fetchTop('all', null, async () => ({ ok: true, json: async () => rows }))).toHaveLength(1);
        expect(await fetchTop('all', null, async () => ({ ok: false }))).toBe(null);
        expect(await fetchTop('all', null, async () => { throw new Error('offline'); })).toBe(null);
    });
});
