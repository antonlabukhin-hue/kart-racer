import { describe, it, expect } from 'vitest';
import { identity, createMetrics, dayKeyOf, sendSession, PID_KEY, DAY0_KEY } from '../../src/metrics.js';

function mem() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; }

describe('метрики: возвращаемость и длина сессий', () => {
    it('id устройства и день установки создаются один раз', () => {
        const st = mem(), t = new Date(2026, 9, 1, 12).getTime();
        const a = identity(st, t), b = identity(st, t + 86400000 * 3);
        expect(a.pid).toMatch(/^[0-9a-f]{16}$/);
        expect(b).toEqual(a);
        expect(a.day0).toBe('2026-10-01');
        expect(st.m[PID_KEY]).toBe(a.pid);
        expect(st.m[DAY0_KEY]).toBe('2026-10-01');
    });

    it('считает только активное время: свёрнутая игра и сон телефона не идут в длину сессии', async () => {
        let t = 1000000;
        const rows = [];
        const m = createMetrics({ storage: mem(), now: () => t, send: r => { rows.push(r); return true; } });
        t += 30000; m.visible(false);          // 30 с игры, свернул (отправка при сворачивании)
        t += 600000; m.visible(true);          // 10 минут в фоне — не считаем
        t += 50000; await m.tick();            // ещё 50 с
        t += 3600000; await m.tick();          // час без тиков (сон) — не считаем
        expect(rows.map(r => r.p_dur)).toEqual([30, 80]);
    });

    it('заезды и лучшая дальность из событий аналитики', () => {
        const m = createMetrics({ storage: mem(), now: () => 0, send: () => true });
        m.event({ e: 'race_start' }); m.event({ e: 'race_end', dist: 812.4 });
        m.event({ e: 'race_start' }); m.event({ e: 'race_end', dist: 400 });
        m.event({ e: 'race_start' }); m.event({ e: 'race_end', state: 'win' }); // гонка сезона — без дальности
        const r = m.row();
        expect(r).toMatchObject({ p_races: 3, p_runs: 2, p_best: 812 });
    });

    it('не шлёт пустое и повторное; при ошибке сети повторит', async () => {
        let t = 0, ok = false, n = 0;
        const m = createMetrics({ storage: mem(), now: () => t, send: () => { n++; return ok; } });
        t = 2000; expect(await m.tick()).toBe(false); expect(n).toBe(0); // зашёл на 2 секунды — не шлём
        t = 20000; expect(await m.tick()).toBe(false); expect(n).toBe(1); // сеть упала
        ok = true; expect(await m.tick()).toBe(true); expect(n).toBe(2);  // та же строка — повтор после ошибки
        expect(await m.tick()).toBe(false); expect(n).toBe(2);             // ничего не изменилось
    });

    it('строка для session_put и отправка с keepalive', async () => {
        const calls = [];
        const ok = await sendSession({ p_sid: 'x' }, true, (url, o) => { calls.push([url, o]); return Promise.resolve({ ok: true }); });
        expect(ok).toBe(true);
        expect(calls[0][0]).toMatch(/\/rest\/v1\/rpc\/session_put$/);
        expect(calls[0][1].keepalive).toBe(true);
        expect(await sendSession({}, false, () => Promise.reject(new Error('net')))).toBe(false);
        expect(dayKeyOf(new Date(2026, 0, 5).getTime())).toBe('2026-01-05');
    });
});
