/**
 * Рекорды глав кампании: своё лучшее время (из призрака лучшего заезда, src/ghost.js) и мировое (Supabase chapter_times,
 * SQL — docs/DAILY.md). Повод вернуться в пройденную главу: побить себя и мир. Без таблицы или сети — только своё.
 * Логика — чистая (с тестами): fetch и хранилище передаются снаружи.
 */
import { ONLINE, cleanName } from './online-board.js';
import { ghostKey, isValidGhost } from './ghost.js';

const URL = ONLINE.url.replace(/\/runs$/, '/chapter_times');
/** С этого дня трассы глав вдвое длиннее — мировые рекорды считаются заново (старые времена — короткой трассы) */
export const RECORDS_SINCE = '2026-10-05T00:00:00Z';
const H = function(extra) { return Object.assign({ apikey: ONLINE.key, Authorization: 'Bearer ' + ONLINE.key }, extra || {}); };
const timed = function(p) { return Promise.race([p, new Promise(function(_, rej) { setTimeout(function() { rej(new Error('timeout')); }, 6000); })]); };

/** Своё лучшее время главы (с): из сохранённого призрака; null — ещё не проходил */
export function localBest(profileId, chapterId, diff, storage) {
    try {
        const g = JSON.parse((storage || localStorage).getItem(ghostKey(profileId, 'camp2_' + chapterId, diff)) || 'null');
        return isValidGhost(g) ? g.time : null;
    } catch (e) { return null; }
}

/** Мировые лучшие по главам: rows [{ chapter, name, time_ms }] → { c01: { name, time } } (лучшее время, с) */
export function worldBests(rows) {
    const out = {};
    (rows || []).forEach(function(r) {
        if (!r || !r.chapter || !(r.time_ms > 0)) return;
        const t = r.time_ms / 1000;
        if (!out[r.chapter] || t < out[r.chapter].time) out[r.chapter] = { name: String(r.name), time: t };
    });
    return out;
}

/** «0:59.3» */
export function fmtTime(t) {
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
}

/** Строка итогов: сравнение с миром. world — { name, time } | null, time — твоё время, me — имя */
export function worldLine(world, time, me) {
    if (!world || time < world.time - 0.05) return '🌍 Новый рекорд мира главы!';
    if (world.name === me && Math.abs(world.time - time) < 0.05) return '🌍 Рекорд мира главы — твой!';
    return '🌍 Рекорд мира: ' + fmtTime(world.time) + ' (' + world.name + ') — до него ' + (time - world.time).toFixed(1) + ' с';
}

let cache = null;
/** Мировые лучшие (кэш на минуту) → Promise<{ c01: … } | null> */
export function fetchWorldBests(f) {
    const fx = f || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fx) return Promise.resolve(null);
    if (cache && Date.now() - cache.at < 60000) return Promise.resolve(cache.map);
    return timed(fx(URL + '?select=chapter,name,time_ms&created_at=gte.' + RECORDS_SINCE + '&order=time_ms.asc&limit=2000', { headers: H() }))
        .then(function(res) { return res && res.ok ? res.json() : null; })
        .then(function(rows) { if (!Array.isArray(rows)) return null; cache = { at: Date.now(), map: worldBests(rows) }; return cache.map; })
        .catch(function() { return null; });
}

/** Отправить время главы (победа) — тихо */
export function submitChapterTime(row, f) {
    const fx = f || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fx || !/^c\d\d$/.test(row.chapter) || !(row.time > 5)) return Promise.resolve(false);
    cache = null;
    return timed(fx(URL, { method: 'POST', headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ chapter: row.chapter, name: cleanName(row.name), time_ms: Math.round(row.time * 1000), car: row.car || null }) }))
        .then(function(res) { return !!(res && res.ok); }).catch(function() { return false; });
}
