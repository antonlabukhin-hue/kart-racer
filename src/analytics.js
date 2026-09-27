/**
 * Локальная аналитика: журнал игровых событий на устройстве (кольцевой буфер в localStorage).
 * Ничего не уходит в сеть, пока не подключён отправщик (setSender). Сводка — summarize():
 * где игроки проигрывают, какие главы бросают, сколько длится заезд. См. docs/ANALYTICS.md.
 */
export const ANALYTICS_KEY = 'road_racing_analytics_v1';
export const MAX_EVENTS = 600;

let _sender = null;
let _session = null;

function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

export function loadEvents(st) {
    const s = st || storage();
    try { const a = JSON.parse((s && s.getItem(ANALYTICS_KEY)) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
}

/** Записать событие: track('race_end', { state: 'win', time: 61.2 }) */
export function track(name, props, st) {
    const s = st || storage();
    if (!_session) _session = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ev = Object.assign({ e: String(name), t: Date.now(), s: _session }, props || {});
    try {
        const list = loadEvents(s);
        list.push(ev);
        if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
        if (s) s.setItem(ANALYTICS_KEY, JSON.stringify(list));
    } catch (e) {}
    if (_sender) { try { _sender(ev); } catch (e) {} }
    return ev;
}

/** Подключить отправку (например, в свой сервер) — вызывается на каждое событие */
export function setSender(fn) { _sender = typeof fn === 'function' ? fn : null; }

export function clearEvents(st) { const s = st || storage(); try { if (s) s.removeItem(ANALYTICS_KEY); } catch (e) {} }

const r1 = function(v) { return Math.round(v * 10) / 10; };

/** Сводка по журналу */
export function summarize(events) {
    const ev = events || loadEvents();
    const starts = ev.filter(function(x) { return x.e === 'race_start'; });
    const ends = ev.filter(function(x) { return x.e === 'race_end'; });
    const byState = {};
    ends.forEach(function(x) { byState[x.state] = (byState[x.state] || 0) + 1; });
    // главы: попытки, победы, доля побед
    const chapters = {};
    ends.forEach(function(x) {
        if (!x.chapter) return;
        const c = chapters[x.chapter] || (chapters[x.chapter] = { tries: 0, wins: 0 });
        c.tries++;
        if (x.state === 'win') c.wins++;
    });
    Object.keys(chapters).forEach(function(k) { chapters[k].winRate = r1(chapters[k].wins / chapters[k].tries * 100); });
    // причины аварий
    const crashCauses = {};
    ev.filter(function(x) { return x.e === 'crash'; }).forEach(function(x) {
        crashCauses[x.cause || '?'] = (crashCauses[x.cause || '?'] || 0) + 1;
    });
    // где по трассе заканчиваются проигранные заезды (корзины по 10%)
    const loseAt = {};
    ends.filter(function(x) { return x.state !== 'win' && typeof x.progress === 'number'; }).forEach(function(x) {
        const b = Math.min(90, Math.floor(x.progress * 10) * 10) + '%';
        loseAt[b] = (loseAt[b] || 0) + 1;
    });
    const wins = ends.filter(function(x) { return x.state === 'win' && typeof x.time === 'number'; });
    return {
        sessions: new Set(ev.map(function(x) { return x.s; })).size,
        races: starts.length,
        finished: ends.length,
        quits: ev.filter(function(x) { return x.e === 'race_quit'; }).length,
        results: byState,
        avgWinTime: wins.length ? r1(wins.reduce(function(a, x) { return a + x.time; }, 0) / wins.length) : null,
        chapters: chapters,
        crashCauses: crashCauses,
        loseAt: loseAt,
        bestEndlessWave: ev.reduce(function(m, x) { return x.e === 'race_end' && x.wave ? Math.max(m, x.wave) : m; }, 0)
    };
}
