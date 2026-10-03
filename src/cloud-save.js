/**
 * Облачное сохранение (Supabase): прогресс уходит в базу по «коду сохранения» вида K7PQ-2ZMA-9XRD.
 * Сменил телефон — ввёл код в настройках, прогресс вернулся. Без регистрации и паролей.
 * Прямого доступа к таблице saves нет: только функции save_put / save_get (SQL — в ответе в чате / README),
 * прочитать сохранение можно, лишь зная его код. Логика — чистая (с тестами), сеть — fetch с запасным «нет сети».
 */
import { ONLINE } from './online-board.js';

export const CODE_KEY = 'road_racing_cloud_code';
export const SYNC_KEYS = ['road_racing_profiles_v1', 'road_racing_board_v1', 'road_racing_met_v1'];
const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // без 0/O и 1/I — не перепутать при вводе
const RPC = ONLINE.url.replace(/\/runs$/, '/rpc/');

/** Новый код: 12 знаков тремя группами (rnd — [0,1) для тестов) */
export function makeCode(rnd) {
    let s = '';
    for (let i = 0; i < 12; i++) {
        let v;
        if (rnd) v = Math.floor(rnd() * ALPHA.length);
        else { const a = new Uint32Array(1); crypto.getRandomValues(a); v = a[0] % ALPHA.length; }
        s += ALPHA[v % ALPHA.length];
    }
    return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
}

/** Код из ввода: верхний регистр, без пробелов, O→0 нет (0 нет в алфавите) — только проверка формата */
export function normalizeCode(input) {
    const raw = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (raw.length !== 12 || raw.split('').some(function(c) { return ALPHA.indexOf(c) < 0; })) return null;
    return raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8);
}

export function getCode(storage) {
    const s = storage || localStorage;
    let c = null;
    try { c = s.getItem(CODE_KEY); } catch (e) {}
    if (!normalizeCode(c)) { c = makeCode(); try { s.setItem(CODE_KEY, c); } catch (e) {} }
    return c;
}

/** Снимок прогресса из хранилища */
export function snapshot(storage) {
    const s = storage || localStorage, data = { v: 1, at: Date.now(), keys: {} };
    SYNC_KEYS.forEach(function(k) { try { const v = s.getItem(k); if (v != null) data.keys[k] = v; } catch (e) {} });
    return data;
}
/** Записать снимок в хранилище (восстановление). Возвращает, сколько ключей записано */
export function applySnapshot(data, storage) {
    const s = storage || localStorage;
    if (!data || !data.keys) return 0;
    let n = 0;
    SYNC_KEYS.forEach(function(k) { if (typeof data.keys[k] === 'string') { try { s.setItem(k, data.keys[k]); n++; } catch (e) {} } });
    return n;
}

export const RPC_TIMEOUT = 8000;               // мс на одну попытку: мобильная сеть до сервера иногда «зависает»
export const RETRY_WAITS = [0, 800, 2000, 4000]; // паузы перед попытками: 4 попытки

/**
 * Один запрос к функции базы. → Promise<{ net: true, value } | { net: false }>
 * net: false — нет связи / таймаут / ошибка сервера (стоит повторить); иначе value — ответ функции (null — «нет такого»).
 */
function rpcOnce(name, body, f, keepalive) {
    const fx = f || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fx) return Promise.resolve({ net: false });
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac ? setTimeout(function() { ac.abort(); }, RPC_TIMEOUT) : null;
    return Promise.resolve().then(function() {
        return fx(RPC + name, { method: 'POST', keepalive: !!keepalive, signal: ac ? ac.signal : undefined,
            headers: { apikey: ONLINE.key, Authorization: 'Bearer ' + ONLINE.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    })
        .then(function(r) { if (!r || !r.ok) return { net: false }; return r.text().then(function(t) { return { net: true, value: t ? JSON.parse(t) : true }; }); })
        .catch(function() { return { net: false }; })
        .then(function(res) { if (timer) clearTimeout(timer); return res; });
}
/** Запрос с повторами при обрыве связи. opts: { waits, sleep(ms), onRetry(n), keepalive } */
function rpcRetry(name, body, f, opts) {
    const o = opts || {}, waits = o.waits || RETRY_WAITS;
    const sleep = o.sleep || function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
    let i = 0;
    const attempt = function() {
        return sleep(waits[i] || 0).then(function() { return rpcOnce(name, body, f, o.keepalive); }).then(function(res) {
            if (res.net || ++i >= waits.length) return res;
            if (o.onRetry) o.onRetry(i);
            return attempt();
        });
    };
    return attempt();
}

/** Отправить прогресс (true — сохранено, null — нет сети/ошибка); при обрыве — повторяет */
export function pushSave(code, data, f, opts) { return rpcRetry('save_put', { p_code: code, p_data: data }, f, opts).then(function(r) { return r.net ? true : null; }); }
/** Загрузить прогресс по коду (снимок или null) */
export function pullSave(code, f, opts) { return pullSaveEx(code, f, opts).then(function(r) { return r.data; }); }
/** Загрузить с ответом, что случилось: { status: 'ok' | 'notfound' | 'network', data } */
export function pullSaveEx(code, f, opts) {
    return rpcRetry('save_get', { p_code: code }, f, opts).then(function(r) {
        if (!r.net) return { status: 'network', data: null };
        return r.value && r.value.keys ? { status: 'ok', data: r.value } : { status: 'notfound', data: null };
    });
}

/**
 * Отправка не чаще раза в delay мс: после сохранения профиля — одна отправка, а не десять.
 * Не дошло (нет связи) — повтор через retryDelay, пока не дойдёт; свернули игру — отправляем сразу (keepalive),
 * чтобы в облаке всегда лежала свежая копия (иначе на новом устройстве код «не находился»).
 */
export function createAutoSync(opts) {
    const o = opts || {};
    let timer = null, dirty = false, sending = false;
    const send = function(keepalive) {
        if (sending) { dirty = true; return; }
        sending = true; dirty = false;
        pushSave(getCode(o.storage), snapshot(o.storage), o.fetch, { keepalive: keepalive, waits: o.waits, sleep: o.sleep }).then(function(ok) {
            sending = false;
            if (o.onDone) o.onDone(!!ok);
            if (!ok || dirty) schedule(o.retryDelay != null ? o.retryDelay : 20000);
        });
    };
    const schedule = function(ms) {
        dirty = true;
        if (timer) return;
        timer = setTimeout(function() { timer = null; send(false); }, ms != null ? ms : (o.delay != null ? o.delay : 4000));
    };
    if (o.flushOnHide !== false && typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden' && dirty) { if (timer) { clearTimeout(timer); timer = null; } send(true); }
        });
    }
    const api = function() { schedule(); };
    api.now = function() { if (timer) { clearTimeout(timer); timer = null; } send(false); };
    return api;
}

/** После первой отправки в облако — один раз: «запиши код сохранения» (браузер может стереть данные сайта). notify — Notify игры */
export function cloudCodeHint(ok, notify, storage) {
    const st = storage || localStorage;
    if (!ok || !notify) return false;
    try { if (st.getItem('road_racing_cloud_hint')) return false; st.setItem('road_racing_cloud_hint', '1'); } catch (e) { return false; }
    notify.success('☁ Прогресс в облаке. Твой код: ' + getCode(st), 'Запиши его: в другом браузере или на новом телефоне — Настройки → «Загрузить» по коду');
    return true;
}
