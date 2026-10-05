/**
 * Полосы попуток: три полосы по центрам −2, 0, +2 (как полосы игрока). Попутки едут строго по центру полосы
 * и перестраиваются из полосы в полосу (не между) — в вертикальном режиме игрок только меняет полосы, и объехать
 * должно быть можно всегда, если вовремя среагировать.
 * Правило «стенки»: три машины рядом (в окне WALL_WIN по ходу) не могут занимать все три полосы — одна всегда свободна.
 */
export const LANE_STEP = 2;
export const WALL_WIN = 14; // ед. по ходу: машины ближе друг к другу считаются «в одном ряду»

/** x центра полосы 0 | 1 | 2 */
export function laneX(lane) { return (lane - 1) * LANE_STEP; }

/** полоса по x (ближайшая) */
export function laneOf(x) { return Math.max(0, Math.min(2, Math.round(x / LANE_STEP + 1))); }

/** Прижим к обочине больше не используется: всегда центр полосы (оставлено для совместимости вызовов) */
export function hugFor() { return 0; }

/** x попутки — центр полосы */
export function carX(lane, hug) { return laneX(lane) + (hug || 0); }

/** Полосы, занятые машинами рядом с z (в окне win); перестраивающаяся занимает обе — откуда и куда. skip — не считать эту */
export function busyLanes(cars, z, win, skip) {
    const s = new Set();
    (cars || []).forEach(function(c) {
        if (!c || c === skip || c.active === false || Math.abs(c.z - z) >= win) return;
        s.add(c.lane);
        if (c.isChangingLane && c.targetLane != null) s.add(c.targetLane);
    });
    return s;
}

/** Можно ли машине car занять полосу lane (въехать при перестроении или появиться) — чтобы не закрыть все три */
export function canEnterLane(cars, car, lane, win) {
    const s = busyLanes(cars, car.z, win || WALL_WIN, car);
    s.add(lane);
    return s.size < 3;
}

/** Машину можно двигать правилами (кортеж и пробка из событий пейзажа — нет: они стоят нарочно) */
export function movable(c) { return !!c && !c.convoy && !(c.laneChangeTimer >= 1e8); }

/**
 * «Стенка» среди машин с z в (zFar, zNear): ряд, где заняты все три полосы. Возвращает машину, которую надо убрать
 * из ряда (передняя из подвижных), или null.
 */
export function wallBreaker(cars, zNear, zFar, win) {
    const w = win || WALL_WIN;
    const list = (cars || []).filter(function(c) { return c && c.active !== false && c.z < zNear && c.z > zFar; });
    for (let i = 0; i < list.length; i++) {
        const row = list.filter(function(c) { return Math.abs(c.z - list[i].z) < w; });
        if (busyLanes(row, list[i].z, w).size < 3) continue;
        const mv = row.filter(movable).sort(function(a, b) { return a.z - b.z; }); // меньше z — дальше впереди
        if (mv.length) return mv[0];
    }
    return null;
}

/** Полоса, куда может появиться новая машина в точке z: сначала want, потом остальные; не в «стенку» и не впритык
 *  к машине в той же полосе (ближе GAP_SAME); null — некуда */
export const GAP_SAME = 8;
export function spawnLane(cars, z, want, win) {
    const order = [want, (want + 1) % 3, (want + 2) % 3];
    const tight = function(l) { return (cars || []).some(function(c) { return c && c.active !== false && (c.lane === l || c.targetLane === l) && Math.abs(c.z - z) < GAP_SAME; }); };
    for (let i = 0; i < 3; i++) if (!tight(order[i]) && canEnterLane(cars, { z: z }, order[i], win)) return order[i];
    return null;
}
