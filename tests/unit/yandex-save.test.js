import { describe, it, expect } from 'vitest';
import { decide, createYandexSave, LOCAL_AT_KEY } from '../../src/yandex-save.js';

function mem(init) { const m = Object.assign({}, init); return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; }
const flush = () => new Promise(r => setTimeout(r, 0));

describe('сохранение в аккаунт Яндекса', () => {
    it('новее — главнее', () => {
        expect(decide(0, { at: 5000, keys: { a: '1' } })).toBe('pull');
        expect(decide(9000, { at: 5000, keys: { a: '1' } })).toBe('push');
        expect(decide(5000, { at: 5000, keys: { a: '1' } })).toBe('none');
        expect(decide(5000, null)).toBe('push');
        expect(decide(0, { at: 9000, keys: {} })).toBe('push'); // пустое в аккаунте не затирает устройство
    });

    it('новое устройство: прогресс из аккаунта записывается и игра перезапускается', async () => {
        const st = mem(), remote = { at: 7000, keys: { road_racing_profiles_v1: '[{"name":"Аня"}]' } };
        let pulled = 0;
        const ys = createYandexSave({ data: { load: () => Promise.resolve(remote), save: () => Promise.resolve(true) }, storage: st, onPulled: () => pulled++ });
        expect(await ys.boot()).toBe('pull');
        expect(st.m.road_racing_profiles_v1).toBe('[{"name":"Аня"}]');
        expect(st.m[LOCAL_AT_KEY]).toBe('7000');
        expect(pulled).toBe(1);
    });

    it('своё новее — отправляется; после сохранения — отправка с отметкой времени', async () => {
        const st = mem({ road_racing_profiles_v1: '[1]' }), sent = [];
        const ys = createYandexSave({ data: { load: () => Promise.resolve(null), save: d => { sent.push(d); return Promise.resolve(true); } }, storage: st, now: () => 1234, delay: 0 });
        expect(await ys.boot()).toBe('push');
        expect(sent[0].keys.road_racing_profiles_v1).toBe('[1]');
        expect(sent[0].at).toBe(1234);
        ys.schedule(); ys.schedule(); // два сохранения подряд — одна отправка
        await new Promise(r => setTimeout(r, 5)); await flush();
        expect(sent.length).toBe(2);
    });

    it('не Яндекс — выключено', async () => {
        const ys = createYandexSave({ data: null, storage: mem() });
        expect(await ys.boot()).toBe('off');
        ys.schedule();
    });
});
