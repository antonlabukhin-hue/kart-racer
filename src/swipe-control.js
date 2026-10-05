/**
 * Управление свайпами на телефоне («Настройки» → «Управление»; «Авто» — вертикально).
 * Свайп влево/вправо — в соседнюю полосу, вниз — притормозить; газ жмётся сам.
 * Полоса меняется сразу и ровно: машину ведём прямо в центр полосы (скорость вбок — от остатка пути, без перелёта),
 * у цели — точно в центре. Отклик — как только палец сдвинулся на SWIPE_MIN, не дожидаясь, пока его отпустят.
 */
export const LANE_X = [-2, 0, 2];   // центры полос (TRACK_WIDTH 6, LANE_WIDTH 2)
export const SWIPE_MIN = 16;        // px: короче — это касание, а не свайп
export const BRAKE_MS = 450;        // сколько держать тормоз после свайпа вниз
export const SWIPE_V = 0.95;        // предел скорости вбок (xVelocity; клавиши — 0.55): полоса за ~0,2 с
const SNAP = 0.03;                  // ближе — уже в центре полосы

/** Направление свайпа по смещению пальца (px) или null */
export function swipeDir(dx, dy) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy > 0 ? 'down' : 'up';
}

function nearestLane(x) {
    let best = 0;
    LANE_X.forEach(function(lx, i) { if (Math.abs(lx - x) < Math.abs(LANE_X[best] - x)) best = i; });
    return best;
}

/** Цель после свайпа: соседняя полоса от текущей цели (два быстрых свайпа — через полосу) или от машины */
export function laneTarget(x, target, dir) {
    const i = nearestLane(target != null ? target : x) + (dir === 'left' ? -1 : 1);
    return LANE_X[Math.max(0, Math.min(LANE_X.length - 1, i))];
}

/** Состояние свайп-руля одного заезда */
export function createSwipe() {
    const s = { target: null, brakeUntil: 0 };
    return {
        /** свайп: dir — 'left' | 'right' | 'down' | 'up'; x — где машина; now — мс */
        swipe: function(dir, x, now) {
            if (dir === 'left' || dir === 'right') s.target = laneTarget(x, s.target, dir);
            else if (dir === 'down') s.brakeUntil = now + BRAKE_MS;
        },
        /** Газ и тормоз (руль — step): газ сам, свайп вниз — короткий тормоз */
        keys: function(x, v, now) {
            const brake = now < s.brakeUntil;
            return { w: !brake, s: brake, a: false, d: false };
        },
        /**
         * Шаг руля: null — свайпа нет (руль как обычно); иначе { v } — скорость вбок на этот кадр,
         * { x, v: 0 } — доехали: машина ровно в центре полосы. xPos += v·15·dt (как в src/main.js).
         */
        step: function(x, dt) {
            if (s.target == null) return null;
            const left = s.target - x;
            if (Math.abs(left) <= SNAP) { const t = s.target; s.target = null; return { x: t, v: 0 }; }
            const reach = Math.abs(left) / (15 * Math.max(dt, 1e-3)); // скорость, чтобы доехать ровно за кадр
            return { v: Math.sign(left) * Math.min(SWIPE_V, reach * 0.6) };
        },
        get target() { return s.target; }
    };
}
