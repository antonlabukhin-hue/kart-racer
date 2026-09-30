/**
 * Онлайн-таблица рекордов (Supabase, таблица runs: name, dist, car, created_at).
 * Ключ — публичный (publishable): им можно только читать и добавлять строки, границы значений проверяет сама база.
 * Без сети или в тестовой сборке — ничего не ломается: таблица остаётся локальной (src/leaderboard.js).
 */
import { weekKey } from './leaderboard.js';

export const ONLINE = {
    url: 'https://gxwfntxsvtytphjuatlt.supabase.co/rest/v1/runs',
    key: 'sb_publishable_8gAmYHi5uwWEH0qZbNwybA_uaIkLgzH'
};
const TIMEOUT = 6000;

function headers(extra) {
    return Object.assign({ apikey: ONLINE.key, Authorization: 'Bearer ' + ONLINE.key }, extra || {});
}
function withTimeout(p) {
    return Promise.race([p, new Promise(function(_, rej) { setTimeout(function() { rej(new Error('timeout')); }, TIMEOUT); })]);
}

/** Имя для таблицы: без лишних пробелов, 1–24 символа */
export function cleanName(name) {
    return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Игрок';
}

/** Адрес запроса топа: scope 'week' — с понедельника этой недели (по местному времени) */
export function topUrl(scope, now) {
    let u = ONLINE.url + '?select=name,dist,car,created_at&order=dist.desc&limit=300';
    if (scope === 'week') {
        const s = weekKey(now != null ? now : Date.now()).split('-');
        u += '&created_at=gte.' + encodeURIComponent(new Date(+s[0], +s[1] - 1, +s[2]).toISOString());
    }
    return u;
}

/** Строки базы → записи локальной таблицы { name, dist, car, at } */
export function rowsToRuns(rows) {
    return (Array.isArray(rows) ? rows : []).filter(function(r) { return r && r.name && r.dist >= 0; })
        .map(function(r) { return { name: String(r.name), dist: Math.round(r.dist), car: r.car || null, at: Date.parse(r.created_at) || Date.now() }; });
}

/** Отправить заезд (тихо: без сети — просто не отправится). f — fetch (для тестов) */
export function submitRun(run, f) {
    const fx = f || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fx || !(run.dist >= 50)) return Promise.resolve(false);
    const body = JSON.stringify({ name: cleanName(run.name), dist: Math.min(200000, Math.round(run.dist)), car: run.car || null });
    return withTimeout(fx(ONLINE.url, { method: 'POST', headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: body }))
        .then(function(res) { return !!(res && res.ok); }).catch(function() { return false; });
}

/** Топ с сервера: список заездов или null (нет сети / ошибка) */
export function fetchTop(scope, now, f) {
    const fx = f || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fx) return Promise.resolve(null);
    return withTimeout(fx(topUrl(scope, now), { headers: headers() }))
        .then(function(res) { return res && res.ok ? res.json() : null; })
        .then(function(rows) { return rows ? rowsToRuns(rows) : null; })
        .catch(function() { return null; });
}
