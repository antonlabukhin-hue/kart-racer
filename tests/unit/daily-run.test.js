import { describe, it, expect } from 'vitest';
import { DAILY_RULES, ruleOf, dailySeedOf, dailyState, canPlayDaily, startDaily, finishDaily, randomSeed } from '../../src/daily-run.js';
import { dayTop, placeOf, addLocal, localDay } from '../../src/daily-board.js';
import { seededRnd, planStretch } from '../../src/infinite.js';

const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };

describe('«Заезд дня»', () => {
    it('условие дня — по кругу, сид — общий на день', () => {
        expect(ruleOf('2026-01-01')).toBe(DAILY_RULES[0]);
        expect(ruleOf('2026-01-02')).toBe(DAILY_RULES[1]);
        expect(ruleOf('2026-01-08')).toBe(DAILY_RULES[0]);
        expect(dailySeedOf('2026-10-03')).toBe(dailySeedOf('2026-10-03'));
        expect(dailySeedOf('2026-10-03')).not.toBe(dailySeedOf('2026-10-04'));
        expect(randomSeed(() => 0)).toBe(1);
    });
    it('одна попытка в день', () => {
        const p = {};
        expect(canPlayDaily(p, '2026-10-03')).toBe(true);
        startDaily(p, '2026-10-03');
        expect(canPlayDaily(p, '2026-10-03')).toBe(false);
        finishDaily(p, '2026-10-03', 3210.6, 3211);
        expect(dailyState(p, '2026-10-03')).toMatchObject({ started: true, dist: 3211 });
        expect(canPlayDaily(p, '2026-10-04')).toBe(true);
    });
    it('один сид — одна и та же трасса', () => {
        const a = planStretch(0, 1800, seededRnd(42)).items.map(i => i.kind + i.d.toFixed(1));
        const b = planStretch(0, 1800, seededRnd(42)).items.map(i => i.kind + i.d.toFixed(1));
        const c = planStretch(0, 1800, seededRnd(43)).items.map(i => i.kind + i.d.toFixed(1));
        expect(a).toEqual(b);
        expect(a).not.toEqual(c);
    });
    it('таблица дня: лучший у каждого, место; локально — по режиму и дню', () => {
        const s = mem();
        addLocal({ mode: 'inf', day: '2026-10-03', name: 'Тестер', score: 900 }, s);
        addLocal({ mode: 'inf', day: '2026-10-03', name: 'Лёха', score: 1500 }, s);
        addLocal({ mode: 'inf', day: '2026-10-02', name: 'Лёха', score: 9000 }, s);
        addLocal({ mode: 'beast', day: '2026-10-03', name: 'Лёха', score: 99999 }, s);
        const rows = localDay('inf', '2026-10-03', s);
        expect(rows.length).toBe(2);
        const top = dayTop(rows.concat([{ name: 'Тестер', score: 1200 }]), 'Тестер');
        expect(top.map(r => r.name)).toEqual(['Лёха', 'Тестер']);
        expect(top[1]).toMatchObject({ score: 1200, me: true });
        expect(placeOf(top, 'Тестер')).toBe(2);
    });
});

describe('«Заезд дня» — одна попытка', () => {
    it('«задание дня» в profile.daily больше не затирает отметку о попытке', () => {
        const p = {};
        startDaily(p, '2026-10-06');
        p.daily = { date: '2026-10-06', done: false, contractId: 'x' }; // так пишет getTodayContract в src/main.js
        expect(canPlayDaily(p, '2026-10-06')).toBe(false);
        expect(canPlayDaily(p, '2026-10-07')).toBe(true);
    });
});
