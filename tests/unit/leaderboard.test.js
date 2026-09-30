import { describe, it, expect } from 'vitest';
import { weekKey, addRun, topRuns, rankOf, RIVALS, loadBoard, saveBoard, BOARD_KEY } from '../../src/leaderboard.js';

const mem = () => { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; };

describe('таблица рекордов', () => {
    it('неделя — с понедельника', () => {
        expect(weekKey(new Date(2026, 8, 30))).toBe('2026-09-28'); // среда → понедельник
        expect(weekKey(new Date(2026, 9, 4))).toBe('2026-09-28');  // воскресенье — та же неделя
        expect(weekKey(new Date(2026, 9, 5))).toBe('2026-10-05');
    });
    it('в таблице — лучший заезд каждого и соперники, по убыванию; место игрока', () => {
        const now = new Date(2026, 8, 30, 12).getTime();
        const list = [];
        addRun(list, { name: 'Аня', dist: 3000, at: now });
        addRun(list, { name: 'Аня', dist: 5000.4, at: now });
        addRun(list, { name: 'Боря', dist: 12000, at: now - 14 * 86400000 }); // две недели назад
        const all = topRuns(list, 'all', now, 'Аня');
        expect(all[0]).toMatchObject({ name: 'Боря', dist: 12000 });
        expect(all.filter(r => r.name === 'Аня')).toHaveLength(1);
        expect(all.find(r => r.name === 'Аня')).toMatchObject({ dist: 5000, me: true });
        expect(all.length).toBe(2 + RIVALS.length);
        all.forEach((r, i) => { if (i) expect(r.dist).toBeLessThanOrEqual(all[i - 1].dist); });
        const week = topRuns(list, 'week', now, 'Аня');
        expect(week.find(r => r.name === 'Боря')).toBeUndefined();
        expect(rankOf(week, 'Аня')).toBe(1); // соперники на неделе — вполовину
        expect(rankOf(all, 'Аня')).toBe(4);
        expect(rankOf(all, 'Никто')).toBe(0);
    });
    it('хранится и читается', () => {
        const s = mem();
        expect(loadBoard(s)).toEqual([]);
        saveBoard(addRun([], { name: 'Аня', dist: 10, at: 1 }), s);
        expect(loadBoard(s)).toEqual([{ name: 'Аня', dist: 10, car: null, at: 1 }]);
        s.setItem(BOARD_KEY, '{bad');
        expect(loadBoard(s)).toEqual([]);
    });
});
