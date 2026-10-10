/**
 * Забеги бесконечной трассы → Supabase (таблица run_events, функция run_put; SQL — docs/METRICS.md §4).
 * Чтобы решать по данным, а не на глаз: где и от чего заканчиваются забеги, сколько они длятся,
 * быстро ли игрок жмёт «Ещё раз», какой вариант правил (A/B) у него был.
 * Строка — на каждый законченный забег (событие race_end с dist). Без имён: тот же id устройства, что у сессий.
 * Логика — чистая (с тестами): хранилище, время и сеть — снаружи.
 */

export const RUNS_KEY = 'road_racing_inf_runs'; // сколько забегов было на устройстве (номер забега: первый, второй…)
export const MAX_CRASHES = 12;                  // в строке — не больше стольких аварий

/** Причина аварии — коротко: 'car:gazel' → 'car', 'BEAR' → 'animal:BEAR', остальное как есть (до 24 знаков) */
export function causeKey(c) {
    const s = String(c == null ? '?' : c);
    if (s.indexOf('car') === 0) return 'car';
    if (/^[A-Z]+$/.test(s)) return 'animal:' + s;
    return s.slice(0, 24);
}

/** Аварии забега одной строкой «дистанция:причина» через запятую: '412:car,980:animal:BEAR' */
export function crashesStr(list) {
    return (list || []).slice(-MAX_CRASHES).map(function(h) { return Math.round(h.dist || 0) + ':' + causeKey(h.cause); }).join(',');
}

/** Вид забега: 'daily' — «Заезд дня», 'challenge' — вызов друга, 'inf' — обычный */
export function runKind(opts) {
    return opts && opts.daily ? 'daily' : opts && opts.challenge ? 'challenge' : 'inf';
}

/**
 * Следит за событиями журнала (src/analytics.js) и собирает строку забега.
 * o: { storage, now() } → { event(ev) → строка для run_put | null }
 * gap — сколько секунд прошло от итогов прошлого забега до старта этого (быстрый «Ещё раз» — это удержание);
 * у первого забега сессии gap = −1.
 */
export function createRunTracker(o) {
    const now = o.now || Date.now;
    let lastEnd = 0, gap = -1;
    const count = function(add) {
        let n = 0;
        try { n = parseInt(o.storage.getItem(RUNS_KEY), 10) || 0; } catch (e) {}
        if (add) { n++; try { o.storage.setItem(RUNS_KEY, String(n)); } catch (e) {} }
        return n;
    };
    return {
        event: function(ev) {
            if (!ev || ev.mode !== 'infinite') return null;
            if (ev.e === 'race_start') { gap = lastEnd ? Math.round((now() - lastEnd) / 1000) : -1; return null; }
            if (ev.e !== 'race_end' || typeof ev.dist !== 'number') return null;
            lastEnd = now();
            return { p_run_no: count(true), p_kind: ev.kind || 'inf', p_dist: Math.max(0, Math.round(ev.dist)), p_time: Math.max(0, Math.min(36000, Math.round(ev.time || 0))),
                p_cause: ev.cause ? causeKey(ev.cause) : '', p_crashes: String(ev.crashes || '').slice(0, 400), p_gap: Math.min(86400, gap),
                p_cont: ev.cont | 0, p_car: String(ev.car || '').slice(0, 24), p_ab: String(ev.ab || '').slice(0, 24), p_warm: ev.warm | 0,
                p_nitro: ev.nitroUsed | 0, p_slip: ev.slips | 0 };
        }
    };
}

const median = function(a) {
    if (!a.length) return null;
    const s = a.slice().sort(function(x, y) { return x - y; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/**
 * Сводка по забегам на устройстве (для __analytics.summary()): медианы дальности и длины забега,
 * где заканчиваются (корзины по 250 м) и от чего (причина последней аварии).
 */
export function infSummary(events) {
    const ends = (events || []).filter(function(x) { return x.e === 'race_end' && x.mode === 'infinite' && typeof x.dist === 'number'; });
    const endAt = {}, killers = {};
    ends.forEach(function(x) {
        const b = Math.floor(x.dist / 250) * 250;
        endAt[b] = (endAt[b] || 0) + 1;
        const k = x.cause ? causeKey(x.cause) : '?';
        killers[k] = (killers[k] || 0) + 1;
    });
    return { runs: ends.length, medianDist: median(ends.map(function(x) { return x.dist; })),
        medianTime: median(ends.map(function(x) { return x.time || 0; })), endAt: endAt, killers: killers };
}
