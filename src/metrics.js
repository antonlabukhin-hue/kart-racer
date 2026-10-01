/**
 * Метрики возвращаемости и длины сессий → Supabase (таблица sessions, функция session_put; SQL — docs/METRICS.md).
 * Без имён и личных данных: случайный id устройства, день установки, сессия (активное время, заезды, лучшая дальность).
 * Строка сессии обновляется раз в минуту и при сворачивании игры, поэтому длина сессии не теряется,
 * даже если вкладку закрыли без «выхода». Время считается только пока игра на экране.
 * Логика — чистая (с тестами): время, хранилище и сеть передаются снаружи.
 */
import { ONLINE } from './online-board.js';

export const PID_KEY = 'road_racing_pid';
export const DAY0_KEY = 'road_racing_day0';
const RPC = ONLINE.url.replace(/\/runs$/, '/rpc/session_put');
const MAX_GAP = 120000; // кадров/тиков не было дольше 2 минут (сон телефона) — этот промежуток не считаем

function rid() {
    let s = '';
    for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    return s;
}
export function dayKeyOf(t) {
    const d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** id устройства и день первого запуска (один раз, дальше — из хранилища) */
export function identity(storage, now) {
    let pid = null, day0 = null;
    try { pid = storage.getItem(PID_KEY); day0 = storage.getItem(DAY0_KEY); } catch (e) {}
    if (!pid || !/^[0-9a-f]{16}$/.test(pid)) { pid = rid(); try { storage.setItem(PID_KEY, pid); } catch (e) {} }
    if (!day0 || !/^\d{4}-\d\d-\d\d$/.test(day0)) { day0 = dayKeyOf(now); try { storage.setItem(DAY0_KEY, day0); } catch (e) {} }
    return { pid: pid, day0: day0 };
}

/**
 * o: { storage, now(), send(row, keepalive) → Promise, platform, ver }
 * → { event(ev), visible(bool), tick(), flush(keepalive), row() }
 */
export function createMetrics(o) {
    const now = o.now || Date.now;
    const t0 = now(), id = identity(o.storage, t0);
    const s = { sid: rid(), races: 0, runs: 0, best: 0, active: 0 };
    let last = t0, visible = true, sent = '';
    const step = function() {
        const t = now(), dt = t - last;
        last = t;
        if (visible && dt > 0 && dt < MAX_GAP) s.active += dt;
    };
    const row = function() {
        return { p_sid: s.sid, p_pid: id.pid, p_day0: id.day0, p_day: dayKeyOf(t0), p_dur: Math.round(s.active / 1000),
            p_races: s.races, p_runs: s.runs, p_best: s.best, p_platform: o.platform || 'web', p_ver: o.ver || '' };
    };
    const flush = function(keepalive) {
        step();
        const r = row(), key = JSON.stringify(r);
        if (key === sent || (r.p_dur < 5 && !r.p_races)) return Promise.resolve(false); // ничего нового / зашёл на секунду
        sent = key;
        return Promise.resolve(o.send(r, !!keepalive)).then(function(ok) { if (!ok) sent = ''; return !!ok; }, function() { sent = ''; return false; });
    };
    return {
        row: function() { step(); return row(); },
        /** события из журнала аналитики (src/analytics.js setSender) */
        event: function(ev) {
            if (!ev) return;
            if (ev.e === 'race_start') s.races++;
            if (ev.e === 'race_end' && typeof ev.dist === 'number') { s.runs++; s.best = Math.max(s.best, Math.round(ev.dist)); }
        },
        visible: function(v) { step(); visible = !!v; if (!v) flush(true); },
        tick: function() { step(); return flush(false); },
        flush: flush
    };
}

/** Отправка строки в Supabase (true — записано) */
export function sendSession(row, keepalive, f) {
    const fx = f || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fx) return Promise.resolve(false);
    return fx(RPC, { method: 'POST', keepalive: !!keepalive,
        headers: { apikey: ONLINE.key, Authorization: 'Bearer ' + ONLINE.key, 'Content-Type': 'application/json' }, body: JSON.stringify(row) })
        .then(function(r) { return r.ok; }).catch(function() { return false; });
}

/** Подключение в игре: раз в минуту + при сворачивании; события — через подписку onEvent (analytics.setSender) */
export function installMetrics(opts) {
    const o = opts || {};
    const js = document.querySelector('script[src*="assets/index-"]'), ver = o.ver || (js ? (js.getAttribute('src').match(/index-([\w-]+)\.js/) || [])[1] || '' : 'dev');
    const m = createMetrics({ storage: localStorage, send: function(r, k) { return sendSession(r, k); }, platform: o.platform, ver: ver });
    document.addEventListener('visibilitychange', function() { m.visible(document.visibilityState === 'visible'); });
    window.addEventListener('pagehide', function() { m.flush(true); });
    setInterval(function() { if (document.visibilityState === 'visible') m.tick(); }, 60000);
    return m;
}
