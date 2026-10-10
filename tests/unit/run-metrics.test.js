import { describe, it, expect } from 'vitest';
import { causeKey, crashesStr, runKind, createRunTracker, infSummary, RUNS_KEY, MAX_CRASHES } from '../../src/run-metrics.js';
import { createMetrics } from '../../src/metrics.js';

function mem() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; }

describe('забеги бесконечной трассы → run_events', () => {
    it('причина аварии — коротко: машина, зверь, остальное как есть', () => {
        expect(causeKey('car:gazel')).toBe('car');
        expect(causeKey('BEAR')).toBe('animal:BEAR');
        expect(causeKey('gap')).toBe('gap');
        expect(causeKey(null)).toBe('?');
        expect(causeKey('x'.repeat(40)).length).toBe(24);
    });

    it('аварии — одной строкой, не больше MAX_CRASHES последних', () => {
        expect(crashesStr([{ dist: 412.4, cause: 'car:volga' }, { dist: 980, cause: 'BEAR' }])).toBe('412:car,980:animal:BEAR');
        const many = Array.from({ length: 20 }, (_, i) => ({ dist: i, cause: 'gap' }));
        expect(crashesStr(many).split(',').length).toBe(MAX_CRASHES);
        expect(crashesStr(many).indexOf('19:gap')).toBeGreaterThan(0);
    });

    it('вид забега: день, вызов, обычный', () => {
        expect(runKind({ daily: '2026-10-10' })).toBe('daily');
        expect(runKind({ challenge: { seed: 1 } })).toBe('challenge');
        expect(runKind({ seed: 5 })).toBe('inf');
        expect(runKind(null)).toBe('inf');
    });

    it('строка на каждый законченный забег: номер на устройстве, пауза до «Ещё раз»', () => {
        let t = 1000000;
        const st = mem(), tr = createRunTracker({ storage: st, now: () => t });
        expect(tr.event({ e: 'race_start', mode: 'infinite' })).toBe(null);
        t += 70000;
        const a = tr.event({ e: 'race_end', mode: 'infinite', dist: 1234.6, time: 70.2, cause: 'car:gazel', crashes: '500:car,1234:car', kind: 'inf', car: 'buhanka', cont: 1, warm: 300 });
        expect(a).toMatchObject({ p_run_no: 1, p_kind: 'inf', p_dist: 1235, p_time: 70, p_cause: 'car', p_crashes: '500:car,1234:car', p_gap: -1, p_cont: 1, p_car: 'buhanka', p_warm: 300 });
        t += 4000; tr.event({ e: 'race_start', mode: 'infinite' });
        t += 30000;
        const b = tr.event({ e: 'race_end', mode: 'infinite', dist: 300 });
        expect(b.p_run_no).toBe(2);
        expect(b.p_gap).toBe(4);
        expect(st.m[RUNS_KEY]).toBe('2');
    });

    it('кампания и «Звериный час» — не забеги бесконечной трассы', () => {
        const tr = createRunTracker({ storage: mem(), now: () => 0 });
        expect(tr.event({ e: 'race_end', mode: 'campaign', state: 'win' })).toBe(null);
        expect(tr.event({ e: 'race_end', mode: 'endless', wave: 3 })).toBe(null);
        expect(tr.event({ e: 'crash', mode: 'infinite' })).toBe(null);
    });

    it('метрики отправляют строку забега с id устройства и днём', async () => {
        const sent = [];
        const m = createMetrics({ storage: mem(), now: () => new Date(2026, 9, 10, 12).getTime(), send: () => true, sendRun: r => { sent.push(r); return true; }, platform: 'yandex', ver: 'abc' });
        m.event({ e: 'race_start', mode: 'infinite' });
        m.event({ e: 'race_end', mode: 'infinite', dist: 900 });
        m.event({ e: 'race_end', mode: 'campaign', state: 'win' });
        expect(sent.length).toBe(1);
        expect(sent[0]).toMatchObject({ p_dist: 900, p_day: '2026-10-10', p_platform: 'yandex', p_ver: 'abc' });
        expect(sent[0].p_pid).toMatch(/^[0-9a-f]{16}$/);
    });

    it('сводка на устройстве: медианы, где и от чего заканчиваются', () => {
        const ev = [
            { e: 'race_end', mode: 'infinite', dist: 120, time: 20, cause: 'car:a' },
            { e: 'race_end', mode: 'infinite', dist: 480, time: 50, cause: 'BEAR' },
            { e: 'race_end', mode: 'infinite', dist: 300, time: 40, cause: 'car:b' },
            { e: 'race_end', mode: 'campaign', state: 'win', time: 61 }
        ];
        const s = infSummary(ev);
        expect(s.runs).toBe(3);
        expect(s.medianDist).toBe(300);
        expect(s.medianTime).toBe(40);
        expect(s.endAt).toEqual({ 0: 1, 250: 2 });
        expect(s.killers).toEqual({ car: 2, 'animal:BEAR': 1 });
    });
});
