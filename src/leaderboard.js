/**
 * Таблица рекордов бесконечной трассы — пока локальная (на этом устройстве): все профили + соперники из лора,
 * чтобы с первого заезда было за кем гнаться. Две вкладки: «Неделя» (с понедельника) и «Всё время».
 * В таблице — лучший заезд каждого игрока (по дальности). Хранилище — localStorage (или переданное).
 * Логика — чистая (с тестами); онлайн-таблица позже заменит только load/save.
 */
export const BOARD_KEY = 'road_racing_board_v1';
export const BOARD_SIZE = 10;

// соперники из лора 90-х: дальность в метрах (часть — на неделе тоже «катаются»)
export const RIVALS = [
    { name: 'Димон с Промзоны', dist: 9400, car: 'turbo' },
    { name: 'Тётя Зина (такси)', dist: 6200, car: 'shestisot' },
    { name: 'Санёк «Пейджер»', dist: 4300, car: 'raketa' },
    { name: 'Участковый Петрович', dist: 2800, car: 'buhanka' },
    { name: 'Дед Митяй', dist: 1500, car: 'gorbaty' },
    { name: 'Шурик-видеосалон', dist: 800, car: 'pirozhok' }
];

/** Понедельник недели для даты — ключ недели 'ГГГГ-ММ-ДД' */
export function weekKey(date) {
    const d = new Date(date instanceof Date ? date.getTime() : date);
    const wd = (d.getDay() + 6) % 7; // пн = 0
    d.setDate(d.getDate() - wd);
    const p = function(n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export function loadBoard(storage) {
    try { const s = storage || localStorage; return JSON.parse(s.getItem(BOARD_KEY) || '[]') || []; } catch (e) { return []; }
}
export function saveBoard(list, storage) {
    try { (storage || localStorage).setItem(BOARD_KEY, JSON.stringify(list.slice(-200))); } catch (e) {}
}

/** Добавить заезд (мутирует list) */
export function addRun(list, run) {
    list.push({ name: run.name, dist: Math.round(run.dist), car: run.car || null, at: run.at != null ? run.at : Date.now() });
    return list;
}

/**
 * Таблица: лучший заезд каждого игрока. scope: 'week' | 'all'; now — для недели.
 * Соперники есть в обеих (на неделе — половина их дальности: тоже «катались»). Возвращает [{ name, dist, car, rival, me }]
 */
export function topRuns(list, scope, now, me) {
    const wk = weekKey(now != null ? now : Date.now());
    const best = {};
    (list || []).forEach(function(r) {
        if (scope === 'week' && weekKey(r.at) !== wk) return;
        if (!best[r.name] || r.dist > best[r.name].dist) best[r.name] = { name: r.name, dist: r.dist, car: r.car };
    });
    RIVALS.forEach(function(rv) {
        const dist = scope === 'week' ? Math.round(rv.dist * 0.5) : rv.dist;
        if (!best[rv.name]) best[rv.name] = { name: rv.name, dist: dist, car: rv.car, rival: true };
    });
    return Object.keys(best).map(function(k) { const e = best[k]; e.me = e.name === me; return e; })
        .sort(function(a, b) { return b.dist - a.dist; });
}

/** Место игрока (1…) в таблице или 0 — если его там нет */
export function rankOf(rows, name) {
    for (let i = 0; i < rows.length; i++) if (rows[i].name === name) return i + 1;
    return 0;
}
