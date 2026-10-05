/**
 * Управление свайпами на телефоне — по желанию («Настройки» → «Управление»), основа — кнопки на экране.
 * Свайп влево/вправо — в соседнюю полосу, вниз — притормозить; газ жмётся сам.
 * Руль в игре плавный (xVelocity), поэтому свайп задаёт цель — центр полосы, а «кнопки» A/D держатся,
 * пока машина до неё не доедет. Отпускаем заранее: после отпускания машину ещё сносит по инерции.
 */
export const LANE_X = [-2, 0, 2];   // центры полос (TRACK_WIDTH 6, LANE_WIDTH 2)
export const SWIPE_MIN = 28;        // px: короче — это касание, а не свайп
export const BRAKE_MS = 450;        // сколько держать тормоз после свайпа вниз
export const COAST = 1.4;           // путь по инерции ≈ xVelocity × COAST (гашение 0.82 за кадр, xPos += v·15·dt)

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
        /** какие «кнопки» держать сейчас: x — положение машины, v — её поперечная скорость */
        keys: function(x, v, now) {
            const brake = now < s.brakeUntil;
            let a = false, d = false;
            if (s.target != null) {
                const left = s.target - x;
                const coast = Math.max(0, v * Math.sign(left)) * COAST; // сколько ещё проедет к цели по инерции
                if (Math.abs(left) <= coast + 0.08) s.target = null; // дальше доедет сама
                else if (left < 0) a = true;
                else d = true;
            }
            return { w: !brake, s: brake, a: a, d: d };
        },
        get target() { return s.target; }
    };
}
