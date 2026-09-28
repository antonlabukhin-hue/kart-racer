/**
 * Правила боя с боссом (чистая логика, без сцены).
 *
 * Босс в броне: таран проходит, только пока он «открыт» — VULN_TIME секунд после промаха
 * его атаки (все снаряды залпа мимо). Бой идёт на арене — от появления до ARENA_END трассы;
 * не успел — босс сбегает без награды.
 * Фазы по HP: 1 — стреляет, 2 — ещё и ставит баррикады в полосы, 3 — бежит навстречу.
 * Урон: таран 1, на нитро 2, прыжок сверху с трамплина 3, отбитый снаряд 1 (сквозь броню).
 */
export const VULN_TIME = 2.2;
export const ARENA_END = 0.82;
export const HP_BONUS = 1;       // к HP главы: окна уязвимости делают бой длиннее, но не бесконечным
export const MAX_HP = 8;
export const DEFEAT_TIME_BONUS = 3;

export function bossHp(chapterHp) {
    return Math.min(MAX_HP, Math.max(3, (chapterHp || 3) + HP_BONUS));
}

/** Фаза по доле HP: > 2/3 — 1, > 1/3 — 2, иначе 3 */
export function phaseForHp(hp, maxHp) {
    const f = maxHp > 0 ? hp / maxHp : 0;
    return f > 2 / 3 ? 1 : f > 1 / 3 ? 2 : 3;
}

/**
 * Урон по боссу; 0 — броня выдержала.
 * kind: 'ram' | 'stomp' | 'reflect'; vulnerable — открыт после промаха; hammer — есть кувалда.
 */
export function damageFor(kind, opts) {
    const o = opts || {};
    if (kind === 'stomp') return 3;
    if (kind === 'reflect') return 1;
    if (!o.vulnerable && !o.hammer) return 0;
    return o.nitro ? 2 : 1;
}

/**
 * Учёт залпов: промах всего залпа открывает босса.
 * Возвращает объект с методами; onVolleyMissed вызывается один раз на залп.
 */
export function createVolleyTracker(onVolleyMissed) {
    const open = {};
    let seq = 0;
    return {
        fire: function(count) { seq++; open[seq] = { left: count, hit: false }; return seq; },
        hit: function(id) { if (open[id]) open[id].hit = true; },
        gone: function(id) {
            const v = open[id];
            if (!v) return;
            v.left--;
            if (v.left <= 0) {
                delete open[id];
                if (!v.hit) onVolleyMissed(id);
            }
        },
        get pending() { return Object.keys(open).length; }
    };
}

/**
 * Баррикада фазы 2: какие полосы (0..2) перекрыть — две из трёх, просвет не там, где игрок
 * был в прошлый раз, чтобы пришлось перестраиваться. rnd — () => [0,1).
 */
export function barricadeLanes(playerLane, prevGap, rnd) {
    const r = rnd || Math.random;
    const options = [0, 1, 2].filter(function(l) { return l !== prevGap; });
    // просвет чаще не в полосе игрока — надо двигаться
    const notMine = options.filter(function(l) { return l !== playerLane; });
    const pool = notMine.length && r() < 0.75 ? notMine : options;
    const gap = pool[Math.floor(r() * pool.length) % pool.length];
    return { gap: gap, blocked: [0, 1, 2].filter(function(l) { return l !== gap; }) };
}

/** Бой ещё идёт? Иначе — босс сбегает */
export function arenaOpen(progress) {
    return progress < ARENA_END;
}

/**
 * Стоп-кадр при попадании по боссу (секунды реального времени): игра почти замирает —
 * удар «чувствуется». Прыжок сверху — дольше всех, отбитый снаряд — короче.
 */
export const HIT_STOP_TIME_SCALE = 0.05;
export function hitStopFor(opts) {
    const o = opts || {};
    if (o.stomp) return 0.1;
    if (o.heavy) return 0.08;
    return o.contact ? 0.06 : 0.04;
}
