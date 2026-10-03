import { describe, it, expect } from 'vitest';
import { makeCode, normalizeCode, getCode, snapshot, applySnapshot, pushSave, pullSave, CODE_KEY, SYNC_KEYS } from '../../src/cloud-save.js';

const mem = (init) => { const m = Object.assign({}, init); return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };

describe('облачное сохранение', () => {
    it('код: 12 знаков тремя группами, без 0/O/1/I; ввод нормализуется', () => {
        let x = 0; const c = makeCode(() => (x = (x + 0.37) % 1));
        expect(c).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
        expect(c).not.toMatch(/[01OI]/);
        expect(normalizeCode(' ' + c.toLowerCase().replace(/-/g, ' ') + ' ')).toBe(c);
        expect(normalizeCode('ABC')).toBe(null);
        expect(normalizeCode('0000-0000-0000')).toBe(null);
    });
    it('код создаётся один раз и хранится', () => {
        const s = mem();
        const c = getCode(s);
        expect(getCode(s)).toBe(c);
        expect(s.m[CODE_KEY]).toBe(c);
    });
    it('снимок — ключи прогресса; восстановление пишет их обратно', () => {
        const a = mem({ road_racing_profiles_v1: '[1]', road_racing_board_v1: '[2]', other: 'x' });
        const snap = snapshot(a);
        expect(Object.keys(snap.keys).sort()).toEqual(['road_racing_board_v1', 'road_racing_profiles_v1']);
        const b = mem();
        expect(applySnapshot(snap, b)).toBe(2);
        expect(b.m.road_racing_profiles_v1).toBe('[1]');
        expect(b.m.other).toBeUndefined();
        expect(applySnapshot(null, b)).toBe(0);
        expect(SYNC_KEYS).toContain('road_racing_profiles_v1');
    });
    it('сеть: запись и чтение через функции базы; нет сети — null', async () => {
        const calls = [];
        const ok = async (url, o) => { calls.push([url, JSON.parse(o.body)]); return { ok: true, text: async () => url.endsWith('save_get') ? JSON.stringify({ v: 1, keys: { a: '1' } }) : '' }; };
        expect(await pushSave('AAAA-BBBB-CCCC', { v: 1, keys: {} }, ok)).toBe(true);
        expect(calls[0][0]).toMatch(/\/rest\/v1\/rpc\/save_put$/);
        expect(calls[0][1]).toEqual({ p_code: 'AAAA-BBBB-CCCC', p_data: { v: 1, keys: {} } });
        expect(await pullSave('AAAA-BBBB-CCCC', ok)).toEqual({ v: 1, keys: { a: '1' } });
        expect(await pullSave('X', async () => ({ ok: true, text: async () => 'null' }))).toBe(null);
        expect(await pushSave('X', {}, async () => { throw new Error('offline'); }, { waits: [0, 0], sleep: () => Promise.resolve() })).toBe(null);
    });
});

import { pullSaveEx, createAutoSync } from '../../src/cloud-save.js';
describe('облако: плохая связь', () => {
    const fast = { waits: [0, 0, 0, 0], sleep: () => Promise.resolve() };
    it('обрыв связи — повторяет и в итоге находит сохранение', async () => {
        let n = 0;
        const flaky = async () => { if (++n < 3) throw new Error('offline'); return { ok: true, text: async () => '{"v":1,"keys":{"a":"1"}}' }; };
        const r = await pullSaveEx('AAAA-BBBB-CCCC', flaky, fast);
        expect(r.status).toBe('ok');
        expect(n).toBe(3);
    });
    it('различает «нет связи» и «нет такого кода»', async () => {
        expect((await pullSaveEx('X', async () => { throw new Error('offline'); }, fast)).status).toBe('network');
        expect((await pullSaveEx('X', async () => ({ ok: false }), fast)).status).toBe('network');
        expect((await pullSaveEx('X', async () => ({ ok: true, text: async () => 'null' }), fast)).status).toBe('notfound');
    });
    it('автоотправка: не дошло — повторяет сама', async () => {
        const mem = {}; const st = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
        let n = 0; const results = [];
        const f = async () => { if (++n === 1) throw new Error('offline'); return { ok: true, text: async () => '' }; };
        const sync = createAutoSync({ storage: st, fetch: f, delay: 0, retryDelay: 0, waits: [0], sleep: () => Promise.resolve(), flushOnHide: false, onDone: ok => results.push(ok) });
        sync();
        for (let i = 0; i < 40 && results.length < 2; i++) await new Promise(r => setTimeout(r, 5));
        expect(results).toEqual([false, true]);
    });
});
