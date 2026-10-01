import { describe, it, expect, afterEach } from 'vitest';
import { eventAt, rowLanes, hazeK, THEME_EVENTS, EVENT_AT } from '../../src/theme-events.js';
import { THEMES, THEME_LEN, setThemeStart } from '../../src/infinite.js';

const seq = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

describe('события пейзажей', () => {
    afterEach(() => setThemeStart(0));
    it('у каждого пейзажа — своё событие', () => {
        THEMES.forEach(t => expect(THEME_EVENTS[t.id], t.id).toBeTruthy());
        expect(new Set(Object.values(THEME_EVENTS).map(e => e.id)).size).toBe(THEMES.length);
    });
    it('событие — посреди пейзажа, раз в пейзаж, не в самом начале заезда', () => {
        setThemeStart(0);
        expect(eventAt(EVENT_AT - 1)).toBe(null);
        const e = eventAt(EVENT_AT + 10);
        expect(e).toMatchObject({ key: 0, d0: EVENT_AT });
        expect(e.ev.id).toBe('convoy');
        expect(eventAt(EVENT_AT + e.ev.len + 1)).toBe(null);
        const e2 = eventAt(THEME_LEN + EVENT_AT + 5);
        expect(e2.key).toBe(1);
        expect(e2.ev.id).toBe('acid');
        // заезд начался с ночи (пейзаж 3): событие ночи — на своём месте
        setThemeStart(3);
        expect(eventAt(EVENT_AT + 5).ev.id).toBe('blackout');
    });
    it('ряд опасностей: свободная полоса рядом с прошлой и не там, где уже стоит препятствие', () => {
        const r = seq(5);
        let free = 0;
        for (let i = 0; i < 200; i++) {
            const busy = i % 3 ? [] : [Math.floor(r() * 3)];
            const rl = rowLanes(free, busy, r);
            if (!rl) continue;
            expect(Math.abs(rl.free - free)).toBeLessThanOrEqual(1);
            expect(busy).not.toContain(rl.free);
            expect(rl.block).not.toContain(rl.free);
            rl.block.forEach(l => expect(busy).not.toContain(l));
            free = rl.free;
        }
        // рядом свободной нет — ряд пропускается
        expect(rowLanes(0, [0, 1], r)).toBe(null);
    });
    it('мгла наползает и уходит плавно', () => {
        const ev = THEME_EVENTS.snow;
        expect(hazeK(null)).toBe(0);
        expect(hazeK({ ev, k: 0 })).toBe(0);
        expect(hazeK({ ev, k: 0.5 })).toBe(1);
        expect(hazeK({ ev, k: 20 / ev.len })).toBeCloseTo(0.5, 5);
    });
});
