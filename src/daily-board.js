/**
 * Дневные таблицы: «Заезд дня» бесконечной трассы (mode 'inf', счёт — метры) и «Звериный час дня» (mode 'beast', очки).
 * Онлайн — таблица Supabase daily_runs (SQL — docs/DAILY.md), пока её нет или нет сети — таблица на устройстве.
 * Тестовая сборка в базу не пишет. Логика — чистая (с тестами): fetch и хранилище передаются снаружи.
 */
import { ONLINE, cleanName } from './online-board.js';

export const DAILY_KEY = 'road_racing_daily_board_v1';
const URL = ONLINE.url.replace(/\/runs$/, '/daily_runs');
const TIMEOUT = 6000;
const H = function(extra) { return Object.assign({ apikey: ONLINE.key, Authorization: 'Bearer ' + ONLINE.key }, extra || {}); };
const timed = function(p) { return Promise.race([p, new Promise(function(_, rej) { setTimeout(function() { rej(new Error('timeout')); }, TIMEOUT); })]); };

/** Локальная таблица: [{ mode, day, name, score }] (последние 300) */
export function loadLocal(storage) {
    try { const s = storage || localStorage; return JSON.parse(s.getItem(DAILY_KEY) || '[]') || []; } catch (e) { return []; }
}
export function addLocal(row, storage) {
    const list = loadLocal(storage);
    list.push({ mode: row.mode, day: row.day, name: cleanName(row.name), score: Math.round(row.score) });
    try { (storage || localStorage).setItem(DAILY_KEY, JSON.stringify(list.slice(-300))); } catch (e) {}
    return list;
}

/** Таблица дня: лучший результат каждого, по убыванию. rows — [{ name, score }]. me — имя игрока */
export function dayTop(rows, me) {
    const best = {};
    (rows || []).forEach(function(r) { if (r && r.name && (!best[r.name] || r.score > best[r.name].score)) best[r.name] = { name: r.name, score: Math.round(r.score) }; });
    return Object.keys(best).map(function(k) { const e = best[k]; e.me = e.name === me; return e; }).sort(function(a, b) { return b.score - a.score; });
}
/** Место игрока (1…) или 0 */
export function placeOf(rows, me) { for (let i = 0; i < rows.length; i++) if (rows[i].name === me) return i + 1; return 0; }

/** Результаты дня с устройства */
export function localDay(mode, day, storage) {
    return loadLocal(storage).filter(function(r) { return r.mode === mode && r.day === day; });
}

/** Отправить результат (тихо). f — fetch */
export function submitDaily(row, f) {
    const fx = f || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fx || !(row.score > 0)) return Promise.resolve(false);
    const body = JSON.stringify({ mode: row.mode, day: row.day, name: cleanName(row.name), score: Math.min(10000000, Math.round(row.score)), car: row.car || null });
    return timed(fx(URL, { method: 'POST', headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: body }))
        .then(function(res) { return !!(res && res.ok); }).catch(function() { return false; });
}
/** Результаты дня с сервера или null (нет сети / таблицы) */
export function fetchDaily(mode, day, f) {
    const fx = f || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fx) return Promise.resolve(null);
    const u = URL + '?select=name,score&mode=eq.' + encodeURIComponent(mode) + '&day=eq.' + encodeURIComponent(day) + '&order=score.desc&limit=200';
    return timed(fx(u, { headers: H() })).then(function(res) { return res && res.ok ? res.json() : null; })
        .then(function(rows) { return Array.isArray(rows) ? rows.map(function(r) { return { name: String(r.name), score: Math.round(r.score) }; }) : null; })
        .catch(function() { return null; });
}
