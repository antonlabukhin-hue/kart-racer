/**
 * Доводка до центра полосы для руля стрелками и кнопками (свайп и так ведёт в центр, src/swipe-control.js):
 * отпустил поворот — машина плавно встаёт в центр ближайшей полосы, а не остаётся между полосами или у обочины.
 */
export const LANES = [-2, 0, 2];
export const ASSIST_RATE = 7;     // 1/с: за ~0.4 с почти в центре
export const ASSIST_FROM_V = 0.025; // пока машину ещё несёт по инерции — не мешаем

export function nearestLane(x) {
    let best = LANES[0];
    LANES.forEach(function(l) { if (Math.abs(l - x) < Math.abs(best - x)) best = l; });
    return best;
}
/** Новый x: steering — жмут поворот; v — скорость вбок; slide — на масле/льду не доводим */
export function laneAssist(x, v, dt, steering, slide) {
    if (steering || slide || Math.abs(v) > ASSIST_FROM_V) return x;
    const t = nearestLane(x);
    return t + (x - t) * Math.exp(-ASSIST_RATE * dt);
}
